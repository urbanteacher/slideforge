import { ROOM_PLAY } from "./rooms.js";
/* SlideForge — games/speed. Edit source here; npm run build updates js/model.js. */
import { choice } from "./choice.js";

/* Beat the Clock — against the clock.

   It used to restart a countdown on every question, so there was no clock
   to beat. Now one clock runs for the whole run (the game's time, 90 s if
   unset), the questions keep coming — each one reveals the moment everyone
   has answered, shows the answer for a beat and moves on, or closes itself
   after PACE seconds — and at time the room's total of right answers takes
   the stage (js/rounds.js). The questions nobody reached are skipped.

   Scoring is still speed: a right answer earns 10 and up to 10 more for
   how fast it came after its question appeared; a wrong one costs 5 (a
   score never goes below zero). */
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
  blurb: 'One clock for the whole run. Questions keep coming as the room answers; faster right answers score more, wrong ones cost. How many can the room get right before time?',
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

/** Beat the Clock in a round: 10 for a right answer, plus up to 10 for
    speed — a second off per second after the question appeared. Wrong −5. */
function roundSpeedPoints(right, elapsedSec) {
  if (!right) return -5;
  var t = Math.max(0, Number(elapsedSec) || 0);
  return 10 + Math.max(0, 10 - Math.floor(t));
}

/* How long a round question waits for the slowest phone before it closes
   itself: the clock is the room's, and one learner should not stall it. */
var SPEED_PACE = 15;

export { speed, speedPoints, roundSpeedPoints, SPEED_PACE };
