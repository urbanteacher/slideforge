// The boards that play a whole game (memory, bingo, quiz bowl) in the lab's own deck shape and on the host's clock (the replays in
// live-replay-boards.test.ts run classic's). In the lab such a game is a cover, the slide holding SlideForge's compiled board
// (`game.board`), and the slides the editor shows of it (a study, the board, a card's or a cell's answer, the set): the room plays
// the whole game on the board's step, so those are not steps of their own, and there is no scores step (as in classic).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Slide } from '../src/core';
import { BOARDS, boardWallOf, showFromDeck, type BingoWall, type BowlWall, type HostMessage, type MemoryWall, type RoomSlide } from '../src/live';
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

for (const [format, field, key, cover] of [['bingo', 'bingoBoard', 'bingo', '3×3 cards · 12 terms in the pool · a card each'], ['quiz-bowl', 'bowlBoard', 'bowl', '3 categories · 9 cells · first to 1000']]) {
  test(`a ${format} lesson is hosted in the studio: one board step, the board's skin around it, no scores`, () => {
    const d = boardDeck(format, field);
    assert.equal(canHostInStudio(d).ok, true);
    const show = showFromDeck(d);
    assert.deepEqual(show.slides.map((s) => s.id), ['c', 'b']);
    assert.deepEqual(show.slides.map((s) => s.style), [key, key]);
    assert.equal(show.slides[0].text, cover);
    assert.equal(show.slides[1].board?.key, key);
  });
}

test('bingo on the wall: a card each, a call, the teams that have the term claim it, a line, and the next call finishes', () => {
  const b = showFromDeck(boardDeck('bingo', 'bingoBoard')).slides[1];
  const { desk, sent, wall } = deskOn(b);
  let w = wall() as BingoWall;
  assert.equal(w.cards.length, 4);
  assert.ok(w.cards.every((c) => c.squares.length === 9 && new Set(c.squares.map((q) => q.term)).size === 9), 'nine different terms a card');
  desk.command('start');
  // Call until a team can claim, then claim for every team that has the term, until someone has a line.
  for (let n = 0; n < 12 && !(wall() as BingoWall).cards.some((c) => c.won); n++) {
    desk.command('call');
    w = wall() as BingoWall;
    assert.ok(w.call.term === null && w.cards.every((c) => c.why === 'Waiting on an answer'), 'the term stays hidden until the reveal');
    desk.command('reveal');
    (wall() as BingoWall).cards.forEach((c, team) => { if (c.canMark) desk.command('claim', team); });
  }
  w = wall() as BingoWall;
  assert.ok(w.cards.some((c) => c.won && c.tick === 'LINE'));
  assert.equal(w.actions.find((a) => a.action === 'call')?.label, 'Finish — bingo');
  const oral = sent.filter((m) => m.t === 'oral') as Extract<HostMessage, { t: 'oral' }>[];
  assert.ok(oral.length >= 3 && oral.every((o) => o.kind === 'bingo' && o.right && b.board!.slide.bingoBoard && ['Red', 'Blue', 'Green', 'Yellow'].includes(o.participant!)));
  desk.command('call');
  assert.equal((wall() as BingoWall).phase, 'complete');
  desk.stop();
});

test('quiz bowl on the wall: a cell opens its question in place of the grid, an award scores the team and is journalled with its value', () => {
  const b = showFromDeck(boardDeck('quiz-bowl', 'bowlBoard')).slides[1];
  const { desk, sent, wall } = deskOn(b);
  desk.command('start');
  let w = wall() as BowlWall;
  assert.deepEqual(w.categories, ['Cells', 'Transport', 'Enzymes']);
  assert.ok(w.cells.every((c) => c.open));
  desk.command('pick', 4);
  w = wall() as BowlWall;
  assert.equal(w.ask?.eyebrow, 'TRANSPORT · 200');
  assert.equal(w.ask?.answer, null);
  desk.command('reveal');
  w = wall() as BowlWall;
  assert.ok(w.ask?.answer);
  assert.deepEqual(w.teams.map((t) => t.award), ['+ 200', '+ 200', '+ 200', '+ 200']);
  desk.command('award', 1);
  w = wall() as BowlWall;
  assert.equal(w.teams[1].score, 200);
  assert.equal(w.cells[4].waiting, 0, 'the cell is spent');
  const [o] = sent.filter((m) => m.t === 'oral') as Extract<HostMessage, { t: 'oral' }>[];
  assert.equal(o.participant, 'Blue');
  assert.equal(o.value, 200);
  assert.match(o.term, /^Transport 200 — /);
  desk.stop();
});
