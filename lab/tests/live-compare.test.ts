// Compare & contrast's sort in the studio's room (lab-engine-plan M8): fast, no browser, no relay. The wire against the classic
// recording is in live-replay.test.ts; here the question compiled from the author's statements, a compiled one left alone, the
// part marks, the wall's reveal with the statement most misfiled, the teacher's column-per-statement entry, and the discussion
// mode (not ported) sending its lesson to the classic host.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Slide } from '../src/core';
import { manualState, showFromDeck, styleForFormat, styleOf } from '../src/live';
import { canHostInStudio } from '../src/show/canHost';

const slide = (id: string, name: string, game?: Slide['game']) =>
  ({ id, name, background: '', layers: [], transition: { type: 'none', duration: 0 }, notes: '', game }) as unknown as Slide;
const deckOf = (quiz: object) => ({ title: 'Compare', slides: [
  slide('c', 'Cover', { id: 'g', format: 'compare-contrast', label: 'Compare & contrast', role: 'cover', settings: {} } as never),
  slide('q', 'Q', { id: 'g', format: 'compare-contrast', label: 'Compare & contrast', role: 'question', key: '0', settings: {}, quiz } as never),
] });
const authored = { type: 'quiz', style: 'compare', input: 'sort', itemA: 'RAM', itemB: 'SSD', statements: 'A: is volatile\nB: keeps data when off\nBoth: stores data', similarities: 's', differences: 'd' };
const compiled = { type: 'quiz', style: 'compare', input: 'sort', points: 1000, question: 'Compare these two', options: ['is volatile', 'stores data', 'keeps data when off', 'is fast'], correct: -1, itemA: 'RAM', itemB: 'SSD', compareSort: true, sortAnswers: [0, 1, 2, 1], sortBins: ['RAM only', 'Both', 'SSD only'], headPrompt: 'Sort each statement: RAM, SSD, or both?', holdResults: true };
const quizOf = (quiz: object) => showFromDeck(deckOf(quiz)).slides.find((s) => s.quiz)!.quiz!;

test('the registry takes Compare & contrast by format; the room hosts the sort; an authored one is compiled; no scores slide', () => {
  assert.equal(styleForFormat('compare-contrast')?.key, 'compare');
  assert.equal(styleOf({ style: 'compare', input: 'sort' })?.key, 'compare');
  assert.deepEqual(canHostInStudio(deckOf(authored)), { ok: true, reason: '' });
  assert.equal(showFromDeck(deckOf(authored)).slides.some((s) => s.results), false, 'the game has no scores slide');
  const q = quizOf(authored);
  assert.deepEqual([...q.options].sort(), ['is volatile', 'keeps data when off', 'stores data']);
  const bin = Object.fromEntries(q.options.map((o, i) => [o, (q.sortAnswers as number[])[i]]));
  assert.deepEqual(bin, { 'is volatile': 0, 'stores data': 1, 'keeps data when off': 2 }, 'each statement keeps its column through the shuffle');
  assert.deepEqual(q.sortBins, ['RAM only', 'Both', 'SSD only']);
  assert.equal(q.headPrompt, 'Sort each statement: RAM, SSD, or both?');
  const c = quizOf(compiled);
  assert.deepEqual(c.options, compiled.options, 'a compiled question keeps its statements in the order they were drawn');
  assert.deepEqual(c.sortAnswers, [0, 1, 2, 1]);
});

test('the discussion mode is not the room\'s: its lesson is hosted by classic', () => {
  const discuss = { type: 'quiz', style: 'compare', input: 'choice', compareDiscuss: true, voteOnly: true, itemA: 'RAM', itemB: 'SSD', options: [], correct: -1 };
  const why = canHostInStudio(deckOf(discuss));
  assert.equal(why.ok, false);
  assert.match(why.reason, /not Compare & contrast|discussion/);
  const flagged = canHostInStudio(deckOf({ ...compiled, compareDiscuss: true }));
  assert.equal(flagged.ok, false);
  assert.match(flagged.reason, /discussion mode/);
});

test('marks, part marks, the frame, the reveal and the teacher entry', () => {
  const style = styleForFormat('compare-contrast')!;
  const q = quizOf(compiled);
  assert.equal(style.mark(q, [0, 1, 2, 1]), true);
  assert.equal(style.mark(q, [0, 1, 2, 0]), false, 'right only when every statement is in its column');
  assert.deepEqual(style.gains!(q, [{ id: 1, response: [0, 1, 2, 1] }, { id: 2, response: [0, 1, 2, 0] }, { id: 3, response: [2, 2, 1, 0] }, { id: 4, response: 'x' as never }]), [[1, 1000], [2, 750], [3, 0], [4, 0]], 'round(points x the share right)');
  assert.deepEqual(style.reveal(q), { correct: -1, answer: '' }, 'a sort has no answer in words');
  assert.deepEqual(style.flags!(q), { bins: ['RAM only', 'Both', 'SSD only'] });
  assert.deepEqual(style.companion!(q), { role: '', participation: '', headPrompt: 'Sort it' });
  assert.deepEqual(style.manual({ sort: [0, 1, 2, 1] }), { sort: [0, 1, 2, 1] });
  assert.equal(style.manual({ fill: [0] }), undefined);
  const m = manualState({ state: { players: [], teams: [], revealed: [], pin: '1', ended: false, live: true, report: null, mode: 'individual', tally: null, question: { id: 'q', slideId: 'q', options: q.options, timeLimit: 0 } } as never, slide: { quiz: q } as never }) as { question: { input: string; bins: string[]; gaps: number } };
  assert.deepEqual([question(m).input, question(m).bins, question(m).gaps], ['sort', ['RAM only', 'Both', 'SSD only'], 0], 'the teacher window is told the columns');
});
const question = (m: { question: { input: string; bins: string[]; gaps: number } }) => m.question;

test('wall: how the room sorted is held until the reveal; then each statement with its column and the counts, and the one most misfiled', () => {
  const style = styleForFormat('compare-contrast')!;
  const q = quizOf(compiled);
  const answers = [{ id: 1, response: [0, 1, 2, 1] }, { id: 2, response: [0, 1, 2, 0] }, { id: 3, response: [1, 1, 2, 0] }, { id: 4, response: 'x' as never }];
  assert.deepEqual(style.wall(q, answers, false), { kind: 'sort', sort: null });
  const w = style.wall(q, answers, true);
  if (w.kind !== 'sort' || !w.sort) throw new Error('sort');
  assert.equal(w.sort.total, 3, 'only full sorts count');
  assert.deepEqual(w.sort.rows.map((r) => [r.text, r.right, r.counts]), [['is volatile', 0, [2, 1, 0]], ['stores data', 1, [0, 3, 0]], ['keeps data when off', 2, [0, 0, 3]], ['is fast', 1, [2, 1, 0]]]);
  assert.deepEqual(w.sort.misfiled, { text: 'is fast', n: 2 }, 'the first of the statements misfiled most');
});
