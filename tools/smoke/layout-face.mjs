#!/usr/bin/env node
/* Smoke: the Layout face moves a block, and says so.
 *
 * The lattice had no end-to-end check. layout-fit.mjs measures the layout
 * *picker's* predictions and demo-deck.mjs measures the concept lab; between
 * them they never once clicked the ▦ Layout button in the real editor. So
 * "click a block and nothing happens" had no test that could tell you whether
 * that was true, and neither did "the bar says all 2 fit while a block is
 * outlined in red".
 *
 * Playwright's clicks are real input, which matters here: every earlier attempt
 * to check this by hand used synthesised pointer events, and those take a path
 * through the page that a mouse does not.
 *
 * What it holds to:
 *   - a click on a block selects it and enables the controls that need one
 *   - a click on the block's own words selects the block too, because the
 *     arranging face declares pointer-events:none on a slot's children — the
 *     words are not a separate target while you are arranging
 *   - a click on empty lattice deselects, rather than leaving the last block
 *     selected and the controls live
 *   - a plain click does not move anything (the drag threshold is a rounded
 *     cell, so a two-pixel wobble must not commit a region)
 *   - arrows move, shift+arrows resize, and both write slide.design.regions
 *   - an anchor writes anchorX/anchorY and survives a repaint
 *   - the bar's verdict matches SF.latticeFit on the same slide, so the face
 *     and the deck review cannot disagree
 *   - ↺ Theme drops the map rather than writing regions that match the theme
 *   - Escape leaves the face, and the slot chrome goes with it
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import harness from '../../tests/harness.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-layout-face-'));
const port = await harness.freePort();
const relay = await harness.start(port, dir);
const browser = await chromium.launch();
let checks = 0;

try {
  const page = await browser.newPage({ viewport: { width: 1700, height: 1050 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForFunction(() => typeof window.SF?.Arrange?.setArranging === 'function', null, { timeout: 30000 });

  await page.evaluate(() => {
    const d = SF.makeDeck('Layout face');
    d.slides = [SF.normalizeSlide({ type: 'content', title: 'Click the words', bullets: ['One click puts a caret here', 'Arrows move it'] })];
    SF.Store.save(d);
    SF.Editor.openDeck(d.id);
  });
  await page.waitForSelector('#previewBox [data-content-key]', { timeout: 20000 });

  /* Through the button, not the API: the button is what is broken or not. */
  await page.click('#btnArrange');
  await page.waitForSelector('#previewBox.arranging .sf-slot', { timeout: 10000 });
  const slots = await page.$$eval('#previewBox .sf-slot', (ns) => ns.map((n) => n.dataset.blockKey));
  assert.ok(slots.length >= 2, `the face should lattice the slide, got ${slots.length} slots`);
  assert.ok(slots.includes('title'), 'the heading should be a block');
  checks++;

  const bar = () => page.textContent('#arrangeWhat');
  const gated = () => page.$$eval('#arrangeBar [data-arrange-needs-selection]',
    (ns) => ns.map((n) => /** @type {HTMLButtonElement|HTMLSelectElement} */ (n).disabled));
  const regionOf = (key) => page.evaluate((k) => {
    const r = SF.Editor.currentSlide()?.design?.regions?.[k];
    return r ? { col: r.col, row: r.row, cols: r.cols, rows: r.rows, anchorX: r.anchorX, anchorY: r.anchorY } : null;
  }, key);

  /* Nothing selected yet, so everything that needs a block is off. */
  assert.match(await bar(), /Click a block/, 'the bar should ask for a block');
  assert.ok((await gated()).every(Boolean), 'controls needing a block should start disabled');
  checks++;

  /* 1. A click on the block. Coordinates read immediately before the click:
        the slot moves whenever the stage refits, and a stale point lands on a
        neighbour — which is exactly how this looked broken by hand. */
  /* Scoped to #previewBox on purpose: the rail renders every slide too, so
     `.sf-slot[data-block-key=x]` matches a thumbnail as well as the canvas,
     and an unscoped locator clicks a 60px thumbnail in the rail instead. */
  const centreOf = async (selector) => {
    const b = await page.locator('#previewBox ' + selector).first().boundingBox();
    assert.ok(b, `no box for ${selector}`);
    return { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) };
  };
  const key = 'block-1';
  const before = await regionOf(key);
  assert.ok(before, 'the bullets block should have a region once latticed');
  let at = await centreOf(`.sf-slot[data-block-key="${key}"]`);
  await page.mouse.click(at.x, at.y);
  await page.waitForTimeout(300);
  assert.equal(await page.$$eval('#previewBox [data-arrange-selected]', (n) => n.length), 1, 'the click should select one block');
  assert.equal(await page.getAttribute('#previewBox [data-arrange-selected]', 'data-block-key'), key,
    'and it should be the block under the pointer');
  assert.ok((await gated()).every((d) => d === false), 'a selection should enable the controls');
  assert.match(await bar(), new RegExp(`^${key} · row ${before.row}, col ${before.col}`),
    'the bar should name the block and where it is');
  checks++;

  /* 2. A plain click must not move it. The drag threshold is a rounded cell,
        so a wobble of a few pixels has to round to nothing. */
  assert.deepEqual(await regionOf(key), before, 'a click is not a drag');
  await page.mouse.move(at.x, at.y);
  await page.mouse.down();
  await page.mouse.move(at.x + 3, at.y + 2);
  await page.mouse.up();
  await page.waitForTimeout(300);
  assert.deepEqual(await regionOf(key), before, 'a three-pixel wobble is not a drag either');
  checks++;

  /* 3. Clicking the words selects the block. While arranging, a slot's
        children declare pointer-events:none, so the text is not its own
        target — and the canvas text editor's own click handler must not
        swallow it either. */
  const titleAt = await centreOf('.sf-slot[data-block-key="title"]');
  await page.mouse.click(titleAt.x, titleAt.y);
  await page.waitForTimeout(250);
  assert.equal(await page.getAttribute('#previewBox [data-arrange-selected]', 'data-block-key'), 'title',
    'selection should move to the heading');
  const wordsAt = await centreOf('[data-content-key="bullets.0"]');
  await page.mouse.click(wordsAt.x, wordsAt.y);
  await page.waitForTimeout(250);
  assert.equal(await page.getAttribute('#previewBox [data-arrange-selected]', 'data-block-key'), key,
    'clicking the words should select the block that holds them');
  assert.equal(await page.$$eval('.canvas-inline-tools, .canvas-edit-form', (n) => n.length), 0,
    'and must not start a text edit while the Layout face is up');
  checks++;

  /* 4. Arrows move, shift+arrows resize. Both through the keyboard, because
        the bar advertises them. */
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(250);
  assert.equal((await regionOf(key)).col, before.col + 1, 'ArrowRight should move one column');
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(250);
  assert.equal((await regionOf(key)).row, before.row + 1, 'ArrowDown should move one row');
  await page.keyboard.press('Shift+ArrowDown');
  await page.waitForTimeout(250);
  assert.equal((await regionOf(key)).rows, before.rows + 1, 'Shift+ArrowDown should add a line');
  await page.keyboard.press('Shift+ArrowLeft');
  await page.waitForTimeout(250);
  assert.equal((await regionOf(key)).cols, before.cols - 1, 'Shift+ArrowLeft should take a column');
  checks++;

  /* 5. The sizer buttons do the same thing as the keys they mirror. */
  const widened = (await regionOf(key)).cols;
  await page.click('#btnArrangeWider');
  await page.waitForTimeout(250);
  assert.equal((await regionOf(key)).cols, widened + 1, 'Wider should add a column');
  checks++;

  /* 6. An anchor is written and survives the repaint that follows it. */
  await page.selectOption('#arrangeAnchorX', 'center');
  await page.waitForTimeout(350);
  assert.equal((await regionOf(key)).anchorX, 'center', 'the anchor should be stored on the region');
  assert.equal(await page.inputValue('#arrangeAnchorX'), 'center',
    'and the control should still show it after the repaint');
  checks++;

  /* 7. The bar's verdict is SF.latticeFit's, not a second opinion. Forced by
        squeezing the block to one line, which is what a red outline means. */
  await page.evaluate((k) => {
    const r = SF.Editor.currentSlide().design.regions[k];
    r.rows = 1;
    SF.Editor.refreshCanvas();
    SF.Arrange.afterPaint();
  }, key);
  await page.waitForTimeout(600);
  const verdict = await page.evaluate(() => {
    const over = SF.latticeFit(document.querySelector('#previewBox .slide')).filter((v) => v.over);
    return { over: over.map((v) => v.key), text: document.getElementById('arrangeWhat').textContent,
             outlined: [...document.querySelectorAll('.sf-slot[data-fit="over"]')].map((n) => n.dataset.blockKey) };
  });
  assert.deepEqual(verdict.over, [key], 'a one-line region should not hold two bullets');
  assert.deepEqual(verdict.outlined, [key], 'and the slot should carry the verdict for the CSS to draw');
  assert.match(verdict.text, /needs \d+ lines, has 1/,
    `the bar should say the shortfall, said "${verdict.text}"`);
  checks++;

  /* 8. Reset drops the map, rather than writing regions that match the theme —
        so a later theme change still moves the slide. */
  await page.click('#btnArrangeReset');
  await page.waitForTimeout(400);
  assert.equal(await page.evaluate(() => SF.Editor.currentSlide().design.regions ?? null), null,
    'Theme should delete the arrangement, not freeze it');
  assert.equal(await page.evaluate(() => SF.Arrange.isArranging()), false,
    'and leave the face, since there is nothing left to arrange');
  assert.equal(await page.$$eval('#previewBox .sf-slot', (n) => n.length), 0,
    'the lattice should go with it');
  checks++;

  /* 9. Escape leaves the face and takes the slot chrome with it. */
  await page.click('#btnArrange');
  await page.waitForSelector('#previewBox.arranging .sf-slot', { timeout: 10000 });
  at = await centreOf(`.sf-slot[data-block-key="${key}"]`);
  await page.mouse.click(at.x, at.y);
  await page.waitForTimeout(250);
  assert.equal(await page.$$eval('#previewBox [data-arrange-selected]', (n) => n.length), 1, 'selected again');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  assert.equal(await page.evaluate(() => SF.Arrange.isArranging()), false, 'Escape should finish');
  assert.equal(await page.$$eval('#previewBox.arranging', (n) => n.length), 0, 'and drop the arranging face');
  assert.equal(await page.$$eval('#previewBox [data-arrange-selected]', (n) => n.length), 0, 'and the selection');
  checks++;

  /* 10. A click on empty lattice deselects. Otherwise the controls stay live
         for a block the author has stopped looking at. */
  await page.click('#btnArrange');
  await page.waitForSelector('#previewBox.arranging .sf-slot', { timeout: 10000 });
  at = await centreOf(`.sf-slot[data-block-key="${key}"]`);
  await page.mouse.click(at.x, at.y);
  await page.waitForTimeout(250);
  const empty = await page.evaluate(() => {
    /* The bottom of the lattice, below every slot: the last row of a 16-row
       grid that no block in this deck reaches. */
    const grid = document.querySelector('#previewBox .sf-lattice').getBoundingClientRect();
    const lowest = Math.max(...[...document.querySelectorAll('#previewBox .sf-slot')]
      .map((n) => n.getBoundingClientRect().bottom));
    return grid.bottom - lowest > 20
      ? { x: Math.round(grid.left + grid.width / 2), y: Math.round((lowest + grid.bottom) / 2) }
      : null;
  });
  if (empty) {
    await page.mouse.click(empty.x, empty.y);
    await page.waitForTimeout(300);
    assert.equal(await page.$$eval('#previewBox [data-arrange-selected]', (n) => n.length), 0,
      'a click on empty lattice should deselect');
    assert.ok((await gated()).every(Boolean), 'and disable the controls again');
    assert.match(await bar(), /Click a block/, 'and go back to asking for one');
    checks++;
  }

  assert.deepEqual(errors, []);
  console.log(`ok · layout face: ${checks} checks · a click selects (words included), a wobble does not move, `
    + `arrows and sizers write regions, an anchor sticks, the bar speaks SF.latticeFit, `
    + `Theme drops the map and Escape finishes`);
} finally {
  await browser.close();
  await harness.stop(relay);
  fs.rmSync(dir, { recursive: true, force: true });
}
