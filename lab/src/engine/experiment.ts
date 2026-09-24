/*
 * SlideForge's visual experiments ("Transform the chart", src/render/experiments.js and
 * js/chart-motion.js), drawn by the lab. One table, several authored states — pie, bar, line, dots,
 * bubbles, hue, shape, tiles, table, network, field, geometry, classification — and each Next moves
 * to the next state. Every datum is a mark with a key and a 64-point outline, so between states it
 * travels and changes shape rather than being redrawn: matching marks, lines and labels tween their
 * geometry, colour and numbers; what the new state adds fades in and what it drops fades out.
 * Before the first state the room is asked to predict.
 */
import type { Params } from '../model/types';
import { drawRow, row, type Button } from './controls';

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export interface ExpState {
  label: string; kind: string; explanation?: string; series?: number; all?: boolean; categorical?: boolean;
  baseline?: number; clutter?: boolean; heavyGrid?: boolean; narrow?: boolean; start?: number; mono?: boolean;
  palette?: string; example?: string; hideValues?: boolean;
}
interface Preset { label: string; prompt: string; data: string; states: ExpState[] }

export const EXPERIMENTS: Record<string, Preset> = {
  polling: { label: 'Polling: pies to bars', prompt: 'Which candidate gains most across the polls?', data: 'Candidate\tPoll A\tPoll B\tPoll C\n1\t17\t20\t23\n2\t18\t20\t22\n3\t20\t19\t20\n4\t22\t21\t18\n5\t23\t20\t17', states: [
    { label: 'Poll A', kind: 'pie', series: 0, explanation: 'Compare candidates 5 and 3. How confident are you?' },
    { label: 'Poll B', kind: 'pie', series: 1, explanation: 'Which candidates improved? Comparing separate angles requires memory.' },
    { label: 'Poll C', kind: 'pie', series: 2, explanation: 'Now consider the trend across all three polls.' },
    { label: 'Same poll, lengths', kind: 'bar', series: 2, categorical: true, explanation: 'Watch each coloured slice become a bar. The Poll C values stay unchanged: only the encoding changes from angle to aligned length.' },
    { label: 'All polls together', kind: 'bar', all: true, series: 2, explanation: 'Now introduce all three polls; colour identifies the poll. Candidate 1 gains 6 percentage points from A to C. Candidate 2 gains 4. All bars share zero.' }] },
  integrity: { label: 'Integrity: change the baseline', prompt: 'The values stay at 100 and 110. How much bigger does the second bar look?', data: 'Group\tValue\nA\t100\nB\t110', states: [
    { label: 'Zero baseline', kind: 'bar', baseline: 0, explanation: '110 is 10% greater than 100. Bar lengths preserve that comparison.' },
    { label: 'Baseline at 90', kind: 'bar', baseline: 90, explanation: 'DELIBERATE DISTORTION: visible lengths are 10 and 20. A 10% data increase appears as a 100% length increase. Lie factor = 10.' },
    { label: 'Baseline at 95', kind: 'bar', baseline: 95, explanation: 'DELIBERATE DISTORTION: visible lengths are 5 and 15. The graphic shows a 200% increase. Lie factor = 20.' },
    { label: 'Restore context', kind: 'bar', baseline: 0, explanation: 'A bar encodes length. Restoring zero restores the relationship between length and quantity.' }] },
  clutter: { label: 'Clutter: clean up a chart', prompt: 'What gets your attention before you can compare the values?', data: 'Day\tHires\nMon\t42\nTue\t58\nWed\t47\nThu\t70\nFri\t64', states: [
    { label: 'Cluttered', kind: 'bar', clutter: true, explanation: 'Heavy gridlines and decorative labels compete with the data.' },
    { label: 'Remove decoration', kind: 'bar', heavyGrid: true, explanation: 'Watch the decorative labels disappear. The values, bar positions and scale have not changed. What still competes for attention?' },
    { label: 'Clear comparison', kind: 'bar', explanation: 'Same values and scale. Direct labels and a quiet baseline remain because they support the comparison.' }] },
  distortion: { label: 'Distortion: shape and range', prompt: 'Can the same observations appear to tell different stories?', data: 'Period\tValue\n1\t30\n2\t42\n3\t38\n4\t55\n5\t44\n6\t48', states: [
    { label: 'Complete series', kind: 'line', explanation: 'The whole six-period series shows fluctuations and an overall increase.' },
    { label: 'Compressed width', kind: 'line', narrow: true, explanation: 'The values and scale are unchanged. A narrow plot makes the slopes look steeper.' },
    { label: 'Selected ending', kind: 'line', start: 3, explanation: 'DELIBERATELY SELECTED RANGE: periods 4–6 suggest decline. The earlier observations provide different context.' }] },
  channels: { label: 'Marks and channels', prompt: 'Which encoding makes close quantities easiest to compare?', data: 'Item\tValue\nA\t20\nB\t24\nC\t38\nD\t42', states: [
    { label: 'Position', kind: 'dot', explanation: 'Points share a vertical scale. Compare their positions.' },
    { label: 'Area', kind: 'bubbles', explanation: 'Circle AREA represents value, so radius scales with the square root. Close comparisons become harder.' },
    { label: 'Hue only', kind: 'hue', explanation: 'Hue identifies categories but has no inherent numerical order. Labels are doing the quantitative work here.' },
    { label: 'Shape', kind: 'shape', explanation: 'Different symbols identify categories. Their shapes do not encode the numeric values.' },
    { label: 'Length', kind: 'bar', explanation: 'Bars encode the same quantities by length from a shared zero baseline.' }] },
  colour: { label: 'Colour schemes', prompt: 'Which palette expresses the structure of each attribute?', data: 'Region\tCount\tChange\nNorth\t20\t-12\nEast\t45\t-4\nSouth\t70\t5\nWest\t95\t16', states: [
    { label: 'Categorical', kind: 'tiles', palette: 'categorical', explanation: 'Different regions have different identities. The hues imply no order.' },
    { label: 'Sequential counts', kind: 'tiles', palette: 'sequential', explanation: 'Light to dark follows increasing counts. Values remain directly labelled.' },
    { label: 'Change in one ramp', kind: 'tiles', palette: 'sequential', series: 1, explanation: 'Switch attribute from counts to signed change. A single light-to-dark ramp orders values but does not emphasise zero. Predict how two colour directions could help.' },
    { label: 'Diverging change', kind: 'tiles', palette: 'diverging', series: 1, explanation: 'Blue and orange depart from a neutral zero midpoint. Negative and positive changes remain labelled.' }] },
  accessibility: { label: 'Colour plus a second cue', prompt: 'Can you still identify each group when the colour disappears?', data: 'Group\tValue\nNorth\t20\nEast\t24\nSouth\t38\nWest\t42', states: [
    { label: 'Colour and labels', kind: 'bar', categorical: true, explanation: 'Every group has a direct label as well as a colour.' },
    { label: 'Without colour', kind: 'bar', mono: true, explanation: 'Position and labels preserve meaning in greyscale. This demonstration is not a colour-vision-deficiency simulation.' }] },
  structures: { label: 'Dataset structures', prompt: 'What is an item, a link, a field or a spatial boundary?', data: 'Station\tHires\nA\t20\nB\t35\nC\t60\nD\t80', states: [
    { label: 'Table', kind: 'table', explanation: 'Each row is an item. Station is an identifier and hires is an attribute.' },
    { label: 'Network', kind: 'network', explanation: 'Nodes represent stations; lines represent hypothetical connections. Links need their own data.' },
    { label: 'Field', kind: 'field', explanation: 'A synthetic temperature field sampled across space. Each location has a value, rather than a named station.' },
    { label: 'Geometry', kind: 'geometry', explanation: 'Illustrative region boundaries describe shape and position. These are not real borough boundaries.' }] },
  types: { label: 'Attribute classification', prompt: 'Do the values have order, meaningful differences, or meaningful ratios?', data: 'Example\tValue\nStation ID\t0', states: [
    { label: 'Nominal', kind: 'classification', example: 'Station 12 • Station 7 • Station 3', explanation: 'Numbers can be names. Station 12 is not four times Station 3.' },
    { label: 'Ordinal', kind: 'classification', example: 'Low  ·  Medium  ·  High', explanation: 'Order is meaningful. Equal gaps are not guaranteed.' },
    { label: 'Interval', kind: 'classification', example: '10°C  ·  20°C  ·  30°C', explanation: 'Equal temperature differences are meaningful. 20°C is not twice as hot as 10°C on an absolute scale.' },
    { label: 'Ratio', kind: 'classification', example: '10 hires  ·  20 hires  ·  30 hires', explanation: 'Zero means no hires. Twenty hires is twice ten hires.' }] },
  zoom: { label: 'Chart overview and detail', prompt: 'What changes when we focus on part of the series?', data: 'Day\tHires\nMon\t20\nTue\t38\nWed\t32\nThu\t70\nFri\t64\nSat\t90', states: [
    { label: 'Overview', kind: 'line', explanation: 'Start with the complete series.' },
    { label: 'Focus on Thu–Sat', kind: 'line', start: 3, explanation: 'This is a filtered detail, not missing data. The visible range is labelled and the vertical scale stays fixed.' },
    { label: 'Return to overview', kind: 'line', explanation: 'Restore the whole series to judge the detail in context.' }] },
};

/** The states an experiment layer steps through: its own, else its preset's (up to eight). */
export function experimentStates(p: Params): ExpState[] {
  let own: ExpState[] = [];
  try { own = JSON.parse(String(p.states ?? '[]')); } catch { own = []; }
  const preset = EXPERIMENTS[String(p.preset)] ?? EXPERIMENTS.polling;
  return (Array.isArray(own) && own.length ? own : preset.states).slice(0, 8);
}

// ─── The picture of one state, as keyed elements on SlideForge's 1000 × 370 plan ───────────────
interface El {
  tag: 'poly' | 'text' | 'line' | 'rect';
  key?: string;
  pts?: number[][]; x?: number; y?: number; x2?: number; y2?: number; w?: number; h?: number;
  fill?: string; stroke?: string; sw?: number; fo?: number; so?: number;
  text?: string; size?: number; anchor?: 'start' | 'middle' | 'end'; num?: boolean;
}

const COLOURS = ['#0072b2', '#d55e00', '#009e73', '#cc79a7', '#8a6500', '#5b4ba8'];

function table(text: string) {
  const rows = String(text ?? '').split(/\r?\n/).filter((l) => l.trim()).map((l) => (l.includes('\t') ? l.split('\t') : l.split('|')).map((c) => c.trim()));
  if (rows.length < 2) return { categories: [] as string[], series: [] as { name: string; values: (number | null)[] }[] };
  const num = (c: string) => { const r = String(c ?? '').replace(/[,\s%£$€]/g, ''); if (!r) return null; const n = Number(r); return Number.isFinite(n) ? n : null; };
  return { categories: rows.slice(1).map((r) => r[0] ?? ''), series: rows[0].slice(1).filter((h) => h.trim()).map((name, i) => ({ name, values: rows.slice(1).map((r) => num(r[i + 1])) })) };
}

/** A mark's outline as 64 points, so any two marks can be tweened point for point. */
function outline(kind: 'circle' | 'sector' | 'rect' | 'polygon', a: { cx?: number; cy?: number; r?: number; start?: number; end?: number; x?: number; y?: number; w?: number; h?: number; v?: number[][] }): number[][] {
  const pts: number[][] = [];
  const verts = kind === 'rect' ? [[a.x!, a.y!], [a.x! + a.w!, a.y!], [a.x! + a.w!, a.y! + a.h!], [a.x!, a.y! + a.h!]] : a.v;
  for (let i = 0; i < 64; i++) {
    if (kind === 'circle') { const g = -Math.PI / 2 + (i / 64) * Math.PI * 2; pts.push([a.cx! + a.r! * Math.cos(g), a.cy! + a.r! * Math.sin(g)]); }
    else if (kind === 'sector') {
      const g = a.start! + (a.end! - a.start!) * Math.max(0, Math.min(1, (i - 8) / 47)), r = i < 8 ? (a.r! * i) / 8 : i > 55 ? (a.r! * (64 - i)) / 9 : a.r!;
      pts.push([a.cx! + r * Math.cos(g), a.cy! + r * Math.sin(g)]);
    } else { const q = (i / 64) * verts!.length, j = Math.floor(q), t = q - j, u = verts![j], v = verts![(j + 1) % verts!.length]; pts.push([u[0] + (v[0] - u[0]) * t, u[1] + (v[1] - u[1]) * t]); }
  }
  return pts;
}

function picture(p: Params, st: ExpState, ink: string): El[] {
  const els: El[] = [];
  const d = table(String(p.data ?? EXPERIMENTS[String(p.preset)]?.data ?? ''));
  const series = d.series;
  const current = series[Math.max(0, Math.min(series.length - 1, Number(st.series) || 0))];
  const rows = d.categories.slice(0, 12).map((name, i) => ({ name, index: i, value: current?.values[i] ?? NaN })).filter((r) => Number.isFinite(r.value));
  const text = (x: number, y: number, value: string | number, size = 22, anchor: El['anchor'] = 'start', key?: string) =>
    els.push({ tag: 'text', x, y, text: String(value), size, anchor, key, num: typeof value === 'number', fill: ink });
  const mark = (key: string, pts: number[][], fill: string, stroke?: string) => els.push({ tag: 'poly', key, pts, fill, stroke, sw: stroke ? 2 : 0 });
  const colour = (i: number) => (st.mono ? '#636363' : COLOURS[i % COLOURS.length]);
  if (st.kind === 'classification') { text(500, 150, st.example ?? '', 36, 'middle'); text(500, 220, st.label, 26, 'middle'); return els; }
  if (!rows.length) { text(500, 180, 'Add a table with category labels and numeric values.', 24, 'middle'); return els; }
  const all = series.flatMap((a) => a.values.filter((v): v is number => v != null && Number.isFinite(v)));
  const max = Math.max(1, ...all);
  const min = Math.min(0, ...(st.all ? all : rows.map((r) => r.value)));
  let baseline = Number.isFinite(Number(st.baseline)) && st.baseline !== undefined ? Number(st.baseline) : min;
  if (baseline >= max) baseline = min;
  const top = 50, bottom = 300;
  let left = 100, right = 930;
  if (st.narrow) { left = 350; right = 650; }
  const y = (v: number) => bottom - ((v - baseline) / (max - baseline)) * (bottom - top);
  if (st.kind === 'pie') {
    const sum = rows.reduce((a, r) => a + Math.max(0, r.value), 0);
    let angle = -Math.PI / 2;
    if (!sum || rows.some((r) => r.value < 0)) { text(500, 180, 'A pie needs positive parts of a whole.', 24, 'middle'); return els; }
    rows.forEach((r, i) => {
      const end = angle + (r.value / sum) * Math.PI * 2;
      mark(`mark:${r.index}`, outline('sector', { cx: 350, cy: 175, r: 145, start: angle, end }), colour(i), '#ffffff');
      text(570, 65 + i * 32, r.name, 21, 'start', `category:${r.index}`);
      text(760, 65 + i * 32, r.value, 21, 'middle', `value:${r.index}`);
      angle = end;
    });
    text(350, 355, current.name, 22, 'middle');
    return els;
  }
  if (st.kind === 'table') {
    text(180, 40, 'Station', 24); text(620, 40, current.name, 24);
    const rh = Math.min(55, 270 / rows.length);
    rows.forEach((r, i) => { text(180, 80 + i * rh, r.name, 20, 'start', `category:${r.index}`); text(620, 80 + i * rh, r.value, 20, 'middle', `value:${r.index}`); });
    return els;
  }
  if (st.kind === 'network') {
    const at = rows.map((_, i) => { const a = (i / rows.length) * Math.PI * 2; return { x: 500 + 330 * Math.cos(a), y: 175 + 115 * Math.sin(a) }; });
    at.forEach((q, i) => { if (i) els.push({ tag: 'line', x: at[i - 1].x, y: at[i - 1].y, x2: q.x, y2: q.y, stroke: ink, sw: 3 }); });
    rows.forEach((r, i) => { mark(`mark:${r.index}`, outline('circle', { cx: at[i].x, cy: at[i].y, r: 24 }), colour(i)); text(at[i].x, at[i].y + 45, r.name, 20, 'middle', `category:${r.index}`); });
    return els;
  }
  if (st.kind === 'geometry') {
    [[[100, 70], [390, 50], [430, 170], [120, 190]], [[390, 50], [790, 80], [870, 220], [430, 170]], [[120, 190], [430, 170], [480, 320], [150, 290]], [[430, 170], [870, 220], [800, 330], [480, 320]]]
      .forEach((v, i) => els.push({ tag: 'poly', pts: v, fill: colour(i), fo: 0.22, stroke: ink, sw: 3 }));
    text(500, 360, 'Illustrative boundaries; no measured quantity encoded', 19, 'middle');
    return els;
  }
  if (st.kind === 'field') {
    for (let yy = 0; yy < 6; yy++) for (let xx = 0; xx < 12; xx++) {
      const temp = 10 + xx + yy;
      els.push({ tag: 'rect', x: 100 + xx * 65, y: 20 + yy * 46, w: 64, h: 45, fill: `hsl(205,65%,${93 - (temp - 10) * 3.5}%)` });
      els.push({ tag: 'text', x: 132 + xx * 65, y: 49 + yy * 46, text: String(temp), size: 16, anchor: 'middle', fill: '#10202a' });
    }
    text(500, 340, 'Synthetic temperature samples (°C) across space', 22, 'middle');
    return els;
  }
  if (['tiles', 'bubbles', 'hue', 'shape'].includes(st.kind)) {
    const abs = Math.max(1, ...rows.map((r) => Math.abs(r.value)));
    rows.forEach((r, i) => {
      const x = 90 + ((i + 0.5) * 820) / rows.length;
      let fill = colour(i);
      if (st.palette === 'sequential') fill = `hsl(205,65%,${92 - ((r.value - min) / (max - min)) * 60}%)`;
      if (st.palette === 'diverging') fill = `hsl(${r.value < 0 ? 210 : 28},70%,${95 - (Math.abs(r.value) / abs) * 55}%)`;
      const key = `mark:${r.index}`;
      if (st.kind === 'bubbles') mark(key, outline('circle', { cx: x, cy: 150, r: Math.sqrt(Math.max(0, r.value) / max) * Math.min(85, 340 / rows.length) }), fill);
      else if (st.kind === 'hue') mark(key, outline('circle', { cx: x, cy: 150, r: Math.min(55, 340 / rows.length) }), fill);
      else if (st.kind === 'shape') {
        const rad = Math.min(45, 300 / rows.length);
        if (i % 4 === 0) mark(key, outline('circle', { cx: x, cy: 150, r: rad }), fill);
        else if (i % 4 === 1) mark(key, outline('rect', { x: x - rad, y: 150 - rad, w: rad * 2, h: rad * 2 }), fill);
        else mark(key, outline('polygon', { v: i % 4 === 2 ? [[x, 150 - rad], [x - rad, 150 + rad], [x + rad, 150 + rad]] : [[x, 150 - rad], [x + rad, 150], [x, 150 + rad], [x - rad, 150]] }), fill);
      } else { const tw = Math.min(130, 720 / rows.length); mark(key, outline('rect', { x: x - tw / 2, y: 80, w: tw, h: 140 }), fill); }
      text(x, 270, r.name, 21, 'middle', `category:${r.index}`);
      text(x, 305, r.value, 24, 'middle', `value:${r.index}`);
    });
    text(500, 360, st.palette === 'diverging' ? 'Blue: negative · neutral: zero · orange: positive' : current.name, 19, 'middle');
    return els;
  }
  const start = Math.min(rows.length - 1, Math.max(0, Math.floor(Number(st.start) || 0)));
  const shown = rows.slice(start);
  for (let tick = 0; tick <= 4; tick++) {
    const value = baseline + ((max - baseline) * tick) / 4, py = y(value), heavy = st.clutter || st.heavyGrid;
    els.push({ tag: 'line', key: `grid:${tick}`, x: left, y: py, x2: right, y2: py, stroke: ink, so: heavy ? 0.7 : 0.15, sw: heavy ? 3 : 1 });
    text(left - 12, py + 6, Math.round(value * 10) / 10, 18, 'end', `tick:${tick}`);
  }
  text(left, 25, current.name, 19);
  const points: { x: number; y: number; id: number }[] = [];
  shown.forEach((r, i) => {
    const x = left + ((i + 0.5) * (right - left)) / shown.length;
    if (st.kind === 'line' || st.kind === 'dot') {
      points.push({ x, y: y(r.value), id: r.index });
      mark(`mark:${r.index}`, outline('circle', { cx: x, cy: y(r.value), r: 7 }), colour(st.kind === 'dot' ? r.index : 0));
      text(x, y(r.value) - 15, r.value, 19, 'middle', `value:${r.index}`);
    } else {
      const ss = st.all ? series.slice(0, 4) : [current], space = ((right - left) / shown.length) * 0.7, w = space / ss.length;
      ss.forEach((a, j) => {
        const v = a.values[r.index];
        if (v == null || !Number.isFinite(v)) return;
        if (v < baseline) { text(x, 280, 'Below axis', 15, 'middle'); return; }
        const zero = y(Math.max(0, baseline)), suffix = st.all && j !== (Number(st.series) || 0) ? `:series${j}` : '';
        const fillI = st.all ? j : st.categorical || String(p.preset) === 'channels' ? r.index : 0;
        mark(`mark:${r.index}${suffix}`, outline('rect', { x: x - space / 2 + j * w, y: Math.min(y(v), zero), w: Math.max(2, w - 4), h: Math.abs(zero - y(v)) }), colour(fillI));
        text(x - space / 2 + j * w + w / 2, y(v) - 9, v, 17, 'middle', `value:${r.index}${suffix}`);
      });
    }
    text(x, 330, r.name, 19, 'middle', `category:${r.index}`);
    if (st.clutter) text(x, 65, '★ WOW ★', 18, 'middle', `clutter:${r.index}`);
  });
  if (st.kind === 'line') points.forEach((q, i) => { if (i) els.push({ tag: 'line', key: `connection:${points[i - 1].id}:${q.id}`, x: points[i - 1].x, y: points[i - 1].y, x2: q.x, y2: q.y, stroke: colour(0), sw: 3 }); });
  if (st.all) series.slice(0, 4).forEach((a, i) => { els.push({ tag: 'rect', x: 220 + i * 200, y: 349, w: 15, h: 15, fill: colour(i) }); text(245 + i * 200, 363, a.name, 18); });
  else text(500, 364, start ? `Visible range: ${shown[0].name}–${shown[shown.length - 1].name} (filtered from ${rows.length} observations)` : `Baseline: ${baseline}`, 18, 'middle');
  if (st.hideValues) return els.filter((e) => !e.key?.startsWith('value:'));
  return els;
}

// ─── Tweening two pictures, ChartMotion's way ──────────────────────────────────────────────────
function rgbOf(c: string): number[] | null {
  const h = c.match(/^#([0-9a-f]{6})$/i);
  if (h) { const n = parseInt(h[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  const s = c.match(/^hsl\(([\d.]+),([\d.]+)%,([\d.]+)%\)$/);
  if (s) {
    const hh = +s[1] / 360, ss = +s[2] / 100, l = +s[3] / 100;
    const q = l < 0.5 ? l * (1 + ss) : l + ss - l * ss, pp = 2 * l - q;
    const f = (t: number) => { t = (t + 1) % 1; return t < 1 / 6 ? pp + (q - pp) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? pp + (q - pp) * (2 / 3 - t) * 6 : pp; };
    return [f(hh + 1 / 3), f(hh), f(hh - 1 / 3)].map((v) => Math.round(v * 255));
  }
  return null;
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
function mixColour(a: string | undefined, b: string | undefined, t: number) {
  if (!a || !b) return b;
  const x = rgbOf(a), y = rgbOf(b);
  if (!x || !y) return b;
  return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i], t))).join(',')})`;
}
function tween(a: El, b: El, t: number): El {
  const out: El = { ...b };
  for (const k of ['x', 'y', 'x2', 'y2', 'w', 'h', 'sw', 'fo', 'so'] as const) if (a[k] !== undefined && b[k] !== undefined) out[k] = lerp(a[k]!, b[k]!, t);
  if (a.pts && b.pts && a.pts.length === b.pts.length) out.pts = b.pts.map((q, i) => [lerp(a.pts![i][0], q[0], t), lerp(a.pts![i][1], q[1], t)]);
  out.fill = t >= 1 ? b.fill : mixColour(a.fill, b.fill, t);
  if (b.num && a.text !== undefined && t < 1) { const x = Number(a.text), y = Number(b.text); if (Number.isFinite(x) && Number.isFinite(y)) out.text = String(Math.round(lerp(x, y, t) * 10) / 10); }
  return out;
}

function paint(ctx: Ctx, e: El, alpha: number, font: string, fs = 1) {
  if (alpha <= 0.001) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (e.tag === 'poly' && e.pts) {
    ctx.beginPath(); e.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
    if (e.fill) { ctx.save(); ctx.globalAlpha *= e.fo ?? 1; ctx.fillStyle = e.fill; ctx.fill(); ctx.restore(); }
    if (e.stroke && e.sw) { ctx.strokeStyle = e.stroke; ctx.lineWidth = e.sw; ctx.lineJoin = 'round'; ctx.stroke(); }
  } else if (e.tag === 'rect') {
    ctx.fillStyle = e.fill ?? '#000'; ctx.fillRect(e.x!, e.y!, e.w!, e.h!);
  } else if (e.tag === 'line') {
    ctx.globalAlpha *= e.so ?? 1; ctx.strokeStyle = e.stroke ?? '#000'; ctx.lineWidth = e.sw ?? 1;
    ctx.beginPath(); ctx.moveTo(e.x!, e.y!); ctx.lineTo(e.x2!, e.y2!); ctx.stroke();
  } else if (e.tag === 'text') {
    ctx.font = `500 ${(e.size ?? 22) * fs}px "${font}", system-ui, sans-serif`;
    ctx.textAlign = e.anchor === 'middle' ? 'center' : e.anchor === 'end' ? 'right' : 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = e.fill ?? '#000'; ctx.fillText(e.text ?? '', e.x!, e.y!);
  }
  ctx.restore();
}

/** Draw the plan's elements for the move from state `from` to state `to` at progress t (0–1). */
function scene(ctx: Ctx, p: Params, states: ExpState[], from: number, to: number, t: number, ink: string, font: string, fs: number) {
  const next = picture(p, states[to], ink);
  if (from < 0 || from === to || t >= 1) { next.forEach((e) => paint(ctx, e, 1, font, fs)); return; }
  const prev = picture(p, states[from], ink);
  const k = t * t * (3 - 2 * t);
  const before = new Map(prev.filter((e) => e.key).map((e) => [e.key!, e]));
  const used = new Set<string>();
  // Keyed marks travel; what only the old picture had fades out, what only the new has fades in.
  for (const e of next) {
    const a = e.key ? before.get(e.key) : undefined;
    if (a && a.tag === e.tag) { used.add(e.key!); paint(ctx, tween(a, e, k), 1, font, fs); }
    else paint(ctx, e, e.key ? k : 1, font, fs);
  }
  for (const e of prev) if (e.key && !used.has(e.key)) paint(ctx, e, 1 - k, font, fs);
}

/** Each encoding's small symbol on its button, so a student sees what the next state will be. */
const GLYPH: Record<string, string> = {
  pie: '\u25d4', bar: '\u25ae', line: '\u2571', dot: '\u2022', bubbles: '\u25cb', hue: '\u25d0', shape: '\u25c6', tiles: '\u25a6',
  table: '\u25a4', network: '\u22c8', field: '\u25a9', geometry: '\u2b21', classification: '#',
};

type Rect = { x: number; y: number; w: number; h: number };

/**
 * The layer's arrangement: the chart on the left at full height, and on the right a rail of steps —
 * Predict first, one button per state (lit while it shows), Replay change — stacked as a list, the
 * explanation of the state showing in a card beneath them, and the data's source at the foot.
 */
export function experimentControls(p: Params, w: number, h: number): { buttons: Button[]; px: number; plot: Rect; note: Rect; source: Rect } {
  const states = experimentStates(p), size = Number(p.size ?? 36), font = `"${String(p.font ?? 'Inter')}", system-ui, sans-serif`;
  const step = Math.max(-1, Math.min(states.length - 1, Math.round(Number(p._step ?? states.length - 1))));
  const railW = Math.min(620, w * 0.34), railX = w - railW;
  const labels = [
    { label: '? Predict first', action: 'state:-1', on: step < 0 },
    ...states.map((st, i) => ({ label: `${GLYPH[st.kind] ?? '\u25ae'} ${st.label}`, action: `state:${i}`, on: i === step })),
    { label: '\u21bb Replay change', action: 'replay', off: step < 0 },
  ];
  // A list: each button on its own line, as wide as its words; past five steps, two columns, so the
  // type can stay large. The type is set to fit about half the rail's height.
  const cols = labels.length > 5 ? 2 : 1, rows = Math.ceil(labels.length / cols);
  let px = Math.max(28, size * 0.85);
  const sourceH = size * 1.2;
  while (rows * px * 2.17 > h * 0.52 && px > 24) px -= 1;
  const bh = px * 1.75, gap = px * 0.42, colW = (railW - gap * (cols - 1)) / cols;
  const buttons = labels.map((l, i) => {
    const c = cols === 1 ? 0 : i < rows ? 0 : 1, r = cols === 1 ? i : i % rows;
    const b = row([l], railX + c * (colW + gap), r * (bh + gap), colW, px, font).buttons[0];
    return { ...b, h: bh };
  });
  const listH = rows * (bh + gap) - gap;
  const note = { x: railX, y: listH + size * 0.8, w: railW, h: h - listH - size * 0.8 - sourceH - size * 0.4 };
  return { buttons, px, plot: { x: 0, y: 0, w: railX - size * 1.2, h }, note, source: { x: railX, y: h - sourceH, w: railW, h: sourceH } };
}

/** Words wrapped to a width, shrunk (not below 24px) until they fit a height. */
function fitWords(ctx: Ctx, text: string, font: string, weight: number, px: number, w: number, h: number, lh = 1.3) {
  const wrap = (size: number) => {
    ctx.font = `${weight} ${size}px "${font}", system-ui, sans-serif`;
    const out: string[] = []; let line = '';
    for (const wd of text.split(' ')) { const tr = line ? `${line} ${wd}` : wd; if (ctx.measureText(tr).width > w && line) { out.push(line); line = wd; } else line = tr; }
    if (line) out.push(line);
    return out;
  };
  let size = px, lines = wrap(size);
  while (lines.length * size * lh > h && size > 24) { size -= 1; lines = wrap(size); }
  return { lines, size };
}

/**
 * The experiment layer: the plot on its 1000 × 370 plan scaled into the box, and the state's
 * explanation beneath it. `_step` is the state shown (−1 asks for a prediction), `_from` the state it
 * is moving from and `_k` how far, all injected by the renderer from the slide's clicks.
 */
export function drawExperiment(ctx: Ctx, w: number, h: number, p: Params) {
  const states = experimentStates(p);
  const ink = String(p.textColor ?? '#1a1a1a'), font = String(p.font ?? 'Inter'), size = Number(p.size ?? 36), accent = String(p.accent ?? '#0072b2');
  const step = Math.max(-1, Math.min(states.length - 1, Math.round(Number(p._step ?? states.length - 1))));
  const from = Math.round(Number(p._from ?? -1)), k = Math.max(0, Math.min(1, Number(p._k ?? 1)));
  const ctl = experimentControls(p, w, h), { plot, note, source } = ctl;
  drawRow(ctx, ctl.buttons, ctl.px, `"${font}", system-ui, sans-serif`, ink, accent);
  // The explanation: a card under the steps, marked on its edge in the accent.
  const say = step < 0 ? 'Make a prediction. Explain your reasoning, then reveal the first state.' : String(states[step].explanation ?? '');
  if (say) {
    const pad = size * 0.6;
    const f = fitWords(ctx, say, font, 400, size, note.w - pad * 2 - 6, note.h - pad * 2, 1.35);
    const cardH = Math.min(note.h, f.lines.length * f.size * 1.35 + pad * 2);
    ctx.save();
    ctx.globalAlpha = from >= 0 && from !== step ? Math.min(1, k * 2) : 1;
    ctx.fillStyle = ink.startsWith('#') && parseInt(ink.slice(1, 3), 16) > 128 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
    ctx.beginPath(); ctx.roundRect(note.x, note.y, note.w, cardH, 12); ctx.fill();
    ctx.fillStyle = accent; ctx.fillRect(note.x, note.y, 6, cardH);
    ctx.fillStyle = ink; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    f.lines.forEach((l, i) => ctx.fillText(l, note.x + pad + 6, note.y + pad + i * f.size * 1.35));
    ctx.restore();
  }
  const src = String(p.source ?? '').trim();
  if (src) {
    const f = fitWords(ctx, src, font, 400, Math.max(24, size * 0.72), source.w, source.h, 1.2);
    ctx.save(); ctx.globalAlpha = 0.62; ctx.fillStyle = ink; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
    ctx.font = `400 ${f.size}px "${font}", system-ui, sans-serif`;
    ctx.fillText(f.lines.join(' '), source.x, source.y + source.h, source.w);
    ctx.restore();
  }
  if (step < 0) {
    // Before the first state: a large question mark where the chart will be.
    ctx.save(); ctx.globalAlpha = 0.14; ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `800 ${Math.min(plot.h * 0.7, 520)}px "${font}", system-ui, sans-serif`;
    ctx.fillText('?', plot.x + plot.w / 2, plot.y + plot.h / 2);
    ctx.restore();
    return;
  }
  const sc = Math.min(plot.w / 1000, plot.h / 370), ox = plot.x + (plot.w - 1000 * sc) / 2, oy = plot.y + (plot.h - 370 * sc) / 2;
  // The plan's labels were set for a 1280-wide slide; here they are brought up to the text size.
  const fs = Math.max(1, (size * 0.8) / (20 * sc));
  ctx.save(); ctx.translate(ox, oy); ctx.scale(sc, sc);
  scene(ctx, p, states, from, step, k, ink, font, fs);
  ctx.restore();
}
