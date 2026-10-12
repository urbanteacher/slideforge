'use strict';
/* The game AI writes the shapes the rebuilt games play: Compare & Contrast's
 * statements to sort, and Question Cube's six faces. Without them the
 * activities that hand over to these games would lose their "Write it"
 * guardrails (see docs/activities-premium-audit.md). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const AI_PATH = path.join(__dirname, '..', 'js', 'ai.js');
const MODEL_PATH = path.join(__dirname, '..', 'js', 'model.js');

function loadAI(text) {
  delete require.cache[require.resolve(AI_PATH)];
  delete require.cache[require.resolve(MODEL_PATH)];
  const calls = [];
  global.window = global;
  global.SF = {};
  require(MODEL_PATH);
  global.location = { origin: 'http://test.local' };
  global.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    const body = String(url).endsWith('/api/ai/status') ? { available: true } : { text: JSON.stringify(text) };
    return { ok: true, status: 200, json: async () => body };
  };
  return { AI: require(AI_PATH), calls, SF: global.SF };
}

test('a comparison comes back as a sort, with its own statements and none of the starter’s', async () => {
  const { AI, SF, calls } = loadAI({ questions: [{
    itemA: 'Mitosis', itemB: 'Meiosis',
    statements: ['Both: is a kind of cell division', 'A: makes two identical cells', 'B: makes four sex cells', 'B: halves the chromosome number'],
    similarities: 'Both divide a cell.', differences: 'Mitosis copies; meiosis halves.'
  }] });
  const game = SF.normalizeGame(SF.makeGame('Cells', 'compare'));
  const res = await AI.generateQuestionsForGame(game, { topic: 'cell division', count: 1 });
  assert.equal(res.error, undefined, String(res.error));
  const q = res.questions[0];
  assert.doesNotMatch(q.statements, /glucose|photosynthesis/i, 'nothing leaks from the starter');
  assert.equal(SF.sortStatements(q.statements).length, 4);
  const sent = JSON.parse(calls.find((c) => c.url.endsWith('/api/ai/generate')).init.body);
  assert.match(JSON.stringify(sent), /Both: /, 'the model is asked for tagged statements');
});

test('a Question Cube is written as six faces, one of each type', async () => {
  const faces = ['Define', 'Compare', 'Why', 'Example', 'What if', 'Benefits and limits'];
  const { AI, SF, calls } = loadAI({ questions: faces.map((f) => ({ category: f, challenge: f + ' — a question about energy?' })) });
  const game = SF.normalizeGame(Object.assign(SF.makeGame('Cube', 'randomchallenge'), { format: 'question-cube' }));
  const res = await AI.generateQuestionsForGame(game, { topic: 'energy', count: 2 });
  assert.equal(res.error, undefined, String(res.error));
  assert.deepEqual(res.questions.map((q) => q.category), faces, 'six faces whatever count was asked');
  const sent = JSON.parse(calls.find((c) => c.url.endsWith('/api/ai/generate')).init.body);
  assert.match(JSON.stringify(sent), /Rosenshine|Benefits and limits/);
  assert.equal(AI.gameSpecFor(game), AI.gameSpec('question-cube'));
});

/* Quiz Bowl, Spot the Error and Fill the Gaps were refused ("is not written
 * by AI yet"); Boss Battle shared the choice brief, so every AI-written boss
 * question came back medium. Each now writes its own shape. */
async function writeFor(style, rows, count) {
  const { AI, SF, calls } = loadAI({ questions: rows });
  const game = SF.normalizeGame(SF.makeGame('Topic', style));
  const res = await AI.generateQuestionsForGame(game, { topic: 'cells', count: count || rows.length });
  const sent = JSON.parse(calls.find((c) => c.url.endsWith('/api/ai/generate')).init.body);
  return { res, SF, sent: JSON.stringify(sent) };
}

test('a Quiz Bowl is written as cells: a category, a value and a host answer, no options', async () => {
  const { res, sent } = await writeFor('bowl', [
    { category: 'Cells', pointValue: 100, question: 'What controls the cell?', answer: 'Nucleus' },
    { category: 'Energy', pointValue: 300, question: 'Where is ATP made?', answer: 'Mitochondria' },
    { category: 'Energy', pointValue: 999, question: 'What gas does respiration release?', answer: 'Carbon dioxide' }
  ]);
  assert.equal(res.error, undefined, String(res.error));
  assert.deepEqual(res.questions.map((q) => q.category), ['Cells', 'Energy', 'Energy']);
  assert.deepEqual(res.questions.map((q) => q.pointValue), [100, 300, 200], 'an off-board value falls back to 200');
  assert.equal(res.questions[1].answer, 'Mitochondria');
  assert.ok(!('options' in res.questions[0]), 'a bowl cell has no options');
  assert.doesNotMatch(JSON.stringify(res.questions), /genetic information/, 'nothing leaks from the starter');
  assert.match(sent, /pointValue/);
});

test('Spot the Error is written as a sentence with its wrong words marked; a row whose error is not in it is dropped', async () => {
  const { res, sent } = await writeFor('spot', [
    { question: 'Plant cells have a cell wall made of glucose.', error: 'glucose', fix: 'cellulose', explanation: 'The wall is cellulose.' },
    { question: 'Red blood cells carry oxygen using chlorophyll.', error: 'haemoglobin', fix: 'chlorophyll' }
  ]);
  assert.equal(res.error, undefined, String(res.error));
  assert.equal(res.questions.length, 1);
  assert.equal(res.rejected, 1, 'the second names words that are not in its sentence');
  const q = res.questions[0];
  assert.equal(q.error, 'glucose');
  assert.equal(q.fix, 'cellulose');
  assert.doesNotMatch(JSON.stringify(q), /mitochondria|chloroplasts/i, 'nothing leaks from the starter');
  assert.match(sent, /exactly as they appear/);
});

test('Fill the Gaps is written as a passage with [gaps] and its own lures', async () => {
  const { res, SF } = await writeFor('fill', [
    { question: 'The [nucleus] holds the cell’s [DNA].', lures: ['ribosome', 'glucose'], explanation: 'DNA lives in the nucleus.' },
    { question: 'No gaps in this one.', lures: ['a', 'b'] }
  ]);
  assert.equal(res.error, undefined, String(res.error));
  assert.equal(res.questions.length, 1, 'a passage with no gaps is rejected by the engine');
  const q = res.questions[0];
  assert.equal(q.lures, 'ribosome, glucose');
  assert.doesNotMatch(q.lures, /diffusion|cell wall/, 'the starter’s lures do not ride along');
  const slide = {};
  SF.GAME_STYLES.fill.compile(q, {}, slide);
  assert.deepEqual(slide.gapAnswers.map((i) => slide.options[i]), ['nucleus', 'DNA']);
});

test('Boss Battle asks for a difficulty climb, and keeps it; a row with no band takes its place on the climb', async () => {
  const opts = ['A', 'B', 'C'];
  const { res, sent } = await writeFor('boss', [
    { question: 'Q1?', options: opts, correct: 0, difficulty: 'easy' },
    { question: 'Q2?', options: opts, correct: 1, difficulty: 'Hard' },
    { question: 'Q3?', options: opts, correct: 2 },
    { question: 'Q4?', options: opts, correct: 0, difficulty: 'boss' }
  ]);
  assert.equal(res.error, undefined, String(res.error));
  assert.deepEqual(res.questions.map((q) => q.difficulty), ['easy', 'hard', 'hard', 'boss']);
  assert.match(sent, /difficulty/);
  const { res: bare } = await writeFor('boss', [1, 2, 3, 4].map((n) => ({ question: 'Q' + n + '?', options: opts, correct: 0 })));
  assert.deepEqual(bare.questions.map((q) => q.difficulty), ['easy', 'medium', 'hard', 'boss'],
    'not every question medium');
});

/* AGENTS.md, "Adding a game style", step 10: toQuestion must set every field
 * the style's starter fills, or the starter's content comes along with the
 * AI's. Settings-like fields (a study clock, a grid size) are not content. */
test('every style has an AI spec that sets each content field its starter fills', () => {
  const { AI, SF } = loadAI({ questions: [] });
  const SETTINGS = ['allowTypos', 'studySeconds', 'rotateClaims', 'gridSize'];
  const missing = [];
  Object.keys(SF.GAME_STYLES).forEach((style) => {
    const spec = AI.gameSpec(style);
    assert.ok(spec, style + ' has an AI spec');
    const made = SF.GAME_STYLES[style].make();
    const out = spec.toQuestion({}, 0, 1);
    Object.keys(made).forEach((f) => {
      if (SETTINGS.includes(f) || made[f] === '' || f in out) return;
      missing.push(style + '.' + f);
    });
  });
  assert.deepEqual(missing, []);
});
