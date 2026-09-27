/*
 * The chart-experiment kinds added for Week 3 (data abstraction), written once for both engines:
 * the lab's canvas (engine/experiment.ts) and SlideForge's SVG (src/render/experiments.js, which
 * esbuild bundles from this file). Pure: data and a state in, a list of keyed elements out, on the
 * same 1000 × 370 plan as the older kinds. A key names a datum, so between two states it travels:
 * `cell:i:j` is category i's value in series j wherever it is drawn — a table cell, a bar, a bar's
 * stacked segment, the front of a 3D box or a point on a line.
 *
 *   grid      the table as supplied (wide): bands for items or attributes, a derived total column
 *   long      the same table melted long (tidy): one row per category × series, types named
 *   groups    bars: grouped, stacked, stacked into a sorted total, or one bar per series' total
 *   lines     a line per series (or per category, transposed); a focus; the gap between two lines
 *   balance   the difference of two series as bars from zero; its running total
 *   oblique   a 3D default: boxes in depth, rainbow hues, shaded walls (to be critiqued)
 *   donut, exploded, rose   the pie's variants: arc, pulled-apart slices, polar area
 *   units     one dot per occurrence by section, then stacked into a count per category
 *   channels  one ratio drawn in five channels (position, length, angle, area, lightness), then ranked
 *   scales    a signed table as a heatmap in a sequential, diverging or cyclic scale, seen with
 *             deuteranopia simulated
 *   network   a songs × words table, its derived word × word co-occurrence, and the same as a network
 */

export interface KState {
  label: string; kind: string; explanation?: string; series?: number;
  band?: string; derive?: boolean; typed?: boolean; variable?: string; measure?: string; types?: string[];
  mode?: string; colourBy?: string; focus?: number[] | number; sort?: boolean; junk?: boolean; labels?: boolean;
  transpose?: boolean; only?: number[]; gap?: boolean; cumulative?: boolean; stack?: boolean; hideValues?: boolean;
  /** units: a picture (an emoji) per category in place of dots, and the spacing between units. */
  icons?: string[]; size?: number;
  /** nested: show each level's threat to validity. */
  threats?: boolean;
  /** heatmap: the order rows and columns are drawn in, and labelled boxes round blocks [row0, row1, col0, col1, label]. */
  rowOrder?: number[]; colOrder?: number[]; boxes?: (number | string)[][];
  /** scales: 'seq' | 'rg' (red–green) | 'bo' (blue–orange); cvd 'deutan' simulates deuteranopia. */
  scheme?: string; cvd?: string;
  /** Read by the older kinds (the pies preset ends on a categorical bar). */
  categorical?: boolean;
}

export interface KEl {
  tag: 'poly' | 'text' | 'line' | 'rect';
  key?: string;
  pts?: number[][]; x?: number; y?: number; x2?: number; y2?: number; w?: number; h?: number;
  fill?: string; stroke?: string; sw?: number; fo?: number; so?: number;
  text?: string; size?: number; anchor?: 'start' | 'middle' | 'end'; num?: boolean; wt?: number;
}

interface KPreset { label: string; prompt: string; data: string; states: KState[] }

export const KINDS = ['grid', 'long', 'groups', 'lines', 'balance', 'oblique', 'donut', 'exploded', 'rose', 'units', 'nested', 'stream', 'area', 'heatmap', 'channels', 'scales', 'network'];

/** Each new kind's small symbol for its step button. */
export const KIND_GLYPHS: Record<string, string> = {
  grid: '▦', long: '≡', groups: '▮', lines: '╱', balance: '±', oblique: '▣',
  donut: '◎', exploded: '◔', rose: '✿', units: '∷', nested: '⧉', stream: '≋', area: '◭', heatmap: '▩',
  channels: '◐', scales: '▥', network: '⌬',
};

const COLOURS = ['#0072b2', '#d55e00', '#009e73', '#cc79a7', '#8a6500', '#5b4ba8'];
/** The saturated hues a 3D default hands out, one per category: the thing being critiqued. */
const RAINBOW = ['#e0201b', '#1f3fd6', '#27b83a', '#8a2be2', '#f28c1b', '#e8d51b'];
const TYPE_COLOURS = ['#0072b2', '#009e73', '#d55e00', '#cc79a7'];
/** A balance's sign takes the colour of the line that is higher: the first series, then the second. */
const POS = '#0072b2', NEG = '#d55e00', MONO = '#0072b2', DERIVED = '#cc79a7';

/** An ordered attribute's colour: light to dark in one hue. */
function ramp(j: number, m: number) {
  const l = m <= 1 ? 45 : 78 - (j / (m - 1)) * 50;
  return `hsl(205,62%,${Math.round(l)}%)`;
}

function shade(hex: string, f: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(f > 0 ? v + (255 - v) * f : v * (1 + f)));
  return '#' + c.map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
}

interface Table { head: string; categories: string[]; series: { name: string; values: number[] }[] }

/** Headings in the first row, categories in the first column, tab (or |) between cells. */
export function parseTable(text: string): Table {
  const rows = String(text ?? '').split(/\r?\n/).filter((l) => l.trim()).map((l) => (l.includes('\t') ? l.split('\t') : l.split('|')).map((c) => c.trim()));
  if (rows.length < 2) return { head: '', categories: [], series: [] };
  const num = (c: string) => { const r = String(c ?? '').replace(/[,\s%£$€]/g, ''); if (!r) return NaN; const n = Number(r); return Number.isFinite(n) ? n : NaN; };
  return {
    head: rows[0][0] ?? '',
    categories: rows.slice(1).map((r) => r[0] ?? ''),
    series: rows[0].slice(1).map((name, i) => ({ name, values: rows.slice(1).map((r) => num(r[i + 1])) })).filter((s) => s.name.trim()),
  };
}

// ─── Outlines: every mark is 64 points, so any mark can become any other ──────────────────────
function along(verts: number[][]) {
  const pts: number[][] = [];
  for (let i = 0; i < 64; i++) {
    const q = (i / 64) * verts.length, j = Math.floor(q), t = q - j, u = verts[j], v = verts[(j + 1) % verts.length];
    pts.push([u[0] + (v[0] - u[0]) * t, u[1] + (v[1] - u[1]) * t]);
  }
  return pts;
}
const rectPts = (x: number, y: number, w: number, h: number) => along([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);
function circlePts(cx: number, cy: number, r: number) {
  const pts: number[][] = [];
  for (let i = 0; i < 64; i++) { const g = -Math.PI / 2 + (i / 64) * Math.PI * 2; pts.push([cx + r * Math.cos(g), cy + r * Math.sin(g)]); }
  return pts;
}
/** A pie slice, drawn the way the older pie kind draws it: out from the centre, round, back. */
function sectorPts(cx: number, cy: number, r: number, start: number, end: number) {
  const pts: number[][] = [];
  for (let i = 0; i < 64; i++) {
    const g = start + (end - start) * Math.max(0, Math.min(1, (i - 8) / 47)), rr = i < 8 ? (r * i) / 8 : i > 55 ? (r * (64 - i)) / 9 : r;
    pts.push([cx + rr * Math.cos(g), cy + rr * Math.sin(g)]);
  }
  return pts;
}
/** A ring segment: the outer arc one way, the inner arc back. */
function ringPts(cx: number, cy: number, r0: number, r1: number, start: number, end: number) {
  const pts: number[][] = [];
  for (let i = 0; i < 32; i++) { const g = start + ((end - start) * i) / 31; pts.push([cx + r1 * Math.cos(g), cy + r1 * Math.sin(g)]); }
  for (let i = 0; i < 32; i++) { const g = end - ((end - start) * i) / 31; pts.push([cx + r0 * Math.cos(g), cy + r0 * Math.sin(g)]); }
  return pts;
}

/** A round axis maximum: 1, 2, 2.5 or 5 times a power of ten. */
function niceMax(v: number) {
  if (!(v > 0)) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}
const sum = (a: number[]) => a.reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0);
const val = (v: number) => (Number.isFinite(v) ? v : 0);

/**
 * The picture of a state of one of the new kinds, or null when the kind is an older one (the engine
 * draws those itself). `ink` is the text colour: a colour in the lab, currentColor in SlideForge.
 */
export function kindPicture(data: string, st: KState, ink: string): KEl[] | null {
  if (!KINDS.includes(st.kind)) return null;
  const t = parseTable(data), els: KEl[] = [];
  const text = (x: number, y: number, v: string | number, size = 20, anchor: KEl['anchor'] = 'start', key?: string, more: Partial<KEl> = {}) =>
    els.push({ tag: 'text', x, y, text: String(v), size, anchor, key, num: typeof v === 'number', fill: ink, ...more });
  const poly = (key: string | undefined, pts: number[][], fill: string, more: Partial<KEl> = {}) => els.push({ tag: 'poly', key, pts, fill, fo: 1, ...more });
  const line = (key: string | undefined, x: number, y: number, x2: number, y2: number, stroke: string, sw = 1, so = 1) => els.push({ tag: 'line', key, x, y, x2, y2, stroke, sw, so });
  const cats = t.categories.slice(0, 12), ser = t.series.slice(0, 6);
  if (!cats.length || !ser.length) { text(500, 180, 'Add a table with category labels and numeric values.', 24, 'middle'); return els; }
  const n = cats.length, m = ser.length, v = (i: number, j: number) => val(ser[j].values[i]);
  const totals = cats.map((_, i) => sum(ser.map((s) => s.values[i])));

  // A value axis: four quiet gridlines and their numbers, which count to their new values.
  const axis = (max: number, left: number, right: number, top: number, bottom: number, junk = false) => {
    for (let k = 0; k <= 4; k++) {
      const py = bottom - (k / 4) * (bottom - top);
      if (junk && k < 4) poly(`junk:${k}`, rectPts(left, py - (bottom - top) / 4, right - left, (bottom - top) / 4), k % 2 ? '#c8b6ef' : '#e4dbf7', { fo: 0.8 });
      line(`grid:${k}`, left, py, right, py, ink, 1, junk ? 0.45 : 0.15);
      text(left - 12, py + 6, Math.round((max * k) / 4 * 10) / 10, 17, 'end', `tick:${k}`);
    }
  };

  if (st.kind === 'grid') {
    const rows = cats.slice(0, 8), nr = rows.length;
    const cols = [t.head, ...ser.map((s) => s.name), ...(st.derive ? ['Total'] : [])];
    const colW = Math.min(170, 820 / cols.length), x0 = 500 - (colW * cols.length) / 2, top = 58, rh = Math.min(42, 270 / nr);
    const cx = (c: number) => x0 + colW * (c + 0.5), ry = (r: number) => top + rh * (r + 1);
    if (st.band === 'items') rows.forEach((_, r) => poly(`band:row:${r}`, rectPts(x0 - 8, ry(r) - rh * 0.72, colW * cols.length + 16, rh * 0.9), TYPE_COLOURS[0], { fo: r % 2 ? 0.1 : 0.2 }));
    if (st.band === 'attributes') {
      poly('band:col:0', rectPts(x0 + 4, top - 30, colW - 8, rh * nr + 44), TYPE_COLOURS[0], { fo: 0.14 });
      poly('band:series', rectPts(x0 + colW + 4, top - 30, colW * m - 8, rh * nr + 44), TYPE_COLOURS[2], { fo: 0.14 });
    }
    if (st.derive) poly('band:total', rectPts(x0 + colW * (m + 1) + 4, top - 30, colW - 8, rh * nr + 44), DERIVED, { fo: 0.18 });
    text(cx(0), top, t.head, 20, 'middle', 'head:0', { wt: 700 });
    ser.forEach((s, j) => text(cx(j + 1), top, s.name, 20, 'middle', `head:s:${j}`, { wt: 700 }));
    if (st.derive) text(cx(m + 1), top, 'Total', 20, 'middle', 'head:total', { wt: 700, fill: DERIVED });
    line('rule', x0, top + 12, x0 + colW * cols.length, top + 12, ink, 1.5, 0.5);
    rows.forEach((name, r) => {
      text(cx(0), ry(r), name, 20, 'middle', `cat:${r}`);
      ser.forEach((_, j) => text(cx(j + 1), ry(r), v(r, j), 20, 'middle', `cell:${r}:${j}`));
      if (st.derive) text(cx(m + 1), ry(r), totals[r], 20, 'middle', `total:${r}`, { wt: 700, fill: DERIVED });
    });
    const cap = st.derive ? `Total = ${ser.map((s) => s.name).join(' + ')}: computed, not observed`
      : st.band === 'items' ? `${nr} items: one row per ${t.head.toLowerCase() || 'item'}`
      : st.band === 'attributes' ? `${m} columns, one attribute: each holds a quantity for one value of another attribute`
      : '';
    if (cap) text(500, 358, cap, 17, 'middle', `caption:${st.derive ? 'derive' : st.band}`);
    return els;
  }

  if (st.kind === 'long') {
    const rows: { i: number; j: number }[] = [];
    cats.slice(0, 8).forEach((_, i) => ser.forEach((__, j) => rows.push({ i, j })));
    const per = rows.length > 10 ? Math.ceil(rows.length / 2) : rows.length, blocks = Math.ceil(rows.length / per);
    const blockW = blocks > 1 ? 440 : 520, gapB = 40, bx0 = 500 - (blocks * blockW + (blocks - 1) * gapB) / 2;
    const top = st.typed ? 66 : 48, rh = Math.min(34, (348 - top) / (per + 0.3));
    const colX = [0.2, 0.52, 0.84].map((f) => f * blockW), colW = 0.3 * blockW;
    const names = [t.head, st.variable || 'Series', st.measure || 'Value'];
    const types = st.types ?? ['Nominal', 'Ordinal', 'Quantitative'];
    for (let b = 0; b < blocks; b++) {
      const bx = bx0 + b * (blockW + gapB), count = Math.min(per, rows.length - b * per);
      if (st.typed) colX.forEach((x, k) => {
        poly(`type:${k}:b${b}`, rectPts(bx + x - colW / 2, top - 28, colW, rh * count + 42), TYPE_COLOURS[k], { fo: 0.15 });
        text(bx + x, top - 36, types[k] ?? '', 15, 'middle', `typename:${k}:b${b}`, { fill: TYPE_COLOURS[k], wt: 700 });
      });
      text(bx + colX[0], top, names[0], 18, 'middle', b ? `head:0:b${b}` : 'head:0', { wt: 700 });
      text(bx + colX[1], top, names[1], 18, 'middle', `head:var:b${b}`, { wt: 700 });
      text(bx + colX[2], top, names[2], 18, 'middle', `head:val:b${b}`, { wt: 700 });
      line(`rule:b${b}`, bx, top + 10, bx + blockW, top + 10, ink, 1.5, 0.5);
    }
    rows.forEach(({ i, j }, k) => {
      const b = Math.floor(k / per), r = k % per, bx = bx0 + b * (blockW + gapB), y = top + rh * (r + 1);
      text(bx + colX[0], y, cats[i], 17, 'middle', j === 0 ? `cat:${i}` : `cat:${i}:${j}`);
      text(bx + colX[1], y, ser[j].name, 17, 'middle', i === 0 ? `head:s:${j}` : `mon:${i}:${j}`);
      text(bx + colX[2], y, v(i, j), 17, 'middle', `cell:${i}:${j}`);
    });
    return els;
  }

  if (st.kind === 'groups') {
    const mode = st.mode || 'grouped', colourBy = st.colourBy || 'series';
    const left = 110, right = 930, top = 40, bottom = 300;
    const f = Array.isArray(st.focus) ? st.focus : null;
    const lit = (i: number, j: number) => !f || ((f[0] < 0 || f[0] === i) && (f[1] < 0 || f[1] === j));
    const colour = (i: number, j: number) => (colourBy === 'category' ? RAINBOW[i % RAINBOW.length] : colourBy === 'mono' ? MONO : ramp(j, m));
    if (mode === 'series-totals') {
      const sums = ser.map((s) => sum(s.values)), max = niceMax(Math.max(...sums)), y = (x: number) => bottom - (x / max) * (bottom - top);
      axis(max, left, right, top, bottom);
      const slot = (right - left) / m, w = slot * 0.5;
      sums.forEach((s, j) => {
        const x = left + slot * (j + 0.5);
        poly(`agg:${j}`, rectPts(x - w / 2, y(s), w, bottom - y(s)), ramp(j, m));
        text(x, y(s) - 10, s, 20, 'middle', `aggv:${j}`, { wt: 700 });
        text(x, 328, ser[j].name, 18, 'middle', `xcat:${j}`);
      });
      text(500, 360, `Each bar adds up one column over all ${n} ${t.head.toLowerCase() || 'categories'}`, 16, 'middle', 'cap:series-totals');
      return els;
    }
    const order = cats.map((_, i) => i);
    if (st.sort) order.sort((a, b) => totals[b] - totals[a]);
    const stackedLike = mode === 'stacked' || mode === 'totals';
    const max = niceMax(stackedLike ? Math.max(...totals) : Math.max(...cats.flatMap((_, i) => ser.map((__, j) => v(i, j)))));
    const y = (x: number) => bottom - (x / max) * (bottom - top);
    axis(max, left, right, top, bottom, !!st.junk);
    const slot = (right - left) / n;
    order.forEach((i, p) => {
      const xc = left + slot * (p + 0.5);
      if (stackedLike) {
        const w = slot * 0.56;
        let acc = 0;
        ser.forEach((_, j) => {
          const x = v(i, j);
          poly(`cell:${i}:${j}`, rectPts(xc - w / 2, y(acc + x), w, y(acc) - y(acc + x)), colour(i, j), { fo: lit(i, j) ? 1 : 0.18, stroke: '#ffffff', sw: 1.5 });
          if (mode === 'stacked' && st.labels) text(xc, y(acc + x / 2) + 5, x, 14, 'middle', `val:${i}:${j}`, { fill: '#ffffff' });
          acc += x;
        });
        if (mode === 'totals' || st.labels) text(xc, y(acc) - 9, acc, 18, 'middle', `tot:${i}`, { wt: 700 });
      } else {
        const space = slot * 0.8, w = space / m;
        ser.forEach((_, j) => {
          const x = v(i, j), bx = xc - space / 2 + j * w;
          poly(`cell:${i}:${j}`, rectPts(bx + 1, y(x), Math.max(2, w - 2), bottom - y(x)), colour(i, j), { fo: lit(i, j) ? 1 : 0.18 });
          if (st.labels && (!f || lit(i, j))) text(bx + w / 2, y(x) - 8, x, f ? 22 : 13, 'middle', `val:${i}:${j}`, { wt: f ? 700 : 500 });
        });
      }
      text(xc, 328, cats[i], 17, 'middle', `category:${i}`);
    });
    if (colourBy === 'series') ser.forEach((s, j) => {
      const lx = 500 - (m * 150) / 2 + j * 150;
      poly(`legend:${j}`, rectPts(lx, 346, 16, 16), ramp(j, m));
      text(lx + 24, 360, s.name, 16, 'start', `lname:${j}`);
    });
    else if (mode === 'totals') text(500, 360, `${ser.map((s) => s.name).join(' + ')} = a derived total${st.sort ? ', sorted' : ''}`, 16, 'middle', 'cap:totals');
    return els;
  }

  // Lines and balance share an x scale, so their category labels stay where they are between them.
  const lineX = (k: number, count: number) => 110 + ((k + 0.5) * (820 - 110)) / count;

  if (st.kind === 'lines') {
    const top = 40, bottom = 300, tr = !!st.transpose;
    const xs = tr ? ser.map((s) => s.name) : cats;
    const sets = tr ? cats.map((c, i) => ({ name: c, idx: i, vals: ser.map((s) => s.values[i]) })) : ser.map((s, j) => ({ name: s.name, idx: j, vals: s.values.slice(0, 12) }));
    const max = niceMax(Math.max(...sets.flatMap((s) => s.vals.map(val))));
    const y = (x: number) => bottom - (x / max) * (bottom - top);
    axis(max, 110, 820, top, bottom);
    const shown = sets.filter((s) => !st.only || st.only.includes(s.idx));
    const focus = typeof st.focus === 'number' ? st.focus : -1;
    if (st.gap && !tr && sets.length >= 2) xs.forEach((_, k) => {
      const a = val(sets[0].vals[k]), b = val(sets[1].vals[k]), x = lineX(k, xs.length);
      poly(`gap:${k}`, rectPts(x - 7, y(Math.max(a, b)), 14, Math.abs(y(a) - y(b))), a >= b ? POS : NEG, { fo: 0.85 });
    });
    // Two close lines: the higher one's numbers go above its points, the lower one's below, and the
    // names at the ends are pushed apart so they do not overprint.
    const topAt = xs.map((_, k) => Math.max(...shown.map((s) => val(s.vals[k]))));
    const ends = shown.map((s) => ({ idx: s.idx, y: y(val(s.vals[s.vals.length - 1])) + 6 })).sort((a, b) => a.y - b.y);
    for (let k = 1; k < ends.length; k++) if (ends[k].y - ends[k - 1].y < 20) ends[k].y = ends[k - 1].y + 20;
    const endY = new Map(ends.map((e) => [e.idx, e.y]));
    shown.forEach((s) => {
      const c = COLOURS[s.idx % COLOURS.length], dim = focus >= 0 && focus !== s.idx, op = dim ? 0.22 : 1;
      const at = s.vals.map((x, k) => ({ x: lineX(k, xs.length), y: y(val(x)), v: val(x), key: tr ? `cell:${s.idx}:${k}` : `cell:${k}:${s.idx}` }));
      at.forEach((q, k) => { if (k) line(`seg:${s.idx}:${k}`, at[k - 1].x, at[k - 1].y, q.x, q.y, c, dim ? 2.5 : 4, op); });
      at.forEach((q) => {
        poly(q.key, circlePts(q.x, q.y, dim ? 5 : 7), c, { fo: op });
      });
      if (st.labels && !dim) at.forEach((q, k) => text(q.x, q.v >= topAt[k] ? q.y - 14 : q.y + 28, q.v, 15, 'middle', `val:${q.key}`, { wt: 700, fill: c }));
      const last = at[at.length - 1];
      if (!dim) text(last.x + 16, endY.get(s.idx) ?? last.y + 6, s.name, 17, 'start', `lname:${s.idx}`, { fill: c, wt: 700 });
    });
    xs.forEach((name, k) => text(lineX(k, xs.length), 328, name, 17, 'middle', `xcat:${k}`));
    if (st.gap && !tr && sets.length >= 2) text(500, 360, `Blue: ${sets[0].name} higher · orange: ${sets[1].name} higher`, 16, 'middle', 'cap:gap');
    return els;
  }

  if (st.kind === 'balance') {
    const a = ser[0], b = ser[1] ?? { name: '', values: a.values.map(() => 0) };
    const xs = cats;
    let run = 0;
    const d = xs.map((_, k) => { const x = val(a.values[k]) - val(b.values[k]); run += x; return st.cumulative ? run : x; });
    // The same pixels per unit as the lines state where it fits, so a gap keeps its length as it falls.
    const linesMax = niceMax(Math.max(...[a, b].flatMap((s) => s.values.slice(0, 12).map(val))));
    const maxAbs = Math.max(1, ...d.map(Math.abs)), pxu = Math.min(260 / linesMax, 125 / maxAbs), y0 = 180;
    const w = Math.min(46, (710 / xs.length) * 0.5);
    line('zero', 110, y0, 820, y0, ink, 2, 0.6);
    text(98, y0 + 6, 0, 17, 'end', 'tick:zero');
    d.forEach((x, k) => {
      const cx = lineX(k, xs.length), h = Math.abs(x) * pxu;
      poly(`gap:${k}`, rectPts(cx - w / 2, x >= 0 ? y0 - h : y0, w, Math.max(1, h)), x >= 0 ? POS : NEG);
      text(cx, x >= 0 ? y0 - h - 9 : y0 + h + 22, x, 17, 'middle', `bal:${k}`, { wt: 700 });
      text(cx, 342, xs[k], 17, 'middle', `xcat:${k}`);
    });
    text(500, 368, st.cumulative ? `Running total of ${a.name} − ${b.name}` : `${a.name} − ${b.name}: a derived attribute`, 16, 'middle', st.cumulative ? 'cap:cumulative' : 'cap:balance');
    return els;
  }

  if (st.kind === 'oblique') {
    const dxD = 26, dyD = -16, left = 120, base = 300;
    const slot = (760 - m * dxD) / n, bw = slot * 0.5, dx = dxD * 0.6, dy = dyD * 0.6;
    const max = Math.max(1, ...cats.flatMap((_, i) => ser.map((__, j) => v(i, j)))), hScale = 205 / max;
    const floorR = left + n * slot + m * dxD, backY = base + m * dyD;
    // The walls and floor: shaded panels that carry no data.
    poly('junk:wall', along([[left + m * dxD, backY - 225], [floorR, backY - 225], [floorR, backY], [left + m * dxD, backY]]), '#e4dbf7', { fo: 0.9 });
    for (let k = 0; k < 4; k++) poly(`junk:${k}`, rectPts(left + m * dxD, backY - 225 + k * 56, floorR - left - m * dxD, 28), '#c8b6ef', { fo: 0.8 });
    poly('junk:floor', along([[left, base], [left + n * slot, base], [floorR, backY], [left + m * dxD, backY]]), '#d7cdee', { fo: 0.9 });
    for (let j = m - 1; j >= 0; j--) {
      cats.forEach((_, i) => {
        const x = left + (i + 0.5) * slot - bw / 2 + j * dxD, yb = base + j * dyD, h = v(i, j) * hScale, yt = yb - h, c = RAINBOW[i % RAINBOW.length];
        poly(`side:${i}:${j}`, along([[x + bw, yt], [x + bw + dx, yt + dy], [x + bw + dx, yb + dy], [x + bw, yb]]), shade(c, -0.35));
        poly(`top:${i}:${j}`, along([[x, yt], [x + bw, yt], [x + bw + dx, yt + dy], [x + dx, yt + dy]]), shade(c, 0.35));
        poly(`cell:${i}:${j}`, rectPts(x, yt, bw, h), c);
      });
      text(left + n * slot + j * dxD + 10, base + j * dyD + 4, ser[j].name, 14, 'start', `depth:${j}`);
    }
    cats.forEach((c, i) => text(left + (i + 0.5) * slot, 326, c, 16, 'middle', `category:${i}`));
    return els;
  }

  if (st.kind === 'donut' || st.kind === 'exploded' || st.kind === 'rose') {
    const s = ser[Math.max(0, Math.min(m - 1, Number(st.series) || 0))];
    const rows = cats.map((name, i) => ({ name, i, value: s.values[i] })).filter((r) => Number.isFinite(r.value));
    const total = sum(rows.map((r) => r.value)), max = Math.max(...rows.map((r) => r.value));
    if (!(total > 0) || rows.some((r) => r.value < 0)) { text(500, 180, 'A pie needs positive parts of a whole.', 24, 'middle'); return els; }
    const cx = 350, cy = 175, R = 145;
    let angle = -Math.PI / 2;
    rows.forEach((r, k) => {
      const c = COLOURS[k % COLOURS.length];
      if (st.kind === 'rose') {
        const a0 = -Math.PI / 2 + (k * Math.PI * 2) / rows.length, a1 = a0 + (Math.PI * 2) / rows.length;
        poly(`mark:${r.i}`, sectorPts(cx, cy, R * Math.sqrt(r.value / max), a0, a1), c, { stroke: '#ffffff', sw: 2 });
      } else {
        const end = angle + (r.value / total) * Math.PI * 2, mid = (angle + end) / 2;
        if (st.kind === 'donut') poly(`mark:${r.i}`, ringPts(cx, cy, R * 0.56, R, angle, end), c, { stroke: '#ffffff', sw: 2 });
        else poly(`mark:${r.i}`, sectorPts(cx + 18 * Math.cos(mid), cy + 18 * Math.sin(mid), R * 0.92, angle, end), c, { stroke: '#ffffff', sw: 2 });
        angle = end;
      }
      text(570, 65 + k * 32, r.name, 21, 'start', `category:${r.i}`);
      text(760, 65 + k * 32, r.value, 21, 'middle', `value:${r.i}`);
    });
    const channel = st.kind === 'donut' ? 'Read by arc length' : st.kind === 'exploded' ? 'Read by angle, slices apart' : 'Equal angles: area carries the value';
    text(cx, 358, channel, 19, 'middle', `cap:${st.kind}`);
    return els;
  }

  if (st.kind === 'units') {
    const rows = cats.slice(0, 8), nr = rows.length;
    const counts = rows.map((_, i) => ser.map((__, j) => Math.max(0, Math.round(v(i, j)))));
    const tot = counts.map((c) => c.reduce((a, b) => a + b, 0));
    const order = rows.map((_, i) => i);
    if (st.stack && st.sort) order.sort((a, b) => tot[b] - tot[a]);
    const step = st.size ?? 16, big = step > 24, left = 150, right = 960, top = 58, rh = Math.min(big ? 90 : 44, 262 / nr), r = big ? 15 : 5.5;
    const rowY = (p: number) => top + rh * (p + 0.5) + 8;
    const colW = (right - left) / m;
    if (!st.stack) ser.forEach((s, j) => {
      text(left + colW * (j + 0.5), 36, s.name, 16, 'middle', `sec:${j}`, { wt: 700 });
      if (j) line(`sep:${j}`, left + colW * j, 46, left + colW * j, top + rh * nr + 12, ink, 1, 0.15);
    });
    const maxTot = Math.max(1, ...tot), d = Math.min(step, (right - left - 60) / maxTot);
    order.forEach((i, p) => {
      const y = rowY(p);
      text(left - 16, y + 6, rows[i], 17, 'end', `category:${i}`);
      let idx = 0;
      counts[i].forEach((c, j) => {
        const dd = Math.min(step, (colW * 0.9) / Math.max(1, c));
        for (let k = 0; k < c; k++) {
          const x = st.stack ? left + 10 + d / 2 + idx * d : left + colW * (j + 0.5) - ((c - 1) * dd) / 2 + k * dd;
          const icon = st.icons?.[i];
          // An icon keeps a faint disc of its column's colour behind it, so a stacked row still shows where each came from.
          const col = st.colourBy === 'category' ? COLOURS[i % COLOURS.length] : ramp(j, m);
          if (icon) { poly(`unitbg:${i}:${j}:${k}`, circlePts(x, y, r * 1.5), col, { fo: 0.28 }); text(x, y + r * 0.9, icon, r * 2.6, 'middle', `unit:${i}:${j}:${k}`); }
          else poly(`unit:${i}:${j}:${k}`, circlePts(x, y, r), col);
          idx++;
        }
      });
      if (st.stack) text(left + 10 + tot[i] * d + 8, y + 6, tot[i], big ? 24 : 18, 'start', `count:${i}`, { wt: 700 });
    });
    if (st.stack) ser.forEach((s, j) => {
      const lx = 500 - (m * 140) / 2 + j * 140;
      poly(`legend:${j}`, circlePts(lx + 7, 352, 7), ramp(j, m));
      text(lx + 20, 358, s.name, 15, 'start', `lname:${j}`);
    });
    return els;
  }
  if (st.kind === 'nested') {
    // Munzner's nested model drawn as boxes inside boxes. The level in focus stays lit and the rest
    // dim; its question and, with `threats`, its threat to validity sit beside the boxes. Cells are
    // words, read straight from the rows: level, what it asks (| breaks a line), its threat.
    const rows = String(data ?? '').split(/\r?\n/).filter((l) => l.trim()).slice(1, 5).map((l) => l.split('\t').map((c) => c.trim()));
    const fills = ['#f8c9a4', '#f2e6b0', '#b8dfcd', '#e3bde0'], inks = ['#b5421a', '#8a6a00', '#1d7a5c', '#8a3d86'];
    const f = typeof st.focus === 'number' ? st.focus : -1;
    const lit = (k: number) => f < 0 || f === k;
    const box = [[16, 12, 450, 346], [44, 58, 408, 288], [72, 176, 352, 162], [100, 244, 170, 80]];
    rows.forEach((r, k) => {
      const [x, y, w, h] = box[k] ?? box[3];
      poly(`lvl:${k}`, rectPts(x, y, w, h), fills[k], { fo: lit(k) ? 1 : 0.3, stroke: f === k ? inks[k] : '#ffffff', sw: f === k ? 3 : 1.5 });
      text(x + 14, y + 28, r[0] ?? '', k === 3 ? 16 : 19, 'start', `lvlname:${k}`, { fill: inks[k], wt: 700 });
    });
    // What? Why? How? as the model's pills: the first two belong to abstraction, How? to idiom.
    ([['What?', 1, 124], ['Why?', 1, 160], ['How?', 2, 236]] as [string, number, number][]).forEach(([word, k, y]) => {
      poly(`pill:${word}`, rectPts(318, y - 22, 110, 30), inks[k], { fo: lit(k) ? 1 : 0.3 });
      text(373, y - 1, word, 18, 'middle', `pilltext:${word}`, { fill: '#ffffff', wt: 700 });
    });
    const show = f >= 0 ? [f] : rows.map((_, k) => k);
    let yy = f >= 0 ? 60 : 34;
    show.forEach((k) => {
      const r = rows[k] ?? [];
      if (f >= 0) {
        text(500, yy, r[0] ?? '', 26, 'start', `desc:${k}:title`, { fill: inks[k], wt: 700 }); yy += 40;
        String(r[1] ?? '').split('|').forEach((ln, n) => { text(500, yy, ln.trim(), 20, 'start', `desc:${k}:${n}`); yy += 30; });
        if (st.threats && r[2]) { yy += 14; text(500, yy, 'Threat', 16, 'start', `desc:${k}:threat-h`, { fill: inks[k], wt: 700 }); yy += 30; String(r[2]).split('|').forEach((ln, n) => { text(500, yy, ln.trim(), 22, 'start', `desc:${k}:t${n}`, { wt: 700 }); yy += 30; }); }
      } else {
        text(500, yy, r[0] ?? '', 19, 'start', `sum:${k}:h`, { fill: inks[k], wt: 700 }); yy += 26;
        text(500, yy, String(st.threats ? r[2] : r[1] ?? '').split('|').join(' '), 17, 'start', `sum:${k}`); yy += 58;
      }
    });
    return els;
  }
  if (st.kind === 'stream' || st.kind === 'area') {
    // A band per category across the series (words across a song's sections), smoothed between the
    // sections. stream stacks the bands round a centre line (a streamgraph); area draws each band
    // from zero, overlapping and see-through. Both key a band by its category, so one becomes the other.
    const rows = cats.slice(0, 8), left = 150, right = 940;
    const xAt = (t: number) => left + (m <= 1 ? 0.5 : t / (m - 1)) * (right - left);
    const at = (i: number, t: number) => { const a = Math.floor(t), b = Math.min(m - 1, a + 1), u = t - a, e = (1 - Math.cos(u * Math.PI)) / 2; return v(i, a) + (v(i, b) - v(i, a)) * e; };
    // Exactly 64 outline points (32 along each edge of a stream band, 62 plus two corners for an area),
    // so resampling to the shared 64 never cuts a corner.
    const span = (n: number) => Array.from({ length: n }, (_, k) => (m <= 1 ? 0 : (k / (n - 1)) * (m - 1)));
    const ts = span(st.kind === 'stream' ? 32 : 62);
    if (st.kind === 'stream') {
      const tot = (t: number) => rows.reduce((a, _, i) => a + at(i, t), 0);
      const maxT = Math.max(1, ...ts.map(tot)), k = 280 / maxT, mid = 178;
      rows.forEach((name, i) => {
        const lo = ts.map((t) => mid - (tot(t) / 2) * k + rows.slice(0, i).reduce((a, _, h) => a + at(h, t), 0) * k);
        const hi = ts.map((t, n) => lo[n] + at(i, t) * k);
        const verts = [...ts.map((t, n) => [xAt(t), hi[n]]), ...ts.map((t, n) => [xAt(t), lo[n]]).reverse()];
        poly(`band:${i}`, along(verts), COLOURS[i % COLOURS.length], { fo: 0.9, stroke: '#ffffff', sw: 1 });
        // The label sits where the band is thickest, away from the ends so it is never cut off.
        const edge = Math.round(ts.length / 10); let best = edge; ts.forEach((_, n) => { if (n >= edge && n <= ts.length - 1 - edge && hi[n] - lo[n] > hi[best] - lo[best]) best = n; });
        if (hi[best] - lo[best] > 16) text(xAt(ts[best]), (hi[best] + lo[best]) / 2 + 6, name, 17, 'middle', `bandname:${i}`, { fill: '#ffffff', wt: 700 });
      });
    } else {
      const maxV = Math.max(1, ...rows.flatMap((_, i) => ser.map((__, j) => v(i, j)))), k = 250 / maxV, base = 312;
      rows.map((_, i) => i).sort((a, b) => sum(ser.map((q) => q.values[b])) - sum(ser.map((q) => q.values[a]))).forEach((i) => {
        const hi = ts.map((t) => base - at(i, t) * k);
        const verts = [...ts.map((t, n) => [xAt(t), hi[n]]), [right, base], [left, base]];
        poly(`band:${i}`, along(verts), COLOURS[i % COLOURS.length], { fo: 0.3, stroke: COLOURS[i % COLOURS.length], sw: 2.5 });
        const edge = Math.round(hi.length / 10); let best = edge; hi.forEach((y, n) => { if (n >= edge && n <= hi.length - 1 - edge && y < hi[best]) best = n; });
        text(xAt(ts[best]), hi[best] - 8, rows[i], 17, 'middle', `bandname:${i}`, { fill: COLOURS[i % COLOURS.length], wt: 700 });
      });
      line('base', left, base, right, base, ink, 1.5, 0.5);
    }
    ser.forEach((q, j) => text(xAt(j), 350, q.name, 16, 'middle', `xcat:${j}`));
    return els;
  }
  if (st.kind === 'heatmap') {
    // A grid of cells coloured by value. Each cell is keyed by its row and column, so when rows or
    // columns are reordered the cells travel to their new places and blocks of similar values form.
    const rows = cats.slice(0, 12), nr = rows.length;
    const ro = st.rowOrder?.length === nr ? st.rowOrder : rows.map((_, i) => i);
    const co = st.colOrder?.length === m ? st.colOrder : ser.map((_, j) => j);
    const left = 190, top = 44, cw = Math.min(100, 700 / m), ch = Math.min(38, 300 / nr);
    const all = rows.flatMap((_, i) => ser.map((__, j) => v(i, j))), lo = Math.min(...all), hi = Math.max(...all);
    const shadeOf = (x: number) => { const t = hi > lo ? (x - lo) / (hi - lo) : 0; return { fill: `hsl(205,65%,${Math.round(95 - t * 68)}%)`, dark: t > 0.55 }; };
    ro.forEach((i, r) => {
      text(left - 14, top + ch * r + ch / 2 + 6, rows[i], 17, 'end', `category:${i}`);
      co.forEach((j, c) => {
        const x = v(i, j), sh = shadeOf(x);
        poly(`cell:${i}:${j}`, rectPts(left + cw * c + 1, top + ch * r + 1, cw - 2, ch - 2), sh.fill);
        if (st.labels !== false) text(left + cw * c + cw / 2, top + ch * r + ch / 2 + 5, x, 14, 'middle', `val:${i}:${j}`, { fill: sh.dark ? '#ffffff' : '#1a1a1a' });
      });
    });
    co.forEach((j, c) => text(left + cw * c + cw / 2, top - 12, ser[j].name, 16, 'middle', `xcat:${j}`, { wt: 700 }));
    (st.boxes ?? []).forEach((b, k) => {
      const [r0, r1, c0, c1] = b.map(Number), label = String(b[4] ?? '');
      const x = left + cw * c0, y = top + ch * r0, w = cw * (c1 - c0 + 1), h = ch * (r1 - r0 + 1);
      line(`box:${k}:t`, x, y, x + w, y, '#d55e00', 3.5); line(`box:${k}:b`, x, y + h, x + w, y + h, '#d55e00', 3.5);
      line(`box:${k}:l`, x, y, x, y + h, '#d55e00', 3.5); line(`box:${k}:r`, x + w, y, x + w, y + h, '#d55e00', 3.5);
      if (label) text(left + cw * m + 16, y + h / 2 + 6, label, 18, 'start', `boxname:${k}`, { fill: '#d55e00', wt: 700 });
    });
    return els;
  }
  if (st.kind === 'channels') {
    // Cleveland & McGill in the room: rows are channels, A the reference value and B the one to judge
    // as a percentage of A. `focus` picks the channel; `labels` reveals the true ratio; mode 'ranking'
    // lines the channels up from most to least accurately judged. The two marks keep their keys
    // (markA, markB) through every channel, so one encoding turns into the next.
    const rows = cats.map((c, i) => ({ c, a: v(i, 0), b: m > 1 ? v(i, 1) : 0 }));
    const f = Math.max(0, Math.min(rows.length - 1, typeof st.focus === 'number' ? st.focus : 0));
    if (st.mode === 'ranking') {
      text(40, 40, 'Judged most accurately', 17, 'start', 'rank:top', { wt: 700, fill: '#009e73' });
      const order = rows.map((r, i) => i);
      order.forEach((i, k) => {
        const y = 62 + k * 52, w = 420 - k * 70;
        poly(`rank:${i}`, rectPts(250, y, Math.max(40, w), 36), ramp(k, order.length), { fo: 1 });
        text(234, y + 25, rows[i].c, 20, 'end', `category:${i}`, { wt: 700 });
        text(260 + Math.max(40, w), y + 25, `#${k + 1}`, 17, 'start', `rankn:${i}`);
      });
      text(40, 62 + order.length * 52 + 14, 'Judged least accurately', 17, 'start', 'rank:bottom', { wt: 700, fill: '#d55e00' });
      text(860, 120, 'Your room’s spread', 19, 'middle', 'rank:note1', { wt: 700 });
      text(860, 150, 'on each question', 19, 'middle', 'rank:note2', { wt: 700 });
      text(860, 190, 'is the evidence.', 19, 'middle', 'rank:note3', { wt: 700 });
      text(860, 250, 'After Cleveland & McGill (1984)', 14, 'middle', 'rank:src1');
      text(860, 272, 'and Heer & Bostock (2010)', 14, 'middle', 'rank:src2');
      return els;
    }
    const r = rows[f], name = r.c.toLowerCase(), ax = 190, bx = 390, base = 320, top = 40, span = base - top;
    const scale = (x: number) => (x / 100) * span;
    text(40, 40, `${f + 1} / ${rows.length} · ${r.c}`, 18, 'start', 'ch:title', { wt: 700 });
    if (name.startsWith('position')) {
      line('ch:axis', 110, top, 110, base, ink, 2, 0.7);
      [0, 25, 50, 75, 100].forEach((t) => line(`ch:tick:${t}`, 102, base - scale(t), 110, base - scale(t), ink, 2, 0.7));
      poly('markA', circlePts(ax, base - scale(r.a), 16), COLOURS[0]);
      poly('markB', circlePts(bx, base - scale(r.b), 16), COLOURS[0]);
    } else if (name.startsWith('length')) {
      // Unaligned: the bars do not share a baseline, so only their lengths can be compared.
      poly('markA', rectPts(ax - 30, base - 30 - scale(r.a) * 0.9, 60, scale(r.a) * 0.9), COLOURS[0]);
      poly('markB', rectPts(bx - 30, base - 90 - scale(r.b) * 0.9, 60, scale(r.b) * 0.9), COLOURS[0]);
    } else if (name.startsWith('angle')) {
      const wedge = (cx: number, x: number) => sectorPts(cx, 190, 120, -Math.PI / 2, -Math.PI / 2 + (x / 100) * Math.PI);
      poly('markA', wedge(ax, r.a), COLOURS[0]);
      poly('markB', wedge(bx, r.b), COLOURS[0]);
    } else if (name.startsWith('area')) {
      const R = 90;
      poly('markA', circlePts(ax, 190, R * Math.sqrt(r.a / 100)), COLOURS[0]);
      poly('markB', circlePts(bx, 190, R * Math.sqrt(r.b / 100)), COLOURS[0]);
    } else {
      // Lightness: darker is more. Same square, same size; only the shade carries the value.
      const tone = (x: number) => `hsl(205,70%,${Math.round(96 - (x / 100) * 66)}%)`;
      poly('markA', rectPts(ax - 70, 120, 140, 140), tone(r.a), { stroke: ink, sw: 1, so: 0.25 });
      poly('markB', rectPts(bx - 70, 120, 140, 140), tone(r.b), { stroke: ink, sw: 1, so: 0.25 });
    }
    text(ax, base + 40, 'A', 22, 'middle', 'ch:A', { wt: 700 });
    text(bx, base + 40, 'B', 22, 'middle', 'ch:B', { wt: 700 });
    text(740, 150, 'B is what % of A?', 26, 'middle', 'ch:q', { wt: 700 });
    if (st.labels) {
      const pct = Math.round((r.b / (r.a || 1)) * 100);
      text(740, 220, `${pct}%`, 64, 'middle', 'ch:answer', { fill: '#d55e00', wt: 700 });
    }
    return els;
  }
  if (st.kind === 'scales') {
    // A signed table (change against last year) as a heatmap. The scale follows the attribute's
    // ordering direction: sequential misreads a signed attribute; diverging gives zero the palest
    // colour; red–green collapses under deuteranopia (simulated with Machado et al.'s 2009 matrix),
    // blue–orange survives. mode 'cyclic' adds the month strip, sequential against cyclic.
    const all = t.series.slice(0, 12), nr = Math.min(cats.length, 6), nc = all.length;
    const left = 150, top = 46, cw = Math.min(62, 780 / Math.max(1, nc)), ch = 38;
    const vals = cats.slice(0, nr).flatMap((_, i) => all.map((s2) => val(s2.values[i])));
    const lo = Math.min(...vals), hi = Math.max(...vals), lim = Math.max(Math.abs(lo), Math.abs(hi)) || 1;
    const lerp = (a: number[], b: number[], u: number) => a.map((x, k) => x + (b[k] - x) * u);
    const hex = (c: number[]) => '#' + c.map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
    const rgb = (h: string) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
    const PALE = rgb('#f5f5f5');
    const colourOf = (x: number): number[] => {
      if (st.scheme === 'rg' || st.scheme === 'bo') {
        const neg = rgb(st.scheme === 'rg' ? '#c8102e' : '#b35806'), pos = rgb(st.scheme === 'rg' ? '#1a8a3a' : '#2166ac');
        const u = Math.max(-1, Math.min(1, x / lim));
        return u < 0 ? lerp(PALE, neg, -u) : lerp(PALE, pos, u);
      }
      const u = hi > lo ? (x - lo) / (hi - lo) : 0;
      return lerp(rgb('#eef4fb'), rgb('#08306b'), u);
    };
    const toLin = (c: number) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    const toSrgb = (c: number) => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
    const DEUTAN = [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]];
    const seen = (c: number[]) => {
      if (st.cvd !== 'deutan') return hex(c);
      const l = c.map(toLin);
      return hex(DEUTAN.map((row) => toSrgb(Math.max(0, Math.min(1, row[0] * l[0] + row[1] * l[1] + row[2] * l[2])))));
    };
    const luma = (c: number[]) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    cats.slice(0, nr).forEach((cat, i) => {
      text(left - 14, top + ch * i + ch / 2 + 6, cat, 17, 'end', `category:${i}`);
      all.forEach((s2, j) => {
        const x = val(s2.values[i]), c = colourOf(x);
        poly(`cell:${i}:${j}`, rectPts(left + cw * j + 1, top + ch * i + 1, cw - 2, ch - 2), seen(c));
        text(left + cw * j + cw / 2, top + ch * i + ch / 2 + 5, x > 0 ? `+${x}` : x, 13, 'middle', `val:${i}:${j}`, { fill: luma(c) < 120 ? '#ffffff' : '#1a1a1a' });
      });
    });
    all.forEach((s2, j) => text(left + cw * j + cw / 2, top - 12, s2.name, 14, 'middle', `xcat:${j}`, { wt: 700 }));
    const ly = top + ch * nr + 30;
    if (st.mode === 'cyclic') {
      // Months are cyclic: December sits next to January. A sequential scale puts them at opposite
      // ends; a cyclic one (equal lightness round the hue wheel) brings them back together.
      const hsl = (h: number, sat = 0.55, l = 0.55) => {
        const a = sat * Math.min(l, 1 - l), f2 = (n: number) => { const k = (n + h / 30) % 12; return 255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))); };
        return [f2(0), f2(8), f2(4)];
      };
      text(left - 14, ly + 20, 'Sequential', 15, 'end', 'strip:seq', { wt: 700 });
      text(left - 14, ly + 62, 'Cyclic', 15, 'end', 'strip:cyc', { wt: 700 });
      all.forEach((_, j) => {
        poly(`seq:${j}`, rectPts(left + cw * j + 1, ly, cw - 2, 30), hex(lerp(rgb('#eef4fb'), rgb('#08306b'), nc > 1 ? j / (nc - 1) : 0)));
        poly(`cyc:${j}`, rectPts(left + cw * j + 1, ly + 42, cw - 2, 30), hex(hsl((j / nc) * 360)));
      });
      return els;
    }
    // A legend: the scale from the most negative value to the most positive, zero marked.
    const steps = 24, lw = Math.min(cw * nc, 560);
    for (let k = 0; k < steps; k++) {
      const x = st.scheme === 'rg' || st.scheme === 'bo' ? -lim + (2 * lim * k) / (steps - 1) : lo + ((hi - lo) * k) / (steps - 1);
      poly(`leg:${k}`, rectPts(left + (lw / steps) * k, ly, lw / steps + 0.5, 18), seen(colourOf(x)));
    }
    const lMin = st.scheme === 'rg' || st.scheme === 'bo' ? -lim : lo, lMax = st.scheme === 'rg' || st.scheme === 'bo' ? lim : hi;
    text(left, ly + 42, lMin, 14, 'start', 'leg:min');
    text(left + lw, ly + 42, lMax > 0 ? `+${lMax}` : lMax, 14, 'end', 'leg:max');
    if (lMin < 0 && lMax > 0) text(left + (lw * (0 - lMin)) / (lMax - lMin), ly + 42, '0', 14, 'middle', 'leg:zero', { wt: 700 });
    return els;
  }
  if (st.kind === 'network') {
    // One dataset, abstracted two ways. mode 'table': songs × words, how often each word is sung.
    // mode 'matrix': the derived word × word co-occurrence (the smaller count summed over songs).
    // mode 'network': words as nodes, co-occurrence as links, laid out by a small deterministic force
    // simulation. A word keeps its key (word:j) as a column heading, a matrix heading and a node label.
    const nr = Math.min(cats.length, 10), words = ser.map((s2) => s2.name), nw = words.length;
    const co = words.map((_, a) => words.map((__, b) => (a === b ? 0 : cats.slice(0, nr).reduce((acc, _c, i) => acc + Math.min(v(i, a), v(i, b)), 0))));
    const maxCo = Math.max(1, ...co.flat());
    const tone = (u: number) => `hsl(205,65%,${Math.round(95 - u * 66)}%)`;
    if (st.mode === 'matrix') {
      const left = 300, top = 60, cw = Math.min(70, 520 / nw), chh = Math.min(42, 290 / nw);
      words.forEach((w, a) => {
        text(left - 14, top + chh * a + chh / 2 + 6, w, 17, 'end', `wordrow:${a}`);
        text(left + cw * a + cw / 2, top - 14, w, 16, 'middle', `word:${a}`, { wt: 700 });
        words.forEach((__, b) => {
          const x = co[a][b], u = x / maxCo;
          poly(`co:${Math.min(a, b)}:${Math.max(a, b)}:${a < b ? 'u' : 'l'}`, rectPts(left + cw * b + 1, top + chh * a + 1, cw - 2, chh - 2), a === b ? '#e8e8e8' : tone(u));
          if (a !== b) text(left + cw * b + cw / 2, top + chh * a + chh / 2 + 5, x, 13, 'middle', `cov:${a}:${b}`, { fill: u > 0.55 ? '#ffffff' : '#1a1a1a' });
        });
      });
      return els;
    }
    if (st.mode === 'network') {
      // Communities first, found from the data: seed with the least-linked pair of words and give every
      // word to the seed it is sung with more. The layout then keeps each community together, so the
      // structure is visible before it is coloured.
      const totals = words.map((_, a) => cats.slice(0, nr).reduce((acc, _c, i) => acc + v(i, a), 0)), maxT = Math.max(1, ...totals);
      let s1 = 0, s2 = 1;
      for (let a = 0; a < nw; a++) for (let b = a + 1; b < nw; b++) if (co[a][b] < co[s1][s2]) { s1 = a; s2 = b; }
      const group = words.map((_, a) => (a === s1 ? 0 : a === s2 ? 1 : co[a][s1] >= co[a][s2] ? 0 : 1));
      const P: number[][] = words.map(() => [0, 0]);
      [0, 1].forEach((g) => {
        const members = words.map((_, a) => a).filter((a) => group[a] === g), cxg = g === 0 ? 250 : 590, k = members.length;
        members.forEach((a, n) => { const ang = -Math.PI / 2 + (n / Math.max(1, k)) * Math.PI * 2; P[a] = [cxg + (k > 1 ? 105 : 0) * Math.cos(ang), 185 + (k > 1 ? 95 : 0) * Math.sin(ang)]; });
      });

      for (let a = 0; a < nw; a++) for (let b = a + 1; b < nw; b++) {
        const u = co[a][b] / maxCo;
        if (u < 0.35) continue;
        line(`edge:${a}:${b}`, P[a][0], P[a][1], P[b][0], P[b][1], '#7a8a99', 1 + u * 9, 0.35 + u * 0.5);
      }
      words.forEach((w, a) => {
        const r = 16 + 20 * Math.sqrt(totals[a] / maxT);
        poly(`node:${a}`, circlePts(P[a][0], P[a][1], r), st.labels ? COLOURS[group[a]] : COLOURS[0], { stroke: '#ffffff', sw: 2 });
        text(P[a][0], P[a][1] + r + 22, w, 18, 'middle', `word:${a}`, { wt: 700 });
      });
      text(750, 140, 'Nodes: words', 17, 'start', 'net:k1');
      text(750, 168, 'Links: shared songs', 17, 'start', 'net:k2');
      text(750, 196, 'Width: how often', 17, 'start', 'net:k3');
      if (st.labels) { text(750, 246, 'Two communities:', 17, 'start', 'net:k4', { wt: 700, fill: '#d55e00' }); text(750, 272, 'the Cluster task', 17, 'start', 'net:k5', { wt: 700, fill: '#d55e00' }); }
      return els;
    }
    // mode 'table' (default): the songs × words table the lyrics come as.
    const left = 190, top = 44, cw = Math.min(100, 700 / nw), chh = Math.min(38, 300 / nr);
    const mx = Math.max(1, ...cats.slice(0, nr).flatMap((_, i) => words.map((__, j) => v(i, j))));
    cats.slice(0, nr).forEach((cat, i) => {
      text(left - 14, top + chh * i + chh / 2 + 6, cat, 16, 'end', `category:${i}`);
      words.forEach((__, j) => {
        const x = v(i, j), u = x / mx;
        poly(`cell:${i}:${j}`, rectPts(left + cw * j + 1, top + chh * i + 1, cw - 2, chh - 2), tone(u));
        text(left + cw * j + cw / 2, top + chh * i + chh / 2 + 5, x, 13, 'middle', `val:${i}:${j}`, { fill: u > 0.55 ? '#ffffff' : '#1a1a1a' });
      });
    });
    words.forEach((w, j) => text(left + cw * j + cw / 2, top - 12, w, 16, 'middle', `word:${j}`, { wt: 700 }));
    return els;
  }
  return els;
}

const NESTED = 'Level\tAsks\tThreat\nDomain situation\tWho are the target users?|What do they need to do?\tYou misunderstood|their needs\nData/task abstraction\tWhat is shown? (data)|Why are they looking? (task)\tYou’re showing them|the wrong thing\nIdiom\tHow is it shown? (encoding)|How is it manipulated? (interaction)\tThe way you show it|doesn’t work\nAlgorithm\tHow is it computed|efficiently?\tYour code is|too slow';

const SONG = 'Word\tVerse 1\tChorus 1\tVerse 2\tChorus 2\tBridge\nlove\t2\t4\t1\t4\t2\nbaby\t0\t3\t1\t3\t0\nnight\t3\t1\t2\t1\t1\ndance\t1\t2\t0\t2\t4\nheart\t1\t0\t2\t0\t1';

const CHANNELS = 'Channel\tA\tB\nPosition\t80\t36\nLength\t80\t52\nAngle\t100\t35\nArea\t100\t60\nLightness\t100\t50';

const SCALES = 'Genre\tJan\tFeb\tMar\tApr\tMay\tJun\tJul\tAug\tSep\tOct\tNov\tDec\nPop\t3\t4\t2\t-1\t-4\t-6\t-7\t-5\t-2\t1\t4\t6\nHip-hop\t-2\t-1\t1\t3\t5\t7\t8\t6\t3\t0\t-2\t-3\nRock\t1\t0\t-1\t-2\t-2\t-3\t-2\t-1\t0\t1\t1\t2\nJazz\t-4\t-3\t-2\t0\t1\t2\t1\t0\t-1\t-3\t-4\t-5\nClassical\t6\t5\t3\t1\t-1\t-3\t-4\t-3\t-1\t2\t4\t7';

const FRUIT = 'Fruit\tApril\tMay\tJune\nApple\t82\t70\t20\nPear\t73\t50\t33\nPeach\t67\t45\t28\nOrange\t85\t65\t17\nKiwi\t54\t42\t24\nMelon\t33\t58\t20';

/** The demonstrations built on the new kinds, for both engines' preset lists. */
export const KIND_PRESETS: Record<string, KPreset> = {
  reshape: { label: 'Reshape: wide to long', prompt: 'A chart needs Month on an axis. Where is Month in this table?', data: FRUIT, states: [
    { label: 'As supplied', kind: 'grid', explanation: 'Six fruit, three months. Each row is one fruit, and April, May and June sit in the headings.' },
    { label: 'Items', kind: 'grid', band: 'items', explanation: 'Each row is an item: one fruit. Six items.' },
    { label: 'One attribute', kind: 'grid', band: 'attributes', explanation: 'April, May and June are not three attributes. They hold one attribute, quantity sold, split by the values of another: month.' },
    { label: 'Wide to long', kind: 'long', variable: 'Month', measure: 'Quantity', explanation: 'Watch each number travel. It keeps its value and now carries its month in its row: 6 fruit × 3 months = 18 rows. Month is a column you can put on an axis. In pandas this is melt; in Altair, transform_fold.' },
    { label: 'Name the types', kind: 'long', typed: true, variable: 'Month', measure: 'Quantity', explanation: 'Fruit is nominal: names, no order. Month is ordinal: April, May, June has an order. Quantity is quantitative: zero means none sold, so 80 is twice 40.' },
    { label: 'Derive a total', kind: 'grid', derive: true, explanation: 'Back to the supplied shape, with the Total column the original table had. Nobody counted it: it is computed, April + May + June. A derived attribute.' }] },
  tasks: { label: 'Tasks: one table, five questions', prompt: 'Same fruit data. Which chart answers each question fastest?', data: FRUIT, states: [
    { label: 'Month totals', kind: 'groups', mode: 'series-totals', explanation: 'Discover. Summarise over all fruit by adding up each month. April sold most: 394, against 330 in May and 142 in June. These totals are derived; the table never listed them.' },
    { label: 'Oranges in May', kind: 'groups', focus: [3, 1], labels: true, explanation: 'Locate one value: 65. Every bar is drawn but only one matters, so the rest step back. For one number, the table would do just as well.' },
    { label: 'Apple v Orange', kind: 'lines', transpose: true, only: [0, 3], labels: true, explanation: 'Compare. Apple 82 → 70 → 20; Orange 85 → 65 → 17. Both fall; Orange starts higher and ends lower. A line suits an ordered attribute like month.' },
    { label: 'The odd one out', kind: 'lines', transpose: true, focus: 5, explanation: 'Find the anomaly. Five fruit fall from April to May. Melon rises, 33 → 58: the only one.' },
    { label: 'Fruit totals', kind: 'groups', mode: 'totals', sort: true, colourBy: 'mono', explanation: 'The months stack into one bar per fruit and sort. Apple leads with 172, just ahead of Orange with 167. Sorting turns find-the-maximum into read-the-first.' }] },
  derive: { label: 'Derived attributes: a balance', prompt: 'Exports and imports are both measured. Where is the trade balance?', data: 'Year\tExports\tImports\n2019\t30\t22\n2020\t28\t40\n2021\t45\t42\n2022\t70\t50\n2023\t52\t63\n2024\t80\t58', states: [
    { label: 'Two attributes', kind: 'lines', explanation: 'Exports and imports over six years, in the same units.' },
    { label: 'Show the gap', kind: 'lines', gap: true, explanation: 'The balance is the gap between the lines: blue where exports are higher, orange where imports are. Judging distances between two lines is hard.' },
    { label: 'Drop to zero', kind: 'balance', explanation: 'Each gap falls to a zero baseline and keeps its length. Trade balance = exports − imports: a new attribute, derived by arithmetic. It can be negative, so zero sits in the middle.' },
    { label: 'Running total', kind: 'balance', cumulative: true, explanation: 'Cumulative data is derived too: add each year’s balance to the years before. Same data, a different question: where do we stand overall?' }] },
  rescue3d: { label: 'Critique: rescue a 3D chart', prompt: 'Same fruit, same numbers. What stops you reading this chart, and what would you fix first?', data: FRUIT, states: [
    { label: '3D default', kind: 'oblique', explanation: 'Perspective hides the back rows and makes heights hard to judge. Colour repeats the fruit names already on the axis. The shaded walls add ink but no data.' },
    { label: 'Flatten, stack', kind: 'groups', mode: 'stacked', colourBy: 'series', explanation: 'Depth gone: nothing is hidden. Colour now shows month, light to dark because months are ordered. But only April sits on the baseline, so comparing May across fruit is hard.' },
    { label: 'Side by side', kind: 'groups', mode: 'grouped', colourBy: 'series', explanation: 'Every month now starts at zero, so comparing May with May is a length comparison. Melon is the only fruit that sold more in May than in April.' },
    { label: 'One question', kind: 'groups', mode: 'totals', sort: true, colourBy: 'mono', explanation: 'If the question is which fruit sells most, stack the months into a derived total and sort. Apple, 172.' }] },
  pies: { label: 'Pie variants: angle, area, length', prompt: 'Four genres’ share of a playlist. In which version can you tell Hip-hop from Rock most confidently?', data: 'Genre\tShare\nPop\t40\nHip-hop\t25\nRock\t20\nJazz\t15', states: [
    { label: 'Pie', kind: 'pie', explanation: 'Angle and area carry the share. Hip-hop (25) and Rock (20) look close.' },
    { label: 'Doughnut', kind: 'donut', explanation: 'The centre is cut out, so the angle at the middle is gone. You read arc length instead: harder, not easier.' },
    { label: 'Exploded', kind: 'exploded', explanation: 'Pulling the slices apart adds emphasis and separation, but no accuracy.' },
    { label: 'Polar area', kind: 'rose', explanation: 'Equal angles; the radius changes so that each wedge’s area is its share, as in Nightingale’s rose diagram. Areas are hard to compare.' },
    { label: 'Bars', kind: 'bar', categorical: true, explanation: 'Aligned length from a common baseline: the most accurate of the five. Hip-hop 25 beats Rock 20 at a glance.' }] },
  nested: { label: 'Nested model: four levels', prompt: 'You are asked to build a dashboard. Where do you start: with the users, the data, the chart or the code?', data: NESTED, states: [
    { label: 'Domain', kind: 'nested', focus: 0, explanation: 'The outer box: the people and their problem. Everything else sits inside it, so nothing inside can rescue a misunderstood domain.' },
    { label: 'Abstraction', kind: 'nested', focus: 1, explanation: 'Translate the domain into vis vocabulary: what is shown (data abstraction) and why the user is looking (task abstraction). What? and Why? live here.' },
    { label: 'Idiom', kind: 'nested', focus: 2, explanation: 'How? The visual encoding (how to draw it) and the interaction (how to manipulate it).' },
    { label: 'Algorithm', kind: 'nested', focus: 3, explanation: 'The innermost box: compute it efficiently. A fast algorithm cannot save the wrong idiom.' },
    { label: 'Four threats', kind: 'nested', threats: true, explanation: 'Each level has its own way to fail. A failure at an outer level cascades inward, so work outside in when you start from a problem.' }] },
  emoji: { label: 'Units as icons: animals', prompt: 'One mark per animal. What changes when the mark becomes a picture, and what must not?', data: 'Animal\tGreat Britain\tUnited States\ncattle\t3\t2\npigs\t2\t1\nsheep\t1\t3', states: [
    { label: 'One dot each', kind: 'units', size: 58, explanation: 'A unit chart: one dot per animal, in a column for each country. Count the dots, and the counts are the data.' },
    { label: 'Dots become icons', kind: 'units', size: 58, icons: ['🐄', '🐖', '🐑'], explanation: 'Each dot becomes its animal. The icon repeats the row label, so it adds recognition, not data: the count is still the number of marks, never their size.' },
    { label: 'Count them', kind: 'units', size: 58, stack: true, icons: ['🐄', '🐖', '🐑'], explanation: 'Stack each animal’s icons into one row: cattle 5, sheep 4, pigs 3. The faint discs keep each country’s colour.' }] },
  idioms: { label: 'Idioms: one song, three charts', prompt: 'Same song, same counts. Which chart gives the overview, which lets you explore, which shows the song’s shape?', data: SONG, states: [
    { label: 'Streamgraph', kind: 'stream', explanation: 'Overview. X: position in the song. Thickness: how often each word is sung there. Colour: the word. The stream swells at the choruses.' },
    { label: 'Unit chart', kind: 'units', colourBy: 'category', explanation: 'Exploration. One mark per sung word, by section. Every mark can be hovered to show the word in its line.' },
    { label: 'Area chart', kind: 'area', explanation: 'The song’s dynamics. Each word from zero, see-through, so peaks can be compared; animate it for the “liquid” version. Colour: the word.' }] },
  cluster: { label: 'Cluster: reorder a heatmap', prompt: 'Eight songs, six words, how often each is sung. Are there groups of songs?', data: 'Song\tlove\tparty\theart\tdance\tbaby\tnight\nSong 1\t1\t8\t0\t9\t2\t7\nSong 2\t8\t1\t9\t0\t7\t2\nSong 3\t0\t9\t1\t8\t1\t8\nSong 4\t9\t2\t7\t1\t8\t1\nSong 5\t2\t7\t1\t9\t0\t9\nSong 6\t7\t0\t8\t2\t9\t1\nSong 7\t1\t8\t2\t7\t1\t9\nSong 8\t8\t1\t8\t1\t6\t3', states: [
    { label: 'As collected', kind: 'heatmap', explanation: 'Darker means the word is sung more. In the order the songs were collected, it looks like noise.' },
    { label: 'Reorder the rows', kind: 'heatmap', rowOrder: [1, 3, 5, 7, 0, 2, 4, 6], explanation: 'Only the order of the songs changes. Every cell keeps its value, and a pattern starts to show.' },
    { label: 'Reorder the columns', kind: 'heatmap', rowOrder: [1, 3, 5, 7, 0, 2, 4, 6], colOrder: [0, 2, 4, 1, 3, 5], boxes: [[0, 3, 0, 2, 'Ballads'], [4, 7, 3, 5, 'Club songs']], explanation: 'Put similar words together too and two blocks appear: love, heart, baby songs and party, dance, night songs. That is the Cluster task, and ordering is the channel that reveals it.' }] },
  units: { label: 'Units: from words to frequency', prompt: 'The raw data is words in the order they are sung. Where does “frequency” come from?', data: SONG, states: [
    { label: 'In time order', kind: 'units', explanation: 'One dot each time a word is sung, placed in its section. This is a unit chart: every mark is one word you could hover over to see in context.' },
    { label: 'Count them', kind: 'units', stack: true, explanation: 'The dots slide into one row per word. Frequency was never in the lyrics: it is derived by counting. The colour still shows which section each came from.' },
    { label: 'Sort', kind: 'units', stack: true, sort: true, explanation: 'Sorted, the extremum reads first: love, 13 times. Chorus colours dominate, because choruses repeat.' }] },
  channels: { label: 'Perception: one ratio, five channels', prompt: 'Each pair asks the same question: B is what percentage of A? How sure are you of each answer?', data: CHANNELS, states: [
    { label: 'Position', kind: 'channels', focus: 0, labels: true, explanation: 'Two dots against one common scale. B is 45% of A. Answers usually cluster tightly here: position on a common scale is the most accurately read channel.' },
    { label: 'Length', kind: 'channels', focus: 1, labels: true, explanation: 'Two bars that do not share a baseline, so only their lengths can be compared. B is 65% of A. Without the common baseline, estimates spread wider.' },
    { label: 'Angle', kind: 'channels', focus: 2, labels: true, explanation: 'Two wedges from the same starting line. B is 35% of A. Angles are read less accurately than lengths: this is the pie chart’s channel.' },
    { label: 'Area', kind: 'channels', focus: 3, labels: true, explanation: 'Two circles. B has 60% of A’s area. Area tends to be underestimated, because the eye compares widths as well as areas.' },
    { label: 'Lightness', kind: 'channels', focus: 4, labels: true, explanation: 'Two shades. B is 50% of A. Lightness shows order well (darker is more) but is poor for reading how much more.' },
    { label: 'The ranking', kind: 'channels', mode: 'ranking', explanation: 'Position on a common scale, length, angle, area, lightness: the order Cleveland and McGill measured in 1984 and Heer and Bostock replicated in 2010. Munzner calls this effectiveness: give the most important attribute the most accurate channel.' }] },
  scales: { label: 'Colour scales: follow the ordering', prompt: 'Change in streams against last year, by genre and month. Which cells went up, which went down, and which barely moved?', data: SCALES, states: [
    { label: 'Sequential', kind: 'scales', scheme: 'seq', explanation: 'Light to dark, lowest to highest. But this attribute is signed: the palest cells are the biggest falls, not “no change”, and zero has no colour of its own.' },
    { label: 'Diverging', kind: 'scales', scheme: 'rg', explanation: 'A diverging scale: zero is palest, falls go one way and rises the other. The attribute’s ordering direction (it diverges from zero) chooses the scale.' },
    { label: 'Deuteranopia', kind: 'scales', scheme: 'rg', cvd: 'deutan', explanation: 'The same red–green scale with deuteranopia simulated (Machado et al., 2009). Around 1 in 12 men have a red–green colour vision deficiency. Rises and falls now look alike.' },
    { label: 'Blue–orange', kind: 'scales', scheme: 'bo', explanation: 'Still diverging, zero still palest, but blue against orange.' },
    { label: 'Deuteranopia again', kind: 'scales', scheme: 'bo', cvd: 'deutan', explanation: 'Simulated deuteranopia again: rises and falls stay distinct, because blue and orange differ along the blue–yellow axis that deuteranopia keeps.' },
    { label: 'Cyclic months', kind: 'scales', scheme: 'bo', mode: 'cyclic', explanation: 'Month is ordered too, but cyclic: December sits next to January. A sequential scale puts them at opposite ends; a cyclic scale, equally light all the way round the hue wheel, brings them back together.' }] },
  network: { label: 'Table or network: words that co-occur', prompt: 'The same lyric counts as the heatmap. Could they be a network rather than a table?', data: 'Song\tlove\tparty\theart\tdance\tbaby\tnight\nSong 1\t1\t8\t0\t9\t2\t7\nSong 2\t8\t1\t9\t0\t7\t2\nSong 3\t0\t9\t1\t8\t1\t8\nSong 4\t9\t2\t7\t1\t8\t1\nSong 5\t2\t7\t1\t9\t0\t9\nSong 6\t7\t0\t8\t2\t9\t1\nSong 7\t1\t8\t2\t7\t1\t9\nSong 8\t8\t1\t8\t1\t6\t3', states: [
    { label: 'A table', kind: 'network', mode: 'table', explanation: 'As collected: a table. The eight songs are the items, the six words are the attributes, and each cell counts how often a word is sung.' },
    { label: 'Derive pairs', kind: 'network', mode: 'matrix', explanation: 'A derived table: for each pair of words, add up how often they are sung in the same song (the smaller count, song by song). The songs have gone; words are now the items on both sides.' },
    { label: 'A network', kind: 'network', mode: 'network', explanation: 'Words become nodes and co-occurrence becomes links. Same data, now abstracted as a network, so network idioms and tasks, such as following paths or finding hubs, become available.' },
    { label: 'Communities', kind: 'network', mode: 'network', labels: true, explanation: 'The links split the words into two communities: love, heart, baby and party, dance, night. It is the Cluster task again, found this time from the links rather than by reordering a heatmap.' }] },
};
