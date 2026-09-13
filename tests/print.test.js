'use strict';
/* The student handout.
 *
 * A handout is given to the room, so the interesting tests are all about what
 * must not be in it. Everything else about the feature is layout; this is the
 * part that would be a mistake in front of thirty people.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function load() {
  const dir = path.resolve(__dirname, '..');
  const store = {};
  const localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  };
  const context = { window: {}, console, localStorage, Date, JSON, Set, Promise };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(dir, 'js/model.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(dir, 'js/print.js'), 'utf8'), context);
  return context.window.SF;
}

const plain = (v) => JSON.parse(JSON.stringify(v));

test('a quiz reaches the handout as the question, never the answer', () => {
  const SF = load();
  const deck = SF.normalizeDeck({
    title: 'T',
    slides: [{
      type: 'quiz', question: 'Which encoding is most accurate?',
      options: ['Angle', 'Position', 'Area', 'Colour'], correct: 1,
      explanation: 'Position beats the rest.', notes: 'Do not read this out.'
    }]
  });
  const pages = SF.Print.pagesFor(deck);
  assert.equal(pages.length, 1);
  const p = pages[0];
  assert.equal(p.question, '', 'the page is not itself a quiz slide');
  assert.deepEqual(plain(p.bullets), ['Angle', 'Position', 'Area', 'Colour'],
    'all four options are offered');
  /* `correct` normalises to 0 on a content slide, which is not a pointer to
     an answer — but the option text must not be singled out anywhere. */
  const text = JSON.stringify(p);
  assert.ok(!text.includes('Position beats the rest'), 'the explanation is not carried');
  assert.ok(!text.includes('Do not read this out'), 'the notes are not carried');
});

test('the answer-reveal slide is left out altogether', () => {
  const SF = load();
  /* `explain` is the slide that shows the letter and the correct option after
     a check. In a handout it is an answer key. */
  const deck = SF.normalizeDeck({
    title: 'T',
    slides: [
      { type: 'explain', question: 'Which one?', options: ['A', 'B'], correct: 1, body: 'Because B.' },
      { type: 'results' },
      { type: 'join' },
      { type: 'content', title: 'Kept', bullets: ['one'] }
    ]
  });
  const pages = SF.Print.pagesFor(deck);
  assert.deepEqual(plain(pages.map((p) => p.title)), ['Kept'],
    'explain, results and join are all dropped');
});

test('private notes never survive the copy', () => {
  const SF = load();
  const deck = SF.normalizeDeck({
    title: 'T',
    slides: [
      { type: 'content', title: 'A', bullets: ['x'], notes: 'SECRET-ONE' },
      { type: 'cards', title: 'B', bullets: ['p', 'q'], notes: 'SECRET-TWO', design: { cardsMode: 'stack' } },
      { type: 'gallery', title: 'C', notes: 'SECRET-THREE', layers: [{ image: 'a.png', caption: 'one' }] }
    ]
  });
  const pages = SF.Print.pagesFor(deck);
  assert.ok(pages.length >= 3);
  pages.forEach((p) => assert.equal(p.notes, '', 'no page carries notes'));
  assert.ok(!JSON.stringify(pages).includes('SECRET'), 'and no note text leaks by another route');
});

test('a stack becomes one page per card, a gallery one page per image', () => {
  const SF = load();
  const deck = SF.normalizeDeck({
    title: 'T',
    slides: [
      { type: 'cards', title: 'Steps', bullets: ['One', 'Two', 'Three'], design: { cardsMode: 'stack' } },
      { type: 'gallery', title: 'Quartet', layers: [
        { image: 'i.svg', caption: 'I' }, { image: 'ii.svg', caption: 'II' }
      ] }
    ]
  });
  const pages = SF.Print.pagesFor(deck);
  const stack = pages.filter((p) => String(p.title).startsWith('Steps'));
  assert.equal(stack.length, 3, 'three cards, three pages');
  assert.deepEqual(plain(stack.map((p) => p.bullets[0])), ['One', 'Two', 'Three']);
  const gallery = pages.filter((p) => p.type === 'image');
  assert.equal(gallery.length, 2, 'two layers, two pages');
  assert.deepEqual(plain(gallery.map((p) => p.title)), ['I', 'II'], 'each keeps its own caption');
});

test('before and after are shown one after the other, not as a wipe', () => {
  const SF = load();
  const deck = SF.normalizeDeck({
    title: 'T',
    slides: [{
      type: 'beforeafter', title: 'Redesign',
      exploration: { before: 'b.png', after: 'a.png', beforeLabel: 'Draft', afterLabel: 'Final' }
    }]
  });
  const pages = SF.Print.pagesFor(deck);
  assert.equal(pages.length, 2);
  assert.deepEqual(plain(pages.map((p) => p.title)), ['Redesign · Draft', 'Redesign · Final']);
  pages.forEach((p) => assert.equal(p.type, 'image', 'each side is a plain picture'));
});

test('every reveal is already shown, because nobody can press Next on paper', () => {
  const SF = load();
  const deck = SF.normalizeDeck({
    title: 'T',
    slides: [{ type: 'content', title: 'A', bullets: ['one', 'two'], progressive: true, buildMode: 'dim' }]
  });
  const pages = SF.Print.pagesFor(deck);
  assert.equal(pages[0].progressive, false, 'the build is off');
  assert.deepEqual(plain(pages[0].bullets), ['one', 'two'], 'and every point is present');
});

test('building the handout leaves the deck it was built from alone', () => {
  const SF = load();
  const deck = SF.normalizeDeck({
    title: 'T',
    slides: [
      { type: 'content', title: 'A', bullets: ['one'], notes: 'mine', progressive: true },
      { type: 'gallery', title: 'G', layers: [{ image: 'i.svg', caption: 'I' }] }
    ]
  });
  const before = JSON.stringify(deck);
  SF.Print.pagesFor(deck);
  assert.equal(JSON.stringify(deck), before, 'the authored deck is untouched');
});
