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

test('concept-chain maps to conceptchain and is special', () => {
  const SF = load();
  assert.equal(SF.formatStyle('concept-chain'), 'conceptchain');
  assert.ok(SF.isSpecialStyle('conceptchain'));
});

test('makeGame seeds four starts with 45s link timer', () => {
  const SF = load();
  const game = SF.makeGame('Chain', 'conceptchain');
  assert.equal(game.settings.defaultTime, 45);
  assert.equal(game.settings.defaultPoints, 1);
  assert.equal(game.questions.length, 4);
  assert.ok(game.questions.every((q) => String(q.term).trim()));
  assert.ok(game.questions.every((q) => String(q.prompt).trim()));
});

test('compile carries prompt, conceptChain flag, clamped timer', () => {
  const SF = load();
  const game = SF.makeGame('Chain', 'conceptchain');
  const slides = SF.compileGame(game, { intro: false, scoreSlide: false });
  const quizzes = slides.filter((s) => s.type === 'quiz');
  assert.equal(quizzes.length, 4);
  quizzes.forEach((s) => {
    assert.equal(s.style, 'conceptchain');
    assert.equal(s.conceptChain, true);
    assert.equal(s.judgeKind, 'accept');
    assert.equal(s.timeLimit, 45);
    assert.equal(s.options.length, 2);
    assert.equal(s.options[0], 'Accept');
    assert.equal(s.options[1], 'Reject');
    assert.ok(String(s.term).trim());
    assert.ok(String(s.prompt).trim());
  });
});

test('clampChainSeconds only allows 30/45/60/90', () => {
  const SF = load();
  assert.equal(SF.clampChainSeconds(45), 45);
  assert.equal(SF.clampChainSeconds(30), 30);
  assert.equal(SF.clampChainSeconds(12), 45);
  assert.equal(SF.clampChainSeconds(90), 90);
});

test('board readiness wants 3–10 starts', () => {
  const SF = load();
  const style = SF.gameStyle('conceptchain');
  assert.match(style.board({ questions: [{}, {}] }), /at least 3/);
  assert.equal(style.board({ questions: [{}, {}, {}] }), null);
  assert.equal(style.board({ questions: new Array(10).fill({}) }), null);
  assert.match(style.board({ questions: new Array(11).fill({}) }), /at most 10/);
});

test('problems require a starting term', () => {
  const SF = load();
  const style = SF.gameStyle('conceptchain');
  assert.match(style.problems({ term: '' }, 1), /starting term/);
  assert.equal(style.problems({ term: 'Cell', prompt: 'why' }, 1), null);
});

test('normalize heals definition into prompt', () => {
  const SF = load();
  const q = SF.normalizeQuestion({
    term: 'Osmosis',
    definition: 'Water across a membrane',
    question: 'Chain from: Osmosis'
  }, 'conceptchain');
  assert.equal(q.prompt, 'Water across a membrane');
  assert.equal(q.definition, undefined);
});
