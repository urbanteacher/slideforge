// The building blocks every layout is made of: the ground, headings, body copy, cards, rules and pictures.
// Every slide is built from a layout, so the layer kinds are registered from here too: a module built on its
// own (the converter, a test) has them without importing an entry (kinds/index.ts).
import '../kinds';
import { createLayer, createSlide, type Anim, type Box, type Layer, type Params } from '../core';
import { GRID, cell, type LayoutStyle } from './style';

// ─── Building blocks ────────────────────────────────────────────────────────
export const rise: Partial<Anim> = { type: 'rise', duration: 0.8 };
export const after = (delay: number): Partial<Anim> => ({ type: 'fade', duration: 0.7, delay });

/** The slide's ground: flat, or lit from the top right when the theme has a glow. */
export function groundParams(st: Pick<LayoutStyle, 'ground' | 'glow'>): { kind: string; params: Params } {
  return st.glow
    ? { kind: 'radial', params: { colorA: st.glow, colorB: st.ground, cx: 0.8, cy: -0.1, rx: 0.94, ry: 0.83, reach: 0.55 } }
    : { kind: 'solid', params: { color: st.ground } };
}
function ground(st: LayoutStyle): Layer {
  const g = groundParams(st);
  return createLayer(g.kind, { name: 'Ground', params: g.params });
}

/** A statement rises in as one block: the plain entrance every default slide uses. */
const wordsIn: Partial<Anim> = { type: 'rise', duration: 0.8 };
/** A statement: display type as big as the line allows, its breaks balanced. */
export const statement = (st: LayoutStyle, value: string, box: Box, size: number, align: 'left' | 'center') =>
  text('Statement', value, box, { font: st.display, weight: st.displayWeight === '400' ? '400' : '800', size, color: st.ink, align, lineHeight: 1.04, tracking: -0.035, balance: true, fit: 'grow' }, wordsIn);
export const credit = (st: LayoutStyle, value: string, box: Box, align: 'left' | 'center') =>
  text('Credit', value, box, { font: st.body, weight: '500', size: 40, color: st.muted, align, lineHeight: 1.35 }, {});

/** Text that holds its region: set at `size`, brought down only if the copy needs it. */
export function text(name: string, value: string, box: Box, params: Params, anim: Partial<Anim> = {}): Layer {
  return createLayer('text', { name, box, params: { text: value, fit: 'shrink', lineHeight: 1.15, tracking: 0, ...params }, anim });
}
// Sizes follow presentation guidance — titles 36–44pt, body 24pt, nothing under 18pt; on the lab's
// 1920-wide slide a point is two pixels — and the type fills its region: bigger when there are few
// words, smaller when there are many, so a slide uses its page instead of floating small in it.
export const heading = (st: LayoutStyle, value: string, box: Box, size = 88, extra: Params = {}) =>
  text('Heading', value, box, { font: st.display, weight: st.displayWeight, size, color: st.ink, lineHeight: 1.05, tracking: -0.01, fit: 'fill', ...extra }, rise);
export const body = (st: LayoutStyle, value: string, box: Box, size = 48, extra: Params = {}, delay = 0.15) =>
  text('Text', value, box, { font: st.body, weight: '400', size, color: st.muted, lineHeight: 1.3, fit: 'fill', ...extra }, after(delay));
/** A list builds a point per click, the points before it dimmed, so the room reads the one being talked about. */
const pointByPoint: Partial<Anim> = { type: 'fade', duration: 0.6, delay: 0.2, build: 'dim' };
export const bullets = (st: LayoutStyle, lines: string[], box: Box, size = 48) =>
  text('Bullet points', lines.join('\n'), box, { font: st.body, weight: '400', size, color: st.ink, list: 'bullets', lineHeight: 1.45, fit: 'fill' }, pointByPoint);
/** The type and colours the layouts set each kind of thing in, for what Add puts on a slide (ui/insert.ts):
 *  so a heading, a paragraph or a table added by hand reads as one the layouts drew — the same face,
 *  size, colour, spacing and entrance. */
export function itemStyle(st: LayoutStyle) {
  return {
    heading: { params: { font: st.display, weight: st.displayWeight, size: 88, color: st.ink, lineHeight: 1.05, tracking: -0.01 }, anim: rise },
    text: { params: { font: st.body, weight: '400', size: 48, color: st.muted, lineHeight: 1.3, tracking: 0 }, anim: after(0.15) },
    bullets: { params: { font: st.body, weight: '400', size: 48, color: st.ink, lineHeight: 1.45, tracking: 0 }, anim: pointByPoint },
    quote: { params: { ...colours(st), font: st.display, size: 92 }, anim: after(0) },
    note: { params: { ...colours(st), font: st.body, fill: st.panel, size: 40 }, anim: after(0.2) },
    table: { params: { font: st.body, size: 36, textColor: st.ink, accent: st.accent }, anim: after(0.2) },
    chart: { params: { color: st.accent, color2: st.muted, textColor: st.ink, font: st.body, size: 36 }, anim: { type: 'draw' as const, duration: 0.9 } },
    rule: { params: { shape: 'rect', radius: 0, fill: st.muted, strokeWidth: 0 }, anim: after(0.15) },
  };
}

export const bar = (st: LayoutStyle, box: Box) =>
  createLayer('shape', { name: 'Accent bar', box, params: { shape: 'rect', radius: 0, fill: st.accent, strokeWidth: 0 }, anim: { type: 'wipeRight', duration: 0.7 } });
export const item = (kindId: string, name: string, box: Box, params: Params, delay = 0.2) =>
  createLayer(kindId, { name, box, params: { fit: 'shrink', ...params }, anim: after(delay) });
export const colours = (st: LayoutStyle) => ({ textColor: st.ink, accent: st.accent });
export const panel = (st: LayoutStyle, box: Box, name = 'Card') =>
  createLayer('shape', { name, box, params: { shape: 'rect', radius: 18, fill: st.panel, strokeWidth: 0 }, anim: after(0.15) });
export const rule = (st: LayoutStyle, box: Box, colour = st.accent, h = 6) =>
  createLayer('shape', { name: 'Rule', box: { ...box, h }, params: { shape: 'rect', radius: 0, fill: colour, strokeWidth: 0 }, anim: after(0.15) });
export const inset = (b: Box, dx: number, dy: number, h?: number): Box => ({ x: b.x + dx, y: b.y + dy, w: b.w - dx * 2, h: h ?? b.h - dy * 2, rot: 0 });
export const picture = (box: Box, name = 'Picture — drop one here') =>
  createLayer('image', { name, box, params: { src: '', fit: 'cover' }, anim: { type: 'fade', duration: 0.9 } });

export const slide = (st: LayoutStyle, name: string, layers: Layer[]) =>
  createSlide(name, [ground(st), ...layers], st.ground, { type: 'fade', duration: 0.7 });

/** A slide title across the top, where every teaching layout puts it. */
/** A slide title across the top, where every teaching layout puts it: display type, set larger than
 *  anything under it, with a short bar of the accent beneath, so it can never be mistaken for a point. */
export const titleRow = (st: LayoutStyle, value: string) => heading(st, value, cell(1, 1, 12, 2), 88, { fitGroup: 'title' });
export const titleBar = (st: LayoutStyle) => bar(st, { x: GRID.left, y: GRID.top + 2 * GRID.stepY + 6, w: 132, h: 8, rot: 0 });

// ─── Builders: the same layouts for any number of items ─────────────────────
// SlideForge's layouts take as many points, cards or steps as the content has. These lay out a
// title and n items on the grid, so a deck can be written straight into them — and the gallery's
// fixed examples are these with three items each.

export type Pair = [string, string];
/** n rows sharing the content area under a title — row 5 to the foot of the grid — evenly, so a
 *  short list is not three rows of blank under it. At most a quarter of the area each. */
/** The content area under a title: from row 5 to 50px above the footer band, the same breath the
 *  title keeps below the header, so a slide is balanced top and bottom with its header and footer on. */
export const CONTENT_TOP = GRID.top + 4 * GRID.stepY;
export const CONTENT_FOOT = 1014 - 50;
export const rowsFor = (n: number) => {
  const top = CONTENT_TOP, all = CONTENT_FOOT - CONTENT_TOP;
  return { top, h: Math.min(all / Math.max(1, n), all / 4 + 40) };
};
export const colsFor = (n: number) => (n <= 2 ? 6 : n === 3 ? 4 : 3);

export type Triple = [string, string, string];
export const shape = (name: string, box: Box, params: Params, anim: Partial<Anim> = after(0.15)) =>
  createLayer('shape', { name, box, params: { radius: 0, strokeWidth: 0, ...params }, anim });
