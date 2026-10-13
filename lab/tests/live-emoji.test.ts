// Emoji guess in the studio's room (lab-engine-plan M8): fast, no browser, no relay. The wire against the classic recording
// is in live-replay.test.ts; here the question compiled from a bare puzzle, the help steps by difficulty, the frame's flags,
// and that the lab's slide releases its support in the same order (designs/engage/formats.ts emojiSupport).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Layer, Slide } from '../src/core';
import { emojiSupport } from '../src/designs/engage/formats';
import { showFromDeck, styleForFormat, styleOf } from '../src/live';
import { canHostInStudio } from '../src/show/canHost';

const slide = (id: string, name: string, game?: Slide['game']) =>
  ({ id, name, background: '', layers: [], transition: { type: 'none', duration: 0 }, notes: '', game }) as unknown as Slide;
const puzzle = (difficulty: string, hint = 'How a plant makes its food') =>
  ({ type: 'quiz', style: 'emoji', input: 'text', points: 1000, question: '🌱 ☀️ 💧 → 🌿', accept: ['photosynthesis', ''], hint, difficulty, explanation: 'Plants.' });
const deckOf = (quiz: object) => ({ title: 'Emoji', slides: [
  slide('c', 'Cover', { id: 'g', format: 'emoji-guess', label: 'Emoji guess', role: 'cover', settings: {} } as never),
  slide('q', 'Q', { id: 'g', format: 'emoji-guess', label: 'Emoji guess', role: 'question', key: '0', settings: {}, quiz } as never),
] });
const quizOf = (quiz: object) => showFromDeck(deckOf(quiz)).slides.find((s) => s.quiz)!.quiz!;

test('the registry takes Emoji guess by format; the room hosts it; the frame carries the clues', () => {
  assert.equal(styleForFormat('emoji-guess')?.key, 'emoji');
  assert.equal(styleOf({ style: 'emoji', input: 'text' })?.key, 'emoji');
  assert.deepEqual(canHostInStudio(deckOf(puzzle('easy'))), { ok: true, reason: '' });
  const q = quizOf(puzzle('easy'));
  const style = styleOf(q)!;
  assert.deepEqual(q.accept, ['photosynthesis'], 'the blank spelling is dropped');
  assert.equal(q.answer, 'photosynthesis');
  assert.deepEqual(style.flags!(q), { clueMode: 'emoji', clues: '🌱 ☀️ 💧 → 🌿' });
  assert.equal(style.companion!(q).headPrompt, 'What do these clues point to?');
  assert.equal(style.mark(q, 'Photosynthesis'), true);
  assert.equal(style.mark(q, 'respiration'), false);
  assert.deepEqual(style.reveal(q), { correct: -1, answer: 'photosynthesis' });
  assert.equal(style.gains, undefined, 'the relay halves the points after the hint');
});

test('the help released one a Next: easy the hint, medium the pattern then the hint, hard the hint; no hint, none', () => {
  const steps = (difficulty: string, hint?: string) => { const q = quizOf(puzzle(difficulty, hint)); return styleOf(q)!.help!(q); };
  assert.deepEqual(steps('easy'), ['hint']);
  assert.deepEqual(steps('medium'), ['pattern', 'hint']);
  assert.deepEqual(steps('hard'), ['hint']);
  assert.deepEqual(steps('medium', ''), ['pattern']);
  assert.deepEqual(steps('easy', ''), []);
});

test("the lab's slide builds its support in the room's order", () => {
  const layer = (name: string, text: string) => ({ name, visible: true, params: { text }, anim: { type: 'rise', duration: 1, delay: 0, trigger: 'onClick', step: { set: 'support', i: 9, mode: 'on' } } }) as unknown as Layer;
  const built = (difficulty: string, hint = 'a hint') => {
    const s = { layers: [layer('Clue', 'x'), layer('Support 1', 'P _ _'), layer('Support 2', hint)] } as unknown as Slide;
    emojiSupport(s, difficulty);
    return s.layers.slice(1).map((l) => (l.visible ? (l.anim.trigger === 'onClick' ? `click ${l.anim.step!.i}` : 'shown') : 'hidden'));
  };
  assert.deepEqual(built('easy'), ['shown', 'click 0'], 'the pattern is there from the start; the hint is the one click');
  assert.deepEqual(built('medium'), ['click 0', 'click 1'], 'the pattern, then the hint');
  assert.deepEqual(built('hard'), ['hidden', 'click 0'], 'no pattern; the hint is the one click');
  assert.deepEqual(built('easy', ''), ['shown', 'hidden'], 'no hint to release');
  // A change of mind (the Game panel) brings the layers back as they were.
  const s = { layers: [layer('Support 1', 'P _ _'), layer('Support 2', 'a hint')] } as unknown as Slide;
  emojiSupport(s, 'hard');
  emojiSupport(s, 'medium');
  assert.deepEqual(s.layers.map((l) => [l.visible, l.anim.step?.i]), [[true, 0], [true, 1]]);
});
