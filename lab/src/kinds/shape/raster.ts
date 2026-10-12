// The shape layer drawn into a canvas for the renderer (from engine/raster.ts, lab-engine-plan M1.5).
import type { Layer, Params } from '../../core';
import { MAX_TEX, makeCanvas, useFont, withAlpha, type Ctx, type Raster } from '../../engine';

// ─── Shape ──────────────────────────────────────────────────────────────────
function shapePath(ctx: Ctx, p: Params, w: number, h: number) {
  const shape = String(p.shape);
  ctx.beginPath();
  if (shape === 'ellipse') ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  else if (shape === 'triangle') { ctx.moveTo(w / 2, 0); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); }
  else if (shape === 'star') {
    const n = Math.round(Number(p.points ?? 5));
    for (let i = 0; i < n * 2; i++) {
      const r = i % 2 ? 0.45 : 1;
      const a = -Math.PI / 2 + (i * Math.PI) / n;
      const x = w / 2 + Math.cos(a) * r * w / 2, y = h / 2 + Math.sin(a) * r * h / 2;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
  } else if (shape === 'ring') {
    const inner = 1 - Math.max(0.02, Math.min(1, Number(p.ringWidth ?? 0.32)));
    ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    if (inner > 0) ctx.ellipse(w / 2, h / 2, (w / 2) * inner, (h / 2) * inner, 0, Math.PI * 2, 0, true);
  } else if (shape === 'arrow') {
    const sh = h * 0.36, head = Math.min(w * 0.45, h);
    ctx.moveTo(0, h / 2 - sh / 2); ctx.lineTo(w - head, h / 2 - sh / 2); ctx.lineTo(w - head, 0);
    ctx.lineTo(w, h / 2); ctx.lineTo(w - head, h); ctx.lineTo(w - head, h / 2 + sh / 2); ctx.lineTo(0, h / 2 + sh / 2);
    ctx.closePath();
  } else {
    const r = Math.min(Number(p.radius ?? 0), w / 2, h / 2);
    ctx.roundRect(0, 0, w, h, r);
  }
}


export function rasterShape(layer: Layer): Raster {
  const p = layer.params;
  const { w, h } = layer.box!;
  const sw = Number(p.strokeWidth ?? 0);
  const pad = sw + 3;
  const rw = w + pad * 2, rh = h + pad * 2;
  const S = Math.min(2, MAX_TEX / Math.max(rw, rh));
  const canvas = makeCanvas(rw * S, rh * S);
  const ctx = canvas.getContext('2d') as Ctx;
  ctx.scale(S, S);
  ctx.translate(pad, pad);
  let fill: string | CanvasGradient = withAlpha(String(p.fill), p.fillOpacity);
  if (p.gradient) {
    const a = (Number(p.angle ?? 0) * Math.PI) / 180;
    const dx = Math.cos(a) * w / 2, dy = Math.sin(a) * h / 2;
    const g = ctx.createLinearGradient(w / 2 - dx, h / 2 - dy, w / 2 + dx, h / 2 + dy);
    g.addColorStop(0, withAlpha(String(p.fill), p.fillOpacity));
    g.addColorStop(1, withAlpha(String(p.fill2), p.fill2Opacity));
    fill = g;
  }
  if (p.shape === 'curve') {
    // An S-curve across the box, level where it leaves and where it arrives.
    ctx.strokeStyle = fill;
    ctx.lineCap = 'round';
    const lw = Math.max(2, sw || 4);
    ctx.lineWidth = lw;
    const a = p.rise === 'up' ? h - lw / 2 : lw / 2, b = p.rise === 'up' ? lw / 2 : h - lw / 2;
    ctx.beginPath(); ctx.moveTo(0, a); ctx.bezierCurveTo(w * 0.55, a, w * 0.45, b, w, b); ctx.stroke();
    return { canvas, rect: [-pad, -pad, rw, rh] };
  }
  if (p.shape === 'line') {
    ctx.strokeStyle = fill;
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(2, Math.min(h, sw || h));
    ctx.beginPath(); ctx.moveTo(ctx.lineWidth / 2, h / 2); ctx.lineTo(w - ctx.lineWidth / 2, h / 2); ctx.stroke();
    return { canvas, rect: [-pad, -pad, rw, rh] };
  }
  shapePath(ctx, p, w, h);
  ctx.fillStyle = fill;
  ctx.fill('evenodd');
  if (sw > 0) {
    ctx.strokeStyle = withAlpha(String(p.stroke), p.strokeOpacity);
    ctx.lineWidth = sw;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
  // A label in the middle — a hotspot's number, a disc's initials — centred on the glyphs' own ink,
  // not their line box, so a digit sits dead centre in its circle.
  const label = String(p.label ?? '').trim();
  if (label) {
    const px = Number(p.labelSize ?? 0) || Math.min(w, h) * 0.5;
    useFont(ctx, String(p.labelFont ?? 'Inter'), px, Number(p.labelWeight ?? 700));
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    const m = ctx.measureText(label);
    const up = m.actualBoundingBoxAscent || px * 0.72, down = m.actualBoundingBoxDescent || 0;
    const left = m.actualBoundingBoxLeft ?? m.width / 2, right = m.actualBoundingBoxRight ?? m.width / 2;
    ctx.fillStyle = String(p.labelColor ?? '#ffffff');
    ctx.fillText(label, w / 2 + (left - right) / 2, h / 2 + (up - down) / 2);
  }
  return { canvas, rect: [-pad, -pad, rw, rh] };
}
