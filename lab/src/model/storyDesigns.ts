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

const text = (name: string, value: string, box: Box, params: Params, anim: Partial<Anim>): Layer =>
  createLayer('text', { name, box, params: { text: value, fit: 'shrink', lineHeight: 1.15, tracking: 0, ...params }, anim });
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

/** The Story designs for the Slide designs panel, in the deck's style. */
export function storyDesigns(st: LayoutStyle): SlideDesign[] {
  return [
    { id: 'story-numbers', name: 'Big-number row', group: STORY_GROUP, blurb: 'Two to four big numbers that count up, each with what it counts; one per click, or all with the slide. Edit them in the Slide panel.', slide: numbersSlide(st, NUMBERS_EXAMPLE) },
  ];
}
