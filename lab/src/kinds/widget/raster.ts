// The widget drawn into the canvas: a card with its name, saying it runs in the show (the show frames the live page
// over it, show/Show.tsx). A page over 16 KB says so instead, since the show will not run it.
import type { Layer } from '../../core';
import { WIDGET_MAX, boxCanvas, useFont, type Raster } from '../../engine';

export function rasterWidget(layer: Layer): Raster {
  const p = layer.params;
  const { canvas, ctx, w, h, rect } = boxCanvas(layer, 2);
  const r = Math.min(Number(p.radius ?? 24), w / 2, h / 2);
  const html = String(p.html ?? '');
  const tooBig = html.length > WIDGET_MAX, empty = !html.trim();
  ctx.beginPath(); ctx.roundRect(0, 0, w, h, r); ctx.clip();
  ctx.fillStyle = String(p.background ?? '#ffffff'); ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = tooBig ? '#c2410c' : 'rgba(0,0,0,0.18)'; ctx.lineWidth = 4; ctx.setLineDash([18, 12]);
  ctx.beginPath(); ctx.roundRect(2, 2, w - 4, h - 4, Math.max(0, r - 2)); ctx.stroke(); ctx.setLineDash([]);
  const px = Math.max(24, Math.min(56, w / 18));
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  useFont(ctx, 'Inter', px * 1.6, 700);
  ctx.fillStyle = '#161616';
  ctx.fillText('</>', w / 2, h / 2 - px * 1.4);
  useFont(ctx, 'Inter', px, 600);
  ctx.fillText(layer.name || 'Widget', w / 2, h / 2 + px * 0.2, w * 0.9);
  useFont(ctx, 'Inter', px * 0.7, 500);
  ctx.fillStyle = tooBig ? '#c2410c' : '#555555';
  const note = empty ? 'Empty: write its page in the Widget tab' : tooBig ? `Over 16 KB (${Math.round(html.length / 1024)} KB): the show will not run it` : 'Live widget · runs in the show and Preview';
  ctx.fillText(note, w / 2, h / 2 + px * 1.5, w * 0.9);
  return { canvas, rect };
}
