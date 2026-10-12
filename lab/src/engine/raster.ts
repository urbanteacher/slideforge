import type { Layer, Params } from '../core';

// Rasterises content layers (text / shape / image) into 2D canvases that the renderer uploads as
// textures. Each result carries `rect`: the area the canvas covers, relative to the layer box's
// top-left in slide px (so padding for italics, strokes and rise animations never clips).

export interface Raster {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  rect: [number, number, number, number];
}

export type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export const MAX_TEX = 4096;

export function makeCanvas(w: number, h: number): HTMLCanvasElement | OffscreenCanvas {
  const W = Math.max(1, Math.ceil(w)), H = Math.max(1, Math.ceil(h));
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(W, H);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  return c;
}

let measureCtx: Ctx | null = null;
export function mctx(): Ctx {
  if (!measureCtx) measureCtx = makeCanvas(8, 8).getContext('2d') as Ctx;
  return measureCtx;
}

// ─── Assets: fonts & images ─────────────────────────────────────────────────
let assetVersion = 0;
export const getAssetVersion = () => assetVersion;
export const bump = () => { assetVersion++; };
/** Redraw everything that was drawn before a font or picture arrived (a style guide's typefaces). */
export const refreshAssets = bump;

const fontState = new Map<string, 'loading' | 'ready'>();
export function ensureFont(font: string) {
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

export interface Word { text: string; x: number; w: number; marker?: boolean }
export interface Line { words: Word[]; width: number; text: string; plain: boolean; para: number }
export interface TextLayout { lines: Line[]; lineH: number; height: number; size: number }

/**
 * Faces whose character is in their OpenType alternates: Alpha Lyrae's notched t, h, a and P are
 * contextual alternates, and a browser turns those off as soon as letter spacing is not zero — the
 * canvas then draws plain letters that measure the same, and the face looks like a generic sans.
 * These keep their spacing at zero whatever the tracking says.
 */
const ALTERNATES = /alpha lyrae/i;
export const keepsAlternates = (family: unknown) => ALTERNATES.test(String(family ?? ''));

export function setupFont(ctx: Ctx, p: Params, px: number) {
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
  // Word spacing adds to the face's own space, in em; drawn word by word, as a line's own spaces would not stretch.
  const wordGap = Number(p.wordSpacing ?? 0) * size;
  const space = Math.max(0, ctx.measureText(' ').width + wordGap);
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
      lines.push({ words: cur, width: last ? last.x + last.w : 0, text: cur.map((c) => c.text).join(' '), plain: !indent && !wordGap, para: pi });
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

// ─── Text effects ───────────────────────────────────────────────────────────
// Every letter a text layer draws goes through one painter: its fill (a colour or a gradient), an
// outline outside the letters or the outline alone, a shadow, a glow, a highlighter behind the words
// and the underline. A block — the box filled, a panel hugging the words, or a band behind each line —
// sits under them all. Only canvas features every browser draws are used: ctx.filter, which Safari
// keeps behind a setting, is tried once and replaced by a shadow when it does nothing.

let filterWorks: boolean | null = null;
/** Whether this browser's canvas blurs through ctx.filter. */
export function canFilter(): boolean {
  if (filterWorks !== null) return filterWorks;
  try {
    const x = makeCanvas(9, 9).getContext('2d') as Ctx | null;
    if (!x) return (filterWorks = false);
    x.filter = 'blur(2px)';
    x.fillStyle = '#000';
    x.fillRect(4, 4, 1, 1);
    // Blurred, the one dark pixel spreads out and is no longer solid.
    filterWorks = x.getImageData(4, 4, 1, 1).data[3] < 250;
  } catch {
    filterWorks = false;
  }
  return filterWorks;
}


export const MODEL_PLOT = [0.09, 0.97] as const;

// ─── Auto height and fit ────────────────────────────────────────────────────
// Text and the card-like items are as tall as what they hold: their height follows from width and
// params, never from dragging. With Fit set to "Shrink to fit" the box keeps the height it was
// given instead — the way a SlideForge layout region does — and the type comes down until the
// content fits inside it. Anything else returns null and keeps its height.
/** The box decides the type size: shrink to fit it, or fill it (grow as well as shrink). */
export const shrinks = (l: Pick<Layer, 'params'>) => l.params.fit === 'shrink' || l.params.fit === 'fill';
export const fills = (l: Pick<Layer, 'params'>) => l.params.fit === 'fill';
/** No text on a projected slide is set below 18pt: 36px on the lab's 1920-wide slide, where a
 *  16:9 slide's 960pt makes a point two pixels. A box too small for its words at that size keeps
 *  the size and lets them run over, which is visible and fixable, rather than turning them to dust. */
export const FLOOR_PX = 36;
// The kinds that measure their content (text and the card-like items) are as tall as it.
export const autoHeight = (l: Pick<Layer, 'kind' | 'params'>) => !!MEASURES[l.kind] && !shrinks(l);
/** The largest size, no bigger than `size`, whose content is no taller than `h`. Never below `floor`. */
function shrinkToFit(size: number, h: number, measure: (px: number) => number, floor = size * 0.25) {
  if (!(h > 0) || measure(size) <= h + 0.5) return size;
  let lo = Math.min(size, floor), hi = size;
  if (measure(lo) > h) return lo;
  for (let i = 0; i < 16; i++) { const m = (lo + hi) / 2; if (measure(m) <= h) lo = m; else hi = m; }
  return Math.floor(lo * 10) / 10;
}

export type Measure = (ctx: Ctx, p: Params, w: number) => { height: number };
const MEASURES: Record<string, Measure> = {};

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

export const fitted = (l: Layer): Params => ({ ...l.params, size: textSize(l) });

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

export type RasterFn = (layer: Layer, textT: number) => Raster | null;
/** A layer kind's drawing, registered by kinds/index.ts: how it is drawn, and how tall its content is. */
export interface KindDrawing { raster: RasterFn; measure?: Measure }
const RASTERS: Record<string, RasterFn> = {};

/** A kind's drawing, from kinds/index.ts: the engine draws the kinds only through what is registered here. */
export function registerRaster(id: string, d: KindDrawing) {
  RASTERS[id] = d.raster;
  if (d.measure) MEASURES[id] = d.measure;
}

export function rasterise(layer: Layer, textT: number): Raster | null {
  const draw = RASTERS[layer.kind];
  return draw ? draw(layer, textT) : null;
}
