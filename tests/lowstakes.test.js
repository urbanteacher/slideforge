'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function load() {
  const dir = path.resolve(__dirname, '..');
  const ctx = { window: {}, console, setInterval, clearInterval, Date, Math };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  /* js/lowstakes.js moved into the boards engine; the bundle installs it. */
  for (const file of ['model']) {
    vm.runInContext(fs.readFileSync(path.join(dir, 'js/' + file + '.js'), 'utf8'), ctx);
  }
  const SF = ctx.window.SF;
  const stub = () => ({
    appendChild() {}, focus() {},
    classList: { toggle() {}, add() {}, remove() {} },
    setAttribute() {}, replaceChildren() {}, querySelector: () => null,
    dataset: {}, style: {}
  });
  SF.el = stub;
  return { SF, stub };
}

test('low-stakes maps from catalogue format and compiles a worksheet board', () => {
  const { SF } = load();
  assert.equal(SF.formatStyle('low-stakes-quiz'), 'lowstakes');
  assert.ok(SF.isSpecialStyle('lowstakes'));

  const game = SF.makeGame('Retrieval', 'lowstakes');
  const original = JSON.stringify(game);
  assert.equal(game.settings.defaultTime, 180);
  assert.equal(game.settings.scoreboard, false);
  assert.equal(game.questions.length, 5);

  const slides = SF.compileGame(game);
  const board = slides.find((s) => s.lowstakesBoard);
  assert.ok(board);
  assert.equal(board.type, 'content');
  assert.equal(board.lowstakesBoard.timeLimit, 180);
  assert.equal(board.lowstakesBoard.items.length, 5);
  assert.equal(slides.filter((s) => s.type === 'quiz' || s.type === 'results').length, 0);
  assert.equal(JSON.stringify(game), original);
});

test('incomplete questions compile as named gaps, never disappear', () => {
  const { SF } = load();
  const game = SF.makeGame('Gaps', 'lowstakes');
  game.questions = [
    SF.normalizeQuestion({ id: '1', question: 'Complete?', answer: 'Yes' }, 'lowstakes'),
    SF.normalizeQuestion({ id: '2', question: '', answer: 'Orphan answer' }, 'lowstakes'),
    SF.normalizeQuestion({ id: '3', question: 'Missing answer?', answer: '' }, 'lowstakes')
  ];
  const board = SF.compileGame(game).find((s) => s.lowstakesBoard).lowstakesBoard;
  assert.equal(board.items.length, 3);
  assert.equal(board.items[0].gap, null);
  assert.equal(board.items[1].gap, 'question');
  assert.equal(board.items[2].gap, 'answer');
  assert.equal(board.items[1].answer, 'Orphan answer');
  assert.equal(board.items[2].question, 'Missing answer?');
});

test('board readiness wants 3–10 questions', () => {
  const { SF } = load();
  const style = SF.gameStyle('lowstakes');
  assert.match(style.board({ questions: [{}, {}] }), /at least 3/);
  assert.equal(style.board({ questions: [{}, {}, {}] }), null);
  assert.equal(style.board({ questions: new Array(10).fill({}) }), null);
  assert.match(style.board({ questions: new Array(11).fill({}) }), /at most 10/);
});

test('low-stakes quiz clock, early reveal and restart', () => {
  const { SF } = load();
  const L = SF.LowStakes;
  const board = {
    kind: 'lowstakes',
    timeLimit: 120,
    items: [
      { id: 'a', question: 'Q1', answer: 'A1' },
      { id: 'b', question: 'Q2', answer: 'A2' }
    ]
  };
  let s = L.create(board);
  assert.equal(s.phase, 'ready');
  assert.equal(s.remaining, 120);

  s = L.transition(board, s, 'start');
  assert.equal(s.phase, 'quiz');
  s = L.transition(board, s, 'pause');
  assert.equal(s.paused, true);
  s = L.transition(board, s, 'pause');
  assert.equal(s.paused, false);
  s = L.transition(board, s, 'expire');
  assert.equal(s.phase, 'answers');
  assert.equal(s.remaining, 0);

  s = L.transition(board, s, 'finish');
  assert.equal(s.phase, 'complete');
  s = L.transition(board, s, 'restart');
  assert.equal(s.phase, 'ready');
  assert.equal(s.remaining, 120);

  const early = L.transition(board, L.transition(board, L.create(board), 'start'), 'reveal');
  assert.equal(early.phase, 'answers');
});

test('low-stakes transitions do not mutate prior state', () => {
  const L = load().SF.LowStakes;
  const board = { timeLimit: 180, items: [{ question: 'Q', answer: 'A' }] };
  const before = L.transition(board, L.create(board), 'start');
  const snap = JSON.stringify(before);
  L.transition(board, before, 'reveal');
  assert.equal(JSON.stringify(before), snap);
});

test('early reveal and expire report ready count, skipping gaps', (t) => {
  const { SF, stub } = load();
  const board = {
    kind: 'lowstakes',
    timeLimit: 120,
    items: [
      { id: 'a', question: 'Q1', answer: 'A1' },
      { id: 'b', question: '', answer: 'A2', gap: 'question' },
      { id: 'c', question: 'Q3', answer: 'A3' }
    ]
  };
  const slide = { id: 'ls-1', title: 'Retrieval', lowstakesBoard: board };
  const player = { lowstakesStates: {} };
  const sent = [];
  SF.LowStakes.onReveal = (v) => sent.push(v);
  const pad = stub();
  SF.LowStakes.mount(player, slide, { querySelector: () => pad, contains: () => false });
  t.after(() => SF.LowStakes.unmount());

  SF.LowStakes.command('start');
  player.lowstakesStates[slide.id].remaining = 40;
  SF.LowStakes.command('reveal');
  assert.equal(sent.length, 1);
  assert.equal(sent[0].count, 2);
  assert.equal(sent[0].early, true);
  assert.equal(sent[0].slideId, 'ls-1');

  SF.LowStakes.command('restart');
  SF.LowStakes.command('start');
  SF.LowStakes.command('expire');
  assert.equal(sent.length, 2);
  assert.equal(sent[1].early, false);
  assert.equal(sent[1].count, 2);
  SF.LowStakes.unmount();
});

test('old choice-shaped low-stakes format remaps to retrieval answers', () => {
  const { SF } = load();
  const healed = SF.normalizeGame({
    title: 'Old LSQ',
    format: 'low-stakes-quiz',
    style: 'choice',
    settings: { scoreboard: false, defaultTime: 0 },
    questions: [{
      id: 'q1',
      question: 'What is osmosis?',
      options: ['A', 'B', 'C'],
      correct: 1,
      explanation: 'Water across a membrane'
    }]
  });
  assert.equal(healed.style, 'lowstakes');
  assert.equal(healed.questions[0].answer, 'Water across a membrane');
  assert.ok(!healed.questions[0].options);
});
