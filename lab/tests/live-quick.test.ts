// The teacher's quick poll in the studio's room (live/quick.ts): fast, no browser.
//  - the host against the classic recording (tests/fixtures/sessions/feedback-quick-poll.json): a quick poll and a quick word
//    cloud asked over a plain lesson and ended by the teacher send the frames classic sent (normalised as live-replay.test.ts);
//  - the presets and guards classic's sheet has, and the wall: the quick poll takes it until it is closed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QUICK_PRESETS, emptyRoom, quickFields, quickProblem, type RoomShow, type RoomSlide } from '../src/live';
import { wallOf } from '../src/show/wallModel';
import { load, replayShow, type Rec } from './replay-kit';

/** The recorded lesson as the room's steps: its two plain slides, as the host landed on them. */
function plainShow(rec: Rec): RoomShow {
  const sent = rec.host.filter((f) => f.dir === 'send').map((f) => f.data!);
  const slides: RoomSlide[] = [];
  for (const a of sent.filter((m) => m.t === 'at')) {
    if (slides.some((s) => s.id === a.slideId)) continue;
    slides.push({ id: String(a.slideId), title: String(a.title), text: String(a.text), activity: 'content', style: String(a.style) });
  }
  return { title: String(sent.find((m) => m.t === 'host')!.title), slides };
}

test('a quick poll and a quick word cloud send what the classic host sent: prompt, promptEnd, over a plain lesson', async () => {
  const rec = load('feedback-quick-poll');
  const ids: (string | null)[] = [];
  const { classic, lab, host } = await replayShow(rec, plainShow(rec), (s, h) => {
    if (s.what === 'quick poll start') ids.push(h.quickPoll({ kind: 'poll', prompt: 'Another example, or move on?', options: ['Another example', 'Move on'] }));
    else if (s.what === 'quick word cloud start') ids.push(h.quickPoll({ kind: 'wordcloud', prompt: 'One word for that example', presentAs: 'rail' }));
    else if (s.what === 'quick poll end' || s.what === 'quick word cloud end') { assert.ok(h.state.quick); h.closeFeedback(); assert.equal(h.state.quick, null); }
  });
  assert.deepEqual(lab, classic);
  assert.equal(ids.filter(Boolean).length, 2);
  assert.equal(host.state.feedback, null);
  assert.deepEqual(lab.filter((f) => f.t === 'prompt').map((f) => [f.kind, f.presentAs]), [['poll', 'focus'], ['wordcloud', 'rail']]);
});

test('the presets are classic\'s, and the guards are its sheet\'s', () => {
  assert.deepEqual(QUICK_PRESETS.map((p) => p.key), ['yesno', 'truefalse', 'abcd', 'scale', 'cloud']);
  assert.match(quickProblem({ kind: 'poll', prompt: ' ', options: ['A', 'B'] }), /Write the question/);
  assert.match(quickProblem({ kind: 'poll', prompt: 'Q', options: ['A', ' '] }), /two answers/);
  assert.equal(quickProblem({ kind: 'wordcloud', prompt: 'Q' }), '');
  assert.equal(quickFields({ kind: 'poll', prompt: 'Q', options: ['A'] }), null);
  // A scale: five points with classic's ends; a word cloud: one word each, no options.
  const scale = quickFields({ kind: 'scale', prompt: 'How confident do you feel?', options: ['ignored'] })!;
  assert.deepEqual([scale.options, scale.ends, scale.max, scale.presentAs, scale.custom], [['1', '2', '3', '4', '5'], { low: 'Not at all', high: 'Completely' }, 1, 'focus', true]);
  const abcd = quickFields({ kind: 'poll', prompt: 'Which?', options: ['A', 'B', 'C', 'D'], presentAs: 'rail' })!;
  assert.deepEqual([abcd.options, abcd.ends, abcd.presentAs], [['A', 'B', 'C', 'D'], null, 'rail']);
});

test('the wall: a quick poll takes it over a plain slide until it is closed', () => {
  const steps = [{ room: { id: 's1', title: 'One', text: '', activity: 'content', style: 'points' } }] as unknown as Parameters<typeof wallOf>[0]['steps'];
  const prompt = { id: 'quick:1', ...quickFields({ kind: 'poll', prompt: 'Q', options: ['Yes', 'No'] })! };
  const room = { ...emptyRoom(), live: true, pin: '123456', phase: 'idle' as const, feedback: { prompt, shown: false, answered: 0, players: 0, digest: null } };
  assert.equal(wallOf({ room, steps, at: 0, scoresOn: false, fallbackJoin: '' }).view, 'slide', 'a prompt not the quick poll is not on a plain slide');
  const wall = wallOf({ room: { ...room, quick: 'quick:1' }, steps, at: 0, scoresOn: false, fallbackJoin: '' });
  assert.equal(wall.view, 'feedback');
  assert.equal(wall.feedback?.presentAs, 'focus');
  assert.equal(wall.feedback?.prompt, 'Q');
});
