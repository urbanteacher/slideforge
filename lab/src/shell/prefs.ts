import { create } from 'zustand';
import { setKeyHints } from '../keys';
import { setSurfaceFailures } from './status';

// Editor preferences: how the editor behaves for this teacher in this browser, not anything about the lesson
// (the lesson's own settings are Deck settings). Kept in localStorage; when the browser refuses storage they still
// apply until the page reloads, and Settings says so.

export interface Prefs {
  /** Tooltips name their shortcut: "Hide the inspector (⌘⌥2)". */
  keyHints: boolean;
  /** A failure brings the Status tab forward, opening the inspector if it is hidden. */
  surfaceFailures: boolean;
  /** The open deck, slide and inspector tab are kept in the address, so a reload or a link lands in the same place. */
  placeInUrl: boolean;
}

const KEY = 'sf-lab-prefs';
const DEFAULTS: Prefs = { keyHints: true, surfaceFailures: true, placeInUrl: true };

/** Whether this browser lets the editor keep anything in localStorage (a private window, or blocked site data, may not). */
export function storageWorks(): boolean {
  try { localStorage.setItem('sf-lab-probe', '1'); localStorage.removeItem('sf-lab-probe'); return true; } catch { return false; }
}

function read(): Prefs {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }; } catch { return DEFAULTS; }
}

interface PrefsState extends Prefs {
  /** Why the last change could not be kept, or null when it was. Shown beside the setting. */
  unsaved: string | null;
  setPref: <K extends keyof Prefs>(k: K, v: Prefs[K]) => void;
}

const apply = (p: Prefs) => { setKeyHints(p.keyHints); setSurfaceFailures(p.surfaceFailures); };

export const usePrefs = create<PrefsState>((set, get) => {
  const first = read();
  apply(first);
  return {
    ...first,
    unsaved: null,
    setPref: (k, v) => {
      const next: Prefs = { keyHints: get().keyHints, surfaceFailures: get().surfaceFailures, placeInUrl: get().placeInUrl, [k]: v };
      apply(next);
      let unsaved: string | null = null;
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch (e) {
        unsaved = `This browser won't let the editor keep it (${(e as Error).name || 'storage blocked'}), so it lasts until you reload.`;
      }
      set({ ...next, unsaved });
    },
  };
});

/** The editor's own keys in localStorage, by what they hold, for Settings' reset buttons. */
export const LAYOUT_KEYS = ['sf.lab.columns', 'sf-lab-panel', 'sf-lab-left', 'sf-left-folds', 'sf-lab-timeline'];
export const RECENT_COLOURS_KEY = 'sf-recent-colours';
