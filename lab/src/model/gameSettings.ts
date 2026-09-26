import { isBackdrop } from './backdrop';
import { centreGame } from './designs/games';
import { headingClock, setFrame } from './designs/kit';
import { DAMAGE, dripWord, emojiSupport, mindRevealSlides, relayBoss, scoringBand } from './designs/formats';
import { LAYOUT_STYLES, slideStyle, themeOf } from './layouts';
import type { Deck, GameSettings, Slide } from './types';

/*
 * A game's settings — the time, the points, the difficulty, how close counts — are not on the
 * wall; they are how the game runs. The Slide panel's Game section edits them. A change goes to the
 * question and its answer together (they share a key), or from the cover to every question, and
 * then to the parts of the wall that show it: the clock in the heading row, the eyebrow's difficulty,
 * the boss's health, which hints an emoji puzzle gives, how much of a word shows, the scoring band.
 * Nothing else on the slide is touched, so the teacher's own edits stay.
 */

/** The slides a change on `s` reaches: its question and answer, or with `every`, each question's. */
function reach(d: Deck, s: Slide, every: boolean): Slide[] {
  const g = s.game!;
  const mine = d.slides.filter((x) => x.game?.id === g.id);
  if (every) return mine.filter((x) => x.game!.role === 'question' || x.game!.role === 'answer');
  return g.key != null ? mine.filter((x) => x.game!.key === g.key) : [s];
}

/** The slide's own clock: the heading row's, or a round's ring. A heading clock is made where the
 *  games keep it — the eyebrow's row, flush right — or taken away at none. */
function setClock(d: Deck, s: Slide, seconds: number) {
  const round = s.game?.clock === 'Round';
  const at = s.layers.findIndex((l) => l.kind === 'timer' && (round ? l.name === 'Round clock' : l.name === 'Clock'));
  if (seconds > 0 && at >= 0) { s.layers[at].params.minutes = seconds / 60; return; }
  if (seconds <= 0 && at >= 0 && !round) { s.layers.splice(at, 1); return; }
  if (seconds <= 0 || round) return;
  const eb = s.layers.findIndex((l) => l.name === 'Eyebrow' && l.kind === 'text' && l.box);
  if (eb < 0) return;
  const st = slideStyle(themeOf(d) ?? LAYOUT_STYLES[0], s);
  s.layers.splice(eb + 1, 0, headingClock(st, seconds / 60, s.layers[eb].box!, String(s.layers[eb].params.color ?? st.accent), d.width));
}

/** The eyebrow's difficulty — and a boss's damage — said again after a change. */
function sayDifficulty(s: Slide, difficulty?: string, damage?: number) {
  const eb = s.layers.find((l) => l.name === 'Eyebrow' && l.kind === 'text');
  if (!eb) return;
  let text = String(eb.params.text ?? '');
  // The difficulty is its own part of the heading ("· HARD HIT ·", "· EASY ·"), never the game's name.
  if (difficulty) text = text.replace(/(· )(EASY|MEDIUM|HARD|BOSS)(?= HIT\b| ·)/, `$1${difficulty.toUpperCase()}`);
  if (damage != null) text = text.replace(/\b\d+ DAMAGE\b/, `${damage} DAMAGE`);
  eb.params.text = text;
}

/** Apply a change to a game's settings from the slide `slideId`, and to what the wall shows of it. */
export function applyGameSettings(d: Deck, slideId: string, change: GameSettings, every = false) {
  const s = d.slides.find((x) => x.id === slideId);
  if (!s?.game) return;
  const format = s.game.format;
  const c: GameSettings = { ...change };
  // Mind reveal's words are its content: its three slides are made again from them, in place, their
  // clocks kept; the header, footer and backdrop stay.
  if (c.words && format === 'mind-reveal') { remakeMindReveal(d, s, c.words); delete c.words; if (!Object.keys(c).length) return; }
  // A boss's damage follows its difficulty, unless the damage itself is what changed.
  if (format === 'boss-battle' && c.difficulty && c.damage == null) c.damage = DAMAGE[c.difficulty] ?? 1;
  for (const x of reach(d, s, every)) {
    const g = x.game!;
    g.settings = { ...g.settings, ...c };
    for (const k of Object.keys(c) as (keyof GameSettings)[]) if (c[k] === undefined) delete g.settings[k];
    const asked = g.role === 'question' || g.role === 'board';
    if ('seconds' in c && asked && g.clock !== 'none') setClock(d, x, c.seconds ?? 0);
    if (c.difficulty || c.damage != null) sayDifficulty(x, c.difficulty, format === 'boss-battle' ? g.settings.damage : undefined);
    if (c.difficulty && format === 'emoji-guess' && g.role === 'question') emojiSupport(x, c.difficulty);
    if (c.difficulty && format === 'word-reveal' && g.role === 'question') dripWord(x, c.difficulty);
    if ('tolerance' in c && g.role === 'answer') scoringBand(x);
  }
  if (format === 'boss-battle' && (c.difficulty || c.damage != null)) relayBoss(d.slides.filter((x) => x.game?.id === s.game!.id));
}

function remakeMindReveal(d: Deck, s: Slide, words: string[]) {
  const mine = d.slides.filter((x) => x.game?.id === s.game!.id && x.game.role !== 'cover');
  if (!mine.length) return;
  setFrame(!!d.headerFooter?.enabled || d.slides.some((x) => x.layers.some((l) => typeof l.params.hfSlot === 'string')));
  const st = slideStyle(themeOf(d) ?? LAYOUT_STYLES[0], mine[0]);
  const secs = (key: string) => mine.find((x) => x.game!.key === key)?.game!.settings.seconds;
  const made = centreGame(mindRevealSlides(st, s.game!.label, { words, studySeconds: secs('study'), recallSeconds: secs('recall') }));
  for (const x of mine) {
    const m = made.find((y) => y.game!.key === x.game!.key);
    if (!m) continue;
    const own = m.layers.filter((l) => !isBackdrop(l)), back = x.layers.filter(isBackdrop), chrome = x.layers.filter((l) => l.params.hfSlot);
    x.layers = [own[0], ...back, ...own.slice(1), ...chrome];
    x.notes = m.notes;
    x.game!.settings = { ...x.game!.settings, words: [...words] };
  }
}
