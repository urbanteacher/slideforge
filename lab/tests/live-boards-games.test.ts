// The boards that play a whole game (memory, bingo, quiz bowl) in the lab's own deck shape and on the host's clock (the replays in
// live-replay-boards.test.ts run classic's). In the lab such a game is a cover, the slide holding SlideForge's compiled board
// (`game.board`), and the slides the editor shows of it (a study, the board, a card's or a cell's answer, the set): the room plays
// the whole game on the board's step, so those are not steps of their own, and there is no scores step (as in classic).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Slide } from '../src/core';
import { BOARDS, boardWallOf, showFromDeck, type HostMessage, type MemoryWall, type RoomSlide } from '../src/live';
import { BoardDesk } from '../src/live/boards';
import { canHostInStudio } from '../src/show/canHost';
import { list } from './replay-kit';

const slide = (id: string, name: string, game?: Slide['game']) =>
  ({ id, name, background: '', layers: [], transition: { type: 'none', duration: 0 }, notes: '', game }) as unknown as Slide;

/** A lab deck of a board game: its cover, the board's slide, a second board slide, two answers and the set. */
function boardDeck(format: string, field: string) {
  const g = list.find((x) => x.format === format)!;
  const base = { id: 'g', format, label: g.title };
  return { title: g.title, slides: [
    slide('c', 'Cover', { ...base, role: 'cover', settings: {} } as never),
    slide('b', g.title, { ...base, role: 'board', settings: {}, board: g.slides.filter((s) => s[field]) } as never),
    slide('b2', 'The board', { ...base, role: 'board', settings: {} } as never),
    slide('a1', 'Card 1', { ...base, role: 'answer', key: '0', settings: {} } as never),
    slide('a2', 'Card 2', { ...base, role: 'answer', key: '1', settings: {} } as never),
    slide('e', 'The set', { ...base, role: 'end', settings: {} } as never),
  ] };
}

/** A board desk on a clock the test moves. */
function deskOn(b: RoomSlide) {
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
  return { desk, run, sent, states, wall: () => boardWallOf(b.board!, { key: b.board!.key, state: states[b.id] }) };
}

for (const [format, kind, cover] of [['memory-flip', 'memoryflip', '4 cards · explain aloud · teacher checks'], ['memory-match', 'memorymatch', '4 cards · explain aloud · teacher checks'], ['knowledge-flip', 'knowledgeflip', '4 keywords · explain aloud · no study timer']]) {
  test(`a ${format} lesson is hosted in the studio: one board step, the board's skin around it, no scores`, () => {
    const d = boardDeck(format, 'memoryBoard');
    assert.equal(canHostInStudio(d).ok, true);
    const show = showFromDeck(d);
    assert.deepEqual(show.slides.map((s) => s.id), ['c', 'b']);
    assert.deepEqual(show.slides.map((s) => s.style), ['claim', kind]);
    assert.equal(show.slides[0].text, cover);
    assert.equal(show.slides[1].board?.key, 'memory');
  });
}

test('memory match on the wall: the study clock runs into recall, a team claims a card, the turn moves on, the journal hears it', () => {
  const b = showFromDeck(boardDeck('memory-match', 'memoryBoard')).slides[1];
  const { desk, run, sent, wall } = deskOn(b);
  let w = wall() as MemoryWall;
  assert.equal(w.phase, 'ready');
  assert.deepEqual(w.actions.map((a) => a.action), ['start']);
  desk.command('start');
  w = wall() as MemoryWall;
  assert.equal(w.phase, 'study');
  assert.ok(w.cards.every((c) => c.definition), 'every pair is up while the class studies');
  run(11_000);
  w = wall() as MemoryWall;
  assert.equal(w.phase, 'recall', 'the study clock ran out into recall');
  assert.ok(w.cards.every((c) => !c.face && c.selectable), 'the cards hide');
  desk.command('select', 2);
  desk.command('reveal');
  w = wall() as MemoryWall;
  assert.equal(w.check?.actions[0].action, 'claim');
  desk.command('claim');
  w = wall() as MemoryWall;
  assert.equal(w.cards[2].owner, '✓ Red');
  assert.match(w.caption, /^Blue — /);
  const oral = sent.filter((m) => m.t === 'oral') as Extract<HostMessage, { t: 'oral' }>[];
  assert.equal(oral.length, 1);
  assert.equal(oral[0].participant, 'Red');
  assert.equal(oral[0].card, 2);
  assert.equal(oral[0].kind, 'memorymatch');
  desk.stop();
});
