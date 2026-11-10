// The lesson file (BACKLOG CS-01, docs/lesson-format.md): what the reader accepts and refuses, slide by slide, and
// the deck each layout builds in the deck's theme. The example in docs/examples/ must always read clean.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { answerIndex, LESSON_LAYOUTS, readLesson } from '../src/decks/lessonFormat';
import { deckFromLesson } from '../src/decks/fromLesson';
import games from '../src/assets/games.json';
// Bundled into the test, so it reads the same wherever the test is built (the root runs it from a temporary folder).
import exampleJson from '../../docs/examples/lesson-example.json';
import type { ShowcaseGame } from '../src/designs';

// The layouts measure their words to size them: a canvas that measures each character as half its size stands in
// (as tests/nodes-room.test.ts does).
const g = globalThis as unknown as { document?: unknown; OffscreenCanvas?: unknown };
const ctx = { font: '40px Inter', measureText(t: string) { const px = Number(/(\d+(?:\.\d+)?)px/.exec(this.font)?.[1] ?? 40); return { width: t.length * px * 0.5, actualBoundingBoxAscent: px * 0.8, actualBoundingBoxDescent: px * 0.2, fontBoundingBoxAscent: px * 0.9, fontBoundingBoxDescent: px * 0.25 }; } };
g.OffscreenCanvas ??= class { getContext() { return ctx; } };

const example = JSON.stringify(exampleJson);
const choice = (games as { games: ShowcaseGame[] }).games.find((g) => g.format === 'choice')!;
const lesson = (slides: unknown[], extra: Record<string, unknown> = {}) => JSON.stringify({ format: 'slideforge-lesson/1', title: 'T', slides, ...extra });

test('the example lesson reads with no problems, and uses every layout', () => {
  const { lesson: l, problems } = readLesson(example);
  assert.deepEqual(problems, []);
  const used = new Set(l!.slides.map((s) => s.layout));
  assert.deepEqual([...Object.keys(LESSON_LAYOUTS)].filter((k) => !used.has(k as never) && k !== 'split'), []);
});

test('the file as a whole: JSON, the format, a title and slides', () => {
  assert.match(readLesson('{nope').problems[0], /^It is not JSON/);
  assert.deepEqual(readLesson(JSON.stringify({ title: 'T', slides: [{ layout: 'title', title: 'A' }] })).problems, ['"format" must be "slideforge-lesson/1"']);
  assert.deepEqual(readLesson(lesson([], { title: ' ' })).problems, ['"title" must be the lesson\'s name', '"slides" must be a list of one or more slides']);
  assert.deepEqual(readLesson(lesson([{ layout: 'title', title: 'A' }], { colour: 'red' })).problems, ['a lesson has no field "colour"']);
});

test('each problem names its slide and says what to change', () => {
  const { problems } = readLesson(lesson([
    { layout: 'title', title: 'Fine' },
    { layout: 'slide', title: 'x' },
    { layout: 'bullets', title: 'No points' },
    { layout: 'cards', title: 'One card', cards: [['A', 'B']] },
    { layout: 'bullets', title: 'B', points: ['a'], colour: 'red' },
    { layout: 'compare', title: 'C', heads: ['A', 'B'], rows: [['x', 'y']] },
    { layout: 'title', id: 'cover', title: 'Again' },
    { layout: 'title', id: 'cover', title: 'Twice' },
  ]));
  assert.ok(problems[0].startsWith('Slide 2: "layout" must be one of title, section,'));
  assert.ok(problems[0].endsWith('not "slide".'));
  assert.deepEqual(problems.slice(1), [
    'Slide 3: a bullets slide needs "points".',
    'Slide 4: "cards" needs at least two cards.',
    'Slide 5: a bullets slide has no field "colour".',
    'Slide 6: "rows" must be a list of [row label, A, B].',
    'Slide 8: the id "cover" is used twice.',
  ]);
});

test('a quiz question\'s answer is its number from 1, or its exact words', () => {
  const q = { question: 'Q', options: ['A', 'B', 'C'] };
  assert.equal(answerIndex({ ...q, answer: 2 }), 1);
  assert.equal(answerIndex({ ...q, answer: ' C ' }), 2);
  assert.equal(answerIndex({ ...q, answer: 0 }), -1);
  assert.equal(answerIndex({ ...q, answer: 'D' }), -1);
  const { problems } = readLesson(lesson([{ layout: 'quiz', questions: [{ ...q, answer: 4 }, { question: 'Q', options: ['only'], answer: 1 }] }]));
  assert.deepEqual(problems, ['Slide 1: question 1\'s "answer" must be an option\'s number from 1, or its exact words.', 'Slide 1: question 2 needs two to four "options".']);
});

test('the deck: one slide per layout, a quiz as its game, in the named theme, with notes, marks and ids', () => {
  const { lesson: l } = readLesson(example);
  const deck = deckFromLesson(l!, choice);
  assert.equal(deck.title, 'Reading a chart before believing it');
  assert.equal(deck.theme, 'paper');
  const quiz = deck.slides.filter((s) => s.game);
  assert.ok(quiz.length >= 3, 'the quiz is a game: its cover and its questions');
  assert.equal(deck.slides.length, l!.slides.length - 1 + quiz.length);
  assert.equal(deck.slides[0].id, 'cover');
  assert.equal(deck.slides[1].notes, 'Pause after the line. Ask: whose choice?');
  const fact = deck.slides.find((s) => s.factCheck);
  assert.equal(fact?.factCheck?.note, 'the share of readers who read the title first, and its source');
  const words = (s: (typeof deck.slides)[number]) => JSON.stringify(s.layers.map((x) => x.params));
  assert.match(words(deck.slides[3]), /Where does the axis start\?/);
  const questions = quiz.filter((s) => s.game?.role === 'question');
  assert.equal(questions.length, 2);
  assert.ok(quiz.every((s) => s.id.startsWith('check')));
});

test('an unknown theme falls back to the default, and a quiz needs its starter', () => {
  const { lesson: l } = readLesson(lesson([{ layout: 'title', title: 'A' }], { theme: 'neon' }));
  assert.equal(deckFromLesson(l!).theme, 'paper');
  const { lesson: q } = readLesson(lesson([{ layout: 'quiz', questions: [{ question: 'Q', options: ['A', 'B'], answer: 1 }] }]));
  assert.throws(() => deckFromLesson(q!), /Slide 1 is a quiz/);
});
