import type { Anim, Easing, EntranceType, Interact, Layer, Slide } from '../model/types';
import { isWordMotion, wordsTotal } from './words';

/** A CSS cubic-bezier(x1, y1, x2, y2) as a function of progress: solve x for t, return y. */
function bezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = (t: number) => ((ax * t + bx) * t + cx) * t, Y = (t: number) => ((ay * t + by) * t + cy) * t;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0, hi = 1, t = x;
    for (let i = 0; i < 24; i++) { const v = X(t); if (Math.abs(v - x) < 1e-5) break; if (v < x) lo = t; else hi = t; t = (lo + hi) / 2; }
    return Y(t);
  };
}

export const EASE: Record<Easing, (t: number) => number> = {
  // After Effects' Easy Ease, 33% influence each side — what SlideForge's words move on.
  easyEase: bezier(0.33, 0, 0.67, 1),
  linear: (t) => t,
  cubicOut: (t) => 1 - Math.pow(1 - t, 3),
  quintOut: (t) => 1 - Math.pow(1 - t, 5),
  expoOut: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  cubicInOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  backOut: (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  spring: (t) => (t >= 1 ? 1 : 1 - Math.exp(-6.5 * t) * Math.cos(t * 11)),
};

export const TEXT_UNIT_TYPES: EntranceType[] = ['letters', 'words', 'lines', 'typewriter'];
export const isTextUnit = (t: EntranceType) => TEXT_UNIT_TYPES.includes(t);

export const defaultAnim = (): Anim => ({
  type: 'none', duration: 0.9, delay: 0, easing: 'expoOut', trigger: 'withSlide', stagger: 0.03,
  loop: 'none', loopSpeed: 1, loopAmount: 1,
});

export const defaultInteract = (): Interact => ({
  followMouse: false, parallax: 0, hover: 'none', click: 'none', gotoSlide: 1, url: '',
});

/** Number of unit items a text layer animates over (for its total duration). */
export function textUnitCount(layer: Layer): number {
  const text = String(layer.params.text ?? '');
  // list bullets and numbers animate in as units of their own
  const items = layer.params.list && layer.params.list !== 'none' ? text.split('\n').filter((x) => x.trim()).length : 0;
  switch (layer.anim.type) {
    case 'letters':
    case 'typewriter':
      return Math.max(1, text.replace(/\s/g, '').length + items * (layer.params.list === 'numbers' ? 2 : 1));
    case 'words':
      return Math.max(1, text.split(/\s+/).filter(Boolean).length + items);
    case 'lines':
      return Math.max(1, text.split('\n').length + 1);
    default:
      return 1;
  }
}

/** How many lines a text builds one click at a time: 0 when it does not. Empty lines are not steps. */
export function buildLines(l: Layer): number {
  if (l.kind !== 'text' || !l.anim.build || l.anim.build === 'none') return 0;
  return String(l.params.text ?? '').split('\n').filter((x) => x.trim()).length;
}

/** A chart that draws itself: how many bars, points or wedges it draws, one after another. */
export const isChartDraw = (l: Layer) => l.kind === 'chart' && l.anim.type === 'draw';
export function chartItems(l: Layer): number {
  return Math.max(1, String(l.params.data ?? '').split('\n').filter((x) => x.trim()).length);
}

export function animTotal(layer: Layer): number {
  const a = layer.anim;
  if (a.type === 'none') return 0;
  if (isWordMotion(layer)) return wordsTotal(a, textUnitCount(layer));
  if (layer.kind === 'text' && isTextUnit(a.type)) return a.duration + (textUnitCount(layer) - 1) * a.stagger;
  if (isChartDraw(layer)) return a.duration + (chartItems(layer) - 1) * a.stagger;
  return a.duration;
}

// SlideForge's word motion is two choices, not two numbers: how fast (each unit's move, and how far
// apart the wave spreads with it) and how far apart the units are. The numbers are words.js's:
// 1300/700/320 ms a word, the wave stretched 1.8/1/0.45, and spread 0/1/2.5 times.
export const SPEEDS = { gentle: { duration: 1.3, span: 1.8 }, medium: { duration: 0.7, span: 1 }, quick: { duration: 0.32, span: 0.45 } } as const;
export const SPACINGS = { together: 0, wave: 1, one: 2.5 } as const;
export type Speed = keyof typeof SPEEDS;
export type Spacing = keyof typeof SPACINGS;
/** The gap between two units at Medium, Wave: a word's step is longer than a letter's. */
function unitGap(type: EntranceType) {
  return type === 'letters' || type === 'typewriter' ? 0.048 : type === 'lines' ? 0.2 : 0.13;
}
export function presetTiming(type: EntranceType, speed: Speed, spacing: Spacing) {
  const sp = SPEEDS[speed];
  return { duration: sp.duration, stagger: Math.round(unitGap(type) * sp.span * SPACINGS[spacing] * 1000) / 1000 };
}
/** Which preset an animation's numbers are, if any; null once the sliders have been moved off them. */
export function presetOf(a: Anim): { speed: Speed; spacing: Spacing } | null {
  for (const speed of Object.keys(SPEEDS) as Speed[]) {
    if (Math.abs(SPEEDS[speed].duration - a.duration) > 0.001) continue;
    for (const spacing of Object.keys(SPACINGS) as Spacing[]) {
      if (Math.abs(presetTiming(a.type, speed, spacing).stagger - a.stagger) < 0.0015) return { speed, spacing };
    }
  }
  return null;
}

export interface Schedule {
  start: Map<string, number>; // layer id → start time (s, slide clock); Infinity = waiting for a click
  lines: Map<string, number[]>; // text built a line per click → each line's start
  steps: number; // number of click builds on the slide
  stepEnds: number[]; // (relative) duration of each step, for auto-play
}

/**
 * Walk layers bottom→top. `onClick` layers open a new build step; `afterPrev` chains to the
 * end of the previous animation; `withSlide` starts with the current step.
 */
export function schedule(slide: Slide, clicks: number[]): Schedule {
  const start = new Map<string, number>();
  const lines = new Map<string, number[]>();
  let step = 0;
  let stepBase = 0;
  let prevEnd = 0;
  let stepLocalEnd = 0;
  const stepEnds: number[] = [];
  for (const l of slide.layers) {
    if (!l.visible || l.anim.type === 'none') continue;
    const a = l.anim;
    let s: number;
    if (a.trigger === 'onClick') {
      stepEnds.push(stepLocalEnd);
      step++;
      stepBase = clicks[step - 1] ?? Infinity;
      stepLocalEnd = 0;
      s = stepBase + a.delay;
    } else if (a.trigger === 'afterPrev') {
      s = prevEnd + a.delay;
    } else {
      s = stepBase + a.delay;
    }
    start.set(l.id, s);
    prevEnd = s + animTotal(l);
    if (Number.isFinite(stepBase)) stepLocalEnd = Math.max(stepLocalEnd, prevEnd - stepBase);
    else stepLocalEnd = Math.max(stepLocalEnd, a.delay + animTotal(l));
    // A text built a line at a time: its first line arrives as the layer would, and every further
    // line is a click of its own.
    const n = buildLines(l);
    if (n > 1) {
      const starts = [s];
      for (let i = 1; i < n; i++) {
        stepEnds.push(stepLocalEnd);
        step++;
        stepBase = clicks[step - 1] ?? Infinity;
        stepLocalEnd = a.duration;
        starts.push(stepBase);
        prevEnd = stepBase + a.duration;
      }
      lines.set(l.id, starts);
    }
  }
  stepEnds.push(stepLocalEnd);
  return { start, lines, steps: step, stepEnds };
}

/** How far a dimmed point falls back: dim keeps it readable; spotlight takes it further back. */
export const DIM_TO = { dim: 0.35, spot: 0.3 } as const;
const DIM_SECS = 0.5;

/**
 * Builds that light one point and not the others. Items of a set built one per click are dimmed
 * once a later item of the set has arrived, easing back over half a second; `spot` is how far the
 * spotlight's vignette has closed in (0–1), from the moment the first point of a spotlit build
 * appears. Nothing is dimmed on a static slide (t = Infinity): the editor and a handout show it all.
 */
export function stepLight(slide: Slide, sched: Schedule, t: number): { dim: Map<string, number>; spot: number } {
  const dim = new Map<string, number>();
  let spot = 0;
  if (!Number.isFinite(t)) return { dim, spot };
  const ramp = (from: number) => (Number.isFinite(from) && t >= from ? Math.min(1, (t - from) / DIM_SECS) : 0);
  const sets = new Map<string, { mode: 'on' | 'dim' | 'spot'; at: number[]; layers: Layer[] }>();
  for (const l of slide.layers) {
    const st = l.anim.step;
    if (st && l.visible && l.anim.type !== 'none') {
      let e = sets.get(st.set);
      if (!e) sets.set(st.set, (e = { mode: st.mode, at: [], layers: [] }));
      e.at[st.i] = Math.min(e.at[st.i] ?? Infinity, sched.start.get(l.id) ?? Infinity);
      e.layers.push(l);
    }
    if (l.anim.build === 'spot') spot = Math.max(spot, ramp(sched.lines.get(l.id)?.[0] ?? sched.start.get(l.id) ?? Infinity));
  }
  for (const e of sets.values()) {
    if (e.mode === 'on') continue;
    const at = e.at.filter((x) => x !== undefined);
    if (e.mode === 'spot') spot = Math.max(spot, ramp(Math.min(...at)));
    const floor = DIM_TO[e.mode];
    for (const l of e.layers) {
      const mine = e.at[l.anim.step!.i];
      // The first item to arrive after this one sends it back. Read off the clock, not the index, so
      // an item moved on the canvas (which swaps build order) still dims in the order it is shown.
      let later = Infinity;
      for (const x of at) if (x > mine && x <= t) later = Math.min(later, x);
      const k = ramp(later);
      if (k > 0) dim.set(l.id, 1 - (1 - floor) * k);
    }
  }
  return { dim, spot };
}

export interface LayerState {
  visible: boolean;
  opacity: number;
  dx: number;
  dy: number;
  scale: number;
  rot: number; // degrees (added to box rotation)
  blur: number; // mip level
  clip: [number, number, number, number];
  glow: number;
  /** seconds since the entrance started (Infinity when fully built) — used by text units */
  textT: number;
  /** Where a picture looks inside its frame: centre x, y (0–1) and zoom. [0.5, 0.5, 1] is still. */
  view: [number, number, number];
}

const FULL_CLIP: [number, number, number, number] = [-9, -9, 9, 9];

export const IDLE_STATE = (): LayerState => ({
  visible: true, opacity: 1, dx: 0, dy: 0, scale: 1, rot: 0, blur: 0, clip: [...FULL_CLIP], glow: 0, textT: Infinity, view: [0.5, 0.5, 1],
});

/** Image motion, SlideForge's: a slow zoom that closes in on the focus, or a travel from the focus
 *  to a second point at a fixed zoom. Timed from when the picture arrives; still in the editor. */
function imageView(layer: Layer, local: number): [number, number, number] {
  const p = layer.params;
  const secs = Math.max(1, Number(p.motionSecs ?? 20));
  const k = Math.max(0, Math.min(1, local / secs));
  const f = (Array.isArray(p.focus) ? p.focus : [0.5, 0.5]) as [number, number];
  const keep = (c: number, z: number) => Math.max(0.5 / z, Math.min(1 - 0.5 / z, c));
  if (p.motion === 'zoom') {
    const z = 1 + 0.18 * EASE.cubicOut(k);
    return [keep(0.5 + (f[0] - 0.5) * k, z), keep(0.5 + (f[1] - 0.5) * k, z), z];
  }
  const g = (Array.isArray(p.focus2) ? p.focus2 : [0.7, 0.4]) as [number, number];
  // SlideForge's travelFrame: scaled 1.2, the focus centred as far as the frame allows, on Easy Ease.
  const z = 1.2, e = EASE.easyEase(k);
  return [keep(f[0] + (g[0] - f[0]) * e, z), keep(f[1] + (g[1] - f[1]) * e, z), z];
}

/**
 * Evaluate a layer's animated state.
 * @param t slide clock (s). Pass Infinity for a fully built, static slide.
 */
export function layerState(layer: Layer, start: number | undefined, t: number, time: number): LayerState {
  const st = IDLE_STATE();
  const a = layer.anim;
  const h = layer.box?.h ?? 200;

  if (a.type !== 'none' && start !== undefined && Number.isFinite(t)) {
    const local = t - start;
    if (!(local >= 0)) {
      st.visible = false;
      st.opacity = 0;
      return st;
    }
    const textUnits = (layer.kind === 'text' && isTextUnit(a.type) && !buildLines(layer)) || isChartDraw(layer);
    st.textT = textUnits ? local : Infinity;
    // A line-by-line build moves each line itself (see the renderer), and a chart that draws itself
    // draws its own bars; the box just appears.
    if (!textUnits && !buildLines(layer)) {
      const raw = Math.min(1, local / Math.max(0.01, a.duration));
      const e = EASE[a.easing](raw);
      const inv = 1 - e;
      const fade = Math.min(1, EASE.cubicOut(raw) * 1.4);
      switch (a.type) {
        case 'fade': st.opacity = fade; break;
        case 'rise': st.opacity = fade; st.dy = inv * Math.min(120, h * 0.5 + 40); break;
        case 'drop': st.opacity = fade; st.dy = -inv * Math.min(120, h * 0.5 + 40); break;
        case 'slideLeft': st.opacity = fade; st.dx = inv * 220; break;
        case 'slideRight': st.opacity = fade; st.dx = -inv * 220; break;
        case 'zoomIn': st.opacity = fade; st.scale = 0.82 + 0.18 * e; break;
        case 'zoomOut': st.opacity = fade; st.scale = 1.25 - 0.25 * e; break;
        case 'pop': st.opacity = Math.min(1, raw * 3); st.scale = Math.max(0.001, e); break;
        case 'blur': st.opacity = fade; st.blur = inv * 6; st.scale = 1.04 - 0.04 * e; break;
        case 'wipeUp': st.clip = [-9, 1 - e * 1.02, 9, 9]; break;
        case 'wipeRight': st.clip = [-9, -9, e * 1.02, 9]; break;
        case 'spin': st.opacity = fade; st.rot = -inv * 120; st.scale = 0.6 + 0.4 * e; break;
      }
    }
  }

  // Picture motion runs on the slide clock from the moment the picture arrives.
  if (layer.kind === 'image' && (layer.params.motion ?? 'none') !== 'none' && Number.isFinite(t)) {
    st.view = imageView(layer, t - (start !== undefined && Number.isFinite(start) ? start : 0));
  }
  // "Clears itself": fade away a set time after arriving, and stay gone.
  if (a.clearAfter && a.clearAfter > 0 && Number.isFinite(t)) {
    const since = t - (start !== undefined && Number.isFinite(start) ? start : 0) - a.clearAfter;
    if (since > 0) st.opacity *= 1 - Math.min(1, since / 0.8);
  }

  if (a.loop !== 'none') {
    const s = a.loopSpeed, amt = a.loopAmount;
    switch (a.loop) {
      case 'float': st.dy += Math.sin(time * s * 1.6 + hashId(layer.id)) * 10 * amt; break;
      case 'pulse': st.scale *= 1 + Math.sin(time * s * 2.4) * 0.025 * amt; break;
      case 'sway': st.rot += Math.sin(time * s * 1.4 + hashId(layer.id)) * 4 * amt; break;
      case 'spin': st.rot += time * s * 30 * amt; break;
      case 'breathe': st.opacity *= 1 - (0.5 + 0.5 * Math.sin(time * s * 1.8)) * 0.45 * amt; break;
    }
  }
  return st;
}

function hashId(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return (h % 1000) / 159;
}

/** Per-unit progress for text animations: 0 hidden … 1 settled. */
export function unitProgress(layer: Layer, index: number, textT: number): number {
  if (!Number.isFinite(textT)) return 1;
  const a = layer.anim;
  const n = textUnitCount(layer);
  // Direction: from the first unit, from the last, or from the middle outwards. With an even count
  // the middle two share the first beat.
  const k = a.order === 'last' ? n - 1 - index
    : a.order === 'center' ? Math.abs(index - (n - 1) / 2) - ((n - 1) % 2 ? 0.5 : 0)
    : index;
  let t = textT;
  if (a.leave) {
    // In, hold four seconds, out in the same order, round again.
    const inT = a.duration + (n - 1) * a.stagger, cycle = inT * 2 + 4;
    t = textT % cycle;
    if (t >= inT + 4) {
      const out = t - inT - 4 - k * a.stagger;
      if (a.type === 'typewriter') return out >= 0 ? 0 : 1;
      return 1 - EASE[a.easing](Math.max(0, Math.min(1, out / Math.max(0.01, a.duration))));
    }
  }
  const local = t - k * a.stagger;
  if (a.type === 'typewriter') return local >= 0 ? 1 : 0;
  const raw = Math.max(0, Math.min(1, local / Math.max(0.01, a.duration)));
  return EASE[a.easing](raw);
}
