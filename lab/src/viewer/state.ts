// The studio viewer's state, with no page in it (lab-engine-plan M12): what a share link asks for, the shared lab
// deck as the viewer plays it, where a followed room is, and the practice questions with their marking. The page
// (viewer/page.ts) draws it; the tests read it.
import { packPictures, unpackPictures, type Deck, type Slide } from '../core';
import { gameStyle, markResponse } from '@sf/games/registry.js';

/** Every `notes` taken off, at any depth: a slide's speaker notes, and any a game's question carries. */
const noNotes = (v: unknown): unknown => {
  if (Array.isArray(v)) return v.map(noNotes);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).filter(([k]) => k !== 'notes').map(([k, x]) => [k, noNotes(x)]));
  return v;
};

/** The lesson as a share link carries it (the shell's Share, M12): its shown slides, no speaker notes anywhere,
 *  each picture once (core/pictures.ts) to stay under the relay's 8 MB, and `studio: 1`, which sends a link to it
 *  from view.html to this viewer. Practice is said by the shell (`practice: true`). */
export function shareCopy(deck: Deck): Omit<Deck, 'slides'> & { slides: Omit<Slide, 'notes'>[]; studio: 1; pictures?: string[] } {
  const d = noNotes({ ...deck, slides: deck.slides.filter((s) => !s.hidden) }) as Deck;
  return { ...packPictures(d), studio: 1 };
}

/** `slide`: the slide the link opens at, counted from 0 (`#slide-7` is the seventh), or null for the first. */
export interface ShareLink { id: string; follow: boolean; slide: number | null }

/** The address's ending for a slide, counted from 0: `#slide-7` for the seventh. */
export const slideHash = (i: number): string => `#slide-${i + 1}`;

/** `?s=<32 hex>` (and `&follow=1`), as the relay's /api/share hands out; null when the address is not complete. */
export function readLink(search: string, hash = ''): ShareLink | null {
  const p = new URLSearchParams(search);
  const id = p.get('s') ?? '';
  if (!/^[a-f0-9]{32}$/.test(id)) return null;
  const n = /^#slide-(\d{1,4})$/.exec(hash);
  return { id, follow: p.get('follow') === '1', slide: n && Number(n[1]) > 0 ? Number(n[1]) - 1 : null };
}

export interface Shared { deck: Deck; practice: boolean }

const isSlide = (s: unknown): s is Slide => !!s && typeof s === 'object' && Array.isArray((s as Slide).layers) && typeof (s as { type?: unknown }).type !== 'string';

/** The shared copy as the viewer plays it: its pictures put back, the hidden slides and every speaker note left out
 *  (Share strips the notes already; a copy made some other way is not trusted to have). Null: not a studio deck. */
export function sharedDeck(doc: unknown): Shared | null {
  if (!doc || typeof doc !== 'object') return null;
  const d = structuredClone(doc) as Deck & { pictures?: string[]; practice?: unknown; studio?: unknown };
  if (!Array.isArray(d.slides) || !d.slides.length || !d.slides.every(isSlide)) return null;
  unpackPictures(d);
  const practice = d.practice === true;
  delete d.practice;
  delete d.studio;
  d.slides = d.slides.filter((s) => !s.hidden).map((s) => ({ ...s, notes: '' }));
  if (!d.slides.length || !(d.width > 0) || !(d.height > 0)) return null;
  return { deck: d, practice };
}

/** Where the relay's `context` (or `watching`'s `at`) puts a follower: the slide by its id, else by its place
 *  (`n`, from 1). -1 when the message names no slide. */
export function followIndex(deck: Deck, at: { slideId?: unknown; n?: unknown } | null | undefined): number {
  if (!at) return -1;
  const id = typeof at.slideId === 'string' ? at.slideId : '';
  const byId = id ? deck.slides.findIndex((s) => s.id === id) : -1;
  if (byId >= 0) return byId;
  const n = Number(at.n);
  if (!Number.isFinite(n) || n < 1) return -1;
  return Math.min(deck.slides.length - 1, Math.floor(n) - 1);
}

/** A question one learner can answer alone: its words, its options and how it is marked. */
export interface PracticeAsk { kind: 'ask'; id: string; question: string; options: string[]; explanation: string; quiz: Record<string, unknown> }
/** A game slide that needs a room (spoken, a board, phones): said, not played. */
export interface PracticeRoom { kind: 'room'; id: string; reason: string }
export type Practice = PracticeAsk | PracticeRoom;

const solo = (style: string): { status?: string; reason?: string } | undefined =>
  ((gameStyle(style) as { plays?: { solo?: { status?: string; reason?: string } } }).plays)?.solo;

/** What practice offers on this slide: a question to answer, a game that needs a room, or nothing. As classic's
 *  practice copy (src/model.js practiceDoc), only a style whose solo play is 'yes' is played, and here only one
 *  answered by picking an option. */
export function practiceOf(slide: Slide): Practice | null {
  const g = slide.game;
  if (!g) return null;
  if (g.role !== 'question') return null;
  const q = g.quiz;
  const style = String(q?.style ?? g.format ?? 'choice');
  const options = Array.isArray(q?.options) ? (q!.options as unknown[]).map(String) : [];
  const input = String(q?.input ?? 'choice');
  if (q && solo(style)?.status === 'yes' && input === 'choice' && options.length >= 2) {
    return { kind: 'ask', id: slide.id, question: String(q.question ?? ''), options, explanation: String(q.explanation ?? ''), quiz: { ...q, style } };
  }
  return { kind: 'room', id: slide.id, reason: 'Played together in class: this one needs a room.' };
}

export interface Marked { right: boolean; answer: string; explanation: string }

/** A pick marked by the game's own style (src/games, the marking the room uses), with the right answer to show. */
export function markPractice(p: PracticeAsk, choice: number): Marked {
  const right = markResponse(p.quiz as Parameters<typeof markResponse>[0], choice);
  const c = Number(p.quiz.correct);
  return { right, answer: Number.isInteger(c) && p.options[c] !== undefined ? p.options[c] : '', explanation: p.explanation };
}

/** One learner's score on this device: each question once, the first answer kept. */
export class PracticeScore {
  private marks = new Map<string, { choice: number; right: boolean }>();
  answer(p: PracticeAsk, choice: number): Marked {
    const m = markPractice(p, this.marks.get(p.id)?.choice ?? choice);
    if (!this.marks.has(p.id)) this.marks.set(p.id, { choice, right: m.right });
    return m;
  }
  /** The learner's pick on this question, if they have answered it. */
  picked(id: string): number | undefined { return this.marks.get(id)?.choice; }
  get right(): number { let n = 0; for (const m of this.marks.values()) if (m.right) n++; return n; }
  get answered(): number { return this.marks.size; }
}

/** The questions practice offers in a deck, for the score's "of". */
export function practiceCount(deck: Deck): number {
  return deck.slides.filter((s) => practiceOf(s)?.kind === 'ask').length;
}

/** A share whose pictures travel apart (CS-14 step 2: `pictureCount`, the slides holding `@picture:N`) given its
 *  pictures back, fetched by `get` a few at a time, so sharedDeck reads it as one that carried them. A picture that
 *  cannot be had is left empty, and counted. A share made the old way is handed back as it is. */
export async function withPictures(doc: unknown, get: (n: number) => Promise<string | null>): Promise<{ doc: unknown; missing: number }> {
  const d = doc as { pictureCount?: unknown; pictures?: unknown } | null;
  const n = Number(d?.pictureCount);
  if (!d || !Number.isInteger(n) || n <= 0 || Array.isArray(d.pictures)) return { doc, missing: 0 };
  const pictures: string[] = new Array(n).fill('');
  let missing = 0, next = 0;
  const worker = async () => {
    while (next < n) {
      const k = next++;
      const v = await get(k).catch(() => null);
      if (typeof v === 'string' && v.startsWith('data:')) pictures[k] = v; else missing++;
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, n) }, worker));
  const out = { ...d, pictures };
  delete (out as { pictureCount?: unknown }).pictureCount;
  return { doc: out, missing };
}
