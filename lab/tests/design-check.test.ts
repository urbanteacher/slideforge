// Design rules the editor checks (designs/designCheck.ts, BACKLOG CS-02): small text, low contrast on what is behind
// it, text shrunk to fit, and a lesson with too many sizes. The layouts measure words, so a stand-in canvas measures
// each character as half its size (as tests/nodes-room.test.ts does).
import { test } from 'node:test';
import assert from 'node:assert/strict';
const g = globalThis as unknown as { document?: unknown; OffscreenCanvas?: unknown };
const ctx = { font: '40px Inter', measureText(t: string) { const px = Number(/(\d+(?:\.\d+)?)px/.exec(this.font)?.[1] ?? 40); return { width: t.length * px * 0.5, actualBoundingBoxAscent: px * 0.8, actualBoundingBoxDescent: px * 0.2, fontBoundingBoxAscent: px * 0.9, fontBoundingBoxDescent: px * 0.25 }; } };
g.OffscreenCanvas ??= class { getContext() { return ctx; } };
import '../src/kinds';
import type { Deck, Slide } from '../src/core';
import { designCheck, deckTextSizes, typeScaleNote } from '../src/designs/designCheck';

const text = (name: string, words: string, size: number, color: string, extra: Record<string, unknown> = {}, box = { x: 100, y: 100, w: 1600, h: 400, rot: 0 }) =>
  ({ id: name, kind: 'text', name, visible: true, opacity: 1, box, params: { text: words, size, color, font: 'Inter', lineHeight: 1.2, ...extra } });
const slide = (layers: unknown[], background = '#ffffff') => ({ id: 's', name: 'S', background, layers, transition: { type: 'none', duration: 0 }, notes: '' }) as unknown as Slide;
const deck = { height: 1080 } as Deck;

test('a clear slide has nothing to say', () => {
  assert.deepEqual(designCheck(slide([text('Title', 'Readable', 88, '#161616')]), deck), []);
});

test('text under 24px, and the header and footer left out', () => {
  const said = designCheck(slide([text('Caption', 'Tiny', 18, '#161616'), text('Footer', '3', 16, '#161616', { hfSlot: 'right' })]), deck);
  assert.equal(said.length, 1);
  assert.match(said[0], /^“Caption” is drawn at 18px, under the 24px/);
});

test('contrast against the slide, a shape behind it, and nothing said over a picture', () => {
  const pale = text('Pale', 'Hard to read', 32, '#bbbbbb');
  assert.match(designCheck(slide([pale]), deck)[0], /contrast of 1\.9:1.*needs 4\.5:1/);
  const big = text('Big', 'Large text', 60, '#949494');
  assert.deepEqual(designCheck(slide([big]), deck), [], '3:1 is enough at 44px and up');
  const card = { id: 'card', kind: 'shape', name: 'Card', visible: true, opacity: 1, box: { x: 0, y: 0, w: 1920, h: 1080, rot: 0 }, params: { shape: 'rect', fill: '#161616', fillOpacity: 1 } };
  assert.match(designCheck(slide([card, text('Dark', 'On the card', 32, '#222222')]), deck)[0], /contrast of/);
  const photo = { id: 'p', kind: 'image', name: 'Photo', visible: true, opacity: 1, box: { x: 0, y: 0, w: 1920, h: 1080, rot: 0 }, params: { src: 'x.jpg' } };
  assert.deepEqual(designCheck(slide([photo, text('Over', 'On a photo', 32, '#ffffff')]), deck), []);
});

test('text that has shrunk to fit is a slide to split', () => {
  const long = 'word '.repeat(200);
  const said = designCheck(slide([text('Body', long, 64, '#161616', { fit: 'shrink' }, { x: 100, y: 100, w: 800, h: 300, rot: 0 })]), deck);
  assert.ok(said.some((t) => /has shrunk to \d+% of its size to fit.*split it/.test(t)), said.join(' | '));
});

test('a lesson with more than six text sizes is said once', () => {
  const sizes = [160, 120, 88, 64, 48, 36, 28];
  const many = { height: 1080, slides: sizes.map((px, i) => slide([text(`T${i}`, 'Words', px, '#161616')])) } as unknown as Deck;
  assert.equal(deckTextSizes(many).length, 7);
  assert.match(typeScaleNote(many), /^This lesson sets its words in 7 sizes/);
  assert.equal(typeScaleNote({ ...many, slides: many.slides.slice(0, 5) }), '');
  const close = { height: 1080, slides: [slide([text('A', 'x', 120, '#161616'), text('B', 'x', 124, '#161616')])] } as unknown as Deck;
  assert.deepEqual(deckTextSizes(close), [124], '120 and 124 are one step');
});
