// The studio viewer (lab-engine-plan M12; viewer/state.ts) and the packing a shared lesson travels in (core/pictures.ts):
// the link it reads, the deck it plays (pictures back, hidden slides and notes out), where a followed room puts it,
// and practice: a solo question picked and marked with SlideForge's own marking, a game that needs a room said so.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Deck, Slide } from '../src/core';
import { packPictures, unpackPictures } from '../src/core/pictures';
import { followIndex, markPractice, practiceCount, practiceOf, PracticeScore, readLink, sharedDeck, type PracticeAsk } from '../src/viewer/state';
import { root } from './replay-kit';

const PIC = `data:image/png;base64,${'A'.repeat(2000)}`;
const slide = (id: string, extra: Partial<Slide> = {}) =>
  ({ id, name: `Slide ${id}`, background: '', layers: [], transition: { type: 'none', duration: 0 }, notes: `say ${id}`, ...extra }) as unknown as Slide;
const deck = (slides: Slide[]): Deck => ({ id: 'd', title: 'Shared', width: 1920, height: 1080, slides } as unknown as Deck);
const question = (id: string, quiz: Record<string, unknown>, format = 'choice') =>
  slide(id, { game: { id: 'g', format, label: 'Quiz', role: 'question', settings: {}, quiz } });

test('a picture used on every slide travels once, and comes back in every place', () => {
  const d = deck([slide('a', { background: PIC }), slide('b', { background: PIC, layers: [{ params: { src: PIC, short: 'data:x' } }] as unknown as Slide['layers'] })]);
  const packed = packPictures(d);
  assert.equal(packed.pictures?.length, 1, 'one copy of the picture');
  assert.equal(packed.slides[0].background, '@picture:0');
  assert.equal((packed.slides[1].layers[0].params as Record<string, unknown>).short, 'data:x', 'a short data string stays as it is');
  assert.equal(d.slides[0].background, PIC, 'the deck itself is not changed');
  assert.ok(JSON.stringify(packed).length < JSON.stringify(d).length / 2);
  const back = unpackPictures(structuredClone(packed));
  assert.deepEqual(back, d);
});

test('a shipped lesson round-trips through the packing the share uses', () => {
  const shipped = JSON.parse(readFileSync(resolve(root, 'assets/lab-lessons/ipdv-intro.lesson.json'), 'utf8')) as Deck & { pictures?: string[] };
  const whole = unpackPictures(structuredClone(shipped));
  const again = packPictures(whole);
  assert.equal(again.pictures?.length, shipped.pictures?.length);
  assert.deepEqual(unpackPictures(structuredClone(again)), whole);
});

test('the link: a 32-hex share id, and follow=1', () => {
  const id = 'a'.repeat(32);
  assert.deepEqual(readLink(`?s=${id}`), { id, follow: false });
  assert.deepEqual(readLink(`?s=${id}&follow=1`), { id, follow: true });
  assert.equal(readLink('?s=abc'), null);
  assert.equal(readLink(''), null);
});

test('the shared deck: pictures back, hidden slides left out, no speaker notes; a classic copy is not one', () => {
  const d = deck([slide('a', { background: PIC }), slide('h', { hidden: true }), slide('b')]);
  const doc = { ...packPictures(d), studio: 1, practice: true };
  const shared = sharedDeck(doc)!;
  assert.ok(shared, 'a lab deck is the viewer\'s');
  assert.equal(shared.practice, true);
  assert.deepEqual(shared.deck.slides.map((s) => s.id), ['a', 'b']);
  assert.equal(shared.deck.slides[0].background, PIC);
  assert.ok(shared.deck.slides.every((s) => s.notes === ''), 'no notes');
  assert.equal('studio' in shared.deck || 'practice' in shared.deck || 'pictures' in shared.deck, false);
  assert.equal(sharedDeck(doc)!.deck.slides[0].background, PIC, 'reading it does not change the copy');
  assert.equal(sharedDeck({ title: 'x', slides: [{ type: 'title', title: 'Hello' }] }), null, 'a classic lesson goes to view.html');
  assert.equal(sharedDeck({ slides: [] }), null);
  assert.equal(sharedDeck(null), null);
});

test('following: the room\'s slide by its id, else by its place', () => {
  const d = deck([slide('a'), slide('b'), slide('c')]);
  assert.equal(followIndex(d, { slideId: 'c', n: 1 }), 2, 'the id wins');
  assert.equal(followIndex(d, { slideId: 'gone', n: 2 }), 1);
  assert.equal(followIndex(d, { n: 9 }), 2, 'clamped to the last slide');
  assert.equal(followIndex(d, { n: 0 }), -1);
  assert.equal(followIndex(d, null), -1);
});

test('practice: a solo question is asked and marked by its style; one that needs a room says so', () => {
  const q = question('q', { style: 'choice', input: 'choice', question: 'Two and two?', options: ['3', '4', '5'], correct: 1, explanation: 'Count them.' });
  const p = practiceOf(q) as PracticeAsk;
  assert.equal(p.kind, 'ask');
  assert.deepEqual(p.options, ['3', '4', '5']);
  assert.deepEqual(markPractice(p, 1), { right: true, answer: '4', explanation: 'Count them.' });
  assert.equal(markPractice(p, 0).right, false);
  const tf = practiceOf(question('t', { question: 'The sky is green.', options: ['True', 'False'], correct: 1 }, 'truefalse')) as PracticeAsk;
  assert.equal(tf.kind, 'ask', 'the style is the format when the question does not name one');
  assert.equal(markPractice(tf, 1).right, true);
  const typed = practiceOf(question('y', { style: 'type', input: 'text', question: 'Capital of France?', accept: ['Paris'] }, 'type'));
  assert.equal(typed?.kind, 'room', 'a typed answer is not offered alone (classic: solo partial)');
  const spoken = practiceOf(question('s', { style: 'spinexplain', question: 'Explain', options: ['a', 'b'] }, 'spinexplain'));
  assert.equal(spoken?.kind, 'room');
  assert.equal(practiceOf(slide('plain')), null);
  assert.equal(practiceOf(slide('ans', { game: { id: 'g', format: 'choice', label: 'Quiz', role: 'answer', settings: {} } })), null, 'an answer slide asks nothing');
});

test('the score: each question once, the first answer kept', () => {
  const p = practiceOf(question('q', { style: 'choice', question: 'Q', options: ['a', 'b'], correct: 0 })) as PracticeAsk;
  const p2 = practiceOf(question('r', { style: 'choice', question: 'R', options: ['a', 'b'], correct: 1 })) as PracticeAsk;
  const s = new PracticeScore();
  assert.equal(s.answer(p, 1).right, false);
  assert.equal(s.answer(p, 0).right, false, 'a second try does not change the mark');
  assert.equal(s.picked('q'), 1);
  assert.equal(s.answer(p2, 1).right, true);
  assert.deepEqual([s.right, s.answered], [1, 2]);
});

test('a shipped lesson\'s questions are all practised (the IPDV introduction\'s twelve)', () => {
  const shipped = JSON.parse(readFileSync(resolve(root, 'assets/lab-lessons/ipdv-intro.lesson.json'), 'utf8')) as Deck;
  const shared = sharedDeck(shipped)!;
  assert.equal(practiceCount(shared.deck), 12);
  for (const s of shared.deck.slides) {
    const p = practiceOf(s);
    if (p?.kind !== 'ask') continue;
    const right = Number(p.quiz.correct);
    assert.equal(markPractice(p, right).right, true, `${s.name}: its own answer is right`);
  }
});
