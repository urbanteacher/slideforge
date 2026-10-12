// The combo chart.
import type { Data } from './data';
import { H, P, W, baseline, column, label, niceMax, valueGrid, type Pen } from './pen';

export function combo(p: Pen, d: Data) {
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
