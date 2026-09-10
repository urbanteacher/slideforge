/* SlideForge — the slideshow player.
   Full-screen 16:9 show with PowerPoint-style keyboard control, transitions,
   interactive quiz slides, per-question countdowns and a computed score slide. */
(function (global) {
  'use strict';

  var SF = global.SF;
  var el = SF.el;

  var Player = {
    deck: null,
    idx: 0,
    answers: {},        // slideId -> chosen option index
    open: false,
    blank: false,
    started: 0,
    _timer: null,
    _handlers: {},
    _current: null,
    _liveTally: null,
    _rail: null,
    _solo: null,
    /* The moderation queue, held so presenter view can be re-synced on demand
       and so the cue on the wall knows how many are waiting. */
    qa: null,

    /* Race games ask for the current field when a question is rendered.
       live.js installs the real one; without it every lane sits at the gate,
       which is what a solo run or the editor preview should show. */
    lanesProvider: null
  };

  /* ------------------------------------------------------------ events */

  Player.on = function (name, fn) {
    (this._handlers[name] = this._handlers[name] || []).push(fn);
    return this;
  };
  Player.emit = function (name, payload) {
    (this._handlers[name] || []).forEach(function (fn) {
      try { fn(payload); } catch (e) { console.error('player handler ' + name, e); }
    });
  };

  /* ------------------------------------------------------------ dom refs */

  var root, viewport, hud, hudPos, cheats;
  var hudTimer = null;

  function build() {
    root = document.getElementById('player');
    viewport = root.querySelector('.deck-viewport');
    hud = document.getElementById('hud');
    hudPos = hud.querySelector('.pos');
    cheats = document.getElementById('cheats');

    hud.querySelector('[data-act=prev]').onclick = function () { Player.prev(); };
    hud.querySelector('[data-act=next]').onclick = function () { Player.next(); };
    hud.querySelector('[data-act=focus]').onclick = function () { Player.emit('focusToggle', {}); };
    hud.querySelector('[data-act=join]').onclick = function () { Player.emit('joinToggle', {}); };
    hud.querySelector('[data-act=blank]').onclick = function () { Player.toggleBlank(); };
    hud.querySelector('[data-act=full]').onclick = function () { Player.toggleFullscreen(); };
    hud.querySelector('[data-act=help]').onclick = function () { cheats.classList.toggle('on'); };
    hud.querySelector('[data-act=exit]').onclick = function () { Player.close(); };
    cheats.onclick = function () { cheats.classList.remove('on'); };

    root.addEventListener('mousemove', showHud);
    root.addEventListener('click', function (e) {
      // clicking dead space advances, like a real slideshow
      if (e.target === viewport || e.target === root) Player.next();
    });
    window.addEventListener('resize', relayout);
  }

  function showHud() {
    hud.classList.add('show');
    clearTimeout(hudTimer);
    hudTimer = setTimeout(function () { hud.classList.remove('show'); }, 2400);
  }

  /* ------------------------------------------------------------ quiz maths */

  function quizSlides(deck) {
    return deck.slides.filter(function (s) { return s.type === 'quiz'; });
  }

  function quizNumberOf(deck, slide) {
    return quizSlides(deck).indexOf(slide) + 1;
  }

  function marksFor(deck, answers) {
    return quizSlides(deck).map(function (s) {
      var a = answers[s.id];
      return {
        question: s.question,
        answered: a != null,
        correct: a != null && a === s.correct
      };
    }).filter(function (m) { return m.answered; });
  }

  Player.score = function () {
    var m = marksFor(this.deck, this.answers);
    return { answered: m.length, correct: m.filter(function (x) { return x.correct; }).length };
  };

  /* ------------------------------------------------------------ rendering */

  function renderCurrent(dir) {
    var deck = Player.deck;
    var slide = deck.slides[Player.idx];
    if (!slide) return;

    stopTimer();

    var node = SF.renderSlide(deck, slide, {
      index: Player.idx,
      total: deck.slides.length,
      interactive: true,
      quizNumber: slide.type === 'quiz' ? quizNumberOf(deck, slide) : 0,
      marks: slide.type === 'results' ? marksFor(deck, Player.answers) : null,
      lanes: slide.type === 'quiz' ? raceField(deck) : null,
      trackLength: deck.trackLength || 5,
      /* A typed answer is held back on the projected screen while the room is
         still typing, so the slide has to know whether this is a live room and
         whether this question has been revealed yet. */
      live: !!(SF.Live && SF.Live.active),
      revealed: !!(SF.Live && SF.Live.revealed && SF.Live.revealed[slide.id])
    });

    var old = Player._current;
    var tr = slide.transition || 'fade';

    viewport.classList.toggle('back', dir < 0);
    node.classList.add('entering');
    if (tr !== 'none') node.classList.add('tr-' + tr);
    viewport.appendChild(node);
    SF.fit(viewport, node);

    if (old) {
      old.classList.remove('entering');
      old.classList.add('leaving');
      if (tr !== 'none') old.classList.add('tr-' + tr);
      var kill = function () { if (old.parentNode) old.parentNode.removeChild(old); };
      if (tr === 'none') kill();
      else {
        old.addEventListener('animationend', kill, { once: true });
        setTimeout(kill, 700);
      }
    }

    Player._current = node;
    node.addEventListener('animationend', function () {
      node.classList.remove('entering', 'tr-' + tr);
      node.style.position = 'absolute';
      SF.fit(viewport, node);
      /* The entry transition is still running when the first fit pass happens,
         and dropping the transition classes can nudge the layout. Re-fit once
         the slide has settled so the chosen type size is the final one. */
      if (slide.type === 'quiz') fitQuizSlide(node);
    }, { once: true });

    hudPos.textContent = (Player.idx + 1) + ' / ' + deck.slides.length;
    /* The live results sit along the bottom of a question slide, which is
       where the Q&A cue would otherwise be. Marked so the cue can move up and
       clear them — and by how much, because a tally of bars and a number line
       with stacked placings are not the same height. */
    viewport.classList.toggle('quiz-slide', slide.type === 'quiz');
    viewport.classList.toggle('quiz-line', slide.type === 'quiz' && slide.input === 'number');

    if (slide.type === 'quiz') {
      wireQuiz(node, slide);
      scheduleQuizFit(node);
    }

    updateSolo();
    Player.emit('slide', { slide: slide, index: Player.idx, node: node });
    syncPresenter();
  }

  /** The field for a race question, or null for anything that is not a race. */
  function raceField(deck) {
    if (!deck || deck.mechanic !== 'race') return null;
    if (Player.lanesProvider) {
      var live = Player.lanesProvider();
      if (live && live.length) return live;
    }
    /* No live field yet: show the declared teams at the starting gate. */
    var teams = (deck.quiz && deck.quiz.teams) || [];
    if (!teams.length) return null;
    return teams.map(function (t, i) {
      return { key: 't' + i, name: t.name || t, color: SF.teamColor(i), pos: 0 };
    });
  }

  function relayout() {
    if (!Player.open) return;
    SF.letterbox(viewport);
    Array.prototype.forEach.call(viewport.querySelectorAll('.slide'), function (n) {
      SF.fit(viewport, n);
    });
    scaleOverlays();
    var cur = Player._current;
    if (cur && cur.classList.contains('why-open')) fitInlineWhy(cur);
    else if (cur && cur.classList.contains('layout-quiz')) fitQuizSlide(cur);
  }

  /* ------------------------------------------------------------ quiz slides */

  function wireQuiz(node, slide) {
    var buttons = Array.prototype.slice.call(node.querySelectorAll('.opt'));
    var already = Player.answers[slide.id];

    buttons.forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        answer(slide, Number(b.dataset.choice));
      });
    });

    if (already != null) {
      paintAnswer(node, slide, already);
    } else if (slide.timeLimit > 0) {
      startTimer(node, slide);
    }

    if (Player._liveTally) applyTally(node, Player._liveTally, Player._liveProgress);
  }

  /* Reveal the held-back answer text on a typed question. */
  function revealTypedAnswer(node) {
    var box = node.querySelector('.opt.answer');
    if (!box || !box.classList.contains('held')) return;
    box.classList.remove('held');
    var slide = Player.deck && Player.deck.slides[Player.idx];
    var txt = box.querySelector('.txt');
    if (txt && slide) txt.textContent = slide.answer || '';
  }

  /* An overlaid question lives inside the image element. On reveal the image
     shrinks to a strip, which would crush the text — so lift the question out
     and above it, and let the slide behave as the "image first" layout does.
     Hiding it instead would remove the question exactly when the explanation
     arrives, which is when you most want both on screen. */
  function flattenOverlay(node) {
    if (!node.classList.contains('media-overlay')) return;
    var pad = node.querySelector('.pad');
    var media = node.querySelector('.qmedia');
    var head = media && media.querySelector('.qhead');
    if (!pad || !media || !head) return;
    pad.insertBefore(head, pad.firstChild);
    node.classList.remove('media-overlay');
    node.classList.add('media-first');
  }

  function paintAnswer(node, slide, choice) {
    var buttons = node.querySelectorAll('.opt');
    /* A typed question's single box is always the right answer — there is no
       index to compare, so comparing one would mute the answer instead of
       revealing it. */
    var typed = slide.input === 'text' || slide.input === 'number';
    Array.prototype.forEach.call(buttons, function (b) {
      var i = Number(b.dataset.choice);
      b.classList.add('locked');
      if (typed || i === slide.correct) b.classList.add('correct');
      else if (i === choice) b.classList.add('wrong');
      else b.classList.add('muted');
    });
    if (typed) {
      revealTypedAnswer(node);
    }
    /* Expands the reasoning inside the correct answer's box, if the question
       carries one and the game shows it inline. */
    if (node.classList.contains('has-why')) {
      flattenOverlay(node);
      node.classList.add('why-open');
      scheduleFit(node);
    }
    var tally = node.querySelector('.tally');
    if (tally && Player._liveTally) tally.classList.add('on');
  }

  /**
   * Shrink an inline explanation until it actually fits the slide.
   *
   * The slide is a fixed 1280x720 box, so whether a paragraph fits depends on
   * the rendered result, not on a character count: theme font, the scoreboard
   * rail and the number of answers all change the answer. So measure, step
   * down, measure again — and only if the smallest size still overflows, give
   * up the wrong answers to free the space.
   */
  function fitInlineWhy(node) {
    var opts = node.querySelector('.opts');
    var why = node.querySelector('.opt.correct .why');
    if (!opts || !why) return;

    node.classList.remove('why-only');
    node.classList.remove('why-nomedia');
    why.style.removeProperty('--why-f');
    opts.style.removeProperty('--opt-f');   // the compact reveal scale takes over
    /* The explanation is left-aligned prose, so the answer line above it has
       to be left-aligned too or the box reads as two different alignments. */
    opts.classList.remove('centred');

    /* Both tests matter. The grid clamps the correct answer's row to whatever
       height is left over, so the row can "fit" the grid while the text
       overflows inside it — which is exactly the clipping this is here to
       prevent. Measure the box as well as the container. */
    var box = why.parentNode;
    var fits = function () {
      return opts.scrollHeight <= opts.clientHeight + 1 &&
             box.scrollHeight <= box.clientHeight + 1;
    };

    /* Largest first, so the result is the biggest type that fits. */
    var steps = ['md', 'lg', 'xl', 'xs'];
    var largestThatFits = function () {
      for (var i = 0; i < steps.length; i++) {
        why.dataset.len = steps[i];
        if (fits()) return true;
      }
      return false;
    };

    if (largestThatFits()) return;

    /* Escalation ladder, cheapest loss first. Each rung frees space, so retry
       from the largest size after each one — stepping only downwards would
       leave long text at the floor size with half the slide empty. */

    // 1. give up the wrong answers
    node.classList.add('why-only');
    if (largestThatFits()) return;

    // 2. and only then the image, which a picture-based question needs most
    node.classList.add('why-nomedia');
    if (largestThatFits()) return;

    // and finally taper below the floor as a last resort
    var px = parseFloat(getComputedStyle(why).getPropertyValue('--why-f')) || 18;
    while (px > 14 && !fits()) {
      px -= 1;
      why.style.setProperty('--why-f', px + 'px');
    }
  }

  /**
   * Grow the question and the answers until they fill their boxes.
   *
   * The boxes are stretched to fill the slide, so a fixed type size leaves a
   * short answer like "4:3" sitting in a box that is mostly padding. Instead,
   * pick the largest size at which every answer still fits its own box —
   * short answers end up large, long wording steps down, and the padding
   * stays in proportion because it is derived from the same variable.
   */
  /** Does this answer's text run to more than one line? */
  function wraps(box) {
    var t = box.querySelector('.txt');
    if (!t) return false;
    var range = document.createRange();
    range.selectNodeContents(t);
    /* One client rect per rendered line, so more than one means it wrapped.
       More reliable than comparing heights against a computed line-height. */
    return range.getClientRects().length > 1;
  }

  function fitQuizSlide(node) {
    var opts = node.querySelector('.opts');
    if (!opts) return;
    /* The revealed layout has its own compact scale, so leave it alone. */
    if (node.classList.contains('why-open')) {
      opts.style.removeProperty('--opt-f');
      opts.classList.remove('centred');
      return;
    }

    var railed = viewport.classList.contains('railed');
    var boxes = Array.prototype.slice.call(opts.querySelectorAll('.opt'));

    /* The question is sized first, because it sets the scale everything else
       is judged against. It is capped by the header's height rather than by a
       line count, so a wordy question shrinks instead of eating the slide. */
    var q = node.querySelector('.qhead .q');
    var head = node.querySelector('.qhead');
    var hasMedia = node.classList.contains('has-media');
    var qSize = railed ? 46 : 56;
    if (q && head) {
      /* Cap the height of the question TEXT, not of its container. The overlay
         layout wraps the question in a gradient panel with 90px of top padding
         so the fade has somewhere to happen; measuring the container counted
         that padding as question height and drove the type to the floor.
         Padding is constant per layout, so it does not belong in the budget. */
      var overlaid = node.classList.contains('media-overlay');
      var maxQ = !hasMedia ? (railed ? 140 : 150)
               : overlaid ? (railed ? 124 : 140)
               : (railed ? 92 : 100);
      var qFloor = 26;
      q.style.setProperty('--q-f', qSize + 'px');
      while (qSize > qFloor && q.scrollHeight > maxQ) {
        qSize -= 2;
        q.style.setProperty('--q-f', qSize + 'px');
      }
    }

    if (boxes.length) {
      /* Rows hug their content, so nothing can overflow an individual box —
         what has to fit is the whole block in the space below the question. */
      var fitsAll = function () {
        return opts.scrollHeight <= opts.clientHeight + 1;
      };

      /* Answers sit a step below the question so the hierarchy reads properly:
         the question is what is being asked, the answers are the options.
         Deriving the ceiling from the fitted question size keeps that ratio
         whatever the wording does.

         A typed question is the exception: there is one box and it holds the
         answer itself, not a candidate for it. Ranking it below the question
         would leave a single short word adrift in an empty slide, so it is
         allowed to lead instead. */
      var typedOne = opts.classList.contains('typed');
      var ceiling = typedOne
        ? Math.max(28, Math.round(qSize * 1.15))
        : Math.max(22, Math.round(qSize * 0.82));
      var floor = 18;

      var bestFor = function (stack) {
        opts.classList.toggle('stack', stack);
        var size = ceiling;
        opts.style.setProperty('--opt-f', size + 'px');
        while (size > floor && !fitsAll()) {
          size -= 2;
          opts.style.setProperty('--opt-f', size + 'px');
        }
        return size;
      };

      /* Two columns suit short answers, one column suits long wording. Which
         fits larger depends on the text and on whether the scoreboard rail is
         taking a third of the slide, so try both and keep the better one.

         A single typed answer always takes the full width: half a slide of
         empty grid beside one word is not a column, it is a gap. */
      var twoCol = typedOne || boxes.length > 4 ? 0 : bestFor(false);
      var oneCol = bestFor(true);
      if (twoCol >= oneCol) {
        opts.classList.remove('stack');
        opts.style.setProperty('--opt-f', twoCol + 'px');
      }

      /* Centre the wording only while every answer still sits on one line.
         Checked after the size is settled, because whether a line wraps
         depends on the size that was chosen. */
      opts.classList.toggle('centred', typedOne || !boxes.some(wraps));
    }
  }

  /* Opening the explanation changes the grid in two ways at once: the correct
     row grows and the wrong answers compact. Measuring in the same frame reads
     the row heights before they have been redistributed, so the first fit can
     wrongly conclude the text fits. Wait for layout to settle, then fit — and
     fit once more shortly after in case anything reflowed late. fitInlineWhy
     resets its own state, so running it repeatedly is harmless. */
  function scheduleFit(node) {
    var run = function () {
      if (node.classList.contains('why-open')) fitInlineWhy(node);
    };
    requestAnimationFrame(function () { requestAnimationFrame(run); });
    setTimeout(run, 140);
  }

  /* Same two-stage scheduling: the grid has to settle before the boxes can be
     measured, or the first pass reads the pre-layout heights. */
  function scheduleQuizFit(node) {
    var run = function () {
      if (node.parentNode) fitQuizSlide(node);
    };
    requestAnimationFrame(function () { requestAnimationFrame(run); });
    setTimeout(run, 140);
  }

  function answer(slide, choice) {
    if (Player.answers[slide.id] != null) return;   // one shot
    Player.answers[slide.id] = choice;
    stopTimer();
    if (Player._current) paintAnswer(Player._current, slide, choice);
    updateSolo();
    Player.emit('answer', {
      slide: slide,
      choice: choice,
      correct: choice === slide.correct
    });
    syncPresenter();
  }

  /** Reveal without attributing an answer — used when the clock runs out. */
  function timeUp(slide) {
    if (Player.answers[slide.id] != null) return;
    Player.answers[slide.id] = -1;
    if (Player._current) paintAnswer(Player._current, slide, -1);
    updateSolo();
    Player.emit('timeup', { slide: slide });
  }

  Player.answer = function (choice) {
    var s = this.deck.slides[this.idx];
    if (s && s.type === 'quiz') answer(s, choice);
  };

  Player.resetScores = function () {
    this.answers = {};
    renderCurrent(0);
    toast('Quiz answers cleared');
  };

  /* ------------------------------------------------------------ countdown */

  function startTimer(node, slide) {
    var clock = node.querySelector('.clock');
    if (!clock) return;
    var ringEl = clock.querySelector('.ring');
    var numEl = clock.querySelector('.n');
    var total = slide.timeLimit;
    var dash = Number(ringEl.getAttribute('stroke-dasharray'));
    var endAt = Date.now() + total * 1000;

    Player._timer = setInterval(function () {
      var left = Math.max(0, endAt - Date.now()) / 1000;
      var frac = left / total;
      ringEl.setAttribute('stroke-dashoffset', dash * (1 - frac));
      numEl.textContent = String(Math.ceil(left));
      clock.classList.toggle('hurry', left <= 5);
      if (left <= 0) {
        stopTimer();
        timeUp(slide);
      }
    }, 100);
  }

  function stopTimer() {
    if (Player._timer) { clearInterval(Player._timer); Player._timer = null; }
  }

  /* ------------------------------------------------------------ score rail */

  /* The rail is a sibling of the slides inside the viewport, not part of any
     slide, so it stays put across navigation and repaints on its own clock.
     It is authored at 300x720 in slide units and scaled to match. */

  Player.enableRail = function (opts, mode) {
    if (!root) return;
    mode = mode || 'scores';
    /* One panel, two feeds. Switching feed replaces the element rather than
       trying to morph it — the two bodies share nothing but the shell. */
    if (this._rail && this._railMode !== mode) {
      this._rail.remove();
      this._rail = null;
    }
    if (!this._rail) {
      this._rail = mode === 'feedback' ? SF.feedbackRail(this.deck) : SF.scoreRail(this.deck);
      this._railMode = mode;
      viewport.appendChild(this._rail);
    }
    viewport.classList.add('railed');
    if (this._current && this._current.classList.contains('layout-quiz')) {
      scheduleQuizFit(this._current);
    }
    if (this._solo) {            // the rail supersedes the solo tally
      this._solo.remove();
      this._solo = null;
      viewport.classList.remove('soloed');
    }
    scaleOverlays();
    relayout();
    if (opts) SF.paintScoreRail(this._rail, opts.rows || [], opts);
  };

  Player.setScoreboard = function (rows, opts) {
    this.enableRail(null, 'scores');
    SF.paintScoreRail(this._rail, rows || [], opts || {});
  };

  /** Show the room's responses to the prompt on the current slide. */
  Player.setFeedback = function (digest, opts) {
    this.enableRail(null, 'feedback');
    SF.paintFeedbackRail(this._rail, digest, opts || {});
  };

  Player.disableRail = function () {
    if (this._rail) { this._rail.remove(); this._rail = null; this._railMode = null; }
    if (!root) return;
    viewport.classList.remove('railed');
    relayout();
  };

  /* Solo shows get a small running tally instead of a full rail. */
  function updateSolo() {
    var deck = Player.deck;
    if (!deck) return;
    var hasQuiz = deck.slides.some(function (s) { return s.type === 'quiz'; });
    var slide = deck.slides[Player.idx];
    /* A race has no "score" to tally — position is what counts, and the track
       overlay already says it. Showing a points pill would contradict it. */
    var wanted = hasQuiz && !Player._rail && deck.mechanic !== 'race' &&
                 deck.quiz && deck.quiz.scoreboard &&
                 slide && (slide.type === 'quiz' || slide.type === 'results');

    if (!wanted) {
      if (Player._solo) { Player._solo.remove(); Player._solo = null; }
      viewport.classList.remove('soloed');
      return;
    }
    if (!Player._solo) {
      Player._solo = SF.soloScore(deck);
      viewport.appendChild(Player._solo);
    }
    viewport.classList.add('soloed');

    /* Correct out of the questions in this deck — the running total a
       presenter actually reads out, not a fraction of what's been attempted. */
    var sc = Player.score();
    var total = deck.slides.filter(function (s) { return s.type === 'quiz'; }).length;
    Player._solo.querySelector('.val').textContent = sc.correct + ' / ' + total;
    scaleOverlays();
  }

  function scaleOverlays() {
    var scale = viewport.clientWidth / SF.SLIDE_W;
    if (!scale) return;
    if (Player._rail) Player._rail.style.transform = 'scale(' + scale + ')';
    if (Player._solo) Player._solo.style.transform = 'scale(' + scale + ')';
    if (Player._cuebar) Player._cuebar.style.transform = 'scale(' + scale + ')';
  }

  /* One strip in the corner for the standing cues, so two of them stack
     instead of landing on top of each other — and on top of the slide
     number, which owns the opposite corner. */
  function cuebar() {
    if (!Player._cuebar) {
      Player._cuebar = el('div', 'cuebar');
      viewport.appendChild(Player._cuebar);
    }
    return Player._cuebar;
  }

  /**
   * The standing Q&A cue: how many questions are waiting for the host.
   *
   * Only a count — never the text. The count is safe to project; a pending
   * question is not, which is why moderation lives in presenter view.
   */
  Player.setQACue = function (counts) {
    if (!root) return;
    var pending = counts && counts.pending || 0;
    var open = counts && counts.open || 0;

    if (!pending && !open) {
      if (this._qacue) { this._qacue.remove(); this._qacue = null; }
      return;
    }
    if (!this._qacue) {
      this._qacue = el('div', 'qacue');
      this._qacue.appendChild(el('span', 'qa-dot'));
      this._qacue.appendChild(el('span', 'qa-text'));
      cuebar().appendChild(this._qacue);
    }
    this._qacue.classList.toggle('waiting', pending > 0);
    var txt = this._qacue.querySelector('.qa-text');
    txt.textContent = '';
    if (pending) {
      txt.appendChild(el('span', 'qa-n', String(pending)));
      txt.appendChild(document.createTextNode(
        pending === 1 ? ' question waiting' : ' questions waiting'));
    } else {
      txt.appendChild(el('span', 'qa-n', String(open)));
      txt.appendChild(document.createTextNode(
        open === 1 ? ' question open' : ' questions open'));
    }
    scaleOverlays();
  };

  var PACE_SAY = {
    lost: ' saying they are lost',
    fast: ' saying it is too fast',
    slow: ' saying it is too slow'
  };

  /**
   * The pace cue: how many of the room are asking you to change something.
   *
   * Shown only on a spike, and only as a count. One person who is lost is a
   * conversation to have with them, not something to put on the wall — and
   * naming anyone would end the feature, since a signal you can be identified
   * by is a signal nobody sends.
   *
   * It appears because the room asked for it to. Showing them it landed is
   * the point: a signal that visibly changes nothing gets sent once.
   */
  Player.setPaceCue = function (digest) {
    if (!root) return;
    var show = digest && digest.spike && digest.kind && digest.live > 0;

    if (!show) {
      if (this._pacecue) { this._pacecue.remove(); this._pacecue = null; }
      return;
    }
    if (!this._pacecue) {
      this._pacecue = el('div', 'pacecue');
      this._pacecue.appendChild(el('span', 'pace-dot'));
      this._pacecue.appendChild(el('span', 'pace-text'));
      cuebar().appendChild(this._pacecue);
    }
    var txt = this._pacecue.querySelector('.pace-text');
    txt.textContent = '';
    txt.appendChild(el('span', 'pace-n', String(digest.counts[digest.kind])));
    txt.appendChild(document.createTextNode(PACE_SAY[digest.kind] || ''));
    scaleOverlays();
  };

  /* ------------------------------------------------------------ live extras */

  /** counts: array of per-option answer counts (live audience mode). */
  Player.setTally = function (counts, progress) {
    this._liveTally = counts;
    this._liveProgress = progress || null;
    if (this._current) applyTally(this._current, counts, this._liveProgress);
  };

  /**
   * What the room typed, once the answer is out. Grouped and counted by the
   * host, which is where the marking happens.
   * @param {Array} groups [{ text, n, right }]
   */
  Player.showTypedAnswers = function (groups) {
    var node = this._current;
    if (!node) return;
    var box = node.querySelector('.typedgroups');
    var answer = node.querySelector('.opt.answer');
    if (answer) {
      answer.classList.remove('held');
      var txt = answer.querySelector('.txt');
      var slide = this.deck && this.deck.slides[this.idx];
      if (txt && slide) txt.textContent = slide.answer || '';
    }
    if (!box) return;
    box.replaceChildren();
    (groups || []).slice(0, 8).forEach(function (g) {
      var chip = SF.el('div', 'tchip' + (g.right ? ' right' : ''));
      chip.appendChild(SF.el('span', 'w', g.text));
      if (g.n > 1) chip.appendChild(SF.el('span', 'n', '×' + g.n));
      box.appendChild(chip);
    });
    node.classList.add('typed-out');
    this.scheduleFit(node);
  };
  Player.clearTally = function () {
    this._liveTally = null;
    if (this._current) {
      var t = this._current.querySelector('.tally');
      if (t) t.classList.remove('on');
    }
  };

  /**
   * Where the room placed its estimates, once the answer is out.
   *
   * The band that counts and the target are positioned now rather than at
   * render time: both of them say where the answer is, so neither can be on
   * the wall while the room is still deciding.
   *
   * @param {Array} placed [{ value, right }] sorted along the line
   */
  Player.showPlacedValues = function (placed) {
    var node = this._current;
    if (!node) return;
    var slide = this.deck && this.deck.slides[this.idx];
    revealTypedAnswer(node);
    var line = node.querySelector('.numberline');
    if (!line || !slide) return;

    var span = slide.max - slide.min;
    var at = function (v) {
      if (!span) return 0;
      return Math.max(0, Math.min(100, ((v - slide.min) / span) * 100));
    };

    var band = line.querySelector('.nl-band');
    var lo = at(slide.target - slide.tolerance);
    var hi = at(slide.target + slide.tolerance);
    band.style.left = lo + '%';
    /* A zero tolerance still needs to be visible as a line, or an exact
       question shows an invisible band and looks broken. */
    band.style.width = Math.max(0.6, hi - lo) + '%';
    line.querySelector('.nl-target').style.left = at(slide.target) + '%';

    /* A dot plot, not a scatter: two students who guessed the same number
       land on the same point, and one dot drawn over another says four
       people answered when ten did. Duplicates stack upwards. */
    var stacks = {};
    var marks = line.querySelector('.nl-marks');
    marks.replaceChildren();
    (placed || []).forEach(function (p) {
      var key = String(p.value);
      stacks[key] = (stacks[key] || 0) + 1;
      var dot = SF.el('div', 'nl-dot' + (p.right ? ' right' : ''));
      dot.style.left = at(p.value) + '%';
      dot.style.setProperty('--stack', String(stacks[key] - 1));
      dot.title = SF.formatValue(p.value, slide.unit);
      marks.appendChild(dot);
    });
    line.querySelector('.nl-line').classList.add('on');
    node.classList.add('typed-out');
    this.scheduleFit(node);
  };

  function applyTally(node, counts, progress) {
    /* A typed question has no per-option bars — the only live number that
       means anything before the reveal is how many have answered. */
    var typedCount = node.querySelector('.typedcount');
    if (typedCount && progress) {
      typedCount.textContent = progress.total
        ? progress.answered + ' of ' + progress.total + ' answered'
        : '';
    }
    var tally = node.querySelector('.tally');
    if (!tally) return;
    tally.classList.add('on');
    var max = Math.max(1, Math.max.apply(null, counts));
    Array.prototype.forEach.call(tally.querySelectorAll('.col'), function (col, i) {
      var n = counts[i] || 0;
      col.querySelector('.bar').style.height = Math.round((n / max) * 52) + 'px';
      col.querySelector('.cnt').textContent = String(n);
    });
  }

  /** Build the leaderboard slide. */
  Player.leaderboardSlide = function (players, title) {
    var deck = this.deck;
    var node = el('div', 'slide theme-' + deck.theme + ' layout-section');
    var pad = el('div', 'pad leaderboard');
    pad.style.display = 'block';
    pad.appendChild(el('h2', null, title || 'Leaderboard'));
    var top = players.slice().sort(function (a, b) { return b.score - a.score; }).slice(0, 6);
    if (!top.length) pad.appendChild(el('div', 'none', 'No players yet'));
    top.forEach(function (p, i) {
      var row = el('div', 'lb-row' + (i === 0 ? ' top1' : ''));
      row.appendChild(el('div', 'rank', String(i + 1)));
      row.appendChild(el('div', 'who', p.name));
      row.appendChild(el('div', 'pts', String(p.score)));
      pad.appendChild(row);
    });
    node.appendChild(pad);
    return node;
  };

  /** Drop a leaderboard over the deck. `focus` hides the rail and goes wide. */
  Player.showLeaderboard = function (players, title, focus) {
    if (!this.open) return;
    var node = this.leaderboardSlide(players, title);
    if (focus) { this.focusOverlay(node); return; }
    node.classList.add('entering', 'tr-fade');
    node.dataset.overlay = '1';
    var prev = viewport.querySelector('[data-overlay]');
    if (prev) prev.remove();
    viewport.appendChild(node);
    SF.fit(viewport, node);
  };
  Player.hideLeaderboard = function () {
    var prev = viewport.querySelector('[data-overlay]');
    if (prev) prev.remove();
  };

  /**
   * Put an overlay up as the focused view: full width, rail hidden.
   *
   * One mechanism for all three feeds — audience responses, the scoreboard and
   * the race track — so E behaves the same whatever is in the rail. Repainting
   * an already-focused overlay swaps it without re-animating, or every
   * incoming response would make the panel flash.
   */
  Player.focusOverlay = function (node) {
    if (!this.open || !node) return;
    node.dataset.overlay = '1';
    var prev = viewport.querySelector('[data-overlay]');
    if (prev) prev.remove();
    else node.classList.add('entering', 'tr-fade');
    viewport.appendChild(node);
    SF.fit(viewport, node);
    this._focus = true;
    /* The focused view is the same data the rail shows, so leaving the rail up
       would duplicate it and paint over the top of it. */
    viewport.classList.add('fb-focus');
  };

  Player.closeFocus = function () {
    if (!this._focus) return;
    this._focus = false;
    viewport.classList.remove('fb-focus');
    var prev = viewport.querySelector('[data-overlay]');
    if (prev) prev.remove();
  };

  /** A question, put on the wall for the room to see. */
  Player.showQuestionCard = function (item) {
    if (!this.open) return;
    if (!item) { this.closeFocus(); return; }
    this.focusOverlay(SF.questionCard(this.deck, item));
  };

  /** The audience responses, focused. */
  Player.showFeedbackFocus = function (digest, opts) {
    this.focusOverlay(SF.feedbackFocus(this.deck, digest, opts || {}));
  };

  /* Kept for the older call sites. */
  Player.hideFeedbackFocus = function () { this.closeFocus(); };

  /** The race track, over the deck. Same overlay slot as the leaderboard. */
  Player.showRaceTrack = function (lanes, opts) {
    if (!this.open) return;
    var node = SF.raceTrack(this.deck, lanes, opts);
    if (opts && opts.focus) { this.focusOverlay(node); return; }
    node.classList.add('entering', 'tr-fade');
    node.dataset.overlay = '1';
    var prev = viewport.querySelector('[data-overlay]');
    if (prev) prev.remove();
    viewport.appendChild(node);
    SF.fit(viewport, node);
  };

  /* ------------------------------------------------------------ navigation */

  Player.goTo = function (i, dir) {
    if (!this.deck) return;
    var n = this.deck.slides.length;
    i = Math.max(0, Math.min(n - 1, i));
    if (i === this.idx && this._current) return;
    dir = dir != null ? dir : (i > this.idx ? 1 : -1);
    this.idx = i;
    this.hideLeaderboard();
    this.closeFocus();
    this.clearTally();
    renderCurrent(dir);
  };
  /* Live mode installs a gate so the first "next" on an unanswered question
     reveals the answer instead of skipping past it. Return true to swallow. */
  Player.gate = null;

  Player.next = function () {
    if (this.gate && this.gate(this.deck.slides[this.idx], this.idx)) return;
    if (this.idx >= this.deck.slides.length - 1) { flashEnd(); return; }
    this.goTo(this.idx + 1, 1);
  };
  Player.prev = function () { this.goTo(this.idx - 1, -1); };

  function flashEnd() {
    toast('End of deck — Esc to exit');
  }

  Player.toggleBlank = function () {
    this.blank = !this.blank;
    root.classList.toggle('blank', this.blank);
  };

  Player.toggleFullscreen = function () {
    var d = document;
    if (!d.fullscreenElement && !d.webkitFullscreenElement) {
      var r = d.documentElement;
      (r.requestFullscreen || r.webkitRequestFullscreen || function () {}).call(r);
    } else {
      (d.exitFullscreen || d.webkitExitFullscreen || function () {}).call(d);
    }
  };

  /* ------------------------------------------------------------ open/close */

  Player.start = function (deck, startIndex, opts) {
    opts = opts || {};
    if (!root) build();
    this.deck = deck;
    this.idx = Math.max(0, Math.min(deck.slides.length - 1, startIndex || 0));
    this.open = true;
    this.blank = false;
    this.started = Date.now();
    this._current = null;
    this._liveTally = null;
    this._rail = null;
    this._railMode = null;
    this._solo = null;
    this._qacue = null;
    this._focus = false;
    if (!opts.keepAnswers) this.answers = {};
    viewport.innerHTML = '';
    viewport.classList.remove('railed');
    root.classList.add('on');
    root.classList.remove('blank');
    SF.letterbox(viewport);
    renderCurrent(1);
    showHud();
    if (opts.fullscreen !== false) this.toggleFullscreen();
    this.emit('open', { deck: deck });
  };

  Player.close = function () {
    if (!this.open) return;
    stopTimer();
    this.open = false;
    root.classList.remove('on');
    cheats.classList.remove('on');
    viewport.innerHTML = '';
    viewport.classList.remove('railed');
    viewport.classList.remove('soloed');
    viewport.classList.remove('fb-focus');
    this._current = null;
    this._focus = false;
    this._qacue = null;
    this._rail = null;
    this._solo = null;
    if (document.fullscreenElement || document.webkitFullscreenElement) this.toggleFullscreen();
    closePresenter();
    this.emit('close', {});
  };

  /* ------------------------------------------------------------ presenter view */

  var presenterWin = null;
  var CHAN = 'slideforge.presenter';

  Player.openPresenter = function () {
    if (presenterWin && !presenterWin.closed) { presenterWin.focus(); return; }
    presenterWin = window.open('presenter.html', 'sf_presenter',
      'width=1100,height=680,menubar=no,toolbar=no');
    if (!presenterWin) { toast('Presenter view was blocked — allow pop-ups for this page'); return; }
    setTimeout(syncPresenter, 500);
  };

  function closePresenter() {
    if (presenterWin && !presenterWin.closed) presenterWin.close();
    presenterWin = null;
  }

  /* Exported because the live layer pushes Q&A state as it arrives, and the
     presenter window is the only place pending questions are shown. It was
     called as Player.syncPresenter from the start; it was never actually on
     Player, so every Q&A push threw instead of refreshing that window. */
  function syncPresenter() {
    if (!presenterWin || presenterWin.closed) return;
    var deck = Player.deck;
    if (!deck) return;
    try {
      presenterWin.postMessage({
        type: 'sf-presenter-state',
        deck: deck,
        index: Player.idx,
        answers: Player.answers,
        startedAt: Player.started,
        /* Pending questions travel to presenter view and nowhere else: the
           host's own screen is usually the projected one. */
        qa: Player.qa || null,
        /* Pace and confidence go the same way. The wall gets a count on a
           spike; the detail is for whoever is teaching. */
        pace: Player.pace || null,
        confidence: Player.confidence || null,
        /* "3 unanswered", "12 waiting" — the cues that tell the host whether
           to wait or move on. Only meaningful live, null otherwise. */
        progress: Player._liveProgress || null,
        waiting: Player.waiting || 0
      }, '*');
    } catch (e) { /* window closing */ }
  }

  Player.syncPresenter = syncPresenter;

  window.addEventListener('message', function (ev) {
    var d = ev.data;
    if (!d || d.type !== 'sf-presenter-cmd') return;
    if (d.cmd === 'next') Player.next();
    else if (d.cmd === 'prev') Player.prev();
    else if (d.cmd === 'goto') Player.goTo(d.index);
    else if (d.cmd === 'blank') Player.toggleBlank();
    else if (d.cmd === 'exit') Player.close();
    else if (d.cmd === 'hello') syncPresenter();
    else if (d.cmd === 'qa') Player.emit('qaCommand', d);
  });

  /* ------------------------------------------------------------ keyboard */

  document.addEventListener('keydown', function (e) {
    if (!Player.open) return;
    var k = e.key;

    if (cheats.classList.contains('on') && k !== '?' && k !== '/') {
      cheats.classList.remove('on');
      if (k === 'Escape') { e.preventDefault(); return; }
    }

    /* On an unanswered question the answer letters win over the show controls
       that share them (B blank, D presenter, F fullscreen, P prev, N next) —
       answering is what you actually want mid-question. Once the answer is in,
       those keys go back to their normal jobs. */
    var live = Player.deck.slides[Player.idx];
    if (live && live.type === 'quiz' && Player.answers[live.id] == null && /^[a-f]$/i.test(k)) {
      var pick = SF.LETTERS.indexOf(k.toUpperCase());
      if (pick > -1 && pick < live.options.length) {
        e.preventDefault();
        Player.answer(pick);
        showHud();
        return;
      }
    }

    switch (k) {
      case 'ArrowRight': case 'ArrowDown': case ' ': case 'PageDown': case 'Enter': case 'n':
        e.preventDefault(); Player.next(); break;
      case 'ArrowLeft': case 'ArrowUp': case 'PageUp': case 'p':
        e.preventDefault(); Player.prev(); break;
      case 'Home': e.preventDefault(); Player.goTo(0, -1); break;
      case 'End': e.preventDefault(); Player.goTo(Player.deck.slides.length - 1, 1); break;
      case 'Escape':
        e.preventDefault();
        if (document.getElementById('joincard').classList.contains('on')) {
          Player.emit('joinToggle', { close: true });
        } else if (Player._focus) {
          Player.emit('focusToggle', { close: true });
        } else {
          Player.close();
        }
        break;
      case 'b': case 'B': case '.': e.preventDefault(); Player.toggleBlank(); break;
      case 'f': case 'F': e.preventDefault(); Player.toggleFullscreen(); break;
      case 'r': case 'R': e.preventDefault(); Player.resetScores(); break;
      case 'd': case 'D': e.preventDefault(); Player.openPresenter(); break;
      case 'e': case 'E': e.preventDefault(); Player.emit('focusToggle', {}); break;
      case 'j': case 'J': e.preventDefault(); Player.emit('joinToggle', {}); break;
      case '?': case '/': e.preventDefault(); cheats.classList.toggle('on'); break;
      default:
        if (/^[1-6]$/.test(k)) { e.preventDefault(); Player.answer(Number(k) - 1); }
    }
    showHud();
  });

  /* ------------------------------------------------------------ toast */

  function toast(msg) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(t._h);
    t._h = setTimeout(function () { t.classList.remove('on'); }, 2200);
  }

  Player.fitInlineWhy = fitInlineWhy;
  Player.scheduleFit = scheduleFit;
  Player.fitQuizSlide = fitQuizSlide;
  Player.flattenOverlay = flattenOverlay;
  SF.Player = Player;
  SF.toast = toast;
})(window);
