// The studio's Teacher Presenter: a second window of the same lab-app (?presenter=1) that follows the show over a
// BroadcastChannel (same origin) and sends it commands. Nothing here touches the DOM, the relay or React: the
// messages, the state the show publishes, and the two ends' bookkeeping (`ShowSide`, `WindowSide`), so the protocol is
// unit-tested without a browser. The show executes a command exactly as its own key would (show/commands.ts).

import type { Deck } from '../core';

export const PRESENTER_CHANNEL = 'slideforge.lab.presenter.v1';

/** What the window may ask of the show. `goto` carries `n`, a 1-based slide number of the shown deck. */
export type PresenterCmd = 'next' | 'prev' | 'reveal' | 'close' | 'open' | 'goto' | 'end' | 'black' | 'white' | 'resume' | 'more';
export const PRESENTER_CMDS: readonly PresenterCmd[] = ['next', 'prev', 'reveal', 'close', 'open', 'goto', 'end', 'black', 'white', 'resume', 'more'];

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
}

export type ToWindow =
  | { t: 'deck'; deck: Deck; state: PresenterState }
  | { t: 'state'; state: PresenterState }
  | { t: 'bye' };
export type ToShow =
  | { t: 'hello' }
  | { t: 'cmd'; cmd: PresenterCmd; n?: number };

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
    return { t: 'cmd', cmd: v.cmd as PresenterCmd, n: Number.isFinite(n) ? Math.trunc(n) : undefined };
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
  constructor(private deck: Deck, initial: PresenterState, private onCmd: (cmd: PresenterCmd, n?: number) => void, make: ChannelFactory = defaultChannel) {
    this.last = initial;
    this.ch = make(PRESENTER_CHANNEL);
    this.ch.onmessage = (e) => {
      const m = parseToShow(e.data);
      if (!m) return;
      if (m.t === 'hello') this.ch.postMessage({ t: 'deck', deck: this.deck, state: this.last } satisfies ToWindow);
      else this.onCmd(m.cmd, m.n);
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
  send(cmd: PresenterCmd, n?: number): void { this.ch.postMessage(n == null ? { t: 'cmd', cmd } : { t: 'cmd', cmd, n }); }
  close(): void { this.ch.onmessage = null; this.ch.close(); }
}
