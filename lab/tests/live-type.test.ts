// Type answer in the studio's room (lab-engine-plan M8: the style 'type', typed recall):
//  - routing: canHostInStudio accepts a Type answer game, alone or with the other two styles;
//  - the host against the real relay (tests/harness.js, a free port, never 8787): phones type, the host marks with
//    SlideForge's own rules (accents, case, articles, near spellings), the relay scores by the verdicts it is sent,
//    the teacher's typed entry from manual.html is served, and the reveal shows the accepted answer;
//  - the wall: the typed answers grouped as classic groups them (one group for "paris", "PARIS" and "the Paris",
//    written as the question accepts it), the right one marked on the reveal, nothing shown while it is open.
// The wire against the classic recording is in live-replay.test.ts; the whole path in a browser is
// tools/smoke/studio-room-type.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { ChildProcess } from 'node:child_process';
import type { Slide } from '../src/core';
import { LiveHost, ManualBridge, emptyRoom, showFromDeck, typedGroups, type ChannelLike, type RoomState } from '../src/live';
import { canHostInStudio } from '../src/show/canHost';
import { shownDeck, stepsOf } from '../src/show/steps';
import { wallOf } from '../src/show/wallModel';

interface Sock { send(m: unknown): void; next(t: string): Promise<Record<string, any>>; close(): Promise<void> }
const harness = createRequire(import.meta.url)(resolve(process.cwd(), '..', 'tests/harness.js')) as {
  freePort(): Promise<number>; start(port: number, dir: string): Promise<ChildProcess>; stop(c: ChildProcess, sig?: string): Promise<void>; connect(port: number): Promise<Sock>;
};
const within = <T>(p: Promise<T>, ms: number, what: string) =>
  Promise.race([p, new Promise<never>((_, j) => setTimeout(() => j(new Error('timed out: ' + what)), ms))]);

const slide = (id: string, name: string, game?: Slide['game'], extra: Partial<Slide> = {}) =>
  ({ id, name, background: '', layers: [], transition: { type: 'none', duration: 0 }, notes: '', game, ...extra }) as unknown as Slide;
const game = (role: NonNullable<Slide['game']>['role'], extra: Partial<NonNullable<Slide['game']>> = {}) =>
  ({ id: 'gty', format: 'type', label: 'Recall', role, settings: { seconds: 20, points: 1000 }, ...extra }) as NonNullable<Slide['game']>;

/** A Type answer game as the lab tags it (designs/engage/games.ts): the starter's questions, `input: 'text'`, `accept` and `answer`. */
function typeDeck(extra: Slide[] = []) {
  const qs = [
    { question: 'What is the capital of France?', accept: ['Paris'], explanation: 'On the Seine.' },
    { question: 'Which gas do plants take in?', accept: ['carbon dioxide', 'CO2'], explanation: 'For photosynthesis.' },
  ];
  const slides: Slide[] = [slide('cover', 'Cover', game('cover'))];
  qs.forEach((q, i) => {
    const quiz = { type: 'quiz', style: 'type', input: 'text', correct: -1, points: 1000, confidence: true, allowTypos: true, answer: q.accept[0], ...q };
    slides.push(slide(`q${i}`, `Question ${i + 1}`, game('question', { key: String(i), quiz })), slide(`a${i}`, `Answer ${i + 1}`, game('answer', { key: String(i) })));
  });
  return { title: 'Recall', slides: [...slides, ...extra] };
}

test('canHostInStudio: a Type answer game is hosted in the studio, with the other two styles, and nothing else is', () => {
  assert.deepEqual(canHostInStudio(typeDeck()), { ok: true, reason: '' });
  const mc = slide('mq', 'MQ', { id: 'gmc', format: 'choice', label: 'Air', role: 'question', key: '0', settings: {}, quiz: { type: 'quiz', style: 'choice', input: 'choice', question: 'Q?', options: ['A', 'B'], correct: 0 } } as never);
  assert.equal(canHostInStudio(typeDeck([mc])).ok, true, 'Multiple choice and Type answer in one lesson');
  const ranking = slide('rk', 'Order', { id: 'grk', format: 'bingo', label: 'Order', role: 'question', key: '0', settings: {} } as never);
  assert.match(canHostInStudio(typeDeck([ranking])).reason, /"Order" is bingo, not Multiple choice, True or false/);
  // A Type answer game whose question is not typed (or a choice game whose question is) is not what the room runs.
  const odd = typeDeck();
  odd.slides[1] = slide('q0', 'Q', game('question', { key: '0', quiz: { type: 'quiz', style: 'type', input: 'choice', question: 'Q?', options: ['A', 'B'], correct: 0 } }));
  assert.match(canHostInStudio(odd).reason, /has a question that is not Type answer/);
  assert.match(canHostInStudio(typeDeck([slide('p', 'Poll', game('cover'), { feedback: { kind: 'poll', prompt: 'Ready?', options: ['Yes', 'No'] } })])).reason, /poll feedback/);
});

test('the show asks a Type answer question as a typed question: the accepted spellings, no options, no option to be right', () => {
  const { slides } = showFromDeck(typeDeck());
  const q = slides.find((s) => s.activity === 'question')!;
  assert.equal(q.style, 'type');
  assert.equal(q.quiz!.input, 'text');
  assert.deepEqual(q.quiz!.options, []);
  assert.equal(q.quiz!.correct, -1);
  assert.equal(q.quiz!.answer, 'Paris');
});

test('typed answers are grouped as classic groups them, and each group is marked by the room\'s rules', () => {
  const quiz = showFromDeck(typeDeck()).slides.find((s) => s.activity === 'question')!.quiz!;
  const said = ['paris', 'PARIS', 'the Paris', ' Pâris ', 'Lyon', 'Lyon', 'Lyon!', 'Pariss', 'Rome'].map((response) => ({ response }));
  const groups = typedGroups(quiz, said);
  // "paris", "PARIS", "the Paris" and "Pâris" are one group, written as the question accepts it; "Lyon" and "Lyon!" are one.
  assert.deepEqual(groups.map((g) => [g.text, g.n, g.right]), [['Paris', 4, true], ['Lyon', 3, false], ['Paris', 1, true], ['Rome', 1, false]]); // a near spelling is its own group (classic's), marked right and written as accepted
  assert.deepEqual(typedGroups(quiz, [{ response: 2 }, { response: 'x' }]).map((g) => g.text), ['x'], 'a number is not a typed answer');
});

const room = (over: Partial<RoomState> = {}): RoomState => ({
  ...emptyRoom(), connected: true, live: true, pin: '123456', joinUrl: 'http://10.0.0.5:8787/join.html', phase: 'running',
  players: [{ id: 1, name: 'Ana', score: 900, connected: true, away: false, manual: false, team: null }, { id: 2, name: 'Bo', score: 0, connected: true, away: false, manual: false, team: null }],
  ...over,
});

test('wall: a typed question shows the count only while it is open, then the groups on the reveal, the right one marked, and the accepted answer', () => {
  const { steps } = stepsOf(shownDeck({ ...typeDeck(), width: 1920, height: 1080 } as never));
  const i = steps.findIndex((s) => s.room.id === 'q0');
  const a = (id: number, response: string) => ({ id, name: `P${id}`, team: null, response, sure: null, elapsedMs: 500 });
  const tally = { id: 'q0', rev: 3, counts: [], answered: 3, sured: 0, total: 3, allIn: true, manual: false, answers: [a(1, 'paris'), a(2, 'the Paris'), a(3, 'Lyon')] };
  const input = { steps, at: i, scoresOn: false, fallbackJoin: '' };
  const open = wallOf({ ...input, room: room({ phase: 'question', question: { id: 'q0', slideId: 'q0', options: [], timeLimit: 20 }, tally }) });
  assert.equal(open.view, 'question');
  assert.equal((open.question!.detail as { groups: unknown }).groups, null, 'what is typed is not shown while it can still be copied');
  assert.equal(open.question!.answered, 3);
  assert.deepEqual(open.question!.options, []);
  const done = wallOf({ ...input, room: room({ phase: 'revealed', revealed: ['q0'], tally }) });
  assert.equal(done.view, 'reveal');
  assert.deepEqual((done.question!.detail as { groups: { text: string; n: number; right: boolean }[] }).groups.map((g) => [g.text, g.n, g.right]), [['Paris', 2, true], ['Lyon', 1, false]]);
  assert.equal(done.question!.right, 2);
  assert.equal(done.question!.answer, 'Paris');
  assert.equal(done.question!.explanation, 'On the Seine.');
});

test('a Type answer game through the real relay: phones type, the host marks, the teacher types for a learner, the reveal says the answer', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'sf-lab-type-'));
  const port = await harness.freePort();
  assert.notEqual(port, 8787);
  const relay = await harness.start(port, dir);
  const host = new LiveHost({ url: `ws://127.0.0.1:${port}`, show: showFromDeck(typeDeck()) });
  const posted: Record<string, any>[] = [];
  const hostEnd: ChannelLike = { onmessage: null, postMessage: (m) => { posted.push(m as Record<string, any>); }, close: () => {} };
  const bridge = new ManualBridge(host, { makeChannel: () => hostEnd });
  const send = (action: string, extra: Record<string, unknown> = {}) => hostEnd.onmessage!({ data: { type: 'sf-manual-command', action, ...extra } });
  const state = () => [...posted].reverse().find((m) => m.type === 'sf-manual-state')!;
  const wait = (pred: (s: RoomState) => boolean, what: string) => within(host.until(pred), 8000, what);
  const phones: Sock[] = [];
  const phone = async (name: string, pin: string) => { const p = await harness.connect(port); p.send({ t: 'join', pin, name }); await p.next('joined'); phones.push(p); return p; };
  try {
    bridge.start();
    const { pin } = await host.start();
    host.manualAdd(['Dee']);
    const ada = await phone('Ada', pin!), bo = await phone('Bo', pin!);
    await wait((r) => r.players.length === 3, 'three learners');
    const id = (n: string) => host.state.players.find((p) => p.name === n)!.id;

    host.begin(); // the cover
    host.next(); // question 1
    const q = await ada.next('question');
    assert.equal(q.input, 'text');
    assert.deepEqual(q.options, []);
    assert.equal(q.style, 'type');
    assert.equal(state().question.input, 'text', 'the entry window is told it is a typed question');
    ada.send({ t: 'answer', text: 'PARIS' }); // right, another case
    bo.send({ t: 'answer', text: 'Lyon' }); // wrong
    await wait((r) => r.tally?.answered === 2, 'two typed answers');
    send('answer', { answer: { id: 'q0', playerId: id('Dee'), text: ' the Paris ' } });
    await wait((r) => r.tally?.answered === 3, 'the teacher\'s typed entry');
    assert.deepEqual(host.state.tally!.answers.map((a) => a.response).sort(), ['Lyon', 'PARIS', 'the Paris'], 'the relay trims what the teacher typed');
    assert.ok(state().answers.every((a: { right: unknown }) => a.right === null), 'nothing is marked in the window before the reveal');

    send('reveal');
    const s = await wait((r) => r.revealed.includes('q0') && r.scores[id('Ada')] === 1000, 'the reveal, marked by the host');
    assert.equal(s.scores[id('Bo')], 0);
    assert.equal(s.scores[id('Dee')], 1000, 'the teacher\'s typed entry is marked like a phone\'s');
    const right = await ada.next('result'), wrong = await bo.next('result');
    assert.equal(right.right, true);
    assert.equal(wrong.right, false);
    assert.equal(right.answer, 'Paris', 'the phone is told the accepted answer');
    const ans = state().answers as { id: number; right: boolean }[];
    assert.deepEqual([ans.find((a) => a.id === id('Ada'))!.right, ans.find((a) => a.id === id('Bo'))!.right, ans.find((a) => a.id === id('Dee'))!.right], [true, false, true], 'the window marks the typed answers after the reveal');

    // Next moves on from a typed reveal (the relay sends no teamAnswers for it; the room knows it is revealed).
    host.next();
    await ada.next('question');
    ada.send({ t: 'answer', text: 'co2' }); // an accepted variant
    bo.send({ t: 'answer', text: 'oxygen' });
    await wait((r) => r.tally?.answered === 2 && r.tally.id === 'q1', 'question 2 answered');
    host.next();
    const s2 = await wait((r) => r.revealed.includes('q1') && r.scores[id('Ada')] === 2000, 'question 2 revealed');
    assert.equal(s2.scores[id('Bo')], 0);
    host.next(); // the scores
    await ada.next('finish');
    await within(host.end(), 4000, 'the end');
  } finally {
    bridge.stop();
    await Promise.all(phones.map((p) => p.close().catch(() => {})));
    await harness.stop(relay);
    rmSync(dir, { recursive: true, force: true });
  }
});
