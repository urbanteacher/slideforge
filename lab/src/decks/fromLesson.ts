// A lesson file built as a studio deck (BACKLOG CS-01, docs/lesson-format.md). Each slide is made by the layout it
// names, in the deck's theme, exactly as the Gallery would insert it with these words: the file says what, the
// studio decides where. Read and check the file first (lessonFormat.ts readLesson).
import { blankDeck, createLayer, uid, type Deck, type Slide } from '../core';
import { iconName } from '../kinds/icon';
import {
  CONTENT_FOOT, CONTENT_TOP, DEFAULT_THEME, cell, themeCopyOf, LAYOUT_STYLES, blockSlide, titleBar, titleRow, bulletsSlide, cardsSlide, compareSlide, credit, keyfactSlide, keywordsSlide, quoteSlide,
  sectionSlide, splitSlide, statement, statsSlide, tableSlide, themeOf, timelineSlide, titleSlide, type LayoutStyle,
} from '../layouts';
import { gameSlides, type ShowcaseGame } from '../designs';
import { answerIndex, type Lesson, type LessonSlide } from './lessonFormat';

/** The themes a lesson file may name: the studio's built-in ones, by id. */
export const LESSON_THEMES = LAYOUT_STYLES.map((s) => s.id);

/** A multiple-choice game holding these questions, made from the starter's own game (assets/games.json 'choice'),
 *  so it plays in the room exactly as one inserted from Browse. */
function quizSlides(s: Extract<LessonSlide, { layout: 'quiz' }>, st: LayoutStyle, starter: ShowcaseGame): Slide[] {
  const template = starter.slides.find((q) => q.type === 'quiz');
  if (!template) throw new Error('The multiple-choice starter has no question to copy.');
  const title = s.title?.trim() || starter.title;
  const asked = s.questions.map((q, i) => ({
    ...structuredClone(template), question: q.question, options: [...q.options], correct: answerIndex(q),
    explanation: q.explanation ?? '', gameTitle: title, questionNumber: i + 1,
  }));
  const kept = starter.slides.filter((q) => q.type !== 'quiz').map((q) => (q.type === 'section'
    ? { ...structuredClone(q), title, subtitle: `${asked.length} question${asked.length === 1 ? '' : 's'}` }
    : structuredClone(q)));
  return gameSlides({ ...starter, title, label: title, slides: [...kept, ...asked] }, st);
}

/** One slide of the file, as its layout builds it. */
function build(s: LessonSlide, st: LayoutStyle): Slide {
  switch (s.layout) {
    case 'title': return titleSlide(st, s.title, s.subtitle ?? '');
    case 'section': return sectionSlide(st, s.title, s.subtitle ?? '');
    case 'statement': return blockSlide(st, 'Statement', [
      statement(st, s.text, { x: 352, y: 315, w: 1215, h: 350, rot: 0 }, 168, 'center'),
      ...(s.credit ? [credit(st, s.credit, { x: 360, y: 709, w: 1200, h: 54, rot: 0 }, 'center')] : []),
    ]);
    case 'bullets': return bulletsSlide(st, s.title, s.points);
    case 'cards': return cardsSlide(st, s.title, s.cards);
    case 'keyfact': return keyfactSlide(st, s.title, s.fact, s.caption ?? '', s.details ?? []);
    case 'keywords': return keywordsSlide(st, s.title, s.terms);
    case 'stats': return statsSlide(st, s.title, s.stats, s.takeaway ?? '');
    case 'compare': return compareSlide(st, s.title, s.heads, s.rows);
    case 'table': return tableSlide(st, s.title, s.rows.map((r) => r.map((c) => c.replace(/[\t\n]/g, ' ')).join('\t')).join('\n'));
    case 'quote': return quoteSlide(st, s.quote, s.who ?? '');
    case 'timeline': return timelineSlide(st, s.title, s.subtitle ?? '', s.events);
    case 'split': {
      const made = splitSlide(st, s.title, s.points, s.side ?? 'right');
      const pic = made.layers.find((l) => l.kind === 'image');
      if (pic && s.picture) pic.params.src = s.picture;
      return made;
    }
    case 'widget': {
      // The heading row, and the widget below it across the grid (kinds/widget): it runs in the show.
      const top = s.title?.trim() ? CONTENT_TOP : 140;
      const widget = createLayer('widget', { name: s.title?.trim() || 'Widget', params: { html: s.html, background: '#ffffff', radius: 24 } as never, box: { x: cell(1, 1, 12, 1).x, y: top, w: cell(1, 1, 12, 1).w, h: CONTENT_FOOT - top, rot: 0 }, anim: { type: 'fade', duration: 0.5 } });
      return blockSlide(st, s.title?.trim() || 'Widget', s.title?.trim() ? [titleRow(st, s.title.trim()), titleBar(st), widget] : [widget]);
    }
    case 'icons': {
      // The keywords layout with an icon in the theme's accent before each row. The label keeps its width (its size
      // was fitted to it) and moves right; the meaning, which can wrap, gives up the room.
      const made = keywordsSlide(st, s.title, s.items.map(([, term, words]) => [term, words]));
      const terms = made.layers.filter((l) => l.name === 'Keyword');
      const meanings = made.layers.filter((l) => l.kind === 'text' && l.name !== 'Keyword' && terms.some((t) => t.box && l.box && Math.abs(l.box.y - t.box.y) < 1 && l.box.x > t.box.x));
      terms.forEach((t, i) => {
        const b = t.box!, size = Math.min(100, Math.max(56, b.h * 0.8)), shift = size + 28;
        const icon = createLayer('icon', { name: `Icon · ${s.items[i][0]}`, params: { icon: iconName(s.items[i][0]) ?? s.items[i][0], color: st.accent, stroke: 2, disc: '', align: 'left' } as never, box: { x: b.x, y: b.y + (b.h - size) / 2, w: size, h: size, rot: 0 }, anim: { type: 'fade', duration: 0.5 } });
        t.box = { ...b, x: b.x + shift };
        const m = meanings.find((l) => Math.abs(l.box!.y - b.y) < 1);
        if (m?.box) m.box = { ...m.box, x: m.box.x + shift, w: Math.max(200, m.box.w - shift) };
        made.layers.splice(made.layers.indexOf(t), 0, icon);
      });
      return made;
    }
    case 'quiz': throw new Error('A quiz is built as a game.');
  }
}

/**
 * The deck a checked lesson file makes. `choiceStarter` is the multiple-choice game a quiz slide is made from
 * (assets/games.json, format 'choice'); a lesson with a quiz and no starter is refused.
 */
export function deckFromLesson(lesson: Lesson, choiceStarter?: ShowcaseGame): Deck {
  const deck = blankDeck();
  deck.title = lesson.title.trim();
  deck.theme = lesson.theme && LESSON_THEMES.includes(lesson.theme) ? lesson.theme : DEFAULT_THEME.id;
  const st = themeOf(deck) ?? DEFAULT_THEME;
  deck.themeCopy = themeCopyOf(st);
  deck.slides = lesson.slides.flatMap((s, i) => {
    if (s.layout === 'quiz' && !choiceStarter) throw new Error(`Slide ${i + 1} is a quiz, and the multiple-choice game could not be loaded.`);
    const made = s.layout === 'quiz' ? quizSlides(s, st, choiceStarter!) : [build(s, st)];
    made.forEach((m, k) => {
      m.id = s.id ? (k ? `${s.id}-${k + 1}` : s.id) : uid();
      if (k === 0 && s.notes) m.notes = s.notes;
      if (s.hidden) m.hidden = true;
      if (k === 0 && typeof s.factCheck === 'string') m.factCheck = { note: s.factCheck };
    });
    return made;
  });
  return deck;
}

/** The multiple-choice game a quiz slide is made from (assets/games.json), loaded only when a lesson has a quiz. */
export async function loadChoiceStarter(): Promise<ShowcaseGame | undefined> {
  const gj = await import('../assets/games.json');
  const bank = ((gj as { default?: { games: ShowcaseGame[] } }).default ?? (gj as unknown as { games: ShowcaseGame[] })).games;
  return bank.find((g) => g.format === 'choice');
}
