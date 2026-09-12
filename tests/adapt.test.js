'use strict';
/* The Adapt report.
 *
 * A report that tells a teacher what to do carries a duty a table of numbers
 * does not: if it is confidently wrong, it changes a lesson for the worse. So
 * most of what is tested here is restraint — that it says less when it knows
 * less, that it does not turn four answers into a claim about a class, and
 * that it never diagnoses a check nobody marked.
 *
 * The engine is pure and takes only a projected session report, so it is
 * tested directly rather than through a relay.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');

/* Loaded the way the browser loads it: model.js first, then adapt.js. */
function loadAdapt() {
  const sandbox = {};
  global.window = sandbox;
  for (const f of ['../js/model.js', '../js/adapt.js']) {
    delete require.cache[require.resolve(f)];
    require(f);
  }
  delete global.window;
  return sandbox.SF;
}

/** A person who answered everything. */
function person(name, n) {
  return { name, admittedAt: 1, questionsEligible: n, questionsAnswered: n };
}

/** A choice check. `answers` is [choiceIndex, sure] per response. */
function check(opts) {
  const c = Object.assign({
    question: 'A question', input: 'choice', options: ['A', 'B', 'C', 'D'],
    correct: 0, revealedAt: 10, bloom: '', sourceSlideId: 's1'
  }, opts);
  c.responses = (opts.answers || []).map(([choice, sure], i) => ({
    playerId: i + 1, choice,
    right: c.revealedAt ? choice === c.correct : null,
    sure: sure === undefined ? null : sure
  }));
  delete c.answers;
  return c;
}

function report(over) {
  return Object.assign({
    title: 'Lesson', attendance: [], checks: [], feedback: [],
    questions: [], signals: [], summary: { checks: 0, revealed: 0, signalsRaised: 0 }
  }, over);
}

const ids = (a) => a.findings.map((f) => f.id);
const byId = (a, id) => a.findings.find((f) => f.id === id);

test('it says how little it knows before it says anything else', () => {
  const SF = loadAdapt();

  /* Three answers from three people is a straw poll. The finding still
     appears — a teacher wants to know — but nothing about it may read as a
     measurement of the class. */
  const thin = SF.adapt(report({
    attendance: [person('Ada', 1), person('Bo', 1), person('Cy', 1)],
    checks: [check({ answers: [[1], [1], [2]] })],
    summary: { checks: 1, revealed: 1 }
  }));
  assert.equal(thin.thin, true);
  assert.match(thin.basis.sentence, /3 marked answers from 3 people/);
  assert.match(thin.basis.sentence, /not much to stand on/);
  assert.equal(byId(thin, 'check:0').strength, 'tentative');

  /* Same shape of failure, enough of it to mean something. */
  const solid = SF.adapt(report({
    attendance: [1,2,3,4,5,6,7,8].map((i) => person('P' + i, 1)),
    checks: [check({ answers: [[1],[1],[1],[1],[1],[2],[0],[0]] })],
    summary: { checks: 1, revealed: 1 }
  }));
  assert.equal(solid.thin, false);
  assert.equal(byId(solid, 'check:0').strength, 'strong');
  assert.doesNotMatch(solid.basis.sentence, /not much to stand on/);
});

test('a check nobody marked is never diagnosed', () => {
  const SF = loadAdapt();
  const a = SF.adapt(report({
    attendance: [1,2,3,4,5,6].map((i) => person('P' + i, 1)),
    checks: [check({ question: 'Asked, never revealed', revealedAt: null,
      answers: [[1],[1],[1],[1],[1],[1]] })],
    summary: { checks: 1, revealed: 0 }
  }));
  /* Reported as an unfinished loop, not as a topic the room failed. Six
     wrong-looking answers with no answer key are not six wrong answers. */
  assert.deepEqual(ids(a).filter((id) => id.startsWith('check:')), []);
  assert.ok(byId(a, 'unrevealed:0'));
  assert.equal(byId(a, 'unrevealed:0').severity, 'note');
  assert.ok(byId(a, 'nothing-revealed'));
  assert.ok(a.findings, 'and it contributes nothing to a bloom profile');
});

test('a vote-only check is not the same thing as a loop left open', () => {
  const SF = loadAdapt();

  /* Peer instruction is one question asked twice, and the first vote is
     unrevealed on purpose: the split goes up, the answer does not, and the
     argument happens in between. Reported as an unfinished loop it would be
     advice to undo the method — so the flag is the difference between "you
     forgot to resolve this" and "resolving it here was the mistake to
     avoid". */
  const pair = SF.adapt(report({
    attendance: [1,2,3,4,5,6].map((i) => person('P' + i, 1)),
    checks: [
      check({ question: 'The quotation, first vote', revealedAt: null, voteOnly: true,
        answers: [[1],[1],[1],[1],[0],[0]] }),
      check({ question: 'The quotation, re-vote',
        answers: [[0],[0],[1],[1],[1],[1]] })
    ],
    summary: { checks: 2, revealed: 1 }
  }));
  assert.equal(byId(pair, 'unrevealed:0'), undefined);
  assert.equal(byId(pair, 'nothing-revealed'), undefined);

  /* And the check that carries the evidence is the second one — the vote
     after the argument is the measurement, so it is the only one that can be
     diagnosed at all. */
  assert.deepEqual(ids(pair).filter((id) => id.startsWith('check:')), ['check:1']);
  assert.match(byId(pair, 'check:1').evidence, /re-vote|4 of the 4 wrong answers/);

  /* The flag excuses only a check that was left unrevealed. An unresolved
     check without it is still reported. */
  const forgotten = SF.adapt(report({
    attendance: [1,2,3,4,5,6].map((i) => person('P' + i, 1)),
    checks: [check({ question: 'Asked, never resolved', revealedAt: null,
      answers: [[1],[1],[1],[1],[0],[0]] })],
    summary: { checks: 1, revealed: 0 }
  }));
  assert.ok(byId(forgotten, 'unrevealed:0'));
});

test('wrong answers that agree are a named misconception; scattered ones are not', () => {
  const SF = loadAdapt();

  const agreed = SF.adapt(report({
    attendance: [1,2,3,4,5,6].map((i) => person('P' + i, 1)),
    checks: [check({ answers: [[1],[1],[1],[1],[0],[0]] })],
    summary: { checks: 1, revealed: 1 }
  }));
  const f = byId(agreed, 'check:0');
  assert.equal(f.severity, 'act');
  assert.match(f.evidence, /4 of the 4 wrong answers chose "B"/);
  assert.match(f.action, /one misconception with a name/);
  assert.match(f.action, /Teach against "B" directly/);

  const scattered = SF.adapt(report({
    attendance: [1,2,3,4,5,6].map((i) => person('P' + i, 1)),
    checks: [check({ answers: [[1],[2],[3],[1],[0],[0]] })],
    summary: { checks: 1, revealed: 1 }
  }));
  const g = byId(scattered, 'check:0');
  assert.doesNotMatch(g.evidence, /wrong answers chose/);
  assert.match(g.action, /spread across the options/);

  /* A typed answer has no options to concentrate on, so the claim is never
     made about one. */
  const typed = SF.adapt(report({
    attendance: [1,2,3,4,5,6].map((i) => person('P' + i, 1)),
    checks: [{ question: 'Capital of France?', input: 'text', options: [], correct: -1,
      answer: 'Paris', revealedAt: 10, bloom: '', sourceSlideId: 's1',
      responses: ['Lyon','Lyon','Lyon','Lyon','Paris','Paris'].map((t, i) => ({
        playerId: i + 1, text: t, right: t === 'Paris', sure: null })) }],
    summary: { checks: 1, revealed: 1 }
  }));
  assert.doesNotMatch(byId(typed, 'check:0').action, /Teach against/);
});

test('one check, one finding, however many things are wrong with it', () => {
  const SF = loadAdapt();
  /* Wrong, agreed on one option, and confident about it. That is one problem
     to fix, and listing it three times would read as three. */
  const a = SF.adapt(report({
    attendance: [1,2,3,4,5,6].map((i) => person('P' + i, 1)),
    checks: [check({ answers: [[1,true],[1,true],[1,true],[1,false],[0,true],[0,false]] })],
    summary: { checks: 1, revealed: 1 }
  }));
  const mine = a.findings.filter((f) => f.id.startsWith('check:'));
  assert.equal(mine.length, 1);
  assert.match(mine[0].evidence, /3 people were wrong and sure/);
  assert.match(mine[0].action, /practice confirms it rather than fixing it/);
});

test('a check they got right by guessing is not treated as known', () => {
  const SF = loadAdapt();
  const a = SF.adapt(report({
    attendance: [1,2,3,4,5,6].map((i) => person('P' + i, 1)),
    checks: [check({ answers: [[0,false],[0,false],[0,false],[0,true],[0,true],[1,false]] })],
    summary: { checks: 1, revealed: 1 }
  }));
  const f = byId(a, 'check:0');
  assert.equal(f.severity, 'watch', 'the score is fine, so it is not urgent');
  assert.match(f.title, /flatters/);
  assert.match(f.evidence, /3 of the 5 correct answers were guesses/);

  /* And a check that was answered confidently and correctly says nothing. */
  const solid = SF.adapt(report({
    attendance: [1,2,3,4,5,6].map((i) => person('P' + i, 1)),
    checks: [check({ answers: [[0,true],[0,true],[0,true],[0,true],[0,true],[1,false]] })],
    summary: { checks: 1, revealed: 1 }
  }));
  assert.deepEqual(ids(solid), []);
  assert.match(solid.headline, /Nothing here needs changing/);
});

test('scale feedback findings do not depend on a teacher next-step note', () => {
  const SF = loadAdapt();
  const a = SF.adapt(report({
    attendance: [1,2,3,4,5].map((i) => person('P' + i, 0)),
    feedback: [{ kind: 'scale', prompt: 'How confident are you?', options: ['1','2','3','4','5'],
      responses: [{ values: [0] }, { values: [0] }, { values: [1] }, { values: [1] }, { values: [2] }] }],
    summary: { checks: 0, revealed: 0 }
  }));
  const f = byId(a, 'scale-low:0');
  assert.ok(f);
  assert.match(f.evidence, /1\.8 of 5/);
  assert.equal(byId(a, 'plan:0'), undefined);

  const calm = SF.adapt(report({
    attendance: [1,2,3,4,5].map((i) => person('P' + i, 0)),
    feedback: [{ kind: 'scale', prompt: 'How confident are you?', options: ['1','2','3','4','5'],
      responses: [{ values: [4] }, { values: [4] }, { values: [3] }, { values: [4] }, { values: [3] }] }],
    summary: { checks: 0, revealed: 0 }
  }));
  assert.equal(byId(calm, 'plan:0'), undefined);
  assert.equal(byId(calm, 'scale-low:0'), undefined);
});

test('a split room is not described by its average', () => {
  const SF = loadAdapt();
  const a = SF.adapt(report({
    attendance: [1,2,3,4,5,6].map((i) => person('P' + i, 0)),
    feedback: [{ kind: 'scale', prompt: 'Ready to try it?', options: ['1','2','3','4','5'],
      responses: [{values:[0]},{values:[0]},{values:[4]},{values:[4]},{values:[4]},{values:[2]}] }],
    summary: { checks: 0, revealed: 0 }
  }));
  const f = byId(a, 'scale-split:0');
  assert.ok(f, 'the mean is 3.2 and describes nobody');
  assert.match(f.action, /describes nobody here/);
  assert.match(f.action, /two different next lessons/);
});

test('unfinished business is reported as unfinished, not as failure', () => {
  const SF = loadAdapt();
  const a = SF.adapt(report({
    attendance: [person('Ada', 3), person('Bo', 3),
      { name: 'Cy', admittedAt: 1, questionsEligible: 3, questionsAnswered: 0 },
      { name: 'Dara', admittedAt: null, questionsEligible: 0, questionsAnswered: 0 }],
    questions: [
      { text: 'Will this be on the exam?', state: 'approved' },
      { text: 'Does music count?', state: 'pending' },
      { text: 'Answered already', state: 'answered' },
      { text: 'Not this one', state: 'dismissed' }
    ],
    summary: { checks: 1, revealed: 1 }
  }));
  const qa = byId(a, 'qa:open');
  assert.match(qa.title, /2 questions from the room went unanswered/);
  assert.match(qa.evidence, /Will this be on the exam/);
  assert.doesNotMatch(qa.evidence, /Answered already/);
  assert.doesNotMatch(qa.evidence, /Not this one/);

  assert.match(byId(a, 'joined:waiting').title, /1 person never made it into the lesson/);

  /* Someone who answered nothing is a person to check on, not a conclusion.
     The report says so in as many words. */
  const silent = byId(a, 'silent');
  assert.match(silent.action, /worth a quiet word rather than a conclusion/);
  assert.doesNotMatch(silent.evidence, /Cy/, 'and it is not the place their name appears');
});

test('the loudest two pace signals, and the difference between lost and rushed', () => {
  const SF = loadAdapt();
  const a = SF.adapt(report({
    attendance: [1,2,3,4,5,6,7,8].map((i) => person('P' + i, 0)),
    signals: [
      { slideId: 's5', title: 'Spacing', n: 5, lost: 4, fast: 0, slow: 0, total: 4 },
      { slideId: 's7', title: 'Interleaving', n: 7, lost: 0, fast: 3, slow: 0, total: 3 },
      { slideId: 's9', title: 'Recap', n: 9, lost: 1, fast: 1, slow: 0, total: 2 }
    ],
    summary: { checks: 0, revealed: 0, signalsRaised: 9 }
  }));
  const paced = a.findings.filter((f) => f.id.startsWith('pace:'));
  assert.equal(paced.length, 2, 'a list of every slide anyone twitched on is not a finding');
  assert.match(paced[0].title, /lost the thread on "Spacing"/);
  assert.match(paced[0].action, /second explanation of the same idea/);
  assert.match(paced[1].title, /asked you to slow down on "Interleaving"/);
  assert.match(paced[1].action, /Pace, not content/);

  /* Signals raised in the lobby have no slide, and the advice cannot be
     "the slide did not work" when there was no slide. */
  const early = SF.adapt(report({
    attendance: [1,2,3,4,5,6].map((i) => person('P' + i, 0)),
    signals: [{ slideId: '', title: '', n: 0, lost: 3, fast: 0, slow: 0, total: 3 }],
    summary: { checks: 0, revealed: 0, signalsRaised: 3 }
  }));
  const first = byId(early, 'pace:0');
  assert.match(first.title, /before the lesson started/);
  assert.doesNotMatch(first.action, /the slide did not work/);
  assert.equal(first.severity, 'watch', 'nothing to change about a slide that had not happened');

  // A single signal is one person, and one person is not a finding.
  const quiet = SF.adapt(report({
    signals: [{ slideId: 's2', title: 'Intro', n: 2, lost: 1, fast: 0, slow: 0, total: 1 }],
    summary: { checks: 0, revealed: 0, signalsRaised: 1 }
  }));
  assert.deepEqual(quiet.findings.filter((f) => f.id.startsWith('pace:')), []);
});

test('urgent first, and thin evidence last within that', () => {
  const SF = loadAdapt();
  const a = SF.adapt(report({
    attendance: [1,2,3,4,5,6].map((i) => person('P' + i, 2)),
    checks: [
      check({ question: 'Badly wrong', answers: [[1],[1],[1],[1],[1],[1]] }),
      check({ question: 'Thinly wrong', answers: [[1],[1]] })
    ],
    questions: [{ text: 'Something', state: 'pending' }],
    summary: { checks: 2, revealed: 2 }
  }));
  const order = a.findings.map((f) => [f.severity, f.strength]);
  assert.deepEqual(order[0], ['act', 'strong']);
  assert.deepEqual(order[1], ['act', 'tentative']);
  assert.equal(order[order.length - 1][0], 'watch');
  assert.match(a.headline, /2 things to change before next lesson, and 1 to keep an eye on/);
});

test('an empty session produces an honest blank rather than filler', () => {
  const SF = loadAdapt();
  const a = SF.adapt(report({}));
  assert.deepEqual(a.findings, []);
  assert.match(a.headline, /Not enough happened/);
  assert.match(a.basis.sentence, /Nothing was marked/);
  assert.equal(SF.adapt(null), null);
});

test('the markdown export carries the findings and its own caveat', () => {
  const SF = loadAdapt();
  const md = SF.adaptToMarkdown(report({
    title: 'Attention and focus',
    attendance: [1,2,3,4,5,6].map((i) => person('P' + i, 1)),
    checks: [check({ question: 'Use it', answers: [[1],[1],[1],[1],[0],[0]] })],
    summary: { checks: 1, revealed: 1 }
  }));
  assert.match(md, /^# Adapt — Attention and focus/);
  assert.match(md, /## Change this/);
  assert.match(md, /### Re-teach: Use it/);
  assert.match(md, /\*\*Evidence:\*\* 2 of 6 correct/);
  assert.match(md, /\*\*Suggested:\*\*/);
  assert.match(md, /Nothing here is a measurement of a person/);

  // A thin finding says so in the export too, not only on screen.
  const thin = SF.adaptToMarkdown(report({
    attendance: [person('Ada', 1), person('Bo', 1)],
    checks: [check({ answers: [[1], [1]] })],
    summary: { checks: 1, revealed: 1 }
  }));
  assert.match(thin, /\*\(thin evidence\)\*/);
  assert.match(thin, /read everything below as a question/);
});

test('a spoken board is not "nothing was marked"', () => {
  const SF = loadAdapt();

  /* Knowledge Flip marks cards, not people: the credit goes to a team. So
     Adapt has nothing to say per learner — but it must not claim the lesson
     went unmarked, because the teacher marked five answers by hand. */
  const spoken = SF.adapt(report({
    oral: [{ slideId: 'b1', title: 'Cell transport', kind: 'knowledgeflip', set: 1,
      collected: 4, attempts: 5,
      verdicts: [
        { card: 0, term: 'Osmosis', participant: 'Red', right: true },
        { card: 1, term: 'Diffusion', participant: 'Blue', right: false },
        { card: 1, term: 'Diffusion', participant: 'Red', right: true },
        { card: 2, term: 'Active transport', participant: 'Blue', right: true },
        { card: 3, term: 'Turgor', participant: 'Red', right: true }
      ],
      tally: [{ name: 'Red', score: 3, attempts: 3 }, { name: 'Blue', score: 1, attempts: 2 }] }]
  }));
  assert.match(spoken.basis.sentence, /5 cards were marked on a board judged out loud/);
  assert.doesNotMatch(spoken.basis.sentence, /Nothing was marked/);
  assert.equal(spoken.headline, 'The marking here was spoken, not per learner.');
  assert.deepEqual(spoken.findings, [], 'a spoken round carries no per-learner finding');

  /* And a session where genuinely nothing happened still says so. */
  const empty = SF.adapt(report({}));
  assert.match(empty.basis.sentence, /Nothing was marked in this session/);
  assert.equal(empty.headline, 'Not enough happened to say anything.');
});
