// Spot the error in the studio's room (lab-engine-plan M8): fast, no browser, no relay. The wire against the classic
// recording is in live-replay.test.ts; here the entry's own parts: the passage compiled into words from the bare question,
// a tap marked against the error's span, what the reveal says, the wall's heat (held until the reveal), the teacher's word entry.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Slide } from '../src/core';
import { showFromDeck, styleForFormat, styleOf } from '../src/live';
import { canHostInStudio } from '../src/show/canHost';

const slide = (id: string, name: string, game?: Slide['game']) =>
  ({ id, name, background: '', layers: [], transition: { type: 'none', duration: 0 }, notes: '', game }) as unknown as Slide;
// The author's question: a sentence, the wrong words, the fix. The room compiles it as SlideForge does.
const quiz = { type: 'quiz', style: 'spot', input: 'tap', points: 1000, question: 'The median of 2, 3, 3, 8 and 14 is 6 because it is the middle value.', error: '6', fix: '3', explanation: 'The middle value is 3.' };
const deck = { title: 'Spot', slides: [
  slide('c', 'Cover', { id: 'g', format: 'spot-the-error', label: 'Spot the error', role: 'cover', settings: {} } as never),
  slide('q', 'Q', { id: 'g', format: 'spot-the-error', label: 'Spot the error', role: 'question', key: '0', settings: {}, quiz } as never),
] };

test('the registry takes Spot the error by format and by question; the room hosts it; no scores slide', () => {
  assert.equal(styleForFormat('spot-the-error')?.key, 'spot');
  assert.equal(styleOf({ style: 'spot', input: 'tap' })?.key, 'spot');
  assert.deepEqual(canHostInStudio(deck), { ok: true, reason: '' });
  const show = showFromDeck(deck);
  assert.equal(show.slides.some((s) => s.results), false, 'the game has no scores slide');
  const q = show.slides.find((s) => s.quiz)!.quiz!;
  assert.deepEqual(q.options.slice(0, 3), ['The', 'median', 'of'], 'the sentence is the words, in order');
  assert.equal(q.options[10], '6');
  assert.equal(q.headPrompt, 'There is one error in this sentence. Find it.');
});

test('a question already compiled (as the lab keeps it, with errorFrom and no `error`) is left as it is', () => {
  const compiled = { type: 'quiz', style: 'spot', input: 'tap', points: 1000, question: 'Sound travels fastest through a vacuum.', options: ['Sound', 'travels', 'fastest', 'through', 'a', 'vacuum.'], correct: 2, errorFrom: 2, errorTo: 2, fix: 'not at all', answer: 'fastest → not at all', holdResults: true, headPrompt: 'There is one error in this sentence. Find it.', explanation: '' };
  const d = { title: 'Spot', slides: [
    slide('c', 'Cover', { id: 'g', format: 'spot-the-error', label: 'Spot the error', role: 'cover', settings: {} } as never),
    slide('q', 'Q', { id: 'g', format: 'spot-the-error', label: 'Spot the error', role: 'question', key: '0', settings: {}, quiz: compiled } as never),
  ] };
  const q = showFromDeck(d).slides.find((s) => s.quiz)!.quiz!;
  const style = styleForFormat('spot-the-error')!;
  assert.equal(style.mark(q, 2), true);
  assert.equal(style.mark(q, 5), false);
  assert.deepEqual(style.reveal(q), { correct: 2, answer: 'fastest → not at all' });
});

test("marks, the reveal, the wall's heat and the teacher's word entry", () => {
  const style = styleForFormat('spot-the-error')!;
  const q = showFromDeck(deck).slides.find((s) => s.quiz)!.quiz!;
  assert.equal(style.input, 'tap');
  assert.equal(style.mark(q, 10), true);
  assert.equal(style.mark(q, 9), false);
  assert.equal(style.mark(q, 'junk' as never), false);
  assert.deepEqual(style.reveal(q), { correct: 10, answer: '6 → 3' });
  assert.equal(style.gains, undefined, 'the points are the verdicts alone');
  const answers = [{ id: 1, response: 10 }, { id: 2, response: 10 }, { id: 3, response: 9 }];
  assert.deepEqual(style.wall(q, answers, false), { kind: 'heat', heat: null }, 'where the room tapped is held until the reveal');
  const w = style.wall(q, answers, true);
  if (w.kind !== 'heat' || !w.heat) throw new Error('heat');
  assert.equal(w.heat.words.length, q.options.length);
  assert.deepEqual(w.heat.words.filter((x) => x.count).map((x) => [x.index, x.count, x.error]), [[9, 1, false], [10, 2, true]]);
  assert.equal(w.heat.total, 3);
  assert.equal(w.heat.answer, '6 → 3');
  assert.equal(style.manual({ choice: 10 }), 10, 'a word button sends the word index');
  assert.equal(style.manual({ text: 'x' }), undefined);
});
