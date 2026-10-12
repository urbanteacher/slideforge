// The quote layer drawn into a canvas for the renderer (from engine/raster.ts, lab-engine-plan M1.5).
import type { Layer, Params } from '../../core';
import { boxCanvas, fitted, rgba, setFont, wrap, type Ctx, type Raster } from '../../engine';

/* Quote — the words large, a quotation mark in the accent, the attribution beneath. */
export function quoteLayout(ctx: Ctx, p: Params, w: number) {
  const size = Number(p.size ?? 64), fam = String(p.font ?? 'Instrument Serif');
  const mark = p.mark !== false;
  const markH = mark ? size * 1.1 : 0;
  setFont(ctx, fam, size, Number(p.weight ?? 400), p.italic !== false);
  const lines = wrap(ctx, String(p.text ?? ''), w);
  const lh = size * 1.18;
  const by = String(p.attribution ?? '').trim();
  const byPx = Math.max(16, size * 0.4);
  const byH = by ? size * 0.55 + byPx * 1.4 : 0;
  return { size, fam, mark, markH, lines, lh, by, byPx, byH, height: markH + lines.length * lh + byH };
}
export function rasterQuote(layer: Layer): Raster {
  const p = fitted(layer);
  const { canvas, ctx, w, rect } = boxCanvas(layer);
  const L = quoteLayout(ctx, p, w);
  const ink = String(p.textColor ?? '#141414'), accent = String(p.accent ?? '#ff5a36');
  const centre = p.align === 'center';
  ctx.textAlign = centre ? 'center' : 'left';
  const x = centre ? w / 2 : 0;
  if (L.mark) {
    setFont(ctx, L.fam, L.size * 2.4, 700);
    ctx.fillStyle = accent;
    ctx.fillText('\u201C', x, -L.size * 0.25);
  }
  setFont(ctx, L.fam, L.size, Number(p.weight ?? 400), p.italic !== false);
  ctx.fillStyle = ink;
  L.lines.forEach((l, i) => ctx.fillText(l, x, L.markH + i * L.lh + (L.lh - L.size) / 2));
  if (L.by) {
    setFont(ctx, String(p.bodyFont ?? 'Inter'), L.byPx, 600);
    ctx.fillStyle = rgba(ink, 0.7);
    ctx.fillText(`\u2014 ${L.by}`, x, L.markH + L.lines.length * L.lh + L.size * 0.55);
  }
  ctx.textAlign = 'left';
  return { canvas, rect };
}
