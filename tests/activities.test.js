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
  /* Three incompatible game mappings now provide classroom materials. Hook &
     Predict and Preview Next Lesson collect from the phones; the Connection
     Hunt runs as timed stages (activities audit, wave 3). The Question Cube
     activity hands over to the Question Cube game, and the Concept Card Sort
     is a sort (AC-14, AC-15). */
  assert.deepEqual(by, { slide: 20, game: 12, moment: 11, feedback: 9, 'slide-arc': 2 });
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

/* How to run used to sit at the top of the activity inspector. The inspector
   is tabbed now — Edit / Timer / Engage / Write / Rules — and the drawer moved
   into Rules with the materials, the teacher notes and the mapping reason. The
   drawer itself is unchanged: a details/summary with a Reveal toggle and the
   steps as an ordered list, and the old bottom "HOW IT RUNS" eyebrow stays
   gone. This follows it to its new home rather than pinning the old one. */
test('activity inspector keeps How to run, with its steps, behind the Rules tab', () => {
  const vm = require('node:vm'), fs = require('node:fs');
  const store = new Map();
  const storage = {
    getItem: k => store.get(k) || null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
    clear: () => store.clear()
  };
  function makeMockNode(tag, cls, text) {
    const children = [];
    /* Attributes are recorded rather than ignored. The inspector's tab strip
       is a real tablist — role and aria-selected on the strip and on every
       button — and a stub without setAttribute does not fail an assertion,
       it throws inside the code under test. */
    const attrs = {};
    return {
      tagName: (tag || 'div').toUpperCase(),
      className: cls || '',
      textContent: text || '',
      children,
      childNodes: children,
      style: {},
      attrs,
      setAttribute(name, value) { attrs[String(name)] = String(value); },
      getAttribute(name) {
        return Object.prototype.hasOwnProperty.call(attrs, name) ? attrs[name] : null;
      },
      hasAttribute(name) { return Object.prototype.hasOwnProperty.call(attrs, name); },
      removeAttribute(name) { delete attrs[String(name)]; },
      appendChild(child) { children.push(child); return child; },
      replaceChildren(...args) { children.length = 0; if (args) children.push(...args); },
      querySelector(sel) {
        if (sel === '.howto-toggle') {
          function find(node) {
            if (node.className && node.className.includes('howto-toggle')) return node;
            for (const c of node.children) {
              const f = find(c);
              if (f) return f;
            }
            return null;
          }
          return find(this);
        }
        return null;
      },
      querySelectorAll() { return []; },
      addEventListener() {}
    };
  }
  const inspector = makeMockNode('div', 'inspector');
  const c = {
    document: {
      getElementById: (id) => id === 'inspector' ? inspector : null,
      createElement: (tag) => makeMockNode(tag)
    },
    localStorage: storage,
    console
  };
  c.window = c;
  c.SF = {
    Shell: {
      UI: {
        /* The handler is kept, not dropped: the inspector is tabbed now, so a
           test that cannot press a tab can only ever see the default pane. */
        button: (text, cls, fn) => {
          const b = makeMockNode('button', cls, text);
          b.onclick = fn || null;
          b.click = () => { if (b.onclick) b.onclick(); };
          return b;
        },
        field: (label, input, hint) => makeMockNode('div', 'field'),
        num: () => makeMockNode('input'),
        text: () => makeMockNode('input'),
        area: () => makeMockNode('textarea'),
        select: () => makeMockNode('select'),
        segmented: () => makeMockNode('div')
      }
    }
  };
  vm.createContext(c);
  for (const file of ['model', 'render', 'editor', 'activities']) {
    vm.runInContext(fs.readFileSync(require.resolve('../js/' + file + '.js'), 'utf8'), c);
  }
  const SF = c.SF;
  SF.Editor.drawFeedback = () => {};
  const hookAct = SF.Activities.activity('hook-objectives');
  const slides = SF.Activities.makeSlides(hookAct);
  const deck = SF.makeDeck('Test');
  deck.slides = slides;
  SF.Editor.deck = () => deck;
  SF.Editor.currentSlideId = () => slides[0].id;

  SF.Activities.draw();

  assert.ok(inspector.children.length > 0, 'inspector populated');

  /* The tab strip is a real tablist, and Edit is the pane you land on. */
  function tabStrip() {
    return inspector.children.find((c) => String(c.className).includes('design-panes'));
  }
  function tab(label) {
    const strip = tabStrip();
    assert.ok(strip, 'inspector has a tab strip');
    const hit = strip.children.find((b) => b.textContent === label);
    assert.ok(hit, 'inspector has a ' + label + ' tab');
    return hit;
  }
  assert.equal(tabStrip().getAttribute('role'), 'tablist');
  assert.equal(tab('Edit').getAttribute('role'), 'tab');
  assert.equal(tab('Edit').getAttribute('aria-selected'), 'true', 'Edit is the default pane');
  assert.equal(tab('Rules').getAttribute('aria-selected'), 'false');
  ['Edit', 'Timer', 'Engage', 'Rules'].forEach((t) => tab(t));

  /* Nothing about how to run it on the pane you type on. */
  assert.equal(inspector.children.find((c) => c.className === 'howto'), undefined,
    'the drawer does not sit on the Edit pane');

  tab('Rules').click();
  assert.equal(tab('Rules').getAttribute('aria-selected'), 'true', 'Rules is selected after pressing it');

  const howto = inspector.children.find(c => c.className === 'howto');
  assert.ok(howto, 'details.howto drawer exists on the Rules pane');
  const summary = howto.children.find(c => c.className === 'howto-summary');
  assert.ok(summary, 'summary.howto-summary exists');
  assert.ok(summary.children[0].textContent.includes('How to run — Hook + Objectives'));
  const toggle = summary.children.find(c => c.className === 'howto-toggle');
  assert.ok(toggle, 'howto-toggle exists');
  assert.equal(toggle.textContent, 'Reveal');

  // Find steps
  const body = howto.children.find(c => c.className === 'howto-body');
  assert.ok(body, 'howto-body exists');
  const stepsList = body.children.find(c => c.className && c.className.includes('howto-steps'));
  assert.ok(stepsList, 'howto-steps list exists');
  assert.equal(stepsList.children.length, hookAct.steps.length);
  assert.equal(stepsList.children[0].textContent, hookAct.steps[0]);

  // Verify the old bottom "HOW IT RUNS" eyebrow is gone
  const oldEyebrow = inspector.children.find(c => c.textContent === 'HOW IT RUNS');
  assert.equal(oldEyebrow, undefined, 'old bottom HOW IT RUNS is removed');

  // Also test game activity: should say "How to play — ..."
  const gameAct = SF.Activities.activity('interleaving-mixed-practice');
  const gameSlide = SF.makeSlide('game');
  gameSlide.activity = gameAct.key;
  gameSlide.activityInstance = gameSlide.id;
  deck.slides = [gameSlide];
  SF.Editor.currentSlideId = () => gameSlide.id;
  SF.Activities.draw();

  /* A game row has no Engage tab — the room answers the game itself — but it
     still has Rules, and there the drawer says "How to play". */
  assert.equal(tabStrip().children.find((b) => b.textContent === 'Engage'), undefined,
    'a game activity offers no Engage tab');
  tab('Rules').click();

  const gameHowto = inspector.children.find(c => c.className === 'howto');
  assert.ok(gameHowto, 'game details.howto exists on the Rules pane');
  const gameSummary = gameHowto.children.find(c => c.className === 'howto-summary');
  assert.ok(gameSummary.children[0].textContent.includes('How to play — ' + gameAct.title));
});


/* Each activity says which rooms it works in (activities audit A9, AC-16),
   the way each game style does. Derived from its shape, so a new activity
   gets an answer without anyone writing one; this holds the answers to the
   shapes they came from, and to the truth about today. */
test('every activity declares its rooms, with a reason for each', () => {
  /* Read from the built model, where the rooms are attached. */
  const vm = require('node:vm');
  const c = { window: {}, console, localStorage: { getItem: () => null, setItem() {}, removeItem() {} } };
  vm.createContext(c);
  vm.runInContext(require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'js', 'model.js'), 'utf8'), c);
  const SF = c.window.SF;
  const ACTIVITIES = SF.Activities.ACTIVITIES;
  const GAME_STYLES = { get: (s) => SF.gameStyle(s) };
  for (const a of ACTIVITIES) {
    assert.ok(a.plays, a.key + ' declares no rooms');
    for (const room of ['phones', 'teams', 'entry', 'solo']) {
      const s = a.plays[room];
      assert.ok(s && ['yes', 'partial', 'no'].includes(s.status), a.key + ' ' + room);
      assert.ok(String(s.reason || '').length > 10, a.key + ' ' + room + ' has no reason');
    }
    if (a.target === 'game') assert.equal(a.plays, GAME_STYLES.get(a.style).plays, a.key + ' borrows its engine\'s');
    /* A prompt the teacher cannot enter for a room without phones says so. */
    if (a.target === 'feedback') assert.equal(a.plays.entry.status, 'no', a.key);
    if (a.presentation === 'stages') assert.equal(a.plays.phones.status, 'yes', a.key + ' gives phones a job');
  }
  const by = (key) => ACTIVITIES.find((a) => a.key === key).plays;
  assert.equal(by('plus-minus-interesting').entry.status, 'partial', 'its ideas are sent from the phones');
  assert.equal(by('learning-log-entry').entry.status, 'yes', 'private notes need no entry');
  assert.equal(by('clear-objectives-slide').solo.status, 'yes');
});

/* Two activities hand over to games that do what they are named for (AC-14,
   AC-15): the Question Cube rolls a face, and the Card Sort is sorted on the
   phones. Each compiles as its engine expects. */
test('the Question Cube and the Card Sort compile as their games', () => {
  const vm = require('node:vm');
  const c = { window: {}, console, localStorage: { getItem: () => null, setItem() {}, removeItem() {} } };
  vm.createContext(c);
  vm.runInContext(require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'js', 'model.js'), 'utf8'), c);
  const SF = c.window.SF;
  const build = (key) => {
    const a = SF.Activities.activity(key);
    const g = SF.makeGame(a.title, a.style);
    g.format = a.gamePreset.format || g.format;
    Object.assign(g.settings, a.gamePreset.settings || {});
    g.questions = a.gamePreset.seeds.map((f) => SF.normalizeQuestion(Object.assign(SF.makeQuestion(a.style), f), a.style));
    return SF.compileGame(g, { intro: false, scoreSlide: false }).filter((s) => s.type === 'quiz');
  };
  assert.equal(build('question-cube-six-question-types').length, 6, 'six faces');
  const sort = build('concept-card-sort');
  assert.equal(sort.length, 3, 'three rounds');
  for (const s of sort) {
    assert.equal(s.input, 'sort');
    assert.equal(s.options.length, 5, 'four cards and one for both');
    assert.deepEqual(Array.from(s.sortBins), ['Perimeter only', 'Both', 'Area only']);
    assert.equal(Array.from(s.sortAnswers).filter((b) => b === 1).length, 1);
  }
});
