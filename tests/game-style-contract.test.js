'use strict';
/* A style answers for itself.
 *
 * js/games.js decided whether to offer the generic Question field by naming
 * nine styles in two conditions, above a third line that asked the style the
 * same question. Both forms in one nine-line function, and the correct one
 * already written. A twenty-fifth style would have joined the list only if
 * somebody remembered the list existed.
 *
 * `showsQuestion` is on the style now: declared where the answer is no,
 * omitted where it is yes, and deferred to the board engine for a board. This
 * holds the resolved answer for every style, so re-introducing a list — or
 * dropping a declaration — changes a number here rather than quietly changing
 * what a teacher sees.
 *
 * Same argument as tests/block-capabilities.test.js, in the other studio.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function load() {
  const dir = path.resolve(__dirname, '..');
  const stub = () => ({ style: {}, classList: { add() {}, contains: () => false },
    setAttribute() {}, appendChild() {} });
  const context = { window: {}, console, Date,
    document: { createElement: stub, querySelector: () => null, querySelectorAll: () => [] } };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(dir, 'js/model.js'), 'utf8'), context);
  return context.window.SF;
}

/* The resolution js/games.js performs, kept here in one place so the test and
   the studio cannot drift into two answers. */
function showsQuestion(style) {
  if (style.showsQuestion !== undefined) return style.showsQuestion;
  if (style.boardEngine) return style.boardEngine.showsQuestion;
  return true;
}

/* Recorded from the enumerating version before it was removed, style by
   style, so this is the old behaviour rather than the new code's opinion. */
const EXPECTED = {
  bingo: false, boss: true, bowl: true, choice: true, compare: false,
  conceptchain: false, connection: false, definition: false, emoji: false,
  headsup: false, knowledgeflip: false, lowstakes: false, memoryflip: false,
  memorymatch: false, oddone: false, order: true, race: true,
  randomchallenge: false, slider: true, speed: true, spinexplain: false,
  truefalse: true, type: true, wordreveal: true,
  /* 23 Sep 2026: the passage has its own Sentence field in the spot editor. */
  spot: false,
  /* 23 Sep 2026: the passage with [gaps] has its own field in the fill editor. */
  fill: false
};

test('every style resolves the Question field the way the list used to', () => {
  const SF = load();
  const styles = SF.GAME_STYLES;
  assert.deepEqual(Object.keys(styles).sort(), Object.keys(EXPECTED).sort(),
    'a style was added or removed — decide what it answers and record it here');
  const got = {};
  for (const key of Object.keys(styles).sort()) got[key] = showsQuestion(styles[key]);
  assert.deepEqual(got, EXPECTED);
});

test('every game declares what each kind of room can do', () => {
  const SF = load();
  for (const [key, style] of Object.entries(SF.GAME_STYLES)) {
    assert.ok(style.plays, key + ' has no room contract');
    assert.deepEqual(Object.keys(style.plays).sort(), ['entry', 'phones', 'solo', 'teams']);
    for (const [room, support] of Object.entries(style.plays)) {
      assert.ok(['yes', 'partial', 'no'].includes(support.status), key + ' has invalid ' + room + ' support');
      assert.ok(typeof support.reason === 'string' && support.reason.trim(), key + ' needs a reason for ' + room);
    }
    if (style.input !== 'none') {
      assert.equal(style.plays.entry.status, 'yes', key + ' takes an answer but teacher entry cannot record it');
    }
  }
});

test('the eleven that hide it say so themselves', () => {
  const SF = load();
  const styles = SF.GAME_STYLES;
  const declared = Object.keys(styles).filter((k) => styles[k].showsQuestion !== undefined);
  assert.deepEqual(declared.sort(),
    ['compare', 'conceptchain', 'connection', 'definition', 'emoji',
     'fill', 'headsup', 'oddone', 'randomchallenge', 'spinexplain', 'spot'],
    'the styles that hide the Question field must declare it, not be listed elsewhere');
  for (const key of declared) {
    assert.equal(styles[key].showsQuestion, false,
      key + ' declares showsQuestion, so it should be declaring the answer that is not the default');
  }
});

test('a board without its own answer defers to its board engine', () => {
  const SF = load();
  const styles = SF.GAME_STYLES;
  const boards = Object.keys(styles).filter((k) => styles[k].boardEngine);
  assert.ok(boards.length >= 6, 'the board styles must be found, got ' + boards.length);
  for (const key of boards) {
    assert.equal(styles[key].showsQuestion, undefined,
      key + ' is a board and should let its board engine answer rather than saying it twice');
    assert.equal(typeof styles[key].boardEngine.showsQuestion, 'boolean',
      key + "'s board engine must answer");
  }
});

/* The members added while pulling enumerations out of js/games.js. Each one
   replaced a list of style names with a question the style answers. Recorded
   the same way: the resolved answer for every style, taken from the
   enumerating version before it was removed. */

const EXPLANATION_HIDDEN = ['bingo', 'compare', 'conceptchain', 'knowledgeflip',
  'lowstakes', 'memoryflip', 'memorymatch'];

test('the Explanation field is hidden by declaration, not by being a board', () => {
  const SF = load();
  const styles = SF.GAME_STYLES;
  const hidden = Object.keys(styles).filter((k) => styles[k].showsExplanation === false);
  assert.deepEqual(hidden.sort(), EXPLANATION_HIDDEN,
    'this was `(!isBoard() || style === "bowl") && style !== "compare" && style !== "conceptchain"`');
  /* bowl is the point: a board that takes an Explanation anyway, which is why
     having a board engine could never answer this on its own. */
  assert.ok(styles.bowl.boardEngine, 'bowl is a board');
  assert.notEqual(styles.bowl.showsExplanation, false, 'and still takes an Explanation');
});

test('a style that times something other than a question names it', () => {
  const SF = load();
  const styles = SF.GAME_STYLES;
  const labelled = {};
  for (const k of Object.keys(styles)) if (styles[k].timeLabel) labelled[k] = styles[k].timeLabel;
  assert.deepEqual(labelled, {
    headsup: 'Round length',
    spinexplain: 'Time per explanation',
    connection: 'Time per challenge',
    randomchallenge: 'Time per challenge'
  }, 'four styles were listed to find them and three named again to label them');
});

test('a question ceiling belongs to the style', () => {
  const SF = load();
  const styles = SF.GAME_STYLES;
  const caps = {};
  for (const k of Object.keys(styles)) if (styles[k].maxQuestions) caps[k] = styles[k].maxQuestions;
  assert.deepEqual(caps, {
    lowstakes: 10, definition: 20, oddone: 10, compare: 10, conceptchain: 10
  }, 'these were two identical twenty-line blocks, above Add and above Duplicate');
});

test('studying pairs is not the same as the claim mechanic', () => {
  const SF = load();
  const styles = SF.GAME_STYLES;
  const pairs = Object.keys(styles).filter((k) => styles[k].studyPairs).sort();
  assert.deepEqual(pairs, ['memoryflip', 'memorymatch']);
  /* knowledgeflip shares `claim` and must stay out: its keywords stand alone,
     so the mechanic cannot answer this and the styles had to be named. */
  assert.equal(styles.knowledgeflip.mechanic, 'claim');
  assert.notEqual(styles.knowledgeflip.studyPairs, true);
});

test('one style times the whole game, not each question', () => {
  const SF = load();
  const styles = SF.GAME_STYLES;
  const whole = Object.keys(styles).filter((k) => styles[k].timesWholeGame).sort();
  assert.deepEqual(whole, ['lowstakes'], 'the rail named lowstakes to show "180s quiz"');
  /* The other timed styles count down per question, so the rail must keep
     showing their per-question timer rather than the game total. */
  assert.notEqual(styles.headsup.timesWholeGame, true);
});
