// The pictogram chart.
import type { Params } from '../core';
import type { Data } from './data';
import { H, P, fmt, label, type Pen } from './pen';

export function pictogram(p: Pen, d: Data, params: Params) {
  // One icon for every row, or one per row: "🐄 🐖 🐑" gives each row its own.
  const icons = String(params.icon ?? '').trim().split(/[\s,]+/).filter(Boolean);
  if (!icons.length) icons.push('●');
  const vals = (d.series[0]?.values ?? []).map((v) => Math.max(0, v ?? 0));
  if (!vals.length) return;
  const max = Math.max(...vals);
  // A unit that keeps the longest row inside about twenty icons, unless one is set.
  const unit = Number(params.unit) > 1 ? Number(params.unit) : Math.max(1, Math.pow(10, Math.max(0, Math.ceil(Math.log10(Math.max(1, max / 20))))));
  p.ctx.font = `500 ${p.px}px "${p.font}"`;
  const labelRoom = Math.min(360, 40 + Math.max(...d.categories.map((c) => p.ctx.measureText(c).width)));
  const rowH = Math.min(78, (H - P.padT - P.padB) / Math.max(1, d.categories.length)), size = Math.min(rowH * 0.74, 46), stepX = size * 0.92;
  const { ctx } = p;
  d.categories.forEach((cat, ci) => {
    const y = P.padT + rowH * ci + rowH / 2;
    label(p, cat, labelRoom - 16, y + p.px * 0.37, 'end');
    p.beat(ci);
    const whole = Math.floor(vals[ci] / unit), part = (vals[ci] % unit) / unit, icon = icons[ci % icons.length];
    ctx.font = `400 ${size}px "${p.font}", system-ui, sans-serif`; ctx.textAlign = 'left'; ctx.fillStyle = p.ink;
    // The icons are counted out, one after another.
    const shown = Math.ceil(Math.min(whole, 40) * p.grow(ci) - 1e-9);
    for (let i = 0; i < shown; i++) ctx.fillText(icon, labelRoom + i * stepX, y + size * 0.34);
    // The remainder as a clipped icon: a smaller one would encode the value in area again.
    if (part > 0.08 && whole < 40 && p.grow(ci) >= 1) {
      ctx.save(); ctx.beginPath(); ctx.rect(labelRoom + whole * stepX, y - size * 0.7, Math.max(1, size * part), size * 1.3); ctx.clip();
      ctx.fillText(icon, labelRoom + whole * stepX, y + size * 0.34); ctx.restore();
    }
    label(p, fmt(vals[ci]), labelRoom + Math.min(whole + 1, 41) * stepX + 12, y + p.px * 0.37, 'start', { weight: 650, color: p.ink, size: 1.05 });
    p.settle();
  });
  label(p, `${icons.length > 1 ? 'Each icon' : icons[0]} = ${fmt(unit)}${d.series[0]?.name ? ' ' + d.series[0].name.toLowerCase() : ''}`, labelRoom, H - 10);
}
