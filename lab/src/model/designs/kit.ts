import { layoutText, measureTextHeight } from '../../engine/raster';
import { createLayer, createSlide } from '../defaults';
import { cell, groundParams, type LayoutStyle } from '../layouts';
import type { Anim, Box, Layer, Params, Slide } from '../types';

// The kit the activity and game designs share. They are designed in the lab rather than carried over:
// flush and full-bleed — bands and columns run off the slide's edges, nothing floats in a card with
// empty page round it — type set large (heroes 104–150px, working text 50–60px, nothing under 36px),
// and every part an ordinary layer, edited on the slide and listed in Layers. Things happen on the
// lab's builds: a set shown a part per click, the live part lit and the earlier ones stepped back.

export const W = 1920, H = 1080;
/** The grid's left margin: text lines up with every other slide's, whatever bleeds past it. */
export const LEFT = cell(1, 1, 1, 1).x;
/** The deck's frame. Its header band ends at TOPBAND and its footer band starts at BASE: shapes bleed
 *  to the slide's left and right edges, but top to bottom only from one band to the other, so the
 *  header's logo and the footer's line and page number always sit on the ground, never on a design.
 *  Text ends at FOOT, 50px clear of the footer band, and keeps PAD inside the shape it sits in. */
export let TOPBAND = 112, BASE = 1014, FOOT = 964;
export const PAD = 64;
export const HEAD = 140;
/** Whether the deck the designs are for has a header and footer. Without them nothing needs keeping
 *  clear, so shapes run to the slide's edge. Set before building (the Engage picker does). */
export function setFrame(framed: boolean) {
  TOPBAND = framed ? 112 : 0;
  BASE = framed ? 1014 : H;
  FOOT = framed ? 964 : H - 64;
  // Content starts high — just under the header's band, or near the top when there is none — so the
  // slide's weight sits up the screen and nothing is pushed down towards the footer.
  EY = framed ? 124 : 76;
  HY = EY + 54;
  CY = EY - 12;
  LIFT = 150 - EY;
}
/** Where the small heading (EY), the question under it (HY) and a clock in the top right (CY) sit, and
 *  how far every other top has been raised from the grid's (LIFT). */
export let EY = 124, HY = 178, CY = 112, LIFT = 26;

export const box = (x: number, y: number, w: number, h: number): Box => ({ x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), rot: 0 });

export const rgba = (hex: string, a: number) => {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16);
  return Number.isFinite(n) ? `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})` : hex;
};

export const txt = (name: string, value: string, b: Box, params: Params, anim: Partial<Anim> = { type: 'fade', duration: 0.6 }): Layer =>
  createLayer('text', { name, box: b, params: { text: value, fit: 'shrink', lineHeight: 1.15, tracking: 0, ...params }, anim });

export const rect = (name: string, b: Box, fill: string, anim: Partial<Anim> = { type: 'fade', duration: 0.6 }, radius = 0): Layer =>
  createLayer('shape', { name, box: b, params: { shape: 'rect', radius, fill, strokeWidth: 0 }, anim });

export const ground = (st: LayoutStyle): Layer => {
  const g = groundParams(st);
  return createLayer(g.kind, { name: 'Ground', params: g.params });
};

/** Four distinct tints from the theme, for a set whose parts are tiers or kinds (a menu's Must do to
 *  Extend, a reflection's four panels), as SlideForge gives each panel a colour of its own. */
export const tiers = (st: LayoutStyle) => [rgba(st.accent, 0.16), rgba(st.accent2 ?? st.ink, 0.12), rgba(st.ink, 0.06), st.panel];

/** The cue for a right answer, on every game and theme: green, on the answer's own rows or tile —
 *  never the whole screen — with its words in white. The accent stays for what is live, not for right. */
export const RIGHT = '#1f9d5a', ON_RIGHT = '#ffffff';

/** The two tints that alternate across touching bands, so each still reads as its own. */
export const tint = (st: LayoutStyle, i: number) => (i % 2 ? rgba(st.ink, 0.07) : st.panel);

/** Small capitals in the accent: what the slide is, above its heading. */
export const eyebrow = (st: LayoutStyle, value: string, b?: Box) =>
  txt('Eyebrow', value.toUpperCase(), b ?? box(LEFT, EY, 1100, 50), { font: st.body, weight: '600', size: 40, color: st.accent, tracking: 0.12 }, { type: 'fade', duration: 0.6 });

/** Text for a display face: SlideForge's copy uses the true minus (−), which display faces often
 *  lack and draw as a box; the en dash reads the same. */
export const display = (v: string) => v.replace(/\u2212/g, '\u2013');

/** A heading or question in display type, as large as its region allows. */
export const hero = (st: LayoutStyle, name: string, value: string, b: Box, size = 120, anim: Partial<Anim> = { type: 'words', feel: 'rise', easing: 'easyEase', duration: 0.7, stagger: 0.1 }) =>
  txt(name, display(value), b, { font: st.display, weight: st.displayWeight, size, color: st.ink, lineHeight: 1.03, tracking: -0.015, fit: 'fill', balance: true }, anim);

/**
 * A question set to the screen rather than to a box: the size its length asks for (short questions
 * large, long ones smaller, never under the last size), measured at that size so it takes exactly the
 * height it needs, and stepped down only if that is more than `maxH`. `bottom` is where it ends, so
 * the answers below it can take everything else.
 */
export function sizedHero(st: LayoutStyle, name: string, value: string, x: number, y: number, w: number, o: { sizes?: number[]; maxH?: number; anim?: Partial<Anim> } = {}) {
  const v = display(value);
  const sizes = o.sizes ?? [132, 112, 96, 84];
  const maxH = o.maxH ?? 420;
  const start = v.length <= 50 ? 0 : v.length <= 90 ? 1 : v.length <= 140 ? 2 : 3;
  const params = { font: st.display, weight: st.displayWeight, color: st.ink, lineHeight: 1.03, tracking: -0.015, balance: true };
  let size = sizes[Math.min(start, sizes.length - 1)], h = 0;
  for (let k = Math.min(start, sizes.length - 1); k < sizes.length; k++) {
    size = sizes[k];
    h = measureTextHeight({ ...params, text: v, size }, w);
    if (h <= maxH) break;
  }
  h = Math.min(maxH, h) + 8;
  const layer = txt(name, v, box(x, y, w, h), { ...params, size, fit: 'shrink' }, o.anim ?? { type: 'words', feel: 'rise', easing: 'easyEase', duration: 0.7, stagger: 0.1 });
  return { layer, bottom: y + h, size };
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export { clamp };

/** The largest size, from `max` down to `min`, at which every one of `texts` fits `w` by `h` — a set
 *  of answers shares one size, as large as the tightest allows. */
export function fitSize(texts: string[], w: number, h: number, params: Params, max: number, min = 48): number {
  // A word cannot wrap, so the longest must fit across too, or the one cell would shrink on its own.
  const words = [...new Set(texts.flatMap((v) => v.split(/\s+/)).filter(Boolean))];
  for (let size = max; size > min; size -= 4) {
    if (texts.every((v) => measureTextHeight({ ...params, text: v, size }, w) <= h) && words.every((x) => textWidth(x, { ...params, size }) <= w)) return size;
  }
  return min;
}

/** How tall `value` sets at its size in `w`. */
/** Where each word of `value` sets in a box `w` wide, in reading order, relative to the box: for a
 *  mark drawn on one word of a passage (Spot the error's strike). */
export function wordBoxes(value: string, w: number, params: Params): Box[] {
  const L = layoutText({ lineHeight: 1.15, ...params, text: value }, w);
  const align = String(params.align ?? 'left');
  return L.lines.flatMap((line, li) => {
    const ox = align === 'center' ? (w - line.width) / 2 : align === 'right' ? w - line.width : 0;
    return line.words.filter((x) => !x.marker).map((x) => box(ox + x.x, li * L.lineH, x.w, L.lineH));
  });
}
/** How wide text sets on one line, for rules and strikes drawn to its length. */
export const textWidth = (value: string, params: Params) => Math.ceil(Math.max(0, ...layoutText({ lineHeight: 1.15, ...params, text: value }, 1e5).lines.map((l) => l.width)));
export const textHeight = (value: string, w: number, params: Params) => measureTextHeight({ lineHeight: 1.15, ...params, text: value }, w);

/** Text centred top to bottom in its cell. */
export function centred(name: string, value: string, cell: Box, params: Params, anim: Partial<Anim> = { type: 'fade', duration: 0.6 }, padL = PAD, padR = PAD): Layer {
  // The whole cell, the words set in its middle when drawn, and brought down if they would spill:
  // it stays centred in whatever face the theme sets, loaded or not when the slide was made.
  return txt(name, value, box(cell.x + padL, cell.y, cell.w - padL - padR, cell.h), { lineHeight: 1.15, fit: 'shrink', ...params, valign: 'middle' }, anim);
}

/**
 * The flip: the answer and its reason on the back of the slide, as large as the slide takes, turned to
 * with the ⇄ in the top right corner (and back again). It does not use up a Next, so the teacher turns
 * it when the room is ready. For an answer whose reason will not fit beside it on the wall.
 */
export function flipBack(st: LayoutStyle, o: { eyebrow: string; answer: string; line?: string; why?: string }): Layer[] {
  const back = (l: Layer) => { l.face = 'back'; l.anim = { ...l.anim, type: 'none' }; return l; };
  // In the small heading's row, top right, clear of the question under it.
  const at = box(W - LEFT - 64, EY - 8, 64, 64);
  const toggle = (lit: boolean) => {
    const t = createLayer('shape', { name: lit ? 'Back to the question' : 'Flip to the answer', box: at, params: {
      shape: 'rect', radius: 16, fill: lit ? RIGHT : st.ground, fillOpacity: lit ? 1 : 0.9, stroke: lit ? RIGHT : st.ink, strokeOpacity: lit ? 1 : 0.25, strokeWidth: 2,
      label: '\u21c4', labelColor: lit ? ON_RIGHT : st.ink, labelSize: 34, labelFont: st.body, labelWeight: '600',
    }, anim: { type: 'fade', duration: 0.5, delay: 0.6 } });
    t.interact = { ...t.interact, click: 'flip' };
    return lit ? back(t) : t;
  };
  return [
    toggle(false),
    back(createLayer('shape', { name: 'Answer ground', box: box(0, 0, W, H), params: { shape: 'rect', radius: 0, fill: st.ground, strokeWidth: 0 } })),
    back(txt('Answer — eyebrow', o.eyebrow.toUpperCase(), box(LEFT, EY, 1400, 50), { font: st.body, weight: '600', size: 40, color: RIGHT, tracking: 0.12 })),
    back(txt('Answer', display(o.answer), box(LEFT, HY + 20, W - LEFT * 2, 300), { font: st.display, weight: st.displayWeight, size: 200, color: RIGHT, lineHeight: 1, fit: 'shrink' })),
    ...(o.line ? [back(txt('Answer — line', o.line, box(LEFT, HY + 340, W - LEFT * 2, 80), { font: st.display, weight: st.displayWeight, size: 72, color: st.ink, lineHeight: 1.05 }))] : []),
    ...(o.why ? [back(txt('Answer — why', o.why, box(LEFT, HY + 460, W - LEFT * 2, FOOT - HY - 460), { font: st.body, size: 60, color: st.ink, lineHeight: 1.3, fit: 'shrink' }))] : []),
    toggle(true),
  ];
}

/** A countdown shown as its time only, flush with the text beside it. */
export const clock = (st: LayoutStyle, name: string, minutes: number, b: Box, anim: Partial<Anim> = { type: 'fade', duration: 0.5 }, ring = false) =>
  createLayer('timer', { name, box: b, params: {
    minutes, style: ring ? 'game' : 'digits', label: '', done: '0:00', font: st.body, size: ring ? 60 : 64, textColor: st.ink, accent: st.accent, track: rgba(st.ink, 0.18),
  }, anim });

/** A clock in a heading row, set as the heading is — its face, weight, size, tracking and colour —
 *  flush right, level with its words: the time reads as the end of the heading's line. `row` is the
 *  heading's box; the colour is the heading's (the accent, or reversed out on a cover). */
export function headingClock(st: LayoutStyle, minutes: number, row: Box = box(LEFT, EY, 1100, 50), color = st.accent, deckW = W, name = 'Clock'): Layer {
  const w = 260, h = 68, size = 40;
  return createLayer('timer', {
    name, box: box(deckW - row.x - w, row.y + (size * 1.15) / 2 - h / 2, w, h), anim: { type: 'fade', duration: 0.5 },
    params: { minutes, style: 'digits', label: '', done: '0:00', font: st.body, weight: '600', size, tracking: 0.12, align: 'right', textColor: color, accent: color, track: rgba(st.ink, 0.18) },
  });
}

export type StepMode = 'on' | 'dim' | 'spot' | 'swap' | 'pile';
/** One part of a set built a part per click: the first `upFront` parts are up with the slide, each
 *  later one arrives on a click, led by its first layer; the rest of the part comes with it. */
export function part(set: string, i: number, mode: StepMode, upFront = 1) {
  const step = { set, i, mode };
  const first = i < upFront;
  const base = first ? 0.4 + i * 0.12 : 0;
  return {
    lead: (type: Anim['type'] = 'fade'): Partial<Anim> => ({ type, duration: 0.6, delay: base, trigger: first ? 'withSlide' : 'onClick', step }),
    with: (delay: number, type: Anim['type'] = 'fade'): Partial<Anim> => ({ type, duration: 0.6, delay: base + delay, trigger: 'withSlide', step }),
  };
}

/** A row of SlideForge's content: "Label · 3 min [talk]<TAB>What to do". `job` is what the room does,
 *  from SlideForge's declared job ([note], [talk], [send], [work], [down]) or its "every 4 min". */
export interface Row { label: string; text: string; minutes: number; job?: string }
const TIME = /\s*[·•\-–—|,]\s*(every\s+)?(\d+(?:\.\d+)?)\s*(min|mins|minutes|m|s|sec|secs|seconds)\s*$/i;
const JOB = /\s*\[(note|talk|send|work|down)\]\s*$/i;
const JOBS: Record<string, string> = { note: 'A private note on your phone', talk: 'Talk it through', send: 'Send it from your phone', work: 'Work on it', down: 'Phones down' };
export function rowsOf(bullets: string[] = []): Row[] {
  return bullets.filter((l) => l.trim()).map((l) => {
    const [rawA = '', rawB = ''] = l.split('\t');
    const declared = (rawA.match(JOB) ?? rawB.match(JOB))?.[1]?.toLowerCase();
    const a = rawA.replace(JOB, '').trim(), b = rawB.replace(JOB, '').trim();
    const m = a.match(TIME);
    const n = m ? Number(m[2]) : 0;
    const minutes = m ? (/^s/i.test(m[3]) ? n / 60 : n) : 0;
    const job = m?.[1] ? `Every ${m[2]} min` : declared ? JOBS[declared] : undefined;
    return { label: m ? a.slice(0, m.index).trim() : a, text: b, minutes, job };
  });
}

/** A row's label with its time after it, when it has one: "Must do · 10 min". */
export const labelled = (r: Row) => (r.minutes ? `${r.label} · ${r.minutes >= 1 ? `${Math.round(r.minutes * 10) / 10} min` : `${Math.round(r.minutes * 60)} sec`}` : r.label);

export const fmtMin = (m: number) => (m >= 1 ? `${Math.floor(m)}:${String(Math.round((m % 1) * 60)).padStart(2, '0')}` : `0:${String(Math.round(m * 60)).padStart(2, '0')}`);

/** A chip in the eyebrow row, right-aligned: what the phones do on this slide. */
export const phonesCue = (st: LayoutStyle, what: string, right = W - LEFT) =>
  txt('Phones', `ON PHONES · ${what.toUpperCase()}`, box(right - 700, EY, 700, 50), { font: st.body, weight: '600', size: 36, color: st.muted, tracking: 0.12, align: 'right' });

export function slideOf(name: string, layers: Layer[], st: LayoutStyle, notes = ''): Slide {
  const s = createSlide(name, layers, st.ground, { type: 'fade', duration: 0.7 });
  s.notes = notes;
  return s;
}
