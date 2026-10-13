// A board the studio's room runs (lab-engine-plan M8): a game the wall plays as one board, which no phone answers. SlideForge
// keeps a board's definition with its game style (src/boards/<board>.js, `boardEngine`: its field, its states, what a verdict
// reports) and its lifecycle in src/boards/runtime.js (a session: its state per slide, a clock that ticks while it is on the
// wall, frozen while the show is elsewhere). The lab uses both as they are (desk.ts) and adds, per board, only what classic's
// runtime draws in the DOM: what the wall shows and the teacher's commands (`BoardKind`). Pure: no React, no DOM, no socket.

import type { Briefing } from '../styles/types';

/** A board's state as its engine keeps it (src/boards/runtimes/<board>.js `create`). */
export type BoardState = Record<string, unknown>;

/** A board's state, by the board step's id: its kind, and the state its engine keeps. */
export interface BoardEntry { key: string; state: BoardState }

/** What a board reports for the journal (`oral`, docs/games/protocol.md): a verdict no phone sees. */
export interface BoardVerdict { slideId: string; title: string; kind: string; set: number; card: number; term: string; participant: string | null; right: boolean; value: number }

/** What a board kind is handed while it is on the wall: its compiled slide and board, its state, and the runtime's report and paint. */
export interface BoardCtx {
  /** The compiled board slide (src/boards/<board>.js compile), with the step's id. */
  slide: { id: string; title?: string; [field: string]: unknown };
  /** The board on it (`slide[def.field]`). */
  board: Record<string, unknown>;
  get state(): BoardState;
  set state(s: BoardState);
  /** Tell the journal: the value goes through the board definition's `reportValue`, as classic's `onVerdict` does. */
  report(value: unknown): void;
  /** Tell the wall the state changed. */
  paint(): void;
}

/** One action button the wall offers the teacher. */
export interface BoardAction { label: string; action: string; primary: boolean }

/** A board's wall, as data: its kind says what else it carries. */
export interface BoardWallBase { key: string; title: string; actions: BoardAction[] }

export interface BoardKind<W extends BoardWallBase = BoardWallBase> {
  /** The board definition's key (`boardEngine.key`), and the lab's game formats played on it. */
  key: string;
  formats: string[];
  /** The phones' skin and what they are told while the board is up (classic phoneCompanion). */
  style: string;
  /** The board step's skin when it depends on the board (the memory boards: the board's own kind, classic phoneStyle). */
  styleOf?(board: Record<string, unknown>): string;
  companion: Briefing;
  /** How often the board's clock ticks (ms; the runtime's session interval). */
  interval: number;
  create(board: Record<string, unknown>): BoardState;
  /** The runtime's tick: the clock moves (dt in seconds); true when the wall should be told. */
  tick(ctx: BoardCtx, dt: number): boolean | void;
  /** A teacher's command (the wall's buttons; classic `SF.Boards.command`). */
  command(ctx: BoardCtx, action: string, card?: number): void;
  /** The board's answers are up: the show draws the game's answer slide (Low-stakes quiz). */
  revealed?(state: BoardState): boolean;
  /** The game's last slide is its answers, which the board's reveal draws, not a step of its own. */
  answersOnEnd?: boolean;
  /** The board plays the whole game (memory, bingo, quiz bowl): the game's other slides after its cover are not steps, and it has no scores step. */
  wholeGame?: boolean;
  /** What the cover tells the phones ("5 questions · write on paper · 180s then reveal"). */
  coverText?(board: Record<string, unknown>): string;
  wall(slide: BoardCtx['slide'], board: Record<string, unknown>, state: BoardState): W;
}
