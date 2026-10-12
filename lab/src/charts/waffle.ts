// The waffle chart.
import type { Data } from './data';
import { H, W, label, rgba, type Pen } from './pen';

export function waffle(p: Pen, d: Data) {
  const s = d.series[0];
  if (!s) return;
  const parts = d.categories.flatMap((name, i) => { const v = s.values[i]; return v != null && v > 0 ? [{ name, value: v, i, label: '' }] : []; });
  const total = parts.reduce((t, q) => t + q.value, 0);
  if (!total) return;
  // One category already a percentage fills that many cells; several share the hundred.
  let cells: number[] = [];
  if (parts.length === 1 && parts[0].value <= 100) {
    const n = Math.max(0, Math.min(100, Math.round(parts[0].value)));
    cells = [...Array(n).fill(parts[0].i), ...Array(100 - n).fill(-1)];
  } else {
    let assigned = 0;
    parts.forEach((q, pi) => {
      const count = Math.max(0, Math.min(100 - assigned, pi === parts.length - 1 ? 100 - assigned : Math.round((q.value / total) * 100)));
      for (let c = 0; c < count; c++) cells.push(q.i);
      assigned += count;
    });
    while (cells.length < 100) cells.push(-1);
    cells = cells.slice(0, 100);
  }
  parts.forEach((q) => { q.label = `${q.name} · ${parts.length === 1 && q.value <= 100 ? Math.round(q.value) : Math.round((q.value / total) * 100)}%`; });
  p.ctx.font = `500 ${p.px}px "${p.font}"`;
  const labelW = Math.max(160, Math.min(460, 52 + Math.max(...parts.map((q) => p.ctx.measureText(q.label).width)) + 24));
  const gridSize = Math.min(H - 40, W - labelW - 80), cell = gridSize / 10, gap = Math.max(2, cell * 0.08), ox = labelW, oy = (H - gridSize) / 2;
  for (let i = 0; i < 100; i++) {
    const idx = cells[i];
    p.beat(Math.max(0, parts.findIndex((q) => q.i === idx)));
    p.ctx.fillStyle = idx < 0 ? rgba(p.ink, 0.12) : p.col(idx % 6);
    p.ctx.beginPath(); p.ctx.roundRect(ox + (i % 10) * cell + gap / 2, oy + Math.floor(i / 10) * cell + gap / 2, cell - gap, cell - gap, 2); p.ctx.fill();
    p.settle();
  }
  const row = Math.max(36, p.px * 1.9);
  parts.forEach((q, pi) => {
    const y = oy + 22 + pi * row;
    p.beat(pi);
    p.ctx.fillStyle = p.col(q.i % 6); p.ctx.beginPath(); p.ctx.roundRect(24, y - 12, 18, 18, 3); p.ctx.fill();
    label(p, q.label, 52, y + 3, 'start', { color: p.ink });
    p.settle();
  });
}
