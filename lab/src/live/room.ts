// The room as the host knows it, built only from the messages on the wire: what the relay sends, and what
// the host itself sent (the relay does not echo `begin` or `question` back to the host, so those are read
// off the host's own frames). Scores are the relay's: the host never adds them up itself.

import type { BossView, DripView, RaceView } from './mechanics';
import type { Digest, HostMessage, Phase, PromptFields, PlayerRow, RelayMessage, ScoreRow, Session, TallyAnswer } from './protocol';

/** The open (or last) question, as the host asked it. */
export interface OpenQuestion { id: string; slideId: string; options: string[]; timeLimit: number }

/** The latest `tally` for the open question. */
export interface Tally {
  id: string; rev: number; counts: number[] | null; answered: number; sured: number; total: number; allIn: boolean; manual: boolean; answers: TallyAnswer[];
  /** The Showdown: the votes when the split was shown (null before), and how many phones have switched since. */
  split?: number[] | null; switched?: number;
}

/** The feedback prompt that is open: what was asked, and the latest digest of the room's replies (the relay's `responses`). */
export interface OpenFeedback {
  prompt: PromptFields;
  /** A held prompt (`prompt.hold`) the teacher has shown: the split is on the wall only after this. */
  shown: boolean;
  /** Phones that have replied, and the people in the room, as the relay counts them. */
  answered: number;
  players: number;
  digest: Digest | null;
}

/** What the lesson's mechanic puts on the wall beside the question (live/mechanics.ts): the race's track, the boss's health, the word as it drips. Set by the host; not on the wire. */
export interface Mech { race: RaceView | null; boss: BossView | null; drip: DripView | null }

export interface RoomState {
  /** The socket to the relay is up. */
  connected: boolean;
  /** The relay knows this room (`hosted` or `rehosted` arrived on the current socket). */
  live: boolean;
  /** The room has ended (`sessionClosed` after the host's `end`). */
  ended: boolean;
  pin: string | null;
  hostToken: string | null;
  joinUrl: string | null;
  session: Session | null;
  /** How many rooms the relay has opened for this lesson: more than one after a relay restart. */
  rooms: number;
  mode: string;
  teams: string[];
  phase: Phase | null;
  joinOpen: boolean;
  players: PlayerRow[];
  /** The relay's scoreboard rows: players', or teams' in a teams room. */
  rows: ScoreRow[];
  /** Points per player id, as the relay last reported them. */
  scores: Record<number, number>;
  question: OpenQuestion | null;
  tally: Tally | null;
  /** The audience feedback prompt that is open, or null. */
  feedback: OpenFeedback | null;
  /** Question ids the relay has revealed. */
  revealed: string[];
  /** Question ids whose gate step the host has sent (`closeAnswers`: predictions locked; `showdown`: the split shown). */
  gated: string[];
  /** The last refusal of a teacher entry. */
  manualError: { message: string; playerId?: number; id?: string } | null;
  /** The last `error` or `rehostFailed` reason. */
  error: string | null;
  report: unknown;
  /** The relay's last word on whether it is writing the session's journal (`recording`); null until it says. */
  recording: boolean | null;
  /** The lesson's mechanic as the wall draws it (Horse race, Boss battle, Word reveal). */
  mech: Mech;
}

export const emptyRoom = (): RoomState => ({
  connected: false, live: false, ended: false, pin: null, hostToken: null, joinUrl: null, session: null, rooms: 0,
  mode: 'individual', teams: [], phase: null, joinOpen: true, players: [], rows: [], scores: {}, question: null, tally: null, feedback: null,
  revealed: [], gated: [], manualError: null, error: null, report: null, recording: null, mech: { race: null, boss: null, drip: null },
});

export type Listener = (state: RoomState, cause: HostMessage | RelayMessage | { t: 'socket'; up: boolean } | { t: 'feedbackShown' } | { t: 'mech' }) => void;

export class Room {
  private s: RoomState = emptyRoom();
  private listeners = new Set<Listener>();
  /** A reveal sent and not yet answered: the relay's `teamAnswers` confirms it, a `markStale` refuses it. A typed
   *  question's reveal (`correct` -1: no option is right) gets no `teamAnswers` (the relay sends it for a choice
   *  only); the `players` that follow every reveal confirm it instead (`pendingOpen`). */
  private pendingReveal: string | null = null;
  private pendingOpen = false;
  /** What the phones answer the question on the wall with: the relay sends `teamAnswers` for a choice question only. */
  private askedInput = 'choice';

  get state(): RoomState { return this.s; }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }

  /** The socket went up or down. */
  socket(up: boolean): void {
    this.s = { ...this.s, connected: up, live: up && this.s.live };
    this.emit({ t: 'socket', up });
  }

  /** A frame the host sent. */
  sent(m: HostMessage): void {
    const s = { ...this.s };
    switch (m.t) {
      case 'begin': s.phase = 'running'; break;
      case 'at': if (m.activity !== 'question' && s.phase !== 'lobby') { s.phase = 'idle'; s.question = null; } break;
      case 'idle': s.phase = 'idle'; s.question = null; break;
      case 'question':
        s.phase = 'question';
        s.question = { id: m.id, slideId: m.sourceSlideId, options: m.options, timeLimit: m.timeLimit };
        s.tally = null;
        this.askedInput = m.input;
        break;
      case 'reveal': this.pendingReveal = m.id; this.pendingOpen = m.correct < 0 || this.askedInput !== 'choice'; break;
      case 'closeAnswers': case 'showdown': s.gated = s.gated.includes(m.id) ? s.gated : [...s.gated, m.id]; break;
      case 'finish': s.phase = 'idle'; break;
      case 'prompt': s.feedback = { prompt: m, shown: false, answered: 0, players: s.players.filter((p) => p.connected).length, digest: null }; break;
      case 'promptEnd': s.feedback = null; break;
      default: return;
    }
    this.s = s;
    this.emit(m);
  }

  /** A frame the relay sent. */
  received(m: RelayMessage): void {
    const s = { ...this.s };
    switch (m.t) {
      case 'hosted':
        Object.assign(s, { live: true, ended: false, pin: m.pin, hostToken: m.hostToken, joinUrl: m.joinUrl, session: m.session, mode: m.mode, teams: m.teams, phase: 'lobby', rooms: s.rooms + 1, players: [], rows: [], scores: {}, tally: null, feedback: null, error: null });
        break;
      case 'rehosted':
        Object.assign(s, { live: true, pin: m.pin, hostToken: m.hostToken, joinUrl: m.joinUrl, mode: m.mode, teams: m.teams, phase: m.phase, error: null });
        if (m.question?.revealed && !s.revealed.includes(m.question.id)) s.revealed = [...s.revealed, m.question.id];
        break;
      case 'rehostFailed': Object.assign(s, { live: false, error: m.reason }); break;
      case 'error': s.error = m.message; break;
      case 'players':
        s.players = m.list;
        s.rows = Array.isArray(m.rows) ? m.rows : [];
        s.mode = m.mode || s.mode;
        s.joinOpen = m.joinOpen;
        s.scores = Object.fromEntries(m.list.map((p) => [p.id, p.score]));
        if (this.pendingReveal && this.pendingOpen) {
          s.revealed = s.revealed.includes(this.pendingReveal) ? s.revealed : [...s.revealed, this.pendingReveal];
          s.phase = 'revealed';
          this.pendingReveal = null;
        }
        break;
      case 'teamAnswers':
        // A choice reveal the relay took: it answers with `teamAnswers`, then `players` with the new scores.
        if (this.pendingReveal) {
          s.revealed = s.revealed.includes(this.pendingReveal) ? s.revealed : [...s.revealed, this.pendingReveal];
          s.phase = 'revealed';
          this.pendingReveal = null;
        }
        break;
      case 'tally':
        if (!s.question || m.id === s.question.id) s.tally = { id: m.id, rev: m.rev, counts: m.counts, answered: m.answered, sured: m.sured, total: m.total, allIn: m.allIn, manual: m.manual, answers: m.answers, split: Array.isArray(m.split) ? (m.split as number[]) : null, switched: Number(m.switched) || 0 };
        break;
      case 'responses':
        if (s.feedback && s.feedback.prompt.id === m.id) {
          const { t: _t, id: _id, answered, players, ...digest } = m;
          s.feedback = { ...s.feedback, answered, players, digest: { ...digest } as Digest };
        }
        break;
      case 'markStale':
        // The relay refused the reveal: the marks were from a short snapshot, and the host sends them again.
        this.pendingReveal = null;
        s.revealed = s.revealed.filter((id) => id !== m.id);
        if (s.tally && s.tally.id === m.id) s.tally = { ...s.tally, rev: m.rev, answers: m.answers };
        break;
      case 'manualError': s.manualError = { message: m.message, playerId: m.playerId, id: m.id }; break;
      case 'recording': s.recording = m.persisted !== false; break;
      case 'sessionReport': s.report = m.report; break;
      case 'sessionClosed': Object.assign(s, { live: false, report: m.report }); break;
      default: return;
    }
    this.s = s;
    this.emit(m);
  }

  /** The teacher shows a held prompt's split. */
  showFeedback(): void {
    if (!this.s.feedback || this.s.feedback.shown) return;
    this.s = { ...this.s, feedback: { ...this.s.feedback, shown: true } };
    this.emit({ t: 'feedbackShown' });
  }

  /** The host's mechanic moved: the track, the boss's health, or the dripping word (a field left out stays as it is). */
  setMech(patch: Partial<Mech>): void {
    this.s = { ...this.s, mech: { ...this.s.mech, ...patch } };
    this.emit({ t: 'mech' });
  }

  /** The host ended the room and the relay closed it. */
  end(): void {
    this.s = { ...this.s, ended: true, live: false };
    this.emit({ t: 'end' });
  }

  private emit(cause: Parameters<Listener>[1]): void {
    for (const fn of this.listeners) fn(this.s, cause);
  }
}
