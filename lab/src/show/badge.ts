// The overview's badge: what a game, question, activity or feedback slide is, so the teacher sees at a glance where the games are.
// Pure: the names come from the room's style registry (live/styles), the game's own label (a board, a game the room does not
// run yet), SlideForge's activity catalogue and the feedback kind.

import type { Slide } from '../core';
import { activity } from '@sf/activities/catalogue.js';
import { styleForFormat } from '../live';

/** The formats SlideForge's Quiz studio writes as quiz questions: their badge reads "Quiz · <style>". */
const QUIZ = new Set(['choice', 'truefalse', 'type', 'slider']);
const FEEDBACK: Record<string, string> = { poll: 'Poll', wordcloud: 'Word cloud', brainstorm: 'Brainstorm', scale: 'Scale' };

export interface Badge { label: string; kind: 'game' | 'quiz' | 'activity' | 'feedback' }

/** The badge a slide carries in the overview, or null for a plain slide. */
export function slideBadge(s: Pick<Slide, 'game' | 'feedback' | 'activity'>): Badge | null {
  const g = s.game;
  if (g) {
    const name = styleForFormat(g.format)?.name ?? (g.label || g.format);
    return QUIZ.has(g.format) ? { label: `Quiz · ${name}`, kind: 'quiz' } : { label: name, kind: 'game' };
  }
  if (s.activity?.key) return { label: `Activity · ${activity(s.activity.key)?.title ?? s.activity.key}`, kind: 'activity' };
  if (s.feedback?.kind) return { label: FEEDBACK[s.feedback.kind] ?? s.feedback.kind, kind: 'feedback' };
  return null;
}
