import type { LayoutStyle } from '../layouts';
import type { Layer, Slide } from '../types';
import { FOOT, H, LEFT, W, box, eyebrow, ground, hero, part, rect, slideOf, tint, txt, type Row } from './kit';

// Labelled content — objectives and success criteria, a hook's stimulus and big question, a word
// splash — and numbered runs — a daily review, a Do Now, a dialogue chain. Rows are bands the full
// width of the slide, flush one under the next and off the foot, the label in the accent at the left
// and the words large beside it. A numbered run is a column of the accent down the left, bleeding top
// to bottom with the heading reversed out of it, and the steps large beside it, one per click.

export interface Labelled { title: string; eyebrow?: string; rows: Row[]; notes?: string; build?: boolean }

/** Rows as full-width bands under the heading, sharing the rest of the slide. */
export function rowBands(st: LayoutStyle, o: Labelled): Slide {
  const rows = o.rows.slice(0, 6);
  const n = Math.max(1, rows.length);
  const TOP = n > 4 ? 380 : 440;
  const layers: Layer[] = [
    ground(st),
    eyebrow(st, o.eyebrow ?? o.title),
    hero(st, 'Heading', o.title, box(LEFT, 206, W - LEFT * 2, TOP - 206 - 40), n > 4 ? 96 : 112),
  ];
  const rowH = (H - TOP) / n;
  const labelW = 560;
  const size = n > 4 ? 44 : n > 3 ? 50 : 56;
  rows.forEach((r, i) => {
    const y = TOP + i * rowH;
    // Text in the last band keeps clear of the deck's footer; the band itself runs off the foot.
    const h = Math.min(rowH, FOOT - y) - 24;
    const p = part('rows', i, o.build ? 'spot' : 'on', o.build ? 1 : n);
    layers.push(
      rect(`${r.label || `Row ${i + 1}`} — band`, box(0, y, W, rowH + (i === n - 1 ? 1 : 0)), tint(st, i), p.lead('wipeRight')),
      rect(`${r.label || `Row ${i + 1}`} — rule`, box(0, y, 12, rowH), st.accent, p.with(0.05)),
      txt(`${r.label || `Row ${i + 1}`} — label`, r.label, box(LEFT, y + 24, labelW - 60, h), { font: st.body, weight: '700', size: size - 6, color: st.accent, lineHeight: 1.15 }, p.with(0.1)),
      txt(`${r.label || `Row ${i + 1}`} — text`, r.text || r.label, box(LEFT + labelW, y + 24, W - LEFT * 2 - labelW, h), { font: st.body, size, color: st.ink, lineHeight: 1.25 }, p.with(0.15)),
    );
  });
  return slideOf(o.title, layers, st, o.notes);
}

/** A numbered run: the heading reversed out of an accent column that bleeds top to bottom, and the
 *  steps beside it, numbered large, one per click with the live one lit. */
export function numberedRun(st: LayoutStyle, o: Labelled): Slide {
  const steps = o.rows.slice(0, 6);
  const n = Math.max(1, steps.length);
  const COL = 640;
  const layers: Layer[] = [
    ground(st),
    rect('Accent column', box(0, 0, COL, H), st.accent, { type: 'wipeUp', duration: 0.7 }),
    txt('Eyebrow', (o.eyebrow ?? 'Step by step').toUpperCase(), box(LEFT, 170, COL - LEFT - 60, 50), { font: st.body, weight: '600', size: 38, color: st.ground, tracking: 0.12 }),
    txt('Heading', o.title, box(LEFT, 240, COL - LEFT - 60, 560), { font: st.display, weight: st.displayWeight, size: 112, color: st.ground, lineHeight: 1.02, tracking: -0.015, fit: 'fill', balance: true },
      { type: 'words', feel: 'rise', easing: 'easyEase', duration: 0.7, stagger: 0.1 }),
    txt('Count', `${n} ${n === 1 ? 'step' : 'steps'}`, box(LEFT, 860, COL - LEFT - 60, 60), { font: st.body, size: 44, color: st.ground }),
  ];
  const top = 150, bottom = FOOT - 20;
  const rowH = (bottom - top) / n;
  const x = COL + 72, w = W - x - LEFT;
  const size = n > 4 ? 46 : 54;
  steps.forEach((s, i) => {
    const y = top + i * rowH;
    const p = part('steps', i, o.build === false ? 'on' : 'spot', o.build === false ? n : 1);
    layers.push(
      txt(`Step ${i + 1} — number`, String(i + 1), box(x, y + 8, 110, rowH - 16), { font: st.display, weight: st.displayWeight, size: Math.min(120, rowH * 0.8), color: st.accent, lineHeight: 1 }, p.lead('rise')),
      txt(`Step ${i + 1} — label`, s.label, box(x + 140, y + 10, w - 140, Math.min(64, rowH * 0.34)), { font: st.body, weight: '700', size: size + 4, color: st.ink }, p.with(0.1)),
      txt(`Step ${i + 1} — text`, s.text, box(x + 140, y + 10 + Math.min(72, rowH * 0.38), w - 140, rowH - Math.min(72, rowH * 0.38) - 28), { font: st.body, size: size - 4, color: st.muted, lineHeight: 1.25 }, p.with(0.15)),
    );
    if (i < n - 1) layers.push(rect(`Step ${i + 1} — rule`, box(x, y + rowH - 2, W - x, 2), 'rgba(0,0,0,0.08)', p.with(0.2)));
  });
  return slideOf(o.title, layers, st, o.notes);
}
