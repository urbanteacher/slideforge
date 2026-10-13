// The activities in the studio's room (lab-engine-plan M10) against the classic host's recordings
// (tests/fixtures/sessions/activity-*.json): each activity is added to a lab deck as the lab adds it (its
// design, designs/engage), the room's show is read from that deck (showFromDeck), and the recorded relay frames
// and the recorder's presses are played to the lab host. Every frame it sends must be classic's, normalised as
// in live-replay.test.ts (ids by first use, `report` dropped, a repeated `at` or `question` folded).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { showFromDeck } from '../src/live';
import { activityDeck, assertSame, load, replayShow } from './replay-kit';

const RECORDED = ['do-now-bell-ringer', 'exit-ticket', 'flipped-instruction', 'hook-and-predict', 'jigsaw-expert-groups', 'muddiest-point',
  'reflection-ladder', 'socratic-seminar', 'structured-reflection-protocol', 'think-pair-share', 'think-pair-square-share', 'word-splash'];

const replayOf = async (key: string, look: 'lab' | 'slideforge' = 'lab') => {
  const rec = load(`activity-${key}`);
  const hosted = rec.host.find((f) => f.dir === 'send' && f.data?.t === 'host')!.data as { title: string };
  return replayShow(rec, showFromDeck({ title: hosted.title, slides: activityDeck(key, look) }));
};

/** The phones are told the lab slide's words (live/activities/words.ts). Every activity's lab slide says the
 *  catalogue's words, but Think-Pair-Share's copy is the lab's own, tuned for the wall (designs/engage/thinkPairShare.ts):
 *  its Think stage and, on the track, its cover title. Classic's frames are compared with those words put in. */
const LAB_COPY: Record<string, [string, string][]> = {
  'think-pair-share': [['areas? Sketch an idea.', 'areas? On your own. Sketch an idea.']],
  'think-pair-share/slideforge': [['areas? Sketch an idea.', 'areas? On your own. Sketch an idea.'], ['"title":"Think-Pair-Share"', '"title":"Think · Pair · Share"']],
};
const inLabCopy = (frames: Record<string, unknown>[], swaps: [string, string][] = []) => frames.map((f) => {
  if (f.t !== 'at' && f.t !== 'prompt') return f;
  let j = JSON.stringify(f);
  for (const [from, to] of swaps) j = j.split(from).join(to);
  return JSON.parse(j) as Record<string, unknown>;
});

for (const key of RECORDED) {
  test(`${key}: the lab host sends what classic sent, frame for frame`, async () => {
    const { lab, classic } = await replayOf(key);
    assertSame(lab, inLabCopy(classic, LAB_COPY[key]));
  });
}

test('the same routine in SlideForge\'s look (the track) runs the same room', async () => {
  for (const key of ['think-pair-share', 'socratic-seminar']) {
    const { lab, classic } = await replayOf(key, 'slideforge');
    assertSame(lab, inLabCopy(classic, LAB_COPY[`${key}/slideforge`]));
  }
});

test('Think-Pair-Share: the stages, their jobs, the idea box of the Share stage and its close', async () => {
  const { lab, host } = await replayOf('think-pair-share');
  const stages = lab.filter((f) => f.t === 'at' && f.stage).map((f) => f.stage as { name: string; job: string; seconds: number });
  assert.deepEqual([...new Set(stages.map((s) => `${s.name}:${s.job}:${s.seconds}`))], ['Think:note:60', 'Pair:talk:120', 'Share:send:180', 'Connect:down:60']);
  const box = lab.find((f) => f.t === 'prompt')!;
  assert.deepEqual([box.origin, box.stage, box.kind, box.max], ['stage', 'Share', 'brainstorm', 1]);
  assert.ok(lab.findIndex((f) => f.t === 'promptEnd') > lab.findIndex((f) => f.t === 'prompt'), 'the box closes when Connect starts');
  assert.equal(host.state.activity, null, 'the room ended: nothing on the wall');
});
