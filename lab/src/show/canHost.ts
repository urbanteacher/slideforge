// Can the studio's own host and show run this lesson in a room? (lab-engine-plan M7 slice 3.) The shell's Host
// live asks before it opens the studio's show, and falls back to SlideForge's own host when the answer is no.
// Pure: it reads the lab deck, and nothing else.
//
// Yes only when the room has nothing it cannot run: every game in the lesson is of a style the room runs (the
// registry in live/styles: Multiple choice, True or false, True / false showdown, Type answer, Slider, Time traveler, Ranking, Odd one out, Predict the outcome, Spot the error, Definition challenge, Emoji guess, Fill in the blanks, Compare & contrast's sort, Horse race, Boss battle, Word reveal, the spoken games: Random challenge, Question cube, Spin & explain, Heads up, Connection maker, Concept chain, and
// Beat the clock, whose round's questions are on its round slide, `game.board`; and the boards in live/boards: Low-stakes quiz, Memory flip, Memory match, Knowledge flip, Bingo and Quiz bowl), the lesson asks at least one
// question, audience feedback prompt (poll, word cloud, brainstorm or scale, M9) or activity, and no slide carries an
// activity the room does not run (live/activities: M10 runs SlideForge's activities by their kind, a routine's timed
// stages, feedback from the room, or a slide the phones follow; a game made from an activity is its game), a live figure
// stand-in that does not carry its figure (one that does plays over the slide: figure.ts), or feedback on a game slide. Those are SlideForge's
// to run until the lab's host runs them (M10 onward). A lesson that asks nothing keeps SlideForge's room, for its quick poll and
// questions box, which the studio's room does not have (M14). The plain show (whyNotPresentInStudio) has no phones, so only
// the uncarried figure keeps a lesson off it. What the shell itself must add (js/lab-engine.js classicOnly): SlideForge slides
// the lab cannot build, which the classic show and room put back among the lab's (docs/games/m14-deletions.md). Feedback that is not complete (no prompt, a poll without two
// options, a scale without both ends) asks nothing, as in SlideForge, so the slide is only shown.

import type { Deck, Slide } from '../core';
import { activityBlocker, activityOf, boardForFormat, boardOn, feedbackOf, styleForFormat, styleNames } from '../live';
import { figureBlocker } from './figure';

export interface CanHost { ok: boolean; reason: string }

type DeckLike = Pick<Deck, 'slides'>;

/** A round's questions (Beat the clock's run), on the slide it is played on. */
const roundOf = (s: Slide): { style?: string }[] => (s.game?.role === 'board' ? (s.game.board ?? []).filter((x) => x.type === 'quiz') : []);

/** Why this slide cannot run in the studio's room ('room'), or in its plain show ('show'), or '' when it can.
 *  The plain show has no phones: it draws each lab slide as the lab does, so only what SlideForge's show plays
 *  and the studio's does not keeps a lesson there (a live figure the lesson does not carry or that is not known, M14). The room
 *  asks the phones, so it also needs every game, activity and feedback prompt to be one it runs. The quiz and
 *  activity cards (kinds/quiz, kinds/activity) are placeholders: SlideForge's show and room draw them as the
 *  picture they are too, so they keep nothing on classic (M14). */
function blocker(s: Slide, mode: 'room' | 'show'): string {
  // A live figure the show plays over the slide (figure.ts); a stand-in that does not carry its figure stays classic's,
  // which plays the figure from the lesson it was made from, and so does one whose figure is not known here.
  const fig = figureBlocker(s);
  if (fig) return fig;
  if (mode === 'show') return '';
  if (s.feedback && s.game && feedbackOf(s)) return `"${s.name}" is a game slide that also asks the room for ${s.feedback.kind} feedback`;
  // An activity's slide: the room runs it by its kind (live/activities); a game made from one is its game, below.
  const act = s.activity && !s.game ? activityBlocker(s) : '';
  if (act) return `"${s.name}" ${act}`;
  const g = s.game;
  if (!g) return '';
  const style = styleForFormat(g.format);
  // A board the room runs (live/boards: Low-stakes quiz, the memory boards, Bingo, Quiz bowl): the wall plays it, and no phone answers.
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
    const why = blocker(s, 'room');
    if (why) return { ok: false, reason: why };
  }
  const asks = slides.some((s) => (s.game?.role === 'question' && s.game.quiz) || roundOf(s).length > 0 || (s.game?.role === 'board' && !!boardOn(s.game.board)) || (!s.game && feedbackOf(s)) || (!s.game && !!activityOf(s)));
  return asks ? { ok: true, reason: '' } : { ok: false, reason: `the lesson has no ${styleNames()} question or feedback prompt to ask, or activity to run` };
}

/** Why a plain show of this lesson (no room) must be SlideForge's own, or '' when the studio's show can run it
 *  (lab-engine-plan M15, M14). Only a live figure stand-in that does not carry its figure, or one not known here: the show has no phones,
 *  so a game, an activity or a feedback prompt is shown as the lab draws it (a game's question, then its answer). A lesson with no questions is the commonest one to present. A lesson with every slide hidden has
 *  nothing to show. The shell's Present, Teacher Presenter and Notes ask before they open the studio's show. */
export function whyNotPresentInStudio(deck: DeckLike): string {
  const slides = deck.slides.filter((s) => !s.hidden);
  if (!slides.length) return 'the lesson has no shown slide';
  for (const s of slides) {
    const why = blocker(s, 'show');
    if (why) return why;
  }
  return '';
}
