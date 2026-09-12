/* SlideForge — games/boss. Edit source here; npm run build updates js/model.js. */
import { choice } from "./choice.js";

/* Boss Battle — shared HP. A hit deals damage from the question difficulty.
   Audit: easy 1, medium 2, hard 3, boss 5; HP starts as the sum of damages. */
var BOSS_DAMAGE = { easy: 1, medium: 2, hard: 3, boss: 5 };

var BOSS_LEVELS = ['easy', 'medium', 'hard', 'boss'];

function bossDamage(difficulty) {
  return BOSS_DAMAGE[difficulty] || BOSS_DAMAGE.medium;
}

function bossMaxHp(questions) {
  return (questions || []).reduce(function (n, q) {
    return n + bossDamage(q && q.difficulty);
  }, 0);
}

/** @type {import("../types.js").GameEngine<import("../types.js").QuestionWith<'difficulty'|'options'|'correct'>>} */
const boss = {
  defaults: {
    "defaultTime": 30,
    "confidence": false
  },
  key: 'boss',
  label: 'Boss battle',
  icon: '▲',
  blurb: 'Multiple choice against a shared boss. Correct hits deal damage; bring HP to zero before the questions run out.',
  mechanic: 'boss',
  input: 'choice',
  minOptions: 2,
  maxOptions: 6,
  fixedOptions: null,
  make: function () {
    var q = choice.make();
    q.question = 'Strike the boss — which answer is right?';
    q.difficulty = 'medium';
    return q;
  },
  normalize: function (q) {
    choice.normalize(q);
    q.difficulty = BOSS_LEVELS.indexOf(q.difficulty) > -1 ? q.difficulty : 'medium';
    return q;
  },
  problems: function (q, n) { return choice.problems(q, n); },
  compile: function (q, st, s) {
    choice.compile(q, st, s);
    s.difficulty = q.difficulty;
    s.bossDamage = bossDamage(q.difficulty);
  },
  mark: function (s, response) { return choice.mark(s, response); },
  summary: function (q) {
    return choice.summary(q) + ' · ' + (q.difficulty || 'medium') +
      ' (' + bossDamage(q.difficulty) + ' dmg)';
  }
};

export { BOSS_DAMAGE, BOSS_LEVELS, bossDamage, bossMaxHp, boss };
