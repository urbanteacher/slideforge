// The treemap chart.
import type { Data } from './data';
import { H, W, fmt, label, type Pen } from './pen';

function layoutTreemap(nodes: { name: string; value: number; i: number }[], x: number, y: number, w: number, h: number): { name: string; value: number; i: number; x: number; y: number; w: number; h: number }[] {
  if (!nodes.length) return [];
  if (nodes.length === 1) return [{ ...nodes[0], x, y, w, h }];
  const total = nodes.reduce((t, n) => t + n.value, 0);
  let acc = 0, mid = 0;
  for (let i = 0; i < nodes.length; i++) { acc += nodes[i].value; mid = i; if (acc >= total / 2) break; }
  const leftN = nodes.slice(0, mid + 1), rightN = nodes.slice(mid + 1);
  if (!rightN.length) return [{ ...nodes[0], x, y, w, h }];
  const ratio = leftN.reduce((t, n) => t + n.value, 0) / total;
  return w >= h
    ? [...layoutTreemap(leftN, x, y, w * ratio, h), ...layoutTreemap(rightN, x + w * ratio, y, w * (1 - ratio), h)]
    : [...layoutTreemap(leftN, x, y, w, h * ratio), ...layoutTreemap(rightN, x, y + h * ratio, w, h * (1 - ratio))];
}
export function treemap(p: Pen, d: Data) {
  const s = d.series[0];
  if (!s) return;
  const nodes = d.categories.flatMap((name, i) => { const v = s.values[i]; return v != null && v > 0 ? [{ name, value: v, i }] : []; }).sort((a, b) => b.value - a.value);
  const total = nodes.reduce((t, n) => t + n.value, 0);
  if (!total) return;
  const gap = 3;
  layoutTreemap(nodes, gap, gap, W - gap * 2, H - gap * 2).forEach((r) => {
    p.beat(r.i);
    p.ctx.fillStyle = p.col(r.i % 6);
    p.ctx.beginPath(); p.ctx.roundRect(r.x + 1.5, r.y + 1.5, Math.max(0, r.w - 3), Math.max(0, r.h - 3), 4); p.ctx.fill();
    if (r.w > p.px * 4 && r.h > p.px * 2.8) {
      label(p, r.name, r.x + 14, r.y + 14 + p.px, 'start', { weight: 650, color: '#ffffff', size: 18 / 19 });
      label(p, `${fmt(r.value)} · ${Math.round((r.value / total) * 100)}%`, r.x + 14, r.y + 22 + p.px * 2, 'start', { color: '#ffffff', size: 15 / 19 });
    }
    p.settle();
  });
}
