// The timer layer drawn into a canvas for the renderer (from engine/raster.ts, lab-engine-plan M1.5).
import type { Layer } from '../../core';
import { boxCanvas, setFont, type Raster } from '../../engine';

// ─── Timer ──────────────────────────────────────────────────────────────────
/** m:ss, or h:mm:ss past the hour. */
export function clockText(secs: number) {
  const t = Math.max(0, Math.ceil(secs)), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s2 = t % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s2).padStart(2, '0')}` : `${m}:${String(s2).padStart(2, '0')}`;
}
/** The countdown at its current second (`_left`, set by the renderer from the slide clock; the full
 *  time when the slide is not running). A ring or bar empties as the time does; at zero it says so. */
export function rasterTimer(layer: Layer): Raster {
  const p = layer.params;
  const { canvas, ctx, w, h, rect } = boxCanvas(layer, 10);
  // Down to five seconds: a game question runs 10–30.
  const total = Math.max(5, Math.min(7200, Number(p.minutes ?? 5) * 60));
  const left = Math.max(0, Math.min(total, p._left === undefined ? total : Number(p._left)));
  const frac = left / total, over = left <= 0;
  const ink = String(p.textColor ?? '#141414'), accent = String(p.accent ?? '#d94f2b'), track = String(p.track ?? '#d9d4cc');
  const fam = String(p.font ?? 'Inter'), style = String(p.style ?? 'ring');
  const label = String(over ? p.done ?? '' : p.label ?? '').trim();
  // The last ten seconds, in every style, the time turns red: the room sees it is nearly out.
  const late = !over && left <= 10 && total > 10;
  const words = over ? label || 'Time’s up' : clockText(left);
  if (style === 'game') {
    // SlideForge's game clock (src/render/quiz.js, .slide-clock): an 84px ring with an 8px stroke,
    // the accent draining clockwise from the top over a faint track, the time in the middle. In the
    // last minute the ring turns red; at zero the digits do too.
    const size = Math.min(w, h), lw = (size * 8) / 84, r = (size - lw) / 2, cx = w / 2, cy = h / 2;
    const red = '#ff5f6d', hurry = left <= 60;
    ctx.lineWidth = lw; ctx.strokeStyle = track;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    if (frac > 0) { ctx.strokeStyle = hurry ? red : accent; ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac); ctx.stroke(); }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = over ? red : ink;
    const face = clockText(left);
    setFont(ctx, fam, Math.min(size * 0.3 * (face.length > 5 ? 0.8 : 1), (r * 1.6) / Math.max(2.4, face.length * 0.56)), 700);
    ctx.fillText(face, cx, cy + 1);
  } else if (style === 'ring') {
    const r = Math.min(w, h) / 2 - 12, cx = w / 2, cy = h / 2, lw = Math.max(8, r * 0.1);
    ctx.lineCap = 'round';
    ctx.lineWidth = lw; ctx.strokeStyle = track;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    if (frac > 0) { ctx.strokeStyle = accent; ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac); ctx.stroke(); }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = over ? accent : late ? '#ff5f6d' : ink;
    const px = Math.min(Number(p.size ?? 96), (r * 1.3) / Math.max(3.2, words.length * 0.55));
    setFont(ctx, fam, px, 700); ctx.fillText(words, cx, cy - (label && !over ? px * 0.18 : 0));
    if (label && !over) { setFont(ctx, fam, px * 0.3, 600); ctx.fillStyle = ink; ctx.globalAlpha = 0.7; ctx.fillText(label, cx, cy + px * 0.55); ctx.globalAlpha = 1; }
  } else {
    const barH = style === 'bar' ? Math.max(10, h * 0.12) : 0;
    // Time only can sit in a row of words (a game's heading row): at its weight and tracking, flush to its side.
    const side = String(p.align ?? 'center');
    ctx.textAlign = side === 'right' ? 'right' : side === 'left' ? 'left' : 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = over ? accent : late ? '#ff5f6d' : ink;
    const px = Math.min(Number(p.size ?? 96), (h - barH) * 0.6, w / Math.max(2.4, words.length * 0.6));
    setFont(ctx, fam, px, Number(p.weight ?? 700), false, Number(p.tracking ?? 0));
    ctx.fillText(words, side === 'right' ? w : side === 'left' ? 0 : w / 2, (h - barH) * (label && !over ? 0.42 : 0.5));
    if (label && !over) { setFont(ctx, fam, px * 0.3, 600); ctx.globalAlpha = 0.7; ctx.fillStyle = ink; ctx.fillText(label, w / 2, (h - barH) * 0.82); ctx.globalAlpha = 1; }
    if (barH) {
      ctx.fillStyle = track; ctx.beginPath(); ctx.roundRect(0, h - barH, w, barH, barH / 2); ctx.fill();
      if (frac > 0) { ctx.fillStyle = accent; ctx.beginPath(); ctx.roundRect(0, h - barH, w * frac, barH, barH / 2); ctx.fill(); }
    }
  }
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  return { canvas, rect };
}
