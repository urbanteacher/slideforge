import type { Deck } from './types';

// A lesson's version (BACKLOG CS-12, from Claude Slides pinning the player a deck was made for). Each lesson says
// which version of the studio's deck format it was saved in. Opening an older one runs an upgrade step from each
// version in turn; opening a newer one (saved by a newer studio, opened in an older copy of the app: a cached page,
// a deploy not yet finished) is said before anything is edited, since saving it here could drop what that studio
// added. Steps for lessons converted from SlideForge stay in the converter (decks/fromSlideForge.ts, CARRIED).

/** The deck format this studio writes. Raise it with an upgrade step whenever a saved deck must change. */
export const DECK_VERSION = 2;

/** From version n to n + 1, changing the copy in place. A step may assume every earlier step has run. */
const UPGRADES: Record<number, (d: Deck) => void> = {
  // 2: the first counted version. Nothing in a version 1 deck changes; from here a deck says its version.
  1: () => {},
};

/** The version a deck says it is: a missing stamp is a deck from before stamps (1). A stamp written as text ("3") is
 *  read as its number. One that is not a whole number from 1 up cannot be read, so it is NaN: the deck is not
 *  upgraded, since it may be from a studio that writes versions some other way. */
export function deckVersion(d: { version?: unknown }): number {
  const v = d.version;
  if (v === undefined || v === null) return 1;
  const n = typeof v === 'string' && /^\d+$/.test(v.trim()) ? Number(v) : v;
  return typeof n === 'number' && Number.isInteger(n) && n >= 1 ? n : NaN;
}

/** The deck brought up to this studio's version. `newer` when it was saved by a newer studio, or its version cannot be
 *  read (`from` is then NaN): it is left exactly as it is. */
export function upgradeDeck(d: Deck): { deck: Deck; from: number; newer: boolean } {
  const from = deckVersion(d);
  if (Number.isNaN(from) || from > DECK_VERSION) return { deck: d, from, newer: true };
  if (from === DECK_VERSION) return { deck: d, from, newer: false };
  const copy = structuredClone(d);
  for (let v = from; v < DECK_VERSION; v++) UPGRADES[v]?.(copy);
  copy.version = DECK_VERSION;
  return { deck: copy, from, newer: false };
}

/** Every version below DECK_VERSION has its step (the test reads this, so a raised version cannot lack one). */
export const upgradeSteps = (): number[] => Object.keys(UPGRADES).map(Number).sort((a, b) => a - b);
