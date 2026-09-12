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
  assert.deepEqual(by, { slide: 20, game: 13, moment: 10, feedback: 9, 'slide-arc': 2 });
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

test('every activity carries what the plan rail and inspector need', async () => {
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

test('a plan keeps only activities this build still offers', async () => {
  const { normalizePlan, planMinutes } = await import('../src/activities/plan.js');
  const { ACTIVITIES } = await import('../src/activities/catalogue.js');
  const real = ACTIVITIES[0].key;
  const plan = normalizePlan({
    title: 'From an older build',
    items: [{ key: real }, { key: 'retired-activity' }, { nonsense: true }]
  });
  assert.equal(plan.items.length, 1, 'items naming an unknown activity should be dropped');
  assert.equal(plan.items[0].key, real);
  assert.ok(plan.items[0].id, 'a surviving item still needs an id');
  assert.equal(planMinutes(plan), ACTIVITIES[0].minutes);
  assert.equal(normalizePlan(null), null);
});
