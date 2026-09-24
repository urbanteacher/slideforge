import londonNight from '../assets/motion-lab-london-night.jpg?inline';
import { makePlan } from '../engine/words';
import { setBackdrop, type BackdropMode } from './backdrop';
import { uid } from './defaults';
import { LAYOUTS, LAYOUT_STYLES } from './layouts';
import type { Anim, Deck, Layer, Slide } from './types';

// SlideForge's Motion lab lesson, slides 1–14, made in the lab from the lab's own pieces: the
// Cinematic theme, the three statement compositions, the Full picture layout, word motion (Each
// word, Speed, Spacing, Order, Leave again), choreography plans, backdrop motion and image Travel.
// Nothing is copied from SlideForge's screen; each slide is what an author would set up by hand.

const st = LAYOUT_STYLES.find((s) => s.id === 'cinematic')!;

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
  notes: string;
}

const named = (s: Slide, name: string) => s.layers.find((l) => l.name === name) as Layer;

function statement(o: Statement): Slide {
  const s = LAYOUTS.find((l) => l.id === o.layout)!.make(st);
  const line = named(s, 'Statement');
  line.params.text = o.line;
  Object.assign(line.anim, o.words ?? {});
  if (o.plan) {
    const made = makePlan(o.plan, o.line);
    Object.assign(line.anim, { type: made.type, plan: made.plan, easing: made.easing, duration: made.duration });
  }
  if (o.credit) named(s, 'Credit').params.text = o.credit;
  else s.layers = s.layers.filter((l) => l.name !== 'Credit');
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
  const slides = [...SLIDES.map(statement), picture()];
  slides.forEach((s, i) => { if (i < SLIDES.length) s.name = `${i + 1} · ${SLIDES[i].line}`; else s.name = `${i + 1} · ${s.name}`; });
  const deck: Deck = { id: uid(), title: 'Motion lab — slides 1–14', width: 1920, height: 1080, version: 1, theme: st.id, slides };
  SLIDES.forEach((o, i) => { if (o.backdrop) setBackdrop(deck, slides[i].id, o.backdrop); });
  return deck;
}
