import skyline from '../assets/nul/nu-london-skyline.png?inline';
import nulLogo from '../assets/nul/nu-london-logo.png?inline';
import monogram from '../assets/nul/nu-monogram.svg?raw';
import chevron from '../assets/ukbt/ukbt-chevron.svg?raw';
// The waves and the 3D objects are files the lab serves, not data: inlined, every slide that shows
// one would carry its own copy of the picture into the saved lesson.
import waves from '../assets/ukbt/ukbt-waves.svg?url';
import asterisk from '../assets/ukbt/objects/ukbt-asterisk.png?url';
import coil from '../assets/ukbt/objects/ukbt-coil.png?url';
import cone from '../assets/ukbt/objects/ukbt-cone.png?url';
import disc from '../assets/ukbt/objects/ukbt-disc.png?url';
import dome from '../assets/ukbt/objects/ukbt-dome.png?url';
import knot from '../assets/ukbt/objects/ukbt-knot.png?url';
import shell from '../assets/ukbt/objects/ukbt-shell.png?url';
import torus from '../assets/ukbt/objects/ukbt-torus.png?url';
import { createLayer } from './defaults';
import type { Box, Layer, Slide } from './types';

// A SlideForge theme's artwork, built in the lab. SlideForge's themes paint decoration from their
// stylesheets — NU London's skyline and N, UK Black Tech's waves, chevrons and 3D objects, AI
// Awareness Day's accent rule and fold — on the slide types each one names, and a lesson's slides
// carry none of it. So a converted lesson came into the lab without it. Here each piece is an
// ordinary layer, placed where the theme's stylesheet puts it (css/northeastern.css, css/ukbt.css,
// css/aiad26.css; SlideForge's 1280 × 720 slide at the lab's 1.5×), behind the words unless the
// theme paints it in front. Every one is named "Theme · …", so it can be moved, restyled or
// deleted on the canvas like anything else, and a copy can tell whether a slide already has it.

export type Ground = 'working' | 'quiet' | 'loud';
export const ART = 'Theme · ';
export const hasThemeArt = (s: Slide) => s.layers.some((l) => l.name.startsWith(ART));

/** What a slide's artwork depends on: its theme, where it sits in the lesson, the lesson's name. */
export interface ArtContext { theme: string; index: number; deckTitle: string }
/** The SlideForge slide the artwork is for: its type and, for a poster cover, its picture. */
interface ArtSlide { type: string; image?: string }

const X = 1.5; // SlideForge's slide px to the lab's
const at = (x: number, y: number, w: number, h: number): Box => ({ x: x * X, y: y * X, w: w * X, h: h * X, rot: 0 });
const svg = (raw: string, fill: string) =>
  'data:image/svg+xml;base64,' + btoa(raw.replace(/currentColor|#fff(?:fff)?\b/g, fill));
const still = { type: 'none' as const, duration: 0 };
const picture = (name: string, src: string, box: Box, opacity = 1, extra: Record<string, unknown> = {}) =>
  createLayer('image', { name: ART + name, box, opacity, params: { src, fit: 'contain', ...extra }, anim: still });

/** The theme family a SlideForge theme belongs to, and for AI Awareness Day its strand. */
function family(theme: string): { id: 'nul' | 'ukbt' | 'ukbt-institute' | 'aiad26' | 'aiad27' | ''; strand: string } {
  if (theme.startsWith('northeastern')) return { id: 'nul', strand: '' };
  if (theme.startsWith('ukbt-institute')) return { id: 'ukbt-institute', strand: '' };
  if (theme.startsWith('ukbt')) return { id: 'ukbt', strand: '' };
  const m = /^(aiad2[67])-([a-z]+)/.exec(theme);
  if (m) return { id: m[1] as 'aiad26' | 'aiad27', strand: m[2] };
  return { id: '', strand: '' };
}

// The ground each theme sets a slide type on, where it differs from the converter's own choice
// (title, section and quote on the quiet ground). NU London's section breaks are Northeastern red;
// UK Black Tech's covers are its working navy and its section breaks green; AI Awareness 2026's
// covers are white, and 2027's covers, statements and key facts are the strand's colour.
const GROUNDS: Record<string, Record<string, Ground>> = {
  nul: { title: 'quiet', section: 'loud', quote: 'quiet' },
  ukbt: { title: 'working', section: 'loud' },
  'ukbt-institute': { title: 'working', section: 'loud' },
  aiad26: { title: 'working', section: 'quiet' },
  aiad27: { title: 'loud', statement: 'loud', keyfact: 'loud', quote: 'quiet', journey: 'quiet' },
};

/** The ground the theme sets this slide type on, when the theme says. */
export function themeGround(theme: string, type: string): Ground | undefined {
  return GROUNDS[family(theme).id]?.[type];
}

/** AI Awareness Day 2026's accent per strand (css/aiad26.css --aiad-accent). */
const AIAD26: Record<string, string> = { safe: '#00c4ee', smart: '#ff6734', creative: '#795bff', responsible: '#00a896', future: '#ff7eed' };

// UK Black Tech's 3D objects: one per slide, in the order of its place in the lesson (css/ukbt.css,
// data-art-index = index % 4). The small one sits in one of five places (data-art-slot = index % 5).
const OBJECTS = { ukbt: [coil, asterisk, cone, torus], 'ukbt-institute': [knot, disc, shell, dome] };
const SLOTS: [number, number, number][] = [[1138, 572, 200], [1118, 246, 228], [-62, 582, 196], [1148, 104, 184], [880, 582, 212]];
const KEYFACT_SLOTS: [number, number][] = [[1088, 522], [1096, 235], [-62, 528], [1082, 104], [842, 544]];
/** Slide types the small object stays off: they fill the slide with a chart, a table or a picture. */
const NO_OBJECT = new Set(['title', 'section', 'chart', 'table', 'stats', 'funnel', 'quiz', 'game', 'image', 'gallery', 'split']);

/** One piece of artwork, and the ground it was drawn for (a copy on another ground is left without it). */
interface Piece { layer: Layer; front?: boolean; ground?: Ground }

function pieces(s: ArtSlide, ctx: ArtContext, img: (p?: string) => string): Piece[] {
  const { id, strand } = family(ctx.theme);
  const out: Piece[] = [];
  const t = s.type;
  if (id === 'nul') {
    const eyebrow = (text: string, tracking: number, color: string, opacity: number, w: number) =>
      createLayer('text', { name: ART + 'Eyebrow', box: at(92, 54, w, 40), opacity, anim: still, params: {
        text: text.toUpperCase(), font: 'Avenir Next', weight: '700', size: 18, color, tracking, lineHeight: 1.6, fit: 'shrink' } });
    const logo = picture('Logo', nulLogo, at(1060, 40, 170, 40), 1, { tone: 'dark' });
    if (t === 'title') {
      out.push(
        { ground: 'quiet', layer: createLayer('linear', { name: ART + 'Ground', anim: still, params: { colorA: '#123f68', colorB: '#071f35', angle: 45, bias: 0.52 } }) },
        { layer: picture('Skyline', skyline, at(0, 530, 190 * 1458 / 533, 190), 0.34) },
        { layer: picture('N', svg(monogram, '#c8102e'), at(530, 196, 900, 694), 0.92) },
        { layer: eyebrow(ctx.deckTitle, 0.16, '#7fa6c6', 1, 888), front: true },
        { layer: logo, front: true },
      );
    } else if (t === 'section') {
      out.push(
        { ground: 'loud', layer: createLayer('linear', { name: ART + 'Ground', anim: still, params: { colorA: '#d41733', colorB: '#9b0c24', angle: 60, bias: 0.55 } }) },
        { layer: picture('N', svg(monogram, '#ffffff'), at(600, 146, 900, 694), 0.13) },
        { layer: eyebrow('Northeastern University London', 0.32, '#ffffff', 0.7, 900), front: true },
        { layer: logo, front: true },
      );
    }
  } else if (id === 'ukbt' || id === 'ukbt-institute') {
    const object = OBJECTS[id][((ctx.index % 4) + 4) % 4];
    out.push({ layer: picture('Waves', waves, at(0, 0, 1280, 720), t === 'section' ? 0.45 : 1) });
    const chevrons = (back: [string, number], front: [string, number]) => [
      { layer: picture('Chevron, back', svg(chevron, back[0]), at(705, -61.3, 604, 929), back[1]) },
      { layer: picture('Chevron, front', svg(chevron, front[0]), at(908, -61.3, 604, 929), front[1]) },
    ];
    if (t === 'title') {
      out.push(...chevrons(['#ffffff', 0.085], ['#00c57f', 0.17]), { layer: picture('Object', object, at(856, 304, 470, 470)) });
    } else if (t === 'section') {
      // UKBT Institute's section breaks are lime, UK Black Tech's its green (the loud ground itself).
      if (id === 'ukbt-institute') out.push({ ground: 'loud', layer: createLayer('solid', { name: ART + 'Ground', anim: still, params: { color: '#cefd85' } }) });
      out.push(...chevrons(['#ffffff', 0.34], ['#17201c', 0.15]));
    } else if (!NO_OBJECT.has(t)) {
      const slot = ((ctx.index % 5) + 5) % 5;
      const [x, y, size] = SLOTS[slot];
      const box = t === 'keyfact' ? at(KEYFACT_SLOTS[slot][0], KEYFACT_SLOTS[slot][1], 250, 250) : at(x, y, size, size);
      out.push({ layer: picture('Object', object, box) });
    }
  } else if (id === 'aiad26') {
    const accent = AIAD26[strand] ?? AIAD26.safe;
    // The strand's rule down the left edge of every slide, in front of the words as the theme has it.
    out.push({ front: true, layer: createLayer('shape', { name: ART + 'Edge', box: at(0, 0, 10, 720), anim: still, params: { shape: 'rect', radius: 0, fill: accent, strokeWidth: 0 } }) });
    if (t === 'title' || t === 'section') {
      // The fold: the corner of a square turned up, cropped by the slide's edges.
      const fold = `<svg xmlns="http://www.w3.org/2000/svg" width="630" height="285" viewBox="860 530 420 190"><polygon points="1090,530 860,530 860,645 975,760 1320,760" fill="${accent}"/></svg>`;
      out.push({ layer: createLayer('image', { name: ART + 'Fold', box: at(860, 530, 420, 190), opacity: t === 'section' ? 0.3 : 0.2, anim: still, params: { src: 'data:image/svg+xml;base64,' + btoa(fold), fit: 'contain' } }) });
      // The seam: a 3px line from the fold's corner to the slide's (as css/aiad26.css means it to be).
      const seam = `<svg xmlns="http://www.w3.org/2000/svg" width="285" height="285" viewBox="1090 530 190 190"><line x1="1090" y1="530" x2="1280" y2="720" stroke="${accent}" stroke-width="3"/></svg>`;
      out.push({ layer: createLayer('image', { name: ART + 'Seam', box: at(1090, 530, 190, 190), opacity: 0.5, anim: still, params: { src: 'data:image/svg+xml;base64,' + btoa(seam), fit: 'contain' } }) });
    }
  } else if (id === 'aiad27' && t === 'title' && s.image) {
    // The campaign's poster cover: the strand's chamfered panel and glyph, beside the title.
    out.push({ layer: picture('Poster', img(s.image), at(733.5, 124, 493.7, 504)) });
  }
  return out;
}

/** The theme's artwork onto one lab slide: behind its words, straight above its ground, or in front
 *  where the theme paints it there. A piece drawn for another ground than the slide's is left out.
 *  Nothing is added to a slide that already has theme artwork. How many layers were added. */
export function addThemeArt(slide: Slide, s: ArtSlide, ctx: ArtContext, img: (p?: string) => string): number {
  if (hasThemeArt(slide)) return 0;
  const ground = slide.ground ?? 'working';
  const list = pieces(s, ctx, img).filter((p) => !p.ground || p.ground === ground);
  if (!list.length) return 0;
  const back = list.filter((p) => !p.front).map((p) => p.layer);
  const front = list.filter((p) => p.front).map((p) => p.layer);
  // Above the ground: the first layer, when it is one (every lab layout starts with its ground).
  const base = slide.layers[0] && slide.layers[0].kind === 'solid' ? 1 : 0;
  slide.layers.splice(base, 0, ...back);
  slide.layers.push(...front);
  // A poster sits right of the title: the title's box keeps clear of it.
  const poster = back.find((l) => l.name === ART + 'Poster');
  if (poster?.box) {
    for (const l of slide.layers) {
      if (l.kind !== 'text' || !l.box || l.name.startsWith(ART)) continue;
      if (l.box.x < poster.box.x && l.box.x + l.box.w > poster.box.x - 48) l.box.w = Math.max(240, poster.box.x - 48 - l.box.x);
    }
  }
  return list.length;
}
