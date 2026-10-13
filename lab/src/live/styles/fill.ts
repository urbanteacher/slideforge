// Fill in the blanks (style 'fill', format 'fill-in-the-blanks'): a passage with up to four gaps and a word bank (the right
// words and some lures, shuffled). Each phone taps a word into every gap (`input` 'fill': one bank index per gap). A response
// is right when every gap is; each gap that is right earns its share of the points (`gains`, as classic's fillGains does:
// round(points x the share right)). The question frame carries the text around the gaps (`fillParts`); the bank rides in
// `options`, and which word goes where never leaves the host. The wall holds where the room put its words until the reveal,
// then shows the passage with the right word in each gap and, gap by gap, what the room put there (a lure half the room chose
// is the misconception). The teacher enters a word per gap by key (`fill`).
import { fillScore } from '@sf/games/fill.js';
import { gameStyle } from '@sf/games/registry.js';
import { defineStyle, type GapsModel } from './types';

/** For each gap, what the room put there, most chosen first (classic's fillGroups: ties keep the bank's order). */
export function gapsOf(parts: string[], options: string[], gapAnswers: number[], answers: { response: unknown }[]): GapsModel {
  const counts: Map<number, number>[] = gapAnswers.map(() => new Map());
  let total = 0;
  for (const a of answers) {
    if (!Array.isArray(a.response)) continue;
    total++;
    a.response.forEach((i, g) => { if (counts[g] && Number.isInteger(i)) counts[g].set(i, (counts[g].get(i) ?? 0) + 1); });
  }
  return {
    parts, total,
    gaps: gapAnswers.map((want, g) => ({
      word: options[want] ?? '',
      picks: [...counts[g]].sort((x, y) => x[0] - y[0]).map(([i, n]) => ({ text: options[i] ?? '', n, right: i === want })).sort((x, y) => y.n - x.n),
    })),
  };
}

export const fill = defineStyle({
  key: 'fill', name: 'Fill in the blanks', formats: ['fill-in-the-blanks'], input: 'fill',
  // The style's own normalize and compile (src/games/fill.js): the word bank, which word goes in each gap, the passage's parts.
  // A lab question is already compiled (a bank and `gapAnswers`): it is left as it is, so the bank keeps the order it was drawn in.
  prepare(q) {
    if (Array.isArray(q.gapAnswers)) return;
    const st = gameStyle('fill');
    st.normalize?.(q);
    st.compile?.(q, {}, q);
  },
  reveal: (q) => ({ correct: -1, answer: q.answer ?? '' }),
  flags: (q) => ({ fillParts: (Array.isArray(q.fillParts) ? q.fillParts as string[] : []).slice() }),
  gains: (q, answers) => answers.map((a) => [a.id, Math.round((Number(q.points) || 0) * fillScore(q, a.response))] as [number, number]),
  manualQuestion: (q) => ({ gaps: Array.isArray(q.gapAnswers) ? (q.gapAnswers as number[]).length : 0 }),
  wall(q, answers, revealed) {
    if (!revealed) return { kind: 'gaps', gaps: null };
    const parts = Array.isArray(q.fillParts) ? q.fillParts as string[] : [q.question];
    return { kind: 'gaps', gaps: gapsOf(parts, q.options, Array.isArray(q.gapAnswers) ? q.gapAnswers as number[] : [], answers) };
  },
});
