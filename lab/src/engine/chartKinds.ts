/*
 * SlideForge's chart idioms, drawn by the lab (src/render/charts.js and the data readers in
 * src/deck/content.js, ported). Each reads the table a SlideForge chart slide holds — first row names
 * the series, first column the categories, tab or | between cells — and draws on SlideForge's
 * 1180-wide plan, its height taken from the layer's box, so the rules behind it (a Sankey's
 * longest-path layers, Tukey's fences, a pictogram's clipped remainder, one scale across small
 * multiples) are SlideForge's. The type is the lab's: `size` is the label size on the slide.
 *
 * Colours come from a six-step categorical palette in fixed order (SlideForge's --chart-1..6, light
 * and dark steps), never cycled past six. A beat is what one click of a build lays down; when the
 * chart draws itself, beats arrive one after another.
 */
import type { Params } from '../model/types';

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/** SlideForge's categorical steps, validated for colour-vision deficiency on each ground. */
export const CHART_LIGHT = ['#BA0428', '#049F6C', '#DF5904', '#0C97B6', '#8B6404', '#006EB8'];
export const CHART_DARK = ['#CA042C', '#049F6C', '#B84701', '#1198B8', '#A77804', '#008DEB'];

/** The kinds drawn here, in the order the chart picker lists them. */
export const TABLE_KINDS = ['grouped', 'lines', 'stack', 'area', 'scatter', 'histogram', 'box', 'pictogram', 'radar', 'sankey', 'dumbbell', 'multiples', 'bullet', 'combo', 'treemap', 'waffle', 'matrix'] as const;
export const isTableKind = (k: string) => (TABLE_KINDS as readonly string[]).includes(k);
/** Kinds whose series are peers on the drawing, so a key names them (SlideForge's allowlist). */
const LEGEND = new Set(['grouped', 'lines', 'stack', 'area', 'combo', 'radar', 'bullet', 'scatter', 'dumbbell']);

// ─── Reading the table ──────────────────────────────────────────────────────
function rowsOf(text: string): string[][] {
  return String(text ?? '').split(/\r?\n/).filter((l) => l.trim()).slice(0, 200)
    .map((l) => (l.includes('\t') ? l.split('\t') : l.includes('|') ? l.split('|') : l.split(',')).map((c) => c.trim()));
}
function num(cell: unknown): number | null {
  const raw = String(cell ?? '').replace(/[,\s%£$€]/g, '');
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}
interface Data { categories: string[]; series: { name: string; values: (number | null)[] }[] }
function chartData(text: string): Data {
  const rows = rowsOf(text);
  if (rows.length < 2) return { categories: [], series: [] };
  const head = rows[0], body = rows.slice(1);
  const names = head.slice(1).filter((h) => h.trim());
  return { categories: body.map((r) => r[0] ?? ''), series: names.map((name, i) => ({ name, values: body.map((r) => num(r[i + 1])) })) };
}
function chartPoints(text: string) {
  const rows = rowsOf(text);
  if (rows.length < 2) return { series: [] as { name: string; points: { x: number; y: number; label: string }[] }[], xLabel: '' };
  const head = rows[0], body = rows.slice(1);
  const labelled = body.length > 0 && num(body[0][0]) == null, xCol = labelled ? 1 : 0;
  const names = head.slice(xCol + 1).filter((h) => h.trim());
  return {
    series: names.map((name, i) => ({ name, points: body.flatMap((r) => { const x = num(r[xCol]), y = num(r[xCol + 1 + i]); return x != null && y != null ? [{ x, y, label: labelled ? r[0] ?? '' : '' }] : []; }) })),
    xLabel: head[xCol] ?? '',
  };
}
function chartGroups(text: string) {
  const rows = rowsOf(text);
  if (!rows.length) return [];
  const body = rows.length > 1 && num(rows[0][1]) == null ? rows.slice(1) : rows;
  return body.map((r) => ({ name: r[0] ?? '', values: r.slice(1).map(num).filter((v): v is number => v != null).sort((a, b) => a - b) })).filter((g) => g.values.length);
}
function fiveNumber(s: number[]) {
  const q = (p: number) => { const pos = (s.length - 1) * p, lo = Math.floor(pos), hi = Math.ceil(pos); return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (pos - lo); };
  const q1 = q(0.25), median = q(0.5), q3 = q(0.75), iqr = q3 - q1, lf = q1 - 1.5 * iqr, hf = q3 + 1.5 * iqr;
  const inside = s.filter((v) => v >= lf && v <= hf);
  return { min: inside.length ? inside[0] : s[0], q1, median, q3, max: inside.length ? inside[inside.length - 1] : s[s.length - 1], outliers: s.filter((v) => v < lf || v > hf), n: s.length };
}
interface FNode { name: string; depth: number; in: number; out: number; total: number; x: number; y: number; h: number; inAt: number; outAt: number }
function chartFlows(text: string) {
  const links = rowsOf(text).flatMap((r) => { const v = num(r[2]); return r[0] && r[1] && v != null && v > 0 ? [{ from: r[0], to: r[1], value: v }] : []; });
  const names: string[] = [];
  links.forEach((l) => { if (!names.includes(l.from)) names.push(l.from); if (!names.includes(l.to)) names.push(l.to); });
  const nodes: FNode[] = names.map((name) => ({ name, depth: 0, in: 0, out: 0, total: 0, x: 0, y: 0, h: 0, inAt: 0, outAt: 0 }));
  const idx: Record<string, number> = {};
  nodes.forEach((n, i) => { idx[n.name] = i; });
  // Longest-path layering, bounded by the node count so a cycle stops rather than spins.
  for (let pass = 0; pass < nodes.length; pass++) {
    let moved = false;
    links.forEach((l) => { const a = nodes[idx[l.from]], b = nodes[idx[l.to]]; if (b.depth < a.depth + 1) { b.depth = a.depth + 1; moved = true; } });
    if (!moved) break;
  }
  links.forEach((l) => { nodes[idx[l.from]].out += l.value; nodes[idx[l.to]].in += l.value; });
  nodes.forEach((n) => { n.total = Math.max(n.in, n.out); });
  return { nodes, links, idx, layers: links.length ? Math.max(...nodes.map((n) => n.depth)) + 1 : 0 };
}
function chartValues(text: string) {
  return rowsOf(text).flatMap((r) => r.map(num).filter((v): v is number => v != null)).sort((a, b) => a - b);
}
function histogramBins(values: number[]) {
  if (!values.length) return [];
  const lo = values[0], hi = values[values.length - 1];
  if (hi === lo) return [{ from: lo, to: lo, count: values.length }];
  const n = Math.max(5, Math.min(14, Math.ceil(Math.log2(values.length) + 1))), width = (hi - lo) / n;
  const bins = Array.from({ length: n }, (_, i) => ({ from: lo + i * width, to: lo + (i + 1) * width, count: 0 }));
  values.forEach((v) => { bins[Math.min(n - 1, Math.floor((v - lo) / width))].count++; });
  return bins;
}

// ─── Scales ─────────────────────────────────────────────────────────────────
function niceMax(v: number) {
  if (!(v > 0)) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  return ([1, 2, 2.5, 5, 10].find((s) => s * mag >= v) ?? 10) * mag;
}
function niceStep(r: number) {
  if (!(r > 0)) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(r)));
  return ([1, 2, 2.5, 5, 10].find((m) => m * mag >= r) ?? 10) * mag;
}
function niceRange(lo: number, hi: number) {
  if (!(hi > lo)) return { lo: Math.min(0, lo), hi: (hi || 0) + 1 };
  const span = hi - lo, step = niceStep(span / 4);
  return { lo: lo >= 0 && lo <= span * 0.15 ? 0 : Math.floor(lo / step) * step, hi: Math.ceil((hi + span * 0.1) / step) * step };
}
const ticks = (max: number) => [0, 1, 2, 3, 4].map((i) => (max * i) / 4);
export function fmt(v: number | null | undefined) {
  if (v == null) return '';
  const a = Math.abs(v);
  if (a >= 1e6) return (v / 1e6).toFixed(a >= 1e7 ? 0 : 1) + 'M';
  if (a >= 1e4) return (v / 1e3).toFixed(0) + 'k';
  return String(Math.round(v * 100) / 100).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// ─── Drawing ────────────────────────────────────────────────────────────────
// The plan is 1180 wide, as SlideForge's is; its height follows the box, so a chart fills whatever
// box it is given rather than letterboxing SlideForge's 430. Set for each drawing.
const W = 1180;
let H = 430;
const P = { padL: 92, padR: 40, padT: 22, padB: 62 };

interface Pen {
  ctx: Ctx;
  col: (i: number) => string;
  ink: string; dim: string; rule: string; surface: string;
  /** Label type in plan units: SlideForge's 19px, scaled to the lab's label size. */
  px: number;
  font: string;
  /** How far beat i has arrived, 0–1: bars rise by it, lines draw along by it. */
  grow: (i: number) => number;
  beat: (i: number) => void;
  settle: () => void;
}

function rgba(hex: string, a: number) {
  const h = hex.replace('#', '');
  const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  const n = parseInt(f, 16);
  return Number.isFinite(n) ? `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})` : hex;
}

function label(p: Pen, s: string, x: number, y: number, anchor: 'start' | 'middle' | 'end' = 'start', opts: { size?: number; weight?: number; color?: string; halo?: boolean } = {}) {
  const { ctx } = p;
  ctx.font = `${opts.weight ?? 500} ${(opts.size ?? 1) * p.px}px "${p.font}", system-ui, sans-serif`;
  ctx.textAlign = anchor === 'middle' ? 'center' : anchor === 'end' ? 'right' : 'left';
  ctx.textBaseline = 'alphabetic';
  if (opts.halo) { ctx.lineWidth = 3; ctx.strokeStyle = p.surface; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
  ctx.fillStyle = opts.color ?? p.dim;
  ctx.fillText(s, x, y);
}
function line(p: Pen, x1: number, y1: number, x2: number, y2: number, stroke: string, width = 1) {
  const { ctx } = p;
  ctx.strokeStyle = stroke; ctx.lineWidth = width;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}
/** A column rounded 4px at its data end, square at the baseline. */
function column(p: Pen, x: number, y: number, w: number, h: number, fill: string) {
  const { ctx } = p, r = Math.min(4, w / 2, h);
  ctx.fillStyle = fill;
  ctx.beginPath(); ctx.roundRect(x, y, w, Math.max(0, h), [r, r, 0, 0]); ctx.fill();
}
/** The value axis with its gridlines: hairlines one step off the surface, never dashed. */
function valueGrid(p: Pen, max: number, padL: number, plotW: number, plotH: number, base = 0) {
  ticks(max).forEach((t) => {
    const y = P.padT + plotH - (t / max) * plotH;
    line(p, padL, y, padL + plotW, y, p.rule);
    label(p, fmt(base + t), padL - 14, y + p.px * 0.37, 'end');
  });
}
const baseline = (p: Pen, padL: number, plotW: number, plotH: number) => line(p, padL, P.padT + plotH, padL + plotW, P.padT + plotH, p.rule, 1.5);
const longestOf = (xs: string[]) => xs.reduce((n, c) => Math.max(n, String(c).length), 0);

function grouped(p: Pen, d: Data) {
  const plotW = W - P.padL - P.padR, plotH = H - P.padT - P.padB;
  const max = niceMax(Math.max(0, ...d.series.flatMap((s) => s.values.filter((v): v is number => v != null))));
  valueGrid(p, max, P.padL, plotW, plotH);
  const band = plotW / Math.max(1, d.categories.length), n = d.series.length;
  const groupW = Math.min(band * 0.62, 78 * n), barW = Math.max(6, (groupW - (n - 1) * 2) / n);
  d.categories.forEach((cat, ci) => {
    const x0 = P.padL + band * ci + (band - groupW) / 2;
    d.series.forEach((s, si) => {
      const v = s.values[ci];
      if (v == null) return;
      const b = n > 1 ? si : ci;
      p.beat(b);
      const h = Math.max(0, (v / max) * plotH) * p.grow(b), x = x0 + si * (barW + 2), y = P.padT + plotH - h;
      column(p, x, y, barW, h, p.col(si));
      if (n === 1) label(p, fmt(v), x + barW / 2, y - 12, 'middle', { weight: 650, color: p.ink, size: 1.05 });
      p.settle();
    });
    label(p, cat, P.padL + band * ci + band / 2, H - P.padB + 30, 'middle');
  });
  baseline(p, P.padL, plotW, plotH);
}

function stacked(p: Pen, d: Data) {
  const plotW = W - P.padL - P.padR, plotH = H - P.padT - P.padB;
  const totals = d.categories.map((_, ci) => d.series.reduce((t, s) => t + Math.max(0, s.values[ci] ?? 0), 0));
  const max = niceMax(Math.max(0, ...totals));
  valueGrid(p, max, P.padL, plotW, plotH);
  const band = plotW / Math.max(1, d.categories.length), barW = Math.min(band * 0.62, 120);
  d.categories.forEach((cat, ci) => {
    const x = P.padL + band * ci + (band - barW) / 2;
    let run = 0;
    d.series.forEach((s, si) => {
      const v = s.values[ci];
      if (v == null || v <= 0) return;
      p.beat(si);
      // Each layer rises from the top of the one beneath it.
      const h = (v / max) * plotH * p.grow(si), y = P.padT + plotH - (run / max) * plotH - h;
      p.ctx.fillStyle = p.col(si);
      p.ctx.fillRect(x, y, barW, h);
      // Only where the band is deep enough to hold it.
      if (h > p.px * 1.35) label(p, fmt(v), x + barW / 2, y + h / 2 + p.px * 0.32, 'middle', { weight: 650, color: '#ffffff', size: 1.05 });
      p.settle();
      run += v;
    });
    label(p, cat, P.padL + band * ci + band / 2, H - P.padB + 30, 'middle');
  });
  baseline(p, P.padL, plotW, plotH);
}

function lines(p: Pen, d: Data, area: boolean) {
  const labelRoom = Math.min(230, 18 + longestOf(d.series.map((s) => s.name)) * 10.5 * (p.px / 19));
  const plotW = W - P.padL - P.padR - labelRoom, plotH = H - P.padT - P.padB;
  // An area stacks, SlideForge's note says: read the top edge as the total and the bands as its parts.
  const stackUp = area && d.series.length > 1;
  const tops = d.categories.map((_, ci) => d.series.reduce((t, s) => t + Math.max(0, s.values[ci] ?? 0), 0));
  const max = niceMax(stackUp ? Math.max(0, ...tops) : Math.max(0, ...d.series.flatMap((s) => s.values.filter((v): v is number => v != null))));
  valueGrid(p, max, P.padL, plotW, plotH);
  const cols = Math.max(1, d.categories.length - 1);
  const xAt = (i: number) => P.padL + (plotW * i) / cols, yAt = (v: number) => P.padT + plotH - (v / max) * plotH;
  d.categories.forEach((cat, i) => label(p, cat, xAt(i), H - P.padB + 30, 'middle'));
  const run = d.categories.map(() => 0);
  const ends: { x: number; y: number; name: string; si: number }[] = [];
  d.series.forEach((s, si) => {
    const low = [...run];
    const pts: [number, number, number][] = [];
    s.values.forEach((v, i) => { if (v == null) return; const top = stackUp ? run[i] + Math.max(0, v) : v; if (stackUp) run[i] = top; pts.push([xAt(i), yAt(top), i]); });
    if (!pts.length) return;
    p.beat(si);
    const { ctx } = p;
    // The series draws along from the left, its area with it.
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, P.padL + (plotW + 12) * p.grow(si), H); ctx.clip();
    if (area) {
      ctx.fillStyle = rgba(p.col(si), stackUp ? 0.55 : 0.22);
      ctx.beginPath();
      pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      for (let k = pts.length - 1; k >= 0; k--) ctx.lineTo(pts[k][0], stackUp ? yAt(low[pts[k][2]]) : P.padT + plotH);
      ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = p.col(si); ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
    if (!stackUp) pts.forEach(([x, y]) => { ctx.fillStyle = p.col(si); ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill(); });
    ctx.restore();
    p.settle();
    const e = pts[pts.length - 1];
    ends.push({ x: e[0], y: stackUp ? (e[1] + yAt(low[e[2]])) / 2 : e[1], name: s.name, si });
  });
  // End labels only while the lines separate at the right edge; the key carries identity otherwise.
  const sorted = [...ends].sort((a, b) => a.y - b.y);
  if (!sorted.some((e, i) => i && e.y - sorted[i - 1].y < p.px * 1.35)) ends.forEach((e) => { p.beat(e.si); label(p, e.name, e.x + 14, e.y + p.px * 0.32, 'start', { weight: 600 }); p.settle(); });
  baseline(p, P.padL, plotW, plotH);
}

function scatter(p: Pen, text: string) {
  const d = chartPoints(text);
  const plotW = W - P.padL - P.padR, plotH = H - P.padT - P.padB;
  const xs = d.series.flatMap((s) => s.points.map((q) => q.x)), ys = d.series.flatMap((s) => s.points.map((q) => q.y));
  if (!xs.length) return;
  const xr = niceRange(Math.min(...xs), Math.max(...xs)), yr = niceRange(Math.min(...ys), Math.max(...ys));
  const xAt = (v: number) => P.padL + ((v - xr.lo) / (xr.hi - xr.lo || 1)) * plotW;
  const yAt = (v: number) => P.padT + plotH - ((v - yr.lo) / (yr.hi - yr.lo || 1)) * plotH;
  ticks(yr.hi - yr.lo).forEach((t) => { const y = yAt(yr.lo + t); line(p, P.padL, y, P.padL + plotW, y, p.rule); label(p, fmt(yr.lo + t), P.padL - 14, y + p.px * 0.37, 'end'); });
  ticks(xr.hi - xr.lo).forEach((t) => label(p, fmt(xr.lo + t), xAt(xr.lo + t), H - P.padB + 30, 'middle'));
  // Labels nudged up until they clear the ones placed, a leader keeping each on its dot.
  const placed: { x: number; y: number; w: number }[] = [];
  const small = 15 / 19;
  d.series.forEach((s, si) => {
    p.beat(si);
    s.points.forEach((pt) => {
      const cx = xAt(pt.x), cy = yAt(pt.y), r = 9;
      p.ctx.fillStyle = p.col(si); p.ctx.beginPath(); p.ctx.arc(cx, cy, r, 0, Math.PI * 2); p.ctx.fill();
      if (!pt.label) return;
      p.ctx.font = `600 ${p.px * small}px "${p.font}"`;
      const wide = p.ctx.measureText(pt.label).width, step = p.px * small * 1.15;
      let ly = cy - r - 9, guard = 0;
      while (guard++ < 24 && placed.some((q) => Math.abs(q.y - ly) < step && Math.abs(q.x - cx) < (q.w + wide) / 2 + 6)) ly -= step;
      placed.push({ x: cx, y: ly, w: wide });
      if (cy - r - ly > step) line(p, cx, cy - r, cx, ly + 4, p.rule);
      label(p, pt.label, cx, ly, 'middle', { size: small, weight: 600, color: p.ink });
    });
    p.settle();
  });
  if (d.xLabel) label(p, d.xLabel, P.padL + plotW / 2, H - 6, 'middle', { weight: 600 });
  baseline(p, P.padL, plotW, plotH);
  line(p, P.padL, P.padT, P.padL, P.padT + plotH, p.rule, 1.5);
}

function histogram(p: Pen, text: string) {
  const vals = chartValues(text), bins = histogramBins(vals);
  if (!bins.length) return;
  const plotW = W - P.padL - P.padR, plotH = H - P.padT - P.padB;
  const max = niceMax(Math.max(...bins.map((b) => b.count)));
  valueGrid(p, max, P.padL, plotW, plotH);
  const bw = plotW / bins.length;
  // Bars touching: the axis is continuous, and a gap would say these are separate categories.
  bins.forEach((b, i) => {
    p.beat(i);
    const h = (b.count / max) * plotH * p.grow(i);
    p.ctx.fillStyle = p.col(0);
    p.ctx.fillRect(P.padL + i * bw, P.padT + plotH - h, Math.max(1, bw - 1), Math.max(0, h));
    p.settle();
    if (i === 0 || i === bins.length - 1 || i % 2 === 0) label(p, fmt(Math.round(b.from * 10) / 10), P.padL + i * bw, H - P.padB + 30, 'middle');
  });
  label(p, `${vals.length} values · ${bins.length} bins`, P.padL + plotW, P.padT - 8, 'end');
  baseline(p, P.padL, plotW, plotH);
}

function box(p: Pen, text: string) {
  const groups = chartGroups(text);
  if (!groups.length) return;
  const all = groups.flatMap((g) => g.values), rng = niceRange(Math.min(...all), Math.max(...all));
  const plotW = W - P.padL - P.padR, plotH = H - P.padT - P.padB;
  const yAt = (v: number) => P.padT + plotH - ((v - rng.lo) / (rng.hi - rng.lo || 1)) * plotH;
  ticks(rng.hi - rng.lo).forEach((t) => { const y = yAt(rng.lo + t); line(p, P.padL, y, P.padL + plotW, y, p.rule); label(p, fmt(rng.lo + t), P.padL - 14, y + p.px * 0.37, 'end'); });
  const band = plotW / groups.length, bw = Math.min(band * 0.5, 130);
  groups.forEach((g, i) => {
    const f = fiveNumber(g.values), cx = P.padL + band * i + band / 2, x = cx - bw / 2, col = p.col(i), { ctx } = p;
    p.beat(i);
    // Whisker, then box, then median: the median has to sit above the fill.
    line(p, cx, yAt(f.min), cx, yAt(f.max), col, 2);
    line(p, cx - bw / 4, yAt(f.min), cx + bw / 4, yAt(f.min), col, 2);
    line(p, cx - bw / 4, yAt(f.max), cx + bw / 4, yAt(f.max), col, 2);
    ctx.fillStyle = rgba(col, 0.32); ctx.strokeStyle = col; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(x, yAt(f.q3), bw, Math.max(1, yAt(f.q1) - yAt(f.q3)), 3); ctx.fill(); ctx.stroke();
    ctx.lineCap = 'round'; line(p, x, yAt(f.median), x + bw, yAt(f.median), col, 5); ctx.lineCap = 'butt';
    f.outliers.forEach((v) => { ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, yAt(v), 5, 0, Math.PI * 2); ctx.stroke(); });
    p.settle();
    label(p, `${g.name} · n=${f.n}`, cx, H - P.padB + 30, 'middle');
  });
  baseline(p, P.padL, plotW, plotH);
}

function pictogram(p: Pen, d: Data, params: Params) {
  const icon = String(params.icon ?? '').trim() || '●';
  const vals = (d.series[0]?.values ?? []).map((v) => Math.max(0, v ?? 0));
  if (!vals.length) return;
  const max = Math.max(...vals);
  // A unit that keeps the longest row inside about twenty icons, unless one is set.
  const unit = Number(params.unit) > 1 ? Number(params.unit) : Math.max(1, Math.pow(10, Math.max(0, Math.ceil(Math.log10(Math.max(1, max / 20))))));
  p.ctx.font = `500 ${p.px}px "${p.font}"`;
  const labelRoom = Math.min(360, 40 + Math.max(...d.categories.map((c) => p.ctx.measureText(c).width)));
  const rowH = Math.min(78, (H - P.padT - P.padB) / Math.max(1, d.categories.length)), size = Math.min(rowH * 0.74, 46), stepX = size * 0.92;
  const { ctx } = p;
  d.categories.forEach((cat, ci) => {
    const y = P.padT + rowH * ci + rowH / 2;
    label(p, cat, labelRoom - 16, y + p.px * 0.37, 'end');
    p.beat(ci);
    const whole = Math.floor(vals[ci] / unit), part = (vals[ci] % unit) / unit;
    ctx.font = `400 ${size}px "${p.font}", system-ui, sans-serif`; ctx.textAlign = 'left'; ctx.fillStyle = p.ink;
    // The icons are counted out, one after another.
    const shown = Math.ceil(Math.min(whole, 40) * p.grow(ci) - 1e-9);
    for (let i = 0; i < shown; i++) ctx.fillText(icon, labelRoom + i * stepX, y + size * 0.34);
    // The remainder as a clipped icon: a smaller one would encode the value in area again.
    if (part > 0.08 && whole < 40 && p.grow(ci) >= 1) {
      ctx.save(); ctx.beginPath(); ctx.rect(labelRoom + whole * stepX, y - size * 0.7, Math.max(1, size * part), size * 1.3); ctx.clip();
      ctx.fillText(icon, labelRoom + whole * stepX, y + size * 0.34); ctx.restore();
    }
    label(p, fmt(vals[ci]), labelRoom + Math.min(whole + 1, 41) * stepX + 12, y + p.px * 0.37, 'start', { weight: 650, color: p.ink, size: 1.05 });
    p.settle();
  });
  label(p, `${icon} = ${fmt(unit)}${d.series[0]?.name ? ' ' + d.series[0].name.toLowerCase() : ''}`, labelRoom, H - 10);
}

function radar(p: Pen, d: Data) {
  const axes = d.categories.length;
  if (axes < 3) return;
  const cx = W / 2, cy = H / 2 + 6, R = Math.min(H / 2 - 34 - p.px * 0.4, W * 0.24);
  const max = niceMax(Math.max(0, ...d.series.flatMap((s) => s.values.filter((v): v is number => v != null))));
  const ang = (i: number) => -Math.PI / 2 + (i / axes) * Math.PI * 2;
  const at = (i: number, v: number) => { const r = (Math.max(0, v) / max) * R; return [cx + r * Math.cos(ang(i)), cy + r * Math.sin(ang(i))] as const; };
  const { ctx } = p;
  // A web, not circles: a polygon read against a circular grid looks bowed where it is straight.
  [0.25, 0.5, 0.75, 1].forEach((f) => {
    ctx.strokeStyle = p.rule; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 0; i < axes; i++) { const x = cx + R * f * Math.cos(ang(i)), y = cy + R * f * Math.sin(ang(i)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.closePath(); ctx.stroke();
  });
  for (let i = 0; i < axes; i++) {
    const e = at(i, max); line(p, cx, cy, e[0], e[1], p.rule);
    const lr = R + 26, c = Math.cos(ang(i));
    label(p, d.categories[i], cx + lr * c, cy + lr * Math.sin(ang(i)) + p.px * 0.3, c < -0.25 ? 'end' : c > 0.25 ? 'start' : 'middle');
  }
  label(p, fmt(max), cx + 6, cy - R + 4);
  d.series.forEach((s, si) => {
    p.beat(si);
    const g = p.grow(si);
    ctx.beginPath();
    for (let i = 0; i < axes; i++) { const q = at(i, (s.values[i] ?? 0) * g); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }
    ctx.closePath();
    ctx.fillStyle = rgba(p.col(si), 0.18); ctx.fill();
    ctx.strokeStyle = p.col(si); ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.stroke();
    for (let i = 0; i < axes; i++) { const q = at(i, (s.values[i] ?? 0) * g); ctx.fillStyle = p.col(si); ctx.beginPath(); ctx.arc(q[0], q[1], 5, 0, Math.PI * 2); ctx.fill(); }
    p.settle();
  });
}

function sankey(p: Pen, text: string) {
  const f = chartFlows(text);
  if (!f.links.length) return;
  const padT = 18, padB = 26, left = 6, right = 6, plotH = H - padT - padB, nodeW = 16, gap = 16;
  const byLayer = Array.from({ length: f.layers }, (_, d) => f.nodes.filter((n) => n.depth === d));
  // The fullest layer decides the scale, so every band keeps the same units per pixel.
  const heaviest = Math.max(...byLayer.map((c) => c.reduce((t, n) => t + n.total, 0)));
  const tallest = Math.max(...byLayer.map((c) => c.length));
  const perUnit = (plotH - (tallest - 1) * gap) / (heaviest || 1);
  const colX = (d: number) => left + (f.layers === 1 ? 0 : d * ((W - left - right - nodeW) / (f.layers - 1)));
  byLayer.forEach((c, d) => {
    c.sort((a, b) => b.total - a.total);
    const used = c.reduce((t, n) => t + n.total * perUnit, 0) + (c.length - 1) * gap;
    let y = padT + (plotH - used) / 2;
    c.forEach((n) => { n.x = colX(d); n.y = y; n.h = Math.max(2, n.total * perUnit); n.inAt = n.outAt = n.y; y += n.h + gap; });
  });
  const { ctx } = p;
  // Ribbons first and thickest first, so a thick flow cannot hide a thin one; level at both ends.
  [...f.links].sort((a, b) => b.value - a.value).forEach((l) => {
    const a = f.nodes[f.idx[l.from]], b = f.nodes[f.idx[l.to]], t = l.value * perUnit;
    const x1 = a.x + nodeW, x2 = b.x, y1 = a.outAt, y2 = b.inAt, mx = (x1 + x2) / 2;
    a.outAt += t; b.inAt += t;
    p.beat(a.depth);
    ctx.fillStyle = rgba(p.col(a.depth % 6), 0.44);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.bezierCurveTo(mx, y1, mx, y2, x2, y2); ctx.lineTo(x2, y2 + t); ctx.bezierCurveTo(mx, y2 + t, mx, y1 + t, x1, y1 + t); ctx.closePath(); ctx.fill();
    p.settle();
  });
  f.nodes.forEach((n) => {
    p.beat(Math.max(0, n.depth - 1));
    ctx.fillStyle = p.col(n.depth % 6); ctx.fillRect(n.x, n.y, nodeW, n.h);
    // Labels outside their column, except the last, which has nothing to its right.
    const last = n.depth === f.layers - 1;
    label(p, `${n.name} · ${fmt(n.total)}`, last ? n.x - 10 : n.x + nodeW + 10, n.y + n.h / 2 + p.px * 0.3, last ? 'end' : 'start', { color: p.ink, halo: true });
    p.settle();
  });
}

function dumbbell(p: Pen, d: Data) {
  if (d.series.length < 2) return;
  const [a, b] = d.series, vals = [...a.values, ...b.values].filter((v): v is number => v != null);
  if (!vals.length) return;
  const rng = niceRange(Math.min(...vals), Math.max(...vals));
  p.ctx.font = `500 ${p.px}px "${p.font}"`;
  const padL = Math.min(380, 40 + Math.max(...d.categories.map((c) => p.ctx.measureText(c).width)));
  const plotW = W - padL - P.padR, plotH = H - P.padT - P.padB;
  const sx = (v: number) => padL + ((v - rng.lo) / (rng.hi - rng.lo || 1)) * plotW, rowH = plotH / Math.max(1, d.categories.length);
  ticks(rng.hi - rng.lo).forEach((t) => { const x = sx(rng.lo + t); line(p, x, P.padT - 6, x, P.padT + plotH - rowH / 2 + 6, p.rule); label(p, fmt(rng.lo + t), x, P.padT + plotH + 18 + p.px * 0.3, 'middle'); });
  d.categories.forEach((cat, i) => {
    const va = a.values[i], vb = b.values[i];
    if (va == null || vb == null) return;
    const y = P.padT + rowH * i + 10 + rowH * 0.2, lo = Math.min(sx(va), sx(vb)), hi = Math.max(sx(va), sx(vb));
    p.beat(i);
    // The gap opens from the first state to the second.
    const g = p.grow(i), from = sx(va), to = from + (sx(vb) - from) * g;
    p.ctx.lineCap = 'round'; line(p, Math.min(from, to), y, Math.max(from, to), y, rgba(p.ink, 0.28), 4); p.ctx.lineCap = 'butt';
    [[from, 0], [to, 1]].forEach(([x, k]) => { p.ctx.fillStyle = p.col(k); p.ctx.beginPath(); p.ctx.arc(x, y, 8, 0, Math.PI * 2); p.ctx.fill(); });
    // The gap named, not just shown: the number is what gets quoted.
    if (hi - lo > 54) label(p, fmt(Math.abs(va - vb)), (lo + hi) / 2, y - 12, 'middle');
    label(p, cat, padL - 14, y + p.px * 0.32, 'end');
    p.settle();
  });
}

const ORDINAL = ['none', 'very low', 'weak', 'low', 'l', 'medium', 'med', 'moderate', 'm', 'high', 'h', 'strong', 'very high', 'severe'];
function matrix(p: Pen, text: string) {
  const rows = rowsOf(text);
  if (rows.length < 2) return;
  const head = rows[0], body = rows.slice(1), cols = head.slice(1).filter((h) => h.trim());
  if (!cols.length) return;
  // One scale across the matrix, ordered by the words where they are known.
  const seen: string[] = [];
  body.forEach((r) => cols.forEach((_, j) => { const v = (r[j + 1] ?? '').trim(); if (v && !seen.includes(v)) seen.push(v); }));
  const ordered = [...seen].sort((x, y) => { const ix = ORDINAL.indexOf(x.toLowerCase()), iy = ORDINAL.indexOf(y.toLowerCase()); return ix >= 0 && iy >= 0 ? ix - iy : ix >= 0 ? -1 : iy >= 0 ? 1 : seen.indexOf(x) - seen.indexOf(y); });
  const rank: Record<string, number> = {};
  ordered.forEach((v, i) => { rank[v] = ordered.length > 1 ? i / (ordered.length - 1) : 1; });
  p.ctx.font = `500 ${p.px}px "${p.font}"`;
  const padL = Math.min(380, 30 + Math.max(...body.map((r) => p.ctx.measureText(r[0] ?? '').width)));
  const plotW = W - padL - P.padR, plotH = H - P.padT - 12 - p.px * 1.6;
  const cw = plotW / cols.length, rh = Math.min(p.px * 2.2, plotH / Math.max(1, body.length));
  cols.forEach((c, j) => label(p, c, padL + cw * j + cw / 2, P.padT + p.px, 'middle'));
  body.forEach((r, i) => {
    const y = P.padT + p.px * 1.6 + rh * i;
    p.beat(i);
    label(p, r[0] ?? '', padL - 12, y + rh * 0.62, 'end');
    cols.forEach((_, j) => {
      const v = (r[j + 1] ?? '').trim();
      if (!v) return;
      const t = rank[v] ?? 0;
      p.ctx.fillStyle = rgba(p.col(0), 0.16 + t * 0.78);
      p.ctx.beginPath(); p.ctx.roundRect(padL + cw * j + 4, y, Math.max(8, cw - 8), rh - 6, 5); p.ctx.fill();
      label(p, v, padL + cw * j + cw / 2, y + rh * 0.62, 'middle', { weight: 600, color: t > 0.55 ? '#ffffff' : p.ink, size: 0.9 });
    });
    p.settle();
  });
}

function multiples(p: Pen, d: Data) {
  const panels = d.categories.map((name, i) => ({ name, values: d.series.map((s) => s.values[i]) })).filter((q) => q.values.some((v) => v != null));
  if (!panels.length || d.series.length < 2) return;
  const all = panels.flatMap((q) => q.values.filter((v): v is number => v != null)), rng = niceRange(Math.min(...all), Math.max(...all));
  // Wide before tall: a row of panels is read left to right like a sentence.
  const cols = Math.min(panels.length, panels.length <= 4 ? panels.length : Math.ceil(Math.sqrt(panels.length * 1.9)));
  const rows = Math.ceil(panels.length / cols), padTop = 26, padBottom = 34 + p.px * 0.4;
  const cellW = (W - 36) / cols, cellH = (H - padTop - padBottom) / rows, plotW = cellW - 30, plotH = Math.max(22, cellH - 48 - p.px);
  const small = 0.8;
  panels.forEach((q, i) => {
    const cx = 18 + (i % cols) * cellW, cy = padTop + Math.floor(i / cols) * cellH, n = q.values.length;
    const sx = (j: number) => cx + 14 + (n < 2 ? plotW / 2 : (plotW * j) / (n - 1));
    const sy = (v: number) => cy + 26 + p.px * 0.5 + plotH - ((v - rng.lo) / (rng.hi - rng.lo || 1)) * plotH;
    p.beat(i);
    label(p, q.name, cx + 14, cy + 12, 'start', { weight: 650, color: p.ink });
    [rng.lo, rng.hi].forEach((v) => line(p, sx(0), sy(v), sx(n - 1), sy(v), p.rule));
    const present = q.values.filter((v): v is number => v != null), first = present[0], last = present[present.length - 1];
    // Flat is a band, not an exact tie: two per cent of the shared range.
    const slack = (rng.hi - rng.lo) * 0.02;
    const col = first == null || last == null || Math.abs(last - first) <= slack ? p.dim : last > first ? '#C83D77' : '#477F54';
    const pts = q.values.flatMap((v, j) => (v == null ? [] : [[sx(j), sy(v), v, j] as const]));
    const { ctx } = p;
    if (pts.length > 1) { ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.beginPath(); pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); }
    pts.forEach(([x, y, v, j]) => {
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill();
      if (j === 0 || j === n - 1) label(p, fmt(v), x, y - 8, j === 0 ? 'start' : 'end', { size: small, weight: 600, color: p.ink });
    });
    [0, n - 1].forEach((j) => label(p, d.series[j]?.name ?? '', sx(j), cy + 26 + p.px * 0.5 + plotH + p.px * 0.9, j === 0 ? 'start' : 'end', { size: small }));
    p.settle();
  });
  label(p, `Every panel on the same ${fmt(rng.lo)}–${fmt(rng.hi)} scale · rose, fell or held is shown by colour`, 18, H - 8, 'start', { size: small });
}

function layoutTreemap(nodes: { name: string; value: number; i: number }[], x: number, y: number, w: number, h: number): { name: string; value: number; i: number; x: number; y: number; w: number; h: number }[] {
  if (!nodes.length) return [];
  if (nodes.length === 1) return [{ ...nodes[0], x, y, w, h }];
  const total = nodes.reduce((t, n) => t + n.value, 0);
  let acc = 0, mid = 0;
  for (let i = 0; i < nodes.length; i++) { acc += nodes[i].value; mid = i; if (acc >= total / 2) break; }
  const leftN = nodes.slice(0, mid + 1), rightN = nodes.slice(mid + 1);
  if (!rightN.length) return [{ ...nodes[0], x, y, w, h }];
  const ratio = leftN.reduce((t, n) => t + n.value, 0) / total;
  return w >= h
    ? [...layoutTreemap(leftN, x, y, w * ratio, h), ...layoutTreemap(rightN, x + w * ratio, y, w * (1 - ratio), h)]
    : [...layoutTreemap(leftN, x, y, w, h * ratio), ...layoutTreemap(rightN, x, y + h * ratio, w, h * (1 - ratio))];
}
function treemap(p: Pen, d: Data) {
  const s = d.series[0];
  if (!s) return;
  const nodes = d.categories.flatMap((name, i) => { const v = s.values[i]; return v != null && v > 0 ? [{ name, value: v, i }] : []; }).sort((a, b) => b.value - a.value);
  const total = nodes.reduce((t, n) => t + n.value, 0);
  if (!total) return;
  const gap = 3;
  layoutTreemap(nodes, gap, gap, W - gap * 2, H - gap * 2).forEach((r) => {
    p.beat(r.i);
    p.ctx.fillStyle = p.col(r.i % 6);
    p.ctx.beginPath(); p.ctx.roundRect(r.x + 1.5, r.y + 1.5, Math.max(0, r.w - 3), Math.max(0, r.h - 3), 4); p.ctx.fill();
    if (r.w > p.px * 4 && r.h > p.px * 2.8) {
      label(p, r.name, r.x + 14, r.y + 14 + p.px, 'start', { weight: 650, color: '#ffffff', size: 18 / 19 });
      label(p, `${fmt(r.value)} · ${Math.round((r.value / total) * 100)}%`, r.x + 14, r.y + 22 + p.px * 2, 'start', { color: '#ffffff', size: 15 / 19 });
    }
    p.settle();
  });
}

function bullet(p: Pen, d: Data) {
  const actual = d.series[0], target = d.series[1];
  if (!actual) return;
  p.ctx.font = `500 ${p.px}px "${p.font}"`;
  const padL = Math.min(400, 40 + Math.max(160, ...d.categories.map((c) => p.ctx.measureText(c).width))), padT = 18, padB = 28;
  const plotW = W - padL - 40;
  const max = niceMax(Math.max(0, ...d.series.flatMap((s) => s.values.filter((v): v is number => v != null).map(Math.abs))));
  const rowH = Math.min(72, (H - padT - padB) / Math.max(1, d.categories.length)), trackH = Math.min(22, rowH * 0.38), barH = Math.min(12, trackH * 0.55);
  d.categories.forEach((cat, ci) => {
    const y = padT + rowH * ci + rowH / 2;
    label(p, cat, padL - 16, y + p.px * 0.32, 'end');
    p.beat(ci);
    p.ctx.fillStyle = rgba(p.ink, 0.12); p.ctx.beginPath(); p.ctx.roundRect(padL, y - trackH / 2, plotW, trackH, 2); p.ctx.fill();
    const av = actual.values[ci];
    if (av != null) {
      const bw = Math.max(0, (Math.abs(av) / max) * plotW) * p.grow(ci);
      p.ctx.fillStyle = p.col(0); p.ctx.beginPath(); p.ctx.roundRect(padL, y - barH / 2, bw, barH, 2); p.ctx.fill();
      label(p, fmt(av), padL + bw + 10, y + p.px * 0.3, 'start', { weight: 650, color: p.ink, size: 1.05 });
    }
    const tv = target?.values[ci];
    if (tv != null) { const tx = padL + (Math.abs(tv) / max) * plotW; p.ctx.lineCap = 'round'; line(p, tx, y - trackH * 0.7, tx, y + trackH * 0.7, p.ink, 3); p.ctx.lineCap = 'butt'; }
    p.settle();
  });
}

function combo(p: Pen, d: Data) {
  if (!d.series.length) return;
  const plotW = W - P.padL - P.padR, plotH = H - P.padT - P.padB;
  const max = niceMax(Math.max(0, ...d.series.flatMap((s) => s.values.filter((v): v is number => v != null))));
  valueGrid(p, max, P.padL, plotW, plotH);
  const band = plotW / Math.max(1, d.categories.length), barW = Math.min(band * 0.48, 64);
  p.beat(0);
  d.categories.forEach((cat, ci) => {
    const v = d.series[0].values[ci];
    label(p, cat, P.padL + band * ci + band / 2, H - P.padB + 30, 'middle');
    if (v == null) return;
    const h = Math.max(0, (v / max) * plotH) * p.grow(0);
    column(p, P.padL + band * ci + (band - barW) / 2, P.padT + plotH - h, barW, h, p.col(0));
  });
  p.settle();
  d.series.slice(1).forEach((s, mi) => {
    const si = mi + 1, pts = d.categories.flatMap((_, ci) => { const v = s.values[ci]; return v == null ? [] : [[P.padL + band * ci + band / 2, P.padT + plotH - (v / max) * plotH] as const]; });
    p.beat(si);
    const { ctx } = p;
    if (pts.length > 1) { ctx.strokeStyle = p.col(si); ctx.lineWidth = 2.5; ctx.setLineDash([4, 5]); ctx.beginPath(); pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); ctx.setLineDash([]); }
    pts.forEach(([x, y]) => { ctx.fillStyle = p.col(si); ctx.strokeStyle = p.surface; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); });
    p.settle();
  });
  baseline(p, P.padL, plotW, plotH);
}

function waffle(p: Pen, d: Data) {
  const s = d.series[0];
  if (!s) return;
  const parts = d.categories.flatMap((name, i) => { const v = s.values[i]; return v != null && v > 0 ? [{ name, value: v, i, label: '' }] : []; });
  const total = parts.reduce((t, q) => t + q.value, 0);
  if (!total) return;
  // One category already a percentage fills that many cells; several share the hundred.
  let cells: number[] = [];
  if (parts.length === 1 && parts[0].value <= 100) {
    const n = Math.max(0, Math.min(100, Math.round(parts[0].value)));
    cells = [...Array(n).fill(parts[0].i), ...Array(100 - n).fill(-1)];
  } else {
    let assigned = 0;
    parts.forEach((q, pi) => {
      const count = Math.max(0, Math.min(100 - assigned, pi === parts.length - 1 ? 100 - assigned : Math.round((q.value / total) * 100)));
      for (let c = 0; c < count; c++) cells.push(q.i);
      assigned += count;
    });
    while (cells.length < 100) cells.push(-1);
    cells = cells.slice(0, 100);
  }
  parts.forEach((q) => { q.label = `${q.name} · ${parts.length === 1 && q.value <= 100 ? Math.round(q.value) : Math.round((q.value / total) * 100)}%`; });
  p.ctx.font = `500 ${p.px}px "${p.font}"`;
  const labelW = Math.max(160, Math.min(460, 52 + Math.max(...parts.map((q) => p.ctx.measureText(q.label).width)) + 24));
  const gridSize = Math.min(H - 40, W - labelW - 80), cell = gridSize / 10, gap = Math.max(2, cell * 0.08), ox = labelW, oy = (H - gridSize) / 2;
  for (let i = 0; i < 100; i++) {
    const idx = cells[i];
    p.beat(Math.max(0, parts.findIndex((q) => q.i === idx)));
    p.ctx.fillStyle = idx < 0 ? rgba(p.ink, 0.12) : p.col(idx % 6);
    p.ctx.beginPath(); p.ctx.roundRect(ox + (i % 10) * cell + gap / 2, oy + Math.floor(i / 10) * cell + gap / 2, cell - gap, cell - gap, 2); p.ctx.fill();
    p.settle();
  }
  const row = Math.max(36, p.px * 1.9);
  parts.forEach((q, pi) => {
    const y = oy + 22 + pi * row;
    p.beat(pi);
    p.ctx.fillStyle = p.col(q.i % 6); p.ctx.beginPath(); p.ctx.roundRect(24, y - 12, 18, 18, 3); p.ctx.fill();
    label(p, q.label, 52, y + 3, 'start', { color: p.ink });
    p.settle();
  });
}

/** How many beats a chart has: what one click of a build, or one step of "draws itself", lays down. */
export function beatsOf(kind: string, text: string): number {
  const d = chartData(text);
  switch (kind) {
    case 'grouped': return d.series.length > 1 ? d.series.length : d.categories.length;
    case 'lines': case 'stack': case 'area': case 'radar': case 'combo': return Math.max(1, d.series.length);
    case 'scatter': return Math.max(1, chartPoints(text).series.length);
    case 'histogram': return Math.max(1, histogramBins(chartValues(text)).length);
    case 'box': return Math.max(1, chartGroups(text).length);
    case 'sankey': return Math.max(1, chartFlows(text).layers - 1);
    case 'waffle': return Math.max(1, d.categories.length);
    case 'matrix': return Math.max(1, rowsOf(text).length - 1);
    default: return Math.max(1, d.categories.length);
  }
}

/**
 * Draw one of SlideForge's chart kinds into a box of w × h on the context (already translated to the
 * box's corner). `progress(i, of)` is each beat's arrival, 0–1: 1 when the chart is settled.
 */
export function drawTableChart(ctx: Ctx, w: number, h: number, params: Params, progress: (i: number, of: number) => number) {
  const kind = String(params.chart ?? 'grouped'), text = String(params.data ?? '');
  const ink = String(params.textColor ?? '#1a1a1a');
  const palette = String(params.palette ?? '').split(',').map((c) => c.trim()).filter(Boolean);
  const steps = palette.length ? palette : CHART_LIGHT;
  const font = String(params.font ?? 'Inter'), size = Number(params.size ?? 36);
  const d = chartData(text);
  const keyed = LEGEND.has(kind) && (kind === 'scatter' ? chartPoints(text).series.length : d.series.length) > 1;
  const names = kind === 'scatter' ? chartPoints(text).series.map((s) => s.name) : d.series.map((s) => s.name);
  const keyH = keyed ? size * 1.9 : 0;
  // The plan fits the box, centred; the key sits above it, as SlideForge's chart-key does.
  const k = w / W;
  H = Math.max(300, Math.max(1, h - keyH) / k);
  const ox = 0, oy = keyH;
  P.padB = 42 + (size / k) * 1.05;
  P.padL = 40 + (size / k) * 2.8;
  const of = beatsOf(kind, text);
  let saved = 1;
  const pen: Pen = {
    ctx, ink, font, dim: rgba(ink, 0.72), rule: rgba(ink, 0.18), surface: String(params.surface ?? '#ffffff'),
    col: (i) => steps[i % steps.length], px: size / k,
    grow: (i) => Math.max(0, Math.min(1, progress(i, of))),
    // A beat is seen at once and then grows: its marks fade in over the first third of its arrival.
    beat: (i) => { saved = ctx.globalAlpha; ctx.globalAlpha = saved * Math.min(1, Math.max(0, progress(i, of)) * 3); },
    settle: () => { ctx.globalAlpha = saved; },
  };
  if (keyed) {
    ctx.save();
    ctx.font = `600 ${size}px "${font}", system-ui, sans-serif`;
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    const gapX = size * 1.2, dot = size * 0.62;
    const widths = names.map((n) => dot + size * 0.4 + ctx.measureText(n).width);
    let x = Math.max(0, (w - (widths.reduce((a, b) => a + b, 0) + gapX * (names.length - 1))) / 2);
    names.forEach((n, i) => {
      ctx.fillStyle = pen.col(i); ctx.beginPath(); ctx.arc(x + dot / 2, keyH / 2 - size * 0.2, dot / 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = ink; ctx.fillText(n, x + dot + size * 0.4, keyH / 2 - size * 0.2);
      x += widths[i] + gapX;
    });
    ctx.restore();
  }
  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(k, k);
  switch (kind) {
    case 'grouped': grouped(pen, d); break;
    case 'lines': lines(pen, d, false); break;
    case 'area': lines(pen, d, true); break;
    case 'stack': stacked(pen, d); break;
    case 'scatter': scatter(pen, text); break;
    case 'histogram': histogram(pen, text); break;
    case 'box': box(pen, text); break;
    case 'pictogram': pictogram(pen, d, params); break;
    case 'radar': radar(pen, d); break;
    case 'sankey': sankey(pen, text); break;
    case 'dumbbell': dumbbell(pen, d); break;
    case 'multiples': multiples(pen, d); break;
    case 'bullet': bullet(pen, d); break;
    case 'combo': combo(pen, d); break;
    case 'treemap': treemap(pen, d); break;
    case 'waffle': waffle(pen, d); break;
    case 'matrix': matrix(pen, text); break;
  }
  ctx.restore();
}
