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

test('odd-one-out maps to oddone and is special', () => {
  const SF = load();
  assert.equal(SF.formatStyle('odd-one-out'), 'oddone');
  assert.ok(SF.isSpecialStyle('oddone'));
});

test('makeGame seeds four discuss sets with scoreboard off', () => {
  const SF = load();
  const game = SF.makeGame('Odd ones', 'oddone');
  assert.equal(game.settings.scoreboard, false);
  assert.equal(game.settings.defaultPoints, 0);
  assert.equal(game.settings.defaultTime, 0);
  assert.equal(game.questions.length, 4);
  assert.ok(game.questions.every((q) => q.options.filter(Boolean).length === 4));
  assert.ok(game.questions.every((q) => String(q.explanation).trim()));
});

test('compile is discuss-only: idle contract flags, no points or timer', () => {
  const SF = load();
  const game = SF.makeGame('Odd ones', 'oddone');
  const original = JSON.stringify(game);
  const slides = SF.compileGame(game, { intro: false, scoreSlide: false });
  const quizzes = slides.filter((s) => s.type === 'quiz');
  assert.equal(quizzes.length, 4);
  quizzes.forEach((s) => {
    assert.equal(s.style, 'oddone');
    assert.equal(s.input, 'choice');
    assert.equal(s.points, 0);
    assert.equal(s.timeLimit, 0);
    assert.equal(s.voteOnly, true);
    assert.equal(s.oddoneDiscuss, true);
    assert.equal(s.hideAnswerUntilReveal, true);
    assert.equal(s.options.length, 4);
    assert.ok(s.correct >= 0 && s.correct < 4);
  });
  assert.equal(JSON.stringify(game), original);
});

test('old choice odd-one-out heals into oddone', () => {
  const SF = load();
  const healed = SF.normalizeGame({
    title: 'Old odd',
    format: 'odd-one-out',
    style: 'choice',
    settings: { scoreboard: true, defaultPoints: 1000 },
    questions: [{
      id: 'q1',
      question: 'Which is odd?',
      options: ['A', 'B', 'C', 'D'],
      correct: 2,
      explanation: 'C does not belong.'
    }]
  });
  assert.equal(healed.style, 'oddone');
  assert.equal(healed.questions[0].correct, 2);
  assert.equal(healed.questions[0].options[2], 'C');
});

test('board readiness wants 3–10 sets', () => {
  const SF = load();
  const style = SF.gameStyle('oddone');
  assert.match(style.board({ questions: [{}, {}] }), /at least 3/);
  assert.equal(style.board({ questions: [{}, {}, {}] }), null);
  assert.equal(style.board({ questions: new Array(10).fill({}) }), null);
  assert.match(style.board({ questions: new Array(11).fill({}) }), /at most 10/);
});

test('problems require four distinct items and an explanation', () => {
  const SF = load();
  const style = SF.gameStyle('oddone');
  assert.match(style.problems({ options: ['A', 'B', ''], correct: 0 }, 1), /four items/);
  assert.match(style.problems({
    options: ['A', 'A', 'B', 'C'], correct: 0, explanation: 'why'
  }, 1), /two items/);
  assert.match(style.problems({
    options: ['A', 'B', 'C', 'D'], correct: 0, explanation: ''
  }, 1), /explanation/);
  assert.equal(style.problems({
    options: ['A', 'B', 'C', 'D'], correct: 1, explanation: 'B is odd'
  }, 1), null);
});
