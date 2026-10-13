// Whether the studio's own show is open, and the addresses it needs. Opened from the TopBar (app/) and, in
// slice 3, from the shell's Present and Host live, through `openStudioShow`.

import { create } from 'zustand';
import { useStore } from '../store';
import type { ShowHooks } from './hooks';

interface ShowState {
  open: boolean;
  /** Host a live room over the show (Multiple choice and True or false questions). */
  room: boolean;
  /** The slide the show starts on (the one being edited). */
  slideId: string | null;
  /** What the shell around the lab lends the show (hooks.ts); none when the lab is on its own. */
  hooks: ShowHooks | null;
  /** The room has begun (someone pressed Start): past this the show does not hand the lesson to the classic host. */
  begun: boolean;
  /** A simulated class of this size joins the room as it opens (Rehearse); 0 for none. */
  rehearse: number;
  /** What the shell asked the show to put up first: the Teacher Presenter window ('desk') or the notes card ('notes'). */
  first: ShowFirst | null;
}

/** What a show opens with already up (the shell's Teacher Presenter and Notes on another device, M15). */
export type ShowFirst = 'desk' | 'notes';

export const useShow = create<ShowState>(() => ({ open: false, room: false, slideId: null, hooks: null, begun: false, rehearse: 0, first: null }));

/** Open the studio's own slideshow on the lesson in the studio, from the slide being edited. */
export function openStudioShow(opts: { room?: boolean; slideId?: string; hooks?: ShowHooks; rehearse?: number; first?: ShowFirst } = {}): void {
  useShow.setState({ open: true, begun: false, rehearse: opts.rehearse ?? 0, first: opts.first ?? null, room: !!opts.room, slideId: opts.slideId ?? useStore.getState().slideId, hooks: opts.hooks ?? useShow.getState().hooks });
}

export function closeStudioShow(): void {
  useShow.setState({ open: false, room: false });
}

function readFlag(name = 'studioRoom'): boolean {
  const flag = (search: string) => new URLSearchParams(search).get(name) === '1';
  try { if (flag(location.search)) return true; } catch { /* no location */ }
  try { return window.parent !== window && flag(window.parent.location.search); } catch { return false; }
}

// Read once, when the lab loads. The shell takes its query string off the address when ?lesson= opens a lesson
// (js/lab-engine.js, frozen), which can be before this frame has loaded: use ?studioRoom=1 on its own, and open
// the lesson from the Library.
const FLAG = readFlag();
const SHOW_FLAG = readFlag('studioShow');

/** ?studioRoom=1 turns the studio's own room on. Read from this page, and from the page around it when the
 *  lab is the shell's frame (lab-app/index.html?embed=1 has no query of its own). */
export function studioRoomEnabled(): boolean { return FLAG; }

/** ?studioShow=1 offers the studio's own show for a lesson with no room (the TopBar's Present (studio)), until the shell's
 *  Present is switched to it (M15). Read the same way as the room's flag. */
export function studioShowEnabled(): boolean { return SHOW_FLAG; }

/** Where prompter.html is (the notes screen), beside manual.html. */
export function prompterPage(): string {
  if (location.protocol === 'file:' || import.meta.env.DEV) return 'http://localhost:8787/prompter.html';
  return new URL('../prompter.html', location.href).href;
}

/** The relay's socket: this page's own host, as classic does. The development server has no relay, so it is
 *  SlideForge's local one. */
export function relayUrl(): string {
  if (location.protocol === 'file:' || import.meta.env.DEV) return 'ws://localhost:8787';
  return (location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + location.host;
}

/** Where manual.html is, for the teacher-entry window: one level up from the lab (lab-app/), on the relay's own origin
 *  in the development server (which has none). The window and the room must share an origin: a BroadcastChannel does. */
export function manualPage(): string {
  if (location.protocol === 'file:' || import.meta.env.DEV) return 'http://localhost:8787/manual.html';
  return new URL('../manual.html', location.href).href;
}

/** The join address when the relay's own is missing (classic joinAddress). */
export function joinFallback(): string {
  if (location.protocol === 'file:' || import.meta.env.DEV) return 'http://localhost:8787/join.html';
  return location.origin + '/join.html';
}
