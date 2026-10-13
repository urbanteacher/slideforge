// What a Type answer room typed, grouped for the wall as classic groups it (js/live.js typedGroups): by the answer
// with case, accents, punctuation and a leading article taken off, so "paris", "PARIS" and "the Paris" are one
// group; each group is written in the spelling the question accepts when it is right (answerLabel), counted, and
// marked by the same rules the room is scored by (markResponse). Most said first, a right answer before a wrong
// one of the same count.

import { answerLabel, markResponse } from '@sf/games/registry.js';
import { normalizeAnswer } from '@sf/games/marking.js';
import type { TallyAnswer } from './protocol';

export interface TypedGroup { text: string; n: number; right: boolean }

export function typedGroups(quiz: SFQuizSlide, answers: Pick<TallyAnswer, 'response'>[]): TypedGroup[] {
  const by = new Map<string, TypedGroup>();
  for (const a of answers) {
    if (typeof a.response !== 'string') continue;
    const key = normalizeAnswer(a.response);
    let g = by.get(key);
    if (!g) { g = { text: answerLabel(quiz, a.response), n: 0, right: markResponse(quiz, a.response) }; by.set(key, g); }
    g.n++;
  }
  return [...by.values()].sort((a, b) => b.n - a.n || Number(b.right) - Number(a.right));
}
