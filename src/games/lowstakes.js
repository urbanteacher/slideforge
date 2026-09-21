import { createLowstakesBoard } from "../boards/lowstakes.js";
import starters from "../samples/lowstakes.json" with { type: "json" };
/* SlideForge — games/lowstakes. Edit source here; npm run build updates js/model.js. */

/* Low-stakes retrieval — paper answers, whole-quiz clock, then reveal. */
var LOWSTAKES_TIMES = [120, 180, 240];

function clampLowstakesSeconds(n) {
  n = Number(n);
  if (LOWSTAKES_TIMES.indexOf(n) > -1) return n;
  if (!Number.isFinite(n) || n <= 0) return 180;
  if (n <= 150) return 120;
  if (n <= 210) return 180;
  return 240;
}

const board = createLowstakesBoard({ clampLowstakesSeconds });

/** @type {import("../types.js").GameEngine<import("../types.js").QuestionWith<'answer'>>} */
const lowstakes = {
  /* No Explanation field in the editor. js/games.js decided this by asking
     whether the style had a board engine, with bowl named as the board
     that does take one and two more named as the non-boards that do
     not. Declared, the board question stops being a proxy for it. */
  showsExplanation: false,
  /* The most of these a teacher can add. Declared here rather than
     spelled out twice in js/games.js, where five styles were named in
     two identical twenty-line blocks. */
  maxQuestions: 10,
  /* One countdown for the whole quiz rather than one per question, which
     is why the rail shows "180s quiz" instead of a per-question timer.
     js/games.js named the style to decide that. */
  timesWholeGame: true,
  boardEngine: board,
  defaults: {
    "scoreboard": false,
    "defaultTime": 180,
    "defaultPoints": 0,
    "scoreSlide": false,
    "confidence": false
  },
  starters,
  key: 'lowstakes',
  label: 'Low-stakes quiz',
  icon: '◎',
  blurb: 'Timed retrieval on paper. When time is up, answers are revealed for discussion — no scoreboard.',
  mechanic: 'count',
  input: 'choice',
  minOptions: 0,
  maxOptions: 0,
  fixedOptions: null,
  make: function () {
    return {
      question: 'What does RAM stand for?',
      answer: 'Random Access Memory'
    };
  },
  normalize: function (q) {
    q.question = String(q.question == null ? '' : q.question).slice(0, 280);
    /* Heal remaps from the old “choice with scoreboard off” preset: keep
       wording, take answer from answer / explanation / first option. */
    var ans = q.answer;
    if (ans == null || ans === '') ans = q.explanation;
    if ((ans == null || ans === '') && Array.isArray(q.options) && q.options.length) {
      ans = q.options[q.correct] || q.options[0];
    }
    q.answer = String(ans == null ? '' : ans).slice(0, 280);
    delete q.options;
    delete q.correct;
    delete q.accept;
    return q;
  },
  problems: function (q, n) {
    /* `|| ''` because String(undefined) is "undefined" — truthy — so the
       bare checks called a blank question and a missing answer valid. */
    if (!String(q.question || '').trim()) return 'Q' + n + ' has no question text';
    if (!String(q.answer || '').trim()) return 'Q' + n + ' needs an answer for the reveal';
    return null;
  },
  /* Audit: 3–10 questions. Incomplete slots stay on the board as named gaps
     rather than vanishing, so the count here is every authored row. */
  board: function (game) {
    var n = (game.questions || []).length;
    if (n < 3) {
      return 'needs at least 3 questions and this has ' + n;
    }
    if (n > 10) {
      return 'can have at most 10 questions and this has ' + n;
    }
    return null;
  },
  compile: function (q, st, s) {
    s.question = q.question;
    s.answer = q.answer;
    s.options = [];
    s.correct = -1;
    s.points = 0;
  },
  mark: function () { return false; },
  summary: function (q) {
    return (String(q.question || '').trim() || 'question') + ' · retrieval';
  }
};

export { LOWSTAKES_TIMES, clampLowstakesSeconds, lowstakes };
