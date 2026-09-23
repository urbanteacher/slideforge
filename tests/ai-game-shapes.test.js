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
