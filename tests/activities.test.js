'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

/* The rows js/studio.js offers today. The catalogue has to keep matching
   these, because the modal still reads studio.js and the two describing the
   same activity differently is the drift this test exists to catch. */
function studioRows() {
  const src = fs.readFileSync(path.join(root, 'js/studio.js'), 'utf8');
  const block = src.slice(src.indexOf('var activities = ['));
  const rows = [...block.slice(0, block.indexOf('\n  ];')).matchAll(
    /\['([^']*)','([^']*)','((?:[^']|\\')*)','((?:[^']|\\')*)','([^']*)',(true|false)\]/g
  )];
  return rows.map((r) => ({
    key: r[1], icon: r[2], title: r[3].replace(/\\'/g, "'"),
    blurb: r[4].replace(/\\'/g, "'"), category: r[5], enabled: r[6] === 'true'
  }));
}

test('the catalogue keeps every activity the studio already offers, unchanged', async () => {
  const { ACTIVITIES } = await import('../src/activities/catalogue.js');
  const rows = studioRows();
  assert.ok(rows.length >= 35, 'expected to parse the studio registry, got ' + rows.length);

  for (const row of rows) {
    const found = ACTIVITIES.find((a) => a.key === row.key);
    assert.ok(found, 'catalogue is missing ' + row.key);
    /* Title and blurb are what a teacher reads. If studio.js rewords one, the
       catalogue must be reworded with it rather than quietly disagreeing. */
    assert.equal(found.title, row.title, row.key + ' title');
    assert.equal(found.blurb, row.blurb, row.key + ' blurb');
    assert.equal(found.icon, row.icon, row.key + ' icon');
    assert.equal(found.category, row.category, row.key + ' category');
    assert.equal(found.enabled !== false, row.enabled, row.key + ' enabled');
  }
});

test('every activity that builds a game names a format the engines know', async () => {
  const { ACTIVITIES } = await import('../src/activities/catalogue.js');
  const { FORMAT_STYLE, FORMATS } = await import('../src/games/catalogue.js');
  const { GAME_STYLES } = await import('../src/games/registry.js');

  for (const a of ACTIVITIES) {
    if (a.target !== 'game' || a.enabled === false) continue;
    const style = FORMAT_STYLE[a.key] || (GAME_STYLES[a.key] ? a.key : null);
    assert.ok(
      style || FORMATS[a.key],
      a.key + ' builds a game but maps to no engine — it would insert nothing'
    );
    if (style) assert.ok(GAME_STYLES[style], a.key + ' maps to unregistered engine ' + style);
  }
});

test('keys are unique, and every phase offers something', async () => {
  const { ACTIVITIES, PHASES, activitiesInPhase, phaseCounts } =
    await import('../src/activities/catalogue.js');

  const seen = new Set();
  for (const a of ACTIVITIES) {
    assert.ok(!seen.has(a.key), 'duplicate key ' + a.key);
    seen.add(a.key);
    assert.ok(PHASES.some((p) => p.key === a.phase), a.key + ' has unknown phase ' + a.phase);
  }

  /* A phase tab that opens on nothing is worse than no tab. */
  const counts = phaseCounts();
  for (const p of PHASES) {
    assert.ok(counts[p.key] > 0, 'phase ' + p.key + ' offers no activity');
    assert.equal(counts[p.key], activitiesInPhase(p.key).length);
  }
});

test('a disabled activity is never offered', async () => {
  const { ACTIVITIES, activitiesInPhase } = await import('../src/activities/catalogue.js');
  const off = ACTIVITIES.filter((a) => a.enabled === false);
  assert.ok(off.length, 'expected at least one disabled activity to prove the rule');
  for (const a of off) {
    assert.ok(
      !activitiesInPhase(a.phase).some((x) => x.key === a.key),
      a.key + ' is disabled but still offered'
    );
  }
});

test('a timed protocol carries its steps, and nothing else claims to', async () => {
  const { ACTIVITIES } = await import('../src/activities/catalogue.js');
  const moments = ACTIVITIES.filter((a) => a.target === 'moment');
  assert.ok(moments.length >= 12, 'expected the timed protocols, got ' + moments.length);
  for (const a of moments) {
    assert.equal(a.category, 'moment', a.key + ' targets a moment but is not categorised as one');
    assert.ok(a.steps && a.steps.length >= 2, a.key + ' has no protocol to run');
    assert.ok(a.minutes > 0, a.key + ' has no duration');
  }
  for (const a of ACTIVITIES) {
    if (a.target !== 'moment') assert.equal(a.steps, undefined, a.key + ' should not carry steps');
  }
});

test('minutes add up across a planned run', async () => {
  const { totalMinutes, activity } = await import('../src/activities/catalogue.js');
  const keys = ['low-stakes-quiz', 'think-pair-square', 'whiteboards-on-walls'];
  const expected = keys.reduce((n, k) => n + activity(k).minutes, 0);
  assert.equal(totalMinutes(keys), expected);
  /* An unknown key contributes nothing rather than NaN-ing the whole budget. */
  assert.equal(totalMinutes(['low-stakes-quiz', 'no-such-activity']), activity('low-stakes-quiz').minutes);
  assert.equal(totalMinutes([]), 0);
});
