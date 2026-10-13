// The teacher's quick poll (classic js/quick-poll.js and js/live.js startCustomPrompt): a prompt asked on the fly, not
// written on a slide. Pure: the shapes classic offers, and the `prompt` frame classic sends for one, built with the same
// SlideForge logic (src/deck/feedback.js). The host (host.ts) sends it and the room keeps its digest as a slide's.

import { makeFeedback, normalizeFeedback, scaleLabels } from '@sf/deck/feedback.js';
import type { PromptFields } from './protocol';

export type QuickKind = PromptFields['kind'];

/** One of the shapes the quick poll offers: each fills the question and the answers, which the teacher can change. */
export interface QuickPreset { key: string; label: string; kind: QuickKind; options: string[]; prompt?: string }

/** Classic's presets (js/quick-poll.js PRESETS), in its order. */
export const QUICK_PRESETS: readonly QuickPreset[] = [
  { key: 'yesno', label: 'Yes / No', kind: 'poll', options: ['Yes', 'No'] },
  { key: 'truefalse', label: 'True / False', kind: 'poll', options: ['True', 'False'] },
  { key: 'abcd', label: 'A / B / C / D', kind: 'poll', options: ['A', 'B', 'C', 'D'] },
  { key: 'scale', label: '1 to 5', kind: 'scale', options: [], prompt: 'How confident do you feel?' },
  { key: 'cloud', label: 'Word cloud', kind: 'wordcloud', options: [], prompt: 'One word: how was that?' },
];

/** What the teacher asks: the shape, the question, the answers (a poll's), and where the wall shows it (full screen by default). */
export interface QuickAsk { kind: QuickKind; prompt: string; options?: string[]; presentAs?: 'rail' | 'focus' }

/** Why this quick poll cannot be asked, or '' (classic's sheet guards: a question, and a poll's two answers). */
export function quickProblem(a: QuickAsk): string {
  if (!String(a.prompt ?? '').trim()) return 'Write the question the room is answering.';
  if (a.kind === 'poll' && (a.options ?? []).filter((o) => String(o).trim()).length < 2) return 'A poll needs at least two answers, one per line.';
  return '';
}

/** The `prompt` frame's fields for a quick poll (without its id, which the host gives it), as classic's startCustomPrompt
 *  builds them; null when it cannot be asked. */
export function quickFields(a: QuickAsk): Omit<PromptFields, 'id'> | null {
  if (quickProblem(a)) return null;
  const presentAs = a.presentAs === 'rail' ? 'rail' : 'focus';
  const f = normalizeFeedback({ ...makeFeedback(a.kind), prompt: String(a.prompt).trim(), options: (a.options ?? []).map((o) => String(o).trim()).filter(Boolean), presentAs });
  if (!f) return null;
  const options = f.kind === 'scale' ? scaleLabels(f) : f.options;
  return {
    kind: f.kind, prompt: f.prompt, options: options.filter((o) => String(o).trim()),
    ends: f.kind === 'scale' ? { low: f.lowLabel ?? '', high: f.highLabel ?? '' } : null,
    max: f.max, presentAs, custom: true, origin: '', stage: '', shape: '', from: '', quiet: false,
  };
}
