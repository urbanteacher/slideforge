// The host's activity desk: a timed routine on the wall, run as classic's js/stages.js runs it. Next walks the
// stages (the first press enters the first); each stage starts a clock of its own, which never moves the show on
// (a pair mid-sentence is worth more than the clock); the phones are told the stage on `at`, sent twice as classic
// sends it (the build step first, with the stage it leaves, then the stage it enters). A `send` stage opens one idea
// box (a brainstorm, one idea each, no names on the wall) for as long as it lasts; a teacher's own prompt wins. The
// relay's `wrote` counts a note stage's private notes, and its pace signals say who asked for help. The teacher can
// put up to three ideas in the spotlight, each named for its stage, for the rest of the slide.

import type { PromptFields, RelayMessage } from '../protocol';
import type { OpenFeedback } from '../room';
import type { ActivityView, RoomActivity, StageFrame } from './types';

export interface ActivityDeps {
  /** Send `at` again for the slide on the wall (its step and stage, as the desk says them). */
  sendAt(): void;
  now(): number;
  /** The host's quick prompt (classic startCustomPrompt): its id, or null when something else is asking the room. */
  openPrompt(fields: Pick<PromptFields, 'prompt' | 'max'> & Partial<PromptFields>): string | null;
  closePrompt(id: string): void;
  /** The prompt the host holds open, and what the room has sent to it. */
  promptOpen(): string | null;
  feedback(): OpenFeedback | null;
  publish(view: ActivityView | null): void;
}

/** An idea's key in its box (classic ideaKey): the relay numbers ideas per box. */
const ideaKey = (it: { seq?: number; pid: number; text: string }) => String(it.seq != null ? it.seq : `${it.pid}:${it.text}`);

export class ActivityDesk {
  private slideId: string | null = null;
  private act: RoomActivity | null = null;
  /** The stage the room is in; -1 is the introduction, before the first Next. */
  private idx = -1;
  private frame: StageFrame | null = null;
  private total = 0;
  private endsAt = 0;
  private box: string | null = null;
  private boxStage = -1;
  private written: { slideId: string; stage: number; n: number; of: number } | null = null;
  private help = 0;
  private spots: { sid: string; label: string; text: string }[] = [];

  constructor(private readonly deps: ActivityDeps) {}

  /** The show landed on a step: a new activity starts at its introduction; the same one again (a redraw) keeps its stage. */
  landed(id: string, act: RoomActivity | undefined): void {
    if (act && id === this.slideId) return;
    this.teardown();
    if (!act) return;
    this.slideId = id;
    this.act = act;
    this.publish();
  }

  /** The build step the room is told (classic revealStep): the stage entered, counted from one. */
  step(id: string): number { return id === this.slideId && this.act ? this.idx + 1 : 0; }
  /** The stage on `at` for this step, or null. */
  frameFor(id: string): StageFrame | null { return id === this.slideId ? this.frame : null; }
  /** The idea box is this desk's (the host does not close it on a redraw of the slide). */
  owns(promptId: string | null): boolean { return !!promptId && promptId === this.box; }

  /** Next on a routine with a stage still to come: it is entered. False otherwise (the show moves on). */
  next(): boolean {
    const a = this.act;
    if (!a || this.idx + 1 >= a.stages.length) return false;
    this.enter(this.idx + 1);
    return true;
  }

  /** More time for the stage the room is in (classic extend, +30 s by default). A stage whose time was up starts again from now with only the extra. */
  extend(seconds = 30): boolean {
    if (!this.act || this.idx < 0 || !this.act.stages[this.idx]) return false;
    const now = this.deps.now(), s = Number(seconds) || 30;
    const running = this.total > 0 && this.endsAt > now;
    this.endsAt = (running ? this.endsAt : now) + s * 1000;
    this.total = running ? this.total + s : s;
    this.frame = this.frameOf(this.idx);
    this.deps.sendAt();
    this.publish();
    return true;
  }

  /** Put an idea from the stage's box in the spotlight (classic askCommand `spot`), by its key; three at most, a fourth takes the oldest's place. */
  spotlight(key: string): boolean {
    const f = this.deps.feedback();
    if (!this.slideId || !f || f.digest?.kind !== 'brainstorm') return false;
    const it = f.digest.items.find((x) => ideaKey(x) === String(key));
    if (!it) return false;
    const sid = `${f.prompt.id}|${ideaKey(it)}`;
    if (!this.spots.some((x) => x.sid === sid)) {
      this.spots.push({ sid, label: f.prompt.stage || 'Spotlight', text: String(it.text).slice(0, 160) });
      if (this.spots.length > 3) this.spots.shift();
    }
    this.publish();
    return true;
  }

  /** Take one spotlight down, or all of them. */
  unspot(sid?: string): void {
    this.spots = sid ? this.spots.filter((x) => x.sid !== sid) : [];
    this.publish();
  }

  /** What the relay says that is the desk's: the written count, and the pace signals (help). */
  heard(m: RelayMessage): void {
    if (m.t === 'wrote') {
      const w = m as unknown as { slideId?: string; stage?: number; n?: number; of?: number };
      this.written = { slideId: String(w.slideId ?? ''), stage: Number(w.stage) || 0, n: Number(w.n) || 0, of: Number(w.of) || 0 };
    } else if (m.t === 'signals') {
      const counts = (m as unknown as { counts?: { lost?: number } }).counts;
      this.help = Number(counts?.lost) || 0;
    } else return;
    if (this.act) this.publish();
  }

  /** The show left the activity (its idea box closes), or the room ended (`close` false: classic sends only `end`, which closes everything). */
  teardown(close = true): void {
    if (close) this.closeBox();
    this.box = null; this.boxStage = -1;
    const had = !!this.act;
    this.slideId = null; this.act = null; this.idx = -1; this.frame = null; this.total = 0; this.endsAt = 0;
    this.spots = []; this.written = null; this.help = 0;
    if (had) this.deps.publish(null);
  }

  private enter(i: number): void {
    // The build step moves first, with the stage the room was in (classic: the player's step, then the stage worked out after it).
    this.idx = i;
    this.deps.sendAt();
    const st = this.act!.stages[i];
    this.total = st.seconds;
    this.endsAt = st.seconds ? this.deps.now() + st.seconds * 1000 : 0;
    this.syncBox();
    this.frame = this.frameOf(i);
    this.deps.sendAt();
    this.publish();
  }

  private frameOf(i: number): StageFrame {
    const a = this.act!, st = a.stages[i];
    return {
      i: st.i, of: a.stages.length, name: st.name, job: st.job, group: st.group, text: st.text, brief: a.brief,
      seconds: this.total, left: this.total ? Math.max(0, Math.round((this.endsAt - this.deps.now()) / 1000)) : 0,
      next: a.stages[i + 1]?.name ?? '',
    };
  }

  /** One idea box per `send` stage (classic syncShare): a hunt's three places are three boxes, each its own spotlight's name. */
  private syncBox(): void {
    const st = this.act!.stages[this.idx];
    if (!st || st.job !== 'send') { this.closeBox(); return; }
    const open = this.deps.promptOpen();
    if (this.box && open === this.box) {
      if (this.boxStage === st.i) return;
      this.closeBox();
    }
    // Something else is already asking the room (a teacher's own prompt): theirs wins.
    if (this.deps.promptOpen() && !this.box) return;
    this.box = this.deps.openPrompt({ kind: 'brainstorm', prompt: st.text || 'Send your strongest idea', presentAs: 'rail', max: 1, origin: 'stage', stage: st.name });
    this.boxStage = this.box ? st.i : -1;
  }

  private closeBox(): void {
    if (this.box && this.deps.promptOpen() === this.box) this.deps.closePrompt(this.box);
    this.box = null;
    this.boxStage = -1;
  }

  private publish(): void {
    const a = this.act;
    if (!a || !this.slideId) { this.deps.publish(null); return; }
    const f = this.frame, w = this.written;
    this.deps.publish({
      slideId: this.slideId,
      stages: a.stages.map((s) => ({ name: s.name, job: s.job, group: s.group, seconds: s.seconds })),
      brief: a.brief, stage: f, endsAt: f && this.total ? this.endsAt : null,
      written: w && f && f.job === 'note' && w.slideId === this.slideId && w.stage === f.i && w.of ? { n: w.n, of: w.of } : null,
      help: this.help, spotlights: [...this.spots], box: this.box,
    });
  }
}

