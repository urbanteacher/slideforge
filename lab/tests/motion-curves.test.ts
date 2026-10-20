// Motion curves (engine/curves.ts), from the motion studio's numbers (~/Desktop/App /animations, 03-motion-numbers.md):
// springs named by damping ratio and closed-form, so any moment draws on its own; opacity never bounces; exits ease in
// and take half the entrance; "Overlapping previous" starts while the last move settles; ambient loops grow in once
// the entrance has landed and breathing keeps text readable. Reduced motion turns every exit into a fade and stills loops.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../src/kinds';
import type { Anim, Easing, EntranceType, ExitType, Layer } from '../src/core';
import { createLayer, createSlide } from '../src/core';
import { EASE, MOTION, SPRING_ZETA, exitDuration, kick, schedule, spring } from '../src/engine';
import { layerState } from '../src/engine/anim';

const shape = (anim: Partial<Anim> = {}): Layer => {
  const l = createLayer('shape', { params: { shape: 'rect' }, box: { x: 100, y: 100, w: 300, h: 200 } });
  l.anim = { ...l.anim, type: 'fade', duration: 0.8, ...anim };
  return l;
};
const range = (n: number) => Array.from({ length: n + 1 }, (_, i) => i / n);
const peak = (f: (u: number) => number) => Math.max(...range(400).map(f));

test('the closed-form spring is the damped oscillator its ζ names', () => {
  // Integrate x'' = −w²(x − 1) − 2ζw·x' from rest and compare at sample times.
  for (const [zeta, hz] of [[0.35, 2], [0.7, 2], [1, 1.5]]) {
    const w = 2 * Math.PI * hz, dt = 1e-5;
    let x = 0, v = 0, t = 0;
    for (const at of [0.1, 0.25, 0.5, 1]) {
      while (t < at - dt / 2) { const acc = -w * w * (x - 1) - 2 * zeta * w * v; v += acc * dt; x += v * dt; t += dt; }
      assert.ok(Math.abs(spring(at, zeta, hz) - x) < 2e-3, `ζ ${zeta} at ${at}s: ${spring(at, zeta, hz)} vs ${x}`);
    }
  }
  assert.equal(spring(0), 0);
  assert.equal(kick(0), 0);
  assert.ok(Math.abs(kick(3)) < 1e-3, 'a kick dies away');
});

test('named springs start at rest, settle by the end, and bounce in the order their names say', () => {
  const names = Object.keys(SPRING_ZETA) as (keyof typeof SPRING_ZETA)[];
  for (const n of names) {
    const f = EASE[n];
    assert.equal(f(0), 0, n);
    assert.equal(f(1), 1, n);
    assert.ok(Math.abs(f(0.999) - 1) < 0.01, `${n} has settled before it is done: no jump at the end`);
    assert.ok(f(0.005) < 0.01 && f(0.005) < 0.5 * f(0.01), `${n} starts from rest: it accelerates away, it is not thrown`);
  }
  const over = (n: keyof typeof SPRING_ZETA) => peak(EASE[n]) - 1;
  assert.ok(over('springPremium') < 0.03, `premium barely settles past (${over('springPremium')})`);
  assert.ok(over('springPremium') < over('springPlayful') && over('springPlayful') < over('springBouncy'), 'bouncier names overshoot more');
});

test('every curve runs 0 → 1, and the move tokens name real curves', () => {
  for (const [name, f] of Object.entries(EASE)) {
    assert.ok(Math.abs(f(0)) < 1e-9, `${name}(0)`);
    assert.ok(Math.abs(f(1) - 1) < 1e-6, `${name}(1)`);
  }
  for (const k of ['enter', 'move', 'exit', 'pop'] as const) assert.ok(EASE[MOTION[k] as Easing], k);
  // An exit is an ease-in: it holds, then goes. A move is symmetric.
  assert.ok(EASE[MOTION.exit](0.5) < 0.3, 'exits hold first');
  assert.ok(Math.abs(EASE[MOTION.move](0.5) - 0.5) < 0.01, 'moves are symmetric');
});

test('opacity never bounces, whatever the movement does, and blur never goes below nothing', () => {
  const types: EntranceType[] = ['fade', 'rise', 'drop', 'slideLeft', 'slideRight', 'zoomIn', 'zoomOut', 'pop', 'blur', 'spin'];
  const easings: Easing[] = ['springBouncy', 'springPlayful', 'springPremium', 'spring', 'backOut'];
  for (const type of types) for (const easing of easings) {
    const l = shape({ type, easing });
    let last = -1;
    for (let t = 0; t <= 1.2; t += 0.01) {
      const st = layerState(l, 0, t, t);
      assert.ok(st.opacity >= 0 && st.opacity <= 1, `${type}/${easing} opacity ${st.opacity} at ${t}`);
      assert.ok(st.opacity >= last - 1e-9, `${type}/${easing} opacity falls back at ${t.toFixed(2)}`);
      assert.ok(st.blur >= 0, `${type}/${easing} blur ${st.blur}`);
      last = st.opacity;
    }
  }
});

test('an exit takes half the entrance on an ease-in, then the layer is gone', () => {
  const l = shape({ duration: 0.8, exit: { type: 'sink', when: 'after', delay: 2 } });
  assert.equal(exitDuration(l), 0.4);
  const sch = schedule(createSlide('S', [l]), []);
  const at = sch.exit.get(l.id)!;
  assert.equal(at, 0.8 + 2, 'it leaves once it has been up for its delay');
  const half = layerState(l, 0, at + 0.2, 0, false, at);
  assert.ok(half.opacity > 0.5, `an ease-in keeps it there half way through (${half.opacity})`);
  assert.ok(half.dy > 0 && half.dy < 40, 'and it has only begun to sink');
  const after = layerState(l, 0, at + 0.41, 0, false, at);
  assert.equal(after.visible, false);
  assert.equal(layerState(l, 0, at - 0.01, 0, false, at).opacity, 1, 'untouched before it leaves');
  // Its own duration wins, and never below the floor.
  assert.equal(exitDuration(shape({ duration: 0.8, exit: { type: 'fade', when: 'after', delay: 0, duration: 1.1 } })), 1.1);
  assert.equal(exitDuration(shape({ duration: 0.1, exit: { type: 'fade', when: 'after', delay: 0 } })), MOTION.exitMin);
});

test('"with the next click" leaves as the next build step arrives, and makes that step long enough to watch it go', () => {
  const a = shape({ exit: { type: 'lift', when: 'next', delay: 0 } });
  const b = shape({ trigger: 'onClick', duration: 0.1 });
  const sch = schedule(createSlide('S', [a, b]), [3]);
  assert.equal(sch.exit.get(a.id), 3, 'it goes on the click that brings the next step');
  assert.ok(sch.stepEnds[1] >= exitDuration(a), 'auto-play waits for the exit');
  assert.equal(schedule(createSlide('S', [a, b]), []).exit.get(a.id), Infinity, 'before the click it waits');
  assert.equal(schedule(createSlide('S', [a]), []).exit.has(a.id), false, 'with no step after it, it stays');
});

test('reduced motion: every exit is a fade, in place', () => {
  for (const type of ['sink', 'lift', 'slideLeft', 'slideRight', 'shrink', 'blur'] as ExitType[]) {
    const l = shape({ exit: { type, when: 'after', delay: 0 } });
    const st = layerState(l, 0, 0.8 + 0.2, 0, true, 0.8);
    assert.equal(st.dx, 0, type); assert.equal(st.dy, 0, type); assert.equal(st.scale, 1, type); assert.equal(st.blur, 0, type);
    assert.ok(st.opacity < 1 && st.opacity > 0, `${type} fades`);
  }
});

test('"Overlapping previous" starts while the previous move settles, not after it', () => {
  const a = shape({ duration: 1 });
  const b = shape({ trigger: 'overlapPrev', duration: 0.6 });
  const c = shape({ trigger: 'afterPrev' });
  const sch = schedule(createSlide('S', [a, b, c]), []);
  assert.equal(sch.start.get(b.id), MOTION.overlapAt * 1);
  assert.ok(Math.abs(sch.start.get(c.id)! - (0.6 + 0.6)) < 1e-9, 'and the next one chains from its end');
  // Overlapping a layer still waiting for its click waits with it.
  const d = shape({ trigger: 'onClick' }), e = shape({ trigger: 'overlapPrev' });
  assert.equal(schedule(createSlide('S', [d, e]), []).start.get(e.id), Infinity);
});

test('ambient loops grow in once the entrance has landed; breathing keeps text readable; reduced motion is still', () => {
  const l = shape({ duration: 0.8, loop: 'float', loopSpeed: 1, loopAmount: 1 });
  const at = (t: number, time = 1.234) => layerState(l, 0, t, time).dy;
  assert.equal(at(0.8), 0, 'no swing the moment it lands');
  assert.ok(Math.abs(at(0.8 + MOTION.loopRamp + 0.1)) > 1, 'full swing once it has grown in');
  assert.ok(Math.abs(at(0.8 + 0.2)) < Math.abs(at(0.8 + MOTION.loopRamp + 0.1)), 'growing');
  for (const amount of [1, 2, 4]) {
    const b = shape({ type: 'none', loop: 'breathe', loopSpeed: 1, loopAmount: amount });
    const low = Math.min(...range(200).map((u) => layerState(b, undefined, Infinity, u * 10).opacity));
    assert.ok(low >= 0.55 - 1e-9, `breathe at amount ${amount} dips only to ${low}`);
  }
  const r = layerState(shape({ loop: 'sway', loopAmount: 2 }), 0, 5, 5, true);
  assert.equal(r.rot, 0);
});
