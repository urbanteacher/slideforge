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

test('the source\'s own ways of writing a length parse', () => {
  const SF = load();
  assert.deepEqual({ ...SF.parseStageLabel('Rotate · every 4 min') }, { name: 'Rotate', seconds: 240 });
  assert.deepEqual({ ...SF.parseStageLabel('Warm up · about 2 min') }, { name: 'Warm up', seconds: 120 });
});

test('work stages, and talk in pairs or in groups', () => {
  const SF = load();
  assert.equal(SF.stageJob('Creating'), 'work');
  assert.equal(SF.stageJob('Self-assessment'), 'work');
  assert.equal(SF.stageJob('You do alone'), 'work', 'independent practice, not a private note');
  assert.equal(SF.stageJob('Think alone'), 'note');
  assert.equal(SF.stageJob('Teacher synthesizes'), 'down', 'the teacher is not "teach"');
  assert.equal(SF.stageJob('Gallery walk'), 'down');
  assert.equal(SF.stageCopy({ job: 'talk', group: true }).wall, 'Talk in your group');
  assert.equal(SF.stageCopy({ job: 'talk', group: false }).wall, 'Turn to your partner');
  assert.equal(SF.stageCopy({ job: 'work' }).wall, 'Work on the task');
});

test('a leading untimed row is the brief, and stays out of the stages', () => {
  const SF = load();
  const slide = SF.makeSlide('keywords');
  slide.activity = 'socratic-seminar';
  slide.bullets = ['Discussion prompt: Is bigger always better?', 'Inner circle · 8 min: Argue.',
    'Switch · 8 min: Swap.', 'Debrief · 4 min: What changed?'].map(l => {
    const [term, def] = l.split(': ');
    return SF.formatKeywordLine(term, def);
  });
  const brief = SF.activityBrief(slide);
  assert.equal(brief.name, 'Discussion prompt');
  assert.match(brief.text, /bigger/);
  const stages = SF.activityStages(slide);
  assert.deepEqual(Array.from(stages, s => s.name), ['Inner circle', 'Switch', 'Debrief']);
  assert.deepEqual(Array.from(stages, s => s.row), [1, 2, 3], 'each stage still edits its own row');
  assert.deepEqual(Array.from(stages, s => s.i), [0, 1, 2]);
  slide.bullets = slide.bullets.slice(0, 2);
  assert.equal(SF.activityBrief(slide), null, 'one timed row after it is not enough to be a brief');
});

/* Every staged routine, read as its stages. A change to the job words that
   moves one of these moves what a room is told to do. */
const STAGED = {
  'think-pair-share': ['Think note', 'Pair talk', 'Share send', 'Connect down'],
  'think-pair-square-share': ['Think note', 'Pair talk', 'Square group', 'Share send'],
  'jigsaw-expert-groups': ['Home groups group', 'Expert groups group', 'Return home group'],
  'jigsaw-collaboration': ['Home group', 'Expert group', 'Return group'],
  'peer-teaching-carousel': ['Rotate work', 'Final round work', 'Present down'],
  'socratic-seminar': ['Inner circle group', 'Switch group', 'Debrief down'],
  'teach-someone': ['Partner A talk', 'Partner B talk', 'Switch talk', 'Together talk'],
  'whiteboards-on-walls': ['Discuss and draw group', 'Gallery walk down', 'Refine work', 'Debrief down'],
  'i-do-we-do-you-do': ['I do down', 'We do down', 'You do together group', 'You do alone work'],
  'design-and-create-task': ['Planning work', 'Creating work', 'Self-assessment work', 'Gallery walk down']
};

test('every staged routine arrives as stages, with jobs that fit it', () => {
  const SF = load();
  const staged = Array.from(SF.Activities.ACTIVITIES.filter(a => a.presentation === "stages"), a => a.key);
  assert.deepEqual(staged.sort(), Object.keys(STAGED).sort());
  for (const [key, want] of Object.entries(STAGED)) {
    const a = SF.Activities.activity(key);
    const slide = SF.makeSlide('keywords');
    slide.activity = key;
    slide.activityPresentation = 'stages';
    slide.bullets = a.fields.filter(f => /^bullets\.\d+\.def$/.test(f.slide))
      .map(f => SF.formatKeywordLine(f.label, f.value));
    const got = Array.from(SF.activityStages(slide), s => s.name + ' ' + (s.group ? 'group' : s.job));
    assert.deepEqual(got, want, key);
  }
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
    { i: 0, of: 4, name: 'Think', job: 'note', group: false, text: 'Sketch an idea.', brief: '',
      seconds: 60, left: 58, next: 'Pair' });

  host.send({ t: 'at', slideId: 'tps', title: 'Think-Pair-Share', n: 1, total: 1, activity: 'content',
    stage: { i: 99, of: 4, name: 'x'.repeat(500), job: 'take-over', seconds: 1e9, left: -5 } });
  const odd = await phone.until('context', m => m.slideId === 'tps' && m.stage && m.stage.i !== 0);
  assert.equal(odd.stage.i, 7);
  assert.equal(odd.stage.job, 'down', 'an unknown job is phones-down');
  assert.equal(odd.stage.seconds, 3600);
  assert.equal(odd.stage.left, 0);
  assert.equal(odd.stage.name.length, 60);

  host.send({ t: 'at', slideId: 'tps', title: 'Design', n: 1, total: 1, activity: 'content',
    stage: { i: 1, of: 4, name: 'Creating', job: 'work', group: 'yes', brief: 'b'.repeat(900) } });
  const work = await phone.until('context', m => m.slideId === 'tps' && m.stage && m.stage.job === 'work');
  assert.equal(work.stage.group, false, 'only a real true is a group');
  assert.equal(work.stage.brief.length, 400);

  host.send({ t: 'at', slideId: 'next', title: 'After', n: 2, total: 2, activity: 'content' });
  const after = await phone.until('context', m => m.slideId === 'next');
  assert.equal(after.stage, null, 'off a staged slide there is no stage');
});
