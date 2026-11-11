// How heavy a slide may get (core/limits.ts, BACKLOG CS-11, CR-70 to CR-72): layers, widgets, drawings, media and the
// slide's total, each said with what to do, measured in bytes as a file would be; and what a share may carry
// (SHARE_LIMITS), checked before anything is sent. Limits in kilobytes stand in for the real ones, so the test builds
// no megabyte strings, and its messages read as a teacher would see them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Slide } from '../src/core';
import { dataBytes, limitsOf, shareTooLarge } from '../src/core/limits';
import { WIDGET_MAX } from '../src/engine/widget';

const layer = (name: string, params: Record<string, unknown> = {}, kind = 'image') => ({ id: name, kind, name, visible: true, params });
const slide = (layers: unknown[]) => ({ id: 's', name: 'S', background: '', layers, transition: { type: 'none', duration: 0 }, notes: '' }) as unknown as Slide;
const KB = 1024;
const small = { layers: 3, svg: 10 * KB, media: 20 * KB, slide: 30 * KB };
/** A base64 data address holding `bytes` bytes. */
const data = (type: string, bytes: number) => `data:${type};base64,${'A'.repeat(Math.ceil(bytes / 3) * 4)}`;

test('a data address is measured in the bytes it holds, however it is written', () => {
  assert.equal(dataBytes(data('image/png', 3000)), 3000);
  assert.equal(dataBytes('data:image/png;base64,QUJD'), 3);
  assert.equal(dataBytes('data:image/png;base64,QUI='), 2);
  assert.equal(dataBytes(`data:image/svg+xml,${encodeURIComponent('<svg width="10"/>')}`), '<svg width="10"/>'.length);
});

test('a light slide has nothing to say', () => {
  assert.deepEqual(limitsOf(slide([layer('a'), layer('b', { src: data('image/png', 5 * KB) })]), small), []);
});

test('too many layers, a heavy drawing, heavy media, and too much in all, each with its size', () => {
  const said = limitsOf(slide([
    layer('Logo', { src: data('image/svg+xml', 15 * KB) }),
    layer('Photo', { src: data('image/jpeg', 25 * KB) }),
    layer('Same photo', { src: data('image/jpeg', 25 * KB) }),
    layer('Clip', { video: { src: data('video/mp4', 12 * KB) } }),
  ]), small);
  assert.deepEqual(said, [
    '4 layers, over the 3 the editor handles smoothly. Split the slide, or merge layers that never move.',
    '“Logo” is a drawing of 15 KB, over 10 KB, so it is slow to draw. Simplify it, or replace it with a picture.',
    '“Photo” is 25 KB, over 20 KB, so it slows the editor and the show. Make it smaller, or link a video instead.',
    'The slide holds 52 KB of pictures and media, over 30 KB. Make them smaller: the slide is slow to edit and to show.',
  ]);
  // The same picture twice is held once, so it is counted and said once.
  assert.equal(said.filter((t) => t.includes('Same photo')).length, 0);
});

test('a drawing written with %-escapes is measured as its source, not its longer address', () => {
  const svg = `<svg>${'<path d="M0 0L1 1"/>'.repeat(400)}</svg>`; // about 8 KB of source
  const escaped = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  assert.ok(escaped.length > 10 * KB, 'the address alone would be over the limit');
  assert.deepEqual(limitsOf(slide([layer('Drawing', { src: escaped })]), small), [], 'its source is not');
});

test('a widget over the size the show runs is said, with its size', () => {
  const said = limitsOf(slide([layer('Dice', { html: 'x'.repeat(WIDGET_MAX + 512) }, 'widget')]));
  assert.deepEqual(said, [`“Dice” is a widget of ${((WIDGET_MAX + 512) / 1024).toFixed(1)} KB, over ${WIDGET_MAX / 1024} KB, so the show will not run it. Make its page smaller.`]);
});

test('what a share may carry: its words, each picture as sent, all its pictures, and how many', () => {
  const lim = { words: 10 * KB, each: 5 * KB, all: 12 * KB, pictures: 3 };
  const pic = (n: number) => 'data:image/png;base64,' + 'A'.repeat(n);
  assert.equal(shareTooLarge({ pictures: [pic(4 * KB), pic(4 * KB)] }, lim), '');
  assert.match(shareTooLarge({ pad: 'x'.repeat(11 * KB) } as never, lim), /^the lesson’s slides come to 11 KB without their pictures, over 10 KB/);
  assert.match(shareTooLarge({ pictures: [pic(6 * KB)] }, lim), /^one picture or video is/);
  assert.match(shareTooLarge({ pictures: [pic(4 * KB), pic(4 * KB), pic(4 * KB)] }, lim), /^its pictures and videos come to/);
  assert.match(shareTooLarge({ pictures: [pic(1), pic(2), pic(3), pic(4)] }, lim), /^it has 4 different pictures and videos, over the 3/);
});
