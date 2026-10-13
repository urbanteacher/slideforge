// Notes on another device: a private channel on the relay (docs/games/protocol.md §13). The show opens its own
// socket and says `prompterOpen`; the relay answers `prompterReady` with an id, and prompter.html?p=<id> on a phone
// or a prompt screen follows the notes. The show sends a `prompterState` on every slide, executes the device's
// `prompterCmd` next and prev, and the channel ends when the show does.
//
// It is its own socket and not the room's: a socket's role is fixed by its first message (the room's is the host),
// and the notes must never share a connection with a room (they go to this channel only).

import type { SocketFactory, SocketLike } from '../live';
import type { PrompterState } from './desk';

export interface PrompterOptions {
  url: string;
  /** The notes screen's address, from the channel id. */
  link: (id: string) => string;
  /** A device pressed Next or Back. */
  onCmd: (cmd: 'next' | 'prev') => void;
  /** Something the teacher should see changed (ready, watchers, closed): repaint. */
  onChange: () => void;
  makeSocket?: SocketFactory;
}

const OPEN = 1;
const defaultSocket: SocketFactory = (url) => new WebSocket(url) as unknown as SocketLike;

export class PrompterLink {
  id = '';
  watchers = 0;
  closed = false;
  /** The last frame asked for: sent as soon as the channel is ready. */
  private last: PrompterState | null = null;
  private sock: SocketLike | null = null;

  constructor(private opts: PrompterOptions) {}

  get ready(): boolean { return !!this.id && !this.closed; }
  get url(): string { return this.id ? this.opts.link(this.id) : ''; }

  start(): void {
    let s: SocketLike;
    try { s = (this.opts.makeSocket ?? defaultSocket)(this.opts.url); } catch { this.finish(); return; }
    this.sock = s;
    s.addEventListener('open', () => { if (this.sock === s) s.send(JSON.stringify({ t: 'prompterOpen' })); });
    s.addEventListener('message', (ev) => {
      if (this.sock !== s) return;
      let m: { t?: string; id?: unknown; n?: unknown; cmd?: unknown } | null = null;
      try { m = JSON.parse(String(ev.data)); } catch { return; }
      if (!m) return;
      if (m.t === 'prompterReady') { this.id = String(m.id ?? ''); this.flush(); this.opts.onChange(); }
      else if (m.t === 'prompterWatchers') { this.watchers = Number(m.n) || 0; this.opts.onChange(); }
      else if (m.t === 'prompterCmd' && (m.cmd === 'next' || m.cmd === 'prev')) this.opts.onCmd(m.cmd);
    });
    s.addEventListener('close', () => { if (this.sock === s) this.finish(); });
    s.addEventListener('error', () => {});
  }

  /** Tell the device where the show is. Held until the channel is ready; the newest frame wins. */
  send(frame: PrompterState): void {
    this.last = frame;
    this.flush();
  }

  private flush(): void {
    const s = this.sock;
    if (!s || !this.id || !this.last || s.readyState !== OPEN) return;
    try { s.send(JSON.stringify({ t: 'prompterState', state: this.last })); } catch { /* closing */ }
  }

  stop(): void {
    const s = this.sock;
    this.sock = null;
    try { s?.close(1000); } catch { /* closed */ }
    this.finish();
  }

  private finish(): void {
    if (this.closed) return;
    this.closed = true;
    this.sock = null;
    this.opts.onChange();
  }
}

/** Where prompter.html is, for the link: one level up from the lab (lab-app/), on the relay's own origin in the development server. */
export function prompterLinkFor(id: string, page: string): string {
  return page + (page.includes('?') ? '&' : '?') + 'p=' + id;
}
