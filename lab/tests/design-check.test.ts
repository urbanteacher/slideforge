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

test('contrast is compared as computed, not rounded: #008580 on white (4.49995:1) does not meet 4.5:1', () => {
  const said = designCheck(slide([text('Teal', 'Small teal words', 32, '#008580')]), deck);
  assert.equal(said.length, 1);
  assert.match(said[0], /needs 4\.5:1/);
});

test('a note is read on its own panel, a text on its block: a default note on a dark slide is fine', () => {
  const note = { id: 'n', kind: 'note', name: 'Note', visible: true, opacity: 1, box: { x: 100, y: 100, w: 800, h: 300, rot: 0 }, params: { text: 'A note', size: 32, textColor: '#141414', panel: true, fill: '#f3efe8' } };
  assert.deepEqual(designCheck(slide([note], '#141414'), deck), []);
  const bare = { ...note, params: { ...note.params, panel: false } };
  assert.match(designCheck(slide([bare], '#141414'), deck)[0], /contrast of/, 'with no panel it is read on the slide');
  const caption = text('Caption', 'Over a photo', 32, '#ffffff', { block: 'lines', blockColor: '#000000', blockOpacity: 1 });
  const photo = { id: 'p', kind: 'image', name: 'Photo', visible: true, opacity: 1, box: { x: 0, y: 0, w: 1920, h: 1080, rot: 0 }, params: { src: 'x.jpg' } };
  assert.deepEqual(designCheck(slide([photo, caption]), deck), [], 'white on its black block is fine');
  const faint = text('Faint', 'On a pale block', 32, '#ffffff', { block: 'fill', blockColor: '#eeeeee', blockOpacity: 1 });
  assert.match(designCheck(slide([faint], '#000000'), deck)[0], /contrast of/, 'white on a pale block is said, though the slide is black');
});

test('the ground is on the same face, and a blend or a see-through layer is not read as one colour', () => {
  const card = (extra: Record<string, unknown>, params: Record<string, unknown> = {}) => ({ id: 'card', kind: 'shape', name: 'Card', visible: true, opacity: 1, box: { x: 0, y: 0, w: 1920, h: 1080, rot: 0 }, params: { shape: 'rect', fill: '#161616', fillOpacity: 1, ...params }, ...extra });
  const dark = text('Dark', 'Dark words', 32, '#222222');
  assert.deepEqual(designCheck(slide([card({ face: 'back' }), dark]), deck), [], 'a card on the back face is not behind front-face words');
  assert.deepEqual(designCheck(slide([card({ blend: 'multiply' }), dark]), deck), [], 'a blend: nothing said rather than a wrong number');
  assert.deepEqual(designCheck(slide([card({ opacity: 0.5 }), dark]), deck), [], 'half see-through: nothing said');
  assert.match(designCheck(slide([card({}, { fill: 'none' }), text('Pale', 'Pale words', 32, '#bbbbbb')]), deck)[0], /contrast of 1\.9:1/, 'an outline with no fill: read on what is under it');
});

test('colours written other ways are read too: #abc, rgb() and a named colour', () => {
  for (const c of ['#bbb', 'rgb(187, 187, 187)', 'rgb(187 187 187 / 1)']) assert.match(designCheck(slide([text('Pale', 'Hard to read', 32, c)]), deck)[0] ?? '', /contrast of 1\.9:1/, c);
  assert.match(designCheck(slide([text('Pale', 'Hard to read', 32, '#bbbbbb')], 'white'), deck)[0] ?? '', /contrast of 1\.9:1/);
  assert.deepEqual(designCheck(slide([text('Seen through', 'Words', 32, 'rgba(0, 0, 0, 0.3)')]), deck), [], 'a see-through colour is not guessed at');
});

test('the lesson\'s text sizes measure a slide again only when it changed', () => {
  let measured = 0;
  const m = ctx.measureText.bind(ctx);
  ctx.measureText = (t: string) => { measured++; return m(t); };
  const slides = Array.from({ length: 40 }, (_, i) => slide([text(`T${i}`, 'Words that are measured', 64, '#161616', { fit: 'shrink' })]));
  const d = { height: 1080, slides } as unknown as Deck;
  deckTextSizes(d);
  const first = measured;
  measured = 0;
  deckTextSizes({ ...d, slides: [...slides] } as Deck);
  assert.equal(measured, 0, 'nothing changed: nothing measured');
  const edited = [...slides];
  edited[3] = slide([text('T3', 'Words that were changed', 64, '#161616', { fit: 'shrink' })]);
  deckTextSizes({ ...d, slides: edited } as Deck);
  assert.ok(measured > 0 && measured <= first / 20, `one slide of 40 measured again (${measured} of ${first})`);
  ctx.measureText = m;
});
