import type { Deck } from '../core';
import { useStore } from '../store';
import { formatPlace, parsePlace, type Place } from './place';
import { usePrefs } from './prefs';
import { report, useStatus } from './status';

// The address holds the place: the open deck, the slide and the inspector's tab (and the Status tab, when it is the
// one showing), as #deck=…&slide=…&tab=…, so a reload or a shared link lands in the same spot. The player's own #3 is
// unrelated (it is the exported deck's page). Inside SlideForge the lab is a frame the shell loads afresh, so the
// place is kept in the shell page's address instead, where a reload can find it; the deck there is the shell's to
// choose, so only the slide and tab are restored, and only when the shell opened the same deck.

/** The page whose address is ours: this one, or the shell's when the lab is its frame (same origin). */
function page(embedded: boolean): Window | null {
  if (!embedded) return window;
  try { return window.parent !== window && window.parent.location.href ? window.parent : null; } catch { return null; }
}

/** The place the address asks for (only a hash of ours: deck=, slide=, tab= or side=). */
export function readPlace(embedded: boolean): Place | null {
  const w = page(embedded);
  if (!w || !/(^|[#&])(deck|slide|tab|side)=/.test(w.location.hash)) return null;
  return parsePlace(w.location.hash);
}

/**
 * Go to the place the address asked for, after the last deck has been restored. A deck that is not saved in this
 * browser, or a slide that is not in it, is said so in the Status tab rather than quietly ignored.
 */
export async function restorePlace(place: Place, embedded: boolean, loadSaved: (id: string) => Promise<Deck | null>): Promise<void> {
  const st = useStore.getState();
  if (place.deck && place.deck !== st.deck.id) {
    if (embedded) {
      report({ kind: 'note', state: 'info', title: 'The address named another lesson', detail: 'Inside SlideForge the Library chooses the lesson, so the slide and tab in the address were left alone.' });
      return;
    }
    const d = await loadSaved(place.deck).catch(() => null);
    if (!d) {
      report({ kind: 'open', state: 'failed', title: "The link's deck isn't saved in this browser", detail: `It asked for deck ${place.deck}. Decks live in each browser's own storage, so a link opens a deck only where it was made. Your last deck is open instead.` });
      return;
    }
    st.loadDeck(d);
  }
  const deck = useStore.getState().deck;
  if (place.slide) {
    const n = /^\d+$/.test(place.slide) ? Number(place.slide) : 0;
    const s = n ? deck.slides[n - 1] : deck.slides.find((x) => x.id === place.slide);
    if (s) useStore.getState().selectSlide(s.id);
    else report({ kind: 'open', state: 'failed', title: "The link's slide isn't in this deck", detail: `It asked for slide ${place.slide}; it may have been deleted. The deck opened on slide 1.` });
  }
  if (place.tab) useStore.getState().set({ inspectorTab: place.tab });
  if (place.side) useStatus.setState({ side: 'status' });
}

/** Keep the address up to date as the place changes (replaceState, so Back is not filled with every click). */
export function startUrlSync(embedded: boolean): () => void {
  let last = '';
  const write = () => {
    const w = page(embedded);
    if (!w || !usePrefs.getState().placeInUrl) return;
    const s = useStore.getState();
    const hash = formatPlace({ ...(embedded ? {} : { deck: s.deck.id }), slide: s.slideId, tab: s.inspectorTab, ...(useStatus.getState().side === 'status' ? { side: 'status' as const } : {}) });
    if (hash === last) return;
    last = hash;
    try { w.history.replaceState(w.history.state, '', `${w.location.pathname}${w.location.search}#${hash}`); } catch { /* a sandboxed frame: the place just isn't kept */ }
  };
  write();
  const a = useStore.subscribe((s, p) => { if (s.slideId !== p.slideId || s.inspectorTab !== p.inspectorTab || s.deck.id !== p.deck.id) write(); });
  const b = useStatus.subscribe((s, p) => { if (s.side !== p.side) write(); });
  const c = usePrefs.subscribe((s, p) => {
    if (s.placeInUrl === p.placeInUrl) return;
    if (s.placeInUrl) { last = ''; write(); return; }
    const w = page(embedded);
    if (w && readPlace(embedded)) try { w.history.replaceState(w.history.state, '', `${w.location.pathname}${w.location.search}`); last = ''; } catch { /* as above */ }
  });
  return () => { a(); b(); c(); };
}
