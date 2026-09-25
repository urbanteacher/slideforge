import { contentHeight } from '../engine/raster';
import { CARD_PAD, CARD_TOP } from './cards';
import { aspectOf, setAspect } from './aspect';
import { createLayer, createSlide } from './defaults';
import type { Anim, Box, Deck, Layer, Params, Slide, StyleGuide } from './types';
import { resolveGround } from './guide';

// SlideForge's layouts, built out of the lab's own items.
//
// Every box comes from SlideForge's layout grid (src/render/layout-slots.js in the main app): twelve
// columns and sixteen rows inside fixed margins, with each layout naming the region its title, copy,
// picture or chart sits in. The regions here are those regions, scaled from SlideForge's 1280 × 720
// frame to the lab's 1920 × 1080, so a layout built here lands where SlideForge would put it. Copy is
// set to shrink into its region rather than grow past it, which is what keeps a slide on the page
// however much gets written into it.

export const GRID = { left: 78, top: 132, stepX: 151.5, gutter: 54, stepY: 54, cols: 12, rows: 16 };
export type Grid = typeof GRID & { width: number; height: number; right: number; foot: number };

/** The grid for a deck of any shape: margins and gutters scale with the frame's width, rows with
 *  its height, so a 4:3 or 16:10 deck gets the same proportions a 16:9 one does. */
export function gridFor(d: Pick<Deck, 'width' | 'height'> = { width: 1920, height: 1080 }): Grid {
  const kx = d.width / 1920, ky = d.height / 1080;
  const left = GRID.left * kx, gutter = GRID.gutter * kx, top = GRID.top * ky, stepY = GRID.stepY * ky;
  const stepX = (d.width - left * 2 + gutter) / GRID.cols;
  return { left, top, stepX, gutter, stepY, cols: GRID.cols, rows: GRID.rows, width: d.width, height: d.height, right: d.width - left, foot: top + GRID.rows * stepY };
}

/** A region of the grid — column, row, and how many of each it spans — as a box on the slide. */
export function cell(col: number, row: number, cols: number, rows: number, g: Pick<Grid, 'left' | 'top' | 'stepX' | 'gutter' | 'stepY'> = GRID): Box {
  return { x: g.left + (col - 1) * g.stepX, y: g.top + (row - 1) * g.stepY, w: cols * g.stepX - g.gutter, h: rows * g.stepY, rot: 0 };
}

/** A layout for this deck. Layouts are drawn on the 16:9 grid; a deck of another shape gets the
 *  same slide mapped into its frame the way changing the deck's shape maps every other slide. */
export function layoutFor(layout: LayoutDef, st: LayoutStyle, deck: Pick<Deck, 'width' | 'height'>): Slide {
  const slide = layout.make(st);
  if (deck.width === 1920 && deck.height === 1080) return slide;
  const tmp = { id: '', title: '', width: 1920, height: 1080, version: 1, slides: [slide] } as Deck;
  setAspect(tmp, aspectOf(deck));
  return slide;
}

export interface LayoutStyle {
  id: string;
  name: string;
  ground: string;
  ink: string;
  muted: string;
  accent: string;
  panel: string;
  display: string;
  displayWeight: string;
  body: string;
  /** A glow in the ground's top corner, where the theme has one: the ground becomes a Radial gradient. */
  glow?: string;
  /** The theme's second colour, where it has one: the other wash in backdrop motion. */
  accent2?: string;
  /** A face for the biggest moments — a cover's title — where the theme has one. */
  hero?: string;
  /** Other grounds a slide can be set on, each with the text and accent that go on it. */
  grounds?: { id: string; name: string; ground: string; ink: string; muted: string; accent: string }[];
}

export const LAYOUT_STYLES: LayoutStyle[] = [
  { id: 'paper', name: 'Paper', ground: '#f7f4ee', ink: '#1a1a1a', muted: '#5f5a52', accent: '#d94f2b', panel: '#ffffff', display: 'Fraunces', displayWeight: '500', body: 'Inter' },
  { id: 'navy', name: 'Navy', ground: '#0c3354', ink: '#ffffff', muted: '#bccada', accent: '#ef4760', panel: '#154673', display: 'Instrument Serif', displayWeight: '400', body: 'Inter' },
  { id: 'midnight', name: 'Midnight', ground: '#0e0d1c', ink: '#f3f0ff', muted: '#aaa4ca', accent: '#8e7dff', panel: '#1c1a36', display: 'Space Grotesk', displayWeight: '600', body: 'Inter' },
  // SlideForge's Cinematic · Dark pitch: near-black, heavy Avenir Next, a hot pink-red accent.
  { id: 'cinematic', name: 'Cinematic', ground: '#0a0b0f', ink: '#f2f4f8', muted: '#9aa3b5', accent: '#ff3b5c', panel: '#16171d', display: 'Avenir Next', displayWeight: '800', body: 'Avenir Next', glow: '#1a1020', accent2: '#5eead4' },
  { id: 'mono', name: 'Mono', ground: '#ffffff', ink: '#111111', muted: '#5c5c5c', accent: '#111111', panel: '#f1f1f1', display: 'Inter', displayWeight: '700', body: 'Inter' },
];

/** The deck's own style guide as a theme, with the same roles as the built-in ones. */
export function guideStyle(g: StyleGuide): LayoutStyle {
  const t = g.theme;
  return {
    id: 'guide', name: g.name, ground: t.ground, ink: t.ink, muted: t.muted, accent: t.accent, accent2: t.accent2, panel: t.panel, display: t.display, displayWeight: t.displayWeight, body: t.body, hero: t.hero,
    grounds: (g.grounds ?? []).map((gr) => resolveGround(g, gr)),
  };
}

const mixHex = (a: string, b: string, t: number) => '#' + [1, 3, 5].map((i) => {
  const x = parseInt(a.slice(i, i + 2), 16), y = parseInt(b.slice(i, i + 2), 16);
  return Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
}).join('');

/** The theme as one slide wears it: on the ground that slide is set on, its text and accent with it. */
export function slideStyle(st: LayoutStyle, s: Pick<Slide, 'ground'>): LayoutStyle {
  const gr = s.ground ? st.grounds?.find((x) => x.id === s.ground) : undefined;
  if (!gr) return st;
  return { ...st, ground: gr.ground, ink: gr.ink, muted: gr.muted, accent: gr.accent, panel: mixHex(gr.ground, gr.ink, 0.08), glow: undefined };
}

/** The theme a deck is in: a built-in one, or its own style guide. */
export function themeOf(d: Pick<Deck, 'theme' | 'styleGuide'>): LayoutStyle | undefined {
  if (d.theme === 'guide' && d.styleGuide) return guideStyle(d.styleGuide);
  return LAYOUT_STYLES.find((s) => s.id === d.theme);
}

export interface LayoutDef {
  id: string;
  name: string;
  group: 'Introduce' | 'Explain & organise' | 'Show & explore' | 'Infographic';
  blurb: string;
  make: (st: LayoutStyle) => Slide;
}

// ─── Building blocks ────────────────────────────────────────────────────────
const rise: Partial<Anim> = { type: 'rise', duration: 0.8 };
const after = (delay: number): Partial<Anim> => ({ type: 'fade', duration: 0.7, delay });

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

/** SlideForge's statement motion: word by word, each rising out of a blur, Medium and Wave, on Easy Ease. */
const wordsIn: Partial<Anim> = { type: 'words', feel: 'rise', easing: 'easyEase', duration: 0.7, stagger: 0.13 };
/** A statement: display type as big as the line allows, its breaks balanced. */
const statement = (st: LayoutStyle, value: string, box: Box, size: number, align: 'left' | 'center') =>
  text('Statement', value, box, { font: st.display, weight: st.displayWeight === '400' ? '400' : '800', size, color: st.ink, align, lineHeight: 1.04, tracking: -0.035, balance: true, fit: 'grow' }, wordsIn);
const credit = (st: LayoutStyle, value: string, box: Box, align: 'left' | 'center') =>
  text('Credit', value, box, { font: st.body, weight: '500', size: 40, color: st.muted, align, lineHeight: 1.35 }, {});

/** Text that holds its region: set at `size`, brought down only if the copy needs it. */
function text(name: string, value: string, box: Box, params: Params, anim: Partial<Anim> = {}): Layer {
  return createLayer('text', { name, box, params: { text: value, fit: 'shrink', lineHeight: 1.15, tracking: 0, ...params }, anim });
}
// Sizes follow presentation guidance — titles 36–44pt, body 24pt, nothing under 18pt; on the lab's
// 1920-wide slide a point is two pixels — and the type fills its region: bigger when there are few
// words, smaller when there are many, so a slide uses its page instead of floating small in it.
const heading = (st: LayoutStyle, value: string, box: Box, size = 88, extra: Params = {}) =>
  text('Heading', value, box, { font: st.display, weight: st.displayWeight, size, color: st.ink, lineHeight: 1.05, tracking: -0.01, fit: 'fill', ...extra }, rise);
const body = (st: LayoutStyle, value: string, box: Box, size = 48, extra: Params = {}, delay = 0.15) =>
  text('Text', value, box, { font: st.body, weight: '400', size, color: st.muted, lineHeight: 1.3, fit: 'fill', ...extra }, after(delay));
const bullets = (st: LayoutStyle, lines: string[], box: Box, size = 48) =>
  text('Bullet points', lines.join('\n'), box, { font: st.body, weight: '400', size, color: st.ink, list: 'bullets', lineHeight: 1.45, fit: 'fill' }, after(0.2));
const bar = (st: LayoutStyle, box: Box) =>
  createLayer('shape', { name: 'Accent bar', box, params: { shape: 'rect', radius: 0, fill: st.accent, strokeWidth: 0 }, anim: { type: 'wipeRight', duration: 0.7 } });
const item = (kindId: string, name: string, box: Box, params: Params, delay = 0.2) =>
  createLayer(kindId, { name, box, params: { fit: 'shrink', ...params }, anim: after(delay) });
const colours = (st: LayoutStyle) => ({ textColor: st.ink, accent: st.accent });
const panel = (st: LayoutStyle, box: Box, name = 'Card') =>
  createLayer('shape', { name, box, params: { shape: 'rect', radius: 18, fill: st.panel, strokeWidth: 0 }, anim: after(0.15) });
const rule = (st: LayoutStyle, box: Box, colour = st.accent, h = 6) =>
  createLayer('shape', { name: 'Rule', box: { ...box, h }, params: { shape: 'rect', radius: 0, fill: colour, strokeWidth: 0 }, anim: after(0.15) });
const inset = (b: Box, dx: number, dy: number, h?: number): Box => ({ x: b.x + dx, y: b.y + dy, w: b.w - dx * 2, h: h ?? b.h - dy * 2, rot: 0 });
const picture = (box: Box, name = 'Picture — drop one here') =>
  createLayer('image', { name, box, params: { src: '', fit: 'cover' }, anim: { type: 'fade', duration: 0.9 } });

const slide = (st: LayoutStyle, name: string, layers: Layer[]) =>
  createSlide(name, [ground(st), ...layers], st.ground, { type: 'fade', duration: 0.7 });

/** A slide title across the top, where every teaching layout puts it. */
/** A slide title across the top, where every teaching layout puts it: display type, set larger than
 *  anything under it, with a short bar of the accent beneath, so it can never be mistaken for a point. */
const titleRow = (st: LayoutStyle, value: string) => heading(st, value, cell(1, 1, 12, 2), 88, { fitGroup: 'title' });
const titleBar = (st: LayoutStyle) => bar(st, { x: GRID.left, y: GRID.top + 2 * GRID.stepY + 6, w: 132, h: 8, rot: 0 });

// ─── The layouts ────────────────────────────────────────────────────────────
// ─── The slide system ───────────────────────────────────────────────────────
// Every layout below is built on the same rules, so slides made from them never disagree:
//   type     titles 88px (44pt), body 48px (24pt), labels 44px, nothing drawn under 36px (18pt);
//            text fills its region, and a set (points, cards, rows) shares one size
//   title    display type across the top with a short accent bar under it
//   content  from CONTENT_TOP to CONTENT_FOOT — 50px above the footer, the same breath the title
//            keeps below the header — shared evenly by rows, or centred when it is shorter
//   sets     cards share a bottom edge and grow with their words; rules sit under each row
// A slide designed on its own (a statement, a cover) may break these on purpose; nothing else should.

// ─── Builders: the same layouts for any number of items ─────────────────────
// SlideForge's layouts take as many points, cards or steps as the content has. These lay out a
// title and n items on the grid, so a deck can be written straight into them — and the gallery's
// fixed examples are these with three items each.

type Pair = [string, string];
/** n rows sharing the content area under a title — row 5 to the foot of the grid — evenly, so a
 *  short list is not three rows of blank under it. At most a quarter of the area each. */
/** The content area under a title: from row 5 to 50px above the footer band, the same breath the
 *  title keeps below the header, so a slide is balanced top and bottom with its header and footer on. */
export const CONTENT_TOP = GRID.top + 4 * GRID.stepY;
export const CONTENT_FOOT = 1014 - 50;
const rowsFor = (n: number) => {
  const top = CONTENT_TOP, all = CONTENT_FOOT - CONTENT_TOP;
  return { top, h: Math.min(all / Math.max(1, n), all / 4 + 40) };
};
const colsFor = (n: number) => (n <= 2 ? 6 : n === 3 ? 4 : 3);

export function titleSlide(st: LayoutStyle, title: string, subtitle: string): Slide {
  return slide(st, 'Title', [
    bar(st, { ...cell(1, 3, 2, 1), h: 8 }),
    text('Hero', title, cell(1, 5, 10, 6), { font: st.hero ?? st.display, weight: st.hero ? '500' : st.displayWeight, size: 150, color: st.ink, lineHeight: 1.02, tracking: -0.01, fit: 'fill' }, rise),
    body(st, subtitle, cell(1, 12, 9, 2), 48),
  ]);
}

export function sectionSlide(st: LayoutStyle, title: string, subtitle: string): Slide {
  return slide(st, 'Section', [
    heading(st, title, cell(1, 4, 12, 5), 140, { align: 'center' }),
    body(st, subtitle, cell(3, 10, 8, 2), 48, { align: 'center' }),
    bar(st, { ...cell(6, 13, 2, 1), h: 8 }),
  ]);
}

/** A title and two-part rows: the point in bold, the detail beside it. Up to six fit. */
export function pointsSlide(st: LayoutStyle, title: string, items: Pair[]): Slide {
  const shown = items.slice(0, 6);
  const { top, h } = rowsFor(shown.length);
  return slide(st, 'Points', [
    titleRow(st, title),
    titleBar(st),
    ...shown.flatMap(([term, detail], i) => {
      const y = top + i * h;
      return [
        text('Point', term, { ...cell(1, 5, 4, 1), y, h: h - 28 }, { font: st.body, weight: '600', size: 44, color: st.accent, fit: 'fill', lineHeight: 1.15, fitGroup: 'points' }, after(0.1 + i * 0.08)),
        body(st, detail, { ...cell(5, 5, 8, 1), y, h: h - 28 }, 48, { color: st.ink, fit: 'fill', fitGroup: 'details' }, 0.15 + i * 0.08),
        rule(st, { ...cell(1, 5, 12, 1), y: y + h - 14 }, st.muted, 2),
      ];
    }),
  ]);
}

/**
 * A title and two to four cards across, each a heading and a sentence. The cards are as tall as the
 * fullest one needs and no taller, so they share a bottom edge without a well of empty panel under
 * short copy. Type starts at 24pt and steps down, never under 18pt, only when the fullest card
 * would not fit on the slide.
 */
export function cardsSlide(st: LayoutStyle, title: string, items: Pair[]): Slide {
  const n = Math.max(1, Math.min(4, items.length)), span = colsFor(n);
  const shown = items.slice(0, 4);
  const room = { ...cell(1, 5, span, 11), h: CONTENT_FOOT - CONTENT_TOP };
  const textW = room.w - 72, top = CARD_TOP, pad = CARD_PAD;
  const tallest = (px: number) => Math.max(...shown.map(([, words]) => contentHeight({ kind: 'text', params: { text: words, font: st.body, size: px, weight: '400', lineHeight: 1.3 } }, textW) ?? 0));
  let px = 48;
  while (px > 36 && top + tallest(px) + pad > room.h) px -= 2;
  const cardH = Math.min(room.h, Math.ceil(top + tallest(px) + pad));
  // One id for the set, so editing any card's words resizes all of them together (model/cards.ts).
  const set = 'cards-' + Math.random().toString(36).slice(2, 9);
  return slide(st, 'Cards', [
    titleRow(st, title),
    titleBar(st),
    ...shown.flatMap(([head, words], i) => {
      // Centred between the title and the footer, so short cards are not hung from the top.
      const b = { ...cell(1 + i * span, 5, span, 11), y: CONTENT_TOP + Math.round((room.h - cardH) / 2), h: cardH };
      const card = panel(st, b);
      Object.assign(card.params, { cardSet: set, cardPart: 'panel', cardArea: [CONTENT_TOP, CONTENT_FOOT] });
      const bar = rule(st, { ...b, h: 8 });
      Object.assign(bar.params, { cardSet: set, cardPart: 'rule' });
      return [
        card,
        bar,
        heading(st, head, inset(b, 36, 50, 80), 56, { fit: 'fill', fitGroup: 'card-heads', cardSet: set, cardPart: 'head' }),
        body(st, words, { x: b.x + 36, y: b.y + top, w: textW, h: cardH - top - pad, rot: 0 }, px, { fit: 'shrink', color: st.ink, fitGroup: 'card-words', cardSet: set, cardPart: 'words' }, 0.25 + i * 0.08),
      ];
    }),
  ]);
}

/** Terms and what they mean, one row each. Up to six fit. */
export function keywordsSlide(st: LayoutStyle, title: string, pairs: Pair[]): Slide {
  const shown = pairs.slice(0, 6);
  const { top, h } = rowsFor(shown.length);
  return slide(st, 'Keywords', [
    titleRow(st, title),
    titleBar(st),
    ...shown.flatMap(([term, def], i) => {
      const y = top + i * h;
      return [
        text('Keyword', term, { ...cell(1, 5, 4, 1), y, h: h - 28 }, { font: st.body, weight: '700', size: 44, color: st.accent, fit: 'fill', fitGroup: 'terms' }, after(0.15)),
        body(st, def, { ...cell(5, 5, 8, 1), y, h: h - 28 }, 44, { color: st.ink, fit: 'fill', fitGroup: 'meanings' }),
        rule(st, { ...cell(1, 5, 12, 1), y: y + h - 14 }, st.muted, 2),
      ];
    }),
  ]);
}

/** One figure set large, what it counts, and the lines that make it matter. */
export function keyfactSlide(st: LayoutStyle, title: string, fact: string, caption: string, lines: string[]): Slide {
  return slide(st, 'Key fact', [
    heading(st, title, cell(1, 1, 12, 2), 56),
    text('Key fact', fact, cell(1, 4, 12, 4), { font: st.display, weight: '700', size: 190, color: st.accent, lineHeight: 1, tracking: -0.03, fit: 'fill' }, { type: 'zoomIn', duration: 0.9, easing: 'backOut', delay: 0.2 }),
    body(st, caption, { ...cell(1, 9, 12, 2), h: 90 }, 48, { color: st.ink }),
    bullets(st, lines, cell(1, 11, 12, 5), 40),
  ]);
}

/** A title and a table, for when the exact value matters. */
export function tableSlide(st: LayoutStyle, title: string, data: string): Slide {
  return slide(st, 'Table', [
    titleRow(st, title),
    titleBar(st),
    createLayer('table', { name: 'Table', box: cell(1, 5, 12, 11), params: { data, header: true, labels: true, font: st.body, size: 36, textColor: st.ink, accent: st.accent, fit: 'fill' }, anim: after(0.2) }),
  ]);
}

/** A process in order: numbered stops along a line, each a step and a sentence. Up to six. */
export function journeySlide(st: LayoutStyle, title: string, subtitle: string, steps: Pair[]): Slide {
  const n = Math.max(2, Math.min(6, steps.length)), span = 12 / n;
  const g = GRID, col = (i: number) => g.left + i * span * g.stepX;
  const w = span * g.stepX - g.gutter, dot = 88, y = g.top + 5 * g.stepY;
  const cx = (i: number) => col(i) + dot / 2;
  const layers: Layer[] = [titleRow(st, title), titleBar(st)];
  if (subtitle) layers.push(body(st, subtitle, { ...cell(1, 3, 12, 1), y: GRID.top + 2 * GRID.stepY + 34 }, 40));
  layers.push(createLayer('shape', { name: 'Track', box: { x: cx(0), y: y + dot / 2 - 2, w: cx(n - 1) - cx(0), h: 4, rot: 0 }, params: { shape: 'rect', radius: 0, fill: st.muted, strokeWidth: 0 }, anim: { type: 'wipeRight', duration: 0.9 } }));
  steps.slice(0, 6).forEach(([head, words], i) => {
    const a = after(0.2 + i * 0.12);
    layers.push(
      createLayer('shape', { name: 'Stop', box: { x: col(i), y, w: dot, h: dot, rot: 0 }, params: { shape: 'ellipse', fill: st.accent, strokeWidth: 0 }, anim: a }),
      text('Number', String(i + 1), { x: col(i), y: y + dot * 0.18, w: dot, h: dot * 0.64, rot: 0 }, { font: st.display, weight: '700', size: 44, color: st.ground, align: 'center', lineHeight: 1 }, a),
      text('Step', head, { x: col(i), y: y + dot + 34, w, h: 60, rot: 0 }, { font: st.body, weight: '700', size: 40, color: st.ink, fit: 'fill', fitGroup: 'steps' }, a),
      body(st, words, { x: col(i), y: y + dot + 110, w, h: 330, rot: 0 }, 36, { fit: 'shrink', color: st.muted, fitGroup: 'step-words' }, 0.3 + i * 0.12),
    );
  });
  return slide(st, 'Journey', layers);
}

/** A title and a bulleted list, filling the content area. */
export function bulletsSlide(st: LayoutStyle, title: string, lines: string[]): Slide {
  return slide(st, 'Bullets', [
    titleRow(st, title),
    titleBar(st),
    bullets(st, lines, { ...cell(1, 5, 12, 1), h: CONTENT_FOOT - CONTENT_TOP }, 52),
  ]);
}

/** A class activity's timed stages as the lab's Activity card, set large on the slide: its title, a
 *  step per line ("Think on your own · 1 min"), and the minutes added up — SlideForge's stages track. */
export function activitySlide(st: LayoutStyle, title: string, steps: string[], label = 'Activity'): Slide {
  return slide(st, 'Activity', [
    createLayer('activity', { name: 'Activity', box: { x: 200, y: 140, w: 1520, h: 800, rot: 0 },
      params: { title, steps: steps.join('\n'), label, font: st.body, fill: st.panel, textColor: st.ink, accent: st.accent }, anim: rise }),
  ]);
}

/** One question of a game as the lab's Quiz card: its label (the game and the question's number),
 *  the question, and its options. The room answers it in SlideForge's live session. */
export function questionSlide(st: LayoutStyle, label: string, question: string, options: string[]): Slide {
  return slide(st, 'Question', [
    createLayer('quiz', { name: 'Question', box: { x: 200, y: 150, w: 1520, h: 780, rot: 0 },
      params: { label, question, options: options.slice(0, 6).join('\n'), font: st.body, fill: st.panel, textColor: st.ink, accent: st.accent }, anim: rise }),
  ]);
}

/** A title, a chart in the content area, and a source line along its foot. */
export function chartSlide(st: LayoutStyle, title: string, source: string): Slide {
  return slide(st, 'Chart', [
    titleRow(st, title),
    titleBar(st),
    // The chart draws itself, SlideForge's chart motion: bars rise, lines draw along, a beat at a time.
    createLayer('chart', { name: 'Chart', box: { ...cell(1, 5, 12, 1), h: CONTENT_FOOT - CONTENT_TOP - 60 }, params: { color: st.accent, color2: st.muted, textColor: st.ink, font: st.body, size: 36 }, anim: { type: 'draw', duration: 0.9, stagger: 0.22, delay: 0.3, easing: 'cubicOut' } }),
    text('Source', source, { ...cell(1, 5, 12, 1), y: CONTENT_FOOT - 44, h: 44 }, { font: st.body, size: 36, color: st.muted, fit: 'shrink' }, after(0.4)),
  ]);
}

/** Two to four numbers set large, each with what it counts, and a takeaway beneath. */
export function statsSlide(st: LayoutStyle, title: string, stats: Pair[], takeaway: string): Slide {
  const n = Math.max(2, Math.min(4, stats.length)), span = 12 / n;
  const top = CONTENT_TOP, noteH = takeaway ? 150 : 0, area = CONTENT_FOOT - CONTENT_TOP - noteH - (takeaway ? 40 : 0);
  return slide(st, 'Stats', [
    titleRow(st, title),
    titleBar(st),
    ...stats.slice(0, 4).flatMap(([num, label], i) => {
      const b = { ...cell(1 + i * span, 5, span, 1), y: top, h: area };
      return [
        rule(st, b),
        text('Number', num, inset(b, 0, 36, 190), { font: st.display, weight: '700', size: 170, color: st.accent, lineHeight: 1, tracking: -0.02, fit: 'fill', fitGroup: 'stat-numbers' }, { type: 'zoomIn', duration: 0.8, easing: 'backOut' }),
        body(st, label, inset(b, 0, 250, area - 260), 44, { color: st.ink, fitGroup: 'stat-labels' }),
      ];
    }),
    ...(takeaway ? [item('note', 'Takeaway', { ...cell(1, 5, 12, 1), y: CONTENT_FOOT - noteH, h: noteH }, { ...colours(st), font: st.body, label: 'Takeaway', text: takeaway, fill: st.panel, size: 40 }, 0.5)] : []),
  ]);
}

/** Two columns compared row by row, under a header naming each. */
export function compareSlide(st: LayoutStyle, title: string, heads: [string, string], rows: [string, string, string][]): Slide {
  const headH = 64;
  const { h } = rowsFor(rows.length);
  const top = CONTENT_TOP + headH + 16, each = Math.min(h, (CONTENT_FOOT - top) / Math.max(1, rows.length));
  return slide(st, 'Compare', [
    titleRow(st, title),
    titleBar(st),
    text('Column', heads[0], { ...cell(4, 5, 4, 1), y: CONTENT_TOP, h: headH }, { font: st.body, weight: '700', size: 36, color: st.accent, tracking: 0.08, uppercase: true, fit: 'shrink' }, after(0.1)),
    text('Column', heads[1], { ...cell(8, 5, 5, 1), y: CONTENT_TOP, h: headH }, { font: st.body, weight: '700', size: 36, color: st.accent, tracking: 0.08, uppercase: true, fit: 'shrink' }, after(0.1)),
    rule(st, { ...cell(1, 5, 12, 1), y: CONTENT_TOP + headH }, st.accent, 3),
    ...rows.flatMap(([row, a, b], i) => {
      const y = top + i * each;
      return [
        text('Row', row, { ...cell(1, 5, 3, 1), y, h: each - 28 }, { font: st.body, weight: '600', size: 44, color: st.accent, fit: 'fill', fitGroup: 'compare-rows' }, after(0.15)),
        body(st, a, { ...cell(4, 5, 4, 1), y, h: each - 28 }, 44, { color: st.ink, fitGroup: 'compare-cells' }),
        body(st, b, { ...cell(8, 5, 5, 1), y, h: each - 28 }, 44, { color: st.ink, fitGroup: 'compare-cells' }),
        rule(st, { ...cell(1, 5, 12, 1), y: y + each - 14 }, st.muted, 2),
      ];
    }),
  ]);
}

/** Text on one half, a picture on the other: the heading and points in the half's own content area. */
export function splitSlide(st: LayoutStyle, title: string, lines: string[], pictureSide: 'left' | 'right'): Slide {
  const col = pictureSide === 'right' ? 1 : 8;
  return slide(st, pictureSide === 'right' ? 'Image + text' : 'Text + image', [
    picture({ x: pictureSide === 'right' ? 960 : 0, y: 0, w: 960, h: 1080, rot: 0 }),
    heading(st, title, { ...cell(col, 1, 5, 3) }, 88),
    bar(st, { x: cell(col, 1, 5, 1).x, y: GRID.top + 3 * GRID.stepY + 6, w: 132, h: 8, rot: 0 }),
    bullets(st, lines, { ...cell(col, 5, 5, 1), h: CONTENT_FOOT - CONTENT_TOP }, 48),
  ]);
}

// ─── Builders: the richer layouts (timeline, funnel, mind map, people…) ─────
type Triple = [string, string, string];
const shape = (name: string, box: Box, params: Params, anim: Partial<Anim> = after(0.15)) =>
  createLayer('shape', { name, box, params: { radius: 0, strokeWidth: 0, ...params }, anim });

/** Who is at the front: a portrait on the left, the name large, the role and a short paragraph. */
export function introductionSlide(st: LayoutStyle, name: string, role: string, bio: string): Slide {
  return slide(st, 'Introduction', [
    picture({ ...cell(1, 1, 4, 16), y: GRID.top - 24, h: CONTENT_FOOT - GRID.top + 24 }, 'Portrait — drop a photo here'),
    heading(st, name, cell(6, 3, 7, 3), 110),
    text('Role', role, cell(6, 6, 7, 1), { font: st.body, weight: '600', size: 44, color: st.accent, fit: 'fill' }, after(0.2)),
    titleBar(st),
    body(st, bio, { ...cell(6, 8, 7, 1), h: CONTENT_FOOT - (GRID.top + 7 * GRID.stepY) }, 48, { color: st.ink }, 0.3),
  ].map((l) => (l.name === 'Accent bar' ? { ...l, box: { ...l.box!, x: cell(6, 1, 1, 1).x, y: GRID.top + 6 * GRID.stepY + 12 } } : l)));
}

/** Dated events along a rail: the date above each stop, the event and a line of detail below. Up to eight. */
export function timelineSlide(st: LayoutStyle, title: string, subtitle: string, events: Triple[]): Slide {
  const n = Math.max(2, Math.min(8, events.length));
  const left = GRID.left, right = 1920 - GRID.left, gap = (right - left) / n;
  const rail = CONTENT_TOP + 150, dot = 34;
  const layers: Layer[] = [titleRow(st, title), titleBar(st)];
  if (subtitle) layers.push(body(st, subtitle, { ...cell(1, 3, 12, 1), y: GRID.top + 2 * GRID.stepY + 34 }, 40));
  layers.push(shape('Rail', { x: left, y: rail - 2, w: right - left, h: 4, rot: 0 }, { shape: 'rect', fill: st.muted }, { type: 'wipeRight', duration: 1 }));
  events.slice(0, 8).forEach(([date, what, detail], i) => {
    const x = left + i * gap, w = gap - 36, a = after(0.2 + i * 0.1);
    layers.push(
      text('Date', date, { x, y: rail - 120, w, h: 90, rot: 0 }, { font: st.display, weight: '700', size: 64, color: st.accent, lineHeight: 1, fit: 'fill', fitGroup: 'dates' }, a),
      shape('Stop', { x, y: rail - dot / 2, w: dot, h: dot, rot: 0 }, { shape: 'ellipse', fill: st.accent }, a),
      text('Event', what, { x, y: rail + 40, w, h: 70, rot: 0 }, { font: st.body, weight: '700', size: 40, color: st.ink, fit: 'fill', fitGroup: 'events' }, a),
      body(st, detail, { x, y: rail + 120, w, h: CONTENT_FOOT - rail - 120, rot: 0 }, 36, { color: st.muted, fit: 'shrink', fitGroup: 'event-notes' }, 0.3 + i * 0.1),
    );
  });
  return slide(st, 'Timeline', layers);
}

/** Stages that narrow. With numbers the bands follow them, so a cliff draws as a cliff; without,
 *  they narrow evenly. The stage and a note sit beside each band. */
export function funnelSlide(st: LayoutStyle, title: string, subtitle: string, stages: Triple[]): Slide {
  const shown = stages.slice(0, 6);
  const nums = shown.map(([, v]) => parseFloat(String(v).replace(/[^0-9.]/g, '')));
  const numeric = nums.every((v) => Number.isFinite(v) && v > 0);
  const max = numeric ? Math.max(...nums) : 1;
  const top = CONTENT_TOP + (subtitle ? 30 : 0), each = (CONTENT_FOOT - top) / shown.length;
  const bandMax = 900, cx = GRID.left + bandMax / 2;
  const layers: Layer[] = [titleRow(st, title), titleBar(st)];
  if (subtitle) layers.push(body(st, subtitle, { ...cell(1, 3, 12, 1), y: GRID.top + 2 * GRID.stepY + 34 }, 40));
  shown.forEach(([stage, value, note], i) => {
    // Widths follow the values on a square-root scale, so a band of 1 is still visible beside 1,200.
    const k = numeric ? Math.max(0.16, Math.sqrt(nums[i] / max)) : 1 - (i / shown.length) * 0.75;
    const w = bandMax * k, y = top + i * each, h = each - 16, a = after(0.2 + i * 0.12);
    layers.push(
      shape('Band', { x: cx - w / 2, y, w, h, rot: 0 }, { shape: 'rect', radius: 10, fill: st.accent, fillOpacity: 1 - i * (0.55 / shown.length) }, a),
      text('Value', value, { x: cx - w / 2, y: y + h * 0.18, w, h: h * 0.64, rot: 0 }, { font: st.display, weight: '700', size: 56, color: st.ground, align: 'center', lineHeight: 1, fit: 'fill', fitGroup: 'values' }, a),
      text('Stage', stage, { x: GRID.left + bandMax + 60, y: y + 6, w: 1920 - GRID.left * 2 - bandMax - 60, h: h * 0.5, rot: 0 }, { font: st.body, weight: '700', size: 44, color: st.ink, fit: 'fill', fitGroup: 'stages' }, a),
      body(st, note, { x: GRID.left + bandMax + 60, y: y + h * 0.5 + 6, w: 1920 - GRID.left * 2 - bandMax - 60, h: h * 0.5 - 6, rot: 0 }, 36, { color: st.muted, fit: 'shrink', fitGroup: 'stage-notes' }, 0.3 + i * 0.12),
    );
  });
  return slide(st, 'Funnel', layers);
}

/**
 * Siblings with no order around the idea they belong to — SlideForge's mind map: the idea in an
 * outlined oval in the middle, the branches in outlined cards alternating left and right, each joined
 * to the oval by a curve that leaves and arrives level. The branches arrive one per click, the earlier
 * ones dimming, so the room follows the one being talked about.
 */
export function mindmapSlide(st: LayoutStyle, title: string, items: Pair[]): Slide {
  const shown = items.slice(0, 8), n = shown.length, rows = Math.max(1, Math.ceil(n / 2));
  const L = GRID.left, W = 1920 - GRID.left * 2, top = GRID.top, H = CONTENT_FOOT - GRID.top;
  const cx = 960, cy = top + H / 2;
  const hubW = W * 0.27, hubH = Math.max(255, Math.min(320, H * 0.34));
  const nodeW = W * 0.29, nodeH = Math.min(230, H / rows - 36);
  const set = 'mind-' + Math.random().toString(36).slice(2, 9);
  const layers: Layer[] = [
    shape('Centre', { x: cx - hubW / 2, y: cy - hubH / 2, w: hubW, h: hubH, rot: 0 }, { shape: 'ellipse', fill: st.ground, stroke: st.accent, strokeWidth: 6 }, { type: 'zoomIn', duration: 0.7, easing: 'backOut' }),
    text('Heading', title, { x: cx - hubW / 2 + hubW * 0.14, y: cy - hubH * 0.3, w: hubW * 0.72, h: hubH * 0.6, rot: 0 }, { font: st.display, weight: st.displayWeight, size: 54, color: st.ink, align: 'center', lineHeight: 1.12, fit: 'fill' }, rise),
  ];
  shown.forEach(([head, words], i) => {
    const left = i % 2 === 0, y = top + (Math.floor(i / 2) + 0.5) * (H / rows);
    const nx = L + (left ? 0.17 : 0.83) * W, bx = nx - nodeW / 2, by = y - nodeH / 2;
    // The curve runs from the card's inner edge to the tip of the oval on the same side.
    const x1 = left ? bx + nodeW : cx + hubW / 2, x2 = left ? cx - hubW / 2 : bx;
    const y1 = left ? y : cy, y2 = left ? cy : y;
    const flat = Math.abs(y1 - y2) < 2;
    const curve = shape('Branch line', { x: x1, y: Math.min(y1, y2) - (flat ? 3 : 0), w: x2 - x1, h: flat ? 6 : Math.abs(y2 - y1), rot: 0 },
      { shape: 'curve', rise: y1 < y2 ? 'down' : 'up', fill: st.accent, strokeWidth: 5 }, {});
    curve.opacity = 0.55;
    const card = shape('Node', { x: bx, y: by, w: nodeW, h: nodeH, rot: 0 }, { shape: 'rect', radius: 32, fill: st.ground, stroke: st.accent, strokeWidth: 3 }, {});
    const headH = Math.min(62, nodeH * 0.32);
    const term = text('Branch', head, { x: bx + 30, y: by + 24, w: nodeW - 60, h: headH, rot: 0 }, { font: st.body, weight: '700', size: 44, color: st.ink, fit: 'fill', fitGroup: 'branches' }, {});
    const detail = body(st, words, { x: bx + 30, y: by + 24 + headH + 10, w: nodeW - 60, h: nodeH - headH - 56, rot: 0 }, 36, { color: st.muted, fit: 'shrink', fitGroup: 'branch-words' }, 0);
    // One branch per click, its curve and card together; the ones before it dim.
    [curve, card, term, detail].forEach((l, j) => {
      l.anim = { ...l.anim, type: 'fade', duration: 0.6, delay: 0, trigger: j === 0 ? 'onClick' : 'withSlide', step: { set, i, mode: 'dim' } };
    });
    layers.push(curve, card, term, detail);
  });
  return slide(st, 'Mind map', layers);
}

/**
 * A team, and who reports to whom — SlideForge's people layout. Each person is an outlined card with an
 * initials disc (a placeholder that says who is missing), their name and a dimmer role; each team sits
 * centred under its manager, joined by elbow connectors: a stem down, a rail across, a drop to each.
 * Reports-to is a name, so reordering lines cannot reassign anyone. With no reporting lines the people
 * are a row of equals with no connectors — a line between people who do not report to each other says
 * something untrue — and so is a cycle, which would otherwise leave nobody at the top.
 */
export function orgchartSlide(st: LayoutStyle, title: string, people: Triple[]): Slide {
  const names = new Set(people.map((p) => p[0]));
  const boss = (p: Triple) => (p[2] && p[2] !== p[0] && names.has(p[2]) ? p[2] : '');
  const kids = new Map<string, Triple[]>();
  for (const p of people) { const b = boss(p); if (b) (kids.get(b) ?? kids.set(b, []).get(b)!).push(p); }
  let roots = people.filter((p) => !boss(p));
  const flat = !roots.length || roots.length === people.length;
  if (!roots.length) roots = people;
  const depthOf = (p: Triple, d = 0): number => (flat || d > 6 ? 0 : Math.max(0, ...(kids.get(p[0]) ?? []).map((k) => 1 + depthOf(k, d + 1))));
  const levels = flat ? 1 : 1 + Math.max(...roots.map((r) => depthOf(r)));
  const leaves = (p: Triple, d = 0): number => (flat || d > 6 ? 1 : (kids.get(p[0]) ?? []).reduce((n, k) => n + leaves(k, d + 1), 0) || 1);
  const across = roots.reduce((n, r) => n + leaves(r), 0);
  const gapX = 40, avail = 1920 - GRID.left * 2;
  const cardW = Math.min(480, (avail - (across - 1) * gapX) / across);
  const top = CONTENT_TOP, H = CONTENT_FOOT - top;
  const cardH = Math.min(150, (H - (levels - 1) * 70) / levels), gapY = levels > 1 ? Math.min(110, (H - levels * cardH) / (levels - 1)) : 0;
  const blockH = levels * cardH + (levels - 1) * gapY, y0 = top + (H - blockH) / 2;
  const layers: Layer[] = [titleRow(st, title), titleBar(st)];
  const cards: Layer[] = [];
  const line = (x: number, y: number, w: number, h: number) => { const l = shape('Connector', { x, y, w: Math.max(3, w), h: Math.max(3, h), rot: 0 }, { shape: 'rect', fill: st.ink }, after(0.15)); l.opacity = 0.38; layers.push(l); };
  let order = 0;
  // Place a person over the span their team needs; return their centre x.
  const place = (p: Triple, left: number, depth: number, guard = 0): number => {
    const team = flat || guard > 6 ? [] : kids.get(p[0]) ?? [];
    const span = leaves(p) * cardW + (leaves(p) - 1) * gapX;
    let cx = left + span / 2;
    const y = y0 + depth * (cardH + gapY);
    if (team.length) {
      let x = left;
      const centres = team.map((k) => { const c = place(k, x, depth + 1, guard + 1); x += leaves(k) * (cardW + gapX); return c; });
      cx = (centres[0] + centres[centres.length - 1]) / 2;
      const railY = y + cardH + gapY / 2;
      line(cx - 1.5, y + cardH, 3, gapY / 2);
      if (centres.length > 1) line(centres[0], railY - 1.5, centres[centres.length - 1] - centres[0], 3);
      for (const c of centres) line(c - 1.5, railY, 3, gapY / 2);
    }
    const x = cx - cardW / 2, a = after(0.2 + order++ * 0.06);
    const disc = Math.min(cardH - 36, 84);
    const initials = p[0].split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
    cards.push(
      shape('Person', { x, y, w: cardW, h: cardH, rot: 0 }, { shape: 'rect', radius: 20, fill: st.panel, stroke: st.ink, strokeWidth: 3 }, a),
      shape('Photo', { x: x + 18, y: y + (cardH - disc) / 2, w: disc, h: disc, rot: 0 }, { shape: 'ellipse', fill: st.ink }, a),
      text('Initials', initials, { x: x + 18 + disc * 0.14, y: y + (cardH - disc) / 2 + disc * 0.28, w: disc * 0.72, h: disc * 0.44, rot: 0 }, { font: st.body, weight: '800', size: Math.round(disc * 0.34), color: st.ground, align: 'center', lineHeight: 1, tracking: 0.02, fit: 'shrink' }, a),
      text('Name', p[0], { x: x + disc + 38, y: y + cardH * 0.16, w: cardW - disc - 56, h: cardH * 0.36, rot: 0 }, { font: st.body, weight: '700', size: 40, color: st.ink, fit: 'fill', fitGroup: 'names' }, a),
      text('Role', p[1], { x: x + disc + 38, y: y + cardH * 0.54, w: cardW - disc - 56, h: cardH * 0.3, rot: 0 }, { font: st.body, weight: '400', size: 36, color: st.muted, fit: 'fill', fitGroup: 'roles' }, a),
    );
    return cx;
  };
  const total = across * cardW + (across - 1) * gapX;
  let left = 960 - total / 2;
  for (const r of roots) { place(r, left, 0); left += leaves(r) * (cardW + gapX); }
  layers.push(...cards);
  return slide(st, 'People', layers);
}

/** Parallel ideas in columns, each numbered: for points that stand side by side, not in sequence. */
export function columnsSlide(st: LayoutStyle, title: string, points: string[]): Slide {
  const n = Math.max(2, Math.min(4, points.length)), span = 12 / n;
  return slide(st, 'Columns', [
    titleRow(st, title),
    titleBar(st),
    ...points.slice(0, 4).flatMap((pt, i) => {
      const b = { ...cell(1 + i * span, 5, span, 1), y: CONTENT_TOP, h: CONTENT_FOOT - CONTENT_TOP };
      return [
        rule(st, { ...b, h: 4 }, st.accent, 4),
        text('Number', String(i + 1).padStart(2, '0'), { ...b, y: b.y + 30, h: 130 }, { font: st.display, weight: '700', size: 110, color: st.accent, lineHeight: 1, fit: 'fill', fitGroup: 'numbers' }, after(0.15 + i * 0.1)),
        body(st, pt, { ...b, y: b.y + 190, h: b.h - 190 }, 52, { color: st.ink, fitGroup: 'column-words' }, 0.25 + i * 0.1),
      ];
    }),
  ]);
}

/** A side heading: the claim held on the left, the points it rests on beside it. */
export function railSlide(st: LayoutStyle, title: string, points: string[], build?: 'on' | 'dim' | 'spot'): Slide {
  const shown = points.slice(0, 6);
  const top = GRID.top, foot = CONTENT_FOOT, each = (foot - top) / shown.length;
  const s = slide(st, 'Rail', [
    shape('Rail', { x: 0, y: 0, w: cell(1, 1, 5, 1).x + cell(1, 1, 5, 1).w + 40, h: 1080, rot: 0 }, { shape: 'rect', fill: st.panel }, { type: 'fade', duration: 0.6 }),
    heading(st, title, { ...cell(1, 4, 5, 1), h: 8 * GRID.stepY }, 100),
    bar(st, { x: GRID.left, y: GRID.top + 3 * GRID.stepY - 30, w: 132, h: 8, rot: 0 }),
    ...shown.flatMap((pt, i) => {
      const y = top + i * each;
      return [
        text('Number', String(i + 1), { ...cell(7, 1, 1, 1), y, h: each - 30 }, { font: st.display, weight: '700', size: 72, color: st.accent, lineHeight: 1, fit: 'fill', fitGroup: 'numbers' }, after(0.2 + i * 0.1)),
        body(st, pt, { ...cell(8, 1, 5, 1), y, h: each - 30 }, 52, { color: st.ink, fitGroup: 'rail-points' }, 0.25 + i * 0.1),
        rule(st, { ...cell(7, 1, 6, 1), y: y + each - 14 }, st.muted, 2),
      ];
    }),
  ]);
  // Built a point per press: its number, words and rule together; earlier points dim or spotlit.
  if (build) {
    const rows = s.layers.filter((l) => ['Number', 'Text', 'Rule'].includes(l.name) && l.box!.y >= top - 1);
    shown.forEach((_, i) => rows.slice(i * 3, i * 3 + 3).forEach((l, j) => {
      l.anim = { ...l.anim, type: 'fade', duration: 0.5, delay: 0, trigger: j === 0 ? 'onClick' : 'withSlide', step: { set: 'rail', i, mode: build } };
    }));
  }
  return s;
}

/** A cover with a side panel of the loud colour: the title on the working ground, a mark on the panel. */
export function sidecarTitleSlide(st: LayoutStyle, title: string, subtitle: string, mark?: string): Slide {
  const panelX = 1920 * 0.64;
  const layers: Layer[] = [
    shape('Side panel', { x: panelX, y: 0, w: 1920 - panelX, h: 1080, rot: 0 }, { shape: 'rect', fill: st.accent }, { type: 'slideLeft', duration: 1 }),
    bar(st, { ...cell(1, 3, 2, 1), h: 8 }),
    text('Hero', title, { ...cell(1, 4, 7, 1), h: 6 * GRID.stepY }, { font: st.hero ?? st.display, weight: st.displayWeight, size: 160, color: st.ink, lineHeight: 1.02, tracking: -0.01, fit: 'fill' }, rise),
    body(st, subtitle, cell(1, 11, 7, 2), 44),
  ];
  if (mark) layers.push(createLayer('image', { name: 'Mark', box: { x: panelX + 140, y: 360, w: 1920 - panelX - 280, h: 360, rot: 0 }, params: { src: mark, fit: 'contain', tone: 'dark' }, anim: { type: 'fade', duration: 1, delay: 0.4 } }));
  return slide(st, 'Title', layers);
}

/** Someone else's words, set large, with who said them. */
export function quoteSlide(st: LayoutStyle, quote: string, who: string): Slide {
  return slide(st, 'Quote', [
    text('Mark', '“', { ...cell(1, 1, 2, 4) }, { font: st.display, weight: '700', size: 260, color: st.accent, lineHeight: 1 }, { type: 'fade', duration: 0.6 }),
    heading(st, quote, { ...cell(2, 4, 10, 1), h: 7 * GRID.stepY }, 110),
    text('Attribution', '— ' + who, { ...cell(2, 12, 10, 1), h: 70 }, { font: st.body, weight: '600', size: 44, color: st.muted, fit: 'fill' }, after(0.4)),
  ]);
}

/** A section break with a rule across the top and the words low on the left. */
export function sectionEditorialSlide(st: LayoutStyle, title: string, subtitle: string): Slide {
  return slide(st, 'Section', [
    rule(st, { ...cell(1, 1, 12, 1), y: 150 }, st.accent, 4),
    heading(st, title, { ...cell(1, 5, 9, 1), h: 6 * GRID.stepY }, 150),
    body(st, subtitle, cell(1, 12, 9, 2), 48),
  ]);
}

/** A quieter section break: the words centred inside a fine inset frame. */
export function sectionFrameSlide(st: LayoutStyle, title: string, subtitle: string): Slide {
  return slide(st, 'Section', [
    shape('Frame', { x: 94, y: 94, w: 1732, h: 892, rot: 0 }, { shape: 'rect', fill: st.ink, fillOpacity: 0, stroke: st.ink, strokeOpacity: 0.16, strokeWidth: 3 }, { type: 'fade', duration: 0.8 }),
    heading(st, title, { ...cell(2, 4, 10, 1), h: 6 * GRID.stepY }, 140, { align: 'center' }),
    body(st, subtitle, cell(3, 11, 8, 2), 48, { align: 'center' }),
  ]);
}

/** A closing illustration: the line set large on the working ground, the artwork along the foot. */
export function closerSlide(st: LayoutStyle, title: string, credit: string, art: string, artAspect: number): Slide {
  const h = Math.min(640, 1920 / artAspect);
  return slide(st, 'Closer', [
    createLayer('image', { name: 'Artwork', box: { x: 0, y: 1080 - h, w: 1920, h, rot: 0 }, params: { src: art, fit: 'contain' }, anim: { type: 'rise', duration: 1.2 } }),
    heading(st, title, { ...cell(1, 1, 10, 1), h: 4 * GRID.stepY }, 120),
    text('Credit', credit, { ...cell(1, 5, 10, 1), h: 54 }, { font: st.body, weight: '600', size: 40, color: st.accent, fit: 'fill' }, after(0.4)),
  ]);
}

/** Code on a dark panel in a monospaced face — typing itself out, if asked, a character at a time. */
export function codeSlide(st: LayoutStyle, title: string, code: string, language: string, typewrite: boolean): Slide {
  const box = { ...cell(1, 5, 12, 1), y: CONTENT_TOP, h: CONTENT_FOOT - CONTENT_TOP };
  return slide(st, 'Code', [
    titleRow(st, title),
    titleBar(st),
    shape('Code panel', box, { shape: 'rect', radius: 18, fill: '#11151c' }, { type: 'fade', duration: 0.5 }),
    text('Language', language.toUpperCase(), { x: box.x + box.w - 300, y: box.y + 22, w: 260, h: 36, rot: 0 }, { font: 'JetBrains Mono', weight: '600', size: 26, color: '#8b98a9', align: 'right', tracking: 0.08, fit: 'shrink' }, after(0.2)),
    text('Code', code.replace(/\s+$/, ''), { x: box.x + 48, y: box.y + 60, w: box.w - 96, h: box.h - 100, rot: 0 }, { font: 'JetBrains Mono', weight: '400', size: 40, color: '#e6edf3', lineHeight: 1.45, fit: 'shrink' },
      typewrite ? { type: 'typewriter', duration: 0.05, stagger: 0.035, delay: 0.3 } : after(0.3)),
  ]);
}

/** One picture explored point by point: numbered spots on it, and what each is, in a key beside it. */
/**
 * SlideForge's Explore (src/render/explore.js): the whole picture with numbered hotspots, a caption
 * under it, and Next going through the details in order. Each click zooms the picture to the next
 * detail, eased over .45s as SlideForge does, then marks that hotspot and shows its title and note.
 * The last click returns to the whole picture. One step at a time: each replaces the last.
 * `aspect` is the picture's width over height, so the frame fits it and a spot's % lands on the picture.
 */
export function exploreSlide(st: LayoutStyle, title: string, src: string, spots: { x: number; y: number; zoom?: number; title: string; body?: string }[], aspect = 16 / 9): Slide {
  const full = cell(1, 5, 12, 1), capH = 200, gap = 28;
  const maxH = CONTENT_FOOT - CONTENT_TOP - capH - gap;
  let w = full.w, h = w / aspect;
  if (h > maxH) { h = maxH; w = h * aspect; }
  const scene: Box = { x: full.x + (full.w - w) / 2, y: CONTENT_TOP, w, h, rot: 0 };
  const cap: Box = { x: scene.x, y: scene.y + h + gap, w: Math.max(w, 900), h: capH, rot: 0 };
  const list = spots.slice(0, 8);
  // Views as the picture motion resolves them: the centre kept where the frame stays filled.
  type View = [number, number, number];
  const keep = (c: number, z: number) => Math.max(0.5 / z, Math.min(1 - 0.5 / z, c));
  const whole: View = [0.5, 0.5, 1];
  const views: View[] = list.map((p) => { const z = Math.max(1, Math.min(4, p.zoom ?? 2)); return [keep(p.x / 100, z), keep(p.y / 100, z), z]; });
  const set = 'explore', dot = 64;
  const layers: Layer[] = [titleRow(st, title), titleBar(st)];
  const stepOf = (items: Layer[], i: number, click: boolean) => items.forEach((l, j) => {
    l.anim = { ...l.anim, trigger: click && j === 0 ? 'onClick' : 'withSlide', step: { set, i, mode: 'swap' } };
  });
  // The hotspots where a view puts them, the live one filled; those zoomed out of the frame are left off.
  const markers = (v: View, live: number, delay: number) => list.flatMap((p, j) => {
    const sx = (p.x / 100 - v[0]) * v[2] + 0.5, sy = (p.y / 100 - v[1]) * v[2] + 0.5;
    if (sx < 0.03 || sx > 0.97 || sy < 0.05 || sy > 0.95) return [];
    const x = scene.x + sx * w - dot / 2, y = scene.y + sy * h - dot / 2, on = j === live;
    return [
      shape('Hotspot', { x, y, w: dot, h: dot, rot: 0 }, { shape: 'ellipse', fill: on ? st.accent : st.ground, stroke: st.accent, strokeWidth: 5, label: String(j + 1), labelColor: on ? st.ground : st.ink, labelSize: 34, labelFont: st.body, labelWeight: '700' }, after(delay)),
    ];
  });
  const caption = (head: string, note: string) => [
    text('Caption title', head, { ...cap, h: 60 }, { font: st.body, weight: '700', size: 44, color: st.ink, fit: 'shrink' }, after(0.2)),
    body(st, note, { ...cap, y: cap.y + 72, h: cap.h - 72 }, 36, { color: st.muted, fit: 'shrink' }, 0.3),
  ];
  const pic = (v: View, from: View, delay: number) => createLayer('image', {
    name: 'Picture', box: scene,
    params: { src, fit: 'contain', motion: 'detail', focus: [v[0], v[1]], zoom: v[2], fromFocus: [from[0], from[1]], fromZoom: from[2] },
    anim: { type: 'fade', duration: delay, delay: 0 },
  });
  // The whole picture, before the first click.
  const intro = [pic(whole, whole, 0.9), ...markers(whole, -1, 0.5), ...caption('Explore the image', list.length ? 'Click to go through each numbered detail in order.' : 'Add details to explore.')];
  stepOf(intro, 0, false);
  layers.push(...intro);
  // A click per detail, then one back to the whole picture.
  [...views, whole].forEach((v, k) => {
    const from = k ? views[k - 1] : whole, spot = list[k];
    const items = [pic(v, from, 0.25), ...markers(v, spot ? k : -1, 0.45),
      ...(spot ? caption(`${k + 1}  ${spot.title}`, spot.body ?? '') : caption('The whole image', 'Every detail, back in its place.'))];
    stepOf(items, k + 1, true);
    layers.push(...items);
  });
  const s = slide(st, 'Explore', layers);
  s.recipe = { kind: 'explore', args: { title, src, spots, aspect } };
  return s;
}

/**
 * SlideForge's framed picture (layoutImage with design.imageFrame): the picture at a fixed ratio,
 * centred, its caption clear beneath — plain, or on an accent band the picture's width ("bar").
 * With `facts`, SlideForge's Flip to facts: a ⇄ in the picture's corner turns the slide over to the
 * facts, the picture faint behind them; pressed again, it turns back. Turning over is not a build step.
 */
export function framedPictureSlide(st: LayoutStyle, caption: string, credit: string, src: string, frame = '4:3', cap: 'bar' | 'plain' = 'bar', facts = ''): Slide {
  const [fw, fh] = frame.split(':').map(Number), ratio = fw > 0 && fh > 0 ? fw / fh : 4 / 3;
  const padT = 84, padB = 72, padX = 138, gap = 39;
  const capH = (cap === 'bar' ? 54 : 0) + 62 + (credit ? 50 : 0);
  let h = 1080 - padT - padB - gap - capH, w = h * ratio;
  if (w > 1920 - padX * 2) { w = 1920 - padX * 2; h = w / ratio; }
  const top = padT + (1080 - padT - padB - (h + gap + capH)) / 2;
  const pic: Box = { x: (1920 - w) / 2, y: top, w, h, rot: 0 };
  const band: Box = { x: pic.x, y: top + h + gap, w, h: capH, rot: 0 };
  const onBand = cap === 'bar';
  const layers: Layer[] = [
    createLayer('image', { name: 'Picture', box: pic, params: { src, fit: 'cover', radius: 3 }, anim: { type: 'fade', duration: 0.9 } }),
  ];
  if (onBand) layers.push(createLayer('shape', { name: 'Caption band', box: band, params: { shape: 'rect', radius: 0, fill: st.accent, strokeWidth: 0 }, anim: after(0.3) }));
  const inner = onBand ? inset(band, 45, 27) : band;
  layers.push(text('Caption', caption, { ...inner, h: 62 }, { font: st.body, weight: '650', size: 51, color: onBand ? '#ffffff' : st.ink, align: 'center', lineHeight: 1.15 }, after(0.4)));
  if (credit) layers.push(text('Caption credit', credit, { ...inner, y: inner.y + 70, h: 44 }, { font: st.body, weight: '400', size: 36, color: onBand ? 'rgba(255,255,255,0.85)' : st.muted, align: 'center' }, after(0.5)));
  if (facts.trim()) {
    const lines = facts.split('\n').map((l) => l.trim()).filter(Boolean);
    const back = (l: Layer) => { l.face = 'back'; l.anim = { ...l.anim, type: 'none' }; return l; };
    // The back: the slide's own ground over the picture, the heading, then the facts a paragraph each.
    const scrim = back(createLayer('shape', { name: 'Facts ground', box: { x: 0, y: 0, w: 1920, h: 1080, rot: 0 }, params: { shape: 'rect', radius: 0, fill: st.ground, strokeWidth: 0 } }));
    scrim.opacity = 0.94;
    layers.push(
      scrim,
      // Clear of the ⇄, which keeps its corner on both faces.
      back(heading(st, caption || 'Behind the image', { x: 150, y: pic.y + 140, w: 1620, h: 100, rot: 0 }, 66, { fit: 'shrink' })),
      back(text('Facts', lines.join('\n\n'), { x: 150, y: pic.y + 280, w: 1350, h: 1080 - (pic.y + 280) - 130, rot: 0 }, { font: st.body, weight: '400', size: 42, color: st.ink, lineHeight: 1.45, fit: 'shrink' })),
    );
    // The toggle, just outside the picture's top right corner: clear of the picture on the front and
    // of the heading and facts on the back. Quiet on the front, lit in the accent on the back.
    const at: Box = { x: pic.x + w + 24, y: pic.y, w: 72, h: 72, rot: 0 };
    const toggle = (lit: boolean) => {
      const disc = createLayer('shape', { name: lit ? 'Back to image' : 'Flip to facts', box: at, params: { shape: 'rect', radius: 14, fill: lit ? st.accent : st.ground, fillOpacity: lit ? 1 : 0.82, stroke: lit ? st.accent : st.ink, strokeOpacity: lit ? 1 : 0.22, strokeWidth: 2, label: '\u21c4', labelColor: lit ? '#ffffff' : st.ink, labelSize: 36, labelFont: st.body, labelWeight: '600' }, anim: after(0.6) });
      disc.interact = { ...disc.interact, click: 'flip' };
      if (lit) back(disc);
      return [disc];
    };
    layers.push(...toggle(false), ...toggle(true));
  }
  const s = slide(st, facts.trim() ? 'Flip to facts' : 'Framed picture', layers);
  s.recipe = { kind: 'flip', args: { caption, credit, src, frame, cap, facts } };
  return s;
}

/**
 * SlideForge's chart callouts: the chart draws itself, then each Next zooms to a named category with
 * its note beneath — the axis label still in frame — and the last brings the whole chart back.
 * `data` is the lab's "label, value" lines; a callout names a category, not a position.
 */
export function chartCalloutSlide(st: LayoutStyle, title: string, data: string, source: string, callouts: { label: string; note: string }[]): Slide {
  const labels = data.split('\n').filter((l) => l.trim()).map((l) => l.split(',')[0].trim());
  const capH = 150, box: Box = { ...cell(1, 5, 12, 1), y: CONTENT_TOP, h: CONTENT_FOOT - CONTENT_TOP - capH - 20 };
  const cap: Box = { ...box, y: box.y + box.h + 20, h: capH };
  const params = { chart: 'column', data, color: st.accent, color2: st.muted, textColor: st.ink, font: st.body, size: 36, values: true, grid: true };
  const layers: Layer[] = [titleRow(st, title), titleBar(st)];
  const set = 'callouts';
  const item = (i: number, focus: [number, number], zoom: number, from: [number, number], fromZoom: number, head: string, note: string, first: boolean) => {
    const chart = createLayer('chart', { name: 'Chart', box, params: { ...params, motion: 'detail', focus, zoom, fromFocus: from, fromZoom }, anim: first ? { type: 'draw', duration: 0.9, stagger: 0.18, delay: 0.3, easing: 'cubicOut' } : { type: 'fade', duration: 0.25 } });
    const h = text('Callout', head, { ...cap, h: 56 }, { font: st.body, weight: '700', size: 44, color: st.ink }, after(first ? 1.2 : 0.3));
    const n = body(st, note, { ...cap, y: cap.y + 64, h: cap.h - 64 }, 36, { color: st.muted, fit: 'shrink' }, first ? 1.3 : 0.4);
    [chart, h, n].forEach((l, j) => { l.anim = { ...l.anim, trigger: !first && j === 0 ? 'onClick' : 'withSlide', step: { set, i, mode: 'swap' } }; });
    return [chart, h, n];
  };
  const whole: [number, number] = [0.5, 0.5];
  const at = (label: string): [number, number] => { const i = Math.max(0, labels.indexOf(label)); return [(i + 0.5) / Math.max(1, labels.length), 0.55]; };
  layers.push(...item(0, whole, 1, whole, 1, source ? 'The whole series' : '', source, true));
  let prev = whole, prevZoom = 1;
  callouts.forEach((c, i) => { const f = at(c.label); layers.push(...item(i + 1, f, 2.2, prev, prevZoom, c.label, c.note, false)); prev = f; prevZoom = 2.2; });
  layers.push(...item(callouts.length + 1, whole, 1, prev, prevZoom, 'The whole series', source, false));
  const s = slide(st, 'Chart callouts', layers);
  s.recipe = { kind: 'callouts', args: { title, data, source, callouts } };
  return s;
}

/** A YouTube or Vimeo link, understood: a Video layer holding the link, so the canvas shows the
 *  clip's own still and Preview frames the real player; the caption beneath it. */
export function youtubeSlide(st: LayoutStyle, title: string, subtitle: string, url: string): Slide {
  const capH = 150, h = CONTENT_FOOT - CONTENT_TOP - capH - 30, w = (h * 16) / 9;
  const box: Box = { x: (1920 - w) / 2, y: CONTENT_TOP - 40, w, h, rot: 0 };
  return slide(st, 'Video link', [
    createLayer('video', { name: 'Video', box, params: { src: url, fit: 'cover', radius: 18, muted: true }, anim: after(0.2) }),
    text('Caption', title, { ...cell(1, 5, 12, 1), y: box.y + h + 30, h: 60 }, { font: st.body, weight: '700', size: 48, color: st.ink, align: 'center' }, after(0.5)),
    body(st, subtitle, { ...cell(1, 5, 12, 1), y: box.y + h + 96, h: 50 }, 36, { color: st.muted, align: 'center', fit: 'shrink' }, 0.6),
  ]);
}

/**
 * SlideForge's visual experiment slide: the title, the prediction prompt, the experiment — which asks
 * for a prediction, then moves through its states a Next at a time — and the data's source.
 */
export function experimentSlide(st: LayoutStyle, title: string, prompt: string, e: { preset: string; data: string; states?: string; duration?: number }, source: string): Slide {
  return slide(st, 'Experiment', [
    titleRow(st, title),
    titleBar(st),
    body(st, prompt, { ...cell(1, 5, 12, 1), y: CONTENT_TOP - 50, h: 60 }, 40, { color: st.muted, fit: 'shrink' }, 0.2),
    // The chart on the left, the steps and what each shows on the right, the source at the rail's foot.
    createLayer('experiment', { name: 'Experiment', box: { ...cell(1, 5, 12, 1), y: CONTENT_TOP + 30, h: CONTENT_FOOT - CONTENT_TOP - 30 }, params: {
      preset: e.preset, data: e.data, states: e.states ?? '', duration: String(e.duration ?? 1600), font: st.body, size: 36, textColor: st.ink, accent: st.accent,
      source: source || 'Illustrative teaching data',
    }, anim: { type: 'fade', duration: 0.6, delay: 0.3 } }),
  ]);
}

/**
 * SlideForge's motion specimen: the look's ground, the behaviour's name in small capitals over the
 * title, and the stage — driven by Next, and in Preview by dragging or pressing it.
 */
export function sceneSlide(o: { mode: string; look: string; title: string; subtitle?: string; items: string[]; image?: string; factor?: number }, looks: Record<string, { bg: string; ink: string; accent: string; serif?: boolean; mono?: boolean }>, names: Record<string, string>): Slide {
  const lk = looks[o.look] ?? looks.editorial;
  const face = lk.serif ? 'Georgia' : lk.mono ? 'JetBrains Mono' : 'Avenir Next';
  const layers: Layer[] = [
    text('Kicker', (names[o.mode] ?? o.mode).toUpperCase(), { x: 84, y: 60, w: 1752, h: 40, rot: 0 }, { font: 'Avenir Next', weight: '600', size: 28, tracking: 0.2, color: lk.accent }, after(0.1)),
    text('Heading', o.title, { x: 84, y: 106, w: 1752, h: 84, rot: 0 }, { font: face, weight: lk.serif ? '400' : '700', size: 64, color: lk.ink, lineHeight: 1.1, fit: 'shrink' }, rise),
    createLayer('scene', { name: 'Motion experiment', box: { x: 84, y: 214, w: 1752, h: 806, rot: 0 }, params: {
      mode: o.mode, look: o.look, items: o.items.join('\n'), image: o.image ?? '', factor: o.factor ?? 2, subtitle: o.subtitle ?? '', font: 'Avenir Next', size: 36,
    }, anim: { type: 'fade', duration: 0.6, delay: 0.2 } }),
  ];
  return createSlide(names[o.mode] ?? 'Motion experiment', [createLayer('solid', { name: 'Ground', params: { color: lk.bg } }), ...layers], lk.bg, { type: 'fade', duration: 0.7 });
}

/** SlideForge's game clock in the top right corner, where its quiz and activity slides keep it —
 *  here level with the heading: centred on the heading's row, its right edge on the right margin
 *  where the heading ends, and large enough to read from the back. */
export const CLOCK_SIZE = 195;
export function clockBox(heading?: Box): Box {
  const row = heading ?? { ...cell(1, 1, 12, 2) };
  return { x: row.x + row.w - CLOCK_SIZE, y: row.y + row.h / 2 - CLOCK_SIZE / 2, w: CLOCK_SIZE, h: CLOCK_SIZE, rot: 0 };
}
export function gameClock(st: Pick<LayoutStyle, 'ink' | 'accent' | 'body'>, minutes = 5, heading?: Box): Layer {
  return createLayer('timer', { name: 'Timer', box: clockBox(heading), params: {
    minutes, style: 'game', label: '', done: '', font: st.body, size: 96, textColor: st.ink, accent: st.accent, track: rgbaOf(st.ink, 0.18),
  }, anim: { type: 'fade', duration: 0.5 } });
}
const rgbaOf = (hex: string, a: number) => { const n = parseInt(hex.replace('#', '').slice(0, 6), 16); return Number.isFinite(n) ? `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})` : hex; };

/** A timed task: the title kept clear of the clock, the steps under it, and the game clock counting
 *  down in the top right from the moment the slide comes up. */
export function timedSlide(st: LayoutStyle, title: string, points: string[], minutes = 5): Slide {
  const s = bulletsSlide(st, title, points);
  const t = s.layers.find((l) => l.name === 'Heading');
  const row = t?.box ? { ...t.box } : undefined;
  if (t?.box) t.box = { ...t.box, w: t.box.w - CLOCK_SIZE - 48 };
  s.layers.push(gameClock(st, minutes, row));
  s.name = 'Timed task';
  return s;
}

/**
 * SlideForge's Simulation: a model drawn as its curve, the input on a slider under it. In Preview the
 * room drags the input and the output redraws — for when the relationship is the lesson and a static
 * chart would show only one point on it.
 */
export function simulationSlide(st: LayoutStyle, title: string, m: { model?: string; a?: number; b?: number; min?: number; max?: number; initial?: number; inputLabel?: string; outputLabel?: string }): Slide {
  const lo = Number(m.min ?? 0), hi = Math.max(lo + 1, Number(m.max ?? 10));
  return slide(st, 'Simulation', [
    titleRow(st, title),
    titleBar(st),
    createLayer('model', { name: 'Simulation', box: { ...cell(1, 5, 12, 1), y: CONTENT_TOP, h: CONTENT_FOOT - CONTENT_TOP }, params: {
      model: m.model === 'quadratic' ? 'quadratic' : 'linear', a: Number(m.a ?? 2), b: Number(m.b ?? 0), min: lo, max: hi,
      initial: Math.max(lo, Math.min(hi, Number(m.initial ?? lo + (hi - lo) / 2))), inputLabel: m.inputLabel ?? 'Input', outputLabel: m.outputLabel ?? 'Output',
      font: st.body, size: 36, accent: st.accent, textColor: st.ink,
    }, anim: after(0.2) }),
  ]);
}

/**
 * SlideForge's Before / after: two registered pictures in one frame, a handle wiping the after over
 * the before. In Preview the handle is dragged, or a press sends it there; it rests half way.
 * Only worth it when the two share their framing and scale, so the wipe compares like with like.
 */
export function beforeAfterSlide(st: LayoutStyle, title: string, before: string, after2: string, labels: [string, string], aspect = 0): Slide {
  // The frame takes the pictures' shape, so the labels sit on their corners and the handle spans them.
  const full: Box = { ...cell(1, 5, 12, 1), y: CONTENT_TOP, h: CONTENT_FOOT - CONTENT_TOP };
  let w = full.w, h = full.h;
  if (aspect > 0) { if (w / h > aspect) w = h * aspect; else h = w / aspect; }
  const box: Box = { x: full.x + (full.w - w) / 2, y: full.y + (full.h - h) / 2, w, h, rot: 0 };
  return slide(st, 'Before and after', [
    titleRow(st, title),
    titleBar(st),
    createLayer('wipe', { name: 'Before / after', box, params: { before, after: after2, beforeLabel: labels[0], afterLabel: labels[1], position: 50, fit: 'contain', font: st.body, size: 36, accent: st.accent, textColor: '#ffffff' }, anim: { type: 'fade', duration: 0.8, delay: 0.2 } }),
  ]);
}

/**
 * SlideForge's Gallery, an image stack (layoutGallery): each click lays the next picture in front of
 * the last with its own caption and source, the earlier ones stepping back at the edges — the pile
 * growing is the point. Framed at a ratio with the caption beneath (plain, or on an accent band).
 * With no pictures it offers slots to drop them on.
 */
export function gallerySlide(st: LayoutStyle, title: string, figs: (string | { src: string; caption?: string; source?: string })[], frame = '4:3', cap: 'bar' | 'plain' = 'bar', fit: 'contain' | 'cover' = 'contain'): Slide {
  const list = figs.slice(0, 8).map((f) => (typeof f === 'string' ? { src: '', caption: f, source: '' } : f));
  const [fw, fh] = frame.split(':').map(Number), ratio = fw > 0 && fh > 0 ? fw / fh : 4 / 3;
  // The picture takes the full content height, stepped in from the left so the pile has room to
  // fall back into; its caption sits on a card beside it, level with its foot.
  const room = Math.min(3, Math.max(0, list.length - 1)) * 40;
  const left = cell(1, 5, 12, 1).x + room, areaTop = CONTENT_TOP, areaH = CONTENT_FOOT - areaTop;
  let h = areaH, w = h * ratio;
  const maxW = 1920 - left - 78 - 560;
  if (w > maxW) { w = maxW; h = w / ratio; }
  const pic: Box = { x: left, y: areaTop + (areaH - h) / 2, w, h, rot: 0 };
  const onBand = cap === 'bar', anySource = list.some((f) => f.source);
  const capX = pic.x + w + 48, capW = 1920 - 78 - capX;
  const capH = (onBand ? 60 : 0) + 132 + (anySource ? 58 : 0);
  const band: Box = { x: capX, y: pic.y + h - capH, w: capW, h: capH, rot: 0 };
  const layers: Layer[] = [titleRow(st, title), titleBar(st)];
  list.forEach((f, i) => {
    const inner = onBand ? inset(band, 36, 30) : band;
    const item: [Layer, boolean][] = [
      [shape('Sheet', pic, { shape: 'rect', radius: 4, fill: st.panel, stroke: st.ink, strokeOpacity: 0.18, strokeWidth: 2 }, {}), false],
      [createLayer('image', { name: f.src ? 'Picture' : 'Picture — drop one here', box: pic, params: { src: f.src, fit, radius: 3 }, anim: {} }), false],
    ];
    if (onBand) item.push([shape('Caption band', band, { shape: 'rect', radius: 4, fill: st.accent, strokeWidth: 0 }, {}), true]);
    if (f.caption) item.push([text('Caption', f.caption, { ...inner, h: 124 }, { font: st.body, weight: '650', size: 48, color: onBand ? '#ffffff' : st.ink, lineHeight: 1.22, fit: 'shrink', fitGroup: 'gallery-captions' }, {}), true]);
    if (f.source) item.push([text('Source', f.source.toUpperCase(), { ...inner, y: inner.y + 138, h: 44 }, { font: st.body, weight: '500', size: 36, tracking: 0.06, color: onBand ? 'rgba(255,255,255,0.85)' : st.muted }, {}), true]);
    // The first is down with the slide; each after it arrives on a click, rising into place.
    item.forEach(([l, caption], j) => {
      l.anim = { ...l.anim, type: i ? 'rise' : 'fade', duration: 0.5, delay: 0, easing: 'cubicOut', trigger: i && j === 0 ? 'onClick' : 'withSlide', step: { set: 'gallery', i, mode: 'pile', ...(caption ? { caption: true } : {}) } };
    });
    layers.push(...item.map(([l]) => l));
  });
  const s = slide(st, 'Gallery', layers);
  s.recipe = { kind: 'gallery', args: { title, figs: list, frame, cap, fit } };
  return s;
}

export const LAYOUTS: LayoutDef[] = [
  {
    id: 'title', name: 'Title', group: 'Introduce', blurb: 'Big title at the top. Subtitle underneath.',
    make: (st) => titleSlide(st, 'Lesson title', 'Your name · the course'),
  },
  {
    id: 'section', name: 'Section', group: 'Introduce', blurb: 'A clean pause between parts of the lesson.',
    make: (st) => sectionSlide(st, 'Next idea', 'A short bridge into what follows.'),
  },
  {
    id: 'statement', name: 'Statement', group: 'Introduce', blurb: 'One line, bold and as big as it fits. An opening thought, a provocation, a rule to remember.',
    make: (st) => slide(st, 'Statement', [
      statement(st, 'Every chart is a choice.', { x: 352, y: 315, w: 1215, h: 350, rot: 0 }, 168, 'center'),
      credit(st, 'Say it, then pause.', { x: 360, y: 709, w: 1200, h: 54, rot: 0 }, 'center'),
    ]),
  },
  // SlideForge's statement compositions. The type is the same in each; what changes is where it sits
  // and the one piece of drawing that frames it.
  {
    id: 'statement-poster', name: 'Statement · poster', group: 'Introduce', blurb: 'The line low on the left, with a ring of the accent cut by the right edge. An opening.',
    make: (st) => slide(st, 'Statement · poster', [
      createLayer('shape', { name: 'Ring', box: { x: 1470, y: 248, w: 585, h: 585, rot: 0 }, opacity: 0.85, params: { shape: 'ring', ringWidth: 0.35, fill: st.accent, strokeWidth: 0 } }),
      // Set for two lines, low on the slide, with the credit a breath beneath them.
      statement(st, 'Direct attention.', { x: 132, y: 466, w: 1215, h: 350, rot: 0 }, 168, 'left'),
      credit(st, 'Movement with a purpose', { x: 132, y: 861, w: 1320, h: 54, rot: 0 }, 'left'),
    ]),
  },
  {
    id: 'statement-editorial', name: 'Statement · editorial', group: 'Introduce', blurb: 'A rule across the top and the line low on the left, like a magazine opener.',
    make: (st) => slide(st, 'Statement · editorial', [
      rule(st, { ...cell(1, 1, 12, 1), x: 165, w: 1590, y: 150 }, st.accent, 4),
      statement(st, 'Give the idea room', { x: 165, y: 466, w: 1215, h: 350, rot: 0 }, 168, 'left'),
      credit(st, 'A gentle background supports the opening', { x: 165, y: 861, w: 1320, h: 54, rot: 0 }, 'left'),
    ]),
  },
  {
    id: 'statement-frame', name: 'Statement · frame', group: 'Introduce', blurb: 'The line centred inside a fine inset frame. Calm, and easy to copy for a set of slides.',
    make: (st) => slide(st, 'Statement · frame', [
      createLayer('shape', { name: 'Frame', box: { x: 94.5, y: 94.5, w: 1731, h: 891, rot: 0 }, params: { shape: 'rect', radius: 0, fill: st.ink, fillOpacity: 0, stroke: st.ink, strokeOpacity: 0.12, strokeWidth: 3 } }),
      statement(st, 'Give the idea room', { x: 352, y: 315, w: 1215, h: 350, rot: 0 }, 168, 'center'),
      credit(st, 'Gentle / reflective opening', { x: 360, y: 709, w: 1200, h: 54, rot: 0 }, 'center'),
    ]),
  },
  {
    id: 'quote', name: 'Quote', group: 'Introduce', blurb: 'Someone else’s words, set large, with who said it.',
    make: (st) => slide(st, 'Quote', [
      item('quote', 'Quote', cell(2, 3, 10, 11), { ...colours(st), font: st.display, size: 92 }, 0),
    ]),
  },
  {
    id: 'content', name: 'Bullets', group: 'Explain & organise', blurb: 'A title and the points under it. The points fill the space and shrink to fit, so a long list stays on the slide.',
    make: (st) => bulletsSlide(st, 'Slide title', ['One point per line', 'Keep each to a sentence', 'Reveal them as you talk']),
  },
  {
    id: 'timed', name: 'Timed task', group: 'Explain & organise', blurb: 'The task and its steps, with SlideForge’s game clock counting down in the top right from when the slide comes up.',
    make: (st) => timedSlide(st, 'Discuss with the person next to you', ['What does the chart show first?', 'What would you check before believing it?', 'Agree one question to ask the room'], 3),
  },
  {
    id: 'cards', name: 'Cards', group: 'Explain & organise', blurb: 'Two to four ideas side by side, each a card that grows with its words.',
    make: (st) => cardsSlide(st, 'Three ideas to hold onto.', [['Say it', 'One idea per card, in a few words.'], ['Show it', 'A picture or an example beside it.'], ['Check it', 'Ask the room before moving on.']]),
  },
  {
    id: 'keyfact', name: 'Key fact', group: 'Explain & organise', blurb: 'One number or rule set large, with the detail beneath it.',
    make: (st) => keyfactSlide(st, 'The thing they must leave with', '90%', 'What the fact is, in a few words', ['The detail that makes the number mean something.']),
  },
  {
    id: 'keywords', name: 'Keywords', group: 'Explain & organise', blurb: 'Bold keyword and its definition — vocabulary pits.',
    make: (st) => keywordsSlide(st, 'Key vocabulary', [['Mean', 'The average: add them up, divide by how many.'], ['Median', 'The middle value once they are in order.'], ['Mode', 'The value that turns up most often.']]),
  },
  {
    id: 'split', name: 'Image + text', group: 'Show & explore', blurb: 'Half text, half picture — say it and show it.',
    make: (st) => splitSlide(st, 'Say it. Show it.', ['The picture takes one half', 'The points take the other', 'Swap sides with the next layout'], 'right'),
  },
  {
    id: 'split-left', name: 'Text + image', group: 'Show & explore', blurb: 'The same split with the picture on the left.',
    make: (st) => splitSlide(st, 'Say it. Show it.', ['The picture takes one half', 'The points take the other', 'Swap sides with the previous layout'], 'left'),
  },
  {
    id: 'image', name: 'Full picture', group: 'Show & explore', blurb: 'One picture, edge to edge, with a caption over it.',
    make: (st) => slide(st, 'Full picture', [
      picture({ x: 0, y: 0, w: 1920, h: 1080, rot: 0 }),
      // SlideForge's scrim: clear at the top, 82% black at the foot, so the caption reads over any picture.
      createLayer('shape', { name: 'Caption band', box: { x: 0, y: 714, w: 1920, h: 366, rot: 0 }, params: { shape: 'rect', radius: 0, gradient: true, fill: '#000000', fillOpacity: 0, fill2: '#000000', fill2Opacity: 0.82, angle: 90, strokeWidth: 0 } }),
      text('Caption', 'What the picture shows, in one line', { ...cell(1, 13, 10, 1), x: 138 }, { font: st.body, weight: '600', size: 66, color: '#ffffff', lineHeight: 1.14 }, after(0.4)),
      text('Caption credit', 'WHERE IT CAME FROM', { ...cell(1, 14, 10, 1), x: 138, y: 957 }, { font: st.body, weight: '500', size: 28, color: '#ffffff', tracking: 0.06, uppercase: true }, after(0.5)),
    ]),
  },
  {
    id: 'chart', name: 'Chart', group: 'Show & explore', blurb: 'A title, the chart and where the numbers came from.',
    make: (st) => chartSlide(st, 'What the numbers say', 'Source: where these figures come from'),
  },
  {
    id: 'stats', name: 'Stats', group: 'Infographic', blurb: 'The numbers that matter, set large, with a takeaway.',
    make: (st) => statsSlide(st, 'The numbers that matter', [['92%', 'read the chart title first'], ['48%', 'found the legend'], ['3 of 5', 'asked a follow-up']], 'Most read the title first — so put the finding in it.'),
  },
  {
    id: 'compare', name: 'Compare', group: 'Infographic', blurb: 'Two columns, row by row.',
    make: (st) => compareSlide(st, 'Two columns, row by row', ['Bar chart', 'Pie chart'], [['Best for', 'Comparing amounts', 'Parts of one whole'], ['Reads by', 'Length, on a shared axis', 'Angle and area'], ['Breaks when', 'Too many bars', 'More than five slices']]),
  },
  {
    id: 'table', name: 'Table', group: 'Explain & organise', blurb: 'Rows and columns, for when the exact value matters. Type the cells on the slide or in the panel.',
    make: (st) => tableSlide(st, 'When the exact value matters', '\tBasic\tStandard\tPremium\nPrice\t£10\t£25\t£60\nSeats\t1\t5\tUnlimited\nSupport\tEmail\tEmail and chat\tA named person'),
  },
  {
    id: 'journey', name: 'Journey', group: 'Infographic', blurb: 'A process in order: numbered stops along a line, up to six.',
    make: (st) => journeySlide(st, 'A process, in order', '', [['Ask', 'Start with the question.'], ['Try', 'Have a go, in pairs.'], ['Check', 'Compare with the answer.'], ['Explain', 'Say why it works.']]),
  },
  {
    id: 'sidecar', name: 'Title · sidecar', group: 'Introduce', blurb: 'The title on the ground, a panel of the loud colour beside it.',
    make: (st) => sidecarTitleSlide(st, 'See the\nargument.', 'Your course · your institution'),
  },
  {
    id: 'section-editorial', name: 'Section · editorial', group: 'Introduce', blurb: 'A rule across the top and the words low on the left.',
    make: (st) => sectionEditorialSlide(st, 'Ask a better\nquestion.', 'Choose the evidence that would answer it.'),
  },
  {
    id: 'section-frame', name: 'Section · frame', group: 'Introduce', blurb: 'A quieter break: the words centred in a fine frame.',
    make: (st) => sectionFrameSlide(st, 'Follow the\nevidence.', 'Let the information determine its form.'),
  },
  {
    id: 'introduction', name: 'Introduction', group: 'Introduce', blurb: 'Who is at the front: a portrait, the name, the role and a short paragraph.',
    make: (st) => introductionSlide(st, 'Your name', 'Role · your institution', 'Who is standing at the front, and why this room should listen.'),
  },
  {
    id: 'quote-slide', name: 'Quote · large', group: 'Introduce', blurb: 'Someone else’s words, set large, with who said them.',
    make: (st) => quoteSlide(st, 'The purpose of visualization is insight, not pictures.', 'Ben Shneiderman'),
  },
  {
    id: 'columns', name: 'Columns', group: 'Explain & organise', blurb: 'Two to four parallel points, numbered, side by side.',
    make: (st) => columnsSlide(st, 'What does the evidence need to show?', ['A pattern that a summary can hide.', 'A comparison made on the same terms.', 'A limitation that changes the conclusion.']),
  },
  {
    id: 'rail', name: 'Side heading', group: 'Explain & organise', blurb: 'The claim held on the left, the points it rests on beside it.',
    make: (st) => railSlide(st, 'Leave a useful next step.', ['State what the evidence supports.', 'Make the remaining uncertainty visible.', 'Name the question to investigate next.']),
  },
  {
    id: 'timeline', name: 'Timeline', group: 'Infographic', blurb: 'Dated events on a rail — date, event and a line of detail, up to eight.',
    make: (st) => timelineSlide(st, 'Where the ideas came from', '', [['1786', 'Playfair', 'The bar chart and the line chart'], ['1858', 'Nightingale', 'The rose diagram'], ['1967', 'Bertin', 'The visual variables named'], ['1983', 'Tufte', 'Data-ink and chartjunk']]),
  },
  {
    id: 'funnel', name: 'Funnel', group: 'Infographic', blurb: 'Stages that narrow; with numbers, the bands follow them.',
    make: (st) => funnelSlide(st, 'Stages that narrow', '', [['Visitors', '1,200', 'everyone who arrived'], ['Readers', '300', 'stayed past the title'], ['Sharers', '40', 'passed it on']]),
  },
  {
    id: 'mindmap', name: 'Mind map', group: 'Infographic', blurb: 'Points with no order, arranged round the idea they belong to.',
    make: (st) => mindmapSlide(st, 'The idea', [['One', 'A point that belongs here.'], ['Two', 'Another, with no order.'], ['Three', 'Siblings, not steps.'], ['Four', 'Round the centre.']]),
  },
  {
    id: 'orgchart', name: 'People & structure', group: 'Infographic', blurb: 'Who reports to whom: a card per person, a row per level.',
    make: (st) => orgchartSlide(st, 'Who is who', [['Course leader', 'Leads the module', ''], ['Tutor', 'Seminars', 'Course leader'], ['Tutor', 'Labs', 'Course leader']].map((p, i) => [i ? `${p[0]} ${i}` : p[0], p[1], p[2]] as [string, string, string])),
  },
  {
    id: 'blank', name: 'Blank', group: 'Introduce', blurb: 'Nothing on it. Add items and put them where you want them.',
    make: (st) => slide(st, 'Blank', []),
  },
];

export const LAYOUT_GROUPS = ['Introduce', 'Explain & organise', 'Show & explore', 'Infographic'] as const;
