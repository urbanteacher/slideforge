// Heads up's round in the studio's room (lab-engine-plan M8), on a mock clock: the one clock for the whole pile, the guesser sent to
// the relay and kept for the round, a verdict that moves straight on after a beat, the clock running out (the open term closes with no
// verdict, and Next skips the terms nobody reached). The wire against the classic recording is in live-replay-spoken.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { showFromDeck, styleFor, styleForFormat } from '../src/live';
import { canHostInStudio } from '../src/show/canHost';
import { deckOf, quiz, room } from './spoken-kit';

const term = (name: string, extra: object = {}) => quiz('headsup', { options: ['Correct', 'Pass'], term: name, question: name, roundSeconds: 60, ...extra });
const three = () => deckOf('heads-up', [term('Gravity'), term('Friction'), term('Inertia')]);

/** A clock the host runs on: `tick(ms)` fires what has come due, in order. */
function clock() {
  const c = { ms: 1000, due: [] as { at: number; fn: () => void }[] };
  return {
    now: () => c.ms,
    after: (fn: () => void, d: number) => { c.due.push({ at: c.ms + d, fn }); },
    tick(ms: number) {
      const to = c.ms + ms;
      for (;;) {
        const d = c.due.filter((x) => x.at <= to).sort((a, b) => a.at - b.at)[0];
        if (!d) break;
        c.due.splice(c.due.indexOf(d), 1);
        c.ms = d.at;
        d.fn();
      }
      c.ms = to;
    },
  };
}

test('the registry takes Heads up; the Game panel\'s seconds are the round\'s, not each term\'s', () => {
  assert.equal(styleForFormat('heads-up')?.key, 'headsup');
  assert.deepEqual(canHostInStudio(three()), { ok: true, reason: '' });
  const timed = showFromDeck(deckOf('heads-up', [term('Gravity', { roundSeconds: undefined })], { seconds: 90 })).slides.find((s) => s.quiz)!.quiz!;
  assert.deepEqual([timed.roundSeconds, timed.timeLimit], [90, 0]);
  const bare = showFromDeck(deckOf('heads-up', [term('Gravity', { roundSeconds: undefined })])).slides.find((s) => s.quiz)!.quiz!;
  assert.equal(bare.roundSeconds, 60, 'a minute when nothing says');
  assert.deepEqual(styleFor(bare).spoken, { accepts: [0], scores: false, counts: 'correct', heads: true });
});

test('the guesser is sent when picked and kept for the round; the question carries the term, the guesser and the seconds left of one clock', async () => {
  const k = clock();
  const { host, sent } = await room(three(), 'individual', { now: k.now, after: k.after });
  assert.deepEqual([sent('question')[0].term, sent('question')[0].guesser, sent('question')[0].roundLeft], ['Gravity', undefined, 60]);
  host.recipient({ type: 'player', id: 2 });
  assert.deepEqual(sent('guesser'), [{ t: 'guesser', id: 2 }]);
  host.recipient({ type: 'room' });
  assert.deepEqual(sent('guesser')[1], { t: 'guesser', id: null }, 'no guesser: every phone shows the term');
  host.recipient({ type: 'player', id: 2 });
  k.tick(12000);
  host.verdict(0);
  k.tick(650);
  const q2 = sent('question')[1];
  assert.deepEqual([q2.term, q2.guesser, q2.roundLeft], ['Friction', 2, 47], 'the guesser keeps the round, and the clock has run 12.65 s');
});

test('a verdict moves straight on to the next term after a beat; a Correct is counted, a Pass is not', async () => {
  const k = clock();
  const { host, sent } = await room(three(), 'individual', { now: k.now, after: k.after });
  host.recipient({ type: 'player', id: 1 });
  host.verdict(0);
  assert.equal(sent('question').length, 1, 'not yet: the verdict stays on the wall for a beat');
  k.tick(649);
  assert.equal(sent('question').length, 1);
  k.tick(1);
  assert.equal(sent('question').length, 2);
  assert.equal(host.state.spoken.round?.count, 1);
  host.verdict(1); // Pass
  k.tick(650);
  assert.equal(sent('question').length, 3);
  assert.equal(host.state.spoken.round?.count, 1, 'a Pass is no term got right');
  assert.deepEqual(sent('reveal').map((r) => r.correct), [0, 1]);
});

test('when the clock runs out the open term closes with no verdict, the round is over, and Next skips the terms nobody reached', async () => {
  const k = clock();
  const { host, sent } = await room(three(), 'individual', { now: k.now, after: k.after });
  host.recipient({ type: 'player', id: 1 });
  k.tick(59999);
  assert.equal(sent('reveal').length, 0);
  k.tick(1);
  assert.equal(host.state.spoken.round?.over, true);
  const r = sent('reveal')[0];
  assert.deepEqual([r.correct, r.answer, r.spoken], [1, 'Pass', { recipient: { type: 'player', id: 1 } }], 'closed as a pass, still the guesser\'s round');
  host.next();
  assert.equal(host.slide?.results, true, 'past the two terms nobody reached, to the scores');
  assert.equal(sent('question').length, 1, 'no term was asked after time');
});

test('a verdict given just before time still counts, but the beat after it finds the round over and moves nothing on', async () => {
  const k = clock();
  const { host, sent } = await room(deckOf('heads-up', [term('Gravity', { roundSeconds: 5 }), term('Friction', { roundSeconds: 5 })]), 'individual', { now: k.now, after: k.after });
  k.tick(4800);
  host.verdict(0);
  k.tick(1000);
  assert.deepEqual([host.state.spoken.round?.count, host.state.spoken.round?.over], [1, true]);
  assert.equal(sent('question').length, 1, 'the beat after the verdict found the round over');
  assert.equal(sent('reveal').length, 1, 'the clock did not close a term that already had its verdict');
  host.next();
  assert.equal(host.slide?.results, true, 'Next skips the term nobody reached');
});
