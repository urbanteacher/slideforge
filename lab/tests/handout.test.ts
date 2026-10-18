// The student PDF from the studio (lab-engine-plan M12; export/handout.ts): which slides become pages in each copy,
// and the print document's page rules and words. The pictures themselves are renderStill's, drawn in a browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Deck, Slide } from '../src/core';
import { handoutHtml, handoutPages } from '../src/export/handout';

const slide = (id: string, extra: Partial<Slide> = {}) =>
  ({ id, name: `Slide ${id}`, background: '', layers: [], transition: { type: 'none', duration: 0 }, notes: `Say <${id}>`, ...extra }) as unknown as Slide;
const game = (role: NonNullable<Slide['game']>['role']) => ({ game: { id: 'g', format: 'choice', label: 'Quiz', role, settings: {} } });
const deck = { id: 'd', title: 'Atoms & air', width: 1920, height: 1080, slides: [
  slide('a'), slide('h', { hidden: true }), slide('q', game('question')), slide('ans', game('answer')), slide('end', game('end')),
] } as unknown as Deck;

test('the student copy: every shown slide but the answers, and no notes', () => {
  const pages = handoutPages(deck, false);
  assert.deepEqual(pages.map((p) => p.id), ['a', 'q', 'end']);
  assert.ok(pages.every((p) => p.notes === ''));
});

test('the teacher copy: the answers too, each with its notes', () => {
  const pages = handoutPages(deck, true);
  assert.deepEqual(pages.map((p) => p.id), ['a', 'q', 'ans', 'end']);
  assert.equal(pages[0].notes, 'Say <a>');
});

test('the print document: one page to a slide, page CSS, the copy switch, nothing unescaped', () => {
  const images = { a: 'data:image/jpeg;base64,AAA', q: 'data:image/jpeg;base64,BBB', end: 'data:image/jpeg;base64,CCC', ans: 'x' };
  const student = handoutHtml(deck.title, handoutPages(deck, false), images, false);
  assert.equal((student.match(/<section class="page/g) ?? []).length, 3);
  assert.match(student, /@page \{ size: A4 landscape/);
  assert.match(student, /break-after: page/);
  assert.match(student, /id="sf-print"/);
  assert.match(student, /Student copy ▸ switch to teacher copy/);
  assert.equal(student.includes('Say'), false, 'no notes in the student copy');
  assert.match(student, /Atoms &amp; air — handout/);
  const teacher = handoutHtml(deck.title, handoutPages(deck, true), images, true);
  assert.equal((teacher.match(/<section class="page/g) ?? []).length, 4);
  assert.match(teacher, /<div class="notes">Say &lt;a&gt;<\/div>/);
  assert.match(teacher, /Teacher copy ▸ switch to student copy/);
});

test('a slide with facts on its back prints twice: the front, then the facts', () => {
  const flip = slide('f', { layers: [{ id: 'p', kind: 'image' }, { id: 'b', kind: 'text', face: 'back' }] as unknown as Slide['layers'] });
  const d = { ...deck, slides: [slide('a'), flip] } as unknown as Deck;
  const pages = handoutPages(d, false);
  assert.deepEqual(pages.map((p) => p.id), ['a', 'f', 'f:back']);
  assert.equal(pages[2].back, true);
  assert.equal(pages[2].name, 'Slide f (the facts)');
});
