'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('path');
const vm = require('node:vm');

function load(store = {}) {
  const dir = path.resolve(__dirname, '..');
  const localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  };
  const session = {};
  const sessionStorage = {
    getItem: (k) => (k in session ? session[k] : null),
    setItem: (k, v) => { session[k] = String(v); },
    removeItem: (k) => { delete session[k]; }
  };
  const context = { window: {}, console, localStorage, sessionStorage, Date };
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

/* A copied slide holding a screenshot is megabytes. It used to sit in
   localStorage for good, in the same quota every saved lesson needs. */
test('a large copied slide stays out of the storage lessons are saved in', () => {
  const store = {};
  const SF = load(store);
  const small = SF.SlideClip.pack(Object.assign(SF.makeSlide('content'), { title: 'Small' }), null);
  SF.SlideClip.stash(small);
  assert.equal(store[SF.SlideClip.KEY], small, 'a small copy is shared, so another tab can paste it');
  const big = SF.makeSlide('image');
  big.image = 'data:image/png;base64,' + 'A'.repeat(300 * 1024);
  const text = SF.SlideClip.pack(big, null);
  SF.SlideClip.stash(text);
  assert.equal(SF.SlideClip.KEY in store, false, 'a large copy is not written to localStorage');
  assert.equal(SF.SlideClip.recall(), text, 'this tab can still paste it');
});

test('an oversized copy left by an older version is given back on load', () => {
  const store = { 'slideforge.slideClip.v1': 'x'.repeat(200 * 1024) };
  load(store);
  assert.equal('slideforge.slideClip.v1' in store, false);
});
