'use strict';
/* Ranking — the first answer in this app that is a list rather than a value.
 *
 * That is the whole reason it needs its own tests. Every other response is a
 * scalar the relay can bounds-check in one line; an ordering is indexed into
 * `options` by marking, the tally, the report and the CSV, so a malformed one
 * corrupts four readers at once rather than failing loudly in one.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { freePort, start, connect, stop, report, reveal } = require('./harness');

function loadModel() {
  const sandbox = {};
  global.window = sandbox;
  delete require.cache[require.resolve('../js/model.js')];
  require('../js/model.js');
  delete global.window;
  return sandbox.SF;
}

test('an ordering is marked on positions, and part marks are the point', () => {
  const SF = loadModel();
  const slide = { style: 'order', input: 'order', options: ['A', 'B', 'C', 'D'] };

  assert.equal(SF.orderScore(slide, [0, 1, 2, 3]), 1);
  /* The last two swapped is three quarters right, not nothing. With six items
     all-or-nothing marking makes the question unanswerable for most of a
     class and tells the teacher only that it was hard. */
  assert.equal(SF.orderScore(slide, [0, 1, 3, 2]), 0.5);
  assert.equal(SF.orderScore(slide, [3, 2, 1, 0]), 0);

  /* Only a perfect order is "right" for the scoreboard — the fraction is for
     the teacher, the boolean is for the points. */
  assert.equal(SF.markResponse(slide, [0, 1, 2, 3]), true);
  assert.equal(SF.markResponse(slide, [0, 1, 3, 2]), false);

  /* Anything that is not a permutation scores nothing rather than scoring
     partially: a short list, a repeat or a stray index is not a worse answer,
     it is not an answer. */
  [[0, 1, 2], [0, 1, 2, 3, 3], [0, 0, 1, 2], [0, 1, 2, 9], null, 'ABC', 2]
    .forEach((bad) => assert.equal(SF.orderScore(slide, bad), 0, JSON.stringify(bad)));

  /* Two identical items would make the order ambiguous — a learner who swaps
     them is marked wrong for a difference nobody can see. */
  const dup = SF.normalizeQuestion(Object.assign(SF.makeQuestion('order'),
    { question: 'Order these', options: ['Same', 'Same', 'Other'] }), 'order');
  assert.match(SF.GAME_STYLES.order.problems(dup, 1), /two items reading "Same"/);

  const ok = SF.normalizeQuestion(Object.assign(SF.makeQuestion('order'),
    { question: 'Order these', options: ['One', 'Two', 'Three'] }), 'order');
  assert.equal(SF.GAME_STYLES.order.problems(ok, 1), null);
  assert.match(SF.GAME_STYLES.order.summary(ok), /3 to order/);

  /* Reports and the CSV must read words, never indices. */
  assert.equal(SF.answerLabel(slide, [1, 0, 2, 3]), 'B → A → C → D');
});

test('the relay keeps an ordering only if it is a real permutation', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'slideforge-order-'));
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
  host.send({ t: 'host', title: 'Ranking', mode: 'individual' });
  const hosted = await host.next('hosted');
  const join = async (name) => {
    const p = await connect(port);
    sockets.push(p);
    p.send({ t: 'join', pin: hosted.pin, name });
    await p.next('joined');
    return p;
  };
  const ada = await join('Ada');
  const bo = await join('Bo');
  host.send({ t: 'begin' });
  await ada.next('begun');

  host.send({ t: 'question', id: 'q1', input: 'order',
    options: ['First', 'Second', 'Third'], points: 1000, timeLimit: 0 });
  const asked = await ada.next('question');
  assert.equal(asked.input, 'order');
  assert.deepEqual(asked.options, ['First', 'Second', 'Third'],
    'the phone needs the items, because it is what it reorders');
  await bo.next('question');

  /* Every malformed shape is dropped rather than stored. If any of these got
     through, marking and the report would index into options with it. */
  for (const bad of [{ order: [0, 1] }, { order: [0, 1, 1] }, { order: [0, 1, 3] },
                     { order: [0, 1, '2'] }, { order: 'abc' }, { choice: 0 }]) {
    ada.send(Object.assign({ t: 'answer' }, bad));
  }
  await new Promise((r) => setTimeout(r, 250));
  assert.equal(await ada.has('locked'), false, 'nothing malformed was accepted');

  ada.send({ t: 'answer', order: [0, 1, 2] });
  const lock = await ada.next('locked');
  assert.deepEqual(lock.order, [0, 1, 2], 'the accepted order comes back for a resume');
  bo.send({ t: 'answer', order: [2, 1, 0] });
  await bo.next('locked');

  /* Marking is the host's, as for every other style — the relay only counts.
     Waits for both answers before marking: marking a snapshot that is one
     short leaves the other player with no verdict at all. */
  await reveal(host, { id: 'q1', correct: -1, answer: 'First, Second, Third' },
    (a) => Array.isArray(a.response) && a.response[0] === 0, 2);
  assert.equal((await ada.next('result')).right, true);
  assert.equal((await bo.next('result')).right, false);

  /* And it survives the journal in its own field, not squeezed into `choice`
     where every other reader expects an index. */
  const r = await report(host);
  const check = r.checks[r.checks.length - 1];
  const byId = Object.fromEntries(check.responses.map((x) => [x.playerId, x]));
  const names = Object.fromEntries(r.attendance.map((p) => [p.name, p.id]));
  assert.deepEqual(byId[names.Ada].order, [0, 1, 2]);
  assert.deepEqual(byId[names.Bo].order, [2, 1, 0]);
  assert.equal(byId[names.Ada].choice, null, 'an ordering never lands in choice');
  assert.equal(byId[names.Ada].right, true);
  assert.equal(byId[names.Bo].right, false);

  /* A second ordering in the same lesson.
     The first version of the phone control cleared its "locked" class but not
     its locked flag, so the send refused and the second ordering was
     unanswerable — silently, because the control still looked live. The relay
     side of that is this: a fresh question must take a fresh answer from the
     same player. */
  host.send({ t: 'question', id: 'q2', input: 'order',
    options: ['Alpha', 'Beta', 'Gamma'], points: 1000, timeLimit: 0 });
  await ada.next('question');
  ada.send({ t: 'answer', order: [2, 0, 1] });
  const second = await ada.next('locked');
  assert.deepEqual(second.order, [2, 0, 1], 'a second ordering is accepted');
});
