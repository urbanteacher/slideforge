/* SlideForge — games/connection. Edit source here; npm run build updates js/model.js. */

/** @type {import("../types.js").GameEngine<import("../types.js").QuestionWith<'itemA'|'itemB'>>} */
const connection = {
  defaults: {
    "defaultTime": 0,
    "defaultPoints": 1,
    "confidence": false
  },
  key: 'connection',
  label: 'Connection maker',
  icon: '⚭',
  blurb: 'Pick two ideas and explain the bridge. Host Accepts for +1.',
  mechanic: 'judge',
  input: 'choice',
  minOptions: 2,
  maxOptions: 2,
  fixedOptions: ['Accept', 'Reject'],
  make: function () {
    return {
      question: 'Link these two ideas',
      itemA: 'Photosynthesis',
      itemB: 'Respiration',
      options: ['Accept', 'Reject'],
      correct: 0
    };
  },
  normalize: function (q) {
    q.itemA = String(q.itemA == null ? '' : q.itemA).slice(0, 80);
    q.itemB = String(q.itemB == null ? '' : q.itemB).slice(0, 80);
    q.question = q.question || ('How do ' + (q.itemA || 'A') + ' and ' + (q.itemB || 'B') + ' connect?');
    q.options = ['Accept', 'Reject'];
    q.correct = 0;
    return q;
  },
  problems: function (q, n) {
    if (!String(q.itemA || '').trim() || !String(q.itemB || '').trim()) {
      return 'Q' + n + ' needs two items to connect';
    }
    return null;
  },
  compile: function (q, st, s) {
    s.question = q.question;
    s.itemA = q.itemA.trim();
    s.itemB = q.itemB.trim();
    s.options = ['Accept', 'Reject'];
    s.correct = 0;
    s.answer = 'Accept';
    s.judgeKind = 'accept';
  },
  mark: function (s, response) {
    return Number.isInteger(response) && response === 0;
  },
  summary: function (q) { return (q.itemA || '?') + ' ↔ ' + (q.itemB || '?'); }
};

export { connection };
