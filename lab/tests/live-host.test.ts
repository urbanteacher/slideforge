// The lab host end to end, against the real relay (server/server.js through tests/harness.js, a free port,
// never 8787) and raw-socket phones speaking join.html's side: a two-question Multiple choice game from a
// lab deck, two phones (one right, one wrong), a learner the teacher answers for by key, the reveal and the
// relay's scores; then the relay restarts mid-question, as a deploy does, and the room carries on in a new
// room the host opens and fills again. lab-engine-plan M7.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { ChildProcess } from 'node:child_process';
import type { Slide } from '../src/core';
import { LiveHost, showFromDeck, type RoomState } from '../src/live';

interface Sock { send(m: unknown): void; next(t: string): Promise<Record<string, unknown>>; until(t: string, p: (m: Record<string, any>) => boolean, label?: string): Promise<Record<string, any>>; close(): Promise<void> }
const harness = createRequire(import.meta.url)(resolve(process.cwd(), '..', 'tests/harness.js')) as {
  freePort(): Promise<number>; start(port: number, dir: string): Promise<ChildProcess>; stop(c: ChildProcess, sig?: string): Promise<void>; connect(port: number): Promise<Sock>;
};

/** A lab deck's Multiple choice game, tagged as the lab tags it (designs/engage/games.ts): a cover, then each question and its answer. */
function labDeck() {
  const qs = [
    { question: 'Which gas is most of the air?', options: ['Nitrogen', 'Oxygen', 'Argon'], correct: 0, explanation: 'About 78%.' },
    { question: 'Which particle is positive?', options: ['Proton', 'Electron'], correct: 0, explanation: 'In the nucleus.' },
  ];
  const slide = (id: string, name: string, game: Slide['game']) => ({ id, name, background: '', layers: [], transition: { type: 'morph', duration: 0.8 }, notes: '', game }) as unknown as Slide;
  const game = (role: NonNullable<Slide['game']>['role'], extra: Partial<NonNullable<Slide['game']>> = {}) => ({ id: 'gm1', format: 'choice', label: 'Air and atoms', role, settings: { seconds: 20, points: 1000 }, ...extra });
  const slides: Slide[] = [slide('s0', 'Cover', game('cover'))];
  qs.forEach((q, i) => {
    const quiz = { type: 'quiz', style: 'choice', input: 'choice', points: 1000, confidence: true, ...q };
    slides.push(slide(`q${i}`, `Question ${i + 1}`, game('question', { key: String(i), quiz })), slide(`a${i}`, `Answer ${i + 1}`, game('answer', { key: String(i) })));
  });
  return { title: 'Air and atoms', slides };
}

/** A phone as join.html is one: joins with the PIN and a name, answers the question it is sent. */
async function phone(port: number, pin: string, name: string): Promise<Sock> {
  const p = await harness.connect(port);
  p.send({ t: 'join', pin, name });
  await p.next('joined');
  return p;
}

const within = <T>(p: Promise<T>, ms: number, what: string) =>
  Promise.race([p, new Promise<never>((_, j) => setTimeout(() => j(new Error('timed out: ' + what)), ms))]);

test('a Multiple choice game from a lab deck, through the real relay, across a relay restart', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'sf-lab-live-'));
  const port = await harness.freePort();
  assert.notEqual(port, 8787);
  let relay = await harness.start(port, dir);
  const show = showFromDeck(labDeck());
  const host = new LiveHost({ url: `ws://127.0.0.1:${port}`, show, backoff: { initialMs: 50, maxMs: 400 } });
  const wait = (pred: (s: RoomState) => boolean, what: string) => within(host.until(pred), 8000, what);
  const phones: Sock[] = [];
  try {
    assert.deepEqual(show.slides.map((s) => s.id), ['s0', 'q0', 'q1', 'gm1:scores'], 'answers are reveals, not steps');
    const { pin } = await host.start();
    assert.match(pin!, /^\d{6}$/);

    host.manualAdd(['Dee']);
    const ada = await phone(port, pin!, 'Ada'), bo = await phone(port, pin!, 'Bo');
    phones.push(ada, bo);
    let s = await wait((r) => r.players.length === 3, 'three learners');
    const id = (r: RoomState, name: string) => r.players.find((p) => p.name === name)!.id;

    host.begin(); // the cover
    host.next(); // question 1
    const q1 = await ada.next('question');
    assert.equal(q1.timeLimit, 0, 'no clock while the teacher enters answers by key');
    await bo.next('question');
    ada.send({ t: 'answer', choice: 0 });
    bo.send({ t: 'answer', choice: 1 });
    await wait((r) => r.tally?.answered === 2, 'two answers');
    host.manualAnswer(id(host.state, 'Dee'), 0);
    s = await wait((r) => r.tally?.answered === 3, 'the answer by key');

    host.next(); // reveal
    s = await wait((r) => r.revealed.includes('q0') && r.scores[id(r, 'Ada')] === 1000, 'the reveal');
    assert.equal(s.scores[id(s, 'Bo')], 0);
    assert.equal(s.scores[id(s, 'Dee')], 1000, 'the answer by key counts');
    assert.equal((await ada.next('result')).right, true);
    assert.equal((await bo.next('result')).right, false);

    // Question 2 is up, and the relay restarts under it (Render sends SIGTERM on a deploy).
    host.next();
    await ada.next('question');
    const before = s.session!.id;
    await harness.stop(relay);
    relay = await harness.start(port, dir);
    s = await wait((r) => r.rooms === 2 && r.live && r.players.some((p) => p.manual && p.name === 'Dee'), 'a new room, with Dee back');
    assert.notEqual(s.session!.id, before);
    assert.notEqual(s.phase, 'question', 'the open question is held until the phones are back');

    // The phones were told `over`; they come back with the new PIN, and Next asks the question again.
    const ada2 = await phone(port, s.pin!, 'Ada'), bo2 = await phone(port, s.pin!, 'Bo');
    phones.push(ada2, bo2);
    await wait((r) => r.players.length === 3, 'the room refilled');
    host.next();
    await ada2.next('question');
    await bo2.next('question');
    ada2.send({ t: 'answer', choice: 0 });
    bo2.send({ t: 'answer', choice: 1 });
    await wait((r) => r.tally?.answered === 2, 'two answers in the new room');
    host.manualAnswer(id(host.state, 'Dee'), 0);
    await wait((r) => r.tally?.answered === 3, 'the answer by key in the new room');
    host.next();
    s = await wait((r) => r.revealed.includes('q1') && r.scores[id(r, 'Dee')] === 1000, 'the reveal in the new room');
    assert.equal(s.scores[id(s, 'Ada')], 1000);
    assert.equal(s.scores[id(s, 'Bo')], 0);

    host.next(); // the scores
    await ada2.next('finish');
    s = await within(host.end(), 4000, 'the end');
    assert.ok(s.ended && !s.live);
  } finally {
    await Promise.all(phones.map((p) => p.close().catch(() => {})));
    await harness.stop(relay);
    rmSync(dir, { recursive: true, force: true });
  }
});
