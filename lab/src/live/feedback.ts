// Audience feedback in the room (docs/games/protocol.md §9): a slide's poll, word cloud, brainstorm or scale is
// opened as a `prompt` when the show lands on the slide, the relay sums the phones' replies into a digest
// (`responses`) the host keeps, and `promptEnd` closes it when the teacher moves on or presses close. This file is
// the pure part: what a slide asks (from the same SlideForge logic classic reads, src/deck/feedback.js) and the
// frame classic sends for it (js/live.js syncPrompt). The host (host.ts) sends it; the room (room.ts) keeps the digest.

import { normalizeFeedback, scaleLabels, slideFeedback } from '@sf/deck/feedback.js';
import type { Slide } from '../core';
import type { PromptFields } from './protocol';

/** What a feedback slide asks of the room: the `prompt` frame (it carries `hold`, the split held back until the teacher shows it). */
export type RoomFeedback = PromptFields;

/** The prompt a slide collects, or null: the slide has none, or it is not complete (classic's slideFeedback). */
export function feedbackOf(slide: Pick<Slide, 'id' | 'feedback'>): RoomFeedback | null {
  const f = slideFeedback({ feedback: normalizeFeedback(slide.feedback) });
  if (!f) return null;
  // The labels classic's feedbackViewOpts builds: a scale's points are numbers and its two ends are named.
  const options = f.kind === 'scale' ? scaleLabels(f) : f.options;
  return {
    id: `${slide.id}:fb`, kind: f.kind, prompt: f.prompt,
    options: options.filter((o) => String(o).trim()),
    ends: f.kind === 'scale' ? { low: f.lowLabel ?? '', high: f.highLabel ?? '' } : null,
    max: f.max, presentAs: f.presentAs === 'focus' ? 'focus' : 'rail', hold: f.hold === true,
  };
}
