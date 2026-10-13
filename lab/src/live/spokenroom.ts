// The spoken desk (lab-engine-plan M8): what the host keeps for a spoken game's verdicts, as classic's live.js does ("spoken
// verdicts"): who is speaking, a verdict held until the teacher says who spoke, the credit that landed, the speakers so far.
// The host (host.ts) owns the socket and the show; the desk asks it through `DeskEnv` to reveal, and tells it what to publish
// to the wall. The rules of what scores and what is said are spoken.ts's.

import type { HostMessage } from './protocol';
import type { RoomState } from './room';
import type { RoomQuiz, RoomSlide } from './show';
import { creditFor, emptySpoken, pickRecipient, ROOM, verdictScores, type Recipient, type SpokenSpec, type SpokenView } from './spoken';
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
}

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
    if (this.v.pending && this.v.pending.slideId !== slide.id) patch.pending = null;
    if (spec && !spec.heads && this.v.recipient.type !== 'room') patch.recipient = ROOM;
    if (Object.keys(patch).length) this.set(patch);
  }

  /** A question closing without a verdict (Next, or the clock) is not an invented Accept: it takes the last option, "Skip" or "Reject". */
  closing(q: RoomQuiz): void {
    if (specOf(q) && this.v.verdicts[q.id] == null) q.correct = q.options.length - 1;
  }

  /** The teacher says who is speaking; a held verdict is completed by it. */
  recipient(picked: unknown): void {
    const st = this.env.state(), q = this.env.slide()?.quiz;
    const r = pickRecipient(picked, st.players, st.teams, st.mode);
    this.set({ recipient: r });
    const spec = specOf(q);
    if (!q || !spec || this.env.revealed(q.id)) return;
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
    const credit = creditFor(q.id, spec, choice, { recipient: r, players: st.players, teams: st.teams, mode: st.mode, scoreSpoken: q.scoreSpoken === true });
    this.set({
      pending: null, verdicts: { ...this.v.verdicts, [q.id]: choice }, credit,
      recent: r.type === 'player' ? [r.id, ...this.v.recent.filter((id) => id !== r.id)].slice(0, 5) : this.v.recent,
    });
    q.correct = choice;
    this.env.reveal();
    // Cleared after the reveal has carried it to the relay.
    if (!spec.heads) this.set({ recipient: ROOM });
  }

  /** What the reveal adds for a spoken question: who spoke (the relay resolves the named recipient against its own roster and teams). */
  revealExtras(q: RoomQuiz): { spoken?: { recipient: Recipient } } {
    return specOf(q) ? { spoken: { recipient: this.v.recipient } } : {};
  }
}
