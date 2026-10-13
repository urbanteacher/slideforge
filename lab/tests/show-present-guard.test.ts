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

test('an unported game, an activity, a live figure and a SlideForge check keep the lesson on classic', () => {
  assert.match(whyNotPresentInStudio(deckOf(slide('a', 'Intro'), slide('r', 'Order', game('bingo', 'question')))), /"Air" is bingo, not/);
  assert.match(whyNotPresentInStudio(deckOf(slide('x', 'Think', undefined, { activity: { key: 'think-pair-share', page: 0 } }))), /"Think" is an activity/);
  assert.match(whyNotPresentInStudio(deckOf(slide('f', 'Graph', undefined, { liveFigure: true }))), /"Graph" has a live figure/);
  const layer = { id: 'l', kind: 'quiz', visible: true } as never;
  assert.match(whyNotPresentInStudio(deckOf(slide('c', 'Check', undefined, { layers: [layer] }))), /"Check" holds a SlideForge check/);
});
