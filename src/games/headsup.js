/* SlideForge — games/headsup. Edit source here; npm run build updates js/model.js. */

/* Heads Up — host Correct / Pass. Audit: Correct +1, Pass 0. */
/** @type {import("../types.js").GameEngine<import("../types.js").QuestionWith<'accept'|'answer'>>} */
const headsup = {
  /* What its per-question countdown is called. These four styles time
     something other than a question, and js/games.js listed all four
     to find them and then named three of them again to label them. */
  timeLabel: "Time per term",
  /* No generic Question field in the editor. Declared here rather than
     named in a list inside js/games.js, where nine styles were spelled
     out to answer a question each of them can answer about itself. */
  showsQuestion: false,
  defaults: {
    "defaultTime": 60,
    "defaultPoints": 1,
    "confidence": false
  },
  key: 'headsup',
  label: 'Heads up',
  icon: '↑',
  blurb: 'Describe the term; peers retrieve it. Host marks Correct or Pass.',
  mechanic: 'judge',
  input: 'choice',
  minOptions: 2,
  maxOptions: 2,
  fixedOptions: ['Correct', 'Pass'],
  make: function () {
    return {
      question: 'Photosynthesis',
      term: 'Photosynthesis',
      category: 'Biology',
      hint: '',
      options: ['Correct', 'Pass'],
      correct: 0
    };
  },
  normalize: function (q) {
    q.term = String(q.term == null ? q.question : q.term).slice(0, 80);
    q.category = String(q.category == null ? '' : q.category).slice(0, 40);
    q.hint = String(q.hint == null ? '' : q.hint).slice(0, 120);
    q.question = q.term || q.question || 'Term';
    q.options = ['Correct', 'Pass'];
    q.correct = 0;
    return q;
  },
  problems: function (q, n) {
    if (!String(q.term || q.question || '').trim()) return 'Q' + n + ' needs a term';
    return null;
  },
  compile: function (q, st, s) {
    s.question = q.term || q.question;
    s.term = q.term || q.question;
    s.category = q.category;
    s.hint = q.hint;
    s.options = ['Correct', 'Pass'];
    s.correct = 0;
    s.answer = 'Correct';
    s.judgeKind = 'headsup';
  },
  mark: function (s, response) {
    return Number.isInteger(response) && response === 0;
  },
  summary: function (q) { return q.term || q.question || 'term'; }
};

export { headsup };
