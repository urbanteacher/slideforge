/* Browser verification of misconception labels in Quiz studio. No user data is
 * used: Playwright gets a fresh, isolated browser context.
 *
 * The labels are a parallel array indexed by option, and the whole risk is
 * that one slides onto a different answer. That does not read as a bug in the
 * Adapt report — it reads as a confident sentence about a mistake the room
 * never made. The editing paths that move options are what this guards, since
 * they live in the browser and the node tests cannot reach them. */
import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const BASE = process.env.SF_URL || 'http://127.0.0.1:8787/';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE);
  await page.waitForFunction(() => window.SF?.Games?.openGame);

  const gameId = await page.evaluate(() => {
    const g = SF.createPresetGame('choice', { title: 'Misconception check' }, 'midnight');
    SF.GameStore.save(g);
    SF.Shell.activate('game');
    SF.Games.openGame(g.id);
    return g.id;
  });
  await page.waitForSelector('#inspector .opt-row');

  /* Offered on the wrong answers only — the right one is not a mistake — and
     folded away until asked for, so an optional field does not cost more room
     than the answer it annotates. */
  assert.equal(await page.locator('#inspector .opt-why-toggle').count(), 3,
    'three distractors, three notes on offer');
  assert.equal(await page.locator('#inspector .opt-why input').count(), 0,
    'and none of them open until asked for');
  assert.equal(await page.locator('#inspector .opt-row').count(), 4);

  /* Addressed by the answer it belongs to, not by position: opening one note
     removes its toggle from the list, so indices shift underneath. */
  const label = async (letter, text) => {
    const toggle = page.locator(`#inspector .opt-why-toggle[title*="picking ${letter}"]`);
    await toggle.click();
    const field = page.locator('#inspector .opt-why input').last();
    await field.fill(text);
    await field.blur();
  };
  await label('B', 'LABEL-B');
  await label('C', 'LABEL-C');
  await label('D', 'LABEL-D');
  await page.waitForFunction((id) => {
    const q = SF.GameStore.get(id).questions[0];
    return Array.isArray(q.misconceptions) && q.misconceptions[3] === 'LABEL-D';
  }, gameId, { timeout: 8000 });

  /* A note already written stays legible on the collapsed control, or it
     would look like nothing had been saved. */
  await page.locator('#inspector .opt-row input[type=text]').first().click();
  assert.equal(
    await page.locator('#inspector .opt-why-toggle[title*="picking D"]').count(), 0,
    'a filled note stays open rather than hiding what was typed');

  /* Delete B. C and D must keep their own labels, not inherit a neighbour's.
     Trimming the label list against an already-shortened option list dropped
     D's label here, which is the bug this exists to catch. */
  await page.locator('#inspector .opt-row').nth(1).locator('.kill').click();
  await page.waitForFunction((id) => {
    const q = SF.GameStore.get(id).questions[0];
    return q.options.length === 3;
  }, gameId, { timeout: 8000 });

  const after = await page.evaluate((id) => {
    const q = SF.GameStore.get(id).questions[0];
    const run = SF.gameToRunDeck(SF.GameStore.get(id));
    const slide = run.slides.find((s) => s.type === 'quiz');
    return {
      options: q.options,
      labels: q.misconceptions || [],
      slideOptions: slide.options,
      slideLabels: slide.misconceptions || []
    };
  }, gameId);

  assert.equal(after.labels[after.options.indexOf('Option C')], 'LABEL-C',
    'C keeps the label written for C');
  assert.equal(after.labels[after.options.indexOf('Option D')], 'LABEL-D',
    'D keeps the label written for D after an earlier option is deleted');
  assert.equal(after.options.length, after.labels.length, 'one label slot per option');

  /* And the alignment survives compiling to the slide the report reads. */
  assert.equal(after.slideLabels[after.slideOptions.indexOf('Option D')], 'LABEL-D',
    'the compiled slide carries labels against the same options');

  assert.deepEqual(errors, [], 'no page errors while authoring labels');
  console.log('Misconception smoke passed: per-distractor authoring, alignment across delete and compile.');
} finally {
  await browser.close();
}
