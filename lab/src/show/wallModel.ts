// What the wall shows, as data: from the room's state and the step on the wall to the view the HTML paints.
// Pure (no DOM, no socket), so it is tested without a browser (lab/tests/show-wall.test.ts). Also the Next-key
// state machine: what one press of Next does in a room, as classic's live gate does (js/live.js `gate`:
// a press right after a question lands is swallowed for GRACE_MS, so a double press does not reveal the answer
// the instant the question appears; then Next reveals; then Next moves on).

import type { RoomState } from '../live';
import { railOf, type Rail } from './rail';
import type { Step } from './steps';

/** Classic's grace after a question is asked, before Next may reveal it (js/live.js GRACE_MS). */
export const GRACE_MS = 1500;

export interface WallOption { index: number; label: string; count: number; correct: boolean }
export interface WallPlayer { id: number; name: string; connected: boolean }
export interface WallRow { id: number; rank: number; name: string; score: number; connected: boolean }

export type WallView = 'connecting' | 'lobby' | 'question' | 'reveal' | 'leaderboard' | 'slide' | 'ended';

export interface Wall {
  view: WallView;
  /** The join address people type, the PIN, and the link the QR encodes (PIN in it). */
  join: { address: string; pin: string; link: string } | null;
  players: WallPlayer[];
  /** The question on the wall (view `question` and `reveal`). */
  question: {
    n: number; total: number; text: string; options: WallOption[];
    /** The question's style: `truefalse` draws its two votes as two big tiles. */
    style: string;
    answered: number; players: number; timeLimit: number;
    /** Reveal only: how many of the answers were right. */
    right: number;
    /** Reveal only: the right answer, and why. */
    answer: string; explanation: string;
  } | null;
  /** The leaderboard: the whole room, best first; the wall shows the top of it. */
  board: WallRow[];
  /** A scores step with no question after it: its leaderboard is the final one. */
  final: boolean;
  /** The standings beside the slide (classic's rail); null when it stays off. */
  rail: Rail | null;
}

export interface WallInput {
  room: RoomState;
  steps: Step[];
  /** Index into `steps` of the step on the wall; -1 before the room begins. */
  at: number;
  /** Everyone's points when the question on the wall was asked, by player id (what the rail's gains are measured from). */
  before?: Record<number, number>;
  /** The teacher asked for the scores (the S key), over any step. */
  scoresOn: boolean;
  /** Fallback join address when the relay's own is missing (classic: this page's origin + /join.html). */
  fallbackJoin: string;
}

/** The address people type: no scheme, no `/join.html` (classic shortHost and the lobby's URL line). */
export const shortAddress = (url: string): string => url.replace(/^https?:\/\//, '').replace(/\/join\.html$/, '');

/** The link a phone opens, with the PIN in it (classic joinLink). */
export function joinLink(joinUrl: string, pin: string): string {
  return joinUrl + (joinUrl.includes('?') ? '&' : '?') + 'pin=' + pin;
}

/** Votes per option: the relay's counts when it sends them, else counted off the answers. */
export function countsOf(room: RoomState, optionCount: number): number[] {
  const t = room.tally;
  if (t?.counts && t.counts.length) return Array.from({ length: optionCount }, (_, i) => t.counts![i] ?? 0);
  const out = new Array<number>(optionCount).fill(0);
  for (const a of t?.answers ?? []) if (typeof a.response === 'number' && a.response >= 0 && a.response < optionCount) out[a.response]++;
  return out;
}

export function boardOf(room: RoomState): WallRow[] {
  return [...room.players]
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .map((p, i, all) => ({ id: p.id, rank: i > 0 && all[i - 1].score === p.score ? 0 : i + 1, name: p.name, score: p.score, connected: p.connected }))
    .map((r, i, rows) => ({ ...r, rank: r.rank || rows[i - 1].rank }));
}

export function wallOf(i: WallInput): Wall {
  const { room, steps, at } = i;
  const step = steps[at] ?? null;
  const joinUrl = room.joinUrl || i.fallbackJoin;
  const join = room.pin ? { address: shortAddress(joinUrl), pin: room.pin, link: joinLink(joinUrl, room.pin) } : null;
  const players = room.players.map((p) => ({ id: p.id, name: p.name, connected: p.connected }));
  const board = boardOf(room);
  const quizId = step?.room.quiz?.id;
  const rail = railOf({ board, before: i.before ?? {}, revealed: !!quizId && room.revealed.includes(quizId), join: join && { address: join.address, pin: join.pin } });
  const base = { join, players, question: null, board, rail, final: !!step?.room.results && !steps.slice(at + 1).some((x) => x.room.quiz) };
  if (room.ended) return { ...base, view: 'ended' };
  if (!room.live && !room.pin) return { ...base, view: 'connecting' };
  if (at < 0 || room.phase === 'lobby') return { ...base, view: 'lobby' };
  const quiz = step?.room.quiz;
  if (quiz && (room.question?.id === quiz.id || room.revealed.includes(quiz.id))) {
    const revealed = room.revealed.includes(quiz.id);
    const options = quiz.options.filter((o) => String(o).trim());
    const counts = countsOf(room, options.length);
    const t = room.tally && room.tally.id === quiz.id ? room.tally : null;
    const question = {
      n: steps.slice(0, at + 1).filter((s) => s.room.quiz).length, total: steps.filter((s) => s.room.quiz).length, text: quiz.question, style: String(quiz.style ?? 'choice'),
      options: options.map((label, index) => ({ index, label, count: counts[index], correct: revealed && index === quiz.correct })),
      right: revealed ? (t?.answers ?? []).filter((a) => a.response === quiz.correct).length : 0,
      answered: t?.answered ?? 0, players: t?.total ?? room.players.filter((p) => p.connected).length, timeLimit: room.question?.timeLimit ?? 0,
      answer: revealed ? String(quiz.options[quiz.correct] ?? '') : '', explanation: revealed ? quiz.explanation ?? '' : '',
    };
    if (i.scoresOn) return { ...base, question, view: 'leaderboard' };
    return { ...base, question, view: revealed ? 'reveal' : 'question' };
  }
  if (step?.room.results || i.scoresOn) return { ...base, view: 'leaderboard' };
  return { ...base, view: 'slide' };
}

export type NextAction = 'wait' | 'start' | 'ask' | 'reveal' | 'advance' | 'end' | 'none';

export interface NextInput {
  room: RoomState;
  steps: Step[];
  at: number;
  /** Milliseconds since the question on the wall was asked. */
  sinceAsked: number;
}

/**
 * What one press of Next does in a room:
 *  - before the room begins: `start` (once someone has joined; otherwise `wait`: a room with nobody in it
 *    should not start by a stray key);
 *  - on a question being asked: `wait` through the grace, then `reveal` (`ask` if the room is not asking it);
 *  - after the reveal, or on any other step: `advance`;
 *  - on the last step: `end`.
 * The slide's own builds and a transition still arriving are the player's, before this (Show.tsx).
 */
export function nextAction(i: NextInput): NextAction {
  const { room, steps, at } = i;
  if (room.ended) return 'none';
  if (at < 0 || room.phase === 'lobby') return room.players.length > 0 ? 'start' : 'wait';
  const quiz = steps[at]?.room.quiz;
  if (quiz && !room.revealed.includes(quiz.id)) {
    if (room.question?.id !== quiz.id) return 'ask'; // not asked yet (held after a relay restart): Next asks it (LiveHost.next)
    return i.sinceAsked < GRACE_MS ? 'wait' : 'reveal';
  }
  return at < steps.length - 1 ? 'advance' : 'end';
}
