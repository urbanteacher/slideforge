'use strict';
/* Marking moved out of the relay and onto the host, which is what makes a
   typed answer possible at all: the relay used to compare option indices, so
   a question with no options could not be scored. Two things are tested here.

   1. The relay scores from the verdicts it is sent and no longer forms an
      opinion of its own. The clearest way to show that is to mark an answer
      right that the "correct" index says is wrong, and watch it score.
   2. The marking rules themselves, which now live in js/model.js and run on
      the host. Loaded straight into node — model.js deliberately touches no
      DOM, so it is testable without a browser. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { ROOT, freePort, start, connect, stop, report, reveal } = require('./harness');

function fakeEl(tag, cls, text) {
  const n = { tagName: String(tag), className: cls || '', childNodes: [] };
  n.appendChild = function (c) { n.childNodes.push(c); return c; };
  Object.defineProperty(n, 'firstChild', { get: function () { return n.childNodes[0] || null; } });
  Object.defineProperty(n, 'textContent', {
    get: function () { return n.childNodes.map(function (c) { return c.textContent || ''; }).join(''); },
    set: function (v) { n.childNodes = [{ textContent: String(v == null ? '' : v) }]; }
  });
  if (text != null) n.textContent = text;
  return n;
}
function loadReports(opts) {
  const el = opts && opts.dom ? fakeEl : () => {};
  const ctx = {
    window: null, document: { createTextNode: (t) => ({ textContent: String(t) }) },
    localStorage: { getItem: () => null }, SF: { el: el, LETTERS: 'ABCDEFGH' }, console
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/reports.js'), 'utf8'), ctx);
  return ctx.SF;
}

function loadModel() {
  const sandbox = {};
  global.window = sandbox;
  delete require.cache[require.resolve('../js/model.js')];
  require('../js/model.js');
  delete global.window;
  return sandbox.SF;
}

async function room(t, opts = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'slideforge-marking-'));
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
  host.send({ t: 'host', title: opts.title || 'Marking', mode: 'individual' });
  const hosted = await host.next('hosted');
  const join = async (name) => {
    const p = await connect(port);
    sockets.push(p);
    p.send({ t: 'join', pin: hosted.pin, name });
    await p.next('joined');
    return p;
  };
  return { port, host, hosted, join };
}

test('the relay scores the host\'s verdicts and not the correct index', async (t) => {
  const { host, join } = await room(t);
  const ada = await join('Ada');
  const bo = await join('Bo');
  host.send({ t: 'begin' });
  await ada.next('begun');

  host.send({ t: 'question', id: 'q1', question: 'Which one?', options: ['A', 'B'], points: 1000, timeLimit: 0 });
  await ada.next('question');
  await bo.next('question');
  ada.send({ t: 'answer', choice: 0 });
  bo.send({ t: 'answer', choice: 1 });
  await ada.next('locked');
  await bo.next('locked');

  /* Deliberately inverted: correct says A, the verdicts say B was right. If
     the relay still had an opinion about option indices, Ada would score. */
  await reveal(host, { id: 'q1', correct: 0, answer: 'A' }, (a) => a.response === 1, 2);

  const adaResult = await ada.next('result');
  const boResult = await bo.next('result');
  assert.equal(adaResult.right, false, 'the index said Ada was right; the host did not');
  assert.equal(adaResult.gained, 0);
  assert.equal(boResult.right, true);
  assert.equal(boResult.gained, 1000);

  const r = await report(host);
  const byName = Object.fromEntries(r.attendance.map((p) => [p.name, p]));
  assert.equal(byName.Ada.questionsCorrect, 0);
  assert.equal(byName.Bo.questionsCorrect, 1);
  assert.equal(byName.Bo.score, 1000);
});

test('a withheld answer is recorded as withheld, not as forgotten', async (t) => {
  const { host, join } = await room(t);
  const ada = await join('Ada');
  const bo = await join('Bo');
  host.send({ t: 'begin' });
  await ada.next('begun');

  /* The first half of a peer-instruction pair. It is never revealed, on
     purpose. The relay records that intent and nothing else changes: the
     phones are told about the question in exactly the same terms, because
     answering it is no different and telling them would only leak that an
     answer is coming later. */
  host.send({ t: 'question', id: 'q1', question: 'Which one?', options: ['A', 'B'],
    voteOnly: true, points: 1000, timeLimit: 0 });
  const asked = await ada.next('question');
  assert.equal('voteOnly' in asked, false, 'the phone is not told, and does not need to be');
  await bo.next('question');
  ada.send({ t: 'answer', choice: 0 });
  bo.send({ t: 'answer', choice: 1 });
  await ada.next('locked');
  await bo.next('locked');

  /* The re-vote, which is the one that resolves and the one that scores. */
  host.send({ t: 'question', id: 'q2', question: 'Which one?', options: ['A', 'B'],
    points: 1000, timeLimit: 0 });
  await ada.next('question');
  await bo.next('question');
  ada.send({ t: 'answer', choice: 1 });
  bo.send({ t: 'answer', choice: 1 });
  await ada.next('locked');
  await bo.next('locked');
  await reveal(host, { id: 'q2', correct: 1, answer: 'B' }, (a) => a.response === 1, 2);
  await ada.next('result');

  const r = await report(host);
  assert.equal(r.checks.length, 2);

  /* Both facts have to survive the journal for the Adapt report to tell the
     two cases apart — see the vote-only test in adapt.test.js. voteOnly rides
     into the projection inside the question event's payload rather than being
     copied field by field, which is exactly the kind of thing that stops
     working quietly. */
  assert.equal(r.checks[0].voteOnly, true);
  assert.equal(r.checks[0].revealedAt, null);
  assert.equal(r.checks[0].responses.length, 2, 'the votes are still collected');
  assert.equal(r.checks[1].voteOnly, false);
  assert.ok(r.checks[1].revealedAt);

  /* And the unresolved first vote scores nobody, so the re-vote after the
     argument is the only measurement. */
  const byName = Object.fromEntries(r.attendance.map((p) => [p.name, p]));
  assert.equal(byName.Ada.score, 1000);
  assert.equal(byName.Ada.questionsCorrect, 1);
});

test('a typed question carries no options, and is answered with text', async (t) => {
  const { host, join } = await room(t);
  const ada = await join('Ada');
  const bo = await join('Bo');
  const cy = await join('Cy');
  host.send({ t: 'begin' });
  await ada.next('begun');

  /* No options at all. The old relay rejected this outright — it required
     between two and six of them. */
  host.send({ t: 'question', id: 't1', input: 'text', question: 'Capital of France?', points: 1000, timeLimit: 0 });
  const asked = await ada.next('question');
  assert.equal(asked.input, 'text', 'the phone has to know to show a field, not pads');
  assert.equal(asked.count, 0);
  await bo.next('question');
  await cy.next('question');

  ada.send({ t: 'answer', text: '  Paris  ' });
  bo.send({ t: 'answer', text: 'paris' });
  cy.send({ t: 'answer', text: 'Lyon' });
  const locked = await ada.next('locked');
  assert.equal(locked.text, 'Paris', 'echoed back trimmed, so the phone shows what was sent');
  await bo.next('locked');
  await cy.next('locked');

  /* A choice question's counts mean nothing here; the host is sent the text
     because it is the host that marks. It must not put it on the wall until
     the reveal, which is a screen concern, not a relay one. */
  const SF = loadModel();
  const slide = { style: 'type', input: 'text', accept: ['Paris'], allowTypos: true };
  const tally = await reveal(host, { id: 't1', answer: 'Paris' },
    (a) => SF.markResponse(slide, a.response), 3);
  assert.deepEqual(tally.counts, []);
  assert.deepEqual(tally.answers.map((a) => a.response).sort(), ['Lyon', 'Paris', 'paris']);

  assert.equal((await ada.next('result')).right, true);
  assert.equal((await bo.next('result')).right, true, 'case is not the answer');
  assert.equal((await cy.next('result')).right, false);

  const r = await report(host);
  assert.equal(r.checks[0].input, 'text');
  const said = Object.fromEntries(r.checks[0].responses.map((x) => [x.text, x.right]));
  assert.deepEqual(said, { Paris: true, paris: true, Lyon: false });
  assert.equal(r.attendance.find((p) => p.name === 'Cy').questionsCorrect, 0);
});

test('an answer landing after the host marked is not scored wrong for it', async (t) => {
  const { host, join } = await room(t);
  const ada = await join('Ada');
  const bo = await join('Bo');
  host.send({ t: 'begin' });
  await ada.next('begun');
  host.send({ t: 'question', id: 'q1', question: 'Which one?', options: ['A', 'B'], points: 1000, timeLimit: 0 });
  await ada.next('question');
  await bo.next('question');

  /* Mark a snapshot holding only Ada, then let Bo answer before the reveal
     is sent. Bo is in the room's answers but not in the verdicts. */
  ada.send({ t: 'answer', choice: 0 });
  await ada.next('locked');
  const stale = await host.until('tally', (m) => (m.answers || []).length === 1);
  bo.send({ t: 'answer', choice: 0 });
  await bo.next('locked');

  host.send({ t: 'reveal', id: 'q1', correct: 0, answer: 'A', rev: stale.rev,
    marks: stale.answers.map((a) => [a.id, true]) });

  /* Bounced rather than silently scoring Bo wrong. */
  const bounce = await host.next('markStale');
  assert.equal(bounce.id, 'q1');
  assert.equal(bounce.answers.length, 2, 'the answers handed back are the final set');

  /* Answering is closed by the first reveal attempt, so this re-mark works on
     a set that cannot grow again and cannot bounce a second time. */
  host.send({ t: 'reveal', id: 'q1', correct: 0, answer: 'A', rev: bounce.rev,
    marks: bounce.answers.map((a) => [a.id, a.response === 0]) });
  assert.equal((await ada.next('result')).gained, 1000);
  assert.equal((await bo.next('result')).gained, 1000, 'Bo answered in time and was marked');
});

test('once the host starts revealing, a late answer is refused rather than half-counted', async (t) => {
  const { host, join } = await room(t);
  const ada = await join('Ada');
  const bo = await join('Bo');
  host.send({ t: 'begin' });
  await ada.next('begun');
  host.send({ t: 'question', id: 'q1', question: 'Which one?', options: ['A', 'B'], points: 1000, timeLimit: 0 });
  await ada.next('question');
  await bo.next('question');
  ada.send({ t: 'answer', choice: 0 });
  await ada.next('locked');
  await reveal(host, { id: 'q1', correct: 0, answer: 'A' }, null, 1);
  await ada.next('result');

  bo.send({ t: 'answer', choice: 0 });
  const boResult = await bo.next('result');
  assert.equal(boResult.answered, false, 'the reveal had already gone out');
  assert.equal(boResult.gained, 0);
  const r = await report(host);
  assert.equal(r.checks[0].responses.length, 1);
});

test('typed answers are marked on meaning, not on characters', async () => {
  const SF = loadModel();
  const mark = (accept, given, typos) => SF.markTyped(accept, given, typos).right;

  // Case, accents, punctuation, spacing and a leading article never decide it.
  assert.equal(mark(['Photosynthesis'], 'photosynthesis'), true);
  assert.equal(mark(['café'], 'cafe'), true);
  assert.equal(mark(['photosynthesis'], '  the photosynthesis!  '), true);
  assert.equal(mark(["don't"], 'dont'), true);

  // Any listed spelling counts, and the answer is not one of them by accident.
  assert.equal(mark(['water', 'H2O'], 'h2o'), true);
  assert.equal(mark(['water', 'H2O'], 'hydrogen'), false);

  // Figures compare as figures, not as strings of digits.
  assert.equal(mark(['1000'], '1,000'), true);
  assert.equal(mark(['0.5'], '.5'), true);
  assert.equal(mark(['0.5'], '0.50'), true);
  assert.equal(mark(['1000'], '100'), false);

  /* A slip of the thumb in a long word is still knowledge. One wrong letter
     in a short word is a different word, so it is not forgiven — and a digit
     is never a typo, or 1500 would pass for 1600. */
  assert.equal(mark(['mitochondria'], 'mitochondra'), true);
  assert.equal(mark(['cell'], 'bell'), false);
  assert.equal(mark(['cell'], 'cells'), false);
  assert.equal(mark(['1969'], '1968'), false);
  assert.equal(mark(['photosynthesis'], 'respiration'), false);

  // Turning tolerance off means exactly what it says.
  assert.equal(mark(['mitochondria'], 'mitochondra', false), false);
  assert.equal(mark(['mitochondria'], 'MITOCHONDRIA', false), true);

  // Nothing typed is not a right answer.
  assert.equal(mark(['anything'], ''), false);
  assert.equal(mark(['anything'], '   '), false);

  // It reports which listed spelling it took, for the host to show.
  assert.deepEqual(SF.markTyped(['H2O', 'water'], 'Water', true),
    { right: true, matched: 'water', distance: 0 });
});

test('a typed question compiles to a slide the player can already render', async () => {
  const SF = loadModel();
  const game = SF.makeGame('Recall', 'type');
  game.questions = [SF.normalizeQuestion({
    question: 'Capital of France?', accept: ['Paris'], explanation: 'On the Seine.'
  }, 'type')];
  const slides = SF.compileGame(game, { intro: false, scoreSlide: false });
  const s = slides[0];
  assert.equal(s.type, 'quiz', 'reuses the question slide, and its type sizing with it');
  assert.equal(s.input, 'text');
  assert.deepEqual(s.options, [], 'nothing for the room to recognize the answer from');
  assert.equal(s.answer, 'Paris', 'the first accepted spelling is the one shown');
  assert.equal(s.explanation, 'On the Seine.');
  assert.equal(SF.markResponse(s, 'paris'), true);
  assert.equal(SF.markResponse(s, 'Lyon'), false);
  assert.equal(SF.markResponse(s, 0), false, 'an option index means nothing here');

  /* Converting an existing multiple-choice question keeps the author's work:
     the answer they marked correct becomes the answer they accept. */
  const converted = SF.normalizeQuestion(
    { question: 'Capital?', options: ['Lyon', 'Paris'], correct: 1 }, 'type');
  assert.deepEqual(converted.accept, ['Paris']);
  assert.equal(converted.options, undefined);

  // A question with nothing to accept is reported rather than silently unmarkable.
  const empty = SF.normalizeQuestion({ question: 'Capital?', accept: [''] }, 'type');
  assert.match(SF.gameStyle('type').problems(empty, 3), /no accepted answer/);
});

test('a typed answer reaches the export as the text they typed', () => {
  /* The report table and the answers CSV both used to read the option list to
     name an answer, which is nothing at all for a question without options. */
  const Reports = loadReports().Reports;
  const r = {
    id: 's1', title: 'Recall', teams: [], status: 'ended',
    attendance: [{ id: 1, name: 'Ada' }, { id: 2, name: 'Bo' }],
    checks: [
      { attempt: 'a1', input: 'text', question: 'Capital of France?', bloom: 'Remember',
        options: [], correct: -1, answer: 'Paris', eligible: [1, 2],
        responses: [{ playerId: 1, text: 'the PARISS', right: true, sure: true, elapsedMs: 900 }] },
      { attempt: 'a2', input: 'choice', question: 'Which one?', bloom: '',
        options: ['A', 'B'], correct: 1, eligible: [1],
        responses: [{ playerId: 1, choice: 1, right: true, elapsedMs: 400 }] }
    ]
  };
  const csv = Reports.answersCsv(r);
  assert.match(csv, /"the PARISS"/, 'the typed answer, not a blank cell');
  assert.match(csv, /"Ada","1","the PARISS","Sure","correct"/);
  assert.match(csv, /"Ada","1","B","","correct"/, 'a chosen option still reads as the option');
  assert.match(csv, /"Bo","2","","","unanswered"/);
  /* Blank rather than "unknown" where nobody was asked: the column only
     means something for a game that had confidence turned on. */
  assert.equal((csv.match(/"Sure"/g) || []).length, 1);
});

test('class overview lists names under the Class totals', () => {
  const SF = loadReports({ dom: true });
  const r = {
    attendance: [
      { id: 1, name: 'Ada Lovelace', source: 'teacher' },
      { id: 2, name: 'Bo' }
    ],
    checks: [{
      question: 'Which one?', revealedAt: 1, eligible: [1, 2],
      responses: [
        { playerId: 1, choice: 0, right: true },
        { playerId: 2, choice: 1, right: false }
      ]
    }]
  };
  const grid = SF.answerGrid(r);
  assert.match(grid.className, /grid-wrap/);
  const foot = grid.childNodes.find((n) => n.className === 'grid-roster');
  assert.ok(foot, 'names sit under the table');
  assert.match(foot.textContent, /Ada Lovelace/);
  assert.match(foot.textContent, /Bo/);
  assert.match(foot.textContent, /Right/);
  assert.match(foot.textContent, /Missed/);
  const table = grid.childNodes.find((n) => n.className === 'answer-grid');
  assert.match(table.textContent, /2 Class total/);
});

test('the room rail carries accuracy and answered, not only points', async (t) => {
  /* Score meant four different things across the app: points here, an average
     there, distance in a race, cards collected on a board. None of them says
     whether a learner understood it, which is the thing a teacher needs while
     the lesson is still running. Accuracy and answered travel alongside the
     points and mean the same thing whatever the game is doing. */
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'slideforge-rail-'));
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
  host.send({ t: 'host', title: 'Accuracy', mode: 'individual' });
  const { pin } = await host.next('hosted');

  const ada = await connect(port);
  const ben = await connect(port);
  sockets.push(ada, ben);
  ada.send({ t: 'join', pin, name: 'Ada' });
  ben.send({ t: 'join', pin, name: 'Ben' });
  await ada.next('joined');
  await ben.next('joined');
  host.send({ t: 'begin' });

  /* Ada answers all three and gets two right; Ben answers one of the three.
     Silence has to count as asked-and-not-answered, or the learner who says
     nothing looks identical to the one who was never there. */
  const plan = [
    { ada: 0, ben: 0 },
    { ada: 1, ben: null },
    { ada: 0, ben: null }
  ];
  let rows = [];
  for (let i = 0; i < plan.length; i++) {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/d54b620c-7a42-42a5-a287-490ed972a19b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0a26aa'},body:JSON.stringify({sessionId:'0a26aa',runId:'run1',hypothesisId:'D',location:'marking.test.js:430',message:'Loop iteration start',data:{i,plan:plan[i]},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    host.send({ t: 'question', id: 'q' + i, n: i + 1, total: 3, question: 'Q' + (i + 1),
      options: ['A', 'B'], correct: 0, input: 'choice', points: 100, timeLimit: 0 });
    await ada.next('question');
    let answers = 0;
    if (plan[i].ada != null) { ada.send({ t: 'answer', choice: plan[i].ada }); answers++; }
    if (plan[i].ben != null) { ben.send({ t: 'answer', choice: plan[i].ben }); answers++; }
    /* Through the harness, so the reveal quotes the answer revision it was
       taken from — a stale rev is refused and nothing is scored at all. */
    await reveal(host, { correct: 0 }, null, answers);
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/d54b620c-7a42-42a5-a287-490ed972a19b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0a26aa'},body:JSON.stringify({sessionId:'0a26aa',runId:'run1',hypothesisId:'B',location:'marking.test.js:443',message:'Reveal done, waiting before latest(players)',data:{i},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    await new Promise((r) => setTimeout(r, 80));
    rows = (await host.latest('players')).rows;
  }

  const ada_ = rows.find((r) => r.name === 'Ada');
  const ben_ = rows.find((r) => r.name === 'Ben');
  assert.equal(ada_.asked, 3, 'asked every question');
  assert.equal(ada_.answered, 3);
  assert.equal(ada_.accuracy, 67, 'two of three');
  assert.equal(ben_.asked, 3, 'asked them too — silence is not absence');
  assert.equal(ben_.answered, 1);
  assert.equal(ben_.accuracy, 33, 'one right of the three he was asked');
  assert.ok(ada_.score > ben_.score, 'and the points are still their own number');
});
