// Fill in the blanks in the studio's room (lab-engine-plan M8): fast, no browser, no relay. The wire against the classic
// recording is in live-replay.test.ts; here the question compiled from the author's [gaps], a compiled one left alone (the lab
// keeps them compiled), the part marks, the wall's gap-by-gap reveal and the teacher's word-per-gap entry.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Slide } from '../src/core';
import { manualState, showFromDeck, styleForFormat, styleOf } from '../src/live';
import { canHostInStudio } from '../src/show/canHost';

const slide = (id: string, name: string, game?: Slide['game']) =>
  ({ id, name, background: '', layers: [], transition: { type: 'none', duration: 0 }, notes: '', game }) as unknown as Slide;
const deckOf = (quiz: object) => ({ title: 'Fill', slides: [
  slide('c', 'Cover', { id: 'g', format: 'fill-in-the-blanks', label: 'Fill the gaps', role: 'cover', settings: {} } as never),
  slide('q', 'Q', { id: 'g', format: 'fill-in-the-blanks', label: 'Fill the gaps', role: 'question', key: '0', settings: {}, quiz } as never),
] });
const authored = { type: 'quiz', style: 'fill', input: 'fill', points: 1000, question: 'Water moves in by [osmosis] across a [membrane].', lures: 'diffusion, glucose', explanation: 'Because.' };
const compiled = { type: 'quiz', style: 'fill', input: 'fill', points: 1000, question: 'Water moves in by _____ across a _____.', options: ['membrane', 'osmosis', 'glucose', 'diffusion'], correct: -1, fillParts: ['Water moves in by ', ' across a ', '.'], gapAnswers: [1, 0], answer: 'osmosis · membrane', holdResults: true, headPrompt: 'Fill the 2 gaps', explanation: '' };
const quizOf = (quiz: object) => showFromDeck(deckOf(quiz)).slides.find((s) => s.quiz)!.quiz!;

test('the registry takes Fill in the blanks by format; the room hosts it; an authored passage is compiled to a bank', () => {
  assert.equal(styleForFormat('fill-in-the-blanks')?.key, 'fill');
  assert.equal(styleOf({ style: 'fill', input: 'fill' })?.key, 'fill');
  assert.deepEqual(canHostInStudio(deckOf(authored)), { ok: true, reason: '' });
  const q = quizOf(authored);
  assert.deepEqual([...q.options].sort(), ['diffusion', 'glucose', 'membrane', 'osmosis'], 'the gaps words and the lures, shuffled');
  assert.deepEqual((q.gapAnswers as number[]).map((i) => q.options[i]), ['osmosis', 'membrane']);
  assert.deepEqual(q.fillParts, ['Water moves in by ', ' across a ', '.']);
  assert.equal(q.answer, 'osmosis · membrane');
  assert.equal(q.headPrompt, 'Fill the 2 gaps');
  const c = quizOf(compiled);
  assert.deepEqual(c.options, compiled.options, 'a compiled question keeps its bank, in the order it was drawn');
  assert.deepEqual(c.gapAnswers, [1, 0]);
});

test('marks, part marks, the reveal, the frame and the teacher entry', () => {
  const style = styleForFormat('fill-in-the-blanks')!;
  const q = quizOf(compiled);
  assert.equal(style.mark(q, [1, 0]), true);
  assert.equal(style.mark(q, [1, 2]), false, 'right only when every gap is');
  assert.equal(style.mark(q, 3 as never), false);
  assert.deepEqual(style.gains!(q, [{ id: 1, response: [1, 0] }, { id: 2, response: [1, 3] }, { id: 3, response: [2, 3] }, { id: 4, response: 'x' as never }]), [[1, 1000], [2, 500], [3, 0], [4, 0]], 'round(points x the share of gaps right)');
  assert.deepEqual(style.reveal(q), { correct: -1, answer: 'osmosis · membrane' });
  assert.deepEqual(style.flags!(q), { fillParts: ['Water moves in by ', ' across a ', '.'] });
  assert.deepEqual(style.manual({ fill: [1, 0] }), { fill: [1, 0] });
  assert.equal(style.manual({ choice: 1 }), undefined);
  assert.equal(style.manualQuestion!(q).gaps, 2, 'the teacher window is told how many gaps');
  const m = manualState({ state: { players: [], teams: [], revealed: [], pin: '1', ended: false, live: true, report: null, mode: 'individual', tally: null, question: { id: 'q', slideId: 'q', options: q.options, timeLimit: 0 } } as never, slide: { quiz: q } as never }) as { question: { input: string; gaps: number; bins: unknown } };
  assert.deepEqual([m.question.input, m.question.gaps, m.question.bins], ['fill', 2, null]);
});

test('wall: where the room put its words is held until the reveal; then the right words and the picks, gap by gap, most chosen first', () => {
  const style = styleForFormat('fill-in-the-blanks')!;
  const q = quizOf(compiled);
  const answers = [{ id: 1, response: [1, 0] }, { id: 2, response: [1, 3] }, { id: 3, response: [2, 3] }, { id: 4, response: [1, 3] }, { id: 5, response: 'x' as never }];
  assert.deepEqual(style.wall(q, answers, false), { kind: 'gaps', gaps: null });
  const w = style.wall(q, answers, true);
  if (w.kind !== 'gaps' || !w.gaps) throw new Error('gaps');
  assert.equal(w.gaps.total, 4, 'only full sets of picks count');
  assert.deepEqual(w.gaps.parts, ['Water moves in by ', ' across a ', '.']);
  assert.deepEqual(w.gaps.gaps.map((g) => g.word), ['osmosis', 'membrane']);
  assert.deepEqual(w.gaps.gaps[0].picks, [{ text: 'osmosis', n: 3, right: true }, { text: 'glucose', n: 1, right: false }]);
  assert.deepEqual(w.gaps.gaps[1].picks, [{ text: 'diffusion', n: 3, right: false }, { text: 'membrane', n: 1, right: true }], 'a lure the room chose is named, ahead of the right word');
});
