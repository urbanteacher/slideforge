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
import { DEFAULT_TEAMS, END_CLOSE_MS, SURE_GRACE_MS, type AtFields, type HostMessage, type PromptFields, type QuestionFields, type RelayMessage, type TallyAnswer } from './protocol';
import { Boss, Race, type DripView } from './mechanics';
import { Room, type Listener, type RoomState } from './room';
import type { RoomQuiz, RoomShow, RoomSlide } from './show';
import { wordRevealMask } from '@sf/games/wordreveal.js';
import { SpokenDesk } from './spokenroom';
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
  /** The host's clock and timer for what runs on time apart from the relay (Heads up's round and its move on): the real ones by default; the replay runs them on the recording's. */
  now?: () => number;
  after?: (fn: () => void, ms: number) => void;
}

export type { ManualChoice };

const maskOf = (word: string, shown: number): string => wordRevealMask(word, shown);

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
  private quickAt = 0;
  private sureTimer: ReturnType<typeof setTimeout> | null = null;
  /** A style with a reading phase (Definition challenge): the questions whose reading is over (asked), and the reading clock. */
  private readDone = new Set<string>();
  private readTimer: ReturnType<typeof setTimeout> | null = null;
  /** Questions whose reveal the host has sent. The relay may refuse one (`markStale`: an answer came in after the marks were made), and the
   *  host sends it again; until then the teacher's Next moves on, as classic's does (its own record of what it revealed), not reveals again. */
  private revealSent = new Set<string>();
  /** How many of a question's help steps the teacher has released (a style with `help`), by question id. */
  private helped = new Map<string, number>();
  /** The lesson's mechanic, kept across its questions (live/mechanics.ts): the race's track, the boss's HP; and the word dripping on the wall. */
  private race: Race | null = null;
  private boss: Boss | null = null;
  private dripTimer: ReturnType<typeof setInterval> | null = null;
  private dripShown = 0;
  /** The spoken desk: who is speaking, a held verdict, the credit (spokenroom.ts). */
  private readonly desk: SpokenDesk;
  private waiters: { pred: (s: RoomState) => boolean; resolve: (s: RoomState) => void }[] = [];

  constructor(private readonly opts: HostOptions) {
    this.conn = new Connection({
      url: opts.url, makeSocket: opts.makeSocket, backoff: opts.backoff, openTimeoutMs: opts.openTimeoutMs,
      tap: opts.tap,
      onOpen: () => this.opened(),
      onMessage: (m) => this.heard(m),
      onDown: () => { this.room.socket(false); },
    });
    this.desk = new SpokenDesk({
      state: () => this.state, slide: () => this.slide, send: (m) => this.send(m),
      reveal: () => this.reveal(), revealed: (id) => this.isRevealed(id), publish: (patch) => this.room.setSpoken(patch),
      openPrompt: (fields) => this.openQuick(fields), closePrompt: (id) => this.closeQuick(id),
      now: () => (opts.now ?? Date.now)(), slides: () => opts.show.slides, next: () => this.next(),
      after: (fn, ms) => { if (opts.after) opts.after(fn, ms); else (setTimeout(fn, ms) as { unref?: () => void }).unref?.(); },
    });
    this.resetMechanic();
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
    // A Heads up round that has run out: Next skips the terms nobody reached.
    const skip = this.desk.skip(this.at);
    if (skip != null && this.begun) { this.goTo(skip); return; }
    const q = this.slide?.quiz;
    if (q && this.begun && !this.isRevealed(q.id)) {
      if (this.state.phase === 'question' && this.state.question?.id === q.id) {
        // A style with a step before its reveal (lock the predictions, show the split) takes it on the first Next.
        if (!this.release() && !this.gate()) this.reveal();
      } else if (this.reading()) this.ask();
      else this.land();
    } else if (this.at < this.opts.show.slides.length - 1) this.goTo(this.at + 1);
  }

  /** Release the next help step of the open question (Emoji guess: the letter pattern, then the hint), as classic's builds do:
   *  the hint is `hintOut` first (the relay halves what is answered after it), then the step on `at`. False when there is none left. */
  release(): boolean {
    const s = this.slide, q = s?.quiz;
    if (!s || !q || !this.begun || this.state.phase !== 'question' || this.state.question?.id !== q.id || this.state.revealed.includes(q.id)) return false;
    const steps = styleFor(q).help?.(q) ?? [];
    const n = this.helped.get(q.id) ?? 0;
    if (n >= steps.length) return false;
    this.helped.set(q.id, n + 1);
    if (steps[n] === 'hint') this.send({ t: 'hintOut', id: q.id });
    this.send({ t: 'at', ...this.atFields(s, 'question', false) });
    return true;
  }

  private isRevealed(id: string): boolean { return this.state.revealed.includes(id) || this.revealSent.has(id); }

  /** The question on the wall is in its reading phase (a style that has one, before it is asked). */
  reading(): boolean {
    const q = this.slide?.quiz;
    return !!q && this.begun && !!styleFor(q).reading && !this.readDone.has(q.id) && !this.state.revealed.includes(q.id);
  }

  /** End the reading: the recall question is asked (the teacher's Next, or the reading clock running out). */
  ask(): void {
    const q = this.slide?.quiz;
    if (!q || !this.reading()) return;
    this.readDone.add(q.id);
    this.clearRead();
    this.land();
  }

  goTo(i: number): void {
    if (i < 0 || i >= this.opts.show.slides.length) return;
    this.clearSure();
    this.clearRead();
    this.at = i;
    if (this.begun) this.land();
  }

  /** The step before the reveal the style takes (lock the predictions, show the split), once; false when there is none or it is taken. */
  gate(): boolean {
    const q = this.slide?.quiz;
    if (!q || !this.begun || this.state.phase !== 'question' || this.state.question?.id !== q.id) return false;
    const gate = styleFor(q).gate;
    if (!gate || this.state.gated.includes(q.id)) return false;
    this.send({ t: gate, id: q.id });
    return true;
  }

  /** Mark every answer in the latest tally and send the verdicts (classic sendReveal for a choice question). */
  reveal(answers?: TallyAnswer[], rev?: number, correct?: number): void {
    const q = this.slide?.quiz;
    if (!q || this.state.revealed.includes(q.id)) return;
    // "The answer is C", said by pressing C in the teacher-entry window (classic revealWith): the room is marked
    // against that option, the key notwithstanding. Set on the question itself, as classic sets it on the slide.
    if (correct != null && Number.isInteger(correct) && correct >= 0 && correct < q.options.length) q.correct = correct;
    this.clearSure();
    this.desk.closing(q);
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
      ...(style.gains ? { gains: style.gains(q, list, { dripShown: this.dripShown }) } : {}),
      ...this.desk.revealExtras(q),
    });
    this.revealSent.add(q.id);
    this.stopDrip();
    if (style.afterReveal) this.openAfterReveal(style.afterReveal.prompt);
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
        : typeof choice === 'object' ? ('order' in choice ? { t: 'manualAnswer', id: qid, playerId, order: choice.order }
          : 'fill' in choice ? { t: 'manualAnswer', id: qid, playerId, fill: choice.fill }
            : 'sort' in choice ? { t: 'manualAnswer', id: qid, playerId, sort: choice.sort } : { t: 'manualAnswer', id: qid, playerId, value: choice.value })
          : { t: 'manualAnswer', id: qid, playerId, choice });
  }

  /** The teacher says who is speaking (manual.html's `recipient`): a held verdict is completed by it. */
  recipient(picked: unknown): void { this.desk.recipient(picked); }
  /** A spoken question's verdict (the wall's pads, or `revealWith` in the entry window). False when the question on the wall is not one it can be given to. */
  verdict(choice: number): boolean { return this.desk.verdict(choice); }
  /** "Count it for the room": a held verdict lands with no points. */
  verdictRoom(): void { this.desk.verdictRoom(); }
  /** A proposal from the room put on the table (manual.html's `useProposal`): its author is the speaker. */
  useProposal(pid: number, text: string): void { this.desk.useProposal(pid, text); }
  /** "The answer is C", said by pressing C in the entry window: the verdict on a spoken question, else the reveal against that option. */
  revealWith(choice: number): void { if (!this.verdict(choice)) this.reveal(undefined, undefined, choice); }

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
    this.clearRead();
    this.stopDrip();
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
        if (!firstRoom) { this.resetMechanic(); this.replay(); }
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
        // Only for the question still on the wall (classic: the pending slide is the one the relay names): a late one for a question the show has left is no business of this one.
        if (!this.ending && this.slide?.quiz?.id === m.id) this.reveal(m.answers, m.rev);
        break;
      case 'tally':
        this.maybeAutoReveal();
        break;
      case 'teamAnswers':
        this.moveMechanic(m.counts ?? [], m.correct);
        break;
      case 'players':
        // An individual race runs on each player's right answers, which the relay sends after `teamAnswers`: the lanes catch up with them.
        if (this.race?.stale(this.state.mode, this.state.players)) this.moveRace([], -1);
        break;
    }
  }

  // ---- the lesson's mechanic

  /** The race, the boss or neither, new: at the start, and in a new room (its players' scores start again). */
  private resetMechanic(): void {
    const show = this.opts.show;
    this.race = show.mechanic === 'race' ? new Race(show.trackLength ?? 5) : null;
    this.boss = show.mechanic === 'boss' ? new Boss(show.bossHp ?? 1) : null;
    this.room.setMech({ race: null, boss: this.boss ? this.boss.view('') : null });
  }

  /** The relay's per-team picks after a reveal: the race's lanes move, or the boss takes a hit (classic's `teamAnswers` handler). */
  private moveMechanic(counts: number[][], correct: number): void {
    if (this.race) this.moveRace(counts, correct);
    else if (this.boss) this.strikeBoss(counts, correct);
  }

  private moveRace(counts: number[][], correct: number): void {
    const race = this.race!, st = this.state;
    const moved = race.advance(st.mode, st.teams, st.players, counts, correct);
    const view = race.view(st.mode, st.teams, st.players, moved);
    this.send({ t: 'raceLanes', length: race.length, rows: view.lanes.map((l) => [l.key, l.pos] as [string, number]) });
    this.room.setMech({ race: view });
  }

  private strikeBoss(counts: number[][], correct: number): void {
    const q = this.slide?.quiz, boss = this.boss!;
    if (!q) return;
    const t = this.state.tally && this.state.tally.id === q.id ? this.state.tally : null;
    const quizzes = this.opts.show.slides.filter((x) => x.quiz);
    const n = quizzes.findIndex((x) => x.quiz!.id === q.id) + 1;
    const { view, verdict } = boss.strike(q, n, this.state.mode, counts, correct, t?.answers ?? []);
    // The damage goes in the record: a report can say who answered what, and that the room took the boss from eleven HP to nothing.
    this.send({ t: 'oral', slideId: q.id, title: String(q.gameTitle || this.opts.show.title || 'Boss battle'), kind: 'boss', set: 1, card: n - 1, term: verdict.term, participant: null, right: verdict.right, value: verdict.value });
    this.room.setMech({ boss: view });
  }

  /** What the scores slide sends: the race's or the boss's result, else the final scores (classic's `results` slide). */
  private finishFrame(): HostMessage {
    const st = this.state;
    if (this.race) {
      const view = this.race.result(st.mode, st.teams, st.players);
      this.room.setMech({ race: view });
      return { t: 'finish', kind: 'race', title: 'Race result', note: view.note };
    }
    if (this.boss) {
      const note = this.boss.result();
      this.room.setMech({ boss: this.boss.view(note) });
      return { t: 'finish', kind: 'boss', title: 'Boss battle', note };
    }
    return { t: 'finish', title: 'Final scores' };
  }

  /** The word begins to drip onto the wall (classic's startWordReveal): a few letters open, then one more at each interval, on the host's clock. */
  private startDrip(q: RoomQuiz): void {
    this.stopDrip();
    const d = styleFor(q).drip?.(q);
    if (!d) { this.room.setMech({ drip: null }); return; }
    this.dripShown = d.start;
    const view = (): DripView => ({ id: q.id, word: d.word, mask: maskOf(d.word, this.dripShown), hint: d.hint, shown: this.dripShown, total: d.total });
    this.room.setMech({ drip: view() });
    this.dripTimer = setInterval(() => {
      if (this.dripShown >= d.total) { this.stopDrip(); return; }
      this.dripShown++;
      this.room.setMech({ drip: view() });
    }, d.everyMs);
    (this.dripTimer as { unref?: () => void }).unref?.();
  }

  private stopDrip(): void {
    if (this.dripTimer) { clearInterval(this.dripTimer); this.dripTimer = null; }
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
    const revealed = !!s.quiz && this.isRevealed(s.quiz.id);
    if (s.quiz && !revealed) this.startDrip(s.quiz); else { this.stopDrip(); this.room.setMech({ drip: null }); }
    this.desk.landed(s);
    const asking = ask && s.activity === 'question' && !!s.quiz && !revealed;
    // A style that opens in a reading phase (Definition challenge) tells the room to read, and asks when the reading is over.
    const reading = asking && !!styleFor(s.quiz!).reading && !this.readDone.has(s.quiz!.id);
    this.send({ t: 'at', ...this.atFields(s, asking ? 'question' : s.activity === 'question' ? 'moment' : s.activity, reading) });
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
    if (asking && !reading) { this.send({ t: 'question', ...this.questionFields(s.quiz!) }); this.desk.asked(s.quiz!); return; }
    const c = reading ? styleFor(s.quiz!).companion?.(s.quiz!, 'reading') : undefined;
    this.send({ t: 'idle', style: s.style, role: c?.role ?? 'wait', participation: c?.participation ?? '', headPrompt: c?.headPrompt ?? '' });
    if (reading) this.startRead(s.quiz!);
    if (s.results) this.send(this.finishFrame());
  }

  private atFields(s: RoomSlide, activity: AtFields['activity'], reading = false): AtFields {
    const c = s.quiz && activity === 'question' ? styleFor(s.quiz).companion?.(s.quiz, reading ? 'reading' : 'asking') : undefined;
    return { slideId: s.id, title: s.title, n: this.at + 1, total: this.opts.show.slides.length, activity, text: s.text, step: s.quiz && activity === 'question' ? this.helped.get(s.quiz.id) ?? 0 : 0, style: s.style, role: c?.role ?? 'wait', participation: c?.participation ?? '', headPrompt: c?.headPrompt || (s.quiz && activity === 'question' ? s.quiz.headPrompt ?? '' : ''), stage: null };
  }

  private questionFields(q: RoomQuiz): QuestionFields {
    const quizzes = this.opts.show.slides.filter((x) => x.quiz);
    const style = styleFor(q);
    const hasManual = this.state.players.some((p) => p.manual) || this.manualNames.length > 0;
    const f: QuestionFields = {
      id: q.id, n: quizzes.findIndex((x) => x.quiz!.id === q.id) + 1, total: quizzes.length, question: q.question,
      voteOnly: q.voteOnly === true, unmarked: q.unmarked === true, sourceSlideId: q.sourceSlideId || q.id,
      input: style.input, spoken: !!style.spoken, gameId: q.gameId || '', scoreSpoken: q.scoreSpoken === true, participation: style.companion?.(q).participation ?? '',
      confidence: q.confidence !== false, range: style.range(q), options: (q.options ?? []).filter((o) => String(o).trim()),
      // SF.questionTimeLimit: no clock while the teacher enters answers by key.
      timeLimit: hasManual ? 0 : Math.max(0, Number(q.timeLimit) || 0), points: q.points, style: q.style,
    };
    const head = style.companion?.(q).headPrompt || q.headPrompt;
    if (head) f.headPrompt = head;
    Object.assign(f, style.flags?.(q), this.desk.questionExtras(q));
    return f;
  }

  /** The brainstorm the room is asked after a reveal (Odd one out's "defend a pick"): classic's quick prompt, closed when the show leaves the question. */
  private openAfterReveal(prompt: string): void {
    if (this.promptId) return;
    this.openQuick({ prompt, max: 1 });
  }

  /** Ask the room for ideas with a quick prompt (classic's startCustomPrompt): its id, or null when something else is already asking the room. */
  private openQuick(fields: Pick<PromptFields, 'prompt' | 'max'> & Partial<PromptFields>): string | null {
    if (this.promptId) return null;
    this.quickAt = Math.max(Date.now(), this.quickAt + 1); // never the same id twice, however fast the room is stepped
    const id = `quick:${this.quickAt}`;
    this.promptId = id;
    this.send({ t: 'prompt', kind: 'brainstorm', options: [], ends: null, presentAs: 'rail', custom: true, origin: '', stage: '', shape: '', from: '', quiet: false, ...fields, id });
    return id;
  }

  private closeQuick(id: string): void {
    if (this.promptId !== id) return;
    this.promptId = null;
    this.send({ t: 'promptEnd' });
  }

  /** Classic's auto-reveal (protocol §17, step 9): everyone in, nobody entered by hand; wait for confidence taps up to 5 s. */
  private maybeAutoReveal(): void {
    const t = this.state.tally, q = this.slide?.quiz;
    if (this.opts.autoReveal === false || !t || !q || t.id !== q.id || this.state.phase !== 'question' || styleFor(q).held) return;
    if (!t.allIn || t.answered === 0 || t.manual) return;
    if (t.sured >= t.answered) { this.reveal(); return; }
    if (!this.sureTimer) this.sureTimer = setTimeout(() => { this.sureTimer = null; if (this.state.phase === 'question') this.reveal(); }, SURE_GRACE_MS);
  }

  /** The reading clock: when it runs out the question is asked (classic: the player's time up in the reading phase). */
  private startRead(q: RoomQuiz): void {
    this.clearRead();
    const seconds = styleFor(q).reading?.(q) ?? 0;
    if (seconds > 0) this.readTimer = setTimeout(() => { this.readTimer = null; if (this.slide?.quiz?.id === q.id) this.ask(); }, seconds * 1000);
  }

  private clearRead(): void {
    if (this.readTimer) { clearTimeout(this.readTimer); this.readTimer = null; }
  }

  private clearSure(): void {
    if (this.sureTimer) { clearTimeout(this.sureTimer); this.sureTimer = null; }
  }
}
