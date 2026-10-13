// Predict the outcome in the studio's room (lab-engine-plan M8): fast, no browser. The wire against the classic
// recording is in live-replay.test.ts; here the entry found by the question's flag (not by its style), the bet's
// gains, and the wall once the predictions are locked.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Slide } from '../src/core';
import { emptyRoom, showFromDeck, styleForFormat, styleOf, type RoomState } from '../src/live';
import { canHostInStudio } from '../src/show/canHost';
import { shownDeck, stepsOf } from '../src/show/steps';
import { wallOf } from '../src/show/wallModel';

const slide = (id: string, name: string, game?: Slide['game']) =>
  ({ id, name, background: '', layers: [], transition: { type: 'none', duration: 0 }, notes: '', game }) as unknown as Slide;
const quiz = { type: 'quiz', style: 'choice', input: 'choice', correct: 0, points: 1000, predict: true, confidence: true, question: 'What happens?', options: ['A', 'B', 'C'], explanation: 'Because.' };
const deck = { title: 'Predict', slides: [
  slide('c', 'Cover', { id: 'g', format: 'predict-outcome', label: 'Predict', role: 'cover', settings: {} } as never),
  slide('q', 'Q', { id: 'g', format: 'predict-outcome', label: 'Predict', role: 'question', key: '0', settings: {}, quiz } as never),
] };

test('a question with the predict flag is Predict the outcome; the same style without it is Multiple choice', () => {
  assert.deepEqual(canHostInStudio(deck), { ok: true, reason: '' });
  assert.equal(styleForFormat('predict-outcome')?.name, 'Predict the outcome');
  assert.equal(styleOf({ style: 'choice', input: 'choice', predict: true })?.name, 'Predict the outcome');
  assert.equal(styleOf({ style: 'choice', input: 'choice' })?.name, 'Multiple choice');
  const entry = styleForFormat('predict-outcome')!;
  assert.equal(entry.gate, 'closeAnswers');
  assert.equal(entry.held, true);
});

test('the bet can lose: right and sure x1.5, right x1, wrong and unsure 0, wrong and sure -x0.5', () => {
  const q = showFromDeck(deck).slides.find((s) => s.quiz)!.quiz!;
  const style = styleOf(q)!;
  const a = (id: number, response: number, sure: boolean | null) => ({ id, response, sure });
  assert.deepEqual(style.gains!(q, [a(1, 0, true), a(2, 0, false), a(3, 0, null), a(4, 1, false), a(5, 2, true), a(6, 1, null)]),
    [[1, 1500], [2, 1000], [3, 1000], [4, 0], [5, -500], [6, 0]]);
});

const room = (over: Partial<RoomState> = {}): RoomState => ({
  ...emptyRoom(), connected: true, live: true, pin: '123456', joinUrl: 'http://10.0.0.5:8787/join.html', phase: 'question',
  players: [1, 2, 3].map((id) => ({ id, name: `P${id}`, score: 0, connected: true, away: false, manual: false, team: null })),
  question: { id: 'q', slideId: 'q', options: quiz.options, timeLimit: 0 },
  ...over,
});

test('wall: counts only until the predictions are locked; then the split, with the answer still hidden; then the answer', () => {
  const { steps } = stepsOf(shownDeck({ ...deck, width: 1920, height: 1080 } as never));
  const at = steps.findIndex((s) => s.room.id === 'q');
  const a = (id: number, response: number) => ({ id, name: `P${id}`, team: null, response, sure: true, elapsedMs: 500 });
  const tally = { id: 'q', rev: 3, counts: [1, 2, 0], answered: 3, sured: 3, total: 3, allIn: true, manual: false, answers: [a(1, 0), a(2, 1), a(3, 1)] };
  const input = { steps, at, scoresOn: false, fallbackJoin: '' };
  const open = wallOf({ ...input, room: room({ tally }) });
  assert.equal(open.view, 'question');
  assert.equal(open.question!.locked, false);
  const locked = wallOf({ ...input, room: room({ tally, gated: ['q'] }) });
  assert.equal(locked.view, 'question');
  assert.equal(locked.question!.locked, true);
  assert.deepEqual(locked.question!.options.map((o) => [o.count, o.correct]), [[1, false], [2, false], [0, false]], 'the split is up, the answer is not');
  assert.equal(locked.question!.answer, '');
  const done = wallOf({ ...input, room: room({ tally, gated: ['q'], phase: 'revealed', revealed: ['q'] }) });
  assert.equal(done.view, 'reveal');
  assert.equal(done.question!.locked, false);
  assert.deepEqual(done.question!.options.map((o) => o.correct), [true, false, false]);
});
