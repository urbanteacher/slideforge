import { syncFrameCounters } from './frame';
import { gameSlides } from './designs/formats';
import type { GameQuestion, ShowcaseGame } from './designs/games';
import { setFrame } from './designs/kit';
import { syncHeaderFooter } from './headerFooter';
import { LAYOUT_STYLES, themeOf } from './layouts';
import type { Deck, GameLook, Slide } from './types';

// Multiple choice in its other look (types.ts GameLook): the game built again from its own questions,
// in place, as a new game is built. What the lesson hangs on it comes across slide by slide: which
// SlideForge slide it came from (the live room's bridge keeps SlideForge's copy out by it), the first
// slide's notes, and the theme's artwork ("Theme · …" layers). A cover it did not have stays off.

/** What a look is called where it is chosen. */
export const GAME_LOOKS: { value: GameLook; label: string }[] = [
  { value: 'buttons', label: 'Buttons — lit green where they stand' },
  { value: 'walls', label: 'Question, then answer on the next slide' },
];

/** The game's slides built again in `look`. The new slides, or none when there is nothing to build. */
export function relookGame(d: Deck, gameId: string, look: GameLook): Slide[] {
  const old = d.slides.filter((s) => s.game?.id === gameId);
  const g0 = old[0]?.game;
  if (!g0 || g0.format !== 'choice' || (g0.look ?? 'walls') === look) return [];
  const questions = old.filter((s) => s.game?.role === 'question' && s.game.quiz).map((s) => ({ ...(s.game!.quiz as GameQuestion), type: 'quiz' }));
  if (!questions.length) return [];
  const game: ShowcaseGame = { format: 'choice', style: 'choice', label: g0.label, styleLabel: 'Multiple choice', aim: '', howToPlay: [], title: g0.label, slides: questions, look };
  setFrame(!!d.headerFooter?.enabled || d.slides.some((s) => s.layers.some((l) => typeof l.params.hfSlot === 'string')));
  let made = gameSlides(game, themeOf(d) ?? LAYOUT_STYLES[0]);
  if (!old.some((s) => s.game?.role === 'cover')) made = made.filter((s) => s.game?.role !== 'cover');
  // The settings each question was given (its time, its points) and what the lesson hangs on it.
  const byKey = new Map(old.map((s) => [`${s.game?.role}|${s.game?.key ?? ''}`, s]));
  made.forEach((s, i) => {
    const was = byKey.get(`${s.game?.role}|${s.game?.key ?? ''}`) ?? old[Math.min(i, old.length - 1)];
    if (was.game && s.game) s.game.settings = { ...was.game.settings };
    if (was.sourceSlideId) s.sourceSlideId = was.sourceSlideId;
    const art = was.layers.filter((l) => l.name.startsWith('Theme · '));
    if (art.length) s.layers.push(...art.map((l) => structuredClone(l)));
  });
  if (old[0].notes) made[0].notes = old[0].notes;
  // The game keeps its id, so its questions stay one game in the room.
  for (const s of made) if (s.game) s.game.id = gameId;
  const at = d.slides.indexOf(old[0]);
  d.slides = [...d.slides.slice(0, at).filter((s) => s.game?.id !== gameId), ...made, ...d.slides.slice(at).filter((s) => s.game?.id !== gameId)];
  syncFrameCounters(d.slides, d.width);
  // The deck's header and footer onto the new slides, as every other slide has them.
  if (d.headerFooter?.enabled) syncHeaderFooter(d);
  return made;
}
