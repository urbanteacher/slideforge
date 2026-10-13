// Beat the clock against the classic host's recordings (lab-engine-plan M8; the harness and what it normalises are in replay-kit.ts
// and live-replay.test.ts). Two recordings, one game: with every learner on a phone it is a sprint the relay marks; with a
// teacher-entered learner in the room it plays wall-paced, as ordinary questions under one round clock.
//
// Differences kept visible, none removed: (1) the steps between the questions carry the game's skin ('speed'), as SlideForge's show
// gives them and as recordedShow does not know to (the spoken replays set theirs the same way). (2) The sprint's id is the game's id
// and the host's clock (`<game>:<ms>`): the lab's is the recording's clock, classic's the wall clock, so the ids differ and the
// normalisation names both "#n" in order of appearance. (3) The sprint's recording lands on only one of its questions, so the
// other two questions' ids come from its `sprint` frame (sprintIds). Nothing else is normalised beyond what replay-kit.ts does for every style.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { RoomShow } from '../src/live';
import { assertSame, load, replay, type Rec } from './replay-kit';

const skin = (show: RoomShow) => { for (const s of show.slides) if (!s.quiz) s.style = 'speed'; };

/** The sprint's recording never lands on its second and third questions (the run skips them), so their ids are not in an `at`:
 *  they are read off the `sprint` frame, and the scores slide's off its own `at`. */
function sprintIds(rec: Rec) {
  return (show: RoomShow) => {
    skin(show);
    const sent = rec.host.filter((f) => f.dir === 'send').map((f) => f.data!);
    const run = (sent.find((m) => m.t === 'sprint')!.questions as { id: string }[]).map((q) => q.id);
    const ats = sent.filter((m) => m.t === 'at').map((m) => String(m.slideId));
    let k = 0;
    for (const s of show.slides) {
      if (s.quiz) { s.id = run[k++]; s.quiz.id = s.id; }
      else if (s.results) s.id = ats[ats.length - 1];
    }
  };
}

// The sprint (K29). Landing on the first question sends `at` and then `sprint`: the run's three questions with their key, the
// round's 60 seconds and a sprint id; no `question` and no `idle`. The relay marks the phones' taps and reports `sprintProgress`.
// The first Next only asks for a second ("Press Next again to stop the clock"); the second, a millisecond later, sends
// `sprintEnd`, and the relay's `sprintResult` closes the run: its questions are done. The next Next goes past them to the scores.
test('the lab host sends what the classic host sent for a Beat the clock sprint', async () => {
  const rec = load('game-beat-the-clock');
  const { host, classic, lab } = await replay(rec, 'beat-the-clock', true, sprintIds(rec));
  assertSame(lab, classic);
  const sprint = lab.find((f) => f.t === 'sprint') as { seconds: number; questions: { question: string; correct: number; options: string[] }[]; gameId: string; id: string };
  assert.equal(sprint.seconds, 60);
  assert.deepEqual(sprint.questions.map((q) => q.options[q.correct]), ['Respiration', '300,000 km/s', 'Kidneys'], 'the key goes to the relay');
  assert.equal(lab.filter((f) => f.t === 'question').length, 0, 'the relay is never asked a question');
  assert.equal(lab.filter((f) => f.t === 'sprintEnd').length, 1);
  const sp = host.state.speed;
  assert.equal(sp.sprint, null, 'the show left the run');
  assert.equal(host.state.revealed.length, 3, 'the run\'s questions are done');
  assert.ok(host.state.ended);
});

// Wall-paced: Dee is entered by the teacher, so the run is not a sprint. Each question goes out as Multiple choice with
// `confidence: false`, no clock of its own (`timeLimit: 0`, and none with a teacher-entered learner anyway) and the round's
// seconds left (`roundLeft` 60, 56, 53 on the recording's clock). The reveal hands the relay speed points: 10 and up to 10 more
// for how fast the answer came after its question appeared (Bo's in 1.02 s: 19), -5 for a wrong one. Dee's answer by key is
// sent as `manualAnswer`; one for a phone's learner is refused by the relay (`manualError`).
test('the lab host sends what the classic host sent for a wall-paced Beat the clock', async () => {
  const rec = load('game-beat-the-clock-wall-paced');
  const { host, classic, lab } = await replay(rec, 'beat-the-clock', true, skin);
  assertSame(lab, classic);
  assert.equal(lab.filter((f) => f.t === 'sprint').length, 0);
  const asked = lab.filter((f) => f.t === 'question');
  assert.deepEqual(asked.map((q) => q.roundLeft), [60, 56, 53]);
  for (const q of asked) { assert.equal(q.style, 'speed'); assert.equal(q.timeLimit, 0); assert.equal(q.confidence, false); }
  assert.deepEqual(lab.filter((f) => f.t === 'reveal').map((r) => r.gains), [[[1, -5], [2, 19], [3, -5], [4, 18]], [[1, 20], [2, -5], [3, -5]], [[1, -5], [2, 20], [3, -5]]]);
  assert.equal(host.state.speed.round?.count, 4, 'four right answers in the round, as a room');
  assert.equal(host.state.revealed.length, 3);
  assert.ok(host.state.ended);
});
