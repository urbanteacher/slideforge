import { ROOM_PLAY } from "./rooms.js";
/* SlideForge — games/order. Edit source here; npm run build updates js/model.js. */

/* Ranking. The answer is an order, not a pick \u2014 the first shape in this
   app where one response is a list. Marked on how many items the learner
   put in exactly the right place, so a near-miss is worth something and a
   reversal is not worth nothing.

   Partial credit matters more here than anywhere else: with six items,
   all-or-nothing marking makes the question unanswerable for most of a
   class and tells the teacher only that it was hard. */
/** @type {import("../types.js").GameEngine<import("../types.js").QuestionWith<'options'>>} */
const order = {
  defaults: {
    "defaultPoints": 10
  },
  key: 'order',
  plays: ROOM_PLAY.order,
  label: 'Ranking',
  icon: '\u2195',
  blurb: 'Put items in the right order. Part marks for the ones placed correctly.',
  mechanic: 'points',
  input: 'order',
  minOptions: 3,
  maxOptions: 8,

  make: function () {
    return {
      question: 'Put these in order, first to last.',
      /* Authored in the correct order; the room is shown a shuffle. */
      options: ['First', 'Second', 'Third', 'Fourth'],
      correct: 0
    };
  },

  normalize: function (q) {
    if (!Array.isArray(q.options)) q.options = [];
    q.options = q.options
      .map(function (o) { return typeof o === 'string' ? o : (o && o.text) || ''; })
      .slice(0, 8);
    while (q.options.length < 3) q.options.push('');
    return q;
  },

  problems: function (q, n) {
    var live = (q.options || []).filter(function (o) { return String(o).trim(); });
    /* `|| ''` because String(undefined) is "undefined" — truthy. This one
       looked safe when probed with an empty question, but only because the
       items check below answers first. Give it three items and no `question`
       field and it returned null: ready to teach with, nothing to read. */
    if (!String(q.question || '').trim()) return 'Q' + n + ' has no question text';
    if (live.length < 3) return 'Q' + n + ' needs at least three items to order';
    var seen = {};
    for (var i = 0; i < live.length; i++) {
      var k = live[i].trim().toLowerCase();
      /* Two identical items make the order ambiguous: a learner who swaps
         them is marked wrong for a difference nobody can see. */
      if (seen[k]) return 'Q' + n + ' has two items reading "' + live[i].trim() + '"';
      seen[k] = 1;
    }
    return null;
  },

  compile: function (q, settings, s) {
    s.question = q.question;
    s.options = q.options.filter(function (o) { return String(o).trim(); });
    /* The authored order is the answer; the slide carries it so the host
       can mark and so the reveal can show it. */
    s.correct = 0;
  },

  /* A response is an array of indices into s.options, in the learner's
     order. Right means every item in its authored place. */
  mark: function (s, response) {
    return orderScore(s, response) === 1;
  },

  summary: function (q) {
    var live = (q.options || []).filter(function (o) { return String(o).trim(); });
    return live.length + ' to order';
  },

  describe: function (s, response) {
    if (!Array.isArray(response)) return '';
    return response.map(function (i) { return (s.options || [])[i]; })
      .filter(Boolean).join(' \u2192 ');
  }
};

/**
 * How much of an ordering is right, as a fraction from 0 to 1.
 *
 * Exact positions rather than pair distance. A learner who has the first
 * three right and the last two swapped has three quarters of it, and that
 * is what the number says \u2014 distance metrics are defensible but a teacher
 * cannot predict them, and an unpredictable mark is worse than a blunt one.
 */
function orderScore(slide, response) {
  var n = (slide.options || []).length;
  if (!n || !Array.isArray(response) || response.length !== n) return 0;
  var seen = {}, exact = 0;
  for (var i = 0; i < n; i++) {
    var v = response[i];
    if (!Number.isInteger(v) || v < 0 || v >= n || seen[v]) return 0;  // not a permutation
    seen[v] = 1;
    if (v === i) exact++;
  }
  return exact / n;
}

/** Ranking audit formula: round(10 × exactPositions / n), max 10 per set. */
function orderPoints(fractionOrSlide, response) {
  var frac = typeof fractionOrSlide === 'number'
    ? fractionOrSlide
    : orderScore(fractionOrSlide, response);
  return Math.round(10 * Math.max(0, Math.min(1, Number(frac) || 0)));
}

export { order, orderScore, orderPoints };
