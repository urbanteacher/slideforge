import { ROOM_PLAY } from "./rooms.js";
/* SlideForge — games/speed. Edit source here; npm run build updates js/model.js. */
import { choice } from "./choice.js";

/* Beat the Clock — same questions as multiple choice; scoring is time-aware.
   Audit: correct = 10 + floor(remaining/10), wrong = −5 (score never below 0). */
/** @type {import("../types.js").GameEngine<import("../types.js").QuestionWith<'options'|'correct'>>} */
const speed = {
  defaults: {
    "defaultTime": 60,
    "defaultPoints": 0,
    "confidence": false
  },
  key: 'speed',
  plays: ROOM_PLAY.quiz,
  label: 'Beat the clock',
  icon: '◷',
  blurb: 'Multiple choice against the countdown. Faster correct answers score more; wrong answers cost points.',
  mechanic: 'speed',
  input: 'choice',
  minOptions: 2,
  maxOptions: 6,
  fixedOptions: null,
  make: function () {
    var q = choice.make();
    q.question = 'Which answer is right — and fast?';
    return q;
  },
  normalize: function (q) { return choice.normalize(q); },
  problems: function (q, n) { return choice.problems(q, n); },
  compile: function (q, st, s) { choice.compile(q, st, s); },
  mark: function (s, response) { return choice.mark(s, response); },
  summary: function (q) { return choice.summary(q); }
};

/** Beat-the-Clock points for one answer. Remaining seconds at the moment
    they locked in — not at reveal — so early answers keep their bonus. */
function speedPoints(right, remainingSec) {
  if (right) return 10 + Math.floor(Math.max(0, Number(remainingSec) || 0) / 10);
  return -5;
}

export { speed, speedPoints };
