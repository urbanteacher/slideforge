import type { Layer, Params } from '../model/types';
import { unitProgress } from './anim';

// Rasterises content layers (text / shape / image) into 2D canvases that the renderer uploads as
// textures. Each result carries `rect`: the area the canvas covers, relative to the layer box's
// top-left in slide px (so padding for italics, strokes and rise animations never clips).

export interface Raster {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  rect: [number, number, number, number];
}

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

const MAX_TEX = 4096;

function makeCanvas(w: number, h: number): HTMLCanvasElement | OffscreenCanvas {
  const W = Math.max(1, Math.ceil(w)), H = Math.max(1, Math.ceil(h));
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(W, H);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  return c;
}

let measureCtx: Ctx | null = null;
function mctx(): Ctx {
  if (!measureCtx) measureCtx = makeCanvas(8, 8).getContext('2d') as Ctx;
  return measureCtx;
}

// ─── Assets: fonts & images ─────────────────────────────────────────────────
let assetVersion = 0;
export const getAssetVersion = () => assetVersion;
const bump = () => { assetVersion++; };

const fontState = new Map<string, 'loading' | 'ready'>();
function ensureFont(font: string) {
  if (typeof document === 'undefined' || !document.fonts) return;
  const st = fontState.get(font);
  if (st) return;
  if (document.fonts.check(font)) { fontState.set(font, 'ready'); return; }
  fontState.set(font, 'loading');
  document.fonts.load(font).then(() => { fontState.set(font, 'ready'); bump(); }, () => fontState.set(font, 'ready'));
}
if (typeof document !== 'undefined' && document.fonts) {
  document.fonts.addEventListener?.('loadingdone', bump);
}

const images = new Map<string, HTMLImageElement>();
export function getImage(src: string): HTMLImageElement | null {
  if (!src) return null;
  let img = images.get(src);
  if (!img) {
    img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = bump;
    img.src = src;
    images.set(src, img);
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}

// ─── Text ───────────────────────────────────────────────────────────────────
export function fontString(p: Params, px: number) {
  const fam = String(p.font ?? 'Inter');
  const generic = /mono/i.test(fam) ? 'monospace' : /serif|playfair|fraunces|georgia/i.test(fam) ? 'serif' : 'sans-serif';
  return `${p.italic ? 'italic ' : ''}${p.weight ?? 400} ${px}px "${fam}", ${generic}`;
}

interface Word { text: string; x: number; w: number }
interface Line { words: Word[]; width: number; text: string }
export interface TextLayout { lines: Line[]; lineH: number; height: number; size: number }

function setupFont(ctx: Ctx, p: Params, px: number) {
  ctx.font = fontString(p, px);
  const c = ctx as Ctx & { letterSpacing?: string };
  if ('letterSpacing' in c) c.letterSpacing = `${Number(p.tracking ?? 0) * px}px`;
}

export function layoutText(p: Params, width: number): TextLayout {
  const size = Number(p.size ?? 64);
  const ctx = mctx();
  setupFont(ctx, p, size);
  ensureFont(fontString(p, size));
  let raw = String(p.text ?? '');
  if (p.uppercase) raw = raw.toUpperCase();
  const space = ctx.measureText(' ').width;
  const lines: Line[] = [];
  for (const para of raw.split('\n')) {
    const words = para.split(/ +/);
    let cur: Word[] = [];
    let x = 0;
    for (const w of words) {
      const ww = ctx.measureText(w).width;
      if (cur.length && x + ww > width + 0.5) {
        const last = cur[cur.length - 1];
        lines.push({ words: cur, width: last.x + last.w, text: cur.map((c) => c.text).join(' ') });
        cur = [];
        x = 0;
      }
      cur.push({ text: w, x, w: ww });
      x += ww + space;
    }
    const last = cur[cur.length - 1];
    lines.push({ words: cur, width: last ? last.x + last.w : 0, text: cur.map((c) => c.text).join(' ') });
  }
  const lineH = size * Number(p.lineHeight ?? 1.1);
  return { lines, lineH, size, height: Math.max(lineH, lines.length * lineH) };
}

export function measureTextHeight(p: Params, width: number) {
  return Math.ceil(layoutText(p, width).height);
}

function rasterText(layer: Layer, textT: number): Raster {
  const p = layer.params;
  const box = layer.box!;
  const L = layoutText(p, box.w);
  const size = L.size;
  const padX = size * 0.5, padT = size * 0.35, padB = size * 0.7;
  const rw = box.w + padX * 2, rh = Math.max(box.h, L.height) + padT + padB;
  const S = Math.min(2, MAX_TEX / Math.max(rw, rh));
  const canvas = makeCanvas(rw * S, rh * S);
  const ctx = canvas.getContext('2d') as Ctx;
  ctx.scale(S, S);
  ctx.translate(padX, padT);
  setupFont(ctx, p, size);
  ctx.fillStyle = String(p.color ?? '#000');
  ctx.textBaseline = 'alphabetic';
  const m = ctx.measureText('Hg');
  const asc = m.fontBoundingBoxAscent ?? size * 0.8, desc = m.fontBoundingBoxDescent ?? size * 0.2;
  const align = String(p.align ?? 'left');
  const type = layer.anim.type;
  const animating = Number.isFinite(textT);
  let unit = 0;

  L.lines.forEach((line, li) => {
    const top = li * L.lineH;
    const base = top + L.lineH / 2 + (asc - desc) / 2;
    const ox = align === 'center' ? (box.w - line.width) / 2 : align === 'right' ? box.w - line.width : 0;
    if (!animating || type === 'none') {
      ctx.fillText(line.text, ox, base);
      return;
    }
    if (type === 'lines') {
      const e = unitProgress(layer, li, textT);
      ctx.save();
      ctx.beginPath();
      ctx.rect(-padX, top - L.lineH * 0.25, rw, L.lineH * 1.32);
      ctx.clip();
      ctx.fillText(line.text, ox, base + (1 - e) * L.lineH * 1.1);
      ctx.restore();
      return;
    }
    for (const w of line.words) {
      if (type === 'words') {
        const e = unitProgress(layer, unit++, textT);
        if (e <= 0) continue;
        ctx.globalAlpha = Math.min(1, e * 1.5);
        ctx.fillText(w.text, ox + w.x, base + (1 - e) * size * 0.4);
        continue;
      }
      // letters / typewriter: kerning-aware x from prefix widths
      for (let k = 0; k < w.text.length; k++) {
        const e = unitProgress(layer, unit++, textT);
        if (e <= 0) continue;
        const x = ox + w.x + (k ? ctx.measureText(w.text.slice(0, k)).width : 0);
        ctx.globalAlpha = type === 'typewriter' ? 1 : Math.min(1, e * 1.6);
        ctx.fillText(w.text[k], x, base + (type === 'typewriter' ? 0 : (1 - e) * size * 0.45));
      }
    }
    ctx.globalAlpha = 1;
  });
  return { canvas, rect: [-padX, -padT, rw, rh] };
}

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
    ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.ellipse(w / 2, h / 2, w * 0.34, h * 0.34, 0, Math.PI * 2, 0, true);
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

function rasterShape(layer: Layer): Raster {
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
  let fill: string | CanvasGradient = String(p.fill);
  if (p.gradient) {
    const a = (Number(p.angle ?? 0) * Math.PI) / 180;
    const dx = Math.cos(a) * w / 2, dy = Math.sin(a) * h / 2;
    const g = ctx.createLinearGradient(w / 2 - dx, h / 2 - dy, w / 2 + dx, h / 2 + dy);
    g.addColorStop(0, String(p.fill));
    g.addColorStop(1, String(p.fill2));
    fill = g;
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
    ctx.strokeStyle = String(p.stroke);
    ctx.lineWidth = sw;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
  return { canvas, rect: [-pad, -pad, rw, rh] };
}

// ─── Image ──────────────────────────────────────────────────────────────────
function rasterImage(layer: Layer): Raster | null {
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
    return p.src ? null : { canvas, rect: [-pad, -pad, rw, rh] };
  }
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const k = p.fit === 'cover' ? Math.max(w / iw, h / ih) : Math.min(w / iw, h / ih);
  const dw = iw * k, dh = ih * k;
  ctx.imageSmoothingQuality = 'high';
  if (r > 0) {
    ctx.beginPath();
    ctx.roundRect(p.fit === 'cover' ? 0 : (w - dw) / 2, p.fit === 'cover' ? 0 : (h - dh) / 2, Math.min(w, dw), Math.min(h, dh), r);
    ctx.clip();
  } else {
    ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip();
  }
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  return { canvas, rect: [-pad, -pad, rw, rh] };
}

export function rasterise(layer: Layer, textT: number): Raster | null {
  const c = layer.kind;
  if (c === 'text') return rasterText(layer, textT);
  if (c === 'shape') return rasterShape(layer);
  if (c === 'image') return rasterImage(layer);
  return null;
}
