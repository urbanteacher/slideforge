// A simulated class: phones that join the real relay by its PIN, over real WebSockets, as join.html's do (the raw-socket phones of
// tools/record-sessions/phone.mjs, in the browser). The teacher's wall fills as it would with a class, the relay scores their
// answers, and the report records them; what is simulated is only the people. Each phone answers the questions and feedback
// prompts the room asks, with the accuracy and timing model.ts gives it. Nothing here is the relay's or the host's.

import type { RoomShow } from '../live';
import type { SocketFactory, SocketLike } from '../live';
import { answerDelay, answerFor, profiles, replyFor, sureFor, type Profile, type QuestionFrame, type Rng } from './model';

export interface ClassOptions {
  /** The relay's socket, `wss://host`. */
  url: string;
  pin: string;
  /** The lesson, to know each question's answer (the phones are told only the question). */
  show: RoomShow;
  size: number;
  makeSocket?: SocketFactory;
  rng?: Rng;
  /** Multiplies every wait: 1 as a class would; 0 for a test that has no time to spare. */
  pace?: number;
  /** The gap between one phone joining and the next, in ms before `pace`. */
  joinGapMs?: number;
}

type Frame = Record<string, unknown> & { t?: string };

class Phone {
  private ws: SocketLike | null = null;
  private token: string | null = null;
  private team: number | null = null;
  private answered = new Set<string>();
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private lastAsked: QuestionFrame | null = null;
  joined = false;
  stopped = false;
  answers = 0;

  constructor(readonly profile: Profile, readonly index: number, private readonly c: Required<Pick<ClassOptions, 'url' | 'pin' | 'pace'>> & { make: SocketFactory; rng: Rng; show: RoomShow }) {}

  open(resume = false): void {
    if (this.stopped) return;
    const ws = this.c.make(this.c.url);
    this.ws = ws;
    ws.addEventListener('open', () => {
      if (resume && this.token) this.send({ t: 'join', pin: this.c.pin, resumeToken: this.token });
      else this.send({ t: 'join', pin: this.c.pin, name: this.profile.name, ...(this.team != null ? { team: this.team } : {}) });
    });
    ws.addEventListener('message', (ev) => { if (this.ws === ws) this.heard(ev.data); });
    ws.addEventListener('close', () => {
      if (this.ws !== ws) return;
      this.ws = null; this.joined = false;
      // A dropped connection comes back with its token, as the phone page does.
      if (!this.stopped && this.token) this.later(1500, () => this.open(true));
    });
    ws.addEventListener('error', () => {});
  }

  stop(): void {
    this.stopped = true;
    for (const t of this.timers) clearTimeout(t);
    this.timers.clear();
    const ws = this.ws;
    this.ws = null;
    try { ws?.close(); } catch { /* already closed */ }
  }

  private later(ms: number, fn: () => void): void {
    const t = setTimeout(() => { this.timers.delete(t); if (!this.stopped) fn(); }, Math.round(ms * this.c.pace));
    this.timers.add(t);
  }

  private send(m: Frame): void {
    if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(m));
  }

  private heard(raw: unknown): void {
    let m: Frame;
    try { m = JSON.parse(String(raw)) as Frame; } catch { return; }
    if (typeof m.resumeToken === 'string') this.token = m.resumeToken;
    switch (m.t) {
      case 'joined': case 'waiting': this.joined = true; break;
      case 'error': {
        // A teams room answers a join with no team by naming its teams: pick one (spread round the class) and join again.
        const teams = m.teams as unknown[] | undefined;
        if (m.mode === 'teams' && Array.isArray(teams) && teams.length) {
          this.team = this.index % teams.length;
          this.send({ t: 'join', pin: this.c.pin, name: this.profile.name, team: this.team });
        }
        break;
      }
      case 'question': this.onQuestion(m as unknown as QuestionFrame & { t: string }); break;
      case 'locked':
        if (this.lastAsked && this.lastAsked.confidence !== false) this.later(150 + 600 * this.c.rng(), () => this.send({ t: 'sure', sure: sureFor(this.profile, this.c.rng) }));
        break;
      case 'prompt': this.onPrompt(m as unknown as { id: string; kind: 'poll' | 'wordcloud' | 'brainstorm' | 'scale'; options: string[] }); break;
    }
  }

  private onQuestion(q: QuestionFrame): void {
    if (q.spoken) return; // a spoken game: the phones listen and watch, the teacher gives the verdict
    if (this.answered.has(q.id)) return; // the relay says it again after a reconnect; the answer is already in
    this.answered.add(q.id);
    this.lastAsked = q;
    const quiz = this.c.show.slides.find((s) => s.quiz?.id === q.id)?.quiz;
    if (!quiz) return;
    this.later(answerDelay(this.profile, q, this.c.rng), () => {
      const a = answerFor(quiz, q, this.profile, this.c.rng);
      if (a) { this.send(a); this.answers++; }
    });
  }

  private onPrompt(p: { id: string; kind: 'poll' | 'wordcloud' | 'brainstorm' | 'scale'; options: string[] }): void {
    if (this.answered.has('prompt:' + p.id)) return;
    this.answered.add('prompt:' + p.id);
    this.later(900 + 5000 * this.c.rng() * (0.3 + this.profile.slow), () => {
      const r = replyFor(p, this.profile, this.c.rng);
      if (r) { this.send(r); this.answers++; }
    });
  }
}

export class SimulatedClass {
  readonly phones: Phone[];
  private timers: ReturnType<typeof setTimeout>[] = [];
  private stopped = false;

  constructor(private readonly o: ClassOptions) {
    const rng = o.rng ?? Math.random;
    const make = o.makeSocket ?? ((url: string) => new WebSocket(url) as unknown as SocketLike);
    const c = { url: o.url, pin: o.pin, pace: o.pace ?? 1, make, rng, show: o.show };
    this.phones = profiles(o.size, rng).map((p, i) => new Phone(p, i, c));
  }

  /** Bring the class in, a phone every moment or so, as a class arrives. */
  start(): void {
    const gap = (this.o.joinGapMs ?? 160) * (this.o.pace ?? 1);
    this.phones.forEach((p, i) => { this.timers.push(setTimeout(() => { if (!this.stopped) p.open(); }, i * gap)); });
  }

  /** Everyone leaves. */
  stop(): void {
    this.stopped = true;
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
    for (const p of this.phones) p.stop();
  }

  get size(): number { return this.phones.length; }
  /** Phones the relay has let in. */
  get joined(): number { return this.phones.filter((p) => p.joined).length; }
  /** Answers and replies sent so far. */
  get answers(): number { return this.phones.reduce((n, p) => n + p.answers, 0); }
}
