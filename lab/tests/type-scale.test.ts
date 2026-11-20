// One type scale (layouts/scale.ts): no layout sets words under the 18pt floor, in any theme. The header and footer's
// chrome is the one exception. A stand-in canvas measures words.
import { test } from 'node:test';
import assert from 'node:assert/strict';
const g = globalThis as unknown as { OffscreenCanvas?: unknown };
const ctx = { font: '40px Inter', measureText(t: string) { const px = Number(/(\d+(?:\.\d+)?)px/.exec(this.font)?.[1] ?? 40); return { width: t.length * px * 0.5, actualBoundingBoxAscent: px * 0.8, actualBoundingBoxDescent: px * 0.2, fontBoundingBoxAscent: px * 0.9, fontBoundingBoxDescent: px * 0.25 }; } };
g.OffscreenCanvas ??= class { getContext() { return ctx; } };
import '../src/kinds';
import { FLOOR_PX } from '../src/engine';
import { LAYOUTS, LAYOUT_STYLES, codeSlide, explainSlide, revealSlide } from '../src/layouts';
import type { Slide } from '../src/core';

const small = (s: Slide) => s.layers
  .filter((l) => l.kind === 'text' && typeof l.params.hfSlot !== 'string' && Number(l.params.size ?? 64) < FLOOR_PX)
  .map((l) => `${s.name} · ${l.name}: ${l.params.size}px`);

test('every gallery layout, in every theme, sets its words at 36px or more', () => {
  const found = LAYOUT_STYLES.flatMap((st) => LAYOUTS.flatMap((l) => small(l.make(st))));
  assert.deepEqual([...new Set(found)], []);
});

test('the builders the converter uses hold to the floor too', () => {
  const st = LAYOUT_STYLES[0];
  const slides = [
    revealSlide(st, { title: 'T', eyebrow: 'E', sub: 'S', rows: [{ name: 'A', say: 'a', text: 'x', tag: { text: 'Yes', fill: '#1f9d5a' } }, { name: 'B', text: 'y' }], steps: [{ caption: 'C' }, {}] } as never),
    explainSlide(st, { number: 3, question: 'Q', answer: 'A', key: 'B', body: 'Because.', source: 'Source', clicks: false }),
    codeSlide(st, 'Code', 'print(1)', 'python', false),
  ];
  assert.deepEqual(slides.flatMap(small), []);
});
