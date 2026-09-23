/* SlideForge — the slideshow player.
   Full-screen 16:9 show with PowerPoint-style keyboard control, transitions,
   interactive quiz slides, per-question countdowns and a computed score slide. */
(function (global) {
  'use strict';

  /** @type {import("../src/types.js").SlideForgeGlobal} */
  var SF = global.SF;
  var el = SF.el;

  /** @type {Record<string, any>} */
  var Player = {
    deck: null,
    idx: 0,
    answers: {},        // slideId -> chosen option index
    open: false,
    shareMode: false,   // read-only share link: browse slides, no teaching HUD
    blank: false,
    started: 0,
    /* Spontaneous desk activity/game: shown on the wall without mutating the lesson. */
    spontaneous: null,
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

  /* Keep the compiled run: embedded games can expand into several slides,
     and rebuilding it on reload can give generated slides different ids. */
  var RUN_KEY = 'slideforge.presentation';
  var rememberRun = false;
  function saveRun() {
    if (!Player.open || !rememberRun) return;
    try {
      sessionStorage.setItem(RUN_KEY, JSON.stringify({
        deck: Player.deck, index: Player.idx, answers: Player.answers
      }));
    } catch (e) {}
  }
  Player.forgetRun = function () {
    try { sessionStorage.removeItem(RUN_KEY); } catch (e) {}
  };
  Player.restoreRun = function () {
    var saved;
    try { saved = JSON.parse(sessionStorage.getItem(RUN_KEY) || 'null'); } catch (e) {}
    if (!saved || !saved.deck || !Array.isArray(saved.deck.slides) || !saved.deck.slides.length
        || !Number.isInteger(saved.index)) {
      Player.forgetRun();
      return false;
    }
    Player.answers = saved.answers || {};
    Player.start(saved.deck, saved.index, { fullscreen: false, keepAnswers: true });
    return true;
  };
  window.addEventListener('pagehide', saveRun);

  /* ------------------------------------------------------------ events */

  Player.on = function (name, fn) {
    (Player._handlers[name] = Player._handlers[name] || []).push(fn);
    return Player;
  };
  Player.off = function (name, fn) {
    var list = Player._handlers[name];
    if (!list) return Player;
    Player._handlers[name] = list.filter(function (f) { return f !== fn; });
    return Player;
  };
  Player.emit = function (name, payload) {
    (Player._handlers[name] || []).forEach(function (fn) {
      try { fn(payload); } catch (e) { console.error('player handler ' + name, e); }
    });
  };

  /* ------------------------------------------------------------ dom refs */

  var root, viewport, hud, hudPos, cheats;
  var hudTimer = null;

  function build() {
    root = document.getElementById('player');
    viewport = root ? root.querySelector('.deck-viewport') : null;
    hud = document.getElementById('hud');
    hudPos = hud ? hud.querySelector('.pos') : null;
    cheats = document.getElementById('cheats');

    if (!hud) return;
    var more = /** @type {HTMLElement | null} */ (hud.querySelector('#hudMore'));
    var moreButton = /** @type {HTMLElement | null} */ (hud.querySelector('[data-act=more]'));
    function closeMore() {
      if (more) more.hidden = true;
      if (moreButton) moreButton.setAttribute('aria-expanded', 'false');
    }
    if (moreButton) {
      var mb = moreButton;
      mb.onclick = function () {
        if (!more) return;
        more.hidden = !more.hidden;
        mb.setAttribute('aria-expanded', String(!more.hidden));
        showHud();
      };
    }
    if (more) {
      more.addEventListener('click', function (e) {
        var t = /** @type {Element | null} */ (e.target);
        if (t && t.closest('button')) closeMore();
      });
    }
    hud.addEventListener('mouseenter', showHud);
    hud.addEventListener('focusin', showHud);
    if (root) {
      root.addEventListener('pointerdown', closeMore);
      root.addEventListener('mousemove', showHud);
      /* Clicking the slide advances it, the way a real slideshow does. It
         goes through Player.next(), so it is the same press as the right
         arrow: it steps a build before it steps the slide.

         This used to fire only when the click landed on the viewport or the
         root element itself. The slide is scaled to fill the viewport, so
         that dead space measures 1px wide and 0px tall — the condition was
         unreachable and clicking the slide did nothing at all.

         The guard is now what was clicked rather than where: anything that
         wants its own click keeps it. Most of that is native — quiz options
         are real buttons and links are real anchors — and the rest are
         surfaces a presenter works on rather than reads past. A component can
         also opt out by stopping propagation, which the link rows do. */
      root.addEventListener('click', function (e) {
        var t = /** @type {Element | null} */ (e.target);
        if (t && t.closest && t.closest(NO_ADVANCE)) return;
        Player.next();
      });
    }
    Object.keys(controls).forEach(function (action) {
      var buttons = hud ? hud.querySelectorAll('[data-act=' + action + ']') : [];
      buttons.forEach(function (button) {
        button.onclick = function () { Player.control(action); };
      });
    });
    if (cheats) {
      cheats.onclick = function () { cheats.classList.remove('on', 'for-editor'); };
    }

    window.addEventListener('resize', relayout);
    document.addEventListener('fullscreenchange', syncHudRoomButtons);
  }

  function controlEnabled(action) {
    /* A shared link is a slideshow for a reader, not a teaching desk. Only
       move and fullscreen belong there — every room tool is dead weight and
       would look broken without a live session. */
    if (Player.shareMode) {
      return action === 'prev' || action === 'next' || action === 'full' || action === 'help';
    }
    var live = !!(SF.Live && SF.Live.active);
    var slide = Player.deck && Player.deck.slides[Player.idx];
    if (action === 'teacher' || action === 'join' || action === 'reactions'
        || action === 'blankPhones' || action === 'floor') return live;
    if (action === 'who') return live && !!slide && slide.type === 'quiz';
    return true;
  }
  /* Clicking any of these is doing something else, so it must not also turn
     the page. Keep native elements first: they are what most slide content
     already is. */
  var NO_ADVANCE = [
    'button', 'a', 'input', 'select', 'textarea', 'label', 'summary', 'video',
    '[role="button"]', '[contenteditable="true"]',
    '.hud', '.scorerail', '.teaching-ink', '.player-freeze-pill', '.player-demo-pill'
  ].join(',');

  var controls = {
    prev: function () { Player.prev(); }, next: function () { Player.next(); },
    rail: function () { Player.toggleRoomSidebar(); },
    focus: function () { if (SF.Live && SF.Live.active) Player.emit('focusToggle', {}); else toggleSoloFeedback({}); },
    join: function () { Player.emit('joinToggle', {}); },
    /* Opens share dialogs on this (wall) window. Presenter Share runs on the
       desk instead — see sharePrep / shareWatch. */
    share: function () {
      if (SF.Shell && typeof SF.Shell.shareLesson === 'function') SF.Shell.shareLesson();
      else toast('Sharing needs the SlideForge server.');
    },
    /* One question, asked now. Ends an open one rather than stacking a
       second on top of it — the button is the same button either way. */
    poll: function () {
      if (!SF.Live) return;
      if (SF.Live.customPromptOpen && SF.Live.customPromptOpen()) { SF.Live.endCustomPrompt(); return; }
      Player.emit('quickPollOpen', {});
    },
    freeze: function () { Player.toggleFreeze(); },
    reactions: function () { Player.emit('reactionsToggle', {}); },
    blankPhones: function () { Player.emit('blankPhonesToggle', {}); },
    floor: function () { Player.emit('floorCycle', {}); },
    reset: function () { Player.resetScores(); },
    /* Named answers live on the private screen. Opening presenter view if it
       is shut is the whole action: there is nowhere else this can go without
       putting the room's names on the wall. */
    who: function () {
      if (!presenter.win() || presenter.win().closed) { Player.openPresenter(); toast('Named answers are in presenter view'); }
      else presenter.win().focus();
      setTimeout(function () { if (presenter.win() && !presenter.win().closed) { try { presenter.win().postMessage({ type: 'sf-presenter-cmd', cmd: 'who' }, '*'); } catch (e) {} } }, 400);
    },
    ink: function () { if (SF.Teaching) SF.Teaching.toggleBar(); },
    blank: function () { Player.toggleBlank(); }, full: function () { Player.toggleFullscreen(); },
    help: function () { if (cheats) cheats.classList.toggle('on'); }, exit: function () { Player.close(); },
    presenter: function () { Player.openPresenter(); }, teacher: function () { if (SF.Live) SF.Live.openManual(); }
  };
  Player.control = function (action) {
    if (!controls[action] || !controlEnabled(action)) return;
    controls[action](); syncHudRoomButtons();
    /* Two-screen teaching: the desk mirrors HUD state after either surface acts. */
    if (presenter.win() && !presenter.win().closed) syncPresenter();
  };

  function showHud() {
    if (!hud) return;
    hud.classList.add('show');
    clearTimeout(hudTimer);
    hudTimer = setTimeout(function () {
      if (!hud) return;
      var moreEl = document.getElementById('hudMore');
      var inking = !!(SF.Teaching && SF.Teaching.isOpen && SF.Teaching.isOpen());
      if (hud.matches(':hover') || hud.querySelector(':focus-visible') || (moreEl && !moreEl.hidden) || inking) {
        showHud();
        return;
      }
      hud.classList.remove('show');
    }, 2400);
  }
  Player.showHud = showHud;

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
    var m = marksFor(Player.deck, Player.answers);
    return { answered: m.length, correct: m.filter(function (x) { return x.correct; }).length };
  };

  /* What the wall is actually showing — a spontaneous overlay, or the lesson. */
  Player.wallSlide = function () {
    if (Player.spontaneous && Player.spontaneous.slides && Player.spontaneous.slides.length) {
      return Player.spontaneous.slides[Player.spontaneous.index] || null;
    }
    return Player.deck && Player.deck.slides[Player.idx] || null;
  };
  Player.wallPos = function () {
    if (Player.spontaneous && Player.spontaneous.slides) {
      return {
        index: Player.spontaneous.index,
        total: Player.spontaneous.slides.length,
        spontaneous: true,
        title: Player.spontaneous.title || ''
      };
    }
    return {
      index: Player.idx,
      total: Player.deck ? Player.deck.slides.length : 0,
      spontaneous: false,
      title: ''
    };
  };

  function syncSpontaneousPill() {
    if (!root) return;
    var pill = document.getElementById('playerSpontaneousPill');
    if (!Player.spontaneous) {
      if (pill) pill.remove();
      root.classList.remove('is-spontaneous');
      return;
    }
    root.classList.add('is-spontaneous');
    /* Resolved in one go rather than reassigned: getElementById gives back a
       nullable, and narrowing it by assigning into the same variable does not
       convince the checker, so the pill read as possibly-null on every use
       below it. */
    var shown = pill || el('div', 'player-spontaneous-pill');
    if (!pill) {
      shown.id = 'playerSpontaneousPill';
      root.appendChild(shown);
    }
    var pos = Player.wallPos();
    shown.textContent = (Player.spontaneous.title || 'Activity')
      + ' · ' + (pos.index + 1) + '/' + pos.total
      + ' · End to return';
  }

  /**
   * Project a desk-made activity/game/quiz on the wall without splicing the
   * running lesson. Clear with Player.endSpontaneous().
   */
  Player.openSpontaneous = function (session) {
    if (!Player.open || !session || !session.slides || !session.slides.length) return false;
    if (SF.Live && SF.Live.endCustomPrompt) SF.Live.endCustomPrompt();
    if (Player.momentCommand) Player.momentCommand({ action: 'clear' });
    if (Player.frozen && Player.toggleFreeze) Player.toggleFreeze(false);
    if (Player.blank && Player.toggleBlank) Player.toggleBlank();
    Player.closeFocus();
    var slides = session.slides.map(function (s) {
      var copy = Object.assign({}, s);
      copy.presenterActivity = session.id || copy.presenterActivity || 'spontaneous';
      return copy;
    });
    Player.spontaneous = {
      id: session.id || SF.uid(),
      title: String(session.title || 'Activity').trim() || 'Activity',
      slides: slides,
      index: Math.max(0, Math.min(slides.length - 1, session.index || 0)),
      game: session.game || null
    };
    renderCurrent(1);
    syncSpontaneousPill();
    showHud();
    return true;
  };

  Player.endSpontaneous = function () {
    if (!Player.spontaneous) return false;
    Player.spontaneous = null;
    syncSpontaneousPill();
    if (Player.open && Player.deck) renderCurrent(0);
    else syncPresenter();
    return true;
  };

  /* ------------------------------------------------------------ rendering */

  /* ---------------------------------------------------------------- morph */

  /* A match cut: the same thing, seen differently.
 
     Two slides in a row often share one subject — the heading repeats, the
     chart is the same chart with another series on it, the photograph is the
     same photograph closer in. A dissolve throws that away and says "here is
     a new slide"; carrying the shared element across says "this is the same
     thing, look again", which is a sentence about the material rather than a
     decoration.
 
     The browser does the animation. view-transition-name pairs the outgoing
     element with the incoming one and startViewTransition() interpolates
     position, size and shape between them — so this code's whole job is to
     decide what counts as "the same thing" and to name it on both sides.
 
     Three pairings, in order of how strongly they mean it: the same picture,
     the same chart table, the same heading text. Anything else is a fade. */
  var MORPH_PAIRS = [
    { name: 'sf-morph-media', pick: function (n) { return n.querySelector('.img, .vid, video'); },
      same: function (a, b) { return (a.image || a.video) && (a.image || a.video) === (b.image || b.video); } },
    { name: 'sf-morph-chart', pick: function (n) { return n.querySelector('.chart-svg'); },
      same: function (a, b) { return a.type === 'chart' && b.type === 'chart' &&
        String(a.body || '').trim() && String(a.body || '').trim() === String(b.body || '').trim(); } },
    { name: 'sf-morph-head', pick: function (n) { return n.querySelector('.pad h1, .pad h2, .statement'); },
      same: function (a, b) { var x = String(a.title || a.body || '').trim();
        return x && x === String(b.title || b.body || '').trim(); } }
  ];

  /**
   * Name the shared element on both slides, if there is one.
   *
   * @param {HTMLElement|null} old the outgoing slide
   * @param {HTMLElement} node the incoming slide
   * @param {object} slide the incoming slide's data
   * @returns {boolean} whether there is anything to morph
   */
  function canMorph(old, node, slide) {
    if (!old || typeof (/** @type {any} */ (document).startViewTransition) !== 'function') return false;
    if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    var was = Player._currentSlide;
    if (!was || was.id === slide.id) return false;
    for (var i = 0; i < MORPH_PAIRS.length; i++) {
      var pair = MORPH_PAIRS[i];
      if (!pair.same(was, slide) && !pair.same(slide, was)) continue;
      var from = pair.pick(old), to = pair.pick(node);
      if (!from || !to) continue;
      from.style.viewTransitionName = pair.name;
      to.style.viewTransitionName = pair.name;
      return true;
    }
    return false;
  }

  /* The name has to come off again: two elements sharing one
     view-transition-name in the same document is an error the browser
     resolves by ignoring both, so a morph would break the next morph. */
  function clearMorph(old) {
    if (old) {
      MORPH_PAIRS.forEach(function (pair) {
        var n = pair.pick(old);
        if (n) n.style.viewTransitionName = '';
      });
    }
  }

  function renderCurrent(dir) {
    if (!viewport) return;
    var deck = Player.deck;
    if (!deck) return;
    var wall = Player.wallPos();
    var slide = Player.wallSlide();
    if (!slide) return;

    if (SF.LiveActivities) SF.LiveActivities.beforeSlide(deck, slide);

    stopTimer();
    if (SF.Boards) SF.Boards.unmountAll();

    var node = SF.renderSlide(deck, slide, {
      index: wall.index,
      total: wall.total,
      interactive: true,
      exploreState: (Player.exploreStates || {})[slide.id],
      exploreCommand: function(action,value){ if(SF.Explore)SF.Explore.command(Player,action,value); },
      ...(SF.Boards ? SF.Boards.renderOptions(Player, slide) : {}),
      quizNumber: slide.type === 'quiz' ? quizNumberOf(deck, slide) : 0,
      marks: slide.type === 'results' ? marksFor(deck, Player.answers) : null,
      lanes: slide.type === 'quiz' ? raceField(deck) : null,
      /* Offered only when nobody is scoring it for us. In a live room the
         phones move the field and a tap on the wall would be a second,
         disagreeing truth. */
      laneCommand: slide.type === 'quiz' && raceIsOurs(deck)
        ? function (key, action) { Player.raceStep(key, action); } : null,
      boss: slide.type === 'quiz' ? bossView(deck) : null,
      bossCommand: slide.type === 'quiz' && bossFight(deck)
        ? function (action, o) { Player.bossCommand(action, o); } : null,
      definitionPhase: slide.style === 'definition'
        ? definitionState(slide).phase : null,
      definitionCommand: slide.style === 'definition'
        ? function (action) { Player.definitionCommand(action); } : null,
      chainLinks: (slide.style === 'conceptchain' || slide.conceptChain)
        ? (Player.chainLinks || []) : null,
      chainPending: (slide.style === 'conceptchain' || slide.conceptChain)
        ? (Player.chainPending || '') : '',
      chainCommand: (slide.style === 'conceptchain' || slide.conceptChain)
        ? function (action, value) { Player.chainCommand(action, value); } : null,
      trackLength: deck.trackLength || 5,
      /* A typed answer is held back on the projected screen while the room is
         still typing, so the slide has to know whether this is a live room and
         whether this question has been revealed yet. */
      live: !!(SF.Live && SF.Live.active),
      revealed: !!(SF.Live && SF.Live.revealed && SF.Live.revealed[slide.id]) ||
        ((slide.style === 'conceptchain' || slide.conceptChain) &&
          Player.answers[slide.id] != null),
      join: slide.type === 'join'
        ? ((SF.Live && SF.Live.active && SF.Live.joinInfo && SF.Live.joinInfo()) ||
           SF.sampleJoinInfo())
        : null,
      pairBank: (slide.style === 'memorymatch' || slide.style === 'memoryflip')
        ? (Player.spontaneous ? Player.spontaneous.slides : deck.slides).filter(function (s) {
            return s.type === 'quiz' && s.style === slide.style;
          }).map(function (s) {
            return {
              term: s.term || s.question || '',
              active: s.id === slide.id
            };
          })
        : null
    });

    var old = Player._current;
    var tr = slide.transition || 'fade';
    /* Morph asks the browser to carry a shared thing across the cut — the same
       heading, the same picture, the same chart — instead of dissolving one
       slide into another. Where that is not available it is a fade, which is
       what it would have been anyway. */
    var morphing = tr === 'morph' && canMorph(old, node, slide);
    if (tr === 'morph') tr = morphing ? 'none' : 'fade';

    var place = function () {
      viewport.classList.toggle('back', dir < 0);
      node.classList.add('entering');
      if (tr !== 'none') node.classList.add('tr-' + tr);
      viewport.appendChild(node);
      SF.fit(viewport, node);

      if (old) {
        /* Before the transition, not after: the outgoing slide lingers for up
           to 700ms and a soundtrack playing over the next slide is worse than
           a hard cut. */
        stopVideo(old);
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
    };

    if (morphing) {
      /* The swap has to happen inside the callback: the browser photographs
         the named elements before it runs and again after, and animates
         between the two. Nothing here waits on the result — a transition the
         browser abandons must not leave the slide unplaced. */
      try {
        /** @type {any} */ (document).startViewTransition(function () { place(); clearMorph(old); });
      } catch (e) {
        clearMorph(old);
        place();
      }
    } else {
      /* Any name left over from a previous morph comes off now. It is inert
         while no view transition is running, but a stale name is a name that
         will be captured the next time one is — and two elements sharing one
         is an error the browser resolves by ignoring both. */
      clearMorph(old);
      place();
    }

    Player._current = node;
    /* Which slide is on the wall, kept for the next render: a morph has to ask
       "is the incoming slide about the same thing as the one leaving", and by
       then the outgoing slide's data is no longer to hand. */
    Player._currentSlide = slide;
    /* A redraw must not throw away a walk in progress — the desk syncs, the
       ink bar opens, a repaint happens, and the chart would snap back out. */
    if (SF.Callouts) SF.Callouts.restore(Player, slide, node);
    /* The entry transition is still running when the first fit pass happens,
       and dropping the transition classes can nudge the layout. Re-fit once
       the slide has settled so the chosen type size is the final one.
 
       Settling cannot hang off the entering box's own animationend alone. A
       fade now animates the slide's children rather than the box, so the event
       arrives by bubbling; `transition: none` animates nothing at all and the
       event never arrives. Same shape as the outgoing slide's removal above:
       whichever of the two comes first wins, and it runs once. */
    var settled = false;
    var settle = function () {
      if (settled) return;
      settled = true;
      node.classList.remove('entering', 'tr-' + tr);
      node.style.position = 'absolute';
      if (viewport) SF.fit(viewport, node);
      if (slide.type === 'quiz') fitQuizSlide(node);
    };
    if (tr === 'none') settle();
    else {
      node.addEventListener('animationend', settle, { once: true });
      setTimeout(settle, 700);
    }

    if (hudPos) {
      hudPos.textContent = wall.spontaneous
        ? ('⚡ ' + (wall.index + 1) + ' / ' + wall.total)
        : ((Player.idx + 1) + ' / ' + deck.slides.length);
    }
    syncSpontaneousPill();
    /* The live results sit along the bottom of a question slide, which is
       where the Q&A cue would otherwise be. Marked so the cue can move up and
       clear them — and by how much, because a tally of bars and a number line
       with stacked placings are not the same height. */
    viewport.classList.toggle('quiz-slide', slide.type === 'quiz');
    viewport.classList.toggle('quiz-line', slide.type === 'quiz' && slide.input === 'number');

    if (slide.type === 'quiz') {
      wireQuiz(node, slide);
      scheduleQuizFit(node);
    } else if (slide.timeLimit > 0) {
      startSlideTimer(node, slide);
    }

    /* The rail persists across slides, so its surface has to follow the one
       that just arrived. */
    SF.railSurface(Player._rail, node);
    syncMedia(slide, node);
    syncHudRoomButtons();
    Player.emit('slide', { slide: slide, index: wall.index, node: node, spontaneous: wall.spontaneous });
    if (SF.Boards) SF.Boards.mount(Player, slide, node);
    /* Host live owns the rail/focus; solo Present still honours the authored
       Beside / Full screen choice with sample responses for rehearsal. */
    syncAuthoredFeedback(slide);
    updateSolo();
    syncPresenter();
  }

  /** The field for a race question, or null for anything that is not a race. */
  function raceField(deck) {
    if (!deck || deck.mechanic !== 'race') return null;
    if (Player.lanesProvider) {
      var live = Player.lanesProvider();
      if (live && live.length) return live;
    }
    var teams = (deck.quiz && deck.quiz.teams) || [];
    if (!teams.length) return null;
    /* Not hosting: the teacher runs the race, so the track is ours to keep.
       This used to return the teams at position 0 every time it was asked,
       which drew the starting gate on every question and never moved anyone —
       a race that could not be run without phones in the room. */
    if (SF.Race) {
      var track = SF.Race.forDeck(deck, teams.map(function (t, i) {
        return { key: 't' + i, name: t.name || t, color: SF.teamColor(i) };
      }));
      if (track) return SF.Race.standings(track);
    }
    return teams.map(function (t, i) {
      return { key: 't' + i, name: t.name || t, color: SF.teamColor(i), pos: 0 };
    });
  }

  /** The fight, when nobody is hosting it for us. */
  function bossFight(deck) {
    if (!deck || deck.mechanic !== 'boss' || !SF.Boss) return null;
    if (Player.lanesProvider) return null;       // a live room owns its own HP
    var qs = deck.slides.filter(function (s) { return s.type === 'quiz' && (!deck.presenterGameId || s.gameId === deck.presenterGameId); });
    if (!qs.length) return null;
    var teams = (deck.quiz && deck.quiz.teams) || [];
    var who = (deck.quiz && deck.quiz.mode === 'teams' && teams.length)
      ? teams.map(function (t) { return t.name || t; })
      : ['The class'];
    var fight = SF.Boss.forDeck(deck, qs, who, qs[0].timeLimit || 0);
    /* Point it at the question on screen. The slide is the truth; a fight
       keeping its own count drifts away from it the first time it is used. */
    var here = deck.slides[Player.idx];
    if (fight && here && here.type === 'quiz') {
      SF.Boss.focus(deck, qs.indexOf(here));
      fight = SF.Boss.forDeck(deck);
    }
    return fight;
  }

  /** What the renderer needs to draw the fight. */
  function bossView(deck) {
    var f = bossFight(deck);
    if (!f) return null;
    var q = SF.Boss.current(f);
    return { hp: f.hp, max: f.max, stage: SF.Boss.stage(f),
      revealed: f.revealed, expired: f.expired, phase: f.phase,
      marked: SF.Boss.isMarked ? SF.Boss.isMarked(f) : false,
      turnName: f.participants[SF.Boss.turn(f)] || '',
      /* Named rather than drawn as an empty question. */
      gap: q && !q.ready ? 'Q' + (f.index + 1) + ' has no question written yet' : '',
      verdict: SF.Boss.verdict(f) };
  }

  Player.bossCommand = function (action, opts) {
    var deck = this.deck;
    if (!bossFight(deck)) return;
    /* Nothing has started until the first question is on screen, so the first
       press starts the fight as well as doing what it says. */
    var f = SF.Boss.forDeck(deck);
    if (f && f.phase === 'ready') SF.Boss.command(deck, 'start');
    /* A hit or a miss implies the answer is out. The fight only scores while
       it is marking, so a caller that marks straight off the room's answers —
       the demo class, and any relay that reveals for us — used to be ignored
       in silence: the rail announced damage and the HP bar never moved. */
    if (action === 'hit' || action === 'miss') {
      var asking = SF.Boss.forDeck(deck);
      if (asking && asking.phase === 'asking') SF.Boss.command(deck, 'reveal');
    }
    SF.Boss.command(deck, action);
    renderCurrent(0);
    /* Marked means done with this one, so the room moves on with the fight —
       otherwise the teacher marks a question the wall is still showing.
       Only when the press came from the wall: a mark that followed the room's
       own answers would otherwise skip past the explanation it just revealed. */
    if ((action === 'hit' || action === 'miss') && !(opts && opts.advance === false)) {
      var fight = SF.Boss.forDeck(deck);
      if (fight && fight.phase !== 'complete') setTimeout(function () { Player.next(); }, 650);
    }
  };

  /** Whether the teacher is the one moving the field. */
  function raceIsOurs(deck) {
    return !!(deck && deck.mechanic === 'race' && !Player.lanesProvider && SF.Race);
  }

  /** Move a lane and repaint the question it was moved from. */
  Player.raceStep = function (key, action) {
    var deck = this.deck;
    if (!raceIsOurs(deck)) return;
    SF.Race.command(deck, action || 'advance', key);
    renderCurrent(0);
  };

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
    var odd = slide.style === 'oddone' || slide.oddoneDiscuss;
    Array.prototype.forEach.call(buttons, function (b) {
      var i = Number(b.dataset.choice);
      b.classList.add('locked');
      if (odd) {
        if (i === slide.correct) b.classList.add('odd-marked', 'correct');
        else b.classList.add('muted');
        var tick = b.querySelector('.tick');
        if (tick) tick.textContent = i === slide.correct ? 'odd one' : '';
      } else if (typed || i === slide.correct) b.classList.add('correct');
      else if (i === choice) b.classList.add('wrong');
      else b.classList.add('muted');
    });
    if (typed) {
      revealTypedAnswer(node);
    }
    var discuss = node.querySelector('.oddone-discuss, .compare-discuss');
    if (discuss) discuss.remove();
    if (slide.style === 'compare' || slide.compareDiscuss) {
      var panels = node.querySelector('.compare-panels');
      if (panels) panels.classList.add('on');
    }
    /* Expands the reasoning inside the correct answer's box, if the question
       carries one and the game shows it inline. */
    if (node.classList.contains('has-why')) {
      flattenOverlay(node);
      node.classList.add('why-open');
      scheduleFit(node);
    }
    if (Player._liveTally) openTally(node);
    /* The answer is out, so the thinking time is over. Both reveal paths \u2014
       an answer and the clock running out \u2014 come through here. */
    stopMusic();
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
    /* Whichever heading is actually on screen. Emoji guess has two in the
       title row — the instruction, and the hint that replaces it — so sizing
       the first one blindly fitted a heading nobody could see. */
    var heads = Array.prototype.slice.call(node.querySelectorAll('.qhead .q'));
    var q = heads.filter(function (n) { return n.offsetParent !== null; })[0] || heads[0];
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

  /* ------------------------------------------------------------ media */
  /* Playback is here and not in render.js because the only thing that knows a
     slide has arrived, been blanked, or left is the player. render.js marks
     intent with data-autoplay and this decides when to honour it \u2014 which is
     also what keeps the editor's preview silent. */

  var music = null;
  var musicTold = '';   /* the track a failure has already been reported for */

  function hush(p) {
    /* play() rejects when the browser has not seen a gesture yet, and an
       unhandled rejection in a presentation is a console full of red at the
       worst moment. Silence is the correct fallback: the controls are there. */
    if (p && typeof p.catch === 'function') p.catch(function () {});
  }

  /** The music bed a game asked for, or '' \u2014 see compileGame in model.js. */
  function musicTrack() {
    return (Player.deck && Player.deck.music) || '';
  }

  function playMusic() {
    var src = musicTrack();
    if (!src || Player.blank) return;
    if (!music) {
      music = document.createElement('audio');
      music.loop = true;
      /* In the document rather than detached. A detached element does play,
         but it is invisible to anything inspecting the page and browsers do
         not treat it identically under the autoplay policy. */
      music.hidden = true;
      music.dataset.role = 'quiz-music';
      root.appendChild(music);
      /* A question is 20 seconds and a track is three minutes, so every
         question would open on the same four bars. Carrying on from where it
         stopped means the bed moves through the game. */
      music.preload = 'auto';
      music.addEventListener('error', function () {
        if (musicTold === music.getAttribute('src')) return;
        musicTold = music.getAttribute('src') || '';
        SF.toast('The music track could not be loaded \u2014 check the path or re-add the file.');
      });
    }
    if (music.src !== src && music.getAttribute('src') !== src) {
      music.src = src;
      musicTold = '';
    }
    var vol = Player.deck && Player.deck.musicVolume;
    music.volume = Math.max(0, Math.min(100, vol == null ? 55 : vol)) / 100;
    /* Failure used to be silent in both directions — a missing file and a
       browser that has not seen a gesture yet looked identical from the room,
       which is how "I added an mp3 and nothing happened" happens. Said once per
       track, so a presenter is told rather than left guessing. */
    var p = music.play();
    if (p && typeof p.catch === 'function') {
      p.catch(function () {
        if (musicTold === src) return;
        musicTold = src;
        SF.toast(music.error
          ? 'The music track could not be loaded \u2014 check the path or re-add the file.'
          : 'The browser blocked the music until you interact with the page. Click the slide once and it will start.');
      });
    }
  }

  function stopMusic() {
    if (music) music.pause();
  }

  /** Pause any video inside a node, so a slide on its way out goes quiet. */
  function stopVideo(node) {
    if (!node) return;
    Array.prototype.forEach.call(node.querySelectorAll('video'), function (v) {
      v.pause();
    });
    /* An embedded player lives in another document, so it cannot be paused
       from here — but emptying the frame stops it dead. Without this a YouTube
       clip carries on talking underneath the next slide. */
    Array.prototype.forEach.call(node.querySelectorAll('iframe.vid-embed'), function (f) {
      if (f.getAttribute('src')) { f.dataset.src = f.getAttribute('src'); f.removeAttribute('src'); }
    });
  }

  /**
   * Called once a slide is on screen.
   *
   * The music plays under an open question and stops on reveal, so a room
   * hears the bed exactly while it is thinking. Anything else \u2014 a title, an
   * explanation, the scoreboard \u2014 is silence.
   */
  function syncMedia(slide, node) {
    if (musicTrack()) {
      var thinking = slide.type === 'quiz' && Player.answers[slide.id] == null &&
        !(SF.Live && SF.Live.revealed && SF.Live.revealed[slide.id]);
      if (thinking) playMusic(); else stopMusic();
    }
    var v = node && node.querySelector('video[data-autoplay]');
    if (!v || Player.blank) return;

    /* Seek first, play second.
       Calling play() while the file is still at readyState 0 and letting the
       start offset seek land underneath it does not work: the browser pauses
       the pending playback, resolves the seek to zero, and the clip opens on
       the wrong frame. The trace was play(t=0) -> loadedmetadata(t=3) ->
       seeking(t=3) -> pause -> seeked(t=0). So wait for the seek that
       layoutVideo asked for, then start. */
    var start = Number(v.dataset.start) || 0;
    if (start > 0 && v.currentTime < start - 0.01) {
      v.addEventListener('seeked', function () {
        if (!Player.blank) hush(v.play());
      }, { once: true });
      /* A file with no seekable range never fires 'seeked', and a slide that
         silently never starts is worse than one that starts in the wrong
         place. Play anyway if nothing has happened. */
      setTimeout(function () {
        if (v.parentNode && v.paused && !Player.blank) hush(v.play());
      }, 1400);
    } else {
      hush(v.play());
    }
  }

  function answer(slide, choice) {
    if (Player.answers[slide.id] != null) return;   // one shot
    if ((slide.style === 'conceptchain' || slide.conceptChain) &&
        !tryAcceptChain(slide, choice)) return;
    Player.answers[slide.id] = choice;
    stopTimer();
    if (Player._current) paintAnswer(Player._current, slide, choice);
    /* After Accept, re-render so the grown chain is on the wall. */
    if ((slide.style === 'conceptchain' || slide.conceptChain) && choice === 0) {
      renderCurrent(0);
    }
    updateSolo();
    Player.emit('answer', {
      slide: slide,
      choice: choice,
      correct: choice === slide.correct
    });
    syncPresenter();
  }

  /** Accept only with a typed link; Reject / skip leave the chain unchanged. */
  function tryAcceptChain(slide, choice) {
    if (choice !== 0) {
      Player.chainPending = '';
      return true;
    }
    var link = String(Player.chainPending || '').trim();
    if (!link) {
      SF.toast('Type the proposed link before Accept');
      return false;
    }
    Player.chainLinks = Player.chainLinks || [];
    Player.chainLinks.push({
      term: String(slide.term || slide.question || '').trim(),
      link: link.slice(0, 160)
    });
    Player.chainPending = '';
    return true;
  }

  Player.chainCommand = function (action, value) {
    if (action === 'pending') {
      Player.chainPending = String(value == null ? '' : value).slice(0, 160);
      syncPresenter();
      return;
    }
    if (action === 'clear') {
      Player.chainLinks = [];
      Player.chainPending = '';
    }
  };

  Player.tryAcceptChain = tryAcceptChain;

  /** Reveal without attributing an answer — used when the clock runs out. */
  function timeUp(slide) {
    /* A boss question the clock beat is a miss the fight has to record, and
       it has to happen before the early return below — a revealed answer is
       exactly the state a timeout leaves behind. */
    if (bossFight(Player.deck)) {
      var f = SF.Boss.forDeck(Player.deck);
      if (f && f.phase === 'asking') {
        SF.Boss.command(Player.deck, 'expire');
        renderCurrent(0);
      }
    }
    /* Definition Challenge: the first clock is reading time. Expiry hides the
       passage and opens the recall question with a fresh clock — it does not
       reveal the answer. */
    if (slide && slide.style === 'definition') {
      var st = definitionState(slide);
      if (st.phase === 'reading') {
        Player.definitionStates[slide.id] = SF.definitionTransition(st, 'expire');
        stopTimer();
        renderCurrent(0);
        Player.emit('definitionAsk', { slide: slide });
        return;
      }
    }
    /* Concept Chain timeout skips — clear the draft, do not grow the chain. */
    if (slide && (slide.style === 'conceptchain' || slide.conceptChain)) {
      Player.chainPending = '';
    }
    if (Player.answers[slide.id] != null) return;
    Player.answers[slide.id] = -1;
    if (Player._current) paintAnswer(Player._current, slide, -1);
    updateSolo();
    Player.emit('timeup', { slide: slide });
  }

  function definitionState(slide) {
    Player.definitionStates = Player.definitionStates || {};
    if (!Player.definitionStates[slide.id]) {
      Player.definitionStates[slide.id] = SF.definitionCreate(slide.timeLimit || 30);
    }
    return Player.definitionStates[slide.id];
  }

  Player.definitionCommand = function (action) {
    var slide = Player.deck && Player.deck.slides[Player.idx];
    if (!slide || slide.style !== 'definition') return;
    var before = definitionState(slide);
    if (action !== 'ask' && action !== 'expire' && action !== 'restart') return;
    if (action === 'restart') {
      Player.definitionStates[slide.id] = SF.definitionTransition(before, 'restart');
      if (Player.answers[slide.id] != null) delete Player.answers[slide.id];
      stopTimer();
      renderCurrent(0);
      return;
    }
    if (before.phase !== 'reading') return;
    Player.definitionStates[slide.id] = SF.definitionTransition(before, action);
    stopTimer();
    renderCurrent(0);
    Player.emit('definitionAsk', { slide: slide });
  };

  Player.definitionPhase = function (slide) {
    if (!slide || slide.style !== 'definition') return null;
    return definitionState(slide).phase;
  };

  Player.answer = function (choice) {
    var s = Player.deck && Player.deck.slides[Player.idx];
    if (s && s.type === 'quiz') answer(s, choice);
  };

  Player.resetScores = function () {
    Player.answers = {};
    renderCurrent(0);
    toast('Quiz answers cleared');
  };

  /* ------------------------------------------------------------ countdown */

  function startTimer(node, slide) {
    var clock = node.querySelector('.clock');
    if (!clock) return;
    if (!SF.questionTimeLimit(slide, SF.Live && SF.Live.active && SF.Live.players.some(function(p){return p.manual;}))) { clock.hidden=true; clock.style.display='none'; return; }
    var ringEl = clock.querySelector('.ring');
    var numEl = clock.querySelector('.n');
    if (!ringEl || !numEl) return;
    var total = slide.timeLimit;
    var dash = Number(ringEl.getAttribute('stroke-dasharray'));
    var endAt = Date.now() + total * 1000;

    Player._timer = setInterval(function () {
      var left = Math.max(0, endAt - Date.now()) / 1000;
      var frac = left / total;
      ringEl.setAttribute('stroke-dashoffset', String(dash * (1 - frac)));
      numEl.textContent = String(Math.ceil(left));
      clock.classList.toggle('hurry', left <= 5);
      if (left <= 0) {
        stopTimer();
        timeUp(slide);
      }
    }, 100);
  }

  /* The activity clock. Deliberately not startTimer: that one ends by revealing
     a quiz answer, and an activity has no answer to reveal — it just runs out,
     and the room is told so rather than being moved on. Counted from wall time
     rather than from ticks, so it stays honest if the tab is backgrounded. */
  function startSlideTimer(node, slide) {
    var clock = node.querySelector('.clock');
    if (!clock) return;
    var ringEl = clock.querySelector('.ring');
    var numEl = clock.querySelector('.n');
    if (!ringEl || !numEl) return;
    var total = slide.timeLimit;
    var dash = Number(ringEl.getAttribute('stroke-dasharray'));
    var endAt = Date.now() + total * 1000;

    Player._timer = setInterval(function () {
      var left = Math.max(0, endAt - Date.now()) / 1000;
      ringEl.setAttribute('stroke-dashoffset', String(dash * (1 - left / total)));
      numEl.textContent = SF.clockFace(left);
      clock.classList.toggle('hurry', left <= 60);
      if (left <= 0) {
        stopTimer();
        clock.classList.add('done');
        /* Time up turns the card: the attempt is over, so the answer is what
           the room should be looking at. The teacher can turn it back. */
        if (node.querySelector('.flip')) node.classList.add('flipped');
      }
    }, 250);
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
    if (Player._rail && Player._railMode !== mode) {
      Player._rail.remove();
      Player._rail = null;
    }
    /* Feedback rail must carry the join panel above the body. Rebuild if an
       older shell is missing it or still has it under an empty stretch. */
    if (Player._rail && mode === 'feedback') {
      var join = Player._rail.querySelector('.rail-join');
      var body = Player._rail.querySelector('.fb-body');
      var joinFirst = join && body &&
        !!(join.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_FOLLOWING);
      if (!joinFirst) {
        Player._rail.remove();
        Player._rail = null;
      }
    }
    if (!Player._rail) {
      Player._rail = mode === 'feedback' ? SF.feedbackRail(Player.deck) : SF.scoreRail(Player.deck);
      Player._railMode = mode;
      if (viewport) viewport.appendChild(Player._rail);
    }
    if (viewport) viewport.classList.add('railed');
    SF.railSurface(Player._rail, Player._current);
    /* A fresh shell has an empty news box; anything still within its few
       seconds goes back into it. */
    paintNotes();
    if (Player._current && Player._current.classList.contains('layout-quiz')) {
      scheduleQuizFit(Player._current);
    }
    if (Player._solo) {            // the rail supersedes the solo tally
      Player._solo.remove();
      Player._solo = null;
      if (viewport) viewport.classList.remove('soloed');
    }
    scaleOverlays();
    relayout();
    syncHudRoomButtons();
    if (opts) SF.paintScoreRail(Player._rail, opts.rows || [], opts);
  };

  /**
   * A line in the rail that says what just happened, then goes.
   *
   * Arrivals mostly — someone joining mid-lesson is worth a glance and not
   * worth a permanent row, and the roster underneath already carries who is
   * in. Kept to a few at a time so a class arriving at once is one movement
   * rather than a column of announcements.
   */
  Player.railNote = function (text) {
    if (!text) return;
    /* Held on Player rather than written straight into the rail, because the
       rail is replaced whenever the feed switches or its shell changes — and
       a note appended a moment before that lands in a detached node and is
       never seen. State that outlives the element it is drawn in has to live
       outside it. */
    Player._notes = (Player._notes || []).concat({
      text: text,
      /* A deadline rather than a timer per note: on a projector that may be
         on a hidden tab, animations never end and timers are the only clock
         that keeps running. */
      until: Date.now() + 4200
    }).slice(-3);
    paintNotes();
    setTimeout(paintNotes, 4300);
  };

  function paintNotes() {
    var box = /** @type {HTMLElement | null} */ (Player._rail && Player._rail.querySelector('.rail-news'));
    var now = Date.now();
    Player._notes = (Player._notes || []).filter(function (n) { return n.until > now; });
    if (!box) return;
    var live = Player._notes;
    /* Rebuilt only when the set has changed, so a repaint does not restart
       every note's slide-in animation. */
    if (box.dataset.showing === live.map(function (n) { return n.text; }).join('\u0000')) return;
    box.dataset.showing = live.map(function (n) { return n.text; }).join('\u0000');
    box.textContent = '';
    var b = box;
    live.forEach(function (n) { b.appendChild(el('div', 'rnote', n.text)); });
    /* A note is 40-odd px the board did not have a moment ago. Said on the
       rail so the rows can tighten for as long as it is up, rather than
       having the bottom of the board clipped mid-row. */
    if (Player._rail) Player._rail.classList.toggle('has-news', live.length > 0);
  }

  Player.setScoreboard = function (rows, opts) {
    Player.enableRail(null, 'scores');
    SF.paintScoreRail(Player._rail, rows || [], opts || {});
  };

  /** Show the room's responses to the prompt on the current slide. */
  Player.setFeedback = function (digest, opts) {
    Player.enableRail(null, 'feedback');
    SF.paintFeedbackRail(Player._rail, digest, opts || {});
  };

  Player.disableRail = function () {
    if (Player._rail) { Player._rail.remove(); Player._rail = null; Player._railMode = null; }
    if (!root) return;
    if (viewport) viewport.classList.remove('railed');
    syncHudRoomButtons();
    relayout();
  };

  /**
   * How much of the screen the room gets: nothing, a third, or all of it.
   *
   * S cycles rather than toggles. The question a host has mid-lesson is not
   * "sidebar or no sidebar" but "how much room should the room get right
   * now" — and one key with three stops is less to remember than a key per
   * state. E still jumps straight to full screen for when that is the only
   * thing wanted.
   *
   *   hidden  →  split with the slide  →  over the slide  →  hidden
   *
   * The middle stop is called "beside the slide" everywhere a teacher reads
   * it, and the state string is 'rail' — the deck model's own word for the
   * same arrangement (feedback.presentAs). The cross-window message is the
   * one place the old 'beside' / 'full' tokens survive: a desk opened before
   * this change is still comparing against them, so the wire keeps speaking
   * the old words and both ends translate at the boundary. See ROOM_VIEW_WIRE.
   *
   * A stop with nothing in it is skipped rather than landed on: with nobody
   * joined and no prompt open there is nothing to put on the whole screen, so
   * the cycle goes straight back to hidden instead of stopping on a "nothing
   * to expand" toast.
   */
  /* 'rail' and 'focus' are the deck model's own words for these two states
     (see feedback.presentAs); the panel just adds an off stop in front of
     them. It used to answer 'beside' and 'full', which meant the same slide
     arrangement had one name in the saved deck and another in the DOM. */
  Player.roomSidebarState = function () {
    if (Player._focus) return 'focus';
    if (Player._rail) return 'rail';
    return 'hidden';
  };

  Player.toggleRoomSidebar = function (opts) {
    var live = !!(SF.Live && SF.Live.active);
    var slide = Player.deck && Player.deck.slides[Player.idx];
    var hasFeedback = !!(SF.slideFeedback && SF.slideFeedback(slide));
    var state = Player.roomSidebarState();

    /* An explicit close, from somewhere that wants it gone rather than
       cycled — leaving a slide with a prompt on it, mostly. */
    if (opts && opts.close) state = 'focus';

    if (state === 'focus') {
      if (Player._focus) {
        if (live) Player.emit('focusToggle', { close: true });
        else toggleSoloFeedback({ close: true });
      }
      Player._railWanted = false;
      Player.disableRail();
      SF.toast('Room hidden — S to bring it back');
      syncHudRoomButtons();
      return;
    }

    if (state === 'rail') {
      var canExpand = live
        ? !!(SF.Live.canExpand && SF.Live.canExpand())
        : !!Player._sampleFb;
      if (canExpand) {
        if (live) Player.emit('focusToggle', {});
        else toggleSoloFeedback({});
        syncHudRoomButtons();
        return;
      }
      /* Nothing to fill a screen with, so this stop does not exist today. */
      Player._railWanted = false;
      Player.disableRail();
      syncHudRoomButtons();
      return;
    }

    // hidden → rail
    Player._railWanted = true;
    if (live) {
      Player.emit('sidebarShow', {});
      syncHudRoomButtons();
      return;
    }

    if (hasFeedback) {
      syncAuthoredFeedback(slide);
      SF.toast('Host live for the real join code and live responses');
    } else {
      SF.toast('Host live to show the join QR, PIN, and who’s in the room');
    }
    syncHudRoomButtons();
  };

  function syncHudRoomButtons() {
    if (!hud) return;
    Object.keys(controls).forEach(function (action) {
      var buttons = hud.querySelectorAll('[data-act=' + action + ']');
      buttons.forEach(function (button) {
        button.disabled = !controlEnabled(action);
      });
    });

    var blankButtons = hud.querySelectorAll('[data-act=blank]');
    blankButtons.forEach(function (blankButton) {
      blankButton.setAttribute('aria-pressed', String(Player.blank));
      blankButton.setAttribute('aria-label', Player.blank ? 'Unblank the screen (B)' : 'Blank the screen (B)');
      blankButton.title = Player.blank ? 'Unblank the screen (B)' : 'Blank the screen (B)';
      blankButton.classList.toggle('on', !!Player.blank);
    });

    var fullButton = hud.querySelector('[data-act=full]');
    if (fullButton) {
      var isFull = document.fullscreenElement || /** @type {any} */ (document).webkitFullscreenElement;
      fullButton.textContent = isFull ? 'Leave full screen' : 'Full screen';
    }

    var railBtns = hud.querySelectorAll('[data-act=rail]');
    var state = Player.roomSidebarState();
    railBtns.forEach(function (railBtn) {
      railBtn.classList.toggle('on', state !== 'hidden');
      railBtn.dataset.state = state;
      /* The title says what the next press does, not what the state is — the
         state is already visible on screen, and what a host wants from a
         tooltip mid-lesson is where the button will take them. */
      var nextTip = state === 'hidden'
        ? 'Put the room beside the slide (S)'
        : state === 'rail'
          ? 'Put the room full screen (S)'
          : 'Hide the room (S)';
      railBtn.title = nextTip;
      railBtn.setAttribute('aria-label', nextTip);
    });

    var joinBtns = hud.querySelectorAll('[data-act=join]');
    var card = document.getElementById('joincard');
    var isCardOn = !!(card && card.classList.contains('on'));
    joinBtns.forEach(function (joinBtn) {
      joinBtn.classList.toggle('on', isCardOn);
    });

    var focusBtns = hud.querySelectorAll('[data-act=focus]');
    var kind = (SF.Live && SF.Live.active && SF.Live.expandKind)
      ? SF.Live.expandKind() : null;
    var focusLabel;
    if (Player._focus) {
      focusLabel = kind === 'responses' ? 'Hide responses'
        : kind === 'race' ? 'Hide race'
          : 'Hide leaderboard';
    } else if (kind === 'responses') {
      focusLabel = 'Expand responses';
    } else if (kind === 'race') {
      focusLabel = 'Show race';
    } else {
      /* Default name even before scores exist — hosts look for this. */
      focusLabel = 'Show leaderboard';
    }
    focusBtns.forEach(function (focusBtn) {
      focusBtn.classList.toggle('on', !!Player._focus);
      focusBtn.textContent = focusLabel;
      focusBtn.title = focusLabel + ' (E)';
      focusBtn.setAttribute('aria-label', focusLabel);
    });

    /* The next button says which of its jobs it is about to do. Four outcomes
       shared one label, which is most of the confusion around running a live
       question. */
    var nextBtn = hud.querySelector('[data-act=next]');
    if (nextBtn) {
      var act = (SF.Live && SF.Live.nextAction) ? SF.Live.nextAction() : 'advance';
      var label = (SF.Live && SF.Live.NEXT_LABEL && SF.Live.NEXT_LABEL[act]) || 'Next slide';
      nextBtn.title = label + ' (\u2192 or space)';
      nextBtn.setAttribute('aria-label', label);
      nextBtn.classList.toggle('will-reveal', act === 'reveal');
      nextBtn.classList.toggle('will-hold', act === 'hold');
    }

    var pollBtns = hud.querySelectorAll('[data-act=poll]');
    var pollActive = !!(SF.Live && SF.Live.customPromptOpen && SF.Live.customPromptOpen());
    pollBtns.forEach(function (pollBtn) {
      pollBtn.classList.toggle('on', pollActive);
      pollBtn.setAttribute('aria-pressed', String(pollActive));
      var tip = pollActive ? 'End the active impromptu poll (V)' : 'Ask the room a quick question (V)';
      pollBtn.title = tip;
      pollBtn.setAttribute('aria-label', tip);
      if (pollBtn.closest('#hudMore')) {
        pollBtn.textContent = pollActive ? 'End quick poll' : 'Quick poll';
      }
    });

    var freezeBtns = hud.querySelectorAll('[data-act=freeze]');
    var isFrozen = !!Player.frozen;
    freezeBtns.forEach(function (freezeBtn) {
      freezeBtn.classList.toggle('on', isFrozen);
      freezeBtn.setAttribute('aria-pressed', String(isFrozen));
      var fTip = isFrozen ? 'Unfreeze screen (Z or Alt+F)' : 'Freeze screen for digression (Z or Alt+F)';
      freezeBtn.title = fTip;
      freezeBtn.setAttribute('aria-label', fTip);
      if (freezeBtn.closest('#hudMore')) {
        freezeBtn.textContent = isFrozen ? 'Unfreeze screen' : 'Freeze screen';
      }
    });

    var rxBtns = hud.querySelectorAll('[data-act=reactions]');
    var rxOn = !(SF.Live && SF.Live.reactions === false);
    rxBtns.forEach(function (rxBtn) {
      rxBtn.classList.toggle('on', rxOn);
      rxBtn.textContent = rxOn ? 'Reactions: On' : 'Reactions: Off';
      rxBtn.title = rxOn ? 'Turn audience reactions off (T)' : 'Turn audience reactions on (T)';
    });
    /* Desk labels (Blank / Room / Join QR / …) must track the wall in real
       time — many room paths only refresh the HUD, and teachers look at the
       desk, not the projector chrome. */
    if (presenter.win() && !presenter.win().closed) syncPresenter();
  }
  Player.syncHudRoomButtons = syncHudRoomButtons;

  /* Solo Present: honour Beside / Full screen with an empty live-shaped
     panel. Sample responses stay in the editor preview; the join code and
     real replies only exist once Host live is running. */
  Player._sampleFb = null;
  Player._railWanted = true;

  function syncAuthoredFeedback(slide) {
    if (SF.Live && SF.Live.active) return;
    /* Same reason as goTo: a slide with no feedback of its own must not take
       down a poll that was never the slide's to begin with. */
    if (SF.Live && SF.Live.customPromptOpen && SF.Live.customPromptOpen()) return;
    var f = SF.slideFeedback(slide);
    if (!f) {
      Player._sampleFb = null;
      Player.disableRail();
      if (Player._focus) Player.closeFocus();
      return;
    }
    if (Player._railWanted === false) {
      Player._sampleFb = { digest: null, view: null, slide: slide };
      return;
    }
    var isDemo = !!(Player.deck && Player.deck.isDemo) || !!(root && root.classList.contains('is-demo')) || !!(SF.Demo && SF.Demo.active);
    var digest = isDemo && SF.sampleFeedbackDigest ? SF.sampleFeedbackDigest(f) : null;
    var view = Object.assign(SF.feedbackViewOpts(f), {
      footnote: isDemo && digest
        ? 'DEMO REHEARSAL · ' + digest.answered + ' sample responses'
        : 'Host live for the join code and live responses',
      emptyText: isDemo ? 'Demo feedback' : 'Host live to open joining',
      sample: isDemo
    });
    Player._sampleFb = { digest: digest, view: view };
    Player.setFeedback(digest, view);
    if (f.presentAs === 'focus') {
      Player.showFeedbackFocus(digest, view);
    } else {
      Player.closeFocus();
    }
    syncHudRoomButtons();
  }

  function toggleSoloFeedback(opts) {
    if (SF.Live && SF.Live.active) return;
    if (!Player._sampleFb) return;
    if ((opts && opts.close) || Player._focus) {
      Player.closeFocus();
      return;
    }
    Player.showFeedbackFocus(Player._sampleFb.digest, Player._sampleFb.view);
  }

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
      if (Player._qacue) { Player._qacue.remove(); Player._qacue = null; }
      return;
    }
    if (!Player._qacue) {
      Player._qacue = el('div', 'qacue');
      Player._qacue.appendChild(el('span', 'qa-dot'));
      Player._qacue.appendChild(el('span', 'qa-text'));
      cuebar().appendChild(Player._qacue);
    }
    Player._qacue.classList.toggle('waiting', pending > 0);
    var txt = Player._qacue.querySelector('.qa-text');
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

  var REACTION_GLYPH = { clap: '👏', yes: '👍', wow: '😮', idea: '💡' };

  /**
   * One reaction, rising and gone.
   *
   * Nothing accumulates: no list, no counter, no history. That is the whole
   * design — a reaction is a gesture, and the moment it is collected into
   * something it becomes a feed, which is the thing this app is deliberately
   * not. It leaves no trace on the wall and none in the journal either.
   *
   * Only ever on a slide that is not asking a question. The foot of a
   * question slide is carrying the answer tally, and a room reacting to a
   * question it is halfway through answering is a distraction rather than a
   * signal.
   */
  Player.showReaction = function (kind) {
    if (!root || !REACTION_GLYPH[kind]) return;
    var slide = Player.deck && Player.deck.slides[Player.idx];
    if (slide && slide.type === 'quiz') return;

    /* Inside the slide, not beside it. The rail and the cue bar live in the
       viewport and are scaled by hand, but they belong to the room rather
       than to the slide; a reaction is reacting to what is on screen and has
       to be measured in the same coordinates. Anchored to the viewport it
       rose through the letterbox bar and was mostly never on the slide at
       all. It also means a slide change takes any glyph still in the air
       with it, which is what should happen to something ephemeral. */
    var node = Player._current;
    if (!node) return;
    var bay = node.querySelector('.reactbay');
    if (!bay) {
      bay = el('div', 'reactbay');
      node.appendChild(bay);
    }
    /* A hard ceiling on live nodes as well as the relay's rate limit: the
       relay bounds how many arrive, this bounds how many are ever animating. */
    if (bay.childElementCount > 24) return;

    var glyph = el('div', 'reaction', REACTION_GLYPH[kind]);
    /* Scattered across the middle of the strip: clear of the cue bar in one
       corner and the slide number in the other, both of which a room needs to
       be able to read while this is happening. */
    glyph.style.left = (22 + Math.random() * 38) + '%';
    glyph.style.setProperty('--drift', (Math.random() * 40 - 20).toFixed(1) + 'px');
    glyph.style.setProperty('--spin', (Math.random() * 24 - 12).toFixed(1) + 'deg');
    glyph.style.animationDelay = (Math.random() * 120).toFixed(0) + 'ms';
    glyph.addEventListener('animationend', function () { glyph.remove(); });
    /* A timer as well as the event, because a hidden tab does not composite
       frames: animations do not advance and animationend never fires, so a
       host who switches away mid-lesson comes back to every reaction sent
       since still sitting there. The node cap bounds that, this clears it. */
    setTimeout(function () { glyph.remove(); }, 4000);
    bay.appendChild(glyph);
  };

  /** Clear anything still in the air — when reactions are switched off. */
  Player.clearReactions = function () {
    var bay = Player._current && Player._current.querySelector('.reactbay');
    if (bay) bay.remove();
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
      if (Player._pacecue) { Player._pacecue.remove(); Player._pacecue = null; }
      return;
    }
    if (!Player._pacecue) {
      Player._pacecue = el('div', 'pacecue');
      Player._pacecue.appendChild(el('span', 'pace-dot'));
      Player._pacecue.appendChild(el('span', 'pace-text'));
      cuebar().appendChild(Player._pacecue);
    }
    var txt = Player._pacecue.querySelector('.pace-text');
    txt.textContent = '';
    txt.appendChild(el('span', 'pace-n', String(digest.counts[digest.kind])));
    txt.appendChild(document.createTextNode(PACE_SAY[digest.kind] || ''));
    scaleOverlays();
  };

  /* ------------------------------------------------------------ live extras */

  /** counts: array of per-option answer counts (live audience mode). */
  Player.setTally = function (counts, progress) {
    syncHudRoomButtons();
    Player._liveTally = counts;
    Player._liveProgress = progress || null;
    if (Player._current) applyTally(Player._current, counts, Player._liveProgress);
  };

  /**
   * What the room typed, once the answer is out. Grouped and counted by the
   * host, which is where the marking happens.
   * @param {Array} groups [{ text, n, right }]
   */
  Player.showTypedAnswers = function (groups) {
    var node = Player._current;
    if (!node) return;
    var box = node.querySelector('.typedgroups');
    var answer = node.querySelector('.opt.answer');
    if (answer) {
      answer.classList.remove('held');
      var txt = answer.querySelector('.txt');
      var slide = Player.deck && Player.deck.slides[Player.idx];
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
    Player.scheduleFit(node);
  };
  function tallyHeld(node) {
    var id = node && node.dataset ? node.dataset.slideId : '';
    var s = id && Player.deck && Player.deck.slides.find(function (x) { return x.id === id; });
    return !!(s && s.holdResults && !(SF.Live && SF.Live.revealed && SF.Live.revealed[s.id]));
  }
  /* Called at the reveal: draw the bars a held question has been keeping. */
  Player.releaseTally = function () {
    if (Player._current && Player._liveTally) applyTally(Player._current, Player._liveTally, Player._liveProgress);
  };
  Player.clearTally = function () {
    Player._liveTally = null;
    if (Player._current) {
      var t = Player._current.querySelector('.tally');
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
    var node = Player._current;
    if (!node) return;
    var slide = Player.deck && Player.deck.slides[Player.idx];
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
    Player.scheduleFit(node);
  };

  /**
   * Open the vote bars — and re-fit the answers, because they are 74px of
   * slide that was not there a moment ago.
   *
   * .opts is flex:1 beside a tally that is zero-height until the reveal, so
   * the fit that ran when the question arrived had 74px more room than the
   * revealed slide has. Nothing re-measured, and the answer boxes spilled
   * over the bars — worst on a boss question, where the crest, the damage
   * badge and the HP bar have already taken the top of the slide.
   */
  function openTally(node) {
    var tally = node && node.querySelector('.tally');
    if (!tally || tally.classList.contains('on')) return;
    tally.classList.add('on');
    /* Whichever fitter owns the layout on screen: fitQuizSlide hands the
       revealed slide over to fitInlineWhy and returns, so calling it here
       would leave the explanation measured against the room it had before
       the bars appeared — and the wrong answers pushed off the bottom. */
    if (node.classList.contains('why-open')) scheduleFit(node);
    else scheduleQuizFit(node);
  }

  function applyTally(node, counts, progress) {
    /* A typed question has no per-option bars — the only live number that
       means anything before the reveal is how many have answered. */
    var said = progress && progress.total
      ? progress.answered + ' of ' + progress.total + ' answered' : '';
    var typedCount = node.querySelector('.typedcount');
    if (typedCount && progress) typedCount.textContent = said;
    var answered = node.querySelector('.answered-count');
    if (answered) answered.textContent = said;
    var tally = node.querySelector('.tally');
    if (!tally) return;
    /* A question set to show results on reveal keeps its bars off the wall
       until then; the count of who has answered still moves. */
    if (tallyHeld(node)) return;
    openTally(node);
    var max = Math.max(1, Math.max.apply(null, counts));
    Array.prototype.forEach.call(tally.querySelectorAll('.col'), function (col, i) {
      var n = counts[i] || 0;
      col.querySelector('.bar').style.height = Math.round((n / max) * 52) + 'px';
      col.querySelector('.cnt').textContent = String(n);
    });
  }

  /** Build the leaderboard slide. */
  Player.leaderboardSlide = function (players, title) {
    var deck = Player.deck;
    if (!deck) return el('div', 'slide');
    var node = el('div', 'slide theme-' + deck.theme + ' layout-section');
    var pad = el('div', 'pad leaderboard');
    pad.style.display = 'block';
    pad.appendChild(el('h2', null, title || 'Leaderboard'));
    var top = players.slice().sort(function (a, b) { return b.score - a.score; }).slice(0, 6);
    if (!top.length) pad.appendChild(el('div', 'none', 'No players yet'));
    /* Shared places for equal scores — 1, 1, 3 — so a tie is visible. */
    var places = [];
    top.forEach(function (p, i) {
      if (i === 0) places.push(1);
      else if (p.score === top[i - 1].score) places.push(places[i - 1]);
      else places.push(i + 1);
    });
    top.forEach(function (p, i) {
      var tied = (i > 0 && p.score === top[i - 1].score) ||
        (i < top.length - 1 && p.score === top[i + 1].score);
      var row = el('div', 'lb-row' + (places[i] === 1 ? ' top1' : '') + (tied ? ' tied' : ''));
      row.appendChild(el('div', 'rank', String(places[i])));
      row.appendChild(el('div', 'who', p.name + (tied ? ' · tied' : '')));
      row.appendChild(el('div', 'pts', String(p.score)));
      pad.appendChild(row);
    });
    node.appendChild(pad);
    return node;
  };

  /** Drop a leaderboard over the deck. `focus` hides the rail and goes wide. */
  Player.showLeaderboard = function (players, title, focus) {
    if (!Player.open || !viewport) return;
    var node = Player.leaderboardSlide(players, title);
    if (focus) { Player.focusOverlay(node); return; }
    node.classList.add('entering', 'tr-fade');
    node.dataset.overlay = '1';
    var prev = viewport.querySelector('[data-overlay]');
    if (prev) prev.remove();
    viewport.appendChild(node);
    SF.fit(viewport, node);
  };
  Player.hideLeaderboard = function () {
    if (!viewport) return;
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
    if (!Player.open || !node || !viewport) return;
    node.dataset.overlay = '1';
    var prev = viewport.querySelector('[data-overlay]');
    if (prev) prev.remove();
    else node.classList.add('entering', 'tr-fade');
    viewport.appendChild(node);
    SF.fit(viewport, node);
    Player._focus = true;
    /* The focused view is the same data the rail shows, so leaving the rail up
       would duplicate it and paint over the top of it. */
    viewport.classList.add('fb-focus');
    syncHudRoomButtons();
  };

  Player.closeFocus = function () {
    if (!Player._focus) return;
    Player._focus = false;
    if (viewport) viewport.classList.remove('fb-focus');
    var prev = viewport ? viewport.querySelector('[data-overlay]') : null;
    if (prev) prev.remove();
    syncHudRoomButtons();
  };

  /** A question, put on the wall for the room to see. */
  Player.showQuestionCard = function (item) {
    if (!Player.open) return;
    if (!item) { Player.closeFocus(); return; }
    Player.focusOverlay(SF.questionCard(Player.deck, item));
  };

  /** The audience responses, focused. */
  Player.showFeedbackFocus = function (digest, opts) {
    Player.focusOverlay(SF.feedbackFocus(Player.deck, digest, opts || {}));
  };

  /* Kept for the older call sites. */
  Player.hideFeedbackFocus = function () { Player.closeFocus(); };

  /** The race track, over the deck. Same overlay slot as the leaderboard. */
  Player.showRaceTrack = function (lanes, opts) {
    if (!Player.open || !viewport) return;
    var node = SF.raceTrack(Player.deck, lanes, opts);
    if (opts && opts.focus) { Player.focusOverlay(node); return; }
    node.classList.add('entering', 'tr-fade');
    node.dataset.overlay = '1';
    var prev = viewport.querySelector('[data-overlay]');
    if (prev) prev.remove();
    viewport.appendChild(node);
    SF.fit(viewport, node);
  };

  Player.showBossBar = function (opts) {
    if (!Player.open || !SF.bossBar || !viewport) return;
    var node = SF.bossBar(Player.deck, opts || {});
    node.classList.add('entering', 'tr-fade');
    node.dataset.overlay = '1';
    var prev = viewport.querySelector('[data-overlay]');
    if (prev) prev.remove();
    viewport.appendChild(node);
    SF.fit(viewport, node);
  };

  Player.showWordReveal = function (opts) {
    if (!Player.open || !SF.wordRevealWall || !viewport) return;
    var node = SF.wordRevealWall(Player.deck, opts || {});
    node.classList.add('entering', 'tr-fade');
    node.dataset.overlay = '1';
    var prev = viewport.querySelector('[data-overlay]');
    if (prev) prev.remove();
    viewport.appendChild(node);
    SF.fit(viewport, node);
  };

  Player.showStudyCards = function (opts) {
    if (!Player.open || !SF.studyCards || !viewport) return;
    var o = opts || {};
    var showDef = !o.hideAfter;
    var paint = function (def) {
      if (!viewport) return;
      var node = SF.studyCards(Player.deck, {
        term: o.term,
        definition: def,
        seconds: o.seconds,
        hideAfter: o.hideAfter
      });
      node.classList.add('entering', 'tr-fade');
      node.dataset.overlay = '1';
      var prev = viewport.querySelector('[data-overlay]');
      if (prev) prev.remove();
      viewport.appendChild(node);
      SF.fit(viewport, node);
    };
    paint(showDef ? o.definition : o.definition);
    if (o.hideAfter && o.seconds > 0) {
      setTimeout(function () {
        if (!Player.open) return;
        paint('');
      }, o.seconds * 1000);
    }
  };

  /* ------------------------------------------------------------ navigation */

  Player.goTo = function (i, dir, force) {
    if (!Player.deck) return;
    /* Strip / goto during a spontaneous overlay moves within that overlay. */
    if (Player.spontaneous && Player.spontaneous.slides) {
      var sn = Player.spontaneous.slides.length;
      i = Math.max(0, Math.min(sn - 1, i));
      if (i === Player.spontaneous.index && Player._current && !force) return;
      dir = dir != null ? dir : (i > Player.spontaneous.index ? 1 : -1);
      Player.spontaneous.index = i;
      Player.hideLeaderboard();
      Player.closeFocus();
      Player.clearTally();
      renderCurrent(dir);
      return;
    }
    var n = Player.deck.slides.length;
    i = Math.max(0, Math.min(n - 1, i));
    if (i === Player.idx && Player._current && !force) return;
    dir = dir != null ? dir : (i > Player.idx ? 1 : -1);
    Player.idx = i;
    saveRun();

    if (Player.frozen && !force) {
      if (hudPos) {
        hudPos.textContent = ((Player._frozenSlideIdx != null ? Player._frozenSlideIdx : i) + 1) + ' / ' + n + ' ❄️';
      }
      syncPresenter();
      return;
    }

    Player.hideLeaderboard();
    /* A slide's own focus view belongs to that slide and leaves with it. An
       impromptu poll does not: the teacher is often still moving through the
       deck behind it while the room answers, so only ending it takes it down.
       It is re-appended after the render because renderCurrent adds the new
       slide on top of whatever is already in the viewport. */
    var keepPoll = !!(SF.Live && SF.Live.customPromptOpen && SF.Live.customPromptOpen() && Player._focus);
    if (!keepPoll) Player.closeFocus();
    Player.clearTally();
    renderCurrent(dir);
    if (keepPoll && SF.Live.repaintPrompt) SF.Live.repaintPrompt();
  };
  /* Live mode installs a gate so the first "next" on an unanswered question
     reveals the answer instead of skipping past it. Return true to swallow. */
  Player.gate = null;

  Player.next = function () {
    if (!Player.frozen && Player._current && Player._current._codeTypewrite &&
        Player._current._codeTypewrite.busy && Player._current._codeTypewrite.finish) {
      Player._current._codeTypewrite.finish();
      return;
    }
    if (!Player.frozen && SF.Explore && SF.Explore.step(Player, 1)) return;
    if (SF.Teaching && SF.Teaching.next()) return;
    /* After the build, before the deck: a chart's callouts are the last steps
       inside the slide, so the bars arrive first and are then walked. */
    if (!Player.frozen && SF.Callouts && SF.Callouts.step(Player, 1)) return;
    if (!Player.deck) return;
    if (Player.spontaneous) {
      var curS = Player.wallSlide();
      if (curS && curS.style === 'definition' && Player.definitionPhase &&
          Player.definitionPhase(curS) === 'reading' && Player.answers[curS.id] == null &&
          !(SF.Live && SF.Live.active)) {
        Player.definitionCommand('ask');
        return;
      }
      if (curS && (curS.style === 'oddone' || curS.oddoneDiscuss ||
          curS.style === 'compare' || curS.compareDiscuss) &&
          Player.answers[curS.id] == null && !(SF.Live && SF.Live.active)) {
        Player.answers[curS.id] = -1;
        if (Player._current) paintAnswer(Player._current, curS, -1);
        if (Player.syncPresenter) Player.syncPresenter();
        return;
      }
      if (Player.gate && Player.gate(curS, Player.spontaneous.index)) return;
      if (Player.spontaneous.index >= Player.spontaneous.slides.length - 1) {
        toast('End of activity — End to return to the lesson');
        return;
      }
      Player.goTo(Player.spontaneous.index + 1, 1);
      return;
    }
    if (Player.frozen) {
      if (Player.idx >= Player.deck.slides.length - 1) { flashEnd(); return; }
      Player.goTo(Player.idx + 1, 1);
      return;
    }
    var cur = Player.deck.slides[Player.idx];
    /* Solo Present: Next asks the recall question. Host live uses the gate
       so the reading grace still applies. */
    if (cur && cur.style === 'definition' && Player.definitionPhase &&
        Player.definitionPhase(cur) === 'reading' && Player.answers[cur.id] == null &&
        !(SF.Live && SF.Live.active)) {
      Player.definitionCommand('ask');
      return;
    }
    /* Solo Present: Odd One Out / Compare reveal prepared points before advancing. */
    if (cur && (cur.style === 'oddone' || cur.oddoneDiscuss ||
        cur.style === 'compare' || cur.compareDiscuss) &&
        Player.answers[cur.id] == null && !(SF.Live && SF.Live.active)) {
      Player.answers[cur.id] = -1;
      if (Player._current) paintAnswer(Player._current, cur, -1);
      if (Player.syncPresenter) Player.syncPresenter();
      return;
    }
    if (Player.gate && Player.gate(Player.deck.slides[Player.idx], Player.idx)) return;
    if (Player.idx >= Player.deck.slides.length - 1) { flashEnd(); return; }
    Player.goTo(Player.idx + 1, 1);
  };
  Player.prev = function () {
    if (!Player.frozen && SF.Explore && SF.Explore.step(Player, -1)) return;
    if (!Player.frozen && SF.Callouts && SF.Callouts.step(Player, -1)) return;
    if (SF.Teaching && SF.Teaching.prev()) return;
    if (Player.spontaneous) {
      if (Player.spontaneous.index <= 0) return;
      Player.goTo(Player.spontaneous.index - 1, -1);
      return;
    }
    if (Player.frozen) {
      Player.goTo(Player.idx - 1, -1);
      return;
    }
    Player.goTo(Player.idx - 1, -1);
  };

  function flashEnd() {
    toast('End of deck — Esc to exit');
  }

  /* For the live reveal, which paints the projected slide itself rather than
     going through paintAnswer \u2014 see revealNow in js/live.js. */
  Player.stopMusic = stopMusic;

  Player.frozen = false;
  Player._frozenSlideIdx = null;

  Player.toggleFreeze = function (force) {
    var wasFrozen = !!Player.frozen;
    var next = typeof force === 'boolean' ? force : !wasFrozen;
    Player.frozen = next;
    if (root) root.classList.toggle('frozen', Player.frozen);
    if (hud) hud.classList.toggle('hud-frozen', Player.frozen);

    var pill = document.getElementById('playerFreezePill');
    if (Player.frozen) {
      Player._frozenSlideIdx = Player.idx;
      if (!pill && root) {
        var createdPill = el('div', 'player-freeze-pill');
        createdPill.id = 'playerFreezePill';
        createdPill.setAttribute('role', 'status');
        createdPill.appendChild(el('span', 'pfp-tag', 'SCREEN FROZEN'));
        createdPill.appendChild(el('span', 'pfp-text', 'Audience display locked on slide ' + (Player.idx + 1)));
        var unfreezeBtn = el('button', 'pfp-unfreeze', 'Unfreeze (Z)');
        unfreezeBtn.type = 'button';
        unfreezeBtn.onclick = function () { Player.toggleFreeze(false); };
        createdPill.appendChild(unfreezeBtn);
        root.appendChild(createdPill);
      }
      toast('Screen frozen — students still see this slide');
    } else {
      if (pill) pill.remove();
      if (wasFrozen && Player._frozenSlideIdx != null && Player._frozenSlideIdx !== Player.idx) {
        Player.goTo(Player.idx, Player.idx > Player._frozenSlideIdx ? 1 : -1, true);
      }
      Player._frozenSlideIdx = null;
      toast('Screen unfrozen — synced to slide ' + (Player.idx + 1));
    }
    syncHudRoomButtons();
    syncPresenter();
  };

  Player.toggleBlank = function () {
    Player.blank = !Player.blank;
    if (root) root.classList.toggle('blank', Player.blank);
    syncHudRoomButtons();
    /* B is how a teacher takes the room's attention off the screen, and a
       soundtrack playing to a black projector defeats that.
       Coming back splits by who started it: the bed and a clip marked "play
       when the slide appears" resume, because the author asked for them and
       the slide is appearing again; a clip the presenter started by hand
       stays paused, because nothing asked for it to restart. */
    if (Player.blank) {
      stopVideo(Player._current);
      stopMusic();
    } else {
      var s = Player.deck && Player.deck.slides[Player.idx];
      if (s) syncMedia(s, Player._current);
    }
  };

  Player.toggleFullscreen = function () {
    var d = document;
    var isFull = d.fullscreenElement || /** @type {any} */ (d).webkitFullscreenElement;
    var asked;
    if (!isFull) {
      var r = d.documentElement;
      asked = (r.requestFullscreen || /** @type {any} */ (r).webkitRequestFullscreen || function () {}).call(r);
    } else {
      asked = (d.exitFullscreen || /** @type {any} */ (d).webkitExitFullscreen || function () {}).call(d);
    }
    /* Refused is a fine answer and not an error: fullscreen needs the call to
       come from a gesture, and starting a live show from a keyboard shortcut
       or a relay message is a legitimate way to open one. Ignoring the
       promise instead left an uncaught "Permissions check failed" in the
       console of a show that had otherwise started perfectly. */
    if (asked && typeof asked.catch === 'function') asked.catch(function () {});
  };

  /* ------------------------------------------------------------ open/close */

  Player.start = function (deck, startIndex, opts) {
    opts = opts || {};
    if (!root) build();
    if (SF.Demo) SF.Demo.detach();
    if (SF.Boards) SF.Boards.reset(Player);
    /* A new presentation is a new race. Without this the field came back from
       the last run of the same deck already halfway home. */
    if (SF.Race) SF.Race.clear();
    if (SF.Boss) SF.Boss.clear();
    Player.definitionStates = {};
    Player.chainLinks = [];
    Player.chainPending = '';
    Player.deck = deck;
    Player.idx = Math.max(0, Math.min(deck.slides.length - 1, startIndex || 0));
    Player.open = true;
    Player.shareMode = !!opts.share;
    if (root) root.classList.toggle('share-browse', Player.shareMode);
    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.toggle('share-browse', Player.shareMode);
    }
    rememberRun = !opts.demo && !opts.share;
    Player.forgetRun();
    Player.blank = false;
    Player.frozen = false;
    Player._frozenSlideIdx = null;
    var oldFreezePill = document.getElementById('playerFreezePill');
    if (oldFreezePill) oldFreezePill.remove();
    Player.exploreStates = {};
    Player.started = Date.now();
    Player.spontaneous = null;
    syncSpontaneousPill();
    Player._current = null;
    Player._liveTally = null;
    Player._rail = null;
    Player._railMode = null;
    Player._solo = null;
    Player._qacue = null;
    Player._focus = false;
    Player._sampleFb = null;
    Player._railWanted = true;
    if (!opts.keepAnswers) Player.answers = {};
    if (viewport) {
      viewport.innerHTML = '';
      viewport.classList.remove('railed');
    }
    if (root) {
      root.classList.add('on');
      root.classList.remove('blank');
    }
    if (viewport) SF.letterbox(viewport);
    renderCurrent(1);
    showHud();
    if (opts.fullscreen !== false) Player.toggleFullscreen();
    saveRun();
    Player.emit('open', { deck: deck });
    presenterChannel();
    if (Player.syncPresenter) Player.syncPresenter();
    var oldPill = document.getElementById('playerDemoPill');
    if (oldPill) oldPill.remove();
    if (opts.demo && root) {
      root.classList.add('is-demo');
      var pill = el('div', 'player-demo-pill');
      pill.id = 'playerDemoPill';
      pill.appendChild(el('span', 'pdp-tag', 'DEMO REHEARSAL'));
      var gameTitle = (deck && (deck.title || deck.mechanic)) || 'Game';
      pill.appendChild(el('span', 'pdp-title', gameTitle + ' · SAMPLE CLASS'));
      var exitBtn = el('button', 'btn ghost pdp-exit', '✕ Exit demo');
      exitBtn.type = 'button';
      exitBtn.setAttribute('aria-label', 'Exit demo (Esc)');
      exitBtn.onclick = function () { Player.close(); };
      pill.appendChild(exitBtn);
      root.appendChild(pill);
    }
    if (opts.demo && SF.Demo) SF.Demo.attach(Player, { mode: opts.demoMode || 'class', auto: !!opts.demoAuto });
  };

  Player.close = function () {
    if (!Player.open) return;
    if (Player.spontaneous) Player.endSpontaneous();
    if (Player.frozen) Player.toggleFreeze(false);
    if (SF.Demo) SF.Demo.detach();
    if (SF.Boards) SF.Boards.unmountAll();
    var pill = document.getElementById('playerDemoPill');
    if (pill) pill.remove();
    stopTimer();
    stopVideo(Player._current);
    stopMusic();
    Player.open = false;
    Player.shareMode = false;
    if (root) root.classList.remove('share-browse');
    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.remove('share-browse');
    }
    Player.forgetRun();
    clearTimeout(hudTimer);
    if (hud) hud.classList.remove('show');
    var moreEl = document.getElementById('hudMore');
    if (moreEl) moreEl.hidden = true;
    var moreBtn = hud && hud.querySelector('[data-act=more]');
    if (moreBtn) moreBtn.setAttribute('aria-expanded', 'false');
    if (root) root.classList.remove('on');
    if (cheats) cheats.classList.remove('on', 'for-editor');
    if (viewport) {
      viewport.innerHTML = '';
      viewport.classList.remove('railed');
      viewport.classList.remove('soloed');
      viewport.classList.remove('fb-focus');
    }
    Player._current = null;
    Player._focus = false;
    Player._qacue = null;
    Player._rail = null;
    Player._solo = null;
    Player._sampleFb = null;
    if (document.fullscreenElement || /** @type {any} */ (document).webkitFullscreenElement) Player.toggleFullscreen();
    closePresenter();
    Player.emit('close', {});
  };

  /* ------------------------------------------------------------ presenter view */

  /* The second screen and its command bus live in src/presenter/window.js.
     viewport, hud and cheats go in as accessors because build() assigns them
     after this runs. */
  var presenter = SF.createPresenterWindow(SF, {
    Player: Player,
    els: {
      viewport: function () { return viewport; },
      hud: function () { return hud; },
      cheats: function () { return cheats; }
    },
    showHud: showHud, toast: toast, toggleSoloFeedback: toggleSoloFeedback
  });
  var syncPresenter = presenter.syncPresenter;
  var presenterChannel = presenter.presenterChannel;
  var closePresenter = presenter.closePresenter;

  /* ------------------------------------------------------------ toast */

  function toast(msg) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(/** @type {any} */ (t)._h);
    var el = t;
    /** @type {any} */ (t)._h = setTimeout(function () { el.classList.remove('on'); }, 2200);
  }

  Player.fitInlineWhy = fitInlineWhy;
  Player.scheduleFit = scheduleFit;
  Player.fitQuizSlide = fitQuizSlide;
  Player.openTally = openTally;
  Player.flattenOverlay = flattenOverlay;
  SF.Player = Player;
  SF.toast = toast;
})(window);
