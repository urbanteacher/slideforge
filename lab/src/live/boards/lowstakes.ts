// Low-stakes quiz (style 'lowstakes', format 'low-stakes-quiz'), the smallest board: every question on the board, the class writes
// on paper against one clock for the whole quiz, then the answers are revealed for discussion. No phone answers and no points.
// The state and its moves are SlideForge's (src/boards/runtimes/lowstakes.js: create, transition, formatClock); the tick and the
// command are its runtime's mount and command, without the drawing: the clock runs down only in the quiz phase, and a reveal
// (early, or the clock running out) reports to the journal through the board's `reportValue` ("5 questions · early reveal").
import { clampLowstakesSeconds } from '@sf/games/lowstakes.js';
import { installLowStakes } from '@sf/boards/runtimes/lowstakes.js';
import type { BoardCtx, BoardKind, BoardState, BoardWallBase } from './types';

const ns: { LowStakes?: SFLowStakesEngine } = {};
installLowStakes(ns);
const engine = ns.LowStakes!;

type Item = { question?: string; answer?: string; gap?: string | null };
interface LowState extends BoardState { phase: 'ready' | 'quiz' | 'answers' | 'complete'; remaining: number; paused: boolean; elapsed: number }

export interface LowStakesWall extends BoardWallBase {
  phase: LowState['phase']; paused: boolean;
  /** "QUIZ", and the clock: the time left while the class writes, else the time it took. */
  clockLabel: string; clock: string;
  items: { n: string; question: string; answer: string | null; gap: string | null }[];
  caption: string; status: string;
}

const itemsOf = (b: Record<string, unknown>): Item[] => (Array.isArray(b.items) ? (b.items as Item[]) : []);
const ready = (b: Record<string, unknown>) => itemsOf(b).filter((i) => !i.gap).length;

function revealReport(ctx: BoardCtx, early: boolean): void {
  ctx.report({ slideId: ctx.slide.id, title: ctx.slide.title, count: ready(ctx.board), early });
}

export const lowstakes: BoardKind<LowStakesWall> = {
  key: 'lowstakes', formats: ['low-stakes-quiz'], style: 'lowstakes', interval: 250, answersOnEnd: true,
  companion: { role: 'paper', headPrompt: 'Low-stakes quiz', participation: 'Write on paper. No phone scoring — watch the board for the reveal.' },
  create: (board) => engine.create(board),
  tick(ctx, dt) {
    const s = ctx.state as LowState;
    if (s.phase !== 'quiz') return;
    const next = { ...s, remaining: Math.max(0, s.remaining - dt), elapsed: s.elapsed + dt };
    if (!next.remaining) {
      ctx.state = engine.transition(ctx.board, next, 'expire');
      revealReport(ctx, false);
      ctx.paint();
      return;
    }
    ctx.state = next;
    return true;
  },
  command(ctx, action) {
    const before = ctx.state as LowState;
    ctx.state = engine.transition(ctx.board, before, action);
    if (action === 'reveal' || action === 'expire') revealReport(ctx, action === 'reveal' && before.phase === 'quiz' && before.remaining > 0);
    ctx.paint();
  },
  revealed: (s) => s.phase === 'answers' || s.phase === 'complete',
  coverText: (b) => `${itemsOf(b).length} questions · write on paper · ${clampLowstakesSeconds(b.timeLimit)}s then reveal`,
  wall(slide, b, state) {
    const s = state as LowState, limit = Number(b.timeLimit) || 0;
    const show = s.phase === 'answers' || s.phase === 'complete';
    const items = itemsOf(b).map((it, i) => ({ n: String(i + 1).padStart(2, '0'), question: String(it.question ?? ''), answer: show && !it.gap ? String(it.answer ?? '') : null, gap: it.gap ?? null }));
    const caption = s.paused ? 'Paused. Resume when the room is ready.'
      : s.phase === 'ready' ? 'Questions stay on the board. Answers stay hidden until time is up.'
        : s.phase === 'quiz' ? 'Retrieval in progress — no notes, no phones scoring this round.'
          : s.phase === 'answers' ? 'Discuss answers together before moving on.' : 'Retrieval complete. Replay resets the clock.';
    const actions = s.phase === 'ready' ? [{ label: 'Start the quiz →', action: 'start', primary: true }, { label: 'Reveal answers now', action: 'reveal', primary: false }]
      : s.phase === 'quiz' ? [{ label: s.paused ? 'Resume' : 'Pause', action: 'pause', primary: false }, { label: 'Reveal answers →', action: 'reveal', primary: true }]
        : s.phase === 'answers' ? [{ label: 'Finish', action: 'finish', primary: true }, { label: 'Play again', action: 'restart', primary: false }]
          : [{ label: 'Play this quiz again', action: 'restart', primary: true }];
    return {
      key: 'lowstakes', title: String(slide.title ?? ''), phase: s.phase, paused: s.paused,
      clockLabel: s.phase === 'ready' ? 'READY' : s.phase === 'quiz' ? (s.paused ? 'PAUSED' : 'QUIZ') : s.phase === 'answers' ? 'REVEAL' : 'DONE',
      clock: engine.formatClock(s.phase === 'quiz' ? s.remaining : s.phase === 'ready' ? limit : s.elapsed),
      items, caption, status: `${ready(b)} of ${items.length} ready · ${engine.formatClock(limit)} quiz · paper answers · no points`, actions,
    };
  },
};
