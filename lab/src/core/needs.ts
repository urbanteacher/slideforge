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
  for (const l of s.layers) {
    if (l.visible === false) continue;
    const src = String((l.params as Record<string, unknown>).src ?? '').trim();
    if (!src) continue;
    if (l.kind === 'video' && /youtube\.com|youtu\.be|vimeo\.com/i.test(src)) out.add('internet');
    else if (/^https?:\/\//i.test(src) && !isSameSite(src)) out.add('internet');
  }
  return [...out];
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
