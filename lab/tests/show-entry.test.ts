// M7 slice 3: what the shell's Host live needs of the studio's show, as pure logic and against the real relay.
//  - canHostInStudio: which lessons the studio's room runs (plain Multiple choice and plain True or false), and why not otherwise;
//  - the question's clock and the standings rail's gains;
//  - the teacher-entry window's protocol (docs/games/protocol.md §15.1) served by the lab host, through the
//    real relay: add names, answer by key, a refusal shown, the tally entry, reveal, "the answer is C".
// The whole path in a browser is tools/smoke/studio-room.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { ChildProcess } from 'node:child_process';
import type { Slide } from '../src/core';
import { LiveHost, ManualBridge, showFromDeck, type ChannelLike, type RoomState } from '../src/live';
import { canHostInStudio } from '../src/show/canHost';
import { clockOf, timeUpIn } from '../src/show/clock';
import { railOf } from '../src/show/rail';
import { bindReports, keepReport } from '../src/show/reports';

const slide = (id: string, name: string, game?: Slide['game'], extra: Partial<Slide> = {}) =>
  ({ id, name, background: '', layers: [], transition: { type: 'none', duration: 0 }, notes: '', game, ...extra }) as unknown as Slide;
const game = (role: NonNullable<Slide['game']>['role'], extra: Partial<NonNullable<Slide['game']>> = {}) =>
  ({ id: 'gm1', format: 'choice', label: 'Air', role, settings: { seconds: 20 }, ...extra }) as NonNullable<Slide['game']>;
const quiz = (i: number) => ({ type: 'quiz', style: 'choice', input: 'choice', points: 1000, explanation: '', question: `Q${i}?`, options: ['A', 'B', 'C'], correct: 0 });
const tfQuiz = (i: number) => ({ type: 'quiz', style: 'truefalse', input: 'choice', points: 1000, explanation: '', question: `S${i}.`, options: ['True', 'False'], correct: i % 2 });

/** intro, then a True or false game (format 'truefalse', or 'true-false' for the Showdown) of two statements. */
function tfDeck(format = 'truefalse', extra: Slide[] = []) {
  const slides: Slide[] = [slide('intro', 'Intro'), slide('cover', 'Cover', game('cover', { id: 'gt1', format }))];
  for (let i = 0; i < 2; i++) slides.push(slide(`t${i}`, `Statement ${i + 1}`, game('question', { id: 'gt1', format, key: String(i), quiz: tfQuiz(i) })), slide(`ta${i}`, `Answer ${i + 1}`, game('answer', { id: 'gt1', format, key: String(i) })));
  return { title: 'Claims', slides: [...slides, ...extra] };
}

/** intro, then a Multiple choice game of two questions. */
function choiceDeck(extra: Slide[] = []) {
  const slides: Slide[] = [slide('intro', 'Intro'), slide('cover', 'Cover', game('cover'))];
  for (let i = 0; i < 2; i++) slides.push(slide(`q${i}`, `Question ${i + 1}`, game('question', { key: String(i), quiz: quiz(i) })), slide(`a${i}`, `Answer ${i + 1}`, game('answer', { key: String(i) })));
  return { title: 'Air', slides: [...slides, ...extra] };
}
const layer = (kind: string) => ({ id: 'l', kind, name: 'L', visible: true, locked: false, opacity: 1, blend: 'normal', params: {}, anim: {}, interact: {} }) as never;

test('canHostInStudio: a lesson of Multiple choice games is hosted in the studio', () => {
  assert.deepEqual(canHostInStudio(choiceDeck()), { ok: true, reason: '' });
});

test('canHostInStudio: anything the studio room cannot run sends the lesson to the classic host', () => {
  const no = (extra: Slide[]) => canHostInStudio(choiceDeck(extra));
  assert.match(no([slide('t', 'Tricky', game('question', { id: 'gm2', format: 'bingo', label: 'Order', key: '0' }))]).reason, /"Order" is bingo/);
  assert.match(no([slide('p', 'Poll', game('cover'), { feedback: { kind: 'poll', prompt: 'Ready?', options: ['Yes', 'No'] } })]).reason, /game slide that also asks the room for poll feedback/);
  assert.match(no([slide('a', 'Brainstorm', undefined, { activity: { key: 'think-pair-share', page: 0 } })]).reason, /is an activity/);
  assert.match(no([slide('f', 'Figure', undefined, { liveFigure: true })]).reason, /live figure/);
  assert.match(no([slide('c', 'Check', undefined, { layers: [layer('quiz')] })]).reason, /SlideForge check/);
  const tf = choiceDeck();
  tf.slides[2] = slide('q0', 'Q', game('question', { key: '0', quiz: { ...quiz(0), style: 'truefalse' } }));
  assert.match(canHostInStudio(tf).reason, /not Multiple choice/, 'a True or false question inside a Multiple choice game is not what either runs');
  assert.match(canHostInStudio({ slides: [slide('a', 'A'), slide('b', 'B')] }).reason, /no Multiple choice, True or false, Type answer, Slider(,| or) .* question/);
});

test('canHostInStudio: a plain True or false game is hosted in the studio; the Showdown and every other style is not', () => {
  assert.deepEqual(canHostInStudio(tfDeck()), { ok: true, reason: '' });
  // Multiple choice and True or false in one lesson: each is run by the room, so the lesson is.
  const mixed = choiceDeck(tfDeck().slides.slice(1));
  assert.deepEqual(canHostInStudio(mixed), { ok: true, reason: '' });
  // The Showdown (format 'true-false', split and switch) is the classic host's.
  assert.match(canHostInStudio(tfDeck('true-false')).reason, /"Air" is true-false, not Multiple choice, True or false/);
  assert.equal(canHostInStudio(choiceDeck(tfDeck('true-false').slides.slice(1))).ok, false, 'one Showdown sends the whole lesson to classic');
  // Each format's question must be its own style: a Multiple choice question in a True or false game is refused.
  const odd = tfDeck();
  odd.slides[2] = slide('t0', 'S', game('question', { id: 'gt1', format: 'truefalse', key: '0', quiz: quiz(0) }));
  assert.match(canHostInStudio(odd).reason, /has a question that is not True or false/);
  // A poll (M9) is run by the room too; one that is not complete asks nothing and is only shown.
  assert.equal(canHostInStudio(tfDeck('truefalse', [slide('p', 'Poll', undefined, { feedback: { kind: 'poll', prompt: 'Ready?', options: ['Yes', 'No'] } })])).ok, true);
  assert.equal(canHostInStudio(tfDeck('truefalse', [slide('p', 'Poll', undefined, { feedback: { kind: 'poll' } })])).ok, true);
});

test('canHostInStudio: hidden slides are not in the show, so they do not count', () => {
  assert.equal(canHostInStudio(choiceDeck([slide('h', 'Hidden poll', undefined, { feedback: { kind: 'poll' }, hidden: true })])).ok, true);
  const onlyHiddenQuestion = { slides: [slide('q', 'Q', game('question', { key: '0', quiz: quiz(0) }), { hidden: true })] };
  assert.equal(canHostInStudio(onlyHiddenQuestion).ok, false);
});

test('the clock counts down from when the question was asked, turns urgent at five seconds, and runs out', () => {
  assert.equal(clockOf(0, 0), null, 'no limit, no clock (the host sends 0 while the teacher enters answers)');
  assert.deepEqual(clockOf(20, 0), { left: 20, over: false, low: false });
  assert.deepEqual(clockOf(20, 1), { left: 20, over: false, low: false }, 'rounded up, as classic does');
  assert.deepEqual(clockOf(20, 15_001), { left: 5, over: false, low: true });
  assert.deepEqual(clockOf(20, 19_999), { left: 1, over: false, low: true });
  assert.deepEqual(clockOf(20, 20_000), { left: 0, over: true, low: false });
  assert.deepEqual(clockOf(20, 99_000), { left: 0, over: true, low: false });
  assert.equal(timeUpIn(20, 0), 20_000);
  assert.equal(timeUpIn(20, 8_000), 12_000);
  assert.equal(timeUpIn(20, 30_000), 0);
  assert.equal(timeUpIn(0, 0), null);
});

test('the rail: the leaders, what each gained on the question just revealed, and nothing for a lecture-sized room', () => {
  const row = (id: number, rank: number, name: string, score: number) => ({ id, rank, name, score, connected: true });
  const board = [row(1, 1, 'Ana', 1900), row(2, 2, 'Bo', 1000), row(3, 3, 'Cy', 0)];
  const before = { 1: 1000, 2: 1000, 3: 0 };
  const live = railOf({ board, before, revealed: false, join: { address: 'x.test', pin: '123456' } })!;
  assert.deepEqual(live.rows.map((r) => r.gained), [0, 0, 0], 'no gains before the reveal');
  const shown = railOf({ board, before, revealed: true, join: null })!;
  assert.deepEqual(shown.rows.map((r) => [r.name, r.gained]), [['Ana', 900], ['Bo', 0], ['Cy', 0]]);
  assert.equal(shown.subtitle, '3 players');
  const many = Array.from({ length: 12 }, (_, i) => row(i + 1, i + 1, `P${i}`, 100 - i));
  const big = railOf({ board: many, before: {}, revealed: false, join: null })!;
  assert.equal(big.rows.length, 8);
  assert.equal(big.more, 4);
  assert.equal(railOf({ board: Array.from({ length: 61 }, (_, i) => row(i, i + 1, `P${i}`, 0)), before: {}, revealed: false, join: null }), null);
});

test('reports: the session is handed to the shell once, with the relay\'s journal state and report; the end reloads it', () => {
  const calls: unknown[][] = [];
  const reports = { track: (s: unknown) => calls.push(['track', s]), recording: (ok: boolean) => calls.push(['recording', ok]), receive: (r: unknown) => calls.push(['receive', r]), refresh: (id: string) => calls.push(['refresh', id]), open: () => calls.push(['open']) };
  let fire: (s: Partial<RoomState>, cause: { t: string }) => void = () => {};
  const host = { subscribe: (fn: typeof fire) => { fire = fn; return () => {}; } } as unknown as LiveHost;
  const off = bindReports(host, reports);
  const session = { id: 'S1', token: 'tok', title: 'Air', createdAt: 1 };
  fire({ session }, { t: 'hosted' });
  fire({ session }, { t: 'players' });
  fire({ session, recording: true }, { t: 'recording' });
  fire({ session, report: { id: 'S1' } }, { t: 'sessionClosed' });
  assert.deepEqual(calls, [['track', session], ['recording', true], ['receive', { id: 'S1' }]]);
  off();
  // At the end the report is loaded again, unless the relay said it could not keep a journal.
  const later: string[] = [];
  keepReport({ ...reports, refresh: (id) => later.push(id) }, { session, recording: true } as RoomState);
  keepReport({ ...reports, refresh: (id) => later.push('no:' + id) }, { session, recording: false } as RoomState);
  return new Promise<void>((done) => setTimeout(() => { assert.deepEqual(later, ['S1']); done(); }, 400));
});

// ---- the teacher-entry window, against the real relay

interface Sock { send(m: unknown): void; next(t: string): Promise<Record<string, unknown>>; close(): Promise<void> }
const harness = createRequire(import.meta.url)(resolve(process.cwd(), '..', 'tests/harness.js')) as {
  freePort(): Promise<number>; start(port: number, dir: string): Promise<ChildProcess>; stop(c: ChildProcess, sig?: string): Promise<void>; connect(port: number): Promise<Sock>;
};
const within = <T>(p: Promise<T>, ms: number, what: string) => Promise.race([p, new Promise<never>((_, j) => setTimeout(() => j(new Error('timed out: ' + what)), ms))]);

test('manual.html\'s window protocol is served by the lab host: names, answers by key, a refusal, hand counts, reveal, "the answer is B"', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'sf-lab-entry-'));
  const port = await harness.freePort();
  assert.notEqual(port, 8787);
  const relay = await harness.start(port, dir);
  const host = new LiveHost({ url: `ws://127.0.0.1:${port}`, show: showFromDeck(choiceDeck()) });
  // The window's end of the channel: what the host posts is collected, and a command is delivered by `send`.
  const posted: Record<string, any>[] = [];
  const hostEnd: ChannelLike = { onmessage: null, postMessage: (m) => { posted.push(m as Record<string, any>); }, close: () => {} };
  const bridge: ManualBridge = new ManualBridge(host, { makeChannel: (name): ChannelLike => { assert.equal(name, `sf-manual-${bridge.key}`); return hostEnd; } });
  assert.match(bridge.key, /^[a-f0-9]{32}$/, 'the key manual.html accepts');
  let seq = 0;
  const send = (action: string, extra: Record<string, unknown> = {}, id = `m${++seq}-1`) => hostEnd.onmessage!({ data: { type: 'sf-manual-command', action, id, ...extra } });
  const state = () => [...posted].reverse().find((m) => m.type === 'sf-manual-state')!;
  const wait = (pred: (s: RoomState) => boolean, what: string) => within(host.until(pred), 8000, what);
  let ada: Sock | undefined;
  try {
    bridge.start();
    const { pin } = await host.start();
    send('hello');
    assert.equal(state().active, true);
    assert.equal(state().pin, pin);
    assert.equal(state().showing, false, 'nothing on the wall yet: the window says to start the lesson');
    assert.equal(state().question, null);

    send('add', { names: ['Dee', 'Eve'], team: 0 });
    send('add', { names: ['Eve'], team: 0 }, `m${seq}-1`); // the same command by a second route: once
    const s = await wait((r) => r.players.length === 2, 'two learners added by the teacher');
    assert.deepEqual(s.players.map((p) => p.name).sort(), ['Dee', 'Eve']);
    assert.ok(s.players.every((p) => p.manual));
    ada = await harness.connect(port);
    ada.send({ t: 'join', pin, name: 'Ada' });
    await ada.next('joined');
    await wait((r) => r.players.length === 3, 'a phone too');
    const id = (n: string) => host.state.players.find((p) => p.name === n)!.id;

    host.begin(); // the intro
    host.goTo(1); // the cover
    host.next(); // question 1
    await ada.next('question');
    await wait((r) => r.phase === 'question', 'the question is open');
    assert.equal(state().question.id, 'q0');
    assert.equal(state().question.revealed, false);
    assert.equal(state().showing, true);

    send('answer', { answer: { id: 'q0', playerId: id('Dee'), choice: 0 } });
    ada.send({ t: 'answer', choice: 1 });
    await wait((r) => r.tally?.answered === 2, 'the answer by key and the phone\'s');
    assert.ok(state().answers.every((a: { right: unknown }) => a.right === null), 'nothing is marked before the reveal');

    send('answer', { answer: { id: 'wrong-question', playerId: id('Eve'), choice: 0 } });
    await within((async () => { while (!posted.some((m) => m.type === 'sf-manual-error')) await new Promise((r) => setTimeout(r, 20)); })(), 4000, 'the relay refuses it and the window is told');
    const err = posted.find((m) => m.type === 'sf-manual-error')!;
    assert.ok(err.message && err.playerId === id('Eve'), 'the refusal names the learner, so the window shows it on the row');

    send('tally', { counts: [3, 1, 0] });
    send('reveal');
    await wait((r) => r.revealed.includes('q0'), 'the reveal from the window');
    assert.equal(state().question.revealed, true);
    assert.equal(state().answers.find((a: { id: number }) => a.id === id('Dee')).right, true);
    assert.equal(state().answers.find((a: { id: number }) => a.id === id('Ada')).right, false);
    assert.ok(posted.some((m) => m.type === 'sf-manual-state' && m.report !== undefined));

    // "The answer is B": the room is marked against B, whatever the key said.
    host.next(); // question 2
    await ada.next('question');
    await wait((r) => r.phase === 'question', 'question 2');
    ada.send({ t: 'answer', choice: 1 });
    await wait((r) => r.tally?.answered === 1, 'Ada answers B');
    send('revealWith', { choice: 1 });
    await wait((r) => r.revealed.includes('q1') && (r.scores[id('Ada')] ?? 0) > 0, 'revealed with B: Ada is paid for it');
    assert.equal(state().answers.find((a: { id: number }) => a.id === id('Ada')).right, true);
    await within(host.end(), 4000, 'the end');
  } finally {
    bridge.stop();
    await within(host.end(), 4000, 'the end').catch(() => {});
    await ada?.close().catch(() => {});
    await harness.stop(relay);
    rmSync(dir, { recursive: true, force: true });
  }
});
