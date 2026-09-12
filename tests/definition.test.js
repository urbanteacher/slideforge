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

test('definition-challenge maps to its own style and is special', () => {
  const SF = load();
  assert.equal(SF.formatStyle('definition-challenge'), 'definition');
  assert.ok(SF.isSpecialStyle('definition'));
});

test('makeGame seeds three playable challenges with 30s default', () => {
  const SF = load();
  const game = SF.makeGame('Recall', 'definition');
  assert.equal(game.settings.defaultTime, 30);
  assert.equal(game.settings.defaultPoints, 1);
  assert.equal(game.questions.length, 3);
  assert.ok(game.questions.every((q) => String(q.passage).trim()));
  assert.ok(game.questions.every((q) => String(q.question).trim()));
  assert.ok(game.questions.every((q) => q.accept.some((a) => String(a).trim())));
});

test('compile emits typed quiz slides with passage and hide-until-reveal', () => {
  const SF = load();
  const game = SF.makeGame('Recall', 'definition');
  const original = JSON.stringify(game);
  const slides = SF.compileGame(game, { intro: false, scoreSlide: false });
  const quizzes = slides.filter((s) => s.type === 'quiz');
  assert.equal(quizzes.length, 3);
  quizzes.forEach((s) => {
    assert.equal(s.style, 'definition');
    assert.equal(s.input, 'text');
    assert.equal(s.timeLimit, 30);
    assert.equal(s.hideAnswerUntilReveal, true);
    assert.ok(String(s.passage).trim());
    assert.ok(String(s.question).trim());
    assert.equal(s.headPrompt, s.question);
  });
  assert.equal(JSON.stringify(game), original);
});

test('mashed question text heals into passage + recall', () => {
  const SF = load();
  const healed = SF.normalizeGame({
    title: 'Old definition',
    format: 'definition-challenge',
    style: 'type',
    settings: { defaultTime: 30 },
    questions: [{
      id: 'q1',
      question: 'Read this, then answer without looking back.\n\n"A catalyst speeds up a reaction."\n\nWhat speeds up a reaction?',
      accept: ['a catalyst', 'catalyst']
    }]
  });
  assert.equal(healed.style, 'definition');
  assert.match(healed.questions[0].passage, /catalyst/i);
  assert.match(healed.questions[0].question, /speeds up/i);
  assert.ok(!healed.questions[0].passage.includes('Read this'));
});

test('board readiness wants 3–20 challenges', () => {
  const SF = load();
  const style = SF.gameStyle('definition');
  assert.match(style.board({ questions: [{}, {}] }), /at least 3/);
  assert.equal(style.board({ questions: [{}, {}, {}] }), null);
  assert.equal(style.board({ questions: new Array(20).fill({}) }), null);
  assert.match(style.board({ questions: new Array(21).fill({}) }), /at most 20/);
});

test('timer clamps to 20/30/45/60', () => {
  const SF = load();
  assert.equal(SF.clampDefinitionSeconds(30), 30);
  assert.equal(SF.clampDefinitionSeconds(45), 45);
  assert.equal(SF.clampDefinitionSeconds(99), 30);
  assert.equal(SF.clampDefinitionSeconds(0), 30);
});

test('reading→ask transition does not mutate prior state', () => {
  const SF = load();
  const before = SF.definitionCreate(45);
  assert.equal(before.phase, 'reading');
  assert.equal(before.seconds, 45);
  const snap = JSON.stringify(before);
  const after = SF.definitionTransition(before, 'ask');
  assert.equal(after.phase, 'asking');
  assert.equal(JSON.stringify(before), snap);
  assert.equal(SF.definitionTransition(after, 'ask').phase, 'asking');
  assert.equal(SF.definitionTransition(before, 'expire').phase, 'asking');
  assert.equal(SF.definitionTransition(after, 'restart').phase, 'reading');
});

test('typed mark still scores the recall answer', () => {
  const SF = load();
  const game = SF.makeGame('Recall', 'definition');
  const slide = SF.compileGame(game, { intro: false, scoreSlide: false })
    .find((s) => s.type === 'quiz');
  assert.equal(SF.markResponse(slide, 'catalyst'), true);
  assert.equal(SF.markResponse(slide, 'the catalyst'), true);
  assert.equal(SF.markResponse(slide, 'enzyme'), false);
});
