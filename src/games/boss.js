import { ROOM_PLAY } from "./rooms.js";
/* SlideForge — games/boss. Edit source here; npm run build updates js/model.js. */
import { choice } from "./choice.js";
import rawStarters from "../samples/boss.json" with { type: "json" };

/* A JSON import widens every string, so `difficulty` arrives as `string`
   rather than one of the four bands. The checker cannot narrow it and the
   file cannot say so, hence the assertion — and tests/mechanics.test.js
   checks each value really is a band, which is the guarantee the type was
   standing in for. */
const starters = /** @type {Array<Partial<import("../types.js").Question>>} */ (
  /** @type {unknown} */ (rawStarters)
);

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
  /* One of each rung, so the boss starts on 11 HP and the damage ladder is
     visible before a word is rewritten.

     A single medium question gave the boss 2 HP and a right answer deals 2,
     so the boss died to the first answer — the format demonstrating the
     opposite of what it is for. Nothing flagged it: a one-question boss game
     is perfectly valid, it just is not a battle. */
  starters,
  defaults: {
    "defaultTime": 30,
    "confidence": false
  },
  key: 'boss',
  plays: ROOM_PLAY.quiz,
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
