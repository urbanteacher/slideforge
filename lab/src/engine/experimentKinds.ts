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
 */

export interface KState {
  label: string; kind: string; explanation?: string; series?: number;
  band?: string; derive?: boolean; typed?: boolean; variable?: string; measure?: string; types?: string[];
  mode?: string; colourBy?: string; focus?: number[] | number; sort?: boolean; junk?: boolean; labels?: boolean;
  transpose?: boolean; only?: number[]; gap?: boolean; cumulative?: boolean; stack?: boolean; hideValues?: boolean;
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

export const KINDS = ['grid', 'long', 'groups', 'lines', 'balance', 'oblique', 'donut', 'exploded', 'rose', 'units'];

/** Each new kind's small symbol for its step button. */
export const KIND_GLYPHS: Record<string, string> = {
  grid: '▦', long: '≡', groups: '▮', lines: '╱', balance: '±', oblique: '▣',
  donut: '◎', exploded: '◔', rose: '✿', units: '∷',
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
    const left = 150, right = 960, top = 58, rh = Math.min(44, 262 / nr), r = 5.5;
    const rowY = (p: number) => top + rh * (p + 0.5) + 8;
    const colW = (right - left) / m;
    if (!st.stack) ser.forEach((s, j) => {
      text(left + colW * (j + 0.5), 36, s.name, 16, 'middle', `sec:${j}`, { wt: 700 });
      if (j) line(`sep:${j}`, left + colW * j, 46, left + colW * j, top + rh * nr + 12, ink, 1, 0.15);
    });
    const maxTot = Math.max(1, ...tot), d = Math.min(16, (right - left - 60) / maxTot);
    order.forEach((i, p) => {
      const y = rowY(p);
      text(left - 16, y + 6, rows[i], 17, 'end', `category:${i}`);
      let idx = 0;
      counts[i].forEach((c, j) => {
        const dd = Math.min(16, (colW * 0.9) / Math.max(1, c));
        for (let k = 0; k < c; k++) {
          const x = st.stack ? left + 10 + idx * d : left + colW * (j + 0.5) - ((c - 1) * dd) / 2 + k * dd;
          poly(`unit:${i}:${j}:${k}`, circlePts(x, y, r), ramp(j, m));
          idx++;
        }
      });
      if (st.stack) text(left + 10 + tot[i] * d + 8, y + 6, tot[i], 18, 'start', `count:${i}`, { wt: 700 });
    });
    if (st.stack) ser.forEach((s, j) => {
      const lx = 500 - (m * 140) / 2 + j * 140;
      poly(`legend:${j}`, circlePts(lx + 7, 352, 7), ramp(j, m));
      text(lx + 20, 358, s.name, 15, 'start', `lname:${j}`);
    });
    return els;
  }
  return els;
}

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
  units: { label: 'Units: from words to frequency', prompt: 'The raw data is words in the order they are sung. Where does “frequency” come from?', data: 'Word\tVerse 1\tChorus 1\tVerse 2\tChorus 2\tBridge\nlove\t2\t4\t1\t4\t2\nbaby\t0\t3\t1\t3\t0\nnight\t3\t1\t2\t1\t1\ndance\t1\t2\t0\t2\t4\nheart\t1\t0\t2\t0\t1', states: [
    { label: 'In time order', kind: 'units', explanation: 'One dot each time a word is sung, placed in its section. This is a unit chart: every mark is one word you could hover over to see in context.' },
    { label: 'Count them', kind: 'units', stack: true, explanation: 'The dots slide into one row per word. Frequency was never in the lyrics: it is derived by counting. The colour still shows which section each came from.' },
    { label: 'Sort', kind: 'units', stack: true, sort: true, explanation: 'Sorted, the extremum reads first: love, 13 times. Chorus colours dominate, because choruses repeat.' }] },
};
