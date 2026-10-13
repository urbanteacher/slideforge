// The boards in the lab's own deck shape and on the host's clock (the replay in live-replay-boards.test.ts runs classic's). A
// Low-stakes quiz in the lab is a cover, the board's slide holding SlideForge's compiled board (`game.board`), and its answers,
// which the board's reveal draws. The board desk runs SlideForge's board runtime: the clock ticks while the board is on the wall,
// stops (its state frozen) while the show is elsewhere, and the clock running out reveals the answers and tells the journal.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Slide } from '../src/core';
import { BOARDS, boardWallOf, showFromDeck, type HostMessage, type LowStakesWall } from '../src/live';
import { BoardDesk } from '../src/live/boards';
import { canHostInStudio } from '../src/show/canHost';
import { stepsOf } from '../src/show/steps';
import { list } from './replay-kit';

const slide = (id: string, name: string, game?: Slide['game']) =>
  ({ id, name, background: '', layers: [], transition: { type: 'none', duration: 0 }, notes: '', game }) as unknown as Slide;

function deck() {
  const g = list.find((x) => x.format === 'low-stakes-quiz')!;
  const base = { id: 'g', format: 'low-stakes-quiz', label: g.title };
  return { title: g.title, slides: [
    slide('c', 'Cover', { ...base, role: 'cover', settings: {} } as never),
    slide('b', 'Low-stakes quiz', { ...base, role: 'board', settings: { seconds: 180 }, board: g.slides.filter((s) => s.lowstakesBoard) } as never),
    slide('e', 'The answers', { ...base, role: 'end', settings: {} } as never),
  ] };
}

test('a Low-stakes quiz lesson is hosted in the studio: one board step, its answers drawn by the reveal', () => {
  const d = deck();
  assert.equal(canHostInStudio(d).ok, true);
  const show = showFromDeck(d);
  assert.deepEqual(show.slides.map((s) => s.id), ['c', 'b'], 'the answers are not a step, and there is no scores step');
  assert.equal(show.slides[0].text, '5 questions · write on paper · 180s then reveal');
  const b = show.slides[1];
  assert.equal(b.style, 'lowstakes');
  assert.equal(b.board?.key, 'lowstakes');
  assert.equal(b.text, 'Write your answers on paper. No notes — this is retrieval practice.');
  const { steps } = stepsOf(d);
  assert.equal(steps[1].answer, 2, 'the reveal draws the answers slide');
  const w = boardWallOf(b.board!, undefined) as LowStakesWall;
  assert.equal(w.phase, 'ready');
  assert.equal(w.clock, '3:00');
  assert.deepEqual(w.actions.map((a) => a.action), ['start', 'reveal']);
  assert.ok(w.items.every((i) => i.answer === null), 'the answers stay hidden');
});

test('the board\'s clock runs on the host\'s clock, freezes while the show is elsewhere, and its end reveals and reports', () => {
  const show = showFromDeck(deck());
  const b = show.slides[1];
  const clock = { ms: 0, due: [] as { at: number; fn: () => void }[] };
  const run = (until: number) => {
    for (;;) {
      const d = clock.due.filter((x) => x.at <= until).sort((x, y) => x.at - y.at)[0];
      if (!d) break;
      clock.due.splice(clock.due.indexOf(d), 1);
      clock.ms = d.at;
      d.fn();
    }
    clock.ms = until;
  };
  const sent: HostMessage[] = [];
  const states: Record<string, Record<string, unknown>> = {};
  const desk = new BoardDesk({ send: (m) => { sent.push(m); return true; }, now: () => clock.ms, after: (fn, ms) => { clock.due.push({ at: clock.ms + ms, fn }); }, publish: (id, e) => { states[id] = e.state; } }, BOARDS);
  desk.landed(b.id, b.board);
  assert.equal(states.b.phase, 'ready');
  desk.command('start');
  run(60_000);
  assert.equal(Math.round(states.b.remaining as number), 120);
  // The show goes elsewhere for a minute: the board's clock stops, and its state is kept.
  desk.landed('c', undefined);
  run(120_000);
  desk.landed(b.id, b.board);
  run(121_000);
  assert.equal(Math.round(states.b.remaining as number), 119, 'the minute away was not counted');
  run(300_000);
  assert.equal(states.b.phase, 'answers', 'the clock ran out into the reveal');
  assert.deepEqual(sent.map((m) => (m.t === 'oral' ? m.term : m.t)), ['5 questions · time up']);
  assert.equal(desk.command('finish'), true);
  assert.equal(states.b.phase, 'complete');
  desk.stop();
  assert.equal(desk.command('restart'), false, 'no board is up');
});
