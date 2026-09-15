'use strict';
/* A reply that filled its token budget and stopped mid-sentence.
 *
 * The relay capped every answer at 450 output tokens — right for a poll, and
 * about two questions' worth when a teacher asks for three or four with
 * options and an explanation each. The model wrote until the budget ran out
 * and stopped inside a string, so the JSON never closed, JSON.parse threw,
 * and the teacher was told "the AI server could not be reached" by a server
 * that had answered in full. Roughly one press in ten from the teacher desk.
 *
 * Three things under test: the caller asks for room proportional to what it
 * wants, a cut-off array still yields the entries that did arrive, and an
 * unreadable reply is never reported as an unreachable server.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const AI_PATH = path.join(__dirname, '..', 'js', 'ai.js');

const MODEL_PATH = path.join(__dirname, '..', 'js', 'model.js');

function loadAI(handler) {
  delete require.cache[require.resolve(AI_PATH)];
  delete require.cache[require.resolve(MODEL_PATH)];
  const calls = [];
  /* The question writer asks the game engines whether a row is usable, so the
     model has to be present or it refuses before reaching the network. */
  global.window = global;
  global.SF = {};
  require(MODEL_PATH);
  global.location = { origin: 'http://test.local' };
  global.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return handler(String(url), init, calls.length);
  };
  const AI = require(AI_PATH);
  return { AI, calls };
}

const reply = (body, status) => ({
  ok: !status || status < 400,
  status: status || 200,
  json: async () => body
});

/** Three questions asked for, two written, the third cut off mid-option. */
const TRUNCATED = { text: `{
  "questions": [
    {
      "question": "A bar chart starts its axis at 50 rather than 0. What does that do?",
      "options": ["Exaggerates the differences", "Nothing at all", "Hides the total"],
      "correct": 0,
      "explanation": "Cutting the baseline cuts the length the value is drawn as."
    },
    {
      "question": "Why does a pie of years answer the wrong question?",
      "options": ["A pie is parts of one whole", "Pies cannot hold six slices", "Years are not data"],
      "correct": 0,
      "explanation": "A time series is a path, and a pie has nowhere to draw one."
    },
    {
      "question": "Which channel does the eye read most accurately?",
      "options": ["Position on a common scale", "Area", "Colour hue and satu` };

const game = () => ({
  style: 'choice',
  title: 'Reading charts',
  questions: [],
  settings: { defaultTime: 20 }
});

test('a reply cut off mid-answer keeps the questions that did arrive', async () => {
  const { AI, calls } = loadAI((url, init, n) => {
    if (url.endsWith('/api/ai/status')) return reply({ available: true });
    return reply(TRUNCATED);
  });

  const res = await AI.generateQuestionsForGame(game(), { topic: 'misleading axes', count: 3 });
  assert.equal(res.error, undefined, 'a partial answer is still an answer: ' + res.error);
  assert.equal(res.questions.length, 2, 'both complete questions survive');
  assert.match(res.questions[0].question, /starts its axis at 50/);
  assert.match(res.questions[1].question, /pie of years/);

  /* And the room it asked for scales with the number wanted, rather than
     leaning on the relay's poll-sized default. */
  const generate = calls.filter((c) => c.url.endsWith('/api/ai/generate'))[0];
  const sent = JSON.parse(generate.init.body);
  assert.ok(sent.maxTokens > 450, 'asked for more room than a poll: ' + sent.maxTokens);
  assert.ok(sent.maxTokens <= 2400, 'and stayed inside what the relay allows');
});

test('an unreadable reply is not reported as an unreachable server', async () => {
  /* Cut off before anything closed: there is nothing to salvage, so it is an
     error — but the server answered, and the message has to say so. */
  const early = loadAI((url) => {
    if (url.endsWith('/api/ai/status')) return reply({ available: true });
    return reply({ text: '{ "questions": [ { "question": "Cut off right he' });
  });
  const cut = await early.AI.generateQuestionsForGame(game(), { topic: 'axes', count: 3 });
  assert.ok(cut.error, 'nothing usable came back, so this is an error');
  assert.doesNotMatch(cut.error, /could not be reached/i,
    'the server answered; saying otherwise sends the teacher to check their key');

  /* And prose instead of JSON — a refusal — is its own answer, not a cut-off
     one, because "press it again" means something different in each case. */
  const prose = loadAI((url) => {
    if (url.endsWith('/api/ai/status')) return reply({ available: true });
    return reply({ text: 'I cannot help with that.' });
  });
  const refused = await prose.AI.generateQuestionsForGame(game(), { topic: 'axes', count: 3 });
  assert.ok(refused.error);
  assert.doesNotMatch(refused.error, /could not be reached/i);
  assert.match(refused.error, /other than a question set/i, 'got: ' + refused.error);
});

test('the relay clamps the room a caller asks for', async () => {
  const server = require('node:fs').readFileSync(
    path.join(__dirname, '..', 'server', 'server.js'), 'utf8');
  /* The ceiling is the server's to enforce: a client is free to ask for a
     million tokens and must not get them. */
  assert.match(server, /Math\.max\(200, Math\.min\(2400,/,
    'the relay no longer clamps the requested output budget');
  assert.match(server, /maxOutputTokens: maxOutputTokens/,
    'the clamped budget is what reaches the provider');
});
