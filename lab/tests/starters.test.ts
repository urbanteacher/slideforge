// The starters (decks/starters.ts): every one a valid lesson file, built from the studio's layouts, with no invented facts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
const g = globalThis as unknown as { OffscreenCanvas?: unknown };
const ctx = { font: '40px Inter', measureText(t: string) { const px = Number(/(\d+(?:\.\d+)?)px/.exec(this.font)?.[1] ?? 40); return { width: t.length * px * 0.5, actualBoundingBoxAscent: px * 0.8, actualBoundingBoxDescent: px * 0.2, fontBoundingBoxAscent: px * 0.9, fontBoundingBoxDescent: px * 0.25 }; } };
g.OffscreenCanvas ??= class { getContext() { return ctx; } };
import '../src/kinds';
import { STARTERS, starterDeck } from '../src/decks/starters';
import { readLesson } from '../src/decks/lessonFormat';

test('every starter reads as a lesson file with no problems or warnings', () => {
  assert.ok(STARTERS.length >= 6);
  for (const s of STARTERS) {
    const r = readLesson(JSON.parse(JSON.stringify(s.lesson)));
    assert.deepEqual(r.problems, [], s.id);
    assert.deepEqual(r.warnings, [], s.id);
  }
});

test('every starter builds a deck in its own theme', () => {
  for (const s of STARTERS) {
    const d = starterDeck(s.id)!;
    assert.equal(d.slides.length, s.lesson.slides.length, s.id);
    assert.equal(d.theme, s.lesson.theme, s.id);
  }
});

test('a figure, date or name on a starter is a placeholder blank, never a made-up value', () => {
  for (const s of STARTERS) {
    const text = JSON.stringify(s.lesson.slides);
    // No digits outside a [__] blank, except the durations and weights a template sets as an example.
    const stripped = text.replace(/\[[^\]]*__[^\]]*\]/g, '').replace(/\b\d+ min\b/g, '');
    assert.doesNotMatch(stripped, /\d/, s.id);
  }
});
