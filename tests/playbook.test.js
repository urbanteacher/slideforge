'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function load() {
  const ctx = { window: {}, console };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/model.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/playbook.js'), 'utf8'), ctx);
  return ctx.window.SF;
}

const CATALOGUE_CHECKS = [
  'true-false', 'low-stakes-quiz', 'quiz-bowl', 'beat-the-clock', 'boss-battle',
  'horse-race', 'memory-flip', 'memory-match', 'bingo', 'knowledge-flip',
  'definition-challenge', 'emoji-guess', 'word-reveal', 'fill-in-the-blanks',
  'heads-up', 'spin-explain', 'spot-the-error', 'ranking', 'odd-one-out',
  'compare-contrast', 'predict-outcome', 'time-traveler', 'connection-maker',
  'question-cube', 'random-challenge', 'concept-chain',
  'choice', 'type', 'slider', 'order', 'truefalse'
];

const FEEDBACK = ['poll', 'wordcloud', 'brainstorm', 'scale'];

function assertEntry(e, label) {
  assert.ok(e, label);
  assert.ok(e.howToPlay && e.howToPlay.length >= 2, label + ' how to play');
  assert.ok(e.demo, label + ' demo kind');
  assert.ok(e.aim, label + ' aim');
}

test('playbook covers the audit formats plus core engines', () => {
  const SF = load();
  CATALOGUE_CHECKS.forEach((k) => assertEntry(SF.Playbook.forKey(k), k));
});

test('playbook covers audience feedback kinds', () => {
  const SF = load();
  FEEDBACK.forEach((k) => assertEntry(SF.Playbook.forKey(k), k));
});

test('every GAME_STYLES engine resolves How to play (including New game with no format)', () => {
  const SF = load();
  Object.keys(SF.GAME_STYLES).forEach((style) => {
    const e = SF.Playbook.forGame({ style: style, format: '' });
    assertEntry(e, 'style:' + style);
    assert.notEqual(e.title, undefined);
  });
});

test('unknown games still get a default How to play (never empty)', () => {
  const SF = load();
  const e = SF.Playbook.forGame({ style: 'not-a-real-engine', format: '' });
  assertEntry(e, 'default');
  assert.equal(e.title, 'This check');
});

test('demo kind routes boards vs class vs judge vs discuss', () => {
  const SF = load();
  assert.equal(SF.Playbook.demoKind({ format: 'knowledge-flip', style: 'knowledgeflip' }), 'board');
  assert.equal(SF.Playbook.demoKind({ format: 'low-stakes-quiz', style: 'lowstakes' }), 'paper');
  assert.equal(SF.Playbook.demoKind({ format: 'beat-the-clock', style: 'speed' }), 'class');
  assert.equal(SF.Playbook.demoKind({ format: 'spin-explain', style: 'spinexplain' }), 'judge');
  assert.equal(SF.Playbook.demoKind({ format: 'odd-one-out', style: 'choice' }), 'discuss');
  assert.equal(SF.Playbook.demoKind({ format: 'odd-one-out', style: 'oddone' }), 'discuss');
  assert.equal(SF.Playbook.demoKind({ style: 'oddone' }), 'discuss');
  assert.equal(SF.Playbook.demoKind({ format: 'compare-contrast', style: 'choice' }), 'discuss');
  assert.equal(SF.Playbook.demoKind({ format: 'compare-contrast', style: 'compare' }), 'discuss');
  assert.equal(SF.Playbook.demoKind({ style: 'compare' }), 'discuss');
});
