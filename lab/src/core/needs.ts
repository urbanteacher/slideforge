import type { Deck, Slide } from './types';

// What a lesson needs to run (BACKLOG CS-13, from Claude Slides' capability list). Worked out from what is in the
// lesson rather than declared, so it cannot go out of date: a live room for its games, activities and audience
// feedback, and the internet for YouTube or Vimeo and for pictures on other sites. The show says when a need is
// not met as it opens (app/factsWarning.ts).

export type Need = 'room' | 'internet';

/** What one slide needs. */
export function slideNeeds(s: Slide): Need[] {
  const out = new Set<Need>();
  if (s.game || s.activity || s.feedback || s.nodes) out.add('room');
  // An address on another site anywhere in a shown layer's settings: a YouTube or Vimeo link, a picture on the web, a
  // gallery's pictures in a list. (A video link is such an address, so it needs no rule of its own.)
  if (s.layers.some((l) => l.visible !== false && webAddress(l.params))) out.add('internet');
  return [...out];
}

/** Whether a value holds an address on another site, however deep (as core/limits.ts reads a layer's pictures). */
function webAddress(v: unknown, depth = 0): boolean {
  if (depth > 6 || v == null) return false;
  if (typeof v === 'string') { const t = v.trim(); return /^https?:\/\//i.test(t) && !isSameSite(t); }
  if (Array.isArray(v)) return v.some((x) => webAddress(x, depth + 1));
  if (typeof v === 'object') return Object.values(v as Record<string, unknown>).some((x) => webAddress(x, depth + 1));
  return false;
}

function isSameSite(src: string): boolean {
  try { return typeof location !== 'undefined' && new URL(src).origin === location.origin; } catch { return false; }
}

/** Each need of the lesson's shown slides, with the slides (numbered from 1) that have it. */
export function lessonNeeds(deck: Deck): Partial<Record<Need, number[]>> {
  const out: Partial<Record<Need, number[]>> = {};
  deck.slides.forEach((s, i) => {
    if (s.hidden) return;
    for (const n of slideNeeds(s)) (out[n] ??= []).push(i + 1);
  });
  return out;
}
