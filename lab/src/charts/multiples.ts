// The multiples chart.
import type { Data } from './data';
import { H, W, fmt, label, line, niceRange, type Pen } from './pen';

export function multiples(p: Pen, d: Data) {
  const panels = d.categories.map((name, i) => ({ name, values: d.series.map((s) => s.values[i]) })).filter((q) => q.values.some((v) => v != null));
  if (!panels.length || d.series.length < 2) return;
  const all = panels.flatMap((q) => q.values.filter((v): v is number => v != null)), rng = niceRange(Math.min(...all), Math.max(...all));
  // Wide before tall: a row of panels is read left to right like a sentence.
  const cols = Math.min(panels.length, panels.length <= 4 ? panels.length : Math.ceil(Math.sqrt(panels.length * 1.9)));
  const rows = Math.ceil(panels.length / cols), padTop = 26, padBottom = 34 + p.px * 0.4;
  const cellW = (W - 36) / cols, cellH = (H - padTop - padBottom) / rows, plotW = cellW - 30, plotH = Math.max(22, cellH - 48 - p.px);
  const small = 0.8;
  panels.forEach((q, i) => {
    const cx = 18 + (i % cols) * cellW, cy = padTop + Math.floor(i / cols) * cellH, n = q.values.length;
    const sx = (j: number) => cx + 14 + (n < 2 ? plotW / 2 : (plotW * j) / (n - 1));
    const sy = (v: number) => cy + 26 + p.px * 0.5 + plotH - ((v - rng.lo) / (rng.hi - rng.lo || 1)) * plotH;
    p.beat(i);
    label(p, q.name, cx + 14, cy + 12, 'start', { weight: 650, color: p.ink });
    [rng.lo, rng.hi].forEach((v) => line(p, sx(0), sy(v), sx(n - 1), sy(v), p.rule));
    const present = q.values.filter((v): v is number => v != null), first = present[0], last = present[present.length - 1];
    // Flat is a band, not an exact tie: two per cent of the shared range.
    const slack = (rng.hi - rng.lo) * 0.02;
    const col = first == null || last == null || Math.abs(last - first) <= slack ? p.dim : last > first ? '#C83D77' : '#477F54';
    const pts = q.values.flatMap((v, j) => (v == null ? [] : [[sx(j), sy(v), v, j] as const]));
    const { ctx } = p;
    if (pts.length > 1) { ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.beginPath(); pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); }
    pts.forEach(([x, y, v, j]) => {
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill();
      if (j === 0 || j === n - 1) label(p, fmt(v), x, y - 8, j === 0 ? 'start' : 'end', { size: small, weight: 600, color: p.ink });
    });
    [0, n - 1].forEach((j) => label(p, d.series[j]?.name ?? '', sx(j), cy + 26 + p.px * 0.5 + plotH + p.px * 0.9, j === 0 ? 'start' : 'end', { size: small }));
    p.settle();
  });
  label(p, `Every panel on the same ${fmt(rng.lo)}–${fmt(rng.hi)} scale · rose, fell or held is shown by colour`, 18, H - 8, 'start', { size: small });
}
