'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('path');
const vm = require('node:vm');

function load() {
  const dir = path.resolve(__dirname, '..');
  const store = {};
  const localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  };
  const context = { window: {}, console, localStorage, Date };
  context.globalThis = context;
  vm.createContext(context);
  for (const f of ['js/model.js', 'js/slide-clip.js']) {
    vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), context);
  }
  return context.window.SF;
}

test('pack / unpack round-trips a slide', () => {
  const SF = load();
  const slide = SF.makeSlide('content');
  slide.title = 'Why pies lie';
  slide.bullets = ['Wrong question', 'Angles are hard'];
  const text = SF.SlideClip.pack(slide, null);
  const got = SF.SlideClip.unpack(text);
  assert.ok(got);
  assert.equal(got.slide.title, 'Why pies lie');
  assert.equal(got.slide.bullets.length, 2);
  assert.equal(got.game, null);
});

test('pack includes an embedded game for cross-browser paste', () => {
  const SF = load();
  const slide = SF.makeSlide('game');
  slide.gameId = 'g1';
  slide.title = 'Check-in';
  const game = SF.makeGame('Check-in', 'choice');
  game.id = 'g1';
  const text = SF.SlideClip.pack(slide, game);
  const got = SF.SlideClip.unpack(text);
  assert.ok(got.game);
  assert.equal(got.game.title, 'Check-in');
  assert.equal(got.slide.gameId, 'g1');
});

test('unpack ignores ordinary clipboard text', () => {
  const SF = load();
  assert.equal(SF.SlideClip.unpack('hello'), null);
  assert.equal(SF.SlideClip.unpack('{"format":"other","slide":{}}'), null);
  assert.equal(SF.SlideClip.unpack('{not json'), null);
});

test('stash survives in the same browser when the system clipboard is empty', () => {
  const SF = load();
  const slide = SF.makeSlide('title');
  slide.title = 'Lab 1';
  const text = SF.SlideClip.pack(slide, null);
  SF.SlideClip.stash(text);
  const got = SF.SlideClip.unpack(SF.SlideClip.recall());
  assert.ok(got);
  assert.equal(got.slide.title, 'Lab 1');
});
