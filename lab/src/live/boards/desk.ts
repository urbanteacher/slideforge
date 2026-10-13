// The board desk: what the host keeps for the boards (lab-engine-plan M8), on SlideForge's own board runtime
// (src/boards/runtime.js createBoardRuntime). The runtime finds a compiled slide's board definition among the game styles
// (`boardEngine`) and runs a session for the board on the wall: its state per slide (kept, frozen, while the show is
// elsewhere, as classic keeps `player.<board>States`), a clock that ticks on the host's clock while it is up and stops when
// the show leaves, and a tick before each command. A verdict goes to the journal as `oral` (classic reportVerdict); no phone
// answers. The lab's board kinds (lowstakes.ts, …) say what the runtime's DOM engines draw and do on a command.

import { createBoardRuntime, type SFBoardSession } from '@sf/boards/runtime.js';
import { GAME_STYLES } from '@sf/games/registry.js';
import type { HostMessage } from '../protocol';
import type { BoardCtx, BoardEntry, BoardKind, BoardState, BoardVerdict } from './types';

export interface BoardEnv {
  send(m: HostMessage): boolean;
  now(): number;
  after(fn: () => void, ms: number): void;
  /** Tell the room (and so the wall) a board's state. */
  publish(id: string, entry: BoardEntry): void;
}

/** The board on a room step: its kind, and the slide SlideForge compiled for it (with the step's id). */
export interface RoomBoard { key: string; slide: BoardCtx['slide'] }

/** The board runtime's sessions draw into a node; the lab's wall is React (hard rule 4), so the node is empty and the paint is the room's. */
const NODE = { querySelector: () => null };

export class BoardDesk {
  private readonly runtime: ReturnType<typeof createBoardRuntime>;
  /** The runtime's host object: its states per board (`lowstakesStates`, …), by slide id; and its sync, which tells the room. */
  private readonly player: Record<string, unknown> & { syncPresenter: () => void };
  private on: { id: string; session: SFBoardSession; kind: BoardKind; key: string } | null = null;

  constructor(private readonly env: BoardEnv, private readonly kinds: BoardKind[]) {
    // The host's clock, so a test runs the board on the recording's: a timer that re-arms itself, cancelled by a flag.
    const clock = {
      now: () => env.now(),
      every: (fn: () => void, ms: number) => { const t = { live: true }; const arm = () => env.after(() => { if (t.live) { fn(); arm(); } }, ms); arm(); return t; },
      cancel: (t: unknown) => { if (t) (t as { live: boolean }).live = false; },
    };
    this.runtime = createBoardRuntime(() => ({}), GAME_STYLES, clock);
    this.player = { syncPresenter: () => this.publish() };
  }

  /** The board definition (src/boards/<board>.js) and the lab's kind for a compiled slide, or null when it is not a board the room runs. */
  kindFor(slide: Record<string, unknown>): { kind: BoardKind; def: SFBoardDef } | null {
    const def = this.runtime.forSlide(slide);
    const kind = def ? this.kinds.find((k) => k.key === def.key) : undefined;
    return def && kind ? { kind, def } : null;
  }

  /** The show landed on a step: the board on the wall before it stops (its state stays), and this step's board, if any, starts. */
  landed(id: string, board: RoomBoard | undefined): void {
    if (this.on && this.on.id === id) return;
    this.unmount();
    if (board) this.mount(id, board);
  }

  /** A teacher's command to the board on the wall (its buttons; classic SF.Boards.command). False when no board is up. */
  command(action: string, card?: number): boolean {
    if (!this.on) return false;
    this.on.session.tick();
    this.on.kind.command(this.ctx(), action, card);
    return true;
  }

  stop(): void { this.unmount(); }

  private mount(id: string, board: RoomBoard): void {
    const slide = { ...board.slide, id };
    const found = this.kindFor(slide);
    if (!found) return;
    const { kind } = found;
    let ctx: BoardCtx | null = null;
    const session = this.runtime.createSession(found.kind.key, {
      player: this.player, slide, node: NODE, interval: kind.interval,
      create: (b: Record<string, unknown>) => kind.create(b),
      render: () => {},
      command: (action: string, card?: number) => { this.command(action, card); },
      tick: (_s: SFBoardSession, dt: number) => kind.tick(ctx!, dt),
    });
    this.on = { id, session, kind, key: found.kind.key };
    ctx = this.ctx();
    session.start();
  }

  private unmount(): void {
    if (!this.on) return;
    this.on.session.stop();
    this.on = null;
  }

  private states(): Record<string, BoardState> {
    const found = this.on && this.kindFor(this.on.session.slide);
    return (found ? (this.player[found.def.states] as Record<string, BoardState>) : {}) ?? {};
  }

  private ctx(): BoardCtx {
    const on = this.on!, slide = on.session.slide as BoardCtx['slide'];
    const found = this.kindFor(slide)!;
    const desk = this;
    return {
      slide, board: (slide[found.def.field] ?? {}) as Record<string, unknown>,
      get state() { return desk.states()[slide.id]; },
      set state(s: BoardState) { desk.states()[slide.id] = s; },
      report: (value) => this.report(found.def, value),
      paint: () => on.session.paint(false),
    };
  }

  private report(def: SFBoardDef, value: unknown): void {
    const v = (def.reportValue ? def.reportValue(value) : value) as BoardVerdict;
    this.env.send({ t: 'oral', slideId: v.slideId, title: v.title, kind: v.kind, set: v.set, card: v.card, term: v.term, participant: v.participant, right: v.right, value: v.value || 0 });
  }

  private publish(): void {
    const on = this.on;
    if (!on) return;
    const s = this.states()[on.id];
    if (s) this.env.publish(on.id, { key: on.key, state: { ...s } });
  }
}
