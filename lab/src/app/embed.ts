import { TEMPLATES, blankDeck, shareTooLarge, idbDelete, idbGet, idbGetMany, idbKeys, idbSet, idbSetMany, unpackPictures, type Deck, type Slide } from '../core';
import { deckFromLesson, loadChoiceStarter, readLesson, CARRIED, carryDeck27, carryDeckFigures, carryDeckVideo, carryDeckArt, carryDeckExperimentPresets, carryDeckHidden, pageNumbers, carryDeckLive, carryDeckMissing, convertsSlide, deckFromSlideForge, fitStatement, type LessonGame, type SFDeck, type SFSlide } from '../decks';
import { imageSettled } from '../engine';
import { buildPdf, buildPptx, dataUrlBytes, renderStill, editableSlides, exportPptx, handoutHtml, handoutPages, type SlideFormat } from '../export';
import { enterView, useStore, type LabView } from '../store';
import { canHostInStudio, openStudioShow, roomRunning, roomWatchOn, whyNotPresentInStudio, type ShowFirst, type ShowHooks } from '../show';
import { shareCopy } from '../viewer';
import { saveSlide } from '../ui';
import { SIZES } from '../rehearse';
import { allCommands, report } from '../shell';
import { pictureStore } from './pictureStore';
import { showNotice } from './factsWarning';

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

// Lessons are stored with their pictures kept once, apart (app/pictureStore.ts, BACKLOG CS-14), and read back whole.
const pics = pictureStore({ get: idbGet, getMany: idbGetMany, set: idbSet, setMany: idbSetMany, del: idbDelete, keys: idbKeys });

/** A stored record with its pictures put back. A picture that cannot be found keeps its reference and is reported. */
export async function readStored<T>(k: string): Promise<T | undefined> {
  const raw = await idbGet<T>(k);
  if (raw === undefined) return raw;
  const { value, missing } = await pics.restore(raw);
  if (missing.length) {
    report({ id: `pictures-missing-${k}`, kind: 'open', state: 'failed', title: `${missing.length} picture${missing.length === 1 ? '' : 's'} could not be found`,
      detail: 'This browser no longer has them. The slides keep their place, so nothing else is lost; put the pictures in again, or open a backup or the copy saved online.' });
  }
  return value;
}

/** Remove pictures no lesson in this browser refers to, a minute after the studio opens (only ones over a day old). */
export function sweepPicturesSoon(): void {
  setTimeout(() => { void serial(() => pics.sweep()).catch(() => {}); }, 60_000);
}

export async function listSaved(): Promise<SavedRow[]> {
  return (await idbGet<SavedRow[]>(INDEX)) ?? [];
}

// Set by clearAll (Lecture setup → Clear everything): from then until the page reloads, nothing is
// written, so the autosave, the page-hide flush and the shell's flush cannot put the lesson back.
let cleared = false;

// The deck last written, as the object it was. The editor makes a new deck object on every edit, so the same object
// again (a flush, the page-hide save, a sync asking for the list) has nothing new: it is not written again, and its
// modified time stays when it was last changed, which is what the online sync compares (js/sync.js).
let lastWritten: Deck | null = null;

/** Why the open lesson is not being saved, or '' when it is: one saved by a newer studio is never written over here
 *  (store.ts loadDeck, core/version.ts), so a change made in this older copy cannot lose what that studio added. */
export function notSavedWhy(d: Deck): string {
  const st = useStore.getState();
  if (st.deckTooNew === null || d.id !== st.deck.id) return '';
  return 'This lesson was saved by a newer version of the studio, so this copy does not save over it. Reload the page to edit and save it';
}

/** Keep one deck under its own id, and list it for the shell's Open. */
export function persistDeck(d: Deck): Promise<SavedRow[]> {
  return serial(async () => {
    if (cleared) return [];
    // Left unwritten, quietly: opening it from the shell must still work. The autosave (saveCurrent) says why.
    if (notSavedWhy(d)) return listSaved();
    if (d === lastWritten) return listSaved();
    lastWritten = d;
    const deck = { ...d, modified: Date.now() };
    await idbSet(key(d.id), await pics.stash(deck));
    const rows = (await listSaved()).filter((r) => r.id !== d.id);
    rows.unshift({ id: d.id, title: d.title, modified: deck.modified, slides: d.slides.length, sourceId: d.sourceId, libraryGroup: d.libraryGroup });
    await idbSet(INDEX, rows);
    return rows;
  });
}

/** The deck on screen, written now: the last-open slot and its own record. */
export async function saveCurrent(): Promise<void> {
  if (cleared) return;
  const st = useStore.getState();
  const why = notSavedWhy(st.deck);
  if (why) throw new Error(why);
  await idbSet('current', await pics.stash({ deck: st.deck, slideId: st.slideId }));
  await persistDeck(st.deck);
}

/** AI Awareness Day's five strands, in the order their palettes list the colour sets. */
const STRANDS = ['safe', 'smart', 'creative', 'responsible', 'future'];

/** The campaign palette nearest a SlideForge theme, whether it wears NU London's frame, and for a
 *  campaign strand (aiad26-smart), the colour set that leads: Smart is orange, not the first set. */
function paletteFor(theme = ''): { palette: string; frame: boolean; set?: string } {
  if (theme.startsWith('northeastern')) return { palette: 'nul', frame: true };
  if (theme.startsWith('nodes')) {
    const i = ['u', 'a', 'c', 'x', 'j'].indexOf(theme.split('-')[1] ?? '');
    return { palette: 'nodes', frame: false, set: i >= 0 ? String(i + 1) : undefined };
  }
  if (theme.startsWith('ukbt-institute')) return { palette: 'ukbt-institute', frame: false };
  if (theme.startsWith('ukbt')) return { palette: 'ukbt', frame: false };
  // Street and Matchday share the palette: Matchday differs only in the pitch drawn on its dark grounds.
  if (theme.startsWith('youth-charter')) return { palette: 'youth-charter', frame: false };
  if (theme === 'studio90') return { palette: 'studio90', frame: false };
  const m = /^(aiad2[67])(?:-([a-z]+))?/.exec(theme);
  if (m) {
    const i = STRANDS.indexOf(m[2] ?? '');
    return { palette: m[1], frame: false, set: i >= 0 ? String(i + 1) : undefined };
  }
  return { palette: 'nul', frame: false };
}

/** A SlideForge lesson as the shell hands it over, with its games compiled (js/lab-engine.js): the
 *  games live in SlideForge's game store, not in the lesson, and the lab has no store of its own. */
interface ClassicDeck { id: string; title?: string; theme?: string; slides?: SFSlide[]; libraryGroup?: string; labGames?: Record<string, LessonGame> }

/** A picture's address as SlideForge wrote it, made to work from here. SlideForge's are relative to
 *  its own page (assets/lesson/…), and the lab runs a folder down (lab-app/), where the same words
 *  name a file that is not there: every lesson picture came into the lab missing. A relative address
 *  is read from the page that loads the lab, and kept as a path from the site's root, so a deck
 *  saved here still works wherever the site is served from. */
export function siteAddress(src: string): string {
  if (!src || /^(data:|blob:|[a-z][a-z0-9+.-]*:|\/|#)/i.test(src)) return src;
  try {
    const page = window.parent && window.parent !== window ? window.parent.location.href : new URL('..', location.href).href;
    return new URL(src, page).pathname;
  } catch { return src; }
}

/** A SlideForge lesson as a new lab deck. Its pictures are addresses on the slide (a URL or a data URL),
 *  not keys into a table as the Layout bank's are, so every lookup answers with the address, made to work here. */
const addresses = new Proxy({} as Record<string, string>, { get: (_, k) => (typeof k === 'string' ? siteAddress(k) : undefined) });

/** The picture and video addresses on a copy made before they were resolved: made to work here. */
function repairAddresses(d: Deck): number {
  let n = 0;
  for (const slide of d.slides) for (const l of slide.layers) {
    for (const key of ['src', 'poster'] as const) {
      const v = (l.params as Record<string, unknown>)[key];
      if (typeof v !== 'string') continue;
      const fixed = siteAddress(v);
      if (fixed !== v) { (l.params as Record<string, unknown>)[key] = fixed; n++; }
    }
  }
  return n;
}

export function convertClassic(c: ClassicDeck): Deck {
  const slides = Array.isArray(c.slides) ? c.slides : [];
  const images = addresses;
  const data: SFDeck = { key: c.id, title: c.title || 'Untitled lesson', theme: c.theme || '', slides, images, games: c.labGames };
  const { palette, frame, set } = paletteFor(c.theme);
  const deck = deckFromSlideForge(data, palette, { frame, games: '', set });
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

/** A lab copy made by an older converter brought up to date from its lesson, once per version: the
 *  feedback and timers version 1 carries, the slides later versions build (experiments), and at
 *  version 3 the theme's artwork and picture addresses that work from the lab. */
function carryOnce(d: Deck, source: ClassicDeck | null | undefined): Deck {
  const from = d.carried ?? 0;
  if (!source || !Array.isArray(source.slides)) return d;
  if (from >= CARRIED) return figuresMended(d, source);
  const copy = structuredClone(d);
  const { palette, set } = paletteFor(source.theme);
  const art = { theme: source.theme || '', title: source.title || '' };
  if (from < 1) carryDeckLive(copy, source.slides, palette, set);
  carryDeckMissing(copy, source.slides, palette, Math.max(1, from), set, art, source.labGames);
  // The artwork first: a poster it adds comes with SlideForge's address, which the repair then fixes.
  // Pieces a copy already has stay as they are, so a copy from version 3 or 4 takes only the new ones.
  if (from < 8) carryDeckArt(copy, source.slides, art);
  if (from < 8 && (source.theme ?? '').startsWith('aiad27')) pageNumbers(copy);
  if (from < 10) carryDeck27(copy, source.slides, art, palette, set);
  if (from < 11) carryDeckExperimentPresets(copy);
  // A statement set before version 6 grew past its frame when its line was a question: it fits now.
  if (from < 6) for (const sl of copy.slides) {
    const line = sl.layers.find((l) => l.name === 'Statement' && l.params.fit === 'grow');
    if (line && sl.layers.some((l) => l.name === 'Frame')) fitStatement(line, sl.layers.some((l) => l.name === 'Credit'));
  }
  if (from < 3) repairAddresses(copy);
  if (from < 7) carryDeckHidden(copy, source.slides);
  if (from < 12) carryDeckVideo(copy, source.slides);
  carryDeckFigures(copy, source.slides);
  copy.carried = CARRIED;
  return copy;
}

/** A copy already up to date whose live figure still has only its picture: a copy carried to version 15
 *  when its lesson's slide ids no longer matched, so the carry found nothing and the show refused it
 *  ("has a live figure the lesson does not carry"). Mended each time it opens until it finds them. */
function figuresMended(d: Deck, source: ClassicDeck): Deck {
  if (!d.slides.some((s) => s.liveFigure && !s.figure?.figure)) return d;
  const copy = structuredClone(d);
  return carryDeckFigures(copy, source.slides ?? []) ? copy : d;
}

function show(d: Deck) {
  useStore.getState().loadDeck(d);
  useStore.setState({ saveState: 'saved' });
}

/** One slide as a picture for SlideForge's player: what Host live, Teacher Presenter and Rehearse
 *  show until the lab has a live host of its own. */
export interface Still { id: string; sourceSlideId?: string; /** A stand-in for a SlideForge live figure: the show plays the figure. */ liveFigure?: boolean; /** That figure, as SlideForge plays it. */ figure?: Slide['figure']; image: string; notes: string; hidden: boolean; name: string; feedback?: Slide['feedback']; /** A game's slide: what the live room plays it by (src/deck/labshow.js). */ game?: Slide['game'] }

// A slide is immutable, so an unchanged one keeps its picture; the deck-wide things drawn on it
// (the header and footer, the style guide, its page number) are checked too.
// One cache per size: a share drawn small does not throw away the pictures Host live drew large.
const stillCaches = new Map<string, WeakMap<Slide, { url: string; hf: unknown; guide: unknown; page: number }>>();

/** `only`: draw just these slides (by id), as the handout and the PDF need, rather than every slide, hidden ones too. */
async function stills(width = 1600, onProgress?: (done: number, total: number) => void, quality = 0.9, only?: Set<string>): Promise<Still[]> {
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
  const todo = only ? deck.slides.filter((s) => only.has(s.id)) : deck.slides;
  for (let i = 0; i < todo.length; i++) {
    const s = todo[i];
    const page = shown.indexOf(s);
    const hit = stillCache.get(s);
    let url = hit && hit.hf === deck.headerFooter && hit.guide === deck.styleGuide && hit.page === page ? hit.url : '';
    if (!url) {
      url = renderStill(s, deck, width, 'image/jpeg', 2, quality);
      stillCache.set(s, { url, hf: deck.headerFooter, guide: deck.styleGuide, page });
      // A breath between slides, so the page stays responsive while a long deck is drawn.
      await new Promise((r) => setTimeout(r, 0));
    }
    out.push({ id: s.id, sourceSlideId: s.sourceSlideId, liveFigure: s.liveFigure, figure: s.figure ? structuredClone(s.figure) : undefined, image: url, notes: s.notes ?? '', hidden: !!s.hidden, name: s.name, feedback: s.feedback ? structuredClone(s.feedback) : undefined, game: s.game ? structuredClone(s.game) : undefined });
    onProgress?.(i + 1, todo.length);
  }
  return out;
}

/** The student copy's pictures (or the teacher's), by page id: each page's slide drawn once at 1600 wide, and each
 *  flip-side page turned over. The print handout and the PDF both use it, so a change to which pages a copy has, or
 *  how a turned-over slide is drawn, lands in both. Progress counts every picture drawn, the turned-over ones too. */
async function handoutImages(deck: Deck, teacher: boolean, onProgress?: (done: number, total: number) => void): Promise<{ pages: ReturnType<typeof handoutPages>; images: Record<string, string> }> {
  const pages = handoutPages(deck, teacher);
  const fronts = new Set(pages.filter((p) => !p.back).map((p) => p.id));
  const backs = pages.filter((p) => p.back);
  const total = fronts.size + backs.length;
  const shots = await stills(1600, (done) => onProgress?.(done, total), 0.9, fronts);
  const images: Record<string, string> = Object.fromEntries(shots.map((s) => [s.id, s.image]));
  let done = shots.length;
  for (const p of backs) {
    const slide = deck.slides.find((s) => `${s.id}:back` === p.id);
    if (slide) images[p.id] = renderStill(slide, deck, 1600, 'image/jpeg', 2, 0.9, undefined, 1);
    onProgress?.(++done, total);
    await new Promise((r) => setTimeout(r, 0));
  }
  return { pages, images };
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

/** For the visual baseline (tools/lab-baseline.mjs): the lab's built-in slides as decks to open — the
 *  gallery's layouts in every style, the lab originals, and the slide designs in two styles. */
async function checkDecks(): Promise<Deck[]> {
  const [L, fsf, bank, ml, motion, cd, sd] = await Promise.all([import('../layouts'), import('../decks/fromSlideForge'), import('../assets/layout-bank.json'), import('../decks/motionLab'), import('../assets/motion-lab.json'), import('../decks/campaignDesigns'), import('../designs/storyDesigns')]);
  const base = blankDeck();
  const deck = (id: string, slides: Slide[]): Deck => ({ ...structuredClone(base), id: `check-${id}`, title: id, slides });
  const out: Deck[] = [];
  for (const st of L.LAYOUT_STYLES) out.push(deck(`gallery-${st.id}`, L.LAYOUTS.map((l) => L.layoutFor(l, st, base))));
  out.push(deck('originals', TEMPLATES.map((t) => t.make())));
  const b = ((bank as { default?: SFDeck }).default ?? bank) as SFDeck;
  const m = ((motion as { default?: unknown }).default ?? motion) as Parameters<typeof ml.motionDesigns>[0];
  for (const st of L.LAYOUT_STYLES.slice(0, 3)) {
    out.push(deck(`designs-${st.id}`, [...sd.storyDesigns(st), ...cd.campaignDesigns(st), ...fsf.slideDesigns(b, st), ...ml.motionDesigns(m, st)].map((x) => x.slide)));
  }
  return out;
}

/** For the visual baseline: every slide of the deck on screen as a PNG, once its pictures have loaded. */
async function checkStills(width = 960): Promise<string[]> {
  const deck = useStore.getState().deck;
  const draw = () => deck.slides.map((s) => renderStill(s, deck, width, 'image/png', 2));
  draw();
  const srcs = new Set<string>();
  for (const s of deck.slides) for (const l of s.layers) {
    const src = (l.params as Record<string, unknown>)?.src;
    if (typeof src === 'string' && src && l.kind !== 'video') srcs.add(src);
  }
  await Promise.all([...srcs].map(imageSettled));
  await document.fonts?.ready;
  await new Promise((r) => setTimeout(r, 400));
  return draw();
}

/** What the shell can ask of the lab. */
export const labApi = {
  getDeck: (): Deck => useStore.getState().deck,
  /** The lab's commands for the shell's ⌘K palette: the same list, and the same handlers, as the lab's own keys (keys/). */
  commands: () => allCommands().map(({ id, label, group, keys, words, run }) => ({ id: `lab.${id}`, label, group, keys, words, run })),
  saveState: () => useStore.getState().saveState,
  isLabDeck,
  blank: (): Deck => blankDeck(),
  /** Open a document the shell hands over: a lab deck as it is, a SlideForge lesson as its lab copy.
   *  `prebuilt`: the lab copy the app ships of this built-in lesson (assets/lab-lessons/), used in
   *  place of converting it here when this browser has no copy of its own yet. */
  async open(d: unknown, prebuilt?: unknown): Promise<{ converted: boolean; dropped: number }> {
    if (isLabDeck(d)) { show(d); return { converted: false, dropped: 0 }; }
    const c = d as ClassicDeck;
    if (!c || !c.id) return { converted: false, dropped: 0 };
    const saved = await readStored<Deck>(key(`lab-${c.id}`));
    if (saved?.slides?.length) {
      const d2 = carryOnce(saved, c);
      show(d2);
      if (d2 !== saved) await persistDeck(d2);
      return { converted: false, dropped: 0 };
    }
    if (isLabDeck(prebuilt) && prebuilt.carried === CARRIED) {
      unpackPictures(prebuilt);
      // The shipped copy, made this lesson's own: its id, its original, its name and folder. Its slides
      // name the slide each came from by place ('#4', tools/build-lab-lessons.mjs), the same lesson's
      // slides in the same order (js/lesson-hash.js), so each takes this lesson's own slide id.
      const own: Deck = { ...structuredClone(prebuilt), id: `lab-${c.id}`, sourceId: c.id, title: c.title || prebuilt.title };
      const ids = (c.slides ?? []).map((s) => (s as { id?: string }).id);
      for (const s of own.slides) {
        const at = /^#(\d+)$/.exec(s.sourceSlideId ?? '');
        if (at) { if (ids[+at[1]]) s.sourceSlideId = ids[+at[1]]; else delete s.sourceSlideId; }
      }
      if (c.libraryGroup) own.libraryGroup = c.libraryGroup;
      show(own);
      await persistDeck(own);
      return { converted: false, dropped: 0 };
    }
    const deck = convertClassic(c);
    show(deck);
    await persistDeck(deck);
    return { converted: true, dropped: Math.max(0, (c.slides?.length ?? 0) - deck.slides.length) };
  },
  /** A saved lab deck; `source` is its SlideForge lesson, when the shell still has it. */
  async openSaved(id: string, source?: ClassicDeck | null): Promise<boolean> {
    const d = await readStored<Deck>(key(id));
    if (!isLabDeck(d)) return false;
    const d2 = carryOnce(d, source);
    show(d2);
    if (d2 !== d) await persistDeck(d2);
    return true;
  },
  listSaved,
  /** A SlideForge lesson converted, and nothing else: not shown, not saved. For the build of the copies
   *  the app ships (tools/build-lab-lessons.mjs). */
  convert: (c: ClassicDeck): Deck => convertClassic(c),
  /** A saved lab deck as it is stored, for the backup (js/docs.js). */
  async readSaved(id: string): Promise<Deck | null> {
    const d = await readStored<Deck>(key(id));
    return isLabDeck(d) ? d : null;
  },
  /** A deck from a backup, filed under its own id as it was (js/docs.js). */
  async restoreSaved(d: unknown): Promise<boolean> {
    if (!isLabDeck(d)) return false;
    await persistDeck(d);
    return true;
  },
  /** Every lesson this browser keeps here deleted, and the open one, and no more writes until the
   *  page reloads (the shell reloads it straight after). Lecture setup → Clear everything. */
  async clearAll(): Promise<void> {
    cleared = true;
    await serial(async () => {
      for (const k of await idbKeys()) await idbDelete(k);
    });
  },
  async remove(id: string) {
    await serial(async () => {
      await idbDelete(key(id));
      await idbSet(INDEX, (await listSaved()).filter((r) => r.id !== id));
    });
    // Its pictures, when no other lesson uses them, go too (only ones over a day old, as the opening sweep).
    void serial(() => pics.sweep()).catch(() => {});
  },
  setTitle(title: string) {
    if (useStore.getState().deck.title === title) return;
    useStore.getState().mutate((d) => { d.title = title; }, 'title');
  },
  setGroup(group: string | undefined) {
    useStore.getState().mutate((d) => { if (group) d.libraryGroup = group; else delete d.libraryGroup; });
  },
  currentSlideId: () => useStore.getState().slideId,
  /** The shell's Host live (lab-engine-plan M7 slice 3): when the studio's room runs everything in the lesson
   *  (canHostInStudio), open the studio's own show with its own room, over this frame, and say true. False: the
   *  shell says why it cannot (M14). `hooks` is what the shell lends the show. */
  hostInStudio(hooks: ShowHooks): boolean {
    const st = useStore.getState();
    if (!canHostInStudio(st.deck).ok) return false;
    openStudioShow({ room: true, slideId: st.slideId, hooks, notice: showNotice(true) });
    return true;
  },
  /** A plain show of the lesson in the studio (M11a): no room, with the Teacher Presenter window, notes on another
   *  device, Draw, black and white screens, the overview and the jump. The shell's Present, Teacher Presenter and
   *  Notes on another device call this (M15) when `whyNotPresentInStudio` says nothing. `hooks` is what the shell
   *  lends the show (exited, which carries the slide the show ended on, and toast); `first` puts the Teacher
   *  Presenter window ('desk') or the notes card ('notes') up as the show opens. */
  presentInStudio(hooks?: ShowHooks, first?: ShowFirst): boolean {
    const st = useStore.getState();
    if (!st.deck.slides.some((s) => !s.hidden)) return false;
    openStudioShow({ room: false, slideId: st.slideId, hooks, first, notice: showNotice(false) });
    return true;
  },
  /** The shell's Rehearse (M14): when the studio's room can run the lesson, open its show with its room and a
   *  simulated class of `size` joining it (rehearse/, sized as the show's own Rehearse card offers: 8, 16 or
   *  24), and say true. False: the shell says why it cannot. */
  rehearseInStudio(hooks: ShowHooks, size: number): boolean {
    const st = useStore.getState();
    if (!canHostInStudio(st.deck).ok) return false;
    const n = SIZES.reduce((best, s) => (Math.abs(s - size) < Math.abs(best - size) ? s : best), SIZES[0] as number);
    openStudioShow({ room: true, slideId: st.slideId, hooks, rehearse: n });
    return true;
  },
  /** Why Present cannot run in the studio's show ('' when it can): a live figure the studio does not play, or a
   *  lesson with no shown slide. The shell says it to the teacher (M14). */
  whyNotPresentInStudio: (): string => whyNotPresentInStudio(useStore.getState().deck),
  /** The student PDF (M12): the print document of every shown slide fully built, one to a page; the teacher copy
   *  keeps the answer slides and each slide's notes. The shell opens the window and prints it. */
  async handout(teacher = false): Promise<string> {
    const deck = useStore.getState().deck;
    const { pages, images } = await handoutImages(deck, teacher);
    return handoutHtml(deck.title, pages, images, teacher, deck.width / deck.height);
  },
  /** The lesson as Share uploads it for the studio viewer (lab-app/view.html, M12): shown slides, no notes, pictures packed. */
  shareDeck: () => shareCopy(useStore.getState().deck),
  /** Why a packed copy is over what a share may carry (core/limits.ts SHARE_LIMITS), or '' when it is within it. */
  shareTooLarge: (doc: { pictures?: string[] }) => shareTooLarge(doc),
  /** A studio room is open (its follow link can be offered), and lets a follow link watch it by a share id. */
  roomRunning,
  watchOn: (shareId: string): boolean => roomWatchOn(shareId),
  /** Why Host live would not run in the studio's room (for the shell's note to the console and the tests). */
  whyNotInStudio: (): string => canHostInStudio(useStore.getState().deck).reason,
  /** Which studio the lab is (js/lab-engine.js: the shell's Lesson studio, Quiz studio, Activities). The
   *  slide on screen stays when it is in the view; otherwise the view's first slide is shown. Entering the
   *  Quiz studio or Activities opens Engage, once. */
  setView(view: LabView) { enterView(view); },
  /** Go to one of the deck's slides by its id (the show ended on it); false when the deck has none. */
  showSlide(id: string): boolean {
    const st = useStore.getState();
    if (!st.deck.slides.some((s) => s.id === id)) return false;
    if (st.slideId !== id) useStore.setState({ slideId: id, selectedId: null });
    return true;
  },
  stills,
  outline,
  checkDecks,
  checkStills,
  /** The slide on screen saved on its own (File → Export → This slide). */
  saveSlide: (format: SlideFormat) => saveSlide(useStore.getState().slideId, format),
  /** The lesson as a PowerPoint file (export/pptx.ts): every slide a picture, or with `editableText` its
   *  plain words as text boxes over a picture drawn without them. Resolves when it has downloaded. */
  async pptx(onProgress?: (done: number, total: number) => void, editableText = false) {
    const deck = useStore.getState().deck;
    if (editableText) { await exportPptx(deck, await editableSlides(deck, onProgress), true); return; }
    const shots = await stills(1920, onProgress, 0.92);
    await exportPptx(deck, shots.map((s) => ({ image: s.image, notes: s.notes, hidden: s.hidden, name: s.name })));
  },
  /** A lesson file (BACKLOG CS-01, docs/lesson-format.md) built as a deck, not yet opened: the deck, or every
   *  problem found in the file, slide by slide. The shell opens the deck and files it in the Library. */
  async lessonDeck(text: string): Promise<{ deck: Deck | null; problems: string[]; warnings: string[] }> {
    // Whatever goes wrong, reading it, loading the quiz game or building it, comes back as the reason, not a bare
    // "could not be built".
    try {
      const { lesson, problems, warnings } = readLesson(text);
      if (!lesson) return { deck: null, problems, warnings };
      const starter = lesson.slides.some((s) => s.layout === 'quiz') ? await loadChoiceStarter() : undefined;
      const deck = deckFromLesson(lesson, starter);
      // Kept in Status, since the shell's toast fades: an icon the set does not have, shown as a square to fill in.
      if (warnings.length) report({ kind: 'open', state: 'info', title: `“${deck.title}”: ${warnings.length} thing${warnings.length === 1 ? '' : 's'} to fill in`, detail: warnings.join(' ') });
      return { deck, problems: [], warnings };
    } catch (e) {
      return { deck: null, problems: [e instanceof Error ? e.message : String(e)], warnings: [] };
    }
  },
  /** The lesson as a file to hand to another app (the shell's Send to…, BACKLOG CS-07): 'pptx' and 'pptx-edit' as
   *  Export makes them, or 'pdf', the student copy's pages (handoutPages) as a PDF file. Nothing is downloaded. */
  async file(kind: 'pptx' | 'pptx-edit' | 'pdf', onProgress?: (done: number, total: number) => void): Promise<{ name: string; blob: Blob; type: string }> {
    const deck = useStore.getState().deck;
    const base = (deck.title || 'lesson').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'lesson';
    const pptxType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    if (kind === 'pptx-edit') return { name: `${base}-editable.pptx`, blob: await buildPptx(deck, await editableSlides(deck, onProgress)), type: pptxType };
    if (kind === 'pptx') {
      const shots = await stills(1920, onProgress, 0.92);
      return { name: `${base}.pptx`, blob: await buildPptx(deck, shots.map((s) => ({ image: s.image, notes: s.notes, hidden: s.hidden, name: s.name }))), type: pptxType };
    }
    const { pages, images } = await handoutImages(deck, false, onProgress);
    const jpegs = pages.map((p) => images[p.id]).filter(Boolean).map(dataUrlBytes);
    return { name: `${base}.pdf`, blob: buildPdf(jpegs, deck.title), type: 'application/pdf' };
  },
  /** The slides of a SlideForge lesson the lab cannot build: its activities, and a game it has not been handed compiled or cannot make. */
  cannotBuild: (slides: SFSlide[], games?: Record<string, LessonGame>) => (slides ?? []).filter((s) => !convertsSlide(s, games)).map((s) => s.id).filter(Boolean) as string[],
  async flush() {
    await saveCurrent();
    useStore.setState({ saveState: 'saved' });
  },
  subscribe(cb: () => void) {
    return useStore.subscribe((s, p) => {
      if (s.deck !== p.deck || s.saveState !== p.saveState) cb();
    });
  },
};

export type LabApi = typeof labApi;

