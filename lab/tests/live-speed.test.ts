// Beat the clock in the lab's own deck shape (the replays in live-replay-speed.test.ts run classic's): a cover, the round's slide
// holding SlideForge's compiled questions (`game.board`), and its answers. The room hosts it, asks each question as a step of the
// round's slide, and the Game panel's seconds become the round's. The sprint's wall, from the relay's result.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Slide } from '../src/core';
import { showFromDeck } from '../src/live';
import { canHostInStudio } from '../src/show/canHost';
import { stepsOf } from '../src/show/steps';
import { sprintHardest, sprintWallOf } from '../src/show/speedWall';

type Starter = { format: string; title: string; slides: Record<string, unknown>[] };
const raw = JSON.parse(readFileSync(resolve(process.cwd(), 'src/assets/games.json'), 'utf8')) as unknown;
const list = (Array.isArray(raw) ? raw : ((raw as { games?: unknown[] }).games ?? Object.values(raw as object))) as Starter[];
const slide = (id: string, name: string, game?: Slide['game']) =>
  ({ id, name, background: '', layers: [], transition: { type: 'none', duration: 0 }, notes: '', game }) as unknown as Slide;

function deck(seconds: number) {
  const g = list.find((x) => x.format === 'beat-the-clock')!;
  const qs = g.slides.filter((s) => s.type === 'quiz');
  const base = { id: 'g', format: 'beat-the-clock', label: g.title };
  return { title: g.title, slides: [
    slide('c', 'Cover', { ...base, role: 'cover', settings: {} } as never),
    slide('r', 'The sprint', { ...base, role: 'board', settings: { seconds }, board: qs } as never),
    slide('e', 'The answers', { ...base, role: 'end', settings: {} } as never),
  ] };
}

test('a Beat the clock lesson is hosted in the studio: the round\'s questions are steps of its slide, timed by the round', () => {
  const d = deck(120);
  assert.equal(canHostInStudio(d).ok, true);
  const show = showFromDeck(d);
  const asked = show.slides.filter((s) => s.quiz);
  assert.deepEqual(asked.map((s) => s.id), ['r', 'r:1', 'r:2']);
  for (const s of asked) { assert.equal(s.quiz!.style, 'speed'); assert.equal(s.quiz!.roundSeconds, 120); assert.equal(s.quiz!.timeLimit, 0); assert.equal(s.quiz!.paceSeconds, 15); }
  assert.equal(show.slides[0].text, '3 questions');
  assert.ok(show.slides[show.slides.length - 1].results, 'the answers slide is the scores step');
  // Every question stands on the round's slide.
  const { steps } = stepsOf(d);
  assert.deepEqual(steps.filter((s) => s.room.quiz).map((s) => s.slide), [1, 1, 1]);
  // The round is 30 to 600 seconds; 90 when the panel says none.
  assert.equal(showFromDeck(deck(10)).slides.find((s) => s.quiz)!.quiz!.roundSeconds, 30);
});

test('the sprint\'s wall: progress while it runs, then the room\'s right answers and the hardest question', () => {
  const sp = { id: 's', gameId: 'g', seconds: 60, endsAt: 0, over: false, questions: [{ id: 'a', question: 'A?', options: ['x', 'y'], correct: 1 }, { id: 'b', question: 'B?', options: ['p', 'q'], correct: 0 }], progress: { id: 's', answers: 3, right: 2, finished: 1, playing: 2, of: 2 }, result: null };
  const running = sprintWallOf(sp, 2);
  assert.equal(running.stats, '3 answers in · 67% right · 1 of 2 finished');
  assert.equal(running.pct, 75);
  assert.equal(running.result, false);
  const result = { id: 's', gameId: 'g', answers: 4, right: 2, questions: [{ id: 'a', answered: 2, wrong: 1, lure: 'x', lureN: 1 }, { id: 'b', answered: 2, wrong: 1, lure: 'q', lureN: 1 }] };
  assert.equal(sprintHardest(result)?.id, 'a', 'a tie goes to the first');
  const done = sprintWallOf({ ...sp, over: true, result }, 2);
  assert.equal(done.sub, '2 right answers, as a room');
  assert.deepEqual(done.hardest, { question: 'A?', answer: 'y', line: '1 of 2 got it wrong · most of them chose “x”' });
  assert.equal(sprintWallOf({ ...sp, over: true, result: { ...result, questions: [] } }, 2).hardest, null, 'a clean run');
});
