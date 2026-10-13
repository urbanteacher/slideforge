// Spot the error (style 'spot', format 'spot-the-error'). The passage is split into words (the question's options); each
// phone taps the one it thinks is wrong (`input` 'tap': an index, as a choice). The host marks a tap against the error's
// span (SlideForge's own mark: any word inside it), so a tap is right inside `errorFrom` to `errorTo`. Where the room tapped
// stays off the wall until the reveal (holdResults); the reveal draws a bar under every word, strikes out the error and says
// the correction ("mitochondria → chloroplasts"). The phones are told what to do (the heading); the game has no scores slide.
import { gameStyle } from '@sf/games/registry.js';
import { defineStyle } from './types';

export const spot = defineStyle({
  key: 'spot', name: 'Spot the error', formats: ['spot-the-error'], input: 'tap',
  // The style's own normalize and compile (src/games/spot.js): the words as options, the error's span, the answer said, the heading.
  prepare(q) {
    const st = gameStyle('spot');
    st.normalize?.(q);
    st.compile?.(q, {}, q);
  },
  scoreSlide: false,
  companion: (q) => ({ role: 'wait', participation: '', headPrompt: q.headPrompt ?? '' }),
  // The correct option is where the error starts; what is said is the wrong words and their correction.
  reveal: (q) => ({ correct: q.correct, answer: q.answer ?? '' }),
  wall(q, answers, revealed) {
    if (!revealed) return { kind: 'heat', heat: null };
    const words = q.options.map((label, index) => ({
      index, label, error: spot.mark(q, index),
      count: answers.filter((a) => a.response === index).length,
    }));
    return { kind: 'heat', heat: { words, total: words.reduce((n, w) => n + w.count, 0), answer: q.answer ?? '' } };
  },
});
