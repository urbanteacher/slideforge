'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');

/* The motion kit (tools/motion/examples/motion-kit.js) gives clips their timing.
   Every helper must be a pure function of t, because the renderer draws frames
   in any order. These pin the maths; tools/motion/render.mjs --check on
   kit-demo.html pins the drawing. */
const K = require('../tools/motion/examples/motion-kit.js');
const near = (a, b, e = 1e-6) => assert.ok(Math.abs(a - b) < e, `${a} is not ${b}`);

test('a spring starts at 0, ends at 1, and overshoots only below damping 1', () => {
  near(K.spring(0), 0);
  near(K.spring(6, 0.75, 1.6), 1, 1e-4);
  const peak = d => Math.max(...Array.from({ length: 400 }, (_, i) => K.spring(i / 100, d, 1.6)));
  assert.ok(peak(0.5) > 1.05);
  assert.ok(peak(1) <= 1);
});

test('track() follows each new target with no jump at the change', () => {
  const keys = [[0, 0], [1, 100], [1.5, 40]];
  near(K.track(0.5, keys), 0);
  near(K.track(8, keys), 40, 1e-3);
  /* At the moment of re-aiming, the value is where the first spring had got to. */
  const step = 1 / 240;
  assert.ok(Math.abs(K.track(1.5 + step, keys) - K.track(1.5 - step, keys)) < 2);
});

test('kick() rests at 0 before and long after its kick', () => {
  near(K.kick(0.9, 1), 0);
  near(K.kick(5, 1), 0, 1e-6);
  assert.ok(Math.abs(K.kick(1.1, 1)) > 0.1);
  near(K.kick(1.2, [1, 3]), K.kick(1.2, 1));
});

test('keys() eases numbers and arrays and holds at both ends', () => {
  const list = [[1, 0], [2, 10]];
  near(K.keys(0, list), 0); near(K.keys(3, list), 10); near(K.keys(1.5, list), 5);
  assert.deepEqual(K.keys(1.5, [[1, [0, 0]], [2, [10, 20]]]), [5, 10]);
});

test('path() passes through every point and is still at its ends', () => {
  const route = [[0, [0, 0]], [1, [100, 0]], [2, [100, 100]], [3, [0, 100]]];
  for (const [t, p] of route) assert.deepEqual(K.path(t, route).map(Math.round), p);
  const v = t => Math.hypot(...K.path(t + 1e-3, route).map((x, d) => x - K.path(t, route)[d]));
  assert.ok(v(0) < v(1.5) / 2);
});

test('exposure() holds drawings on twos, then on ones, then still', () => {
  const ex = [{ at: 0, on: 2 }, { at: 1, on: 1 }, { at: 2, hold: true }];
  near(K.exposure(1 / 24, ex, 24), 0);
  near(K.exposure(2 / 24, ex, 24), 2 / 24);
  near(K.exposure(1 + 1 / 24, ex, 24), 1 + 1 / 24);
  near(K.exposure(2.7, ex, 24), 2);
});

test('timeWarp() freezes story time and maps story cues back to real time', () => {
  const tw = K.timeWarp([[1, 0.25], [2, 0.5]]);
  near(tw.game(0.5), 0.5);
  near(tw.game(1.1), 1); assert.ok(tw.frozen(1.1));
  near(tw.game(1.5), 1.25);
  near(tw.game(3), 2.25);
  for (const g of [0.5, 1.5, 2.5]) near(tw.game(tw.real(g)), g);
});

test('shake() is zero outside its window and the same on every visit', () => {
  assert.deepEqual(K.shake(0.9, [[1, 10]]), [0, 0]);
  assert.deepEqual(K.shake(2, [[1, 10]]), [0, 0]);
  assert.deepEqual(K.shake(1.1, [[1, 10]]), K.shake(1.1, [[1, 10]]));
});

test('rng(), hash() and noise() are seeded: the same seed gives the same values', () => {
  const a = K.rng(7), b = K.rng(7);
  for (let i = 0; i < 5; i++) assert.equal(a(), b());
  assert.equal(K.hash(3), K.hash(3));
  for (let x = 0; x < 10; x += 0.37) assert.ok(Math.abs(K.noise(x)) <= 1);
});
