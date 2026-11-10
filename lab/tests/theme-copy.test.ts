// Decks keep their theme (BACKLOG CS-04, layouts/style.ts): a built-in theme is kept as a copy in the deck, so a later
// change to the studio's theme leaves a lesson as it was, and the theme picker offers the new look.
import { test } from 'node:test';
import assert from 'node:assert/strict';
const g = globalThis as unknown as { OffscreenCanvas?: unknown };
const ctx = { font: '40px Inter', measureText(t: string) { const px = Number(/(\d+(?:\.\d+)?)px/.exec(this.font)?.[1] ?? 40); return { width: t.length * px * 0.5, actualBoundingBoxAscent: px * 0.8, actualBoundingBoxDescent: px * 0.2, fontBoundingBoxAscent: px * 0.9, fontBoundingBoxDescent: px * 0.25 }; } };
g.OffscreenCanvas ??= class { getContext() { return ctx; } };
import '../src/kinds';
import type { Deck } from '../src/core';
import { LAYOUT_STYLES, applyTheme, newerTheme, pinTheme, themeOf } from '../src/layouts';

const blank = (theme?: string) => ({ id: 'd', title: 'D', width: 1920, height: 1080, version: 2, theme, slides: [{ id: 's', name: 'S', background: '#ffffff', layers: [], transition: { type: 'none', duration: 0 }, notes: '' }] }) as unknown as Deck;
const navy = LAYOUT_STYLES.find((s) => s.id === 'navy')!;

test('applying a built-in theme keeps a copy in the deck, and themeOf reads the copy', () => {
  const d = blank();
  applyTheme(d, navy);
  assert.equal(d.theme, 'navy');
  assert.deepEqual(d.themeCopy, navy);
  assert.notEqual(d.themeCopy as unknown, navy, 'a copy, not the studio’s own object');
  (d.themeCopy as Record<string, unknown>).accent = '#123456';
  assert.equal(themeOf(d)!.accent, '#123456', 'the deck’s copy wins over the studio’s theme');
});

test('when the studio’s theme changes, the lesson keeps its look and the new one is offered', () => {
  const d = blank();
  applyTheme(d, navy);
  assert.equal(newerTheme(d), null, 'nothing to offer while they agree');
  (d.themeCopy as Record<string, unknown>).accent = '#000001';
  assert.equal(newerTheme(d)?.id, 'navy');
  applyTheme(d, newerTheme(d)!);
  assert.equal(newerTheme(d), null, 'taking the new look keeps it as the copy');
  assert.equal(themeOf(d)!.accent, navy.accent);
});

test('a lesson from before is pinned once to the look it has; a style guide is left alone', () => {
  const old = blank('navy');
  assert.equal(pinTheme(old), true);
  assert.deepEqual(old.themeCopy, navy);
  assert.equal(pinTheme(old), false, 'once');
  assert.equal(pinTheme(blank('guide')), false);
  assert.equal(pinTheme(blank('no-such-theme')), false);
});
