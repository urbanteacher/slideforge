import londonNight from '../assets/motion-lab-london-night.jpg?inline';
import { makePlan } from '../engine/words';
import { setBackdrop, type BackdropMode } from './backdrop';
import { uid } from './defaults';
import { LOOKS, SCENES } from '../engine/scene';
import { EXPERIMENTS } from '../engine/experiment';
import { LAYOUTS, LAYOUT_STYLES, type LayoutStyle, chartCalloutSlide, chartSlide, experimentSlide, keyfactSlide, mindmapSlide, railSlide, sceneSlide, sectionEditorialSlide, sectionSlide, splitSlide, youtubeSlide } from './layouts';
import type { Anim, Deck, Layer, Slide } from './types';

// SlideForge's Motion lab lesson, slides 1–14, made in the lab from the lab's own pieces: the
// Cinematic theme, the three statement compositions, the Full picture layout, word motion (Each
// word, Speed, Spacing, Order, Leave again), choreography plans, backdrop motion and image Travel.
// Nothing is copied from SlideForge's screen; each slide is what an author would set up by hand.

const st = LAYOUT_STYLES.find((s) => s.id === 'cinematic')!;
const cinematic = st;

// SlideForge's Speed × Spacing for words: a word's duration, and the gap between words
// (130 ms at Medium, Wave, stretched 1.8 / 1 / 0.45 by speed and 0 / 1 / 2.5 by spacing).
const SPEED = { gentle: [1.3, 1.8], medium: [0.7, 1], quick: [0.32, 0.45] } as const;
const SPACE = { together: 0, wave: 1, one: 2.5 } as const;
const timing = (speed: keyof typeof SPEED, spacing: keyof typeof SPACE) =>
  ({ duration: SPEED[speed][0], stagger: Math.round(0.13 * SPEED[speed][1] * SPACE[spacing] * 1000) / 1000 });

type Composition = 'statement-poster' | 'statement-editorial' | 'statement-frame';

interface Statement {
  layout: Composition;
  line: string;
  credit?: string;
  words?: Partial<Anim>;
  plan?: 'bounce' | 'mist' | 'letters';
  backdrop?: BackdropMode;
  /** No word motion: the line is simply there (a Morph carries it in, or the colours are the point). */
  still?: boolean;
  /** A two-colour poster: the slide's ground and its words. */
  colours?: { ground: string; ink: string };
  notes: string;
}

const named = (s: Slide, name: string) => s.layers.find((l) => l.name === name) as Layer;

function statement(o: Statement, style: LayoutStyle = st): Slide {
  const s = LAYOUTS.find((l) => l.id === o.layout)!.make(style);
  const line = named(s, 'Statement');
  line.params.text = o.line;
  Object.assign(line.anim, o.words ?? {});
  if (o.plan) {
    const made = makePlan(o.plan, o.line);
    Object.assign(line.anim, { type: made.type, plan: made.plan, easing: made.easing, duration: made.duration });
  }
  if (o.still) line.anim = { ...line.anim, type: 'none' };
  if (o.credit) named(s, 'Credit').params.text = o.credit;
  else s.layers = s.layers.filter((l) => l.name !== 'Credit');
  if (o.colours) {
    s.background = o.colours.ground;
    const g = s.layers.find((l) => l.name === 'Ground');
    if (g) { g.kind = 'solid'; g.params = { color: o.colours.ground }; }
    line.params.color = o.colours.ink;
    const c = s.layers.find((l) => l.name === 'Credit');
    if (c) c.params.color = o.colours.ink;
  }
  s.notes = o.notes;
  s.transition = { type: 'fade', duration: 0.6 };
  return s;
}

const SLIDES: Statement[] = [
  {
    layout: 'statement-poster', line: 'Direct attention.', credit: 'Motion Lab / Movement with a purpose',
    notes: 'Opening: one entrance, then rest. Motion should help the room locate, follow or connect information. Use the later looping example for waiting screens.',
  },
  {
    layout: 'statement-editorial', line: 'Give the idea room', credit: 'A gentle background supports the opening', backdrop: 'drift',
    notes: 'Backdrop: Drift. The blobs are this theme’s accents at low alpha, so the same slide in a paper theme is a pale wash rather than a glow.\n\nWords: Rise, Medium, Wave. This is the default pairing.',
  },
  {
    layout: 'statement-frame', line: 'Give the idea room', credit: 'Gentle / reflective opening', words: timing('gentle', 'wave'),
    notes: 'Matched comparison: the wording, composition and effect stay the same. Only speed changes. Copy the slide and replace the phrase; keep the movement only if it helps your delivery.',
  },
  {
    layout: 'statement-frame', line: 'Give the idea room', credit: 'Medium / everyday delivery', words: timing('medium', 'wave'),
    notes: 'Matched comparison: the wording, composition and effect stay the same. Only speed changes.',
  },
  {
    layout: 'statement-frame', line: 'Give the idea room', credit: 'Quick / a short emphasis', words: timing('quick', 'wave'),
    notes: 'Matched comparison: the wording, composition and effect stay the same. Only speed changes.',
  },
  {
    layout: 'statement-frame', line: 'Give the idea room', credit: 'Together / read the phrase as a whole', words: { feel: 'fade', ...timing('medium', 'together') },
    notes: 'SPACING 1 of 2 — Together: every word carries the same delay of nothing, so the line arrives as a single movement. Each word is Fade here, so the only thing being demonstrated is the spacing.',
  },
  {
    layout: 'statement-frame', line: 'Give the idea room', credit: 'One at a time / follow the sequence', words: { feel: 'fade', ...timing('medium', 'one') },
    notes: 'SPACING 2 of 2 — One at a time: two and a half times the wave. Same Fade as the slide before; only the spacing changed.',
  },
  {
    layout: 'statement-frame', line: 'From the middle, opening outwards', words: { ...timing('medium', 'one'), order: 'center' },
    notes: 'Order: from the centre. Same spacing as the slide before — what changed is the order: the centre word leads and the wave opens to both ends at once.\n\nIt reads as a phrase opening rather than a line being typed, which suits a statement that is one idea.',
  },
  {
    layout: 'statement-editorial', line: 'Let the next idea appear', credit: 'Reveal / a clean entrance', words: { feel: 'reveal' }, backdrop: 'grid',
    notes: 'The third effect: Reveal, a wipe rather than a move. Backdrop: Grid — a ruled plane travelling exactly one cell per loop, which is the same picture again, so it never cuts.',
  },
  {
    layout: 'statement-frame', line: 'We will begin shortly', credit: 'Loop / for a waiting screen', words: { leave: true }, backdrop: 'drift',
    notes: 'Leave again — the loop. Seven seconds at Medium: in for the first tenth, held for half, then the same eased wave taking them out, and a pause before it comes round. Stay here and watch it twice.',
  },
  {
    layout: 'statement-frame', line: 'Every word lands, and settles', credit: 'Bounce', plan: 'bounce',
    notes: 'ARC 1 of 3 — Bounce. Each word falls from above and goes past its resting place before coming back, twice, smaller each time. The overshoot is a fraction of that word’s own drop, so the word that fell furthest bounces hardest.\n\nChoreography: each word has its own lift, blur and start time, and lands on its own arc.',
  },
  {
    layout: 'statement-frame', line: 'Out of the fog, slowly', credit: 'Mist', plan: 'mist', backdrop: 'drift',
    notes: 'ARC 2 of 3 — Mist. The difference from a normal arrival is which property finishes last. These words are in position about half way through and still half out of focus; the rest of the time is spent condensing.\n\nMist supplies its own blur floor, so a word set to mist with no blur still mists.',
  },
  {
    layout: 'statement-frame', line: 'Charts lie', credit: 'Letter by letter', plan: 'letters',
    notes: 'ARC 3 of 3 — the unit itself. Nine steps for nine letters: each letter gets its own start. The gap after "Charts" is the word break — 150 ms rather than 90.',
  },
];

function picture(): Slide {
  const s = LAYOUTS.find((l) => l.id === 'image')!.make(st);
  const pic = s.layers.find((l) => l.kind === 'image')!;
  pic.name = 'Picture';
  Object.assign(pic.params, {
    // Bundled as a data URL, like a picture dropped onto the slide, so the saved file and the
    // exported deck carry it with them.
    src: londonNight, fit: 'cover', frame: 'bleed', focus: [0.14, 0.18],
    motion: 'travel', focus2: [0.86, 0.8], motionSecs: '12', capStyle: 'gradient',
  });
  const band = named(s, 'Caption band');
  band.params.captionOf = pic.id;
  named(s, 'Caption').params.text = 'Guide the eye through the image';
  named(s, 'Caption credit').params.text = 'Travel between two chosen points';
  s.name = 'Guide the eye through the image';
  s.notes = 'Image motion: Travel. Pick a start point, an end point and a duration. This example uses a city photograph. Keep a chart still if the audience needs to compare values across it.';
  s.transition = { type: 'fade', duration: 0.6 };
  return s;
}

export function motionLabDeck(): Deck {
  const slides = [...SLIDES.map((o) => statement(o)), picture()];
  slides.forEach((s, i) => { if (i < SLIDES.length) s.name = `${i + 1} · ${SLIDES[i].line}`; else s.name = `${i + 1} · ${s.name}`; });
  const deck: Deck = { id: uid(), title: 'Motion lab — slides 1–14', width: 1920, height: 1080, version: 1, theme: st.id, slides };
  SLIDES.forEach((o, i) => { if (o.backdrop) setBackdrop(deck, slides[i].id, o.backdrop); });
  return deck;
}

// ─── Slides 15 onwards ─────────────────────────────────────────────────────────────────────────
// The rest of SlideForge's Motion lab, from its content (lab/src/assets/motion-lab.json, written by
// tools/lab-motion-lab.mjs): chart callouts, point-by-point rails, a video loop, a YouTube link, the
// Morph pairs, the twelve "Transform the chart" experiments, the design experiments, and the ten
// motion specimens with their five visual studies — each built from the lab's own layouts and layers.

interface MLSlide {
  type: string; title?: string; subtitle?: string; body?: string; bullets?: string[]; notes?: string; image?: string;
  video?: string; videoPoster?: string; chartKind?: string; chartSource?: string; transition?: string; progressive?: boolean; buildMode?: string;
  callouts?: { label: string; note: string }[]; experiment?: { preset?: string; duration?: number; prompt?: string; states?: unknown[] };
  motionScene?: string; feedback?: { kind?: string };
  design?: { composition?: string; words?: string; wordSpeed?: string; wordStagger?: string; wordFrom?: string; wordsLoop?: boolean; backdrop?: string; background?: string; textColor?: string; motionLook?: string; imageShare?: number };
}
export interface MotionLabData { slides: MLSlide[]; images: Record<string, string> }

/** SlideForge's table text as the lab's "label, value" lines (its first series). */
const pairs = (body = '') => body.split('\n').slice(1).filter((r) => r.trim()).map((r) => { const c = r.split('\t'); return `${c[0]}, ${c[1]}`; }).join('\n');
const split2 = (x: string): [string, string] => { const [a, ...b] = x.split('\t'); return [a, b.join(' ')]; };

function rest(o: MLSlide, img: (p?: string) => string, style: LayoutStyle = cinematic): { slide: Slide; backdrop?: BackdropMode } | null {
  const st = style;
  const t = o.title ?? '', sub = o.subtitle ?? '', b = o.bullets ?? [], d = o.design ?? {};
  switch (o.type) {
    case 'statement': {
      const comp = d.composition === 'poster' ? 'statement-poster' : d.composition === 'editorial' ? 'statement-editorial' : 'statement-frame';
      const speed = (d.wordSpeed ?? 'medium') as keyof typeof SPEED, spacing = (d.wordStagger ?? 'wave') as keyof typeof SPACE;
      const words: Partial<Anim> = { ...timing(SPEED[speed] ? speed : 'medium', SPACE[spacing] !== undefined ? spacing : 'wave'), feel: d.words === 'fade' ? 'fade' : d.words === 'reveal' ? 'reveal' : 'rise', ...(d.wordFrom === 'center' ? { order: 'center' as const } : {}), ...(d.wordsLoop ? { leave: true } : {}) };
      const slide = statement({ layout: comp, line: o.body ?? t, credit: sub || undefined, words, still: d.words === '', colours: d.background && d.textColor ? { ground: d.background, ink: d.textColor } : undefined, notes: o.notes ?? '' }, st);
      if (o.feedback?.kind) slide.feedback = { kind: o.feedback.kind as 'poll' };
      return { slide, backdrop: d.backdrop as BackdropMode | undefined };
    }
    case 'chart': {
      if (o.callouts?.length) return { slide: chartCalloutSlide(st, t, pairs(o.body), o.chartSource ?? '', o.callouts) };
      const slide = chartSlide(st, t, o.chartSource ?? '');
      Object.assign(slide.layers.find((l) => l.kind === 'chart')!.params, { chart: o.chartKind === 'line' ? 'line' : 'column', data: pairs(o.body) });
      if (!o.chartSource) slide.layers = slide.layers.filter((l) => l.name !== 'Source');
      return { slide };
    }
    case 'content': {
      const build = o.progressive ? (o.buildMode === 'spot' ? 'spot' : o.buildMode === 'dim' ? 'dim' : 'on') : undefined;
      return { slide: railSlide(st, t, b, build) };
    }
    case 'video': {
      if (/youtube\.com|youtu\.be/.test(o.video ?? '')) return { slide: youtubeSlide(st, t, sub, o.video ?? '') };
      const s = LAYOUTS.find((l) => l.id === 'image')!.make(st);
      const pic = s.layers.find((l) => l.kind === 'image')!;
      Object.assign(pic.params, { src: img(o.videoPoster), fit: 'cover', frame: 'bleed', capStyle: 'gradient' });
      named(s, 'Caption band').params.captionOf = pic.id;
      named(s, 'Caption').params.text = t;
      named(s, 'Caption credit').params.text = sub;
      if (o.video) s.layers.splice(s.layers.indexOf(pic) + 1, 0, { ...pic, id: uid(), kind: 'video', name: 'Video', params: { src: img(o.video), fit: 'cover' }, anim: { ...pic.anim, type: 'fade', duration: 0.6 } });
      return { slide: s };
    }
    case 'experiment': {
      const e = o.experiment ?? {}, preset = EXPERIMENTS[e.preset ?? 'polling'] ? e.preset! : 'polling';
      return { slide: experimentSlide(st, t, e.prompt ?? EXPERIMENTS[preset].prompt, { preset, data: o.body ?? EXPERIMENTS[preset].data, states: e.states?.length ? JSON.stringify(e.states) : '', duration: e.duration }, o.chartSource ?? '') };
    }
    case 'section': {
      const slide = d.composition === 'editorial' ? sectionEditorialSlide(st, t, sub) : sectionSlide(st, t, sub);
      return { slide, backdrop: d.backdrop as BackdropMode | undefined };
    }
    case 'split': {
      // Picture first, taking its share of the slide; the prompts arrive a Next at a time after it.
      const slide = splitSlide(st, t, b, 'right');
      const share = Math.max(0.4, Math.min(0.7, (d.imageShare ?? 50) / 100)), pw = 1920 * share, textW = 1920 - pw - 78 - 72;
      const pic = slide.layers.find((l) => l.kind === 'image')!;
      Object.assign(pic.params, { src: img(o.image), fit: 'cover' });
      pic.box = { x: 1920 - pw, y: 0, w: pw, h: 1080, rot: 0 };
      pic.anim = { ...pic.anim, delay: 0 };
      for (const l of slide.layers) if (l !== pic && l.box && l.name !== 'Accent bar') l.box = { ...l.box, w: textW };
      const pts = slide.layers.find((l) => l.name === 'Bullet points');
      if (pts && o.progressive) pts.anim = { ...pts.anim, type: 'fade', build: 'lines', delay: 0.6 };
      return { slide };
    }
    case 'mindmap': return { slide: mindmapSlide(st, t, b.map(split2)) };
    case 'keyfact': return { slide: keyfactSlide(st, t, o.body ?? '', sub, b) };
    case 'motion': {
      const mode = o.motionScene ?? 'cards';
      return { slide: sceneSlide({ mode, look: d.motionLook ?? 'editorial', title: t, subtitle: sub, items: b, image: img(o.image), factor: Number(o.body) || 2 }, LOOKS, SCENES) };
    }
    default: return null;
  }
}

/** The whole Motion lab: slides 1–14 as above, then the rest from SlideForge's content. */
export function motionLabFullDeck(data: MotionLabData): Deck {
  const deck = motionLabDeck();
  const img = (p?: string) => (p && data.images[p]) || (p?.endsWith('qa-london-night-1.jpg') ? londonNight : '');
  const later: { id: string; mode: BackdropMode }[] = [];
  data.slides.slice(14).forEach((o, i) => {
    const made = rest(o, img);
    if (!made) return;
    const s = made.slide;
    s.notes = o.notes ?? s.notes ?? '';
    if (o.transition === 'morph') s.transition = { type: 'morph', duration: 1 };
    else if (!s.transition || s.transition.type === 'none') s.transition = { type: 'fade', duration: 0.6 };
    s.name = `${15 + i} · ${o.title ?? o.body?.split('\n').join(' ') ?? s.name}`;
    deck.slides.push(s);
    if (made.backdrop) later.push({ id: s.id, mode: made.backdrop });
  });
  later.forEach(({ id, mode }) => setBackdrop(deck, id, mode));
  deck.title = `Motion lab — everything that moves, once each (${deck.slides.length} slides)`;
  return deck;
}

/**
 * The Motion lab's slides with a feature of their own, for the Slide designs panel: chart callouts,
 * the video loop and the YouTube link, the point-by-point builds, picture first, the twelve chart
 * experiments, the ten motion experiments and the five visual studies — built in the style given.
 */
export function motionDesigns(data: MotionLabData, style: LayoutStyle) {
  const img = (p?: string) => (p && data.images[p]) || (p?.endsWith('qa-london-night-1.jpg') ? londonNight : '');
  const groupOf = (o: MLSlide, i: number): string | null => {
    if (o.type === 'chart' && o.callouts?.length) return 'Charts that move';
    if (o.type === 'video') return 'Pictures that move';
    if (o.type === 'split' && o.progressive) return 'Pictures that move';
    if (o.type === 'content' && o.progressive) return 'Builds, a point at a time';
    if (o.type === 'experiment') return 'Transform the chart';
    if (o.type === 'motion') return i >= 54 ? 'Visual studies' : 'Motion experiments';
    return null;
  };
  const out: { id: string; name: string; group: string; blurb: string; slide: Slide }[] = [];
  data.slides.forEach((o, i) => {
    const group = groupOf(o, i);
    if (!group) return;
    const made = rest(o, img, style);
    if (!made) return;
    made.slide.notes = o.notes ?? '';
    const blurb = (o.notes ?? o.subtitle ?? '').split('\n')[0].replace(/^[A-Z /&-]+ — /, '').slice(0, 220);
    out.push({ id: `ml-${i}`, name: o.title ?? o.body?.split('\n').join(' ') ?? group, group, blurb, slide: made.slide });
  });
  return out;
}
export const MOTION_DESIGN_GROUPS = ['Charts that move', 'Transform the chart', 'Motion experiments', 'Visual studies', 'Builds, a point at a time'];
