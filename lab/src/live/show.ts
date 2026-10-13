// What the room steps through: one step per slide the room sees, read from a lab deck. A lab game's slides
// carry what the room needs (slide.game, designs/engage/games.ts tagGame and finishGame): its cover, its
// questions (game.quiz, SlideForge's own compiled question) and their answers. As in src/deck/labshow.js,
// a question is asked where its first drawing stands, its answer is that question's reveal (not a step of
// its own), and the game's scores follow its last slide.
//
// The room asks the questions of the styles in styles/ (the registry's list; STYLES in styles/index.ts). Any other question is shown, not asked.
// A slide with audience feedback (poll, word cloud, brainstorm, scale) is a step that opens a prompt (feedback.ts).

import type { Deck, Slide } from '../core';
import { gameStyle } from '@sf/games/registry.js';
import { feedbackOf, type RoomFeedback } from './feedback';
import { boardData, boardOn, type RoomBoard } from './boards';
import { bossHpOf, trackLengthOf, type Mechanic } from './mechanics';
import { styleForFormat, styleOf } from './styles';
import { roomPlay } from './teams';

/** A question as the room asks and marks it: SlideForge's quiz slide (src/games), with its game. */
export interface RoomQuiz extends SFQuizSlide {
  id: string; question: string; options: string[]; correct: number; explanation: string;
  timeLimit: number; points: number; style: string; input: string; gameId: string;
  accept?: string[]; answer?: string; allowTypos?: boolean;
  /** Slider: the line, the target and how near counts. */
  min?: number; max?: number; step?: number; target?: number; tolerance?: number; unit?: string;
  confidence?: boolean; voteOnly?: boolean; unmarked?: boolean; scoreSpoken?: boolean; sourceSlideId?: string; headPrompt?: string;
}

export interface RoomSlide {
  /** The slide id the room is told (`at.slideId`). */
  id: string;
  title: string;
  /** What the phones may show of it (`at.text`). */
  text: string;
  activity: 'content' | 'moment' | 'question' | 'feedback';
  /** The game this slide belongs to: landing on a new one opens a round. */
  gameId?: string;
  /** The phone's skin for this slide (`at.style`). */
  style: string;
  quiz?: RoomQuiz;
  /** Audience feedback: the prompt the room is asked while this step is on the wall (feedback.ts). */
  feedback?: RoomFeedback;
  /** A game's scores: the room is sent `finish` when it comes up. */
  results?: boolean;
  /** A board (live/boards): the wall plays it, the teacher commands it, no phone answers. */
  board?: RoomBoard;
}

/** The steps, and how the room plays: individual, or teams with their names (the first game's settings, as classic's buildRunDeck reads them). */
export interface RoomShow {
  title: string; slides: RoomSlide[]; mode?: 'individual' | 'teams'; teams?: string[];
  /** What the lesson's lead game makes of the room (classic's `run.mechanic`): a race's track, a boss's HP, a drip of letters; absent for the plain points game. */
  mechanic?: Mechanic;
  /** A race: the steps to the finish. A boss: its HP, from its own game's questions. */
  trackLength?: number;
  bossHp?: number;
}

const copy = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
/** A game's own phone skin off its questions (classic `Live.mechanic`): Multiple choice is 'points'. */
const mechanicOf = (style: string) => String(gameStyle(style)?.mechanic ?? 'quiz');

/** A round played in one go (Beat the clock): the questions SlideForge compiled for it, on the slide it is played on (`game.board`). */
const roundQuizzes = (s: Slide): Record<string, unknown>[] => (s.game?.role === 'board' ? (s.game.board ?? []).filter((x) => x.type === 'quiz') : []);

/** A lab question as the room's quiz: the game's question with the Game panel's settings over it (labshow.js quizSlide).
 *  A round's question (`raw`, from `game.board`) takes its slide's settings, and an id of its own beside the slide's. */
function quizOf(s: Slide, raw: Record<string, unknown> | undefined = s.game!.quiz, id = s.id): RoomQuiz {
  const g = s.game!, set = g.settings ?? {};
  const q = Object.assign({ type: 'quiz', style: 'choice', input: 'choice', correct: 0, points: 1000, explanation: '', options: [], question: '' }, copy(raw ?? {})) as unknown as RoomQuiz;
  q.id = id;
  // The game's format is on its question, as SlideForge's compile puts it there (a style may be told by it: Time traveler).
  if (q.format == null) q.format = g.format;
  q.timeLimit = (set.seconds ?? 0) > 0 ? set.seconds! : 0;
  if (set.points != null) q.points = set.points;
  q.gameId = g.id;
  // The Game panel's difficulty and the damage a right answer deals are the question's own (a boss's hit, a word's pre-reveal).
  if (set.difficulty != null) q.difficulty = set.difficulty;
  if (set.damage != null) q.bossDamage = set.damage;
  // The style's own fields, as its compile sets them (styles/<style>.ts `prepare`).
  styleOf(q)?.prepare?.(q);
  if (s.sourceSlideId) q.sourceSlideId = s.sourceSlideId;
  return q;
}

/** The room's steps for a lab deck. */
export function showFromDeck(deck: Pick<Deck, 'title' | 'slides'>): RoomShow {
  const slides = deck.slides.filter((s) => !s.hidden);
  const out: RoomSlide[] = [];
  const asked = new Set<string>();
  const lastOf = new Map<string, number>();
  slides.forEach((s, k) => { if (s.game?.id) lastOf.set(s.game.id, k); });
  const firstStyle = slides.find((s) => s.game?.quiz)?.game?.quiz?.style;
  const deckStyle = mechanicOf(String(firstStyle ?? 'choice'));

  slides.forEach((s, k) => {
    const g = s.game;
    if (!g?.id) {
      const feedback = feedbackOf(s);
      out.push(feedback
        ? { id: s.id, title: s.name, text: feedback.prompt, activity: 'feedback', style: deckStyle, feedback }
        : { id: s.id, title: s.name, text: '', activity: 'content', style: deckStyle });
    } else {
      const qs = slides.filter((x) => x.game?.id === g.id && x.game.role === 'question' && x.game.quiz);
      // The phones' skin for a step of the game: its own style, a cover's or a scores slide's the style of the game's questions (a format's name is not a style: 'horse-race' is the style 'race').
      const style = mechanicOf(String(g.quiz?.style ?? qs[0]?.game?.quiz?.style ?? g.format));
      if (g.role === 'question' && g.quiz) {
        const key = g.key ?? s.id;
        if (!asked.has(key)) {
          asked.add(key);
          const quiz = quizOf(s);
          out.push(styleOf(quiz)
            ? { id: s.id, title: quiz.question, text: quiz.question, activity: 'question', gameId: g.id, style: quiz.style, quiz }
            : { id: s.id, title: quiz.question, text: quiz.question, activity: 'moment', gameId: g.id, style });
        }
      } else if (g.role === 'board' && boardOn(g.board)) {
        // A board: one step, the slide SlideForge compiled for it, run by the room's board desk.
        const on = boardOn(g.board)!;
        const title = String(on.slide.title ?? g.label), text = Array.isArray(on.slide.bullets) ? (on.slide.bullets as string[]).join('\n') : '';
        out.push({ id: s.id, title, text, activity: 'moment', gameId: g.id, style: on.kind.style, board: { key: on.kind.key, slide: { ...copy(on.slide), id: s.id } } });
      } else if (g.role === 'end' && slides.some((x) => x.game?.id === g.id && x.game.role === 'board' && boardOn(x.game.board)?.kind.answersOnEnd)) {
        // The board's answers (Low-stakes quiz): its reveal draws them, so they are not a step of their own.
      } else if (roundQuizzes(s).length) {
        // A round played in one go: each of its questions is a step, the first on the round's slide (Beat the clock's sprint asks them all at once).
        roundQuizzes(s).forEach((raw, n) => {
          const quiz = quizOf(s, raw, n ? `${s.id}:${n}` : s.id);
          out.push(styleOf(quiz)
            ? { id: quiz.id, title: quiz.question, text: quiz.question, activity: 'question', gameId: g.id, style: quiz.style, quiz }
            : { id: quiz.id, title: quiz.question, text: quiz.question, activity: 'moment', gameId: g.id, style });
        });
      } else if (g.role !== 'answer') {
        const rounds = slides.filter((x) => x.game?.id === g.id).reduce((n, x) => n + roundQuizzes(x).length, 0);
        const board = slides.map((x) => (x.game?.id === g.id && x.game.role === 'board' ? boardOn(x.game.board) : null)).find(Boolean);
        const said = board?.kind.coverText?.(boardData({ key: board.kind.key, slide: { ...board.slide, id: s.id } }));
        const text = g.role === 'cover' ? said || `${new Set(qs.map((x) => x.game!.key ?? x.id)).size + rounds} questions` : '';
        out.push({ id: s.id, title: g.role === 'cover' ? g.label : s.name, text, activity: 'moment', gameId: g.id, style, results: g.role === 'end' });
      }
      // A style that plays without a scores slide (Odd one out: nobody is scored) ends on its last answer, as classic's game does by default.
      if (lastOf.get(g.id) === k && styleForFormat(g.format)?.scoreSlide !== false && !slides.some((x) => x.game?.id === g.id && x.game.role === 'end')) {
        out.push({ id: `${g.id}:scores`, title: `${g.label} — scores`, text: '', activity: 'moment', gameId: g.id, style, results: true });
      }
    }
  });
  // A style that shapes the game's questions as a set (Time traveler's one line and growing timeline) does so now they are all here.
  const games = new Map<string, RoomQuiz[]>();
  for (const s of out) if (s.quiz && s.gameId) games.set(s.gameId, [...(games.get(s.gameId) ?? []), s.quiz]);
  for (const qs of games.values()) styleOf(qs[0])?.link?.(qs);
  // Teams belong to the room, not to a question: the first game's settings say (a deck of several games shares one set of teams).
  const lead = slides.find((s) => s.game?.id && s.game.settings?.mode != null)?.game?.settings;
  const play = roomPlay(lead);
  const mechanic: Mechanic = deckStyle === 'race' || deckStyle === 'boss' || deckStyle === 'wordreveal' ? deckStyle : 'points';
  const extra: Partial<RoomShow> = {};
  if (mechanic === 'race') extra.trackLength = trackLengthOf(slides.find((s) => s.game?.quiz)?.game?.settings?.trackLength);
  if (mechanic === 'boss') {
    // The boss's own game's questions, not every question in the lesson: a lesson with a boss battle and a quiz beside it gave the boss the quiz's HP too.
    const asked = out.filter((x) => x.quiz && x.gameId);
    const bossGame = (asked.find((x) => x.quiz!.style === 'boss') ?? asked[0])?.gameId;
    extra.bossHp = bossHpOf(asked.filter((x) => x.gameId === bossGame).map((x) => x.quiz!));
  }
  return { title: deck.title, slides: out, mode: play.mode, teams: play.teams, mechanic, ...extra };
}
