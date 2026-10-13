// The boards the studio's room runs (lab-engine-plan M8): games the wall plays as one board, which no phone answers. A board
// is one file in this folder and one line in BOARDS; the desk (desk.ts) runs any of them on SlideForge's board runtime.
// Low-stakes quiz, the memory boards, Bingo and Quiz bowl.
import { GAME_STYLES } from '@sf/games/registry.js';
import type { RoomBoard } from './desk';
import { bingo } from './bingo';
import { bowl } from './bowl';
import { lowstakes } from './lowstakes';
import { memory } from './memory';
import type { BoardEntry, BoardKind, BoardWallBase } from './types';

export const BOARDS: BoardKind[] = [lowstakes, memory, bingo, bowl].map((b) => b as unknown as BoardKind);

/** The board kind for a lab game format, or undefined when the room runs no board for it. */
export const boardForFormat = (format: string): BoardKind | undefined => BOARDS.find((b) => b.formats.includes(format));
/** The board kind by its key (a room step's `board.key`). */
export const boardOfKey = (key: string): BoardKind | undefined => BOARDS.find((b) => b.key === key);

/** SlideForge's definition of a board (its game style's `boardEngine`), by its key. */
const defOf = (key: string): SFBoardDef | undefined => Object.values(GAME_STYLES).map((st) => st.boardEngine as SFBoardDef | undefined).find((b) => b?.key === key);

/** The board among a lab slide's compiled slides (`game.board`), or null when none is one the room runs. */
export function boardOn(compiled: Record<string, unknown>[] | undefined): { kind: BoardKind; slide: Record<string, unknown> } | null {
  for (const kind of BOARDS) {
    const field = defOf(kind.key)?.field;
    const slide = field ? (compiled ?? []).find((c) => c[field]) : undefined;
    if (slide) return { kind, slide };
  }
  return null;
}

/** The board itself on its compiled slide (`slide[def.field]`). */
export const boardData = (rb: RoomBoard): Record<string, unknown> => (rb.slide[defOf(rb.key)?.field ?? ''] ?? {}) as Record<string, unknown>;

/** The board's wall, from its state (a board not started yet: its first state). */
export function boardWallOf(rb: RoomBoard, entry: BoardEntry | undefined): BoardWallBase | null {
  const kind = boardOfKey(rb.key);
  if (!kind) return null;
  const b = boardData(rb);
  return kind.wall(rb.slide, b, entry?.state ?? kind.create(b));
}

/** The board's answers are up (the show draws the game's answer slide). */
export const boardRevealed = (rb: RoomBoard, entry: BoardEntry | undefined): boolean => !!entry && !!boardOfKey(rb.key)?.revealed?.(entry.state);

export { BoardDesk, type BoardEnv, type RoomBoard } from './desk';
export type { BingoCard, BingoWall } from './bingo';
export type { BowlWall } from './bowl';
export type { LowStakesWall } from './lowstakes';
export type { MemoryCard, MemoryWall } from './memory';
export type { BoardAction, BoardCtx, BoardEntry, BoardKind, BoardState, BoardVerdict, BoardWallBase } from './types';
