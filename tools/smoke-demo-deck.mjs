#!/usr/bin/env node
/* Smoke: Demo engine loads layout-bank (97) and Audit all stays within budget. */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const BASE = process.env.SF_BASE_URL || process.env.SF_URL || 'http://127.0.0.1:8787';
const url = `${BASE.replace(/\/$/, '')}/modular-canvas/preview.html`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1100 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

try {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('#demo-deck');
  await page.waitForFunction(() => typeof window.__demoAuditAll === 'function', null, {
    timeout: 30000,
  });

  const boot = await page.evaluate(() => ({
    options: document.querySelector('#demo-slide')?.options?.length,
    engines: ['playground', 'safe-deck', 'demo-deck'].every((id) => document.getElementById(id)),
  }));
  if (boot.options !== 97) throw new Error(`expected 97 demo slides, got ${boot.options}`);
  if (!boot.engines) throw new Error('playground / safe-deck / demo-deck missing');

  const summary = await page.evaluate(async () => {
    const rows = await window.__demoAuditAll();
    const fail = rows.filter((r) => !r.fits);
    const tiny = rows.filter((r) => !r.legible);
    return {
      total: rows.length,
      needSpace: fail.length,
      fit: rows.length - fail.length,
      underFloor: tiny.length,
      smallest: Math.min(...rows.filter((r) => r.smallest != null).map((r) => r.smallest)),
    };
  });

  if (summary.total !== 97) throw new Error(`audit total ${summary.total}`);
  /* Budget is the one known over-budget slide: #94 compare needs 597px in a 576px
     body even with zero padding and zero row gap, so no recipe change closes it.
     The budget equals the known failure on purpose — slack hides regressions. */
  if (summary.needSpace > 1) {
    throw new Error(`too many overflows: ${summary.needSpace} (budget 1)`);
  }
  /* Legibility is a second, independent verdict: geometry can pass at a size
     nobody can read. Most of these sizes come from production CSS, so this is a
     ratchet against getting worse, not a claim that 24 is acceptable. */
  if (summary.underFloor > 44) {
    throw new Error(`more slides under the 20px floor: ${summary.underFloor} (was 44)`);
  }
  /* --- Rearranging: folded in from the retired stack engine --- */
  await page.waitForFunction(() => typeof window.__demoMagnet === 'function');
  const settled = () => page.waitForFunction(() => {
    const n = document.querySelector('#demo-deck .demo-status');
    return !!n && n.textContent !== '' && n.textContent !== 'Measuring\u2026';
  });
  await page.selectOption('#demo-slide', '0');
  await settled();
  await page.locator('#demo-deck .safe-stage').scrollIntoViewIfNeeded();

  const rows = () => page.evaluate(() => window.__demoRows());
  const budget = () => page.evaluate(() => window.__demoBudget());
  const at = (list, name) => list.find((r) => r.name === name).row;
  const before = await rows();
  assert.deepEqual(before.map((r) => r.name), ['Headline', 'Subtitle', 'Date']);
  assert.deepEqual(before.map((r) => r.row), [3, 10, 14]);
  const startBudget = (await budget())[0].used;

  /* The magnet: drop the date where the subtitle is and the subtitle is pushed
     below it. The budget cannot move, because each gap travels with its item. */
  const magnet = await page.evaluate(() => window.__demoMagnet('Date', 10));
  await settled();
  assert.deepEqual(magnet.order, ['Headline', 'Date', 'Subtitle']);
  const after = await rows();
  assert.ok(at(after, 'Date') < at(before, 'Date'), 'the date did not move up');
  assert.ok(at(after, 'Subtitle') > at(before, 'Subtitle'), 'the subtitle was not pushed down');
  assert.equal(at(after, 'Headline'), at(before, 'Headline'), 'the item above the drop moved');
  assert.equal((await budget())[0].used, startBudget, 'a rearrange changed the row budget');

  /* Budget invariance over a run of moves, rather than trusting the argument. */
  for (const [name, row] of [['Headline', 14], ['Subtitle', 1], ['Date', 8], ['Headline', 1]]) {
    await page.evaluate(([n, r]) => window.__demoMagnet(n, r), [name, row]);
    await settled();
    for (const g of await budget())
      assert.equal(g.used, startBudget, `moving ${name} to row ${row} changed the budget to ${g.used}`);
    assert.equal(await page.locator('#demo-deck .demo-status').getAttribute('data-fits'), 'true');
  }

  /* A real pointer drag, not just the exposed helper. */
  await page.click('#demo-reset');
  await settled();
  await page.locator('#demo-deck .safe-stage').scrollIntoViewIfNeeded();
  const grip = await page.locator('#demo-deck .safe-slot[data-name="Date"] .demo-slot-grip').boundingBox();
  const target = await page.locator('#demo-deck .safe-slot[data-name="Subtitle"]').boundingBox();
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
  await page.mouse.down();
  await page.mouse.move(target.x + target.width / 2, target.y + target.height * 0.2, { steps: 16 });
  assert.match(await page.locator('#demo-deck .demo-status').innerText(), /place before\/after/);
  await page.mouse.up();
  await settled();
  const dragged = await rows();
  assert.ok(at(dragged, 'Date') < at(before, 'Date'), 'the pointer drag did not push');
  assert.equal((await budget())[0].used, startBudget);

  /* Regression: a vertical drag that wanders sideways must not change columns.
     It did, which made every drag after the first look freeform. */
  await page.click('#demo-reset');
  await settled();
  await page.locator('#demo-deck .safe-stage').scrollIntoViewIfNeeded();
  const columnsOf = async () => (await rows()).map((r) => `${r.name}:${r.col}-${r.col + r.cols - 1}`);
  const startColumns = await columnsOf();
  for (const [name, onto, frac] of [['Date', 'Subtitle', 0.2], ['Headline', 'Date', 0.2], ['Subtitle', 'Headline', 0.2], ['Date', 'Headline', 0.8]]) {
    const from = await page.locator(`#demo-deck .safe-slot[data-name="${name}"] .demo-slot-grip`).boundingBox();
    const onto_ = await page.locator(`#demo-deck .safe-slot[data-name="${onto}"]`).boundingBox();
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    /* Wander sideways on the way, the way a hand does. */
    await page.mouse.move(from.x + from.width / 2 - 180, from.y + from.height / 2 - 20, { steps: 6 });
    await page.mouse.move(onto_.x + onto_.width / 2, onto_.y + onto_.height * frac, { steps: 14 });
    await page.mouse.up();
    await settled();
    assert.deepEqual(await columnsOf(), startColumns, `dragging ${name} onto ${onto} moved a column`);
    for (const g of await budget())
      assert.equal(g.used, startBudget, `dragging ${name} onto ${onto} changed the budget`);
  }

  /* Side-by-side stacks have nothing to push, so that drop swaps sides instead. */
  await page.selectOption('#demo-filter', 'split');
  await settled();
  const twoStacks = await rows();
  assert.equal(twoStacks.length, 2, 'split should be two slots');
  assert.notEqual(twoStacks[0].col, twoStacks[1].col, 'split slots share a column');
  await page.selectOption('#demo-filter', '');
  await settled();

  /* Charts declare a readable minimum width, since a vector block shrinks
     instead of overflowing and nothing else would catch it. */
  await page.selectOption('#demo-slide', '41');
  await settled();
  const chartSlot = (await rows()).find((r) => /chart/i.test(r.name));
  assert.ok(chartSlot, 'no chart slot on slide 42');
  assert.ok(chartSlot.cols >= 8, `chart is ${chartSlot.cols} columns wide, under its readable minimum`);

  if (errors.length) throw new Error(`page errors: ${errors.slice(0, 3).join('; ')}`);

  console.log(
    `ok · demo-deck ${summary.fit}/${summary.total} fit · ${summary.needSpace} need space · ` +
      `${summary.underFloor} under the 20px floor (smallest ${summary.smallest}px) · ` +
      `rearrange budget-neutral over 5 moves, 5 pointer drags, no column drift`
  );
} finally {
  await browser.close();
}
