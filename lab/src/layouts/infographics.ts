import type { Layer, Slide } from '../core';
import { CONTENT_FOOT, CONTENT_TOP, after, body, rule, shape, slide, text, titleBar, titleRow, type Triple } from './blocks';
import { GRID, cell, type LayoutStyle } from './style';

// ─── The infographics that take a claim apart (SlideForge's iceberg, spectrum, claim & source and
// then / now / next; AI Awareness Day 2026 teaches with them) ─────────────────────────────────────

/** One item of a set built a click at a time: its first layer waits for the click, the rest come
 *  with it, and the ones before stay. Without clicks the set arrives in reading order. */
function byClick(items: Layer[][], set: string, clicks: boolean) {
  items.forEach((layers, i) => layers.forEach((l, j) => {
    l.anim = clicks
      ? { ...l.anim, type: 'fade', duration: 0.6, delay: 0, trigger: j === 0 ? 'onClick' : 'withSlide', step: { set, i, mode: 'on' } }
      : { ...l.anim, type: 'fade', duration: 0.6, delay: 0.25 + i * 0.12 };
  }));
  return items.flat();
}
const uniq = (name: string) => name + '-' + Math.random().toString(36).slice(2, 9);
/** Where the figures come from, under the content: SlideForge's takeaway line on these layouts. */
const sourceLine = (st: LayoutStyle, value: string) =>
  text('Source', value, { x: GRID.left, y: CONTENT_FOOT - 48, w: 1920 - GRID.left * 2, h: 48, rot: 0 }, { font: st.body, weight: '400', size: 36, color: st.muted, fit: 'shrink' }, after(0.5));
/** The subtitle line under the title bar, as the timeline and the funnel set it. */
const context = (st: LayoutStyle, value: string) => body(st, value, { ...cell(1, 3, 12, 1), y: GRID.top + 2 * GRID.stepY + 34 }, 40);

/** A claim, then who said it, when, on what it rests and what it leaves out: the claim as the title,
 *  then a row per finding, the label in the accent, what was found, and a note. */
export function sourcecheckSlide(st: LayoutStyle, claim: string, subtitle: string, rows: Triple[], source: string, clicks: boolean): Slide {
  const shown = rows.slice(0, 6);
  const foot = source ? CONTENT_FOOT - 72 : CONTENT_FOOT, top = CONTENT_TOP + (subtitle ? 40 : 0);
  const each = (foot - top) / Math.max(1, shown.length), W = 1920 - GRID.left * 2;
  const layers: Layer[] = [titleRow(st, claim), titleBar(st)];
  if (subtitle) layers.push(context(st, subtitle));
  layers.push(...byClick(shown.map(([label, value, note], i) => {
    const y = top + i * each, h = each - 26;
    const row = [
      text('Label', label, { x: GRID.left, y, w: 300, h: Math.min(h, 56), rot: 0 }, { font: st.body, weight: '700', size: 36, color: st.accent, tracking: 0.08, uppercase: true, fitGroup: 'source-labels' }),
      text('Finding', value, { x: GRID.left + 330, y, w: 660, h, rot: 0 }, { font: st.display, weight: '700', size: 52, color: st.ink, lineHeight: 1.1, fit: 'fill', fitGroup: 'source-findings' }),
      rule(st, { x: GRID.left, y: y + each - 13, w: W, h: 2, rot: 0 }, st.muted, 2),
    ];
    if (note) row.push(body(st, note, { x: GRID.left + 1030, y, w: W - 1030, h, rot: 0 }, 40, { fit: 'shrink', fitGroup: 'source-notes' }));
    return row;
  }), uniq('source'), clicks));
  if (source) layers.push(sourceLine(st, source));
  return slide(st, 'Claim & source', layers);
}

const MAGNITUDES: Record<string, number> = { k: 1e3, thousand: 1e3, thousands: 1e3, m: 1e6, mn: 1e6, million: 1e6, millions: 1e6, bn: 1e9, billion: 1e9, billions: 1e9, tn: 1e12, trillion: 1e12, trillions: 1e12 };
/** "500,000", "8 million", "1.2bn" as a number, as SlideForge reads them (js/render.js magnitudeNumber). */
export function magnitude(value: string): number {
  const m = String(value ?? '').trim().match(/(-?\d[\d,.]*)\s*([a-zA-Z]+)?/);
  if (!m) return NaN;
  const n = parseFloat(m[1].replace(/,/g, ''));
  const word = (m[2] ?? '').toLowerCase();
  return Number.isFinite(n) ? n * (MAGNITUDES[word] ?? 1) : NaN;
}
/** The change between two moments as SlideForge prints it: ×16 for a multiple, +25% or −10% below
 *  double. None when either side is not a real, positive number: an invented figure is the fault the
 *  layout is there to correct. */
export function shiftChange(from: string, to: string): string {
  const a = magnitude(from), b = magnitude(to);
  if (!(a > 0) || !(b > 0)) return '';
  const r = b / a;
  return r >= 2 ? `×${Math.round(r * 10) / 10}` : `${r > 1 ? '+' : r < 1 ? '−' : ''}${Math.abs(Math.round((r - 1) * 100))}%`;
}

/** One quantity across three or four moments: a column per moment as tall as its value, the value
 *  and when under it, and the change worked out between each pair. An unknown moment is a dashed
 *  column with a question mark: "next, nobody knows" is the point, not missing data. */
export function shiftSlide(st: LayoutStyle, title: string, subtitle: string, moments: Triple[], source: string, clicks: boolean): Slide {
  const shown = moments.slice(0, 4), n = Math.max(1, shown.length);
  const nums = shown.map(([, v]) => magnitude(v)), top = Math.max(0, ...nums.filter((v) => v > 0));
  const gap = 210, W = 1920 - GRID.left * 2, colW = (W - gap * (n - 1)) / n;
  const foot = source ? CONTENT_FOOT - 72 : CONTENT_FOOT;
  const base = foot - 230, barTop = CONTENT_TOP + (subtitle ? 60 : 20), barMax = base - barTop;
  const layers: Layer[] = [titleRow(st, title), titleBar(st)];
  if (subtitle) layers.push(context(st, subtitle));
  layers.push(...byClick(shown.map(([when, value, note], i) => {
    const x = GRID.left + i * (colW + gap), v = nums[i], known = v > 0;
    // A floor of 8%, as SlideForge keeps, so a small first value still reads as small rather than missing.
    const h = known && top > 0 ? Math.max(0.08, v / top) * barMax : barMax * 0.5;
    const col: Layer[] = [
      shape('Column', { x, y: base - h, w: colW, h, rot: 0 }, known
        ? { shape: 'rect', radius: 12, fill: st.accent, fillOpacity: 0.35 + 0.65 * ((i + 1) / n) }
        : { shape: 'rect', radius: 12, fill: st.ground, fillOpacity: 0, stroke: st.muted, strokeWidth: 4 }),
      text('Value', value || '?', { x, y: base + 22, w: colW, h: 96, rot: 0 }, { font: st.display, weight: '700', size: 88, color: known ? st.ink : st.muted, lineHeight: 1, fit: 'fill', fitGroup: 'shift-values' }),
      text('When', when, { x, y: base + 126, w: colW, h: 52, rot: 0 }, { font: st.body, weight: '700', size: 40, color: st.accent, tracking: 0.06, uppercase: true, fitGroup: 'shift-when' }),
    ];
    if (note) col.push(body(st, note, { x, y: base + 180, w: colW, h: 50, rot: 0 }, 36, { fit: 'shrink', fitGroup: 'shift-notes' }));
    const change = i > 0 ? shiftChange(shown[i - 1][1], value) : '';
    if (change) col.unshift(text('Change', change, { x: x - gap, y: base - Math.min(h, barMax * 0.5) - 90, w: gap, h: 76, rot: 0 }, { font: st.display, weight: '800', size: 64, color: st.accent, align: 'center', lineHeight: 1, fit: 'fill', fitGroup: 'shift-changes' }));
    return col;
  }), uniq('shift'), clicks));
  if (source) layers.push(sourceLine(st, source));
  return slide(st, 'Then / now / next', layers);
}

/** One visible thing, and the mass under it: what everyone sees above the waterline, then a layer per
 *  row below it, each wider and deeper than the one before, so the shape argues before the words do. */
export function icebergSlide(st: LayoutStyle, title: string, above: string, rows: Triple[], source: string, clicks: boolean): Slide {
  const shown = rows.slice(0, 6), n = Math.max(1, shown.length), W = 1920 - GRID.left * 2;
  const foot = source ? CONTENT_FOOT - 72 : CONTENT_FOOT;
  const water = CONTENT_TOP + 96, each = (foot - water - 24) / n;
  const tipW = W * 0.3;
  const layers: Layer[] = [titleRow(st, title), titleBar(st),
    shape('Tip', { x: GRID.left, y: CONTENT_TOP + 8, w: tipW, h: 80, rot: 0 }, { shape: 'rect', radius: 12, fill: st.panel }),
    text('Above the waterline', above || 'What you see', { x: GRID.left + 28, y: CONTENT_TOP + 20, w: tipW - 56, h: 56, rot: 0 }, { font: st.body, weight: '700', size: 40, color: st.ink }, after(0.15)),
    rule(st, { x: GRID.left, y: water, w: W, h: 4, rot: 0 }, st.accent, 4),
  ];
  layers.push(...byClick(shown.map(([label, value, note], i) => {
    // Each layer wider than the one above it, from most of the width to all of it: room for its words.
    const y = water + 24 + i * each, h = each - 16, w = W * (0.62 + 0.38 * ((i + 1) / n));
    const valueW = Math.min(500, w * 0.32), textX = GRID.left + valueW + 24, textW = w - valueW - 52;
    // The name and its note side by side, each the full height of the layer, so a long note keeps its size.
    const labelW = note ? textW * 0.34 : textW;
    const band: Layer[] = [
      shape('Layer', { x: GRID.left, y, w, h, rot: 0 }, { shape: 'rect', radius: 12, fill: st.accent, fillOpacity: 0.12 + 0.5 * ((i + 1) / n) }),
      text('Value', value, { x: GRID.left + 28, y: y + h * 0.14, w: valueW - 28, h: h * 0.72, rot: 0 }, { font: st.display, weight: '800', size: 64, color: st.ink, lineHeight: 1, fit: 'fill', fitGroup: 'berg-values' }),
      text('What', label, { x: textX, y: y + 6, w: labelW - 24, h: h - 12, rot: 0 }, { font: st.body, weight: '700', size: 40, color: st.ink, valign: 'middle', fitGroup: 'berg-labels' }),
    ];
    if (note) band.push(body(st, note, { x: textX + labelW, y: y + 6, w: textW - labelW, h: h - 12, rot: 0 }, 36, { color: st.ink, fit: 'shrink', valign: 'middle', lineHeight: 1.2, fitGroup: 'berg-notes' }));
    return band;
  }), uniq('berg'), clicks));
  if (source) layers.push(sourceLine(st, source));
  return slide(st, 'What lies beneath', layers);
}

/** A line between two named ends, each item placed along it by its position (0–100): a marker on
 *  the line and its name above or below, alternating along the line so neighbours do not collide. */
export function spectrumSlide(st: LayoutStyle, title: string, ends: [string, string], items: Triple[], source: string, clicks: boolean): Slide {
  const shown = items.slice(0, 8), W = 1920 - GRID.left * 2, L = GRID.left;
  const foot = source ? CONTENT_FOOT - 72 : CONTENT_FOOT;
  const line = CONTENT_TOP + (foot - CONTENT_TOP) / 2, labelW = 400, labelH = (foot - CONTENT_TOP) / 2 - 90;
  const pos = (v: string) => Math.max(0, Math.min(100, Number.isFinite(parseFloat(v)) ? parseFloat(v) : 50));
  // Above or below by place along the line, not by reading order, so neighbours sit on opposite sides.
  const rank = shown.map((it, i) => ({ i, p: pos(it[1]) })).sort((a, b) => a.p - b.p).map((x) => x.i);
  const layers: Layer[] = [titleRow(st, title), titleBar(st),
    shape('Line', { x: L, y: line - 4, w: W, h: 8, rot: 0 }, { shape: 'rect', radius: 4, fill: st.muted }, { type: 'wipeRight', duration: 0.9 }),
    text('One end', ends[0], { x: L, y: line + 22, w: 520, h: 52, rot: 0 }, { font: st.body, weight: '700', size: 36, color: st.accent, tracking: 0.06, uppercase: true }, after(0.2)),
    text('Other end', ends[1], { x: L + W - 520, y: line + 22, w: 520, h: 52, rot: 0 }, { font: st.body, weight: '700', size: 36, color: st.accent, tracking: 0.06, uppercase: true, align: 'right' }, after(0.2)),
  ];
  layers.push(...byClick(shown.map(([label, value, note], i) => {
    const x = L + W * (pos(value) / 100), up = rank.indexOf(i) % 2 === 0;
    const bx = Math.max(L, Math.min(L + W - labelW, x - labelW / 2));
    const top = up ? line - 40 - labelH : line + 96, stemTop = up ? top + labelH : line + 20, stemH = up ? line - 20 - stemTop : top - stemTop;
    const mark: Layer[] = [
      shape('Marker', { x: x - 20, y: line - 20, w: 40, h: 40, rot: 0 }, { shape: 'ellipse', fill: st.accent, stroke: st.ground, strokeWidth: 6 }),
      shape('Stem', { x: x - 1.5, y: stemTop, w: 3, h: Math.max(0, stemH), rot: 0 }, { shape: 'rect', fill: st.accent, fillOpacity: 0.6 }),
      text('Item', label, { x: bx, y: up ? top + labelH * 0.35 : top, w: labelW, h: labelH * 0.4, rot: 0 }, { font: st.body, weight: '700', size: 40, color: st.ink, align: 'center', valign: up ? 'bottom' : 'top', lineHeight: 1.15, fitGroup: 'spectrum-items' }),
    ];
    if (note) mark.push(body(st, note, { x: bx, y: up ? top + labelH * 0.75 : top + labelH * 0.42, w: labelW, h: labelH * 0.25, rot: 0 }, 36, { align: 'center', fit: 'shrink', fitGroup: 'spectrum-notes' }));
    return mark;
  }), uniq('spectrum'), clicks));
  if (source) layers.push(sourceLine(st, source));
  return slide(st, 'Spectrum', layers);
}
