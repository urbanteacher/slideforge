'use strict';
/* Game mechanics scoring — audit formulas on SlideForge's style path. */
const { test } = require('node:test');
const assert = require('node:assert/strict');

function loadModel() {
  const sandbox = {};
  global.window = sandbox;
  delete require.cache[require.resolve('../js/model.js')];
  require('../js/model.js');
  delete global.window;
  return sandbox.SF;
}

test('boss damage and starting HP follow the audit table', () => {
  const SF = loadModel();
  assert.equal(SF.bossDamage('easy'), 1);
  assert.equal(SF.bossDamage('medium'), 2);
  assert.equal(SF.bossDamage('hard'), 3);
  assert.equal(SF.bossDamage('boss'), 5);
  assert.equal(SF.bossDamage('unknown'), 2, 'unknown difficulty is medium');

  const qs = [
    { difficulty: 'easy' },
    { difficulty: 'medium' },
    { difficulty: 'hard' },
    { difficulty: 'boss' }
  ];
  assert.equal(SF.bossMaxHp(qs), 1 + 2 + 3 + 5);
  assert.equal(SF.bossMaxHp([]), 0);
});

test('a new boss battle is a fight rather than one punch', () => {
  const SF = loadModel();
  const game = SF.makeGame('Fresh', 'boss');

  /* It used to open on one medium question: 2 HP against a hit that deals 2,
     so the boss died to the first answer — the format demonstrating the
     opposite of what it is for. Nothing flagged it, because a one-question
     boss game is perfectly valid. */
  const hp = SF.bossMaxHp(game.questions);
  const firstHit = SF.bossDamage(game.questions[0].difficulty);
  assert.ok(firstHit < hp, 'the first right answer should not finish it');

  /* The bank is one of each rung, so the ladder is visible before a word is
     rewritten and answering everything correctly lands the last blow. */
  assert.deepEqual(game.questions.map((q) => q.difficulty), SF.BOSS_LEVELS);
  assert.equal(game.questions.reduce((n, q) => n + SF.bossDamage(q.difficulty), 0), hp);

  /* The cast on the JSON import in src/games/boss.js says these are bands.
     JSON widens them to plain strings, so this is where that is made true. */
  for (const q of game.questions) {
    assert.ok(SF.BOSS_LEVELS.includes(q.difficulty), 'unknown band ' + q.difficulty);
    assert.equal(SF.GAME_STYLES.boss.problems(q, 1), null);
  }
});

test('beat-the-clock points: 10 + remaining/10 correct, −5 wrong', () => {
  const SF = loadModel();
  assert.equal(SF.speedPoints(true, 60), 16);
  assert.equal(SF.speedPoints(true, 9), 10);
  assert.equal(SF.speedPoints(true, 0), 10);
  assert.equal(SF.speedPoints(true, -3), 10, 'negative remaining clamps');
  assert.equal(SF.speedPoints(false, 60), -5);
  assert.equal(SF.speedPoints(false, 0), -5);
});

test('speed and boss are first-class styles with their own mechanics', () => {
  const SF = loadModel();
  assert.equal(SF.GAME_STYLES.speed.mechanic, 'speed');
  assert.equal(SF.GAME_STYLES.boss.mechanic, 'boss');
  assert.equal(SF.gameStyle('speed').mechanic, 'speed');
  assert.equal(SF.gameStyle('boss').mechanic, 'boss');

  const speed = SF.makeGame('Clock', 'speed');
  assert.equal(speed.settings.defaultTime, 60);
  assert.equal(SF.gameToRunDeck(speed).mechanic, 'speed');

  /* A blank question is still medium; it is the starter bank that opens on
     easy. Asserted against makeQuestion so this says what it means rather
     than reading the first row of whatever bank ships. */
  assert.equal(SF.makeQuestion('boss').difficulty, 'medium');

  const boss = SF.makeGame('Boss', 'boss');
  const run = SF.gameToRunDeck(boss);
  assert.equal(run.mechanic, 'boss');
  const quiz = run.slides.find((s) => s.type === 'quiz');
  /* The compiled slide carries its band and the damage that band deals —
     which pair, rather than which band, is the thing worth pinning. */
  assert.ok(SF.BOSS_LEVELS.includes(quiz.difficulty));
  assert.equal(quiz.bossDamage, SF.bossDamage(quiz.difficulty));

  const hard = SF.normalizeQuestion(Object.assign(SF.makeQuestion('boss'), {
    question: 'Hard hit?',
    options: ['A', 'B'],
    correct: 0,
    difficulty: 'boss'
  }), 'boss');
  assert.equal(hard.difficulty, 'boss');
  assert.match(SF.GAME_STYLES.boss.summary(hard), /boss \(5 dmg\)/);
});

test('catalogue formats map centrally onto engines', () => {
  const SF = loadModel();
  assert.equal(SF.formatStyle('beat-the-clock'), 'speed');
  assert.equal(SF.formatStyle('boss-battle'), 'boss');
  assert.equal(SF.formatStyle('memory-flip'), 'memoryflip');
  assert.equal(SF.formatStyle('ranking'), 'order');
  assert.equal(SF.formatStyle('quiz-bowl'), 'bowl');
  assert.equal(SF.formatStyle('truefalse'), 'truefalse');
  assert.equal(SF.formatStyle('true-false'), 'truefalse');

  const broken = SF.normalizeGame({
    style: 'memoryflip',
    format: 'beat-the-clock',
    title: 'Clock',
    settings: {},
    questions: [{
      id: 'q1',
      question: 'Which process releases energy from glucose in cells?',
      term: 'x',
      definition: 'y',
      options: ['Claimed', 'Not yet'],
      correct: 0
    }]
  });
  assert.equal(broken.style, 'speed');
  assert.ok(Array.isArray(broken.questions[0].options));
  assert.notEqual(broken.questions[0].options[0], 'Claimed');
});

test('True/False stays a special activity, not a blank-quiz engine picker', () => {
  const SF = loadModel();
  assert.ok(SF.isSpecialStyle('truefalse'));
  assert.ok(SF.isSpecialStyle('speed'));
  assert.equal(SF.CORE_STYLES.indexOf('truefalse'), -1);
  assert.equal(SF.CORE_STYLES.indexOf('speed'), -1);
  assert.equal(SF.CORE_STYLES.indexOf('boss'), -1);

  const healed = SF.normalizeGame({
    style: 'truefalse',
    title: 'Old TF',
    settings: {},
    questions: [{ question: 'Mitochondria are only in animals.', correct: 1 }]
  });
  assert.equal(healed.style, 'truefalse');
  assert.equal(healed.format, 'truefalse');
  assert.deepEqual(healed.questions[0].options, ['True', 'False']);
});

test('word reveal scores 100 / 75 / 50 by fraction revealed', () => {
  const SF = loadModel();
  assert.equal(SF.wordRevealPoints(0), 100);
  assert.equal(SF.wordRevealPoints(0.49), 100);
  assert.equal(SF.wordRevealPoints(0.5), 75);
  assert.equal(SF.wordRevealPoints(0.74), 75);
  assert.equal(SF.wordRevealPoints(0.75), 50);
  assert.equal(SF.wordRevealPoints(1), 50);
  assert.equal(SF.wordRevealPreFraction('easy'), 0.6);
  assert.equal(SF.wordRevealPreFraction('medium'), 0.4);
  assert.equal(SF.wordRevealPreFraction('hard'), 0);
  assert.equal(SF.wordRevealLetterCount('A B'), 2);
  assert.equal(SF.wordRevealMask('CAT', 1), 'C__');
  assert.equal(SF.wordRevealMask('CAT', 3), 'CAT');

  const g = SF.makeGame('Reveal', 'wordreveal');
  assert.equal(g.style, 'wordreveal');
  assert.equal(SF.GAME_STYLES.wordreveal.mechanic, 'wordreveal');
  const run = SF.gameToRunDeck(g);
  assert.equal(run.mechanic, 'wordreveal');
  const quiz = run.slides.find((s) => s.type === 'quiz');
  assert.equal(quiz.input, 'text');
  assert.ok(quiz.word);
  assert.ok(SF.markResponse(quiz, quiz.accept[0]));
  const answers = [
    { id: 'early', response: quiz.accept[0], elapsedMs: 0 },
    { id: 'late', response: quiz.accept[0], elapsedMs: 120000 },
    { id: 'wrong', response: 'chlorophyll', elapsedMs: 0 }
  ];
  assert.deepEqual(JSON.parse(JSON.stringify(SF.wordRevealGains(quiz, answers, 99))), [
    ['early', 100], ['late', 50], ['wrong', 0]
  ], 'the later reveal cannot raise or lower another learner’s score');
});

test('ranking / order points are round(10 × orderScore)', () => {
  const SF = loadModel();
  assert.equal(SF.orderPoints(1), 10);
  assert.equal(SF.orderPoints(0.5), 5);
  assert.equal(SF.orderPoints(0.75), 8);
  assert.equal(SF.orderPoints(0), 0);
  const slide = { options: ['A', 'B', 'C', 'D'] };
  assert.equal(SF.orderScore(slide, [0, 1, 2, 3]), 1);
  assert.equal(SF.orderPoints(slide, [0, 1, 3, 2]), 5);
  assert.equal(SF.GAME_STYLES.order.mark(slide, [0, 1, 2, 3]), true);
  assert.equal(SF.GAME_STYLES.order.mark(slide, [0, 1, 3, 2]), false);
});

test('claim, spin explain, and bingo helpers match the audit', () => {
  const SF = loadModel();
  assert.equal(SF.claimPoints(true), 1);
  assert.equal(SF.claimPoints(false), 0);
  assert.equal(SF.spinExplainPoints('clear'), 2);
  assert.equal(SF.spinExplainPoints(0), 2);
  assert.equal(SF.spinExplainPoints('hint'), 1);
  assert.equal(SF.spinExplainPoints(1), 1);
  assert.equal(SF.spinExplainPoints('reject'), 0);
  assert.equal(SF.spinExplainPoints(2), 0);

  const marked = [1, 1, 1, 0, 0, 0, 0, 0, 0];
  assert.equal(SF.bingoHasLine(marked, 3), true, 'top row');
  assert.equal(SF.bingoHasLine([1, 0, 0, 1, 0, 0, 1, 0, 0], 3), true, 'left column');
  assert.equal(SF.bingoHasLine([1, 0, 0, 0, 1, 0, 0, 0, 1], 3), true, 'diagonal');
  assert.equal(SF.bingoHasLine([1, 1, 0, 1, 0, 0, 0, 0, 0], 3), false);
});

test('memory match / flip compile as claim pairs (host marks, not learner MCQ content)', () => {
  const SF = loadModel();
  const g = SF.makeGame('Match', 'memorymatch');
  g.format = 'memory-match';
  const slide = SF.fillQuestionSlide(g.questions[0], g.style, g.settings, SF.makeSlide('quiz'));
  slide.format = g.format;
  assert.equal(slide.style, 'memorymatch');
  assert.equal(slide.term, 'Mitochondrion');
  assert.ok(slide.definition);
  assert.deepEqual(slide.options, ['Claimed', 'Not yet']);
  assert.equal(SF.formatStyle('memory-match'), 'memorymatch');
  assert.equal(SF.formatStyle('memory-flip'), 'memoryflip');
});

test('memory, oracy, board styles compile with the right mechanics', () => {
  const SF = loadModel();
  const cases = [
    ['memoryflip', 'claim'],
    ['memorymatch', 'claim'],
    ['knowledgeflip', 'claim'],
    ['headsup', 'judge'],
    ['spinexplain', 'judge'],
    ['connection', 'judge'],
    ['conceptchain', 'judge'],
    ['randomchallenge', 'count'],
    ['bingo', 'bingo'],
    ['bowl', 'bowl'],
    ['lowstakes', 'count']
  ];
  for (const [style, mechanic] of cases) {
    assert.equal(SF.GAME_STYLES[style].mechanic, mechanic, style);
    const g = SF.makeGame(style, style);
    const run = SF.gameToRunDeck(g);
    assert.equal(run.mechanic, mechanic, style + ' run deck');
    const quiz = run.slides.find((s) => s.type === 'quiz');
    if (['memoryflip', 'memorymatch', 'knowledgeflip'].includes(style)) {
      assert.ok(run.slides.some(s => s.memoryBoard), style + ' has a shared board');
      assert.equal(quiz, undefined, 'no learner self-claim question');
    } else if (style === 'bingo') {
      /* Bingo is a board too: one card per team, dealt from the pool of
         authored pairs. It used to compile to quiz slides whose only options
         were "Line!" and "Keep playing", which is not a thing to ask a room. */
      assert.ok(run.slides.some(s => s.bingoBoard), 'bingo has a card board');
      assert.equal(quiz, undefined, 'no learner vote on a called definition');
    } else if (style === 'lowstakes') {
      assert.ok(run.slides.some(s => s.lowstakesBoard), 'lowstakes has a worksheet board');
      assert.equal(quiz, undefined, 'no phone MCQ for paper retrieval');
    } else if (style === 'bowl') {
      /* A category and value grid, which only means anything while it still
         has unused cells on it. It used to be a run of quiz slides in the
         order they were authored, which is a quiz with categories written on
         it rather than a bowl. */
      assert.ok(run.slides.some(s => s.bowlBoard), 'bowl has a category board');
      assert.equal(quiz, undefined, 'no phone Correct/Wrong vote');
    } else assert.ok(quiz, style + ' has a quiz slide');
  }

  const bowl = SF.normalizeQuestion(Object.assign(SF.makeQuestion('bowl'), {
    category: 'History',
    pointValue: 500,
    answer: '1066',
    question: 'Norman conquest year?'
  }), 'bowl');
  assert.equal(bowl.pointValue, 500);
  /* A new game now opens on its starter bank, so this checks the board's
     shape rather than the one cell it used to have: several categories
     across, several values down, and a question behind every cell. */
  const bowlRun = SF.gameToRunDeck(SF.makeGame('Bowl', 'bowl'));
  const board = bowlRun.slides.find((s) => s.bowlBoard).bowlBoard;
  assert.ok(board.categories.length > 1, 'one column is not a board to choose from');
  assert.ok(board.values.length > 1, 'one row is not a board to choose from');
  assert.equal(board.cells.length, board.categories.length * board.values.length);
  for (const cell of board.cells) {
    assert.ok(board.values.includes(cell.value), 'a cell sits under a value on the board');
    assert.ok(cell.questions.length, 'an empty cell cannot be claimed');
  }
});

/* The validator is not a place to be generous about field names. Whatever it
   calls valid, compile/mark/summary have to be able to read — and those go to
   `options` and `question`. Translating a foreign shape is the normalizer's
   job, so everything downstream sees one shape. */
test('a choice question is judged on the fields the rest of the app reads', () => {
  const SF = loadModel();
  const choice = SF.GAME_STYLES.choice;

  const ok = { question: 'Pick one', options: ['Alpha', 'Beta'], correct: 0 };
  assert.equal(choice.problems(ok, 1), null);

  /* Nothing produces these, and nothing else reads them: `answers` appears
     nowhere as a question field, and `prompt` belongs to concept chain and
     feedback. Accepting either here would pass a question that presents with
     nothing on it. */
  assert.match(
    choice.problems({ question: 'Pick one', answers: ['Alpha', 'Beta'], correct: 0 }, 1),
    /at least two answers/);
  assert.match(
    choice.problems({ prompt: 'Only a prompt', options: ['A', 'B'], correct: 0 }, 1),
    /no question text/);

  /* Both of these used to get through. `q.options.filter` threw on a question
     carried over from another engine's shape, so the validator reported
     nothing at all; and `String(undefined)` is "undefined", which is truthy,
     so empty question text read as present. */
  assert.match(choice.problems({ question: 'No options at all' }, 3), /at least two answers/);
  assert.match(choice.problems({ options: ['A', 'B'], correct: 0 }, 4), /no question text/);

  /* Same hole, one engine along in the same file. */
  assert.equal(SF.GAME_STYLES.truefalse.problems({ question: 'It is so.', correct: 0 }, 1), null);
  assert.match(SF.GAME_STYLES.truefalse.problems({}, 1), /no statement/);
});

/* Same class of hole as the choice validator, in the engines that shared the
   pattern. A validator that returns null on a question the app cannot present
   is worse than no validator: it is the thing the author trusts when deciding
   the game is ready. */
test('validators report a missing field rather than passing it or throwing', () => {
  const SF = loadModel();

  /* `String(undefined)` is "undefined" — truthy — so these presence checks
     used to call a question with no text valid. */
  assert.match(SF.GAME_STYLES.slider.problems({}, 1), /no question text/);
  assert.match(SF.GAME_STYLES.lowstakes.problems({}, 1), /no question text/);
  assert.match(SF.GAME_STYLES.lowstakes.problems({ question: 'Q?' }, 1), /answer for the reveal/);

  /* `accept` is absent on a question carried over from another engine, and the
     bare `.some` threw there — so getShowcaseGame caught a generic
     "Validation error" and the author never learned which field was missing. */
  assert.match(SF.GAME_STYLES.type.problems({}, 1), /no question text/);
  assert.match(SF.GAME_STYLES.type.problems({ question: 'Q?' }, 1), /no accepted answer/);
  assert.match(SF.GAME_STYLES.type.problems({ question: 'Q?', accept: ['', '  '] }, 1), /no accepted answer/);

  /* Order looked safe when probed with an empty question, but only because
     its three-items check answers first. The hole was real: give it items
     and no `question` field and it passed. Probe it where it actually
     bites, or the next reader concludes it never needed fixing. */
  assert.match(SF.GAME_STYLES.order.problems({ options: ['A', 'B', 'C'] }, 1), /no question text/);

  /* And they still pass what is genuinely complete. */
  assert.equal(SF.GAME_STYLES.slider.problems(
    { question: 'How far?', min: 0, max: 10, tolerance: 1 }, 1), null);
  assert.equal(SF.GAME_STYLES.lowstakes.problems(
    { question: 'Name it', answer: 'Mitochondrion' }, 1), null);
  assert.equal(SF.GAME_STYLES.type.problems(
    { question: 'Symbol for gold?', accept: ['Au'] }, 1), null);
  assert.equal(SF.GAME_STYLES.order.problems(
    { question: 'Earliest first', options: ['Rome', 'Normans', 'Civil War'] }, 1), null);
});

/* Alignment is the whole risk with a parallel array. A label that slides onto
   a different answer does not read as a bug in the report — it reads as a
   confident statement about a mistake the room never made. */
test('misconception labels stay tied to the option they were written for', () => {
  const SF = loadModel();
  const choice = SF.GAME_STYLES.choice;

  var q = { question: 'Area of a circle?', options: ['πr²', '', '2πr', 'πd'], correct: 0,
    misconceptions: ['', '', 'Used circumference', 'Confused radius with diameter'] };
  choice.normalize(q);
  var s = {};
  choice.compile(q, {}, s);
  /* The blank option is dropped from the slide, so its label goes with it and
     the rest shuffle down together. */
  assert.deepEqual(s.options, ['πr²', '2πr', 'πd']);
  assert.deepEqual(s.misconceptions, ['', 'Used circumference', 'Confused radius with diameter']);
  assert.equal(s.misconceptions[s.options.indexOf('2πr')], 'Used circumference');

  /* Normalizing pads and truncates to the options it indexes, so a label
     array that outlived its options cannot reattach itself. */
  var short = { question: 'Q', options: ['A', 'B'], correct: 0,
    misconceptions: ['', 'x', 'stale', 'stale'] };
  choice.normalize(short);
  assert.deepEqual(short.misconceptions, ['', 'x']);

  /* A question nobody labelled carries no empty array around. */
  var plain = { question: 'Q', options: ['A', 'B'], correct: 0 };
  choice.normalize(plain);
  assert.equal(plain.misconceptions, undefined);
  var ps = {};
  choice.compile(plain, {}, ps);
  assert.equal(ps.misconceptions, undefined);
});

test('drawn formats play in a fresh order and know their place in the pile; Heads Up is one round', () => {
  const SF = loadModel();
  for (const style of ['spinexplain', 'randomchallenge', 'headsup']) {
    const g = SF.normalizeGame(SF.makeGame('Draw', style));
    g.questions = Array.from({ length: 8 }, (_, i) => SF.normalizeQuestion(
      style === 'randomchallenge' ? { challenge: 'Challenge ' + i } : { term: 'Term ' + i }, style));
    g.settings.defaultTime = 45;
    const seen = new Set();
    for (let run = 0; run < 12; run++) {
      const items = SF.compileGame(g).filter(s => s.type === 'quiz');
      assert.equal(items.length, 8);
      assert.deepEqual(Array.from(items, s => s.drawNo), [1, 2, 3, 4, 5, 6, 7, 8]);
      assert.ok(items.every(s => s.drawTotal === 8));
      assert.equal(new Set(items.map(s => s.id)).size, 8, 'no repeats in a pile');
      seen.add(items.map(s => s.id).join('|'));
      if (style === 'headsup') {
        assert.ok(items.every(s => s.roundSeconds === 45 && s.timeLimit === 0),
          'the round is timed, not each term');
      }
    }
    assert.ok(seen.size > 1, style + ' is not played in one fixed order');
  }
});

test('Time Traveler places events on one growing timeline, and an old typed game heals', () => {
  const SF = loadModel();
  const old = SF.normalizeGame({ style: 'type', format: 'time-traveler', title: 'T',
    questions: [{ question: '1928 — mould kills bacteria. What was discovered?', accept: ['penicillin'] }] });
  assert.equal(old.style, 'slider');
  const q = old.questions[0];
  assert.equal(q.question, 'Place it in time: penicillin', 'the event is named; the year is the answer');
  assert.equal(q.target, 1928);
  assert.ok(q.min <= 1928 && q.max >= 1928);
  assert.match(q.explanation, /1928/, 'the old clue moves to the reveal');
  const g = SF.normalizeGame({ style: 'slider', format: 'time-traveler', title: 'T',
    questions: SF.GAME_FORMAT_PRESETS['time-traveler'].seeds });
  const items = SF.compileGame(g).filter(s => s.type === 'quiz');
  assert.ok(items.every(s => s.min === items[0].min && s.max === items[0].max), 'one line for the game');
  assert.deepEqual(Array.from(items, s => s.timeline.length), [0, 1, 2], 'each round adds its event');
});

test('Question Cube rolls six faces in a fresh order, each knowing its type', () => {
  const SF = loadModel();
  const preset = SF.GAME_FORMAT_PRESETS['question-cube'];
  assert.equal(preset.style, 'randomchallenge');
  const g = SF.normalizeGame({ style: 'randomchallenge', format: 'question-cube', title: 'Cube',
    questions: preset.seeds });
  const faces = SF.compileGame(g).filter(s => s.type === 'quiz');
  assert.equal(faces.length, 6);
  assert.deepEqual(Array.from(faces, s => s.drawNo), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(Array.from(faces, s => s.category).sort(),
    ['Benefits and limits', 'Compare', 'Define', 'Example', 'Why', 'What if'].sort());
});

test('Beat the Clock is one round: no question clock, a pace, and speed from each question', () => {
  const SF = loadModel();
  const g = SF.normalizeGame(SF.makeGame('Beat', 'speed'));
  g.settings.defaultTime = 120;
  const items = SF.compileGame(g).filter(s => s.type === 'quiz');
  assert.ok(items.length > 0);
  assert.ok(items.every(s => s.roundSeconds === 120 && s.timeLimit === 0 && s.paceSeconds === SF.SPEED_PACE));
  g.settings.defaultTime = 0;
  assert.equal(SF.compileGame(g).find(s => s.type === 'quiz').roundSeconds, 90, 'unset means 90 seconds');
  assert.equal(SF.roundSpeedPoints(true, 0.4), 20, 'instant: 10 + 10');
  assert.equal(SF.roundSpeedPoints(true, 4.2), 16);
  assert.equal(SF.roundSpeedPoints(true, 30), 10, 'slow but right still earns 10');
  assert.equal(SF.roundSpeedPoints(false, 1), -5);
});
