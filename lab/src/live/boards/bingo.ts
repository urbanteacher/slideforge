// Bingo (board 'bingo', format 'bingo'): a card per team dealt from the game's pool, and the teacher as the caller. The teacher calls
// a definition (the term stays hidden), reveals the term once the room has answered, and marks each team that has it: claimed or
// missed. A row, column or diagonal wins; the next call then closes the round. The state and its moves are SlideForge's
// (src/boards/runtimes/bingo.js: create deals, transition calls at random, blocked, square, scores, winner); the tick and the
// command are its runtime's without the drawing: the clock counts while calling, and a claim or a miss that changed a square is
// reported to the journal (the square, the called term, the team) as classic's onVerdict does.
import { bingoHasLine } from '@sf/games/bingo.js';
import { installBingo } from '@sf/boards/runtimes/bingo.js';
import type { BoardKind, BoardState, BoardWallBase } from './types';

const ns: { Bingo?: SFBingoEngine; bingoHasLine: typeof bingoHasLine } = { bingoHasLine };
installBingo(ns);
const engine = ns.Bingo!;

type Pair = { id?: string; term: string; definition: string };
type Cell = { id: string | null; term: string; state: 'open' | 'claimed' | 'missed' };
interface BingoState extends BoardState { phase: 'ready' | 'calling' | 'complete'; cards: Cell[][]; called: number[]; current: number; revealed: boolean; winners: number[]; elapsed: number; paused: boolean }
interface BingoBoardData { gridSize: number; participants: string[]; pool: Pair[] }

export interface BingoCard {
  name: string; won: boolean; tick: string;
  /** The verdicts on the card's name line: Claim and Missed, or why the team cannot answer this call. */
  why: string | null; canMark: boolean;
  squares: { term: string; state: Cell['state']; calling: boolean; gap: boolean }[];
}
export interface BingoWall extends BoardWallBase {
  phase: BingoState['phase']; paused: boolean; size: number; eyebrow: string; clockLabel: string; count: string;
  call: { eyebrow: string; text: string; term: string | null };
  cards: BingoCard[]; caption: string; status: string; tally: string[];
}

const asBoard = (b: Record<string, unknown>) => b as unknown as BingoBoardData;
const sizeOf = (b: BingoBoardData) => Math.max(2, Math.min(4, Number(b.gridSize) || 3));

export const bingo: BoardKind<BingoWall> = {
  key: 'bingo', formats: ['bingo'], style: 'bingo', interval: 1000, wholeGame: true,
  companion: { role: 'watch', headPrompt: 'Bingo', participation: 'Watch the board. If your team has the term, explain it when asked.' },
  create: (board) => engine.create(board),
  tick(ctx, dt) {
    const s = ctx.state as BingoState;
    if (s.phase !== 'calling') return;
    s.elapsed += dt;
  },
  command(ctx, action, team) {
    const b = asBoard(ctx.board), before = ctx.state as BingoState;
    const after = engine.transition(ctx.board, before, action, team) as BingoState;
    ctx.state = after;
    if ((action === 'claim' || action === 'miss') && before.current > -1 && Number.isInteger(team) && after.cards[team!]) {
      const cell = engine.square(before, ctx.board, team!);
      if (cell > -1 && before.cards[team!][cell].state !== after.cards[team!][cell].state) {
        ctx.report({ slideId: ctx.slide.id, title: ctx.slide.title, kind: 'bingo', set: 1, card: cell, term: b.pool[before.current].term,
          participant: b.participants.length > 1 ? b.participants[team!] : null, right: action === 'claim' });
      }
    }
    ctx.paint();
  },
  // src/boards/bingo.js decorateIntro (a team each when the room plays in teams: the board has a participant per team).
  coverText: (board) => { const b = asBoard(board), n = sizeOf(b); return `${n}×${n} cards · ${b.pool.length} terms in the pool${b.participants.length > 1 ? ' · a card each' : ' · one class card'}`; },
  wall(slide, board, state) {
    const b = asBoard(board), s = state as BingoState, size = sizeOf(b);
    const cards = b.participants.map((name, team): BingoCard => {
      const live = s.current > -1 && !s.revealed ? -1 : engine.square(s, board, team);
      const why = s.phase !== 'calling' ? null : s.current > -1 && !s.revealed ? 'Waiting on an answer' : engine.blocked(s, board, team);
      return {
        name, won: s.winners.includes(team), why, canMark: s.phase === 'calling' && !why,
        tick: s.winners.includes(team) ? 'LINE' : `${(s.cards[team] ?? []).filter((c) => c.state === 'claimed').length} / ${size * size}`,
        squares: (s.cards[team] ?? []).map((c, i) => ({ term: c.term || 'needs a term', state: c.state, calling: i === live && c.state === 'open', gap: !c.term })),
      };
    });
    const more = s.called.length < b.pool.length;
    const nextLabel = !more ? (s.winners.length ? 'Finish — bingo' : 'Finish — no line') : s.winners.length ? 'Finish — bingo' : s.current < 0 ? 'Call a definition →' : 'Call the next →';
    const actions = [
      ...(s.phase === 'ready' ? [{ label: 'Deal and start →', action: 'start', primary: true }] : []),
      ...(s.phase === 'calling' && s.current > -1 && !s.revealed ? [{ label: 'Reveal the term', action: 'reveal', primary: true }] : []),
      ...(s.phase === 'calling' ? [{ label: nextLabel, action: 'call', primary: s.revealed || s.current < 0 || s.winners.length > 0 || !more },
        { label: s.paused ? 'Resume' : 'Pause', action: 'pause', primary: false }] : []),
      ...(s.phase === 'complete' ? [{ label: 'Deal a new card', action: 'restart', primary: true }] : []),
    ];
    const called = s.current > -1 ? b.pool[s.current] : null;
    return {
      key: 'bingo', title: String(slide.title ?? ''), phase: s.phase, paused: s.paused, size,
      eyebrow: `BINGO / ${size}×${size} · ${b.pool.length} TERMS`, clockLabel: s.phase === 'ready' ? 'READY' : s.phase === 'complete' ? 'BINGO' : 'CALLING', count: `${s.called.length} / ${b.pool.length}`,
      call: called ? { eyebrow: s.revealed ? 'THE TERM WAS' : 'WHICH TERM IS THIS?', text: called.definition, term: s.revealed ? called.term : null }
        : { eyebrow: s.phase === 'complete' ? 'FINISHED' : 'NOTHING CALLED YET', text: s.phase === 'complete' ? engine.winner(board, s) : 'Call a definition. If it is on their card, a team says what the term means to claim the square.', term: null },
      cards, actions,
      caption: s.paused ? 'Paused.' : s.phase === 'ready' ? 'Every team has a different card.' : s.phase === 'complete' ? engine.winner(board, s)
        : s.current < 0 ? 'Call the next definition.' : s.revealed ? `Who claimed “${b.pool[s.current].term}”?` : 'Read it out. Reveal the term once they have answered.',
      status: s.phase === 'complete' ? `${s.called.length} of ${b.pool.length} terms called` : 'A row, column or diagonal wins · no points · each term is called once',
      tally: s.phase === 'complete' ? engine.scores(board, s).map((r) => `${r.name} · ${r.score}${r.won ? ' · LINE' : ''}`) : [],
    };
  },
};
