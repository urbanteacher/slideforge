'use strict';
/* Think-Pair-Share as timed stages.
 *
 * The engine: an activity's rows read as stages — a name, a length and what
 * the stage asks of the phones — so nothing new is authored and a routine this
 * code has never heard of still gets a track and clocks. The library: Think-
 * Pair-Share arrives as stages. The relay: the stage reaches the phones, and
 * only the fields they need, each bounded.
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

test('a stage label gives its name and its length', () => {
  const SF = load();
  assert.deepEqual({ ...SF.parseStageLabel('Think · 1 min') }, { name: 'Think', seconds: 60 });
  assert.deepEqual({ ...SF.parseStageLabel('Pair - 2 mins') }, { name: 'Pair', seconds: 120 });
  assert.deepEqual({ ...SF.parseStageLabel('Teacher synthesizes (1 min)') }, { name: 'Teacher synthesizes', seconds: 60 });
  assert.deepEqual({ ...SF.parseStageLabel('Quick check · 45 s') }, { name: 'Quick check', seconds: 45 });
  assert.deepEqual({ ...SF.parseStageLabel('Discuss') }, { name: 'Discuss', seconds: 0 }, 'no time, no clock');
});

test('what a stage asks of the phones is read off its name', () => {
  const SF = load();
  assert.equal(SF.stageJob('Think'), 'note');
  assert.equal(SF.stageJob('Pair'), 'talk');
  assert.equal(SF.stageJob('Share with partner'), 'talk', 'two people comparing notes');
  assert.equal(SF.stageJob('Pairs share best ideas'), 'send', 'pairs reporting out');
  assert.equal(SF.stageJob('Share'), 'send');
  assert.equal(SF.stageJob('Connect'), 'down');
  assert.equal(SF.stageJob('Something new'), 'down', 'unknown: phones are told to look up');
});

test('Think-Pair-Share arrives as four timed stages', () => {
  const SF = load();
  const a = SF.Activities ? SF.Activities.activity('think-pair-share') : null;
  assert.ok(a, 'the catalogue has it');
  assert.equal(a.presentation, 'stages');
  const slide = SF.makeSlide('keywords');
  slide.activity = a.key;
  slide.activityPresentation = a.presentation;
  slide.bullets = a.fields.filter(f => /^bullets\.\d+\.def$/.test(f.slide))
    .map(f => SF.formatKeywordLine(f.label, f.value));
  const stages = SF.activityStages(slide);
  assert.deepEqual(Array.from(stages, s => s.name), ['Think', 'Pair', 'Share', 'Connect']);
  assert.deepEqual(Array.from(stages, s => s.seconds), [60, 120, 180, 60]);
  assert.deepEqual(Array.from(stages, s => s.job), ['note', 'talk', 'send', 'down']);
  assert.match(stages[0].text, /perimeter/);
});

test('the relay passes the stage to the phones, cleaned', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-stages-'));
  const port = await freePort();
  const server = await start(port, dir);
  const sockets = [];
  t.after(async () => {
    await stop(server);
    sockets.forEach(s => s.socket.close());
    fs.rmSync(dir, { recursive: true, force: true });
  });
  const host = await connect(port); sockets.push(host);
  host.send({ t: 'host', title: 'Stages', mode: 'individual' });
  const room = await host.next('hosted');
  const phone = await connect(port); sockets.push(phone);
  phone.send({ t: 'join', pin: room.pin, name: 'Ada' });
  await phone.next('joined');
  host.send({ t: 'begin' });

  host.send({ t: 'at', slideId: 'tps', title: 'Think-Pair-Share', n: 1, total: 1, activity: 'content',
    stage: { i: 0, of: 4, name: 'Think', job: 'note', text: 'Sketch an idea.', seconds: 60, left: 58,
      next: 'Pair', secret: 'not for phones' } });
  const first = await phone.until('context', m => m.slideId === 'tps' && m.stage);
  assert.deepEqual({ ...first.stage },
    { i: 0, of: 4, name: 'Think', job: 'note', text: 'Sketch an idea.', seconds: 60, left: 58, next: 'Pair' });

  host.send({ t: 'at', slideId: 'tps', title: 'Think-Pair-Share', n: 1, total: 1, activity: 'content',
    stage: { i: 99, of: 4, name: 'x'.repeat(500), job: 'take-over', seconds: 1e9, left: -5 } });
  const odd = await phone.until('context', m => m.slideId === 'tps' && m.stage && m.stage.i !== 0);
  assert.equal(odd.stage.i, 7);
  assert.equal(odd.stage.job, 'down', 'an unknown job is phones-down');
  assert.equal(odd.stage.seconds, 3600);
  assert.equal(odd.stage.left, 0);
  assert.equal(odd.stage.name.length, 60);

  host.send({ t: 'at', slideId: 'next', title: 'After', n: 2, total: 2, activity: 'content' });
  const after = await phone.until('context', m => m.slideId === 'next');
  assert.equal(after.stage, null, 'off a staged slide there is no stage');
});
