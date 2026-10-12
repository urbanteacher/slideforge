// The sankey chart.
import { chartFlows } from './data';
import { H, W, fmt, label, rgba, type Pen } from './pen';

export function sankey(p: Pen, text: string) {
  const f = chartFlows(text);
  if (!f.links.length) return;
  const padT = 18, padB = 26, left = 6, right = 6, plotH = H - padT - padB, nodeW = 16, gap = 16;
  const byLayer = Array.from({ length: f.layers }, (_, d) => f.nodes.filter((n) => n.depth === d));
  // The fullest layer decides the scale, so every band keeps the same units per pixel.
  const heaviest = Math.max(...byLayer.map((c) => c.reduce((t, n) => t + n.total, 0)));
  const tallest = Math.max(...byLayer.map((c) => c.length));
  const perUnit = (plotH - (tallest - 1) * gap) / (heaviest || 1);
  const colX = (d: number) => left + (f.layers === 1 ? 0 : d * ((W - left - right - nodeW) / (f.layers - 1)));
  byLayer.forEach((c, d) => {
    c.sort((a, b) => b.total - a.total);
    const used = c.reduce((t, n) => t + n.total * perUnit, 0) + (c.length - 1) * gap;
    let y = padT + (plotH - used) / 2;
    c.forEach((n) => { n.x = colX(d); n.y = y; n.h = Math.max(2, n.total * perUnit); n.inAt = n.outAt = n.y; y += n.h + gap; });
  });
  const { ctx } = p;
  // Ribbons first and thickest first, so a thick flow cannot hide a thin one; level at both ends.
  [...f.links].sort((a, b) => b.value - a.value).forEach((l) => {
    const a = f.nodes[f.idx[l.from]], b = f.nodes[f.idx[l.to]], t = l.value * perUnit;
    const x1 = a.x + nodeW, x2 = b.x, y1 = a.outAt, y2 = b.inAt, mx = (x1 + x2) / 2;
    a.outAt += t; b.inAt += t;
    p.beat(a.depth);
    ctx.fillStyle = rgba(p.col(a.depth % 6), 0.44);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.bezierCurveTo(mx, y1, mx, y2, x2, y2); ctx.lineTo(x2, y2 + t); ctx.bezierCurveTo(mx, y2 + t, mx, y1 + t, x1, y1 + t); ctx.closePath(); ctx.fill();
    p.settle();
  });
  f.nodes.forEach((n) => {
    p.beat(Math.max(0, n.depth - 1));
    ctx.fillStyle = p.col(n.depth % 6); ctx.fillRect(n.x, n.y, nodeW, n.h);
    // Labels outside their column, except the last, which has nothing to its right.
    const last = n.depth === f.layers - 1;
    label(p, `${n.name} · ${fmt(n.total)}`, last ? n.x - 10 : n.x + nodeW + 10, n.y + n.h / 2 + p.px * 0.3, last ? 'end' : 'start', { color: p.ink, halo: true });
    p.settle();
  });
}
