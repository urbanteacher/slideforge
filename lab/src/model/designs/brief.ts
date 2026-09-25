import type { LayoutStyle } from '../layouts';
import type { Layer, Slide } from '../types';
import { BASE, FOOT, HY, LEFT, LIFT, PAD, W, box, eyebrow, ground, hero, labelled, part, rect, slideOf, tint, txt, type Row } from './kit';

// An opening brief — a worked example, an error to find, a problem to solve, a stimulus and its big
// question. The brief is the slide: its words set as the hero across the top half, what it is in the
// accent above them. What the room does with it follows as a band of columns, flush and full-bleed
// under it, a column per click, the live one lit.

export interface Brief { title: string; brief: Row; rows: Row[]; notes?: string }

export function briefHero(st: LayoutStyle, o: Brief): Slide {
  const rows = o.rows.slice(0, 5);
  const n = rows.length;
  const TOP = n ? 560 - LIFT : BASE;
  const layers: Layer[] = [
    ground(st),
    eyebrow(st, o.brief.label ? `${o.title} · ${o.brief.label}` : o.title),
    hero(st, 'Brief', o.brief.text || o.brief.label || o.title, box(LEFT, HY, W - LEFT * 2, (n ? TOP : FOOT) - HY - 40), n ? 104 : 140),
  ];
  const colW = W / Math.max(1, n);
  rows.forEach((r, i) => {
    const x0 = Math.round(i * colW), x1 = Math.round((i + 1) * colW);
    const col = box(x0, TOP, x1 - x0, BASE - TOP);
    const pad = i === 0 ? LEFT : PAD;
    const p = part('brief', i, 'spot');
    layers.push(
      rect(`${r.label} — column`, col, tint(st, i), p.lead('wipeUp')),
      rect(`${r.label} — bar`, box(col.x, col.y, col.w, 12), st.accent, p.with(0.1, 'wipeRight')),
      txt(`${r.label} — label`, labelled(r), box(col.x + pad, col.y + 48, col.w - pad - PAD, 76), { font: st.display, weight: st.displayWeight, size: n >= 5 ? 60 : 76, color: st.ink, lineHeight: 1, fitGroup: 'brief-label' }, p.with(0.15, 'rise')),
      txt(`${r.label} — text`, r.text, box(col.x + pad, col.y + 148, col.w - pad - PAD, FOOT - col.y - 148), { font: st.body, size: n >= 5 ? 44 : 50, color: st.muted, lineHeight: 1.28, fitGroup: 'brief-text' }, p.with(0.25)),
    );
  });
  return slideOf(o.title, layers, st, o.notes);
}
