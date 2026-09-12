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

test('the offline poll reads the slide this app actually builds', async () => {
  const { AI } = createAiModule();

  /* A keywords slide, in the shape makeSlide produces: content lives in
     `bullets`, each "term<TAB>definition". This test used to hand the
     extractor a `keywords` array of objects, which nothing in SlideForge
     creates — so it passed while the extractor returned [] for every real
     slide and every poll fell back to a title-only confidence scale. */
  const slide = {
    id: 's1',
    type: 'keywords',
    title: 'Cellular Respiration Stages',
    body: 'Understanding the biochemical pathway.',
    bullets: [
      'Glycolysis\tSplitting glucose into pyruvate',
      'Krebs Cycle\tGenerating electron carriers',
      'Electron Transport\tATP synthesis via proton gradient'
    ]
  };

  /* Spread first: ai.js runs in a vm realm, so its Array fails a strict deep
     compare against one built here. */
  assert.deepEqual([...AI.extractSlideTerms(slide)],
    ['Glycolysis', 'Krebs Cycle', 'Electron Transport'],
    'the term half of each bullet is the concept worth asking about');

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

/* The generator's brief is the engine's own contract, and the engine has the
   final say on what it produced. A question that fails validation is exactly
   the kind a teacher would not notice until the room was looking at it. */
/* js/model.js publishes onto `window`, so it is loaded into a sandbox the
   same way the other suites do it. */
function loadEngines() {
  const sandbox = {};
  global.window = sandbox;
  delete require.cache[require.resolve('../js/model.js')];
  require('../js/model.js');
  delete global.window;
  return sandbox.SF;
}

function withEngines(mod) {
  const SF = loadEngines();
  Object.assign(mod.globalObj.SF, {
    gameStyle: SF.gameStyle, makeQuestion: SF.makeQuestion, normalizeQuestion: SF.normalizeQuestion
  });
  return mod;
}

function gameAiModule({ reply }) {
  const gen = 'http://test.local/api/ai/generate';
  return withEngines(createAiModule({
    live: true,
    routes: { [gen]: async () => ({ ok: true, json: async () => ({ text: JSON.stringify(reply) }) }) }
  }));
}

test('generated questions are judged by the engine, and the bad ones dropped', async () => {
  const good = {
    question: 'Which organelle contains chlorophyll?',
    options: ['Nucleus', 'Chloroplast', 'Ribosome'], correct: 1,
    explanation: 'Chloroplasts hold the chlorophyll used in photosynthesis.'
  };
  const { AI, calls } = gameAiModule({
    reply: { questions: [
      good,
      /* One answer: the choice engine needs at least two, so this must not
         reach the teacher's rail. */
      { question: 'Half a question', options: ['Only one'], correct: 0 },
      /* No question text at all. */
      { question: '   ', options: ['A', 'B'], correct: 0 }
    ] }
  });

  const game = { id: 'g1', style: 'choice', title: 'Cells', questions: [] };
  const res = await AI.generateQuestionsForGame(game, { topic: 'Plant cells', count: 3 });

  assert.ok(!res.error, res.error);
  assert.equal(res.questions.length, 1, 'only the valid one survives');
  assert.equal(res.rejected, 2);
  assert.equal(res.questions[0].question, good.question);

  /* And the brief really carried the engine's limits and what was already
     written, which is the context the poll generator never had. */
  const sent = calls.find((c) => /generate$/.test(c.url)).body;
  assert.match(sent.system, /Two to four options/);
  assert.match(sent.system, /mistake a learner could actually make/);
  assert.match(sent.user, /Multiple choice/);
  assert.match(sent.user, /Plant cells/);
});

test('each format is asked for the shape it actually uses', async () => {
  /* One prompt asked to cover every game writes multiple choice whatever you
     asked for. The lesson planner had a generator per format for this reason,
     and these are the two that differ most from a plain quiz. */
  const typed = gameAiModule({
    reply: { questions: [
      { question: 'Chemical symbol for gold?', accept: ['Au', 'aurum'], explanation: 'From the Latin aurum.' }
    ] }
  });
  const t = await typed.AI.generateQuestionsForGame(
    { id: 'g2', style: 'type', title: 'Recall', questions: [] }, { topic: 'Elements' });
  assert.ok(!t.error, t.error);
  assert.equal(t.questions.length, 1);
  assert.deepEqual([...t.questions[0].accept], ['Au', 'aurum'], 'typed answers, not options');
  assert.match(typed.calls.find((c) => /generate$/.test(c.url)).body.system,
    /every spelling you would take/);

  /* Bingo wants a term and a short definition, and the eight-word rule is the
     one the old app fought hardest for: a long definition does not fit on a
     square. */
  const bingo = gameAiModule({
    reply: { questions: [
      { term: 'CPU', definition: 'Brain of computer - processes instructions' },
      { term: 'RAM', definition: 'Temporary memory for running programs' }
    ] }
  });
  const b = await bingo.AI.generateQuestionsForGame(
    { id: 'g4', style: 'bingo', title: 'Hardware', questions: [] }, { topic: 'Computer parts', count: 2 });
  assert.ok(!b.error, b.error);
  assert.equal(b.questions[0].term, 'CPU');
  assert.equal(b.questions[0].definition, 'Brain of computer - processes instructions');
  assert.match(bingo.calls.find((c) => /generate$/.test(c.url)).body.system, /at most eight words/);

  /* True/false is a claim, not a question, and isTrue maps onto the engine's
     fixed option pair rather than a free list. */
  const tf = gameAiModule({
    reply: { questions: [
      { question: 'Light travels faster than sound.', isTrue: true, explanation: 'It does.' },
      { question: 'The heart has five chambers.', isTrue: false, explanation: 'Four.' }
    ] }
  });
  const r = await tf.AI.generateQuestionsForGame(
    { id: 'g5', style: 'truefalse', title: 'TF', questions: [] }, { topic: 'Science', count: 2 });
  assert.ok(!r.error, r.error);
  assert.deepEqual([...r.questions[0].options], ['True', 'False']);
  assert.equal(r.questions[0].correct, 0);
  assert.equal(r.questions[1].correct, 1);
});

test('a format with no brief says so rather than writing the wrong thing', async () => {
  const { AI } = gameAiModule({ reply: { questions: [] } });
  /* Slider answers are a value on a line with a tolerance — nothing in the
     question/options shape describes one. */
  const res = await AI.generateQuestionsForGame(
    { id: 'g6', style: 'slider', title: 'Estimate', questions: [] }, { topic: 'Distances' });
  assert.match(res.error, /not written by AI yet/);
  assert.match(res.error, /Browse quizzes/);
});

test('with no server key it says so instead of inventing subject knowledge', async () => {
  const mod = withEngines(createAiModule({ live: false }));
  const res = await mod.AI.generateQuestionsForGame(
    { id: 'g3', style: 'choice', title: 'Cells', questions: [] }, { topic: 'Mitosis' });
  /* Heuristics can pick a concept off a slide; they cannot know which
     organelle holds chlorophyll. Saying so beats fabricating. */
  assert.match(res.error, /needs the AI server key/);
  assert.match(res.error, /Browse quizzes/);
});

/* Ported from the lesson planner's json-parser, which earned these the hard
   way: a model told to return only JSON still fences it, trails a comma, or
   slips a control character into a string. A bare JSON.parse throws on all
   three, and to a teacher that reads as "the AI did nothing". */
test('model JSON survives the three things models actually get wrong', async () => {
  const gen = 'http://test.local/api/ai/generate';
  const good = { question: 'Which gas?', options: ['Oxygen', 'Carbon dioxide'], correct: 1, explanation: 'CO2.' };
  const body = JSON.stringify({ questions: [good] });

  const shapes = {
    'a json code fence': '```json\n' + body + '\n```',
    'a bare code fence': '```\n' + body + '\n```',
    'prose either side': 'Here you go:\n' + body + '\nHope that helps!',
    'a trailing comma': '{"questions":[' + JSON.stringify(good) + ',]}',
    'a control character in a string':
      '{"questions":[{"question":"Which gas?\u0007","options":["Oxygen","Carbon dioxide"],"correct":1,"explanation":"CO2."}]}'
  };

  for (const [label, text] of Object.entries(shapes)) {
    const mod = withEngines(createAiModule({
      live: true,
      routes: { [gen]: async () => ({ ok: true, json: async () => ({ text }) }) }
    }));
    const res = await mod.AI.generateQuestionsForGame(
      { id: 'g', style: 'choice', title: 'Gases', questions: [] }, { topic: 'Air', count: 1 });
    assert.ok(!res.error, label + ' should still parse, got: ' + res.error);
    assert.equal(res.questions.length, 1, label);
  }

  /* And genuinely unusable output is an error, not a silently empty quiz. */
  const broken = withEngines(createAiModule({
    live: true,
    routes: { [gen]: async () => ({ ok: true, json: async () => ({ text: 'I cannot help with that.' }) }) }
  }));
  const res = await broken.AI.generateQuestionsForGame(
    { id: 'g', style: 'choice', title: 'Gases', questions: [] }, { topic: 'Air' });
  assert.match(res.error, /could not be reached|Nothing came back/);
});

test('the toast count includes rows dropped before the engine saw them', async () => {
  const gen = 'http://test.local/api/ai/generate';
  const mod = withEngines(createAiModule({
    live: true,
    routes: { [gen]: async () => ({ ok: true, json: async () => ({ text: JSON.stringify({ questions: [
      { question: 'Which gas?', options: ['Oxygen', 'Carbon dioxide'], correct: 1, explanation: 'CO2.' },
      { question: 'No options at all' },
      { question: 'Only one', options: ['a'], correct: 0 }
    ] }) }) }) }
  }));
  const res = await mod.AI.generateQuestionsForGame(
    { id: 'g', style: 'choice', title: 'Gases', questions: [] }, { topic: 'Air', count: 3 });
  assert.equal(res.questions.length, 1);
  assert.equal(res.rejected, 2, 'both kinds of rejection counted, not just the engine ones');
});

/* Ported from the lesson planner's activity-guidance + activity-classifier.
   One rule runs through all of them, and it is the one a model breaks by
   default: you cannot ask students to analyse something you have not
   provided. Asked for an error-analysis activity it writes "find the three
   mistakes below" and then stops — and the lesson meets a blank box in front
   of a class. */
function activityAi(reply, live = true) {
  const gen = 'http://test.local/api/ai/generate';
  return withEngines(createAiModule({
    live,
    routes: { [gen]: async () => ({ ok: true, json: async () => ({ text: JSON.stringify(reply) }) }) }
  }));
}

function activity(key) {
  const SF = loadEngines();
  return SF.Activities.activity(key);
}

test('an activity is classified by what it is, not by a word in its steps', () => {
  const { AI } = activityAi({});
  const kind = (k) => { const c = AI.classifyActivity(activity(k)); return c ? c.kind : null; };

  assert.equal(kind('error-analysis'), 'error-analysis');
  assert.equal(kind('worked-example-analysis'), 'worked-example');
  assert.equal(kind('concept-card-sort'), 'sorting');
  assert.equal(kind('hook-and-predict'), 'hook-predict');

  /* The old app searched the description and the steps too, so a
     Think-Pair-Share whose steps say "compare your answers" classified as a
     comparison activity and got told to define two concepts it has not got. */
  assert.equal(kind('think-pair-share'), 'discussion');
});

test('the material box must hold the material, not a note about it', async () => {
  const ea = activity('error-analysis');
  const boxes = (ea.fields || []).filter((f) => f.type !== 'minutes');
  assert.match(boxes[1].label, /Sample work/, 'the catalogue names the slot the flawed work goes in');

  /* An instruction where the flawed work belongs is refused outright. */
  const described = await activityAi({
    f0: 'Error Analysis: Osmosis',
    f1: 'Insert three incorrect statements here',
    f2: 'Spot them', f3: 'Correct them', f4: 'Reflect'
  }).AI.generateActivityContent(ea, { topic: 'Osmosis' });
  assert.match(described.error, /instead of writing it/);
  assert.match(described.error, /Sample work/);

  /* The actual flawed work is accepted, and lands keyed by slide path so it
     goes in through the same write() a teacher's typing does. */
  const written = await activityAi({
    f0: 'Error Analysis: Osmosis',
    f1: '1. Water moves from low to high water potential. 2. Osmosis needs energy from respiration. 3. A cell in pure water shrinks.',
    f2: 'Find all three mistakes',
    f3: 'Write the corrected statement for each',
    f4: 'Which was hardest to spot, and why?'
  }).AI.generateActivityContent(ea, { topic: 'Osmosis' });
  assert.ok(!written.error, written.error);
  assert.equal(written.kind, 'error-analysis');
  assert.ok(Object.keys(written.values).includes('bullets.0.def'));
});

test('the guardrail for the activity is the one sent to the model', async () => {
  const mod = activityAi({ f0: 'x', f1: 'y' });
  await mod.AI.generateActivityContent(activity('concept-card-sort'), { topic: 'States of matter' });
  const sent = mod.calls.find((c) => /generate$/.test(c.url)).body;
  assert.match(sent.system, /categories by name/);
  assert.match(sent.system, /debatable/);
  /* And the boxes are named in the brief, because the catalogue knows them. */
  assert.match(sent.user, /Concept Card Sort/);
  assert.match(sent.user, /f0 = /);
});

test('with no key it says the activity already has starter content', async () => {
  const res = await activityAi({}, false).AI
    .generateActivityContent(activity('error-analysis'), { topic: 'Osmosis' });
  assert.match(res.error, /needs the AI server key/);
  assert.match(res.error, /starter content/);
});
