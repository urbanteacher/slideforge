'use strict';
/* The command palette's ranking. The palette owns no actions — every command
   is a button or an editor function — so what is left to get wrong is which
   one comes first for what somebody types. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function load() {
  const context = { window: {}, console };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'palette.js'), 'utf8'), context);
  return context.window.SF.Palette;
}

const commands = [
  { id: 'a', label: 'Add a game or activity…', words: 'quiz poll' },
  { id: 'd', label: 'Duplicate this slide', words: 'copy clone' },
  { id: 'p', label: 'Present from this slide', words: 'slideshow projector' },
  { id: 'r', label: 'Rehearse with a sample class', words: 'practice' },
  { id: 'x', label: 'Export a file you can keep', words: 'download backup' },
  { id: 'h', label: 'Hide this slide from the show', words: 'skip' }
];
const first = (P, q) => (P.rank(q, commands)[0] || {}).id;

test('a word start beats the same letters inside a word', () => {
  const P = load();
  assert.equal(first(P, 'dup'), 'd');
  assert.equal(first(P, 'pres'), 'p');
  assert.equal(first(P, 'hide'), 'h');
});

test('initials of the words find a command', () => {
  const P = load();
  assert.equal(first(P, 'rsc'), 'r', 'Rehearse with a Sample Class');
});

test('the words behind a label count, below the label itself', () => {
  const P = load();
  assert.equal(first(P, 'download'), 'x');
  assert.equal(first(P, 'quiz'), 'a');
  assert.equal(first(P, 'slideshow'), 'p');
});

test('nothing that lacks a letter is offered, and an empty query lists everything in order', () => {
  const P = load();
  assert.deepEqual(P.rank('zzq', commands), []);
  assert.deepEqual(P.rank('', commands).map(c => c.id), commands.map(c => c.id));
});
