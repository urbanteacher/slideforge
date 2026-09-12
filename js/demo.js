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

  var mode = 'class'; /* class | judge | discuss */

  function paintRail() {
    if (!host || !host.open) return;
    var rows = players.map(function (p, i) {
      return {
        key: 'demo-' + i,
        name: p.name,
        score: mode === 'discuss' ? '—' : p.score,
        members: 0,
        color: '',
        gained: !!p.gained
      };
    }).sort(function (a, b) {
      if (mode === 'discuss') return a.name.localeCompare(b.name);
      return b.score - a.score;
    });
    var foot = mode === 'discuss'
      ? 'Discussion demo — no competitive scores'
      : mode === 'judge'
        ? 'Teacher-judged — SAMPLE class ready to speak'
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
      if (Math.random() < 0.62) return rightChoice(slide);
      var wrong = [];
      for (var i = 0; i < opts.length; i++) if (i !== slide.correct) wrong.push(i);
      return wrong.length ? wrong[Math.floor(Math.random() * wrong.length)] : rightChoice(slide);
    }
    if (slide.input === 'number') {
      var t = Number(slide.target);
      var tol = Number(slide.tolerance) || 0;
      var span = Math.max(1, (Number(slide.max) - Number(slide.min)) || 10);
      var jitter = (Math.random() - 0.5) * Math.max(tol * 2, span * 0.15);
      return Math.round((Number.isFinite(t) ? t : 0) + jitter);
    }
    if (slide.input === 'text') {
      var accept = slide.accept || [];
      if (Math.random() < 0.55 && accept[0]) return String(accept[0]);
      return ['not sure', '…', 'pass', '???'][Math.floor(Math.random() * 4)];
    }
    if (slide.input === 'order' && Array.isArray(slide.options)) {
      var order = slide.options.map(function (_, i) { return i; });
      if (Math.random() < 0.45) return order.slice();
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
      var bar = node.querySelector('.tally');
      if (bar) bar.classList.add('on');
    }
    players.forEach(function (p) {
      p.gained = false;
      if (p.slideId === slide.id && p.choice != null && isRight(slide, p.choice)) {
        p.score += pointsFor(slide);
        p.gained = true;
      }
    });
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

    /* Discussion / teacher-judged formats: show the room, do not invent phone votes. */
    if (mode === 'discuss' || mode === 'judge') {
      host.railNote(mode === 'judge'
        ? 'Demo: listen for spoken answers, then mark as you would live'
        : 'Demo: discuss with the room — no SAMPLE scoring');
      paintRail();
      return;
    }

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
    if (slide.type === 'quiz') runQuiz(slide);
    else {
      if (host.clearTally) host.clearTally();
      paintRail();
    }
  }

  function attach(player, opts) {
    detach();
    opts = opts || {};
    mode = opts.mode === 'judge' || opts.mode === 'discuss' ? opts.mode : 'class';
    host = player;
    active = true;
    players = pickNames(6 + Math.floor(Math.random() * 3)).map(function (name) {
      return { name: name, score: 0, choice: null, slideId: null, gained: false };
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
  }

  function start(deck, opts) {
    opts = opts || {};
    if (!SF.Player) return;
    var demoMode = opts.mode === 'judge' || opts.mode === 'discuss' ? opts.mode : 'class';
    SF.Player.start(deck, opts.startIndex || 0, {
      fullscreen: opts.fullscreen === true,
      demo: true,
      demoMode: demoMode,
      keepAnswers: false
    });
  }

  SF.Demo = {
    start: start,
    attach: attach,
    detach: detach,
    get active() { return active; },
    players: function () { return players.slice(); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
