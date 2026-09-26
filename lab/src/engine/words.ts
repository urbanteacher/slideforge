import type { Anim, Easing, Layer, PlanStep, WordArc } from '../model/types';

// SlideForge's word motion (src/render/words.js and the sf-word-* keyframes in css/app.css), drawn
// unit by unit on the canvas. Two ways in:
//
//   feel   Rise, Fade or Reveal. Every word moves the same way; Speed sets how long a word takes
//          and how far it lifts, Spacing how far apart they are. The wave between them is eased.
//   plan   A choreography: each word (or letter) starts at its own offset, turn, scale and blur,
//          at its own time, and lands on its own arc (settle, bounce or mist).
//
// A static slide (t = Infinity) is every word at rest. Units are words or letters, as the layer's
// entrance says; lengths are in em of the text size, so a 44px line travels as far, for its size,
// as a 320px one.

/** SlideForge sets its motion on a 1280-wide slide; a blur of 7px there is 10.5px on the lab's 1920. */
export const FRAME_K = 1920 / 1280;

/** One unit's look at a moment: alpha, offset (em), turn, scale, blur (px at 1280), and a clip over
 *  its own line box as fractions from the top (top..bottom), for Reveal. */
export interface UnitLook {
  alpha: number;
  dx: number;
  dy: number;
  rot: number;
  scale: number;
  blur: number;
  clip: [number, number] | null;
}
export const AT_REST: UnitLook = { alpha: 1, dx: 0, dy: 0, rot: 0, scale: 1, blur: 0, clip: null };

export const isWordMotion = (l: Layer) =>
  l.kind === 'text' && (l.anim.type === 'words' || l.anim.type === 'letters') && !!(l.anim.feel || l.anim.plan?.length) && !(l.anim.build && l.anim.build !== 'none');

/** The step between two units at Medium, Wave: a word's is longer than a letter's (words.js: 130 / 48 ms). */
export const unitGap = (a: Anim) => (a.type === 'letters' ? 0.048 : 0.13);

// Speed is one number in the lab (a word's duration); the lift and the loop's cycle move with it,
// through SlideForge's three points: Gentle 1.3 s, Medium 0.7 s, Quick 0.32 s.
function through(d: number, pts: [number, number][]) {
  if (d <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    if (d <= x1) return y0 + ((d - x0) / (x1 - x0)) * (y1 - y0);
  }
  return pts[pts.length - 1][1];
}
/** How far a rising word comes from, in em: further for a slower word, or the long duration reads as lag. */
export const liftFor = (duration: number) => through(duration, [[0.32, 0.34], [0.7, 0.55], [1.3, 0.85]]);
/** One loop, arrive → hold → leave → pause: 3.6, 7 and 13 s at the three speeds. */
export const cycleFor = (duration: number) => through(duration, [[0.32, 3.6], [0.7, 7], [1.3, 13]]);

const shuffles = new Map<number, number[]>();
/** A fixed shuffle of n units — each unit's place in it — the same every time the slide plays. */
export function shuffledRank(i: number, n: number): number {
  let r = shuffles.get(n);
  if (!r) {
    const keys = Array.from({ length: n }, (_, j) => ({ j, h: (Math.sin((j + 1) * 12.9898) * 43758.5453) % 1 }));
    keys.sort((x, y) => x.h - y.h);
    r = new Array<number>(n);
    keys.forEach((k, pos) => { r![k.j] = pos; });
    shuffles.set(n, r);
  }
  return r[i] ?? i;
}

/** Where a unit sits in the wave, 0 first to 1 last, by which end it starts from. */
function waveAt(a: Anim, i: number, last: number) {
  if (!last) return 0;
  if (a.order === 'last') return 1 - i / last;
  if (a.order === 'random') return shuffledRank(i, last + 1) / last;
  if (a.order === 'center') return Math.abs(i - last / 2) / (last / 2);
  return i / last;
}

/**
 * When each unit starts, in seconds from the entrance. A plan says so outright; otherwise the wave is
 * as long as the line needs (130 ms a word, 48 a letter, between 0.24 and 2.7 s) stretched by the
 * spacing, and eased — early units close together, the tail spreading — so the line lands as one
 * movement rather than a metronome. The spacing is the layer's stagger over the Medium, Wave step.
 */
export function unitDelays(a: Anim, n: number): number[] {
  if (a.plan?.length) return Array.from({ length: n }, (_, i) => Math.max(0, Math.min(3, a.plan![i]?.delay ?? 0)));
  const stretch = a.stagger / unitGap(a);
  const span = Math.min(2.7, Math.max(0.24, n * unitGap(a))) * stretch;
  return Array.from({ length: n }, (_, i) => (1 - Math.pow(1 - waveAt(a, i, n - 1), 2.2)) * span);
}

/** How long one unit takes: a wipe needs a little longer than a move to read as a wipe. */
export const unitDuration = (a: Anim) => a.duration * (!a.plan?.length && a.feel === 'reveal' ? 1.13 : 1);

/** The whole entrance, first unit to last landing. */
export function wordsTotal(a: Anim, n: number) {
  return Math.max(0, ...unitDelays(a, n)) + unitDuration(a);
}

// ─── Keyframes ──────────────────────────────────────────────────────────────
// A property is animated between the keyframes that name it, each segment eased on its own — which
// is how CSS runs a keyframe set with one timing function.
type Track = [number, number][];
function sample(track: Track, p: number, ease: (t: number) => number) {
  if (p <= track[0][0]) return track[0][1];
  for (let i = 1; i < track.length; i++) {
    const [x0, y0] = track[i - 1], [x1, y1] = track[i];
    if (p <= x1) return x1 === x0 ? y1 : y0 + (y1 - y0) * ease((p - x0) / (x1 - x0));
  }
  return track[track.length - 1][1];
}

interface Frames { alpha: Track; dx?: Track; dy?: Track; rot?: Track; scale?: Track; blur?: Track; top?: Track; bottom?: Track }

function look(f: Frames, p: number, ease: (t: number) => number): UnitLook {
  const s = (t: Track | undefined, rest: number) => (t ? sample(t, p, ease) : rest);
  const top = f.top ? s(f.top, 0) : null, bottom = f.bottom ? s(f.bottom, 1.18) : null;
  return {
    alpha: s(f.alpha, 1), dx: s(f.dx, 0), dy: s(f.dy, 0), rot: s(f.rot, 0), scale: s(f.scale, 1), blur: Math.max(0, s(f.blur, 0)),
    clip: top === null && bottom === null ? null : [top ?? 0, bottom ?? 1.18],
  };
}

/** The three effects, arriving once (sf-word-rise / -fade / -reveal). */
function feelFrames(a: Anim): Frames {
  const lift = liftFor(a.duration);
  if (a.feel === 'fade') return { alpha: [[0, 0], [1, 1]], blur: [[0, 4], [1, 0]] };
  if (a.feel === 'reveal') return { alpha: [[0, 1], [1, 1]], bottom: [[0, 0], [1, 1.18]], dy: [[0, 0.22], [1, 0]] };
  return { alpha: [[0, 0], [0.6, 1], [1, 1]], dy: [[0, lift], [1, 0]], blur: [[0, 7], [1, 0]] };
}

/** The same three, round and round: in by 10%, held to 58%, out by 86%, then a pause (sf-cycle-*). */
function feelCycle(a: Anim): Frames {
  const lift = liftFor(a.duration);
  const io = (v0: number, v: number, v1: number): Track => [[0, v0], [0.1, v], [0.58, v], [0.86, v1], [1, v1]];
  if (a.feel === 'fade') return { alpha: io(0, 1, 0), blur: io(4, 0, 5) };
  if (a.feel === 'reveal') return { alpha: io(1, 1, 1), top: io(0, 0, 1), bottom: io(0, 1.18, 1), dy: io(0.22, 0, -0.18) };
  return { alpha: io(0, 1, 0), dy: io(lift, 0, -0.8 * lift), blur: io(7, 0, 8) };
}

/** A planned unit's arc from its own start (sf-word-plan, -bounce, -mist). */
function planFrames(st: PlanStep, arc: WordArc): Frames {
  const X = st.dx ?? 0, Y = st.dy ?? 0, R = st.rot ?? 0, S = st.scale ?? 1, B = st.blur ?? 0;
  const tr = (k: number) => ({ dx: X * k, dy: Y * k, rot: R * k });
  if (arc === 'bounce') {
    const at = [0, 0.6, 0.78, 0.9, 1], ks = [1, -0.16, 0.07, -0.03, 0];
    const sc = [S, 1 + (1 - S) * 0.16, 1 - (1 - S) * 0.07, 1 + (1 - S) * 0.03, 1];
    return {
      alpha: [[0, 0], [0.42, 1], [1, 1]], blur: [[0, B], [0.42, 0], [1, 0]],
      dx: at.map((p, i) => [p, tr(ks[i]).dx]), dy: at.map((p, i) => [p, tr(ks[i]).dy]), rot: at.map((p, i) => [p, tr(ks[i]).rot]),
      scale: at.map((p, i) => [p, sc[i]]),
    };
  }
  if (arc === 'mist') {
    const Bm = Math.max(B, 5);
    return {
      alpha: [[0, 0], [0.22, 0.3], [0.55, 0.72], [1, 1]], blur: [[0, Bm], [0.55, Bm * 0.5], [1, 0]],
      dx: [[0, X], [0.55, X * 0.08], [1, 0]], dy: [[0, Y], [0.55, Y * 0.08], [1, 0]], rot: [[0, R], [0.55, R * 0.08], [1, 0]],
      scale: [[0, S], [0.55, S + (1 - S) * 0.92], [1, 1]],
    };
  }
  return { alpha: [[0, 0], [0.7, 1], [1, 1]], dx: [[0, X], [1, 0]], dy: [[0, Y], [1, 0]], rot: [[0, R], [1, 0]], scale: [[0, S], [1, 1]], blur: [[0, B], [1, 0]] };
}

/** A planned unit, round and round. Loops are never bouncy: an overshoot every seven seconds is a distraction with no end. */
function planCycle(st: PlanStep, arc: WordArc): Frames {
  const X = st.dx ?? 0, Y = st.dy ?? 0, R = st.rot ?? 0, S = st.scale ?? 1, B = st.blur ?? 0;
  if (arc === 'mist') {
    const Bm = Math.max(B, 5);
    const io = (v0: number, v: number, v1: number): Track => [[0, v0], [0.14, v], [0.56, v], [0.82, v1], [1, v1]];
    return { alpha: io(0, 1, 0), dx: io(X, 0, X * 0.5), dy: io(Y, 0, Y * 0.5), rot: io(R, 0, R * 0.5), scale: io(S, 1, S), blur: io(Bm, 0, Bm) };
  }
  const io = (v0: number, v: number): Track => [[0, v0], [0.1, v], [0.58, v], [0.86, v0], [1, v0]];
  return { alpha: io(0, 1), dx: io(X, 0), dy: io(Y, 0), rot: io(R, 0), scale: io(S, 1), blur: io(B, 0) };
}

/**
 * Unit i of n, `t` seconds after the entrance began. Before its delay a unit is at its first
 * keyframe (hidden); a loop keeps each unit on its own phase, shifted by its delay, for ever.
 */
export function unitLook(a: Anim, i: number, n: number, t: number, ease: (x: number) => number, delays = unitDelays(a, n)): UnitLook {
  if (!Number.isFinite(t)) return AT_REST;
  const st = a.plan?.length ? a.plan[i] ?? {} : null;
  const arc: WordArc = st?.arc ?? 'settle';
  const local = t - (delays[i] ?? 0);
  if (a.leave) {
    const C = cycleFor(a.duration);
    const f = st ? planCycle(st, arc) : feelCycle(a);
    return look(f, local <= 0 ? 0 : (local % C) / C, ease);
  }
  const f = st ? planFrames(st, arc) : feelFrames(a);
  return look(f, Math.max(0, Math.min(1, local / Math.max(0.01, unitDuration(a)))), ease);
}

/** How far any unit can stray from its place, in em, so the raster leaves room for it. */
export function reach(a: Anim): number {
  let r = a.feel === 'rise' || !a.feel ? liftFor(a.duration) : 0.25;
  for (const s of a.plan ?? []) r = Math.max(r, Math.abs(s.dx ?? 0), Math.abs(s.dy ?? 0) * 1.2 + Math.max(0, (s.scale ?? 1) - 1));
  return r + 0.2;
}

// ─── Plans an author starts from ───────────────────────────────────────────
// A plan is a starting point, not a black box: each preset writes ordinary per-unit numbers the
// Choreography rows then show and let you change.

export type PlanPreset = 'bounce' | 'mist' | 'letters' | 'scatter' | 'settle';
export const PLAN_PRESETS: { value: PlanPreset; label: string; unit: 'words' | 'letters' }[] = [
  { value: 'bounce', label: 'Bounce — falls, overshoots, settles', unit: 'words' },
  { value: 'mist', label: 'Mist — resolves out of fog', unit: 'words' },
  { value: 'letters', label: 'Typed — letter by letter', unit: 'letters' },
  { value: 'scatter', label: 'Scatter — gathers from all sides', unit: 'words' },
  { value: 'settle', label: 'Settle — a gentle rise, word by word', unit: 'words' },
];

/** The units a text animates over, as the raster splits it: words, or letters without the spaces. */
export function unitsOf(text: string, unit: 'words' | 'letters'): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  return unit === 'letters' ? words.flatMap((w) => w.split('')) : words;
}

/** A plan for this text, SlideForge's numbers: Bounce and Mist as the Motion lab's slides set them,
 *  letters 90 ms apart with 150 at a word break. */
export function makePlan(preset: PlanPreset, text: string): { type: 'words' | 'letters'; plan: PlanStep[]; easing: Easing; duration: number } {
  const unit = PLAN_PRESETS.find((p) => p.value === preset)?.unit ?? 'words';
  const words = text.split(/\s+/).filter(Boolean);
  const wave = (i: number, v: number[]) => v[i % v.length];
  if (preset === 'letters') {
    const plan: PlanStep[] = [];
    let at = 0;
    words.forEach((w, wi) => {
      for (let k = 0; k < w.length; k++) {
        plan.push({ dy: -0.25, blur: 2, delay: Math.round(at * 1000) / 1000 });
        at += k === w.length - 1 ? (wi < words.length - 1 ? 0.15 : 0) : 0.09;
      }
    });
    return { type: 'letters', plan, easing: 'easyEase', duration: 0.32 };
  }
  const n = unitsOf(text, unit).length;
  const plan = Array.from({ length: n }, (_, i): PlanStep => {
    if (preset === 'bounce') return { dy: wave(i, [-2.2, -1.8, -2.4, -1.4, -2]), blur: wave(i, [3, 3, 4, 2, 3]), delay: +(i * 0.22).toFixed(3), arc: 'bounce' };
    if (preset === 'mist') return { dy: wave(i, [0.6, 0.5, 0.6, 0.4, 0.7]), scale: wave(i, [1.15, 1.1, 1.12, 1.08, 1.2]), blur: wave(i, [13, 12, 14, 11, 14]), delay: +(i * 0.35).toFixed(3), arc: 'mist' };
    if (preset === 'scatter') return { dx: wave(i, [-1.6, 1.2, -0.8, 1.8, -1.2, 0.9]), dy: wave(i, [-1.2, 1, 1.4, -0.9, 0.7, -1.5]), rot: wave(i, [-14, 10, 8, -12, 6, -8]), scale: 0.8, blur: 6, delay: +(i * 0.12).toFixed(3) };
    return { dy: 0.5, blur: 6, delay: +(i * 0.13).toFixed(3) };
  });
  return { type: 'words', plan, easing: 'easyEase', duration: preset === 'bounce' || preset === 'mist' ? 1.3 : 0.7 };
}
