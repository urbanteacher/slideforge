// The activities in the studio's room (lab-engine-plan M10), beyond the recordings (live-replay-activities.test.ts):
// every catalogue activity has a kind, the Activity panel's times and jobs reach the phones, the stage clock's +30s,
// one idea box per send stage, the note count, help in a work stage, spotlights,
// the wall's model, and canHostInStudio.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LiveHost, activityOf, showFromDeck, type HostMessage } from '../src/live';
import { canHostInStudio } from '../src/show/canHost';
import { activityWallOf, stageClock } from '../src/show/activityWall';
import type { Slide } from '../src/core';
import { Recorded, activityCatalogue as catalogue, activityDeck } from './replay-kit';

test('every activity that is not a game has a kind the room runs; a game made from one is its game', () => {
  const kinds: Record<string, number> = {};
  // A game's slides are drawn by measuring text (a canvas), so they are not made here: canHostInStudio's test below covers one.
  for (const a of catalogue.filter((x) => !x.game)) {
    for (const s of activityDeck(a.key)) {
      const act = activityOf(s);
      assert.ok(act, `${a.key} page ${s.activity?.page} runs`);
      kinds[act.kind] = (kinds[act.kind] ?? 0) + 1;
    }
  }
  assert.deepEqual(kinds, { stages: 16, collect: 9, moment: 22 });
});

const hostFor = (slides: Slide[]) => {
  const sock = new Recorded();
  const clock = { ms: 1000 };
  const host = new LiveHost({ url: 'ws://t', show: showFromDeck({ title: 'T', slides }), makeSocket: () => sock, now: () => clock.ms });
  host.start();
  return { host, sock, clock, sent: () => sock.sent as (HostMessage & Record<string, unknown>)[] };
};
const open = async (h: ReturnType<typeof hostFor>) => {
  await new Promise((r) => setTimeout(r, 0));
  h.sock.feed({ t: 'hosted', session: { id: 's', title: 't', createdAt: 0 }, hostToken: 'h', pin: '123456', joinUrl: 'http://x/join.html', mode: 'individual', teams: [] });
  h.host.begin();
};
const stageOf = (m: unknown) => (m as { stage: { name: string; job: string; seconds: number; left: number } | null }).stage;

test('the Activity panel\'s minutes and job reach the phones, and the row says the new time', () => {
  const slides = activityDeck('think-pair-share');
  slides[0].activity!.settings!.stages![1] = { name: 'Pair', minutes: 4, job: 'send' };
  const act = activityOf(slides[0])!;
  assert.deepEqual(act.stages.map((s) => `${s.name}:${s.job}:${s.seconds}`), ['Think:note:60', 'Pair:send:240', 'Share:send:180', 'Connect:down:60']);
  assert.match(act.text, /^Think · 1 min — .*\nPair · 4 min — Compare sketches/);
});

test('a routine: Next walks the stages, the clock gets +30s and the box opens per send stage', async () => {
  const h = hostFor(activityDeck('plus-minus-interesting'));
  await open(h);
  assert.equal(stageOf(h.sent().at(-2)), null, 'the introduction');
  h.host.next();
  assert.deepEqual(stageOf(h.sent().at(-1)), { i: 0, of: 4, name: 'Plus', job: 'send', group: false, text: 'What worked well?', brief: '', seconds: 120, left: 120, next: 'Minus' });
  const boxes = () => h.sent().filter((m) => m.t === 'prompt');
  assert.deepEqual(boxes().map((m) => m.stage), ['Plus']);
  h.clock.ms += 100_000;
  assert.equal(h.host.extendStage(30), true);
  assert.deepEqual([stageOf(h.sent().at(-1))!.seconds, stageOf(h.sent().at(-1))!.left], [150, 50]);
  h.clock.ms += 60_000; // time up: +30s starts again from now with the extra only
  h.host.extendStage(30);
  assert.deepEqual([stageOf(h.sent().at(-1))!.seconds, stageOf(h.sent().at(-1))!.left], [30, 30]);
  h.host.next();
  assert.deepEqual(boxes().map((m) => m.stage), ['Plus', 'Minus'], 'a box of its own');
  assert.ok(h.sent().findIndex((m) => m.t === 'promptEnd') > h.sent().findIndex((m) => m.t === 'prompt'));
  h.host.next();
  h.host.next(); // Look back: the box closes
  assert.equal(h.sent().at(-2)!.t, 'promptEnd');
  assert.equal(h.host.stageNext(), false, 'no stage to come');
});

test('the note count, help in a work stage, and the spotlight', async () => {
  const h = hostFor([...activityDeck('think-pair-share'), ...activityDeck('i-do-we-do-you-do')]);
  await open(h);
  h.host.next(); // Think
  const id = h.host.slide!.id;
  h.sock.feed({ t: 'wrote', slideId: id, stage: 0, n: 2, of: 3 });
  assert.deepEqual(h.host.state.activity!.written, { n: 2, of: 3 });
  assert.equal(activityWallOf(h.host.state.activity!, null).written, '2 of 3 have written something');
  h.host.next(); h.host.next(); // Share: its box
  const box = h.host.state.activity!.box!;
  h.sock.feed({ t: 'responses', id: box, answered: 2, players: 3, kind: 'brainstorm', items: [{ name: 'Cy', pid: 3, text: 'Link it', seq: 30 }, { name: 'Ada', pid: 1, text: 'Test small', seq: 10 }], total: 2 });
  const wall = activityWallOf(h.host.state.activity!, h.host.state.feedback);
  assert.deepEqual(wall.ideas, [{ key: '30', text: 'Link it', spot: false }, { key: '10', text: 'Test small', spot: false }], 'no names on the wall');
  assert.equal(h.host.spotlight('10'), true);
  assert.deepEqual(h.host.state.activity!.spotlights.map((s) => [s.label, s.text]), [['Share', 'Test small']]);
  h.host.next(); // Connect: the spotlight stays up for the rest of the slide
  assert.equal(h.host.state.activity!.spotlights.length, 1);
  h.host.next(); // the next activity: I do, We do, You do
  assert.equal(h.host.state.activity!.spotlights.length, 0);
  for (let i = 0; i < 4; i++) h.host.next();
  assert.equal(h.host.state.activity!.stage!.job, 'work');
  h.sock.feed({ t: 'signals', counts: { lost: 2, fast: 0, slow: 0 }, live: 2, of: 3, kind: 'lost', spike: true });
  assert.equal(activityWallOf(h.host.state.activity!, null).help, 2);
});

test('the wall: the track, the introduction, the clock and its cue at time up', () => {
  const v = { slideId: 's', stages: [{ name: 'Think', job: 'note' as const, group: false, seconds: 60 }, { name: 'Pair', job: 'talk' as const, group: false, seconds: 90 }], brief: 'The question', stage: null, endsAt: null, written: null, help: 0, spotlights: [], box: null };
  const intro = activityWallOf(v, null);
  assert.equal(intro.intro, '2 stages · 2.5 min · First: Think');
  assert.equal(intro.brief, 'The question');
  const on = activityWallOf({ ...v, stage: { i: 0, of: 2, name: 'Think', job: 'note', group: false, text: 'Sketch', brief: '', seconds: 60, left: 60, next: 'Pair' }, endsAt: 61_000 }, null);
  assert.deepEqual(on.track.map((t) => [t.name, t.time, t.on]), [['Think', '1 min', true], ['Pair', '1.5 min', false]]);
  assert.equal(on.stage!.wall, 'Silent thinking');
  assert.deepEqual(stageClock(on, 1_000), { left: 60, face: '1:00', over: false, note: '' });
  assert.equal(stageClock(on, 70_000)!.note, 'Time. Next: Pair');
});

test('canHostInStudio: a lesson of activities is the studio\'s; a game made from one goes by its game', () => {
  assert.deepEqual(canHostInStudio({ slides: activityDeck('think-pair-share') }), { ok: true, reason: '' });
  assert.deepEqual(canHostInStudio({ slides: activityDeck('do-now-bell-ringer') }), { ok: true, reason: '' });
  const quiz = { type: 'quiz', style: 'choice', input: 'choice', question: 'Q?', options: ['A', 'B'], correct: 0 };
  const g = { id: 'q', name: 'Q', background: '', layers: [], transition: { type: 'none', duration: 0 }, notes: '', activity: { key: 'multiple-choice-quiz', page: 1 }, game: { id: 'g1', format: 'choice', label: 'Quiz', role: 'question', key: '0', quiz, settings: {} } } as unknown as Slide;
  assert.deepEqual(canHostInStudio({ slides: [g] }), { ok: true, reason: '' });
  assert.match(canHostInStudio({ slides: [{ ...g, game: undefined } as Slide] }).reason, /a game without its game/);
});
