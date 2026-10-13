// What the room steps through: one step per slide the room sees, read from a lab deck. A lab game's slides
// carry what the room needs (slide.game, designs/engage/games.ts tagGame and finishGame): its cover, its
// questions (game.quiz, SlideForge's own compiled question) and their answers. As in src/deck/labshow.js,
// a question is asked where its first drawing stands, its answer is that question's reveal (not a step of
// its own), and the game's scores follow its last slide.
//
// The room asks the questions of the styles in styles/ (Multiple choice, True or false, Type answer, Slider). Any other question is shown, not asked.
// A slide with audience feedback (poll, word cloud, brainstorm, scale) is a step that opens a prompt (feedback.ts).

import type { Deck, Slide } from '../core';
import { gameStyle } from '@sf/games/registry.js';
import { feedbackOf, type RoomFeedback } from './feedback';
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
}

/** The steps, and how the room plays: individual, or teams with their names (the first game's settings, as classic's buildRunDeck reads them). */
export interface RoomShow { title: string; slides: RoomSlide[]; mode?: 'individual' | 'teams'; teams?: string[] }

const copy = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
/** A game's own phone skin off its questions (classic `Live.mechanic`): Multiple choice is 'points'. */
const mechanicOf = (style: string) => String(gameStyle(style)?.mechanic ?? 'quiz');

/** A lab question as the room's quiz: the game's question with the Game panel's settings over it (labshow.js quizSlide). */
function quizOf(s: Slide): RoomQuiz {
  const g = s.game!, set = g.settings ?? {};
  const q = Object.assign({ type: 'quiz', style: 'choice', input: 'choice', correct: 0, points: 1000, explanation: '', options: [], question: '' }, copy(g.quiz ?? {})) as unknown as RoomQuiz;
  q.id = s.id;
  q.timeLimit = (set.seconds ?? 0) > 0 ? set.seconds! : 0;
  if (set.points != null) q.points = set.points;
  q.gameId = g.id;
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
      const style = mechanicOf(String(g.quiz?.style ?? g.format));
      const qs = slides.filter((x) => x.game?.id === g.id && x.game.role === 'question' && x.game.quiz);
      if (g.role === 'question' && g.quiz) {
        const key = g.key ?? s.id;
        if (!asked.has(key)) {
          asked.add(key);
          const quiz = quizOf(s);
          out.push(styleOf(quiz)
            ? { id: s.id, title: quiz.question, text: quiz.question, activity: 'question', gameId: g.id, style: quiz.style, quiz }
            : { id: s.id, title: quiz.question, text: quiz.question, activity: 'moment', gameId: g.id, style });
        }
      } else if (g.role !== 'answer') {
        const text = g.role === 'cover' ? `${new Set(qs.map((x) => x.game!.key ?? x.id)).size} questions` : '';
        out.push({ id: s.id, title: g.role === 'cover' ? g.label : s.name, text, activity: 'moment', gameId: g.id, style, results: g.role === 'end' });
      }
      // A style that plays without a scores slide (Odd one out: nobody is scored) ends on its last answer, as classic's game does by default.
      if (lastOf.get(g.id) === k && styleForFormat(g.format)?.scoreSlide !== false && !slides.some((x) => x.game?.id === g.id && x.game.role === 'end')) {
        out.push({ id: `${g.id}:scores`, title: `${g.label} — scores`, text: '', activity: 'moment', gameId: g.id, style, results: true });
      }
    }
  });
  // Teams belong to the room, not to a question: the first game's settings say (a deck of several games shares one set of teams).
  const lead = slides.find((s) => s.game?.id && s.game.settings?.mode != null)?.game?.settings;
  const play = roomPlay(lead);
  return { title: deck.title, slides: out, mode: play.mode, teams: play.teams };
}
