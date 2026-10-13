// Bingo and Quiz bowl against the classic host's recordings (the harness is replay-kit.ts; the boards' shared notes are in
// live-replay-boards.test.ts). Both are played on the wall by the teacher; the room's frames are the board step's `at` and `idle`
// (role 'watch') and an `oral` record for each verdict, credited to a team.
//
// Differences kept visible, none removed: as for the other boards, the steps around the board carry its skin ('bingo', 'bowl') and
// the board's step is set from the starter's compiled board. And for Bingo only: (3) its cards are dealt and its definitions called
// at random (SlideForge's engine, Math.random), and the recording keeps only what came of it, the `oral` records (the square, the
// term, the team). So the replay deals each round's cards and makes each call from those records: every recorded verdict's term is on
// its team's card at its square and on no other team's card, the other squares are terms not called that round, and each call is
// the term its verdicts name (a call with none, the recorder's last, takes a term on no card). The frames are then compared in full.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOARDS, boardWallOf, type BingoWall, type BoardKind, type BowlWall, type LiveHost, type RoomBoard, type RoomShow } from '../src/live';
import type { BoardCtx } from '../src/live/boards';
import { assertSame, boardOn, click, list, load, replay, type Press, type Rec } from './replay-kit';

const entryOf = (host: LiveHost) => Object.values(host.state.boards)[0];

// Quiz bowl: open a cell, reveal, award it to a team (the recorder pressed the first team's award each time). Seven cells awarded to
// Red reach the target of 1000 (100 × 3, 200 × 3, 300), which ends the board; then Play this board again and Open the board. Each
// award is an `oral` record with the cell, its category, value and question, the team and the value awarded.
const BOWL: Record<string, string> = {
  'Open the board →': 'start', 'Reveal the answer': 'reveal', 'Nobody scored': 'noScore', 'Pause': 'pause', 'Resume': 'pause', 'Play this board again': 'restart',
};
/** A cell (the recorder pressed the first open one in the grid's order) or a team's award (the first team's). */
function bowlPress(label: string, cls: string, host: LiveHost, board: () => RoomBoard): Press | null {
  if (/^\+ \d+$/.test(label)) return { action: 'award', card: 0 };
  if (!/bowl-cell/.test(cls)) return null;
  const w = boardWallOf(board(), entryOf(host)) as BowlWall;
  const i = w.cells.findIndex((c) => c.open);
  assert.equal(String(w.cells[i].value), label, 'the first open cell is the one pressed');
  return { action: 'pick', card: i };
}

/** The board step the replay set (its show), for the wall model the presses are read against. */
function holder(format: string, field: string, key: string, skin: string) {
  let at: RoomBoard | null = null;
  const tweak = (show: RoomShow) => { boardOn(format, field, key, skin)(show); at = show.slides.find((s) => s.board)!.board!; };
  return { tweak, board: () => at! };
}

test('the lab host sends what the classic host sent for a Quiz bowl board', async () => {
  const h = holder('quiz-bowl', 'bowlBoard', 'bowl', 'bowl');
  const { host, classic, lab } = await replay(load('game-quiz-bowl'), 'quiz-bowl', false, h.tweak, click(BOWL, (l, c, x) => bowlPress(l, c, x, h.board)));
  assertSame(lab, classic);
  const oral = lab.filter((f) => f.t === 'oral');
  assert.equal(oral.length, 7);
  assert.deepEqual(oral.map((o) => o.value), [100, 100, 100, 200, 200, 200, 300]);
  for (const o of oral) { assert.equal(o.kind, 'bowl'); assert.equal(o.participant, 'Red'); assert.equal(o.right, true); }
  assert.equal(lab.filter((f) => f.t === 'idle').pop()!.role, 'watch');
  assert.equal(entryOf(host).state.phase, 'picking', 'the last press opened the board again');
  assert.ok(host.state.ended);
});

// Bingo: deal, call a definition, reveal the term, and claim it for each team that has it (the recorder pressed the first team's
// Claim until none was left), then call the next; a line, and the next call finishes the round; deal a new card and play again.
const BINGO: Record<string, string> = {
  'Deal and start →': 'start', 'Call a definition →': 'call', 'Call the next →': 'call', 'Finish — bingo': 'call', 'Finish — no line': 'call',
  'Reveal the term': 'reveal', 'Pause': 'pause', 'Resume': 'pause', 'Deal a new card': 'restart',
};
function bingoPress(label: string, _cls: string, host: LiveHost, board: () => RoomBoard): Press | null {
  if (label !== '✓ Claim' && label !== '✗ Missed') return null;
  const w = boardWallOf(board(), entryOf(host)) as BingoWall;
  return { action: label === '✓ Claim' ? 'claim' : 'miss', card: w.cards.findIndex((c) => c.canMark) };
}

type Pair = { term: string };
/** Each round's cards and calls, from the recording's `oral` records (see the note at the top). */
function bingoScript(rec: Rec, pool: Pair[], teams: string[], size: number) {
  const oral = rec.host.filter((f) => f.dir === 'send' && f.data!.t === 'oral').map((f) => ({ ms: f.ms, ...(f.data as { term: string; participant: string; card: number }) }));
  const presses = rec.steps.filter((s) => s.what === 'board: click').map((s) => ({ ms: s.ms, label: String(s.button).split(' | ').pop()! }));
  const rounds: { calls: { ms: number; term: string | null }[]; end: number }[] = [];
  let round = { calls: [] as { ms: number; term: string | null }[], end: Infinity };
  for (const p of presses) {
    if (p.label === 'Deal a new card') { round.end = p.ms; rounds.push(round); round = { calls: [], end: Infinity }; }
    if (p.label === 'Call a definition →' || p.label === 'Call the next →') round.calls.push({ ms: p.ms, term: null });
  }
  rounds.push(round);
  return rounds.map((r, k) => {
    const from = k ? rounds[k - 1].end : 0;
    const mine = oral.filter((o) => o.ms > from && o.ms < r.end);
    r.calls.forEach((c, i) => { c.term = mine.find((o) => o.ms > c.ms && o.ms < (r.calls[i + 1]?.ms ?? r.end))?.term ?? null; });
    const said = new Set(mine.map((o) => o.term));
    const cards = teams.map((team) => {
      const cells: (string | null)[] = Array(size * size).fill(null);
      for (const o of mine) if (o.participant === team) cells[o.card] = o.term;
      const spare = pool.map((p) => p.term).filter((t) => !said.has(t) && !cells.includes(t));
      return cells.map((t) => ({ id: null, term: t ?? spare.shift()!, state: 'open' }));
    });
    // A call no verdict names: a term on no card (there is one when the cards leave terms out), else the first not called.
    const onCards = new Set(cards.flat().map((c) => c.term));
    const calls = r.calls.map((c) => c.term ?? pool.map((p) => p.term).find((t) => !onCards.has(t) && !said.has(t)) ?? pool.map((p) => p.term).find((t) => !said.has(t))!);
    return { cards, calls: calls.map((t) => pool.findIndex((p) => p.term === t)) };
  });
}

test('the lab host sends what the classic host sent for a Bingo board', async () => {
  const rec = load('game-bingo');
  const starter = list.find((g) => g.format === 'bingo')!;
  const b = starter.slides.find((s) => s.bingoBoard)!.bingoBoard as { pool: Pair[]; participants: string[]; gridSize: number };
  const script = bingoScript(rec, b.pool, b.participants, b.gridSize);
  // The deal and the calls as the recording's verdicts say (the engine's moves are otherwise its own).
  const kind = BOARDS.find((k) => k.key === 'bingo') as BoardKind;
  const { create, command } = kind;
  let dealt = 0, called = 0;
  const deal = (s: Record<string, unknown>) => ({ ...s, cards: script[dealt++].cards });
  kind.create = (board) => deal(create(board));
  kind.command = (ctx: BoardCtx, action, card) => {
    const before = (ctx.state.called as number[]).length;
    command(ctx, action, card);
    const s = ctx.state as { called: number[]; current: number };
    if (action === 'restart') ctx.state = deal(ctx.state);
    else if (s.called.length > before) {
      const at = script[dealt - 1].calls[called++];
      ctx.state = { ...ctx.state, current: at, called: [...s.called.slice(0, -1), at] };
    }
    if (action === 'restart') called = 0;
    ctx.paint();
  };
  try {
    const h = holder('bingo', 'bingoBoard', 'bingo', 'bingo');
    const { host, classic, lab } = await replay(rec, 'bingo', false, h.tweak, click(BINGO, (l, c, x) => bingoPress(l, c, x, h.board)));
    assertSame(lab, classic);
    const oral = lab.filter((f) => f.t === 'oral');
    assert.equal(oral.length, 10);
    for (const o of oral) { assert.equal(o.kind, 'bingo'); assert.equal(o.right, true); }
    assert.equal(lab.filter((f) => f.t === 'idle').pop()!.role, 'watch');
    assert.equal(dealt, 2, 'two rounds dealt');
    const st = entryOf(host).state as { phase: string; winners: number[] };
    assert.equal(st.phase, 'calling', 'the second round was left calling');
    assert.ok(host.state.ended);
  } finally {
    kind.create = create;
    kind.command = command;
  }
});

test('bingo\'s first round in the replay: Blue\'s line, then the next call finishes it', () => {
  const rec = load('game-bingo');
  const b = list.find((g) => g.format === 'bingo')!.slides.find((s) => s.bingoBoard)!.bingoBoard as { pool: Pair[]; participants: string[]; gridSize: number };
  const [first] = bingoScript(rec, b.pool, b.participants, b.gridSize);
  assert.deepEqual(first.calls.map((i) => b.pool[i].term), ['Cytoplasm', 'Ribosome', 'Enzyme']);
  assert.deepEqual(first.cards[1].slice(0, 3).map((c) => c.term), ['Enzyme', 'Cytoplasm', 'Ribosome'], 'Blue has the top row');
  for (const card of first.cards) assert.equal(new Set(card.map((c) => c.term)).size, 9, 'nine different terms on each card');
});
