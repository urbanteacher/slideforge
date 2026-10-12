// The dumbbell chart.
import type { Data } from './data';
import { H, P, W, fmt, label, line, niceRange, rgba, ticks, type Pen } from './pen';

export function dumbbell(p: Pen, d: Data) {
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
