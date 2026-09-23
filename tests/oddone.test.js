'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { freePort, start, connect, stop } = require('./harness');

function load() {
  const ctx = { window: {}, console };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, '../js/model.js'), 'utf8'),
    ctx
  );
  return ctx.window.SF;
}

test('odd-one-out maps to oddone and is special', () => {
  const SF = load();
  assert.equal(SF.formatStyle('odd-one-out'), 'oddone');
  assert.ok(SF.isSpecialStyle('oddone'));
});

test('makeGame seeds four discuss sets with scoreboard off', () => {
  const SF = load();
  const game = SF.makeGame('Odd ones', 'oddone');
  assert.equal(game.settings.scoreboard, false);
  assert.equal(game.settings.defaultPoints, 0);
  assert.equal(game.settings.defaultTime, 0);
  assert.equal(game.questions.length, 4);
  assert.ok(game.questions.every((q) => q.options.filter(Boolean).length === 4));
  assert.ok(game.questions.every((q) => String(q.explanation).trim()));
});

test('compile is a vote: held until the reveal, unmarked, no points or timer', () => {
  const SF = load();
  const game = SF.makeGame('Odd ones', 'oddone');
  const original = JSON.stringify(game);
  const slides = SF.compileGame(game, { intro: false, scoreSlide: false });
  const quizzes = slides.filter((s) => s.type === 'quiz');
  assert.equal(quizzes.length, 4);
  quizzes.forEach((s) => {
    assert.equal(s.style, 'oddone');
    assert.equal(s.input, 'choice');
    assert.equal(s.points, 0);
    assert.equal(s.timeLimit, 0);
    assert.equal(s.voteOnly, false, 'Next reveals the split; it is not a vote that never resolves');
    assert.equal(s.holdResults, true, 'the split waits for the reveal');
    assert.equal(s.unmarked, true, 'a pick is not an answer');
    assert.equal(s.oddoneDiscuss, true);
    assert.equal(s.hideAnswerUntilReveal, true);
    assert.equal(s.options.length, 4);
    assert.ok(s.correct >= 0 && s.correct < 4);
  });
  assert.equal(JSON.stringify(game), original);
});

test('old choice odd-one-out heals into oddone', () => {
  const SF = load();
  const healed = SF.normalizeGame({
    title: 'Old odd',
    format: 'odd-one-out',
    style: 'choice',
    settings: { scoreboard: true, defaultPoints: 1000 },
    questions: [{
      id: 'q1',
      question: 'Which is odd?',
      options: ['A', 'B', 'C', 'D'],
      correct: 2,
      explanation: 'C does not belong.'
    }]
  });
  assert.equal(healed.style, 'oddone');
  assert.equal(healed.questions[0].correct, 2);
  assert.equal(healed.questions[0].options[2], 'C');
});

test('board readiness wants 3–10 sets', () => {
  const SF = load();
  const style = SF.gameStyle('oddone');
  assert.match(style.board({ questions: [{}, {}] }), /at least 3/);
  assert.equal(style.board({ questions: [{}, {}, {}] }), null);
  assert.equal(style.board({ questions: new Array(10).fill({}) }), null);
  assert.match(style.board({ questions: new Array(11).fill({}) }), /at most 10/);
});

test('problems require four distinct items and an explanation', () => {
  const SF = load();
  const style = SF.gameStyle('oddone');
  assert.match(style.problems({ options: ['A', 'B', ''], correct: 0 }, 1), /four items/);
  assert.match(style.problems({
    options: ['A', 'A', 'B', 'C'], correct: 0, explanation: 'why'
  }, 1), /two items/);
  assert.match(style.problems({
    options: ['A', 'B', 'C', 'D'], correct: 0, explanation: ''
  }, 1), /explanation/);
  assert.equal(style.problems({
    options: ['A', 'B', 'C', 'D'], correct: 1, explanation: 'B is odd'
  }, 1), null);
});

test('the relay takes the vote, marks nobody and tells each phone what it picked', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-oddone-'));
  const port = await freePort();
  const server = await start(port, dir);
  const sockets = [];
  t.after(async () => { await stop(server); sockets.forEach(s => s.socket.close()); fs.rmSync(dir, { recursive: true, force: true }); });
  const host = await connect(port); sockets.push(host);
  host.send({ t: 'host', title: 'Odd', mode: 'individual' });
  const room = await host.next('hosted');
  const ada = await connect(port), ben = await connect(port); sockets.push(ada, ben);
  ada.send({ t: 'join', pin: room.pin, name: 'Ada' }); ben.send({ t: 'join', pin: room.pin, name: 'Ben' });
  await ada.next('joined'); await ben.next('joined');
  host.send({ t: 'begin' });
  host.send({ t: 'question', id: 'odd1', question: 'Which is the odd one out?', input: 'choice',
    options: ['Iron', 'Copper', 'Oxygen', 'Zinc'], unmarked: true, points: 0, timeLimit: 0 });
  await ada.next('question'); await ben.next('question');
  ada.send({ t: 'answer', choice: 2 });
  ben.send({ t: 'answer', choice: 3 });
  const tally = await host.until('tally', m => m.answered === 2);
  host.send({ t: 'reveal', id: 'odd1', rev: tally.rev, marks: [], correct: 2, answer: 'Oxygen', explanation: 'A non-metal.' });
  const a = await ada.until('result', () => true), b = await ben.until('result', () => true);
  assert.equal(a.unmarked, true);
  assert.equal(a.picked, 'Oxygen');
  assert.equal(b.picked, 'Zinc', 'the other pick is reported, not judged');
  assert.equal(a.right, null); assert.equal(b.right, null);
  assert.equal(b.asked, 0, 'a vote does not count as a question asked');
  assert.equal(b.score, 0);
});
