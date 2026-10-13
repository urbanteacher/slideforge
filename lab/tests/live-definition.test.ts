// Definition challenge in the studio's room (lab-engine-plan M8): fast, no browser, no relay. The wire against the classic
// recording is in live-replay.test.ts; here what it cannot see: the question compiled from the author's passage, the lab's
// three slides of one question as one step (reading, the recall slide, the answer), the reading phase held by the host (the
// question is not asked until Next or the reading clock), and the typed marking and wall.
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import type { Slide } from '../src/core';
import { LiveHost, showFromDeck, styleForFormat, styleOf, type HostMessage, type SocketLike } from '../src/live';
import { canHostInStudio } from '../src/show/canHost';
import { shownDeck, slideFor, stepsOf } from '../src/show/steps';

const slide = (id: string, name: string, game?: Slide['game']) =>
  ({ id, name, background: '', layers: [], transition: { type: 'none', duration: 0 }, notes: '', game }) as unknown as Slide;
// The author's question: a passage, the recall question, the accepted answers. The room compiles it as SlideForge does.
const quiz = { type: 'quiz', style: 'definition', input: 'text', points: 1, question: 'What is not used up?', passage: 'A catalyst is not consumed.', accept: ['the catalyst', 'catalyst', ''], explanation: 'Not consumed.' };
const g = (role: string, extra: object = {}, seconds = 20) => ({ id: 'g', format: 'definition-challenge', label: 'Definition challenge', role, settings: { seconds }, ...extra }) as never;
// The lab draws a question as its reading, its recall, and its answer.
const deck = { title: 'Define', slides: [
  slide('c', 'Cover', g('cover')),
  slide('read', 'Read', g('question', { key: '0', quiz })),
  slide('ask', 'Ask', g('question', { key: '0', quiz })),
  slide('say', 'Said', g('answer', { key: '0' })),
] };

test('the registry takes Definition challenge by format; the room hosts it; the three slides are one step', () => {
  assert.equal(styleForFormat('definition-challenge')?.key, 'definition');
  assert.equal(styleOf({ style: 'definition', input: 'text' })?.key, 'definition');
  assert.deepEqual(canHostInStudio(deck), { ok: true, reason: '' });
  const show = showFromDeck(deck);
  assert.deepEqual(show.slides.map((s) => s.id), ['c', 'read', 'g:scores']);
  const q = show.slides[1].quiz!;
  assert.equal(q.answer, 'the catalyst');
  assert.deepEqual(q.accept, ['the catalyst', 'catalyst'], 'the blank spelling is dropped');
  assert.equal(q.correct, -1);
  const { steps } = stepsOf(shownDeck(deck));
  const step = steps[1];
  assert.deepEqual([slideFor(step, false), slideFor(step, false, true), slideFor(step, true, true)], [1, 2, 3], 'reading, then the recall slide once asked, then the answer');
});

test('marks and the reveal are the typed ones; the phones are told to watch while the passage is read, then to recall', () => {
  const style = styleForFormat('definition-challenge')!;
  const q = showFromDeck(deck).slides[1].quiz!;
  assert.equal(style.mark(q, 'The Catalyst'), true);
  assert.equal(style.mark(q, 'enzyme'), false);
  assert.deepEqual(style.reveal(q), { correct: -1, answer: 'the catalyst' });
  assert.equal(style.companion!(q, 'reading').role, 'watch');
  assert.deepEqual(style.companion!(q, 'asking'), { role: 'wait', participation: '', headPrompt: 'Recall from memory' });
  assert.equal(style.reading!(q), 20);
  assert.equal(style.reading!({ ...q, timeLimit: 0 }), 30, 'no time set: thirty seconds');
  assert.equal(style.reading!({ ...q, timeLimit: 33 }), 30, 'only 20, 30, 45 or 60');
  assert.deepEqual(style.manual({ text: 'catalyst' }), 'catalyst');
});

class Fake implements SocketLike {
  readyState = 0;
  sent: HostMessage[] = [];
  private fns: Record<string, ((ev: { data?: unknown }) => void)[]> = {};
  constructor() { queueMicrotask(() => { this.readyState = 1; this.fire('open'); }); }
  addEventListener(type: string, fn: (ev: { data?: unknown }) => void) { (this.fns[type] ??= []).push(fn); }
  send(data: string) { this.sent.push(JSON.parse(data) as HostMessage); }
  close() { this.readyState = 3; }
  private fire(type: string) { for (const f of this.fns[type] ?? []) f({}); }
}

test('the host holds the question through the reading: Next asks it, and so does the reading clock', async () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    for (const how of ['next', 'clock'] as const) {
      const sock = new Fake();
      const host = new LiveHost({ url: 'ws://x', show: showFromDeck(deck), makeSocket: () => sock });
      void host.start();
      await new Promise((r) => queueMicrotask(() => r(null)));
      const types = () => sock.sent.map((m) => m.t);
      host.begin(); // the cover
      host.next(); // the reading
      assert.ok(types().includes('idle'), 'the phones are idle');
      assert.ok(!types().includes('question'), 'nothing is asked while the passage is read');
      const idle = sock.sent.filter((m) => m.t === 'idle').pop() as Extract<HostMessage, { t: 'idle' }>;
      assert.equal(idle.role, 'watch');
      assert.equal(host.reading(), true);
      if (how === 'next') host.next();
      else mock.timers.tick(20_000);
      const q = sock.sent.filter((m) => m.t === 'question');
      assert.equal(q.length, 1, `asked once, by ${how}`);
      assert.equal((q[0] as { headPrompt?: string }).headPrompt, 'Recall from memory');
      assert.equal(host.reading(), false);
      mock.timers.tick(60_000);
      assert.equal(sock.sent.filter((m) => m.t === 'question').length, 1, 'the clock does not ask twice');
      const ended = host.end();
      mock.timers.tick(2000);
      await ended;
    }
  } finally { mock.timers.reset(); }
});
