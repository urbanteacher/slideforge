// The live room's wire protocol, as the lab host speaks it (docs/games/protocol.md, M0.2). Only what a
// Multiple choice or Type answer session needs, plus rehost and reconnect. The relay (server/server.js), the phones
// (join.html) and the teacher-entry window (manual.html) do not change (hard rule 5): these are the
// shapes they already accept and send. Section numbers are the protocol doc's.

import type { Recipient } from './spoken';

/** A player's response as the relay stores it. Choice: the option index. */
export type Response = number | string | number[];

/** One answer in a `tally` or `markStale` (§6.3). */
export interface TallyAnswer { id: number; name: string; team: number | null; response: Response; sure: boolean | null; elapsedMs: number }

/** One row of the roster in `players` (§4.2). */
export interface PlayerRow { id: number; name: string; score: number; connected: boolean; away: boolean; manual: boolean; team: number | null; correct?: number }

/** One row of `players.rows` (§4.2): a player's, or in teams mode a team's (`ci` is the team's index). */
export interface ScoreRow { key: string; name: string; score: number; ci?: number; members?: number; accuracy?: number; answered?: number; asked?: number; gained?: number }

/** What a `at` says about the slide on the wall (§5). */
export interface AtFields {
  slideId: string; title: string; n: number; total: number;
  activity: 'content' | 'question' | 'feedback' | 'moment';
  text: string; step: number; style: string; role: string; participation: string; headPrompt: string;
  stage: null;
}

/** The phone companion fields an `idle` carries (§10). */
export interface Companion { style: string; role: string; participation: string; headPrompt: string }

/** A `question` (§6.1), multiple choice or typed, with the fields and the values classic sends (`js/live.js` sendOpenQuestion). */
export interface QuestionFields {
  id: string; n: number; total: number; question: string;
  voteOnly: boolean; unmarked: boolean; sourceSlideId: string;
  input: 'choice' | 'text' | 'number' | 'order' | 'tap' | 'fill' | 'sort'; spoken: boolean; gameId: string; scoreSpoken: boolean; participation: string;
  confidence: boolean; range: { min: number; max: number; step: number; unit: string } | null; options: string[]; timeLimit: number; points: number; style: string;
  headPrompt?: string;
  /** Predict the outcome / True or false showdown / Time traveler: the flags classic's question frame carries. */
  predict?: true; showdown?: true; timeTravel?: true; timeline?: unknown[];
  /** Emoji guess: the clues as the phone draws them. */
  clueMode?: 'emoji'; clues?: string;
  /** Fill the gaps: the text around the gaps. Compare & contrast's sort: the three columns. */
  fillParts?: string[]; bins?: string[];
  /** Heads up: the term (every phone but the guesser's shows it), the guesser, and the seconds left of the round. */
  term?: string; guesser?: number; roundLeft?: number;
}

/** A feedback `prompt` (§9): what the room is asked, with the fields classic sends (js/live.js syncPrompt). `ends` is a scale's two
 *  labels, null for the others. */
export interface PromptFields {
  id: string; kind: 'poll' | 'wordcloud' | 'brainstorm' | 'scale'; prompt: string; options: string[];
  ends: { low: string; high: string } | null; max: number; presentAs: 'rail' | 'focus'; hold?: boolean;
  /** A prompt the teacher's room opens itself (not a slide's): classic's quick prompt, with the fields it carries. */
  custom?: true; origin?: string; stage?: string; shape?: string; from?: string; quiet?: boolean;
}

/** The digest in `responses` (§9): the room's replies as the relay sums them. */
export type Digest =
  | { kind: 'poll' | 'scale'; counts: number[]; total: number }
  | { kind: 'wordcloud'; words: { text: string; n: number }[]; total: number; unique: number }
  | { kind: 'brainstorm'; items: { name: string; pid: number; text: string; seq: number }[]; total: number };

/** A teacher's answer by key (§6.4): an option, the words typed for a Type answer question, or the number for a Slider; `clear` takes it back. */
export interface ManualAnswerFields { id: string; playerId: number; choice?: number; text?: string; value?: number; order?: number[]; fill?: number[]; sort?: number[]; clear?: boolean }

/** H→R: what the host sends. */
export type HostMessage =
  | { t: 'host'; title: string; mode: 'individual' | 'teams'; teams: { name: string }[] }
  | { t: 'rehost'; pin: string; hostToken: string }
  | { t: 'begin' }
  | { t: 'round'; gameId: string }
  | ({ t: 'at' } & AtFields)
  | ({ t: 'idle' } & Companion)
  | ({ t: 'question' } & QuestionFields)
  | { t: 'reveal'; id: string; rev: number; marks: [number, boolean][]; correct: number; answer: string; explanation: string; gains?: [number, number][]; spoken?: { recipient: Recipient } }
  /** A spoken question's verdict names who spoke; Heads up's guesser is picked before the verdict (§6.5). */
  | { t: 'guesser'; id: number | null }
  /** Concept chain: an accepted link, credited while the term is still open (§ oralCredit). */
  | { t: 'oralCredit'; id: string; gameId: string; style: 'conceptchain'; recipient: Recipient; scoreSpoken: boolean }
  | { t: 'closeAnswers'; id: string }
  | { t: 'showdown'; id: string }
  | { t: 'hintOut'; id: string }
  | { t: 'manualAdd'; names: string[]; team: number }
  | ({ t: 'manualAnswer' } & ManualAnswerFields)
  | { t: 'manualRename'; playerId: number; name: string }
  | { t: 'manualTeam'; playerId: number; team: number }
  | { t: 'manualRemove'; playerId: number; mode: 'kick' | 'delete' }
  | { t: 'manualTally'; id: string; counts: number[] }
  | { t: 'report' }
  | { t: 'finish'; title: string; note?: string; kind?: string }
  /** A race's lanes after a reveal: the track's length, and each lane's key (`t<team>` or `p<player>`) and place (§ raceLanes). */
  | { t: 'raceLanes'; length: number; rows: [string, number][] }
  /** A verdict the report keeps and no phone sees: the boss's hit or miss on a reveal (`oral`). */
  | { t: 'oral'; slideId: string; title: string; kind: string; set: number; card: number; term: string; participant: string | null; right: boolean; value: number }
  /** Beat the clock's self-paced sprint (K29, §8): the run's questions and their key, handed to the relay, which marks each phone's taps; `sprintEnd` stops its clock. */
  | { t: 'sprint'; id: string; gameId: string; seconds: number; questions: SprintQuestion[] }
  | { t: 'sprintEnd' }
  | ({ t: 'prompt' } & PromptFields)
  | { t: 'promptEnd' }
  | { t: 'end' };

/** One question of a sprint, with its key (`correct`): the relay marks the taps against it. */
export interface SprintQuestion { id: string; question: string; options: string[]; correct: number }
/** The relay's count of a sprint's taps: answers and right ones in, phones finished, phones playing, questions in the run. */
export interface SprintProgress { id: string; answers: number; right: number; finished: number; playing: number; of: number }
/** A sprint closed (its clock ran out, or `sprintEnd`): the room's totals, and per question how many answered, how many were wrong, and the wrong answer chosen most. */
export interface SprintResult { id: string; gameId: string; answers: number; right: number; questions: { id: string; answered: number; wrong: number; lure: string; lureN: number }[] }

export interface Session { id: string; token?: string; title: string; createdAt: number }

/** R→H: what the relay sends the host. Anything else arrives as `Other` and is ignored. */
export type RelayMessage =
  | { t: 'hosted'; session: Session; hostToken: string; pin: string; joinUrl: string; mode: string; teams: string[] }
  | { t: 'rehosted'; phase: Phase; pin: string; hostToken: string; joinUrl: string; mode: string; teams: string[]; title?: string; session: Session; question?: { id: string; revealed: boolean; closed: boolean; split: boolean } | null }
  | { t: 'rehostFailed'; reason: string }
  | { t: 'error'; message: string }
  | { t: 'players'; pin: string; joinUrl: string; joinOpen: boolean; waiting: number; round: number; list: PlayerRow[]; mode: string; rows: ScoreRow[]; counts: number[] | null }
  | { t: 'tally'; id: string; counts: number[] | null; answered: number; sured: number; total: number; split: unknown; switched: number; waiting: number; allIn: boolean; manual: boolean; rev: number; answers: TallyAnswer[] }
  | { t: 'markStale'; id: string; rev: number; answers: TallyAnswer[] }
  | { t: 'manualError'; message: string; playerId?: number; id?: string }
  | { t: 'teamAnswers'; correct: number; counts: number[][] }
  /** A spoken verdict the relay counted: how many the game has had accepted (§ oralCount). */
  | { t: 'oralCount'; gameId: string; slideId: string; kind: string; count: number; accepted: boolean }
  | ({ t: 'responses'; id: string; answered: number; players: number } & Digest)
  /** The sprint as the relay marks it: the room's taps so far, and at time the result (§8). */
  | ({ t: 'sprintProgress' } & SprintProgress)
  | ({ t: 'sprintResult' } & SprintResult)
  | { t: 'sessionReport'; report: unknown }
  | { t: 'sessionClosed'; report: unknown }
  | Other;
export interface Other { t: 'recording' | 'bookmarks' | 'signals' | 'qa' | 'reaction'; [field: string]: unknown }

/** The room's phase (§2), as the relay keeps it and the host follows it. */
export type Phase = 'lobby' | 'running' | 'question' | 'revealed' | 'idle' | 'sprint';

/** The team names classic hosts with when the deck says none (src/model.js makeQuizConfig). */
export const DEFAULT_TEAMS = ['Red', 'Blue', 'Green', 'Yellow'];

/** How long classic waits after `end` before it closes its socket, so `sessionClosed` arrives (§11). */
export const END_CLOSE_MS = 1500;
/** How long classic waits for confidence taps before an automatic reveal (§17, step 9). */
export const SURE_GRACE_MS = 5000;

export function parseRelay(raw: unknown): RelayMessage | null {
  try {
    const m = JSON.parse(String(raw)) as RelayMessage;
    return m && typeof m.t === 'string' ? m : null;
  } catch { return null; }
}
