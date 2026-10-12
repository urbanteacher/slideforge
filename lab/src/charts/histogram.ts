// The histogram chart.
import { chartValues, histogramBins } from './data';
import { H, P, W, baseline, fmt, label, niceMax, valueGrid, type Pen } from './pen';

export function histogram(p: Pen, text: string) {
  const vals = chartValues(text), bins = histogramBins(vals);
  if (!bins.length) return;
  const plotW = W - P.padL - P.padR, plotH = H - P.padT - P.padB;
  const max = niceMax(Math.max(...bins.map((b) => b.count)));
  valueGrid(p, max, P.padL, plotW, plotH);
  const bw = plotW / bins.length;
  // Bars touching: the axis is continuous, and a gap would say these are separate categories.
  bins.forEach((b, i) => {
    p.beat(i);
    const h = (b.count / max) * plotH * p.grow(i);
    p.ctx.fillStyle = p.col(0);
    p.ctx.fillRect(P.padL + i * bw, P.padT + plotH - h, Math.max(1, bw - 1), Math.max(0, h));
    p.settle();
    if (i === 0 || i === bins.length - 1 || i % 2 === 0) label(p, fmt(Math.round(b.from * 10) / 10), P.padL + i * bw, H - P.padB + 30, 'middle');
  });
  label(p, `${vals.length} values · ${bins.length} bins`, P.padL + plotW, P.padT - 8, 'end');
  baseline(p, P.padL, plotW, plotH);
}
