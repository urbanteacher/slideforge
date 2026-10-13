// Reactions in the studio's room, as classic has them (js/live.js on `reaction`, js/player.js showReaction): a phone's
// clap, thumbs up, wow or idea rises over the foot of the slide and is gone. Nothing accumulates: no list, no count on
// the wall, nothing in the report. The relay keeps the refusals (a fixed set of kinds, a rate per phone and a ceiling
// for the room, none while a question is open, none when the host has switched them off: server.js `react`), so the
// host only draws what arrives, and the teacher's T switches them off or on (`reactions`).

/** The kinds a phone can send (server.js REACTIONS), and what the wall draws for each (classic's REACTION_GLYPH). */
export const REACTION_GLYPH = { clap: '👏', yes: '👍', wow: '😮', idea: '💡' } as const;
export type ReactionKind = keyof typeof REACTION_GLYPH;

/** The last reaction to arrive: `n` counts up with each one, so the wall sees every arrival, even of the same kind. */
export interface Reaction { n: number; kind: ReactionKind }

/** The most glyphs in the air at once (classic's ceiling on live nodes). */
export const REACTION_CAP = 24;
/** A glyph's rise (the CSS animation, classic's 2.6 s), and the timer that clears it when a hidden tab never ends the animation. */
export const REACTION_RISE_MS = 2600;
export const REACTION_CLEAR_MS = 4000;

export function reactionKind(kind: unknown): ReactionKind | null {
  return typeof kind === 'string' && Object.prototype.hasOwnProperty.call(REACTION_GLYPH, kind) ? (kind as ReactionKind) : null;
}

/** The next reaction after `last`, or `last` unchanged when this one is not drawn: an unknown kind, reactions off, or a
 *  question open (the relay drops those anyway; classic drew none over a question slide either). */
export function nextReaction(last: Reaction | null, kind: unknown, on: boolean, phase: string | null): Reaction | null {
  const k = reactionKind(kind);
  if (!k || !on || phase === 'question' || phase === 'sprint') return last;
  return { n: (last?.n ?? 0) + 1, kind: k };
}

/** One glyph as the wall places it: scattered across the middle of the strip (clear of the corners), with classic's drift, spin and delay. */
export interface Glyph { n: number; glyph: string; left: number; drift: number; spin: number; delay: number }

export function glyphOf(r: Reaction, rand: () => number = Math.random): Glyph {
  return {
    n: r.n, glyph: REACTION_GLYPH[r.kind],
    left: 22 + rand() * 38,
    drift: Math.round((rand() * 40 - 20) * 10) / 10,
    spin: Math.round((rand() * 24 - 12) * 10) / 10,
    delay: Math.round(rand() * 120),
  };
}

/** The glyphs in the air once `r` arrives: the new one added, unless the ceiling is reached. */
export function addGlyph(air: Glyph[], r: Reaction, rand?: () => number): Glyph[] {
  if (air.length >= REACTION_CAP || air.some((g) => g.n === r.n)) return air;
  return [...air, glyphOf(r, rand)];
}

/** What the teacher is told when T switches them (classic's toast). */
export const reactionsSay = (on: boolean): string => (on ? 'Reactions on — the room can respond to what is on screen' : 'Reactions off');
