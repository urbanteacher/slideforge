'use strict';
/* Spot the Error, rebuilt so it does what its name says: the room taps the
 * wrong word in the sentence, instead of picking one of four phrases that did
 * the spotting for them.
 *
 * The engine: where the error sits, what counts as finding it, what the author
 * is told when the marked words are not in the sentence. The relay: a tap
 * question carries the words as options, takes a tap past the six-option limit
 * a choice question has, and counts taps per word — the heat map's data.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { freePort, start, connect, stop } = require('./harness');

function load() {
  const data = {};
  const c = { window: {}, console,
    localStorage: { getItem: k => data[k] || null, setItem: (k, v) => data[k] = String(v), removeItem: k => delete data[k] } };
  vm.createContext(c);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'model.js'), 'utf8'), c);
  return c.window.SF;
}

test('the error is found in the sentence word for word, ignoring case and punctuation', () => {
  const SF = load();
  const s = 'Photosynthesis happens in the mitochondria, uses carbon dioxide and water.';
  assert.deepEqual({ ...SF.spotSpan(s, 'mitochondria') }, { from: 4, to: 4 });
  assert.deepEqual({ ...SF.spotSpan(s, 'In The Mitochondria') }, { from: 2, to: 4 });
  assert.equal(SF.spotSpan(s, 'chloroplasts'), null);
  assert.equal(SF.spotSpan(s, ''), null);
});

test('a tap anywhere inside the wrong words is a find, and nowhere else is', () => {
  const SF = load();
  const g = SF.normalizeGame(SF.makeGame('Spot', 'spot'));
  g.questions = [SF.normalizeQuestion({ question: 'The Battle of Hastings was fought in 1066 in Scotland.',
    error: 'in Scotland', fix: 'in England' }, 'spot')];
  const s = SF.compileGame(g).find(x => x.type === 'quiz');
  assert.equal(s.input, 'tap');
  assert.equal(s.holdResults, true, 'where the room tapped waits for the reveal');
  /* The0 Battle1 of2 Hastings3 was4 fought5 in6 1066 7 in8 Scotland.9 */
  assert.deepEqual([s.errorFrom, s.errorTo], [8, 9]);
  assert.equal(s.answer, 'in Scotland → in England', 'named without the full stop');
  assert.equal(SF.markResponse(s, 8), true);
  assert.equal(SF.markResponse(s, 9), true);
  assert.equal(SF.markResponse(s, 6), false, 'the other "in" is not the error');
  assert.equal(SF.markResponse(s, 7), false);
  assert.equal(SF.markResponse(s, 'x'), false);
});

test('the author is told when the marked words are not in the sentence', () => {
  const SF = load();
  const style = SF.gameStyle('spot');
  assert.equal(style.problems({ question: 'Water boils at 50 degrees.', error: '50' }, 1), null);
  assert.match(style.problems({ question: 'Water boils at 50 degrees.', error: '40' }, 1), /not in the sentence/);
  assert.match(style.problems({ question: 'Water boils at 50 degrees.', error: '' }, 1), /no wrong words/);
  assert.match(style.problems({ question: '', error: 'x' }, 1), /no sentence/);
});

test('the library builds Spot the Error as the tap game, not multiple choice', () => {
  const SF = load();
  const preset = SF.GAME_FORMAT_PRESETS['spot-the-error'];
  assert.equal(preset.style, 'spot');
  assert.ok(preset.seeds.length >= 3);
  preset.seeds.forEach((q, i) => assert.equal(SF.gameStyle('spot').problems(q, i + 1), null, 'seed ' + (i + 1)));
});

test('the relay carries the words, takes a tap on any of them, and counts per word', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-spot-'));
  const port = await freePort();
  const server = await start(port, dir);
  const sockets = [];
  t.after(async () => {
    await stop(server);
    sockets.forEach(s => s.socket.close());
    fs.rmSync(dir, { recursive: true, force: true });
  });
  const host = await connect(port); sockets.push(host);
  host.send({ t: 'host', title: 'Spot check', mode: 'individual' });
  const room = await host.next('hosted');
  const phones = [];
  for (const name of ['Ada', 'Ben', 'Cam']) {
    const p = await connect(port); sockets.push(p);
    p.send({ t: 'join', pin: room.pin, name });
    await p.next('joined');
    phones.push(p);
  }
  host.send({ t: 'begin' });
  const words = 'Photosynthesis happens in the mitochondria, uses carbon dioxide and water, and releases oxygen.'.split(' ');
  host.send({ t: 'question', id: 'spot1', question: words.join(' '), input: 'tap', options: words, timeLimit: 0, points: 1000 });
  for (const p of phones) {
    const q = await p.next('question');
    assert.equal(q.input, 'tap');
    assert.deepEqual(q.options, words, 'phones get every word to tap');
  }
  phones[0].send({ t: 'answer', choice: 4 });
  phones[1].send({ t: 'answer', choice: 4 });
  phones[2].send({ t: 'answer', choice: 11 });   // past a choice question's six
  const tally = await host.until('tally', m => m.answered === 3);
  assert.equal(tally.counts.length, words.length);
  assert.equal(tally.counts[4], 2);
  assert.equal(tally.counts[11], 1);
});
