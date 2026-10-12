// The image layer drawn into a canvas for the renderer (from engine/raster.ts, lab-engine-plan M1.5).
import type { Layer } from '../../core';
import { MAX_TEX, getImage, makeCanvas, type Ctx, type Raster } from '../../engine';

// ─── Image ──────────────────────────────────────────────────────────────────
export function rasterImage(layer: Layer): Raster | null {
  const p = layer.params;
  const img = getImage(String(p.src ?? ''));
  const { w, h } = layer.box!;
  const pad = 2;
  const rw = w + pad * 2, rh = h + pad * 2;
  const S = Math.min(2, MAX_TEX / Math.max(rw, rh));
  const canvas = makeCanvas(rw * S, rh * S);
  const ctx = canvas.getContext('2d') as Ctx;
  ctx.scale(S, S);
  ctx.translate(pad, pad);
  const r = Math.min(Number(p.radius ?? 0), w / 2, h / 2);
  if (!img) {
    // placeholder: soft checker so an empty image layer is still visible
    ctx.beginPath(); ctx.roundRect(0, 0, w, h, r); ctx.clip();
    ctx.fillStyle = 'rgba(128,128,128,0.25)'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(128,128,128,0.6)'; ctx.lineWidth = 2; ctx.setLineDash([10, 8]); ctx.strokeRect(1, 1, w - 2, h - 2);
    // No picture chosen yet (not one still loading): say so, so the empty place reads as a slot to fill.
    if (!p.src && w > 160 && h > 90) {
      const size = Math.max(18, Math.min(40, Math.min(w, h) * 0.07));
      ctx.setLineDash([]); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(110,110,116,0.95)';
      ctx.font = `600 ${size}px Inter, system-ui, sans-serif`;
      ctx.fillText(String(layer.name || 'Picture'), w / 2, h / 2 - size * 0.7);
      ctx.font = `400 ${size * 0.7}px Inter, system-ui, sans-serif`;
      ctx.fillText('Double-click to choose a picture, or drop one here', w / 2, h / 2 + size * 0.5, w - 40);
    }
    return p.src ? null : { canvas, rect: [-pad, -pad, rw, rh] };
  }
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const k = p.fit === 'cover' ? Math.max(w / iw, h / ih) : Math.min(w / iw, h / ih);
  const dw = iw * k, dh = ih * k;
  // The focus decides which part of an over-sized picture the frame keeps (CSS object-position).
  const [fx, fy] = Array.isArray(p.focus) ? (p.focus as [number, number]) : [0.5, 0.5];
  const ox = p.fit === 'cover' ? (w - dw) * fx : (w - dw) / 2, oy = p.fit === 'cover' ? (h - dh) * fy : (h - dh) / 2;
  ctx.imageSmoothingQuality = 'high';
  // A logo on a dark ground is shown white; "dark" says so outright, "auto" was resolved by the renderer.
  // Painted white over its own shape rather than through ctx.filter, which Safari leaves switched off.
  const white = p.tone === 'dark' || !!p._white;
  // What shows of the picture: the whole box when it covers, the picture itself when it is contained.
  const sx = p.fit === 'cover' ? 0 : (w - dw) / 2, sy = p.fit === 'cover' ? 0 : (h - dh) / 2, sw = Math.min(w, dw), sh = Math.min(h, dh);
  ctx.save();
  if (r > 0) {
    ctx.beginPath();
    ctx.roundRect(sx, sy, sw, sh, r);
    ctx.clip();
  } else {
    ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip();
  }
  if (p.flip === 'mirror') { ctx.translate(w, 0); ctx.scale(-1, 1); }
  ctx.drawImage(img, p.flip === 'mirror' ? w - ox - dw : ox, oy, dw, dh);
  if (white) {
    ctx.globalCompositeOperation = 'source-in';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.restore();
  // The border, inside what shows, round its corners.
  const bw = Math.min(Number(p.border ?? 0), sw / 2, sh / 2);
  if (bw > 0) {
    ctx.strokeStyle = String(p.borderColor ?? '#ffffff');
    ctx.lineWidth = bw;
    ctx.beginPath(); ctx.roundRect(sx + bw / 2, sy + bw / 2, sw - bw, sh - bw, Math.max(0, r - bw / 2)); ctx.stroke();
  }
  return { canvas, rect: [-pad, -pad, rw, rh] };
}
