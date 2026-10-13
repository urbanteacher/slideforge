// The teacher-entry window's side of the room (docs/games/protocol.md §15.1): manual.html talks to the host over
// a BroadcastChannel named `sf-manual-<key>`, with the key in its address (`manual.html#<key>`). The window sends
// `sf-manual-command`s (add names, enter an answer by key, reveal…) and the host answers every change of the
// room with an `sf-manual-state`. manual.html and js/manual.js are not changed (hard rule 5): this is the host
// they were written for, in the lab. The commands are turned into the room's own messages by LiveHost.
//
// The styles in styles/ say how an answer entered by key is read. The spoken formats (Random challenge, Question cube, Spin & explain,
// Heads up, Connection maker, Concept chain) are given a verdict by `revealWith`, and a speaker by `recipient` (live/spoken.ts).

import type { LiveHost } from './host';
import type { RoomState } from './room';
import { emptySpoken } from './spoken';
import type { RoomQuiz } from './show';
import { styleFor, STYLES, type ManualChoice, type ManualEntry } from './styles';

export interface ChannelLike { postMessage(m: unknown): void; close(): void; onmessage: ((e: { data: unknown }) => void) | null }

export interface ManualOptions {
  /** `new BroadcastChannel(name)` by default. */
  makeChannel?: (name: string) => ChannelLike;
  /** The key (32 hex characters) the window is opened with. A random one by default. */
  key?: string;
}

/** The commands the window sends, by `action` (§15.1). */
interface Command { type: 'sf-manual-command'; action: string; id?: string; [k: string]: unknown }

const SEEN = 60;

export function newKey(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16))).map((n) => n.toString(16).padStart(2, '0')).join('');
}

/** What the window is shown: the room, and the question on the wall, answers marked only once it is revealed. */
export function manualState(host: Pick<LiveHost, 'state' | 'slide'>): Record<string, unknown> {
  const s = host.state;
  const sp = s.spoken ?? emptySpoken(), counts = s.oralCounts ?? {};
  const quiz: RoomQuiz | undefined = host.slide?.quiz;
  const revealed = !!quiz && s.revealed.includes(quiz.id);
  const asked = !!quiz && (s.question?.id === quiz.id || revealed);
  const t = quiz && s.tally && s.tally.id === quiz.id ? s.tally : null;
  return {
    type: 'sf-manual-state', active: !!s.pin && !s.ended, showing: !!host.slide, live: s.live, view: 'roster', report: s.report,
    players: s.players, teams: s.teams, mode: s.mode, pin: s.pin,
    recipient: sp.recipient, pendingVerdict: quiz && sp.pending?.slideId === quiz.id ? { choice: sp.pending.choice, label: quiz.options[sp.pending.choice] ?? '' } : null,
    recentSpeakers: sp.recent, handCounts: null, proposals: proposalsOf(s), onTable: quiz && sp.onTable?.slideId === quiz.id ? sp.onTable.text : '', lastCredit: sp.credit, oralCount: quiz ? counts[quiz.gameId] ?? 0 : 0,
    question: quiz && asked
      ? { id: quiz.id, question: quiz.question, input: styleFor(quiz).input, options: quiz.options, gaps: styleFor(quiz).manualQuestion?.(quiz).gaps ?? 0, bins: styleFor(quiz).manualQuestion?.(quiz).bins ?? null, spoken: !!styleFor(quiz).spoken, scoreSpoken: quiz.scoreSpoken === true, style: quiz.style, range: styleFor(quiz).range(quiz), revealed }
      : null,
    // Marked here, where the key is, and only after the reveal: the window must not give the answer away early.
    answers: (t?.answers ?? []).map((a) => ({ id: a.id, response: a.response, sure: a.sure, right: revealed && quiz ? styleFor(quiz).mark(quiz, a.response) : null })),
  };
}

/** The proposals the phones sent into the idea box, with their authors, for the teacher's window (at most 12; `used` is a link already on the chain). */
function proposalsOf(s: RoomState): { pid: number; name: string; text: string; used: boolean }[] {
  const f = s.feedback, id = s.spoken?.proposalPrompt;
  if (!id || !f || f.prompt.id !== id || f.digest?.kind !== 'brainstorm') return [];
  const mapped = (s.spoken?.links ?? []).map((l) => l.link);
  return f.digest.items.slice(0, 12).map((it) => ({ pid: it.pid, name: it.name, text: it.text, used: mapped.includes(String(it.text || '').slice(0, 160)) }));
}

export class ManualBridge {
  readonly key: string;
  private channel: ChannelLike | null = null;
  private off: (() => void) | null = null;
  private seen: string[] = [];

  constructor(private readonly host: LiveHost, private readonly opts: ManualOptions = {}) {
    this.key = opts.key ?? newKey();
  }

  /** The address the window is opened at, relative to the page that has the key (`manual.html` is one level up from the lab). */
  get hash(): string { return `#${this.key}`; }

  /** Listen for the window, and keep it told. Safe to call twice. */
  start(): void {
    if (this.channel) return;
    this.channel = (this.opts.makeChannel ?? ((n) => new BroadcastChannel(n) as unknown as ChannelLike))(`sf-manual-${this.key}`);
    this.channel.onmessage = (e) => this.command(e.data);
    this.off = this.host.subscribe((_s, cause) => {
      if (cause.t === 'manualError') this.post({ type: 'sf-manual-error', message: cause.message, playerId: cause.playerId, id: cause.id });
      this.push();
    });
  }

  stop(): void {
    this.off?.();
    this.off = null;
    if (this.channel) { try { this.channel.close(); } catch { /* already closed */ } }
    this.channel = null;
  }

  /** Tell the window how things stand (after every change of the room, and when it says hello). */
  push(): void { this.post(manualState(this.host)); }

  private post(m: unknown): void { try { this.channel?.postMessage(m); } catch { /* a closed channel: the window is gone */ } }

  private error(message: string): void { this.post({ type: 'sf-manual-error', message }); }

  /** One command from the window. The window may send the same one by two routes: the last 60 ids are kept. */
  command(data: unknown): void {
    const c = data as Command | null;
    if (!c || c.type !== 'sf-manual-command') return;
    if (c.id) {
      if (this.seen.includes(c.id)) return;
      this.seen.push(c.id);
      if (this.seen.length > SEEN) this.seen.shift();
    }
    const h = this.host;
    switch (c.action) {
      case 'hello': this.push(); h.report(); break;
      case 'host': this.error('A live room is already open. End the show and host again for a fresh PIN.'); break;
      case 'add': h.manualAdd(strings(c.names), Number(c.team) || 0); break;
      case 'rename': h.manualRename(Number(c.playerId), String(c.name ?? '')); break;
      case 'team': h.manualTeam(Number(c.playerId), Number(c.team) || 0); break;
      case 'kick': h.manualRemove(Number(c.playerId), 'kick'); break;
      case 'delete': h.manualRemove(Number(c.playerId), 'delete'); break;
      case 'answer': {
        const a = (c.answer ?? {}) as ManualEntry;
        if (a.clear === true) h.manualAnswer(Number(a.playerId), null, a.id);
        else {
          // The question on the wall says how its answer is read; with none, any of the kinds (the relay refuses the wrong one).
          const quiz = h.slide?.quiz;
          const given: ManualChoice | undefined = quiz ? styleFor(quiz).manual(a) : STYLES.map((s) => s.manual(a)).find((v) => v !== undefined);
          if (given !== undefined) h.manualAnswer(Number(a.playerId), given, a.id); // typed: the relay trims it and refuses an empty one
        }
        break;
      }
      case 'tally': if (Array.isArray(c.counts)) h.manualTally((c.counts as unknown[]).map(Number)); break;
      case 'reveal': h.reveal(); break;
      case 'revealWith': if (Number.isInteger(c.choice)) h.revealWith(c.choice as number); else h.reveal(); break;
      case 'recipient': h.recipient(c.recipient); break;
      case 'verdictRoom': h.verdictRoom(); break;
      case 'useProposal': h.useProposal(Number(c.pid), String(c.text ?? '')); break;
      case 'report': h.report(); break;
      default: break; // verdictCancel is handled by no sender in classic either
    }
    this.push();
  }
}

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);
