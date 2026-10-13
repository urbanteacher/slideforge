// Can the studio's own host and show run this lesson in a room? (lab-engine-plan M7 slice 3.) The shell's Host
// live asks before it opens the studio's show, and falls back to SlideForge's own host when the answer is no.
// Pure: it reads the lab deck, and nothing else.
//
// Yes only when the room has nothing it cannot run: every game in the lesson is plain Multiple choice or plain
// True or false (format 'truefalse', not the Showdown, format 'true-false'), at least one of them asks a question, and no slide carries audience feedback, an activity, a live figure or a stand-in
// for a SlideForge check. Those four are SlideForge's to run until the lab's host runs them (M8 onward).

import type { Deck, Slide } from '../core';

export interface CanHost { ok: boolean; reason: string }

type DeckLike = Pick<Deck, 'slides'>;

const STAND_INS = ['quiz', 'activity'];

/** The game formats the studio's room runs, by name, and the question style each one asks (M7: choice; M8: truefalse). */
const RUNS: Record<string, string> = { choice: 'Multiple choice', truefalse: 'True or false' };

/** Why this slide cannot run in the studio's room, or '' when it can. */
function blocker(s: Slide): string {
  if (s.feedback) return `"${s.name}" asks the room for ${s.feedback.kind} feedback`;
  if (s.activity) return `"${s.name}" is an activity`;
  if (s.figure || s.liveFigure) return `"${s.name}" has a live figure`;
  if (s.layers.some((l) => l.visible && STAND_INS.includes(l.kind))) return `"${s.name}" holds a SlideForge check or activity`;
  const g = s.game;
  if (!g) return '';
  const name = RUNS[g.format];
  if (!name) return `"${g.label}" is ${g.format}, not Multiple choice or True or false`;
  const q = g.quiz as { style?: string; input?: string } | undefined;
  if (g.role === 'question' && q && ((q.style ?? g.format) !== g.format || (q.input ?? 'choice') !== 'choice')) return `"${g.label}" has a question that is not ${name}`;
  return '';
}

/** The shown slides (hidden ones are skipped by the show, and so by the room). */
export function canHostInStudio(deck: DeckLike): CanHost {
  const slides = deck.slides.filter((s) => !s.hidden);
  for (const s of slides) {
    const why = blocker(s);
    if (why) return { ok: false, reason: why };
  }
  const asks = slides.some((s) => s.game?.role === 'question' && s.game.quiz);
  return asks ? { ok: true, reason: '' } : { ok: false, reason: 'the lesson has no Multiple choice or True or false question to ask' };
}
