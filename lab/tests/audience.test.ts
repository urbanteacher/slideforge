// Teacher-only slides (Slide.audience): in the presentation and the teacher's copy, left out of the student copy.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handoutPages } from '../src/export/handout';
import { readLesson } from '../src/decks/lessonFormat';
import type { Deck, Slide } from '../src/core';

const slide = (id: string, extra: Partial<Slide> = {}) => ({ id, name: id, background: '#fff', layers: [], transition: { type: 'none', duration: 0 }, notes: 'n', ...extra }) as Slide;
const deck = { slides: [slide('a'), slide('b', { audience: 'teacher' }), slide('c', { hidden: true })] } as unknown as Deck;

test('the student copy leaves teacher-only slides out; the teacher copy keeps them', () => {
  assert.deepEqual(handoutPages(deck, false).map((p) => p.id), ['a']);
  assert.deepEqual(handoutPages(deck, true).map((p) => p.id), ['a', 'b']);
});

test('a lesson file may mark a slide "audience": "teacher", and nothing else', () => {
  const file = (audience: string) => ({ format: 'slideforge-lesson/1', title: 'T', slides: [{ layout: 'title', title: 'Hi', audience }] });
  assert.deepEqual(readLesson(file('teacher')).problems, []);
  assert.ok(readLesson(file('students')).problems.some((p) => /audience/.test(p)));
});
