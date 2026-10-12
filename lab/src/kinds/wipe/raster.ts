// The before / after layer drawn into a canvas for the renderer (from engine/raster.ts, lab-engine-plan M1.5).
import type { Layer } from '../../core';
import { boxCanvas, getImage, useFont, type Raster } from '../../engine';

// ─── Before / after ─────────────────────────────────────────────────────────
// SlideForge's wipe: the before picture whole, the after clipped to the right of the divider
// (inset from the left by 100 − position), a handle on the divider, and each picture's label in
// its top corner, hidden when its picture is wiped away. `_pos` is the live handle from the player.
export function rasterWipe(layer: Layer): Raster {
  const p = layer.params;
  const { canvas, ctx, w, h, rect } = boxCanvas(layer);
  const pos = Math.max(0, Math.min(100, Number(p._pos ?? p.position ?? 50)));
  const cut = w * (1 - pos / 100);
  const draw = (src: unknown) => {
    const img = getImage(String(src ?? ''));
    if (!img) { ctx.fillStyle = 'rgba(128,128,128,0.25)'; ctx.fillRect(0, 0, w, h); return; }
    const iw = img.naturalWidth || w, ih = img.naturalHeight || h;
    const k = p.fit === 'cover' ? Math.max(w / iw, h / ih) : Math.min(w / iw, h / ih);
    ctx.drawImage(img, (w - iw * k) / 2, (h - ih * k) / 2, iw * k, ih * k);
  };
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip();
  ctx.imageSmoothingQuality = 'high';
  draw(p.before);
  ctx.save(); ctx.beginPath(); ctx.rect(cut, 0, w - cut, h); ctx.clip(); draw(p.after); ctx.restore();
  const accent = String(p.accent ?? '#ff5a36'), size = Number(p.size ?? 36), fam = String(p.font ?? 'Inter');
  // The divider and its grip.
  ctx.fillStyle = accent; ctx.fillRect(cut - 3, 0, 6, h);
  const r = Math.max(28, size * 0.9);
  ctx.beginPath(); ctx.arc(cut, h / 2, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  useFont(ctx, fam, r * 0.95, 700); ctx.fillText('\u2194', cut, h / 2 + 1);
  // The labels, on a dark pill each, in their own corner.
  const pill = (s: string, right: boolean) => {
    if (!s.trim()) return;
    useFont(ctx, fam, size, 650);
    const tw = ctx.measureText(s).width, ph = size * 1.6, pw = tw + size * 1.2, m = size * 0.6;
    const x = right ? w - m - pw : m;
    ctx.fillStyle = 'rgba(0,0,0,0.62)'; ctx.beginPath(); ctx.roundRect(x, m, pw, ph, ph / 2); ctx.fill();
    ctx.fillStyle = String(p.textColor ?? '#ffffff'); ctx.textAlign = 'center'; ctx.fillText(s, x + pw / 2, m + ph / 2);
  };
  if (pos < 100) pill(String(p.beforeLabel ?? ''), false);
  if (pos > 0) pill(String(p.afterLabel ?? ''), true);
  ctx.restore();
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  return { canvas, rect };
}
