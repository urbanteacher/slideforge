// The overview's badge: what a game, question or feedback slide is, so the teacher sees at a glance where the games are.
// Pure: the names come from the room's style registry (live/styles), the game's own label (a board, a game the room does not
// run yet) and the feedback kind.

import type { Slide } from '../core';
import { styleForFormat } from '../live';

/** The formats SlideForge's Quiz studio writes as quiz questions: their badge reads "Quiz · <style>". */
const QUIZ = new Set(['choice', 'truefalse', 'type', 'slider']);
const FEEDBACK: Record<string, string> = { poll: 'Poll', wordcloud: 'Word cloud', brainstorm: 'Brainstorm', scale: 'Scale' };

export interface Badge { label: string; kind: 'game' | 'quiz' | 'feedback' }

/** The badge a slide carries in the overview, or null for a plain slide. */
export function slideBadge(s: Pick<Slide, 'game' | 'feedback'>): Badge | null {
  const g = s.game;
  if (g) {
    const name = styleForFormat(g.format)?.name ?? (g.label || g.format);
    return QUIZ.has(g.format) ? { label: `Quiz · ${name}`, kind: 'quiz' } : { label: name, kind: 'game' };
  }
  if (s.feedback?.kind) return { label: FEEDBACK[s.feedback.kind] ?? s.feedback.kind, kind: 'feedback' };
  return null;
}
