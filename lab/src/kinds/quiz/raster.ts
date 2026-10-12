// The quiz layer drawn into a canvas for the renderer (from engine/raster.ts, lab-engine-plan M1.5).
import type { Layer, Params } from '../../core';
import { card, fit, onColour, pill, rgba, useFont, wrap, type Ctx, type Raster } from '../../engine';

// ─── Quiz ───────────────────────────────────────────────────────────────────
const OPTION_COLOURS = ['#2f6bff', '#16a34a', '#f5a524', '#9b5de5', '#00b8d9'];

/** Where everything on a quiz card sits for a given width; the card is as tall as its content. */
export function quizLayout(ctx: Ctx, p: Params, w: number) {
  const size = Number(p.size ?? 52);
  const fam = String(p.font ?? 'Inter');
  const P = Math.max(24, size * 0.8);
  const labelPx = size * 0.36;
  let y = P + labelPx * 2 + size * 0.55;
  useFont(ctx, fam, size, 700);
  const qTop = y;
  const qLines = wrap(ctx, String(p.question ?? ''), w - P * 2, 3);
  y += qLines.length * size * 1.15 + size * 0.45;
  const options = String(p.options ?? '').split('\n').map((o) => o.trim()).filter(Boolean).slice(0, 6);
  const cols = options.length > 2 ? 2 : 1;
  const rows = Math.ceil(options.length / cols);
  const gap = size * 0.35;
  const colW = (w - P * 2 - gap * (cols - 1)) / cols;
  const rowH = size * 1.75;
  const optTop = y;
  if (rows) y += rows * rowH + (rows - 1) * gap; else y -= size * 0.45;
  return { size, fam, P, labelPx, qTop, qLines, options, cols, gap, colW, rowH, optTop, height: Math.ceil(y + P) };
}

export function rasterQuiz(layer: Layer): Raster {
  const p = layer.params;
  const { canvas, ctx, w, rect } = card(layer);
  const ink = String(p.textColor ?? '#141414');
  const accent = String(p.accent ?? '#ff5a36');
  const L = quizLayout(ctx, p, w);
  const { size, fam, P } = L;
  pill(ctx, String(p.label || 'Quiz'), P, P, L.labelPx, accent, fam);
  useFont(ctx, fam, size, 700);
  ctx.fillStyle = ink;
  ctx.textBaseline = 'top';
  L.qLines.forEach((l, i) => ctx.fillText(l, P, L.qTop + i * size * 1.15));
  const osize = size * 0.62;
  L.options.forEach((o, i) => {
    const cx = P + (i % L.cols) * (L.colW + L.gap), cy = L.optTop + Math.floor(i / L.cols) * (L.rowH + L.gap);
    const colour = i === 0 ? accent : OPTION_COLOURS[(i - 1) % OPTION_COLOURS.length];
    const rowH = L.rowH;
    ctx.fillStyle = rgba(ink, 0.04);
    ctx.strokeStyle = rgba(ink, 0.14);
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(cx, cy, L.colW, rowH, Math.min(rowH / 2, size * 0.4)); ctx.fill(); ctx.stroke();
    const d = rowH * 0.62;
    const bx = cx + (rowH - d) / 2;
    ctx.fillStyle = colour;
    ctx.beginPath(); ctx.roundRect(bx, cy + (rowH - d) / 2, d, d, d * 0.3); ctx.fill();
    useFont(ctx, fam, d * 0.5, 700);
    ctx.fillStyle = onColour(colour);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String.fromCharCode(65 + i), bx + d / 2, cy + rowH / 2 + d * 0.02);
    ctx.textAlign = 'left';
    useFont(ctx, fam, osize, 500);
    ctx.fillStyle = ink;
    const tx = bx + d + osize * 0.7;
    ctx.fillText(fit(ctx, o, cx + L.colW - tx - osize * 0.6), tx, cy + rowH / 2 + osize * 0.04);
  });
  return { canvas, rect };
}
