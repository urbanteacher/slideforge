// The stacked chart.
import type { Data } from './data';
import { H, P, W, baseline, fmt, label, niceMax, valueGrid, type Pen } from './pen';

export function stacked(p: Pen, d: Data) {
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
