// Time traveler in the studio's room (lab-engine-plan M8): fast, no browser. The wire against the classic recording is
// in live-replay.test.ts; here what the replay cannot see: a lab deck's questions made into one game (one span, a
// timeline that grows, built from the questions themselves) and the wall's events under the line.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Slide } from '../src/core';
import { emptyRoom, showFromDeck, styleForFormat, styleOf, type RoomState } from '../src/live';
import { canHostInStudio } from '../src/show/canHost';
import { shownDeck, stepsOf } from '../src/show/steps';
import { wallOf } from '../src/show/wallModel';

const slide = (id: string, name: string, game?: Slide['game']) =>
  ({ id, name, background: '', layers: [], transition: { type: 'none', duration: 0 }, notes: '', game }) as unknown as Slide;
const quiz = (question: string, min: number, max: number, target: number, tolerance: number) =>
  ({ type: 'quiz', style: 'slider', input: 'number', correct: -1, points: 1000, question, min, max, step: 1, target, tolerance, unit: '', explanation: '' });
const deck = { title: 'Travel', slides: [
  slide('c', 'Cover', { id: 'g', format: 'time-traveler', label: 'Time traveler', role: 'cover', settings: {} } as never),
  slide('q0', 'Q0', { id: 'g', format: 'time-traveler', label: 'Time traveler', role: 'question', key: '0', settings: {}, quiz: quiz('Place it in time: the Great Fire of London', 1500, 1900, 1666, 15) } as never),
  slide('q1', 'Q1', { id: 'g', format: 'time-traveler', label: 'Time traveler', role: 'question', key: '1', settings: {}, quiz: quiz('Place it in time: the first Moon landing', 1900, 2020, 1969, 4) } as never),
] };

test('the game is one line wide enough for every event, and each round carries the events already placed', () => {
  assert.deepEqual(canHostInStudio(deck), { ok: true, reason: '' });
  assert.equal(styleForFormat('time-traveler')?.name, 'Time traveler');
  const qs = showFromDeck(deck).slides.filter((s) => s.quiz).map((s) => s.quiz!);
  assert.deepEqual(qs.map((q) => [q.min, q.max]), [[1500, 2020], [1500, 2020]]);
  assert.deepEqual(qs.map((q) => q.timeline), [[], [{ label: 'the Great Fire of London', year: 1666 }]]);
  const style = styleOf(qs[1])!;
  assert.equal(style.name, 'Time traveler');
  assert.deepEqual(style.flags!(qs[1]), { timeTravel: true, timeline: [{ label: 'the Great Fire of London', year: 1666 }] });
  assert.deepEqual(style.range(qs[1]), { min: 1500, max: 2020, step: 1, unit: '' });
  assert.equal(style.mark(qs[1], 1971), true);
  assert.equal(style.mark(qs[1], 1980), false);
});

const room = (over: Partial<RoomState> = {}): RoomState => ({
  ...emptyRoom(), connected: true, live: true, pin: '123456', joinUrl: 'http://10.0.0.5:8787/join.html', phase: 'revealed',
  players: [1, 2].map((id) => ({ id, name: `P${id}`, score: 0, connected: true, away: false, manual: false, team: null })),
  ...over,
});

test('wall: the reveal is Slider\'s line with the events already on it named under it', () => {
  const { steps } = stepsOf(shownDeck({ ...deck, width: 1920, height: 1080 } as never));
  const at = steps.findIndex((s) => s.room.id === 'q1');
  const a = (id: number, response: number) => ({ id, name: `P${id}`, team: null, response, sure: null, elapsedMs: 500 });
  const tally = { id: 'q1', rev: 2, counts: [], answered: 2, sured: 0, total: 2, allIn: true, manual: false, answers: [a(1, 1969), a(2, 1950)] };
  const w = wallOf({ steps, at, scoresOn: false, fallbackJoin: '', room: room({ revealed: ['q1'], tally }) });
  assert.equal(w.view, 'reveal');
  assert.equal(w.question!.answer, '1969');
  const d = w.question!.detail;
  assert.equal(d.kind, 'line');
  const line = d.kind === 'line' ? d.line! : null;
  assert.equal(line!.marks.length, 2);
  assert.deepEqual(line!.timeline, [{ label: 'the Great Fire of London', year: 1666, pct: 31.9 }]);
});
