import { create } from 'zustand';
import { SHORTCUTS, keysOf } from '../keys';
import { useStore } from '../store';
import { rankCommands, type Command } from './rank';

// The ⌘K palette's commands: every shortcut in the registry (keys/) that the editor has bound a handler to, plus a
// "Go to slide" for each slide. App.tsx binds the handlers, so pressing the key and choosing it here run the same
// code. Inside SlideForge the shell's own palette lists these too (labApi.commands, js/lab-engine.js).

export type { Command } from './rank';

type Binding = { run: () => void; enabled?: () => boolean; words?: string };
let bound: Record<string, Binding> = {};
/** Commands that have no key of their own, listed in the palette only. */
let extra: Command[] = [];

export function bindCommands(b: Record<string, Binding>): void { bound = { ...bound, ...b }; }
export function addCommands(list: Command[]): void { extra = [...extra.filter((c) => !list.some((n) => n.id === c.id)), ...list]; }

export function allCommands(): Command[] {
  const fromKeys: Command[] = SHORTCUTS.filter((s) => bound[s.id]).map((s) => ({ id: s.id, label: s.label, group: s.group, keys: keysOf(s.id), ...bound[s.id] }));
  const deck = useStore.getState().deck;
  const slides: Command[] = deck.slides.map((s, i) => ({ id: `slide.go.${s.id}`, label: `Go to slide ${i + 1}${s.name ? `: ${s.name}` : ''}`, group: 'Slides', keys: '', words: String(i + 1),
    run: () => useStore.getState().selectSlide(s.id) }));
  return [...fromKeys, ...extra, ...slides].filter((c) => !c.enabled || c.enabled());
}

/** The commands that match what was typed in the palette, best first. */
export const rank = (query: string): Command[] => rankCommands(query, allCommands());

/** Which sheet is over the editor: the shortcuts, the palette, or the editor settings. */
export const useOverlay = create<{ open: 'keys' | 'palette' | 'settings' | null }>(() => ({ open: null }));
export const openOverlay = (open: 'keys' | 'palette' | 'settings' | null) => useOverlay.setState({ open });
