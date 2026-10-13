// The activities in the studio's room (lab-engine-plan M10) against the classic host's recordings
// (tests/fixtures/sessions/activity-*.json): each activity is added to a lab deck as the lab adds it (its
// design, designs/engage), the room's show is read from that deck (showFromDeck), and the recorded relay frames
// and the recorder's presses are played to the lab host. Every frame it sends must be classic's, normalised as
// in live-replay.test.ts (ids by first use, `report` dropped, a repeated `at` or `question` folded).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { showFromDeck } from '../src/live';
import { optionsFor, type ActivityEntry } from '../src/designs/engage';
import { LAYOUT_STYLES } from '../src/layouts';
import { assertSame, load, replayShow } from './replay-kit';

const catalogue = (JSON.parse(readFileSync(resolve(process.cwd(), 'src/assets/activities.json'), 'utf8')) as { activities: ActivityEntry[] }).activities;
export const activityDeck = (key: string, look: 'lab' | 'slideforge' = 'lab') => {
  const entry = catalogue.find((a) => a.key === key)!;
  return optionsFor(entry).find((o) => o.id === look)!.make(LAYOUT_STYLES[0]);
};

const RECORDED = ['do-now-bell-ringer', 'exit-ticket', 'flipped-instruction', 'hook-and-predict', 'jigsaw-expert-groups', 'muddiest-point',
  'reflection-ladder', 'socratic-seminar', 'structured-reflection-protocol', 'think-pair-share', 'think-pair-square-share', 'word-splash'];

const replayOf = async (key: string, look: 'lab' | 'slideforge' = 'lab') => {
  const rec = load(`activity-${key}`);
  const hosted = rec.host.find((f) => f.dir === 'send' && f.data?.t === 'host')!.data as { title: string };
  return replayShow(rec, showFromDeck({ title: hosted.title, slides: activityDeck(key, look) }));
};

for (const key of RECORDED) {
  test(`${key}: the lab host sends what classic sent, frame for frame`, async () => {
    const { lab, classic } = await replayOf(key);
    assertSame(lab, classic);
  });
}

test('the same routine in SlideForge\'s look (the track) runs the same room', async () => {
  for (const key of ['think-pair-share', 'socratic-seminar']) {
    const { lab, classic } = await replayOf(key, 'slideforge');
    assertSame(lab, classic);
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
