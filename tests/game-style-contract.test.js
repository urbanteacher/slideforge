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
  truefalse: true, type: true, wordreveal: true
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

test('the nine that hide it say so themselves', () => {
  const SF = load();
  const styles = SF.GAME_STYLES;
  const declared = Object.keys(styles).filter((k) => styles[k].showsQuestion !== undefined);
  assert.deepEqual(declared.sort(),
    ['compare', 'conceptchain', 'connection', 'definition', 'emoji',
     'headsup', 'oddone', 'randomchallenge', 'spinexplain'],
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
