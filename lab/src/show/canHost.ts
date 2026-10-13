// Can the studio's own host and show run this lesson in a room? (lab-engine-plan M7 slice 3.) The shell's Host
// live asks before it opens the studio's show, and falls back to SlideForge's own host when the answer is no.
// Pure: it reads the lab deck, and nothing else.
//
// Yes only when the room has nothing it cannot run: every game in the lesson is of a style the room runs (the
// registry in live/styles: Multiple choice, plain True or false, Type answer, Slider), the lesson asks at least one
// question or audience feedback prompt (poll, word cloud, brainstorm or scale, M9), and no slide carries an
// activity, a live figure, a stand-in for a SlideForge check, or feedback on a game slide. Those are SlideForge's
// to run until the lab's host runs them (M10 onward). Feedback that is not complete (no prompt, a poll without two
// options, a scale without both ends) asks nothing, as in SlideForge, so the slide is only shown.

import type { Deck, Slide } from '../core';
import { feedbackOf, styleForFormat, styleNames } from '../live';

export interface CanHost { ok: boolean; reason: string }

type DeckLike = Pick<Deck, 'slides'>;

const STAND_INS = ['quiz', 'activity'];

/** Why this slide cannot run in the studio's room, or '' when it can. */
function blocker(s: Slide): string {
  if (s.feedback && s.game && feedbackOf(s)) return `"${s.name}" is a game slide that also asks the room for ${s.feedback.kind} feedback`;
  if (s.activity) return `"${s.name}" is an activity`;
  if (s.figure || s.liveFigure) return `"${s.name}" has a live figure`;
  if (s.layers.some((l) => l.visible && STAND_INS.includes(l.kind))) return `"${s.name}" holds a SlideForge check or activity`;
  const g = s.game;
  if (!g) return '';
  const style = styleForFormat(g.format);
  if (!style) return `"${g.label}" is ${g.format}, not ${styleNames()}`;
  const q = g.quiz as { style?: string; input?: string } | undefined;
  if (g.role === 'question' && q && ((q.style ?? g.format) !== style.key || (q.input ?? style.input) !== style.input)) return `"${g.label}" has a question that is not ${style.name}`;
  return '';
}

/** The shown slides (hidden ones are skipped by the show, and so by the room). */
export function canHostInStudio(deck: DeckLike): CanHost {
  const slides = deck.slides.filter((s) => !s.hidden);
  for (const s of slides) {
    const why = blocker(s);
    if (why) return { ok: false, reason: why };
  }
  const asks = slides.some((s) => (s.game?.role === 'question' && s.game.quiz) || (!s.game && feedbackOf(s)));
  return asks ? { ok: true, reason: '' } : { ok: false, reason: `the lesson has no ${styleNames()} question or feedback prompt to ask` };
}
