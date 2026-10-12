// The radar chart.
import type { Data } from './data';
import { H, W, fmt, label, line, niceMax, rgba, type Pen } from './pen';

export function radar(p: Pen, d: Data) {
  const axes = d.categories.length;
  if (axes < 3) return;
  const cx = W / 2, cy = H / 2 + 6, R = Math.min(H / 2 - 34 - p.px * 0.4, W * 0.24);
  const max = niceMax(Math.max(0, ...d.series.flatMap((s) => s.values.filter((v): v is number => v != null))));
  const ang = (i: number) => -Math.PI / 2 + (i / axes) * Math.PI * 2;
  const at = (i: number, v: number) => { const r = (Math.max(0, v) / max) * R; return [cx + r * Math.cos(ang(i)), cy + r * Math.sin(ang(i))] as const; };
  const { ctx } = p;
  // A web, not circles: a polygon read against a circular grid looks bowed where it is straight.
  [0.25, 0.5, 0.75, 1].forEach((f) => {
    ctx.strokeStyle = p.rule; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 0; i < axes; i++) { const x = cx + R * f * Math.cos(ang(i)), y = cy + R * f * Math.sin(ang(i)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.closePath(); ctx.stroke();
  });
  for (let i = 0; i < axes; i++) {
    const e = at(i, max); line(p, cx, cy, e[0], e[1], p.rule);
    const lr = R + 26, c = Math.cos(ang(i));
    label(p, d.categories[i], cx + lr * c, cy + lr * Math.sin(ang(i)) + p.px * 0.3, c < -0.25 ? 'end' : c > 0.25 ? 'start' : 'middle');
  }
  label(p, fmt(max), cx + 6, cy - R + 4);
  d.series.forEach((s, si) => {
    p.beat(si);
    const g = p.grow(si);
    ctx.beginPath();
    for (let i = 0; i < axes; i++) { const q = at(i, (s.values[i] ?? 0) * g); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }
    ctx.closePath();
    ctx.fillStyle = rgba(p.col(si), 0.18); ctx.fill();
    ctx.strokeStyle = p.col(si); ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.stroke();
    for (let i = 0; i < axes; i++) { const q = at(i, (s.values[i] ?? 0) * g); ctx.fillStyle = p.col(si); ctx.beginPath(); ctx.arc(q[0], q[1], 5, 0, Math.PI * 2); ctx.fill(); }
    p.settle();
  });
}
