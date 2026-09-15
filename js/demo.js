/* SlideForge demo class — fake learners for Quiz studio rehearsal.
   Never touches live sessions, saves, or reports. Marked SAMPLE on the rail. */
(function (global) {
  'use strict';
  var SF = global.SF;
  var NAMES = ['Ana', 'Ben', 'Priya', 'Tom', 'Maya', 'Leo', 'Sam', 'Jordan', 'Nina', 'Omar'];
  var timers = [];
  var active = false;
  var players = [];
  var slideId = null;
  var host = null;
  var offSlide = null;
  var offClose = null;

  function clearTimers() {
    timers.forEach(clearTimeout);
    timers = [];
  }

  function pickNames(n) {
    var bag = NAMES.slice();
    var out = [];
    while (out.length < n && bag.length) {
      out.push(bag.splice(Math.floor(Math.random() * bag.length), 1)[0]);
    }
    return out;
  }

  var mode = 'class'; /* class | judge | discuss | board */
  /* A whole-lesson rehearsal crosses formats — a scored quiz, then a spoken
     spin-and-explain, then an exit poll. One mode fixed at attach would
     invent phone votes for the formats whose answers are spoken aloud, so a
     lesson run follows the slide instead. Quiz studio still pins its mode:
     it is rehearsing one game and already knows which. */
  var autoMode = false;

  function kindForSlide(slide) {
    return (SF.Playbook && SF.Playbook.demoKind)
      ? SF.Playbook.demoKind({ style: slide.style, format: slide.format })
      : 'class';
  }

  /* Changes how the room behaves without re-rolling it — the class, and the
     scores it has built up across the lesson so far, stay put. */
  function setMode(next) {
    if (next !== 'judge' && next !== 'discuss' && next !== 'board' && next !== 'class') return;
    if (next === mode) return;
    mode = next;
    paintRail();
  }

  function paintRail() {
    if (!host || !host.open) return;
    var rows = players.map(function (p, i) {
      return {
        key: 'demo-' + i,
        name: p.teamName ? (p.name + ' (' + p.teamName + ')') : p.name,
        score: (mode === 'discuss' || mode === 'board') ? '—' : p.score,
        members: null,
        color: p.teamColor || '',
        gained: !!p.gained
      };
    }).sort(function (a, b) {
      if (mode === 'discuss' || mode === 'board') return a.name.localeCompare(b.name);
      return b.score - a.score;
    });
    var foot = mode === 'discuss'
      ? 'Discussion demo — no competitive scores'
      : mode === 'judge'
        ? 'Teacher-judged — SAMPLE class ready to speak'
        : mode === 'board'
          ? 'Board demo — teacher operates the board'
          : 'Fake class — nothing is saved or reported';
    host.setScoreboard(rows, {
      subtitle: players.length + ' sample players · DEMO · ' + mode.toUpperCase(),
      footnote: foot,
      emptyText: 'Demo class',
      join: null
    });
  }

  function rightChoice(slide) {
    if (slide.input === 'choice' && Number.isInteger(slide.correct)) return slide.correct;
    return 0;
  }

  function inventChoice(slide) {
    var opts = (slide.options || []).filter(function (o) { return String(o).trim(); });
    if (slide.input === 'choice' && opts.length) {
      /* Mostly right, with a few wrong — the shape of a real rehearsal. */
      if (Math.random() < 0.65) return rightChoice(slide);
      var wrong = [];
      for (var i = 0; i < opts.length; i++) if (i !== slide.correct) wrong.push(i);
      return wrong.length ? wrong[Math.floor(Math.random() * wrong.length)] : rightChoice(slide);
    }
    if (slide.input === 'number') {
      var t = Number(slide.target);
      var tol = Number(slide.tolerance) || 0;
      var span = Math.max(1, (Number(slide.max) - Number(slide.min)) || 10);
      var jitter = (Math.random() - 0.5) * Math.max(tol * 1.5, span * 0.1);
      return Math.round((Number.isFinite(t) ? t : 0) + jitter);
    }
    if (slide.input === 'text') {
      var accept = slide.accept || [];
      if (Math.random() < 0.65 && accept[0]) return String(accept[0]);
      return ['not sure', '…', 'pass', '???'][Math.floor(Math.random() * 4)];
    }
    if (slide.input === 'order' && Array.isArray(slide.options)) {
      var order = slide.options.map(function (_, i) { return i; });
      if (Math.random() < 0.55) return order.slice();
      /* Swap two items for a near miss. */
      var a = Math.floor(Math.random() * order.length);
      var b = (a + 1) % order.length;
      var tmp = order[a]; order[a] = order[b]; order[b] = tmp;
      return order;
    }
    return rightChoice(slide);
  }

  function isRight(slide, response) {
    var style = SF.gameStyle(slide.style || 'choice');
    if (style && typeof style.mark === 'function') {
      try { return !!style.mark(slide, response); } catch (e) { return false; }
    }
    return response === slide.correct;
  }

  /* What the HP bar reads right now, as "8 / 11 HP" — or '' when nothing is
     keeping count (a live room owns its own fight). Read from the fight rather
     than tracked here, so the note and the bar can never disagree. */
  function bossHpNow() {
    if (!host || !host.deck || !SF.Boss || !SF.Boss.forDeck) return '';
    var f = SF.Boss.forDeck(host.deck);
    return f ? (f.hp + ' / ' + f.max + ' HP') : '';
  }

  function pointsFor(slide) {
    var n = Number(slide.points);
    return Number.isFinite(n) ? Math.max(0, n) : 1;
  }

  function tallyFrom(slide) {
    var opts = slide.options || [];
    var counts = opts.map(function () { return 0; });
    var answered = 0;
    players.forEach(function (p) {
      if (p.choice == null || p.slideId !== slide.id) return;
      answered++;
      if (slide.input === 'choice' && Number.isInteger(p.choice) && counts[p.choice] != null) {
        counts[p.choice]++;
      }
    });
    return { counts: counts, answered: answered, total: players.length };
  }

  function paintProgress(slide) {
    if (!host || !slide || slide.type !== 'quiz') return;
    var t = tallyFrom(slide);
    if (slide.input === 'choice') host.setTally(t.counts, { answered: t.answered, total: t.total });
    else host.setTally([], { answered: t.answered, total: t.total });
    paintRail();
  }

  function revealDemo(slide) {
    if (!host || !slide || host.answers[slide.id] != null) return;
    /* Attribute no host answer — same path as a live time-up reveal. */
    host.answers[slide.id] = -1;
    if (host._current) {
      var node = host._current;
      var typed = slide.input === 'text' || slide.input === 'number';
      Array.prototype.forEach.call(node.querySelectorAll('.opt'), function (b) {
        var i = Number(b.dataset.choice);
        b.classList.add('locked');
        b.classList.add(typed || i === slide.correct ? 'correct' : 'muted');
      });
      if (typed && host.showTypedAnswers) {
        var groups = {};
        players.forEach(function (p) {
          if (p.slideId !== slide.id || p.choice == null) return;
          var key = String(p.choice);
          if (!groups[key]) groups[key] = { text: key, n: 0, right: isRight(slide, p.choice) };
          groups[key].n++;
        });
        host.showTypedAnswers(Object.keys(groups).map(function (k) { return groups[k]; }));
      }
      if (node.classList.contains('has-why')) {
        if (host.flattenOverlay) host.flattenOverlay(node);
        node.classList.add('why-open');
        if (host.scheduleFit) host.scheduleFit(node);
      }
      if (host.openTally) host.openTally(node);
      else {
        var bar = node.querySelector('.tally');
        if (bar) bar.classList.add('on');
      }
    }
    players.forEach(function (p) {
      p.gained = false;
      if (p.slideId === slide.id && p.choice != null && isRight(slide, p.choice)) {
        p.score += pointsFor(slide);
        p.gained = true;
      }
    });

    /* Boss battle mechanic: class hits damage the shared boss HP bar.

       The note says what the bar now reads, because the bar is the thing the
       room is watching and a note that only announces damage is a claim they
       cannot check. It is also read AFTER the command, for the same reason. */
    if (host.deck && host.deck.mechanic === 'boss') {
      var dmg = Number(slide.bossDamage) || (SF.bossDamage && SF.bossDamage(slide.difficulty)) || 2;
      var rights = players.filter(function (p) { return p.slideId === slide.id && p.choice != null && isRight(slide, p.choice); }).length;
      var hit = rights >= Math.max(1, Math.floor(players.length * 0.4));
      /* advance:false — the demo is on the teacher's arrow keys, and a mark
         that moved the slide itself would skip the explanation it revealed. */
      if (typeof host.bossCommand === 'function') {
        host.bossCommand(hit ? 'hit' : 'miss', { advance: false });
      }
      var left = bossHpNow();
      host.railNote(hit
        ? ('HIT · −' + dmg + ' · ' + (left || 'boss hit'))
        : ('MISS · no damage · ' + (left || 'boss untouched')));
    }

    /* Horse race mechanic: team correct answers advance team lanes */
    if (host.deck && host.deck.mechanic === 'race') {
      var advanced = {};
      players.forEach(function (p) {
        if (p.slideId === slide.id && p.choice != null && isRight(slide, p.choice)) {
          var tKey = 't' + (p.teamIndex != null ? p.teamIndex : 0);
          if (!advanced[tKey]) {
            advanced[tKey] = true;
            if (typeof host.raceStep === 'function') {
              host.raceStep(tKey, 'advance');
            }
          }
        }
      });
      /* Only lanes that answered correctly move, so the note counts them.
         It used to announce movement on every reveal, which told the room
         the field had advanced on a question nobody got right. */
      var moved = Object.keys(advanced).length;
      host.railNote(moved
        ? (moved === 1 ? '1 lane advanced along the track.'
          : moved + ' lanes advanced along the track.')
        : 'No lane advanced — nobody answered correctly.');
    }

    paintRail();
    if (host.stopMusic) host.stopMusic();
    if (host.syncPresenter) host.syncPresenter();
    SF.toast('Demo reveal — sample scores only');
  }

  function runQuiz(slide) {
    clearTimers();
    slideId = slide.id;
    players.forEach(function (p) {
      p.choice = null;
      p.slideId = null;
      p.gained = false;
    });
    if (host.clearTally) host.clearTally();
    paintRail();

    /* Notice race on entry. A boss question gets none: the slide itself now
       carries the difficulty, the damage and the HP in one band, and the note
       repeating it was a second card in a rail three cards deep — which is
       what pushed the leaderboard out of the panel. */
    if (host.deck && host.deck.mechanic === 'race') {
      host.railNote('Horse Race: Correct team answers advance lanes to the finish');
    }

    /* Discussion / teacher-judged formats: simulate spoken participation and host marks */
    if (mode === 'judge') {
      var speaker = players[Math.floor(Math.random() * players.length)];
      var speech = '';
      if (slide.style === 'spinexplain') {
        speech = slide.explanation || (slide.term ? (slide.term + ' — ' + (slide.hint || 'cellular process')) : 'I can explain this idea');
      } else if (slide.style === 'headsup') {
        speech = 'Guessed it! "' + (slide.term || slide.question || 'Concept') + '"';
      } else if (slide.style === 'connection') {
        speech = slide.explanation || ((slide.itemA || 'A') + ' connects with ' + (slide.itemB || 'B'));
      } else if (slide.style === 'randomchallenge') {
        speech = slide.explanation || 'Completed the challenge task!';
      } else {
        speech = slide.explanation || slide.answer || slide.question || 'Here is my explanation';
      }
      host.railNote(speaker.name + ' speaks: "' + speech.slice(0, 65) + (speech.length > 65 ? '…' : '') + '"');

      timers.push(setTimeout(function () {
        if (!active || !host.open) return;
        host.railNote('Demo: Host marks on the verdict bar below');
      }, 1400));

      timers.push(setTimeout(function () {
        if (!active || !host.open || !host._current) return;
        var cur = host.deck && host.deck.slides[host.idx];
        if (!cur || cur.id !== slide.id || host.answers[slide.id] != null) return;
        var yesBtn = host._current.querySelector('.opt.judge.yes, .opt.judge');
        if (yesBtn && !yesBtn.classList.contains('locked')) {
          speaker.score += pointsFor(slide);
          speaker.gained = true;
          paintRail();
          var clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
          yesBtn.dispatchEvent(clickEvent);
          host.railNote('✓ Awarded points to ' + speaker.name);
        }
      }, 4800));
      return;
    }

    if (mode === 'discuss') {
      var p1 = players[0];
      var disc1 = '';
      if (slide.style === 'oddone') {
        var opt = (slide.options && slide.options[slide.correct]) || 'Item';
        disc1 = p1.name + ': "' + opt + ' is odd — ' + (slide.explanation || 'fits a different rule') + '"';
      } else if (slide.style === 'compare') {
        disc1 = p1.name + ': "Compare ' + (slide.itemA || 'A') + ' & ' + (slide.itemB || 'B') + ' — ' + (slide.similarities || 'share core properties') + '"';
      } else if (slide.style === 'conceptchain') {
        disc1 = p1.name + ' proposes link for "' + (slide.term || 'concept') + '"';
      } else {
        disc1 = p1.name + ' shares reasoning with the room';
      }
      host.railNote(disc1.slice(0, 75));
      timers.push(setTimeout(function () {
        if (!active || !host.open) return;
        host.railNote('Demo: Discuss candidate rules, then reveal answers');
      }, 1600));
      return;
    }

    /* Standard auto-scored quiz: fake learners respond */
    players.forEach(function (p, i) {
      var delay = 600 + i * (450 + Math.floor(Math.random() * 500)) + Math.floor(Math.random() * 400);
      timers.push(setTimeout(function () {
        if (!active || !host.open) return;
        var s = host.deck && host.deck.slides[host.idx];
        if (!s || s.id !== slide.id || s.type !== 'quiz') return;
        if (host.answers[s.id] != null) return; /* already revealed */
        p.choice = inventChoice(s);
        p.slideId = s.id;
        /* The count goes on the wall (see .answered-count). Naming each
           player here put a column of notes above the scores and squashed
           them; who answered is on their row already. */
        paintProgress(s);
        var done = players.every(function (x) { return x.slideId === s.id && x.choice != null; });
        if (done) {
          timers.push(setTimeout(function () {
            if (!active || !host.open) return;
            var cur = host.deck.slides[host.idx];
            if (cur && cur.id === s.id && host.answers[s.id] == null) revealDemo(cur);
          }, 900));
        }
      }, delay));
    });
  }

  function onSlide() {
    if (!active || !host) return;
    clearTimers();
    var slide = host.deck && host.deck.slides[host.idx];
    if (!slide) return;
    if (autoMode && slide.type === 'quiz') setMode(kindForSlide(slide));
    if (slide.type === 'quiz') runQuiz(slide);
    else {
      var fb = SF.slideFeedback && SF.slideFeedback(slide);
      if (fb) {
        if (host.clearTally) host.clearTally();
        var fDigest = SF.sampleFeedbackDigest ? SF.sampleFeedbackDigest(fb) : null;
        var fView = Object.assign(SF.feedbackViewOpts ? SF.feedbackViewOpts(fb) : {}, {
          title: fb.prompt || (fb.kind === 'poll' ? 'Class Poll' : 'Feedback'),
          subtitle: (fb.kind || 'poll').toUpperCase() + ' · SAMPLE RESPONSES',
          footnote: 'Demo rehearsal — ' + (fDigest ? fDigest.answered : 'sample') + ' responses',
          sample: true
        });
        if (host.setFeedback) host.setFeedback(fDigest, fView);
        if (fb.presentAs === 'focus' && host.showFeedbackFocus) {
          host.showFeedbackFocus(fDigest, fView);
        }
        var kindLabel = fb.kind === 'poll' ? 'Class Poll' : fb.kind === 'scale' ? 'Confidence Scale' : fb.kind === 'wordcloud' ? 'Word Cloud' : 'Brainstorm';
        host.railNote(kindLabel + ': Sample responses shown');
        return;
      }
      if (host.clearTally) host.clearTally();
      paintRail();
      if (slide.memoryBoard || slide.bingoBoard || slide.bowlBoard || slide.lowstakesBoard) {
        if (slide.bingoBoard) {
          host.railNote('Bingo Rehearsal: Call terms aloud. Click "Call next term" to test caller mechanics.');
        } else if (slide.bowlBoard) {
          host.railNote('Quiz Bowl Rehearsal: Click category cells to reveal questions; award points to teams.');
        } else if (slide.memoryBoard) {
          host.railNote('Memory Rehearsal: Study period active → reveal cards to check paired recall.');
        } else if (slide.lowstakesBoard) {
          host.railNote('Low-Stakes Rehearsal: Paper retrieval on clock → click Reveal answers.');
        }
      } else if (slide.id && slide.id.indexOf(':howto') !== -1) {
        host.railNote('How to play: classroom rules for this format before play begins.');
      }
    }
  }

  function attach(player, opts) {
    detach();
    opts = opts || {};
    mode = opts.mode === 'judge' || opts.mode === 'discuss' || opts.mode === 'board' ? opts.mode : 'class';
    autoMode = !!opts.auto;
    host = player;
    active = true;
    var teams = (host.deck && host.deck.quiz && host.deck.quiz.teams) || [];
    players = pickNames(6 + Math.floor(Math.random() * 3)).map(function (name, i) {
      var tIdx = teams.length ? (i % teams.length) : null;
      return {
        name: name,
        score: 0,
        choice: null,
        slideId: null,
        gained: false,
        teamIndex: tIdx,
        teamName: tIdx != null ? (teams[tIdx].name || teams[tIdx]) : '',
        teamColor: tIdx != null ? SF.teamColor(tIdx) : ''
      };
    });
    offSlide = function () { onSlide(); };
    offClose = function () { detach(); };
    player.on('slide', offSlide);
    player.on('close', offClose);
    timers.push(setTimeout(onSlide, 80));
    SF.toast(mode === 'discuss'
      ? 'Discussion demo — SAMPLE roster only'
      : mode === 'judge'
        ? 'Teacher-judged demo — you mark as live'
        : mode === 'board'
          ? 'Board demo — teacher operates the board'
          : 'Demo class joined — SAMPLE players only');
  }

  function detach() {
    clearTimers();
    if (host) {
      if (offSlide) host.off('slide', offSlide);
      if (offClose) host.off('close', offClose);
    }
    active = false;
    host = null;
    players = [];
    slideId = null;
    offSlide = null;
    offClose = null;
    mode = 'class';
    autoMode = false;
  }

  function start(deck, opts) {
    opts = opts || {};
    if (!SF.Player) return;
    var demoMode = opts.mode === 'judge' || opts.mode === 'discuss' || opts.mode === 'board' ? opts.mode : 'class';
    SF.Player.start(deck, opts.startIndex || 0, {
      fullscreen: opts.fullscreen === true,
      demo: true,
      demoMode: demoMode,
      demoAuto: !!opts.auto,
      keepAnswers: false
    });
  }

  SF.Demo = {
    start: start,
    attach: attach,
    detach: detach,
    setMode: setMode,
    get active() { return active; },
    players: function () { return players.slice(); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
