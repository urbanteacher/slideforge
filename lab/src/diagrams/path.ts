// Connector paths: diagram-design's rounded right-angle elbows (r=8, scaled), and the measures the
// drawing and the rule checks need — length, a point a distance along, and samples.
import type { Pt, Rect, Seg } from './types';

const len = (a: Pt, b: Pt) => Math.hypot(b.x - a.x, b.y - a.y);

/**
 * An orthogonal polyline as straight pieces with a quarter circle at each corner, of radius r or less
 * where a piece is too short to hold it. The last piece stops `head` short of the end, where the
 * arrowhead takes over; returns the head's tip and direction too.
 */
export function elbow(points: Pt[], r: number, head = 0): { segs: Seg[]; tip: Pt; dir: number } {
  const pts = points.filter((p, i) => i === 0 || len(p, points[i - 1]) > 0.01);
  const segs: Seg[] = [];
  const n = pts.length;
  const tip = pts[n - 1];
  const last = pts[n - 2] ?? tip;
  const dir = Math.atan2(tip.y - last.y, tip.x - last.x);
  let from = pts[0];
  for (let i = 1; i < n - 1; i++) {
    const p = pts[i], a = pts[i - 1], b = pts[i + 1];
    const lin = len(a, p), lout = len(p, b);
    const d1 = { x: (p.x - a.x) / lin, y: (p.y - a.y) / lin }, d2 = { x: (b.x - p.x) / lout, y: (b.y - p.y) / lout };
    // Each corner may take half of a piece it shares with another corner, all of an end piece (less the head).
    const rr = Math.min(r, i === 1 ? lin : lin / 2, i === n - 2 ? lout - head : lout / 2);
    const s = { x: p.x - d1.x * rr, y: p.y - d1.y * rr }, e = { x: p.x + d2.x * rr, y: p.y + d2.y * rr };
    const c = { x: s.x + d2.x * rr, y: s.y + d2.y * rr };
    if (len(from, s) > 0.01) segs.push({ k: 'line', a: from, b: s });
    if (rr > 0.01) segs.push({ k: 'arc', c, r: rr, a0: Math.atan2(s.y - c.y, s.x - c.x), a1: Math.atan2(e.y - c.y, e.x - c.x), ccw: d1.x * d2.y - d1.y * d2.x < 0 });
    from = e;
  }
  const end = { x: tip.x - Math.cos(dir) * head, y: tip.y - Math.sin(dir) * head };
  if (len(from, end) > 0.01) segs.push({ k: 'line', a: from, b: end });
  return { segs, tip, dir };
}

/** The angle an arc sweeps, always positive, in the direction it runs. */
export function sweep(s: Extract<Seg, { k: 'arc' }>) {
  let d = s.ccw ? s.a0 - s.a1 : s.a1 - s.a0;
  while (d < 0) d += Math.PI * 2;
  while (d > Math.PI * 2) d -= Math.PI * 2;
  return d;
}

export const segLength = (s: Seg) => (s.k === 'line' ? len(s.a, s.b) : sweep(s) * s.r);
export const pathLength = (segs: Seg[]) => segs.reduce((a, s) => a + segLength(s), 0);

/** The point a distance t along one piece. */
export function along(s: Seg, t: number): Pt {
  if (s.k === 'line') {
    const l = len(s.a, s.b) || 1;
    return { x: s.a.x + ((s.b.x - s.a.x) * t) / l, y: s.a.y + ((s.b.y - s.a.y) * t) / l };
  }
  const ang = s.a0 + (s.ccw ? -1 : 1) * (t / s.r);
  return { x: s.c.x + Math.cos(ang) * s.r, y: s.c.y + Math.sin(ang) * s.r };
}

/** Points every `step` along a path, its ends included. */
export function samples(segs: Seg[], step: number): Pt[] {
  const out: Pt[] = [];
  for (const s of segs) {
    const l = segLength(s), n = Math.max(1, Math.ceil(l / step));
    for (let i = 0; i <= n; i++) out.push(along(s, (l * i) / n));
  }
  return out;
}

/** Distance from a point to a rectangle (0 inside). */
export function toRect(p: Pt, r: Rect) {
  const dx = Math.max(r.x - p.x, 0, p.x - (r.x + r.w)), dy = Math.max(r.y - p.y, 0, p.y - (r.y + r.h));
  return Math.hypot(dx, dy);
}
export const inside = (p: Pt, r: Rect, by = 0) => p.x > r.x + by && p.x < r.x + r.w - by && p.y > r.y + by && p.y < r.y + r.h - by;
export const inflate = (r: Rect, by: number): Rect => ({ x: r.x - by, y: r.y - by, w: r.w + by * 2, h: r.h + by * 2 });
export const overlaps = (a: Rect, b: Rect, gap = 0) =>
  a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;
