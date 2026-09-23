import { ROOM_PLAY } from "./rooms.js";
/* SlideForge — games/randomchallenge. Edit source here; npm run build updates js/model.js. */

/** @type {import("../types.js").GameEngine} */
const randomchallenge = {
  /* What its per-question countdown is called. These four styles time
     something other than a question, and js/games.js listed all four
     to find them and then named three of them again to label them. */
  timeLabel: "Time per challenge",
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
  key: 'randomchallenge',
  plays: ROOM_PLAY.spoken,
  label: 'Random challenge',
  icon: '✦',
  blurb: 'Draw a challenge; host marks Complete. Count only — no competitive score.',
  mechanic: 'count',
  input: 'choice',
  minOptions: 2,
  maxOptions: 2,
  fixedOptions: ['Complete', 'Skip'],
  make: function () {
    return {
      question: 'Draw and take the challenge',
      challenge: 'Explain this idea to someone who missed the last lesson.',
      options: ['Complete', 'Skip'],
      correct: 0
    };
  },
  normalize: function (q) {
    q.challenge = String(q.challenge == null ? q.question : q.challenge).slice(0, 280);
    /* A face label, for Question Cube (Define, Compare, Why ...). */
    q.category = String(q.category == null ? '' : q.category).slice(0, 40);
    q.question = q.challenge || q.question || 'Challenge';
    q.options = ['Complete', 'Skip'];
    q.correct = 0;
    return q;
  },
  problems: function (q, n) {
    if (!String(q.challenge || q.question || '').trim()) return 'Q' + n + ' needs a challenge';
    return null;
  },
  compile: function (q, st, s) {
    s.question = q.challenge || q.question;
    s.challenge = q.challenge || q.question;
    s.category = q.category || '';
    s.options = ['Complete', 'Skip'];
    s.correct = 0;
    s.answer = 'Complete';
    s.judgeKind = 'count';
  },
  mark: function (s, response) {
    return Number.isInteger(response) && response === 0;
  },
  summary: function (q) { return 'Challenge'; }
};

export { randomchallenge };
