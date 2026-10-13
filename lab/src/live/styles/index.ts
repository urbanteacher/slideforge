// The registry of the game styles the studio's room runs. A new style is one file in this folder and one line in
// STYLES (plus, when its wall needs a view the wall does not have yet, that view in show/WallViews.tsx).
import { boss } from './boss';
import { choice } from './choice';
import { compare } from './compare';
import { definition } from './definition';
import { emoji } from './emoji';
import { fill } from './fill';
import { oddone } from './oddone';
import { order } from './order';
import { predict } from './predict';
import { race } from './race';
import { randomchallenge } from './randomchallenge';
import { showdown } from './showdown';
import { spinexplain } from './spinexplain';
import { spot } from './spot';
import { slider } from './slider';
import { timetraveler } from './timetraveler';
import { truefalse } from './truefalse';
import { type } from './type';
import { wordreveal } from './wordreveal';
import type { StyleEntry } from './types';

export const STYLES: StyleEntry[] = [choice, truefalse, type, slider, order, oddone, predict, showdown, timetraveler, spot, definition, emoji, fill, compare, race, boss, wordreveal, randomchallenge, spinexplain];

/** The entry for a game format of the lab (`slide.game.format`), or undefined when the room does not run it. */
export const styleForFormat = (format: string): StyleEntry | undefined => STYLES.find((s) => s.formats.includes(format));

/** The entry a question is asked and marked by: its style when that is one, else the first that takes its input. */
export function styleOf(q: { style?: string; input?: string; [field: string]: unknown }): StyleEntry | undefined {
  const input = q.input ?? 'choice';
  // An entry that answers for a flag on the question (Predict the outcome, the Showdown) is tried first; the rest are by key.
  const plain = STYLES.filter((s) => !s.match);
  return STYLES.find((s) => s.match?.(q) && s.input === input) ?? plain.find((s) => s.key === q.style && s.input === input) ?? plain.find((s) => s.input === input);
}

/** The entry for a question, Multiple choice for one no entry takes (the room never asks it, but its wall and marks must not fail). */
export const styleFor = (q: { style?: string; input?: string }): StyleEntry => styleOf(q) ?? choice;

/** "A, B or C": the styles' names, for a message. */
export function styleNames(): string {
  const n = STYLES.map((s) => s.name);
  return n.length > 1 ? `${n.slice(0, -1).join(', ')} or ${n[n.length - 1]}` : n[0] ?? '';
}

export type { Answer, GapsModel, HeatModel, LineMark, LineModel, SlotsModel, SortModel, SplitModel, WallContext, ManualChoice, ManualEntry, Range, StyleEntry, WallDetail } from './types';
