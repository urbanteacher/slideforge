// A SlideForge slide's audience feedback, as the lab keeps it. The converter (decks/fromSlideForge.ts) and
// the Engage catalogue (engage/index.ts) both read it.
import type { FeedbackKind, SlideFeedback } from '../core';
import type { SFSlide } from '../decks';

const KINDS: FeedbackKind[] = ['poll', 'wordcloud', 'brainstorm', 'scale'];

/** A SlideForge slide's feedback, as the lab keeps it: the known fields only, each checked. */
/** A SlideForge slide's audience feedback, with its settings, as the lab keeps it. */
export function feedbackOf(f: SFSlide['feedback']): SlideFeedback | null {
  if (!f || !KINDS.includes(f.kind as FeedbackKind)) return null;
  const out: SlideFeedback = { kind: f.kind as FeedbackKind };
  if (typeof f.prompt === 'string' && f.prompt.trim()) out.prompt = f.prompt;
  if (Array.isArray(f.options)) out.options = f.options.map(String).filter((o) => o.trim());
  if (Number(f.max) > 0) out.max = Number(f.max);
  if (f.presentAs === 'rail' || f.presentAs === 'focus') out.presentAs = f.presentAs;
  if (Number(f.points) > 0) out.points = Number(f.points);
  if (typeof f.lowLabel === 'string') out.lowLabel = f.lowLabel;
  if (typeof f.highLabel === 'string') out.highLabel = f.highLabel;
  if ((f as { hold?: unknown }).hold === true) out.hold = true;
  return out;
}
