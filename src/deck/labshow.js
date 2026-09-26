/* SlideForge — deck/labshow. Edit source here; npm run build updates js/model.js. */

/*
 * A lab lesson's games, in the live room.
 *
 * The lab draws its slides; SlideForge's player, relay and phones run the room. A lab show reaches
 * the room as pictures (js/lab-engine.js), and a picture asks the phones nothing. So each of the
 * lab's game slides carries what SlideForge needs to play it (lab/src/model/designs/games.ts,
 * formats.ts: slide.game), and this turns the lab's slides into the show SlideForge plays:
 *
 *  - a question becomes SlideForge's own quiz slide — the question, its options, its answer, the
 *    time and points the Game panel set — with the lab's drawing over it (design.labStill). The
 *    phones get the question, the relay and the host mark it, as for any SlideForge game;
 *  - its answer slide is not a step of its own: when the question is revealed, the lab's drawing
 *    moves on to it (design.labReveal, js/lab-stage.js), so the room sees the lab's answer while
 *    the phones get their verdicts. A second drawing of the same question (Definition challenge's
 *    recall, after its reading) is design.labAsk, drawn when SlideForge asks;
 *  - a board (Quiz bowl, the memory games, Bingo, the low-stakes quiz) and a round played in one
 *    go (Beat the clock's sprint, the Question cube's draws) hold the room's state as they are
 *    played, so they play on SlideForge's own board, compiled as SlideForge compiles them; the
 *    game's other slides stand down and its cover stays the lab's;
 *  - Word reveal's letters drip on SlideForge's clock, which is what the phones are scored by, so
 *    it plays on SlideForge's wall too.
 *
 * Everything else stays a picture.
 */

/** Formats whose question plays on SlideForge's wall rather than under the lab's drawing. */
var SLIDEFORGE_WALL = { 'word-reveal': true, wordreveal: true };

/** @param {any} v */
function copy(v) { return JSON.parse(JSON.stringify(v)); }

/**
 * A lab question as SlideForge's quiz slide, with the Game panel's settings over the question's own.
 * @param {any} still @param {any} ask @param {any} answer @param {(type: any) => any} makeSlide
 */
function quizSlide(still, ask, answer, makeSlide) {
  var g = still.game, set = g.settings || {};
  var s = Object.assign(makeSlide('quiz'), copy(g.quiz));
  s.id = still.id;
  s.type = 'quiz';
  s.notes = still.notes || '';
  if (still.hidden) s.hidden = true;
  s.timeLimit = set.seconds > 0 ? set.seconds : 0;
  if (set.points != null) s.points = set.points;
  if (set.difficulty) s.difficulty = set.difficulty;
  if (set.damage != null) s.bossDamage = set.damage;
  if (set.tolerance != null) s.tolerance = set.tolerance;
  if (set.accept && set.accept.length) s.accept = set.accept.slice();
  s.gameId = g.id;
  s.gameTitle = g.label;
  /* The picture is the poster: what the desk's thumbnails show and what stands in while the lab draws. */
  s.image = still.image;
  s.headerFooter = { enabled: false, slots: {} };
  s.transition = 'none';
  if (!SLIDEFORGE_WALL[g.format]) {
    s.design = Object.assign({}, s.design, { labStill: true });
    if (answer) s.design.labReveal = answer.id;
    if (ask) s.design.labAsk = ask.id;
  }
  return s;
}

/**
 * A board or a round, as SlideForge compiles it, where the lab's slide stood.
 * @param {any} still @param {(type: any) => any} makeSlide
 */
function boardSlides(still, makeSlide) {
  var g = still.game, set = g.settings || {};
  return g.board.map(function (/** @type {any} */ b, /** @type {number} */ k) {
    var s = Object.assign(makeSlide(b.type || 'content'), copy(b));
    s.id = k ? still.id + '~' + k : still.id;
    s.gameId = g.id;
    s.gameTitle = g.label;
    if (s.type === 'quiz' && set.seconds > 0 && g.format !== 'beat-the-clock') s.timeLimit = set.seconds;
    if (s.type === 'quiz' && g.format === 'beat-the-clock' && set.seconds > 0) s.roundSeconds = set.seconds;
    if (still.hidden) s.hidden = true;
    return s;
  });
}

/**
 * The lab's slides as the show SlideForge plays: pictures, and for its games, SlideForge's own
 * quiz slides and boards. Each item is a still (drawn as a picture by the caller) or an
 * `{ id, sourceSlideId, sf }` whose `sf` is the SlideForge slide or slides to play there.
 *
 * @param {any[]} stills the lab's slides, each with its picture and, for a game, `game`
 * @param {(type: any) => any} makeSlide
 * @returns {any[]}
 */
export function labShowSlides(stills, makeSlide) {
  /** @type {Record<string, any[]>} */
  var byGame = {};
  (stills || []).forEach(function (s) {
    if (s && s.game && s.game.id) (byGame[s.game.id] = byGame[s.game.id] || []).push(s);
  });
  /** @type {any[]} */
  var out = [];
  (stills || []).forEach(function (still) {
    var g = still && still.game;
    if (!g || !g.id) { out.push(still); return; }
    var mine = byGame[g.id];
    /** @param {string} role @param {string} key */
    var part = function (role, key) { return mine.filter(function (x) { return x.game.role === role && x.game.key === key; }); };
    var board = mine.filter(function (x) { return x.game.board && x.game.board.length; })[0];
    if (board) {
      /* A board game: the lab's cover, then SlideForge's board where the lab's first stood. */
      if (g.role === 'cover') out.push(still);
      else if (still === board) out.push({ id: still.id, sourceSlideId: still.sourceSlideId, sf: boardSlides(still, makeSlide) });
      return;
    }
    if (g.role === 'question' && g.quiz && g.key != null) {
      var asks = part('question', g.key);
      if (asks[0] !== still) return; // a second drawing of this question: its ask, drawn over the first
      out.push({ id: still.id, sourceSlideId: still.sourceSlideId, sf: quizSlide(still, asks[1], part('answer', g.key)[0], makeSlide) });
      return;
    }
    /* An answer is drawn as its question's reveal, when that question is played. */
    if (g.role === 'answer' && g.key != null && part('question', g.key).some(function (x) { return x.game.quiz; })) return;
    out.push(still);
  });
  return out;
}
