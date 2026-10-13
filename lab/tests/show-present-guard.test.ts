// whyNotPresentInStudio (lab-engine-plan M15): the guard the shell asks before Present, the Teacher Presenter or
// Notes on another device open the studio's own show. '' means the studio's show can run the lesson; any words
// mean SlideForge's classic show keeps it. Pure: it reads the lab deck and nothing else.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Slide } from '../src/core';
import { whyNotPresentInStudio } from '../src/show/canHost';

const slide = (id: string, name: string, game?: Slide['game'], extra: Partial<Slide> = {}) =>
  ({ id, name, background: '', layers: [], transition: { type: 'none', duration: 0 }, notes: '', game, ...extra }) as unknown as Slide;
const game = (format: string, role: string, extra: Record<string, unknown> = {}) =>
  ({ id: 'g1', format, label: 'Air', role, key: '0', settings: {}, ...extra }) as unknown as NonNullable<Slide['game']>;
const deckOf = (...slides: Slide[]) => ({ slides });

test('a lesson with no questions is presented in the studio', () => {
  assert.equal(whyNotPresentInStudio(deckOf(slide('a', 'Intro'), slide('b', 'Body'))), '');
});

test('a lesson with every slide hidden has nothing to show', () => {
  assert.match(whyNotPresentInStudio(deckOf(slide('a', 'Intro', undefined, { hidden: true }))), /no shown slide/);
  assert.match(whyNotPresentInStudio(deckOf()), /no shown slide/);
});

test('a registry-style game is presented in the studio, and a hidden blocker does not count', () => {
  const quiz = { type: 'quiz', style: 'choice', input: 'choice', question: 'Q?', options: ['A', 'B'], correct: 0 };
  assert.equal(whyNotPresentInStudio(deckOf(slide('a', 'Intro'), slide('q', 'Q', game('choice', 'question', { quiz })))), '');
  const boss = slide('boss', 'Boss', game('boss-battle', 'question'), { hidden: true });
  assert.equal(whyNotPresentInStudio(deckOf(slide('a', 'Intro'), boss)), '');
});

test('a plain show has no phones: a game, an activity or feedback the room does not run is the studio\'s to show (M14)', () => {
  assert.equal(whyNotPresentInStudio(deckOf(slide('a', 'Intro'), slide('r', 'Order', game('mind-reveal', 'question')))), '');
  assert.equal(whyNotPresentInStudio(deckOf(slide('x', 'Think', undefined, { activity: { key: 'think-pair-share', page: 0 } }))), '');
  assert.equal(whyNotPresentInStudio(deckOf(slide('x', 'Quiz', undefined, { activity: { key: 'multiple-choice-quiz', page: 0 } }))), '');
  assert.equal(whyNotPresentInStudio(deckOf(slide('x', 'Odd', undefined, { activity: { key: 'no-such-activity', page: 0 } }))), '');
  const poll = { kind: 'poll', prompt: 'Ready?', options: ['Yes', 'No'] } as never;
  assert.equal(whyNotPresentInStudio(deckOf(slide('p', 'Poll', game('choice', 'cover'), { feedback: poll }))), '');
  const discuss = { type: 'quiz', style: 'compare-contrast', input: 'sort', compareDiscuss: true, question: 'Q?' };
  assert.equal(whyNotPresentInStudio(deckOf(slide('c', 'Compare', game('compare-contrast', 'question', { quiz: discuss })))), '');
  // The quiz and activity cards are placeholders, drawn as the picture they are by SlideForge's show too.
  const layer = { id: 'l', kind: 'quiz', visible: true } as never;
  assert.equal(whyNotPresentInStudio(deckOf(slide('c', 'Check', undefined, { layers: [layer] }))), '');
});

test('a live figure the lesson does not carry keeps the plain show on classic, which plays it from the lesson it came from', () => {
  assert.match(whyNotPresentInStudio(deckOf(slide('f', 'Graph', undefined, { liveFigure: true }))), /"Graph" has a live figure/);
});
