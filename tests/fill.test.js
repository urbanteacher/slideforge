'use strict';
/* Fill the gaps: a passage with [gaps], a word bank with lures, and one
 * word-bank index per gap on the wire. */
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

test('a passage splits at its [gaps]', () => {
  const SF = load();
  const p = SF.fillParts('Water moves by [osmosis] across a [membrane].');
  assert.deepEqual(Array.from(p.gaps), ['osmosis', 'membrane']);
  assert.deepEqual(Array.from(p.parts), ['Water moves by ', ' across a ', '.']);
});

test('the library builds Fill in the Blanks as Fill the gaps, and an old ______ game heals', () => {
  const SF = load();
  const preset = SF.GAME_FORMAT_PRESETS['fill-in-the-blanks'];
  assert.equal(preset.style, 'fill');
  preset.seeds.forEach((q, i) => assert.equal(SF.gameStyle('fill').problems(q, i + 1), null, 'seed ' + (i + 1)));
  const old = SF.normalizeGame({ style: 'type', format: 'fill-in-the-blanks', title: 'Old',
    questions: [{ question: 'The organelle is the ______.', accept: ['ribosome'] }] });
  assert.equal(old.style, 'fill');
  assert.equal(old.questions[0].question, 'The organelle is the [ribosome].');
  assert.equal(old.questions[0].lures, '', 'no borrowed lures from another subject');
  assert.match(SF.gameStyle('fill').problems(old.questions[0], 1), /needs a lure/);
});

test('compiled: a shuffled bank, the answer per gap, held results, partial marks', () => {
  const SF = load();
  const g = SF.normalizeGame(SF.makeGame('Fill', 'fill'));
  g.questions = [SF.normalizeQuestion({ question: 'Plants make [glucose] by [photosynthesis].', lures: 'oxygen, respiration' }, 'fill')];
  const s = SF.compileGame(g).find(x => x.type === 'quiz');
  assert.equal(s.input, 'fill');
  assert.equal(s.options.length, 4);
  assert.deepEqual(Array.from(s.gapAnswers, i => s.options[i]), ['glucose', 'photosynthesis']);
  assert.equal(s.holdResults, true);
  assert.equal(SF.markResponse(s, Array.from(s.gapAnswers)), true);
  const half = [s.gapAnswers[0], s.options.indexOf('oxygen')];
  assert.equal(SF.markResponse(s, half), false);
  assert.equal(SF.fillScore(s, half), 0.5, 'one gap of two earns half');
  assert.equal(SF.correctAnswerLabel(s), 'glucose · photosynthesis');
});

test('the relay carries the passage, takes one word per gap, repeats allowed, and echoes it', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-fill-'));
  const port = await freePort();
  const server = await start(port, dir);
  const sockets = [];
  t.after(async () => { await stop(server); sockets.forEach(s => s.socket.close()); fs.rmSync(dir, { recursive: true, force: true }); });
  const host = await connect(port); sockets.push(host);
  host.send({ t: 'host', title: 'Fill', mode: 'individual' });
  const room = await host.next('hosted');
  const ada = await connect(port); sockets.push(ada);
  ada.send({ t: 'join', pin: room.pin, name: 'Ada' }); await ada.next('joined');
  host.send({ t: 'manualAdd', names: ['Bo'] });
  const roster = await host.until('players', m => m.list.length === 2);
  const bo = roster.list.find(p => p.name === 'Bo').id;
  host.send({ t: 'begin' });
  host.send({ t: 'question', id: 'f1', question: 'A _____ and a _____.', input: 'fill',
    options: ['cat', 'dog', 'eel'], fillParts: ['A ', ' and a ', '.'], timeLimit: 0, points: 1000 });
  const q = await ada.next('question');
  assert.equal(q.input, 'fill');
  assert.deepEqual(Array.from(q.fillParts), ['A ', ' and a ', '.']);
  assert.equal(q.gaps, 2);
  ada.send({ t: 'answer', fill: [0] });                  // too short: ignored
  ada.send({ t: 'answer', fill: [0, 7] });               // out of the bank: ignored
  ada.send({ t: 'answer', fill: [1, 1] });               // a word may fill two gaps
  const locked = await ada.until('locked', () => true);
  assert.deepEqual(Array.from(locked.fill), [1, 1]);
  host.send({ t: 'manualAnswer', id: 'f1', playerId: bo, fill: [0, 2] });
  const tally = await host.until('tally', m => m.answered === 2);
  const byName = Object.fromEntries(tally.answers.map(a => [a.name, Array.from(a.response)]));
  assert.deepEqual(byName.Ada, [1, 1]);
  assert.deepEqual(byName.Bo, [0, 2], 'teacher entry records a word per gap');
});
