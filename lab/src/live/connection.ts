// One WebSocket to the relay, kept up. A socket that closes without being asked to is opened again,
// with backoff, for as long as the room runs: a phone's network blip and a relay that restarts (a deploy
// or a spin-down drops every room, docs/games/protocol.md §4.3 and §11) look the same from here. What to
// say on each new socket — `rehost` or `host`, and what the room then needs replayed — is the host's call
// (host.ts), made in `onOpen`.
//
// No queue: like classic (`js/live.js` send), a message sent while the socket is down is dropped, and the
// host replays the room's state when the socket is back.

import type { HostMessage, RelayMessage } from './protocol';
import { parseRelay } from './protocol';

/** What the lab needs of a WebSocket: the browser's, Node's global one, or a test's stand-in. */
export interface SocketLike {
  readonly readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  addEventListener(type: 'open' | 'close' | 'error' | 'message', fn: (ev: { data?: unknown }) => void): void;
}
export type SocketFactory = (url: string) => SocketLike;

export interface Backoff {
  /** The first wait before reconnecting, in ms. */
  initialMs: number;
  /** The longest wait. */
  maxMs: number;
  factor: number;
}
/** Quick at first, then every few seconds: a relay on Render takes a while to come back from a deploy. */
export const DEFAULT_BACKOFF: Backoff = { initialMs: 250, maxMs: 5000, factor: 2 };

export interface ConnectionOptions {
  url: string;
  makeSocket?: SocketFactory;
  backoff?: Partial<Backoff>;
  /** Give up on a socket that has not opened by then and try again (classic: 45 s hosted, 4 s local). */
  openTimeoutMs?: number;
  /** A socket is open: say who you are. `n` counts the opens, from 1. */
  onOpen: (n: number) => void;
  onMessage: (m: RelayMessage) => void;
  /** The socket went down and a reconnect is scheduled in `waitMs`. */
  onDown?: (waitMs: number) => void;
  /** Every frame, both ways, as sent and received (the replay test listens here). */
  tap?: (dir: 'send' | 'recv', m: HostMessage | RelayMessage) => void;
}

const OPEN = 1;
const defaultSocket: SocketFactory = (url) => new WebSocket(url) as unknown as SocketLike;

export class Connection {
  private sock: SocketLike | null = null;
  private stopped = false;
  private attempts = 0;
  private opens = 0;
  private retry: ReturnType<typeof setTimeout> | null = null;
  private readonly backoff: Backoff;

  constructor(private readonly opts: ConnectionOptions) {
    this.backoff = { ...DEFAULT_BACKOFF, ...opts.backoff };
  }

  get open(): boolean { return !!this.sock && this.sock.readyState === OPEN; }

  start(): void {
    this.stopped = false;
    if (!this.sock) this.connect();
  }

  /** Send one message; false (and nothing sent) when the socket is not open. */
  send(m: HostMessage): boolean {
    if (!this.sock || this.sock.readyState !== OPEN) return false;
    this.opts.tap?.('send', m);
    this.sock.send(JSON.stringify(m));
    return true;
  }

  /** Close for good: no reconnect. */
  stop(): void {
    this.stopped = true;
    if (this.retry) { clearTimeout(this.retry); this.retry = null; }
    const s = this.sock;
    this.sock = null;
    try { s?.close(1000); } catch { /* already closing */ }
  }

  /** Drop the current socket as a network fault would, and reconnect (used when the relay goes quiet). */
  drop(): void {
    try { this.sock?.close(); } catch { /* already closing */ }
  }

  private connect(): void {
    let s: SocketLike;
    try { s = (this.opts.makeSocket ?? defaultSocket)(this.opts.url); } catch { this.down(null); return; }
    this.sock = s;
    let opened = false;
    const timeout = setTimeout(() => { if (!opened) { try { s.close(); } catch { /* */ } this.down(s); } }, this.opts.openTimeoutMs ?? 45000);
    s.addEventListener('open', () => {
      if (this.sock !== s) return;
      opened = true;
      clearTimeout(timeout);
      this.attempts = 0;
      this.opts.onOpen(++this.opens);
    });
    s.addEventListener('message', (ev) => {
      if (this.sock !== s) return;
      const m = parseRelay(ev.data);
      if (!m) return;
      this.opts.tap?.('recv', m);
      this.opts.onMessage(m);
    });
    s.addEventListener('close', () => { clearTimeout(timeout); this.down(s); });
    // A refused connection fires error then close; close does the work.
    s.addEventListener('error', () => {});
  }

  private down(s: SocketLike | null): void {
    if (s && this.sock !== s) return;
    this.sock = null;
    if (this.stopped || this.retry) return;
    const b = this.backoff;
    const wait = Math.min(b.maxMs, b.initialMs * b.factor ** this.attempts++);
    this.opts.onDown?.(wait);
    this.retry = setTimeout(() => { this.retry = null; if (!this.stopped) this.connect(); }, wait);
  }
}
