import { blankDeck } from './model/defaults';
import { convertsSlide, deckFromSlideForge, type SFDeck, type SFSlide } from './model/fromSlideForge';
import { imageSettled } from './engine/raster';
import { renderStill } from './export/exporters';
import { useStore } from './model/store';
import type { Deck, Slide } from './model/types';
import { idbDelete, idbGet, idbSet } from './persist/idb';

// The lab as SlideForge's lesson engine. SlideForge's shell (js/shell.js) loads the lab in a frame
// over its workspace and drives it through this: the shell keeps the title, File, Library, Save and
// Present; the lab keeps the slides. A SlideForge lesson opened here is converted into a lab copy
// with its own id, and the original is never written to, so a lesson whose games the converter
// cannot carry yet keeps them in SlideForge.

export interface SavedRow { id: string; title: string; modified: number; slides: number; sourceId?: string; libraryGroup?: string }

const INDEX = 'index';
const key = (id: string) => `deck:${id}`;

// Saves arrive from the autosave and from the shell; one at a time, so the index is never
// read by one while another is writing it.
let queue: Promise<unknown> = Promise.resolve();
const serial = <T>(job: () => Promise<T>): Promise<T> => {
  const run = queue.then(job, job);
  queue = run.catch(() => undefined);
  return run;
};

export async function listSaved(): Promise<SavedRow[]> {
  return (await idbGet<SavedRow[]>(INDEX)) ?? [];
}

/** Keep one deck under its own id, and list it for the shell's Open. */
export function persistDeck(d: Deck): Promise<SavedRow[]> {
  return serial(async () => {
    const deck = { ...d, modified: Date.now() };
    await idbSet(key(d.id), deck);
    const rows = (await listSaved()).filter((r) => r.id !== d.id);
    rows.unshift({ id: d.id, title: d.title, modified: deck.modified, slides: d.slides.length, sourceId: d.sourceId, libraryGroup: d.libraryGroup });
    await idbSet(INDEX, rows);
    return rows;
  });
}

/** The deck on screen, written now: the last-open slot and its own record. */
export async function saveCurrent(): Promise<void> {
  const st = useStore.getState();
  await idbSet('current', { deck: st.deck, slideId: st.slideId });
  await persistDeck(st.deck);
}

/** The campaign palette nearest a SlideForge theme, and whether it wears NU London's frame. */
function paletteFor(theme = ''): { palette: string; frame: boolean } {
  if (theme.startsWith('northeastern')) return { palette: 'nul', frame: true };
  if (theme.startsWith('ukbt-institute')) return { palette: 'ukbt-institute', frame: false };
  if (theme.startsWith('ukbt')) return { palette: 'ukbt', frame: false };
  if (theme.startsWith('aiad27')) return { palette: 'aiad27', frame: false };
  if (theme.startsWith('aiad26')) return { palette: 'aiad26', frame: false };
  return { palette: 'nul', frame: false };
}

interface ClassicDeck { id: string; title?: string; theme?: string; slides?: SFSlide[]; libraryGroup?: string }

/** A SlideForge lesson as a new lab deck. Its pictures are addresses on the slide (a URL or a data URL),
 *  not keys into a table as the Layout bank's are, so every lookup answers with the address itself. */
const addresses = new Proxy({} as Record<string, string>, { get: (_, k) => (typeof k === 'string' ? k : undefined) });

export function convertClassic(c: ClassicDeck): Deck {
  const slides = Array.isArray(c.slides) ? c.slides : [];
  const images = addresses;
  const data: SFDeck = { key: c.id, title: c.title || 'Untitled lesson', theme: c.theme || '', slides, images };
  const { palette, frame } = paletteFor(c.theme);
  const deck = deckFromSlideForge(data, palette, { frame, games: '' });
  deck.id = `lab-${c.id}`;
  deck.sourceId = c.id;
  if (c.libraryGroup) deck.libraryGroup = c.libraryGroup;
  if (!deck.slides.length) deck.slides = blankDeck().slides;
  return deck;
}

/** A lab deck: every slide a stack of layers, and none typed. A SlideForge slide always has a type,
 *  and some carry a `layers` list of their own (a gallery's pictures), so layers alone do not tell. */
export const isLabDeck = (d: unknown): d is Deck => {
  const slides = (d as Deck | null)?.slides;
  return Array.isArray(slides) && slides.length > 0 &&
    slides.every((s) => Array.isArray(s?.layers) && typeof (s as { type?: unknown }).type !== 'string');
};

function show(d: Deck) {
  useStore.getState().loadDeck(d);
  useStore.setState({ saveState: 'saved' });
}

/** One slide as a picture for SlideForge's player: what Host live, Teacher Presenter and Rehearse
 *  show until the lab has a live host of its own. */
export interface Still { id: string; sourceSlideId?: string; image: string; notes: string; hidden: boolean; name: string; feedback?: string }

// A slide is immutable, so an unchanged one keeps its picture; the deck-wide things drawn on it
// (the header and footer, the style guide, its page number) are checked too.
// One cache per size: a share drawn small does not throw away the pictures Host live drew large.
const stillCaches = new Map<string, WeakMap<Slide, { url: string; hf: unknown; guide: unknown; page: number }>>();

async function stills(width = 1600, onProgress?: (done: number, total: number) => void, quality = 0.9): Promise<Still[]> {
  const size = `${width}|${quality}`;
  if (!stillCaches.has(size)) stillCaches.set(size, new WeakMap());
  const stillCache = stillCaches.get(size)!;
  const deck = useStore.getState().deck;
  const srcs = new Set<string>();
  for (const s of deck.slides) for (const l of s.layers) {
    const src = (l.params as Record<string, unknown>)?.src;
    if (typeof src === 'string' && src && l.kind !== 'video') srcs.add(src);
  }
  await Promise.all([...srcs].map(imageSettled));
  await document.fonts?.ready;
  const shown = deck.slides.filter((s) => !s.hidden);
  const out: Still[] = [];
  for (let i = 0; i < deck.slides.length; i++) {
    const s = deck.slides[i];
    const page = shown.indexOf(s);
    const hit = stillCache.get(s);
    let url = hit && hit.hf === deck.headerFooter && hit.guide === deck.styleGuide && hit.page === page ? hit.url : '';
    if (!url) {
      url = renderStill(s, deck, width, 'image/jpeg', 2, quality);
      stillCache.set(s, { url, hf: deck.headerFooter, guide: deck.styleGuide, page });
      // A breath between slides, so the page stays responsive while a long deck is drawn.
      await new Promise((r) => setTimeout(r, 0));
    }
    out.push({ id: s.id, sourceSlideId: s.sourceSlideId, image: url, notes: s.notes ?? '', hidden: !!s.hidden, name: s.name, feedback: s.feedback?.kind });
    onProgress?.(i + 1, deck.slides.length);
  }
  return out;
}

/** A slide's words, for SlideForge's practice notes: a picture of a slide has none to give. */
export interface Outline { id: string; sourceSlideId?: string; title: string; lines: string[]; notes: string; hidden: boolean }

const lines = (v: unknown) => String(v ?? '').split('\n').map((s) => s.trim()).filter(Boolean);

function outline(): Outline[] {
  return useStore.getState().deck.slides.map((s) => {
    const words: { heading: boolean; text: string[] }[] = [];
    for (const l of s.layers) {
      const p = l.params as Record<string, unknown>;
      if (typeof p.hfSlot === 'string' || !l.visible) continue; // the header and footer, not the slide's own words
      if (l.kind === 'text' || l.kind === 'note' || l.kind === 'quote') words.push({ heading: /^(Heading|Hero|Title)$/i.test(l.name), text: lines(p.text) });
      else if (l.kind === 'quiz') words.push({ heading: false, text: [...lines(p.question), ...lines(p.options)] });
      else if (l.kind === 'activity') words.push({ heading: false, text: [...lines(p.title), ...lines(p.steps)] });
      else if (l.kind === 'table') words.push({ heading: false, text: lines(p.data).map((r) => r.split(/\t| \| /).join(' · ')) });
    }
    const head = words.find((w) => w.heading && w.text.length) ?? words.find((w) => w.text.length);
    const title = head ? head.text.join(' ') : s.name;
    const rest = words.filter((w) => w !== head).flatMap((w) => w.text);
    return { id: s.id, sourceSlideId: s.sourceSlideId, title, lines: rest, notes: s.notes ?? '', hidden: !!s.hidden };
  });
}

/** What the shell can ask of the lab. */
export const labApi = {
  getDeck: (): Deck => useStore.getState().deck,
  saveState: () => useStore.getState().saveState,
  isLabDeck,
  blank: (): Deck => blankDeck(),
  /** Open a document the shell hands over: a lab deck as it is, a SlideForge lesson as its lab copy. */
  async open(d: unknown): Promise<{ converted: boolean; dropped: number }> {
    if (isLabDeck(d)) { show(d); return { converted: false, dropped: 0 }; }
    const c = d as ClassicDeck;
    if (!c || !c.id) return { converted: false, dropped: 0 };
    const saved = await idbGet<Deck>(key(`lab-${c.id}`));
    if (saved?.slides?.length) { show(saved); return { converted: false, dropped: 0 }; }
    const deck = convertClassic(c);
    show(deck);
    await persistDeck(deck);
    return { converted: true, dropped: Math.max(0, (c.slides?.length ?? 0) - deck.slides.length) };
  },
  async openSaved(id: string): Promise<boolean> {
    const d = await idbGet<Deck>(key(id));
    if (!isLabDeck(d)) return false;
    show(d);
    return true;
  },
  listSaved,
  async remove(id: string) {
    await serial(async () => {
      await idbDelete(key(id));
      await idbSet(INDEX, (await listSaved()).filter((r) => r.id !== id));
    });
  },
  setTitle(title: string) {
    if (useStore.getState().deck.title === title) return;
    useStore.getState().mutate((d) => { d.title = title; }, 'title');
  },
  setGroup(group: string | undefined) {
    useStore.getState().mutate((d) => { if (group) d.libraryGroup = group; else delete d.libraryGroup; });
  },
  present() { useStore.getState().set({ presenting: true }); },
  currentSlideId: () => useStore.getState().slideId,
  stills,
  outline,
  /** The slides of a SlideForge lesson the lab cannot build: its games and activities. */
  cannotBuild: (slides: SFSlide[]) => (slides ?? []).filter((s) => !convertsSlide(s)).map((s) => s.id).filter(Boolean) as string[],
  isPresenting: () => useStore.getState().presenting,
  async flush() {
    await saveCurrent();
    useStore.setState({ saveState: 'saved' });
  },
  subscribe(cb: () => void) {
    return useStore.subscribe((s, p) => {
      if (s.deck !== p.deck || s.saveState !== p.saveState || s.presenting !== p.presenting) cb();
    });
  },
};

export type LabApi = typeof labApi;
