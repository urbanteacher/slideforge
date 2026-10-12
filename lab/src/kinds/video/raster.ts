// The video layer drawn into a canvas for the renderer (from engine/raster.ts, lab-engine-plan M1.5).
import type { Layer } from '../../core';
import { MAX_TEX, boxCanvas, getImage, getVideo, makeCanvas, useFont, videoEmbed, videoService, videoStill, type Ctx, type Raster } from '../../engine';

const videoCanvas = new Map<string, HTMLCanvasElement | OffscreenCanvas>();
export function rasterVideo(layer: Layer): Raster | null {
  const p = layer.params;
  // A YouTube or Vimeo link: the service's still, with a note that the link was understood. The
  // show frames the real player over it (js/lab-stage.js).
  if (videoEmbed(p)) {
    const { canvas, ctx, w, h, rect } = boxCanvas(layer, 2);
    const r = Math.min(Number(p.radius ?? 0), w / 2, h / 2);
    ctx.beginPath(); ctx.roundRect(0, 0, w, h, r); ctx.clip();
    ctx.fillStyle = '#0f0f0f'; ctx.fillRect(0, 0, w, h);
    const still = getImage(videoStill(p));
    if (still) {
      const iw = still.naturalWidth || w, ih = still.naturalHeight || h, k = Math.max(w / iw, h / ih);
      ctx.drawImage(still, (w - iw * k) / 2, (h - ih * k) / 2, iw * k, ih * k);
    }
    const d = Math.min(w, h) * 0.2, cx = w / 2, cy = h / 2;
    ctx.fillStyle = videoService(p) === 'YouTube' ? '#ff0033' : 'rgba(0,0,0,0.6)';
    ctx.beginPath(); ctx.roundRect(cx - d * 0.72, cy - d * 0.5, d * 1.44, d, d * 0.25); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(cx - d * 0.16, cy - d * 0.24); ctx.lineTo(cx + d * 0.24, cy); ctx.lineTo(cx - d * 0.16, cy + d * 0.24); ctx.closePath(); ctx.fill();
    const note = `${videoService(p) || 'Embedded video'} \u00b7 plays in the show`, px = Math.max(24, Math.min(40, w / 34));
    useFont(ctx, 'Inter', px, 600);
    const tw = ctx.measureText(note).width + px * 1.4;
    ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.beginPath(); ctx.roundRect(px * 0.8, h - px * 2.6, tw, px * 1.8, px * 0.9); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(note, px * 1.5, h - px * 1.7);
    return { canvas, rect };
  }
  const v = getVideo(String(p.src ?? ''));
  const { w, h } = layer.box!;
  const pad = 2;
  const rw = w + pad * 2, rh = h + pad * 2;
  // 1× slide px: a frame is redrawn many times a second, so it is kept to a sensible size.
  const S = Math.min(1, MAX_TEX / Math.max(rw, rh));
  let canvas = videoCanvas.get(layer.id);
  if (!canvas || canvas.width !== Math.ceil(rw * S) || canvas.height !== Math.ceil(rh * S)) {
    canvas = makeCanvas(rw * S, rh * S);
    videoCanvas.set(layer.id, canvas);
  }
  const ctx = canvas.getContext('2d') as Ctx;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.scale(S, S);
  ctx.translate(pad, pad);
  const r = Math.min(Number(p.radius ?? 0), w / 2, h / 2);
  ctx.beginPath(); ctx.roundRect(0, 0, w, h, r); ctx.clip();
  if (!v) {
    // placeholder: a dark frame with a play button, so an empty or loading video is still visible
    ctx.fillStyle = '#18181c'; ctx.fillRect(0, 0, w, h);
    const d = Math.min(w, h) * 0.22;
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.beginPath(); ctx.arc(w / 2, h / 2, d, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.moveTo(w / 2 - d * 0.32, h / 2 - d * 0.45); ctx.lineTo(w / 2 + d * 0.5, h / 2); ctx.lineTo(w / 2 - d * 0.32, h / 2 + d * 0.45); ctx.closePath(); ctx.fill();
    return { canvas, rect: [-pad, -pad, rw, rh] };
  }
  const speed = Number(p.speed ?? 1);
  if (v.playbackRate !== speed) v.playbackRate = speed;
  const iw = v.videoWidth, ih = v.videoHeight;
  const k = p.fit === 'contain' ? Math.min(w / iw, h / ih) : Math.max(w / iw, h / ih);
  ctx.drawImage(v, (w - iw * k) / 2, (h - ih * k) / 2, iw * k, ih * k);
  return { canvas, rect: [-pad, -pad, rw, rh] };
}
