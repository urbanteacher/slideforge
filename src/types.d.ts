/**
 * SlideForge — shared shapes for the module boundaries.
 *
 * These types document data the app already trusts: a deck that has been
 * through `normalizeDeck`, a question that has been through
 * `normalizeQuestion`, an engine that `registry.js` imported. They are not a
 * substitute for that normalization. Anything arriving from `localStorage`,
 * an imported `.sfbundle.json`, or the relay is untrusted at runtime and must
 * still go through the normalizers before it is described by a type here.
 *
 * Nothing in this file is emitted. `npm run typecheck` reads it; the esbuild
 * bundle never sees it.
 */

/* ---------------------------------------------------------------- enums --*/

/** Theme keys in `THEMES`. */
export type ThemeKey = keyof typeof import('./themes.js').THEMES;

/** Slide-to-slide animations in `TRANSITIONS`. */
export type TransitionKey = typeof import('./model.js').TRANSITIONS[number];

/** Layouts an author can pick in the deck editor (`DECK_TYPES`). */
export type DeckSlideType =
  | 'statement' | 'journey' | 'mindmap' | 'introduction' | 'title' | 'section' | 'content' | 'keywords' | 'italics' | 'links'
  | 'split' | 'cards' | 'table' | 'code' | 'image' | 'video' | 'quote' | 'join'
  | 'chart' | 'gallery' | 'beforeafter' | 'explore' | 'simulation'
  | 'keyfact' | 'orgchart'
  | 'stats' | 'compare' | 'funnel' | 'timeline' | 'iceberg'
  | 'spectrum' | 'sourcecheck' | 'shift' | 'spotfake';

/** Every slide kind the player and renderer handle (`SLIDE_TYPES`). The three
 *  beyond {@link DeckSlideType} are produced by compiling a game. */
export type SlideType = DeckSlideType | 'game' | 'quiz' | 'explain' | 'results';

/** How the room answers a compiled question (`INPUTS`). */
export type InputKind = 'choice' | 'text' | 'number' | 'order';

/** What a game does with a correct answer. `points` is the default; the rest
 *  drive a bespoke board or scoreboard. */
export type Mechanic =
  | 'points' | 'race' | 'speed' | 'boss' | 'claim' | 'count'
  | 'judge' | 'wordreveal' | 'bingo' | 'bowl';

/** Engine keys registered in `GAME_STYLES`. */
export type GameStyleKey =
  | 'choice' | 'truefalse' | 'race' | 'speed' | 'boss' | 'slider' | 'type'
  | 'order' | 'emoji' | 'definition' | 'compare' | 'oddone' | 'wordreveal'
  | 'memoryflip' | 'memorymatch' | 'knowledgeflip' | 'headsup' | 'spinexplain'
  | 'connection' | 'conceptchain' | 'randomchallenge' | 'bingo' | 'lowstakes'
  | 'bowl';

/** Where a question's reasoning is shown once the answer is revealed. */
export type ExplainStyle = 'inline' | 'slide' | 'both';

/** How a question image sits relative to its text. */
export type ImageLayout = 'band' | 'first' | 'overlay';

/**
 * Boss difficulty bands (`BOSS_LEVELS`), and the damage each deals:
 * easy 1, medium 2, hard 3, boss 5.
 *
 * `boss` was missing here until a starter bank tried to use it. Nothing had
 * caught it because no code assigned a literal to a typed `difficulty` field
 * — the engine reads the string back out of `BOSS_DAMAGE`, which is an
 * untyped object literal.
 */
export type Difficulty = 'easy' | 'medium' | 'hard' | 'boss';

/** Audience-feedback kinds in `FEEDBACK_KINDS`. */
export type FeedbackKindKey = 'poll' | 'wordcloud' | 'brainstorm' | 'scale';

/* ------------------------------------------------------------- feedback --*/

export interface FeedbackKind {
  key: FeedbackKindKey;
  label: string;
  icon: string;
  blurb: string;
  /** A poll cannot run without options; the others collect free text. */
  needsOptions: boolean;
  /** A scale is ordered, so it gets a mean and a spread rather than bars. */
  graded?: boolean;
}

/** Audience feedback attached to an ordinary slide. Never scored. */
export interface Feedback {
  kind: FeedbackKindKey;
  prompt: string;
  options: string[];
  /** Submissions allowed per person. Forced to 1 for polls and scales. */
  max: number;
  presentAs: 'rail' | 'focus';
  /** Scale only: number of points between the two ends (`SCALE_POINTS`). */
  points?: number;
  /** Scale only. */
  lowLabel?: string;
  /** Scale only. */
  highLabel?: string;
}

/* ------------------------------------------------------------------ deck --*/

export interface Team {
  name: string;
}

/** How a live quiz is played. Deck-level: it must be the same for every
 *  question in the deck. */
export interface QuizConfig {
  mode: 'individual' | 'teams';
  teams: Team[];
  /** Keep the running score on screen. */
  scoreboard: boolean;
}

/**
 * A slide, after `normalizeSlide`.
 *
 * The first block is authored in the deck editor. Everything under
 * "compiled" is written by a game engine's `compile` hook or by
 * `fillQuestionSlide`, and only appears on slides that `compileGame`
 * produced. Style-specific fields are listed rather than left to an index
 * signature so a misspelt one is an error rather than a silently dead
 * property.
 */
/** One layer of an image-stack slide: a picture, what it shows, and whose it is. */
export interface GalleryLayer {
  image: string;
  caption: string;
  source: string;
}

export interface WordMotionStep {
  dx?: number; dy?: number; rot?: number; scale?: number; blur?: number; delay?: number;
  arc?: 'settle' | 'bounce' | 'mist';
}
export type ChromeSlot = 'header-left' | 'header-center' | 'header-right' | 'footer-left' | 'footer-center' | 'footer-right';
export interface HeaderFooterItem {
  kind: 'empty' | 'text' | 'image' | 'logo' | 'number' | 'pages' | 'tagline' | 'title' | 'section';
  text?: string; src?: string; alt?: string;
  placement?: 'slot' | 'canvas';
  anchor?: string;
}
export interface HeaderFooterConfig {
  enabled: boolean;
  hideOnCover?: boolean;
  slots: Partial<Record<ChromeSlot, HeaderFooterItem>>;
}
export interface SlideDesign {
  chromeLayout?: '' | 'regions';
  identitySlot?: ChromeSlot; logoSlot?: ChromeSlot; contextSlot?: ChromeSlot; closingSlot?: ChromeSlot; numberSlot?: ChromeSlot;
  composition?: string;
  align?: 'left' | 'center' | 'right';
  size?: 'small' | 'medium' | 'large' | 'x2' | 'x3' | 'x5';
  textColor?: string; background?: string;
  placement?: 'side' | 'top' | 'bottom';
  imageShare?: 35 | 50 | 65;
  mediaGround?: 'card' | 'full';
  imageStep?: 'none' | 'before' | 'after';
  cardsMode?: 'grid' | 'rows' | 'stack' | 'pictures';
  cardPics?: 'covers' | 'plates';
  statStyle?: 'tile' | 'ring' | 'bar';
  funnelDirection?: 'down' | 'up';
  timelineMode?: 'horizontal' | 'vertical';
  backdrop?: '' | 'drift' | 'grid' | 'glow';
  logoGround?: '' | 'light' | 'dark';
  imageFrame?: '' | '16:9' | '4:3' | '3:2' | '1:1' | '4:5';
  capStyle?: 'scrim' | 'bar' | 'plain' | 'none';
  capPos?: 'bottom' | 'top';
  capFade?: 0 | 5 | 10 | 15 | 20 | 30;
  imageMotion?: '' | 'zoom' | 'travel';
  focalX?: number; focalY?: number; focalX2?: number; focalY2?: number;
  imageTravelSecs?: 12 | 20 | 30;
  chartMotion?: '' | 'grow'; chartFocus?: number;
  words?: '' | 'rise' | 'fade' | 'reveal';
  wordSpeed?: 'gentle' | 'medium' | 'quick';
  wordStagger?: 'together' | 'wave' | 'one';
  wordFrom?: 'first' | 'last' | 'center';
  wordsLoop?: boolean;
  wordPlan?: {text:string; note?:string; unit?:'word'|'letter'; words:WordMotionStep[]};
}
export interface DesignControl {
  label: string;
  pane: 'Look' | 'Motion';
  types: '*' | SlideType[];
  when?: string;
  description: string;
}

export interface Slide {
  headerFooter?: HeaderFooterConfig;
  design?: SlideDesign;
  /** The {@link Activity} key this slide was built from, when it was chosen
   *  in the activities studio. Only that studio reads these four — to
   *  everything else the slide is an ordinary one. */
  activity?: string;
  /** Groups the slides of a multi-slide activity so the rail shows them as
   *  one row that duplicates and removes together. */
  activityInstance?: string;
  /** Position within that group, 0-based. */
  activityPage?: number;
  activityPresentation?: 'rows' | 'steps' | 'panels' | 'brief';
  id: string;
  type: SlideType;
  title: string;
  subtitle: string;
  date?: string;
  journeyMode?: 'path' | 'handover' | 'stepper';
  body: string;
  bullets: string[];
  notes: string;
  image: string;
  imageFit: 'cover' | 'contain';
  imageSide: 'left' | 'right';
  /** Referenced, never embedded — a deck lives in localStorage. */
  video: string;
  videoPoster: string;
  /** Seconds in, for a clip inside a longer file. */
  videoStart: number;
  /** Seconds at which to stop. 0 plays to the end. */
  videoEnd: number;
  videoLoop: boolean;
  videoMuted: boolean;
  /** Honoured on the projector, never in a preview. */
  videoAutoplay: boolean;
  /** Image-stack layout: the pictures, shown one in front of the last. */
  layers: GalleryLayer[];
  /** Chart layout: which form the same tabular `body` is drawn as. */
  chartKind: 'bar' | 'stack' | 'hbar' | 'line' | 'area' | 'pie' | 'donut' | 'scatter' | 'histogram' | 'box' | 'pictogram' | 'radar' | 'sankey' | 'treemap' | 'bullet' | 'combo' | 'waffle';
  /** Where the numbers came from, and what they are not. Shown under the chart. */
  chartSource?: string;
  /** One icon per unit on a pictogram. */
  chartIcon: string;
  /** What one icon is worth. */
  chartUnit: number;
  /** Present only on the kinds that read it — before/after, explore,
   *  simulation, chart — or on any slide that already carried settings. */
  exploration?: ReturnType<typeof import('./deck/exploration.js').normalizeExploration>;
  /** Chart callouts: the categories this chart is walked through, in order.
      Absent on every other layout. */
  callouts?: { label: string; note: string }[];
  /** Table layout: `body` is tab- or pipe-separated rows, one per line. */
  tableHeader: boolean;
  /** Code viewer layout: source shown on the wall (typed in play, full in preview). */
  code?: string;
  /** Language label only — python | javascript | text. Never executed. */
  language?: string;
  /** How the listing arrives in Present: all at once, or line by line.
      `typewrite` is the older boolean this replaced and is still read. */
  codeReveal?: 'all' | 'type' | 'lines';
  /** Auto typewriter drip when the slide opens in Present. Default true for code slides. */
  typewrite?: boolean;
  /** Milliseconds per character for the typewriter (approx). */
  typeSpeed?: number;
  transition: TransitionKey;
  /** Build on Next: release this slide's points one press at a time
   *  instead of landing the whole slide at once. */
  progressive?: boolean;
  /** Kept in the deck, left out of the show. Absent rather than false when
      off, so it costs nothing on the slides that never use it. */
  hidden?: boolean;
  /** What a build does with a point it has already been through: leave
   *  only the unreached ones hidden ('hide'), or keep the reached ones on
   *  screen dimmed back so the argument so far stays readable ('dim'). */
  /** What a build does with the points it has already been through:
      remove them, hold them back, or hold them back and spotlight the live
      one. */
  buildMode: 'hide' | 'dim' | 'spot';
  question: string;
  options: string[];
  correct: number;
  timeLimit: number;
  points: number;
  gameId: string;
  gameTitle: string;
  feedback: Feedback | null;

  /* --- compiled: written by an engine, absent on authored deck slides --- */

  /** Which engine compiled this slide. */
  style?: GameStyleKey;
  /** Catalogue format the game was authored as. */
  format?: string;
  /** How the room answers. Read off the engine, not written per compile. */
  input?: InputKind;
  /** 1-based position within its game, for "Q3 of 8". */
  questionNumber?: number;
  imageAlt?: string;
  imageLayout?: ImageLayout;
  explanation?: string;
  /** Carried from the question, filtered in step with `options`. */
  misconceptions?: string[];
  source?: string;
  bloom?: string;
  /** Collect the vote and never reveal — for peer instruction. */
  voteOnly?: boolean;
  explainStyle?: ExplainStyle;
  /** Ask how sure they were. Never scored. */
  confidence?: boolean;
  hideAnswerUntilReveal?: boolean;
  /** Which deck slide this was expanded from, set by `buildRunDeck`. */
  sourceSlideId?: string;
  /** Typed answer key, and the spellings that count. */
  answer?: string;
  accept?: string[];
  allowTypos?: boolean;
  hint?: string;

  difficulty?: Difficulty;
  bossDamage?: number;

  /** Numeric / slider. */
  min?: number;
  max?: number;
  step?: number;
  target?: number;
  tolerance?: number;
  unit?: string;
  pointValue?: number;

  /** Odd one out and compare — discussion, never a scored phone quiz. */
  oddoneDiscuss?: boolean;
  compareDiscuss?: boolean;
  itemA?: string;
  itemB?: string;
  similarities?: string;
  differences?: string;
  category?: string;

  /** Concept chain. */
  conceptChain?: boolean;
  term?: string;
  prompt?: string;
  judgeKind?: string;

  /** Definition sprint. */
  passage?: string;
  definition?: string;
  definitionChallenge?: boolean;
  challenge?: string;

  /** Memory / knowledge flip. */
  studySeconds?: number;
  hideAfterStudy?: boolean;
  gridSize?: number;
  rotateClaims?: boolean;

  /** Word reveal and emoji clues. */
  word?: string;
  clues?: string;
  preReveal?: number;
  dripInterval?: number;

  /** Spin and explain. */
  spinDraw?: number;
  spinTotal?: number;
  headPrompt?: string;

  phase?: string;

  /** Board slides carry their whole board in one field. `SF.Boards` finds the
   *  right engine by looking for whichever of these is present. */
  bingoBoard?: BingoBoard;
  bowlBoard?: unknown;
  lowstakesBoard?: unknown;
  memoryBoard?: unknown;
}

/**
 * The slide properties that carry a compiled board.
 *
 * Derived from {@link Slide} rather than written out again, so adding a fifth
 * board means adding one property in one place and every `BoardEngine.field`
 * stays checkable against it.
 */
export type BoardField = Extract<keyof Slide, `${string}Board`>;

export interface BingoBoard {
  gridSize: number;
  /** Team names, or `['The class']` on an individual game. Six at most. */
  participants: string[];
  pool: Array<{ id: string; term: string; definition: string }>;
}

/** A deck, after `normalizeDeck`. */
export interface Deck {
  headerFooter?: HeaderFooterConfig;
  id: string;
  title: string;
  theme: ThemeKey;
  /** Catalogue format this was created as. Free text, so a retired format
   *  leaves old decks readable. */
  format: string;
  showSlideNumbers: boolean;
  /** Close the lesson on the scores. Off by default. */
  finalScores: boolean;
  /** Stage shape: '16:9' (default), '16:10' or '4:3'. Width is always 1280. */
  aspect: '16:9' | '16:10' | '4:3';
  logo: string;
  logoOn: 'none' | 'title' | 'all';
  logoSize?: 'small' | 'medium' | 'large';
  /** Whether a dark ground flips the logo white. Themes decide when 'auto'. */
  logoReverse?: 'auto' | 'always' | 'never';
  /** Who the deck belongs to. Printed by themes that carry an institution line. */
  org?: string;
  /** Line a composition prints on its closing rule. */
  closingNote?: string;
  /** Factory pack this was seeded from. Empty for documents you wrote yourself. */
  sourceKey?: string;
  /** Library folder id: a brand default (nul, ukbt, …) or a custom slug. */
  libraryGroup?: string;
  quiz: QuizConfig;
  created: number;
  modified: number;
  slides: Slide[];
}

/**
 * A throwaway deck with every game embed expanded into plain slides. The
 * stored deck is untouched; the player only ever sees this.
 */
export interface RunDeck extends Partial<Deck> {
  id: string;
  title: string;
  slides: Slide[];
  /** Games that were expanded, in deck order. */
  games: Game[];
  /** Titles (or ids) of embeds whose game has been deleted. */
  missingGames: string[];
  /** Taken from the first embedded game: the room shares one set of rules. */
  mechanic: Mechanic;
  trackLength: number;
  music: string;
  musicVolume: number;
  quiz: QuizConfig;
  feedbackSlides?: number;
}

/* ----------------------------------------------------------------- games --*/

/** A question, after `normalizeQuestion`. Common fields first; the rest are
 *  contributed by whichever engine's `make` built it. */
export interface Question {
  id: string;
  question: string;
  /** null = inherit the game default. */
  timeLimit: number | null;
  /** null = inherit the game default. */
  points: number | null;
  image: string;
  /** Described to the phones and any screen reader. */
  imageAlt: string;
  imageLayout: ImageLayout;
  notes: string;
  /** What kind of thinking this asks for. Per question, not per game. */
  bloom: string;
  voteOnly: boolean;
  /** Shown after the answer is revealed. */
  explanation: string;
  source: string;

  /* --- engine-specific, written by `make` and kept by `normalize` --- */
  style?: GameStyleKey;
  options?: string[];
  /**
   * What a wrong option means, by the same index as `options`. Blank where
   * the author has not said. Never sent to a phone: naming a distractor's
   * misconception would tell the room it is the wrong one.
   */
  misconceptions?: string[];
  correct?: number;
  answer?: string;
  accept?: string[];
  allowTypos?: boolean;
  hint?: string;
  difficulty?: Difficulty;
  min?: number;
  max?: number;
  step?: number;
  target?: number;
  tolerance?: number;
  unit?: string;
  pointValue?: number;
  itemA?: string;
  itemB?: string;
  similarities?: string;
  differences?: string;
  category?: string;
  term?: string;
  terms?: string[];
  prompt?: string;
  definition?: string;
  passage?: string;
  challenge?: string;
  word?: string;
  clues?: string;
  dripInterval?: number;
  studySeconds?: number;
  gridSize?: number;
  rotateClaims?: boolean;
  targetScore?: number;
  /** Bowl / low-stakes carry a slice of game settings on question one. */
  mode?: 'individual' | 'teams';
  teams?: Team[];
  scoreboard?: boolean;
}

/** Game-wide settings. `defaultTime` and `defaultPoints` are what a question
 *  falls back to when its own are null. */
export interface GameSettings {
  mode: 'individual' | 'teams';
  teams: Team[];
  scoreboard: boolean;
  defaultTime: number;
  defaultPoints: number;
  /** Opening "get ready" slide. */
  intro: boolean;
  /** "How to play" slide before the first question, for the room. */
  howTo: boolean;
  scoreSlide: boolean;
  explainStyle: ExplainStyle;
  /** Horse race only: steps to the finish line. */
  trackLength: number;
  confidence: boolean;
  /** Referenced, not embedded, and played on the projector only. */
  music: string;
  musicVolume: number;
  /** Engines may add their own through `defaults`. */
  [setting: string]: unknown;
}

/** A game, after `normalizeGame`. */
export interface Game {
  id: string;
  kind: 'game';
  style: GameStyleKey;
  title: string;
  theme: ThemeKey;
  /** Library folder id (`nul`, `ukbt`, a custom shelf). Empty until stamped. */
  libraryGroup?: string;
  /** Lesson that created this check, when known. */
  sourceDeckId?: string;
  /** Catalogue format. Owns the engine: `normalizeGame` remaps `style` to
   *  match it. */
  format?: string;
  created: number;
  modified: number;
  settings: GameSettings;
  questions: Question[];
}

/* --------------------------------------------------------------- engines --*/

/**
 * What a game style must export. `registry.js` imports these explicitly;
 * there is no dynamic registration.
 *
 * Add a style by writing its module and importing it in `registry.js`.
 * Authoring controls, board compilation and runtime controls still need their
 * own integration points — this is not yet a universal plugin interface.
 */
/**
 * A question whose style-specific fields `K` are guaranteed present.
 *
 * {@link Question} marks those fields optional because no single question
 * carries all of them. Inside one engine they are not optional at all: that
 * engine's `make` creates them and its `normalize` maintains them, so its
 * `problems`, `compile` and `summary` may rely on them.
 *
 * That reliance is a real contract — every hook but `make` assumes
 * `normalize` has already run — and this is where it is written down.
 *
 * @example
 *   \@type {GameEngine<QuestionWith<'options' | 'correct'>>}
 */
export type QuestionWith<K extends keyof Question> = Question & Required<Pick<Question, K>>;

export interface GameEngine<Q extends Question = Question> {
  key: GameStyleKey;
  label: string;
  icon: string;
  blurb: string;
  mechanic: Mechanic;
  input: InputKind;
  minOptions: number;
  maxOptions: number;
  /** Options the style owns rather than the author, e.g. True/False. */
  fixedOptions?: string[] | null;

  /** New question-specific fields, merged over the common ones. */
  make(): Partial<Q>;
  /**
   * Normalize in place. Returning the question is conventional, not required.
   *
   * The parameter is `any`, not `Q`: this hook is the boundary where an
   * untrusted question becomes a trusted one. It is handed whatever was in
   * the save file — options that are `{ text }` objects from a build two
   * years ago, a `correct` that is a string, fields that are missing
   * outright — and its job is to make those into a `Q`. Typing the input as
   * `Q` would assert the very thing this hook exists to establish.
   */
  normalize(question: any): Q | void;
  /** A validation message for the readiness check, or null when fine.
   *  @param number 1-based question number, for the message text. */
  problems(question: Q, number: number): string | null;
  /** Contribute this question's fields to its compiled slide. */
  compile(question: Q, settings: GameSettings, slide: Slide): void;
  /** Is this response correct? `response` is an option index, typed text, or
   *  an order, depending on {@link GameEngine.input}. */
  mark(slide: Slide, response: unknown): boolean;
  /** One line about the question, for the editor's list. */
  summary(question: Q): string;
  /** How a response should be written on screen. Defaults to the raw value. */
  describe?(slide: Slide, response: unknown): string;

  /** Overrides applied over the common game settings by `makeGame`. */
  defaults?: Partial<GameSettings>;
  /** A question bank. Factories deep-copy it, so authoring one game cannot
   *  mutate a later game's starters. */
  starters?: Array<Partial<Q>>;
  /** A fault that belongs to the whole game rather than one question —
   *  a bingo pool too small to deal a card, say. */
  board?(game: Game): string | null;
  /** Present when this style compiles to a board instead of question slides. */
  boardEngine?: BoardEngine;
}

/* ---------------------------------------------------------------- boards --*/

/** Services the studio hands an authoring hook. Supplied by `js/studio.js`,
 *  which is outside the typechecked source, so these stay loose on purpose. */
export interface AuthoringContext {
  [service: string]: any;
}

/**
 * A board engine: a style that puts one interactive board on the wall instead
 * of a run of question slides.
 *
 * The naming fields are the contract `SF.Boards` uses to stay generic — it
 * finds a slide's board by `field`, its live state under `states[slide.id]`,
 * and its DOM module at `SF[runtime]`.
 */
export interface BoardEngine {
  key: string;
  /** Property on `window.SF` holding the DOM module for this board. */
  runtime: string;
  /** Slide property carrying the compiled board. Its presence is how
   *  `SF.Boards.forSlide` identifies the board, so this must name a real
   *  slide property — a rename on one side only would stop every board
   *  mounting, silently. */
  field: BoardField;
  /** Host property holding `{ [slideId]: state }`. */
  states: string;
  /** Render-option key for this board's state. */
  state: string;
  /** Render-option key for this board's command sender. */
  command: string;
  /** Added to the slide root while the board is on screen. */
  className: string;
  setSize: number;
  /** Does the wall show the question text above the board? */
  showsQuestion: boolean;

  compile(game: Game, services: { makeSlide(type?: SlideType): Slide }): Slide[];
  decorateIntro(intro: Slide, game: Game): void;
  authorQuestion(inspector: HTMLElement, question: Question, context: AuthoringContext): void;
  authorInspector(inspector: HTMLElement, question: Question, context: AuthoringContext): void;
  authorSettings(body: HTMLElement, context: AuthoringContext): void;

  /** Where the wall clock lives, for boards that run one. */
  clock?: {
    selector: string;
    text(state: any, engine: any): string;
  };
  focusPrimary: string;
  focusFallback: string;
  /** Property the DOM module calls to report a result. Default `onVerdict`. */
  reportEvent?: string;
  /** Reshape that report into the standard verdict row. */
  reportValue?(value: any): unknown;
}

/** Injected time, so board sessions can be driven deterministically in tests. */
export interface BoardClock {
  now(): number;
  every(callback: () => void, milliseconds: number): unknown;
  cancel(timer: unknown): void;
}

/** One board's run on one slide: paint, tick, start, stop. */
export interface BoardSession {
  player: any;
  slide: Slide;
  node: HTMLElement;
  timer?: unknown;
  paint(focus?: boolean): void;
  tick(): void;
  start(): void;
  stop(): void;
}

export interface BoardSessionOptions {
  player: any;
  slide: Slide;
  node: HTMLElement;
  /** Build the initial state from the compiled board on the slide. */
  create(board: any): any;
  render(pad: Element | null, slide: Slide, options: Record<string, any>): void;
  command(action: string, card?: unknown): void;
  /** Advance by `seconds`; return true when something visible changed. */
  tick(session: BoardSession, seconds: number): boolean;
  interval?: number;
}

/** `SF.Boards` — one lifecycle shared by player, host, renderer and studio. */
export interface BoardRuntime {
  forSlide(slide: Slide | null | undefined): BoardEngine | null;
  current(host: any, slide: Slide): any;
  unmountAll(): void;
  reset(host: any): void;
  mount(host: any, slide: Slide, node: HTMLElement): void;
  render(pad: Element | null, slide: Slide, options: Record<string, any>, root: HTMLElement): boolean;
  snapshot(host: any): Record<string, any>;
  renderOptions(host: any, slide: Slide, sendCommand?: ((key: string, payload: any) => void) | null): Record<string, any>;
  command(key: string, action: string, card?: unknown): boolean;
  /** A value that changes only when the board needs repainting. */
  stamp(host: any, slide: Slide, theme: string): string | null;
  refreshClock(box: HTMLElement, host: any, slide: Slide): boolean;
  restoreFocus(node: HTMLElement, slide: Slide): void;
  onVerdict(report: (value: unknown) => void): void;
  createSession(key: string, options: BoardSessionOptions): BoardSession;
}

/* -------------------------------------------------------------- storage --*/

/** One document kind in `localStorage`. Every read re-normalizes, because
 *  what is on disk may predate the current schema. */
export interface DocumentStore<T> {
  /** Newest first. */
  list(): T[];
  save(document: T): boolean;
  remove(id: string): void;
  clear(): void;
  get(id: string): T | null;
  /** Id of the last document opened, or null when storage is unavailable. */
  lastId(): string | null;
}

export interface GameDocumentStore extends DocumentStore<Game> {
  /** Decks that embed this game. */
  usedByDecks(id: string): Deck[];
  /** Titles of the decks that embed this game. */
  usedBy(id: string): string[];
}

/* ------------------------------------------------------------- marking --*/

/** The result of marking one typed response. */
export interface TypedMark {
  right: boolean;
  /** The accepted answer it hit, so the host can show which spelling it took. */
  matched: string | null;
  /** Edit distance from the accepted answer, or null on a miss. */
  distance: number | null;
}

/* ------------------------------------------------------------ readiness --*/

/**
 * `stop` is something that will visibly fail in front of a class; `check` is
 * something that depends on the room. Two levels only — a third would just be
 * a place to hide things.
 */
export interface ReadinessItem {
  level: 'stop' | 'check';
  /** Slide index, or null when the fault belongs to the whole deck. */
  slide: number | null;
  title: string;
  detail: string;
}

export interface ReadinessReport {
  stop: number;
  check: number;
  items: ReadinessItem[];
}

/* ---------------------------------------------------------- activities --*/

/** Where an activity sits in a lesson. Distinct from {@link ActivityCategory},
 *  which is what it does to the room. */
export type PhaseKey =
  | 'starter-slide' | 'starter-activity' | 'activation' | 'construction'
  | 'mini-activity' | 'main-activity' | 'collaboration' | 'mini-quiz'
  | 'reflection' | 'plenary' | 'activity-plenary';

/** Which of the five things picking an activity builds. `slide-arc` is a run
 *  of slides and cannot be built in one step yet. */
export type ActivityTarget = 'slide' | 'game' | 'feedback' | 'moment' | 'slide-arc';

export interface Phase {
  key: PhaseKey;
  label: string;
  icon: string;
  blurb: string;
}

/**
 * One authoring field an activity asks for.
 *
 * The catalogue says what a teacher has to fill in, and the activities
 * inspector draws it. Without this an activity lands as an empty slide in the
 * right layout and leaves them guessing which pit is the hook and which is
 * the question — the shape is there but not what goes in it.
 *
 * `slide` is where the value lives on the slide it made, so the field edits
 * the real slide rather than a copy: a dotted path like `bullets.0`, or a
 * plain property like `title`.
 */
export interface ActivityField {
  label: string;
  /** `text` a line · `area` a paragraph · `minutes` a duration in minutes. */
  type: 'text' | 'area' | 'minutes';
  /** Dotted path into the slide, e.g. `title`, `bullets.0`, `timeLimit`. */
  slide: string;
  /** What it starts as. A worked example to overwrite beats a blank. */
  value?: string | number;
  /** Shown under the field. */
  hint?: string;
}

/**
 * One row of the catalogue. Data only — nothing here runs; `js/studio.js`
 * reads `target` and calls the matching builder.
 */
export interface Activity {
  /** Slug of the activity's name. Unique across the catalogue. */
  key: string;
  icon: string;
  title: string;
  blurb: string;
  phase: PhaseKey;
  /** Planning estimate for the phase rail. Never read at runtime. */
  minutes?: number;
  target: ActivityTarget;
  /** `target: 'game'` — a registered engine key. */
  style?: string;
  /** `target: 'slide'` — a DECK_TYPES layout. */
  layout?: string;
  /** `target: 'feedback'` — a FEEDBACK_KINDS key. */
  feedbackKind?: string;
  /** The protocol, in order, as the source recorded it. Every activity has
   *  one; for a moment it is the whole activity. */
  steps: string[];
  /** What the teacher fills in. Absent means the slide is enough on its own. */
  fields?: ActivityField[];
  /** Absent means true. An activity that cannot run is not offered. */
  enabled?: boolean;
  materials?: string[];
  sourceFile?: string;
  teacherNotes?: string;
  mappingReason?: string;
  presentation?: 'rows' | 'steps' | 'panels' | 'brief';
  originalMapping?: { target: ActivityTarget; layout?: string; style?: string; feedbackKind?: string };
  feedbackPreset?: Partial<Feedback>;
  gamePreset?: { seeds: any[]; settings: Record<string, any> };
  pages?: { title: string; layout: string; minutes: number; fields: ActivityField[] }[];
}

/* ------------------------------------------------------------- globals --*/

/**
 * `window.SF`.
 *
 * The model bundle assigns the deck, game and board API onto this; the
 * browser scripts in `js/` add their own modules (`Playbook`, `Bingo`,
 * `LowStakes`, …) after it loads. Those scripts are outside the typechecked
 * source, so the index signature is deliberate — this declares only what
 * `src/` itself reads back off the namespace.
 */
export interface SlideForgeGlobal {
  HeaderFooterUI?: { refresh(): void; mount(host: HTMLElement): void; close(): void };
  /**
   * Optional because the namespace is assembled across script tags, not
   * created complete. `js/ask.js` and its siblings run before the model
   * bundle has attached anything, and every one of them opens with
   * `global.SF = global.SF || {}` for exactly that reason. Declaring this
   * required would describe an object that does not exist yet at the moment
   * most of the app first touches it — so consumers guard, as they already
   * do.
   */
  Boards?: BoardRuntime;
  /** Rules copy for the "how to play" slide. Added by `js/playbook.js`. */
  Playbook?: {
    forGame(game: Game): {
      title?: string;
      aim?: string;
      howToPlay?: string[];
      phases?: string;
      timer?: string;
      players?: string;
      scoring?: string;
      judgement?: string;
      note?: string;
      demo?: string;
      [key: string]: any;
    } | null;
    engineSummary(book: any): string;
    /* The two above are what src/ reads. js/playbook.js exports a good deal
       more — the book itself, per-style setup, demo kinds — and typing only
       the pair src/ happens to use would make assigning the real module an
       excess-property error. */
    [member: string]: any;
  };
  [module: string]: any;
}

declare global {
  interface Window {
    SF: SlideForgeGlobal;
  }
}
