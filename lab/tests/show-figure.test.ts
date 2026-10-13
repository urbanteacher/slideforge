// A live figure in the studio's show (lab-engine-plan M15; show/figure.ts): Next and Back walk the figure's steps
// before the show moves on, as classic's Explore hook does; a figure keeps the step it was left on; the Teacher
// Presenter is told the step; and a lesson with live figures (Weeks 5 and 7) is the studio's to present.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Slide } from '../src/core';
import { root } from './replay-kit';
import { FigureSteps, figureBlocker, figureSlide } from '../src/show/figure';
import { canHostInStudio, whyNotPresentInStudio } from '../src/show/canHost';
import { presenterState } from '../src/show/desk';

const slide = (id: string, extra: Partial<Slide> = {}) =>
  ({ id, name: `Slide ${id}`, background: '', layers: [], transition: { type: 'none', duration: 0 }, notes: '', ...extra }) as unknown as Slide;
const figure = (steps: unknown[] | undefined, name = 'bubbles') =>
  slide('f', { liveFigure: true, figure: { figure: name, figureData: {}, figureSteps: steps, title: 'Bubbles' } });

test('Next walks a figure\'s steps, then the show moves on; Back walks them back, then the show goes back', () => {
  const f = figure([{ caption: 'One' }, { caption: 'Two' }, { caption: 'Three' }]);
  const steps = new FigureSteps();
  assert.equal(steps.step(f), 0, 'a figure opens on its first step');
  assert.equal(steps.move(f, 1), true);
  assert.equal(steps.move(f, 1), true);
  assert.equal(steps.step(f), 2);
  assert.equal(steps.move(f, 1), false, 'on its last step, Next is the show\'s');
  assert.equal(steps.step(f), 2);
  assert.equal(steps.move(f, -1), true);
  assert.equal(steps.move(f, -1), true);
  assert.equal(steps.move(f, -1), false, 'on its first step, Back is the show\'s');
  assert.equal(steps.step(f), 0);
});

test('a figure keeps the step it was left on; one with no steps has one; a slide without a figure has none', () => {
  const steps = new FigureSteps();
  const f = figure([{ caption: 'A' }, { caption: 'B' }]);
  steps.move(f, 1);
  assert.equal(steps.step(f), 1, 'back on the figure later in the show: where it was left (classic exploreStates)');
  const bare = { ...figure(undefined), id: 'g' } as Slide;
  assert.equal(steps.step(bare), 0);
  assert.equal(steps.move(bare, 1), false, 'a figure without steps is one step: Next moves the show');
  // SlideForge counts only objects as steps.
  assert.equal(steps.move({ ...figure([{}, null, 'x', {}]), id: 'h' } as Slide, 1), true);
  assert.equal(steps.move({ ...figure([{}, null, 'x', {}]), id: 'h' } as Slide, 1), false);
  assert.equal(steps.step(slide('p')), null);
  assert.equal(steps.move(slide('p'), 1), false);
});

test('the Teacher Presenter is told the figure\'s step and caption', () => {
  const steps = new FigureSteps();
  const f = figure([{ caption: 'Where it starts' }, { caption: 'Where it ends' }]);
  assert.deepEqual(steps.says(f), { step: 1, of: 2, caption: 'Where it starts' });
  steps.move(f, 1);
  assert.deepEqual(steps.says(f), { step: 2, of: 2, caption: 'Where it ends' });
  const deck = { title: 'W5', slides: [f, slide('n')] };
  assert.deepEqual(presenterState({ deck, index: 0, startedAt: 0, screen: 'none', figure: steps.says(f) }).figure, { step: 2, of: 2, caption: 'Where it ends' });
  assert.equal('figure' in presenterState({ deck, index: 1, startedAt: 0, screen: 'none', figure: steps.says(deck.slides[1]) }), false, 'no figure, nothing said');
});

test('a lesson with live figures is presented in the studio; a stand-in without its figure, or an unknown figure, is not', () => {
  for (const name of ['bubbles', 'codechart', 'worldmap', 'motion', 'linked', 'rowtable']) {
    assert.ok(figureSlide(figure([{}], name)), name);
    assert.equal(whyNotPresentInStudio({ slides: [slide('a'), figure([{}], name)] }), '', name);
  }
  assert.match(whyNotPresentInStudio({ slides: [slide('f', { name: 'Graph', liveFigure: true })] }), /"Graph" has a live figure the lesson does not carry/);
  assert.match(figureBlocker({ ...figure([{}], 'sundial'), name: 'Dial' }), /"Dial" has a live figure \(sundial\) SlideForge does not draw/);
  // A room: the figure does not stop it, and does not ask anything by itself.
  const quiz = { type: 'quiz', style: 'choice', input: 'choice', question: 'Q?', options: ['A', 'B'], correct: 0 };
  const q = slide('q', { game: { id: 'g1', format: 'choice', label: 'Quiz', role: 'question', key: '0', quiz, settings: {} } as unknown as Slide['game'] });
  assert.deepEqual(canHostInStudio({ slides: [figure([{}]), q] }), { ok: true, reason: '' });
});

test('Weeks 5 and 7, as they ship (assets/lab-lessons), are the studio\'s to present, every figure with steps to walk', () => {
  let figures = 0;
  for (const key of ['ipdv-ia-w5', 'ipdv-ia-w5-student', 'ipdv-maps-w7', 'ipdv-maps-w7-student']) {
    const deck = JSON.parse(readFileSync(resolve(root, `assets/lab-lessons/${key}.lesson.json`), 'utf8')) as { slides: Slide[] };
    assert.equal(whyNotPresentInStudio(deck), '', key);
    const live = deck.slides.filter((s) => !s.hidden && s.figure);
    assert.ok(live.length > 0, `${key} has live figures`);
    for (const s of live) assert.ok(figureSlide(s), `${key}: ${s.name}`);
    figures += live.length;
  }
  assert.ok(figures >= 36, `${figures} live figures`);
});
