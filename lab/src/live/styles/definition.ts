// Definition challenge (style 'definition', format 'definition-challenge'): read a passage, then answer from memory once it
// clears. A typed answer (Type answer's marking, wall and entry) with a reading phase before the question: the wall shows the
// passage and the phones are told to watch (`idle`, role `watch`); on Next, or when the reading clock runs out (the question's
// time, 20, 30, 45 or 60 seconds), the room is asked ("Recall from memory") and the reveal follows as for any typed question.
// The lab draws the reading, the asking and the answer as three slides of one question (designs/engage/formats.ts).
import { clampDefinitionSeconds } from '@sf/games/definition.js';
import { gameStyle } from '@sf/games/registry.js';
import { type } from './type';
import { defineStyle } from './types';

export const definition = defineStyle({
  ...type,
  key: 'definition', name: 'Definition challenge', formats: ['definition-challenge'], input: 'text',
  // The style's own normalize and compile (src/games/definition.js): the passage, the recall question, the accepted answers.
  prepare(q) {
    const st = gameStyle('definition');
    st.normalize?.(q);
    st.compile?.(q, {}, q);
  },
  reading: (q) => clampDefinitionSeconds(q.timeLimit || 30),
  companion: (_q, phase) => (phase === 'reading'
    ? { role: 'watch', participation: 'Read the passage on the screen. No notes — your phone asks when the passage clears.', headPrompt: 'Definition challenge' }
    : { role: 'wait', participation: '', headPrompt: 'Recall from memory' }),
});
