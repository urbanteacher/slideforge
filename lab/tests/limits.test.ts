// How heavy a slide may get (core/limits.ts, BACKLOG CS-11): layers, drawings, media and the slide's total, each
// said with what to do. Small limits stand in for the real ones, so the test builds no 5 MB strings.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Slide } from '../src/core';
import { limitsOf, SLIDE_LIMITS } from '../src/core/limits';

const layer = (name: string, params: Record<string, unknown> = {}) => ({ id: name, kind: 'image', name, visible: true, params });
const slide = (layers: unknown[]) => ({ id: 's', name: 'S', background: '', layers, transition: { type: 'none', duration: 0 }, notes: '' }) as unknown as Slide;
const small = { layers: 3, svg: 100, media: 200, slide: 300 };
const data = (type: string, n: number) => `data:${type};base64,${'A'.repeat(n)}`;

test('a light slide has nothing to say', () => {
  assert.deepEqual(limitsOf(slide([layer('a'), layer('b', { src: data('image/png', 50) })]), small), []);
});

test('too many layers, a heavy drawing, heavy media, and too much in all', () => {
  const said = limitsOf(slide([
    layer('Logo', { src: data('image/svg+xml', 150) }),
    layer('Photo', { src: data('image/jpeg', 250) }),
    layer('Same photo', { src: data('image/jpeg', 250) }),
    layer('Clip', { video: { src: data('video/mp4', 120) } }),
  ]), small);
  assert.equal(said.length, 4);
  assert.match(said[0], /^4 layers, over the 3/);
  assert.match(said[1], /^“Logo” is a drawing of 0 KB, over 0 KB/);
  assert.match(said[2], /^“Photo” holds 0\.0 MB/);
  assert.match(said[3], /^The slide holds/);
  // The same picture twice is held once, so it is counted and said once.
  assert.equal(said.filter((t) => t.includes('Same photo')).length, 0);
});

test('the real limits are the ones the backlog names', () => {
  assert.deepEqual(SLIDE_LIMITS, { layers: 200, svg: 150 * 1024, media: 2 * 1024 * 1024, slide: 5 * 1024 * 1024 });
});
