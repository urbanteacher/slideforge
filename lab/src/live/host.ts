// The lab's live-room host: opens a room on the relay, steps it through a show (show.ts) and speaks for the
// teacher, sending what classic sends (js/live.js; docs/games/protocol.md §17 is the minimum, and
// tests/fixtures/sessions/game-choice.json the recording it is checked against). The host marks answers with
// SlideForge's own logic (markResponse) and hands the relay its verdicts; the relay keeps the scores.
//
// Reconnect (protocol §4.3, §11). The socket is kept up by connection.ts. On each new socket the host
// rehosts the room it holds, as classic does after a reload; the relay still has the room after a network
// blip. A relay that restarted has lost every room (`rehostFailed`, or `sessionClosed` the host did not
// ask for): the host then opens a new room and replays what the room needs — the teacher's learners, the
// start, the round and the slide on the wall — and holds an open question until Next, so the phones can
// join the new room first. The new room has a new PIN and its scores start again: the relay holds both
// (phones are told `over` and forget theirs), and hard rule 5 keeps the relay as it is.

import { Connection, type Backoff, type SocketFactory } from './connection';
import { DEFAULT_TEAMS, END_CLOSE_MS, SURE_GRACE_MS, type AtFields, type HostMessage, type QuestionFields, type RelayMessage, type TallyAnswer } from './protocol';
import { Room, type Listener, type RoomState } from './room';
import type { RoomQuiz, RoomShow, RoomSlide } from './show';
import { styleFor, type ManualChoice } from './styles';

export interface HostOptions {
  /** The relay's socket, e.g. `wss://<host>` (classic: the page's own host). */
  url: string;
  show: RoomShow;
  mode?: 'individual' | 'teams';
  /** Team names; classic sends its default four even in an individual room. */
  teams?: string[];
  /** Reveal by itself when every learner has answered and no teacher-entered learner is in the room (classic does). */
  autoReveal?: boolean;
  makeSocket?: SocketFactory;
  backoff?: Partial<Backoff>;
  openTimeoutMs?: number;
  /** Every frame, both ways (the replay test listens here). */
  tap?: (dir: 'send' | 'recv', m: HostMessage | RelayMessage) => void;
}

export type { ManualChoice };

export class LiveHost {
  readonly room = new Room();
  private readonly conn: Connection;
  /** The slide on the wall, as an index into the show; -1 before `begin`. */
  private at = -1;
  private begun = false;
  private lastGame: string | null = null;
  /** The room's PIN and token while the relay holds it: what a new socket rehosts. */
  private held: { pin: string; hostToken: string } | null = null;
  /** The teacher's learners, by name and team, so a new room gets them back. */
  private manualNames: { names: string[]; team: number }[] = [];
  /** Something was not sent while the socket was down: land on the slide again once it is back. */
  private stale = false;
  private ending = false;
  /** The feedback prompt the relay holds open, and the one the teacher closed (it stays closed until the show leaves its slide). */
  private promptId: string | null = null;
  private closedFb: string | null = null;
  private sureTimer: ReturnType<typeof setTimeout> | null = null;
  private waiters: { pred: (s: RoomState) => boolean; resolve: (s: RoomState) => void }[] = [];

  constructor(private readonly opts: HostOptions) {
    this.conn = new Connection({
      url: opts.url, makeSocket: opts.makeSocket, backoff: opts.backoff, openTimeoutMs: opts.openTimeoutMs,
      tap: opts.tap,
      onOpen: () => this.opened(),
      onMessage: (m) => this.heard(m),
      onDown: () => { this.room.socket(false); },
    });
    this.room.subscribe((s) => {
      this.waiters = this.waiters.filter((w) => { if (w.pred(s)) { w.resolve(s); return false; } return true; });
    });
  }

  get state(): RoomState { return this.room.state; }
  subscribe(fn: Listener): () => void { return this.room.subscribe(fn); }
  /** The step on the wall. */
  get slide(): RoomSlide | null { return this.opts.show.slides[this.at] ?? null; }

  /** Resolves when the room's state satisfies `pred` (now, or on a later message). */
  until(pred: (s: RoomState) => boolean): Promise<RoomState> {
    if (pred(this.state)) return Promise.resolve(this.state);
    return new Promise((resolve) => { this.waiters.push({ pred, resolve }); });
  }

  /** Open the room: resolves with its state once the relay has given it a PIN. */
  start(): Promise<RoomState> {
    this.conn.start();
    return this.until((s) => s.live && !!s.pin);
  }

  begin(): void {
    if (this.begun) return;
    this.begun = true;
    this.send({ t: 'begin' });
    this.goTo(Math.max(0, this.at));
  }

  /** What the teacher's Next does: reveal an open question; ask one the room is not asking (after a relay
   *  restart, see replay); else move on. */
  next(): void {
    const q = this.slide?.quiz;
    if (q && this.begun && !this.state.revealed.includes(q.id)) {
      if (this.state.phase === 'question' && this.state.question?.id === q.id) this.reveal();
      else this.land();
    } else if (this.at < this.opts.show.slides.length - 1) this.goTo(this.at + 1);
  }

  goTo(i: number): void {
    if (i < 0 || i >= this.opts.show.slides.length) return;
    this.clearSure();
    this.at = i;
    if (this.begun) this.land();
  }

  /** Mark every answer in the latest tally and send the verdicts (classic sendReveal for a choice question). */
  reveal(answers?: TallyAnswer[], rev?: number, correct?: number): void {
    const q = this.slide?.quiz;
    if (!q || this.state.revealed.includes(q.id)) return;
    // "The answer is C", said by pressing C in the teacher-entry window (classic revealWith): the room is marked
    // against that option, the key notwithstanding. Set on the question itself, as classic sets it on the slide.
    if (correct != null && Number.isInteger(correct) && correct >= 0 && correct < q.options.length) q.correct = correct;
    this.clearSure();
    const t = this.state.tally && this.state.tally.id === q.id ? this.state.tally : null;
    const list = answers ?? t?.answers ?? [];
    // The style says what is right and what is said: an open question (typed, a number) has no option to be right,
    // so `correct` is -1 and the answer said is its accepted answer.
    const style = styleFor(q);
    const said = style.reveal(q);
    this.send({
      t: 'reveal', id: q.id, rev: rev ?? t?.rev ?? 0,
      marks: q.unmarked ? [] : list.map((a) => [a.id, style.mark(q, a.response)] as [number, boolean]),
      correct: said.correct, answer: said.answer, explanation: q.explanation ?? '',
    });
  }

  /** Add learners the teacher enters by name (manual.html's `add`). */
  manualAdd(names: string[], team = 0): void {
    this.manualNames.push({ names: [...names], team });
    this.send({ t: 'manualAdd', names, team });
  }

  /** The teacher's answer by key for a learner without a phone (manual.html's `answer`). `id` is the question the
   *  window means: the relay refuses it when it is not the one open (a manualError, shown in the window). */
  manualAnswer(playerId: number, choice: ManualChoice, id?: string): void {
    const q = this.state.question;
    if (!q && !id) return;
    const qid = id ?? q!.id;
    this.send(choice == null ? { t: 'manualAnswer', id: qid, playerId, clear: true }
      : typeof choice === 'string' ? { t: 'manualAnswer', id: qid, playerId, text: choice }
        : typeof choice === 'object' ? { t: 'manualAnswer', id: qid, playerId, value: choice.value } : { t: 'manualAnswer', id: qid, playerId, choice });
  }

  manualRename(playerId: number, name: string): void { this.send({ t: 'manualRename', playerId, name }); }
  manualTeam(playerId: number, team: number): void { this.send({ t: 'manualTeam', playerId, team }); }
  manualRemove(playerId: number, mode: 'kick' | 'delete'): void { this.send({ t: 'manualRemove', playerId, mode }); }

  /** Counts per option for a room answering on paper (manual.html's `tally`): added to the tally, never scored. */
  manualTally(counts: number[]): void {
    const q = this.state.question;
    // Hands up counts options: a typed question has none to count.
    if (q && q.options.length > 0 && !this.state.revealed.includes(q.id)) this.send({ t: 'manualTally', id: q.id, counts });
  }

  /** Close the feedback prompt on the wall (classic's desk `close`): the phones are thanked and the digest stays with the report. */
  closeFeedback(): void {
    const f = this.state.feedback;
    if (!f) return;
    this.closedFb = f.prompt.id;
    this.promptId = null;
    this.send({ t: 'promptEnd' });
  }

  /** Show a held prompt's split (classic's desk `show`). */
  showFeedback(): void { this.room.showFeedback(); }

  /** Ask the relay for the session's report (`sessionReport`). */
  report(): void { this.send({ t: 'report' }); }

  /** End the room: `end`, then close once `sessionClosed` arrives or after classic's 1.5 s. */
  async end(): Promise<RoomState> {
    this.ending = true;
    this.clearSure();
    if (!this.send({ t: 'end' })) { this.conn.stop(); this.room.end(); return this.state; }
    await Promise.race([this.until((s) => !s.live), new Promise((r) => setTimeout(r, END_CLOSE_MS))]);
    this.conn.stop();
    this.room.end();
    return this.state;
  }

  // ---- the wire

  private send(m: HostMessage): boolean {
    const ok = this.conn.send(m);
    if (ok) this.room.sent(m); else this.stale = true;
    return ok;
  }

  private hostMessage(): HostMessage {
    return { t: 'host', title: this.opts.show.title, mode: this.opts.mode ?? this.opts.show.mode ?? 'individual', teams: (this.opts.teams ?? this.opts.show.teams ?? DEFAULT_TEAMS).map((name) => ({ name })) };
  }

  private opened(): void {
    this.room.socket(true);
    if (this.ending) return;
    this.send(this.held ? { t: 'rehost', ...this.held } : this.hostMessage());
  }

  private heard(m: RelayMessage): void {
    const firstRoom = this.state.rooms === 0;
    this.room.received(m);
    switch (m.t) {
      case 'hosted':
        this.held = { pin: m.pin, hostToken: m.hostToken };
        if (!firstRoom) this.replay();
        break;
      case 'rehosted':
        this.held = { pin: m.pin, hostToken: m.hostToken };
        if (this.stale && this.begun) { this.stale = false; this.land(); }
        break;
      case 'rehostFailed':
        // The relay no longer has the room (it restarted): the socket has no role yet, so open a new one on it.
        this.held = null;
        this.send(this.hostMessage());
        break;
      case 'sessionClosed':
        // Not asked for: the relay is stopping. The socket closes; the next one opens a new room.
        if (!this.ending) this.held = null;
        break;
      case 'markStale':
        this.reveal(m.answers, m.rev);
        break;
      case 'tally':
        this.maybeAutoReveal();
        break;
    }
  }

  /** A new room for a lesson already running: what the relay lost, sent again in classic's order. A question
   *  that was open is held, not asked: the relay shuts the join window at a question, so the phones coming
   *  back with the new PIN would only wait. Next asks it once they are in. */
  private replay(): void {
    for (const g of this.manualNames) this.send({ t: 'manualAdd', names: g.names, team: g.team });
    if (!this.begun) return;
    this.send({ t: 'begin' });
    this.lastGame = null;
    this.promptId = null;
    this.land(false);
  }

  /** Tell the room about the slide on the wall, and ask its question if it has one (and `ask`). */
  private land(ask = true): void {
    const s = this.slide;
    if (!s) return;
    this.stale = false;
    const revealed = !!s.quiz && this.state.revealed.includes(s.quiz.id);
    const asking = ask && s.activity === 'question' && !!s.quiz && !revealed;
    this.send({ t: 'at', ...this.atFields(s, asking ? 'question' : s.activity === 'question' ? 'moment' : s.activity) });
    if (s.gameId && s.gameId !== this.lastGame) {
      this.lastGame = s.gameId;
      this.send({ t: 'round', gameId: s.gameId });
    }
    // Audience feedback: the slide's prompt opens when the show lands on it, and closes when the show leaves it.
    const fb = s.feedback;
    if (this.closedFb && this.closedFb !== fb?.id) this.closedFb = null;
    if (fb && this.closedFb !== fb.id) {
      if (this.promptId !== fb.id) { this.promptId = fb.id; this.send({ t: 'prompt', ...fb }); }
    } else if (this.promptId) { this.promptId = null; this.send({ t: 'promptEnd' }); }
    if (asking) { this.send({ t: 'question', ...this.questionFields(s.quiz!) }); return; }
    this.send({ t: 'idle', style: s.style, role: 'wait', participation: '', headPrompt: '' });
    if (s.results) this.send({ t: 'finish', title: 'Final scores' });
  }

  private atFields(s: RoomSlide, activity: AtFields['activity']): AtFields {
    return { slideId: s.id, title: s.title, n: this.at + 1, total: this.opts.show.slides.length, activity, text: s.text, step: 0, style: s.style, role: 'wait', participation: '', headPrompt: '', stage: null };
  }

  private questionFields(q: RoomQuiz): QuestionFields {
    const quizzes = this.opts.show.slides.filter((x) => x.quiz);
    const style = styleFor(q);
    const hasManual = this.state.players.some((p) => p.manual) || this.manualNames.length > 0;
    const f: QuestionFields = {
      id: q.id, n: quizzes.findIndex((x) => x.quiz!.id === q.id) + 1, total: quizzes.length, question: q.question,
      voteOnly: q.voteOnly === true, unmarked: q.unmarked === true, sourceSlideId: q.sourceSlideId || q.id,
      input: style.input, spoken: false, gameId: q.gameId || '', scoreSpoken: q.scoreSpoken === true, participation: '',
      confidence: q.confidence !== false, range: style.range(q), options: (q.options ?? []).filter((o) => String(o).trim()),
      // SF.questionTimeLimit: no clock while the teacher enters answers by key.
      timeLimit: hasManual ? 0 : Math.max(0, Number(q.timeLimit) || 0), points: q.points, style: q.style,
    };
    if (q.headPrompt) f.headPrompt = q.headPrompt;
    return f;
  }

  /** Classic's auto-reveal (protocol §17, step 9): everyone in, nobody entered by hand; wait for confidence taps up to 5 s. */
  private maybeAutoReveal(): void {
    const t = this.state.tally, q = this.slide?.quiz;
    if (this.opts.autoReveal === false || !t || !q || t.id !== q.id || this.state.phase !== 'question') return;
    if (!t.allIn || t.answered === 0 || t.manual) return;
    if (t.sured >= t.answered) { this.reveal(); return; }
    if (!this.sureTimer) this.sureTimer = setTimeout(() => { this.sureTimer = null; if (this.state.phase === 'question') this.reveal(); }, SURE_GRACE_MS);
  }

  private clearSure(): void {
    if (this.sureTimer) { clearTimeout(this.sureTimer); this.sureTimer = null; }
  }
}
