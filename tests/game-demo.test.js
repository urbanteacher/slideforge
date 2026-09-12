'use strict';
/* Tests for game demo showcase banks, fallback generation, and compilation */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function loadSF() {
  const ctx = { window: {}, console };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/model.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/playbook.js'), 'utf8'), ctx);
  return ctx.window.SF;
}

test('every GAME_STYLES engine produces a zero-problem showcase game', () => {
  const SF = loadSF();
  const engines = Object.keys(SF.GAME_STYLES);
  assert.ok(engines.length >= 24, 'should have at least 24 game engines');

  for (const engine of engines) {
    const showcase = SF.getShowcaseGame(engine, { forceSample: true });
    assert.ok(showcase, 'engine ' + engine + ' must return a showcase game');
    assert.equal(showcase.style, engine, 'style should match engine');
    assert.ok(Array.isArray(showcase.questions), 'questions must be an array for ' + engine);
    assert.ok(showcase.questions.length > 0, 'questions must not be empty for ' + engine);

    const styleDef = SF.GAME_STYLES[engine];
    // Verify each question passes engine problem validation
    for (let i = 0; i < showcase.questions.length; i++) {
      const prob = styleDef.problems(showcase.questions[i], i + 1, showcase);
      assert.equal(prob, null, 'question ' + (i + 1) + ' of showcase for ' + engine + ' has error: ' + prob);
    }

    // Verify compileGame succeeds and produces slides
    const slides = SF.compileGame(showcase);
    assert.ok(Array.isArray(slides), 'compileGame must return slides array for ' + engine);
    assert.ok(slides.length > 0, 'slides must not be empty for ' + engine);

    const deck = SF.gameToRunDeck(showcase);
    assert.ok(deck, 'gameToRunDeck must return a deck for ' + engine);
    assert.equal(deck.mechanic, styleDef.mechanic, 'deck mechanic matches engine mechanic');
  }
});

test('every catalogue format produces a zero-problem showcase game', () => {
  const SF = loadSF();
  const formats = [
    'true-false', 'low-stakes-quiz', 'quiz-bowl', 'beat-the-clock', 'boss-battle',
    'horse-race', 'memory-flip', 'memory-match', 'bingo', 'knowledge-flip',
    'definition-challenge', 'emoji-guess', 'word-reveal', 'fill-in-the-blanks',
    'heads-up', 'spin-explain', 'spot-the-error', 'ranking', 'odd-one-out',
    'compare-contrast', 'predict-outcome', 'time-traveler', 'connection-maker',
    'question-cube', 'random-challenge', 'concept-chain',
    'choice', 'type', 'slider', 'order', 'truefalse'
  ];

  for (const fmt of formats) {
    const showcase = SF.getShowcaseGame(fmt, { forceSample: true });
    assert.ok(showcase, 'format ' + fmt + ' must return a showcase game');
    assert.ok(Array.isArray(showcase.questions), 'questions must be an array for ' + fmt);
    assert.ok(showcase.questions.length > 0, 'questions must not be empty for ' + fmt);

    const engine = showcase.style;
    const styleDef = SF.GAME_STYLES[engine];
    assert.ok(styleDef, 'engine ' + engine + ' should exist in SF.GAME_STYLES');

    for (let i = 0; i < showcase.questions.length; i++) {
      const prob = styleDef.problems(showcase.questions[i], i + 1, showcase);
      assert.equal(prob, null, 'question ' + (i + 1) + ' of showcase for format ' + fmt + ' has error: ' + prob);
    }

    const slides = SF.compileGame(showcase);
    assert.ok(Array.isArray(slides) && slides.length > 0, 'compileGame must produce slides for ' + fmt);
  }
});

test('invalid or empty user games fall back cleanly to showcase game', () => {
  const SF = loadSF();

  // Test 1: Empty questions array in Bingo (normally invalid because bingo requires >= 9)
  const emptyBingo = { id: 'g_empty_bingo', title: '', style: 'bingo', questions: [] };
  const fixedBingo = SF.getShowcaseGame(emptyBingo);
  assert.ok(fixedBingo.questions.length >= 9, 'should provide at least 9 bingo terms');
  for (let i = 0; i < fixedBingo.questions.length; i++) {
    assert.equal(SF.GAME_STYLES.bingo.problems(fixedBingo.questions[i], i + 1, fixedBingo), null);
  }

  // Test 2: Blank choice question (missing answers, would throw validation error)
  const brokenChoice = {
    id: 'g_broken_choice',
    title: 'My Quiz',
    style: 'choice',
    questions: [{ prompt: 'Which is fastest?', answers: ['', ''] }]
  };
  const fixedChoice = SF.getShowcaseGame(brokenChoice);
  assert.ok(fixedChoice.questions.length >= 1, 'should provide showcase questions');
  for (let i = 0; i < fixedChoice.questions.length; i++) {
    assert.equal(SF.GAME_STYLES.choice.problems(fixedChoice.questions[i], i + 1, fixedChoice), null);
  }

  // Test 3: Already valid game is preserved when forceSample is false
  const validTrueFalse = {
    id: 'g_valid_tf',
    title: 'Custom TF',
    style: 'truefalse',
    questions: [
      { question: 'Water freezes at 0°C.', correct: 0, explanation: 'At standard atmospheric pressure.' }
    ]
  };
  const result = SF.getShowcaseGame(validTrueFalse);
  assert.equal(result.id, 'g_valid_tf', 'valid game should be preserved');
  assert.equal(result.questions[0].question, 'Water freezes at 0°C.');

  /* `question` and `options` are the fields compile, mark and summary read.
     A game naming them something else is not a valid game wearing a
     different hat — it would present with nothing on it — so it has to fall
     back to the sample rather than be preserved. */
  const foreignShape = {
    id: 'g_foreign', title: 'Foreign', style: 'truefalse',
    questions: [{ prompt: 'Water freezes at 0°C.', correct: 'true' }]
  };
  assert.notEqual(SF.getShowcaseGame(foreignShape).id, 'g_foreign',
    'a question whose text is not in `question` cannot be presented, so it is replaced');

  // Test 4: Force sample overrides even a valid game
  const forcedResult = SF.getShowcaseGame(validTrueFalse, { forceSample: true });
  assert.ok(forcedResult.questions.length >= 3, 'forced showcase should have curated full question bank');
});

test('horse-race and boss showcase games carry required mechanics metadata', () => {
  const SF = loadSF();

  const race = SF.getShowcaseGame('horse-race', { forceSample: true });
  assert.equal(race.style, 'race');
  assert.ok(race.questions.length >= 4, 'race showcase needs multi-question bank for multi-leg track');
  const raceDeck = SF.gameToRunDeck(race);
  assert.equal(raceDeck.mechanic, 'race');

  const boss = SF.getShowcaseGame('boss-battle', { forceSample: true });
  assert.equal(boss.style, 'boss');
  assert.ok(boss.questions.length >= 4, 'boss showcase needs tiered difficulty questions');
  const bossDeck = SF.gameToRunDeck(boss);
  assert.equal(bossDeck.mechanic, 'boss');
  assert.ok(SF.bossMaxHp(boss.questions) > 0, 'boss deck should calculate boss HP');
});

test('board game showcase games compile valid board slides for preview and presentation', () => {
  const SF = loadSF();
  const boardStyles = ['bingo', 'bowl', 'lowstakes', 'memorymatch', 'memoryflip', 'knowledgeflip'];

  for (const style of boardStyles) {
    const showcase = SF.getShowcaseGame(style, { forceSample: true });
    assert.equal(showcase.style, style);
    const slides = SF.compileGame(showcase);
    const boardSlide = slides.find(s => s.bingoBoard || s.bowlBoard || s.lowstakesBoard || s.memoryBoard);
    assert.ok(boardSlide, 'board game ' + style + ' must compile a slide with board data');
  }
});

test('every showcase game resolves a valid playbook entry and demo kind', () => {
  const SF = loadSF();
  const engines = Object.keys(SF.GAME_STYLES);

  for (const engine of engines) {
    const showcase = SF.getShowcaseGame(engine, { forceSample: true });
    const book = SF.Playbook.forGame(showcase);
    assert.ok(book, 'playbook entry must exist for showcase game ' + engine);
    assert.ok(Array.isArray(book.howToPlay) && book.howToPlay.length >= 2, 'howToPlay must have steps for ' + engine);
    assert.ok(['class', 'board', 'judge', 'discuss', 'paper', 'none'].includes(book.demo), 'demo kind must be valid for ' + engine + ': ' + book.demo);
  }
});

test('feedback slides with a poll generate valid sample response digests for demo rehearsal', () => {
  const SF = loadSF();
  const pollFeedback = SF.makeFeedback('poll');
  pollFeedback.options = ['Got it', 'Mostly understand', 'Getting there', 'Need help'];

  // Test sample feedback digest generation for polls
  const digest = SF.sampleFeedbackDigest(pollFeedback);
  assert.ok(digest, 'sample digest must be generated');
  assert.equal(digest.kind, 'poll');
  assert.equal(digest.sample, true);
  assert.equal(digest.counts.length, 4, 'each poll option gets sample votes');
  assert.ok(digest.total > 0, 'total votes must be positive');
  assert.equal(digest.answered, digest.total);
});
