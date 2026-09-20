#!/usr/bin/env node
/* Nothing on the canvas may end up on top of anything else.
 *
 * The rule lives in tests/placement.test.js, which holds the geometry and the
 * search. This holds the three paths that call it — drag, corner resize and
 * the arrow keys — on a real canvas with real pointer input, because each of
 * them used to have its own idea of "free" and the unit tests cannot see a
 * call site that forgets to ask.
 *
 * All three used to clamp to the grid and nothing else, so a heading could be
 * dropped onto its neighbour and take identical coordinates, and the Layout
 * bar would report "2 of 4 lines used, 2 spare" over the collision.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import harness from '../../tests/harness.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-canvas-placement-'));
const port = await harness.freePort();
const relay = await harness.start(port, dir);
const browser = await chromium.launch();
let checks = 0;

try {
  const page = await browser.newPage({ viewport: { width: 1700, height: 1500 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForFunction(() => typeof window.SF?.Arrange?.setArranging === 'function', null, { timeout: 30000 });

  /* Blank, so the only things on the canvas are the two items under test and
     the rule is not being read through a layout's own blocks. */
  const reset = async () => {
    await page.evaluate(() => {
      const d = SF.makeDeck('Canvas placement');
      d.slides = [SF.normalizeSlide({ type: 'blank', blocks: [
        { id: 'a', kind: 'heading', text: 'BLOCK A' },
        { id: 'b', kind: 'heading', text: 'BLOCK B' }
      ] })];
      d.slides[0].design = { regions: {
        'blocks.a': { col: 1, row: 2, cols: 5, rows: 4 },
        'blocks.b': { col: 7, row: 2, cols: 5, rows: 4 }
      } };
      SF.Store.save(d);
      SF.Editor.openDeck(d.id);
    });
    await page.waitForSelector('#previewBox [data-block-key="blocks.a"]', { timeout: 20000 });
    await page.waitForTimeout(450);
  };

  const state = () => page.evaluate(() => {
    const m = SF.Editor.currentSlide().design.regions;
    return { regions: JSON.parse(JSON.stringify(m)), overlaps: SF.overlapsIn(m) };
  });
  const box = (key) => page.evaluate((k) => {
    const n = document.querySelector('#previewBox [data-block-key="' + k + '"]');
    const b = n.getBoundingClientRect();
    const r = SF.Editor.currentSlide().design.regions[k];
    return { x: b.left, y: b.top, w: b.width, h: b.height, cw: b.width / r.cols, ch: b.height / r.rows };
  }, key);

  /* 1. Drag one item onto the other. This produced identical coordinates. */
  await reset();
  await page.click('#previewBox [data-block-key="blocks.a"] .free-block');
  await page.waitForTimeout(400);
  let at = await box('blocks.a');
  await page.mouse.move(at.x + at.w / 2, at.y + 14);
  await page.mouse.down();
  await page.mouse.move(at.x + at.w / 2 + 6 * at.cw, at.y + 14, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(700);
  let now = await state();
  assert.deepEqual(now.overlaps, [],
    'a drop onto another item must not leave them overlapping: ' + JSON.stringify(now.regions));
  checks++;

  /* 2. Resize a corner straight through the neighbour. It must grow — that is
        how a layout gets built — and the neighbour must move out of the way
        rather than be sat on. */
  await reset();
  await page.click('#previewBox [data-block-key="blocks.a"] .free-block');
  await page.waitForTimeout(450);
  at = await box('blocks.a');
  const se = await page.evaluate(() => {
    const h = document.querySelector('#previewBox [data-block-key="blocks.a"] .sf-handle-se');
    const b = h.getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  });
  await page.mouse.move(se.x, se.y);
  await page.mouse.down();
  await page.mouse.move(se.x + 5 * at.cw, se.y, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(700);
  now = await state();
  assert.deepEqual(now.overlaps, [],
    'a resize through a neighbour must not overlap it: ' + JSON.stringify(now.regions));
  assert.ok(now.regions['blocks.a'].cols > 5,
    'and must actually grow — stopping at the edge makes a layout impossible to build, got ' +
    now.regions['blocks.a'].cols + ' columns');
  checks++;

  /* 3. The arrow keys, which are the same move in small steps. */
  await reset();
  await page.click('#btnArrange');
  await page.waitForSelector('#previewBox.arranging .sf-slot', { timeout: 10000 });
  await page.waitForTimeout(300);
  at = await box('blocks.a');
  await page.mouse.click(at.x + at.w / 2, at.y + at.h / 2);
  await page.waitForTimeout(350);
  for (let i = 0; i < 8; i++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(140); }
  now = await state();
  assert.deepEqual(now.overlaps, [],
    'arrow keys must not walk one item onto another: ' + JSON.stringify(now.regions));
  checks++;

  /* 4. And inserting, which is the path that always did respect what was
        there — held here so the shared rule cannot regress it. */
  await page.evaluate(() => SF.Arrange.addBlock('text'));
  await page.waitForTimeout(700);
  now = await state();
  assert.deepEqual(now.overlaps, [], 'an inserted item must land clear: ' + JSON.stringify(now.regions));
  assert.equal(Object.keys(now.regions).length, 3, 'and must actually have been added');
  checks++;

  await page.evaluate(() => SF.Arrange.setArranging(false));
  assert.deepEqual(errors, [], 'no page errors');
  console.log('ok · canvas placement: ' + checks + ' checks · a drop, a corner resize, the arrow keys and an ' +
    'insert all go through one rule, so none of them can leave two blocks sharing a cell — and a resize still ' +
    'grows through its neighbour, which is how a layout gets built');
} finally {
  await browser?.close();
  relay.kill();
  fs.rmSync(dir, { recursive: true, force: true });
}
