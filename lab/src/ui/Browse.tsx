import { Gamepad2, Plus, Search, Timer } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ActivityData, ActivityEntry, ActivityOption, ShowcaseGame } from '../model/designs';
import { LAYOUT_STYLES, themeOf } from '../model/layouts';
import { fontString } from '../engine/raster';
import { renderStill } from '../export/exporters';
import { useStore } from '../model/store';
import type { Deck, Slide } from '../model/types';
import { Fold } from './LeftPanel';

// Browse: the Quiz studio's games and Activities' activities, in the left pane the lesson's layers
// have in the Lesson studio. The one place a game or an activity is chosen: each card is the design
// itself, drawn by the engine in the lesson's own style, and Add puts its slides into the lesson after
// the slide on screen, where the rest of the studio edits it. Built for the lab, not carried over:
// SlideForge's two catalogue dialogs listed names and icons, and a pop-up over the canvas is not how
// the lab edits (it works on the canvas and in the side panels).

type Lib = { data: ActivityData; games: ShowcaseGame[]; m: typeof import('../model/designs') };

let loaded: Promise<Lib> | null = null;
/** The catalogues and the designs that build them, loaded the first time either is browsed. */
function loadLib(): Promise<Lib> {
  loaded ??= Promise.all([import('../model/designs'), import('../assets/activities.json'), import('../assets/games.json')]).then(([m, d, gj]) => {
    const data = (d as { default: ActivityData }).default ?? (d as unknown as ActivityData);
    const all = [...((gj as { default: { games: ShowcaseGame[] } }).default ?? (gj as unknown as { games: ShowcaseGame[] })).games, ...m.LAB_GAMES];
    // Every game SlideForge plays, in the Engage tab's order (designs/formats.ts).
    const games = m.GAMES.map((f) => all.find((g) => g.format === f)).filter((g): g is ShowcaseGame => !!g);
    return { data, games, m };
  });
  return loaded;
}

/** Whether the deck wears a header and footer, which the designs keep clear of; without one they bleed to the edge. */
const framed = (deck: Deck) => !!deck.headerFooter?.enabled || deck.slides.some((s) => s.layers.some((l) => typeof l.params.hfSlot === 'string'));

/** The designs measure their words to size them, so the theme's faces are loaded first. */
async function faces(deck: Deck) {
  const st = themeOf(deck) ?? LAYOUT_STYLES[0];
  const load = (font: string, weight: string | number) => document.fonts?.load(fontString({ font, weight }, 100)).catch(() => []);
  await Promise.all([load(st.display, st.displayWeight), load(st.body, 400), load(st.body, 600), load(st.body, 700)]);
}

/** Put slides into the lesson after the slide on screen, and show the first. */
function place(slides: Slide[], toast: string) {
  const { addSlide, showToast } = useStore.getState();
  // Each goes after the one before it: addSlide puts a slide after the one on screen and moves there.
  slides.forEach((s) => addSlide(s));
  if (slides[0]) useStore.setState({ slideId: slides[0].id, selectedId: null });
  showToast(toast);
}

/* What kind of game each format is, for the filters: a format can be two (Beat the Clock is a game
   and a quick quiz). The groups SlideForge's catalogue used, so the two name them alike. */
const GAME_GROUPS: Record<string, string[]> = {
  choice: ['quiz'], truefalse: ['quiz'], type: ['quiz'], slider: ['quiz'], 'true-false': ['game', 'quiz'],
  'low-stakes-quiz': ['quiz'], 'quiz-bowl': ['game'], 'beat-the-clock': ['game', 'quiz'], 'boss-battle': ['game'],
  'horse-race': ['game'], 'memory-flip': ['memory'], 'memory-match': ['memory'], bingo: ['game'],
  'knowledge-flip': ['memory'], 'definition-challenge': ['memory', 'word'], 'emoji-guess': ['word'],
  'word-reveal': ['word'], 'fill-in-the-blanks': ['quiz', 'word'], 'heads-up': ['talk', 'word'],
  'spin-explain': ['talk'], 'spot-the-error': ['quiz'], ranking: ['quiz'], 'odd-one-out': ['talk'],
  'compare-contrast': ['talk'], 'predict-outcome': ['quiz'], 'time-traveler': ['quiz'], 'connection-maker': ['talk'],
  'question-cube': ['talk'], 'random-challenge': ['talk'], 'concept-chain': ['talk'], 'mind-reveal': ['memory'],
};
const GAME_FILTERS: [string, string][] = [['all', 'All'], ['quiz', 'Quizzes'], ['game', 'Games'], ['memory', 'Memory'], ['word', 'Word'], ['talk', 'Discuss']];
const ACTIVITY_TYPES: [string, string][] = [['all', 'All'], ['slide', 'Slides'], ['game', 'Games'], ['feedback', 'Feedback'], ['moment', 'In the room'], ['slide-arc', 'Slide runs']];

/** One card: what it is, the design as the engine draws it, and when open, how to run it and Add. */
interface Card {
  id: string; title: string; kind: string; blurb: string; steps: string[];
  game: boolean;
  /** The designs it comes in (an activity: the lab's and SlideForge's); a game has one. */
  options: { id: string; label: string; make: () => Slide[] }[];
  toast: (n: number, label: string) => string;
}

type Style = NonNullable<ReturnType<typeof themeOf>>;

function gameCard(lib: Lib, g: ShowcaseGame, st: Style): Card {
  return {
    id: 'g:' + g.format, title: g.label, kind: g.styleLabel, blurb: g.aim, steps: g.howToPlay ?? [], game: true,
    options: [{ id: 'lab', label: 'Add', make: () => lib.m.gameSlides(g, st) }],
    toast: (n) => `${g.label} added: ${n} slides. Each click moves the game on; the answers and the reasons are in the notes.`,
  };
}

function activityCard(lib: Lib, a: ActivityEntry, st: Style): Card {
  return {
    id: 'a:' + a.key, title: a.title, kind: [a.phaseLabel, a.minutes ? `${a.minutes} min` : ''].filter(Boolean).join(' · '),
    blurb: a.blurb, steps: a.steps ?? [], game: !!a.game,
    options: lib.m.optionsFor(a).map((o: ActivityOption) => ({ id: o.id, label: o.label, make: () => o.make(st) })),
    toast: (n, label) => `${a.title} (${label}) added: ${n} ${n === 1 ? 'slide' : 'slides'}. Edit it on the slide; how to run it is in the notes.`,
  };
}

/** A card's picture: the design's first slide the room sees — a game's first question, not its cover,
 *  which every game shares. */
const pictured = (c: Card, slides: Slide[]) => (c.game && slides.length > 1 ? slides[1] : slides[0]);

/** Pictures drawn one a frame, for the cards on screen, so the list opens at once and fills in. */
function usePictures(cards: Card[], deck: Deck, ready: boolean) {
  const [pics, setPics] = useState<Record<string, string>>({});
  const cache = useRef(new Map<string, string>());
  const style = themeOf(deck)?.id ?? '';
  useEffect(() => { cache.current.clear(); setPics({}); }, [style, deck.width, deck.height]);
  useEffect(() => {
    if (!ready) return;
    let i = 0, raf = 0;
    const step = () => {
      while (i < cards.length && cache.current.has(cards[i].id)) i++;
      const c = cards[i];
      if (!c) return;
      let url = '';
      try { const s = pictured(c, c.options[0].make()); url = s ? renderStill(s, deck, 360, 'image/jpeg', 2.5, 0.8) : ''; } catch (e) { console.warn(e); }
      cache.current.set(c.id, url);
      setPics((m) => ({ ...m, [c.id]: url }));
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [cards, deck, ready]);
  return pics;
}

/** Whether Browse is open, kept between visits: the pane holds it as one section, beside others to come. */
const OPEN_KEY = 'sf-browse-open';
const OPEN_EVENT = 'sf-browse-open';
function useOpen() {
  const [open, setOpen] = useState(() => { try { return localStorage.getItem(OPEN_KEY) !== '0'; } catch { return true; } });
  useEffect(() => { try { localStorage.setItem(OPEN_KEY, open ? '1' : '0'); } catch { /* private mode */ } }, [open]);
  // Asked for by the studio's + buttons and Engage (focusBrowse): open, then the search takes the keys.
  useEffect(() => {
    const ask = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, ask);
    return () => window.removeEventListener(OPEN_EVENT, ask);
  }, []);
  return [open, setOpen] as const;
}

/** The Quiz studio's and Activities' left pane: Browse, as one section that folds away. */
export function BrowsePanel({ kind }: { kind: 'games' | 'activities' }) {
  const [shown, setShown] = useOpen();
  const games = kind === 'games';
  return (
    <aside className="left" aria-label={games ? 'Quiz studio' : 'Activities'}>
      <Fold title={games ? 'Browse games' : 'Browse activities'} className="fold-browse" open={shown} onToggle={() => setShown(!shown)}>
        <Browse kind={kind} />
      </Fold>
    </aside>
  );
}

/** The games or the activities, found, filtered, pictured and added. */
function Browse({ kind }: { kind: 'games' | 'activities' }) {
  const deck = useStore((s) => s.deck);
  const [lib, setLib] = useState<Lib | null>(null);
  const [fonts, setFonts] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [phase, setPhase] = useState('all');
  const [open, setOpen] = useState<string | null>(null);
  const style = themeOf(deck)?.id;
  useEffect(() => { let live = true; loadLib().then((l) => { if (live) setLib(l); }); return () => { live = false; }; }, []);
  useEffect(() => { let live = true; setFonts(false); faces(deck).then(() => { if (live) setFonts(true); }); return () => { live = false; }; }, [style]);
  useEffect(() => { setFilter('all'); setPhase('all'); setOpen(null); }, [kind]);

  const st = themeOf(deck) ?? LAYOUT_STYLES[0];
  const frame = framed(deck);
  // The deck's style and frame decide the designs; its other edits do not.
  const all = useMemo(() => {
    if (!lib) return [];
    lib.m.setFrame(frame);
    return kind === 'games' ? lib.games.map((g) => gameCard(lib, g, st)) : lib.data.activities.map((a) => activityCard(lib, a, st));
  }, [lib, kind, st, frame]);

  const phases = useMemo(() => (lib ? lib.m.byPhase(lib.data).map((p) => ({ id: p.phase, label: `${p.icon} ${p.label}` })) : []), [lib]);
  const cards = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((c) => {
      if (q && !`${c.title} ${c.kind} ${c.blurb}`.toLowerCase().includes(q)) return false;
      if (kind === 'games') return filter === 'all' || (GAME_GROUPS[c.id.slice(2)] ?? ['game']).includes(filter);
      const a = lib!.data.activities.find((x) => 'a:' + x.key === c.id)!;
      return (filter === 'all' || a.target === filter) && (phase === 'all' || a.phase === phase);
    });
  }, [all, query, filter, phase, kind, lib]);
  const pics = usePictures(cards, deck, !!lib && fonts);

  const add = async (c: Card, o: Card['options'][number]) => {
    await faces(useStore.getState().deck);
    lib!.m.setFrame(framed(useStore.getState().deck));
    const slides = o.make();
    place(slides, c.toast(slides.length, o.label));
  };

  const games = kind === 'games';
  const filters = games ? GAME_FILTERS : ACTIVITY_TYPES;
  return (
    <div className="browse" aria-label={games ? 'Browse games' : 'Browse activities'}>
      <div className="browse-count">{lib ? `${cards.length} of ${all.length}` : ''}</div>
      <label className="browse-find"><Search size={13} /><input type="search" placeholder={games ? 'Find a game…' : 'Find an activity…'} value={query} onChange={(e) => setQuery(e.target.value)} aria-label={games ? 'Find a game' : 'Find an activity'} /></label>
      <div className="browse-chips" role="radiogroup" aria-label={games ? 'Kind of game' : 'Kind of activity'}>
        {filters.map(([id, label]) => <button key={id} role="radio" aria-checked={filter === id} className={filter === id ? 'on' : ''} onClick={() => setFilter(id)}>{label}</button>)}
      </div>
      {!games && (
        <select className="browse-phase" value={phase} onChange={(e) => setPhase(e.target.value)} aria-label="Lesson phase">
          <option value="all">Every phase of the lesson</option>
          {phases.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      )}
      <div className="panel-scroll browse-list">
        {!lib && <div className="hint browse-hint">Loading the {games ? 'games' : 'activities'}…</div>}
        {lib && !cards.length && <div className="hint browse-hint">Nothing matches. Clear the search or pick All.</div>}
        {cards.map((c) => {
          const isOpen = open === c.id;
          return (
            <article key={c.id} className={`browse-card${isOpen ? ' open' : ''}`}>
              <button className="browse-card-head" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : c.id)} title={c.blurb}>
                <div className="browse-pic">{pics[c.id] ? <img src={pics[c.id]} alt="" draggable={false} /> : <span className="browse-pic-wait" />}</div>
                <div className="browse-card-text">
                  <b>{c.game ? <Gamepad2 size={12} /> : <Timer size={12} />}{c.title}</b>
                  <small>{c.kind}</small>
                  <span>{c.blurb}</span>
                </div>
              </button>
              {isOpen && (
                <div className="browse-card-body">
                  {c.steps.length > 0 && <ol className="browse-steps">{c.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>}
                  <div className="browse-add">
                    {c.options.map((o) => (
                      <button key={o.id} className={`btn-soft${o.id === 'lab' ? ' accent' : ''}`} onClick={() => add(c, o)} title={c.options.length > 1 ? `Add it in this design: ${o.label}` : 'Add it after the slide on screen'}>
                        <Plus size={13} />{c.options.length > 1 ? o.label : 'Add to the lesson'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

/** Focus Browse's search: the studio's empty view, and Engage in the Lesson studio, send you here. */
export function focusBrowse() {
  window.dispatchEvent(new Event(OPEN_EVENT));
  requestAnimationFrame(() => requestAnimationFrame(() => document.querySelector<HTMLInputElement>('.browse-find input')?.focus()));
}
