// The spoken games in the room (lab-engine-plan M8; docs/games/style-inventory.md, the `spokenFanout` family): Random challenge,
// Question cube, Spin & explain, Heads up, Connection maker and Concept chain. The phones answer nothing: they listen and watch,
// and the teacher gives a verdict by voice (a verdict pad on the wall, or the teacher-entry window's `recipient` and `revealWith`),
// naming who spoke. The reveal carries the verdict as `correct` and the recipient (`spoken`); the relay credits one team (a teams
// room) or counts, and keeps the count the wall shows (`oralCount`). Pure: no socket, no DOM, nothing sent from here; the host
// (host.ts, with spokenroom.ts) holds the state and sends the frames. The rules are classic's (js/live.js, "spoken verdicts").

import type { PlayerRow } from './protocol';

/** Who a verdict is for: nobody in particular (the room, no points), one player, or one team. */
export type Recipient = { type: 'room' } | { type: 'player'; id: number } | { type: 'team'; id: number };
export const ROOM: Recipient = { type: 'room' };

/** What a spoken style does with a verdict (the style entry's `spoken`). */
export interface SpokenSpec {
  /** The verdicts that count as accepted: option 0 and, for Spin & explain, "With hint" (1). The relay credits these. */
  accepts: number[];
  /** The accepted verdict that earns half (Spin & explain's "With hint"); the relay's scale is 1000 for a verdict, half with a hint. */
  half?: number;
  /** Whether an accepted verdict can put points anywhere: false for Heads up and Random challenge, which only count. */
  scores: boolean;
  /** What the wall calls the count of accepted verdicts. */
  counts: string;
  /** Connection maker and Concept chain: an idea box opens while the question is up, for the phones' proposals (`bridge`, `link`). */
  proposals?: 'bridge' | 'link';
  /** Concept chain: the term stays open, and each accepted link is credited as it lands (`oralCredit`) instead of a reveal. */
  chain?: boolean;
  /** Heads up: the guesser is the speaker for the whole round, the term goes to every other phone, and a verdict moves straight on. */
  heads?: boolean;
}

/** What the wall and the teacher's window say when a verdict lands (classic's creditFor). `who` names the speaker only when the verdict was accepted. */
export interface Credit { slideId: string; accepted: boolean; who: string; points: number; line: string }

/** A link accepted onto the chain: the term it grew from (a term that comes up twice is two rows, by its slide). */
export interface ChainLink { slideId: string; term: string; link: string }

/** Heads up's round: one clock for the whole pile, and the count of terms got right. */
export interface RoundView { gameId: string; total: number; endsAt: number; count: number; over: boolean }

/** What the host holds of the spoken desk, as the wall and the teacher's window read it. Set by the host; not on the wire. */
export interface SpokenView {
  recipient: Recipient;
  /** A scoring verdict held until the teacher says who spoke ("Correct — who spoke?"). */
  pending: { slideId: string; choice: number } | null;
  credit: Credit | null;
  /** The last few speakers, newest first. */
  recent: number[];
  /** The proposal the teacher is weighing, with its author left off the wall. */
  onTable: { slideId: string; text: string } | null;
  /** The chain's links so far, and the link typed or put on the table that Accept will add. */
  links: ChainLink[];
  pendingLink: string;
  /** The verdict given, by question: a question closed without one has none. */
  verdicts: Record<string, number>;
  round: RoundView | null;
}

export const emptySpoken = (): SpokenView => ({ recipient: ROOM, pending: null, credit: null, recent: [], onTable: null, links: [], pendingLink: '', verdicts: {}, round: null });

/** The speaker the teacher picked, made safe against the room: a player who is in it, a team that exists (teams room only), else the room. */
export function pickRecipient(picked: unknown, players: Pick<PlayerRow, 'id'>[], teams: string[], mode: string): Recipient {
  const p = (picked ?? {}) as { type?: unknown; id?: unknown };
  const id = Number(p.id);
  if (p.type === 'player' && players.some((x) => x.id === id)) return { type: 'player', id };
  if (p.type === 'team' && mode === 'teams' && Number.isInteger(id) && teams[id] != null) return { type: 'team', id };
  return ROOM;
}

/** A recipient as a key for a picker (`room`, `t<team>`, `p<player>`), and back. */
export const speakerKey = (r: Recipient): string => (r.type === 'room' ? 'room' : r.type === 'team' ? `t${r.id}` : `p${r.id}`);
export function speakerOf(key: string): Recipient {
  const id = Number(key.slice(1));
  return key[0] === 't' && Number.isInteger(id) ? { type: 'team', id } : key[0] === 'p' && Number.isInteger(id) ? { type: 'player', id } : ROOM;
}

/** Who the recipient is, in words ('' for the room). */
export function recipientName(r: Recipient, players: Pick<PlayerRow, 'id' | 'name'>[], teams: string[]): string {
  if (r.type === 'room') return '';
  if (r.type === 'team') return teams[r.id] ?? '';
  return players.find((x) => x.id === r.id)?.name ?? '';
}

const accepted = (spec: SpokenSpec, choice: number): boolean => spec.accepts.includes(choice);

/** Would this verdict put points somewhere, so it needs to know where (classic's verdictScores)? */
export function verdictScores(spec: SpokenSpec, choice: number, mode: string, scoreSpoken: boolean): boolean {
  return spec.scores && accepted(spec, choice) && (mode === 'teams' || scoreSpoken);
}

/** One verdict's worth: the relay's scale (SPOKEN_POINTS, 1000); a hint halves it. */
export const verdictPoints = (spec: SpokenSpec, choice: number): number => (spec.half === choice ? 500 : 1000);

export interface CreditCtx { recipient: Recipient; players: PlayerRow[]; teams: string[]; mode: string; scoreSpoken: boolean }

/** What lands with an accepted verdict (classic's creditFor): in a teams room the speaker's team, in an individual room the named player. A pass or a reject names nobody. */
export function creditFor(slideId: string, spec: SpokenSpec, choice: number, c: CreditCtx): Credit {
  if (!accepted(spec, choice)) return { slideId, accepted: false, who: '', points: 0, line: '' };
  const r = c.recipient;
  let who = '';
  if (c.mode === 'teams') {
    if (r.type === 'team') who = recipientName(r, c.players, c.teams);
    else if (r.type === 'player') {
      const p = c.players.find((x) => x.id === r.id);
      who = p && p.team != null ? c.teams[p.team] ?? '' : '';
    }
  } else if (r.type === 'player') who = recipientName(r, c.players, c.teams);
  const scores = verdictScores(spec, choice, c.mode, c.scoreSpoken);
  const pts = verdictPoints(spec, choice);
  return { slideId, accepted: true, who, points: scores && who ? pts : 0, line: who ? (scores ? `${who} +${pts}` : who) : '' };
}
