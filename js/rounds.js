/* Heads Up rounds — the runtime half of src/games/headsup.js.
 *
 * Heads Up used to be a run of separately timed terms, each waiting for the
 * teacher to press Next: the opposite of the game. Now it is a round:
 * - One clock for the whole pile, started when the first term lands.
 * - A verdict (Correct or Pass, from the wall or the desk) moves straight on
 *   to the next term.
 * - When the clock runs out the round's result takes the stage — "Time!",
 *   the count, and whose round it was if the teacher chose a guesser — and
 *   Next skips the terms nobody reached.
 *
 * It counts; it never scores (games audit, section 6). Live or solo alike:
 * nothing here talks to the relay. Closing the term that was up when time
 * ran out is the existing 'timeup' path, which records no verdict.
 */
(function () {
  'use strict';
  var SF = window.SF;
  var P = SF.Player;
  if (!P) return;

  /** @type {{gameId: string, total: number, endsAt: number, count: number, over: boolean, timer: any} | null} */
  var round = null;
  /* How long a verdict stays on screen before the next term: long enough to
     see the tick, short enough to keep the pace. */
  var NEXT_AFTER = 650;

  function isHeads(s) {
    return !!(s && s.type === 'quiz' && s.style === 'headsup' && s.roundSeconds > 0);
  }

  function stop() {
    if (round && round.timer) { clearInterval(round.timer); round.timer = null; }
  }

  function guesser() {
    var L = SF.Live;
    var r = L && L.active ? L.selectedRecipient : null;
    if (!r || r.type !== 'player') return '';
    var p = (L.players || []).find(function (x) { return x.id === r.id; });
    return p ? p.name : '';
  }

  function showOver(node) {
    if (!round || node.querySelector('.round-over')) return;
    var box = SF.el('div', 'round-over');
    box.setAttribute('role', 'status');
    box.appendChild(SF.el('div', 'ro-kicker', 'Time!'));
    box.appendChild(SF.el('div', 'ro-count', String(round.count)));
    var who = guesser();
    /* Named, because a round is something the guesser stood up for and the
       number is applause (games audit, section 6). */
    box.appendChild(SF.el('div', 'ro-who', who
      ? who + '’s round'
      : round.count === 1 ? 'term in the round' : 'terms in the round'));
    box.appendChild(SF.el('div', 'ro-next', 'Next → to move on'));
    var stage = node.querySelector('.pad') || node;
    stage.appendChild(box);
  }

  function paint() {
    var node = P._current;
    if (!node || !round) return;
    var clock = node.querySelector('.round-clock');
    var left = round.over ? 0 : Math.max(0, (round.endsAt - Date.now()) / 1000);
    if (clock) {
      var n = clock.querySelector('.rc-n');
      if (n) n.textContent = SF.clockFace(left);
      var fill = /** @type {HTMLElement|null} */ (clock.querySelector('.rc-fill'));
      if (fill) fill.style.transform = 'scaleX(' + (round.total ? left / round.total : 0) + ')';
      clock.classList.toggle('hurry', left > 0 && left <= 10);
      var c = clock.querySelector('.rc-count');
      if (c) c.textContent = round.count + ' correct';
    }
    if (round.over) showOver(node);
  }

  function tick() {
    if (!round || round.over) return;
    if (Date.now() < round.endsAt) { paint(); return; }
    round.over = true;
    stop();
    paint();
    /* The term that was up closes as it would on its own clock: no verdict. */
    P.emit('timeup', { slide: P._currentSlide, round: true });
    P.emit('roundOver', { gameId: round.gameId, count: round.count });
  }

  P.on('slide', function (e) {
    var s = e && e.slide;
    if (!isHeads(s)) {
      if (round && (!s || s.gameId !== round.gameId)) { stop(); round = null; }
      return;
    }
    if (!round || round.gameId !== s.gameId) {
      stop();
      round = { gameId: s.gameId, total: s.roundSeconds, endsAt: Date.now() + s.roundSeconds * 1000,
        count: 0, over: false, timer: null };
      round.timer = setInterval(tick, 250);
    }
    paint();
  });

  function verdict(s, choice) {
    if (!round || round.over || !isHeads(s) || s.gameId !== round.gameId) return;
    if (choice === 0) round.count++;
    paint();
    setTimeout(function () {
      if (!round || round.over) return;
      var cur = P._currentSlide;
      if (cur && cur.id === s.id) P.next();
    }, NEXT_AFTER);
  }

  /* Live: every verdict path ends in Live's commit, which says so. Solo: the
     wall's own pads. */
  P.on('spokenVerdict', function (e) { if (e) verdict(e.slide, e.choice); });
  P.on('answer', function (e) {
    if (SF.Live && SF.Live.active) return;
    if (e) verdict(e.slide, e.choice);
  });
  P.on('close', function () { stop(); round = null; });

  /**
   * Next, once time is up: past the terms nobody reached, to whatever comes
   * after the pile — the scores, or the next slide.
   * @returns {boolean} whether it moved
   */
  function step(player, dir) {
    if (dir <= 0 || !round || !round.over || player.spontaneous || !player.deck) return false;
    var s = player._currentSlide;
    if (!isHeads(s) || s.gameId !== round.gameId) return false;
    var slides = player.deck.slides;
    var i = player.idx + 1;
    while (i < slides.length && slides[i].gameId === round.gameId && slides[i].style === 'headsup') i++;
    if (i >= slides.length || i === player.idx + 1) return false;
    player.goTo(i, 1);
    return true;
  }

  SF.Rounds = {
    step: step,
    get active() { return !!round && !round.over; }
  };
})();
