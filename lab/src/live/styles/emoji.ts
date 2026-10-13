// Emoji guess (style 'emoji', format 'emoji-guess'): symbols in, the concept out, typed. A typed answer (Type answer's
// marking, wall and entry) whose question frame carries the clues (`clueMode` 'emoji', `clues`) and a heading that says what
// to do. The help is released a step at a time while the question is open, one per Next, then the reveal: the letter pattern
// (a step only on a medium puzzle: an easy one shows it from the start, a hard one has none), then the hint, the last. The
// hint is the host's `hintOut`; the relay halves the points of answers given after it, so the host sends no gains.
import { gameStyle } from '@sf/games/registry.js';
import { type } from './type';
import { defineStyle } from './types';

const HEADING = 'What do these clues point to?';

export const emoji = defineStyle({
  ...type,
  key: 'emoji', name: 'Emoji guess', formats: ['emoji-guess'], input: 'text',
  // The style's own normalize and compile (src/games/emoji.js): the clues, the accepted answers, the hint and the difficulty.
  prepare(q) {
    const st = gameStyle('emoji');
    st.normalize?.(q);
    st.compile?.(q, {}, q);
  },
  companion: (q) => ({ role: 'wait', participation: '', headPrompt: q.headPrompt || HEADING }),
  flags: (q) => ({ clueMode: 'emoji', clues: String(q.clues || q.question || '').slice(0, 80) }),
  help(q) {
    const steps: ('pattern' | 'hint')[] = [];
    if (q.difficulty === 'medium' || !['easy', 'hard'].includes(String(q.difficulty))) steps.push('pattern');
    if (String(q.hint ?? '').trim()) steps.push('hint');
    return steps;
  },
});
