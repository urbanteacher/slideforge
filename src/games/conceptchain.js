import starters from "../samples/conceptchain.json" with { type: "json" };
/* SlideForge — games/conceptchain. Edit source here; npm run build updates js/model.js. */

/* Concept Chain — start term; host captures a spoken link; Accept grows
   the visible chain (+1). Per-link timer; timeout / Reject skip. */
var CHAIN_TIMES = [30, 45, 60, 90];

function clampChainSeconds(n) {
  n = Number(n);
  return CHAIN_TIMES.indexOf(n) > -1 ? n : 45;
}

/** @type {import("../types.js").GameEngine<import("../types.js").QuestionWith<'term'|'prompt'>>} */
const conceptchain = {
  /* No generic Question field in the editor. Declared here rather than
     named in a list inside js/games.js, where nine styles were spelled
     out to answer a question each of them can answer about itself. */
  showsQuestion: false,
  defaults: {
    "defaultTime": 45,
    "defaultPoints": 1,
    "confidence": false
  },
  starters,
  key: 'conceptchain',
  label: 'Concept chain',
  icon: '⛓',
  blurb: 'Start from a term; add a justified link. Host Accepts to grow the chain (+1).',
  mechanic: 'judge',
  input: 'choice',
  minOptions: 2,
  maxOptions: 2,
  fixedOptions: ['Accept', 'Reject'],
  make: function () {
    return {
      question: 'Add the next justified link',
      term: 'Cell',
      prompt: 'The basic unit of living things — what connects next?',
      options: ['Accept', 'Reject'],
      correct: 0
    };
  },
  normalize: function (q) {
    q.term = String(q.term == null ? '' : q.term).slice(0, 80);
    /* Heal older saves that stored the wall cue as definition. */
    if (q.definition != null && String(q.definition).trim()) {
      q.prompt = q.definition;
    }
    q.prompt = String(q.prompt == null ? '' : q.prompt).slice(0, 280);
    delete q.definition;
    q.question = q.question || ('Chain from: ' + (q.term || '…'));
    q.options = ['Accept', 'Reject'];
    q.correct = 0;
    return q;
  },
  problems: function (q, n) {
    if (!String(q.term || '').trim()) return 'Q' + n + ' needs a starting term';
    return null;
  },
  board: function (game) {
    var n = (game.questions || []).length;
    if (n < 3) return 'needs at least 3 starting concepts and this has ' + n;
    if (n > 10) return 'can have at most 10 starting concepts and this has ' + n;
    return null;
  },
  compile: function (q, st, s) {
    s.question = q.question;
    s.term = String(q.term || '').trim();
    s.prompt = String(q.prompt || '').trim();
    s.options = ['Accept', 'Reject'];
    s.correct = 0;
    s.answer = 'Accept';
    s.judgeKind = 'accept';
    s.conceptChain = true;
    s.timeLimit = clampChainSeconds(
      q.timeLimit == null ? st.defaultTime : q.timeLimit
    );
    s.points = 1;
  },
  mark: function (s, response) {
    return Number.isInteger(response) && response === 0;
  },
  summary: function (q) { return 'Chain · ' + (q.term || 'term'); }
};

export { CHAIN_TIMES, clampChainSeconds, conceptchain };
