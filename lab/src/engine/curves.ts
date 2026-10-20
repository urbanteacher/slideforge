/*
 * Motion curves, named for the move they make (the motion studio's tokens: ~/Desktop/App /animations,
 * 03-motion-numbers.md and lib/js/motion.js). Enter on an ease-out, move on an ease-in-out, exit on an
 * ease-in and faster than you came in, pop on an overshoot; linear only for spin and progress.
 *
 * Springs are named by their damping ratio ζ, the one number every animation library's spring reduces
 * to: 1 does not bounce, 0.7–0.85 reads as premium, 0.4–0.6 as playful, under 0.3 as a cartoon. They are
 * closed-form, so any moment can be drawn on its own (a thumbnail, an export, a seek) without stepping
 * through the frames before it. Position and size may bounce; opacity and colour never do.
 */
import type { Easing, ExitType, Layer } from '../core';

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

const TAU = Math.PI * 2;

/** A spring from rest at 0 to 1, at time t (s): ζ the damping ratio, hz how fast it swings. */
export function spring(t: number, zeta = 0.7, hz = 2): number {
  if (t <= 0) return 0;
  const w = TAU * hz;
  if (zeta >= 1) return 1 - Math.exp(-w * t) * (1 + w * t);
  const wd = w * Math.sqrt(1 - zeta * zeta);
  return 1 - Math.exp(-zeta * w * t) * (Math.cos(wd * t) + ((zeta * w) / wd) * Math.sin(wd * t));
}

/** A decaying wobble 0 → peak → 0 at time t (s), for impacts and follow-through. */
export function kick(t: number, zeta = 0.35, hz = 3): number {
  if (t <= 0) return 0;
  const w = TAU * hz, wd = w * Math.sqrt(1 - zeta * zeta);
  return Math.exp(-zeta * w * t) * Math.sin(wd * t);
}

/** A spring as an easing over an animation's duration: tuned so it has settled (to 0.1%) by the end. */
function springEase(zeta: number) {
  const w = 6.9 / zeta; // e^(−ζ·w) = 0.001 at progress 1
  return (u: number) => (u >= 1 ? 1 : spring(u, zeta, w / TAU));
}

/** The damping ratio of each named spring. */
export const SPRING_ZETA = { springPremium: 0.8, springPlayful: 0.5, springBouncy: 0.35 } as const;

export const EASE: Record<Easing, (t: number) => number> = {
  // After Effects' Easy Ease, 33% influence each side — what SlideForge's words move on.
  easyEase: bezier(0.33, 0, 0.67, 1),
  linear: (t) => t,
  cubicOut: (t) => 1 - Math.pow(1 - t, 3),
  quintOut: (t) => 1 - Math.pow(1 - t, 5),
  expoOut: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  cubicInOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  // ease-in-out-quart, (0.76, 0, 0.24, 1): moves across the frame, slide transitions, the camera.
  quartInOut: bezier(0.76, 0, 0.24, 1),
  // ease-in: exits. They hold, then go — the eye has already moved on.
  cubicIn: (t) => t * t * t,
  expoIn: bezier(0.7, 0, 0.84, 0),
  backOut: (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  // SlideForge's original spring (≈ ζ 0.5), kept as it was so decks that use it look the same.
  spring: (t) => (t >= 1 ? 1 : 1 - Math.exp(-6.5 * t) * Math.cos(t * 11)),
  springPremium: springEase(SPRING_ZETA.springPremium),
  springPlayful: springEase(SPRING_ZETA.springPlayful),
  springBouncy: springEase(SPRING_ZETA.springBouncy),
};

/** The curve for each kind of move, and the rules that go with them. Name the move; never inline a curve. */
export const MOTION = {
  enter: 'expoOut',
  move: 'quartInOut',
  exit: 'expoIn',
  pop: 'backOut',
  /** An exit takes this share of its entrance's duration (40–50% shorter), never under `exitMin`. */
  exitShare: 0.5,
  exitMin: 0.15,
  /** "Overlapping previous" starts when the previous animation is this far through (30–50% overlap). */
  overlapAt: 0.6,
  /** An ambient loop grows in over this long once its entrance has settled, rather than starting mid-swing. */
  loopRamp: 0.8,
} as const satisfies Record<string, Easing | number>;

/** How long a layer's exit takes: its own duration, else half its entrance. */
export function exitDuration(layer: Layer): number {
  const x = layer.anim.exit;
  if (x?.duration && x.duration > 0) return x.duration;
  return Math.max(MOTION.exitMin, layer.anim.duration * MOTION.exitShare);
}

export interface ExitPose { opacity: number; dx: number; dy: number; scale: number; blur: number; gone: boolean }

/**
 * Where a leaving layer is, `local` seconds into its exit. Reduced motion: every exit is a fade.
 * Opacity goes on a plain ease-in, so it never bounces whatever the movement does.
 */
export function exitPose(layer: Layer, type: ExitType, local: number, reduce = false): ExitPose {
  const dur = exitDuration(layer);
  const raw = Math.max(0, Math.min(1, local / dur));
  const p = EASE[layer.anim.exit?.easing ?? MOTION.exit](raw);
  const pose: ExitPose = { opacity: 1 - EASE.cubicIn(raw), dx: 0, dy: 0, scale: 1, blur: 0, gone: raw >= 1 };
  if (reduce) return pose;
  const reach = Math.min(120, (layer.box?.h ?? 200) * 0.5 + 40);
  switch (type) {
    case 'sink': pose.dy = p * reach; break;
    case 'lift': pose.dy = -p * reach; break;
    case 'slideLeft': pose.dx = -p * 220; break;
    case 'slideRight': pose.dx = p * 220; break;
    case 'shrink': pose.scale = 1 - 0.18 * p; break;
    case 'blur': pose.blur = p * 6; pose.scale = 1 + 0.04 * p; break;
    default: break; // fade
  }
  return pose;
}

/** 0 → 1 over `MOTION.loopRamp` seconds from `since`, smoothly: how much of an ambient loop is showing. */
export function loopEnvelope(since: number): number {
  if (!Number.isFinite(since)) return 1;
  const u = Math.max(0, Math.min(1, since / MOTION.loopRamp));
  return u * u * (3 - 2 * u);
}
