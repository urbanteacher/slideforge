'use strict';
/* The rules, on the wall.
 *
 * The playbook copy already existed, in the authoring inspector — a panel only
 * the teacher can see. So a class met a new format by being talked through it
 * while the teacher read from their own screen, and the room never saw the
 * rules it was being asked to follow. This puts them in the presentation,
 * behind a setting, generated like the opening and closing slides.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function load() {
  const dir = path.resolve(__dirname, '..');
  const context = { window: {}, console };
  context.globalThis = context;
  vm.createContext(context);
  /* Both, and in this order: compileGame reads the playbook at run time, so a
     sandbox without it is the "no rules written" case rather than the normal
     one. */
  for (const f of ['js/model.js', 'js/playbook.js']) {
    vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), context);
  }
  return context.window.SF;
}

const howTo = (deck) => deck.slides.find((s) => /:howto$/.test(s.id || ''));

test('the rules land between the title slide and the first question', () => {
  const SF = load();
  const g = SF.makeGame('Revision bingo', 'bingo');
  g.format = 'bingo';
  const deck = SF.gameToRunDeck(g);
  const ids = deck.slides.map((s) => s.id);
  const rules = howTo(deck);
  assert.ok(rules, 'a rules slide');
  assert.equal(rules.title, 'How to play — Bingo');
  assert.ok(rules.bullets.length >= 3);
  assert.match(rules.bullets[0], /calls a definition/);

  /* After the opening slide, before anything to play. */
  assert.equal(ids.indexOf(rules.id), 1);
  assert.equal(deck.slides[0].type, 'section');
  assert.ok(deck.slides.slice(2).some((s) => s.bingoBoard));

  /* Shown outright. A rules slide that arrives blank until the teacher
     presses looks like a slide that failed to load. */
  assert.notEqual(rules.progressive, true);
  /* And the aim and engine summary are the teacher's, in the notes. */
  assert.match(rules.notes, /Recognise terms/);
  assert.match(rules.notes, /Scoring: No points/);
});

test('the setting turns it off, and off is the only way it goes', () => {
  const SF = load();
  const g = SF.makeGame('Emoji', 'emoji');
  g.format = 'emoji-guess';
  assert.equal(g.settings.howTo, true, 'on by default — the room should see the rules');
  assert.ok(howTo(SF.gameToRunDeck(g)));

  g.settings.howTo = false;
  assert.equal(howTo(SF.gameToRunDeck(g)), undefined);

  /* A game saved before this setting existed gains the default rather than
     losing its slides to an undefined check. */
  const older = SF.normalizeGame({ id: 'g1', kind: 'game', style: 'emoji',
    format: 'emoji-guess', title: 'Older', settings: { mode: 'individual' },
    questions: [] });
  assert.equal(older.settings.howTo, true);
});

test('the copy travels with the slide, so the presenter needs no playbook', () => {
  const SF = load();
  const g = SF.makeGame('Bowl', 'bowl');
  g.format = 'quiz-bowl';
  const rules = howTo(SF.gameToRunDeck(g));
  /* Everything the slide renders is on the slide: the presenter window and a
     saved deck do not load js/playbook.js. */
  const round = JSON.parse(JSON.stringify(rules));
  assert.deepEqual(round.bullets, JSON.parse(JSON.stringify(rules.bullets)));
  assert.equal(round.title, rules.title);
  assert.ok(round.bullets.every((b) => typeof b === 'string' && b.length));
});

test('a format with no rules written gets no empty slide', () => {
  /* Without the playbook loaded there is no copy to put on a slide, which is
     the same position a format the playbook does not cover is in. Neither
     should produce a slide with a title and nothing under it. */
  const dir = path.resolve(__dirname, '..');
  const context = { window: {}, console };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(dir, 'js/model.js'), 'utf8'), context);
  const SF = context.window.SF;
  const g = SF.makeGame('Plain', 'choice');
  assert.equal(g.settings.howTo, true, 'the setting is still on');
  assert.equal(howTo(SF.gameToRunDeck(g)), undefined, 'but nothing is generated');
});

test('the rules match the format, not the engine underneath it', () => {
  const SF = load();
  /* Emoji guess and a plain typed question share the typed marking. What the
     room needs told is how the activity runs, which is the format's. */
  const emoji = SF.makeGame('Emoji', 'emoji');
  emoji.format = 'emoji-guess';
  const rules = howTo(SF.gameToRunDeck(emoji));
  assert.match(rules.title, /Emoji Guess/);
  assert.match(rules.bullets.join(' '), /emoji/i);
});

test('every engine finds its rules, with or without a catalogue format on it', () => {
  const SF = load();
  /* New game in the studio makes a game from an engine with no format on it.
     The playbook is keyed by catalogue format, so those games found nothing
     and the How to play toggle sat disabled — on the memory boards among
     others, which are exactly the formats a class needs told the rules of. */
  const styles = Object.keys(SF.GAME_STYLES);
  const missing = styles.filter((style) => {
    const entry = SF.Playbook.forGame(SF.makeGame('Probe', style));
    return !entry || !(entry.howToPlay || []).length;
  });
  assert.deepEqual(missing, [], 'styles with no rules to show');

  /* And a game that does carry a format uses that, not the engine's — one
     engine runs several formats and they have different rules. */
  const g = SF.makeGame('Odd one out', 'choice');
  g.format = 'odd-one-out';
  assert.match(SF.Playbook.forGame(g).title, /Odd One Out/);
  assert.match(SF.Playbook.forGame(SF.makeGame('Plain', 'choice')).title, /choice|Quiz/i);
});

test('the studio reopens the game you had open, not the one saved last', () => {
  /* The deck engine remembers its document; the game engine took
     GameStore.list()[0], which is the most recently *saved* game. Inserting a
     format from the catalogue, or the deck migration writing a game, moves a
     different one to the front — so a refresh swapped the document under you,
     and when the two had different themes the whole canvas changed colour. */
  const store = {};
  const localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  };
  const dir = path.resolve(__dirname, '..');
  const context = { window: {}, console, localStorage, Date };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(dir, 'js/model.js'), 'utf8'), context);
  const SF = context.window.SF;

  const mine = SF.makeGame('The one I am editing', 'choice');
  SF.GameStore.save(mine);
  const other = SF.makeGame('Something else entirely', 'truefalse');
  other.theme = 'midnight';

  /* Something else writes a game — inserting a format from the catalogue does
     exactly this — and it becomes the most recently saved one. */
  SF.GameStore.save(other);
  assert.equal(SF.GameStore.lastId(), other.id);

  /* Coming back to mine records mine, so that is what the studio reopens.
     save() is the path openGame takes, so opening is remembered too and not
     only editing. */
  SF.GameStore.save(mine);
  assert.equal(SF.GameStore.lastId(), mine.id);
  assert.equal(SF.GameStore.get(SF.GameStore.lastId()).title, 'The one I am editing');

  /* And a stale id does not strand the studio with nothing open. */
  localStorage.setItem('slideforge.lastGameId', 'deleted-long-ago');
  assert.equal(SF.GameStore.get(SF.GameStore.lastId()), null);
  assert.ok(SF.GameStore.list().length, 'so install falls back to the list');
});

test('a new document is the house theme, not navy', () => {
  const SF = load();
  /* New blank document used to hand back a midnight deck inside a sage app,
     which is half of what "flashing between Studio and Midnight" was. */
  assert.equal(SF.makeDeck('Fresh').theme, 'studio');
  assert.equal(SF.makeGame('Fresh', 'choice').theme, 'studio');
  assert.equal(SF.starterGame().theme, 'studio');
  assert.equal(SF.Studio ? 'studio' : 'studio', 'studio');
});

test('a lesson can finish on the scores, and only when it has a game in it', () => {
  const SF = load();
  /* An embedded game's board goes up where that game ends — mid-lesson — and
     is long gone by the last slide. With two games there are two boards and
     never a combined one. */
  const game = SF.makeGame('Retrieval', 'choice');
  const deck = SF.makeDeck('Lesson');
  deck.slides.push(Object.assign(SF.makeSlide('game'),
    { gameId: game.id, gameTitle: game.title }));
  deck.slides.push(Object.assign(SF.makeSlide('content'), { title: 'A little reflection.' }));
  const look = (id) => (id === game.id ? game : null);

  const plain = SF.buildRunDeck(deck, look);
  assert.equal(plain.slides[plain.slides.length - 1].title, 'A little reflection.',
    'off by default — the lesson ends where the teacher ended it');

  deck.finalScores = true;
  const closed = SF.buildRunDeck(deck, look);
  const last = closed.slides[closed.slides.length - 1];
  assert.equal(last.type, 'results');
  assert.equal(last.title, 'Final scores');
  assert.equal(last.subtitle, 'Retrieval');
  /* After the authored ending, not instead of it. */
  assert.equal(closed.slides[closed.slides.length - 2].title, 'A little reflection.');

  /* Two games get one board that names them both, not two boards. */
  const second = SF.makeGame('Plenary', 'truefalse');
  deck.slides.push(Object.assign(SF.makeSlide('game'),
    { gameId: second.id, gameTitle: second.title }));
  const two = SF.buildRunDeck(deck, (id) => (id === game.id ? game : id === second.id ? second : null));
  assert.equal(two.slides.filter((s) => s.id && /final-scores$/.test(s.id)).length, 1);
  assert.equal(two.slides[two.slides.length - 1].subtitle, '2 games this lesson');

  /* A lesson with no game gets nothing, however the flag is set. */
  const noGames = SF.makeDeck('Just slides');
  noGames.finalScores = true;
  const nothing = SF.buildRunDeck(noGames, () => null);
  assert.equal(nothing.slides.some((s) => s.id && /final-scores$/.test(s.id)), false);
});
