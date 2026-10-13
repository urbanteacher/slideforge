// The spoken desk (lab-engine-plan M8): what the host keeps for a spoken game's verdicts, as classic's live.js does ("spoken
// verdicts"): who is speaking, a verdict held until the teacher says who spoke, the credit that landed, the speakers so far.
// The host (host.ts) owns the socket and the show; the desk asks it through `DeskEnv` to reveal, and tells it what to publish
// to the wall. The rules of what scores and what is said are spoken.ts's.

import type { HostMessage, PromptFields } from './protocol';
import type { RoomState } from './room';
import type { RoomQuiz, RoomSlide } from './show';
import { creditFor, emptySpoken, pickRecipient, ROOM, verdictScores, type Recipient, type RoundView, type SpokenSpec, type SpokenView } from './spoken';
import { styleFor } from './styles';

export interface DeskEnv {
  state(): RoomState;
  slide(): RoomSlide | null;
  send(m: HostMessage): boolean;
  /** Reveal the question on the wall (the verdict is already on it as `correct`). */
  reveal(): void;
  /** Whether the host has revealed this question (its own record, ahead of the relay's). */
  revealed(id: string): boolean;
  /** Tell the wall and the teacher's window what changed. */
  publish(patch: Partial<SpokenView>): void;
  /** The host's clock (ms), and a timer on it: Heads up's round and its move on after a verdict. The tests run both on the recording's clock. */
  now(): number;
  after(fn: () => void, ms: number): void;
  /** Open an idea box on the wall and the phones (a quick prompt); its id, or null when the room is already being asked something. */
  openPrompt(fields: Pick<PromptFields, 'prompt' | 'max' | 'shape' | 'from' | 'quiet'> & { origin: string }): string | null;
  closePrompt(id: string): void;
  /** The show's steps, and the teacher's Next (a verdict moves a Heads up round on). */
  slides(): RoomSlide[];
  next(): void;
}

/** How long a Heads up verdict stays on the wall before the next term: long enough to see the tick, short enough to keep the pace (js/rounds.js NEXT_AFTER). */
export const MOVE_ON_MS = 650;

/** What a question's style says about its verdicts, or undefined when the question is not a spoken one. */
export const specOf = (q: RoomQuiz | undefined | null): SpokenSpec | undefined => (q ? styleFor(q).spoken : undefined);

export class SpokenDesk {
  private v: SpokenView = emptySpoken();

  constructor(private readonly env: DeskEnv) {}

  get view(): SpokenView { return this.v; }

  private set(patch: Partial<SpokenView>): void {
    this.v = { ...this.v, ...patch };
    this.env.publish(patch);
  }

  /** The show landed on a step: a held verdict belongs to the item it was given on, and a speaker is chosen per item and cleared after it (Heads up's guesser keeps the whole round). */
  landed(slide: RoomSlide): void {
    const q = slide.quiz, spec = specOf(q);
    const patch: Partial<SpokenView> = {};
    // Heads up's round is one clock for the whole pile, started when its first term lands and ended when the show leaves the game (js/rounds.js).
    if (q && spec?.heads && Number(q.roundSeconds) > 0) this.startRound(q);
    else if (this.v.round && slide.gameId !== this.v.round.gameId) patch.round = null;
    if (this.v.pending && this.v.pending.slideId !== slide.id) patch.pending = null;
    if (spec && !spec.heads && this.v.recipient.type !== 'room') patch.recipient = ROOM;
    if (this.v.proposalPrompt) patch.proposalPrompt = null; // the host closes the box itself as it leaves the slide
    if (this.v.pendingLink) patch.pendingLink = '';
    if (this.v.notice) patch.notice = '';
    if (this.v.onTable && this.v.onTable.slideId !== slide.id) patch.onTable = null;
    if (Object.keys(patch).length) this.set(patch);
  }

  /** The question has been asked: Connection maker and Concept chain open an idea box for the phones' proposals, beside the question and without names. */
  asked(q: RoomQuiz): void {
    const spec = specOf(q);
    if (!spec?.proposals || this.env.revealed(q.id)) return;
    const from = String(q.term || q.question || ''), a = String(q.itemA || 'A'), b = String(q.itemB || 'B');
    const id = spec.proposals === 'bridge'
      ? this.env.openPrompt({ prompt: `How are \u201c${a}\u201d and \u201c${b}\u201d connected?`, max: 2, origin: 'proposals', shape: 'bridge', from: `${a} and ${b}`, quiet: true })
      : this.env.openPrompt({ prompt: `Propose a link from \u201c${from || 'this'}\u201d: what does it connect to, and why?`, max: 2, origin: 'proposals', shape: 'link', from, quiet: true });
    if (id) this.set({ proposalPrompt: id });
  }

  private closeProposals(): void {
    const id = this.v.proposalPrompt;
    if (!id) return;
    this.env.closePrompt(id);
    this.set({ proposalPrompt: null });
  }

  /** A proposal is put on the table (the entry window's "Use this", or a chip on the wall): its author becomes the speaker, and in a chain its words are the link Accept will add. */
  useProposal(pid: number, text: string): void {
    const q = this.env.slide()?.quiz, spec = specOf(q);
    if (!q || !spec?.proposals) return;
    const said = String(text ?? '').slice(0, 160);
    const patch: Partial<SpokenView> = { onTable: { slideId: q.id, text: said }, ...(spec.chain ? { pendingLink: said } : {}) };
    if (!this.env.revealed(q.id) && this.env.state().players.some((p) => p.id === pid)) patch.recipient = { type: 'player', id: pid };
    this.set(patch);
  }

  /** A question closing without a verdict (Next, or the clock) is not an invented Accept: it takes the last option, "Skip" or "Reject". */
  closing(q: RoomQuiz): void {
    const spec = specOf(q);
    if (!spec) return;
    if (spec.chain) {
      // A chain's term was credited link by link: it closes as Accept if it grew and as Reject if it did not, and the idea box closes before the reveal.
      q.correct = this.v.links.some((l) => l.slideId === q.id) ? 0 : q.options.length - 1;
      this.closeProposals();
      if (this.v.pendingLink) this.set({ pendingLink: '' }); // a link still being typed is not an Accept
    } else if (this.v.verdicts[q.id] == null) q.correct = q.options.length - 1;
  }

  /** The teacher says who is speaking; a held verdict is completed by it. */
  recipient(picked: unknown): void {
    const st = this.env.state(), q = this.env.slide()?.quiz;
    const r = pickRecipient(picked, st.players, st.teams, st.mode);
    this.set({ recipient: r });
    const spec = specOf(q);
    if (!q || !spec || this.env.revealed(q.id)) return;
    // Heads up: the guesser is the speaker, and their phone must lose the term.
    if (spec.heads) this.env.send({ t: 'guesser', id: r.type === 'player' ? r.id : null });
    const held = this.v.pending;
    if (held && held.slideId === q.id && r.type !== 'room') this.commit(q, held.choice);
  }

  /** The verdict "Count it for the room": a held one lands with no points. */
  verdictRoom(): void {
    const q = this.env.slide()?.quiz, held = this.v.pending;
    if (!q || !held || held.slideId !== q.id || this.env.revealed(q.id)) return;
    this.set({ recipient: ROOM });
    this.commit(q, held.choice);
  }

  /** The teacher's verdict, from the wall's pads or the entry window. A verdict that scores waits for the speaker (held). */
  verdict(choice: number): boolean {
    const q = this.env.slide()?.quiz, spec = specOf(q);
    if (!q || !spec || this.env.revealed(q.id) || !Number.isInteger(choice) || choice < 0 || choice >= q.options.length) return false;
    // Concept chain: Accept needs a typed link, and Reject puts the proposal down; either way the press is the desk's (handled).
    if (spec.chain && !this.tryAccept(q, choice)) return true;
    const st = this.env.state();
    if (verdictScores(spec, choice, st.mode, q.scoreSpoken === true) && this.v.recipient.type === 'room') {
      this.set({ pending: { slideId: q.id, choice } });
      return true;
    }
    this.commit(q, choice);
    return true;
  }

  /** The verdict itself, once it is known where any points go. */
  private commit(q: RoomQuiz, choice: number): void {
    const spec = specOf(q)!, st = this.env.state(), r = this.v.recipient;
    if (spec.chain) { this.chainVerdict(q, choice); return; }
    const credit = creditFor(q.id, spec, choice, { recipient: r, players: st.players, teams: st.teams, mode: st.mode, scoreSpoken: q.scoreSpoken === true });
    this.set({
      pending: null, verdicts: { ...this.v.verdicts, [q.id]: choice }, credit,
      recent: r.type === 'player' ? [r.id, ...this.v.recent.filter((id) => id !== r.id)].slice(0, 5) : this.v.recent,
    });
    q.correct = choice;
    this.env.reveal();
    // Cleared after the reveal has carried it to the relay.
    if (!spec.heads) this.set({ recipient: ROOM });
    else this.counted(q, choice);
    this.closeProposals();
  }

  // ---- Concept chain: a map, each accepted link credited as it lands, the term open for the next

  /** Accept only with a typed link (put on the table, or typed in the wall's box); Reject puts the proposal down. */
  private tryAccept(q: RoomQuiz, choice: number): boolean {
    if (choice !== 0) { this.set({ pendingLink: '' }); return true; }
    const link = this.v.pendingLink.trim();
    if (!link) { this.set({ notice: 'Type the proposed link before Accept' }); return false; }
    this.set({ notice: '', pendingLink: '', links: [...this.v.links, { slideId: q.id, term: String(q.term || q.question || '').trim(), link: link.slice(0, 160) }] });
    return true;
  }

  /** The link the teacher is weighing, typed in the wall's box. */
  pending(text: string): void { this.set({ pendingLink: String(text ?? '').slice(0, 160) }); }

  /** An accepted link is one branch off the term, credited as it lands (the relay pays it, `oralCredit`, since the phones are on the idea box, not a question); the term stays open. Reject names nobody. */
  private chainVerdict(q: RoomQuiz, choice: number): void {
    const spec = specOf(q)!, st = this.env.state(), r = this.v.recipient;
    const patch: Partial<SpokenView> = { pending: null, recipient: ROOM, onTable: null };
    if (choice === 0) {
      patch.credit = creditFor(q.id, spec, 0, { recipient: r, players: st.players, teams: st.teams, mode: st.mode, scoreSpoken: q.scoreSpoken === true });
      if (r.type === 'player') patch.recent = [r.id, ...this.v.recent.filter((id) => id !== r.id)].slice(0, 5);
      this.env.send({ t: 'oralCredit', id: q.id, gameId: q.gameId || '', style: 'conceptchain', recipient: r, scoreSpoken: q.scoreSpoken === true });
    } else patch.notice = 'Put down. Weigh another, or Next to close the term.';
    this.set(patch);
  }

  // ---- Heads up's round

  private startRound(q: RoomQuiz): void {
    const r = this.v.round;
    if (r && r.gameId === q.gameId) return;
    const total = Number(q.roundSeconds);
    const round: RoundView = { gameId: q.gameId, total, endsAt: this.env.now() + total * 1000, count: 0, over: false };
    this.set({ round });
    this.env.after(() => this.expire(round), total * 1000);
  }

  /** The clock ran out: the round is over, and the term that was up closes as it would on its own clock (no verdict). */
  private expire(round: RoundView): void {
    const cur = this.v.round;
    if (!cur || cur.over || cur.gameId !== round.gameId || cur.endsAt !== round.endsAt) return;
    this.set({ round: { ...cur, over: true } });
    const q = this.env.slide()?.quiz;
    if (q && specOf(q)?.heads && q.gameId === round.gameId && !this.env.revealed(q.id)) this.env.reveal();
  }

  /** A verdict in the round: a Correct is counted, and the next term comes up after a beat. */
  private counted(q: RoomQuiz, choice: number): void {
    const r = this.v.round;
    if (!r || r.over || r.gameId !== q.gameId) return;
    this.set({ round: { ...r, count: r.count + (choice === 0 ? 1 : 0) } });
    this.env.after(() => {
      const now = this.v.round;
      if (now && !now.over && this.env.slide()?.quiz?.id === q.id) this.env.next();
    }, MOVE_ON_MS);
  }

  /** The round is over: Next skips the terms nobody reached, to whatever comes after the pile (js/rounds.js step). The step to go to, or null. */
  skip(at: number): number | null {
    const r = this.v.round, slides = this.env.slides(), cur = slides[at]?.quiz;
    if (!r || !r.over || !cur || !specOf(cur)?.heads || cur.gameId !== r.gameId) return null;
    let i = at + 1;
    while (i < slides.length && slides[i].gameId === r.gameId && slides[i].quiz && slides[i].quiz!.style === cur.style) i++;
    return i >= slides.length || i === at + 1 ? null : i;
  }

  /** What the question frame adds for Heads up: the term (every phone but the guesser's shows it), the guesser, and the seconds left of the round. */
  questionExtras(q: RoomQuiz): { term?: string; guesser?: number; roundLeft?: number } {
    if (!specOf(q)?.heads) return {};
    const r = this.v.round, rec = this.v.recipient;
    const left = r && !r.over ? Math.max(0, Math.round((r.endsAt - this.env.now()) / 1000)) : 0;
    return {
      term: String(q.term || q.question || ''),
      ...(rec.type === 'player' ? { guesser: rec.id } : {}),
      ...(Number(q.roundSeconds) > 0 ? { roundLeft: left || Number(q.roundSeconds) } : {}),
    };
  }

  /** What the reveal adds for a spoken question: who spoke (the relay resolves the named recipient against its own roster and teams). */
  revealExtras(q: RoomQuiz): { spoken?: { recipient: Recipient } } {
    return specOf(q) ? { spoken: { recipient: this.v.recipient } } : {};
  }
}
