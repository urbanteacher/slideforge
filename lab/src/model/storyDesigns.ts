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

// ─── Numbered steps and a picture ───────────────────────────────────────────

export interface Step { head: string; body: string }
export interface StepsArgs { kicker: string; title: string; steps: Step[]; src: string; caption: string; side: 'right' | 'left' }
export const STEPS_EXAMPLE: StepsArgs = {
  kicker: 'The kit', title: 'Three parts. One big idea.',
  steps: [
    { head: 'Sense', body: 'Gas and particulate-matter sensors on an Arduino, with a screen showing pollution live.' },
    { head: 'Collect', body: 'A Raspberry Pi gathers every reading, ready to be queried.' },
    { head: 'Tell the story', body: 'Students build their own data views and apps, and share what they find.' },
  ],
  src: '/assets/air-pollution/kit-labelled.jpg', caption: '', side: 'right',
};

/** Two to five numbered steps down one side, each a head and a line, the numbers in the theme's colour
 *  set; a framed picture on the other side. The steps arrive one after another. */
export function stepsSlide(st: LayoutStyle, a: StepsArgs): Slide {
  const steps = (a.steps ?? []).filter((x) => String(x.head ?? '').trim()).slice(0, 5);
  const n = Math.max(1, steps.length), right = a.side !== 'left';
  const tx = right ? L : 1000, px = right ? 1000 : L, colW = 800;
  const tones = [st.accent, st.accent2 ?? st.accent, st.ink, st.muted, st.accent];
  const layers: Layer[] = [];
  if (a.kicker?.trim()) layers.push(text('Kicker', a.kicker, { x: tx, y: 140, w: colW, h: 40, rot: 0 }, { font: st.body, weight: '600', size: 28, color: st.accent, tracking: 0.2, uppercase: true }, rise(0)));
  layers.push(text('Heading', a.title || ' ', { x: tx, y: 190, w: colW, h: 190, rot: 0 }, { font: st.display, weight: st.displayWeight, size: 80, color: st.ink, tracking: -0.025, lineHeight: 1.04 }, rise(0.1)));
  const top = 420, rowH = Math.min(180, 520 / n);
  steps.forEach((x, i) => {
    const y = top + i * rowH, d = 0.3 + i * 0.18, c = tones[i % tones.length];
    layers.push(shape(`Step ${i + 1} disc`, { x: tx, y, w: 80, h: 80, rot: 0 }, { shape: 'ellipse', fill: c, label: String(i + 1), labelColor: deep(st), labelSize: 40, labelFont: st.body, labelWeight: '700' }, { type: 'pop', duration: 0.6, delay: d, easing: 'backOut' }));
    layers.push(text(`Step ${i + 1}`, x.head, { x: tx + 112, y: y - 2, w: colW - 112, h: 52, rot: 0 }, { font: st.body, weight: '700', size: 42, color: st.ink }, rise(d)));
    if (x.body?.trim()) layers.push(text(`Step ${i + 1} line`, x.body, { x: tx + 112, y: y + 50, w: colW - 112, h: rowH - 60, rot: 0 }, { font: st.body, weight: '400', size: 28, color: st.muted, lineHeight: 1.3 }, rise(d + 0.1)));
  });
  if (a.src) {
    layers.push(shape('Frame', { x: px, y: 160, w: 800, h: 620, rot: 0 }, { fill: '#ffffff', radius: 32 }, { type: right ? 'slideLeft' : 'slideRight', duration: 1, delay: 0.2, easing: 'expoOut' }));
    layers.push(createLayer('image', { name: 'Picture', box: { x: px, y: 160, w: 800, h: 620, rot: 0 }, params: { src: a.src, fit: 'cover', radius: 32, tone: 'light' }, anim: { type: right ? 'slideLeft' : 'slideRight', duration: 1, delay: 0.2, easing: 'expoOut' } }));
  }
  if (a.caption?.trim()) layers.push(text('Caption', a.caption, { x: px, y: 805, w: 800, h: 70, rot: 0 }, { font: st.body, weight: '400', size: 26, color: st.muted, lineHeight: 1.25 }, fade(0.8)));
  const s = storySlide(st, 'Steps and a picture', layers);
  s.recipe = { kind: 'story-steps', args: { ...a, steps } as unknown as Record<string, unknown> };
  return s;
}

// ─── Logo wall ──────────────────────────────────────────────────────────────

export interface Partner { src: string; caption: string }
export interface LogosArgs { kicker: string; title: string; partners: Partner[]; line: string }
export const LOGOS_EXAMPLE: LogosArgs = {
  kicker: 'Partners', title: 'It took a village',
  partners: [
    { src: '/assets/air-pollution/logos/city-heights-e-act-academy.png', caption: 'City Heights E-ACT Academy: where students built it' },
    { src: '/assets/air-pollution/logos/e-act.png', caption: 'E-ACT: the academy trust behind the school' },
    { src: '/assets/air-pollution/logos/james-dyson-foundation.png', caption: 'James Dyson Foundation: engineering workshops' },
    { src: '/assets/air-pollution/logos/bcs.png', caption: 'BCS: Climate Champions and the Barefoot project' },
  ],
  line: 'A school, a trust, a foundation and a profession, around one local problem.',
};

/** Two to six partners, each logo on a white card so its own colours stay true, with a line about what
 *  they brought; one line after them all. The cards arrive left to right. */
export function logosSlide(st: LayoutStyle, a: LogosArgs): Slide {
  const ps = (a.partners ?? []).filter((x) => x.src || String(x.caption ?? '').trim()).slice(0, 6);
  const n = Math.max(1, ps.length), gap = 60, cw = (W - gap * (n - 1)) / n, ch = Math.min(300, cw * 0.8);
  const layers: Layer[] = [];
  if (a.kicker?.trim()) layers.push(text('Kicker', a.kicker, { x: L, y: 140, w: W, h: 40, rot: 0 }, { font: st.body, weight: '600', size: 28, color: st.accent, tracking: 0.2, uppercase: true }, rise(0)));
  layers.push(text('Heading', a.title || ' ', { x: L, y: 190, w: W, h: 100, rot: 0 }, { font: st.display, weight: st.displayWeight, size: 88, color: st.ink, tracking: -0.025, lineHeight: 1.04 }, rise(0.1)));
  ps.forEach((x, i) => {
    const cx = L + i * (cw + gap), d = 0.3 + i * 0.15, pad = Math.round(ch * 0.15);
    layers.push(shape(`Card ${i + 1}`, { x: cx, y: 380, w: cw, h: ch, rot: 0 }, { fill: '#ffffff', radius: 28 }, rise(d)));
    if (x.src) layers.push(createLayer('image', { name: `Logo ${i + 1}`, box: { x: cx + pad, y: 380 + pad, w: cw - 2 * pad, h: ch - 2 * pad, rot: 0 }, params: { src: x.src, fit: 'contain', tone: 'light' }, anim: rise(d) }));
    if (x.caption?.trim()) layers.push(text(`Caption ${i + 1}`, x.caption, { x: cx, y: 380 + ch + 28, w: cw, h: 100, rot: 0 }, { font: st.body, weight: '400', size: 28, color: st.muted, lineHeight: 1.25 }, fade(d + 0.2)));
  });
  if (a.line?.trim()) layers.push(text('Line', a.line, { x: L, y: 880, w: W, h: 60, rot: 0 }, { font: st.body, weight: '700', size: 40, color: st.accent2 ?? st.accent }, rise(1)));
  const s = storySlide(st, 'Logo wall', layers);
  s.recipe = { kind: 'story-logos', args: { ...a, partners: ps } as unknown as Record<string, unknown> };
  return s;
}

// ─── App showcase ───────────────────────────────────────────────────────────

export interface ShowcaseArgs { kicker: string; title: string; src: string; big: string; bigLabel: string; points: string; url: string; built: string }
export const SHOWCASE_EXAMPLE: ShowcaseArgs = {
  kicker: 'The next level · Outdoors', title: 'London Air: from live sensors to health',
  src: '/assets/air-pollution/app-london-3d-crop.jpg', big: '72', bigLabel: 'monitoring sites across London, read live',
  points: 'NO₂ · PM10 · PM2.5 · O₃ · SO₂\nSource → pollutant → health, borough by borough', url: 'london-air-data.vercel.app', built: 'Three.js · Claude · Python',
};

/** A tool or app shown off: its screenshot framed large, a number that counts up and what it counts,
 *  a few lines about it, its address, and what it was built with along the foot. */
export function showcaseSlide(st: LayoutStyle, a: ShowcaseArgs): Slide {
  const layers: Layer[] = [];
  if (a.kicker?.trim()) layers.push(text('Kicker', a.kicker, { x: L, y: 130, w: W, h: 40, rot: 0 }, { font: st.body, weight: '600', size: 28, color: st.accent2 ?? st.accent, tracking: 0.2, uppercase: true }, rise(0)));
  layers.push(text('Heading', a.title || ' ', { x: L, y: 180, w: W, h: 100, rot: 0 }, { font: st.display, weight: st.displayWeight, size: 76, color: st.ink, tracking: -0.025, lineHeight: 1.04 }, rise(0.1)));
  if (a.src) {
    layers.push(shape('Frame', { x: L, y: 310, w: 1180, h: 620, rot: 0 }, { fill: st.panel, radius: 24 }, rise(0.3)));
    layers.push(createLayer('image', { name: 'Screenshot', box: { x: L + 12, y: 322, w: 1156, h: 596, rot: 0 }, params: { src: a.src, fit: 'contain', radius: 16, tone: 'light' }, anim: rise(0.3) }));
  }
  const rx = 1380, rw = 420;
  if (a.big?.trim()) {
    layers.push(text('Number', a.big, { x: rx, y: 310, w: rw, h: 150, rot: 0 }, { font: st.display, weight: st.displayWeight, size: 140, color: st.accent, tracking: -0.04, lineHeight: 1 }, count(0.5, 'withSlide')));
    layers.push(text('Number label', a.bigLabel ?? '', { x: rx, y: 465, w: rw, h: 90, rot: 0 }, { font: st.body, weight: '400', size: 30, color: st.muted, lineHeight: 1.25 }, fade(0.7)));
  }
  if (a.points?.trim()) layers.push(text('Points', a.points, { x: rx, y: 580, w: rw, h: 220, rot: 0 }, { font: st.body, weight: '700', size: 30, color: st.ink, lineHeight: 1.35 }, rise(0.8)));
  if (a.url?.trim()) layers.push(text('Address', a.url, { x: rx, y: 840, w: rw, h: 44, rot: 0 }, { font: st.body, weight: '700', size: 30, color: st.ink, underline: true }, fade(1)));
  if (a.built?.trim()) layers.push(text('Built with', `BUILT WITH  ·  ${a.built}`, { x: L, y: 960, w: W, h: 40, rot: 0 }, { font: st.body, weight: '700', size: 24, color: st.muted, tracking: 0.12 }, fade(1.1)));
  const s = storySlide(st, 'App showcase', layers);
  s.recipe = { kind: 'story-showcase', args: { ...a } as unknown as Record<string, unknown> };
  return s;
}

// ─── Number and a why card ──────────────────────────────────────────────────

export interface Reason { head: string; body: string }
export interface WhyArgs { kicker: string; title: string; big: string; bigLabel: string; second: string; secondLabel: string; cardTitle: string; reasons: Reason[]; source: string }
export const WHY_EXAMPLE: WhyArgs = {
  kicker: 'The cost in hospital beds', title: 'When the air reaches the hospital',
  big: '120,000', bigLabel: 'children in London taken to A&E or admitted to hospital with serious breathing problems in a single year',
  second: '35,000', secondLabel: 'of them admitted to a hospital ward', cardTitle: 'Why children?',
  reasons: [
    { head: 'Smaller airways', body: 'A little inflammation can close down a child’s breathing.' },
    { head: 'The big three', body: 'Bronchiolitis, severe asthma attacks and pneumonia.' },
    { head: 'Where they live', body: '41% higher admission rates for respiratory infections in England’s most deprived areas.' },
  ],
  source: '',
};

/** One headline number that counts up, a second that arrives on a click, and a card of up to three
 *  numbered reasons: what is happening, and why. */
export function whySlide(st: LayoutStyle, a: WhyArgs): Slide {
  const reasons = (a.reasons ?? []).filter((r) => String(r.head ?? '').trim()).slice(0, 3);
  const tones = [st.accent, st.accent2 ?? st.accent, st.ink];
  const layers: Layer[] = [];
  if (a.kicker?.trim()) layers.push(text('Kicker', a.kicker, { x: L, y: 140, w: W, h: 40, rot: 0 }, { font: st.body, weight: '600', size: 28, color: st.accent2 ?? st.accent, tracking: 0.2, uppercase: true }, rise(0)));
  layers.push(text('Heading', a.title || ' ', { x: L, y: 190, w: W, h: 100, rot: 0 }, { font: st.display, weight: st.displayWeight, size: 80, color: st.ink, tracking: -0.025, lineHeight: 1.04 }, rise(0.1)));
  const lw = reasons.length ? 900 : W;
  if (a.big?.trim()) {
    layers.push(text('Number', a.big, { x: L, y: 330, w: lw, h: 220, rot: 0 }, { font: st.display, weight: st.displayWeight, size: 210, color: st.accent2 ?? st.accent, tracking: -0.045, lineHeight: 1, valign: 'bottom' }, count(0.3, 'withSlide')));
    layers.push(text('Number label', a.bigLabel ?? '', { x: L, y: 560, w: lw, h: 130, rot: 0 }, { font: st.body, weight: '400', size: 36, color: st.ink, lineHeight: 1.28 }, rise(0.6)));
  }
  if (a.second?.trim()) {
    layers.push(text('Second number', a.second, { x: L, y: 730, w: 440, h: 130, rot: 0 }, { font: st.display, weight: st.displayWeight, size: 120, color: st.ink, tracking: -0.04, lineHeight: 1 }, count(0.4, 'onClick')));
    layers.push(text('Second label', a.secondLabel ?? '', { x: L + 460, y: 772, w: lw - 460, h: 80, rot: 0 }, { font: st.body, weight: '400', size: 34, color: st.muted, lineHeight: 1.25 }, fade(0.3, 'afterPrev')));
  }
  if (reasons.length) {
    const cx = 1110, cw = 690;
    layers.push(shape('Card', { x: cx, y: 330, w: cw, h: 610, rot: 0 }, { fill: st.panel, radius: 32 }, { type: 'slideLeft', duration: 1, delay: 0.4, easing: 'expoOut' }));
    if (a.cardTitle?.trim()) layers.push(text('Card title', a.cardTitle, { x: cx + 50, y: 375, w: cw - 100, h: 40, rot: 0 }, { font: st.body, weight: '600', size: 26, color: st.muted, tracking: 0.18, uppercase: true }, rise(0.6)));
    reasons.forEach((r, j) => {
      const y = 445 + j * 160, d = 0.7 + j * 0.15;
      layers.push(shape(`Reason ${j + 1} disc`, { x: cx + 50, y, w: 72, h: 72, rot: 0 }, { shape: 'ellipse', fill: tones[j % tones.length], label: String(j + 1), labelColor: deep(st), labelSize: 36, labelFont: st.body, labelWeight: '700' }, { type: 'pop', duration: 0.6, delay: d, easing: 'backOut' }));
      layers.push(text(`Reason ${j + 1}`, r.head, { x: cx + 150, y: y - 2, w: cw - 190, h: 50, rot: 0 }, { font: st.body, weight: '700', size: 36, color: st.ink }, rise(d)));
      if (r.body?.trim()) layers.push(text(`Reason ${j + 1} line`, r.body, { x: cx + 150, y: y + 46, w: cw - 190, h: 100, rot: 0 }, { font: st.body, weight: '400', size: 27, color: st.muted, lineHeight: 1.3 }, rise(d + 0.1)));
    });
  }
  if (a.source?.trim()) layers.push(text('Source', a.source, { x: L, y: 975, w: W, h: 34, rot: 0 }, { font: st.body, weight: '400', size: 20, color: st.muted }, fade(0.6)));
  const s = storySlide(st, 'Number and why', layers);
  s.recipe = { kind: 'story-why', args: { ...a, reasons } as unknown as Record<string, unknown> };
  return s;
}

// ─── Photo mosaic ───────────────────────────────────────────────────────────

export interface MosaicArgs { srcs: string[]; line1: string; line2: string }
export const MOSAIC_EXAMPLE: MosaicArgs = {
  srcs: ['/assets/air-pollution/student-ventilator.jpg', '/assets/air-pollution/city-heights-students.jpg', '/assets/air-pollution/student-build.jpg', '/assets/air-pollution/classroom-workshop.jpg'],
  line1: 'Not participants.', line2: 'Innovators.',
};

/** Four pictures edge to edge — one large, three beside it — with a fade over the large one and two
 *  lines on it, the second in the accent. People at work, and what that makes them. */
export function mosaicSlide(st: LayoutStyle, a: MosaicArgs): Slide {
  const srcs = [...(a.srcs ?? [])].slice(0, 4);
  while (srcs.length < 4) srcs.push('');
  const ink = shade(st), g = 10;
  const boxes: Box[] = [
    { x: 0, y: 0, w: 1100, h: 1080, rot: 0 },
    { x: 1100 + g, y: 0, w: (820 - 2 * g) / 2, h: 535, rot: 0 },
    { x: 1100 + g + (820 - 2 * g) / 2 + g, y: 0, w: (820 - 2 * g) / 2, h: 535, rot: 0 },
    { x: 1100 + g, y: 545, w: 810, h: 535, rot: 0 },
  ];
  const layers: Layer[] = [];
  boxes.forEach((b, i) => {
    layers.push(srcs[i]
      ? createLayer('image', { name: `Picture ${i + 1}`, box: b, params: { src: srcs[i], fit: 'cover', tone: 'light' }, anim: fade(i * 0.15) })
      : shape(`Picture ${i + 1} (empty)`, b, { fill: st.panel }));
  });
  const fadeBottom = () => shape('Fade for text', { x: 0, y: 480, w: 1100, h: 600, rot: 0 }, { fill: ink, fillOpacity: 0, gradient: true, fill2: ink, fill2Opacity: 0.95, angle: 90 });
  layers.push(fadeBottom(), fadeBottom());
  layers.push(text('Line 1', a.line1 || ' ', { x: L, y: 700, w: 960, h: 110, rot: 0 }, { font: st.display, weight: st.displayWeight, size: 96, color: '#ffffff', tracking: -0.03, lineHeight: 1 }, rise(0.8)));
  layers.push(text('Line 2', a.line2 || ' ', { x: L, y: 800, w: 960, h: 150, rot: 0 }, { font: st.display, weight: st.displayWeight, size: 136, color: st.accent2 ?? st.accent, tracking: -0.04, lineHeight: 1 }, rise(1.3)));
  const s = storySlide(st, 'Photo mosaic', layers);
  s.background = ink;
  s.recipe = { kind: 'story-mosaic', args: { ...a, srcs } as unknown as Record<string, unknown> };
  return s;
}

// ─── Two routes ─────────────────────────────────────────────────────────────

export interface RoutesArgs {
  kicker: string; title: string; big: string; bigLabel: string; stat2: string; stat2Label: string; stat3: string; stat3Label: string;
  from: string; to: string; worse: string; better: string; cardTitle: string; source: string;
}
export const ROUTES_EXAMPLE: RoutesArgs = {
  kicker: 'Children as scientists · Breathe London', title: 'Backpacks that measure the school run',
  big: '5×', bigLabel: 'more nitrogen dioxide (NO₂) on the walk to school than in the classroom, on average',
  stat2: '250', stat2Label: 'pupils in five boroughs wore sensor backpacks for a week', stat3: '31%', stat3Label: 'of families changed how they travel to school',
  from: 'Home', to: 'School', worse: 'Main road: the highest exposure', better: 'Back streets: the lowest', cardTitle: 'Two ways to school', source: '',
};

/** A headline number and two more beside a simple diagram: two ways from one place to another, the
 *  worse one arching over in one colour, the better one dipping under in another. Illustrative. */
export function routesSlide(st: LayoutStyle, a: RoutesArgs): Slide {
  const bad = st.accent2 && st.accent2 !== st.accent ? st.accent : st.ink, good = st.accent2 ?? st.accent;
  const layers: Layer[] = [];
  if (a.kicker?.trim()) layers.push(text('Kicker', a.kicker, { x: L, y: 130, w: W, h: 40, rot: 0 }, { font: st.body, weight: '600', size: 28, color: st.accent, tracking: 0.2, uppercase: true }, rise(0)));
  layers.push(text('Heading', a.title || ' ', { x: L, y: 180, w: W, h: 100, rot: 0 }, { font: st.display, weight: st.displayWeight, size: 80, color: st.ink, tracking: -0.025, lineHeight: 1.04 }, rise(0.1)));
  if (a.big?.trim()) {
    layers.push(text('Number', a.big, { x: L, y: 320, w: 760, h: 220, rot: 0 }, { font: st.display, weight: st.displayWeight, size: 220, color: bad, tracking: -0.05, lineHeight: 1 }, count(0.3, 'withSlide')));
    layers.push(text('Number label', a.bigLabel ?? '', { x: L, y: 560, w: 760, h: 130, rot: 0 }, { font: st.body, weight: '400', size: 36, color: st.ink, lineHeight: 1.25 }, rise(0.5)));
  }
  [[a.stat2, a.stat2Label, st.ink, 720], [a.stat3, a.stat3Label, good, 850]].forEach(([v, lab, c, y], k) => {
    if (!String(v ?? '').trim()) return;
    layers.push(text(`Stat ${k + 2}`, String(v), { x: L, y: Number(y), w: 260, h: 110, rot: 0 }, { font: st.display, weight: st.displayWeight, size: 96, color: String(c), tracking: -0.04, lineHeight: 1 }, count(0.7 + k * 0.2, 'withSlide')));
    layers.push(text(`Stat ${k + 2} label`, String(lab ?? ''), { x: L + 260, y: Number(y) + 22, w: 520, h: 90, rot: 0 }, { font: st.body, weight: '400', size: 30, color: st.muted, lineHeight: 1.25 }, fade(0.8 + k * 0.2)));
  });
  const cx = 1000, cw = 800, cy = 320, ch = 600, y0 = 645, x1 = 1095, x2 = 1690;
  layers.push(shape('Diagram card', { x: cx, y: cy, w: cw, h: ch, rot: 0 }, { fill: st.panel, radius: 32 }, { type: 'slideLeft', duration: 1, delay: 0.3, easing: 'expoOut' }));
  if (a.cardTitle?.trim()) layers.push(text('Diagram title', a.cardTitle.toUpperCase(), { x: cx + 50, y: cy + 40, w: cw - 100, h: 30, rot: 0 }, { font: st.body, weight: '700', size: 20, color: st.muted, tracking: 0.18 }, fade(0.4)));
  const arc = (yMid: number, color: string, width: number, d: number, name: string): Layer[] => {
    const mid = (x1 + x2) / 2, top = Math.min(y0, yMid), h = Math.abs(y0 - yMid), up = yMid < y0;
    const wipe = (dd: number): Partial<Anim> => ({ type: 'wipeRight', duration: 0.7, delay: dd, easing: 'cubicInOut' });
    const mk = (x: number, rise2: string, dd: number) => shape(name, { x, y: top, w: mid - x1, h, rot: 0 }, { shape: 'curve', fill: color, strokeWidth: width, rise: rise2 }, wipe(dd));
    return [mk(x1, up ? 'up' : 'down', d), mk(mid, up ? 'down' : 'up', d + 0.6)];
  };
  layers.push(...arc(470, bad, 26, 0.9, 'Worse route'), ...arc(815, good, 12, 1.4, 'Better route'));
  layers.push(shape('From', { x: 1060, y: 610, w: 70, h: 70, rot: 0 }, { shape: 'ellipse', fill: '#ffffff', label: a.from || 'A', labelColor: '#111111', labelSize: 16, labelFont: st.body, labelWeight: '700' }, { type: 'pop', duration: 0.6, delay: 0.5, easing: 'backOut' }));
  layers.push(shape('To', { x: 1650, y: 600, w: 90, h: 90, rot: 0 }, { shape: 'ellipse', fill: st.accent, label: a.to || 'B', labelColor: deep(st), labelSize: 18, labelFont: st.body, labelWeight: '700' }, { type: 'pop', duration: 0.6, delay: 0.6, easing: 'backOut' }));
  if (a.worse?.trim()) layers.push(text('Worse label', a.worse, { x: 1180, y: 405, w: 600, h: 40, rot: 0 }, { font: st.body, weight: '700', size: 30, color: bad }, fade(1.6)));
  if (a.better?.trim()) layers.push(text('Better label', a.better, { x: 1180, y: 850, w: 600, h: 40, rot: 0 }, { font: st.body, weight: '700', size: 30, color: good, align: 'center' }, fade(1.9)));
  layers.push(text('Note', 'Illustrative', { x: cx + 50, y: cy + ch - 50, w: 300, h: 26, rot: 0 }, { font: st.body, weight: '400', size: 18, color: st.muted }, fade(2)));
  if (a.source?.trim()) layers.push(text('Source', a.source, { x: L, y: 985, w: W, h: 30, rot: 0 }, { font: st.body, weight: '400', size: 20, color: st.muted }, fade(0.6)));
  const s = storySlide(st, 'Two routes', layers);
  s.recipe = { kind: 'story-routes', args: { ...a } as unknown as Record<string, unknown> };
  return s;
}

// ─── Wall of phrases ────────────────────────────────────────────────────────

export interface WallArgs { phrases: string; highlights: string; caption: string }
export const WALL_EXAMPLE: WallArgs = {
  phrases: 'The boss won’t go for that. It’s not us. It won’t fit into our system. We’re not ready for that yet. I don’t think it will work. It’s too complicated. It’s too expensive. Who says? It can’t be done. Let’s do more research. We’ve already tried that. That’s been done before. It’s not how we do things here. Yes, but… Great idea, but… Maybe next time. Be realistic. Sounds crazy! Nobody does that. You can’t fight City Hall. Let’s not rock the boat. You could lose your job for that.',
  highlights: 'It can’t be done.\nYes, but…\nWe’re not ready for that yet.\nYou could lose your job for that.',
  caption: 'What every innovator hears.',
};

/** A wall of faded phrases filling the slide (sized to fill it, however many there are), word by word, and up to four of them stamped over it,
 *  tilted, in the theme's colours; one caption at the foot. The resistance before the turn. */
export function wallSlide(st: LayoutStyle, a: WallArgs): Slide {
  const ink = shade(st);
  const hl = String(a.highlights ?? '').split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 4);
  const tones = ['#ffffff', st.accent2 ?? st.accent, st.accent, '#ffffff'];
  const spots = [{ x: 260, y: 190, r: -3 }, { x: 1080, y: 330, r: 2.5 }, { x: 160, y: 560, r: -1.5 }, { x: 700, y: 780, r: 2 }];
  const layers: Layer[] = [];
  layers.push(text('Wall of phrases', a.phrases || ' ', { x: 70, y: 50, w: 1780, h: 980, rot: 0 }, { font: st.body, weight: '400', size: 35, color: mixInk(st), lineHeight: 1.42, fit: 'fill' }, { type: 'words', duration: 0.5, delay: 0, stagger: 0.012, easing: 'cubicOut', feel: 'fade' }));
  hl.forEach((h, i) => {
    const p = spots[i];
    layers.push(text(`Highlight ${i + 1}`, h, { x: p.x, y: p.y, w: 1150, h: 90, rot: p.r }, { font: st.body, weight: '700', size: 72, color: tones[i % tones.length], fit: 'grow', block: 'hug', blockColor: ink, blockPad: 18, blockRadius: 10 }, { type: 'pop', duration: 0.7, delay: 1.6 + i * 0.6, easing: 'backOut' }));
  });
  if (a.caption?.trim()) layers.push(text('Caption', a.caption, { x: 70, y: 985, w: 1200, h: 50, rot: 0 }, { font: st.body, weight: '700', size: 34, color: '#ffffff', fit: 'grow', block: 'hug', blockColor: ink, blockPad: 14, blockRadius: 8 }, fade(1.6 + hl.length * 0.6)));
  const s = storySlide({ ...st, ground: ink, glow: undefined }, 'Wall of phrases', layers);
  s.recipe = { kind: 'story-wall', args: { ...a } as unknown as Record<string, unknown> };
  return s;
}
/** The wall's phrases: the ground's own grey, a step lighter, so they read as texture rather than text. */
function mixInk(st: LayoutStyle) {
  const c = shade(st), n = parseInt(c.slice(1), 16), lift = (v: number) => Math.min(255, Math.round(v + (255 - v) * 0.22));
  const r = lift(n >> 16), g = lift((n >> 8) & 255), b = lift(n & 255);
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

// ─── Cover with a portrait ──────────────────────────────────────────────────

export interface CoverArgs { kicker: string; line1: string; line2: string; sub: string; name: string; role: string; src: string; word: string; logos: string[] }
export const COVER_EXAMPLE: CoverArgs = {
  kicker: 'Frontiers Series · Our Environment', line1: 'From a school street', line2: 'to the world stage',
  sub: 'How a local air-pollution problem turned school students into innovators.', name: 'Mark Martin MBE CITP', role: 'Experiential learning · The Air Pollution Project',
  src: '/assets/air-pollution/mark-martin.png', word: 'AIR', logos: ['/assets/air-pollution/ukbt-institute.png', '/assets/air-pollution/black-in-academia.png'],
};

/** A cover: the title in two lines (the second in the accent), a line about the talk, the speaker's
 *  name and role, their cut-out portrait on a disc in the accent, a big outlined word behind it, and
 *  up to three logos across the top. */
export function coverSlide(st: LayoutStyle, a: CoverArgs): Slide {
  const logos = (a.logos ?? []).filter(Boolean).slice(0, 3);
  const layers: Layer[] = [];
  if (a.word?.trim()) layers.push(text('Outlined word', a.word, { x: 1030, y: 70, w: 1100, h: 560, rot: 0 }, { font: st.display, weight: '700', size: 560, color: st.accent, tracking: -0.04, lineHeight: 0.9, fit: 'grow', hollow: true, outline: 3, outlineColor: st.accent }, fade(0.1), 0.22));
  if (a.src) {
    layers.push(shape('Disc', { x: 1180, y: 360, w: 600, h: 600, rot: 0 }, { shape: 'ellipse', fill: st.accent }, { type: 'zoomIn', duration: 1.1, delay: 0.3, easing: 'expoOut' }));
    layers.push(createLayer('image', { name: 'Portrait', box: { x: 1225, y: 455, w: 500, h: 625, rot: 0 }, params: { src: a.src, fit: 'contain', focus: [0.5, 1], tone: 'light' }, anim: rise(0.6) }));
  }
  logos.forEach((src, i) => layers.push(createLayer('image', { name: `Logo ${i + 1}`, box: { x: L + i * 260, y: 92, w: 220, h: 64, rot: 0 }, params: { src, fit: 'contain', tone: 'light' }, anim: fade(0.2 + i * 0.1) })));
  if (a.kicker?.trim()) layers.push(text('Kicker', a.kicker, { x: L, y: 290, w: 1100, h: 40, rot: 0 }, { font: st.body, weight: '600', size: 28, color: st.accent2 ?? st.accent, tracking: 0.2, uppercase: true }, rise(0)));
  layers.push(text('Title line 1', a.line1 || ' ', { x: L, y: 350, w: 1150, h: 130, rot: 0 }, { font: st.display, weight: st.displayWeight, size: 118, color: st.ink, tracking: -0.03, lineHeight: 1 }, rise(0.15)));
  if (a.line2?.trim()) layers.push(text('Title line 2', a.line2, { x: L, y: 474, w: 1150, h: 130, rot: 0 }, { font: st.display, weight: st.displayWeight, size: 118, color: st.accent, tracking: -0.03, lineHeight: 1 }, rise(0.3)));
  if (a.sub?.trim()) layers.push(text('Line about the talk', a.sub, { x: L, y: 650, w: 900, h: 110, rot: 0 }, { font: st.body, weight: '400', size: 40, color: st.muted, lineHeight: 1.3 }, rise(0.5)));
  if (a.name?.trim()) layers.push(text('Speaker', a.name, { x: L, y: 820, w: 1000, h: 56, rot: 0 }, { font: st.body, weight: '700', size: 46, color: st.ink }, rise(0.7)));
  if (a.role?.trim()) layers.push(text('Role', a.role, { x: L, y: 880, w: 1000, h: 40, rot: 0 }, { font: st.body, weight: '400', size: 30, color: st.muted }, rise(0.8)));
  const s = storySlide(st, 'Cover with portrait', layers);
  s.recipe = { kind: 'story-cover', args: { ...a, logos } as unknown as Record<string, unknown> };
  return s;
}

/** The Story designs for the Slide designs panel, in the deck's style. */
export function storyDesigns(st: LayoutStyle): SlideDesign[] {
  return [
    { id: 'story-cover', name: 'Cover with portrait', group: STORY_GROUP, blurb: 'A cover: a two-line title, the speaker’s cut-out portrait on a disc in the accent, a big outlined word and logos.', slide: coverSlide(st, COVER_EXAMPLE) },
    { id: 'story-hero', name: 'Photo hero', group: STORY_GROUP, blurb: 'A picture across the whole slide, slowly closing in, with a fade and a huge two-part line: the turn in a story.', slide: heroSlide(st, HERO_EXAMPLE) },
    { id: 'story-numbers', name: 'Big-number row', group: STORY_GROUP, blurb: 'Two to four big numbers that count up, each with what it counts; one per click, or all with the slide. Edit them in the Slide panel.', slide: numbersSlide(st, NUMBERS_EXAMPLE) },
    { id: 'story-steps', name: 'Steps and a picture', group: STORY_GROUP, blurb: 'Two to five numbered steps beside a framed picture, arriving one after another.', slide: stepsSlide(st, STEPS_EXAMPLE) },
    { id: 'story-logos', name: 'Logo wall', group: STORY_GROUP, blurb: 'Two to six partners, each logo on a white card with what they brought, and a line after them all.', slide: logosSlide(st, LOGOS_EXAMPLE) },
    { id: 'story-showcase', name: 'App showcase', group: STORY_GROUP, blurb: 'A tool shown off: its screenshot framed large, a number that counts up, a few lines, its address and what it was built with.', slide: showcaseSlide(st, SHOWCASE_EXAMPLE) },
    { id: 'story-why', name: 'Number and why', group: STORY_GROUP, blurb: 'A headline number that counts up, a second on a click, and a card of up to three numbered reasons.', slide: whySlide(st, WHY_EXAMPLE) },
    { id: 'story-mosaic', name: 'Photo mosaic', group: STORY_GROUP, blurb: 'Four pictures edge to edge, one large with a fade and two big lines on it.', slide: mosaicSlide(st, MOSAIC_EXAMPLE) },
    { id: 'story-routes', name: 'Two routes', group: STORY_GROUP, blurb: 'Numbers beside an illustrative diagram of two ways from one place to another: the worse arching over, the better dipping under.', slide: routesSlide(st, ROUTES_EXAMPLE) },
    { id: 'story-wall', name: 'Wall of phrases', group: STORY_GROUP, blurb: 'A wall of faded phrases filling the slide, with up to four stamped over it: the resistance before the turn.', slide: wallSlide(st, WALL_EXAMPLE) },
    { id: 'story-bars', name: 'Comparison bars', group: STORY_GROUP, blurb: 'Up to six bars that wipe in to their values, beside a card with one or two numbers: two sides of one argument.', slide: barsSlide(st, BARS_EXAMPLE) },
    { id: 'story-closing', name: 'Closing question', group: STORY_GROUP, blurb: 'End on a question: two big lines, a tag and the when-and-where, a call to action as a button, and an outlined word along the foot.', slide: closingSlide(st, CLOSING_EXAMPLE) },
  ];
}
