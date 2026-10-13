// The studio's Teacher Presenter: a second window of the same lab-app (?presenter=1) that follows the show over a
// BroadcastChannel (same origin) and sends it commands. Nothing here touches the DOM, the relay or React: the
// messages, the state the show publishes, and the two ends' bookkeeping (`ShowSide`, `WindowSide`), so the protocol is
// unit-tested without a browser. The show executes a command exactly as its own key would (show/commands.ts).

import type { Deck } from '../core';
import { FLOOR_MODES, QA_ACTIONS, type FloorMode, type QaAction, type QaBox, type QuickAsk } from '../live';

export const PRESENTER_CHANNEL = 'slideforge.lab.presenter.v1';

/** What the window may ask of the show. `goto` carries `n`, a 1-based slide number of the shown deck; `poll` carries the quick poll to ask;
 *  `floor` with no mode takes the next one. Each is what the wall's key for it does (controls.ts). */
export type PresenterCmd = 'next' | 'prev' | 'reveal' | 'close' | 'open' | 'goto' | 'end' | 'black' | 'white' | 'resume' | 'more' | 'poll' | 'qa' | 'floor'
  | 'steps' | 'freeze' | 'roomView' | 'scores' | 'join' | 'again' | 'reactions' | 'blankPhones' | 'blankSoon' | 'draw' | 'spot' | 'clearInk' | 'notesElsewhere';
export const PRESENTER_CMDS: readonly PresenterCmd[] = ['next', 'prev', 'reveal', 'close', 'open', 'goto', 'end', 'black', 'white', 'resume', 'more', 'poll', 'qa', 'floor',
  'steps', 'freeze', 'roomView', 'scores', 'join', 'again', 'reactions', 'blankPhones', 'blankSoon', 'draw', 'spot', 'clearInk', 'notesElsewhere'];

/** One line of who answered what (the desk's private list): the name, the answer as the phone gave it, and how sure. */
export interface WhoRow { name: string; answer: string; sure: boolean | null }

/** What a command carries besides its slide number: the quick poll to ask (`poll`), the action on a question (`qa`), the floor's mode (`floor`). */
export interface CmdData { poll?: QuickAsk; qa?: { id: number; action: QaAction }; floor?: FloorMode }

/** The room, as the desk shows it; null in a show with no room. */
export interface PresenterRoom {
  pin: string | null;
  players: number;
  connected: boolean;
  /** The wall's view: the lobby, a question, its reveal, the standings, a slide, a feedback prompt, the end. */
  view: string;
  /** A question or prompt is open: how many have answered, of how many in the room. */
  open: boolean;
  answered: number;
  total: number;
  revealed: boolean;
  /** A feedback prompt that can be closed, and a held one that can be shown. */
  canClose: boolean;
  canShow: boolean;
  /** The teacher's quick poll (live/quick.ts): one is up (`close` ends it), or one can be asked now. */
  quick?: boolean;
  canPoll?: boolean;
  /** The questions box (live/questions.ts), and who may ask. */
  qa?: QaBox;
  floor?: FloorMode;
  /** The room on the wall (E), the phones blanked and the warning's end (ms; 0 none), reactions on, the join card up. */
  roomView?: 'hidden' | 'beside' | 'full';
  phonesBlank?: boolean;
  blankSoonAt?: number;
  reactions?: boolean;
  joinCard?: boolean;
  /** The question on the wall can be asked again (R), and who has answered it so far, by name: this window only, never the wall. */
  canAgain?: boolean;
  answers?: WhoRow[];
  /** The teacher-entry window's address, so this window opens it itself. */
  entry?: string | null;
  /** A routine's stage on the wall (live/activities): its name and job, the note count, and how many asked for help (only the desk says it). */
  stage?: { name: string; wall: string; written: string; help: number } | null;
}

export type Screen = 'none' | 'black' | 'white';

export interface PresenterState {
  /** 0-based index into the shown deck. */
  index: number;
  total: number;
  title: string;
  notes: string;
  nextTitle: string;
  /** The deck's title, and when the show began (ms since the epoch: the elapsed clock). */
  deck: string;
  startedAt: number;
  screen: Screen;
  room: PresenterRoom | null;
  /** A live figure on the wall: the step Next and Back walk (from 1), of how many, and that step's caption. */
  figure?: { step: number; of: number; caption: string };
  /** The wall is frozen on this slide (0-based) while `index` is where the teacher has moved on to. */
  frozenAt?: number | null;
  /** Draw is on on the wall, and its tool is the spotlight. */
  ink?: { on: boolean; spot: boolean };
  /** Counts up each time the wall asks this window to open who answered what (Shift+W). */
  ask?: number;
}

export type ToWindow =
  | { t: 'deck'; deck: Deck; state: PresenterState }
  | { t: 'state'; state: PresenterState }
  | { t: 'bye' };
export type ToShow =
  | { t: 'hello' }
  | ({ t: 'cmd'; cmd: PresenterCmd; n?: number } & CmdData);

export interface ChannelLike {
  postMessage(m: unknown): void;
  close(): void;
  onmessage: ((e: { data: unknown }) => void) | null;
}
export type ChannelFactory = (name: string) => ChannelLike;
const defaultChannel: ChannelFactory = (name) => new BroadcastChannel(name) as unknown as ChannelLike;

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object';

export function parseToShow(v: unknown): ToShow | null {
  if (!isObj(v)) return null;
  if (v.t === 'hello') return { t: 'hello' };
  if (v.t === 'cmd' && PRESENTER_CMDS.includes(v.cmd as PresenterCmd)) {
    const n = v.n == null ? NaN : Number(v.n);
    const poll = isObj(v.poll) && typeof v.poll.prompt === 'string' && typeof v.poll.kind === 'string' ? (v.poll as unknown as QuickAsk) : undefined;
    const qa = isObj(v.qa) && Number.isFinite(Number(v.qa.id)) && QA_ACTIONS.includes(v.qa.action as QaAction) ? { id: Number(v.qa.id), action: v.qa.action as QaAction } : undefined;
    const floor = FLOOR_MODES.includes(v.floor as FloorMode) ? (v.floor as FloorMode) : undefined;
    return { t: 'cmd', cmd: v.cmd as PresenterCmd, n: Number.isFinite(n) ? Math.trunc(n) : undefined, ...(poll ? { poll } : {}), ...(qa ? { qa } : {}), ...(floor ? { floor } : {}) };
  }
  return null;
}

export function parseToWindow(v: unknown): ToWindow | null {
  if (!isObj(v)) return null;
  if (v.t === 'bye') return { t: 'bye' };
  if (v.t === 'state' && isObj(v.state)) return { t: 'state', state: v.state as unknown as PresenterState };
  if (v.t === 'deck' && isObj(v.deck) && isObj(v.state)) return { t: 'deck', deck: v.deck as unknown as Deck, state: v.state as unknown as PresenterState };
  return null;
}

/** The show's end: answers a window's hello with the deck and the state, publishes every change, hands commands on. */
export class ShowSide {
  private ch: ChannelLike;
  private last: PresenterState;
  constructor(private deck: Deck, initial: PresenterState, private onCmd: (cmd: PresenterCmd, n?: number, data?: CmdData) => void, make: ChannelFactory = defaultChannel) {
    this.last = initial;
    this.ch = make(PRESENTER_CHANNEL);
    this.ch.onmessage = (e) => {
      const m = parseToShow(e.data);
      if (!m) return;
      if (m.t === 'hello') this.ch.postMessage({ t: 'deck', deck: this.deck, state: this.last } satisfies ToWindow);
      else { const { t: _t, cmd, n, ...data } = m; this.onCmd(cmd, n, Object.keys(data).length ? data : undefined); }
    };
  }
  publish(state: PresenterState): void {
    this.last = state;
    this.ch.postMessage({ t: 'state', state } satisfies ToWindow);
  }
  close(): void {
    try { this.ch.postMessage({ t: 'bye' } satisfies ToWindow); } catch { /* closed */ }
    this.ch.onmessage = null;
    this.ch.close();
  }
}

/** The window's end: asks for the show, takes its deck and states, sends commands. */
export class WindowSide {
  private ch: ChannelLike;
  constructor(private on: { deck: (deck: Deck, state: PresenterState) => void; state: (s: PresenterState) => void; bye: () => void }, make: ChannelFactory = defaultChannel) {
    this.ch = make(PRESENTER_CHANNEL);
    this.ch.onmessage = (e) => {
      const m = parseToWindow(e.data);
      if (!m) return;
      if (m.t === 'deck') this.on.deck(m.deck, m.state);
      else if (m.t === 'state') this.on.state(m.state);
      else this.on.bye();
    };
    this.hello();
  }
  hello(): void { this.ch.postMessage({ t: 'hello' } satisfies ToShow); }
  send(cmd: PresenterCmd, n?: number, data?: CmdData): void { this.ch.postMessage({ t: 'cmd', cmd, ...(n == null ? {} : { n }), ...data } satisfies ToShow); }
  close(): void { this.ch.onmessage = null; this.ch.close(); }
}
