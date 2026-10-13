// The room's game styles, as a registry (lab-engine-plan M8). Each style the studio's room runs is one entry in
// this folder, listed once in index.ts. The host, the teacher-entry bridge, the wall's model and canHostInStudio
// read only from the entries, never from a style's name. An entry says, for its style:
//   (a) which style key and game formats it covers;
//   (b) how the host asks its question (`input`, `range`: the input the phones answer with, the slider's range);
//   (c) how a response is marked and written (`mark`, `label`: SlideForge's own markResponse and answerLabel by
//       default) and what the reveal says (`reveal`);
//   (d) what the wall draws for it (`wall`: a view model; show/WallViews.tsx draws each kind of view);
//   (e) how the teacher's entry by key becomes an answer (`manual`).
// Pure: no React, no DOM, no socket.

import { answerLabel, markResponse } from '@sf/games/registry.js';
import type { Response, TallyAnswer } from '../protocol';
import type { RoomQuiz } from '../show';
import type { TypedGroup } from '../typed';

/** One answer the teacher enters by key: an option index, the words typed for a Type answer question, a number for
 *  a Slider (`{ value }`), or null to take it back. */
export type ManualChoice = number | string | { value: number } | null;

/** What the manual window sends for one answer (docs/games/protocol.md §15.1). */
export interface ManualEntry { id?: string; playerId?: unknown; choice?: unknown; text?: unknown; value?: unknown; clear?: unknown }

/** One answer on a number line: where it stands (0-100) and the row it takes when others share its place. */
export interface LineMark { id: number; value: number; pct: number; row: number; right: boolean }
export interface LineModel {
  min: number; max: number; unit: string;
  /** The target, and the band around it, as values and as 0-100 positions along the line. */
  target: number; targetPct: number; lo: number; hi: number; loPct: number; hiPct: number;
  /** "1989 ± 3 year". */
  band: string;
  marks: LineMark[];
}

/** What the wall draws under the question. `bars`: a vote per option (`pair`: two big tiles); `typed`: what the
 *  room typed, grouped (null while the question is open); `line`: a number line (null while the question is open). */
export type WallDetail =
  | { kind: 'bars'; pair: boolean }
  | { kind: 'typed'; groups: TypedGroup[] | null }
  | { kind: 'line'; line: LineModel | null };

export interface Range { min: number; max: number; step: number; unit: string }

export interface StyleEntry {
  /** The question style the room asks (`question.style`). */
  key: string;
  /** What the style is called to the teacher. */
  name: string;
  /** The lab's game formats this entry runs. */
  formats: string[];
  /** What the phones answer with (`question.input`). */
  input: 'choice' | 'text' | 'number';
  /** Put the style's own fields on a lab question, as SlideForge's compile does (src/games). */
  prepare?(q: RoomQuiz): void;
  /** The number slider's range, for the question frame (classic sends `range` only for a number question). */
  range(q: RoomQuiz): Range | null;
  /** Whether a response is right: SlideForge's own rule. The relay only counts the verdicts. */
  mark(q: RoomQuiz, response: Response): boolean;
  /** How a response is written on the wall. */
  label(q: RoomQuiz, response: Response): string;
  /** What the reveal sends: the option that is right (-1 for an open answer) and the answer said. */
  reveal(q: RoomQuiz): { correct: number; answer: string };
  /** The wall's view of the question, from the answers in. */
  wall(q: RoomQuiz, answers: Pick<TallyAnswer, 'id' | 'response'>[], revealed: boolean): WallDetail;
  /** The teacher's entry by key as an answer to send, or undefined when it is not one for this style. */
  manual(a: ManualEntry): ManualChoice | undefined;
}

type Given = Pick<StyleEntry, 'key' | 'name' | 'formats' | 'input'> & Partial<StyleEntry>;

/** A style, with what most share filled in: marked and written by SlideForge's rules, a reveal that says the
 *  option (a choice) or the accepted answer (an open question), a bar per option on the wall, and the entry
 *  that goes with the input. */
export function defineStyle(g: Given): StyleEntry {
  const open = g.input !== 'choice';
  return {
    range: () => null,
    mark: (q, r) => markResponse(q, r),
    label: (q, r) => answerLabel(q, r),
    reveal: open ? (q) => ({ correct: -1, answer: q.answer ?? '' }) : (q) => ({ correct: q.correct, answer: q.options[q.correct] ?? '' }),
    wall: () => ({ kind: 'bars', pair: false }),
    manual: g.input === 'text' ? (a) => (typeof a.text === 'string' ? a.text : undefined)
      : g.input === 'number' ? (a) => (typeof a.value === 'number' && Number.isFinite(a.value) ? { value: a.value } : undefined)
        : (a) => (Number.isInteger(a.choice) ? (a.choice as number) : undefined),
    ...g,
  };
}
