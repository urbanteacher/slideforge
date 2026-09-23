'use strict';
/* True/False Showdown — hold or fold. The room votes, is shown its own
 * split, and each phone may switch once before the reveal. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { freePort, start, connect, stop } = require('./harness');

function load() {
  const c = { window: {}, console, localStorage: { getItem: () => null, setItem() {}, removeItem() {} } };
  vm.createContext(c);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'model.js'), 'utf8'), c);
  return c.window.SF;
}

test('only the Showdown format is a showdown; plain True or False stays plain', () => {
  const SF = load();
  const show = SF.normalizeGame(SF.makeGame('Show', 'truefalse'));
  show.format = 'true-false';
  const plain = SF.normalizeGame(SF.makeGame('Plain', 'truefalse'));
  plain.format = 'truefalse';
  const a = SF.compileGame(show).find(s => s.type === 'quiz');
  const b = SF.compileGame(plain).find(s => s.type === 'quiz');
  assert.equal(a.showdown, true);
  assert.equal(a.holdResults, true, 'no bars before the split');
  assert.equal(b.showdown, undefined);
});

test('the split reaches every phone, each may switch once, and the reveal says who switched', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-showdown-'));
  const port = await freePort();
  const server = await start(port, dir);
  const sockets = [];
  t.after(async () => { await stop(server); sockets.forEach(s => s.socket.close()); fs.rmSync(dir, { recursive: true, force: true }); });
  const host = await connect(port); sockets.push(host);
  host.send({ t: 'host', title: 'Show', mode: 'individual' });
  const room = await host.next('hosted');
  const names = ['Ada', 'Ben', 'Cam'];
  const phones = [];
  for (const name of names) {
    const p = await connect(port); sockets.push(p);
    p.send({ t: 'join', pin: room.pin, name }); await p.next('joined'); phones.push(p);
  }
  host.send({ t: 'begin' });
  host.send({ t: 'question', id: 'tf1', question: 'Sound travels in a vacuum.', input: 'choice',
    options: ['True', 'False'], showdown: true, timeLimit: 0, points: 1000 });
  for (const p of phones) await p.next('question');
  phones[0].send({ t: 'answer', choice: 0 });
  phones[1].send({ t: 'answer', choice: 0 });
  phones[2].send({ t: 'answer', choice: 1 });
  await host.until('tally', m => m.answered === 3);

  // Before the split, a second answer is refused like any question.
  phones[0].send({ t: 'answer', choice: 1, switch: true });

  host.send({ t: 'showdown', id: 'tf1' });
  const seen = [];
  for (const p of phones) seen.push(await p.until('showdown', () => true));
  assert.deepEqual(Array.from(seen[0].counts), [2, 1], 'the switch before the split did not count');
  assert.equal(seen[0].mine, 0);
  assert.equal(seen[2].mine, 1);

  phones[0].send({ t: 'answer', choice: 1, switch: true });
  const sw = await phones[0].until('switched', () => true);
  assert.equal(sw.choice, 1);
  phones[0].send({ t: 'answer', choice: 0, switch: true });      // a second switch
  const tally = await host.until('tally', m => m.switched === 1);
  assert.deepEqual(Array.from(tally.split), [2, 1], 'the split is kept as it stood');
  assert.deepEqual(Array.from(tally.counts), [1, 2], 'the room moved');

  host.send({ t: 'reveal', id: 'tf1', rev: tally.rev,
    marks: [[tally.answers[0].id, false], [tally.answers[1].id, false], [tally.answers[2].id, true]]
      .map((row, i) => [tally.answers[i].id, tally.answers[i].response === 1]),
    correct: 1, answer: 'False' });
  const results = [];
  for (const p of phones) results.push(await p.until('result', () => true));
  assert.equal(results[0].switched, true);
  assert.equal(results[0].right, true, 'the switched answer is the one marked');
  assert.equal(results[1].switched, false);
  assert.equal(results[1].right, false);
});

test('Predict the Outcome locks before it reveals: the phones are told, and a late answer is refused', async t => {
  const SF = load();
  const g = SF.normalizeGame(SF.makeGame('Predict', 'choice'));
  g.format = 'predict-outcome';
  const s = SF.compileGame(g).find(x => x.type === 'quiz');
  assert.equal(s.predict, true);
  assert.equal(s.holdResults, true);
  assert.equal(s.confidence, true, 'how sure you were counts');

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-predict-'));
  const port = await freePort();
  const server = await start(port, dir);
  const sockets = [];
  t.after(async () => { await stop(server); sockets.forEach(x => x.socket.close()); fs.rmSync(dir, { recursive: true, force: true }); });
  const host = await connect(port); sockets.push(host);
  host.send({ t: 'host', title: 'Predict', mode: 'individual' });
  const room = await host.next('hosted');
  const ada = await connect(port), ben = await connect(port); sockets.push(ada, ben);
  ada.send({ t: 'join', pin: room.pin, name: 'Ada' }); ben.send({ t: 'join', pin: room.pin, name: 'Ben' });
  await ada.next('joined'); await ben.next('joined');
  host.send({ t: 'begin' });
  host.send({ t: 'question', id: 'p1', question: 'What happens to the balloon?', input: 'choice',
    options: ['It shrinks', 'It grows', 'Nothing'], timeLimit: 0, points: 1000 });
  await ada.next('question'); await ben.next('question');
  ada.send({ t: 'answer', choice: 1 });
  const tally = await host.until('tally', m => m.answered === 1);
  host.send({ t: 'closeAnswers', id: 'p1' });
  const a = await ada.until('answersClosed', () => true);
  const b = await ben.until('answersClosed', () => true);
  assert.equal(a.answered, true);
  assert.equal(b.answered, false);
  ben.send({ t: 'answer', choice: 0 });                       // too late: no tally follows
  host.send({ t: 'reveal', id: 'p1', rev: tally.rev, marks: [[tally.answers[0].id, true]],
    gains: [[tally.answers[0].id, 1500]], correct: 1, answer: 'It grows' });
  const ra = await ada.until('result', () => true), rb = await ben.until('result', () => true);
  assert.equal(ra.gained, 1500, 'a sure, right prediction earns half again');
  assert.equal(rb.answered, false, 'the late answer never landed');
});

test('a sure, wrong prediction costs half the points, and a score never goes below zero', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-predict-bet-'));
  const port = await freePort();
  const server = await start(port, dir);
  const sockets = [];
  t.after(async () => { await stop(server); sockets.forEach(x => x.socket.close()); fs.rmSync(dir, { recursive: true, force: true }); });
  const host = await connect(port); sockets.push(host);
  host.send({ t: 'host', title: 'Bet', mode: 'individual' });
  const room = await host.next('hosted');
  const ada = await connect(port); sockets.push(ada);
  ada.send({ t: 'join', pin: room.pin, name: 'Ada' }); await ada.next('joined');
  host.send({ t: 'begin' });
  host.send({ t: 'question', id: 'b1', question: 'Q', input: 'choice', options: ['A', 'B'], timeLimit: 0, points: 1000 });
  await ada.next('question');
  ada.send({ t: 'answer', choice: 0, sure: true });
  const tally = await host.until('tally', m => m.answered === 1);
  host.send({ t: 'reveal', id: 'b1', rev: tally.rev, marks: [[tally.answers[0].id, false]],
    gains: [[tally.answers[0].id, -500]], correct: 1, answer: 'B' });
  const r = await ada.until('result', () => true);
  assert.equal(r.gained, -500);
  assert.equal(r.score, 0, 'floored at zero');
});
