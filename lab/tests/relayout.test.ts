// Change layout (layouts/relayout.ts): a slide's words and pictures poured into another layout, the title into its
// title, the rest in order, and whatever has no place into the speaker notes. A stand-in canvas measures words.
import { test } from 'node:test';
import assert from 'node:assert/strict';
const g = globalThis as unknown as { OffscreenCanvas?: unknown };
const ctx = { font: '40px Inter', measureText(t: string) { const px = Number(/(\d+(?:\.\d+)?)px/.exec(this.font)?.[1] ?? 40); return { width: t.length * px * 0.5, actualBoundingBoxAscent: px * 0.8, actualBoundingBoxDescent: px * 0.2, fontBoundingBoxAscent: px * 0.9, fontBoundingBoxDescent: px * 0.25 }; } };
g.OffscreenCanvas ??= class { getContext() { return ctx; } };
import '../src/kinds';
import { DEFAULT_THEME, bulletsSlide, cardsSlide, relayout, relayoutBlocked, splitSlide } from '../src/layouts';
import type { Slide } from '../src/core';

const st = DEFAULT_THEME;
const words = (s: Slide) => s.layers.filter((l) => l.kind === 'text').map((l) => String(l.params.text));

test('bullets to cards: the title stays, the points fill the cards, the rest go to the notes', () => {
  const old = bulletsSlide(st, 'Why charts mislead', ['Axes', 'Scale', 'Colour', 'Area', 'Order']);
  old.notes = 'Say this slowly.';
  const fresh = cardsSlide(st, 'Sample', [['A', 'a'], ['B', 'b'], ['C', 'c']]);
  const { slide, leftover } = relayout(old, fresh);
  assert.equal(slide.id, old.id);
  const w = words(slide);
  assert.equal(w[0], 'Why charts mislead');
  // Each point is a card's words, the cards numbered; the points past the third go to the notes.
  assert.deepEqual(w.slice(1), ['1', 'Axes', '2', 'Scale', '3', 'Colour']);
  assert.deepEqual(leftover, ['Area', 'Order']);
  assert.match(slide.notes, /^Say this slowly\.\n\nFrom the old layout:\nArea\nOrder$/);
});

test('cards to bullets: each card reads as one point, head and words together', () => {
  const old = cardsSlide(st, 'Three jobs', [['See', 'Notice the pattern.'], ['Say', 'Name it.']]);
  const fresh = bulletsSlide(st, 'Sample', ['x']);
  const { slide, leftover } = relayout(old, fresh);
  const w = words(slide);
  assert.equal(w[0], 'Three jobs');
  assert.equal(w[1], 'See: Notice the pattern.\nSay: Name it.');
  assert.deepEqual(leftover, []);
});

test('more words than places: the extras go to the speaker notes', () => {
  const old = cardsSlide(st, 'Four', [['A', '1'], ['B', '2'], ['C', '3'], ['D', '4']]);
  const fresh = cardsSlide(st, 'Sample', [['x', 'y']]);
  const { slide, leftover } = relayout(old, fresh);
  assert.ok(leftover.length > 0);
  assert.match(slide.notes, /From the old layout:/);
});

test('a picture moves to the new layout’s picture place, and the show settings are kept', () => {
  const old = splitSlide(st, 'Look', ['One'], 'right');
  old.layers.find((l) => l.kind === 'image')!.params.src = 'pic.png';
  old.hidden = true;
  old.audience = 'teacher';
  const fresh = splitSlide(st, 'Sample', ['x'], 'left');
  const { slide, picturesLeft } = relayout(old, fresh);
  assert.equal(slide.layers.find((l) => l.kind === 'image')!.params.src, 'pic.png');
  assert.equal(picturesLeft, 0);
  assert.equal(slide.hidden, true);
  assert.equal(slide.audience, 'teacher');
});

test('a game slide keeps the layout its game gives it', () => {
  const s = bulletsSlide(st, 'Q', ['a']);
  (s as Slide).game = { id: 'g', format: 'quiz', label: 'Quiz', role: 'question', settings: {} } as Slide['game'];
  assert.match(String(relayoutBlocked(s)), /game/);
});
