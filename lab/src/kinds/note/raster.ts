// The note layer drawn into a canvas for the renderer (from engine/raster.ts, lab-engine-plan M1.5).
import type { Layer, Params } from '../../core';
import { boxCanvas, fitted, setFont, wrap, type Ctx, type Raster } from '../../engine';

/* Note — a takeaway, a source line, a caution. A label, a sentence, an accent rule down its side. */
export function noteLayout(ctx: Ctx, p: Params, w: number) {
  const size = Number(p.size ?? 36), fam = String(p.font ?? 'Inter');
  const panel = p.panel !== false;
  const bar = Math.max(4, size * 0.14);
  const P = panel ? size * 0.7 : size * 0.15;
  const tx = bar + size * (panel ? 0.75 : 0.6);
  const labelPx = size * 0.5;
  const label = String(p.label ?? '').trim();
  const labelH = label ? labelPx * 1.9 : 0;
  setFont(ctx, fam, size, 400);
  const lines = wrap(ctx, String(p.text ?? ''), Math.max(20, w - tx - (panel ? P : 0)));
  const lh = size * 1.35;
  return { size, fam, panel, bar, P, tx, labelPx, label, labelH, lines, lh, height: P * 2 + labelH + lines.length * lh };
}
export function rasterNote(layer: Layer): Raster {
  const p = fitted(layer);
  const { canvas, ctx, w, h, rect } = boxCanvas(layer);
  const L = noteLayout(ctx, p, w);
  const ink = String(p.textColor ?? '#141414'), accent = String(p.accent ?? '#ff5a36');
  const r = Math.min(Number(p.radius ?? 14), h / 2);
  ctx.save();
  if (L.panel) {
    ctx.fillStyle = String(p.fill ?? '#f3efe8');
    ctx.beginPath(); ctx.roundRect(0, 0, w, h, r); ctx.fill();
    ctx.beginPath(); ctx.roundRect(0, 0, w, h, r); ctx.clip();
  }
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, L.bar, h);
  ctx.restore();
  let y = L.P;
  if (L.label) {
    setFont(ctx, L.fam, L.labelPx, 700, false, 0.1);
    ctx.fillStyle = accent;
    ctx.fillText(L.label.toUpperCase(), L.tx, y);
    y += L.labelH;
  }
  setFont(ctx, L.fam, L.size, 400);
  ctx.fillStyle = ink;
  L.lines.forEach((l, i) => ctx.fillText(l, L.tx, y + i * L.lh + (L.lh - L.size) / 2));
  return { canvas, rect };
}
