// Teams and rosters in the studio's room (lab-engine-plan M11b). Pure: no DOM, no socket.
//  - how a lesson plays: individual, or teams (SlideForge's normalizeQuizConfig: up to 6 names of up to 20 letters, no
//    two alike, and teams only with two or more), read from the first game's settings as classic reads them;
//  - a roster pasted in the lobby (manual.html's `names`: a name a line, up to 24 letters, no two alike, up to 200);
//  - the team standings: the relay's own rows when it sends them (it averages each team's gains, server.js scoreRows),
//    else the members' average, so the wall never shows a team without a score.

import type { PlayerRow, ScoreRow } from './protocol';

export const MAX_TEAMS = 6;
export const TEAM_NAME_MAX = 20;
export const NAME_MAX = 24;
export const ROSTER_MAX = 200;
/** What classic hosts with when a deck sets none (src/model.js makeQuizConfig). */
export const TEAM_DEFAULTS = ['Red', 'Blue', 'Green', 'Yellow'];
/** Team colours, in the order of the coloured answer pads on the phones (src/model.js TEAM_COLORS). */
export const TEAM_COLORS = ['#e8474f', '#2b7ce9', '#e8a020', '#29a86b', '#8b5cf0', '#d4477f'];
export const teamColor = (i: number): string => TEAM_COLORS[((i % TEAM_COLORS.length) + TEAM_COLORS.length) % TEAM_COLORS.length];

export interface RoomPlay { mode: 'individual' | 'teams'; teams: string[] }

/** Team names from a list or a typed line (commas or new lines): trimmed, cut, no two alike (any case), at most six. */
export function normalizeTeams(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(/[\n,]/) : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of list) {
    const name = String(typeof t === 'string' ? t : (t as { name?: unknown } | null)?.name ?? '').trim().slice(0, TEAM_NAME_MAX);
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    out.push(name);
    if (out.length === MAX_TEAMS) break;
  }
  return out;
}

/** How the room plays, made safe: `teams` mode needs two names or it is an individual room (which still carries the default four, as classic sends). */
export function roomPlay(raw: { mode?: unknown; teams?: unknown } | null | undefined): RoomPlay {
  const names = normalizeTeams(raw?.teams);
  if (raw?.mode === 'teams') {
    const t = names.length ? names : TEAM_DEFAULTS;
    return t.length >= 2 ? { mode: 'teams', teams: t } : { mode: 'individual', teams: TEAM_DEFAULTS };
  }
  return { mode: 'individual', teams: names.length ? names : TEAM_DEFAULTS };
}

export interface Roster { names: string[]; /** Lines left out: a repeat, or past the room's limit. */ skipped: number }

/** A roster pasted or typed, a name a line (a leading list number is dropped), the way teacher entry reads it. `have` are names already in the room. */
export function parseRoster(text: string, have: string[] = []): Roster {
  const seen = new Set(have.map((n) => n.trim().toLowerCase()));
  const names: string[] = [];
  let skipped = 0;
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.replace(/^\s*\d{1,3}[.)]\s+/, '').trim().slice(0, NAME_MAX);
    if (!line) continue;
    const key = line.toLowerCase();
    if (seen.has(key) || seen.size >= ROSTER_MAX) { skipped++; continue; }
    seen.add(key);
    names.push(line);
  }
  return { names, skipped };
}

export interface TeamRow { index: number; name: string; color: string; members: number; score: number; rank: number; names: string[] }

/** The room's teams, best first (ties share a rank). Null in an individual room. */
export function teamBoardOf(room: { mode: string; teams: string[]; players: PlayerRow[]; rows: ScoreRow[] }): TeamRow[] | null {
  if (room.mode !== 'teams' || room.teams.length === 0) return null;
  const sent = new Map<number, ScoreRow>();
  for (const r of room.rows) if (typeof r.ci === 'number') sent.set(r.ci, r);
  const rows = room.teams.map((name, index): Omit<TeamRow, 'rank'> => {
    const mine = room.players.filter((p) => p.team === index);
    const r = sent.get(index);
    const score = r && typeof r.score === 'number' ? r.score : mine.length ? Math.round(mine.reduce((n, p) => n + p.score, 0) / mine.length) : 0;
    return { index, name, color: teamColor(index), members: mine.length, score, names: mine.map((p) => p.name) };
  });
  rows.sort((a, b) => b.score - a.score || a.index - b.index);
  let rank = 0;
  return rows.map((r, i) => { if (i === 0 || rows[i - 1].score !== r.score) rank = i + 1; return { ...r, rank }; });
}
