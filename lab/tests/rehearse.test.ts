// Rehearse (lab-engine-plan M11b): the simulated class's answer model, and its phones against a fake relay (join by PIN, a teams
// room's team pick, answers by input kind, confidence, feedback replies, leaving). Fast, no browser, no relay.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { answerDelay, answerFor, pickNames, profiles, replyFor, seeded, SimulatedClass, type Profile } from '../src/rehearse';
import type { RoomQuiz, RoomShow, SocketLike } from '../src/live';

const quiz = (extra: Record<string, unknown> = {}) => ({ id: 'q1', question: 'Q?', options: ['a', 'b', 'c'], correct: 1, explanation: '', timeLimit: 20, points: 1000, style: 'choice', input: 'choice', gameId: 'g', ...extra }) as unknown as RoomQuiz;
const sure: Profile = { name: 'Sure', skill: 1, slow: 0, keen: 1 };
const lost: Profile = { name: 'Lost', skill: 0, slow: 1, keen: 1 };

test('a class has the size asked, distinct names, and skills that average about two thirds', () => {
  const ps = profiles(24, seeded(7));
  assert.equal(ps.length, 24);
  assert.equal(new Set(ps.map((p) => p.name)).size, 24);
  const mean = ps.reduce((n, p) => n + p.skill, 0) / ps.length;
  assert.ok(mean > 0.5 && mean < 0.8, String(mean));
  assert.equal(new Set(pickNames(60, seeded(1))).size, 60); // past forty, initials keep names apart
});

test('a choice answer is right by skill; a wrong one is never the right option and leans to one lure', () => {
  const rng = seeded(3);
  assert.deepEqual(answerFor(quiz(), { id: 'q1' }, sure, rng), { t: 'answer', choice: 1 });
  const wrong = Array.from({ length: 60 }, () => answerFor(quiz(), { id: 'q1' }, lost, rng)) as { choice: number }[];
  assert.ok(wrong.every((a) => a.choice !== 1));
  assert.ok(wrong.filter((a) => a.choice === 2).length > 30); // the lure is the option after the right one
  const none = answerFor(quiz(), { id: 'q1' }, { ...sure, keen: 0 }, () => 0.99);
  assert.equal(none, null);
});

test('a typed answer is the accepted spelling when right; a slider answer lands within the tolerance when right and outside it when not', () => {
  const t = answerFor(quiz({ style: 'type', input: 'text', options: [], correct: -1, answer: 'Argon', accept: ['Argon', 'argon gas'] }), { id: 'q1', input: 'text' }, sure, seeded(2));
  assert.deepEqual(t, { t: 'answer', text: 'Argon' });
  const s = quiz({ style: 'slider', input: 'number', options: [], min: 0, max: 100, step: 1, target: 50, tolerance: 5 });
  const frame = { id: 'q1', input: 'number', range: { min: 0, max: 100, step: 1 } };
  const rng = seeded(9);
  for (let i = 0; i < 30; i++) {
    const r = answerFor(s, frame, sure, rng) as { value: number }, w = answerFor(s, frame, lost, rng) as { value: number };
    assert.ok(Math.abs(r.value - 50) <= 5, `right ${r.value}`);
    assert.ok(Math.abs(w.value - 50) > 5, `wrong ${w.value}`);
    assert.ok(w.value >= 0 && w.value <= 100);
  }
});

test('answers arrive between 0.7 s and the question\'s time; the slow come later; no limit is up to nine seconds', () => {
  const rng = seeded(4);
  for (const p of [sure, lost]) for (let i = 0; i < 20; i++) { const d = answerDelay(p, { timeLimit: 20 }, rng); assert.ok(d >= 700 && d <= 15000, String(d)); }
  assert.ok(answerDelay(lost, { timeLimit: 0 }, () => 0.5) > answerDelay(sure, { timeLimit: 0 }, () => 0.5));
  assert.ok(answerDelay(lost, { timeLimit: 0 }, () => 1) <= 9000);
});

test('feedback replies: a choice for a poll or scale, words for a cloud or brainstorm', () => {
  const rng = seeded(5);
  const poll = replyFor({ kind: 'poll', options: ['a', 'b'] }, sure, rng) as { choice: number };
  assert.ok(poll.choice === 0 || poll.choice === 1);
  const scale = replyFor({ kind: 'scale', options: ['1', '2', '3', '4', '5'] }, sure, rng) as { choice: number };
  assert.ok(scale.choice >= 0 && scale.choice < 5);
  assert.equal(typeof (replyFor({ kind: 'wordcloud', options: [] }, sure, rng) as { text: string }).text, 'string');
  assert.equal(replyFor({ kind: 'brainstorm', options: [] }, { ...sure, keen: 0 }, () => 0.99), null);
});

class Phone implements SocketLike {
  readyState = 0;
  sent: Record<string, unknown>[] = [];
  closed = false;
  private fns: Record<string, ((ev: { data?: unknown }) => void)[]> = {};
  constructor() { queueMicrotask(() => { this.readyState = 1; this.fire('open'); }); }
  addEventListener(type: string, fn: (ev: { data?: unknown }) => void) { (this.fns[type] ??= []).push(fn); }
  send(data: string) { this.sent.push(JSON.parse(data) as Record<string, unknown>); }
  close() { this.closed = true; this.readyState = 3; this.fire('close'); }
  feed(m: unknown) { this.fire('message', { data: JSON.stringify(m) }); }
  private fire(type: string, ev: { data?: unknown } = {}) { for (const f of this.fns[type] ?? []) f(ev); }
}
const wait = (ms = 15) => new Promise((r) => setTimeout(r, ms));

test('the class joins by PIN, picks teams when the room asks, answers a question once, says how sure, replies to a prompt, and leaves', async () => {
  const show: RoomShow = { title: 'T', slides: [{ id: 'q1', title: 'Q', text: '', activity: 'question', style: 'choice', quiz: quiz() }] };
  const socks: Phone[] = [];
  const cls = new SimulatedClass({ url: 'ws://x', pin: '123456', show, size: 4, makeSocket: () => { const p = new Phone(); socks.push(p); return p; }, rng: seeded(11), pace: 0, joinGapMs: 0 });
  cls.start();
  await wait();
  assert.equal(socks.length, 4);
  assert.deepEqual(socks.map((s) => s.sent[0].t), ['join', 'join', 'join', 'join']);
  assert.ok(socks.every((s) => s.sent[0].pin === '123456' && typeof s.sent[0].name === 'string'));
  // A teams room names its teams and wants one chosen.
  socks.forEach((s) => s.feed({ t: 'error', message: 'Pick a team.', mode: 'teams', teams: ['Owls', 'Foxes'] }));
  assert.deepEqual(socks.map((s) => s.sent[1].team), [0, 1, 0, 1]);
  socks.forEach((s) => s.feed({ t: 'joined', resumeToken: 'tok', name: 'x', phase: 'lobby' }));
  assert.equal(cls.joined, 4);
  const ask = { t: 'question', id: 'q1', n: 1, total: 1, input: 'choice', options: ['a', 'b', 'c'], timeLimit: 20, confidence: true };
  socks.forEach((s) => { s.feed(ask); s.feed(ask); });
  await wait();
  const answers = socks.flatMap((s) => s.sent.filter((m) => m.t === 'answer'));
  assert.ok(answers.length >= 3 && answers.length <= 4, String(answers.length)); // a keen class: at most one each, a stray one sits out
  assert.ok(answers.every((a) => Number.isInteger(a.choice)));
  socks.forEach((s) => s.feed({ t: 'locked' }));
  await wait();
  assert.ok(socks.some((s) => s.sent.some((m) => m.t === 'sure')));
  socks.forEach((s) => s.feed({ t: 'prompt', id: 'p1', kind: 'poll', options: ['x', 'y'] }));
  await wait();
  assert.ok(socks.some((s) => s.sent.some((m) => m.t === 'reply' && Number.isInteger(m.choice))));
  assert.ok(cls.answers >= 4);
  cls.stop();
  assert.ok(socks.every((s) => s.closed));
});
