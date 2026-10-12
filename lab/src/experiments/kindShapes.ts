// What the chart-experiment kinds draw with: their colours, the table they read, outlines of 64 points (so
// any mark can become any other) and the scale (from experimentKinds.ts).

export const COLOURS = ['#0072b2', '#d55e00', '#009e73', '#cc79a7', '#8a6500', '#5b4ba8'];
/** The saturated hues a 3D default hands out, one per category: the thing being critiqued. */
export const RAINBOW = ['#e0201b', '#1f3fd6', '#27b83a', '#8a2be2', '#f28c1b', '#e8d51b'];
export const TYPE_COLOURS = ['#0072b2', '#009e73', '#d55e00', '#cc79a7'];
/** A balance's sign takes the colour of the line that is higher: the first series, then the second. */
export const POS = '#0072b2', NEG = '#d55e00', MONO = '#0072b2', DERIVED = '#cc79a7';

/** An ordered attribute's colour: light to dark in one hue. */
export function ramp(j: number, m: number) {
  const l = m <= 1 ? 45 : 78 - (j / (m - 1)) * 50;
  return `hsl(205,62%,${Math.round(l)}%)`;
}

export function shade(hex: string, f: number) {
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
export function along(verts: number[][]) {
  const pts: number[][] = [];
  for (let i = 0; i < 64; i++) {
    const q = (i / 64) * verts.length, j = Math.floor(q), t = q - j, u = verts[j], v = verts[(j + 1) % verts.length];
    pts.push([u[0] + (v[0] - u[0]) * t, u[1] + (v[1] - u[1]) * t]);
  }
  return pts;
}
export const rectPts = (x: number, y: number, w: number, h: number) => along([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);
export function circlePts(cx: number, cy: number, r: number) {
  const pts: number[][] = [];
  for (let i = 0; i < 64; i++) { const g = -Math.PI / 2 + (i / 64) * Math.PI * 2; pts.push([cx + r * Math.cos(g), cy + r * Math.sin(g)]); }
  return pts;
}
/** A pie slice, drawn the way the older pie kind draws it: out from the centre, round, back. */
export function sectorPts(cx: number, cy: number, r: number, start: number, end: number) {
  const pts: number[][] = [];
  for (let i = 0; i < 64; i++) {
    const g = start + (end - start) * Math.max(0, Math.min(1, (i - 8) / 47)), rr = i < 8 ? (r * i) / 8 : i > 55 ? (r * (64 - i)) / 9 : r;
    pts.push([cx + rr * Math.cos(g), cy + rr * Math.sin(g)]);
  }
  return pts;
}
/** A ring segment: the outer arc one way, the inner arc back. */
export function ringPts(cx: number, cy: number, r0: number, r1: number, start: number, end: number) {
  const pts: number[][] = [];
  for (let i = 0; i < 32; i++) { const g = start + ((end - start) * i) / 31; pts.push([cx + r1 * Math.cos(g), cy + r1 * Math.sin(g)]); }
  for (let i = 0; i < 32; i++) { const g = end - ((end - start) * i) / 31; pts.push([cx + r0 * Math.cos(g), cy + r0 * Math.sin(g)]); }
  return pts;
}

/** A round axis maximum: 1, 2, 2.5 or 5 times a power of ten. */
export function niceMax(v: number) {
  if (!(v > 0)) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}
export const sum = (a: number[]) => a.reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0);
export const val = (v: number) => (Number.isFinite(v) ? v : 0);
