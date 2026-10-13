// Spin & explain (style 'spinexplain', format 'spin-explain'): a concept is drawn, someone explains it (the meaning, an example, a
// connection, with a hint if they need one), and the teacher says Clear, With hint or Reject by voice (src/games/spinexplain.js). The
// phones listen and watch. The relay credits an accepted verdict (Clear, or With hint at half) to the speaker's team in a teams room,
// and to the named player only when the game scores spoken; a Reject names nobody. A verdict that would score waits for the speaker
// ("Clear: who spoke?"). The wall counts the concepts explained. The scores slide follows the last concept.
import { defineSpoken } from './spoken';

export const spinexplain = defineSpoken({
  key: 'spinexplain', name: 'Spin & explain', formats: ['spin-explain'],
  headPrompt: 'Spin & explain', options: ['Clear', 'With hint', 'Reject'],
  spoken: { accepts: [0, 1], half: 1, scores: true, counts: 'explained' },
  prepare(q) {
    q.options = ['Clear', 'With hint', 'Reject'];
    q.correct = 0;
    q.confidence = false;
    q.question = String(q.term ?? q.question ?? '');
  },
});
