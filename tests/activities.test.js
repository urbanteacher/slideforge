'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');

/* The catalogue is the 54 from activity-catalog-app, carried over rather than
   reinvented. These tests hold it to that: the right number, in the right
   phases, naming only primitives SlideForge actually has.

   Note what is NOT tested here: any relationship to the `activities` array in
   js/studio.js. That list is Quiz studio's game formats and this one is the
   lesson catalogue. They are different lists answering different questions,
   and tying them together was the mistake this replaced. */

test('the catalogue is the 54, split across the eleven phases as the source has them', async () => {
  const { ACTIVITIES, PHASES, phaseCounts } = await import('../src/activities/catalogue.js');
  assert.equal(ACTIVITIES.length, 54);
  assert.equal(PHASES.length, 11);

  /* Straight from the source's phase files. If a count moves, either the
     catalogue drifted or the source did, and either is worth knowing. */
  assert.deepEqual(phaseCounts(), {
    'starter-slide': 3, 'starter-activity': 6, 'activation': 3, 'construction': 4,
    'mini-activity': 6, 'main-activity': 5, 'collaboration': 12, 'mini-quiz': 4,
    'reflection': 4, 'plenary': 2, 'activity-plenary': 5
  });
});

test('most of a lesson is not a quiz', async () => {
  const { ACTIVITIES } = await import('../src/activities/catalogue.js');
  const by = ACTIVITIES.reduce((n, a) => ((n[a.target] = (n[a.target] || 0) + 1), n), {});
  /* Three incompatible game mappings now provide classroom materials. */
  assert.deepEqual(by, { slide: 23, game: 10, moment: 10, feedback: 9, 'slide-arc': 2 });
  /* The shape is the point. A catalogue that drifted towards games would be
     describing a different product, so this fails if games ever lead. */
  assert.ok(by.game < by.slide, 'games should not outnumber slides');
});

test('every primitive the catalogue names exists in this build', async () => {
  const { ACTIVITIES } = await import('../src/activities/catalogue.js');
  const { GAME_STYLES } = await import('../src/games/registry.js');
  const { DECK_TYPES } = await import('../src/deck/content.js');
  const { FEEDBACK_KINDS } = await import('../src/deck/feedback.js');

  for (const a of ACTIVITIES) {
    if (a.style) assert.ok(GAME_STYLES[a.style], a.key + ' names unregistered engine ' + a.style);
    if (a.layout) assert.ok(DECK_TYPES.includes(a.layout), a.key + ' names unknown layout ' + a.layout);
    if (a.feedbackKind) {
      assert.ok(FEEDBACK_KINDS[a.feedbackKind], a.key + ' names unknown feedback ' + a.feedbackKind);
    }
    /* A game with no engine would insert nothing; a slide with no layout
       would land as a blank content slide with no shape to teach from. */
    if (a.target === 'game') assert.ok(a.style, a.key + ' builds a game but names no engine');
    if (a.target === 'slide') assert.ok(a.layout, a.key + ' builds a slide but names no layout');
    if (a.target === 'feedback') assert.ok(a.feedbackKind, a.key + ' collects feedback but names no kind');
  }
});

test('every activity carries what the rail and the insert need', async () => {
  const { ACTIVITIES, PHASES } = await import('../src/activities/catalogue.js');
  const keys = new Set();
  for (const a of ACTIVITIES) {
    assert.ok(!keys.has(a.key), 'duplicate key ' + a.key);
    keys.add(a.key);
    assert.ok(a.title && a.blurb, a.key + ' is missing title or blurb');
    assert.ok(PHASES.some((p) => p.key === a.phase), a.key + ' has unknown phase ' + a.phase);
    assert.ok(a.minutes > 0, a.key + ' has no duration, so it cannot be budgeted');
    /* The steps are how it runs. For the ten moments they are the entire
       activity — there is no game to open and nothing to author. */
    assert.ok(a.steps.length >= 2, a.key + ' has no steps');
    for (const step of a.steps) assert.ok(/[a-zA-Z]/.test(step), a.key + ' has an empty step');
  }
});

test('minutes add up across a planned run', async () => {
  const { totalMinutes, activity, ACTIVITIES } = await import('../src/activities/catalogue.js');
  const keys = ACTIVITIES.slice(0, 4).map((a) => a.key);
  const expected = keys.reduce((n, k) => n + activity(k).minutes, 0);
  assert.equal(totalMinutes(keys), expected);
  /* An unknown key contributes nothing rather than NaN-ing the whole budget. */
  assert.equal(totalMinutes([keys[0], 'no-such-activity']), activity(keys[0]).minutes);
  assert.equal(totalMinutes([]), 0);
});


function activityRuntime() {
  const vm = require('node:vm'), fs = require('node:fs');
  const store = new Map();
  const storage = {
    getItem: k => store.get(k) || null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
    clear: () => store.clear()
  };
  const c = {
    document: { getElementById: () => null },
    localStorage: storage
  };
  c.window = c;
  vm.createContext(c);
  for (const file of ['model', 'editor', 'activities']) {
    vm.runInContext(fs.readFileSync(require.resolve('../js/' + file + '.js'), 'utf8'), c);
  }
  return c.SF;
}

test('all 54 preserve source identity and all 52 remaining entries have authored content', async () => {
  const { ACTIVITIES } = await import('../src/activities/catalogue.js');
  const meta = require('../src/activities/source-meta.json');
  for (const a of ACTIVITIES) {
    const source = meta[a.title];
    assert.ok(source, a.key);
    assert.equal(a.blurb, source.sourceBlurb, a.key);
    assert.equal(a.minutes, source.sourceMinutes, a.key);
    assert.deepEqual(a.steps, source.sourceSteps, a.key);
    assert.ok(a.materials.length > 0, a.key);
    assert.ok(a.fields?.length || a.pages?.length || a.gamePreset?.seeds.length, a.key);
    if (a.originalMapping && (a.target !== a.originalMapping.target ||
        (a.originalMapping.layout && a.layout !== a.originalMapping.layout) ||
        a.feedbackKind !== a.originalMapping.feedbackKind)) assert.ok(a.mappingReason, a.key);
  }
});

test('slide builders retain labels, teacher notes, timers and feedback through save normalization', () => {
  const SF = activityRuntime();
  for (const a of SF.Activities.ACTIVITIES.filter(a => a.target !== 'game')) {
    const slides = SF.Activities.makeSlides(a);
    assert.equal(slides.length, a.pages?.length || 1, a.key);
    for (const [i, raw] of slides.entries()) {
      const s = SF.normalizeSlide(JSON.parse(JSON.stringify(raw)));
      assert.equal(s.activity, a.key);
      assert.equal(s.activityPresentation, a.presentation);
      assert.equal(s.activityInstance, slides[0].id);
      assert.ok(s.notes.includes(a.steps[0]), a.key);
      assert.ok(s.notes.includes('Materials (source)'), a.key);
      const fields = a.pages ? a.pages[i].fields : a.fields;
      const timer = fields.find(f => f.type === 'minutes');
      if (timer) assert.equal(s.timeLimit, timer.value * 60, a.key);
      for (const f of fields.filter(f => f.slide.endsWith('.def'))) {
        const line = SF.parseKeywordLine(s.bullets[Number(f.slide.split('.')[1])]);
        assert.equal(line.term, f.label, a.key);
        assert.equal(line.def, f.value, a.key);
      }
      assert.ok(!s.bullets.some(b => /^(First point|Second point|Third point|Keyword\t)/.test(b)), a.key);
      if (a.target === 'feedback') assert.ok(SF.slideFeedback(s), a.key);
    }
  }
  const hook = SF.Activities.makeSlides(SF.Activities.activity('hook-and-predict'))[0];
  assert.equal(hook.timeLimit, 420);
  assert.equal(hook.bullets.length, 2);
});

test('activity games have valid, independent question banks and compile successfully', () => {
  const SF = activityRuntime();
  for (const a of SF.Activities.ACTIVITIES.filter(a => a.target === 'game')) {
    const g = SF.makeGame(a.title, a.style);
    Object.assign(g.settings, a.gamePreset.settings);
    g.questions = a.gamePreset.seeds.map(seed => SF.normalizeQuestion(Object.assign(SF.makeQuestion(a.style), JSON.parse(JSON.stringify(seed))), a.style));
    const engine = SF.gameStyle(a.style);
    if (engine.board) assert.equal(engine.board(g), null, a.key);
    g.questions.forEach((q, i) => assert.equal(engine.problems(q, i + 1), null, a.key));
    assert.ok(SF.compileGame(g).length > 0, a.key);
    const before = JSON.stringify(a.gamePreset.seeds);
    g.questions[0].question = 'Edited';
    assert.equal(JSON.stringify(a.gamePreset.seeds), before, a.key);
  }
});

test('activity showcase isolates only that activity into the player without full presentation deck', () => {
  const SF = activityRuntime();
  let startedDeck = null;
  let startedOpts = null;
  SF.Player = {
    open: false,
    start: (deck, idx, opts) => {
      startedDeck = deck;
      startedOpts = opts;
      SF.Player.open = true;
    },
    close: () => { SF.Player.open = false; },
    on: () => {}
  };

  // 1. Single slide moment activity
  const hookAct = SF.Activities.activity('hook-and-predict');
  SF.Activities.showcaseDef(hookAct);
  assert.ok(startedDeck, 'player was started');
  assert.equal(startedDeck.slides.length, 1);
  assert.equal(startedDeck.slides[0].activity, 'hook-and-predict');
  assert.equal(startedOpts.fullscreen, false);

  // 2. Multi-slide arc (Flipped Instruction = 3 slides)
  const flippedAct = SF.Activities.activity('flipped-instruction');
  SF.Activities.showcaseDef(flippedAct);
  assert.equal(startedDeck.slides.length, 3);
  assert.ok(startedDeck.slides.every(s => s.activity === 'flipped-instruction'));

  // 3. Game activity (Interleaving Mixed Practice = choice engine with 10 questions compiled)
  const quizAct = SF.Activities.activity('interleaving-mixed-practice');
  SF.Activities.showcaseDef(quizAct);
  assert.ok(startedDeck.slides.length >= 10, 'game slides were compiled');
  assert.ok(startedDeck.slides.some(s => s.type === 'quiz'));

  // 4. Board game activity (Quick Retrieval Quiz = lowstakes board slide compiled)
  const lowstakesAct = SF.Activities.activity('quick-retrieval-quiz');
  SF.Activities.showcaseDef(lowstakesAct);
  assert.ok(startedDeck.slides.length >= 1, 'board slide was compiled');
  assert.ok(startedDeck.slides.some(s => s.lowstakesBoard), 'lowstakes board payload attached');

  // 5. Showcase an inserted activity with custom user edits from the deck
  const customDeck = SF.makeDeck('Test Presentation');
  customDeck.slides = [
    SF.makeSlide('title'),
    ...SF.Activities.makeSlides(hookAct),
    SF.makeSlide('content')
  ];
  SF.Editor.deck = () => customDeck;
  customDeck.slides[1].bullets[0] = 'Notice\tOur edited custom observation';
  SF.Activities.showcaseRow({ key: customDeck.slides[1].activityInstance, slide: customDeck.slides[1], slides: [customDeck.slides[1]], at: 1 });
  assert.ok(startedDeck);
  assert.equal(startedDeck.slides.length, 1, 'isolated to only the activity slide');
  assert.equal(startedDeck.slides[0].bullets[0], 'Notice\tOur edited custom observation', 'edited content preserved in showcase');

  // 6. Showcase an activity with a poll (e.g. Exit Ticket or Four-Corner)
  const pollAct = SF.Activities.activity('structured-reflection-protocol');
  assert.equal(pollAct.feedbackKind, 'poll');
  SF.Activities.showcaseDef(pollAct);
  assert.ok(startedDeck);
  assert.equal(startedDeck.slides.length, 1);
  assert.equal(startedDeck.slides[0].feedback.kind, 'poll');
  assert.equal(startedOpts.demo, true);
  assert.equal(startedOpts.demoMode, 'discuss');
});
