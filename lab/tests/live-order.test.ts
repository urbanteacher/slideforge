// Ranking in the studio's room (lab-engine-plan M8): fast, no browser, no relay. The wire against the classic
// recording is in live-replay.test.ts; here the registry entry's own parts: the part marks, the wall's heat bars and
// most swapped pair, the teacher's entry, routing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Slide } from '../src/core';
import { STYLES, showFromDeck, styleForFormat, styleOf } from '../src/live';
import { canHostInStudio } from '../src/show/canHost';

const slide = (id: string, name: string, game?: Slide['game']) =>
  ({ id, name, background: '', layers: [], transition: { type: 'none', duration: 0 }, notes: '', game }) as unknown as Slide;
const quiz = { type: 'quiz', style: 'order', input: 'order', correct: 0, points: 10, question: 'Order these.', options: ['A', 'B', 'C', 'D'], explanation: 'Because.' };
const deck = { title: 'Rank', slides: [
  slide('c', 'Cover', { id: 'g', format: 'ranking', label: 'Ranking', role: 'cover', settings: {} } as never),
  slide('q', 'Q', { id: 'g', format: 'ranking', label: 'Ranking', role: 'question', key: '0', settings: {}, quiz } as never),
] };

test('the registry takes Ranking by format and by question; the room hosts it', () => {
  assert.ok(STYLES.some((s) => s.key === 'order'));
  assert.equal(styleForFormat('ranking')?.key, 'order');
  assert.equal(styleOf({ style: 'order', input: 'order' })?.key, 'order');
  assert.deepEqual(canHostInStudio(deck), { ok: true, reason: '' });
  const q = showFromDeck(deck).slides.find((s) => s.quiz)!.quiz!;
  assert.equal(q.input, 'order');
  assert.deepEqual(q.options, ['A', 'B', 'C', 'D']);
});

test("marks, part marks, the wall and the teacher's entry", () => {
  const style = styleForFormat('ranking')!;
  const q = showFromDeck(deck).slides.find((s) => s.quiz)!.quiz!;
  assert.equal(style.mark(q, [0, 1, 2, 3]), true);
  assert.equal(style.mark(q, [0, 1, 3, 2]), false, 'right only with every item in place');
  const answers = [
    { id: 1, response: [0, 1, 2, 3] }, { id: 2, response: [0, 1, 3, 2] }, { id: 3, response: [1, 0, 3, 2] },
    { id: 4, response: [3, 2, 1, 0] }, { id: 5, response: 'junk' as never },
  ];
  assert.deepEqual(style.gains!(q, answers), [[1, 10], [2, 5], [3, 0], [4, 0], [5, 0]], 'round(10 x share in place)');
  assert.deepEqual(style.reveal(q), { correct: 0, answer: 'A' });
  assert.deepEqual(style.wall(q, answers, false), { kind: 'slots', slots: null });
  const w = style.wall(q, answers, true);
  assert.equal(w.kind, 'slots');
  if (w.kind !== 'slots' || !w.slots) throw new Error('slots');
  assert.equal(w.slots.total, 4, 'only full orderings count');
  assert.deepEqual(w.slots.slots.map((s) => s.here), [2, 2, 1, 1]);
  assert.deepEqual(w.slots.swap && { pair: w.slots.swap.pair, n: w.slots.swap.n }, { pair: [2, 3], n: 2 });
  assert.deepEqual(style.manual({ order: [3, 2, 1, 0] }), { order: [3, 2, 1, 0] });
  assert.equal(style.manual({ choice: 1 }), undefined);
});
