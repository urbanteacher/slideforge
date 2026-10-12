// The bullet chart.
import type { Data } from './data';
import { H, W, fmt, label, line, niceMax, rgba, type Pen } from './pen';

export function bullet(p: Pen, d: Data) {
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
