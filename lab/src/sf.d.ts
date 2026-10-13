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
