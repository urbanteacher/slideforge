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
import badgeSafe from '../assets/aiad26/aiad26-safe.svg?raw';
import badgeSmart from '../assets/aiad26/aiad26-smart.svg?raw';
import badgeCreative from '../assets/aiad26/aiad26-creative.svg?raw';
import badgeResponsible from '../assets/aiad26/aiad26-responsible.svg?raw';
import badgeFuture from '../assets/aiad26/aiad26-future.svg?raw';
import icon27Safe from '../assets/aiad27/icon-safe.svg?raw';
import icon27Smart from '../assets/aiad27/icon-smart.svg?raw';
import icon27Creative from '../assets/aiad27/icon-creative.svg?raw';
import icon27Responsible from '../assets/aiad27/icon-responsible.svg?raw';
import icon27Future from '../assets/aiad27/icon-future.svg?raw';
import lockup27 from '../assets/aiad27/aiad27-lockup.svg?raw';
import lockup27Reverse from '../assets/aiad27/aiad27-lockup-reverse.svg?raw';
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

/** What a slide's artwork depends on: its theme, where it sits in the lesson (and of how many), the lesson's name. */
export interface ArtContext { theme: string; index: number; deckTitle: string; total?: number;
  /** The lesson's slides, for the artwork that depends on the slides around this one (AI Awareness
   *  Day's ANSWER label goes on the cards that answer the last discussion question). */
  slides?: ArtSlide[] }
/** Where an author moved one of the theme's shapes on one slide (SlideForge's Artwork face,
 *  src/render/art.js): its corner in SlideForge's slide px, its size, whether it shows, which side
 *  of the words it is on. */
export interface ArtPose { x?: number; y?: number; scale?: number; hidden?: boolean; order?: 'back' | 'front' }
/** The SlideForge slide the artwork is for: its type, for a poster cover its picture, and the poses
 *  its author gave the theme's shapes. */
interface ArtSlide { type: string; image?: string; subtitle?: string; art?: { poses?: Record<string, ArtPose> } }

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
/** The campaign badge per strand (assets/brand/aiad26/): five drawings, not one recoloured — each puts
 *  its dark wedge and its word somewhere of its own. Carries both grounds, so never inverted. */
const BADGES: Record<string, string> = { safe: badgeSafe, smart: badgeSmart, creative: badgeCreative, responsible: badgeResponsible, future: badgeFuture };
const AIAD_INK = '#1a1a2e';

/** AI Awareness Day 2027 (css/aiad27.css): each strand's colour and name, its icon, and the three
 *  grounds its slides are set on — cream paper, the strand's colour (the cover, the discussion and the
 *  commitment) and ink (the scenario and the takeaways) — with the type and rule each one takes. */
const AIAD27: Record<string, { color: string; name: string; icon: string }> = {
  safe: { color: '#00bedd', name: 'Safe', icon: icon27Safe }, smart: { color: '#ff7038', name: 'Smart', icon: icon27Smart },
  creative: { color: '#ac91ff', name: 'Creative', icon: icon27Creative }, responsible: { color: '#63df93', name: 'Responsible', icon: icon27Responsible },
  future: { color: '#fa83eb', name: 'Future', icon: icon27Future },
};
const A27 = { font: 'Uncut Sans', ink: '#231f20', paper: '#f6f4ed', dim: '#54504e', rule: '#c9c6be', darkRule: '#686366' };
// The lockup's words have an em dash in them: encoded as UTF-8 first, which btoa alone cannot take.
const b64 = (raw: string) => 'data:image/svg+xml;base64,' + btoa(String.fromCharCode(...new TextEncoder().encode(raw)));
const AIAD_FONT = 'Poppins';

/** The label the campaign's PowerPoints put over a slide, in the strand's colour: DID YOU KNOW? over
 *  the numbers (the stats slide's subtitle), THINK & DISCUSS over the question, and ANSWER over the
 *  cards that answer it — the first cards after a discussion question, before any other cards. The
 *  two about the room's thinking carry the round ? mark. */
function aiadLabel(s: ArtSlide, ctx: ArtContext): { text: string; mark: boolean } | null {
  if (s.type === 'statement') return { text: 'Think & discuss', mark: true };
  if (s.type === 'stats' && s.subtitle?.trim()) return { text: s.subtitle.trim(), mark: false };
  if (s.type === 'cards' && ctx.slides) {
    for (let i = ctx.index - 1; i >= 0; i--) {
      const t = ctx.slides[i]?.type;
      if (t === 'cards') return null;
      if (t === 'statement') return { text: 'Answer', mark: true };
    }
  }
  return null;
}

// UK Black Tech's 3D objects: one per slide, in the order of its place in the lesson (css/ukbt.css,
// data-art-index = index % 4). The small one sits in one of five places (data-art-slot = index % 5).
const OBJECTS = { ukbt: [coil, asterisk, cone, torus], 'ukbt-institute': [knot, disc, shell, dome] };
const SLOTS: [number, number, number][] = [[1138, 572, 200], [1118, 246, 228], [-62, 582, 196], [1148, 104, 184], [880, 582, 212]];
const KEYFACT_SLOTS: [number, number][] = [[1088, 522], [1096, 235], [-62, 528], [1082, 104], [842, 544]];
/** Slide types the small object stays off: they fill the slide with a chart, a table or a picture. */
const NO_OBJECT = new Set(['title', 'section', 'chart', 'table', 'stats', 'funnel', 'quiz', 'game', 'image', 'gallery', 'split']);

/** One piece of artwork, the ground it was drawn for (a copy on another ground is left without it),
 *  and the key SlideForge's poses know it by (the shape's class: nu-n, ukbt-chev…). */
interface Piece { layer: Layer; front?: boolean; ground?: Ground; key?: string }

/** NU London's progress rail (css/northeastern.css .track): the brand's colours along the foot, the
 *  lesson painted over them in red as it goes, white on a section break. */
const RAIL = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="9" viewBox="0 0 1920 9" preserveAspectRatio="none"><defs><linearGradient id="r"><stop offset="0" stop-color="#c8102e"/><stop offset=".25" stop-color="#ff854f"/><stop offset=".45" stop-color="#ffc34b"/><stop offset=".68" stop-color="#609f80"/><stop offset=".88" stop-color="#61b6d0"/><stop offset="1" stop-color="#0c3354"/></linearGradient></defs><rect width="1920" height="9" fill="url(#r)"/></svg>`;

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
        { key: 'nu-skyline', layer: picture('Skyline', skyline, at(0, 530, 190 * 1458 / 533, 190), 0.34) },
        { key: 'nu-n', layer: picture('N', svg(monogram, '#c8102e'), at(530, 196, 900, 694), 0.92) },
        { key: 'nu-eyebrow', layer: eyebrow(ctx.deckTitle, 0.16, '#7fa6c6', 1, 888), front: true },
        { layer: logo, front: true },
      );
    } else if (t === 'section') {
      out.push(
        { ground: 'loud', layer: createLayer('linear', { name: ART + 'Ground', anim: still, params: { colorA: '#d41733', colorB: '#9b0c24', angle: 60, bias: 0.55 } }) },
        { key: 'nu-n', layer: picture('N', svg(monogram, '#ffffff'), at(600, 146, 900, 694), 0.13) },
        { key: 'nu-eyebrow', layer: eyebrow('Northeastern University London', 0.32, '#ffffff', 0.7, 900), front: true },
        { layer: logo, front: true },
      );
    }
    const cover = t === 'title' || t === 'section';
    const rail = cover ? 0.5 : 0.34;
    out.push({ front: true, layer: picture('Rail', 'data:image/svg+xml;base64,' + btoa(RAIL), at(0, 714, 1280, 6), rail, { fit: 'cover' }) });
    if (ctx.total && ctx.total > 1) {
      const done = Math.min(1, (ctx.index + 1) / ctx.total);
      out.push({ front: true, layer: createLayer('shape', { name: ART + 'Rail, so far', box: at(0, 714, 1280 * done, 6), opacity: rail, anim: still,
        params: { shape: 'rect', radius: 0, fill: t === 'section' ? '#ffffff' : '#c8102e', strokeWidth: 0 } }) });
    }
  } else if (id === 'ukbt' || id === 'ukbt-institute') {
    const object = OBJECTS[id][((ctx.index % 4) + 4) % 4];
    out.push({ layer: picture('Waves', waves, at(0, 0, 1280, 720), t === 'section' ? 0.45 : 1) });
    const chevrons = (back: [string, number], front: [string, number]) => [
      // Both chevrons are ukbt-chev to SlideForge, so one pose moves the pair, as it does there.
      { key: 'ukbt-chev', layer: picture('Chevron, back', svg(chevron, back[0]), at(705, -61.3, 604, 929), back[1]) },
      { key: 'ukbt-chev', layer: picture('Chevron, front', svg(chevron, front[0]), at(908, -61.3, 604, 929), front[1]) },
    ];
    if (t === 'title') {
      out.push(...chevrons(['#ffffff', 0.085], ['#00c57f', 0.17]), { key: 'ukbt-object', layer: picture('Object', object, at(856, 304, 470, 470)) });
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
    const cover = t === 'title' || t === 'section';
    const dark = t === 'section';
    // The strand's rule down the left edge of every slide, in front of the words as the theme has it.
    out.push({ front: true, layer: createLayer('shape', { name: ART + 'Edge', box: at(0, 0, 10, 720), anim: still, params: { shape: 'rect', radius: 0, fill: accent, strokeWidth: 0 } }) });
    if (cover) {
      // The fold: the corner of a square turned up, cropped by the slide's edges.
      const fold = `<svg xmlns="http://www.w3.org/2000/svg" width="630" height="285" viewBox="860 530 420 190"><polygon points="1090,530 860,530 860,645 975,760 1320,760" fill="${accent}"/></svg>`;
      out.push({ key: 'aiad-fold', layer: createLayer('image', { name: ART + 'Fold', box: at(860, 530, 420, 190), opacity: t === 'section' ? 0.3 : 0.2, anim: still, params: { src: 'data:image/svg+xml;base64,' + btoa(fold), fit: 'contain' } }) });
      // The seam: a 3px line from the fold's corner to the slide's (as css/aiad26.css means it to be).
      const seam = `<svg xmlns="http://www.w3.org/2000/svg" width="285" height="285" viewBox="1090 530 190 190"><line x1="1090" y1="530" x2="1280" y2="720" stroke="${accent}" stroke-width="3"/></svg>`;
      out.push({ key: 'aiad-seam', layer: createLayer('image', { name: ART + 'Seam', box: at(1090, 530, 190, 190), opacity: 0.5, anim: still, params: { src: 'data:image/svg+xml;base64,' + btoa(seam), fit: 'contain' } }) });
    }
    // The badge on every slide, where the campaign's PowerPoints have it: top left on a cover (the fold
    // has the corner), bottom right on the rest, 72px square as SlideForge's theme sets it
    // (css/aiad26.css .slide-logo), with the campaign's hashtag under it.
    const badge = BADGES[strand] ?? BADGES.safe;
    const tag = (text: string, box: Box, align: 'left' | 'right', color: string) =>
      createLayer('text', { name: ART + (align === 'left' ? 'Footer' : 'Hashtag'), box, anim: still, params: {
        text, font: AIAD_FONT, weight: '700', size: 18, color, align, uppercase: true, tracking: 0.04, lineHeight: 1.2, fit: 'shrink' } });
    const ink = dark ? '#ffffff' : AIAD_INK;
    if (cover) {
      out.push({ front: true, key: 'aiad-badge', layer: picture('Badge', 'data:image/svg+xml;base64,' + btoa(badge), at(34, 30, 72, 72)) });
      out.push({ front: true, layer: tag('AI Awareness Day 2026 · 5-minute lesson starter', at(34, 684, 560, 16), 'left', ink) });
      if (!dark) out.push({ front: true, layer: tag('#AIAwarenessDay26', at(930, 684, 316, 16), 'right', ink) });
    } else {
      out.push({ front: true, key: 'aiad-badge', layer: picture('Badge', 'data:image/svg+xml;base64,' + btoa(badge), at(1174, 604, 72, 72)) });
      out.push({ front: true, layer: tag('#AIAwarenessDay26', at(1030, 682, 216, 14), 'right', ink) });
    }
    // The slide's label over its heading (a statement's inside its frame), in the strand's colour.
    const label = aiadLabel(s, ctx);
    if (label) {
      const [lx, ly] = t === 'statement' ? [104, 100] : [52, 36];
      const mark = label.mark ? 38 : 0;
      if (label.mark) {
        out.push({ front: true, layer: createLayer('shape', { name: ART + 'Label mark', box: at(lx, ly, 32, 32), anim: still, params: { shape: 'ellipse', fill: accent, strokeWidth: 0 } }) });
        out.push({ front: true, layer: createLayer('text', { name: ART + 'Label mark, ?', box: at(lx, ly + 2, 32, 30), anim: still, params: {
          text: '?', font: AIAD_FONT, weight: '800', size: 33, color: '#ffffff', align: 'center', lineHeight: 1, fit: 'shrink' } }) });
      }
      out.push({ front: true, layer: createLayer('text', { name: ART + 'Label', box: at(lx + mark, ly, 700, 34), anim: still, params: {
        text: label.text, font: AIAD_FONT, weight: '800', size: 42, color: accent, uppercase: true, tracking: 0, lineHeight: 1.1, fit: 'shrink' } }) });
    }
  } else if (id === 'aiad27') {
    if (t === 'title' && s.image) {
      // The campaign's poster cover: the strand's chamfered panel and glyph, beside the title.
      out.push({ layer: picture('Poster', img(s.image), at(733.5, 124, 493.7, 504)) });
    }
    // The frame every slide of the design wears (css/customize.css .cp-header and .cp-footer, inside the
    // slide's 32 / 52 / 24 padding): the strand's icon and name top left, the campaign's lockup top
    // right, and a rule over the foot with the campaign line on it. The page number is the deck's own
    // footer (headerFooter), so it follows the slides as they move.
    const strandOf = AIAD27[strand] ?? AIAD27.safe;
    const g = themeGround(ctx.theme, t) ?? 'working';
    const fg = g === 'quiet' ? A27.paper : A27.ink;
    const rule = g === 'loud' ? A27.ink : g === 'quiet' ? A27.darkRule : A27.rule;
    // The icon is drawn in the strand's colour; on the strand's own ground it is set in ink, as the theme does.
    const icon = g === 'loud' ? strandOf.icon.replace(/fill="#[0-9a-f]{6}"/i, `fill="${A27.ink}"`) : strandOf.icon;
    const word = (name: string, text: string, box: Box, size: number, align: 'left' | 'right' = 'left') =>
      createLayer('text', { name: ART + name, box, anim: still, params: { text, font: A27.font, weight: '700', size: size * X, color: fg, align, lineHeight: 1.2, fit: 'shrink' } });
    out.push(
      { front: true, key: 'aiad27-icon', layer: picture('Strand mark', b64(icon), at(52, 49, 22, 22)) },
      { front: true, layer: word('Strand', strandOf.name, at(84, 45, 300, 30), 20) },
      { front: true, key: 'aiad27-lockup', layer: picture('Lockup', b64(g === 'quiet' ? lockup27Reverse : lockup27), at(928, 32, 300, 56)) },
      { front: true, layer: createLayer('shape', { name: ART + 'Foot rule', box: at(52, 664, 1176, 1), anim: still, params: { shape: 'rect', radius: 0, fill: rule, strokeWidth: 0 } }) },
      { front: true, layer: word('Campaign line', 'Keep humans in the loop', at(52, 671, 560, 26), 20) },
    );
  }
  return out;
}

/** An author's pose, onto the layer that is that shape here. A pose sets the shape's top-left corner
 *  and scales it from there (transform-origin: top left); the pair of UKBT chevrons keep their offset. */
function posed(p: Piece, pose: ArtPose) {
  const b = p.layer.box;
  if (b) {
    if (pose.x != null && pose.y != null) {
      // One pose, two chevrons: the back one takes it, the front keeps its distance from the back.
      const shift = p.layer.name === ART + 'Chevron, front' ? (908 - 705) * X : 0;
      b.x = pose.x * X + shift;
      b.y = pose.y * X;
    }
    if (pose.scale != null && pose.scale > 0) { b.w *= pose.scale; b.h *= pose.scale; }
  }
  if (pose.hidden) p.layer.visible = false;
  if (pose.order === 'front') p.front = true;
  else if (pose.order === 'back') p.front = false;
}

/** The theme's artwork onto one lab slide: behind its words, straight above its ground, or in front
 *  where the theme paints it there. A piece drawn for another ground than the slide's is left out,
 *  and so is one the slide already has (by its name), so a copy given its artwork before a piece
 *  was added gets that piece and keeps what it has, moved or restyled. How many layers were added. */
/** AI Awareness Day 2026's type on a slide's words: the campaign's face, Poppins, throughout, and its
 *  headlines — the title, the headings, the discussion question — heavy and in capitals, as every
 *  headline in its PowerPoints is (css/aiad26.css sets h1 and h2 so). A lab copy made before carries
 *  the lab's first faces for this palette, Space Grotesk and Inter, which it takes over. Only those:
 *  a face an author chose stays. The words themselves are not changed, only how they are set. */
function campaignType(slide: Slide) {
  for (const l of slide.layers) {
    if (l.kind !== 'text' || l.name.startsWith(ART)) continue;
    const p = l.params;
    if (p.font === 'Space Grotesk' || p.font === 'Inter') p.font = AIAD_FONT;
    const headline = l.name === 'Hero' || l.name === 'Statement' || (l.name === 'Heading' && Number(p.size) >= 80);
    if (headline && p.font === AIAD_FONT) {
      p.uppercase = true; p.weight = '800'; p.tracking = -0.01;
      // Capitals take more room than the same words in lower case: the box shrinks them to fit
      // rather than growing past the slide.
      if (p.fit === 'grow') p.fit = 'shrink';
      // And a heading given one line's height has the room down to what is under it, so a headline
      // that now takes two lines keeps its size (a gap of 24 to the words below; no more than twice).
      if (l.name === 'Heading' && l.box) {
        const b = l.box;
        const below = slide.layers.filter((o) => o !== l && o.box && !o.name.startsWith(ART) && o.kind !== 'solid' && o.box.y >= b.y + b.h - 1
          && o.box.x < b.x + b.w && o.box.x + o.box.w > b.x).map((o) => o.box!.y);
        const floor = below.length ? Math.min(...below) - 24 : b.y + b.h;
        b.h = Math.max(b.h, Math.min(b.h * 2, floor - b.y));
      }
    }
  }
}

/** AI Awareness Day 2027's labels, above the words as the design sets them (css/customize.css
 *  .cp-eyebrow): STARTER ACTIVITY over the cover's question, THE SCENARIO · 30 SECONDS over the voice,
 *  DISCUSS IN PAIRS over the discussion question, YOUR CHOICE over the commitment. SlideForge keeps
 *  each as the slide's subtitle, and the lab's layouts set a subtitle under the words; here it goes
 *  over them, small, spaced and in capitals — white on the strand's colour, the strand's colour on ink.
 *  Where there is no room above (the commitment's heading is at the top of the grid), what is under it
 *  moves down to make it. Once: the label is named, so a copy is not moved twice. */
function campaignLabels27(slide: Slide, s: ArtSlide, ctx: ArtContext) {
  const t = s.type;
  const pick: Record<string, [string, string]> = { title: ['Text', 'Hero'], quote: ['Attribution', 'Heading'], statement: ['Credit', 'Statement'], keyfact: ['Text', 'Heading'] };
  const names = pick[t];
  if (!names || slide.layers.some((l) => l.name === ART + 'Eyebrow')) return;
  const label = slide.layers.find((l) => l.name === names[0] && l.kind === 'text');
  const words = slide.layers.find((l) => l.name === names[1] && l.kind === 'text');
  if (!label?.box || !words?.box) return;
  const text = String(label.params.text ?? '').replace(/^[—–-]\s*/, '').trim();
  if (!text) return;
  const g = themeGround(ctx.theme, t) ?? 'working';
  const strandColour = (AIAD27[family(ctx.theme).strand] ?? AIAD27.safe).color;
  const size = t === 'title' ? 27 : t === 'quote' ? 30 : 36;
  const h = Math.round(size * 1.4);
  const top = 132;
  let y = words.box.y - h - 24;
  if (y < top) {
    // Room for the label at the top of the grid: everything from the words down moves under it.
    const shift = top + h + 24 - words.box.y;
    for (const l of slide.layers) if (l.box && l !== label && !l.name.startsWith(ART) && l.kind !== 'solid' && l.box.y >= words.box.y - 1) l.box.y += shift;
    y = top;
  }
  label.name = ART + 'Eyebrow';
  label.box = { x: words.box.x, y, w: Math.max(words.box.w, 900), h, rot: 0 };
  Object.assign(label.params, { text, font: A27.font, weight: t === 'quote' ? '600' : '700', size, color: g === 'quiet' ? strandColour : g === 'loud' ? '#ffffff' : A27.dim,
    uppercase: true, tracking: 0.14, align: 'left', lineHeight: 1.2, fit: 'shrink' });
}

export function addThemeArt(slide: Slide, s: ArtSlide, ctx: ArtContext, img: (p?: string) => string): number {
  if (family(ctx.theme).id === 'aiad26') campaignType(slide);
  if (family(ctx.theme).id === 'aiad27') campaignLabels27(slide, s, ctx);
  const ground = slide.ground ?? 'working';
  const have = new Set(slide.layers.map((l) => l.name));
  const list = pieces(s, ctx, img).filter((p) => (!p.ground || p.ground === ground) && !have.has(p.layer.name));
  if (!list.length) return 0;
  const poses = s.art?.poses ?? {};
  for (const p of list) { const pose = p.key ? poses[p.key] : undefined; if (pose) posed(p, pose); }
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
