// The lesson file (BACKLOG CS-01, docs/lesson-format.md): a lesson written as text, by a person, a script or an AI,
// that the Lesson studio builds in the deck's theme. A slide names one of the studio's layouts and fills its fields;
// the studio places everything, so a file cannot put a box in the wrong place. This file reads and checks one, with
// no drawing in it: what is wrong is reported slide by slide, so whoever wrote it can put it right.

export const LESSON_FORMAT = 'slideforge-lesson/1';

/** What every slide may carry, whatever its layout. */
interface Common {
  /** The slide's own id; made from its position when not given. Letters, digits, - and _. */
  id?: string;
  /** Speaker notes: the teacher's, never shown to the class. */
  notes?: string;
  /** Kept in the deck, left out of the show and the student copy. */
  hidden?: boolean;
  /** A fact on this slide still needs a source: what to check (core/facts.ts). */
  factCheck?: string;
}

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
);

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
};
const COMMON = ['layout', 'id', 'notes', 'hidden', 'factCheck'];

const isText = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';
const isTexts = (v: unknown): v is string[] => Array.isArray(v) && v.length > 0 && v.every(isText);
const isRows = (v: unknown, n: number): v is string[][] => Array.isArray(v) && v.length > 0 && v.every((r) => Array.isArray(r) && r.length === n && r.every((c) => typeof c === 'string'));

/** What is wrong with one slide's fields, in words (empty when nothing is). */
function slideProblems(s: Record<string, unknown>): string[] {
  const out: string[] = [];
  const layout = s.layout as LessonSlide['layout'];
  const spec = LESSON_LAYOUTS[layout];
  if (!spec) return [`"layout" must be one of ${Object.keys(LESSON_LAYOUTS).join(', ')}${s.layout === undefined ? '' : `, not "${String(s.layout)}"`}`];
  for (const k of spec.needs) if (s[k] === undefined) out.push(`a ${layout} slide needs "${k}"`);
  for (const k of Object.keys(s)) if (!COMMON.includes(k) && !spec.needs.includes(k) && !spec.may.includes(k)) out.push(`a ${layout} slide has no field "${k}"`);
  const want = (k: string, ok: boolean, what: string) => { if (s[k] !== undefined && !ok) out.push(`"${k}" must be ${what}`); };
  for (const k of ['title', 'subtitle', 'text', 'credit', 'fact', 'caption', 'takeaway', 'quote', 'who', 'picture', 'notes', 'factCheck', 'id']) {
    if (k === 'title' && layout === 'quiz') { want(k, s[k] === undefined || typeof s[k] === 'string', 'words'); continue; }
    if (spec.needs.includes(k)) want(k, isText(s[k]), 'words, not empty');
    else want(k, typeof s[k] === 'string', 'words');
  }
  if (s.id !== undefined && !/^[A-Za-z0-9_-]{1,64}$/.test(String(s.id))) out.push('"id" may hold only letters, digits, - and _');
  want('hidden', typeof s.hidden === 'boolean', 'true or false');
  want('side', s.side === 'left' || s.side === 'right', '"left" or "right"');
  want('points', isTexts(s.points), 'a list of one or more lines');
  want('details', Array.isArray(s.details) && (s.details as unknown[]).every((x) => typeof x === 'string'), 'a list of lines');
  want('cards', isRows(s.cards, 2) && (s.cards as unknown[]).length <= 4, 'two to four [heading, words] pairs');
  if (Array.isArray(s.cards) && (s.cards as unknown[]).length === 1) out.push('"cards" needs at least two cards');
  want('terms', isRows(s.terms, 2), 'a list of [term, meaning] pairs');
  want('stats', isRows(s.stats, 2) && (s.stats as unknown[]).length <= 4, 'one to four [number, what it counts] pairs');
  want('heads', isRows([s.heads], 2), 'two column headings, as ["A", "B"]');
  if (layout === 'compare') want('rows', isRows(s.rows, 3), 'a list of [row label, A, B]');
  if (layout === 'table') want('rows', isRows(s.rows, Array.isArray((s.rows as unknown[] | undefined)?.[0]) ? ((s.rows as unknown[][])[0]).length : -1), 'a list of rows, each as long as the first (the first row is the header)');
  want('events', isRows(s.events, 3) && (s.events as unknown[]).length <= 6, 'one to six [when, who or what, detail]');
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

/** A lesson file read and checked: the lesson when nothing is wrong, and every problem found either way. */
export function readLesson(input: unknown): { lesson: Lesson | null; problems: string[] } {
  let v = input;
  if (typeof v === 'string') {
    try { v = JSON.parse(v); } catch (e) { return { lesson: null, problems: [`It is not JSON: ${e instanceof Error ? e.message : String(e)}`] }; }
  }
  if (!v || typeof v !== 'object' || Array.isArray(v)) return { lesson: null, problems: ['A lesson file is one JSON object, with "format", "title" and "slides".'] };
  const o = v as Record<string, unknown>;
  const problems: string[] = [];
  if (o.format !== LESSON_FORMAT) problems.push(`"format" must be "${LESSON_FORMAT}"`);
  if (!isText(o.title)) problems.push('"title" must be the lesson\'s name');
  if (o.theme !== undefined && typeof o.theme !== 'string') problems.push('"theme" must be a theme\'s id, such as "paper"');
  for (const k of Object.keys(o)) if (!['format', 'title', 'theme', 'slides'].includes(k)) problems.push(`a lesson has no field "${k}"`);
  if (!Array.isArray(o.slides) || !o.slides.length) problems.push('"slides" must be a list of one or more slides');
  else {
    const ids = new Set<string>();
    o.slides.forEach((s, i) => {
      if (!s || typeof s !== 'object' || Array.isArray(s)) { problems.push(`Slide ${i + 1}: must be an object with a "layout"`); return; }
      for (const p of slideProblems(s as Record<string, unknown>)) problems.push(`Slide ${i + 1}: ${p}.`);
      const id = (s as { id?: unknown }).id;
      if (typeof id === 'string') { if (ids.has(id)) problems.push(`Slide ${i + 1}: the id "${id}" is used twice.`); ids.add(id); }
    });
  }
  return { lesson: problems.length ? null : (o as unknown as Lesson), problems };
}
