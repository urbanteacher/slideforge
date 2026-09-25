import { syncFrameCounters } from './frame';
import { gameSlides, LAB_GAMES } from './designs/formats';
import type { ShowcaseGame } from './designs/games';
import { setFrame } from './designs/kit';
import { LAYOUT_STYLES, themeOf } from './layouts';
import type { Deck, Slide } from './types';

/*
 * A game written from a topic, as SlideForge's Quiz studio writes one.
 *
 * The lab has no AI of its own. Inside SlideForge it runs in SlideForge's page, which has the writer
 * (js/ai.js: generateQuestionsForGame, with its per-format rules and checks, and the server's key)
 * and the compiler (SF.compileGame: the intro, How to play, each question or the board, in the room's
 * order — what lab/src/assets/games.json holds for the sample games). So the questions are written
 * and compiled there, exactly as for a SlideForge game, and designed here, as the Engage tab designs
 * one: the game's slides are made again in their place, in the deck's style.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type Host = {
  AI: { generateQuestionsForGame: (game: any, opts: any) => Promise<{ questions?: any[]; error?: string; rejected?: number }>; checkLiveAI?: () => Promise<boolean>; gameSpecFor?: (g: any) => any };
  compileGame: (game: any, opts?: any) => any[];
  makeGame: (title: string, style: string) => any;
  FORMAT_STYLE: Record<string, string>;
};

/** SlideForge, when the lab is running inside it; null in the lab on its own. */
function host(): Host | null {
  const tryOf = (w: any) => (w && w.SF && w.SF.AI && w.SF.compileGame && w.SF.makeGame && w.SF.FORMAT_STYLE ? w.SF as Host : null);
  try { return tryOf(window) ?? (window.parent !== window ? tryOf(window.parent) : null); } catch { return null; }
}

/** Whether the game can be written with AI here: inside SlideForge, for a format its writer knows. */
export function canWrite(format: string): 'yes' | 'no-host' | 'no-format' {
  const sf = host();
  if (!sf) return 'no-host';
  const style = sf.FORMAT_STYLE[format];
  if (!style || LAB_GAMES.some((g) => g.format === format)) return 'no-format';
  if (sf.AI.gameSpecFor && !sf.AI.gameSpecFor({ style, format })) return 'no-format';
  return 'yes';
}

// SlideForge's slide, kept to what it says and how the room answers it (tools/lab-games.mjs).
const DROP = new Set(['id', 'transition', 'layers', 'gameId', 'videoStart', 'videoEnd', 'videoLoop', 'videoMuted', 'videoAutoplay']);
const empty = (v: any) => v === '' || v == null || (Array.isArray(v) && !v.length) || (typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length);
function clean(v: any): any {
  if (Array.isArray(v)) return v.map(clean);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).filter(([k, x]) => !DROP.has(k) && !empty(x) && typeof x !== 'function').map(([k, x]) => [k, clean(x)]));
  return v;
}

/** Write a game on a topic: SlideForge's questions, compiled by SlideForge, as the lab's sample game shape. */
export async function writeGame(base: ShowcaseGame, topic: string, notes = ''): Promise<{ game?: ShowcaseGame; error?: string; rejected?: number }> {
  const sf = host();
  if (!sf) return { error: 'Writing with AI works when the studio is open inside SlideForge.' };
  const style = sf.FORMAT_STYLE[base.format];
  if (!style) return { error: `${base.label} is not written by AI yet.` };
  const t = topic.trim();
  if (!t) return { error: 'Give it a topic to write about.' };
  const res = await sf.AI.generateQuestionsForGame({ style, format: base.format, title: t, questions: [] }, { topic: t, notes });
  if (!res || res.error || !res.questions?.length) return { error: res?.error || 'Nothing came back. Try a narrower topic.' };
  const game = sf.makeGame(t, style);
  game.format = base.format;
  game.questions = res.questions;
  // The room's view, as the sample games are compiled: intro and How to play on, scoring off.
  game.settings = { ...game.settings, intro: true, howTo: true, scoreboard: false, scoreSlide: false };
  const slides = sf.compileGame(game).map(clean);
  return { game: { ...base, title: t, slides }, rejected: res.rejected };
}

/** The game `gameId` made again from `game`, in the same place in the deck, in the deck's style. */
export function replaceGame(d: Deck, gameId: string, game: ShowcaseGame): Slide[] {
  const at = d.slides.findIndex((s) => s.game?.id === gameId);
  if (at < 0) return [];
  setFrame(!!d.headerFooter?.enabled || d.slides.some((s) => s.layers.some((l) => typeof l.params.hfSlot === 'string')));
  const made = gameSlides(game, themeOf(d) ?? LAYOUT_STYLES[0]);
  d.slides = [...d.slides.slice(0, at).filter((s) => s.game?.id !== gameId), ...made, ...d.slides.slice(at).filter((s) => s.game?.id !== gameId)];
  syncFrameCounters(d.slides, d.width);
  return made;
}
