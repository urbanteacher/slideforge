// Two engine paths (docs/claude-slides-lessons.md section 7): web layers, live content a kind declares and the show
// frames over the canvas, and drawings that read their slide, which the renderer draws again when the slide changes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../src/kinds';
import type { Layer } from '../src/core';
import { readsSlide, webContent } from '../src/engine';

const layer = (kind: string, params: Record<string, unknown>, extra: Partial<Layer> = {}) =>
  ({ id: kind, kind, name: kind, visible: true, box: { x: 0, y: 0, w: 640, h: 360, rot: 0 }, params, ...extra }) as unknown as Layer;

test('a YouTube link is framed as it is; a video file is not live content', () => {
  const w = webContent(layer('video', { src: 'https://youtu.be/dQw4w9WgXcQ' }));
  assert.equal(w?.kind, 'frame');
  assert.match(w?.kind === 'frame' ? w.src : '', /youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/);
  assert.equal(webContent(layer('video', { src: 'data:video/mp4;base64,AA' })), null);
});

test('a widget runs its page sandboxed to scripts; an empty one shows nothing live', () => {
  const w = webContent(layer('widget', { html: '<b>hi</b>', background: '#fafafa', radius: 12 }));
  assert.equal(w?.kind, 'page');
  if (w?.kind !== 'page') return;
  assert.equal(w.sandbox, 'allow-scripts');
  assert.ok(w.doc.includes('<b>hi</b>'));
  assert.deepEqual([w.background, w.radius], ['#fafafa', 12]);
  assert.equal(webContent(layer('widget', { html: '' })), null);
});

test('only a visible layer with a box, of a kind that declares it, is live', () => {
  assert.equal(webContent(layer('text', { text: 'x' })), null);
  assert.equal(webContent(layer('widget', { html: '<b>hi</b>' }, { visible: false })), null);
  assert.equal(webContent(layer('widget', { html: '<b>hi</b>' }, { box: undefined })), null);
});

test('connectors read their slide; other kinds do not', () => {
  assert.equal(readsSlide('connector'), true);
  for (const k of ['text', 'image', 'icon', 'widget', 'video']) assert.equal(readsSlide(k), false, k);
});
