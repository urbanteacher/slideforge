// Slide transitions (engine/transitions.ts): the moves are motion-blurred over a 180° shutter, as the motion
// studio blurs its frames (~/Desktop/App /animations, lib/js/motion.js), sharp at rest and widest mid-move; the
// edges that glow take the incoming slide's accent through the resolver layouts/ registers; every type has its
// own shader branch. The shader itself is checked in a browser; reduced motion is the renderer's crossfade.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../src/kinds';
import { createSlide } from '../src/core';
import type { TransitionType } from '../src/core';
import { BLURRED, DEFAULT_EDGE, EASE, MOTION, setEdgeResolver, transitionEdge, transitionSpread } from '../src/engine';
import { TRANSITION_FRAG, TRANSITION_INDEX } from '../src/engine/transitions';
import { LAYOUT_STYLES, slideStyle } from '../src/layouts';

const move = EASE[MOTION.move];

test('motion blur is sharp at rest, widest mid-move, and narrower on a slower transition', () => {
  // Under 1e-4 of the move is under a fifth of a pixel across 1920: sharp.
  assert.ok(transitionSpread(move, 0, 0.9) < 1e-4, 'at rest when it starts');
  assert.ok(transitionSpread(move, 1, 0.9) < 1e-4, 'and when it lands');
  const mid = transitionSpread(move, 0.5, 0.9), early = transitionSpread(move, 0.1, 0.9);
  assert.ok(mid > early && early >= 0, `mid ${mid} > early ${early}`);
  assert.ok(transitionSpread(move, 0.5, 1.8) < mid, 'a slower move blurs less');
  // Half a frame of travel at 60 fps: about 1/120 of the move at constant speed, more at the quart's peak.
  assert.ok(mid > 1 / (120 * 0.9) && mid < 0.05, `span ${mid}`);
  assert.equal(transitionSpread(move, 0.5, 0), 0, 'no duration, no blur');
  assert.deepEqual([...BLURRED].sort(), ['camera', 'push', 'zoom']);
});

test('every transition has its own branch in the shader, Morph excepted (it is drawn as layers over a crossfade)', () => {
  const types = Object.keys(TRANSITION_INDEX) as TransitionType[];
  for (const t of ['iris', 'shape', 'camera'] as TransitionType[]) assert.ok(types.includes(t), t);
  const idx = types.filter((t) => t !== 'morph').map((t) => TRANSITION_INDEX[t]);
  assert.equal(new Set(idx).size, idx.length, 'no two types share a branch');
  for (const i of idx) if (i > 1) assert.ok(TRANSITION_FRAG.includes(`uType == ${i}`), `branch ${i}`);
  const open = (TRANSITION_FRAG.match(/{/g) ?? []).length, close = (TRANSITION_FRAG.match(/}/g) ?? []).length;
  assert.equal(open, close, 'balanced braces');
  for (const u of ['uSpread', 'uEdge', 'uGap', 'uCenter']) assert.ok(TRANSITION_FRAG.includes(`uniform`) && TRANSITION_FRAG.includes(u), u);
  assert.ok(!/1\.0, 0\.45, 0\.2/.test(TRANSITION_FRAG), 'the burn edge is no longer a fixed orange');
});

test('edges take the incoming slide’s accent: the theme’s, or its ground’s', () => {
  const st = LAYOUT_STYLES[0];
  assert.equal(transitionEdge({ theme: st.id }, createSlide('S')), st.accent);
  const grounded = LAYOUT_STYLES.find((x) => x.grounds?.length);
  if (grounded) {
    const g = grounded.grounds![0];
    const s = { ...createSlide('S'), ground: g.id };
    assert.equal(transitionEdge({ theme: grounded.id }, s), slideStyle(grounded, s).accent, 'a slide on another ground uses that ground’s accent');
  }
  assert.equal(transitionEdge({ theme: 'no-such-theme' }, createSlide('S')), DEFAULT_EDGE, 'no theme: the original edge');
});

test('without a resolver, or with something that is not a colour, the edge falls back', () => {
  setEdgeResolver(() => 'var(--accent)');
  assert.equal(transitionEdge({ theme: LAYOUT_STYLES[0].id }, createSlide('S')), DEFAULT_EDGE);
  setEdgeResolver(null);
  assert.equal(transitionEdge({ theme: LAYOUT_STYLES[0].id }, createSlide('S')), DEFAULT_EDGE);
});
