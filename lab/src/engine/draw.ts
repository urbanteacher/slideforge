// Drawing shared by the card-like kinds and the charts: colours, type, pills, cards and a box-sized canvas
// (from engine/raster.ts, lab-engine-plan M1.5).
import { MAX_TEX, makeCanvas, ensureFont, fontString, keepsAlternates, type Raster, type Ctx } from './raster';
import type { Layer } from '../core';

// ─── Shared drawing for cards and charts ────────────────────────────────────
export function rgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export const rgba = (hex: string, a: number) => { const [r, g, b] = rgb(hex); return `rgba(${r},${g},${b},${a})`; };
export function mix(a: string, b: string, t: number) {
  const A = rgb(a), B = rgb(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`;
}
/** Black or white, whichever reads on `hex`. */
export function onColour(hex: string) {
  const [r, g, b] = rgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b > 165 ? '#141414' : '#ffffff';
}

export function useFont(ctx: Ctx, family: string, px: number, weight = 400) {
  const f = fontString({ font: family, weight }, px);
  ensureFont(f);
  ctx.font = f;
  const c = ctx as Ctx & { letterSpacing?: string };
  if ('letterSpacing' in c) c.letterSpacing = '0px';
}

/** Word-wraps `text` to `width`, keeping at most `max` lines (the last gets an ellipsis). */
export function wrap(ctx: Ctx, text: string, width: number, max = Infinity): string[] {
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

export function fit(ctx: Ctx, text: string, width: number) {
  if (ctx.measureText(text).width <= width) return text;
  let t = text;
  while (t && ctx.measureText(`${t}…`).width > width) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

export function pill(ctx: Ctx, text: string, x: number, y: number, px: number, bg: string, family: string) {
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
export function card(layer: Layer) {
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

// ─── SlideForge items: note and quote ──────────────────────────────────────
// Two of the items SlideForge's "+ Item" menu adds that are not plain text: each is one box.

export function setFont(ctx: Ctx, family: string, px: number, weight = 400, italic = false, track = 0) {
  const f = fontString({ font: family, weight, italic }, px);
  ensureFont(f);
  ctx.font = f;
  const c = ctx as Ctx & { letterSpacing?: string };
  if ('letterSpacing' in c) c.letterSpacing = keepsAlternates(family) ? '0px' : `${track * px}px`;
}

/** A canvas exactly the size of the box, plus a little bleed for strokes. */
export function boxCanvas(layer: Layer, bleed = 6) {
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



/** A colour at an opacity, for the canvas. Opacity 1 hands the colour back as it was written. */
export function withAlpha(colour: string, alpha: unknown) {
  const a = alpha === undefined ? 1 : Math.max(0, Math.min(1, Number(alpha)));
  if (a >= 1) return colour;
  const h = colour.replace('#', '');
  const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  const n = parseInt(f, 16);
  return f.length === 6 && !Number.isNaN(n) ? `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})` : colour;
}

export const fmtNum = (v: number) => v.toLocaleString('en-GB', { maximumFractionDigits: 2 });
