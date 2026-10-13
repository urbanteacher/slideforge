// Can the studio's own host and show run this lesson in a room? (lab-engine-plan M7 slice 3.) The shell's Host
// live asks before it opens the studio's show, and falls back to SlideForge's own host when the answer is no.
// Pure: it reads the lab deck, and nothing else.
//
// Yes only when the room has nothing it cannot run: every game in the lesson is of a style the room runs (the
// registry in live/styles: Multiple choice, True or false, True / false showdown, Type answer, Slider, Time traveler, Ranking, Odd one out, Predict the outcome, Spot the error, Definition challenge, Emoji guess, Fill in the blanks, Compare & contrast's sort, Horse race, Boss battle, Word reveal, the spoken games: Random challenge, Question cube, Spin & explain, Heads up, Connection maker, Concept chain, and
// Beat the clock, whose round's questions are on its round slide, `game.board`; and the boards in live/boards: Low-stakes quiz), the lesson asks at least one
// question or audience feedback prompt (poll, word cloud, brainstorm or scale, M9), and no slide carries an
// activity, a live figure, a stand-in for a SlideForge check, or feedback on a game slide. Those are SlideForge's
// to run until the lab's host runs them (M10 onward). Feedback that is not complete (no prompt, a poll without two
// options, a scale without both ends) asks nothing, as in SlideForge, so the slide is only shown.

import type { Deck, Slide } from '../core';
import { boardForFormat, boardOn, feedbackOf, styleForFormat, styleNames } from '../live';

export interface CanHost { ok: boolean; reason: string }

type DeckLike = Pick<Deck, 'slides'>;

const STAND_INS = ['quiz', 'activity'];

/** A round's questions (Beat the clock's run), on the slide it is played on. */
const roundOf = (s: Slide): { style?: string }[] => (s.game?.role === 'board' ? (s.game.board ?? []).filter((x) => x.type === 'quiz') : []);

/** Why this slide cannot run in the studio's room, or '' when it can. */
function blocker(s: Slide): string {
  if (s.feedback && s.game && feedbackOf(s)) return `"${s.name}" is a game slide that also asks the room for ${s.feedback.kind} feedback`;
  if (s.activity) return `"${s.name}" is an activity`;
  if (s.figure || s.liveFigure) return `"${s.name}" has a live figure`;
  if (s.layers.some((l) => l.visible && STAND_INS.includes(l.kind))) return `"${s.name}" holds a SlideForge check or activity`;
  const g = s.game;
  if (!g) return '';
  const style = styleForFormat(g.format);
  // A board the room runs (live/boards: Low-stakes quiz): the wall plays it, and no phone answers.
  if (!style && boardForFormat(g.format)) return '';
  if (!style) return `"${g.label}" is ${g.format}, not ${styleNames()}`;
  const q = g.quiz as { style?: string; input?: string } | undefined;
  if (g.role === 'question' && q && ((q.style ?? g.format) !== style.key || (q.input ?? style.input) !== style.input)) return `"${g.label}" has a question that is not ${style.name}`;
  // A round played in one go (Beat the clock): its questions are on its slide, as SlideForge compiled them.
  if (roundOf(s).some((x) => (x.style ?? g.format) !== style.key)) return `"${g.label}" has a question that is not ${style.name}`;
  const why = g.role === 'question' && q ? style.unsupported?.(q) : '';
  if (why) return `"${g.label}" has a question that ${why}`;
  return '';
}

/** The shown slides (hidden ones are skipped by the show, and so by the room). */
export function canHostInStudio(deck: DeckLike): CanHost {
  const slides = deck.slides.filter((s) => !s.hidden);
  for (const s of slides) {
    const why = blocker(s);
    if (why) return { ok: false, reason: why };
  }
  const asks = slides.some((s) => (s.game?.role === 'question' && s.game.quiz) || roundOf(s).length > 0 || (s.game?.role === 'board' && !!boardOn(s.game.board)) || (!s.game && feedbackOf(s)));
  return asks ? { ok: true, reason: '' } : { ok: false, reason: `the lesson has no ${styleNames()} question or feedback prompt to ask` };
}

/** Why a plain show of this lesson (no room) must be SlideForge's own, or '' when the studio's show can run it
 *  (lab-engine-plan M15). The same blockers as canHostInStudio, without the clause that the lesson must ask a
 *  question: a lesson with no questions is the commonest one to present. A lesson with every slide hidden has
 *  nothing to show. The shell's Present, Teacher Presenter and Notes ask before they open the studio's show. */
export function whyNotPresentInStudio(deck: DeckLike): string {
  const slides = deck.slides.filter((s) => !s.hidden);
  if (!slides.length) return 'the lesson has no shown slide';
  for (const s of slides) {
    const why = blocker(s);
    if (why) return why;
  }
  return '';
}
