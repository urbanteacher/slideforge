import starters from "../samples/oddone.json" with { type: "json" };
/* SlideForge — games/oddone. Edit source here; npm run build updates js/model.js. */

/* Odd One Out — four equal items; discuss the rule; reveal the prepared
   odd one. Quiz-shaped discuss format: phones stay idle; no competitive
   score. Justification is the lesson. */
/** @type {import("../types.js").GameEngine<import("../types.js").QuestionWith<'options'|'correct'>>} */
const oddone = {
  defaults: {
    "scoreboard": false,
    "defaultTime": 0,
    "defaultPoints": 0,
    "scoreSlide": false,
    "confidence": false
  },
  starters,
  key: 'oddone',
  label: 'Odd one out',
  icon: '\u25c7',
  blurb: 'Four equal items. Discuss which does not belong and why — then reveal the prepared rationale. No score.',
  mechanic: 'points',
  input: 'choice',
  minOptions: 4,
  maxOptions: 4,
  fixedOptions: null,
  make: function () {
    return {
      question: 'Which is the odd one out — and what is the rule?',
      options: ['Iron', 'Copper', 'Oxygen', 'Zinc'],
      correct: 2,
      explanation: 'Oxygen is a non-metal. Accept any defensible rule a learner can argue for — the reasoning is the point.'
    };
  },
  normalize: function (q) {
    if (!Array.isArray(q.options)) q.options = [];
    q.options = q.options
      .map(function (o) { return typeof o === 'string' ? o : (o && o.text) || ''; })
      .slice(0, 4);
    while (q.options.length < 4) q.options.push('');
    q.correct = Math.max(0, Math.min(3, Number(q.correct) || 0));
    if (!String(q.question || '').trim()) {
      q.question = 'Which is the odd one out — and what is the rule?';
    }
    q.question = String(q.question).slice(0, 280);
    return q;
  },
  problems: function (q, n) {
    var live = (q.options || []).filter(function (o) { return String(o).trim(); });
    if (live.length < 4) return 'Q' + n + ' needs four items';
    if (!String(q.options[q.correct] || '').trim()) {
      return 'Q' + n + ' has no odd one marked';
    }
    var seen = {};
    for (var i = 0; i < 4; i++) {
      var k = String(q.options[i] || '').trim().toLowerCase();
      if (!k) return 'Q' + n + ' needs four items';
      if (seen[k]) return 'Q' + n + ' has two items reading "' + q.options[i].trim() + '"';
      seen[k] = 1;
    }
    if (!String(q.explanation || '').trim()) {
      return 'Q' + n + ' needs an explanation for the reveal';
    }
    return null;
  },
  board: function (game) {
    var n = (game.questions || []).length;
    if (n < 3) return 'needs at least 3 sets and this has ' + n;
    if (n > 10) return 'can have at most 10 sets and this has ' + n;
    return null;
  },
  compile: function (q, settings, s) {
    s.question = q.question || 'Which is the odd one out — and what is the rule?';
    s.headPrompt = s.question;
    s.options = q.options.map(function (o) { return String(o).trim(); }).slice(0, 4);
    s.correct = Math.max(0, Math.min(3, Number(q.correct) || 0));
    s.points = 0;
    s.voteOnly = true;
    s.hideAnswerUntilReveal = true;
    s.oddoneDiscuss = true;
    s.timeLimit = 0;
  },
  mark: function (s, response) {
    return Number.isInteger(response) && response === s.correct;
  },
  summary: function (q) {
    var odd = String((q.options || [])[q.correct] || '').trim();
    return (odd || 'odd one') + ' · discuss';
  }
};

export { oddone };
