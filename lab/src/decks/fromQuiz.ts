import type { Slide } from '../core';
import { HAS_LOOKS, gameSlides, type ShowcaseGame } from '../designs';
import type { LayoutStyle } from '../layouts';
import type { SFSlide } from './fromSlideForge';

// SlideForge's quiz slides left in a lesson (lab-engine-plan M13). Older SlideForge decks authored their
// questions as quiz slides; SlideForge moves them into a game when it migrates the deck (src/model.js
// migrateDeckQuizzes), and a lesson saved without that keeps them. Here they become what that migration
// makes of them: one game of the lesson's questions (one per SlideForge game a question names), each
// question asked where it stands and answered on the slide after, scored together in the room. A results
// slide after them is that game's scores (fromSlideForge.ts).

/** A classic question slide: the fields this reads. The rest travel with the question as SlideForge compiled it. */
export type QuizSlide = SFSlide & { question?: string; format?: string; style?: string; input?: string; gameTitle?: string };

/** SlideForge's styles that a format of another name plays (src/games/catalogue.js FORMAT_STYLE, read backwards). */
const STYLE_FORMAT: Record<string, string> = {
  lowstakes: 'low-stakes-quiz', bowl: 'quiz-bowl', speed: 'beat-the-clock', boss: 'boss-battle', race: 'horse-race',
  memoryflip: 'memory-flip', memorymatch: 'memory-match', knowledgeflip: 'knowledge-flip', definition: 'definition-challenge',
  emoji: 'emoji-guess', wordreveal: 'word-reveal', fill: 'fill-in-the-blanks', headsup: 'heads-up', spinexplain: 'spin-explain',
  spot: 'spot-the-error', order: 'ranking', oddone: 'odd-one-out', connection: 'connection-maker', randomchallenge: 'random-challenge',
  conceptchain: 'concept-chain', compare: 'compare-contrast',
};
/** The format a question is played as: its own, else its style's, else multiple choice (an older deck's quiz slide has neither). */
export const quizFormat = (s: QuizSlide) => String(s.format || STYLE_FORMAT[s.style ?? ''] || s.style || 'choice');
/** The game a question is part of: its SlideForge game's, or the lesson's, in its format. */
const groupOf = (s: QuizSlide) => `${s.gameId || 'lesson'}:${quizFormat(s)}`;
/** The lab game's id for a group: the same however often the lesson is read, so a copy brought up to date later joins it. */
export const quizGameId = (s: QuizSlide) => `sf-quiz-${groupOf(s)}`;
const asked = (s: SFSlide): s is QuizSlide => s.type === 'quiz' && !!String((s as QuizSlide).question ?? '').trim();

/** The question as the lab's game code reads a compiled one (js/lab-engine.js gameForLab drops the same fields). */
function question(s: QuizSlide, img: (p?: string) => string): ShowcaseGame['slides'][number] {
  const { id: _id, transition: _t, layers: _l, gameId: _g, hidden: _h, notes: _n, ...q } = s as QuizSlide & { transition?: unknown; layers?: unknown };
  const out = { ...q, type: 'quiz' } as ShowcaseGame['slides'][number];
  if (out.image) out.image = img(out.image);
  return out;
}

/** Each asked question of the lesson as its lab slides (the question, then its answer), by the slide it came from.
 *  A format the lab plays only as a whole board (Low-stakes quiz, the memory boards, Bingo, Quiz bowl) has no
 *  question and answer of its own to make, so its slides stay SlideForge's. */
export function leftoverQuizzes(source: SFSlide[], st: LayoutStyle, img: (p?: string) => string): Map<SFSlide, Slide[]> {
  const out = new Map<SFSlide, Slide[]>();
  const groups = new Map<string, QuizSlide[]>();
  for (const s of source) if (asked(s)) groups.set(groupOf(s), [...(groups.get(groupOf(s)) ?? []), s]);
  for (const qs of groups.values()) {
    const format = quizFormat(qs[0]), label = String(qs[0].gameTitle || 'Quiz');
    const g: ShowcaseGame = { format, style: String(qs[0].style || format), label, styleLabel: label, aim: '', howToPlay: [], title: label,
      // Multiple choice and true or false look as SlideForge showed them, buttons, as a lesson's games do (js/lab-engine.js).
      look: HAS_LOOKS.has(format) ? 'buttons' : undefined, slides: qs.map((s) => question(s, img)) };
    for (const x of gameSlides(g, st)) {
      const role = x.game?.role;
      const owner = role === 'question' || role === 'answer' ? qs[Number(x.game!.key)] : undefined;
      if (!owner) continue;
      x.game!.id = quizGameId(owner);
      out.set(owner, [...(out.get(owner) ?? []), x]);
    }
  }
  return out;
}

