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
import type { QuestionFields, Response, TallyAnswer } from '../protocol';
import type { RoomQuiz } from '../show';
import type { TypedGroup } from '../typed';

/** One answer the teacher enters by key: an option index, the words typed for a Type answer question, a number for
 *  a Slider (`{ value }`), or null to take it back. */
export type ManualChoice = number | string | { value: number } | { order: number[] } | null;

/** What the manual window sends for one answer (docs/games/protocol.md §15.1). */
export interface ManualEntry { id?: string; playerId?: unknown; choice?: unknown; text?: unknown; value?: unknown; order?: unknown; clear?: unknown }

/** One answer on a number line: where it stands (0-100) and the row it takes when others share its place. */
export interface LineMark { id: number; value: number; pct: number; row: number; right: boolean }
export interface LineModel {
  min: number; max: number; unit: string;
  /** The target, and the band around it, as values and as 0-100 positions along the line. */
  target: number; targetPct: number; lo: number; hi: number; loPct: number; hiPct: number;
  /** "1989 ± 3 year". */
  band: string;
  marks: LineMark[];
  /** Time traveler: the events already placed on the line, named under it. */
  timeline?: { label: string; year: number; pct: number }[];
}

/** A ranking's reveal: the right order, and for each place how many of the room put the right item there; the pair swapped most. */
export interface SlotsModel {
  slots: { place: number; label: string; here: number }[];
  /** The answers that were a full ordering (the bars' whole). */
  total: number;
  /** The places two items were swapped between most often (zero-based), and by how many; null when none were. */
  swap: { pair: [number, number]; labels: [string, string]; n: number } | null;
}

/** The Showdown's bar: the room's votes across the two answers now, where the room stood when the split was shown (null before), and who switched. */
export interface SplitModel {
  sides: { label: string; now: number; was: number | null; right: boolean }[];
  total: number;
  switched: number;
}

/** What the wall draws under the question. `bars`: a vote per option (`pair`: two big tiles); `typed`: what the
 *  room typed, grouped (null while the question is open); `line`: a number line (null while the question is open). */
export type WallDetail =
  | { kind: 'bars'; pair: boolean; /** Nobody is marked: the reveal says the prepared answer, not who was right. */ unmarked?: boolean }
  | { kind: 'slots'; slots: SlotsModel | null }
  | { kind: 'split'; split: SplitModel }
  | { kind: 'heat'; heat: HeatModel | null }
  | { kind: 'typed'; groups: TypedGroup[] | null }
  | { kind: 'line'; line: LineModel | null };

/** Spot the error's reveal: every word of the passage with how many of the room tapped it (the heat), the error's words marked, and the answer said. */
export interface HeatModel { words: { index: number; label: string; count: number; error: boolean }[]; total: number; answer: string }

/** What the phones are told about a style beyond its question (classic's phoneCompanion): their role, what to do, a heading. */
export interface Briefing { role: string; participation: string; headPrompt: string }

/** An answer as a style reads it: who, what, and whether they said they were sure. */
export type Answer = Pick<TallyAnswer, 'id' | 'response'> & { sure?: boolean | null };

/** What the wall's view may need beyond the answers: whether the gate step was taken, and the Showdown's split and switches. */
export interface WallContext { gated: boolean; split: number[] | null; switched: number }

export interface Range { min: number; max: number; step: number; unit: string }

export interface StyleEntry {
  /** The question style the room asks (`question.style`). */
  key: string;
  /** What the style is called to the teacher. */
  name: string;
  /** The lab's game formats this entry runs. */
  formats: string[];
  /** What the phones answer with (`question.input`). */
  input: 'choice' | 'text' | 'number' | 'order' | 'tap' | 'fill' | 'sort';
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
  /** What the phones are told on this question (`at` and `question` carry it); undefined: they wait, with the question's own heading. */
  companion?(q: RoomQuiz): Briefing;
  /** False: the game has no scores slide after its last question (the show ends on it). */
  scoreSlide?: boolean;
  /** Only questions this says yes to are this style's (the game's flag on the question: `predict`, `showdown`); such an entry is tried before the others of its key. */
  match?(q: { [field: string]: unknown }): boolean;
  /** One step the teacher takes before the reveal, a frame the host sends on the first Next (`closeAnswers`: predictions locked; `showdown`: the split shown). */
  gate?: 'closeAnswers' | 'showdown';
  /** Flags the question frame carries beside the style's own (classic's `predict`, `showdown`). */
  flags?(q: RoomQuiz): Partial<QuestionFields>;
  /** The game's questions as one set, once they are all compiled (Time traveler: one line for the game, a timeline that grows). */
  link?(qs: RoomQuiz[]): void;
  /** The room is never revealed by itself (everyone answered): only the teacher reveals. */
  held?: boolean;
  /** After the reveal the room is asked this (a brainstorm prompt, classic's quick prompt); it closes when the show leaves the question. */
  afterReveal?: { prompt: string };
  /** Points the host hands the relay with the verdicts (`reveal.gains`), as [player, points]; undefined: the relay scores by the verdicts alone. */
  gains?(q: RoomQuiz, answers: Answer[]): [number, number][];
  /** The wall's view of the question, from the answers in. */
  wall(q: RoomQuiz, answers: Answer[], revealed: boolean, ctx?: WallContext): WallDetail;
  /** The teacher's entry by key as an answer to send, or undefined when it is not one for this style. */
  manual(a: ManualEntry): ManualChoice | undefined;
}

type Given = Pick<StyleEntry, 'key' | 'name' | 'formats' | 'input'> & Partial<StyleEntry>;

/** A style, with what most share filled in: marked and written by SlideForge's rules, a reveal that says the
 *  option (a choice) or the accepted answer (an open question), a bar per option on the wall, and the entry
 *  that goes with the input. */
export function defineStyle(g: Given): StyleEntry {
  const open = g.input === 'text' || g.input === 'number';
  return {
    range: () => null,
    mark: (q, r) => markResponse(q, r),
    label: (q, r) => answerLabel(q, r),
    reveal: open ? (q) => ({ correct: -1, answer: q.answer ?? '' }) : (q) => ({ correct: q.correct, answer: q.options[q.correct] ?? '' }),
    wall: () => ({ kind: 'bars', pair: false }),
    manual: g.input === 'text' ? (a) => (typeof a.text === 'string' ? a.text : undefined)
      : g.input === 'number' ? (a) => (typeof a.value === 'number' && Number.isFinite(a.value) ? { value: a.value } : undefined)
        : g.input === 'order' ? (a) => (Array.isArray(a.order) && a.order.every((v) => Number.isInteger(v)) ? { order: a.order as number[] } : undefined)
          : (a) => (Number.isInteger(a.choice) ? (a.choice as number) : undefined),
    ...g,
  };
}
