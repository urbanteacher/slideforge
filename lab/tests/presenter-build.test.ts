// The Teacher Presenter is told how far the slide's own click reveals have gone (first-run review Wave 4), as it is
// told a live figure's step: a slide with no reveals says nothing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Slide } from '../src/core';
import { presenterState } from '../src/show/desk';

const slide = (id: string) => ({ id, name: `Slide ${id}`, background: '', layers: [], transition: { type: 'none', duration: 0 }, notes: '' }) as unknown as Slide;
const deck = { title: 'D', slides: [slide('a'), slide('b')] };

test('the presenter hears the build position, and nothing on a slide with no reveals', () => {
  assert.deepEqual(presenterState({ deck, index: 0, startedAt: 0, screen: 'none', build: { step: 1, of: 3 } }).build, { step: 1, of: 3 });
  assert.equal('build' in presenterState({ deck, index: 0, startedAt: 0, screen: 'none', build: { step: 0, of: 0 } }), false);
  assert.equal('build' in presenterState({ deck, index: 0, startedAt: 0, screen: 'none' }), false);
});
