// What the wall shows, as data: from the room's state and the step on the wall to the view the HTML paints.
// Pure (no DOM, no socket), so it is tested without a browser (lab/tests/show-wall.test.ts). Also the Next-key
// state machine: what one press of Next does in a room, as classic's live gate does (js/live.js `gate`:
// a press right after a question lands is swallowed for GRACE_MS, so a double press does not reveal the answer
// the instant the question appears; then Next reveals; then Next moves on).

import { styleFor, teamBoardOf, type Mech, type RoomState, type TeamRow, type WallDetail } from '../live';
import { feedbackWallOf, type FeedbackWall } from './feedbackWall';
import { railOf, type Rail } from './rail';
import type { Step } from './steps';

/** Classic's grace after a question is asked, before Next may reveal it (js/live.js GRACE_MS). */
export const GRACE_MS = 1500;

export interface WallOption { index: number; label: string; count: number; correct: boolean }
export interface WallPlayer { id: number; name: string; connected: boolean; team: number | null }
export interface WallRow { id: number; rank: number; name: string; score: number; connected: boolean; team?: number | null }

/** What the lesson's mechanic puts on the wall (live/mechanics.ts): the race's track, the boss's health, the word as it drips. */
export type WallMech = Mech;
const NO_MECH: WallMech = { race: null, boss: null, drip: null };

export type WallView = 'connecting' | 'lobby' | 'question' | 'reveal' | 'leaderboard' | 'slide' | 'feedback' | 'ended';

export interface Wall {
  view: WallView;
  /** The join address people type, the PIN, and the link the QR encodes (PIN in it). */
  join: { address: string; pin: string; link: string } | null;
  players: WallPlayer[];
  /** The question on the wall (view `question` and `reveal`). */
  question: {
    n: number; total: number; text: string; options: WallOption[];
    /** The question's style key. */
    style: string;
    answered: number; players: number; timeLimit: number;
    /** A style's gate step is taken (predictions locked, the split shown) and the answer is still hidden: the bars are up, the answer is not. */
    locked: boolean;
    /** Reveal only: how many of the answers were right. */
    right: number;
    /** Reveal only: the right answer, and why. */
    answer: string; explanation: string;
    /** What the wall draws once the answer is up, from the question's style (live/styles): bars (`pair`: two big tiles for True or false), what the room typed (not shown while the question is open: the phones would copy it), or a number line. */
    detail: WallDetail;
  } | null;
  /** The teams, best first, in a teams room; null in an individual one. */
  teams: TeamRow[] | null;
  /** The leaderboard: the whole room, best first; the wall shows the top of it. */
  board: WallRow[];
  /** A scores step with no question after it: its leaderboard is the final one. */
  final: boolean;
  /** The standings beside the slide (classic's rail); null when it stays off, and on a feedback slide (its prompt takes the place). */
  rail: Rail | null;
  /** The audience feedback the room is asked on this slide (view `feedback`): bars, spread, cloud or ideas. */
  feedback: FeedbackWall | null;
  /** The track, the boss or the dripping word: with the question (a word only while it is asked), and on the scores. */
  mech: WallMech;
}

export interface WallInput {
  room: RoomState;
  steps: Step[];
  /** Index into `steps` of the step on the wall; -1 before the room begins. */
  at: number;
  /** Everyone's points when the question on the wall was asked, by player id (what the rail's gains are measured from). */
  before?: Record<number, number>;
  /** Each team's points when the question was asked, by team index (the team rail's gains). */
  teamBefore?: Record<number, number>;
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
    .map((p, i, all) => ({ id: p.id, rank: i > 0 && all[i - 1].score === p.score ? 0 : i + 1, name: p.name, score: p.score, connected: p.connected, team: p.team }))
    .map((r, i, rows) => ({ ...r, rank: r.rank || rows[i - 1].rank }));
}

export function wallOf(i: WallInput): Wall {
  const { room, steps, at } = i;
  const step = steps[at] ?? null;
  const joinUrl = room.joinUrl || i.fallbackJoin;
  const join = room.pin ? { address: shortAddress(joinUrl), pin: room.pin, link: joinLink(joinUrl, room.pin) } : null;
  const players = room.players.map((p) => ({ id: p.id, name: p.name, connected: p.connected, team: p.team }));
  const board = boardOf(room);
  const quizId = step?.room.quiz?.id;
  const teams = teamBoardOf(room);
  const rail = railOf({ board, teams, teamBefore: i.teamBefore, before: i.before ?? {}, revealed: !!quizId && room.revealed.includes(quizId), join: join && { address: join.address, pin: join.pin } });
  const base = { join, players, teams, question: null, feedback: null, mech: NO_MECH, board, rail, final: !!step?.room.results && !steps.slice(at + 1).some((x) => x.room.quiz) };
  if (room.ended) return { ...base, view: 'ended' };
  if (!room.live && !room.pin) return { ...base, view: 'connecting' };
  if (at < 0 || room.phase === 'lobby') return { ...base, view: 'lobby' };
  const quiz = step?.room.quiz;
  if (quiz && (room.question?.id === quiz.id || room.revealed.includes(quiz.id))) {
    const revealed = room.revealed.includes(quiz.id);
    const options = quiz.options.filter((o) => String(o).trim());
    const counts = countsOf(room, options.length);
    const t = room.tally && room.tally.id === quiz.id ? room.tally : null;
    const style = styleFor(quiz);
    const answers = t?.answers ?? [];
    const question = {
      n: steps.slice(0, at + 1).filter((s) => s.room.quiz).length, total: steps.filter((s) => s.room.quiz).length, text: quiz.question, style: String(quiz.style ?? 'choice'),
      options: options.map((label, index) => ({ index, label, count: counts[index], correct: revealed && index === quiz.correct })),
      right: revealed ? answers.filter((a) => style.mark(quiz, a.response)).length : 0,
      detail: style.wall(quiz, answers, revealed, { gated: room.gated.includes(quiz.id), split: t?.split ?? null, switched: t?.switched ?? 0, room }),
      locked: !revealed && !!style.gate && room.gated.includes(quiz.id),
      answered: t?.answered ?? 0, players: t?.total ?? room.players.filter((p) => p.connected).length, timeLimit: room.question?.timeLimit ?? 0,
      answer: revealed ? style.reveal(quiz).answer : '', explanation: revealed ? quiz.explanation ?? '' : '',
    };
    // The word drips only while its question is asked; once revealed, the answer slide spells it out.
    const mech: WallMech = { race: room.mech.race, boss: room.mech.boss, drip: !revealed && room.mech.drip?.id === quiz.id ? room.mech.drip : null };
    if (i.scoresOn) return { ...base, question, mech, view: 'leaderboard' };
    // A style that asks the room something after its reveal (Odd one out's "defend a pick") has the ideas beside it, in the standings' place.
    const after = revealed && style.afterReveal && room.feedback ? feedbackWallOf(room.feedback) : null;
    if (after) return { ...base, question, mech, rail: null, feedback: after, view: 'reveal' };
    return { ...base, question, mech, view: revealed ? 'reveal' : 'question' };
  }
  const asked = step?.room.feedback, open = room.feedback;
  if (asked && open && open.prompt.id === asked.id && !i.scoresOn) return { ...base, rail: null, feedback: feedbackWallOf(open), view: 'feedback' };
  if (step?.room.results || i.scoresOn) return { ...base, mech: { race: room.mech.race, boss: room.mech.boss, drip: null }, view: 'leaderboard' };
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
