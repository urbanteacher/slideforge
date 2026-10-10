import { createLayer, createSlide } from './defaults';
import type { SlideDesign } from './fromSlideForge';
import { groundParams, type LayoutStyle } from './layouts';
import type { Anim, Box, Layer, Params, Slide } from './types';

/*
 * Story designs (docs/story-designs-plan.md, SD-02): the editorial slides of the Air Pollution Project
 * deck (assets/air-pollution/), made into designs anyone can add and edit. Each is built from the
 * deck's style — its ground, ink, accents and faces — and remembers what it was built from
 * (slide.recipe), so the Slide panel can change the words and numbers and build it again.
 */
export const STORY_GROUP = 'Story designs';

const L = 120, W = 1920 - 2 * L;

const text = (name: string, value: string, box: Box, params: Params, anim: Partial<Anim>, opacity?: number): Layer =>
  createLayer('text', { name, box, params: { text: value, fit: 'shrink', lineHeight: 1.15, tracking: 0, ...params }, anim, opacity });
const rise = (delay: number, trigger: Anim['trigger'] = 'withSlide'): Partial<Anim> => ({ type: 'rise', duration: 0.9, delay, easing: 'expoOut', trigger });
const fade = (delay: number, trigger: Anim['trigger'] = 'withSlide'): Partial<Anim> => ({ type: 'fade', duration: 0.8, delay, easing: 'cubicOut', trigger });
const count = (delay: number, trigger: Anim['trigger']): Partial<Anim> => ({ type: 'count', duration: 1.6, delay, easing: 'cubicOut', trigger });

function storySlide(st: LayoutStyle, name: string, layers: Layer[]): Slide {
  const g = groundParams(st);
  return createSlide(name, [createLayer(g.kind, { name: 'Ground', params: g.params }), ...layers], st.ground, { type: 'fade', duration: 0.7 });
}

// ─── Big-number row ─────────────────────────────────────────────────────────

export interface Stat { value: string; label: string }
export interface NumbersArgs {
  kicker: string; title: string; intro: string; stats: Stat[]; takeaway: string; source: string;
  /** Click: each number arrives, counting up, on a click (its label just after). Slide: all arrive with the slide. */
  reveal: 'click' | 'slide';
}

export const NUMBERS_EXAMPLE: NumbersArgs = {
  kicker: 'The air our children breathe',
  title: 'Toxic air is a school-gate problem.',
  intro: '',
  stats: [
    { value: '3.1m', label: 'children in England go to school where the air is toxic' },
    { value: '4×', label: 'more likely: a London child’s school is above WHO pollution limits' },
    { value: '5%', label: 'lower lung function among children in Tower Hamlets' },
  ],
  takeaway: '',
  source: '',
  reveal: 'click',
};

/** Two to four big numbers in a row, each with what it counts, under a kicker and a title; an optional
 *  line before them, a takeaway after them and the source along the foot. The numbers count up. */
export function numbersSlide(st: LayoutStyle, a: NumbersArgs): Slide {
  const stats = (a.stats ?? []).filter((s) => String(s.value ?? '').trim()).slice(0, 4);
  const n = Math.max(1, stats.length);
  const gap = 60, colW = (W - gap * (n - 1)) / n;
  const tones = [st.ink, st.accent, st.accent2 ?? st.accent, st.muted];
  const click = a.reveal !== 'slide';
  const layers: Layer[] = [];
  if (a.kicker?.trim()) layers.push(text('Kicker', a.kicker, { x: L, y: 140, w: W, h: 40, rot: 0 }, { font: st.body, weight: '600', size: 28, color: st.accent, tracking: 0.2, uppercase: true }, rise(0)));
  layers.push(text('Heading', a.title || ' ', { x: L, y: 190, w: W, h: 100, rot: 0 }, { font: st.display, weight: st.displayWeight, size: 76, color: st.ink, tracking: -0.02, lineHeight: 1.05 }, rise(0.1)));
  if (a.intro?.trim()) layers.push(text('Intro', a.intro, { x: L, y: 315, w: W, h: 50, rot: 0 }, { font: st.body, weight: '400', size: 36, color: st.muted }, rise(0.3)));
  const numberSize = n <= 2 ? 200 : n === 3 ? 180 : 150;
  stats.forEach((s, i) => {
    const x = L + i * (colW + gap);
    layers.push(text(`Number ${i + 1}`, s.value, { x, y: 400, w: colW, h: 200, rot: 0 }, { font: st.display, weight: st.displayWeight, size: numberSize, color: tones[i % tones.length], tracking: -0.04, lineHeight: 1, fit: 'shrink', valign: 'bottom' },
      click ? count(0, 'onClick') : count(0.4 + i * 0.25, 'withSlide')));
    layers.push(text(`Label ${i + 1}`, s.label ?? '', { x, y: 615, w: Math.min(colW, 560), h: 170, rot: 0 }, { font: st.body, weight: '400', size: 36, color: st.muted, lineHeight: 1.25 },
      click ? fade(0.3, 'afterPrev') : fade(0.7 + i * 0.25)));
  });
  if (a.takeaway?.trim()) layers.push(text('Takeaway', a.takeaway, { x: L, y: 810, w: W, h: 110, rot: 0 }, { font: st.body, weight: '700', size: 40, color: st.accent2 ?? st.accent, lineHeight: 1.22 }, click ? rise(0.3, 'onClick') : rise(1.4)));
  if (a.source?.trim()) layers.push(text('Source', a.source, { x: L, y: 975, w: W, h: 34, rot: 0 }, { font: st.body, weight: '400', size: 20, color: st.muted }, fade(0.6)));
  const s = storySlide(st, 'Big-number row', layers);
  s.recipe = { kind: 'story-numbers', args: { ...a, stats } as unknown as Record<string, unknown> };
  return s;
}

const shape = (name: string, box: Box, params: Params, anim: Partial<Anim> = {}, opacity?: number): Layer =>
  createLayer('shape', { name, box, params: { shape: 'rect', radius: 0, strokeWidth: 0, ...params }, anim, opacity });
const lum = (hex: string) => { const n = parseInt(hex.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
/** The ink for words on a light panel: the slide's ground where that is dark, else near-black. */
const deep = (st: LayoutStyle) => (lum(st.ground) < 0.35 ? st.ground : '#111111');
/** A fade behind words on a photo has to be darker than a mid-dark ground, or the picture shows through. */
const shade = (st: LayoutStyle) => (lum(st.ground) < 0.1 ? st.ground : '#121416');
/** A few words on a rounded panel of their own: a tag, or a call to action as a button. */
const pill = (st: LayoutStyle, name: string, value: string, x: number, y: number, bg: string, size: number, anim: Partial<Anim>): Layer =>
  text(name, value, { x, y, w: 900, h: size + 30, rot: 0 }, { font: st.body, weight: '700', size, color: deep(st), fit: 'grow', block: 'hug', blockColor: bg, blockPad: 22, blockRadius: 44 }, anim);

// ─── Photo hero ─────────────────────────────────────────────────────────────

export interface HeroArgs { src: string; line1: string; line2: string; sub: string; credit: string; side: 'left' | 'bottom' }
export const HERO_EXAMPLE: HeroArgs = {
  src: '/assets/air-pollution/roadside-sensor.jpg', line1: 'So we', line2: 'built it.',
  sub: 'A low-cost sensor, wired up by students, logging a real London street.', credit: '', side: 'left',
};

/** A picture across the whole slide, slowly closing in, with a fade on one side and a huge line on it:
 *  the turn in a story. The second line is in the accent and the biggest thing on the slide. */
export function heroSlide(st: LayoutStyle, a: HeroArgs): Slide {
  const ink = shade(st), bottom = a.side === 'bottom';
  const layers: Layer[] = [];
  if (a.src) layers.push(createLayer('image', { name: 'Picture', box: { x: 0, y: 0, w: 1920, h: 1080, rot: 0 }, params: { src: a.src, fit: 'cover', tone: 'light', motion: 'zoom', motionSecs: '30' }, anim: fade(0) }));
  // Shape gradients run 0° left to right, 90° top to bottom (engine/raster.ts rasterShape).
  // Two of the same fade, one over the other: a see-through gradient draws lighter than its stops,
  // and doubling it keeps the words' side properly dark while the far side stays clear.
  const fadeLayer = () => (bottom
    ? shape('Fade for text', { x: 0, y: 380, w: 1920, h: 700, rot: 0 }, { fill: ink, fillOpacity: 0, gradient: true, fill2: ink, fill2Opacity: 0.96, angle: 90 })
    : shape('Fade for text', { x: 0, y: 0, w: 1400, h: 1080, rot: 0 }, { fill: ink, fillOpacity: 0.96, gradient: true, fill2: ink, fill2Opacity: 0, angle: 0 }));
  layers.push(fadeLayer(), fadeLayer());
  const w = bottom ? W : 1100, y0 = bottom ? 560 : 300;
  layers.push(text('Line 1', a.line1 || ' ', { x: L, y: y0, w, h: 170, rot: 0 }, { font: st.display, weight: st.displayWeight, size: bottom ? 120 : 160, color: '#ffffff', tracking: -0.04, lineHeight: 1 }, rise(0.5)));
  layers.push(text('Line 2', a.line2 || ' ', { x: L, y: y0 + (bottom ? 125 : 150), w: bottom ? W : 1300, h: 240, rot: 0 }, { font: st.display, weight: st.displayWeight, size: bottom ? 170 : 230, color: st.accent, tracking: -0.045, lineHeight: 1 }, rise(0.9)));
  if (a.sub?.trim()) layers.push(text('Line under', a.sub, { x: L, y: bottom ? 900 : 760, w: bottom ? 1400 : 820, h: 110, rot: 0 }, { font: st.body, weight: '400', size: 38, color: '#ffffff', lineHeight: 1.25 }, rise(1.4)));
  if (a.credit?.trim()) layers.push(text('Credit', a.credit, { x: 1300, y: 1030, w: 580, h: 30, rot: 0 }, { font: st.body, weight: '400', size: 20, color: '#ffffff', align: 'right' }, fade(1.6), 0.8));
  const s = storySlide(st, 'Photo hero', layers);
  s.background = ink;
  s.recipe = { kind: 'story-hero', args: { ...a } as unknown as Record<string, unknown> };
  return s;
}

// ─── Comparison bars ────────────────────────────────────────────────────────

export interface Bar { label: string; value: number }
export interface BarsArgs {
  kicker: string; title: string; barsTitle: string; bars: Bar[]; unit: string; barsNote: string;
  cardTitle: string; big: string; bigLabel: string; big2: string; big2Label: string; takeaway: string; source: string;
}
export const BARS_EXAMPLE: BarsArgs = {
  kicker: 'Environmental injustice', title: 'The people who drive least breathe the most',
  barsTitle: 'Who drives least: no car or van at home',
  bars: [{ label: 'Black', value: 40 }, { label: 'Mixed', value: 33 }, { label: 'Asian', value: 21 }, { label: 'White', value: 17 }],
  unit: '%', barsNote: 'People in England, 2015 to 2019',
  cardTitle: 'Who breathes most: London', big: '+16–27%', bigLabel: 'more NO₂ where ethnic-minority Londoners are most likely to live',
  big2: '+13%', big2Label: 'more NO₂ in the most deprived areas', takeaway: '', source: '',
};

/** Up to six bars that wipe in to their values, beside a card with one or two numbers that count up:
 *  two sides of one argument. The bars take the theme's colour set in turn. */
export function barsSlide(st: LayoutStyle, a: BarsArgs): Slide {
  const bars = (a.bars ?? []).filter((b) => String(b.label ?? '').trim()).slice(0, 6);
  const max = Math.max(1, ...bars.map((b) => Number(b.value) || 0)) * 1.12;
  const tones = [st.accent, st.accent2 ?? st.accent, st.ink, st.muted];
  const layers: Layer[] = [];
  if (a.kicker?.trim()) layers.push(text('Kicker', a.kicker, { x: L, y: 130, w: W, h: 40, rot: 0 }, { font: st.body, weight: '600', size: 28, color: st.accent, tracking: 0.2, uppercase: true }, rise(0)));
  layers.push(text('Heading', a.title || ' ', { x: L, y: 180, w: W, h: 100, rot: 0 }, { font: st.display, weight: st.displayWeight, size: 76, color: st.ink, tracking: -0.02, lineHeight: 1.05 }, rise(0.1)));
  if (a.barsTitle?.trim()) layers.push(text('Bars title', a.barsTitle, { x: L, y: 330, w: 860, h: 40, rot: 0 }, { font: st.body, weight: '600', size: 26, color: st.muted, tracking: 0.18, uppercase: true }, rise(0.3)));
  const rowH = Math.min(80, 340 / Math.max(1, bars.length)), track = 560, x0 = 330;
  bars.forEach((b, i) => {
    const y = 400 + i * rowH, v = Number(b.value) || 0, w = Math.max(24, Math.round((track * v) / max)), c = tones[i % tones.length], d = 0.4 + i * 0.15;
    layers.push(text(`Bar label ${i + 1}`, b.label, { x: L, y: y + 4, w: 200, h: 44, rot: 0 }, { font: st.body, weight: '700', size: 30, color: st.ink }, fade(d)));
    layers.push(shape(`Track ${i + 1}`, { x: x0, y, w: track, h: 48, rot: 0 }, { fill: st.panel, radius: 24 }));
    layers.push(shape(`Bar ${i + 1}`, { x: x0, y, w, h: 48, rot: 0 }, { fill: c, radius: 24 }, { type: 'wipeRight', duration: 0.9, delay: d, easing: 'cubicOut' }));
    layers.push(text(`Bar value ${i + 1}`, `${v}${a.unit ?? ''}`, { x: x0 + w + 18, y: y + 2, w: 160, h: 44, rot: 0 }, { font: st.body, weight: '700', size: 34, color: c }, count(d, 'withSlide')));
  });
  if (a.barsNote?.trim()) layers.push(text('Bars note', a.barsNote, { x: L, y: 410 + bars.length * rowH, w: 800, h: 30, rot: 0 }, { font: st.body, weight: '400', size: 22, color: st.muted }, fade(1)));
  const cx = 1080, cw = 720;
  if (a.big?.trim() || a.big2?.trim()) {
    layers.push(shape('Card', { x: cx, y: 320, w: cw, h: 470, rot: 0 }, { fill: st.panel, radius: 32 }, { type: 'slideLeft', duration: 1, delay: 0.5, easing: 'expoOut' }));
    if (a.cardTitle?.trim()) layers.push(text('Card title', a.cardTitle, { x: cx + 50, y: 360, w: cw - 100, h: 40, rot: 0 }, { font: st.body, weight: '600', size: 26, color: st.muted, tracking: 0.18, uppercase: true }, rise(0.6)));
    if (a.big?.trim()) {
      layers.push(text('Card number', a.big, { x: cx + 50, y: 410, w: cw - 100, h: 130, rot: 0 }, { font: st.display, weight: st.displayWeight, size: 120, color: st.accent, tracking: -0.04, lineHeight: 1 }, count(0.8, 'withSlide')));
      layers.push(text('Card label', a.bigLabel ?? '', { x: cx + 50, y: 545, w: cw - 100, h: 90, rot: 0 }, { font: st.body, weight: '400', size: 28, color: st.muted, lineHeight: 1.28 }, fade(1)));
    }
    if (a.big2?.trim()) {
      layers.push(text('Card number 2', a.big2, { x: cx + 50, y: 655, w: 290, h: 90, rot: 0 }, { font: st.display, weight: st.displayWeight, size: 80, color: st.accent2 ?? st.ink, tracking: -0.04, lineHeight: 1 }, count(1.1, 'withSlide')));
      layers.push(text('Card label 2', a.big2Label ?? '', { x: cx + 340, y: 668, w: cw - 390, h: 80, rot: 0 }, { font: st.body, weight: '400', size: 28, color: st.muted, lineHeight: 1.25 }, fade(1.2)));
    }
  }
  if (a.takeaway?.trim()) layers.push(text('Takeaway', a.takeaway, { x: L, y: 830, w: W, h: 60, rot: 0 }, { font: st.body, weight: '700', size: 40, color: st.accent2 ?? st.accent }, rise(0.3, 'onClick')));
  if (a.source?.trim()) layers.push(text('Source', a.source, { x: L, y: 975, w: W, h: 34, rot: 0 }, { font: st.body, weight: '400', size: 20, color: st.muted }, fade(0.6)));
  const s = storySlide(st, 'Comparison bars', layers);
  s.recipe = { kind: 'story-bars', args: { ...a, bars } as unknown as Record<string, unknown> };
  return s;
}

// ─── Closing question ───────────────────────────────────────────────────────

export interface ClosingArgs { kicker: string; line1: string; line2: string; tag: string; detail: string; action: string; contact: string; word: string }
export const CLOSING_EXAMPLE: ClosingArgs = {
  kicker: 'Frontiers Series · 100 years from now', line1: 'Who gets to imagine', line2: 'what comes next?',
  tag: 'Our Environment', detail: 'Wed 14 October 2026 · 18:00 to 19:30 · Online', action: 'Join the series', contact: 'mark.martin@nulondon.ac.uk', word: 'FRONTIERS',
};

/** The last slide as a question, not a thank-you: two lines (the second in the accent), a tag and the
 *  when-and-where, a call to action as a button, a contact, and a big outlined word along the foot. */
export function closingSlide(st: LayoutStyle, a: ClosingArgs): Slide {
  const layers: Layer[] = [];
  if (a.word?.trim()) layers.push(text('Outlined word', a.word, { x: -40, y: 790, w: 2200, h: 380, rot: 0 }, { font: st.display, weight: '700', size: 340, color: st.accent, tracking: -0.03, lineHeight: 0.9, fit: 'grow', hollow: true, outline: 3, outlineColor: st.accent }, fade(0.2), 0.2));
  if (a.kicker?.trim()) layers.push(text('Kicker', a.kicker, { x: L, y: 140, w: W, h: 40, rot: 0 }, { font: st.body, weight: '600', size: 28, color: st.accent2 ?? st.accent, tracking: 0.2, uppercase: true }, rise(0)));
  layers.push(text('Line 1', a.line1 || ' ', { x: L, y: 200, w: W, h: 140, rot: 0 }, { font: st.display, weight: st.displayWeight, size: 128, color: st.ink, tracking: -0.035, lineHeight: 1 }, rise(0.1)));
  layers.push(text('Line 2', a.line2 || ' ', { x: L, y: 330, w: W, h: 140, rot: 0 }, { font: st.display, weight: st.displayWeight, size: 128, color: st.accent, tracking: -0.035, lineHeight: 1 }, rise(0.35)));
  if (a.tag?.trim()) layers.push(pill(st, 'Tag', a.tag, L, 540, st.accent2 ?? st.accent, 36, { type: 'pop', duration: 0.7, delay: 0.8, easing: 'backOut' }));
  if (a.detail?.trim()) layers.push(text('When and where', a.detail, { x: a.tag?.trim() ? 480 : L, y: 552, w: 1300, h: 60, rot: 0 }, { font: st.body, weight: '600', size: 40, color: st.ink }, rise(0.9)));
  if (a.action?.trim()) layers.push(pill(st, 'Action', a.action, L, 680, st.accent, 44, { type: 'pop', duration: 0.7, delay: 1.2, easing: 'backOut' }));
  if (a.contact?.trim()) layers.push(text('Contact', a.contact, { x: a.action?.trim() ? 560 : L, y: 698, w: 1200, h: 60, rot: 0 }, { font: st.body, weight: '400', size: 38, color: st.muted }, rise(1.3)));
  const s = storySlide(st, 'Closing question', layers);
  s.recipe = { kind: 'story-closing', args: { ...a } as unknown as Record<string, unknown> };
  return s;
}

/** The Story designs for the Slide designs panel, in the deck's style. */
export function storyDesigns(st: LayoutStyle): SlideDesign[] {
  return [
    { id: 'story-hero', name: 'Photo hero', group: STORY_GROUP, blurb: 'A picture across the whole slide, slowly closing in, with a fade and a huge two-part line: the turn in a story.', slide: heroSlide(st, HERO_EXAMPLE) },
    { id: 'story-numbers', name: 'Big-number row', group: STORY_GROUP, blurb: 'Two to four big numbers that count up, each with what it counts; one per click, or all with the slide. Edit them in the Slide panel.', slide: numbersSlide(st, NUMBERS_EXAMPLE) },
    { id: 'story-bars', name: 'Comparison bars', group: STORY_GROUP, blurb: 'Up to six bars that wipe in to their values, beside a card with one or two numbers: two sides of one argument.', slide: barsSlide(st, BARS_EXAMPLE) },
    { id: 'story-closing', name: 'Closing question', group: STORY_GROUP, blurb: 'End on a question: two big lines, a tag and the when-and-where, a call to action as a button, and an outlined word along the foot.', slide: closingSlide(st, CLOSING_EXAMPLE) },
  ];
}
