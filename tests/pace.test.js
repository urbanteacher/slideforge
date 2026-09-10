'use strict';
/* The pace signal and answer confidence. Both exist to tell the teacher
   something a tally cannot, and both only work if the room believes what they
   are told about them:

   - a pace signal is anonymous, so it is never sent with a player id and never
     journalled with one. A signal you can be identified by is a signal nobody
     sends, and then the feature is worse than not having it.
   - confidence is never scored. Scoring it would teach the room to claim they
     were guessing, and the number that matters — wrong but sure — would stop
     being true. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { freePort, start, connect, stop, report, reveal } = require('./harness');

async function room(t, n = 4) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'slideforge-pace-'));
  const port = await freePort();
  const relay = await start(port, dir);
  const sockets = [];
  t.after(async () => {
    await stop(relay);
    for (const s of sockets) s.socket.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });
  const host = await connect(port);
  sockets.push(host);
  host.send({ t: 'host', title: 'Pace', mode: 'individual' });
  const hosted = await host.next('hosted');
  const players = [];
  for (let i = 0; i < n; i++) {
    const p = await connect(port);
    sockets.push(p);
    p.send({ t: 'join', pin: hosted.pin, name: 'P' + (i + 1) });
    await p.next('joined');
    players.push(p);
  }
  return { host, hosted, players, port, sockets };
}

test('a pace signal counts the room without naming anyone', async (t) => {
  const { host, players } = await room(t, 4);
  host.send({ t: 'begin' });
  await players[0].next('begun');
  host.send({ t: 'at', slideId: 's3', title: 'Osmosis', n: 3 });

  players[0].send({ t: 'signal', kind: 'lost' });
  assert.equal((await players[0].next('signalled')).kind, 'lost');
  let d = await host.until('signals', (m) => m.live === 1);
  assert.deepEqual(d.counts, { lost: 1, fast: 0, slow: 0 });
  assert.equal(d.of, 4);
  /* One person lost is a conversation to have with them, not a fact about
     the lesson, so it is not a spike: a quarter of the room and never
     fewer than two. */
  assert.equal(d.spike, false);

  players[1].send({ t: 'signal', kind: 'fast' });
  await players[1].next('signalled');
  d = await host.until('signals', (m) => m.live === 2);
  assert.equal(d.spike, true, 'two of four is a quarter of the room');
  assert.deepEqual(d.counts, { lost: 1, fast: 1, slow: 0 });

  /* Nothing about who. The host is the only recipient and it is sent counts. */
  assert.equal(JSON.stringify(d).includes('P1'), false);
  assert.equal(d.names, undefined);
  assert.equal(d.players, undefined);

  const r = await report(host);
  assert.equal(r.summary.signalsRaised, 2);
  assert.deepEqual(r.signals, [
    { slideId: 's3', title: 'Osmosis', n: 3, lost: 1, fast: 1, slow: 0,
      total: 2, firstAt: r.signals[0].firstAt, lastAt: r.signals[0].lastAt }
  ]);
  /* The journal is the durable copy, so this is where anonymity has to hold
     rather than only in the projection. */
  const raw = JSON.stringify(r.signals);
  assert.equal(raw.includes('playerId'), false);
  assert.equal(raw.includes('P1'), false);
});

test('one person counts once, can change their mind, and can take it back', async (t) => {
  const { host, players } = await room(t, 4);
  host.send({ t: 'begin' });
  await players[0].next('begun');

  players[0].send({ t: 'signal', kind: 'lost' });
  await players[0].next('signalled');
  await host.until('signals', (m) => m.live === 1);

  // Same person, different signal: replaces rather than adding.
  players[0].send({ t: 'signal', kind: 'fast' });
  assert.equal((await players[0].next('signalled')).kind, 'fast');
  let d = await host.until('signals', (m) => m.counts.fast === 1);
  assert.equal(d.live, 1, 'still one person');
  assert.equal(d.counts.lost, 0);

  /* Pressing the same thing again takes it back — nobody should have to hunt
     for a way to say "actually, I follow now". */
  players[0].send({ t: 'signal', kind: 'fast' });
  assert.equal((await players[0].next('signalled')).kind, null);
  d = await host.until('signals', (m) => m.live === 0);
  assert.equal(d.spike, false);
  assert.equal(d.kind, null);

  // An unknown kind is not a signal.
  players[1].send({ t: 'signal', kind: 'furious' });
  assert.equal((await players[1].next('signalled')).kind, null);
});

test('leaving the room takes your signal with you', async (t) => {
  const { host, players } = await room(t, 4);
  host.send({ t: 'begin' });
  await players[0].next('begun');
  players[0].send({ t: 'signal', kind: 'lost' });
  players[1].send({ t: 'signal', kind: 'lost' });
  await host.until('signals', (m) => m.live === 2);

  await players[0].close();
  const d = await host.until('signals', (m) => m.live === 1);
  assert.equal(d.counts.lost, 1);
  assert.equal(d.of, 3, 'and the room it is measured against is smaller');
});

test('confidence arrives after the answer and never touches the score', async (t) => {
  const { host, players } = await room(t, 3);
  const [ada, bo, cy] = players;
  host.send({ t: 'begin' });
  await ada.next('begun');
  host.send({ t: 'question', id: 'q1', question: 'Which one?', options: ['A', 'B'],
    confidence: true, points: 1000, timeLimit: 0 });
  assert.equal((await ada.next('question')).confidence, true);
  await bo.next('question');
  await cy.next('question');

  ada.send({ t: 'answer', choice: 0 });                 // right, and sure
  bo.send({ t: 'answer', choice: 1 });                  // wrong, and sure
  cy.send({ t: 'answer', choice: 0 });                  // right, but guessing
  await ada.next('locked');
  await bo.next('locked');
  await cy.next('locked');
  ada.send({ t: 'sure', sure: true });
  bo.send({ t: 'sure', sure: true });
  cy.send({ t: 'sure', sure: false });

  const tally = await host.until('tally',
    (m) => (m.answers || []).filter((a) => typeof a.sure === 'boolean').length === 3);
  /* The host is sent it because the host is the only place that can pair a
     confidence with a verdict — it holds the answer key. */
  assert.deepEqual(tally.answers.map((a) => [a.response, a.sure]).sort(),
    [[0, false], [0, true], [1, true]]);

  /* Marked from the tally this test already took: the queue is empty now, so
     asking the harness to fetch another would wait for a push nobody sends. */
  await reveal(host, { id: 'q1', correct: 0, answer: 'A' }, null, 3, tally);
  const adaResult = await ada.next('result');
  const boResult = await bo.next('result');
  const cyResult = await cy.next('result');

  /* Confident and right scores exactly what hesitant and right scores. */
  assert.equal(adaResult.gained, cyResult.gained);
  assert.equal(boResult.gained, 0);
  assert.equal(adaResult.right, true);

  const r = await report(host);
  const byName = Object.fromEntries(r.attendance.map((p) => [p.name, p]));
  assert.equal(byName.P2.confidentlyWrong, 1, 'sure and wrong: a misconception');
  assert.equal(byName.P1.confidentlyWrong, 0);
  assert.equal(byName.P3.unsureButRight, 1, 'right but guessing: a gap');
  assert.equal(r.summary.confidentlyWrong, 1);
  const said = r.checks[0].responses.map((a) => [a.choice, a.sure, a.right]).sort();
  assert.deepEqual(said, [[0, false, true], [0, true, true], [1, true, false]]);
});

test('a confidence nobody asked for, or sent too late, is refused', async (t) => {
  const { host, players } = await room(t, 2);
  const [ada, bo] = players;
  host.send({ t: 'begin' });
  await ada.next('begun');
  host.send({ t: 'question', id: 'q1', question: 'Which one?', options: ['A', 'B'],
    points: 1000, timeLimit: 0 });
  /* Not asked for, so the phones are told not to ask — an older host that
     sends nothing must not produce a stray extra tap. */
  assert.equal((await ada.next('question')).confidence, false);
  await bo.next('question');

  // Before answering there is nothing to be sure about.
  ada.send({ t: 'sure', sure: true });
  ada.send({ t: 'answer', choice: 0 });
  await ada.next('locked');
  bo.send({ t: 'answer', choice: 0 });
  await bo.next('locked');
  ada.send({ t: 'sure', sure: 'very' });                // not a boolean
  await reveal(host, { id: 'q1', correct: 0, answer: 'A' }, null, 2);
  await ada.next('result');

  // And after the reveal it is too late to claim you were sure all along.
  ada.send({ t: 'sure', sure: true });
  const r = await report(host);
  assert.equal(r.checks[0].responses.every((a) => a.sure == null), true);
  assert.equal(r.summary.confidentlyWrong, 0);
});
