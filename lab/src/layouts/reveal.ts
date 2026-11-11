// A list revealed a row per click, built from the studio's own layers (docs/editable-figures-plan.md, part 2).
// SlideForge draws this as a live figure (src/figures/reveal.js): each row an icon, a name, words and a tag. Brought
// in as a picture, none of its words could be edited. Here every row is ordinary layers: a picture for the icon and
// text for the rest, built on its click with the studio's step builds (anim.step), so a teacher can retype, move,
// restyle, add or delete a row like any other slide. The figure's columns are kept, scaled from its 1280 × 720.

import { createLayer, type Anim, type Layer, type Slide } from '../core';
import { after, slide, text, titleBar, titleRow, shape } from './blocks';
import { GRID, type LayoutStyle } from './style';

export interface RevealRow { icon?: string; ring?: string; name?: string; say?: string; tag?: { text: string; fill: string }; text?: string }
export interface RevealSpec {
  title: string;
  eyebrow?: string;
  sub?: string;
  rows: RevealRow[];
  /** 'build': each row arrives on its click. 'answers': every row shows from the start; its tag and words arrive on its click. */
  mode?: string;
  /** A line joining the icons (numbered steps). */
  rail?: boolean;
  /** false: rows already shown stay full strength. */
  dim?: boolean;
  /** The figure's steps: which row each reaches (upto, -1 for none), and what its caption says. */
  steps?: { caption?: string; upto?: number }[];
  nameX?: number; sayX?: number; tagX?: number; textX?: number; size?: number; saySize?: number; max?: number;
}

const K = 1.5; // the figure's 1280 × 720 to the slide's 1920 × 1080
const RIGHT = 1216 * K;

/** A row's icon, drawn as the figure draws it: its own SVG on a disc, 64 units across. */
function iconSvg(r: RevealRow, dark: boolean): string {
  const ring = r.ring || (dark ? 'rgba(255,255,255,.1)' : '#eef1f5');
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-32 -32 64 64" width="128" height="128"><circle r="32" fill="${ring}"/>${r.icon ?? ''}</svg>`);
}

const isDark = (hex: string) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return false;
  const n = parseInt(m[1], 16), lum = 0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
  return lum < 110;
};

/** The click (from 0) each row arrives on, or -1 for one shown as the slide opens. */
function clicksOf(spec: RevealSpec, n: number): number[] {
  const steps = spec.steps?.length ? spec.steps : [{ upto: n - 1 }];
  const at = new Array<number>(n).fill(-2);
  steps.forEach((st, k) => {
    const upto = typeof st.upto === 'number' ? st.upto : n - 1;
    for (let i = 0; i <= Math.min(upto, n - 1); i++) if (at[i] === -2) at[i] = k - 1;
  });
  return at.map((c) => (c === -2 ? steps.length - 1 : c));
}

export function revealSlide(st: LayoutStyle, spec: RevealSpec): Slide {
  const rows = spec.rows.slice(0, 8), n = Math.max(1, rows.length), dark = isDark(st.ground);
  const steps = spec.steps?.length ? spec.steps : [{}];
  const layers: Layer[] = [];
  if (spec.eyebrow) layers.push(text('Eyebrow', spec.eyebrow, { x: GRID.left, y: GRID.top - 66, w: 1200, h: 40, rot: 0 }, { font: st.body, weight: '700', size: 24, color: st.accent, uppercase: true, tracking: 0.12 }, after(0)));
  layers.push(titleRow(st, spec.title), titleBar(st));
  const subY = GRID.top + 2 * GRID.stepY + 40;
  if (spec.sub) layers.push(text('Sub-line', spec.sub, { x: GRID.left, y: subY, w: 1764, h: 48, rot: 0 }, { font: st.body, weight: '400', size: 30, color: st.muted }, after(0.1)));
  const top = spec.sub ? subY + 72 : subY + 20, foot = 1014 - 50 - 76;
  const rh = Math.min((spec.max ?? 120) * K, (foot - top) / n);
  const iconX = 104 * K, nameX = (spec.nameX ?? 160) * K, sayX = (spec.sayX ?? spec.nameX ?? 160) * K, tagX = (spec.tagX ?? 470) * K;
  const textX = (spec.textX ?? (rows.some((r) => r.tag) ? 712 : 470)) * K;
  const size = (spec.size ?? 21) * K, saySize = (spec.saySize ?? 19) * K;
  const tagW = Math.max(60, ...rows.filter((r) => r.tag).map((r) => r.tag!.text.length * 10.5 + 34)) * K;
  const rr = Math.min(32 * K, rh * 0.36);
  const build = spec.mode === 'build', clicks = clicksOf(spec, rows.length), mode = spec.dim === false ? 'on' : 'dim';
  const set = 'reveal-' + Math.random().toString(36).slice(2, 9);
  /** A layer that arrives on a click: the first of its click opens it, the rest come with it. */
  const opened = new Set<number>();
  const onClick = (l: Layer, c: number) => {
    if (c < 0) return l;
    const first = !opened.has(c);
    opened.add(c);
    l.anim = { ...l.anim, type: 'fade', duration: 0.45, delay: 0, trigger: first ? 'onClick' : 'withSlide', step: { set, i: c, mode } } as Anim;
    return l;
  };
  if (spec.rail && rows.length > 1) layers.push(shape('Rail', { x: iconX - 4.5, y: top + rh / 2, w: 9, h: rh * (rows.length - 1), rot: 0 }, { shape: 'rect', fill: dark ? 'rgba(255,255,255,.18)' : '#d9d4ca' }, after(0)));
  rows.forEach((r, i) => {
    const y0 = top + i * rh, cy = y0 + rh / 2, c = clicks[i], rowC = build ? c : -1;
    const box = (x: number, w: number) => ({ x, y: y0 + 6, w: Math.max(80, w), h: rh - 12, rot: 0 });
    if (i) layers.push(onClick(shape('Row rule', { x: 64 * K, y: y0, w: RIGHT - 64 * K, h: 2, rot: 0 }, { shape: 'rect', fill: dark ? 'rgba(255,255,255,.16)' : '#d9d4ca' }, after(0)), rowC));
    layers.push(onClick(createLayer('image', { name: 'Icon', box: { x: iconX - rr, y: cy - rr, w: rr * 2, h: rr * 2, rot: 0 }, params: { src: iconSvg(r, dark), fit: 'contain' }, anim: after(0) }), rowC));
    const nameEnd = r.say && sayX > nameX ? sayX : r.tag ? tagX : textX;
    if (r.name) layers.push(onClick(text('Name', r.name, box(nameX, nameEnd - nameX - 36), { font: st.display, weight: st.displayWeight, size: 26 * K, color: st.ink, valign: 'middle', lineHeight: 1.15, fitGroup: set + '-names' }, after(0)), rowC));
    if (r.say) layers.push(onClick(text('Words', r.say, box(sayX, (r.tag ? tagX : textX) - sayX - 36), { font: st.body, weight: '400', italic: true, size: saySize, color: st.ink, valign: 'middle', lineHeight: 1.3, fitGroup: set + '-say' }, after(0)), rowC));
    // The answer: its tag and words, on the row's click (answers) or with the row (build).
    if (r.tag) layers.push(onClick(text('Tag', r.tag.text, { x: tagX, y: cy - 28, w: tagW, h: 57, rot: 0 }, { font: st.body, weight: '700', size: 22, color: '#ffffff', align: 'center', valign: 'middle', uppercase: true, tracking: 0.08, block: 'fill', blockColor: r.tag.fill, blockRadius: 28, blockPad: 0, fit: 'shrink' }, after(0)), c));
    if (r.text) layers.push(onClick(text('Answer', r.text, box(textX, RIGHT - textX), { font: st.body, weight: '400', size, color: st.ink, valign: 'middle', lineHeight: 1.3, fitGroup: set + '-text' }, after(0)), c));
  });
  // The opening caption, when the list opens on a question before any row (answers): along the foot, gone at the
  // first click. A caption that goes with a row is said by the row itself; the converter puts it in the notes.
  const first = steps[0];
  if (first?.caption && clicks.every((c) => c >= 0) && steps.length > 1) {
    const cap = text('Caption', first.caption, { x: GRID.left, y: foot + 18, w: 1764, h: 52, rot: 0 }, { font: st.body, weight: '500', size: 30, color: st.muted }, after(0));
    cap.anim = { ...cap.anim, exit: { type: 'fade', when: 'next', delay: 0, duration: 0.25 } };
    layers.push(cap);
  }
  return slide(st, 'Revealed list', layers);
}
