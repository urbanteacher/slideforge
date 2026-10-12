// The lines chart.
import type { Data } from './data';
import { H, P, W, baseline, label, longestOf, niceMax, rgba, valueGrid, type Pen } from './pen';

export function lines(p: Pen, d: Data, area: boolean) {
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
