// Concept chain (style 'conceptchain', format 'concept-chain'): a map that grows from a term, one justified link at a time
// (src/games/conceptchain.js). While the term is up an idea box opens beside it for the phones' links (`shape: 'link'`); the teacher
// puts one on the table (its author becomes the speaker, and its words are the link Accept will add, or types one in the wall's box) and
// says Accept or Reject by voice. Accept adds a branch to the map and credits the author as it lands (`oralCredit`: the relay pays it,
// since the phones are on the idea box, not a question) and the term stays open for the next link; Accept with no link typed does
// nothing, and Reject puts the proposal down and names nobody. Next, or the clock, closes the term (the box closes first, then the reveal):
// as Accept if the chain grew from it, as Reject if it did not. The map is redrawn in place and keeps every term of the game.
import { defineSpoken } from './spoken';
import type { Briefing } from './types';

const brief = (): Briefing => ({ role: 'discuss', headPrompt: 'Concept chain', participation: 'Send a link on your phone when the idea box opens, or propose it aloud. The teacher chooses which to weigh.' });

export const conceptchain = defineSpoken({
  key: 'conceptchain', name: 'Concept chain', formats: ['concept-chain'],
  headPrompt: 'Concept chain', options: ['Accept', 'Reject'],
  spoken: { accepts: [0], scores: true, counts: 'links', proposals: 'link', chain: true },
  companion: brief,
  prepare(q) {
    q.options = ['Accept', 'Reject'];
    q.correct = 0;
    q.confidence = false;
    q.conceptChain = true;
    q.term = String(q.term ?? '').trim();
    q.prompt = String(q.prompt ?? '').trim();
  },
});
