// The question's clock on the wall: what it reads, and when it runs out. As classic's wall clock does
// (js/player.js startTimer): counted down from the moment the question is asked, the last five seconds are "hurry",
// and at zero the answer is revealed by itself (js/live.js, the player's `timeup`). Pure, so it is tested without a
// browser (lab/tests/show-wall.test.ts).

/** The last seconds, when the clock turns urgent (classic's `hurry`). */
export const LOW_SECONDS = 5;

export interface Clock {
  /** Whole seconds left, rounded up (classic's ceil). */
  left: number;
  /** Time is up: the clock reads zero. */
  over: boolean;
  low: boolean;
}

/** The clock for a question with `timeLimit` seconds, `sinceAsked` ms after it was asked. Null: no clock
 *  (no limit set, or the teacher enters answers by key, which the host sends as 0). */
export function clockOf(timeLimit: number, sinceAsked: number): Clock | null {
  if (!(timeLimit > 0)) return null;
  const left = Math.max(0, Math.ceil(timeLimit - Math.max(0, sinceAsked) / 1000));
  return { left, over: left <= 0, low: left > 0 && left <= LOW_SECONDS };
}

/** Milliseconds until the clock runs out; null with no clock. */
export function timeUpIn(timeLimit: number, sinceAsked: number): number | null {
  return timeLimit > 0 ? Math.max(0, timeLimit * 1000 - Math.max(0, sinceAsked)) : null;
}
