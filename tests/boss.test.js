'use strict';
/* Boss battle.
 *
 * The mechanic is the original's, checked against BossBattleFullscreen.tsx:
 * HP is the sum of every question's damage, easy/medium/hard/boss deal
 * 1/2/3/5, the clock running out counts as a miss, and the fight ends when HP
 * reaches zero or the questions run out.
 *
 * What was missing was the fight itself. HP lived only in js/live.js, so a
 * battle played without phones drew a crest and a damage badge and nothing
 * else: no HP, nothing to defeat, every answer right or wrong to nobody.
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
  for (const f of ['js/model.js', 'js/boss.js']) {
    vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), context);
  }
  return context.window.SF;
}

const questions = (SF, levels) => levels.map((d, i) => ({
  id: 'q' + i, difficulty: d, bossDamage: SF.bossDamage(d),
  question: 'Question ' + (i + 1), options: ['A', 'B']
}));

/* secs is passed through as given: `secs || 30` turned "no clock at all"
   into a thirty second one, and the test that checks a clockless battle never
   expires was quietly running with a clock. */
const start = (SF, levels, who, secs) => SF.Boss.transition(
  SF.Boss.create(questions(SF, levels), who || ['Red', 'Blue'],
    secs === undefined ? 30 : secs), 'start');

test('HP is the sum of the damage the questions can do', () => {
  const SF = load();
  /* The original: easy 1, medium 2, hard 3, boss 5, and the boss starts on
     the total. Eleven here, so it cannot die to the first answer. */
  const s = SF.Boss.create(questions(SF, ['easy', 'medium', 'hard', 'boss']), ['Red'], 30);
  assert.equal(s.max, 11);
  assert.equal(s.hp, 11);
  assert.equal(SF.bossDamage('easy'), 1);
  assert.equal(SF.bossDamage('boss'), 5);
  /* A game with nothing in it still has a boss with a pulse. */
  assert.equal(SF.Boss.create([], ['Red'], 30).max, 1);
});

test('reveal then mark: a hit takes the question`s damage, a miss takes none', () => {
  const SF = load();
  let s = start(SF, ['easy', 'medium']);
  assert.equal(s.phase, 'asking');
  /* Nothing can be marked before the answer is out. */
  assert.equal(s.max, 3, 'easy plus medium');
  assert.equal(SF.Boss.transition(s, 'hit').hp, s.hp, 'no hit while still asking');
  assert.equal(SF.Boss.transition(s, 'hit').hits, 0);

  s = SF.Boss.transition(s, 'reveal');
  assert.equal(s.phase, 'marking');
  s = SF.Boss.transition(s, 'hit');
  assert.equal(s.hp, 2, 'three HP total, one taken off');
  assert.equal(s.hits, 1);

  /* Presentation advances; the fight follows via a new index. */
  s = Object.assign({}, s, {
    index: 1, revealed: false, expired: false, remaining: s.seconds, phase: 'asking'
  });
  const missed = SF.Boss.transition(SF.Boss.transition(s, 'reveal'), 'miss');
  assert.equal(missed.hp, 2, 'a miss does no damage');
  assert.equal(missed.misses, 1);
});

test('the clock running out is a miss, and cannot be marked a hit', () => {
  const SF = load();
  let s = start(SF, ['boss', 'easy'], ['Red'], 20);
  s = SF.Boss.transition(s, 'tick', 20);
  assert.equal(s.phase, 'marking');
  assert.equal(s.expired, true);
  assert.equal(s.revealed, true, 'the room still sees the answer');

  /* The original marked a timeout wrong and moved on. Awarding it as a hit
     would let a five-damage question be won by saying nothing. */
  const cheated = SF.Boss.transition(s, 'hit');
  assert.equal(cheated.hp, 6, 'untouched');
  assert.equal(cheated.hits, 0);

  const done = SF.Boss.transition(s, 'miss');
  assert.equal(done.timeouts, 1);
  assert.equal(done.misses, 1);
  assert.equal(done.expired, false, 'cleared for the next question');
});

test('a battle with no clock never expires on its own', () => {
  const SF = load();
  let s = start(SF, ['easy'], ['Red'], 0);
  s = SF.Boss.transition(s, 'tick', 999);
  assert.equal(s.phase, 'asking', 'no clock, no timeout');
  assert.equal(s.expired, false);
});

test('the boss is defeated at zero, and survives when the questions run out', () => {
  const SF = load();
  let s = start(SF, ['easy', 'easy'], ['Red'], 30);
  assert.equal(s.max, 2);
  s = SF.Boss.transition(SF.Boss.transition(s, 'reveal'), 'hit');
  s = Object.assign({}, s, {
    index: 1, revealed: false, expired: false, remaining: s.seconds, phase: 'asking'
  });
  s = SF.Boss.transition(s, 'reveal');
  s = SF.Boss.transition(s, 'hit');
  assert.equal(s.hp, 0);
  assert.equal(s.phase, 'complete');
  assert.equal(SF.Boss.defeated(s), true);
  assert.equal(SF.Boss.verdict(s), 'The boss is defeated.');

  /* And the other ending. */
  let t = start(SF, ['hard', 'hard'], ['Red'], 30);
  t = SF.Boss.transition(SF.Boss.transition(t, 'reveal'), 'miss');
  t = Object.assign({}, t, {
    index: 1, revealed: false, expired: false, remaining: t.seconds, phase: 'asking'
  });
  t = SF.Boss.transition(SF.Boss.transition(t, 'reveal'), 'miss');
  assert.equal(t.phase, 'complete');
  assert.equal(SF.Boss.defeated(t), false);
  assert.match(SF.Boss.verdict(t), /survived on 6 of 6 HP/);
});

test('the fight follows the slide rather than counting its own way through', () => {
  const SF = load();
  /* A cursor of its own drifted from the wall the first time anyone pressed
     Hit: the fight moved to Q2 while the room was still reading Q1. */
  const deck = { id: 'd1', title: 'Battle' };
  SF.Boss.forDeck(deck, questions(SF, ['easy', 'medium', 'hard']), ['Red'], 30);
  SF.Boss.command(deck, 'start');
  SF.Boss.command(deck, 'reveal');
  SF.Boss.command(deck, 'hit');
  assert.equal(SF.Boss.forDeck(deck).index, 0, 'still where the slide is');

  SF.Boss.focus(deck, 2);
  const f = SF.Boss.forDeck(deck);
  assert.equal(f.index, 2);
  assert.equal(f.revealed, false, 'a different question is a fresh ask');
  assert.equal(SF.Boss.damageNow(f), 3, 'and worth what that question is worth');

  /* Asking for the fight without questions is reading it, not creating it. */
  assert.equal(SF.Boss.forDeck({ id: 'never-played' }), null);
});

test('turns rotate by question, and damage is credited to whoever struck', () => {
  const SF = load();
  const deck = { id: 'd2', title: 'Battle' };
  SF.Boss.forDeck(deck, questions(SF, ['easy', 'medium']), ['Red', 'Blue'], 30);
  SF.Boss.command(deck, 'start');
  assert.equal(SF.Boss.turn(SF.Boss.forDeck(deck)), 0);
  SF.Boss.command(deck, 'reveal');
  SF.Boss.command(deck, 'hit');
  SF.Boss.focus(deck, 1);
  assert.equal(SF.Boss.turn(SF.Boss.forDeck(deck)), 1, 'Blue is up');
  SF.Boss.command(deck, 'reveal');
  SF.Boss.command(deck, 'hit');
  assert.deepEqual(plain(SF.Boss.standings(SF.Boss.forDeck(deck))), [
    { name: 'Blue', damage: 2 },
    { name: 'Red', damage: 1 }
  ]);
});

test('every hit and miss reports a verdict carrying the damage', () => {
  const SF = load();
  const sent = [];
  SF.Boss.onVerdict = (v) => sent.push(v);
  const deck = { id: 'd3', title: 'Revision battle' };
  SF.Boss.forDeck(deck, questions(SF, ['boss', 'easy']), ['Red', 'Blue'], 15);
  SF.Boss.command(deck, 'start');
  SF.Boss.command(deck, 'reveal');
  assert.equal(sent.length, 0, 'revealing is not a verdict');
  SF.Boss.command(deck, 'hit');
  SF.Boss.focus(deck, 1);
  SF.Boss.command(deck, 'expire');
  SF.Boss.command(deck, 'miss');

  assert.deepEqual(sent.map((v) => [v.participant, v.right, v.value]), [
    ['Red', true, 5],
    ['Blue', false, 0]
  ]);
  assert.equal(sent[0].kind, 'boss');
  assert.match(sent[1].term, /out of time/);
});

test('a question with nothing written on it is named, not silently skipped', () => {
  const SF = load();
  const qs = questions(SF, ['easy', 'medium']);
  qs[1].question = '';
  const s = SF.Boss.create(qs, ['Red'], 30);
  assert.equal(s.questions[0].ready, true);
  assert.equal(s.questions[1].ready, false);
  /* It still counts toward the boss's health, so blanking one does not
     quietly make the boss easier than the author thinks. */
  assert.equal(s.max, 3);
});

test('replay puts the boss back on full health', () => {
  const SF = load();
  let s = start(SF, ['easy', 'medium', 'hard'], ['Red'], 30);
  s = SF.Boss.transition(SF.Boss.transition(s, 'reveal'), 'hit');
  const again = SF.Boss.transition(s, 'restart');
  assert.equal(again.phase, 'ready');
  assert.equal(again.hp, again.max);
  assert.equal(again.max, 6);
  assert.equal(again.hits, 0);
  assert.equal(again.index, 0);
  assert.deepEqual(plain(again.dealt), {});
});

test('the boss wears its health, from full to defeated', () => {
  const SF = load();
  const s = SF.Boss.create(questions(SF, ['boss', 'boss']), ['Red'], 30);   // 10 HP
  const at = (hp) => SF.Boss.stage(Object.assign({}, s, { hp }));
  assert.equal(at(10), 'full');
  assert.equal(at(6), 'hurt');
  assert.equal(at(3), 'weak');
  assert.equal(at(0), 'defeated');
});

test('revisiting a marked question cannot score it again', () => {
  const SF = load();
  const deck = { id: 'd-revisit', title: 'Battle' };
  SF.Boss.forDeck(deck, questions(SF, ['easy', 'medium']), ['Red'], 30);
  SF.Boss.command(deck, 'start');
  SF.Boss.command(deck, 'reveal');
  SF.Boss.command(deck, 'hit');
  let f = SF.Boss.forDeck(deck);
  assert.equal(f.hp, 2);
  assert.equal(f.hits, 1);
  assert.deepEqual(plain(f.marked), ['q0']);

  SF.Boss.focus(deck, 1);
  SF.Boss.focus(deck, 0);
  f = SF.Boss.forDeck(deck);
  assert.equal(f.index, 0);
  assert.equal(SF.Boss.isMarked(f), true);
  assert.equal(f.revealed, true, 'marked revisit stays read-only');

  const hp = f.hp, hits = f.hits;
  SF.Boss.command(deck, 'reveal');
  SF.Boss.command(deck, 'hit');
  SF.Boss.command(deck, 'miss');
  f = SF.Boss.forDeck(deck);
  assert.equal(f.hp, hp);
  assert.equal(f.hits, hits);
  assert.deepEqual(plain(f.marked), ['q0']);
});
