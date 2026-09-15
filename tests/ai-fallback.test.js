'use strict';
/* Write must not dead-end when Gemini refuses.

   Across a day of testing the live deploy, ten generation attempts produced
   no answers: one timeout at the 30s ceiling and nine upstream 503s, which
   this app's proxy reports as 502. Not one 429 — so it was never the quota.
   The old behaviour on all of that was a toast saying the server could not be
   reached, and nothing written.

   Two changes are under test. One quiet retry, because those refusals come
   back in seconds and often pass on a second ask. Then an honest partial
   draft: the heading, which is the one box whose content the topic already
   is, and nothing invented for the rest. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const AI_PATH = path.join(__dirname, '..', 'js', 'ai.js');

/* ai.js is a browser IIFE that also exports for node. It reads global.fetch
   at call time, so a stub installed before the call is what it uses. */
function loadAI(handler) {
  delete require.cache[require.resolve(AI_PATH)];
  const calls = [];
  global.SF = {};
  global.location = { origin: 'http://test.local' };
  global.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return handler(String(url), init, calls.length);
  };
  const AI = require(AI_PATH);
  return { AI, calls };
}

function reply(body, status) {
  return {
    ok: !status || status < 400,
    status: status || 200,
    json: async () => body
  };
}

/* The shape every catalogue activity has: a Heading bound to the slide title,
   then prose boxes bound to keyword definitions. */
const activity = {
  key: 'test-activity',
  title: 'Think-Pair-Share',
  steps: ['Think alone', 'Compare in pairs', 'Report out'],
  fields: [
    { label: 'Heading', type: 'text', slide: 'title', value: 'Think-Pair-Share' },
    { label: 'Think · 1 min', type: 'area', slide: 'bullets.0.def', value: 'Somebody else’s subject' },
    { label: 'Pair · 2 min', type: 'area', slide: 'bullets.1.def', value: 'Also about rectangles' },
    { label: 'Timer', type: 'minutes', slide: 'timeLimit', value: '7' }
  ]
};

const GOOD = { text: JSON.stringify({ f0: 'Osmosis', f1: 'Sketch a cell', f2: 'Compare sketches' }) };

test('a transient upstream refusal is retried once, quietly', async () => {
  const { AI, calls } = loadAI((url, init, n) => {
    if (url.endsWith('/api/ai/status')) return reply({ available: true });
    if (n === 2) return reply({ error: 'AI provider returned 503' }, 502);  // first generate
    return reply(GOOD);                                                     // the retry
  });

  const res = await AI.generateActivityContent(activity, { topic: 'osmosis in plant cells' });
  assert.equal(res.error, undefined, 'the retry should have produced an answer');
  assert.equal(res.fallback, undefined, 'a successful retry is not a fallback');
  assert.equal(res.values['title'], 'Osmosis');
  assert.equal(res.values['bullets.0.def'], 'Sketch a cell');
  const generates = calls.filter((c) => c.url.endsWith('/api/ai/generate'));
  assert.equal(generates.length, 2, 'exactly one retry, not a storm');
});

test('a rate limit is never retried, and is not papered over with a draft', async () => {
  const { AI, calls } = loadAI((url, init, n) => {
    if (url.endsWith('/api/ai/status')) return reply({ available: true });
    return reply({ error: 'Too many requests' }, 429);
  });

  const res = await AI.generateActivityContent(activity, { topic: 'osmosis' });
  assert.match(res.error, /Too many AI requests/);
  assert.equal(res.values, undefined, 'a 429 asks for a pause; it must not write');
  const generates = calls.filter((c) => c.url.endsWith('/api/ai/generate'));
  assert.equal(generates.length, 1, 'retrying a rate limit is how you earn it');
});

test('when it refuses twice, the heading is written and nothing is invented', async () => {
  const { AI, calls } = loadAI((url) => {
    if (url.endsWith('/api/ai/status')) return reply({ available: true });
    return reply({ error: 'AI provider returned 503' }, 502);
  });

  const res = await AI.generateActivityContent(activity, { topic: 'osmosis in plant cells' });
  assert.equal(res.error, undefined, 'a busy provider is no longer a dead end');
  assert.equal(res.fallback, true);
  assert.equal(res.heuristic, true);
  assert.match(res.notice, /busy/i);
  assert.match(res.notice, /twice/i, 'it was asked twice, so it may say so');
  assert.match(res.notice, /heading/i, 'the notice has to say what it did');

  assert.equal(res.values['title'], 'Osmosis in plant cells', 'topic, capitalised, as the heading');
  assert.deepEqual(Object.keys(res.values), ['title'],
    'only the heading: the shipped starter copy is about another subject, and filler reads as content');

  const generates = calls.filter((c) => c.url.endsWith('/api/ai/generate'));
  assert.equal(generates.length, 2, 'the draft comes after the retry, not instead of it');
});

test('an activity with no heading box says so rather than writing nowhere', async () => {
  const headless = {
    title: 'Run in the room',
    fields: [{ label: 'Prompt', type: 'area', slide: 'bullets.0.def', value: 'x' }]
  };
  const { AI } = loadAI((url) => {
    if (url.endsWith('/api/ai/status')) return reply({ available: true });
    return reply({ error: 'AI provider returned 503' }, 502);
  });

  const res = await AI.generateActivityContent(headless, { topic: 'osmosis' });
  assert.match(res.error, /untouched/);
  assert.equal(res.values, undefined);
});

test('the caller is told, because the toast reads the notice', () => {
  const fs = require('node:fs');
  const activities = fs.readFileSync(path.join(__dirname, '..', 'js', 'activities.js'), 'utf8');
  assert.match(activities, /SF\.toast\(res\.notice \|\| 'Written/,
    'a fallback draft must not be announced as "Written"');
});

test('a timeout is not described as two refusals', async () => {
  /* The 30s ceiling produces exactly one attempt — a timeout has no budget
     left for a retry — so the notice must not claim the provider "turned this
     down twice". Measured twice against the live deploy today: 30.4s and
     30.3s, both HTTP 504. */
  const { AI, calls } = loadAI((url) => {
    if (url.endsWith('/api/ai/status')) return reply({ available: true });
    return reply({ error: 'The AI provider took too long.' }, 504);
  });

  const res = await AI.generateActivityContent(activity, { topic: 'osmosis' });
  assert.equal(res.fallback, true, 'a timeout still gets the heading rather than a dead end');
  assert.doesNotMatch(res.notice, /twice/i, 'it was only asked once');
  assert.match(res.notice, /did not answer in time/i);
  const generates = calls.filter((c) => c.url.endsWith('/api/ai/generate'));
  assert.equal(generates.length, 1, 'a timeout must not be retried — it already spent the budget');
});
