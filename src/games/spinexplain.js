/* SlideForge — games/spinexplain. Edit source here; npm run build updates js/model.js. */

/* Spin & Explain — Clear +2, hint +1, reject 0. */
function spinExplainPoints(verdict) {
  if (verdict === 'clear' || verdict === 0) return 2;
  if (verdict === 'hint' || verdict === 1) return 1;
  return 0;
}

/** @type {import("../types.js").GameEngine} */
const spinexplain = {
  defaults: {
    "defaultPoints": 2,
    "confidence": false
  },
  key: 'spinexplain',
  label: 'Spin & explain',
  icon: '◉',
  blurb: 'Spin a concept; explain it aloud. Host scores Clear, With hint, or Reject.',
  mechanic: 'judge',
  input: 'choice',
  minOptions: 3,
  maxOptions: 3,
  fixedOptions: ['Clear', 'With hint', 'Reject'],
  make: function () {
    return {
      question: 'Respiration',
      term: 'Respiration',
      hint: 'Energy from glucose',
      category: '',
      options: ['Clear', 'With hint', 'Reject'],
      correct: 0
    };
  },
  normalize: function (q) {
    q.term = String(q.term == null ? q.question : q.term).slice(0, 80);
    q.hint = String(q.hint == null ? '' : q.hint).slice(0, 120);
    q.category = String(q.category == null ? '' : q.category).slice(0, 40);
    q.question = q.term || q.question || 'Concept';
    q.options = ['Clear', 'With hint', 'Reject'];
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
    s.hint = q.hint;
    s.category = q.category;
    s.options = ['Clear', 'With hint', 'Reject'];
    s.correct = 0;
    s.answer = 'Clear';
    s.judgeKind = 'spinexplain';
  },
  mark: function (s, response) {
    return Number.isInteger(response) && response === 0;
  },
  summary: function (q) { return q.term || 'concept'; }
};

export { spinExplainPoints, spinexplain };
