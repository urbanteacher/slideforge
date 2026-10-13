// The five styles of the second M8 batch against SlideForge's own starter games (lab/src/assets/games.json), which is how the lab
// holds their questions: already compiled. Each starter's questions go through the room's show (showFromDeck, which prepares them),
// the room hosts the lesson, and each question is marked right by the answer its own fields name. A question the room compiled
// again, and so lost, would fail here. The simulated class (Rehearse) answers each with the right picks when it is skilled.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Slide } from '../src/core';
import { answerFor } from '../src/rehearse/model';
import { showFromDeck, styleFor, type RoomQuiz } from '../src/live';
import { canHostInStudio } from '../src/show/canHost';

type Starter = { format: string; title: string; slides: Record<string, unknown>[] };
const raw = JSON.parse(readFileSync(resolve(process.cwd(), 'src/assets/games.json'), 'utf8')) as unknown;
const list = (Array.isArray(raw) ? raw : ((raw as { games?: unknown[] }).games ?? Object.values(raw as object))) as Starter[];

const slide = (id: string, name: string, game?: Slide['game']) =>
  ({ id, name, background: '', layers: [], transition: { type: 'none', duration: 0 }, notes: '', game }) as unknown as Slide;
function quizzesOf(format: string): { quizzes: RoomQuiz[]; ok: boolean } {
  const g = list.find((x) => x.format === format)!;
  const slides = [slide('c', 'Cover', { id: 'g', format, label: g.title, role: 'cover', settings: {} } as never)];
  g.slides.filter((s) => s.type === 'quiz').forEach((q, i) => slides.push(slide(`q${i}`, `Q${i}`, { id: 'g', format, label: g.title, role: 'question', key: String(i), settings: { seconds: 30 }, quiz: q } as never)));
  const deck = { title: g.title, slides };
  return { quizzes: showFromDeck(deck).slides.filter((s) => s.quiz).map((s) => s.quiz!), ok: canHostInStudio(deck).ok };
}

/** The response a question's own fields say is right. */
const right: Record<string, (q: RoomQuiz) => unknown> = {
  'spot-the-error': (q) => q.errorFrom,
  'definition-challenge': (q) => (q.accept as string[])[0],
  'emoji-guess': (q) => (q.accept as string[])[0],
  'fill-in-the-blanks': (q) => q.gapAnswers,
  'compare-contrast': (q) => q.sortAnswers,
};

for (const format of Object.keys(right)) {
  test(`the ${format} starter runs in the room: hosted, each question marked right by its own answer, reveal and frame sound`, () => {
    const { quizzes, ok } = quizzesOf(format);
    assert.equal(ok, true);
    assert.ok(quizzes.length >= 3);
    for (const q of quizzes) {
      const style = styleFor(q);
      assert.equal(style.formats[0], format, 'the question is the format\'s own');
      assert.equal(style.mark(q, right[format](q) as never), true, `${q.question} marked right`);
      assert.equal(style.mark(q, 'no such answer' as never), false);
      const said = style.reveal(q);
      assert.ok(typeof said.answer === 'string' && Number.isInteger(said.correct));
      if (['spot-the-error', 'definition-challenge', 'emoji-guess', 'fill-in-the-blanks'].includes(format)) assert.notEqual(said.answer, '', 'the reveal says the answer');
      const frame = { id: q.id, input: style.input, options: q.options, timeLimit: 0, range: null };
      const sure = { skill: 1, keen: 1, slow: 0 };
      const given = answerFor(q, frame, sure as never, () => 0);
      assert.ok(given, 'a skilled simulated learner answers it');
      const { t: _t, ...fields } = given!;
      const response = (fields as Record<string, unknown>)[Object.keys(fields)[0]];
      assert.equal(style.mark(q, response as never), true, 'and answers it right');
    }
  });
}
