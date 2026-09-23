/* Timed stages on the wall — the runtime half of src/activities/stages.js.
 *
 * The renderer draws the track, one panel per stage (each a build step) and a
 * clock. This lights the track as Next moves through the steps, runs a clock
 * for the stage alone, and says so when its time is up. In a live room it also
 * tells the phones which stage they are in (Player.stage rides on the 'at'
 * context), and opens the Share stage's idea box — an anonymous brainstorm
 * beside the slide — for as long as that stage lasts.
 *
 * It never advances by itself. Time up is a cue for the teacher, not a
 * trigger: a pair mid-sentence is worth more than the clock.
 */
(function () {
  'use strict';
  var SF = window.SF;
  var P = SF.Player;
  if (!P) return;

  var node = null;        // the staged slide on the wall
  var stages = [];
  var brief = null;       // the row that stays up through every stage
  var current = -1;       // -1 is the introduction, before the first press
  var timer = null;
  var total = 0;          // seconds this stage was given, extensions included
  var endsAt = 0;
  var shareId = null;     // the idea box this runtime opened, if any
  var shareStage = -1;    // the stage it was opened for

  function isStaged(slide) {
    return !!(slide && slide.activity && slide.type === 'keywords' &&
      slide.activityPresentation === 'stages');
  }

  function stopClock() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  function paintClock(left, of) {
    var clock = node && node.querySelector('.stage-clock');
    if (!clock) return;
    var ringEl = clock.querySelector('.ring');
    var numEl = clock.querySelector('.n');
    clock.hidden = !of;
    if (!of || !ringEl || !numEl) return;
    var dash = Number(ringEl.getAttribute('stroke-dasharray'));
    ringEl.setAttribute('stroke-dashoffset', String(dash * (1 - Math.max(0, left) / of)));
    numEl.textContent = SF.clockFace(left);
    clock.classList.toggle('hurry', left > 0 && left <= 10);
    clock.classList.toggle('done', left <= 0);
  }

  function panelFor(i) {
    return node ? node.querySelector('.stage-panel[data-i="' + i + '"]') : null;
  }

  function note(i, text) {
    var panel = panelFor(i);
    var live = panel && panel.querySelector('.sp-live');
    if (live) live.textContent = text || '';
  }

  function tick() {
    var left = Math.max(0, (endsAt - Date.now()) / 1000);
    paintClock(left, total);
    if (left > 0) return;
    stopClock();
    var panel = panelFor(current);
    if (panel) panel.classList.add('time-up');
    var next = stages[current + 1];
    note(current, next ? 'Time. Next: ' + next.name : 'Time.');
  }

  function startClock(seconds) {
    stopClock();
    total = seconds;
    if (!seconds) { paintClock(0, 0); return; }
    endsAt = Date.now() + seconds * 1000;
    tick();
    timer = setInterval(tick, 250);
  }

  /* ------------------------------------------------ the Share idea box */

  function closeShare() {
    var L = SF.Live;
    if (shareId && L && L.prompt && L.prompt.id === shareId && L.endCustomPrompt) L.endCustomPrompt();
    shareId = null;
    shareStage = -1;
  }

  function syncShare(st) {
    var L = SF.Live;
    if (!st || st.job !== 'send' || !L || !L.active || !L.startCustomPrompt) { closeShare(); return; }
    /* One box per stage. A hunt's three places, or Plus then Minus, are
       three boxes: the ideas arrive sorted by the stage they were sent in,
       and each stage's spotlight is its own. */
    if (shareId && L.prompt && L.prompt.id === shareId) {
      if (shareStage === st.i) return;
      closeShare();
    }
    /* Something else is already asking the room — a quick poll the teacher
       opened by hand. Theirs wins; the stage says where the ideas would be. */
    if (L.prompt && !shareId) return;
    L.startCustomPrompt({
      kind: 'brainstorm',
      prompt: st.text || 'Send your strongest idea',
      presentAs: 'rail',
      max: 1,
      origin: 'stage',
      stage: st.name
    });
    shareId = L.prompt ? L.prompt.id : null;
    shareStage = shareId ? st.i : -1;
  }

  /* ------------------------------------------------------ the stages */

  function publish() {
    var st = stages[current];
    P.stage = st ? {
      i: st.i,
      of: stages.length,
      name: st.name,
      job: st.job,
      group: !!st.group,
      text: st.text,
      brief: brief ? brief.text : '',
      seconds: total,
      /* Seconds left rather than a deadline: the phone's clock is not the
         host's, and a phone a minute fast would call time early. */
      left: total ? Math.max(0, Math.round((endsAt - Date.now()) / 1000)) : 0,
      next: stages[current + 1] ? stages[current + 1].name : ''
    } : null;
    P.emit('stage', P.stage);
    if (P.syncPresenter) P.syncPresenter();
  }

  function enter(i) {
    current = i;
    SF.lightStages(node, i);
    Array.prototype.forEach.call(node.querySelectorAll('.stage-panel'), function (panel) {
      panel.classList.remove('time-up');
    });
    note(i, '');
    var st = stages[i];
    if (st) startClock(st.seconds);
    else {
      /* The introduction shows how long the whole routine takes, still. */
      stopClock();
      var all = stages.reduce(function (sum, x) { return sum + x.seconds; }, 0);
      total = 0;
      paintClock(all, all);
    }
    syncShare(st);
    paintWritten(SF.Live && SF.Live.written);
    publish();
  }

  function teardown() {
    stopClock();
    closeShare();
    var had = !!node || !!P.stage;
    node = null;
    stages = [];
    brief = null;
    current = -1;
    P.stage = null;
    if (had) P.emit('stage', null);
  }

  /* Read from the player rather than from the event: teaching.js resets the
     build inside its own 'slide' handler, so the first 'step' of a slide
     arrives before this file has heard about the slide at all. */
  function sync() {
    var slide = P._currentSlide;
    var here = P._current;
    if (!isStaged(slide) || !here) { if (node) teardown(); return; }
    var i = Math.min(stages.length, Math.max(0, P.revealStep || 0)) - 1;
    if (here !== node) {
      if (node) teardown();
      node = here;
      stages = SF.activityStages(slide);
      brief = SF.activityBrief(slide);
      current = -2;          // nothing entered yet, not even the introduction
    }
    if (i === current) return;
    enter(i);
  }

  P.on('slide', sync);
  P.on('step', sync);
  P.on('close', teardown);

  /** More time for the stage the room is in. */
  function extend(seconds) {
    if (!node || current < 0 || !stages[current]) return false;
    seconds = Number(seconds) || 30;
    var now = Date.now();
    /* A running stage gets longer; one whose time was up starts again from
       now with just the extra, so the ring reads as a fresh short count. */
    var running = endsAt > now;
    endsAt = (running ? endsAt : now) + seconds * 1000;
    total = running ? total + seconds : seconds;
    var panel = panelFor(current);
    if (panel) panel.classList.remove('time-up');
    note(current, '');
    if (!timer) timer = setInterval(tick, 250);
    tick();
    publish();
    SF.toast('+' + seconds + 's for ' + stages[current].name);
    return true;
  }

  /* How many have written something during a note stage: "19 of 26 have
     written something". A count from the relay; the notes never leave the
     phones. */
  function paintWritten(w) {
    var st = stages[current];
    var panel = panelFor(current);
    var box = panel && panel.querySelector('.sp-count');
    if (!box) return;
    var slide = P._currentSlide;
    var here = !!(w && st && st.job === 'note' && slide && w.slideId === slide.id && w.stage === st.i && w.of);
    box.textContent = here ? w.n + ' of ' + w.of + ' have written something' : '';
  }

  SF.Stages = {
    extend: extend,
    paintWritten: paintWritten,
    isStaged: isStaged,
    get active() { return !!node; }
  };
})();
