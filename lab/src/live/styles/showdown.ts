// True / false showdown (format 'true-false'; the plain True or false, format 'truefalse', is its own entry). The room
// votes; the teacher's first Next (or half-way through a timed question) shows the room its split (`showdown`: every
// phone sees it and may switch once); the next Next reveals. The reveal marks the final answers, after the switches.
// It never reveals by itself. The wall draws one bar across the two answers once the split is up, following the room as
// phones switch with a marker where the room stood when it was shown, and the reveal keeps it with the answer marked.
import { defineStyle, type SplitModel } from './types';

export const showdown = defineStyle({
  key: 'truefalse', name: 'True / false showdown', formats: ['true-false'], input: 'choice',
  match: (q) => q.showdown === true,
  gate: 'showdown',
  held: true,
  flags: () => ({ showdown: true }),
  wall(q, answers, revealed, ctx) {
    if (!revealed && !ctx?.gated) return { kind: 'bars', pair: true };
    const labels = q.options.filter((o) => String(o).trim());
    const now = labels.map((_, i) => answers.filter((a) => a.response === i).length);
    const split: SplitModel = {
      sides: labels.map((label, i) => ({ label, now: now[i], was: ctx?.split ? ctx.split[i] ?? 0 : null, right: revealed && i === q.correct })),
      total: now.reduce((a, b) => a + b, 0),
      switched: ctx?.switched ?? 0,
    };
    return { kind: 'split', split };
  },
});
