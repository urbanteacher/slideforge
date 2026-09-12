'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function load() {
  const ctx = { window: {}, console };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, '../js/model.js'), 'utf8'),
    ctx
  );
  return ctx.window.SF;
}

test('compare-contrast maps to compare and is special', () => {
  const SF = load();
  assert.equal(SF.formatStyle('compare-contrast'), 'compare');
  assert.ok(SF.isSpecialStyle('compare'));
});

test('makeGame seeds four discuss pairs with scoreboard off', () => {
  const SF = load();
  const game = SF.makeGame('Compare', 'compare');
  assert.equal(game.settings.scoreboard, false);
  assert.equal(game.settings.defaultPoints, 0);
  assert.equal(game.settings.defaultTime, 0);
  assert.equal(game.questions.length, 4);
  assert.ok(game.questions.every((q) => String(q.itemA).trim() && String(q.itemB).trim()));
  assert.ok(game.questions.every((q) => String(q.similarities).trim() && String(q.differences).trim()));
});

test('compile is discuss-only: idle contract flags, no points or timer', () => {
  const SF = load();
  const game = SF.makeGame('Compare', 'compare');
  const original = JSON.stringify(game);
  const slides = SF.compileGame(game, { intro: false, scoreSlide: false });
  const quizzes = slides.filter((s) => s.type === 'quiz');
  assert.equal(quizzes.length, 4);
  quizzes.forEach((s) => {
    assert.equal(s.style, 'compare');
    assert.equal(s.points, 0);
    assert.equal(s.timeLimit, 0);
    assert.equal(s.voteOnly, true);
    assert.equal(s.compareDiscuss, true);
    assert.equal(s.hideAnswerUntilReveal, true);
    assert.ok(String(s.itemA).trim());
    assert.ok(String(s.itemB).trim());
    assert.ok(String(s.similarities).trim());
    assert.ok(String(s.differences).trim());
    assert.ok(Array.isArray(s.options));
    assert.equal(s.options.length, 0);
  });
  assert.equal(JSON.stringify(game), original);
});

test('old choice compare-contrast heals into compare', () => {
  const SF = load();
  const healed = SF.normalizeGame({
    title: 'Old compare',
    format: 'compare-contrast',
    style: 'choice',
    settings: { scoreboard: true, defaultPoints: 1000 },
    questions: [{
      id: 'q1',
      question: 'Compare A and B',
      options: ['Photosynthesis', 'Respiration', 'Other', 'Other2'],
      correct: 0,
      explanation: 'Both deal with energy.'
    }]
  });
  assert.equal(healed.style, 'compare');
  assert.equal(healed.questions[0].itemA, 'Photosynthesis');
  assert.equal(healed.questions[0].itemB, 'Respiration');
  assert.match(healed.questions[0].similarities, /energy/);
});

test('board readiness wants 3–10 comparisons', () => {
  const SF = load();
  const style = SF.gameStyle('compare');
  assert.match(style.board({ questions: [{}, {}] }), /at least 3/);
  assert.equal(style.board({ questions: [{}, {}, {}] }), null);
  assert.equal(style.board({ questions: new Array(10).fill({}) }), null);
  assert.match(style.board({ questions: new Array(11).fill({}) }), /at most 10/);
});

test('problems require two items and alike/differ text', () => {
  const SF = load();
  const style = SF.gameStyle('compare');
  assert.match(style.problems({ itemA: 'A', itemB: '', similarities: 'x', differences: 'y' }, 1), /Item A and Item B/);
  assert.match(style.problems({
    itemA: 'Same', itemB: 'same', similarities: 'x', differences: 'y'
  }, 1), /two different/);
  assert.match(style.problems({
    itemA: 'A', itemB: 'B', similarities: '', differences: 'y'
  }, 1), /similarities/);
  assert.match(style.problems({
    itemA: 'A', itemB: 'B', similarities: 'x', differences: ''
  }, 1), /differences/);
  assert.equal(style.problems({
    itemA: 'A', itemB: 'B', similarities: 'alike', differences: 'differ'
  }, 1), null);
});
