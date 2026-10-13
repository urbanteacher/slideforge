// True / false showdown in the studio's room (lab-engine-plan M8): fast, no browser. The wire against the classic
// recording is in live-replay.test.ts; here the entry found by the question's flag (not by the format of the plain
// True or false), the host's gate step, and the wall's one bar with the split and the switches.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Slide } from '../src/core';
import { emptyRoom, showFromDeck, styleForFormat, styleOf, type RoomState } from '../src/live';
import { canHostInStudio } from '../src/show/canHost';
import { shownDeck, stepsOf } from '../src/show/steps';
import { wallOf } from '../src/show/wallModel';

const slide = (id: string, name: string, game?: Slide['game']) =>
  ({ id, name, background: '', layers: [], transition: { type: 'none', duration: 0 }, notes: '', game }) as unknown as Slide;
const quiz = { type: 'quiz', style: 'truefalse', input: 'choice', correct: 1, points: 1000, showdown: true, confidence: false, question: 'Mitochondria are only in animal cells.', options: ['True', 'False'], explanation: 'Plants too.' };
const deck = { title: 'Showdown', slides: [
  slide('c', 'Cover', { id: 'g', format: 'true-false', label: 'Showdown', role: 'cover', settings: {} } as never),
  slide('q', 'Q', { id: 'g', format: 'true-false', label: 'Showdown', role: 'question', key: '0', settings: {}, quiz } as never),
] };

test('a question with the showdown flag is the Showdown; plain True or false keeps its own entry', () => {
  assert.deepEqual(canHostInStudio(deck), { ok: true, reason: '' });
  assert.equal(styleForFormat('true-false')?.name, 'True / false showdown');
  assert.equal(styleForFormat('truefalse')?.name, 'True or false');
  assert.equal(styleOf({ style: 'truefalse', input: 'choice', showdown: true })?.name, 'True / false showdown');
  assert.equal(styleOf({ style: 'truefalse', input: 'choice' })?.name, 'True or false');
  const q = showFromDeck(deck).slides.find((s) => s.quiz)!.quiz!;
  const style = styleOf(q)!;
  assert.equal(style.gate, 'showdown');
  assert.equal(style.held, true);
  assert.deepEqual(style.flags!(q), { showdown: true });
});

const room = (over: Partial<RoomState> = {}): RoomState => ({
  ...emptyRoom(), connected: true, live: true, pin: '123456', joinUrl: 'http://10.0.0.5:8787/join.html', phase: 'question',
  players: [1, 2, 3, 4].map((id) => ({ id, name: `P${id}`, score: 0, connected: true, away: false, manual: false, team: null })),
  question: { id: 'q', slideId: 'q', options: quiz.options, timeLimit: 0 },
  ...over,
});

test('wall: counts only until the split is shown; then one bar, now against was, with the switches; then the answer marked', () => {
  const { steps } = stepsOf(shownDeck({ ...deck, width: 1920, height: 1080 } as never));
  const at = steps.findIndex((s) => s.room.id === 'q');
  const a = (id: number, response: number) => ({ id, name: `P${id}`, team: null, response, sure: null, elapsedMs: 500 });
  // Two True, two False when the split was shown; then one phone switched to False.
  const tally = { id: 'q', rev: 5, counts: [1, 3], answered: 4, sured: 0, total: 4, allIn: true, manual: false, answers: [a(1, 0), a(2, 1), a(3, 1), a(4, 1)], split: [2, 2], switched: 1 };
  const input = { steps, at, scoresOn: false, fallbackJoin: '' };
  const open = wallOf({ ...input, room: room({ tally: { ...tally, split: null, switched: 0 } }) });
  assert.equal(open.question!.locked, false);
  assert.deepEqual(open.question!.detail, { kind: 'bars', pair: true });
  const shown = wallOf({ ...input, room: room({ tally, gated: ['q'] }) });
  assert.equal(shown.question!.locked, true);
  assert.equal(shown.question!.answer, '');
  assert.deepEqual(shown.question!.detail, { kind: 'split', split: { sides: [{ label: 'True', now: 1, was: 2, right: false }, { label: 'False', now: 3, was: 2, right: false }], total: 4, switched: 1 } });
  const done = wallOf({ ...input, room: room({ tally, gated: ['q'], phase: 'revealed', revealed: ['q'] }) });
  assert.equal(done.view, 'reveal');
  assert.equal(done.question!.answer, 'False');
  assert.deepEqual(done.question!.detail.kind === 'split' && done.question!.detail.split.sides.map((s) => s.right), [false, true]);
});
