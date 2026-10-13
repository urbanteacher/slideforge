// The standings rail: classic keeps the leaderboard on screen beside the slide through the whole game
// (js/live.js paintRail, Player.setScoreboard), so a full-slide leaderboard between questions would only hide the
// answer everyone is reading. This is its model: the top of the board with what each player gained on the question
// just revealed, and the join details in the footer so latecomers can still find the room. Pure.

import type { TeamRow } from '../live';
import type { WallRow } from './wallModel';

/** Rows on the rail: it is read from a distance, so it shows the leading few. */
export const RAIL_ROWS = 8;
/** Above this many people the rail is not a public ranking of strangers: it stays off the wall (classic LECTURE_SIZE). */
export const LECTURE_SIZE = 60;

export interface RailRow extends WallRow { /** Points won on the question just revealed; 0 before it is. */ gained: number; /** A team's colour, in a teams room. */ color?: string }
export interface Rail {
  subtitle: string;
  scoreLabel: string;
  rows: RailRow[];
  /** People below the rail's rows. */
  more: number;
  join: { address: string; pin: string } | null;
}

export interface RailInput {
  board: WallRow[];
  /** A teams room's standings: the rail shows the teams, not the people. */
  teams?: TeamRow[] | null;
  teamBefore?: Record<number, number>;
  /** Everyone's points when the question was asked, by player id. */
  before: Record<number, number>;
  revealed: boolean;
  join: { address: string; pin: string } | null;
}

/** The rail, or null when it stays off (a lecture-sized room). */
export function railOf(i: RailInput): Rail | null {
  const n = i.board.length;
  if (n > LECTURE_SIZE) return null;
  if (i.teams) {
    const rows = i.teams.map((t): RailRow => ({ id: t.index, rank: t.rank, name: t.name, score: t.score, connected: true, color: t.color,
      gained: i.revealed && i.teamBefore?.[t.index] != null ? Math.max(0, t.score - i.teamBefore[t.index]) : 0 }));
    return { subtitle: `${rows.length} teams · ${n} ${n === 1 ? 'player' : 'players'}`, scoreLabel: 'Team points', rows, more: 0, join: i.join };
  }
  const rows = i.board.slice(0, RAIL_ROWS).map((r): RailRow => ({
    ...r, gained: i.revealed && i.before[r.id] != null ? Math.max(0, r.score - i.before[r.id]) : 0,
  }));
  return { subtitle: `${n} ${n === 1 ? 'player' : 'players'}`, scoreLabel: 'Game points', rows, more: n - rows.length, join: i.join };
}
