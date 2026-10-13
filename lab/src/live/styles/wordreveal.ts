// Word reveal (style 'wordreveal', format 'word-reveal'): the room types the word as its letters drip onto the wall. The
// drip runs on the host's clock (host.ts, from `drip`): a few letters open at the start by the question's difficulty, then one
// more every few seconds. A typed answer is marked as Type answer's is; the points come from how many letters were open when
// each answer reached the relay (fewer letters, more points), by the answer's own time, never the moment of the reveal.
import { gameStyle } from '@sf/games/registry.js';
import { wordRevealGains, wordRevealLetterCount, wordRevealPreFraction } from '@sf/games/wordreveal.js';
import { type } from './type';
import { defineStyle } from './types';

export const wordreveal = defineStyle({
  ...type,
  key: 'wordreveal', name: 'Word reveal', formats: ['word-reveal'], input: 'text',
  // The style's own normalize and compile (src/games/wordreveal.js): the word, the hint, the accepted answers, the pre-reveal and the drip.
  prepare(q) {
    const st = gameStyle('wordreveal');
    st.normalize?.(q);
    st.compile?.(q, {}, q);
    q.preReveal = wordRevealPreFraction(q.difficulty);
  },
  gains: (q, answers, ctx) => wordRevealGains(q, answers, ctx?.dripShown ?? 0),
  drip(q) {
    const word = String(q.word || q.answer || '');
    const total = wordRevealLetterCount(word);
    const pre = Math.round(total * (q.preReveal != null ? Number(q.preReveal) : wordRevealPreFraction(q.difficulty)));
    return { word, hint: String(q.hint ?? ''), total, start: Math.max(0, Math.min(total, pre)), everyMs: Math.max(3, Number(q.dripInterval) || 5) * 1000 };
  },
});
