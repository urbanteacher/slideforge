// The plan every chart is drawn on, its scales, and the strokes they share.

export type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
// ─── Scales ─────────────────────────────────────────────────────────────────
export function niceMax(v: number) {
  if (!(v > 0)) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  return ([1, 2, 2.5, 5, 10].find((s) => s * mag >= v) ?? 10) * mag;
}
function niceStep(r: number) {
  if (!(r > 0)) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(r)));
  return ([1, 2, 2.5, 5, 10].find((m) => m * mag >= r) ?? 10) * mag;
}
export function niceRange(lo: number, hi: number) {
  if (!(hi > lo)) return { lo: Math.min(0, lo), hi: (hi || 0) + 1 };
  const span = hi - lo, step = niceStep(span / 4);
  return { lo: lo >= 0 && lo <= span * 0.15 ? 0 : Math.floor(lo / step) * step, hi: Math.ceil((hi + span * 0.1) / step) * step };
}
export const ticks = (max: number) => [0, 1, 2, 3, 4].map((i) => (max * i) / 4);
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
export const W = 1180;
export let H = 430;
/** The plan's height for the drawing about to be made (drawTableChart): the charts read H. */
export function setPlanHeight(h: number) { H = h; }
export const P = { padL: 92, padR: 40, padT: 22, padB: 62 };

export interface Pen {
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

export function rgba(hex: string, a: number) {
  const h = hex.replace('#', '');
  const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  const n = parseInt(f, 16);
  return Number.isFinite(n) ? `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})` : hex;
}

export function label(p: Pen, s: string, x: number, y: number, anchor: 'start' | 'middle' | 'end' = 'start', opts: { size?: number; weight?: number; color?: string; halo?: boolean } = {}) {
  const { ctx } = p;
  ctx.font = `${opts.weight ?? 500} ${(opts.size ?? 1) * p.px}px "${p.font}", system-ui, sans-serif`;
  ctx.textAlign = anchor === 'middle' ? 'center' : anchor === 'end' ? 'right' : 'left';
  ctx.textBaseline = 'alphabetic';
  if (opts.halo) { ctx.lineWidth = 3; ctx.strokeStyle = p.surface; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
  ctx.fillStyle = opts.color ?? p.dim;
  ctx.fillText(s, x, y);
}
export function line(p: Pen, x1: number, y1: number, x2: number, y2: number, stroke: string, width = 1) {
  const { ctx } = p;
  ctx.strokeStyle = stroke; ctx.lineWidth = width;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}
/** A column rounded 4px at its data end, square at the baseline. */
export function column(p: Pen, x: number, y: number, w: number, h: number, fill: string) {
  const { ctx } = p, r = Math.min(4, w / 2, h);
  ctx.fillStyle = fill;
  ctx.beginPath(); ctx.roundRect(x, y, w, Math.max(0, h), [r, r, 0, 0]); ctx.fill();
}
/** The value axis with its gridlines: hairlines one step off the surface, never dashed. */
export function valueGrid(p: Pen, max: number, padL: number, plotW: number, plotH: number, base = 0) {
  ticks(max).forEach((t) => {
    const y = P.padT + plotH - (t / max) * plotH;
    line(p, padL, y, padL + plotW, y, p.rule);
    label(p, fmt(base + t), padL - 14, y + p.px * 0.37, 'end');
  });
}
export const baseline = (p: Pen, padL: number, plotW: number, plotH: number) => line(p, padL, P.padT + plotH, padL + plotW, P.padT + plotH, p.rule, 1.5);
export const longestOf = (xs: string[]) => xs.reduce((n, c) => Math.max(n, String(c).length), 0);
