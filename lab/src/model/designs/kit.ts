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
export const TOPBAND = 112, BASE = 1014, FOOT = 964, PAD = 64;
export const HEAD = 140;

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

/** The two tints that alternate across touching bands, so each still reads as its own. */
export const tint = (st: LayoutStyle, i: number) => (i % 2 ? rgba(st.ink, 0.07) : st.panel);

/** Small capitals in the accent: what the slide is, above its heading. */
export const eyebrow = (st: LayoutStyle, value: string, b: Box = box(LEFT, 150, 1100, 50)) =>
  txt('Eyebrow', value.toUpperCase(), b, { font: st.body, weight: '600', size: 40, color: st.accent, tracking: 0.12 }, { type: 'fade', duration: 0.6 });

/** Text for a display face: SlideForge's copy uses the true minus (−), which display faces often
 *  lack and draw as a box; the en dash reads the same. */
export const display = (v: string) => v.replace(/\u2212/g, '\u2013');

/** A heading or question in display type, as large as its region allows. */
export const hero = (st: LayoutStyle, name: string, value: string, b: Box, size = 120, anim: Partial<Anim> = { type: 'words', feel: 'rise', easing: 'easyEase', duration: 0.7, stagger: 0.1 }) =>
  txt(name, display(value), b, { font: st.display, weight: st.displayWeight, size, color: st.ink, lineHeight: 1.03, tracking: -0.015, fit: 'fill', balance: true }, anim);

/** A countdown shown as its time only, flush with the text beside it. */
export const clock = (st: LayoutStyle, name: string, minutes: number, b: Box, anim: Partial<Anim> = { type: 'fade', duration: 0.5 }, ring = false) =>
  createLayer('timer', { name, box: b, params: {
    minutes, style: ring ? 'game' : 'digits', label: '', done: '0:00', font: st.body, size: ring ? 60 : 64, textColor: st.ink, accent: st.accent, track: rgba(st.ink, 0.18),
  }, anim });

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
  txt('Phones', `ON PHONES · ${what.toUpperCase()}`, box(right - 700, 150, 700, 50), { font: st.body, weight: '600', size: 36, color: st.muted, tracking: 0.12, align: 'right' });

export function slideOf(name: string, layers: Layer[], st: LayoutStyle, notes = ''): Slide {
  const s = createSlide(name, layers, st.ground, { type: 'fade', duration: 0.7 });
  s.notes = notes;
  return s;
}
