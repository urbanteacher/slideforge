'use strict';
/* Where Present starts.
 *
 * The editor used to count its way to the selected slide, and the count did
 * not know that buildRunDeck leaves hidden slides out. A hidden slide above
 * the selection started the show one slide late; a hidden game started it a
 * whole game late. The index is now looked up in the run deck by id.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');

function load() {
  const data = {};
  const c = { window: {}, console,
    localStorage: { getItem: k => data[k] || null, setItem: (k, v) => data[k] = String(v), removeItem: k => delete data[k] } };
  vm.createContext(c);
  vm.runInContext(fs.readFileSync(path.join(root, 'js', 'model.js'), 'utf8'), c);
  return c.window.SF;
}

function twoQuestionGame(SF) {
  const game = SF.normalizeGame(SF.makeGame('Quiz', 'choice'));
  game.questions = [
    Object.assign(SF.makeQuestion('choice'), { question: 'One?', options: ['a', 'b'], correct: 0 }),
    Object.assign(SF.makeQuestion('choice'), { question: 'Two?', options: ['a', 'b'], correct: 1 })
  ];
  SF.GameStore.save(game);
  return game;
}

function slide(SF, title, extra) {
  return Object.assign(SF.makeSlide('title'), { title: title }, extra || {});
}

test('a hidden slide above the selection does not push the start along', () => {
  const SF = load();
  const deck = SF.makeDeck();
  deck.slides = [slide(SF, 'A'), slide(SF, 'B', { hidden: true }), slide(SF, 'C'), slide(SF, 'D')];
  const run = SF.buildRunDeck(deck, () => null);
  const at = SF.runIndexOf(deck, run, 3);
  assert.equal(run.slides[at].title, 'D');
});

test('a game above the selection counts as every step it expands into', () => {
  const SF = load();
  const game = twoQuestionGame(SF);
  const deck = SF.makeDeck();
  const g = Object.assign(SF.makeSlide('game'), { gameId: game.id });
  deck.slides = [slide(SF, 'A'), g, slide(SF, 'After')];
  const run = SF.buildRunDeck(deck, id => SF.GameStore.get(id));
  assert.ok(run.slides.length > 3, 'the game expanded');
  assert.equal(run.slides[SF.runIndexOf(deck, run, 2)].title, 'After');
  /* Selecting the game itself starts on its first step. */
  assert.equal(run.slides[SF.runIndexOf(deck, run, 1)].sourceSlideId, g.id);
});

test('a hidden game above the selection is skipped entirely', () => {
  const SF = load();
  const game = twoQuestionGame(SF);
  const deck = SF.makeDeck();
  const g = Object.assign(SF.makeSlide('game'), { gameId: game.id, hidden: true });
  deck.slides = [slide(SF, 'A'), g, slide(SF, 'After')];
  const run = SF.buildRunDeck(deck, id => SF.GameStore.get(id));
  assert.equal(run.slides[SF.runIndexOf(deck, run, 2)].title, 'After');
});

test('a hidden selection starts at the next slide the room sees, else the last one before it', () => {
  const SF = load();
  const deck = SF.makeDeck();
  deck.slides = [slide(SF, 'A'), slide(SF, 'B', { hidden: true }), slide(SF, 'C'), slide(SF, 'D', { hidden: true })];
  const run = SF.buildRunDeck(deck, () => null);
  assert.equal(run.slides[SF.runIndexOf(deck, run, 1)].title, 'C');
  assert.equal(run.slides[SF.runIndexOf(deck, run, 3)].title, 'C');
});

/* Answers, reveals and live results are keyed by slide id, and the same game
   embedded twice compiled to the same ids — so its second round arrived
   already answered and already revealed. */
test('the same game embedded twice gets its own slide ids the second time', () => {
  const SF = load();
  const game = twoQuestionGame(SF);
  const deck = SF.makeDeck();
  const first = Object.assign(SF.makeSlide('game'), { gameId: game.id });
  const second = Object.assign(SF.makeSlide('game'), { gameId: game.id });
  deck.slides = [first, slide(SF, 'Between'), second];
  const run = SF.buildRunDeck(deck, id => SF.GameStore.get(id));
  const ids = run.slides.map(s => s.id);
  assert.equal(new Set(ids).size, ids.length, 'no slide id appears twice');
  /* The ids derived from the game — questions, explanations, scores — are
     the stable ones; the intro gets a fresh id on every compile anyway. */
  const stable = list => list.map(s => s.id).filter(id => id.indexOf(game.id + ':') === 0);
  const alone = SF.buildRunDeck(Object.assign(SF.makeDeck(), { slides: [first] }), id => SF.GameStore.get(id));
  assert.deepEqual(stable(run.slides.filter(s => s.sourceSlideId === first.id)), stable(alone.slides),
    'the first appearance keeps its stable ids');
  assert.equal(run.slides[SF.runIndexOf(deck, run, 2)].sourceSlideId, second.id, 'Present from the second finds it');
});
