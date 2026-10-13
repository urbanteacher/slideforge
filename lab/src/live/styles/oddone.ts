// Odd one out (style 'oddone', format 'odd-one-out'): four items; each phone taps the one it thinks does not belong.
// Nobody is marked (a pick that disagrees with the prepared one is not wrong: `unmarked`, no points); the votes stay
// hidden while the question is open; only the teacher reveals (never by itself); on the reveal the room's split is
// on the wall with the prepared odd one and its reason, and the room is asked to defend a pick (a brainstorm prompt
// that closes when the show moves on). The phones are told their role (`discuss`) and what to do, as classic's
// phoneCompanion does.
import { defineStyle } from './types';

export const oddone = defineStyle({
  key: 'oddone', name: 'Odd one out', formats: ['odd-one-out'], input: 'choice',
  companion: () => ({ role: 'discuss', headPrompt: 'Odd one out', participation: 'Tap the one you think is the odd one out, and be ready to say your rule.' }),
  held: true,
  scoreSlide: false,
  afterReveal: { prompt: 'Defend a pick: which one, and what rule makes it the odd one out?' },
  wall: () => ({ kind: 'bars', pair: false, unmarked: true }),
});
