import type { Deck, Slide } from '../core';
import { animTotal, schedule } from './anim';
import { exitDuration } from './curves';

// A slide's timeline, as the scrubber under the canvas draws it and the video export plays it: its
// builds clicked for it, each `hold` seconds after the step before has arrived, as the canvas's Play
// does (with its 0.6 s). Time 0 is the slide's arrival, so a transition in runs over its first seconds.
// Nothing here is edited: the bars are read from the layers' animation settings, which stay the
// Animate panel's.

/** The clicks of a slide played on its own, and how long it runs: `hold` after its last step. */
export function autoClicks(slide: Slide, hold: number): { clicks: number[]; length: number } {
  const sch = schedule(slide, []);
  const clicks: number[] = [];
  let acc = (sch.stepEnds[0] ?? 0) + hold;
  for (let i = 1; i <= sch.steps; i++) { clicks.push(acc); acc += (sch.stepEnds[i] ?? 0) + hold; }
  // A transition in is part of the slide's time: never end before it has finished.
  const lead = slide.transition.type !== 'none' ? slide.transition.duration : 0;
  return { clicks, length: Math.max(acc, lead + hold) };
}

export type Span = [number, number];
export interface Track {
  id: string;
  name: string;
  kind: string;
  /** The entrance, and each further line or state that arrives on a click of its own. */
  in: Span[];
  /** An ambient loop, from when the entrance has settled to when the layer leaves (or the end). */
  loop: Span | null;
  /** Leaving: an exit, or "clears itself". */
  out: Span | null;
  /** The entrance waits for a click (the step it opens), or 0 when it arrives with the slide. */
  step: number;
}
export interface SlideTimeline { clicks: number[]; length: number; tracks: Track[] }

export function slideTimeline(slide: Slide, hold: number): SlideTimeline {
  const { clicks, length } = autoClicks(slide, hold);
  const sch = schedule(slide, clicks);
  const tracks: Track[] = [];
  for (const l of slide.layers) {
    if (!l.visible) continue;
    const a = l.anim;
    const moves = a.type !== 'none', loops = a.loop !== 'none', leaves = !!a.exit || (a.clearAfter ?? 0) > 0;
    if (!moves && !loops && !leaves) continue;
    const s = sch.start.get(l.id) ?? 0;
    const total = moves ? animTotal(l) : 0;
    const spans: Span[] = moves ? [[s, s + total]] : [];
    const lines = sch.lines.get(l.id);
    if (lines) for (const at of lines.slice(1)) spans.push([at, at + a.duration]);
    let out: Span | null = null;
    const exitAt = sch.exit.get(l.id);
    if (exitAt !== undefined && Number.isFinite(exitAt)) out = [exitAt, exitAt + exitDuration(l)];
    else if ((a.clearAfter ?? 0) > 0) { const at = s + total + a.clearAfter!; out = [at, at + 0.8]; }
    const settled = Math.max(...spans.map((x) => x[1]), moves ? s + total : 0);
    const loop: Span | null = loops ? [settled, out ? out[0] : length] : null;
    tracks.push({ id: l.id, name: l.name, kind: l.kind, in: spans, loop, out, step: stepOf(s, clicks) });
  }
  return { clicks, length, tracks };
}

/** Which click a start time belongs to: 0 with the slide, k after the k-th click. */
function stepOf(t: number, clicks: number[]): number {
  let k = 0;
  for (let i = 0; i < clicks.length; i++) if (t >= clicks[i] - 1e-6) k = i + 1;
  return k;
}

// ─── A reel: slides played one after another, for the video export ────────────
export interface ReelPart { slide: Slide; prev: Slide | null; start: number; length: number; clicks: number[] }
export interface Reel { parts: ReelPart[]; length: number }

/** The slides shown one after the other, each with its builds clicked for it and its transition in
 *  from the slide before (the first has none, as a show starts on it). Hidden slides are left out. */
export function reel(slides: Slide[], hold: number): Reel {
  const parts: ReelPart[] = [];
  let at = 0;
  for (const s of slides.filter((x) => !x.hidden)) {
    const prev = parts.length ? parts[parts.length - 1].slide : null;
    const solo = prev ? s : { ...s, transition: { ...s.transition, type: 'none' as const } };
    const { clicks, length } = autoClicks(solo, hold);
    parts.push({ slide: s, prev, start: at, length, clicks });
    at += length;
  }
  return { parts, length: at };
}

export const deckReel = (deck: Deck, hold: number) => reel(deck.slides, hold);

/** What a reel shows at time t: the part, the slide's own clock, and how far its transition in has gone
 *  (null once it has finished, or when there is none). */
export function reelAt(r: Reel, t: number): { part: ReelPart; local: number; trans: number | null } | null {
  if (!r.parts.length) return null;
  let part = r.parts[r.parts.length - 1];
  for (const p of r.parts) if (t < p.start + p.length) { part = p; break; }
  const local = Math.max(0, t - part.start);
  const tr = part.slide.transition;
  const trans = part.prev && tr.type !== 'none' && tr.duration > 0 && local < tr.duration ? local / tr.duration : null;
  return { part, local, trans };
}

/** The frames of a reel at `fps`: frame n is drawn at n / fps. */
export const frameCount = (r: Reel, fps: number) => Math.max(1, Math.round(r.length * fps));
