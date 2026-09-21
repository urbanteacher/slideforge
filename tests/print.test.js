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
  /* experiments moved into the render engine and ships in the bundle;
     pages install it, so this does the same. */
  context.window.SF.installExperiments(context.window.SF);
  vm.runInContext(fs.readFileSync(path.join(dir, 'js/print.js'), 'utf8'), context);
  return context.window.SF;
}

const plain = (v) => JSON.parse(JSON.stringify(v));

test('experiments print every authored state in order without mutating the deck', () => {
  const SF=load();const deck=SF.normalizeDeck({title:'Experiment',slides:[{type:'experiment',title:'Polling',experiment:{preset:'polling'},body:SF.Experiments.presets.polling.data,notes:'PRIVATE'}]});
  const before=JSON.stringify(deck),pages=SF.Print.pagesFor(deck);
  assert.deepEqual(plain(pages.flatMap(p=>p._teachingPrint.states)),[0,1,2,3,4]);
  assert.equal(pages.length,3);
  assert.ok(pages.every(p=>p._sourceSlide===1&&p.notes===''));
  assert.equal(JSON.stringify(deck),before);
});

test('custom experiments do not inherit unsupported invariant claims', () => {
  const SF=load(),s={experiment:{preset:'integrity',states:[{label:'A',kind:'bar',explanation:'Explain the result.'}],print:{changes:'My controlled change'}}};
  const info=SF.Print.teachingInfo(s);
  assert.equal(info.changes,'My controlled change');
  assert.match(info.constants,/Check whether/);
  assert.equal(info.takeaway,'Explain the result.');
});

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

test('a response moment asks its question as the heading, not as a bullet', () => {
  const SF = load();
  const deck = SF.normalizeDeck({
    title: 'T',
    slides: [{
      type: 'section', title: 'Check the assessment connection',
      feedback: {
        kind: 'poll', prompt: 'Which approach meets the AE2 carry-over requirement?',
        options: ['Start something unrelated', 'Develop an AE1 idea', 'Resubmit unchanged']
      }
    }]
  });
  const page = SF.Print.pagesFor(deck).find((p) => /AE2 carry-over/.test(p.title));
  assert.ok(page, 'the prompt is the heading of its page');
  /* The failure this guards: the question printed as a fourth bullet among
     three answers, with nothing on the page saying which was which. */
  assert.ok(!plain(page.bullets).some((b) => /AE2 carry-over/.test(b)),
    'and is not repeated among the answers');
  assert.deepEqual(plain(page.bullets),
    ['Start something unrelated', 'Develop an AE1 idea', 'Resubmit unchanged'],
    'the answers are the bullets, all of them');
});

test('a scale prints its points, with both ends named', () => {
  const SF = load();
  const deck = SF.normalizeDeck({
    title: 'T',
    slides: [{
      type: 'section', title: 'Reflect',
      feedback: { kind: 'scale', prompt: 'How confident are you?', points: 5,
        lowLabel: 'Need guidance', highLabel: 'Ready to critique' }
    }]
  });
  const page = SF.Print.pagesFor(deck).find((p) => /How confident/.test(p.title));
  /* On screen the room answers on a phone and the slide needs no scale. On
     paper a bare question has nothing to circle. */
  assert.deepEqual(plain(page.bullets),
    ['1 — Need guidance', '2', '3', '4', '5 — Ready to critique'],
    'every point is there and the two ends say what they mean');
});

test('an open question gets a line to write on', () => {
  const SF = load();
  const deck = SF.normalizeDeck({
    title: 'T',
    slides: [{
      type: 'section', title: 'Warm up',
      feedback: { kind: 'wordcloud', prompt: 'In one word: how was that?', max: 2 }
    }]
  });
  const page = SF.Print.pagesFor(deck).find((p) => /In one word/.test(p.title));
  assert.equal(page.bullets.length, 2, 'one line per answer the room may give');
  assert.ok(page.bullets.every((b) => /\u2026/.test(b)), 'and each is a rule to write on');
});

test('a response moment never prints as a question with nothing under it', () => {
  const SF = load();
  const kinds = [
    { kind: 'poll', prompt: 'Which?', options: ['A', 'B'] },
    { kind: 'wordcloud', prompt: 'One word?' },
    { kind: 'brainstorm', prompt: 'Ideas?' },
    { kind: 'scale', prompt: 'How far?' }
  ];
  kinds.forEach((f) => {
    const deck = SF.normalizeDeck({ title: 'T', slides: [{ type: 'section', title: 'S', feedback: f }] });
    const page = SF.Print.pagesFor(deck).find((p) => p.title === f.prompt);
    assert.ok(page, `${f.kind} produced a page`);
    assert.ok(page.bullets.length > 0, `${f.kind} gives the student something to answer on`);
  });
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
