// What the show tells its two outside screens, and the small pure logic of its bar: the state the Teacher Presenter
// window draws (presenter/), the frames the notes channel carries (prompter.ts), jump-to-slide by number, and the
// overview grid. No DOM and no React, so the tests run without a browser.

import type { Deck, Slide } from '../core';
import type { PresenterRoom, PresenterState, Screen } from '../presenter';
import type { Wall } from './wallModel';

type DeckLike = Pick<Deck, 'title' | 'slides'>;

/** A slide's name as the notes screen shows it: one line, cut at 200 (classic slideName). */
export function slideTitle(s: Pick<Slide, 'name'> | undefined, n: number): string {
  const t = String(s?.name ?? '').replace(/\s+/g, ' ').trim().slice(0, 200);
  return t || `Slide ${n}`;
}

/** The notes channel's `prompterState` (docs/games/protocol.md §13), as classic's prompterSend builds it. */
export interface PrompterState { index: number; total: number; title: string; notes: string; next: string; deck: string; startedAt: number }
export function prompterFrame(deck: DeckLike, index: number, startedAt: number): PrompterState {
  const s = deck.slides[index], nx = deck.slides[index + 1];
  return {
    index, total: deck.slides.length, title: slideTitle(s, index + 1), notes: String(s?.notes ?? ''),
    next: nx ? slideTitle(nx, index + 2) : '', deck: String(deck.title ?? ''), startedAt,
  };
}

export interface DeskInput {
  deck: DeckLike;
  index: number;
  startedAt: number;
  screen: Screen;
  /** The live figure on the wall: its step, of how many, and the step's caption (figure.ts). */
  figure?: { step: number; of: number; caption: string } | null;
  /** The room, when the show has one: its wall, and what the bar's prompt buttons would offer. */
  room?: { wall: Wall | null; connected: boolean; pin: string | null; canClose: boolean; canShow: boolean } | null;
}

/** The Teacher Presenter window's state: this slide, the next, the notes, and the room's status. */
export function presenterState(i: DeskInput): PresenterState {
  const f = prompterFrame(i.deck, i.index, i.startedAt);
  let room: PresenterRoom | null = null;
  if (i.room) {
    const w = i.room.wall, q = w?.question;
    const fb = w?.view === 'feedback';
    room = {
      pin: i.room.pin, connected: i.room.connected, players: w?.players.length ?? 0, view: w?.view ?? 'connecting',
      open: w?.view === 'question' || fb,
      answered: q ? q.answered : 0, total: q ? q.players : (w?.players.length ?? 0),
      revealed: w?.view === 'reveal', canClose: i.room.canClose, canShow: i.room.canShow,
      ...(w?.activity?.stage ? { stage: { name: w.activity.stage.name, wall: w.activity.stage.wall, written: w.activity.written, help: w.activity.help } } : {}),
    };
  }
  return { index: f.index, total: f.total, title: f.title, notes: f.notes, nextTitle: f.next, deck: f.deck, startedAt: i.startedAt, screen: i.screen, room, ...(i.figure ? { figure: i.figure } : {}) };
}

/** Digits typed in the show build a slide number (1 based); anything else leaves the buffer alone. Null: not a digit. */
export function pushDigit(buffer: string, key: string): string | null {
  if (!/^[0-9]$/.test(key)) return null;
  const next = (buffer + key).replace(/^0+/, '');
  return next.slice(0, 4);
}

/** The slide (0 based) a typed number names, or null when it is empty or past the lesson. */
export function jumpTarget(buffer: string, total: number): number | null {
  const n = Number(buffer);
  return buffer && Number.isInteger(n) && n >= 1 && n <= total ? n - 1 : null;
}

/** The overview grid's columns for a slide count: three across for a few, wider for many. */
export function gridColumns(total: number): number {
  return total <= 4 ? Math.max(1, total) : total <= 9 ? 3 : total <= 16 ? 4 : total <= 30 ? 6 : 8;
}

/** Arrow keys inside the overview move the highlight by a tile or a row, kept inside the grid. */
export function gridMove(at: number, key: string, total: number): number {
  const cols = gridColumns(total);
  const to = key === 'ArrowRight' ? at + 1 : key === 'ArrowLeft' ? at - 1 : key === 'ArrowDown' ? at + cols : key === 'ArrowUp' ? at - cols : key === 'Home' ? 0 : key === 'End' ? total - 1 : at;
  return Math.max(0, Math.min(total - 1, to));
}
