import starters from "../samples/compare.json" with { type: "json" };
/* SlideForge — games/compare. Edit source here; npm run build updates js/model.js. */

/* Compare & Contrast — two equal items; discuss alike/differ; reveal
   prepared similarities and differences. Phones idle; no score. */
/** @type {import("../types.js").GameEngine<import("../types.js").QuestionWith<'itemA'|'itemB'>>} */
const compare = {
  /* No Explanation field in the editor. js/games.js worked this out from
     whether the style had a board engine, with bowl named as the board
     that does take one and two more named as the non-boards that do
     not. Declared, the board question stops being a proxy for it. */
  showsExplanation: false,
  /* The most of these a teacher can add. Declared here rather than
     spelled out twice in js/games.js, where five styles were named in
     two identical twenty-line blocks. */
  maxQuestions: 10,
  /* No generic Question field in the editor. Declared here rather than
     named in a list inside js/games.js, where nine styles were spelled
     out to answer a question each of them can answer about itself. */
  showsQuestion: false,
  defaults: {
    "scoreboard": false,
    "defaultTime": 0,
    "defaultPoints": 0,
    "scoreSlide": false,
    "confidence": false
  },
  starters,
  key: 'compare',
  label: 'Compare & contrast',
  icon: '\u21c4',
  blurb: 'Two items side by side. Discuss similarities and differences — then reveal the prepared points. No score.',
  mechanic: 'points',
  input: 'choice',
  minOptions: 0,
  maxOptions: 0,
  fixedOptions: null,
  make: function () {
    return {
      question: 'Compare these two — how are they alike, and how do they differ?',
      itemA: 'Photosynthesis',
      itemB: 'Respiration',
      similarities: 'Both involve energy and gases moving in living cells.',
      differences: 'Photosynthesis stores energy in glucose; respiration releases it.',
      category: '',
      options: [],
      correct: -1
    };
  },
  normalize: function (q) {
    q.itemA = String(q.itemA == null ? '' : q.itemA).slice(0, 80);
    q.itemB = String(q.itemB == null ? '' : q.itemB).slice(0, 80);
    q.similarities = String(q.similarities == null ? '' : q.similarities).slice(0, 600);
    q.differences = String(q.differences == null ? '' : q.differences).slice(0, 600);
    q.category = String(q.category == null ? '' : q.category).slice(0, 40);
    if (!String(q.question || '').trim()) {
      q.question = 'Compare these two — how are they alike, and how do they differ?';
    }
    q.question = String(q.question).slice(0, 280);
    q.options = [];
    q.correct = -1;
    return q;
  },
  problems: function (q, n) {
    if (!String(q.itemA || '').trim() || !String(q.itemB || '').trim()) {
      return 'Q' + n + ' needs Item A and Item B';
    }
    if (String(q.itemA).trim().toLowerCase() === String(q.itemB).trim().toLowerCase()) {
      return 'Q' + n + ' needs two different items';
    }
    if (!String(q.similarities || '').trim()) {
      return 'Q' + n + ' needs similarities for the reveal';
    }
    if (!String(q.differences || '').trim()) {
      return 'Q' + n + ' needs differences for the reveal';
    }
    return null;
  },
  board: function (game) {
    var n = (game.questions || []).length;
    if (n < 3) return 'needs at least 3 comparisons and this has ' + n;
    if (n > 10) return 'can have at most 10 comparisons and this has ' + n;
    return null;
  },
  compile: function (q, settings, s) {
    s.question = q.question || 'Compare these two — how are they alike, and how do they differ?';
    s.headPrompt = s.question;
    s.itemA = String(q.itemA || '').trim();
    s.itemB = String(q.itemB || '').trim();
    s.similarities = String(q.similarities || '').trim();
    s.differences = String(q.differences || '').trim();
    s.category = String(q.category || '').trim();
    s.options = [];
    s.correct = -1;
    s.points = 0;
    s.voteOnly = true;
    s.hideAnswerUntilReveal = true;
    s.compareDiscuss = true;
    s.timeLimit = 0;
  },
  mark: function () { return false; },
  summary: function (q) {
    return (q.itemA || '?') + ' · ' + (q.itemB || '?');
  }
};

export { compare };
