// Quiz bowl (board 'bowl', format 'quiz-bowl'): a grid of categories by values, played to a target. The teacher opens a cell, reads
// its question, takes an answer from the room, reveals, and awards the cell's value to the team that answered (or nobody); a cell is
// spent either way, and the board ends when it empties or a team reaches the target. The state and its moves are SlideForge's
// (src/boards/runtimes/bowl.js: create, transition, pending, scores, winner, leaders); the tick and the command are its runtime's
// without the drawing. An award or a "nobody scored" goes to the journal with the cell, its category, value and question, the team,
// and the value awarded (classic's onVerdict), so the report can show points.
import { installBowl } from '@sf/boards/runtimes/bowl.js';
import type { BoardKind, BoardState, BoardWallBase } from './types';

const ns: { Bowl?: SFBowlEngine } = {};
installBowl(ns);
const engine = ns.Bowl!;

type Question = { question: string; answer: string; value?: number };
type Cell = { category: string; value: number; row: number; col: number; questions: Question[] };
interface BowlState extends BoardState { phase: 'ready' | 'picking' | 'asking' | 'complete'; used: number[]; cell: number; revealed: boolean; scores: number[]; asked: number; awarded: number; elapsed: number; paused: boolean }
interface BowlBoardData { categories: string[]; values: number[]; cells: Cell[]; target: number; participants: string[] }

export interface BowlWall extends BoardWallBase {
  phase: BowlState['phase']; paused: boolean; eyebrow: string; clockLabel: string; left: string;
  categories: string[];
  /** The grid, row by row as SlideForge orders its cells: a value to open, or a spent cell. */
  cells: { value: number; label: string; waiting: number; open: boolean }[];
  /** The question being asked (it replaces the grid), and its answer once revealed. */
  ask: { eyebrow: string; question: string; answer: string | null } | null;
  teams: { name: string; score: number; won: boolean; award: string | null }[];
  caption: string; status: string;
}

const asBoard = (b: Record<string, unknown>) => b as unknown as BowlBoardData;

export const bowl: BoardKind<BowlWall> = {
  key: 'bowl', formats: ['quiz-bowl'], style: 'bowl', interval: 1000, wholeGame: true,
  companion: { role: 'watch', headPrompt: 'Quiz bowl', participation: 'Watch the board. Answer out loud when your team is up — the teacher awards the cell.' },
  create: (board) => engine.create(board),
  tick(ctx, dt) {
    const s = ctx.state as BowlState;
    if (s.phase === 'ready' || s.phase === 'complete') return;
    s.elapsed += dt;
  },
  command(ctx, action, team) {
    const b = asBoard(ctx.board), before = ctx.state as BowlState;
    const after = engine.transition(ctx.board, before, action, team) as BowlState;
    ctx.state = after;
    if ((action === 'award' || action === 'noScore') && before.cell > -1 && after.cell === -1) {
      const cell = b.cells[before.cell], q = engine.pending(ctx.board, before, before.cell) as Question | null;
      ctx.report({
        slideId: ctx.slide.id, title: ctx.slide.title, kind: 'bowl', set: 1, card: before.cell, term: `${cell.category} ${cell.value} — ${q ? q.question : ''}`,
        participant: action === 'award' && b.participants.length > 1 ? b.participants[team!] : null, right: action === 'award', value: action === 'award' ? cell.value : 0,
      });
    }
    ctx.paint();
  },
  // src/boards/bowl.js decorateIntro: its categories, its questions (a cell each, or more), and the target.
  coverText: (board) => {
    const b = asBoard(board), n = b.categories.length, q = b.cells.reduce((k, c) => k + c.questions.length, 0);
    return `${n}${n === 1 ? ' category · ' : ' categories · '}${q} cells · first to ${b.target}`;
  },
  wall(slide, board, state) {
    const b = asBoard(board), s = state as BowlState;
    const lead = s.phase === 'complete' ? engine.leaders(board, s) : [];
    const asking = s.phase === 'asking' && s.cell > -1 ? b.cells[s.cell] : null;
    const q = asking ? (engine.pending(board, s, s.cell) as Question | null) : null;
    const actions = [
      ...(s.phase === 'ready' ? [{ label: 'Open the board →', action: 'start', primary: true }] : []),
      ...(s.phase === 'asking' ? [s.revealed ? { label: 'Nobody scored', action: 'noScore', primary: false } : { label: 'Reveal the answer', action: 'reveal', primary: true }] : []),
      ...(s.phase === 'picking' || s.phase === 'asking' ? [{ label: s.paused ? 'Resume' : 'Pause', action: 'pause', primary: false }] : []),
      ...(s.phase === 'complete' ? [{ label: 'Play this board again', action: 'restart', primary: true }] : []),
    ];
    return {
      key: 'bowl', title: String(slide.title ?? ''), phase: s.phase, paused: s.paused, eyebrow: `QUIZ BOWL / FIRST TO ${b.target}`,
      clockLabel: s.phase === 'ready' ? 'READY' : s.phase === 'complete' ? 'FINISHED' : s.phase === 'asking' ? 'ON A CELL' : 'CHOOSE',
      left: `${b.cells.reduce((n, c, i) => n + Math.max(0, c.questions.length - s.used[i]), 0)} left`,
      categories: b.categories,
      cells: b.cells.map((c, i) => { const waiting = Math.max(0, c.questions.length - s.used[i]); return { value: c.value, label: `${c.category}, ${c.value} points`, waiting, open: waiting > 0 && s.phase === 'picking' && !s.paused }; }),
      ask: asking ? { eyebrow: `${asking.category.toUpperCase()} · ${asking.value}`, question: q?.question ?? '', answer: s.revealed ? q?.answer ?? '' : null } : null,
      teams: engine.scores(board, s).map((r, i) => ({ name: r.name, score: r.score, won: lead.includes(i), award: s.phase === 'asking' && s.revealed && asking ? `+ ${asking.value}` : null })),
      caption: s.paused ? 'Paused.' : s.phase === 'ready' ? 'Pick a category and a value to begin.' : s.phase === 'complete' ? engine.winner(board, s)
        : s.phase === 'asking' ? (s.revealed ? 'Who answered it?' : 'Read it out and take an answer.') : 'Choose an unused cell.',
      status: s.phase === 'complete' ? `${s.asked} cells opened · ${s.awarded} awarded` : `Correct scores the cell value · a cell is spent either way · first to ${b.target}`,
      actions,
    };
  },
};
