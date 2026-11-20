// The lesson file (BACKLOG CS-01, docs/lesson-format.md): a lesson written as text, by a person, a script or an AI,
// that the Lesson studio builds in the deck's theme. A slide names one of the studio's layouts and fills its fields;
// the studio places everything, so a file cannot put a box in the wrong place. This file reads and checks one, with
// no drawing in it: what is wrong is reported slide by slide, so whoever wrote it can put it right.

import icons from '../assets/icons.json';
import { iconName } from '../kinds/icon';
import { WIDGET_MAX } from '../engine';
import { paletteGroups } from '../theme';

export const LESSON_FORMAT = 'slideforge-lesson/1';

/** The built-in themes' ids, as layouts/style.ts LAYOUT_STYLES has them (kept here so reading a file loads no layout;
 *  tests/lesson-layouts.test.ts holds the two lists together). The first is the default. */
export const LESSON_THEME_IDS = ['paper', 'navy', 'midnight', 'cinematic', 'mono'];

/** The icon names a lesson file may use (assets/icons.json, from Lucide). Lucide's older names for them (home for
 *  house) are read too (`iconName`). */
export const LESSON_ICONS: string[] = Object.keys((icons as unknown as { icons: Record<string, unknown> }).icons);

/** What every slide may carry, whatever its layout. */
interface Common {
  /** The slide's own id; made from its position when not given. Letters, digits, - and _. */
  id?: string;
  /** Speaker notes: the teacher's, never shown to the class. */
  notes?: string;
  /** Kept in the deck, left out of the show and the student copy. */
  hidden?: boolean;
  /** "teacher": in the show and the teacher's copy, left out of the student copy. */
  audience?: 'teacher';
  /** A fact on this slide still needs a source: what to check (core/facts.ts). */
  factCheck?: string;
  /** Reveal the slide's items a click at a time: "click" shows each in turn, "dim" fades the earlier ones, "spot"
   *  lights only the newest. Bullets, cards, keywords, stats, timeline, icons, journey, funnel, mind map, columns, rail. */
  build?: LessonBuild;
}

export type LessonBuild = 'click' | 'dim' | 'spot';

export type LessonSlide = Common & (
  | { layout: 'title'; title: string; subtitle?: string }
  | { layout: 'section'; title: string; subtitle?: string }
  | { layout: 'statement'; text: string; credit?: string }
  | { layout: 'bullets'; title: string; points: string[] }
  | { layout: 'cards'; title: string; cards: [string, string][] }
  | { layout: 'keyfact'; title: string; fact: string; caption?: string; details?: string[] }
  | { layout: 'keywords'; title: string; terms: [string, string][] }
  | { layout: 'stats'; title: string; stats: [string, string][]; takeaway?: string }
  | { layout: 'compare'; title: string; heads: [string, string]; rows: [string, string, string][] }
  | { layout: 'table'; title: string; rows: string[][] }
  | { layout: 'quote'; quote: string; who?: string }
  | { layout: 'split'; title: string; points: string[]; picture?: string; side?: 'left' | 'right' }
  | { layout: 'timeline'; title: string; subtitle?: string; events: [string, string, string][] }
  | { layout: 'quiz'; title?: string; questions: LessonQuestion[] }
  | { layout: 'widget'; title?: string; html: string }
  | { layout: 'icons'; title: string; items: [string, string, string][] }
  | { layout: 'picture'; picture: string; title?: string; credit?: string }
  | { layout: 'pictures'; title: string; pictures: [string, string][] }
  | { layout: 'video'; title: string; url: string; subtitle?: string }
  | { layout: 'chart'; title: string; chart?: 'column' | 'bar' | 'line' | 'pie' | 'donut'; data: [string, number][]; source?: string }
  | { layout: 'diagram'; title: string; diagram?: 'loop' | 'flowchart'; steps: string[] }
  | { layout: 'journey'; title: string; subtitle?: string; steps: [string, string][] }
  | { layout: 'funnel'; title: string; subtitle?: string; stages: [string, string, string][] }
  | { layout: 'mindmap'; title: string; ideas: [string, string][] }
  | { layout: 'orgchart'; title: string; people: [string, string, string][] }
  | { layout: 'columns'; title: string; points: string[] }
  | { layout: 'rail'; title: string; points: string[] }
  | { layout: 'introduction'; name: string; role?: string; bio?: string }
  | { layout: 'code'; title: string; code: string; language?: string }
);

/** How many items a layout lays out on one slide. A lesson slide with more continues onto a second slide (and a
 *  third…) in the same layout, each with the slide's title, rather than dropping the rest or being refused. */
export const LESSON_CAPS: Partial<Record<LessonSlide['layout'], { field: string; cap: number }>> = {
  cards: { field: 'cards', cap: 4 }, keywords: { field: 'terms', cap: 6 }, stats: { field: 'stats', cap: 4 },
  timeline: { field: 'events', cap: 6 }, icons: { field: 'items', cap: 6 }, journey: { field: 'steps', cap: 6 },
  funnel: { field: 'stages', cap: 6 }, mindmap: { field: 'ideas', cap: 8 }, columns: { field: 'points', cap: 4 },
  rail: { field: 'points', cap: 6 }, pictures: { field: 'pictures', cap: 8 },
};

/** How many slides one lesson slide makes once it is split at its layout's cap (a quiz counts its own). */
export function piecesOf(s: Record<string, unknown>): number {
  const c = LESSON_CAPS[s.layout as LessonSlide['layout']];
  const list = c ? s[c.field] : undefined;
  return c && Array.isArray(list) ? Math.max(1, Math.ceil(list.length / c.cap)) : 1;
}

/** A multiple-choice question: `answer` is the right option's number from 1, or its words. */
export interface LessonQuestion { question: string; options: string[]; answer: number | string; explanation?: string }

export interface Lesson { format: typeof LESSON_FORMAT; title: string; theme?: string; slides: LessonSlide[] }

/** The layouts a lesson file may name, with what each needs, for the reader's checks and the format's page. */
export const LESSON_LAYOUTS: Record<LessonSlide['layout'], { needs: string[]; may: string[] }> = {
  title: { needs: ['title'], may: ['subtitle'] },
  section: { needs: ['title'], may: ['subtitle'] },
  statement: { needs: ['text'], may: ['credit'] },
  bullets: { needs: ['title', 'points'], may: [] },
  cards: { needs: ['title', 'cards'], may: [] },
  keyfact: { needs: ['title', 'fact'], may: ['caption', 'details'] },
  keywords: { needs: ['title', 'terms'], may: [] },
  stats: { needs: ['title', 'stats'], may: ['takeaway'] },
  compare: { needs: ['title', 'heads', 'rows'], may: [] },
  table: { needs: ['title', 'rows'], may: [] },
  quote: { needs: ['quote'], may: ['who'] },
  split: { needs: ['title', 'points'], may: ['picture', 'side'] },
  timeline: { needs: ['title', 'events'], may: ['subtitle'] },
  quiz: { needs: ['questions'], may: ['title'] },
  widget: { needs: ['html'], may: ['title'] },
  icons: { needs: ['title', 'items'], may: [] },
  picture: { needs: ['picture'], may: ['title', 'credit'] },
  pictures: { needs: ['title', 'pictures'], may: [] },
  video: { needs: ['title', 'url'], may: ['subtitle'] },
  chart: { needs: ['title', 'data'], may: ['chart', 'source'] },
  diagram: { needs: ['title', 'steps'], may: ['diagram'] },
  journey: { needs: ['title', 'steps'], may: ['subtitle'] },
  funnel: { needs: ['title', 'stages'], may: ['subtitle'] },
  mindmap: { needs: ['title', 'ideas'], may: [] },
  orgchart: { needs: ['title', 'people'], may: [] },
  columns: { needs: ['title', 'points'], may: [] },
  rail: { needs: ['title', 'points'], may: [] },
  introduction: { needs: ['name'], may: ['role', 'bio'] },
  code: { needs: ['title', 'code'], may: ['language'] },
};
/** The layouts a `build` reveals item by item. */
export const BUILD_LAYOUTS: LessonSlide['layout'][] = ['bullets', 'cards', 'keywords', 'stats', 'timeline', 'icons', 'journey', 'funnel', 'mindmap', 'columns', 'rail'];
const COMMON = ['layout', 'id', 'notes', 'hidden', 'audience', 'factCheck', 'build'];

const isText = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';
const isTexts = (v: unknown): v is string[] => Array.isArray(v) && v.length > 0 && v.every(isText);
const isRows = (v: unknown, n: number): v is string[][] => Array.isArray(v) && v.length > 0 && v.every((r) => Array.isArray(r) && r.length === n && r.every((c) => typeof c === 'string'));

/** What is wrong with one slide's fields, in words (empty when nothing is), and what is only worth saying (`warn`):
 *  the lesson is still built. */
function slideProblems(s: Record<string, unknown>, warn: (w: string) => void = () => {}): string[] {
  const out: string[] = [];
  const layout = s.layout as LessonSlide['layout'];
  // Own keys only: "constructor" or "__proto__" is not a layout.
  const spec = typeof layout === 'string' && Object.hasOwn(LESSON_LAYOUTS, layout) ? LESSON_LAYOUTS[layout] : undefined;
  if (!spec) return [`"layout" must be one of ${Object.keys(LESSON_LAYOUTS).join(', ')}${s.layout === undefined ? '' : `, not "${String(s.layout)}"`}`];
  for (const k of spec.needs) if (s[k] === undefined) out.push(`a ${layout} slide needs "${k}"`);
  for (const k of Object.keys(s)) if (!COMMON.includes(k) && !spec.needs.includes(k) && !spec.may.includes(k)) out.push(`a ${layout} slide has no field "${k}"`);
  const want = (k: string, ok: boolean, what: string) => { if (s[k] !== undefined && !ok) out.push(`"${k}" must be ${what}`); };
  for (const k of ['title', 'subtitle', 'text', 'credit', 'fact', 'caption', 'takeaway', 'quote', 'who', 'picture', 'notes', 'factCheck', 'id']) {
    if (k === 'title' && (layout === 'quiz' || layout === 'widget')) { want(k, s[k] === undefined || typeof s[k] === 'string', 'words'); continue; }
    if (spec.needs.includes(k)) want(k, isText(s[k]), 'words, not empty');
    else want(k, typeof s[k] === 'string', 'words');
  }
  if (s.id !== undefined && !/^[A-Za-z0-9_-]{1,64}$/.test(String(s.id))) out.push('"id" may hold only letters, digits, - and _');
  want('hidden', typeof s.hidden === 'boolean', 'true or false');
  want('audience', s.audience === 'teacher', '"teacher"');
  want('side', s.side === 'left' || s.side === 'right', '"left" or "right"');
  want('points', isTexts(s.points), 'a list of one or more lines');
  want('details', Array.isArray(s.details) && (s.details as unknown[]).every((x) => typeof x === 'string'), 'a list of lines');
  want('cards', isRows(s.cards, 2), 'two or more [heading, words] pairs');
  if (Array.isArray(s.cards) && (s.cards as unknown[]).length === 1) out.push('"cards" needs at least two cards');
  want('terms', isRows(s.terms, 2), 'one or more [term, meaning] pairs');
  want('stats', isRows(s.stats, 2), 'one or more [number, what it counts] pairs');
  want('heads', isRows([s.heads], 2), 'two column headings, as ["A", "B"]');
  if (layout === 'compare') want('rows', isRows(s.rows, 3), 'a list of [row label, A, B]');
  if (layout === 'table') want('rows', isRows(s.rows, Array.isArray((s.rows as unknown[] | undefined)?.[0]) ? ((s.rows as unknown[][])[0]).length : -1), 'a list of rows, each as long as the first (the first row is the header)');
  want('events', isRows(s.events, 3), 'one or more [when, who or what, detail]');
  if (layout === 'icons') {
    want('items', isRows(s.items, 3) && (s.items as unknown[]).length >= 2, 'two or more [icon, label, what it means]');
    // An icon the set does not have is said, not refused: the slide is built with a marked empty square in its place.
    if (isRows(s.items, 3)) (s.items as string[][]).forEach((r, i) => { if (!iconName(r[0])) warn(`row ${i + 1}'s icon "${r[0]}" is not in the studio's set, so it is shown as an empty square to fill in (docs/lesson-format.md lists them)`); });
  }
  // A layout's cap is said, not refused: the rest continue on the next slide.
  const cap = LESSON_CAPS[layout];
  if (cap && Array.isArray(s[cap.field]) && (s[cap.field] as unknown[]).length > cap.cap) {
    const n = (s[cap.field] as unknown[]).length;
    warn(`a ${layout} slide holds ${cap.cap} ${cap.field}; this one has ${n}, so it carries on over ${Math.ceil(n / cap.cap)} slides`);
  }
  want('build', ['click', 'dim', 'spot'].includes(String(s.build)), '"click", "dim" or "spot"');
  if (s.build !== undefined && !BUILD_LAYOUTS.includes(layout)) out.push(`a ${layout} slide has nothing to build; "build" is for ${BUILD_LAYOUTS.join(', ')}`);
  for (const k of ['url', 'source', 'language', 'name', 'role', 'bio', 'code']) want(k, spec.needs.includes(k) ? isText(s[k]) : typeof s[k] === 'string', spec.needs.includes(k) ? 'words, not empty' : 'words');
  if (layout === 'pictures') want('pictures', isRows(s.pictures, 2) && (s.pictures as unknown[]).length >= 2, 'two or more [picture address, caption]');
  if (layout === 'chart') {
    want('chart', ['column', 'bar', 'line', 'pie', 'donut'].includes(String(s.chart)), 'one of column, bar, line, pie, donut');
    want('data', Array.isArray(s.data) && (s.data as unknown[]).length > 0 && (s.data as unknown[]).every((r) => Array.isArray(r) && r.length === 2 && typeof r[0] === 'string' && typeof r[1] === 'number' && Number.isFinite(r[1])), 'a list of [label, number]');
  }
  if (layout === 'diagram') {
    want('diagram', s.diagram === 'loop' || s.diagram === 'flowchart', '"loop" or "flowchart"');
    want('steps', isTexts(s.steps) && (s.steps as unknown[]).length >= 2, 'a list of two or more steps');
  } else if (layout === 'journey') want('steps', isRows(s.steps, 2), 'a list of [step, what happens]');
  if (layout === 'funnel') want('stages', isRows(s.stages, 3), 'a list of [stage, number, what it counts]');
  if (layout === 'mindmap') want('ideas', isRows(s.ideas, 2), 'a list of [idea, a line on it]');
  if (layout === 'orgchart') want('people', isRows(s.people, 3), 'a list of [name, role, who they report to, or ""]');
  if (layout === 'widget') {
    want('html', isText(s.html), 'the widget\'s page, as HTML');
    if (typeof s.html === 'string' && s.html.length > WIDGET_MAX) out.push(`"html" is ${(s.html.length / 1024).toFixed(1)} KB; a widget's page may be ${WIDGET_MAX / 1024} KB at most`);
  }
  if (layout === 'quiz') {
    const qs = s.questions;
    if (s.questions !== undefined && (!Array.isArray(qs) || !qs.length)) out.push('"questions" must be a list of one or more questions');
    else if (Array.isArray(qs)) qs.forEach((q: Record<string, unknown>, i) => {
      const at = `question ${i + 1}`;
      if (!q || typeof q !== 'object') { out.push(`${at} must be { question, options, answer }`); return; }
      if (!isText(q.question)) out.push(`${at} needs "question"`);
      if (!isTexts(q.options) || (q.options as string[]).length < 2 || (q.options as string[]).length > 4) out.push(`${at} needs two to four "options"`);
      else if (answerIndex(q as unknown as LessonQuestion) < 0) out.push(`${at}'s "answer" must be an option's number from 1, or its exact words`);
      if (q.explanation !== undefined && typeof q.explanation !== 'string') out.push(`${at}'s "explanation" must be words`);
      for (const k of Object.keys(q)) if (!['question', 'options', 'answer', 'explanation'].includes(k)) out.push(`${at} has no field "${k}"`);
    });
  }
  return out;
}

/** The right option's place from 0, or -1 when `answer` names none of them. */
export function answerIndex(q: LessonQuestion): number {
  if (typeof q.answer === 'number') return Number.isInteger(q.answer) && q.answer >= 1 && q.answer <= q.options.length ? q.answer - 1 : -1;
  return typeof q.answer === 'string' ? q.options.findIndex((o) => o.trim() === String(q.answer).trim()) : -1;
}

/** A lesson file read and checked: the lesson when nothing is wrong, every problem found either way, and what is
 *  worth saying about a lesson that is still built (an icon the set does not have). */
export function readLesson(input: unknown): { lesson: Lesson | null; problems: string[]; warnings: string[] } {
  const warnings: string[] = [];
  let v = input;
  if (typeof v === 'string') {
    try { v = JSON.parse(v); } catch (e) { return { lesson: null, problems: [`It is not JSON: ${e instanceof Error ? e.message : String(e)}`], warnings }; }
  }
  if (!v || typeof v !== 'object' || Array.isArray(v)) return { lesson: null, problems: ['A lesson file is one JSON object, with "format", "title" and "slides".'], warnings };
  const o = v as Record<string, unknown>;
  const problems: string[] = [];
  if (o.format !== LESSON_FORMAT) problems.push(`"format" must be "${LESSON_FORMAT}"`);
  if (!isText(o.title)) problems.push('"title" must be the lesson\'s name');
  if (o.theme !== undefined && typeof o.theme !== 'string') problems.push('"theme" must be a theme\'s id, such as "paper"');
  else if (typeof o.theme === 'string' && !LESSON_THEME_IDS.includes(o.theme) && !paletteGroups().some((g) => g.presets.some((p) => p.id === o.theme))) {
    warnings.push(`"theme" "${o.theme}" is not one of the studio's themes (${LESSON_THEME_IDS.join(', ')}) or a palette's id, so the lesson is built in Paper.`);
  }
  for (const k of Object.keys(o)) if (!['format', 'title', 'theme', 'slides'].includes(k)) problems.push(`a lesson has no field "${k}"`);
  if (!Array.isArray(o.slides) || !o.slides.length) problems.push('"slides" must be a list of one or more slides');
  else {
    // Every id the lesson's slides will have: a quiz with id "check" and three questions makes "check", "check-2" and
    // "check-3" (decks/fromLesson.ts), so those are taken too.
    const ids = new Map<string, { slide: number; made: boolean }>();
    const take = (id: string, i: number, made: boolean) => {
      const was = ids.get(id);
      if (!was) { ids.set(id, { slide: i, made }); return; }
      problems.push(was.made || made
        ? `Slide ${i + 1}: the id "${id}" is taken: the quiz on slide ${(was.made ? was.slide : i) + 1} numbers its questions' slides this way.`
        : `Slide ${i + 1}: the id "${id}" is used twice.`);
    };
    o.slides.forEach((s, i) => {
      if (!s || typeof s !== 'object' || Array.isArray(s)) { problems.push(`Slide ${i + 1}: must be an object with a "layout"`); return; }
      for (const p of slideProblems(s as Record<string, unknown>, (w) => warnings.push(`Slide ${i + 1}: ${w}.`))) problems.push(`Slide ${i + 1}: ${p}.`);
      const { id, layout, questions } = s as { id?: unknown; layout?: unknown; questions?: unknown };
      if (typeof id !== 'string') return;
      take(id, i, false);
      if (layout === 'quiz' && Array.isArray(questions)) for (let k = 2; k <= questions.length; k++) take(`${id}-${k}`, i, true);
      for (let k = 2; k <= piecesOf(s as Record<string, unknown>); k++) take(`${id}-${k}`, i, true);
    });
  }
  return { lesson: problems.length ? null : (o as unknown as Lesson), problems, warnings };
}
