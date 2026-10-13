// Odd one out in the studio's room (lab-engine-plan M8): fast, no browser, no relay. The wire against the classic
// recording is in live-replay.test.ts; here the parts the replay cannot see: no scores step, the wall (the split is
// held until the reveal; then the prepared odd one beside the room's defence ideas), the registry entry's flags.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Slide } from '../src/core';
import { emptyRoom, showFromDeck, styleForFormat, type RoomState } from '../src/live';
import { canHostInStudio } from '../src/show/canHost';
import { shownDeck, stepsOf } from '../src/show/steps';
import { wallOf } from '../src/show/wallModel';

const slide = (id: string, name: string, game?: Slide['game']) =>
  ({ id, name, background: '', layers: [], transition: { type: 'none', duration: 0 }, notes: '', game }) as unknown as Slide;
const quiz = { type: 'quiz', style: 'oddone', input: 'choice', correct: 2, points: 0, unmarked: true, confidence: false, question: 'Which is the odd one out?', options: ['Iron', 'Copper', 'Oxygen', 'Zinc'], explanation: 'Oxygen is a non-metal.' };
const deck = { title: 'Odd', slides: [
  slide('c', 'Cover', { id: 'g', format: 'odd-one-out', label: 'Odd one out', role: 'cover', settings: {} } as never),
  slide('q', 'Q', { id: 'g', format: 'odd-one-out', label: 'Odd one out', role: 'question', key: '0', settings: {}, quiz } as never),
] };

test('the room hosts it, holds it for the teacher, and the game ends on its last question (no scores slide)', () => {
  assert.deepEqual(canHostInStudio(deck), { ok: true, reason: '' });
  const style = styleForFormat('odd-one-out')!;
  assert.equal(style.held, true);
  assert.equal(style.scoreSlide, false);
  const show = showFromDeck(deck);
  assert.deepEqual(show.slides.map((s) => s.activity), ['moment', 'question']);
  assert.ok(!show.slides.some((s) => s.results));
  assert.deepEqual(style.reveal(show.slides[1].quiz!), { correct: 2, answer: 'Oxygen' });
});

const room = (over: Partial<RoomState> = {}): RoomState => ({
  ...emptyRoom(), connected: true, live: true, pin: '123456', joinUrl: 'http://10.0.0.5:8787/join.html', phase: 'running',
  players: [1, 2].map((id) => ({ id, name: `P${id}`, score: 0, connected: true, away: false, manual: false, team: null })),
  ...over,
});

test('wall: the vote stays hidden; on the reveal the split with the prepared odd one, unmarked, beside the ideas', () => {
  const { steps } = stepsOf(shownDeck({ ...deck, width: 1920, height: 1080 } as never));
  const at = steps.findIndex((s) => s.room.id === 'q');
  const a = (id: number, response: number) => ({ id, name: `P${id}`, team: null, response, sure: null, elapsedMs: 500 });
  const tally = { id: 'q', rev: 2, counts: [0, 1, 1, 0], answered: 2, sured: 0, total: 2, allIn: true, manual: false, answers: [a(1, 1), a(2, 2)] };
  const input = { steps, at, scoresOn: false, fallbackJoin: '' };
  const open = wallOf({ ...input, room: room({ phase: 'question', question: { id: 'q', slideId: 'q', options: quiz.options, timeLimit: 0 }, tally }) });
  assert.equal(open.view, 'question');
  assert.equal(open.feedback, null);
  const prompt = { id: 'quick:1', kind: 'brainstorm' as const, prompt: 'Defend a pick', options: [], ends: null, max: 1, presentAs: 'rail' as const, custom: true as const };
  const feedback = { prompt, shown: false, answered: 1, players: 2, digest: { kind: 'brainstorm' as const, items: [{ name: 'P2', pid: 2, text: 'Non-metal', seq: 1 }], total: 1 } };
  const done = wallOf({ ...input, room: room({ phase: 'revealed', revealed: ['q'], tally, feedback }) });
  assert.equal(done.view, 'reveal');
  assert.deepEqual(done.question!.detail, { kind: 'bars', pair: false, unmarked: true });
  assert.equal(done.question!.answer, 'Oxygen');
  assert.deepEqual(done.question!.options.map((o) => [o.count, o.correct]), [[0, false], [1, false], [1, true], [0, false]]);
  assert.equal(done.rail, null, 'the ideas take the standings place');
  assert.deepEqual(done.feedback!.ideas.map((i) => i.text), ['Non-metal']);
});
