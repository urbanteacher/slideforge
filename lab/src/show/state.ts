// Whether the studio's own show is open, and the addresses it needs. Opened from the TopBar (app/) and, in
// slice 3, from the shell's Present and Host live, through `openStudioShow`.

import { create } from 'zustand';
import { useStore } from '../store';

interface ShowState {
  open: boolean;
  /** Host a live room over the show (Multiple choice questions). */
  room: boolean;
  /** The slide the show starts on (the one being edited). */
  slideId: string | null;
}

export const useShow = create<ShowState>(() => ({ open: false, room: false, slideId: null }));

/** Open the studio's own slideshow on the lesson in the studio, from the slide being edited. */
export function openStudioShow(opts: { room?: boolean; slideId?: string } = {}): void {
  useShow.setState({ open: true, room: !!opts.room, slideId: opts.slideId ?? useStore.getState().slideId });
}

export function closeStudioShow(): void {
  useShow.setState({ open: false, room: false });
}

/** ?studioRoom=1 turns the studio's own room on. Read from this page, and from the page around it when the
 *  lab is the shell's frame (lab-app/index.html?embed=1 has no query of its own). */
export function studioRoomEnabled(): boolean {
  const flag = (search: string) => new URLSearchParams(search).get('studioRoom') === '1';
  try { if (flag(location.search)) return true; } catch { /* no location */ }
  try { return window.parent !== window && flag(window.parent.location.search); } catch { return false; }
}

/** The relay's socket: this page's own host, as classic does. The development server has no relay, so it is
 *  SlideForge's local one. */
export function relayUrl(): string {
  if (location.protocol === 'file:' || import.meta.env.DEV) return 'ws://localhost:8787';
  return (location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + location.host;
}

/** The join address when the relay's own is missing (classic joinAddress). */
export function joinFallback(): string {
  if (location.protocol === 'file:' || import.meta.env.DEV) return 'http://localhost:8787/join.html';
  return location.origin + '/join.html';
}
