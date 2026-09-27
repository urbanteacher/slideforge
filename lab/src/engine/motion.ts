/*
 * Reduced motion. A machine set to reduce motion (prefers-reduced-motion: reduce), or a deck or a show
 * told to, gets the calm version of every slide, as SlideForge's own player does (js/player.js,
 * js/chart-motion.js, css/app.css): entrances fade or appear rather than travel, a chart experiment
 * cross-fades between its states rather than morphing, a slide transition is a crossfade, and what
 * moves on its own — backdrop motion, effects, looping layers, a picture's slow zoom, parallax — holds
 * still. Nothing is hidden: every slide still says everything it says in full motion.
 *
 * The answer travels in FrameOpts (`reduce`), so a render that is not a show (an export, a thumbnail)
 * is never changed by the machine it was made on.
 */

/** A show's choice: follow the computer's setting, or reduce or keep full motion whatever it says. */
export type MotionSetting = 'system' | 'reduce' | 'full';

let query: MediaQueryList | null | undefined;

/** The computer's own setting, read live: turning it on mid-show calms the next frame. */
export function systemReducesMotion(): boolean {
  if (query === undefined) query = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  return !!query?.matches;
}

/** Whether a show runs reduced. The show's own choice wins; left to 'system' (or unset) it is reduced
 *  when the deck is set to reduce or the computer is. Only a show told Full — the presenter's choice
 *  for the room — overrides the computer. */
export function reducesMotion(show: MotionSetting | undefined, deck?: 'reduce'): boolean {
  if (show === 'reduce') return true;
  if (show === 'full') return false;
  return deck === 'reduce' || systemReducesMotion();
}

/** How long a reduced state change takes at most (s): a quick cross-fade, not the move. */
export const REDUCED_CHANGE = 0.35;
