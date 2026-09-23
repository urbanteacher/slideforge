'use strict';
/* The room's output lands (activities audit wave 2).
 *
 * The relay: during a note stage a phone may say that it has written
 * something, and the host is told how many have. Never the words, never who,
 * and only for the stage the room is in. The model: a poll or scale can be
 * held, so the wall shows how many have answered and not the split.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { freePort, start, connect, stop } = require('./harness');

function load() {
  const c = { window: {}, console,
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} } };
  vm.createContext(c);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'model.js'), 'utf8'), c);
  return c.window.SF;
}

test('a poll or a scale can be held; nothing else can', () => {
  const SF = load();
  const poll = SF.normalizeFeedback({ kind: 'poll', prompt: 'Where are you?', options: ['A', 'B'], hold: true });
  assert.equal(poll.hold, true);
  const scale = SF.normalizeFeedback({ kind: 'scale', prompt: 'How sure?', hold: true });
  assert.equal(scale.hold, true);
  assert.equal(SF.normalizeFeedback({ kind: 'brainstorm', prompt: 'Ideas', hold: true }).hold, undefined,
    'a brainstorm has no split to hold');
  assert.equal(SF.normalizeFeedback({ kind: 'poll', prompt: 'x', options: ['A', 'B'], hold: 'yes' }).hold, undefined,
    'only a real true');
  assert.equal(SF.normalizeFeedback({ kind: 'poll', prompt: 'x', options: ['A', 'B'] }).hold, undefined);
});

test('the two self-assessments arrive held', () => {
  const SF = load();
  for (const key of ['structured-reflection-protocol', 'reflection-ladder']) {
    const a = SF.Activities.activity(key);
    assert.equal(a.feedbackPreset.hold, true, key);
  }
  assert.ok(!SF.Activities.activity('exit-ticket').feedbackPreset.hold, 'an exit ticket is not a self-assessment');
});

test('the relay counts who has written in a note stage, and nothing more', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-wrote-'));
  const port = await freePort();
  const server = await start(port, dir);
  const sockets = [];
  t.after(async () => {
    await stop(server);
    sockets.forEach(s => s.socket.close());
    fs.rmSync(dir, { recursive: true, force: true });
  });
  const host = await connect(port); sockets.push(host);
  host.send({ t: 'host', title: 'Notes', mode: 'individual' });
  const room = await host.next('hosted');
  const ada = await connect(port); sockets.push(ada);
  ada.send({ t: 'join', pin: room.pin, name: 'Ada' });
  await ada.next('joined');
  const bo = await connect(port); sockets.push(bo);
  bo.send({ t: 'join', pin: room.pin, name: 'Bo' });
  await bo.next('joined');
  host.send({ t: 'begin' });
  /* A row the teacher entered has no phone to write on. */
  host.send({ t: 'manualAdd', names: ['Cy'] });

  const think = { i: 0, of: 4, name: 'Think', job: 'note', text: 'Sketch an idea.', seconds: 60, left: 60 };
  host.send({ t: 'at', slideId: 'tps', title: 'TPS', n: 1, total: 1, activity: 'content', stage: think });
  const zero = await host.until('wrote', m => m.slideId === 'tps' && m.stage === 0);
  assert.equal(zero.n, 0, 'a note stage starts its count at nought');
  assert.equal(zero.of, 2, 'phones only');

  ada.send({ t: 'wrote', slideId: 'tps', stage: 0, yes: true, text: 'my secret note' });
  const one = await host.until('wrote', m => m.n === 1);
  assert.deepEqual(Object.keys(one).sort(), ['n', 'of', 'slideId', 'stage', 't'], 'a count, never the words or who');

  /* A late message for another stage or slide does not count. */
  bo.send({ t: 'wrote', slideId: 'tps', stage: 2, yes: true });
  bo.send({ t: 'wrote', slideId: 'other', stage: 0, yes: true });
  ada.send({ t: 'wrote', slideId: 'tps', stage: 0, yes: true });
  bo.send({ t: 'wrote', slideId: 'tps', stage: 0, yes: true });
  const two = await host.until('wrote', m => m.n === 2);
  assert.equal(two.of, 2);

  /* Taking the words out takes the phone out of the count. */
  ada.send({ t: 'wrote', slideId: 'tps', stage: 0, yes: false });
  await host.until('wrote', m => m.n === 1);

  /* Pair is not a note stage: nothing to count, and a phone cannot start one. */
  host.send({ t: 'at', slideId: 'tps', title: 'TPS', n: 1, total: 1, activity: 'content',
    stage: { ...think, i: 1, name: 'Pair', job: 'talk' } });
  await ada.until('context', m => m.stage && m.stage.i === 1);
  ada.send({ t: 'wrote', slideId: 'tps', stage: 1, yes: true });

  /* A new note stage starts again from nought. */
  host.send({ t: 'at', slideId: 'tps2', title: 'Log', n: 2, total: 2, activity: 'content', stage: think });
  const fresh = await host.until('wrote', m => m.slideId === 'tps2');
  assert.equal(fresh.n, 0);
});
