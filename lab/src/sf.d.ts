// SlideForge's game logic as the lab imports it, where it lives (../src/games, aliased '@sf' in vite.config.ts).
// Plain JavaScript there, so its shape is declared here: what the lab calls, no more. The root's typecheck
// reads the same files through src/types.d.ts.

/** A compiled question slide, as SlideForge's compileGame makes it and the room marks it. */
interface SFQuizSlide { style?: string; question?: string; options?: string[]; correct?: number; [field: string]: unknown }

/** One game engine (src/games/<style>.js): what a question is, how it compiles onto a slide, how a response is marked. */
interface SFGameStyle {
  label?: string;
  make?: () => Record<string, unknown>;
  normalize?: (q: Record<string, unknown>) => void;
  validate?: (q: Record<string, unknown>, n: number) => string | null;
  compile?: (q: Record<string, unknown>, settings: Record<string, unknown>, slide: SFQuizSlide) => void;
  mark?: (slide: SFQuizSlide, response: unknown) => boolean;
  describe?: (slide: SFQuizSlide, response: unknown) => string;
  [member: string]: unknown;
}

declare module '@sf/games/registry.js' {
  /** Whether a response is right, by the slide's style (the host marks; the relay only counts). */
  export function markResponse(slide: SFQuizSlide, response: unknown): boolean;
  /** How a response is written on the wall: a right typed answer in the spelling the question accepts. */
  export function answerLabel(slide: SFQuizSlide, response: unknown): string;
  export function gameStyle(key: string | undefined): SFGameStyle;
  export const GAME_STYLES: Record<string, SFGameStyle>;
}

declare module '@sf/games/marking.js' {
  /** A typed answer with case, accents, punctuation and a leading article taken off: what two spellings are compared by. */
  export function normalizeAnswer(text: unknown): string;
  /** A number written plainly, with its unit once: "1989 year". */
  export function formatValue(value: unknown, unit?: unknown): string;
  export function withUnit(text: string, unit?: unknown): string;
}

declare module '@sf/games/scoring.js' {
  /** Claim and Heads Up: a point when the teacher accepts. */
  export function claimPoints(accepted: boolean): number;
}

declare module '@sf/activities/catalogue.js' {
  /** A catalogue activity by its key (its title is the name a teacher knows it by), or null. */
  export function activity(key: string): { key: string; title: string; [field: string]: unknown } | null;
}

declare module '@sf/activities/fields.js' {
  /** An activity written onto a slide and read back off it, by dotted path. */
  export function createActivityFields(SF: {
    parseKeywordLine: (line: string) => { term: string; def: string };
    formatKeywordLine: (term: string, def: string) => string;
  }): {
    read(slide: object, path: string): string;
    write(slide: object, path: string, value: string): void;
    /** An activity's fields written onto a slide. */
    applyFields(activity: object, slide: object): void;
    /** An activity's steps, as its slide builds them. */
    steps(activity: object): unknown[];
  };
}

declare module '@sf/deck/feedback.js' {
  type Kind = 'poll' | 'wordcloud' | 'brainstorm' | 'scale';
  interface Normalized { kind: Kind; prompt: string; options: string[]; max: number; presentAs: 'rail' | 'focus'; points?: number; lowLabel?: string; highLabel?: string; hold?: boolean }
  /** Audience feedback from a saved slide, made safe (options cut to six, scale ends, one vote each); null when it names no kind. */
  export function normalizeFeedback(raw: unknown): Normalized | null;
  /** A blank feedback block of a kind (a poll's three starter options, a scale's five points and named ends). */
  export function makeFeedback(kind?: string): Normalized;
  /** The feedback a slide really collects: null without a prompt, a poll without two options, a scale without both ends. */
  export function slideFeedback(slide: { feedback?: unknown } | null | undefined): Normalized | null;
  /** A scale's point labels: "1" to "n". */
  export function scaleLabels(f: { points?: number }): string[];
}

declare module '@sf/games/order.js' {
  /** Ranking: round(10 x the share of items in their right place) for an ordering (indices into the options, in the learner's order). */
  export function orderPoints(slide: SFQuizSlide, response: unknown): number;
  /** The share, 0 to 1, of items in their right place; 0 for anything that is not a full ordering. */
  export function orderScore(slide: SFQuizSlide, response: unknown): number;
}

declare module '@sf/games/fill.js' {
  /** The share, 0 to 1, of a Fill the gaps' gaps a response gets right (a word-bank index per gap); 0 for anything else. */
  export function fillScore(slide: SFQuizSlide, response: unknown): number;
}

declare module '@sf/games/compare.js' {
  /** The share, 0 to 1, of a Compare & contrast sort's statements a response puts in the right column; 0 for anything else. */
  export function sortScore(slide: SFQuizSlide, response: unknown): number;
}

declare module '@sf/games/definition.js' {
  /** The reading time a Definition challenge takes: 20, 30, 45 or 60 seconds; 30 for anything else. */
  export function clampDefinitionSeconds(seconds: unknown): number;
}

declare module '@sf/games/boss.js' {
  /** What a right answer takes off the boss: easy 1, medium 2, hard 3, boss 5 (medium for anything else). */
  export function bossDamage(difficulty: unknown): number;
  /** The boss's HP: the damage of every question in the list, by its `difficulty`. */
  export function bossMaxHp(questions: { difficulty?: unknown }[]): number;
}

declare module '@sf/games/wordreveal.js' {
  /** The share of a word's letters shown at the start: easy 0.6, medium 0.4, hard 0. */
  export function wordRevealPreFraction(difficulty: unknown): number;
  /** The word with its first `shown` letters open and the rest `_` (spaces stay). */
  export function wordRevealMask(word: unknown, shown: number): string;
  export function wordRevealLetterCount(word: unknown): number;
  /** Points for each answer by the letters shown when it came (its own `elapsedMs`), never at the host's reveal: [id, points]. */
  export function wordRevealGains(slide: SFQuizSlide, answers: { id: number; response: unknown; elapsedMs?: number }[], currentShown: number): [number, number][];
}

declare module '@sf/games/speed.js' {
  /** Beat the clock outside a round: 10 for a right answer plus a point per 10 seconds left; wrong -5. */
  export function speedPoints(right: boolean, remainingSec: number): number;
  /** Beat the clock in a round: 10 for a right answer plus up to 10 for speed (a point off per second after the question appeared); wrong -5. */
  export function roundSpeedPoints(right: boolean, elapsedSec: number): number;
  /** How long a round question waits for the slowest phone before it closes itself (seconds). */
  export const SPEED_PACE: number;
}

/** A board's definition, as its game style declares it (`boardEngine` in src/boards): what the runtime and the room read. */
interface SFBoardDef {
  key: string; runtime: string; field: string; states: string; state: string; command: string;
  /** What a verdict sends to the journal (`oral`), from the engine's report. */
  reportValue?: (value: unknown) => unknown;
  reportEvent?: string;
  [member: string]: unknown;
}

/** A board session of the runtime (createSession): the board on the wall, its clock and its paint. */
interface SFBoardSession { player: Record<string, unknown>; slide: Record<string, unknown> & { id: string }; node: unknown; paint(focus: boolean): void; tick(): void; start(): void; stop(): void }

/** Low-stakes quiz's engine (the runtimes folder in src/boards): the state and its moves (its drawing is classic's and is not used). */
interface SFLowStakesEngine {
  create(board: Record<string, unknown>): Record<string, unknown> & { phase: 'ready' | 'quiz' | 'answers' | 'complete'; remaining: number; paused: boolean; elapsed: number };
  transition<S extends Record<string, unknown>>(board: Record<string, unknown>, state: S, action: string): S;
  formatClock(seconds: number): string;
}

/** The memory boards' engine (memory flip, memory match, knowledge flip): the state and its moves, the tally and the winner. */
interface SFMemoryEngine {
  create(board: Record<string, unknown>): Record<string, unknown>;
  transition<S extends Record<string, unknown>>(board: Record<string, unknown>, state: S, action: string, card?: number): S;
  scores(board: Record<string, unknown>, state: Record<string, unknown>): { name: string; score: number }[];
  winner(board: Record<string, unknown>, state: Record<string, unknown>): string;
}

declare module '@sf/boards/runtimes/memory.js' {
  /** Puts the memory engine on `SF.Memory`; nothing runs but declarations. */
  export function installMemory(SF: { Memory?: SFMemoryEngine }): void;
}

/** Bingo's engine: the deal and the calls (at random), a team's square for the call and why it cannot answer, the tally and the winner. */
interface SFBingoEngine {
  create(board: Record<string, unknown>): Record<string, unknown>;
  transition<S extends Record<string, unknown>>(board: Record<string, unknown>, state: S, action: string, team?: number): S;
  square(state: Record<string, unknown>, board: Record<string, unknown>, team: number): number;
  blocked(state: Record<string, unknown>, board: Record<string, unknown>, team: number): string | null;
  scores(board: Record<string, unknown>, state: Record<string, unknown>): { name: string; score: number; won: boolean }[];
  winner(board: Record<string, unknown>, state: Record<string, unknown>): string;
}

declare module '@sf/games/bingo.js' {
  /** A row, column or diagonal of marked squares on a size × size card. */
  export function bingoHasLine(marked: boolean[], size: number): boolean;
}

declare module '@sf/boards/runtimes/bingo.js' {
  /** Puts the bingo engine on `SF.Bingo` (it reads `SF.bingoHasLine`); nothing runs but declarations. */
  export function installBingo(SF: { Bingo?: SFBingoEngine; bingoHasLine: (marked: boolean[], size: number) => boolean }): void;
}

/** Quiz bowl's engine: the state and its moves, a cell's next question, the scores, the leaders and the winner. */
interface SFBowlEngine {
  create(board: Record<string, unknown>): Record<string, unknown>;
  transition<S extends Record<string, unknown>>(board: Record<string, unknown>, state: S, action: string, team?: number): S;
  pending(board: Record<string, unknown>, state: Record<string, unknown>, cell: number): Record<string, unknown> | null;
  scores(board: Record<string, unknown>, state: Record<string, unknown>): { name: string; score: number }[];
  leaders(board: Record<string, unknown>, state: Record<string, unknown>): number[];
  winner(board: Record<string, unknown>, state: Record<string, unknown>): string;
}

declare module '@sf/boards/runtimes/bowl.js' {
  /** Puts the Quiz bowl engine on `SF.Bowl`; nothing runs but declarations. */
  export function installBowl(SF: { Bowl?: SFBowlEngine }): void;
}

declare module '@sf/boards/runtime.js' {
  interface Clock { now(): number; every(fn: () => void, ms: number): unknown; cancel(timer: unknown): void }
  interface SessionSpec { player: Record<string, unknown>; slide: Record<string, unknown> & { id: string }; node: unknown; create(board: Record<string, unknown>): Record<string, unknown>; render(...args: unknown[]): void; command(action: string, card?: number): void; tick(session: SFBoardSession, dt: number): boolean | void; interval?: number }
  export type { SFBoardSession };
  /** The boards' lifecycle (the board definitions are found among the game styles' `boardEngine`). */
  export function createBoardRuntime(namespace: () => Record<string, unknown>, styles: Record<string, SFGameStyle>, clock?: Clock): {
    forSlide(slide: Record<string, unknown>): SFBoardDef | null;
    createSession(key: string, spec: SessionSpec): SFBoardSession;
  };
}

declare module '@sf/boards/runtimes/lowstakes.js' {
  /** Puts the Low-stakes engine on `SF.LowStakes`; nothing runs but declarations. */
  export function installLowStakes(SF: { LowStakes?: SFLowStakesEngine }): void;
}

declare module '@sf/games/lowstakes.js' {
  /** The whole quiz's clock: 120, 180 or 240 seconds. */
  export function clampLowstakesSeconds(seconds: unknown): number;
}

/** An activity slide as SlideForge makes it (SF.Activities.makeSlides; lab/src/assets/activities.json holds them). */
interface SFActivitySlide { type: string; title?: string; bullets?: string[]; body?: string; progressive?: boolean; activityPresentation?: string; feedback?: unknown; timeLimit?: number; [field: string]: unknown }
type SFStageJob = 'note' | 'talk' | 'send' | 'work' | 'down';
type SFParseLine = (line: string) => { term: string; def: string };

declare module '@sf/activities/stages.js' {
  /** A routine's stages, read off its rows (a row's job from its words, or the one its label declares). */
  export function activityStages(slide: SFActivitySlide, parseLine: SFParseLine): { i: number; row: number; name: string; seconds: number; text: string; job: SFStageJob; group: boolean }[];
  /** The leading untimed row pinned through every stage, or null. */
  export function activityBrief(slide: SFActivitySlide, parseLine: SFParseLine): { row: number; name: string; text: string } | null;
  /** What a stage puts on the wall and the phone, and its icon. */
  export function stageCopy(st: { job: string; group?: boolean }): { wall: string; phone: string; icon: string };
}

declare module '@sf/deck/content.js' {
  /** "Term<TAB>definition" (or "Term — definition") as its two parts. */
  export const parseKeywordLine: SFParseLine;
  /** What the phones may show of a slide at a build step (`at.text`). */
  export function slideExcerpt(slide: SFActivitySlide, revealed: number): string;
}

/** A SlideForge live figure slide (src/figures/): which figure, its data, its steps and its frame. */
interface SFFigureSlide { type: 'figure'; figure: string; figureData?: unknown; figureSteps?: unknown[]; title?: string; figureGround?: string; figureEyebrow?: string; figureCredit?: string; figureAlt?: string }
/** What installFigures puts on its namespace (src/figures/index.js). */
interface SFFigures {
  active(slide: unknown): boolean;
  /** The figure's steps (objects only, at least one), and how many. */
  steps(slide: SFFigureSlide): Record<string, unknown>[];
  count(slide: SFFigureSlide): number;
  /** Draw the figure into `root` (an SVG over the whole slide), at `exploreState.figureStep`; live with `interactive`. Sets root._exploreRefresh. */
  render(root: HTMLElement, pad: HTMLElement, slide: SFFigureSlide, opts: { interactive?: boolean; exploreState?: { figureStep?: number }; exploreCommand?: (action: string, value: unknown) => void }): void;
  /** The figure names it draws. */
  kinds: string[];
  seek(ms: number | null): void;
}

declare module '@sf/figures/index.js' {
  /** Puts SF.Figures on `SF`. Pure SVG: nothing is drawn until render. */
  export function installFigures(SF: { Figures?: SFFigures }): void;
}
