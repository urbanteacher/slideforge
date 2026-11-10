// The icon drawn into a canvas for the renderer: the largest square its box holds, on its disc when it has one.
import type { Layer } from '../../core';
import { boxCanvas, type Raster } from '../../engine';
import { drawIcon } from './draw';

export function rasterIcon(layer: Layer): Raster {
  const p = layer.params;
  const { canvas, ctx, w, h, rect } = boxCanvas(layer, 4);
  const side = Math.min(w, h);
  const x = p.align === 'left' ? 0 : (w - side) / 2, y = (h - side) / 2;
  const disc = String(p.disc ?? '').trim();
  let inset = 0;
  if (disc) {
    ctx.fillStyle = disc;
    ctx.beginPath(); ctx.arc(x + side / 2, y + side / 2, side / 2, 0, Math.PI * 2); ctx.fill();
    inset = side * 0.22;
  }
  const ok = drawIcon(ctx, String(p.icon ?? ''), x + inset, y + inset, side - inset * 2, String(p.color ?? '#161616'), Number(p.stroke ?? 2));
  if (!ok) {
    // A name the set does not have: a dashed square, so the slot is seen and the name can be put right.
    ctx.setLineDash([side / 12, side / 16]); ctx.strokeStyle = '#c2410c'; ctx.lineWidth = Math.max(2, side / 40);
    ctx.strokeRect(x + 2, y + 2, side - 4, side - 4);
  }
  return { canvas, rect };
}
