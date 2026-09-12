'use strict';
/* Horse race.
 *
 * The mechanic worked, but only in a live room: the track lived inside
 * js/live.js, as Live.pos. Everywhere else raceField() returned the declared
 * teams at position 0 every time it was asked, so a race played without phones
 * drew the starting gate on every question and never moved anyone. Red 0/5,
 * Blue 0/5, all game, however the room answered.
 *
 * The track is state that outlives a question, so it has its own module. Live
 * still owns the phone-scored race; this owns the one the teacher runs.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const plain = (v) => JSON.parse(JSON.stringify(v));

function load() {
  const dir = path.resolve(__dirname, '..');
  const context = { window: {}, console };
  context.globalThis = context;
  vm.createContext(context);
  for (const f of ['js/model.js', 'js/race.js']) {
    vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), context);
  }
  return context.window.SF;
}

const field = () => [
  { key: 't0', name: 'Red', color: '#c33' },
  { key: 't1', name: 'Blue', color: '#36c' }
];
const at = (SF, s) => SF.Race.standings(s).map((l) => l.name + ' ' + l.pos);

test('a lane moves a step at a time and the rest stay put', () => {
  const SF = load();
  let s = SF.Race.create(field(), 5);
  assert.deepEqual(plain(at(SF, s)), ['Red 0', 'Blue 0']);
  s = SF.Race.advance(s, 't0');
  assert.deepEqual(plain(at(SF, s)), ['Red 1', 'Blue 0']);
  s = SF.Race.advance(s, 't1');
  s = SF.Race.advance(s, 't1');
  assert.deepEqual(plain(at(SF, s)), ['Red 1', 'Blue 2']);
  /* Only the lane that just moved is marked, so the track can animate it. */
  assert.deepEqual(plain(SF.Race.standings(s).filter((l) => l.moved).map((l) => l.key)), ['t1']);
});

test('a lane that is home stays home', () => {
  const SF = load();
  let s = SF.Race.create(field(), 3);
  for (let i = 0; i < 5; i++) s = SF.Race.advance(s, 't0');
  assert.deepEqual(plain(at(SF, s)), ['Red 3', 'Blue 0'], 'capped at the post');
  assert.deepEqual(plain(s.winners), ['t0'], 'and named once, not three times');
  assert.equal(SF.Race.finished(s), true);
  assert.equal(SF.Race.winner(s), 'Red is home.');
});

test('a dead heat is named rather than resolved', () => {
  const SF = load();
  /* Three, not two: the shortest track the clamp allows. */
  let s = SF.Race.create(field(), 3);
  ['t0', 't1', 't0', 't1', 't0', 't1'].forEach((k) => { s = SF.Race.advance(s, k); });
  assert.deepEqual(plain(at(SF, s)), ['Red 3', 'Blue 3']);
  assert.deepEqual(plain(s.winners), ['t0', 't1']);
  assert.equal(SF.Race.winner(s), 'A dead heat: Red & Blue');
});

test('a step can be taken back, for a verdict given by mistake', () => {
  const SF = load();
  /* The teacher is the one pressing, so the teacher will press wrong. */
  let s = SF.Race.create(field(), 3);
  s = SF.Race.advance(s, 't0');
  s = SF.Race.advance(s, 't0');
  s = SF.Race.back(s, 't0');
  assert.deepEqual(plain(at(SF, s)), ['Red 1', 'Blue 0']);
  /* Including off the finish line: winning by mistake must be undoable. */
  s = SF.Race.advance(s, 't0');
  s = SF.Race.advance(s, 't0');
  assert.deepEqual(plain(s.winners), ['t0']);
  s = SF.Race.back(s, 't0');
  assert.deepEqual(plain(s.winners), [], 'no longer home, no longer a winner');
  assert.equal(SF.Race.finished(s), false);
  /* And it never goes behind the gate. */
  for (let i = 0; i < 5; i++) s = SF.Race.back(s, 't1');
  assert.equal(SF.Race.standings(s)[1].pos, 0);
});

test('a lane nobody declared cannot be moved', () => {
  const SF = load();
  const s = SF.Race.create(field(), 5);
  assert.equal(SF.Race.advance(s, 't7'), s, 'unchanged, not a new lane');
  assert.equal(SF.Race.standings(SF.Race.advance(s, 't7')).length, 2);
});

test('the track belongs to the deck and survives moving between questions', () => {
  const SF = load();
  const deck = { id: 'deck1', trackLength: 5 };
  SF.Race.forDeck(deck, field());
  SF.Race.command(deck, 'advance', 't0');
  SF.Race.command(deck, 'advance', 't0');
  /* Asked again on the next question — the same track, not a fresh one. */
  const again = SF.Race.forDeck(deck, field());
  assert.equal(SF.Race.standings(again)[0].pos, 2);

  /* Changing the teams is a different race and starts again. */
  const changed = SF.Race.forDeck(deck, field().concat([{ key: 't2', name: 'Green' }]));
  assert.equal(SF.Race.standings(changed)[0].pos, 0);

  /* And a new presentation clears everything. */
  SF.Race.command(deck, 'advance', 't0');
  SF.Race.clear();
  assert.equal(SF.Race.standings(SF.Race.forDeck(deck, field()))[0].pos, 0);
});

test('the track length comes from the game and is kept sane', () => {
  const SF = load();
  assert.equal(SF.Race.create(field(), 8).length, 8);
  assert.equal(SF.Race.create(field(), 99).length, 12, 'a track nobody could finish');
  assert.equal(SF.Race.create(field(), 1).length, 3, 'nor one won in a single question');
  assert.equal(SF.Race.create(field()).length, 5, 'the game default');

  /* A race game still compiles to quiz slides — the track is the thing that
     persists across them, not a board that replaces them. */
  const g = SF.makeGame('Race', 'race');
  g.settings.mode = 'teams';
  const run = SF.gameToRunDeck(g);
  assert.equal(run.mechanic, 'race');
  assert.ok(run.slides.some((s) => s.type === 'quiz'));
  assert.equal(run.trackLength, g.settings.trackLength);
});
