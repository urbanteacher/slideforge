// The grouped chart.
import type { Data } from './data';
import { H, P, W, baseline, column, fmt, label, niceMax, valueGrid, type Pen } from './pen';

export function grouped(p: Pen, d: Data) {
  const plotW = W - P.padL - P.padR, plotH = H - P.padT - P.padB;
  const max = niceMax(Math.max(0, ...d.series.flatMap((s) => s.values.filter((v): v is number => v != null))));
  valueGrid(p, max, P.padL, plotW, plotH);
  const band = plotW / Math.max(1, d.categories.length), n = d.series.length;
  const groupW = Math.min(band * 0.62, 78 * n), barW = Math.max(6, (groupW - (n - 1) * 2) / n);
  d.categories.forEach((cat, ci) => {
    const x0 = P.padL + band * ci + (band - groupW) / 2;
    d.series.forEach((s, si) => {
      const v = s.values[ci];
      if (v == null) return;
      const b = n > 1 ? si : ci;
      p.beat(b);
      const h = Math.max(0, (v / max) * plotH) * p.grow(b), x = x0 + si * (barW + 2), y = P.padT + plotH - h;
      column(p, x, y, barW, h, p.col(si));
      if (n === 1) label(p, fmt(v), x + barW / 2, y - 12, 'middle', { weight: 650, color: p.ink, size: 1.05 });
      p.settle();
    });
    label(p, cat, P.padL + band * ci + band / 2, H - P.padB + 30, 'middle');
  });
  baseline(p, P.padL, plotW, plotH);
}
