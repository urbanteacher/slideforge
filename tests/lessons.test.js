'use strict';
/* Ready-made lessons.
 *
 * There used to be one, built by hand inside makeLesson(). It was reachable
 * only on a first run, so getting it back meant clearing the browser's storage
 * to convince the app it had never been used. They are content, not code: this
 * checks the file is data a lesson can be added to, and that activating one is
 * an ordinary action rather than a reset.
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
  const context = { window: {}, console, localStorage, Date };
  context.globalThis = context;
  vm.createContext(context);
  for (const f of ['js/model.js', 'js/lessons.js']) {
    vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), context);
  }
  return context.window.SF;
}

test('every lesson in the file describes a whole lesson', () => {
  const SF = load();
  assert.ok(SF.LESSONS.length >= 2, 'a picker of one is not a picker');
  const keys = SF.LESSONS.map((l) => l.key);
  assert.equal(new Set(keys).size, keys.length, 'keys are unique');
  SF.LESSONS.forEach((l) => {
    assert.ok(l.title && l.blurb, l.key + ' needs a title and a blurb for the card');
    assert.ok((l.slides || []).length, l.key + ' has slides');
    /* A slide that points at a game must point at one this lesson defines,
       or activating it would leave a "Game not found" slide in the deck. */
    const refs = (l.games || []).map((g) => g.ref);
    l.slides.filter((s) => s.type === 'game').forEach((s) => {
      assert.ok(refs.includes(s.gameRef), l.key + ' references a game it does not define');
    });
  });
});

test('activating one builds a real deck with its games wired up', () => {
  const SF = load();
  const deck = SF.buildLesson('attention');
  assert.equal(deck.title, 'The art of paying attention');
  assert.equal(deck.theme, 'studio');
  assert.deepEqual(JSON.parse(JSON.stringify(deck.slides.map((s) => s.type))),
    ['title', 'section', 'cards', 'game', 'content', 'section']);

  const gameSlide = deck.slides.find((s) => s.type === 'game');
  const game = SF.GameStore.get(gameSlide.gameId);
  assert.ok(game, 'the embedded game was saved, not just referenced');
  assert.equal(game.title, 'Let’s check that idea');
  assert.equal(game.questions[0].correct, 1);
  assert.equal(gameSlide.gameRef, undefined, 'the reference does not survive into the slide');
  /* The feedback moments the lesson is built around survive too. */
  assert.equal(deck.slides[1].feedback.kind, 'wordcloud');
  assert.equal(deck.slides[5].feedback.options.length, 3);
});

test('activating twice gives two lessons, not two names for one', () => {
  const SF = load();
  const a = SF.buildLesson('attention');
  const b = SF.buildLesson('attention');
  assert.notEqual(a.id, b.id);
  const gameA = a.slides.find((s) => s.type === 'game').gameId;
  const gameB = b.slides.find((s) => s.type === 'game').gameId;
  assert.notEqual(gameA, gameB, 'editing one copy must not rewrite the other');
  assert.equal(SF.GameStore.list().length, 2);
});

test('an unknown key falls back rather than returning nothing', () => {
  const SF = load();
  /* The first run asks for no key at all, and a lesson removed from the file
     should not leave the app with an empty deck. */
  assert.equal(SF.buildLesson().key, undefined, 'a deck, not a lesson spec');
  assert.equal(SF.buildLesson().title, SF.LESSONS[0].title);
  assert.equal(SF.buildLesson('no-such-lesson').title, SF.LESSONS[0].title);
  assert.ok(SF.buildLesson('no-such-lesson').slides.length);
});

test('a lesson survives being saved and reloaded', () => {
  const SF = load();
  /* It is an ordinary deck once activated — nothing about it is special, which
     is the point of moving it out of the code. */
  const deck = SF.buildLesson('retrieval');
  const round = SF.normalizeDeck(JSON.parse(JSON.stringify(deck)));
  assert.equal(round.title, deck.title);
  assert.equal(round.slides.length, deck.slides.length);
  assert.equal(round.slides.find((s) => s.type === 'game').gameId,
    deck.slides.find((s) => s.type === 'game').gameId);
});

test('ipdv-intro builds a 29-slide active lecture with formative quiz and 4 feedback moments', () => {
  const SF = load();
  const deck = SF.buildLesson('ipdv-intro');
  assert.ok(deck, 'deck exists');
  assert.equal(deck.title, 'LDSCI6253 Advanced Information Presentation & Visualisation');
  assert.equal(deck.theme, 'northeastern');
  assert.equal(deck.slides.length, 29);

  // The lecture wears the university's branding, so buildLesson has to carry a
  // lesson's logo fields onto the deck and not just its theme.
  assert.equal(deck.logo, 'assets/brand/nu-london-logo.png');
  assert.equal(deck.logoOn, 'all');
  assert.equal(deck.logoSize, 'small');

  // Every slide must carry presenter notes
  for (const [i, slide] of deck.slides.entries()) {
    assert.ok(slide.notes && slide.notes.trim().length > 0, 'slide ' + (i + 1) + ' (' + slide.type + ') has notes');
  }

  // Diverse slide types represent content visually
  const types = new Set(deck.slides.map((s) => s.type));
  assert.ok(types.has('title'), 'has title');
  assert.ok(types.has('cards'), 'has cards');
  assert.ok(types.has('content'), 'has content');
  assert.ok(types.has('split'), 'has split');
  assert.ok(types.has('section'), 'has section');
  assert.ok(types.has('keywords'), 'has keywords');
  assert.ok(types.has('quote'), 'has quote');
  assert.ok(types.has('game'), 'has game');

  // Verify embedded quiz
  const gameSlide = deck.slides.find((s) => s.type === 'game');
  assert.ok(gameSlide, 'game slide exists');
  assert.ok(gameSlide.gameId, 'game slide has gameId');
  const game = SF.GameStore.get(gameSlide.gameId);
  assert.ok(game, 'game is saved in GameStore');
  assert.equal(game.title, 'Lecture 1 Check — Foundations of Visualisation');
  assert.equal(game.style, 'choice');
  assert.equal(game.questions.length, 4);
  assert.ok(game.questions[0].question.includes('Tamara Munzner'));
  assert.equal(game.questions[0].correct, 1);
  assert.ok(game.questions[1].question.includes('Anscombe’s Quartet'));
  assert.equal(game.questions[1].correct, 1);
  assert.ok(game.questions[2].question.includes('Sankey diagram'));
  assert.equal(game.questions[2].correct, 1);
  assert.ok(game.questions[3].question.includes('cholera'));
  assert.equal(game.questions[3].correct, 2);

  // Verify feedback moments
  const feedbackSlides = deck.slides.filter((s) => s.feedback);
  assert.equal(feedbackSlides.length, 4, 'exactly 4 interactive feedback moments');
  assert.equal(feedbackSlides[0].feedback.kind, 'wordcloud');
  assert.ok(feedbackSlides[0].feedback.prompt.includes('what does a graphic do'));
  assert.equal(feedbackSlides[1].feedback.kind, 'poll');
  assert.ok(feedbackSlides[1].feedback.prompt.includes('Four datasets'));
  assert.equal(feedbackSlides[2].feedback.kind, 'poll');
  assert.ok(feedbackSlides[2].feedback.prompt.includes('patient flow'));
  assert.equal(feedbackSlides[3].feedback.kind, 'scale');
  assert.ok(feedbackSlides[3].feedback.prompt.includes('4Ps'));
});

test('ipdv bundle generator exports a valid slideforge-bundle', () => {
  const { buildBundle } = require('../tools/build-ipdv-lesson.js');
  const bundle = buildBundle();
  assert.equal(bundle.kind, 'slideforge-bundle');
  assert.equal(bundle.version, 1);
  assert.ok(bundle.exported);
  assert.equal(bundle.decks.length, 1);
  assert.equal(bundle.games.length, 1);
  assert.equal(bundle.decks[0].title, 'LDSCI6253 Advanced Information Presentation & Visualisation');
  assert.equal(bundle.decks[0].theme, 'northeastern');
  assert.equal(bundle.decks[0].logo, 'assets/brand/nu-london-logo.png');
  assert.equal(bundle.decks[0].slides.length, 29);
  assert.equal(bundle.games[0].title, 'Lecture 1 Check — Foundations of Visualisation');
  assert.equal(bundle.games[0].questions.length, 4);
});

