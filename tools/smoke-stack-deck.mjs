#!/usr/bin/env node
/* Smoke: derived rows, and a reorder that cannot break the row budget. */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const BASE = (process.env.SF_BASE_URL || process.env.SF_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${BASE}/modular-canvas/preview.html`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForFunction(() => typeof window.__stackMove === 'function', null, { timeout: 30000 });
  const settled = () => page.waitForFunction(() => {
    const n = document.querySelector('#stack-deck .stack-status');
    return !!n && n.textContent !== '' && n.textContent !== 'Measuring…';
  });
  await settled();

  const types = await page.locator('#stack-deck #stack-slide option').count();
  assert.ok(types >= 8, `expected the stack engine to cover 8+ types, got ${types}`);

  /* Every supported type derives its rows and fits. */
  for (let i = 0; i < types; i++) {
    const type = await page.locator('#stack-deck #stack-slide option').nth(i).getAttribute('value');
    await page.selectOption('#stack-deck #stack-slide', type);
    await settled();
    const fits = await page.locator('#stack-deck .stack-status').getAttribute('data-fits');
    assert.equal(fits, 'true', `${type}: ${await page.locator('#stack-deck .stack-status').innerText()}`);
    const state = await page.evaluate(() => window.__stackState());
    for (const stack of state) {
      assert.ok(stack.remainder >= 0, `${type} over budget by ${-stack.remainder}`);
      /* Derived, not authored: the first row is the first gap plus one. */
      let cursor = 1;
      for (const item of stack.placed) {
        cursor += item.gapBefore;
        assert.equal(item.row, cursor, `${type}/${item.label} row not derived`);
        cursor += item.span;
      }
    }
  }

  /* The title stack is the one from the screenshots: headline, subtitle, date. */
  await page.selectOption('#stack-deck #stack-slide', 'title');
  await settled();
  const before = (await page.evaluate(() => window.__stackState()))[0];
  assert.deepEqual(before.placed.map((p) => p.label), ['Headline', 'Subtitle', 'Date']);
  assert.deepEqual(before.placed.map((p) => p.row), [3, 10, 14]);
  const budget = before.used;

  /* Drag the date above the subtitle. Everything below must move aside, and the
     budget must be unchanged, because each gap travels with its item. */
  await page.evaluate(() => window.__stackMove(0, 2, 1));
  await settled();
  const after = (await page.evaluate(() => window.__stackState()))[0];
  assert.deepEqual(after.placed.map((p) => p.label), ['Headline', 'Date', 'Subtitle']);
  assert.equal(after.used, budget, 'a reorder changed the row budget');
  const row = (state, label) => state.placed.find((p) => p.label === label).row;
  /* The dragged item moves up and the one it landed on is pushed down: that is
     the magnet. Compare by item, not by position in the list. */
  assert.ok(row(after, 'Date') < row(before, 'Date'), `date went ${row(before, 'Date')} -> ${row(after, 'Date')}`);
  assert.ok(row(after, 'Subtitle') > row(before, 'Subtitle'), `subtitle went ${row(before, 'Subtitle')} -> ${row(after, 'Subtitle')}`);
  assert.equal(row(after, 'Headline'), row(before, 'Headline'), 'the item above the drop moved');
  assert.equal(await page.locator('#stack-deck .stack-status').getAttribute('data-fits'), 'true');

  /* Budget invariance under every permutation of a three-item stack. */
  for (const [from, to] of [[0, 3], [2, 0], [1, 0], [0, 2], [2, 1], [1, 3]]) {
    const state = await page.evaluate(([f, t]) => window.__stackMove(0, f, t), [from, to]);
    await settled();
    assert.equal(state.used, budget, `move ${from}->${to} changed the budget to ${state.used}`);
    assert.ok(state.remainder >= 0);
  }

  /* The drop target is a gap, and there are items.length + 1 of them. */
  const grid = await page.locator('#stack-deck .stack-body').boundingBox();
  const seen = new Set();
  for (let step = 0; step <= 20; step++) {
    seen.add(await page.evaluate((y) => window.__stackDropIndex(0, y), grid.y + (grid.height * step) / 20));
  }
  assert.deepEqual([...seen].sort((a, b) => a - b), [0, 1, 2, 3], `drop indexes were ${[...seen]}`);

  /* A real pointer drag, not just the exposed helper. */
  await page.click('#stack-deck #stack-reset');
  await settled();
  const date = page.locator('#stack-deck .stack-slot[data-name="Date"]');
  const sub = page.locator('#stack-deck .stack-slot[data-name="Subtitle"]');
  const dateBox = await date.boundingBox();
  const subBox = await sub.boundingBox();
  await page.mouse.move(dateBox.x + dateBox.width / 2, dateBox.y + dateBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(subBox.x + subBox.width / 2, subBox.y + 4, { steps: 12 });
  await page.mouse.up();
  await settled();
  const dragged = (await page.evaluate(() => window.__stackState()))[0];
  assert.deepEqual(dragged.placed.map((p) => p.label), ['Headline', 'Date', 'Subtitle'], 'pointer drag did not reorder');
  assert.equal(dragged.used, budget);

  /* Editing text must not start a drag. */
  await page.click('#stack-deck #stack-reset');
  await settled();
  const title = page.locator('#stack-deck .stack-slot[data-name="Headline"] [contenteditable]');
  if (await title.count()) {
    await title.click();
    assert.equal(await page.locator('#stack-deck .stack-slot.is-dragging').count(), 0, 'clicking text began a drag');
  }

  /* A chart declares a minimum column span, because it shrinks rather than overflowing. */
  await page.selectOption('#stack-deck #stack-slide', 'chart');
  await settled();
  const chart = await page.evaluate(() => window.__stackState());
  assert.ok(chart[0].placed.some((p) => p.label === 'Chart' && p.min >= 8), 'chart has no readable-width minimum');

  assert.deepEqual(errors, []);
  console.log(
    `ok · stack-deck ${types} types derive every row · reorder is budget-neutral across 6 permutations · ` +
      `pointer drag reorders · ${[...seen].length} drop gaps for 3 items`
  );
} finally {
  await browser.close();
}
