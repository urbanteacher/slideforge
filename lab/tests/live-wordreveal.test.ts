// Word reveal in the studio's room (lab-engine-plan M8): fast, no browser, no relay. The wire against the classic recording is in
// live-replay.test.ts; here what the replay cannot see: the drip, which runs on the host's clock (a few letters open at the start,
// one more at each interval, stopped by the reveal and by leaving the question), the points by the letters showing when each
// answer reached the relay, and the wall's view of the word.
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import type { Slide } from '../src/core';
import { emptyRoom, LiveHost, showFromDeck, styleFor, styleForFormat, type HostMessage, type RoomState, type SocketLike } from '../src/live';
import { canHostInStudio } from '../src/show/canHost';
import { shownDeck, stepsOf } from '../src/show/steps';
import { wallOf } from '../src/show/wallModel';

const slide = (id: string, name: string, game?: Slide['game']) =>
  ({ id, name, background: '', layers: [], transition: { type: 'none', duration: 0 }, notes: '', game }) as unknown as Slide;
const word = (extra: object = {}) => ({ type: 'quiz', style: 'wordreveal', input: 'text', question: 'What process is this?', word: 'PHOTOSYNTHESIS', hint: 'How plants make food', accept: ['photosynthesis'], answer: 'photosynthesis', difficulty: 'medium', dripInterval: 5, correct: -1, points: 0, confidence: false, explanation: '', ...extra });
const deck = (quiz: object = word(), settings: object = {}) => ({ title: 'Word', slides: [
  slide('c', 'Cover', { id: 'g', format: 'word-reveal', label: 'Word reveal', role: 'cover', settings: {} } as never),
  slide('q0', 'Q0', { id: 'g', format: 'word-reveal', label: 'Word reveal', role: 'question', key: '0', settings, quiz } as never),
  slide('q1', 'Q1', { id: 'g', format: 'word-reveal', label: 'Word reveal', role: 'question', key: '1', settings: {}, quiz: word({ word: 'ELECTRON', accept: ['electron'], answer: 'electron', difficulty: 'hard', dripInterval: 3 }) } as never),
] });

test('the registry takes Word reveal by format; the room hosts it; its question is compiled with the drip it was given', () => {
  assert.equal(styleForFormat('word-reveal')?.key, 'wordreveal');
  assert.deepEqual(canHostInStudio(deck()), { ok: true, reason: '' });
  const show = showFromDeck(deck());
  assert.equal(show.mechanic, 'wordreveal');
  const q = show.slides.find((s) => s.quiz)!.quiz!;
  assert.deepEqual([q.input, q.correct, q.options, q.preReveal, q.hideAnswerUntilReveal], ['text', -1, [], 0.4, true]);
  // The Game panel's difficulty is the question's: a hard word starts with nothing showing.
  const hard = showFromDeck(deck(word(), { difficulty: 'hard' })).slides.find((s) => s.quiz)!.quiz!;
  assert.deepEqual([hard.difficulty, hard.preReveal], ['hard', 0]);
  assert.deepEqual(styleFor(q).drip!(q), { word: 'PHOTOSYNTHESIS', hint: 'How plants make food', total: 14, start: 6, everyMs: 5000 });
  assert.deepEqual(styleFor(hard).drip!(hard), { word: 'PHOTOSYNTHESIS', hint: 'How plants make food', total: 14, start: 0, everyMs: 5000 });
});

test('points by the letters showing when the answer arrived: under half 100, under three quarters 75, then 50; wrong 0', () => {
  const q = showFromDeck(deck()).slides.find((s) => s.quiz)!.quiz!; // 14 letters, 6 showing, one more each 5 s
  const style = styleFor(q);
  const at = (id: number, response: string, elapsedMs: number) => ({ id, response, elapsedMs });
  assert.deepEqual(style.gains!(q, [at(1, 'Photosynthesis', 0), at(2, 'photosynthesis', 16000), at(3, 'photosynthesis', 40000), at(4, 'respiration', 0)]), [[1, 100], [2, 75], [3, 50], [4, 0]]);
  // An answer with no time of its own is scored by what the host's wall shows.
  assert.deepEqual(style.gains!(q, [{ id: 1, response: 'photosynthesis' }], { dripShown: 12 }), [[1, 50]]);
  assert.equal(style.mark(q, 'photosynthesis'), true);
  assert.equal(style.mark(q, 'photosynthesis '), true);
  assert.equal(style.mark(q, 'photosynthesys'), true, 'a near spelling counts: the question allows typos');
  assert.deepEqual(style.reveal(q), { correct: -1, answer: 'photosynthesis' });
});

/** A socket that is open at once, records what it is sent, and hands over what the test feeds it. */
class Fake implements SocketLike {
  readyState = 0;
  sent: HostMessage[] = [];
  private fns: Record<string, ((ev: { data?: unknown }) => void)[]> = {};
  constructor() { queueMicrotask(() => { this.readyState = 1; this.fire('open'); }); }
  addEventListener(type: string, fn: (ev: { data?: unknown }) => void) { (this.fns[type] ??= []).push(fn); }
  send(data: string) { this.sent.push(JSON.parse(data) as HostMessage); }
  close() { this.readyState = 3; this.fire('close'); }
  feed(m: unknown) { this.fire('message', JSON.stringify(m)); }
  private fire(type: string, data?: unknown) { for (const f of this.fns[type] ?? []) f({ data }); }
}

test('the drip runs on the host\'s clock: the opening letters, one more at each interval, stopped by the reveal; the next word starts again', async () => {
  mock.timers.enable({ apis: ['setInterval'] });
  try {
    const sock = new Fake();
    const host = new LiveHost({ url: 'ws://fake', show: showFromDeck(deck()), makeSocket: () => sock });
    host.start();
    await new Promise((r) => setTimeout(r, 0));
    sock.feed({ t: 'hosted', session: { id: 's', title: 'Word', createdAt: 0 }, hostToken: 'h', pin: '123456', joinUrl: 'http://x/join.html', mode: 'individual', teams: [] });
    host.begin();
    assert.equal(host.state.mech.drip, null, 'nothing drips on the cover');
    host.next(); // the first word
    const d0 = host.state.mech.drip!;
    assert.deepEqual([d0.mask, d0.shown, d0.total, d0.hint], ['PHOTOS' + '_'.repeat(8), 6, 14, 'How plants make food']);
    mock.timers.tick(4999);
    assert.equal(host.state.mech.drip!.shown, 6);
    mock.timers.tick(1);
    assert.deepEqual([host.state.mech.drip!.mask, host.state.mech.drip!.shown], ['PHOTOSY' + '_'.repeat(7), 7]);
    mock.timers.tick(5000 * 20);
    assert.equal(host.state.mech.drip!.shown, 14, 'it stops at the whole word');
    assert.equal(host.state.mech.drip!.mask, 'PHOTOSYNTHESIS');
    // The reveal ends the drip: no letter after it.
    host.reveal([{ id: 1, name: 'A', team: null, response: 'x', sure: null, elapsedMs: 1 }], 1);
    const sent = sock.sent.filter((m) => m.t === 'reveal');
    assert.equal(sent.length, 1);
    host.next(); // the second word: a hard one, nothing showing, one letter every 3 s
    const d1 = host.state.mech.drip!;
    assert.deepEqual([d1.mask, d1.shown, d1.total], ['________', 0, 8]);
    mock.timers.tick(3000);
    assert.equal(host.state.mech.drip!.mask, 'E_______');
    host.goTo(0);
    assert.equal(host.state.mech.drip, null, 'leaving the question stops its word');
    mock.timers.tick(60000);
    assert.equal(host.state.mech.drip, null);
  } finally { mock.timers.reset(); }
});

const room = (over: Partial<RoomState> = {}): RoomState => ({
  ...emptyRoom(), connected: true, live: true, pin: '123456', joinUrl: 'http://10.0.0.5:8787/join.html', phase: 'question', question: { id: 'q0', slideId: 'q0', options: [], timeLimit: 0 },
  players: [1, 2].map((id) => ({ id, name: `P${id}`, score: 0, connected: true, away: false, manual: false, team: null })), ...over,
});

test('wall: the word is on it while the question is asked, and not once it is revealed (the answer slide says it)', () => {
  const { steps } = stepsOf(shownDeck({ ...deck(), width: 1920, height: 1080 } as never));
  const at = steps.findIndex((s) => s.room.id === 'q0');
  const drip = { id: 'q0', word: 'PHOTOSYNTHESIS', mask: 'PHOTOSY' + '_'.repeat(7), hint: 'How plants make food', shown: 7, total: 14 };
  const asked = wallOf({ steps, at, scoresOn: false, fallbackJoin: '', room: room({ mech: { race: null, boss: null, drip } }) });
  assert.equal(asked.view, 'question');
  assert.equal(asked.mech.drip?.mask, 'PHOTOSY' + '_'.repeat(7));
  assert.equal(asked.question!.detail.kind, 'typed');
  const stale = wallOf({ steps, at, scoresOn: false, fallbackJoin: '', room: room({ mech: { race: null, boss: null, drip: { ...drip, id: 'q1' } } }) });
  assert.equal(stale.mech.drip, null, 'another question\'s word is not this one\'s');
  const revealed = wallOf({ steps, at, scoresOn: false, fallbackJoin: '', room: room({ phase: 'revealed', revealed: ['q0'], mech: { race: null, boss: null, drip } }) });
  assert.equal(revealed.view, 'reveal');
  assert.equal(revealed.mech.drip, null);
});
