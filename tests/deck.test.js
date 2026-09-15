'use strict';
/* Deck-wide settings — the things that belong to the presentation rather than
   to any one slide. */
const { test } = require('node:test');
const assert = require('node:assert/strict');

function loadModel() {
  const sandbox = {};
  global.window = sandbox;
  delete require.cache[require.resolve('../js/model.js')];
  require('../js/model.js');
  delete global.window;
  return sandbox.SF;
}

test('the logo goes where the setting says, and the front of a deck is a position', () => {
  const SF = loadModel();
  const logo = 'data:image/svg+xml;base64,AAAA';

  /* This is the bug the whole rule exists for. "First slide only" used to be
     matched as slide.type === 'title', which reads as equivalent and is not:
     a deck that opens on a Section has no slide of that type anywhere, so
     the option put the logo on none of its slides and gave no reason. The
     example lesson opens on a Section, so it was the common case, not the
     edge one. */
  const opensOnSection = SF.normalizeDeck({
    title: 'A lesson', logo: logo, logoOn: 'title',
    slides: [{ type: 'section' }, { type: 'content' }, { type: 'section' }]
  });
  const shown = opensOnSection.slides
    .map((s, i) => SF.deckShowsLogo(opensOnSection, s, i));
  assert.deepEqual(shown, [true, false, false],
    'the front slide, whatever layout it happens to use');

  /* And a Section later in the deck is a divider, not the front. */
  assert.equal(SF.deckShowsLogo(opensOnSection, { type: 'section' }, 2), false);

  /* A deck that really does open on a Title behaves the same way — the point
     is that the answer no longer depends on the layout at all. */
  const opensOnTitle = SF.normalizeDeck({
    title: 'B', logo: logo, logoOn: 'title',
    slides: [{ type: 'title' }, { type: 'content' }]
  });
  assert.deepEqual(opensOnTitle.slides.map((s, i) => SF.deckShowsLogo(opensOnTitle, s, i)),
    [true, false]);

  /* Without an index there is nothing to compare, so it falls back to the
     layout — a preview rendered on its own still shows the mark rather than
     silently dropping it. */
  assert.equal(SF.deckShowsLogo(opensOnSection, { type: 'section' }), true);
  assert.equal(SF.deckShowsLogo(opensOnSection, { type: 'title' }), true);
  assert.equal(SF.deckShowsLogo(opensOnSection, { type: 'content' }), false);

  /* 'all' means all, and 'none' means none, whatever the position. */
  const every = SF.normalizeDeck({ title: 'C', logo: logo, logoOn: 'all',
    slides: [{ type: 'content' }, { type: 'image' }] });
  assert.deepEqual(every.slides.map((s, i) => SF.deckShowsLogo(every, s, i)), [true, true]);

  /* No logo file is the one case that outranks the setting, and normalize
     forces the setting to agree rather than leaving 'all' on a deck with
     nothing to show. */
  const bare = SF.normalizeDeck({ title: 'D', logo: '', logoOn: 'all',
    slides: [{ type: 'title' }] });
  assert.equal(bare.logoOn, 'none');
  assert.equal(SF.deckShowsLogo(bare, bare.slides[0], 0), false);

  /* A deck saved before any of this existed has no logo fields at all. */
  const old = SF.normalizeDeck({ title: 'E', slides: [{ type: 'title' }] });
  assert.equal(old.logo, '');
  assert.equal(old.logoOn, 'none');
  assert.equal(SF.deckShowsLogo(old, old.slides[0], 0), false);
});

test('the readiness check finds what fails in the room, and says which is which', () => {
  const SF = loadModel();
  const game = SF.normalizeGame(Object.assign(SF.makeGame('Round', 'choice'), {
    settings: Object.assign(SF.makeGame('x', 'choice').settings, { music: 'audio/bed.mp3' })
  }));
  /* Two real answers and a blank third marked as the correct one — the
     classic silent failure, and not the same as "needs two answers", which
     the same rule catches earlier. */
  game.questions = [Object.assign(SF.makeQuestion('choice'),
    { question: 'Which?', options: ['A', 'B', ''], correct: 2 })];

  const deck = SF.normalizeDeck({
    title: 'A lesson',
    slides: [
      { type: 'video', video: '' },                       // stop
      { type: 'video', video: 'clips/a.mp4' },            // check: travels badly
      { type: 'video', video: 'https://x/a.mp4' },        // check: needs internet
      { type: 'image', image: 'data:image/png;base64,AA' }, // check: no alt text
      { type: 'table', body: '' },                        // stop
      { type: 'content', title: '', bullets: [] },        // check: empty
      { type: 'game', gameId: game.id }                   // stop: bad question
    ]
  });
  const r = SF.readiness(deck, (id) => (id === game.id ? game : null));

  /* Two levels, and the split is the whole point: a teacher with five minutes
     needs to know which of these will fail in front of a class and which
     merely depends on the room. */
  const stops = r.items.filter((f) => f.level === 'stop');
  const checks = r.items.filter((f) => f.level === 'check');
  assert.equal(r.stop, stops.length);
  assert.equal(r.check, checks.length);

  assert.match(stops[0].detail, /no video on it/);
  assert.match(stops.map((f) => f.detail).join(' '), /no rows/);
  assert.match(stops.map((f) => f.detail).join(' '), /no correct answer marked/,
    'a question nobody can get right is found through the embedded game');

  const said = checks.map((f) => f.detail).join(' ');
  assert.match(said, /not inside the deck/, 'a path travels badly');
  assert.match(said, /will not play offline/, 'a URL needs internet');
  assert.match(said, /cannot see it/, 'a picture with no description');
  assert.match(said, /empty/);

  /* A data URI is inside the deck, so it is never reported as missing. */
  assert.doesNotMatch(said, /data:/);

  /* Every finding points at a slide, or the list is homework. */
  r.items.forEach((f) => assert.equal(typeof f.slide, 'number'));

  /* The same file on ten slides is one warning, not ten. */
  const repeated = SF.normalizeDeck({
    title: 'B',
    slides: [1,2,3].map(() => ({ type: 'video', video: 'clips/same.mp4' }))
  });
  const rr = SF.readiness(repeated, () => null);
  assert.equal(rr.items.filter((f) => /not inside the deck/.test(f.detail)).length, 1);

  /* And a deck with nothing wrong says nothing. */
  const clean = SF.normalizeDeck({
    title: 'C',
    slides: [{ type: 'title', title: 'Hello' },
             { type: 'image', image: 'data:image/png;base64,AA', imageAlt: 'A chart' }]
  });
  assert.deepEqual(SF.readiness(clean, () => null).items, []);

  /* An empty deck is a stop, and has no slide to point at. */
  const none = SF.readiness({ title: 'D', slides: [] }, () => null);
  assert.equal(none.stop, 1);
  assert.equal(none.items[0].slide, null);
});

test('a pasted picture knows where it can land, and what a slide must become', async () => {
  const SF = loadModel();
  const withLines = (type, n) => {
    const s = SF.makeSlide(type);
    s.bullets = Array.from({ length: n }, (_, i) => 'point ' + i);
    return s;
  };

  /* Layouts with an image field take it where they are. */
  for (const type of ['image', 'split', 'introduction', 'keyfact', 'quote']) {
    assert.deepEqual(SF.pasteTarget(SF.makeSlide(type)), { field: 'image', become: type },
      type + ' should take a picture as it is');
  }

  /* A gallery is layers, not one image. Pasting used to set slide.image,
     which layoutGallery never reads — the toast said "pasted" and the slide
     stayed empty. */
  assert.deepEqual(SF.pasteTarget(SF.makeSlide('gallery')), { field: 'layer', become: 'gallery' });

  /* Words on a bullet layout: Image + text keeps every one of them. */
  for (const type of ['content', 'cards', 'keywords', 'stats', 'timeline']) {
    assert.deepEqual(SF.pasteTarget(withLines(type, 3)), { field: 'image', become: 'split' },
      type + ' with points should offer Image + text');
  }

  /* A heading and nothing else: the picture should be the slide. Bullets are
     cleared explicitly, because a fresh content slide arrives with empty pits
     and a starter may seed text into them. */
  for (const type of ['title', 'section', 'content']) {
    const bare = SF.makeSlide(type);
    bare.bullets = [];
    assert.deepEqual(SF.pasteTarget(bare), { field: 'image', become: 'image' },
      type + ' with no points should offer a full-bleed image');
  }

  /* And refused where a picture is not an improvement. */
  for (const type of ['chart', 'table', 'code', 'video', 'game', 'quiz']) {
    assert.equal(SF.pasteTarget(withLines(type, 3)), null, type + ' must refuse a paste');
  }
  assert.equal(SF.pasteTarget(null), null);
  assert.equal(SF.pasteTarget({}), null);

  /* The conversion the policy names has to be one that keeps the words, or
     the offer is a lie. */
  const before = withLines('content', 3);
  before.title = 'Why we visualise';
  const after = SF.normalizeSlide(SF.prepareLayout(before, 'split'));
  assert.equal(after.title, 'Why we visualise');
  assert.equal(after.bullets.filter((b) => String(b).trim()).length, 3);
});
