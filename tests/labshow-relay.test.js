'use strict';
/* A lab game, through a real relay to real phones.
 *
 * The lab builds a game's question slide with SlideForge's own question on it (lab/src/assets/
 * games.json, compiled by SlideForge) and the Game panel's settings; src/deck/labshow.js turns it
 * into SlideForge's quiz slide. Here that slide is asked the way js/live.js asks one, answered from
 * phones, marked by SlideForge's own markResponse, and scored by the relay with the lab's points.
 * If the bridge dropped a field the phones or the marking need, this is where it shows.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ROOT, freePort, start, connect, stop, reveal } = require('./harness');

function loadModel() {
  const sandbox = {};
  global.window = sandbox;
  delete require.cache[require.resolve('../js/model.js')];
  require('../js/model.js');
  delete global.window;
  return sandbox.SF;
}
const SF = loadModel();
const games = JSON.parse(fs.readFileSync(path.join(ROOT, 'lab/src/assets/games.json'), 'utf8')).games;

/** The first question of a SlideForge game, as the lab's slide carries it, through the bridge. */
function labQuestion(format, settings) {
  const g = games.find((x) => x.format === format);
  const quiz = g.slides.find((s) => s.type === 'quiz');
  const game = (role, extra = {}) => ({ id: 'lab-' + format, format, label: g.label, role, key: '0', settings, ...extra });
  const out = SF.labShowSlides([
    { id: 'q', image: '', notes: '', hidden: false, name: 'q', game: game('question', { quiz }) },
    { id: 'a', image: '', notes: '', hidden: false, name: 'a', game: game('answer') },
  ]);
  assert.equal(out.length, 1);
  return out[0].sf;
}

/** What js/live.js sendOpenQuestion sends for a slide, in the parts the relay reads. */
function ask(s) {
  const msg = { t: 'question', id: s.id, question: s.question, input: s.input || 'choice', points: s.points, timeLimit: s.timeLimit };
  if (s.input !== 'text' && s.input !== 'number') msg.options = s.options;
  if (s.input === 'number') msg.range = { min: s.min, max: s.max, step: s.step, unit: s.unit || '' };
  return msg;
}

async function room(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'slideforge-labshow-'));
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
  host.send({ t: 'host', title: 'Lab games', mode: 'individual' });
  const hosted = await host.next('hosted');
  const join = async (name) => {
    const p = await connect(port);
    sockets.push(p);
    p.send({ t: 'join', pin: hosted.pin, name });
    await p.next('joined');
    return p;
  };
  return { host, join };
}

test('a lab multiple-choice question is asked, marked and scored with the lab’s points', async (t) => {
  const s = labQuestion('choice', { seconds: 0, points: 250 });
  const { host, join } = await room(t);
  const ada = await join('Ada'), bo = await join('Bo');
  host.send({ t: 'begin' });
  await ada.next('begun');
  host.send(ask(s));
  const asked = await ada.next('question');
  await bo.next('question');
  assert.equal(asked.question, s.question);
  assert.deepEqual(asked.options, s.options);
  ada.send({ t: 'answer', choice: s.correct });
  bo.send({ t: 'answer', choice: (s.correct + 1) % s.options.length });
  await ada.next('locked');
  await bo.next('locked');
  await reveal(host, { id: s.id, correct: s.correct, answer: s.options[s.correct] }, (a) => SF.markResponse(s, a.response), 2);
  const a = await ada.next('result'), b = await bo.next('result');
  assert.equal(a.right, true);
  assert.equal(a.gained, 250, 'the Game panel’s points');
  assert.equal(b.right, false);
});

test('a lab typed answer counts a spelling the Game panel added', async (t) => {
  const s = labQuestion('type', { accept: ['the powerhouse organelle'] });
  const { host, join } = await room(t);
  const ada = await join('Ada');
  host.send({ t: 'begin' });
  await ada.next('begun');
  host.send(ask(s));
  const asked = await ada.next('question');
  assert.equal(asked.input, 'text');
  ada.send({ t: 'answer', text: 'the powerhouse organelle' });
  await ada.next('locked');
  await reveal(host, { id: s.id, correct: -1, answer: s.answer }, (a) => SF.markResponse(s, a.response), 1);
  assert.equal((await ada.next('result')).right, true);
});

test('a lab number line marks inside the tolerance the Game panel set, and not outside it', async (t) => {
  const s = labQuestion('slider', { tolerance: 10 });
  const { host, join } = await room(t);
  const ada = await join('Ada'), bo = await join('Bo');
  host.send({ t: 'begin' });
  await ada.next('begun');
  host.send(ask(s));
  const asked = await ada.next('question');
  await bo.next('question');
  assert.equal(asked.input, 'number');
  ada.send({ t: 'answer', value: s.target + 8 });
  bo.send({ t: 'answer', value: s.target + 20 });
  await ada.next('locked');
  await bo.next('locked');
  await reveal(host, { id: s.id, correct: -1, answer: String(s.target) }, (a) => SF.markResponse(s, a.response), 2);
  assert.equal((await ada.next('result')).right, true, 'within 10');
  assert.equal((await bo.next('result')).right, false, 'outside 10');
});
