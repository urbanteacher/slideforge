import type { LayoutStyle } from '../../layouts';
import { uid, type GameSettings, type Slide } from '../../core';

// A Nodes format: one part of the Nodes method (docs/nodes-studio-plan.md) as something students do,
// designed in the lesson's own style the way the games and activities are (designs/engage/kit.ts). It
// has a starter, the slides it draws from its content, and what Browse says about it.

export interface NodesFormat<C = unknown> {
  id: string;
  label: string;
  /** The part of the Nodes method it teaches, for Browse. */
  part: string;
  aim: string;
  howTo: string[];
  /** What the phones do, in a few words (the wall's ON PHONES cue). */
  phones: string;
  starter: C;
  /** Other starters it comes in, each its own Add in Browse (the Framework: 16 stages or 13). */
  variants?: { id: string; label: string; content: C }[];
  slides: (st: LayoutStyle, content: C) => Slide[];
}

/**
 * How a challenge plays in the room, on the room's own question types (live/styles), so the phones, the
 * marking, the points, the reveal on phone and wall, and Reports are the games' own: a question asked on
 * the slide whose role is `ask`, revealed on the slide whose role is `answer`. `quiz` is SlideForge's
 * compiled question: Multiple choice (`choice`), Ranking (`order`) or a sort into columns (`compare`).
 * `open` puts the idea box on a slide by its role: each student sends one written answer, held until the
 * teacher shows it, for a task with no single right answer.
 */
export interface NodesRoom {
  ask?: string;
  answer?: string;
  quiz?: Record<string, unknown> | null;
  open?: Record<string, string>;
}

const FORMAT_OF: Record<string, string> = { choice: 'choice', order: 'ranking', compare: 'compare-contrast' };

/** Mark a format's slides as one Nodes challenge (slide.nodes), and set how it plays in the room. */
export function marked(format: string, slides: { slide: Slide; role: string }[], content: unknown, room: NodesRoom = {}): Slide[] {
  const id = uid();
  const settings = { seconds: 0, points: 1000 } as GameSettings;
  const style = String(room.quiz?.style ?? 'choice');
  const gameFormat = FORMAT_OF[style] ?? 'choice';
  return slides.map(({ slide, role }) => {
    slide.nodes = { id, format, role, content: structuredClone(content) };
    if (room.quiz && role === room.ask) slide.game = { id, format: gameFormat, label: slide.name, role: 'question', key: id, settings, quiz: { type: 'quiz', ...structuredClone(room.quiz) } };
    else if (room.quiz && role === room.answer) slide.game = { id, format: gameFormat, label: slide.name, role: 'answer', key: id, settings };
    else if (room.quiz === null && role === room.ask) slide.feedback = { kind: 'brainstorm', prompt: 'Write your answer', max: 1, hold: true, presentAs: 'rail' };
    else if (room.open?.[role]) slide.feedback = { kind: 'brainstorm', prompt: room.open[role], max: 1, hold: true, presentAs: 'rail' };
    return slide;
  });
}

/** A Multiple choice question for the room. */
export const choiceQuiz = (question: string, options: string[], correct: number, explanation = '') =>
  ({ style: 'choice', input: 'choice', question, options, correct: Math.max(0, correct), explanation });
/** A Ranking question: the items in their right order (the phones get them mixed), worth its points like the others. */
export const orderQuiz = (question: string, items: string[]) =>
  items.length >= 3 && items.length <= 8 ? { style: 'order', input: 'order', question, options: items, scaled: true } : null;
/** A sort into columns: each statement's right column by index. */
/** A sort into columns: each statement's right column by index. The phones sort into exactly three columns, so two
 *  gain a middle "Both" (the confusion a Keep-them-apart is about); more than three, or a list the relay won't carry
 *  (2–10 statements), is not asked and the question slide takes a written answer instead. */
export function sortQuiz(question: string, bins: string[], statements: string[], right: number[]) {
  if (statements.length < 2 || statements.length > 10 || bins.length < 2 || bins.length > 3) return null;
  const three = bins.length === 2 ? [bins[0], 'Both', bins[1]] : bins;
  const at = bins.length === 2 ? right.map((r) => (r === 1 ? 2 : 0)) : right;
  return { style: 'compare', input: 'sort', question, options: statements, sortBins: three, sortAnswers: at, compareSort: true, compareDiscuss: false };
}
