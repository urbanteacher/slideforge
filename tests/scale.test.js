'use strict';
/* Slider and scale. Both are "place yourself on a line", but they are
   different features: a slider is a knowledge check with a right answer and
   a tolerance, a scale gathers where the room stands and has no right answer
   at all. They share this file because they share the shape of the mistake —
   treating an ordered run of points as a set of unrelated options. */
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

async function room(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'slideforge-scale-'));
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
  host.send({ t: 'host', title: 'Estimates', mode: 'individual' });
  const hosted = await host.next('hosted');
  const join = async (name) => {
    const p = await connect(port);
    sockets.push(p);
    p.send({ t: 'join', pin: hosted.pin, name });
    await p.next('joined');
    return p;
  };
  return { host, hosted, join };
}

test('an estimate counts when it lands inside the band the author set', async (t) => {
  const { host, join } = await room(t);
  const ada = await join('Ada');
  const bo = await join('Bo');
  const cy = await join('Cy');
  host.send({ t: 'begin' });
  await ada.next('begun');

  host.send({ t: 'question', id: 's1', input: 'number', question: 'How many bones?',
    range: { min: 100, max: 300, step: 1, unit: 'bones' }, points: 1000, timeLimit: 0 });
  const asked = await ada.next('question');
  assert.equal(asked.input, 'number');
  assert.deepEqual(asked.range, { min: 100, max: 300, step: 1, unit: 'bones' });
  assert.equal(asked.count, 0, 'no options to lay out');
  await bo.next('question');
  await cy.next('question');

  ada.send({ t: 'answer', value: 206 });          // exact
  bo.send({ t: 'answer', value: 199 });           // inside ± 8
  cy.send({ t: 'answer', value: 240 });           // outside
  assert.equal((await ada.next('locked')).value, 206);
  await bo.next('locked');
  await cy.next('locked');

  const SF = loadModel();
  const slide = { style: 'slider', input: 'number', target: 206, tolerance: 8, unit: 'bones' };
  const tally = await reveal(host, { id: 's1', answer: '206 bones' },
    (a) => SF.markResponse(slide, a.response), 3);
  assert.deepEqual(tally.answers.map((a) => a.response).sort((x, y) => x - y), [199, 206, 240]);

  assert.equal((await ada.next('result')).right, true);
  assert.equal((await bo.next('result')).right, true, 'near enough is the skill being tested');
  assert.equal((await cy.next('result')).right, false);

  const r = await report(host);
  assert.equal(r.checks[0].input, 'number');
  const placed = Object.fromEntries(r.checks[0].responses.map((x) => [x.value, x.right]));
  assert.deepEqual(placed, { 206: true, 199: true, 240: false });
});

test('the relay keeps a value without judging it', async (t) => {
  const { host, join } = await room(t);
  const ada = await join('Ada');
  host.send({ t: 'begin' });
  await ada.next('begun');
  host.send({ t: 'question', id: 's1', input: 'number', question: 'Estimate',
    range: { min: 0, max: 10, step: 1, unit: '' }, points: 500, timeLimit: 0 });
  await ada.next('question');

  /* Outside the range the phone offered, but the relay does not own the
     range — the host marks. What it does refuse is a value that is not one. */
  ada.send({ t: 'answer', value: 'nine' });
  ada.send({ t: 'answer', value: Infinity });
  ada.send({ t: 'answer', value: 1e400 });
  ada.send({ t: 'answer', value: 99 });
  assert.equal((await ada.next('locked')).value, 99, 'the first real value wins');

  await reveal(host, { id: 's1', answer: '5' }, () => false, 1);
  assert.equal((await ada.next('result')).right, false);
  const r = await report(host);
  assert.equal(r.checks[0].responses.length, 1);
  assert.equal(r.checks[0].responses[0].value, 99);
});

test('a slider question marks on distance, and says so in the editor', () => {
  const SF = loadModel();
  const game = SF.makeGame('Estimates', 'slider');
  game.questions = [SF.normalizeQuestion({
    question: 'How many bones in an adult human body?',
    min: 100, max: 300, target: 206, tolerance: 8, unit: 'bones'
  }, 'slider')];
  const s = SF.compileGame(game, { intro: false, scoreSlide: false })[0];

  assert.equal(s.input, 'number');
  assert.equal(s.answer, '206 bones', 'the unit reads once, on the answer');
  assert.deepEqual(s.options, []);

  assert.equal(SF.markResponse(s, 206), true);
  assert.equal(SF.markResponse(s, 198), true);
  assert.equal(SF.markResponse(s, 214), true);
  assert.equal(SF.markResponse(s, 215), false);
  assert.equal(SF.markResponse(s, '206'), false, 'a string is not a placement');
  assert.equal(SF.markResponse(s, NaN), false);
  assert.equal(SF.markResponse(s, 0), false);

  // A symbol sits against the number, a word sits apart from it.
  assert.equal(SF.formatValue(37.5, '%'), '37.5%');
  assert.equal(SF.formatValue(206, 'bones'), '206 bones');
  assert.equal(SF.formatValue(0.30000000000000004, ''), '0.3');

  const style = SF.gameStyle('slider');
  assert.equal(style.summary(game.questions[0]), '206 ± 8 bones');
  assert.equal(style.describe(s, 199), '199 bones');

  /* Nonsense ranges are opened out as they are typed rather than left to fail
     in front of a room, and a tolerance wider than the line is not a
     question — every possible answer would be right. */
  const fixed = SF.normalizeQuestion({ question: 'Q', min: 80, max: 20, target: 50 }, 'slider');
  assert.ok(fixed.max > fixed.min);
  assert.ok(fixed.target >= fixed.min && fixed.target <= fixed.max);
  const wide = SF.normalizeQuestion({ question: 'Q', min: 0, max: 10, target: 5, tolerance: 999 }, 'slider');
  assert.equal(wide.tolerance, 10);
  assert.match(style.problems(wide, 2), /whole line/);
  assert.equal(style.problems(game.questions[0], 1), null);
});

test('a scale is answered like a poll and read as a distribution', async (t) => {
  const { host, join } = await room(t);
  const ada = await join('Ada');
  const bo = await join('Bo');
  const cy = await join('Cy');
  host.send({ t: 'begin' });
  await ada.next('begun');

  host.send({ t: 'prompt', id: 'f1', kind: 'scale', prompt: 'How confident?',
    options: ['1', '2', '3', '4', '5'], ends: { low: 'Not at all', high: 'Completely' }, max: 1 });
  const opened = await ada.next('prompt');
  assert.equal(opened.kind, 'scale');
  assert.deepEqual(opened.ends, { low: 'Not at all', high: 'Completely' });
  await bo.next('prompt');
  await cy.next('prompt');

  ada.send({ t: 'reply', choice: 4 });
  bo.send({ t: 'reply', choice: 4 });
  cy.send({ t: 'reply', choice: 0 });
  await ada.next('replied');
  await bo.next('replied');
  await cy.next('replied');

  /* Changing your mind is allowed: where you stand is a position, not a
     submission, so the last one wins rather than being refused as a quota. */
  cy.send({ t: 'reply', choice: 2 });
  await cy.next('replied');

  const d = await host.until('responses',
    (m) => (m.counts || []).reduce((a, b) => a + b, 0) === 3 && m.counts[2] === 1);
  assert.equal(d.kind, 'scale');
  assert.deepEqual(d.counts, [0, 0, 1, 0, 2]);
  assert.equal(d.total, 3);

  const r = await report(host);
  assert.equal(r.feedback[0].kind, 'scale');
  assert.equal(r.summary.feedbackActivities, 1);
  const said = r.feedback[0].responses.map((x) => x.values[0]).sort();
  assert.deepEqual(said, [2, 4, 4], 'the position, recorded per person');
});

test('a scale needs both ends named, and never more points than a phone can mean', () => {
  const SF = loadModel();

  const f = SF.makeFeedback('scale');
  assert.equal(f.points, 5, 'an odd count leaves a real middle to sit in');
  assert.equal(f.max, 1);
  assert.deepEqual(SF.scaleLabels(f), ['1', '2', '3', '4', '5']);

  const wide = SF.normalizeFeedback({ kind: 'scale', prompt: 'P', points: 11,
    lowLabel: 'No', highLabel: 'Yes' });
  assert.equal(wide.points, 5, 'eleven points is a distinction nobody makes honestly');
  assert.equal(SF.normalizeFeedback({ kind: 'scale', prompt: 'P', points: 7,
    lowLabel: 'No', highLabel: 'Yes' }).points, 7);

  /* Unnamed ends make the scale unreadable in both directions, so the slide
     collects nothing rather than putting a bare 1-to-5 on the wall. */
  const named = { kind: 'scale', prompt: 'How confident?', lowLabel: 'Not at all', highLabel: 'Completely' };
  assert.ok(SF.slideFeedback({ feedback: SF.normalizeFeedback(named) }));
  assert.equal(SF.slideFeedback({ feedback: SF.normalizeFeedback(
    Object.assign({}, named, { highLabel: '   ' })) }), null);
  assert.equal(SF.slideFeedback({ feedback: SF.normalizeFeedback(
    Object.assign({}, named, { lowLabel: '' })) }), null);
  assert.equal(SF.slideFeedback({ feedback: SF.normalizeFeedback(
    Object.assign({}, named, { prompt: '' })) }), null);
});
