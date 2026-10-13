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
