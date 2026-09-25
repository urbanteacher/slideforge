import type { Layer, Params } from '../model/types';
import { DIM_TO, EASE, textUnitCount, unitProgress } from './anim';
import { drawTableChart, isTableKind } from './chartKinds';
import { drawExperiment } from './experiment';
import { drawScene } from './scene';
import { videoEmbed, videoService, videoStill } from '../model/video';
import { FRAME_K, isWordMotion, reach, unitDelays, unitLook, type UnitLook } from './words';

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
/** Redraw everything that was drawn before a font or picture arrived (a style guide's typefaces). */
export const refreshAssets = bump;

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

/** Settles once a picture has arrived, or failed to: a still drawn before then leaves it out. */
export function imageSettled(src: string): Promise<void> {
  if (!src) return Promise.resolve();
  getImage(src);
  const img = images.get(src)!;
  if (img.complete) return Promise.resolve();
  return new Promise((resolve) => {
    img.addEventListener('load', () => resolve(), { once: true });
    img.addEventListener('error', () => resolve(), { once: true });
  });
}

// ─── Text ───────────────────────────────────────────────────────────────────
export function fontString(p: Params, px: number) {
  const fam = String(p.font ?? 'Inter');
  const generic = /mono/i.test(fam) ? 'monospace' : /serif|playfair|fraunces|georgia|iowan|old style/i.test(fam) ? 'serif' : 'sans-serif';
  return `${p.italic ? 'italic ' : ''}${p.weight ?? 400} ${px}px "${fam}", ${generic}`;
}

interface Word { text: string; x: number; w: number; marker?: boolean }
interface Line { words: Word[]; width: number; text: string; plain: boolean; para: number }
export interface TextLayout { lines: Line[]; lineH: number; height: number; size: number }

/**
 * Faces whose character is in their OpenType alternates: Alpha Lyrae's notched t, h, a and P are
 * contextual alternates, and a browser turns those off as soon as letter spacing is not zero — the
 * canvas then draws plain letters that measure the same, and the face looks like a generic sans.
 * These keep their spacing at zero whatever the tracking says.
 */
const ALTERNATES = /alpha lyrae/i;
export const keepsAlternates = (family: unknown) => ALTERNATES.test(String(family ?? ''));

function setupFont(ctx: Ctx, p: Params, px: number) {
  ctx.font = fontString(p, px);
  const c = ctx as Ctx & { letterSpacing?: string };
  if ('letterSpacing' in c) c.letterSpacing = keepsAlternates(p.font) ? '0px' : `${Number(p.tracking ?? 0) * px}px`;
}

export function layoutText(p: Params, width: number): TextLayout {
  const full = layoutAt(p, width);
  if (!p.balance || full.lines.length < 2 || full.lines.length > 6) return full;
  // Balanced, as CSS text-wrap: balance does it: the narrowest measure that still takes as many
  // lines, so the lines come out even and break where the sense is rather than at the margin.
  let lo = 0, hi = width;
  for (const l of full.lines) for (const w of l.words) lo = Math.max(lo, w.w);
  for (let i = 0; i < 14 && hi - lo > 0.5; i++) {
    const mid = (lo + hi) / 2;
    if (layoutAt(p, mid).lines.length > full.lines.length) lo = mid; else hi = mid;
  }
  return layoutAt(p, hi);
}

function layoutAt(p: Params, width: number): TextLayout {
  const size = Number(p.size ?? 64);
  const ctx = mctx();
  setupFont(ctx, p, size);
  ensureFont(fontString(p, size));
  let raw = String(p.text ?? '');
  if (p.uppercase) raw = raw.toUpperCase();
  const space = ctx.measureText(' ').width;
  const list = String(p.list ?? 'none');
  const lines: Line[] = [];
  const paras = raw.split('\n');
  // Every item in a list hangs at one indent, wide enough for its longest number.
  const items = paras.filter((x) => x.trim()).length;
  const widest = list === 'numbers' ? Math.max(...Array.from({ length: items }, (_, i) => ctx.measureText(`${i + 1}.`).width)) : ctx.measureText('•').width;
  const listIndent = Math.max(widest + space * 1.2, size * (list === 'numbers' ? 1.1 : 0.8));
  let num = 0, pi = -1;
  for (const para of paras) {
    pi++;
    // A list item hangs its wrapped lines at the indent, clear of its bullet or number.
    const marker = list !== 'none' && para.trim() ? (list === 'numbers' ? `${++num}.` : '•') : '';
    const indent = marker ? listIndent : 0;
    const words = para.split(/ +/);
    let cur: Word[] = marker ? [{ text: marker, x: 0, w: ctx.measureText(marker).width, marker: true }] : [];
    let x = indent;
    const push = () => {
      const last = cur[cur.length - 1];
      lines.push({ words: cur, width: last ? last.x + last.w : 0, text: cur.map((c) => c.text).join(' '), plain: !indent, para: pi });
    };
    for (const w of words) {
      const ww = ctx.measureText(w).width;
      if (cur.some((c) => !c.marker) && x + ww > width + 0.5) {
        push();
        cur = [];
        x = indent;
      }
      cur.push({ text: w, x, w: ww });
      x += ww + space;
    }
    push();
  }
  const lineH = size * Number(p.lineHeight ?? 1.1);
  return { lines, lineH, size, height: Math.max(lineH, lines.length * lineH) };
}

export function measureTextHeight(p: Params, width: number) {
  return Math.ceil(layoutText(p, width).height);
}

function rasterText(layer: Layer, textT: number): Raster {
  const box = layer.box!;
  const p: Params = { ...layer.params, size: textSize(layer) };
  const L = layoutText(p, box.w);
  const size = L.size;
  // Words on their way in can start well away from their place (a bounce falls from two lines up).
  const wm = isWordMotion(layer);
  const far = wm ? reach(layer.anim) * size : 0;
  const padX = size * 0.5 + far, padT = size * 0.35 + far, padB = size * 0.7 + far;
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
  // SlideForge's word motion: each unit drawn at its own look, about its own box.
  const units = wm && animating ? textUnitCount(layer) : 0;
  const delays = units ? unitDelays(layer.anim, units) : [];
  const easeFn = EASE[layer.anim.easing] ?? EASE.easyEase;
  const drawUnit = (str: string, x: number, width: number, top: number, base: number, lk: UnitLook, letter: boolean, marker?: boolean) => {
    if (lk.alpha <= 0.002 || (lk.clip && lk.clip[1] <= lk.clip[0])) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, lk.alpha);
    // A word turns about a point 60% down its own height; a letter, narrower, about its middle.
    const ox = x + width / 2, oy = top + L.lineH * (letter ? 0.5 : 0.6);
    ctx.translate(ox + lk.dx * size, oy + lk.dy * size);
    if (lk.rot) ctx.rotate((lk.rot * Math.PI) / 180);
    if (lk.scale !== 1) ctx.scale(lk.scale, lk.scale);
    ctx.translate(-ox, -oy);
    if (lk.clip) {
      ctx.beginPath();
      ctx.rect(x - size, top + L.lineH * lk.clip[0], width + size * 2, L.lineH * (lk.clip[1] - lk.clip[0]));
      ctx.clip();
    }
    if (lk.blur > 0.05) ctx.filter = `blur(${(lk.blur * FRAME_K * S).toFixed(2)}px)`;
    ctx.fillText(str, x, base);
    if (!marker) underline(x, width, base);
    ctx.restore();
  };
  const underline = (x: number, w: number, y: number) => {
    if (p.underline && w > 0) ctx.fillRect(x, y + size * 0.09, w, Math.max(1, size * 0.055));
  };

  // Line builds: progress per non-empty paragraph, spread over every paragraph (a blank line takes
  // the one before it), and the newest shown line when earlier ones dim.
  let built: number[] | null = null, step: number[] = [];
  const dimBefore = Number(p._dimBefore ?? -1);
  if (typeof p._lines === 'string' && p._lines) {
    const prog = p._lines.split(',').map(Number);
    let k = -1;
    step = String(p.text ?? '').split('\n').map((x) => { if (x.trim()) k++; return Math.max(0, k); });
    built = step.map((k2) => prog[k2] ?? 1);
  }
  L.lines.forEach((line, li) => {
    const top = li * L.lineH;
    const base = top + L.lineH / 2 + (asc - desc) / 2;
    const ox = align === 'center' ? (box.w - line.width) / 2 : align === 'right' ? box.w - line.width : 0;
    const whole = (y: number) => {
      if (line.plain) ctx.fillText(line.text, ox, y);
      else for (const w of line.words) ctx.fillText(w.text, ox + w.x, y);
      const first = line.words.find((w) => !w.marker);
      if (first) underline(ox + first.x, line.width - first.x, y);
    };
    if (!animating || type === 'none') {
      // Built a line per click: each paragraph at its own progress, earlier ones dimmed if asked.
      if (built) {
        const b = built[line.para] ?? 1;
        if (b <= 0) return;
        ctx.globalAlpha = Math.min(1, b * 1.4) * (dimBefore >= 0 && (step[line.para] ?? 0) < dimBefore ? (p._dimTo === 'spot' ? DIM_TO.spot : DIM_TO.dim) : 1);
        whole(base + (1 - b) * size * 0.5);
        ctx.globalAlpha = 1;
        return;
      }
      whole(base);
      return;
    }
    if (type === 'lines') {
      const e = unitProgress(layer, li, textT);
      ctx.save();
      ctx.beginPath();
      ctx.rect(-padX, top - L.lineH * 0.25, rw, L.lineH * 1.32);
      ctx.clip();
      whole(base + (1 - e) * L.lineH * 1.1);
      ctx.restore();
      return;
    }
    for (const w of line.words) {
      if (units && type === 'words') {
        drawUnit(w.text, ox + w.x, w.w, top, base, unitLook(layer.anim, unit, units, textT, easeFn, delays), false, w.marker);
        unit++;
        continue;
      }
      if (units) {
        for (let k = 0; k < w.text.length; k++) {
          const x = ox + w.x + (k ? ctx.measureText(w.text.slice(0, k)).width : 0);
          drawUnit(w.text[k], x, ctx.measureText(w.text[k]).width, top, base, unitLook(layer.anim, unit, units, textT, easeFn, delays), true, w.marker);
          unit++;
        }
        continue;
      }
      if (type === 'words') {
        const e = unitProgress(layer, unit++, textT);
        if (e <= 0) continue;
        ctx.globalAlpha = Math.min(1, e * 1.5);
        ctx.fillText(w.text, ox + w.x, base + (1 - e) * size * 0.4);
        if (!w.marker) underline(ox + w.x, w.w, base + (1 - e) * size * 0.4);
        continue;
      }
      // letters / typewriter: kerning-aware x from prefix widths
      for (let k = 0; k < w.text.length; k++) {
        const e = unitProgress(layer, unit++, textT);
        if (e <= 0) continue;
        const x = ox + w.x + (k ? ctx.measureText(w.text.slice(0, k)).width : 0);
        ctx.globalAlpha = type === 'typewriter' ? 1 : Math.min(1, e * 1.6);
        const y = base + (type === 'typewriter' ? 0 : (1 - e) * size * 0.45);
        ctx.fillText(w.text[k], x, y);
        if (!w.marker) underline(x, ctx.measureText(w.text[k]).width, y);
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

/** A colour at an opacity, for the canvas. Opacity 1 hands the colour back as it was written. */
function withAlpha(colour: string, alpha: unknown) {
  const a = alpha === undefined ? 1 : Math.max(0, Math.min(1, Number(alpha)));
  if (a >= 1) return colour;
  const h = colour.replace('#', '');
  const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  const n = parseInt(f, 16);
  return f.length === 6 && !Number.isNaN(n) ? `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})` : colour;
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
  // The focus decides which part of an over-sized picture the frame keeps (CSS object-position).
  const [fx, fy] = Array.isArray(p.focus) ? (p.focus as [number, number]) : [0.5, 0.5];
  const ox = p.fit === 'cover' ? (w - dw) * fx : (w - dw) / 2, oy = p.fit === 'cover' ? (h - dh) * fy : (h - dh) / 2;
  ctx.imageSmoothingQuality = 'high';
  // A logo on a dark ground is shown white; "dark" says so outright, "auto" was resolved by the renderer.
  if (p.tone === 'dark' || p._white) ctx.filter = 'brightness(0) invert(1)';
  if (r > 0) {
    ctx.beginPath();
    ctx.roundRect(p.fit === 'cover' ? 0 : (w - dw) / 2, p.fit === 'cover' ? 0 : (h - dh) / 2, Math.min(w, dw), Math.min(h, dh), r);
    ctx.clip();
  } else {
    ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip();
  }
  if (p.flip === 'mirror') { ctx.translate(w, 0); ctx.scale(-1, 1); }
  ctx.drawImage(img, p.flip === 'mirror' ? w - ox - dw : ox, oy, dw, dh);
  return { canvas, rect: [-pad, -pad, rw, rh] };
}

// ─── Before / after ─────────────────────────────────────────────────────────
// SlideForge's wipe: the before picture whole, the after clipped to the right of the divider
// (inset from the left by 100 − position), a handle on the divider, and each picture's label in
// its top corner, hidden when its picture is wiped away. `_pos` is the live handle from the player.
function rasterWipe(layer: Layer): Raster {
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

// ─── Simulation ─────────────────────────────────────────────────────────────
// SlideForge's explore graph: axes, the model's curve, a marker at the input, then the reading
// ("input: x → output: y"), the formula, and a slider whose knob sits under the marker. `_input` is
// the live input from the player; the plot's left and right edges are MODEL_PLOT of the box.
export const MODEL_PLOT = [0.09, 0.97] as const;
export function modelValue(p: Params, x: number) {
  const a = Number(p.a ?? 2), b = Number(p.b ?? 0);
  return a * (p.model === 'quadratic' ? x * x : x) + b;
}
function rasterModel(layer: Layer): Raster {
  const p = layer.params;
  const { canvas, ctx, w, h, rect } = boxCanvas(layer);
  const lo = Number(p.min ?? 0), hi = Math.max(lo + 1, Number(p.max ?? 10));
  const input = Math.max(lo, Math.min(hi, Number(p._input ?? p.initial ?? lo)));
  const size = Number(p.size ?? 36), fam = String(p.font ?? 'Inter'), ink = String(p.textColor ?? '#1a1a1a'), accent = String(p.accent ?? '#ff5a36');
  const pts = Array.from({ length: 101 }, (_, i) => { const x = lo + ((hi - lo) * i) / 100; return [x, modelValue(p, x)] as const; });
  const low = Math.min(0, ...pts.map((q) => q[1])), high = Math.max(1, ...pts.map((q) => q[1]));
  const x0 = w * MODEL_PLOT[0], x1 = w * MODEL_PLOT[1], top = size * 0.6, bottom = h - size * 5.4;
  const X = (x: number) => x0 + ((x - lo) / (hi - lo)) * (x1 - x0), Y = (y: number) => bottom - ((y - low) / (high - low || 1)) * (bottom - top);
  ctx.textBaseline = 'middle';
  // Axes, and the four numbers that give them a scale.
  ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, top); ctx.lineTo(x0, bottom); ctx.lineTo(x1, bottom); ctx.stroke();
  useFont(ctx, fam, size * 0.8, 500); ctx.fillStyle = rgba(ink, 0.72);
  ctx.textAlign = 'right'; ctx.fillText(fmtNum(Math.round(high)), x0 - size * 0.4, top); ctx.fillText(fmtNum(Math.round(low)), x0 - size * 0.4, bottom);
  ctx.textAlign = 'left'; ctx.fillText(fmtNum(lo), x0, bottom + size * 0.8); ctx.textAlign = 'right'; ctx.fillText(fmtNum(hi), x1, bottom + size * 0.8);
  ctx.strokeStyle = accent; ctx.lineWidth = Math.max(4, size * 0.14); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y)))); ctx.stroke();
  const out = modelValue(p, input), mx = X(input), my = Y(out);
  ctx.setLineDash([6, 8]); ctx.strokeStyle = rgba(ink, 0.35); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(mx, bottom); ctx.lineTo(mx, my); ctx.lineTo(x0, my); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = accent; ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(mx, my, Math.max(10, size * 0.32), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // The reading, the formula, and the slider it is driven by.
  const r2 = (v: number) => fmtNum(Math.round(v * 100) / 100);
  const inL = String(p.inputLabel ?? 'Input'), outL = String(p.outputLabel ?? 'Output');
  ctx.textAlign = 'left'; ctx.fillStyle = ink; useFont(ctx, fam, size, 650);
  ctx.fillText(`${inL}: ${r2(input)}  \u2192  ${outL}: ${r2(out)}`, x0, bottom + size * 2.1);
  useFont(ctx, fam, size * 0.8, 400); ctx.fillStyle = rgba(ink, 0.72);
  ctx.fillText(`${outL} = ${fmtNum(Number(p.a ?? 2))} \u00d7 ${inL}${p.model === 'quadratic' ? '\u00b2' : ''} + ${fmtNum(Number(p.b ?? 0))}`, x0, bottom + size * 3.2);
  const sy = h - size * 0.9;
  ctx.fillStyle = rgba(ink, 0.16); ctx.beginPath(); ctx.roundRect(x0, sy - 5, x1 - x0, 10, 5); ctx.fill();
  ctx.fillStyle = accent; ctx.beginPath(); ctx.roundRect(x0, sy - 5, mx - x0, 10, 5); ctx.fill();
  ctx.fillStyle = accent; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(mx, sy, size * 0.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  return { canvas, rect };
}

// ─── Video ──────────────────────────────────────────────────────────────────
// Videos play muted on a loop (the only way a browser will autoplay them). The renderer
// re-uploads a video layer whenever `contentFrame` moves on, so the texture follows playback.
const videos = new Map<string, HTMLVideoElement>();
export function getVideo(src: string): HTMLVideoElement | null {
  if (!src || typeof document === 'undefined') return null;
  let v = videos.get(src);
  if (!v) {
    v = document.createElement('video');
    v.crossOrigin = 'anonymous';
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.preload = 'auto';
    v.onloadeddata = bump;
    v.src = src;
    v.play().catch(() => undefined);
    videos.set(src, v);
  }
  if (v.paused && v.readyState >= 2) v.play().catch(() => undefined);
  return v.readyState >= 2 && v.videoWidth > 0 ? v : null;
}

/** Changes whenever a content layer needs redrawing without its params changing (a playing video). */
export function contentFrame(layer: Layer): number {
  if (layer.kind !== 'video') return 0;
  const v = videos.get(String(layer.params.src ?? ''));
  return v ? v.currentTime : 0;
}

const videoCanvas = new Map<string, HTMLCanvasElement | OffscreenCanvas>();
function rasterVideo(layer: Layer): Raster | null {
  const p = layer.params;
  // A YouTube or Vimeo link: the service's still, with a note that the link was understood. The
  // show frames the real player over it (ui/Present.tsx).
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

// ─── Shared drawing for cards and charts ────────────────────────────────────
function rgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const rgba = (hex: string, a: number) => { const [r, g, b] = rgb(hex); return `rgba(${r},${g},${b},${a})`; };
function mix(a: string, b: string, t: number) {
  const A = rgb(a), B = rgb(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`;
}
/** Black or white, whichever reads on `hex`. */
function onColour(hex: string) {
  const [r, g, b] = rgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b > 165 ? '#141414' : '#ffffff';
}

function useFont(ctx: Ctx, family: string, px: number, weight = 400) {
  const f = fontString({ font: family, weight }, px);
  ensureFont(f);
  ctx.font = f;
  const c = ctx as Ctx & { letterSpacing?: string };
  if ('letterSpacing' in c) c.letterSpacing = '0px';
}

/** Word-wraps `text` to `width`, keeping at most `max` lines (the last gets an ellipsis). */
function wrap(ctx: Ctx, text: string, width: number, max = Infinity): string[] {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    let cur = '';
    for (const word of para.split(/ +/)) {
      const next = cur ? `${cur} ${word}` : word;
      if (cur && ctx.measureText(next).width > width) { out.push(cur); cur = word; } else cur = next;
    }
    out.push(cur);
  }
  if (out.length <= max) return out;
  const kept = out.slice(0, max);
  let last = kept[max - 1];
  while (last && ctx.measureText(`${last}…`).width > width) last = last.slice(0, -1);
  kept[max - 1] = `${last.trimEnd()}…`;
  return kept;
}

function fit(ctx: Ctx, text: string, width: number) {
  if (ctx.measureText(text).width <= width) return text;
  let t = text;
  while (t && ctx.measureText(`${t}…`).width > width) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

function pill(ctx: Ctx, text: string, x: number, y: number, px: number, bg: string, family: string) {
  useFont(ctx, family, px, 700);
  const label = text.toUpperCase();
  const c = ctx as Ctx & { letterSpacing?: string };
  if ("letterSpacing" in c) c.letterSpacing = keepsAlternates(family) ? "0px" : `${px * 0.08}px`;
  const tw = ctx.measureText(label).width;
  const h = px * 2, w = tw + px * 1.8;
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, h / 2); ctx.fill();
  ctx.fillStyle = onColour(bg);
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + px * 0.9, y + h / 2 + px * 0.05);
  if ('letterSpacing' in c) c.letterSpacing = '0px';
  return { w, h };
}

/** A padded canvas with a soft-shadowed card drawn in it; returns the context translated to the card. */
function card(layer: Layer) {
  const p = layer.params;
  const { w, h } = layer.box!;
  const pad = 48;
  const rw = w + pad * 2, rh = h + pad * 2;
  const S = Math.min(2, MAX_TEX / Math.max(rw, rh));
  const canvas = makeCanvas(rw * S, rh * S);
  const ctx = canvas.getContext('2d') as Ctx;
  ctx.scale(S, S);
  ctx.translate(pad, pad);
  const r = Math.min(Number(p.radius ?? 0), w / 2, h / 2);
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.14)';
  ctx.shadowBlur = 36;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = String(p.fill ?? '#fff');
  ctx.beginPath(); ctx.roundRect(0, 0, w, h, r); ctx.fill();
  ctx.restore();
  return { canvas, ctx, w, h, rect: [-pad, -pad, rw, rh] as Raster['rect'] };
}

// ─── Quiz ───────────────────────────────────────────────────────────────────
const OPTION_COLOURS = ['#2f6bff', '#16a34a', '#f5a524', '#9b5de5', '#00b8d9'];

/** Where everything on a quiz card sits for a given width; the card is as tall as its content. */
function quizLayout(ctx: Ctx, p: Params, w: number) {
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

function rasterQuiz(layer: Layer): Raster {
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

// ─── Activity ───────────────────────────────────────────────────────────────
const STEP_TIME = /\s*[·•\-–—|,]\s*(\d+(?:\.\d+)?)\s*(min|mins|minutes|m|s|sec|secs|seconds)\s*$/i;

export function parseSteps(text: string) {
  return text.split('\n').map((s) => s.trim()).filter(Boolean).map((s) => {
    const m = s.match(STEP_TIME);
    if (!m) return { text: s, minutes: 0, time: '' };
    const n = Number(m[1]);
    const secs = /^s/i.test(m[2]);
    return { text: s.slice(0, m.index).trim(), minutes: secs ? n / 60 : n, time: `${m[1]} ${secs ? 'sec' : 'min'}` };
  });
}

function activityLayout(ctx: Ctx, p: Params, w: number) {
  const size = Number(p.size ?? 44);
  const fam = String(p.font ?? 'Inter');
  const P = Math.max(24, size * 0.9);
  const labelPx = size * 0.4;
  const steps = parseSteps(String(p.steps ?? ''));
  let y = P + labelPx * 2 + size * 0.6;
  useFont(ctx, fam, size * 1.2, 700);
  const tTop = y;
  const tLines = wrap(ctx, String(p.title ?? ''), w - P * 2, 2);
  y += tLines.length * size * 1.35 + size * 0.4;
  const gap = size * 0.25;
  const rowH = size * 1.55;
  const stepTop = y;
  if (steps.length) y += steps.length * rowH + (steps.length - 1) * gap; else y -= size * 0.4;
  return { size, fam, P, labelPx, steps, tTop, tLines, gap, rowH, stepTop, height: Math.ceil(y + P) };
}

function rasterActivity(layer: Layer): Raster {
  const p = layer.params;
  const { canvas, ctx, w, rect } = card(layer);
  const ink = String(p.textColor ?? '#141414');
  const accent = String(p.accent ?? '#2f6bff');
  const L = activityLayout(ctx, p, w);
  const { size, fam, P, steps, rowH, gap } = L;
  const total = steps.reduce((a, s) => a + s.minutes, 0);
  const lab = pill(ctx, String(p.label || 'Activity'), P, P, L.labelPx, accent, fam);
  if (total > 0) {
    const t = `${Math.round(total * 10) / 10} min`;
    useFont(ctx, fam, size * 0.55, 600);
    const tw = ctx.measureText(t).width;
    const r = size * 0.27, x = w - P - tw;
    ctx.fillStyle = rgba(ink, 0.7);
    ctx.textBaseline = 'middle';
    ctx.fillText(t, x, P + lab.h / 2);
    // a small clock
    const cx = x - r * 1.9, cy = P + lab.h / 2;
    ctx.strokeStyle = rgba(ink, 0.7);
    ctx.lineWidth = Math.max(2, size * 0.055);
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.55); ctx.lineTo(cx, cy); ctx.lineTo(cx + r * 0.45, cy + r * 0.2); ctx.stroke();
  }
  useFont(ctx, fam, size * 1.2, 700);
  ctx.fillStyle = ink;
  ctx.textBaseline = 'top';
  L.tLines.forEach((l, i) => ctx.fillText(l, P, L.tTop + i * size * 1.35));
  const ssize = size * 0.72;
  steps.forEach((s, i) => {
    const cy = L.stepTop + i * (rowH + gap);
    if (i) { ctx.fillStyle = rgba(ink, 0.1); ctx.fillRect(P, cy - gap / 2 - 1, w - P * 2, 2); }
    const d = Math.min(rowH * 0.7, size * 1.1);
    ctx.fillStyle = accent;
    ctx.beginPath(); ctx.arc(P + d / 2, cy + rowH / 2, d / 2, 0, Math.PI * 2); ctx.fill();
    useFont(ctx, fam, d * 0.48, 700);
    ctx.fillStyle = onColour(accent);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(i + 1), P + d / 2, cy + rowH / 2 + d * 0.02);
    ctx.textAlign = 'left';
    let right = w - P;
    if (s.time) {
      useFont(ctx, fam, ssize * 0.8, 600);
      const tw = ctx.measureText(s.time).width;
      const ch = ssize * 1.6, cw = tw + ssize * 1.1;
      right -= cw;
      ctx.fillStyle = rgba(accent, 0.12);
      ctx.beginPath(); ctx.roundRect(right, cy + (rowH - ch) / 2, cw, ch, ch / 2); ctx.fill();
      ctx.fillStyle = mix(accent, ink, 0.25);
      ctx.fillText(s.time, right + ssize * 0.55, cy + rowH / 2 + ssize * 0.03);
      right -= ssize * 0.6;
    }
    useFont(ctx, fam, ssize, 500);
    ctx.fillStyle = ink;
    const tx = P + d + ssize * 0.7;
    ctx.fillText(fit(ctx, s.text, right - tx), tx, cy + rowH / 2 + ssize * 0.04);
  });
  return { canvas, rect };
}

// ─── Chart editing on the canvas ────────────────────────────────────────────
/** Where each point's label and value are drawn, in box coordinates, so the editor can put a field
 *  exactly on top of what it edits. Mirrors the layout in rasterChart. */
export interface ChartSpot { i: number; label: string; value: number; lx: number; ly: number; lw: number; la: 'left' | 'center' | 'right'; vx: number; vy: number; va: 'left' | 'center' }
export function chartSpots(layer: Layer): { spots: ChartSpot[]; add: [number, number]; size: number } {
  const p = layer.params;
  const { w, h } = layer.box!;
  const data = parseChartData(String(p.data ?? ''));
  const size = Number(p.size ?? 28);
  const type = String(p.chart ?? 'column');
  const n = Math.max(1, data.length);
  const ctx = mctx();
  useFont(ctx, String(p.font ?? 'Inter'), size, 500);
  if (type === 'pie' || type === 'donut') {
    const legendPx = Math.min(size, (h / n) * 0.6);
    const legendW = legendPx * 1.3 + Math.max(0, ...data.map((d) => ctx.measureText(`${d.label}  100%`).width));
    const R = Math.max(Math.min(h, w * 0.3) / 2, Math.min(h / 2, (w - legendW - size * 1.4) / 2)) - 2;
    const lx = R + 2 + R + size * 1.4;
    const rowH = Math.min(size * 1.8, h / n), ls = Math.min(size, rowH * 0.6);
    const ly0 = h / 2 - (rowH * n) / 2;
    const lw = Math.max(80, (w - lx) * 0.55);
    return {
      size: ls,
      spots: data.map((d, i) => ({ i, label: d.label, value: d.value, lx: lx + ls * 1.3, ly: ly0 + rowH * (i + 0.5), lw, la: 'left', vx: lx + ls * 1.3 + lw + ls * 0.6, vy: ly0 + rowH * (i + 0.5), va: 'left' })),
      add: [lx + ls * 1.3, ly0 + rowH * (n + 0.5)],
    };
  }
  const max = niceMax(Math.max(...data.map((d) => d.value), 0));
  const showValues = !!p.values;
  if (type === 'bar') {
    const labelW = Math.min(w * 0.35, Math.max(0, ...data.map((d) => ctx.measureText(d.label).width)) + size * 0.6);
    const valW = showValues ? Math.max(0, ...data.map((d) => ctx.measureText(fmtNum(d.value)).width)) + size * 0.6 : 0;
    const x0 = labelW, plotW = w - labelW - valW, slot = h / n;
    return {
      size,
      spots: data.map((d, i) => ({ i, label: d.label, value: d.value, lx: x0 - size * 0.5, ly: slot * (i + 0.5), lw: labelW - size * 0.6, la: 'right', vx: x0 + Math.max(0, (d.value / max) * plotW) + size * 0.4, vy: slot * (i + 0.5), va: 'left' })),
      add: [x0 - size * 0.5, h + size * 0.9],
    };
  }
  const labelH = size * 1.8, top = showValues ? size * 1.5 : size * 0.5;
  const plotH = h - labelH - top, slot = w / n;
  const yOf = (v: number) => top + plotH - (Math.max(0, v) / max) * plotH;
  return {
    size,
    spots: data.map((d, i) => ({ i, label: d.label, value: d.value, lx: slot * (i + 0.5), ly: top + plotH + labelH / 2, lw: slot * 0.9, la: 'center', vx: slot * (i + 0.5), vy: yOf(d.value) - size * (type === 'line' ? 1.05 : 0.7), va: 'center' })),
    add: [w + size * 0.9, top + plotH + labelH / 2],
  };
}

// ─── Auto height and fit ────────────────────────────────────────────────────
// Text and the card-like items are as tall as what they hold: their height follows from width and
// params, never from dragging. With Fit set to "Shrink to fit" the box keeps the height it was
// given instead — the way a SlideForge layout region does — and the type comes down until the
// content fits inside it. Anything else returns null and keeps its height.
const AUTO = new Set(['text', 'quiz', 'activity', 'note', 'quote', 'table']);
/** The box decides the type size: shrink to fit it, or fill it (grow as well as shrink). */
export const shrinks = (l: Pick<Layer, 'params'>) => l.params.fit === 'shrink' || l.params.fit === 'fill';
export const fills = (l: Pick<Layer, 'params'>) => l.params.fit === 'fill';
/** No text on a projected slide is set below 18pt: 36px on the lab's 1920-wide slide, where a
 *  16:9 slide's 960pt makes a point two pixels. A box too small for its words at that size keeps
 *  the size and lets them run over, which is visible and fixable, rather than turning them to dust. */
export const FLOOR_PX = 36;
export const autoHeight = (l: Pick<Layer, 'kind' | 'params'>) => AUTO.has(l.kind) && !shrinks(l);
/** The largest size, no bigger than `size`, whose content is no taller than `h`. Never below `floor`. */
function shrinkToFit(size: number, h: number, measure: (px: number) => number, floor = size * 0.25) {
  if (!(h > 0) || measure(size) <= h + 0.5) return size;
  let lo = Math.min(size, floor), hi = size;
  if (measure(lo) > h) return lo;
  for (let i = 0; i < 16; i++) { const m = (lo + hi) / 2; if (measure(m) <= h) lo = m; else hi = m; }
  return Math.floor(lo * 10) / 10;
}

type Measure = (ctx: Ctx, p: Params, w: number) => { height: number };
const MEASURES: Record<string, Measure> = {
  // A word wider than the box does not fit, however short the text: it would be cut off.
  text: (_c, p, w) => { const L = layoutText(p, w); return Math.max(0, ...L.lines.map((l) => l.width)) > w + 0.5 ? { height: Infinity } : L; },
  quiz: (c, p, w) => quizLayout(c, p, w),
  activity: (c, p, w) => activityLayout(c, p, w),
  note: (c, p, w) => noteLayout(c, p, w),
  quote: (c, p, w) => quoteLayout(c, p, w),
  // Columns wider, together, than the table can be do not fit: the cells would be cut off.
  table: (c, p, w) => { const L = tableLayout(c, p, w); return L.natural > w + 1 ? { height: Infinity } : L; },
};

/** The size a layer is drawn at: its own, or less when it has to shrink into its box. */
export function textSize(l: Pick<Layer, 'kind' | 'params' | 'box'>): number {
  const size = Number(l.params.size ?? 64);
  const m = MEASURES[l.kind];
  if (!m || !shrinks(l) || !l.box) return size;
  const measure = (px: number) => m(mctx(), { ...l.params, size: px }, l.box!.w).height;
  // Fill: as big as the box allows — up to a little over twice the set size, and never taller
  // than one line of the box — so the type uses the space its region was given.
  if (fills(l)) {
    const cap = Math.max(size, Math.min(size * 2.2, 480, l.box.h / Number(l.params.lineHeight ?? 1.1)));
    return shrinkToFit(cap, l.box.h, measure, Math.min(size, FLOOR_PX));
  }
  return shrinkToFit(size, l.box.h, measure);
}

const fitted = (l: Layer): Params => ({ ...l.params, size: textSize(l) });

/**
 * Text that fills its box and belongs to a set — the details of a list of points, the words of four
 * cards — is drawn at one size: the one that fits the fullest member. Filled one by one, a short
 * item would come out larger than its neighbours and the set would read as a jumble.
 */
export function groupSizes(layers: Layer[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const l of layers) {
    const g = l.params.fitGroup;
    if (!g || !l.visible || !l.box || !MEASURES[l.kind]) continue;
    const px = textSize(l);
    out.set(String(g), Math.min(out.get(String(g)) ?? Infinity, px));
  }
  return out;
}

export function contentHeight(l: Pick<Layer, 'kind' | 'params'>, width: number): number | null {
  const m = MEASURES[l.kind];
  if (!m || shrinks(l)) return null;
  return Math.ceil(m(mctx(), l.params, width).height);
}

// ─── Timer ──────────────────────────────────────────────────────────────────
/** m:ss, or h:mm:ss past the hour. */
export function clockText(secs: number) {
  const t = Math.max(0, Math.ceil(secs)), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s2 = t % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s2).padStart(2, '0')}` : `${m}:${String(s2).padStart(2, '0')}`;
}
/** The countdown at its current second (`_left`, set by the renderer from the slide clock; the full
 *  time when the slide is not running). A ring or bar empties as the time does; at zero it says so. */
function rasterTimer(layer: Layer): Raster {
  const p = layer.params;
  const { canvas, ctx, w, h, rect } = boxCanvas(layer, 10);
  const total = Math.max(30, Math.min(7200, Number(p.minutes ?? 5) * 60));
  const left = Math.max(0, Math.min(total, p._left === undefined ? total : Number(p._left)));
  const frac = left / total, over = left <= 0;
  const ink = String(p.textColor ?? '#141414'), accent = String(p.accent ?? '#d94f2b'), track = String(p.track ?? '#d9d4cc');
  const fam = String(p.font ?? 'Inter'), style = String(p.style ?? 'ring');
  const label = String(over ? p.done ?? '' : p.label ?? '').trim();
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
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = over ? accent : ink;
    const px = Math.min(Number(p.size ?? 96), (r * 1.3) / Math.max(3.2, words.length * 0.55));
    setFont(ctx, fam, px, 700); ctx.fillText(words, cx, cy - (label && !over ? px * 0.18 : 0));
    if (label && !over) { setFont(ctx, fam, px * 0.3, 600); ctx.fillStyle = ink; ctx.globalAlpha = 0.7; ctx.fillText(label, cx, cy + px * 0.55); ctx.globalAlpha = 1; }
  } else {
    const barH = style === 'bar' ? Math.max(10, h * 0.12) : 0;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = over ? accent : ink;
    const px = Math.min(Number(p.size ?? 96), (h - barH) * 0.6, w / Math.max(2.4, words.length * 0.6));
    setFont(ctx, fam, px, 700); ctx.fillText(words, w / 2, (h - barH) * (label && !over ? 0.42 : 0.5));
    if (label && !over) { setFont(ctx, fam, px * 0.3, 600); ctx.globalAlpha = 0.7; ctx.fillStyle = ink; ctx.fillText(label, w / 2, (h - barH) * 0.82); ctx.globalAlpha = 1; }
    if (barH) {
      ctx.fillStyle = track; ctx.beginPath(); ctx.roundRect(0, h - barH, w, barH, barH / 2); ctx.fill();
      if (frac > 0) { ctx.fillStyle = accent; ctx.beginPath(); ctx.roundRect(0, h - barH, w * frac, barH, barH / 2); ctx.fill(); }
    }
  }
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  return { canvas, rect };
}

// ─── Table ──────────────────────────────────────────────────────────────────
/** Rows of cells from "a\tb\tc" lines (or "a | b | c"). */
export function parseTable(text: string): string[][] {
  return String(text ?? '').split('\n').filter((r) => r.trim()).map((r) => (r.includes('\t') ? r.split('\t') : r.split(/\s+\|\s+/)).map((c) => c.trim()));
}
function tableLayout(ctx: Ctx, p: Params, w: number) {
  const size = Number(p.size ?? 28), fam = String(p.font ?? 'Inter');
  const rows = parseTable(String(p.data ?? ''));
  const cols = Math.max(1, ...rows.map((r) => r.length));
  const pad = size * 0.6;
  // Columns share the width by what they hold, and none is squeezed below a third of an even share.
  const want = Array.from({ length: cols }, (_, c) => {
    let m = size * 2;
    rows.forEach((r, i) => { setFont(ctx, fam, size, (p.header !== false && i === 0) || (p.labels !== false && c === 0) ? 700 : 400); m = Math.max(m, ctx.measureText(r[c] ?? '').width); });
    return m + pad * 2;
  });
  const total = want.reduce((a, b) => a + b, 0);
  const floor = w / cols / 3;
  const widths = want.map((x) => Math.max(floor, (x / total) * w));
  const k = w / widths.reduce((a, b) => a + b, 0);
  const cw = widths.map((x) => x * k);
  const rowH = size * 1.95;
  return { size, fam, rows, cols, cw, pad, rowH, height: rows.length * rowH, natural: total };
}
function rasterTable(layer: Layer): Raster {
  const p = fitted(layer);
  const { canvas, ctx, w, rect } = boxCanvas(layer);
  const L = tableLayout(ctx, p, w);
  const ink = String(p.textColor ?? '#141414'), accent = String(p.accent ?? '#d94f2b');
  L.rows.forEach((r, i) => {
    const head = p.header !== false && i === 0;
    const y = i * L.rowH;
    let x = 0;
    for (let c = 0; c < L.cols; c++) {
      const label = p.labels !== false && c === 0;
      setFont(ctx, L.fam, L.size, head || label ? 700 : 400);
      ctx.fillStyle = head ? accent : ink;
      ctx.textBaseline = 'middle';
      const cell = fit(ctx, r[c] ?? '', L.cw[c] - L.pad * 2);
      ctx.textAlign = c === 0 ? 'left' : 'center';
      ctx.fillText(cell, c === 0 ? x + (label ? 0 : L.pad) : x + L.cw[c] / 2, y + L.rowH / 2);
      x += L.cw[c];
    }
    // A hairline under every row; the header's is the ink at full strength.
    ctx.globalAlpha = head ? 0.9 : 0.22;
    ctx.fillStyle = head ? accent : ink;
    ctx.fillRect(0, y + L.rowH - (head ? 2 : 1), w, head ? 2 : 1);
    ctx.globalAlpha = 1;
  });
  ctx.textAlign = 'left';
  return { canvas, rect };
}

// ─── SlideForge items: note and quote ──────────────────────────────────────
// Two of the items SlideForge's "+ Item" menu adds that are not plain text: each is one box.

function setFont(ctx: Ctx, family: string, px: number, weight = 400, italic = false, track = 0) {
  const f = fontString({ font: family, weight, italic }, px);
  ensureFont(f);
  ctx.font = f;
  const c = ctx as Ctx & { letterSpacing?: string };
  if ('letterSpacing' in c) c.letterSpacing = keepsAlternates(family) ? '0px' : `${track * px}px`;
}

/** A canvas exactly the size of the box, plus a little bleed for strokes. */
function boxCanvas(layer: Layer, bleed = 6) {
  const { w, h } = layer.box!;
  const rw = w + bleed * 2, rh = h + bleed * 2;
  const S = Math.min(2, MAX_TEX / Math.max(rw, rh));
  const canvas = makeCanvas(rw * S, rh * S);
  const ctx = canvas.getContext('2d') as Ctx;
  ctx.scale(S, S);
  ctx.translate(bleed, bleed);
  ctx.textBaseline = 'top';
  return { canvas, ctx, w, h, rect: [-bleed, -bleed, rw, rh] as Raster['rect'] };
}


/* Note — a takeaway, a source line, a caution. A label, a sentence, an accent rule down its side. */
function noteLayout(ctx: Ctx, p: Params, w: number) {
  const size = Number(p.size ?? 36), fam = String(p.font ?? 'Inter');
  const panel = p.panel !== false;
  const bar = Math.max(4, size * 0.14);
  const P = panel ? size * 0.7 : size * 0.15;
  const tx = bar + size * (panel ? 0.75 : 0.6);
  const labelPx = size * 0.5;
  const label = String(p.label ?? '').trim();
  const labelH = label ? labelPx * 1.9 : 0;
  setFont(ctx, fam, size, 400);
  const lines = wrap(ctx, String(p.text ?? ''), Math.max(20, w - tx - (panel ? P : 0)));
  const lh = size * 1.35;
  return { size, fam, panel, bar, P, tx, labelPx, label, labelH, lines, lh, height: P * 2 + labelH + lines.length * lh };
}
function rasterNote(layer: Layer): Raster {
  const p = fitted(layer);
  const { canvas, ctx, w, h, rect } = boxCanvas(layer);
  const L = noteLayout(ctx, p, w);
  const ink = String(p.textColor ?? '#141414'), accent = String(p.accent ?? '#ff5a36');
  const r = Math.min(Number(p.radius ?? 14), h / 2);
  ctx.save();
  if (L.panel) {
    ctx.fillStyle = String(p.fill ?? '#f3efe8');
    ctx.beginPath(); ctx.roundRect(0, 0, w, h, r); ctx.fill();
    ctx.beginPath(); ctx.roundRect(0, 0, w, h, r); ctx.clip();
  }
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, L.bar, h);
  ctx.restore();
  let y = L.P;
  if (L.label) {
    setFont(ctx, L.fam, L.labelPx, 700, false, 0.1);
    ctx.fillStyle = accent;
    ctx.fillText(L.label.toUpperCase(), L.tx, y);
    y += L.labelH;
  }
  setFont(ctx, L.fam, L.size, 400);
  ctx.fillStyle = ink;
  L.lines.forEach((l, i) => ctx.fillText(l, L.tx, y + i * L.lh + (L.lh - L.size) / 2));
  return { canvas, rect };
}

/* Quote — the words large, a quotation mark in the accent, the attribution beneath. */
function quoteLayout(ctx: Ctx, p: Params, w: number) {
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
function rasterQuote(layer: Layer): Raster {
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

// ─── Chart ──────────────────────────────────────────────────────────────────
export function parseChartData(text: string) {
  return text.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const m = l.match(/^(.*?)[,:\t]\s*(-?[\d.,]+)\s*%?\s*$/);
    if (!m) return { label: l, value: 0 };
    return { label: m[1].trim(), value: Number(m[2].replace(/,/g, '')) || 0 };
  });
}

const fmtNum = (v: number) => v.toLocaleString('en-GB', { maximumFractionDigits: 2 });

function niceMax(v: number) {
  if (v <= 0) return 1;
  const e = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / e;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * e;
}

function rasterChart(layer: Layer, textT = Infinity): Raster {
  const p = layer.params;
  // "Draws itself": each bar, point or wedge at its own progress, one after another. Settled is 1.
  const a = layer.anim;
  const drawing = a.type === 'draw' && Number.isFinite(textT);
  const grow = (i: number) => (drawing ? EASE[a.easing](Math.max(0, Math.min(1, (textT - i * a.stagger) / Math.max(0.01, a.duration)))) : 1);
  const { w, h } = layer.box!;
  const pad = 8;
  const rw = w + pad * 2, rh = h + pad * 2;
  const S = Math.min(2, MAX_TEX / Math.max(rw, rh));
  const canvas = makeCanvas(rw * S, rh * S);
  const ctx = canvas.getContext('2d') as Ctx;
  ctx.scale(S, S);
  ctx.translate(pad, pad);
  const rect: Raster['rect'] = [-pad, -pad, rw, rh];
  const type0 = String(p.chart ?? 'column');
  // SlideForge's other idioms read a table and are drawn by chartKinds; each beat arrives in turn.
  if (isTableKind(type0)) {
    drawTableChart(ctx, w, h, p, (i) => grow(i));
    return { canvas, rect };
  }
  const data = parseChartData(String(p.data ?? ''));
  if (!data.length) return { canvas, rect };
  const fam = String(p.font ?? 'Inter');
  const size = Number(p.size ?? 28);
  const ink = String(p.textColor ?? '#1a1a1a');
  const c1 = String(p.color ?? '#ff5a36'), c2 = String(p.color2 ?? c1);
  const colour = (i: number) => (data.length < 2 ? c1 : mix(c1, c2, i / (data.length - 1)));
  const type = String(p.chart ?? 'column');
  const showValues = !!p.values;
  const n = data.length;

  if (type === 'pie' || type === 'donut') {
    const total = data.reduce((a, d) => a + Math.max(0, d.value), 0) || 1;
    const legendPx = Math.min(size, (h / n) * 0.6);
    useFont(ctx, fam, legendPx, 500);
    const legendW = legendPx * 1.3 + Math.max(...data.map((d) => ctx.measureText(`${d.label}  100%`).width));
    const R = Math.max(Math.min(h, w * 0.3) / 2, Math.min(h / 2, (w - legendW - size * 1.4) / 2)) - 2;
    const cx = R + 2, cy = h / 2;
    let ang = -Math.PI / 2;
    const gapA = n > 1 ? 0.012 : 0;
    // A pie sweeps round as one: wedge i is drawn once the sweep has passed its start.
    const sweep = drawing ? EASE[a.easing](Math.max(0, Math.min(1, textT / Math.max(0.01, a.duration + (n - 1) * a.stagger)))) * Math.PI * 2 : Infinity;
    data.forEach((d, i) => {
      const full = (Math.max(0, d.value) / total) * Math.PI * 2;
      const done = ang + Math.PI / 2;
      const da = Math.min(full, Math.max(0, sweep - done));
      if (da <= 0) { ang += full; return; }
      ctx.fillStyle = colour(i);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, ang + gapA, ang + Math.max(gapA, da - gapA));
      ctx.closePath();
      ctx.fill();
      ang += full;
    });
    if (type === 'donut') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.58, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    // legend
    const lx = cx + R + size * 1.4;
    const rowH = Math.min(size * 1.8, h / n);
    const ls = Math.min(size, rowH * 0.6);
    let ly = cy - (rowH * n) / 2;
    data.forEach((d, i) => {
      ctx.globalAlpha = grow(i);
      ctx.fillStyle = colour(i);
      ctx.beginPath(); ctx.roundRect(lx, ly + rowH / 2 - ls * 0.4, ls * 0.8, ls * 0.8, ls * 0.2); ctx.fill();
      useFont(ctx, fam, ls, 500);
      ctx.fillStyle = ink;
      ctx.textBaseline = 'middle';
      const pct = showValues ? `  ${Math.round((Math.max(0, d.value) / total) * 100)}%` : '';
      ctx.fillText(fit(ctx, d.label + pct, w - lx - ls * 1.3), lx + ls * 1.3, ly + rowH / 2);
      ly += rowH;
    });
    ctx.globalAlpha = 1;
    return { canvas, rect };
  }

  const max = niceMax(Math.max(...data.map((d) => d.value), 0));
  useFont(ctx, fam, size, 500);
  ctx.textBaseline = 'middle';

  if (type === 'bar') {
    const labelW = Math.min(w * 0.35, Math.max(...data.map((d) => ctx.measureText(d.label).width)) + size * 0.6);
    const valW = showValues ? Math.max(...data.map((d) => ctx.measureText(fmtNum(d.value)).width)) + size * 0.6 : 0;
    const x0 = labelW, plotW = w - labelW - valW;
    const slot = h / n, bh = slot * 0.64;
    if (p.grid) {
      ctx.fillStyle = rgba(ink, 0.12);
      for (let g = 0; g <= 4; g++) ctx.fillRect(x0 + (plotW * g) / 4, 0, 2, h);
    }
    data.forEach((d, i) => {
      const y = i * slot + (slot - bh) / 2;
      const g = grow(i);
      const bw = Math.max(0, (d.value / max) * plotW) * g;
      ctx.fillStyle = colour(i);
      ctx.beginPath(); ctx.roundRect(x0, y, bw, bh, [0, Math.min(bh * 0.2, 14), Math.min(bh * 0.2, 14), 0]); ctx.fill();
      ctx.fillStyle = ink;
      ctx.textAlign = 'right';
      ctx.fillText(fit(ctx, d.label, labelW - size * 0.6), x0 - size * 0.5, y + bh / 2);
      ctx.textAlign = 'left';
      ctx.globalAlpha = g;
      if (showValues) ctx.fillText(fmtNum(d.value), x0 + bw + size * 0.4, y + bh / 2);
      ctx.globalAlpha = 1;
    });
    return { canvas, rect };
  }

  // column and line share a vertical value axis
  const labelH = size * 1.8, top = showValues ? size * 1.5 : size * 0.5;
  const plotH = h - labelH - top;
  const slot = w / n;
  const yOf = (v: number) => top + plotH - (Math.max(0, v) / max) * plotH;
  if (p.grid) {
    ctx.fillStyle = rgba(ink, 0.12);
    for (let g = 0; g <= 4; g++) ctx.fillRect(0, top + (plotH * g) / 4, w, 2);
  }
  ctx.textAlign = 'center';
  if (type === 'line') {
    const pts = data.map((d, i) => [slot * (i + 0.5), yOf(d.value)] as const);
    // A line draws along: everything left of the pen, the pen moving point to point.
    ctx.save();
    if (drawing) {
      const k = EASE[a.easing](Math.max(0, Math.min(1, textT / Math.max(0.01, a.duration + (n - 1) * a.stagger))));
      ctx.beginPath(); ctx.rect(-pad, -pad, pts[0][0] + (pts[pts.length - 1][0] - pts[0][0]) * k + pad + Math.max(5, size * 0.3), h + pad * 2); ctx.clip();
    }
    const g = ctx.createLinearGradient(0, top, 0, top + plotH);
    g.addColorStop(0, rgba(c1, 0.28));
    g.addColorStop(1, rgba(c1, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], top + plotH);
    for (const [x, y] of pts) ctx.lineTo(x, y);
    ctx.lineTo(pts[pts.length - 1][0], top + plotH);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = c1;
    ctx.lineWidth = Math.max(3, size * 0.18);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    pts.forEach(([x, y], i) => {
      ctx.fillStyle = colour(i);
      ctx.beginPath(); ctx.arc(x, y, Math.max(5, size * 0.3), 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
  }
  data.forEach((d, i) => {
    const x = slot * (i + 0.5);
    const g = type === 'column' ? grow(i) : 1;
    const y = top + plotH - (top + plotH - yOf(d.value)) * g;
    if (type === 'column') {
      const bw = slot * 0.62;
      ctx.fillStyle = colour(i);
      const r = Math.min(bw * 0.18, 14);
      ctx.beginPath(); ctx.roundRect(x - bw / 2, y, bw, top + plotH - y, [r, r, 0, 0]); ctx.fill();
    }
    ctx.fillStyle = ink;
    ctx.fillText(fit(ctx, d.label, slot * 0.95), x, top + plotH + labelH / 2);
    ctx.globalAlpha = type === 'column' ? g : drawing ? grow(i) : 1;
    if (showValues) ctx.fillText(fmtNum(d.value), x, y - size * (type === 'line' ? 1.05 : 0.7));
    ctx.globalAlpha = 1;
  });
  ctx.textAlign = 'left';
  return { canvas, rect };
}

export function rasterise(layer: Layer, textT: number): Raster | null {
  const c = layer.kind;
  if (c === 'text') return rasterText(layer, textT);
  if (c === 'shape') return rasterShape(layer);
  if (c === 'image') return rasterImage(layer);
  if (c === 'video') return rasterVideo(layer);
  if (c === 'chart') return rasterChart(layer, textT);
  if (c === 'quiz') return rasterQuiz(layer);
  if (c === 'activity') return rasterActivity(layer);
  if (c === 'note') return rasterNote(layer);
  if (c === 'quote') return rasterQuote(layer);
  if (c === 'table') return rasterTable(layer);
  if (c === 'timer') return rasterTimer(layer);
  if (c === 'wipe') return rasterWipe(layer);
  if (c === 'model') return rasterModel(layer);
  if (c === 'experiment') { const { canvas, ctx, w, h, rect } = boxCanvas(layer); ctx.textBaseline = 'alphabetic'; drawExperiment(ctx, w, h, layer.params); return { canvas, rect }; }
  if (c === 'scene') { const { canvas, ctx, w, h, rect } = boxCanvas(layer); drawScene(ctx, w, h, layer.params, (src) => getImage(src)); return { canvas, rect }; }
  return null;
}
