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

test('ipdv-intro builds a 74-slide active lecture with formative quiz and 2 feedback moments', () => {
  const SF = load();
  const deck = SF.buildLesson('ipdv-intro');
  assert.ok(deck, 'deck exists');
  assert.equal(deck.title, 'LDSCI6253 Advanced Information Presentation & Visualisation');
  assert.equal(deck.theme, 'northeastern');
  assert.equal(deck.slides.length, 74);

  // Browser-saved teaching order (13 Sep): journey/assessment up front, history
  // plates together, discovery after a red section — no parked appendix.
  // Red section breaks carry the topic changes, so the journey block now sits
  // behind one rather than opening the deck cold.
  assert.equal(deck.slides[2].type, 'section');
  assert.equal(deck.slides[3].title, 'Your course journey · foundations');
  assert.equal(deck.slides.filter((s) => s.type === 'section').length, 10,
    'ten topic breaks');
  assert.ok(deck.slides.some((s) => (s.title || '').includes('When Visualisations')),
    'discovery section divider');
  assert.ok(deck.slides.some((s) => s.title === 'John Snow · 1854'), 'Snow plate');
  // Named, not prefix-matched: the 'Use case ·' prefix was dropped from these
  // four titles and this filter silently matched nothing for a while.
  const useCaseTitles = ['Changes over time', 'Frequency and distribution',
    'Relationships and correlation', 'Value, flow and risk'];
  const useCases = deck.slides.filter((s) => useCaseTitles.includes(s.title));
  assert.equal(useCases.length, 4, 'four use-case split slides');
  for (const slide of useCases) {
    assert.equal(slide.type, 'split');
    assert.ok(slide.image, slide.title + ' has chart image');
    assert.ok(slide.bullets && slide.bullets.length >= 3, slide.title + ' has teaching bullets');
  }
  assert.equal(deck.slides[deck.slides.length - 1].title, 'Q & A');

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
  assert.ok(types.has('mindmap'), 'has editable visual thinking');
  assert.equal(deck.slides[0].date, '2026-09-14');
  assert.equal(deck.slides[1].type, 'introduction');
  const map = deck.slides.find(s => s.type === 'mindmap' && s.title === 'Why visualise?');
  assert.ok(map, 'why-visualise mindmap');
  assert.equal(SF.slideSteps(map).length, 6);
  assert.equal(SF.normalizeDeck(JSON.parse(JSON.stringify(deck))).slides[1].title, 'Mark Martin');
  assert.ok(types.has('cards'), 'has cards');
  assert.ok(types.has('content'), 'has content');
  assert.ok(types.has('split'), 'has split');
  assert.ok(types.has('section'), 'has section');
  assert.ok(types.has('keywords'), 'has keywords');
  assert.ok(types.has('quote'), 'has quote');
  assert.ok(types.has('game'), 'has game');

  // Anscombe beat: graph + text per dataset, not a caption-only gallery
  const anscombe = deck.slides.filter((s) => /^Anscombe [IVX]+/.test(s.title || ''));
  assert.equal(anscombe.length, 4, 'four Anscombe split slides');
  for (const slide of anscombe) {
    assert.equal(slide.type, 'split');
    assert.ok(slide.image, slide.title + ' has chart image');
    assert.equal(slide.imageSide, 'left');
    assert.ok(slide.bullets && slide.bullets.length >= 3, slide.title + ' has teaching bullets');
  }
  assert.ok(deck.slides.some((s) => s.title === 'Four pictures, one quick report'),
    'Anscombe close slide');

  // Verify embedded quiz
  // Found by name, not by position: the deck now carries a one-question check
  // at the end of each section as well as the formative quiz, so "the first
  // game slide" stopped meaning what this test wanted it to mean.
  const gameSlides = deck.slides.filter((s) => s.type === 'game');
  assert.equal(gameSlides.length, 9, 'eight section checks plus the formative quiz');
  assert.ok(gameSlides.every((s) => s.gameId), 'every game slide resolves to a game');
  const checks = gameSlides
    .map((s) => SF.GameStore.get(s.gameId))
    .filter((g) => g && g.title.startsWith('Check · '));
  assert.equal(checks.length, 8, 'one check per section');
  assert.ok(checks.every((g) => g.questions.length === 1), 'a check is one question');
  const gameSlide = gameSlides.find((s) => {
    const g = SF.GameStore.get(s.gameId);
    return g && g.title === 'Lecture 1 Check — Foundations of Visualisation';
  });
  assert.ok(gameSlide, 'the formative quiz slide exists');
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

  // Interactive moments kept in the 13 Sep teaching path
  const feedbackSlides = deck.slides.filter((s) => s.feedback);
  assert.equal(feedbackSlides.length, 3, 'wordcloud, confidence scale and Muddiest Point');
  assert.equal(feedbackSlides[0].feedback.kind, 'wordcloud');
  assert.ok(feedbackSlides[0].feedback.prompt.includes('what does a graphic do'));
  assert.equal(feedbackSlides[1].feedback.kind, 'scale');
  assert.ok(feedbackSlides[1].feedback.prompt.includes('4Ps'));
});

test('ipdv bundle generator exports a valid slideforge-bundle', () => {
  const { buildBundle } = require('../tools/build-ipdv-lesson.js');
  const bundle = buildBundle();
  assert.equal(bundle.kind, 'slideforge-bundle');
  assert.equal(bundle.version, 1);
  assert.ok(bundle.exported);
  assert.equal(bundle.decks.length, 1);
  assert.equal(bundle.games.length, 9);
  assert.equal(bundle.decks[0].title, 'LDSCI6253 Advanced Information Presentation & Visualisation');
  assert.equal(bundle.decks[0].theme, 'northeastern');
  assert.equal(bundle.decks[0].logo, 'assets/brand/nu-london-logo.png');
  assert.equal(bundle.decks[0].slides.length, 74);
  const formative = bundle.games.find(
    (g) => g.title === 'Lecture 1 Check — Foundations of Visualisation');
  assert.ok(formative, 'the formative quiz is in the bundle');
  assert.equal(formative.questions.length, 4);
  assert.equal(bundle.games.length, 9, 'the section checks travel with the bundle');
});

test('the library seeds brand packs once and leaves vibe galleries out', () => {
  const SF = load();
  const vibe = ['pace-studio', 'vibe-product', 'vibe-editorial', 'vibe-cinematic',
    'vibe-brutal', 'vibe-studio-teach', 'infographic-pack'];
  vibe.forEach((key) => {
    assert.ok(SF.LESSONS.some((l) => l.key === key), key + ' still exists as seed data');
    assert.equal(SF.LIBRARY_SEED_KEYS[key], undefined, key + ' is not a library card');
  });
  const first = SF.seedLibrary();
  assert.equal(first, Object.keys(SF.LIBRARY_SEED_KEYS).length);
  assert.equal(SF.seedLibrary(), 0, 'a second seed must not clone the packs');
  const keys = SF.Store.list().map((d) => String(d.sourceKey || '')).filter(Boolean).sort();
  assert.equal(keys.join(','), Object.keys(SF.LIBRARY_SEED_KEYS).sort().join(','));
  vibe.forEach((key) => assert.ok(!keys.includes(key)));
});

test('the demo is not filed in the Library, and an old copy is taken off the shelf', () => {
  const SF = load();
  assert.equal(SF.LIBRARY_SEED_KEYS['layout-bank'], undefined, 'the demo is not a library card');
  SF.seedLibrary();
  assert.equal(SF.Store.list().filter((d) => d.sourceKey === 'layout-bank').length, 0,
    'seeding must not file the demo');

  /* Built on demand it keeps its sourceKey — that is how the Demo button finds
     the one demo document — but it belongs to the folder the Library does not
     list, so the picker never shows it. */
  const demo = SF.buildLesson('layout-bank');
  assert.equal(demo.sourceKey, 'layout-bank');
  assert.equal(demo.libraryGroup, SF.DEMO_LIBRARY_GROUP);
  assert.ok(!SF.LIBRARY_GROUPS.some((g) => g.id === SF.DEMO_LIBRARY_GROUP),
    'the demo folder is not one of the Library shelves');

  /* An install from before this has the demo filed in Northeastern. */
  const stale = SF.buildLesson('layout-bank');
  stale.libraryGroup = 'nul';
  SF.Store.save(stale, { force: true });
  assert.equal(SF.Store.get(stale.id).libraryGroup, 'nul');
  SF.seedLibrary();
  assert.equal(SF.Store.get(stale.id).libraryGroup, SF.DEMO_LIBRARY_GROUP,
    're-filed rather than deleted: the document survives, the shelf loses it');
});

test('saving a seeded pack keeps the same library id', () => {
  const SF = load();
  SF.seedLibrary();
  const a = SF.Store.list().filter((d) => d.sourceKey === 'ukbt-template')[0];
  assert.ok(a, 'ukbt-template was filed');
  const id = a.id;
  a.title = 'Edited UKBT template';
  SF.Store.save(a);
  const b = SF.Store.get(id);
  assert.equal(b.id, id);
  assert.equal(b.title, 'Edited UKBT template');
  assert.equal(SF.Store.list().filter((d) => d.sourceKey === 'ukbt-template').length, 1);
});

test('deleting a seeded pack stays deleted across re-seed', () => {
  const SF = load();
  SF.seedLibrary();
  const row = SF.Store.list().filter((d) => d.sourceKey === 'nul-lab1')[0];
  assert.ok(row, 'nul-lab1 was filed');
  SF.dismissLibrarySeed(row.sourceKey);
  SF.Store.remove(row.id);
  assert.equal(SF.Store.list().filter((d) => d.sourceKey === 'nul-lab1').length, 0);
  assert.equal(SF.seedLibrary(), 0, 'dismissed packs must not come back on seed');
  assert.equal(SF.Store.list().filter((d) => d.sourceKey === 'nul-lab1').length, 0);
  SF.restoreLibrarySeed('nul-lab1');
  assert.ok(SF.seedLibrary() >= 1, 'restore lets seed file the pack again');
  assert.equal(SF.Store.list().filter((d) => d.sourceKey === 'nul-lab1').length, 1);
});

test('save assigns libraryGroup from theme when missing', () => {
  const SF = load();
  const deck = SF.makeDeck('A named lesson');
  deck.theme = 'ukbt';
  deck.slides[0].title = 'Week 3';
  SF.Store.save(deck);
  const stored = SF.Store.get(deck.id);
  assert.equal(stored.libraryGroup, 'ukbt');
  assert.equal(SF.libraryGroupFromTheme('northeastern'), 'nul');
  assert.equal(SF.libraryGroupFromTheme('ukbt-institute'), 'ukbt-institute');
  assert.equal(SF.libraryGroupFromTheme('studio'), 'other');
});

test('a custom library folder is not rewritten to the theme folder', () => {
  const SF = load();
  const deck = SF.makeDeck('Week 3 seminar');
  deck.theme = 'northeastern';
  deck.libraryGroup = 'week-3';
  deck.slides[0].title = 'Seminar';
  SF.Store.save(deck);
  assert.equal(SF.Store.get(deck.id).libraryGroup, 'week-3');
});

test('lesson checks are stamped with the lesson folder', () => {
  const SF = load();
  const deck = SF.buildLesson('ipdv-intro');
  SF.Store.save(deck, { force: true });
  const gameSlide = deck.slides.find((s) => s.type === 'game');
  const game = SF.GameStore.get(gameSlide.gameId);
  assert.equal(game.libraryGroup, 'nul');
  assert.equal(game.sourceDeckId, deck.id);
  assert.match(SF.LessonBank.deckFacts(deck), /slides/);
  assert.match(SF.LessonBank.deckFacts(deck), /check/);
});

test('Lesson bank stays inside the Library folder', () => {
  const SF = load();
  const nul = SF.buildLesson('ipdv-intro');
  SF.Store.save(nul, { force: true });
  const ukbt = SF.makeDeck('UKBT lesson');
  ukbt.theme = 'ukbt';
  ukbt.libraryGroup = 'ukbt';
  const g = SF.makeGame('UKBT check', 'choice');
  g.questions[0].question = 'Only on the UKBT shelf';
  SF.LessonBank.stamp(g, ukbt);
  SF.GameStore.save(g);
  const slide = SF.makeSlide('game');
  slide.gameId = g.id;
  ukbt.slides = [slide];
  SF.Store.save(ukbt, { force: true });

  const nulIds = new Set(SF.LessonBank.folderBank('nul').map((r) => r.gameId));
  const ukbtIds = new Set(SF.LessonBank.folderBank('ukbt').map((r) => r.gameId));
  assert.ok(nulIds.size > 0, 'Northeastern bank has checks');
  assert.ok(ukbtIds.has(g.id), 'UKBT bank has its check');
  assert.equal([...nulIds].filter((id) => ukbtIds.has(id)).length, 0,
    'folders must not share checks');

  ukbt.libraryGroup = 'nul';
  SF.Store.save(ukbt, { force: true });
  const afterMove = new Set(SF.LessonBank.folderBank('nul').map((r) => r.gameId));
  assert.ok(afterMove.has(g.id), 'Move into Northeastern joins that bank');
  assert.equal(SF.LessonBank.folderBank('ukbt').length, 0);
});

test('Saved lists checks on the parent lesson only', () => {
  const SF = load();
  const a = SF.buildLesson('ipdv-intro');
  SF.Store.save(a, { force: true });
  const b = SF.buildLesson('attention');
  SF.Store.save(b, { force: true });
  const gameId = a.slides.find((s) => s.type === 'game').gameId;
  const saved = SF.LessonBank.savedList(SF.GameStore.get(gameId));
  const ids = saved.items.map((g) => g.id);
  a.slides.filter((s) => s.type === 'game' && s.gameId).forEach((s) => {
    assert.ok(ids.includes(s.gameId), s.gameTitle + ' belongs to this lesson');
  });
  const other = b.slides.find((s) => s.type === 'game');
  if (other) assert.ok(!ids.includes(other.gameId), 'another lesson’s check is not Saved here');
});

/* Teacher notes are read off a screen mid-lesson, and they are written in
   paragraphs — PURPOSE, THE FRAME, LIKELY RESPONSES, TONE, SEND, EXTENSION,
   SOURCE. The five AI Awareness Day 2027 packs had those breaks written as
   "\\n" in the source, which is a backslash and an n rather than a line
   break, so every one of them arrived as a single wall of text with 57
   visible \n between the sections. Nothing failed: the notes were present,
   the deck built, the tests passed, and the only way to find it was to read
   what a teacher would read. presenter.html sets white-space: pre-wrap on
   .notes, so a real break lands as a break and this stays worth holding. */
test('teacher notes break into paragraphs rather than showing their escapes', () => {
  const SF = load();
  const offenders = [];
  let withBreaks = 0;
  SF.LESSONS.forEach((lesson) => {
    const deck = SF.buildLesson(lesson.key);
    deck.slides.forEach((slide, i) => {
      const notes = String(slide.notes || '');
      if (!notes) return;
      const literal = (notes.match(/\\n/g) || []).length;
      if (literal) offenders.push(lesson.key + ' slide ' + (i + 1) + ': ' + literal + ' literal \\n');
      if (/\n/.test(notes)) withBreaks++;
    });
  });
  assert.deepEqual(offenders, [], 'notes must carry real line breaks:\n  ' + offenders.join('\n  '));
  /* A floor, so this cannot start passing because the notes went away. */
  assert.ok(withBreaks > 100,
    'the sweep must actually find multi-paragraph notes, got ' + withBreaks);
});
