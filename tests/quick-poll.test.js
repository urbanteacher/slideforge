'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

/* No localStorage is provided on purpose: the browser half of the AI engine
   must not have anywhere to keep a credential. If a future change reaches for
   one, these tests break rather than quietly storing a key again. */
function createAiModule({ live = false, routes = {} } = {}) {
  const calls = [];
  const globalObj = {
    SF: {},
    location: { origin: 'http://test.local' },
    fetch: async (url, opts) => {
      calls.push({ url, body: opts && opts.body ? JSON.parse(opts.body) : null });
      if (routes[url]) return routes[url](opts);
      if (/\/api\/ai\/status$/.test(url)) {
        return { ok: true, json: async () => ({ available: live, model: live ? 'gemini-2.5-flash' : null }) };
      }
      throw new Error('unexpected fetch: ' + url);
    }
  };
  const source = fs.readFileSync(require.resolve('../js/ai.js'), 'utf8');
  vm.runInNewContext(source, globalObj);
  return { AI: globalObj.SF.AI, globalObj, calls };
}

test('the browser half of SF.AI holds no credential and cannot be given one', () => {
  const { AI } = createAiModule();

  /* The key lives in the server's environment. Anything here that could read
     or set one would put a live credential in the page, where any script can
     read it — which is what this replaced. */
  for (const gone of ['getApiKey', 'setApiKey', 'clearApiKey', 'hasApiKey']) {
    assert.equal(AI[gone], undefined, gone + ' must not exist on the client');
  }
  assert.equal(typeof AI.checkLiveAI, 'function');
  assert.equal(typeof AI.liveAIKnown, 'function');

  const source = fs.readFileSync(require.resolve('../js/ai.js'), 'utf8');
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(code, /localStorage/, 'no key storage in the client');
  assert.doesNotMatch(code, /generativelanguage\.googleapis\.com/,
    'the client never talks to the provider directly');
  assert.doesNotMatch(code, /[?&]key=/, 'and never puts a key in a URL');
});

test('SF.AI asks the server whether live generation is available', async () => {
  const offline = createAiModule({ live: false });
  assert.equal(await offline.AI.checkLiveAI(), false);
  assert.equal(offline.calls[0].url, 'http://test.local/api/ai/status');

  const online = createAiModule({ live: true });
  assert.equal(await online.AI.checkLiveAI(), true);

  /* Asked once per page, not once per poll. */
  await online.AI.checkLiveAI();
  assert.equal(online.calls.filter((c) => /status$/.test(c.url)).length, 1);
});

test('SF.AI generates diagnostic concept poll from slide keywords offline', async () => {
  const { AI } = createAiModule();
  const slide = {
    id: 's1',
    type: 'content',
    title: 'Cellular Respiration Stages',
    body: 'Understanding the biochemical pathway.',
    keywords: [
      { word: 'Glycolysis', def: 'Splitting glucose into pyruvate' },
      { word: 'Krebs Cycle', def: 'Generating electron carriers' },
      { word: 'Electron Transport', def: 'ATP synthesis via proton gradient' }
    ]
  };

  const poll = await AI.generatePollForSlide(slide);
  assert.ok(poll, 'poll should be generated');
  assert.equal(poll.kind, 'poll');
  assert.ok(poll.prompt.includes('Cellular Respiration') || poll.prompt.includes('concept') || poll.prompt.includes('clarification'));
  assert.ok(poll.options.length >= 3);
  assert.ok(poll.options.includes('Glycolysis'));
  assert.ok(poll.options.includes('Krebs Cycle'));
  assert.ok(poll.options.includes('Electron Transport'));
  assert.equal(poll.heuristic, true);
});

test('SF.AI generates confidence scale from conceptual content slide offline', async () => {
  const { AI } = createAiModule();
  const slide = {
    id: 's2',
    type: 'content',
    title: 'Newton\'s Third Law of Motion',
    body: 'For every action, there is an equal and opposite reaction.'
  };

  const poll = await AI.generatePollForSlide(slide);
  assert.ok(poll);
  assert.ok(poll.kind === 'scale' || poll.kind === 'poll');
  if (poll.kind === 'scale') {
    assert.ok(poll.prompt.includes('Newton\'s Third Law'));
    assert.equal(poll.points, 5);
    assert.ok(poll.lowLabel);
    assert.ok(poll.highLabel);
  }
  assert.equal(poll.heuristic, true);
});

test('SF.AI generates reflection word cloud or check for plenary slide offline', async () => {
  const { AI } = createAiModule();
  const slide = {
    id: 's3',
    type: 'content',
    title: 'Key Takeaways & Reflection',
    body: 'Summary of today\'s discussion on quantum mechanics.'
  };

  const poll = await AI.generatePollForSlide(slide);
  assert.ok(poll);
  assert.ok(['wordcloud', 'scale', 'poll'].includes(poll.kind));
  assert.ok(poll.prompt);
});

test('SF.AI offline prompt generation provides tailored options for custom queries', async () => {
  const { AI } = createAiModule();
  const poll1 = await AI.generatePollFromPrompt('Should we do another worked example before the test?');
  assert.equal(poll1.kind, 'poll');
  assert.ok(poll1.options.length >= 2);
  assert.ok(poll1.options.some(o => /yes|another/i.test(o)));

  const poll2 = await AI.generatePollFromPrompt('Do you agree with this hypothesis?');
  assert.equal(poll2.kind, 'poll');
  assert.ok(poll2.options.some(o => /agree/i.test(o)));
});

test('SF.AI generates through this app\'s own server, never the provider', async () => {
  const gen = 'http://test.local/api/ai/generate';
  const { AI, calls } = createAiModule({
    live: true,
    routes: {
      [gen]: async () => ({
        ok: true,
        /* The server returns the model's text already unwrapped, so the
           provider's response shape stays on the server side. */
        json: async () => ({
          text: JSON.stringify({
            kind: 'poll',
            prompt: 'Which phase of mitosis separates sister chromatids?',
            options: ['Prophase', 'Metaphase', 'Anaphase', 'Telophase']
          })
        })
      })
    }
  });

  const slide = { id: 's4', title: 'Mitosis Phases' };
  const poll = await AI.generatePollForSlide(slide);

  const generated = calls.filter((c) => c.url === gen);
  assert.equal(generated.length, 1, 'one call, to our own origin');
  assert.deepEqual(Object.keys(generated[0].body).sort(), ['system', 'user'],
    'the client sends only the prompt — it has no key to send');
  for (const c of calls) {
    assert.doesNotMatch(c.url, /googleapis/, 'the browser never reaches the provider');
    assert.doesNotMatch(c.url, /[?&]key=/, 'and never carries a key in a URL');
  }

  assert.equal(poll.kind, 'poll');
  assert.equal(poll.prompt, 'Which phase of mitosis separates sister chromatids?');
  assert.deepEqual([...poll.options], ['Prophase', 'Metaphase', 'Anaphase', 'Telophase']);
  assert.equal(poll.heuristic, false);
});

test('a server with no key, or a failing one, falls back to the heuristics', async () => {
  const gen = 'http://test.local/api/ai/generate';
  const slide = { id: 's4', title: 'Mitosis Phases' };

  /* 503 is the no-key case: a deployment without GEMINI_API_KEY still makes
     polls, which is the whole point of keeping the heuristics. */
  const noKey = createAiModule({ live: true, routes: { [gen]: async () => ({ ok: false, status: 503 }) } });
  const a = await noKey.AI.generatePollForSlide(slide);
  assert.ok(a);
  assert.equal(a.heuristic, true);

  const throttled = createAiModule({ live: true, routes: { [gen]: async () => ({ ok: false, status: 429 }) } });
  const b = await throttled.AI.generatePollForSlide(slide);
  assert.equal(b.heuristic, true);

  /* And when the status probe itself says no, nothing is even attempted. */
  const offline = createAiModule({ live: false });
  const c = await offline.AI.generatePollForSlide(slide);
  assert.equal(c.heuristic, true);
  assert.equal(offline.calls.filter((x) => x.url === gen).length, 0);
});

test('Live.startCustomPrompt and Live.endCustomPrompt manage impromptu poll lifecycle', () => {
  // Bridge SF.Live environment
  const sent = [];
  const globalObj = {
    addEventListener: () => {},
    removeEventListener: () => {},
    document: {
      addEventListener: () => {},
      removeEventListener: () => {},
      body: {
        classList: {
          add(c) { this[c] = true; },
          remove(c) { delete this[c]; },
          contains(c) { return !!this[c]; }
        }
      },
      getElementById: () => null
    },
    location: { protocol: 'http:', origin: 'http://localhost:8787' },
    setInterval: () => 1,
    clearInterval: () => {}
  };
  globalObj.window = globalObj;

  // Load model.js for SF.makeFeedback, SF.normalizeFeedback, SF.FEEDBACK_KINDS
  const modelSrc = fs.readFileSync(require.resolve('../js/model.js'), 'utf8');
  vm.runInNewContext(modelSrc, globalObj);

  // Load render.js for SF.feedbackViewOpts
  const renderSrc = fs.readFileSync(require.resolve('../js/render.js'), 'utf8');
  vm.runInNewContext(renderSrc, globalObj);

  // Mock player and presenter sync
  let closedFocus = false;
  let presenterSynced = 0;
  globalObj.SF.Player = {
    open: true,
    deck: { slides: [{ id: 's1', type: 'content' }] },
    idx: 0,
    on() {},
    emit() {},
    showFeedbackFocus() {},
    closeFocus() { closedFocus = true; },
    syncPresenter() { presenterSynced++; }
  };

  // Load live.js
  const liveSrc = fs.readFileSync(require.resolve('../js/live.js'), 'utf8');
  vm.runInNewContext(liveSrc, globalObj);

  const Live = globalObj.SF.Live;
  assert.ok(Live);
  assert.equal(typeof Live.startCustomPrompt, 'function');
  assert.equal(typeof Live.endCustomPrompt, 'function');
  assert.equal(typeof Live.customPromptOpen, 'function');

  // Launch a custom poll
  const started = Live.startCustomPrompt({
    kind: 'poll',
    prompt: 'Should we take a break?',
    options: ['Yes', 'No', '5 more minutes'],
    presentAs: 'focus'
  });

  assert.equal(started, true);
  assert.equal(Live.customPromptOpen(), true);
  assert.ok(Live.prompt);
  assert.equal(Live.prompt.custom, true);
  assert.equal(Live.prompt.prompt, 'Should we take a break?');
  assert.deepEqual(Live.prompt.options, ['Yes', 'No', '5 more minutes']);
  assert.ok(globalObj.document.body.classList.contains('fb-open'));
  assert.ok(presenterSynced > 0);
  assert.ok(Live.digest, 'should populate sample feedback digest when offline');
  assert.equal(Live.digest.kind, 'poll');
  assert.equal(Live.digest.sample, true);

  // End the custom poll
  const ended = Live.endCustomPrompt();
  assert.equal(ended, true);
  assert.equal(Live.customPromptOpen(), false);
  assert.equal(Live.prompt, null);
  assert.equal(globalObj.document.body.classList.contains('fb-open'), false);
  assert.equal(closedFocus, true);
});
