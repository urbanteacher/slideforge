// Beat the clock in the studio's room (lab-engine-plan M8), as classic runs it (js/live.js "Beat the Clock, self-paced"
// and js/rounds.js). Two ways, chosen as the room lands on the run's first question:
//
//  - The sprint (K29), with every learner on a phone: the host hands the relay the run's questions and their key
//    (`sprint`), the relay marks each phone's taps and reports the room's progress (`sprintProgress`); the wall shows the
//    clock and the progress, never a question. The first Next asks "again to stop the clock", the second sends
//    `sprintEnd`; the relay's `sprintResult` (at time, or on `sprintEnd`) is the result, and the run's questions are done.
//    Next then goes past them. The relay marks here, and only here (AGENTS.md; games audit, section 6).
//  - The wall-paced round, when a teacher-entered learner is in the room (an answer typed in by the teacher cannot keep
//    its own pace): ordinary questions under one clock for the whole run (`roundLeft`), each closing itself after its
//    pace, a reveal adding the room's right answers to the round's count and moving on after a beat. When the clock
//    runs out the question that was up closes, and Next skips the questions nobody reached.
//
// The host (host.ts) owns the socket and the show; the desk asks it through `SpeedEnv`. Pure: no DOM, no React.

import type { HostMessage, RelayMessage, SprintProgress, SprintQuestion, SprintResult } from './protocol';
import type { RoomState } from './room';
import type { RoomQuiz, RoomSlide } from './show';

export interface SprintView {
  id: string; gameId: string; seconds: number;
  /** When the clock runs out (the host's clock, ms). */
  endsAt: number;
  /** The clock was stopped or ran out. */
  over: boolean;
  questions: SprintQuestion[];
  progress: SprintProgress | null;
  result: SprintResult | null;
}

/** The wall-paced round: one clock for the run, and the room's right answers so far. */
export interface SpeedRound { gameId: string; total: number; endsAt: number; count: number; over: boolean }

export interface SpeedView { sprint: SprintView | null; round: SpeedRound | null; notice: string }
export const emptySpeed = (): SpeedView => ({ sprint: null, round: null, notice: '' });

export interface SpeedEnv {
  state(): RoomState;
  slides(): RoomSlide[];
  slide(): RoomSlide | null;
  send(m: HostMessage): boolean;
  now(): number;
  after(fn: () => void, ms: number): void;
  /** Reveal the question on the wall; whether the host has revealed this one. */
  reveal(): void;
  revealed(id: string): boolean;
  /** The sprint's questions are done (the relay closed the run): the room treats them as revealed. */
  markRevealed(ids: string[]): void;
  goTo(i: number): void;
  next(): void;
  /** A teacher-entered learner is in the room: the run is wall-paced, and a question's pace does not close it. */
  hasManual(): boolean;
  publish(patch: Partial<SpeedView>): void;
}

/** Next twice within this to stop the sprint's clock, so a stray press cannot (js/live.js sprintNext). */
export const STOP_AGAIN_MS = 3000;
/** How long a wall-paced reveal stays up before the next question (js/rounds.js counted). */
export const SPEED_MOVE_ON_MS = 1500;

const isSpeed = (q: RoomQuiz | undefined | null): q is RoomQuiz => !!q && q.style === 'speed';
const roundOf = (q: RoomQuiz): number => Number(q.roundSeconds) || 0;

export class SpeedDesk {
  private v: SpeedView = emptySpeed();
  /** The running sprint's questions and the step after its last one. */
  private run: { ids: string[]; after: number } | null = null;
  /** Games whose sprint is over: their questions are not asked again. */
  private done = new Set<string>();
  private stopAsked = -Infinity;

  constructor(private readonly env: SpeedEnv) {}

  get view(): SpeedView { return this.v; }

  private set(patch: Partial<SpeedView>): void {
    this.v = { ...this.v, ...patch };
    this.env.publish(patch);
  }

  /** Whether a question runs as a sprint: one is running for its game, its game's sprint is over, or it would start one. */
  sprintFor(s: RoomSlide): boolean {
    const q = s.quiz;
    if (!q) return false;
    return this.v.sprint?.gameId === q.gameId || this.done.has(q.gameId) || (isSpeed(q) && roundOf(q) > 0 && q.input !== 'text' && !this.env.hasManual());
  }

  /** The show landed on a step (`asking`: its question would be asked). 'sprint': the sprint went out (the run's first slide);
   *  'idle': a sprint's slide after that, the phones wait; null: the room asks as usual (a wall-paced round's clock runs). */
  landed(s: RoomSlide, asking: boolean): 'sprint' | 'idle' | null {
    if (this.v.sprint && s.gameId !== this.v.sprint.gameId) this.leave();
    const q = s.quiz;
    if (asking && q && this.sprintFor(s)) {
      if (this.v.round) this.set({ round: null }); // the wall-paced round stays out of a sprint
      if (this.v.sprint || this.done.has(q.gameId)) return 'idle';
      this.start(q);
      return 'sprint';
    }
    if (asking && isSpeed(q) && roundOf(q) > 0) { this.startRound(q); this.pace(q); }
    else if (this.v.round && s.gameId !== this.v.round.gameId) this.set({ round: null });
    return null;
  }

  // ---- the sprint

  private start(q: RoomQuiz): void {
    const slides = this.env.slides(), list: RoomQuiz[] = [];
    let last = -1;
    slides.forEach((x, i) => { if (x.quiz && x.quiz.gameId === q.gameId && x.quiz.style === 'speed') { list.push(x.quiz); last = i; } });
    const now = this.env.now(), seconds = roundOf(q), id = `${q.gameId}:${now}`;
    const questions = list.map((x) => ({ id: x.id, question: x.question, options: x.options, correct: x.correct }));
    this.run = { ids: list.map((x) => x.id), after: last + 1 };
    this.stopAsked = -Infinity;
    this.env.send({ t: 'sprint', id, gameId: q.gameId, seconds, questions });
    this.set({ sprint: { id, gameId: q.gameId, seconds, endsAt: now + seconds * 1000, over: false, questions, progress: null, result: null }, notice: '' });
    // At time the relay closes the run itself (its own clock) and sends the result; the wall says "Time!" meanwhile.
    this.env.after(() => { const cur = this.v.sprint; if (cur && cur.id === id && !cur.over) this.set({ sprint: { ...cur, over: true } }); }, seconds * 1000);
  }

  /** The relay's word on the sprint: its progress, and its result. */
  heard(m: RelayMessage): void {
    const sp = this.v.sprint;
    if (!sp || (m.t !== 'sprintProgress' && m.t !== 'sprintResult') || m.id !== sp.id) return;
    if (m.t === 'sprintProgress') { const { t: _t, ...progress } = m; this.set({ sprint: { ...sp, progress } }); return; }
    const { t: _t, ...result } = m;
    this.set({ sprint: { ...sp, result, over: true }, notice: '' });
    this.env.markRevealed(this.run?.ids ?? []);
  }

  /** Stop the clock (the wall's button, or Next twice): the relay closes the run and sends the result. */
  stop(): void {
    const sp = this.v.sprint;
    if (!sp || sp.over) return;
    this.set({ sprint: { ...sp, over: true }, notice: '' });
    this.env.send({ t: 'sprintEnd' });
  }

  /** Next on a sprint's slide: stop the clock (twice, so a stray press cannot), then go past the run. False: not a sprint's slide. */
  next(): boolean {
    const sp = this.v.sprint, s = this.env.slide();
    if (!sp || !s || s.gameId !== sp.gameId) return false;
    if (!sp.over) {
      if (this.env.now() - this.stopAsked < STOP_AGAIN_MS) this.stop();
      else { this.stopAsked = this.env.now(); this.set({ notice: 'Press Next again to stop the clock' }); }
      return true;
    }
    const after = this.run?.after ?? -1;
    this.leave();
    if (after >= 0 && after < this.env.slides().length) this.env.goTo(after);
    else this.set({ notice: 'That was the last slide' });
    return true;
  }

  /** The show leaves the sprint's game: an open run is closed, and its questions are done. */
  private leave(): void {
    const sp = this.v.sprint;
    if (!sp) return;
    if (!sp.over) this.env.send({ t: 'sprintEnd' });
    this.done.add(sp.gameId);
    this.env.markRevealed(this.run?.ids ?? []);
    this.run = null;
    this.set({ sprint: null, notice: '' });
  }

  // ---- the wall-paced round

  private startRound(q: RoomQuiz): void {
    const r = this.v.round;
    if (r && r.gameId === q.gameId) return;
    const total = roundOf(q);
    const round: SpeedRound = { gameId: q.gameId, total, endsAt: this.env.now() + total * 1000, count: 0, over: false };
    this.set({ round });
    this.env.after(() => this.expire(round), total * 1000);
  }

  /** The round's clock ran out: the question that was up closes as it would on its own clock. */
  private expire(round: SpeedRound): void {
    const cur = this.v.round;
    if (!cur || cur.over || cur.gameId !== round.gameId || cur.endsAt !== round.endsAt) return;
    this.set({ round: { ...cur, over: true } });
    this.timeup(true);
  }

  /** A question that has waited its pace closes itself: one slow phone must not stall the room's clock (js/rounds.js pace). */
  private pace(q: RoomQuiz): void {
    const secs = Number(q.paceSeconds) || 0;
    if (secs <= 0) return;
    this.env.after(() => {
      const cur = this.v.round;
      if (!cur || cur.over || this.env.slide()?.quiz?.id !== q.id || this.env.revealed(q.id)) return;
      this.timeup(false);
    }, secs * 1000);
  }

  /** Classic's `timeup`: a teacher-entered learner may still be being recorded, so only the round's end closes the question then. */
  private timeup(roundOver: boolean): void {
    if (!roundOver && this.env.hasManual()) return;
    const q = this.env.slide()?.quiz;
    if (q && !this.env.revealed(q.id) && this.env.state().question?.id === q.id) this.env.reveal();
  }

  /** A wall-paced question was revealed: its right answers go to the round's count, and the next question comes up after a beat. */
  revealed(q: RoomQuiz, marks: [number, boolean][]): void {
    const r = this.v.round;
    if (!r || r.over || !isSpeed(q) || q.gameId !== r.gameId) return;
    this.set({ round: { ...r, count: r.count + marks.filter((m) => m[1]).length } });
    this.env.after(() => {
      const now = this.v.round;
      if (now && !now.over && this.env.slide()?.quiz?.id === q.id) this.env.next();
    }, SPEED_MOVE_ON_MS);
  }

  /** The round is over: Next skips the questions nobody reached (js/rounds.js step). The step to go to, or null. */
  skip(at: number): number | null {
    const r = this.v.round, slides = this.env.slides(), cur = slides[at]?.quiz;
    if (!r || !r.over || !isSpeed(cur) || cur.gameId !== r.gameId) return null;
    let i = at + 1;
    while (i < slides.length && slides[i].gameId === r.gameId && slides[i].quiz?.style === 'speed') i++;
    return i >= slides.length || i === at + 1 ? null : i;
  }

  /** A round's phones count down the round, not the question (`roundLeft`). */
  questionExtras(q: RoomQuiz): { roundLeft?: number } {
    if (!isSpeed(q) || roundOf(q) <= 0) return {};
    const r = this.v.round;
    const left = r && !r.over && r.gameId === q.gameId ? Math.max(0, Math.round((r.endsAt - this.env.now()) / 1000)) : 0;
    return { roundLeft: left || roundOf(q) };
  }
}
