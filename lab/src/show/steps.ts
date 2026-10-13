// The show's steps: what the room steps through (live/show.ts), and where each step stands in the deck the
// DeckPlayer plays. The room's steps are fewer than the deck's slides: a question's answer is that question's
// reveal, and a game's scores follow its last slide (src/deck/labshow.js does the same for the classic show).
// So the player is moved by step: to the question's slide, and on the reveal to its answer slide.

import type { Deck } from '../core';
import { showFromDeck, type RoomShow, type RoomSlide } from '../live';

export interface Step {
  room: RoomSlide;
  /** The slide drawn for this step: an index into the shown deck. A game's scores stand on its last slide. */
  slide: number;
  /** The slide drawn once this step's question is revealed: its answer. */
  answer: number | null;
  /** The slide drawn once this step's question is asked, when it has a drawing of its own for that (Definition challenge's recall, after its reading). */
  ask: number | null;
}

type DeckLike = Pick<Deck, 'title' | 'slides'>;

/** The show is the deck without its hidden slides. */
export function shownDeck<T extends DeckLike>(deck: T): T {
  return { ...deck, slides: deck.slides.filter((s) => !s.hidden) };
}

/** The room's show for a shown deck, with each step placed on the deck's slides. */
export function stepsOf(shown: DeckLike): { show: RoomShow; steps: Step[] } {
  const show = showFromDeck(shown);
  const slides = shown.slides;
  const steps = show.slides.map((room): Step => {
    let slide = slides.findIndex((s) => s.id === room.id);
    if (slide < 0) {
      // A game's scores step (`<game>:scores`): the game's last slide stays up under the leaderboard.
      for (let k = slides.length - 1; k >= 0; k--) if (slides[k].game?.id === room.gameId) { slide = k; break; }
    }
    let answer: number | null = null, ask: number | null = null;
    const g = slides[slide]?.game;
    if (room.quiz && g?.key != null) {
      const at = slides.findIndex((x) => x.game?.id === g.id && x.game.role === 'answer' && x.game.key === g.key);
      if (at >= 0) answer = at;
      // A second drawing of the same question, after the first (the recall slide of a reading and recall pair).
      const second = slides.findIndex((x, k) => k > slide && x.game?.id === g.id && x.game.role === 'question' && x.game.key === g.key);
      if (second >= 0) ask = second;
    }
    return { room, slide: Math.max(0, slide), answer, ask };
  });
  return { show, steps };
}

/** The slide the player should be on for a step: the answer once the question is revealed, its asking slide once it is asked. */
export const slideFor = (step: Step, revealed: boolean, asked = false): number =>
  (revealed && step.answer != null ? step.answer : asked && step.ask != null ? step.ask : step.slide);

/** The step a slide of the shown deck belongs to (for starting the room on the slide being edited). */
export function stepAt(steps: Step[], slide: number): number {
  let best = 0;
  steps.forEach((s, i) => { if (s.slide <= slide || (s.answer != null && s.answer <= slide) || (s.ask != null && s.ask <= slide)) best = i; });
  return best;
}

/** Does the show have a question or a feedback prompt the room can ask? */
export const hasRoomGame = (deck: DeckLike): boolean => showFromDeck(deck).slides.some((s) => s.activity === 'question' || s.activity === 'feedback');
