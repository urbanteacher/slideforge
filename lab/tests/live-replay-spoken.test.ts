// The spoken games against the classic host's recordings (lab-engine-plan M8; the harness and what it normalises are in
// replay-kit.ts and live-replay.test.ts). The phones answer nothing in a spoken game: the teacher says who is speaking
// (`manual:recipient`) and gives the verdict (`manual:revealWith`) in the entry window, and the reveal carries the verdict as
// `correct` with the recipient (`spoken`) and no gains; the relay counts the accepted ones (`oralCount`).
//
// Known difference, kept visible: classic draws the game's items in a fresh random order every run (DRAW_STYLES), so each
// recording has its own draw. The lab room asks the questions in the lesson's order (the order the author sees on the slides),
// so the replay puts the recorded draw on the show, as the Fill and Compare replays do for their word banks.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { RoomShow } from '../src/live';
import { assertSame, load, replay, type Rec } from './replay-kit';

/** The recorded draw on the show's questions (from the question frames the recorder saw), and the phones' skin on the steps between them. */
function recordedDraw(rec: Rec, skin: string) {
  return (show: RoomShow) => {
    const frames = rec.host.filter((f) => f.dir === 'send' && f.data?.t === 'question').map((f) => f.data!);
    const slots = show.slides.flatMap((s, i) => (s.quiz ? [i] : []));
    const ordered = frames.map((f) => show.slides.find((s) => s.quiz && s.quiz.question === f.question)!);
    slots.forEach((at, k) => { show.slides[at] = ordered[k]; });
    for (const s of show.slides) if (!s.quiz) s.style = skin;
  };
}

// Question cube (format 'question-cube', on Random challenge's engine, style 'randomchallenge'): six faces drawn one a roll, the verdicts
// Answered and Pass, and the same frames as Random challenge (the phones' heading is still "Random challenge"). The relay pays this
// engine 0 in every mode, so the verdicts only count, though the cube's playbook says it credits the team (style-inventory.md).
test('the lab host sends what the classic host sent for a Question cube game', async () => {
  const rec = load('game-question-cube');
  const { host, classic, lab } = await replay(rec, 'question-cube', false, recordedDraw(rec, 'count'));
  assertSame(lab, classic);
  const asked = lab.filter((f) => f.t === 'question');
  assert.equal(asked.length, 6);
  for (const q of asked) { assert.equal(q.spoken, true); assert.equal(q.style, 'randomchallenge'); assert.deepEqual(q.options, ['Answered', 'Pass']); assert.equal(q.points, 0); assert.equal(q.headPrompt, 'Random challenge'); }
  assert.deepEqual(lab.filter((f) => f.t === 'reveal').map((r) => [r.correct, r.answer, r.gains]), Array.from({ length: 6 }, () => [0, 'Answered', []]));
  assert.equal(host.state.revealed.length, 6);
  assert.deepEqual(Object.values(host.state.oralCounts), [6], 'the relay counted every roll');
  assert.ok(host.state.ended);
});

// Random challenge (format 'random-challenge', style 'randomchallenge'). The question frame is `spoken: true` with the verdicts
// Complete and Skip, no points, no confidence, and the phones' brief (role `discuss`, "Listen and watch..."); the teacher names
// Ada (`recipient`) and says Complete (`revealWith`); the reveal carries correct 0, `gains: []` and who spoke. The relay counts it
// (`oralCount`). The game has no scores slide, so the show ends on its last question.
test('the lab host sends what the classic host sent for a Random challenge game', async () => {
  const rec = load('game-random-challenge');
  const { host, classic, lab } = await replay(rec, 'random-challenge', false, recordedDraw(rec, 'count'));
  assertSame(lab, classic);
  const asked = lab.filter((f) => f.t === 'question');
  assert.equal(asked.length, 2);
  for (const q of asked) { assert.equal(q.spoken, true); assert.equal(q.style, 'randomchallenge'); assert.deepEqual(q.options, ['Complete', 'Skip']); assert.equal(q.points, 0); assert.equal(q.confidence, false); assert.equal(q.headPrompt, 'Random challenge'); }
  const reveals = lab.filter((f) => f.t === 'reveal');
  assert.deepEqual(reveals.map((r) => [r.correct, r.answer, r.gains, r.spoken]), [0, 1].map(() => [0, 'Complete', [], { recipient: { type: 'player', id: 1 } }]));
  assert.equal(host.state.revealed.length, 2);
  assert.deepEqual(Object.values(host.state.oralCounts), [2], 'the relay counted both verdicts');
  assert.ok(host.state.ended);
});

// Heads up (format 'heads-up', style 'headsup'). The question frame carries the term, the guesser once one is picked (the teacher's
// `recipient` sends `guesser` first, and the guesser keeps the whole round) and `roundLeft`, the seconds of one clock for the whole pile
// (60 when the first term lands, then 57 and 55 as the recording's clock ran). A verdict moves straight on to the next term after a
// beat, with no Next: the replay runs the host's timer on the recording's clock (replay-kit.ts), so the move-on lands where classic's did.
// Counts only: the relay pays this engine 0, so the reveal carries no gains.
test('the lab host sends what the classic host sent for a Heads up game', async () => {
  const rec = load('game-heads-up');
  const { host, classic, lab } = await replay(rec, 'heads-up', true, recordedDraw(rec, 'judge'));
  assertSame(lab, classic);
  const asked = lab.filter((f) => f.t === 'question');
  assert.deepEqual(asked.map((q) => q.term), ['Mitochondrion', 'Gravity', 'Photosynthesis']);
  assert.deepEqual(asked.map((q) => q.guesser), [undefined, 1, 1], 'the guesser keeps the round');
  assert.deepEqual(asked.map((q) => q.roundLeft), [60, 57, 55]);
  for (const q of asked) { assert.equal(q.spoken, true); assert.equal(q.style, 'headsup'); assert.deepEqual(q.options, ['Correct', 'Pass']); assert.equal(q.headPrompt, 'Heads up'); }
  assert.deepEqual(lab.filter((f) => f.t === 'guesser'), [1, 1, 1].map((id) => ({ t: 'guesser', id })));
  assert.deepEqual(lab.filter((f) => f.t === 'reveal').map((r) => [r.correct, r.gains, r.spoken]), Array.from({ length: 3 }, () => [0, [], { recipient: { type: 'player', id: 1 } }]));
  assert.equal(host.state.spoken.round?.count, 3, 'three terms got right in the round');
  assert.equal(host.state.revealed.length, 3);
  assert.ok(host.state.ended);
});

// Spin and explain (format 'spin-explain', style 'spinexplain'): the concept drawn is the question, the verdicts Clear, With hint and
// Reject, the points the game's own (2, which the relay does not use for a verdict). Same frames as the other spoken games; the
// scores slide follows the last concept, and `finish` is the final scores. The recorded room is individual and does not score
// spoken, so the verdict lands at once with Ada named; the held verdict of a teams room is in live-spoken.test.ts.
test('the lab host sends what the classic host sent for a Spin and explain game', async () => {
  const rec = load('game-spin-explain');
  const { host, classic, lab } = await replay(rec, 'spin-explain', true, recordedDraw(rec, 'judge'));
  assertSame(lab, classic);
  const asked = lab.filter((f) => f.t === 'question');
  assert.equal(asked.length, 3);
  for (const q of asked) { assert.equal(q.spoken, true); assert.equal(q.style, 'spinexplain'); assert.deepEqual(q.options, ['Clear', 'With hint', 'Reject']); assert.equal(q.points, 2); assert.equal(q.headPrompt, 'Spin & explain'); }
  assert.deepEqual(lab.filter((f) => f.t === 'reveal').map((r) => [r.correct, r.answer, r.gains, r.spoken]), Array.from({ length: 3 }, () => [0, 'Clear', [], { recipient: { type: 'player', id: 1 } }]));
  assert.deepEqual(lab.filter((f) => f.t === 'finish'), [{ t: 'finish', title: 'Final scores' }]);
  assert.equal(host.state.revealed.length, 3);
  assert.ok(host.state.ended);
});
