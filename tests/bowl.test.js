'use strict';
/* Quiz bowl.
 *
 * What it used to be: a run of quiz slides in the order they were authored,
 * each with a category and a value written on it and a Correct/Wrong vote sent
 * to every phone. That is a quiz wearing a bowl's clothes — the whole point of
 * a bowl is choosing which cell to spend next, and there was no board to
 * choose from.
 *
 * What it is: one column per category, one row per value in use. The teacher
 * picks an unused cell, the room answers aloud, the answer goes up, and the
 * cell is awarded to a team or to nobody. Either way it is spent, which is
 * what makes reaching for the five hundred a decision. It ends when the board
 * empties or someone reaches the target.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const plain = (v) => JSON.parse(JSON.stringify(v));

function load() {
  const dir = path.resolve(__dirname, '..');
  const context = { window: {}, console, setInterval, clearInterval, Date, Math };
  context.globalThis = context;
  vm.createContext(context);
  /* The board runtimes moved into the boards engine and ship inside
     js/model.js, which installs them; loading the bundle is enough. */
  for (const f of ['js/model.js']) {
    vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), context);
  }
  const SF = context.window.SF;
  const stub = () => ({ appendChild() {}, focus() {},
    classList: { toggle() {}, add() {}, remove() {} },
    setAttribute() {}, replaceChildren() {}, querySelector: () => null,
    dataset: {}, style: {} });
  SF.el = stub;
  return { SF, stub };
}

/** A game whose cells are `category value` across the values given. */
function game(SF, cats, values, over) {
  const g = SF.makeGame('Revision bowl', 'bowl');
  Object.assign(g.settings, { mode: 'teams', teams: [{ name: 'Red' }, { name: 'Blue' }] }, over || {});
  g.questions = [];
  cats.forEach((c) => values.forEach((v) => {
    g.questions.push(SF.normalizeQuestion(Object.assign(SF.makeQuestion('bowl'), {
      category: c, pointValue: v, targetScore: 1000,
      question: c + ' ' + v + '?', answer: c + ' ' + v + ' answer'
    }), 'bowl'));
  }));
  return g;
}

const boardOf = (SF, g) => SF.gameToRunDeck(g).slides.find((s) => s.bowlBoard).bowlBoard;
const at = (b, cat, value) => b.cells.findIndex((c) => c.category === cat && c.value === value);

test('the grid is categories across and only the values actually used', () => {
  const { SF } = load();
  /* Nobody wrote a 300, so there is no 300 row. An empty row is a line of
     cells the room can never choose, which reads as a broken board. */
  const b = boardOf(SF, game(SF, ['Cells', 'Transport'], [100, 500]));
  assert.deepEqual(plain(b.categories), ['Cells', 'Transport']);
  assert.deepEqual(plain(b.values), [100, 500]);
  assert.equal(b.cells.length, 4);
  assert.equal(b.cells.every((c) => c.questions.length === 1), true);
});

test('two questions on one category and value stack in the same cell', () => {
  const { SF } = load();
  const g = game(SF, ['Cells'], [200]);
  g.questions.push(SF.normalizeQuestion(Object.assign(SF.makeQuestion('bowl'), {
    category: 'Cells', pointValue: 200, question: 'A second one?', answer: 'Yes'
  }), 'bowl'));
  const b = boardOf(SF, g);
  assert.equal(b.cells.length, 1, 'still one cell, not two rows of 200');
  assert.equal(b.cells[0].questions.length, 2);

  let s = SF.Bowl.transition(b, SF.Bowl.create(b), 'start');
  assert.equal(SF.Bowl.pending(b, s, 0).question, 'Cells 200?');
  s = SF.Bowl.transition(b, s, 'pick', 0);
  s = SF.Bowl.transition(b, s, 'reveal');
  s = SF.Bowl.transition(b, s, 'award', 0);
  assert.equal(SF.Bowl.pending(b, s, 0).question, 'A second one?', 'the cell has one left');
  assert.equal(SF.Bowl.spent(b, s), false);
  s = SF.Bowl.transition(b, s, 'pick', 0);
  s = SF.Bowl.transition(b, s, 'reveal');
  s = SF.Bowl.transition(b, s, 'award', 1);
  assert.equal(SF.Bowl.pending(b, s, 0), null, 'and now it is spent');
  assert.equal(s.phase, 'complete', 'an empty board ends it');
});

test('the answer stays off the wall until it is revealed, and nothing is awarded before that', () => {
  const { SF } = load();
  const b = boardOf(SF, game(SF, ['Cells'], [100, 200]));
  let s = SF.Bowl.transition(b, SF.Bowl.create(b), 'start');
  s = SF.Bowl.transition(b, s, 'pick', at(b, 'Cells', 100));
  assert.equal(s.phase, 'asking');
  assert.equal(s.revealed, false);

  /* Awarding early would put a cell on a team's score before the room has
     heard what the answer even was. */
  assert.deepEqual(plain(SF.Bowl.transition(b, s, 'award', 0).scores), [0, 0]);
  assert.deepEqual(plain(SF.Bowl.transition(b, s, 'noScore').used), plain(s.used));

  const shown = SF.Bowl.transition(b, s, 'reveal');
  assert.equal(shown.revealed, true);
  assert.deepEqual(plain(SF.Bowl.transition(b, shown, 'award', 0).scores), [100, 0]);
});

test('a cell is spent whether or not anyone answered it', () => {
  const { SF } = load();
  const b = boardOf(SF, game(SF, ['Cells', 'Transport'], [100, 200]));
  let s = SF.Bowl.transition(b, SF.Bowl.create(b), 'start');
  const cell = at(b, 'Transport', 200);
  s = SF.Bowl.transition(b, s, 'pick', cell);
  s = SF.Bowl.transition(b, s, 'reveal');
  s = SF.Bowl.transition(b, s, 'noScore');
  assert.deepEqual(plain(s.scores), [0, 0], 'nobody scored');
  assert.equal(SF.Bowl.pending(b, s, cell), null, 'and it cannot be chosen again');
  assert.equal(s.phase, 'picking');
  /* Picking a spent cell does nothing rather than reopening it. */
  assert.equal(SF.Bowl.transition(b, s, 'pick', cell).phase, 'picking');
  assert.equal(SF.Bowl.transition(b, s, 'pick', cell).cell, -1);
});

test('reaching the target ends the board with the rest of it unused', () => {
  const { SF } = load();
  const b = boardOf(SF, game(SF, ['Cells', 'Transport', 'Enzymes'], [100, 200, 300, 400, 500]));
  assert.equal(b.target, 1000);
  let s = SF.Bowl.transition(b, SF.Bowl.create(b), 'start');
  for (const cat of ['Cells', 'Transport']) {
    s = SF.Bowl.transition(b, s, 'pick', at(b, cat, 500));
    s = SF.Bowl.transition(b, s, 'reveal');
    s = SF.Bowl.transition(b, s, 'award', 0);
  }
  assert.deepEqual(plain(s.scores), [1000, 0]);
  assert.equal(s.phase, 'complete');
  assert.equal(SF.Bowl.spent(b, s), false, 'the board still had cells on it');
  assert.equal(SF.Bowl.winner(b, s), 'Red wins on 1000.');
  /* And nothing more can be scored once it is over. */
  const after = SF.Bowl.transition(b, s, 'pick', at(b, 'Enzymes', 100));
  assert.equal(after.phase, 'complete');
  assert.equal(after.cell, -1);
});

test('a tie is named rather than resolved', () => {
  const { SF } = load();
  const b = boardOf(SF, game(SF, ['Cells'], [100, 200]));
  let s = SF.Bowl.transition(b, SF.Bowl.create(b), 'start');
  s = SF.Bowl.transition(b, s, 'pick', at(b, 'Cells', 100));
  s = SF.Bowl.transition(b, s, 'reveal');
  s = SF.Bowl.transition(b, s, 'award', 0);
  s = SF.Bowl.transition(b, s, 'pick', at(b, 'Cells', 200));
  s = SF.Bowl.transition(b, s, 'reveal');
  s = SF.Bowl.transition(b, s, 'award', 1);
  /* 100 to Red and 200 to Blue is not a tie; make it one. */
  assert.equal(SF.Bowl.winner(b, s), 'Blue wins on 200.');
  const level = Object.assign({}, s, { scores: [200, 200] });
  assert.equal(SF.Bowl.winner(b, level), 'A tie on 200: Red & Blue');
});

test('one participant plays the target, not the other teams', () => {
  const { SF } = load();
  const b = boardOf(SF, game(SF, ['Cells'], [100, 200], { mode: 'individual' }));
  assert.deepEqual(plain(b.participants), ['The class']);
  let s = SF.Bowl.transition(b, SF.Bowl.create(b), 'start');
  s = SF.Bowl.transition(b, s, 'pick', at(b, 'Cells', 100));
  s = SF.Bowl.transition(b, s, 'reveal');
  s = SF.Bowl.transition(b, s, 'award', 0);
  s = SF.Bowl.transition(b, s, 'pick', at(b, 'Cells', 200));
  s = SF.Bowl.transition(b, s, 'reveal');
  s = SF.Bowl.transition(b, s, 'noScore');
  assert.equal(s.phase, 'complete');
  assert.match(SF.Bowl.winner(b, s), /board is empty on 100 of 1000/);
});

test('restart deals a clean board', () => {
  const { SF } = load();
  const b = boardOf(SF, game(SF, ['Cells'], [100, 200]));
  let s = SF.Bowl.transition(b, SF.Bowl.create(b), 'start');
  s = SF.Bowl.transition(b, s, 'pick', 0);
  s = SF.Bowl.transition(b, s, 'reveal');
  s = SF.Bowl.transition(b, s, 'award', 0);
  const fresh = SF.Bowl.transition(b, s, 'restart');
  assert.equal(fresh.phase, 'ready');
  assert.deepEqual(plain(fresh.scores), [0, 0]);
  assert.deepEqual(plain(fresh.used), [0, 0]);
  assert.equal(fresh.asked, 0);
});

test('an award reports a verdict carrying the cell value; a pick does not', (t) => {
  const { SF, stub } = load();
  const b = boardOf(SF, game(SF, ['Cells', 'Transport'], [100, 500]));
  const slide = { id: 'bowl-1', title: 'Revision bowl', bowlBoard: b };
  const player = { bowlStates: {} };
  const sent = [];
  SF.Bowl.onVerdict = (v) => sent.push(v);
  const pad = stub();
  SF.Bowl.mount(player, slide, { querySelector: () => pad, contains: () => false });
  t.after(() => SF.Bowl.unmount());

  SF.Bowl.command('start');
  SF.Bowl.command('pick', at(b, 'Transport', 500));
  assert.equal(sent.length, 0, 'choosing a cell is not a verdict');
  SF.Bowl.command('reveal');
  assert.equal(sent.length, 0, 'nor is revealing it');
  SF.Bowl.command('award', 1);
  SF.Bowl.command('pick', at(b, 'Cells', 100));
  SF.Bowl.command('reveal');
  SF.Bowl.command('noScore');

  assert.deepEqual(sent.map((v) => [v.participant, v.right, v.value]), [
    ['Blue', true, 500],
    [null, false, 0]
  ]);
  assert.equal(sent[0].kind, 'bowl');
  assert.equal(sent[0].slideId, 'bowl-1');
  assert.match(sent[0].term, /^Transport 500 — /);
});

test('a board wider than a projector is refused, and a categoryless one too', () => {
  const { SF } = load();
  const style = SF.GAME_STYLES.bowl;
  assert.equal(style.board(game(SF, ['A', 'B', 'C', 'D', 'E', 'F'], [100])), null);
  assert.match(style.board(game(SF, ['A', 'B', 'C', 'D', 'E', 'F', 'G'], [100])),
    /7 categories is wider than a board reads/);
  const blank = game(SF, ['Cells'], [100]);
  blank.questions.forEach((q) => { q.category = ''; });
  assert.match(style.board(blank), /no question has a category/);
});

test('compiling leaves the game untouched and leaks no quiz machinery', () => {
  const { SF } = load();
  const g = game(SF, ['Cells', 'Transport'], [100, 200]);
  const snapshot = JSON.stringify(g);
  const first = SF.gameToRunDeck(g).slides.find((s) => s.bowlBoard);
  const second = SF.gameToRunDeck(g).slides.find((s) => s.bowlBoard);
  assert.equal(JSON.stringify(g), snapshot, 'compiling changed the game');

  first.bowlBoard.cells[0].value = 9999;
  first.bowlBoard.participants[0] = 'SCRIBBLED';
  assert.equal(second.bowlBoard.cells[0].value, 100);
  assert.equal(second.bowlBoard.participants[0], 'Red');
  assert.equal(JSON.stringify(g), snapshot, 'playing changed the game');

  const deck = SF.gameToRunDeck(g);
  assert.equal(deck.slides.some((s) => s.type === 'quiz'), false);
  assert.equal(deck.slides.some((s) => s.type === 'results'), false);
  assert.equal(deck.slides.some((s) => Array.isArray(s.options) && s.options.length), false);
  /* The old shape put a Correct/Wrong vote on the question itself. */
  assert.equal(g.questions[0].options, undefined);
  assert.equal(g.questions[0].correct, undefined);
});
