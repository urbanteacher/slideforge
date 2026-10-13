// Type answer (typed recall): the phones type; the room is marked by SlideForge's rules (accents, case, articles,
// near spellings, accepted spellings); the wall lists what was typed, grouped, once revealed.
import { typedGroups } from '../typed';
import { defineStyle } from './types';

export const type = defineStyle({
  key: 'type', name: 'Type answer', formats: ['type'], input: 'text',
  // The style's compile (src/games/type.js): the accepted spellings without the blanks, the first the one the room reads, no options, no option to be right.
  prepare(q) {
    q.accept = (Array.isArray(q.accept) ? q.accept : []).filter((a: unknown) => String(a ?? '').trim());
    q.answer = q.accept[0] ?? '';
    q.options = [];
    q.correct = -1;
  },
  wall: (q, answers, revealed) => ({ kind: 'typed', groups: revealed ? typedGroups(q, answers) : null }),
});
