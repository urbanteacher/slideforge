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
  /* Keyed rather than positional, because the controls do not all answer to a
     selection the same way: Fit to text stays off for a block that already has
     the lines its words need, however well it is selected. That asymmetry is
     the design — a live button that would do nothing is worse than a dead one
     that says why — so the test reads each control by id. */
  const gated = () => page.evaluate(() => {
    const out = {};
    document.querySelectorAll('#arrangeBar [data-arrange-needs-selection]').forEach((n) => {
      out[n.id] = /** @type {HTMLButtonElement|HTMLSelectElement} */ (n).disabled;
    });
    return out;
  });
  const allGated = async () => Object.values(await gated()).every(Boolean);
  const gatedExcept = async (live) => {
    const state = await gated();
    return Object.keys(state).every((id) => state[id] === !live.includes(id));
  };
  const regionOf = (key) => page.evaluate((k) => {
    const r = SF.Editor.currentSlide()?.design?.regions?.[k];
    return r ? { col: r.col, row: r.row, cols: r.cols, rows: r.rows, anchorX: r.anchorX, anchorY: r.anchorY } : null;
  }, key);

  /* Nothing selected yet, so everything that needs a block is off. */
  assert.match(await bar(), /Click a block/, 'the bar should ask for a block');
  assert.ok(await allGated(), 'controls needing a block should start disabled');
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
  assert.ok(await gatedExcept(['arrangeAnchorX', 'arrangeAnchorY', 'arrangeAlignY',
    'btnArrangeNarrower', 'btnArrangeWider', 'btnArrangeShorter', 'btnArrangeTaller']),
    `a selection should enable the controls, leaving Fit to text off for a block that `
    + `already fits — got ${JSON.stringify(await gated())}`);
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

  /* 4b. Taller pushes what is below it down, gap preserved. Without this a
         resize dropped one block on top of another and the author had to move
         every one of them by hand — which is what "things do not snap down"
         meant. Engine 3's rule: each gap travels with the block below it, so
         the sum of spans and gaps cannot change behind your back. */
  await page.evaluate(() => {
    const s = SF.Editor.currentSlide();
    s.title = 'Short';
    s.design.regions = { title: { col: 1, row: 1, cols: 11, rows: 2 },
                         'block-1': { col: 1, row: 4, cols: 11, rows: 4 } };
    SF.Editor.refreshCanvas();
    SF.Arrange.afterPaint();
  });
  await page.waitForTimeout(600);
  at = await centreOf('.sf-slot[data-block-key="title"]');
  await page.mouse.click(at.x, at.y);
  await page.waitForTimeout(300);
  await page.click('#btnArrangeTaller');
  await page.waitForTimeout(500);
  const pushed = await page.evaluate(() => JSON.parse(JSON.stringify(SF.Editor.currentSlide().design.regions)));
  assert.equal(pushed.title.rows, 3, 'the block should gain a row');
  assert.equal(pushed['block-1'].row, 5, 'and the block below should move down one');
  assert.equal(pushed['block-1'].rows, 4, 'without being resized itself');
  /* The authored gap of one row between them survives: title ends at 3, the
     next starts at 5. */
  assert.equal(pushed['block-1'].row - (pushed.title.row + pushed.title.rows), 1,
    'the gap the author left should travel with the block below it');
  checks++;

  /* 4c. Fit to text: the bridge from "I typed a longer heading" to "the slide
         is arranged again". The tariff still does not grow from paint —
         rearranging a slide under someone who is typing into it is worse than
         telling them — but the telling is now one click from the fixing, and
         the number is the one the bar is already showing. */
  await page.evaluate(() => {
    const s = SF.Editor.currentSlide();
    s.design.regions = { title: { col: 1, row: 1, cols: 11, rows: 2 },
                         'block-1': { col: 1, row: 3, cols: 11, rows: 4 } };
    s.title = 'A heading long enough that it certainly cannot be set on one single line of this lattice';
    SF.Editor.refreshCanvas();
    SF.Arrange.afterPaint();
  });
  await page.waitForTimeout(700);
  at = await centreOf('.sf-slot[data-block-key="title"]');
  await page.mouse.click(at.x, at.y);
  await page.waitForTimeout(400);
  assert.match(await bar(), /needs 6 lines, has 2/, `the bar should state the shortfall, said "${await bar()}"`);
  assert.equal(await page.textContent('#btnArrangeFit'), '↕ Fit to text (6)',
    'and the button should name the number it will use');
  assert.equal(await page.isDisabled('#btnArrangeFit'), false, 'and be live');
  await page.click('#btnArrangeFit');
  await page.waitForTimeout(700);
  const fitted = await page.evaluate(() => ({
    regions: JSON.parse(JSON.stringify(SF.Editor.currentSlide().design.regions)),
    verdicts: [...document.querySelectorAll('#previewBox .sf-slot')].map((n) => n.dataset.fit),
  }));
  assert.equal(fitted.regions.title.rows, 6, 'one click should give it the six lines it needs');
  assert.equal(fitted.regions['block-1'].row, 7, 'and push what is below it down');
  assert.deepEqual(fitted.verdicts, ['ok', 'ok'], 'and leave nothing overflowing');
  assert.equal(await page.isDisabled('#btnArrangeFit'), true,
    'and then have nothing left to do');
  checks++;

  /* 4d. Narrowing away from full width pins to the first column, so what is
         freed is one contiguous half rather than a sliver on each side. The
         closest the lattice has to splitting a row, and Engine 3's rule. */
  await page.evaluate(() => {
    const s = SF.Editor.currentSlide();
    s.title = 'Short';
    s.design.regions = { title: { col: 1, row: 1, cols: 12, rows: 2 },
                         'block-1': { col: 1, row: 3, cols: 12, rows: 4 } };
    SF.Editor.refreshCanvas();
    SF.Arrange.afterPaint();
  });
  await page.waitForTimeout(600);
  at = await centreOf('.sf-slot[data-block-key="title"]');
  await page.mouse.click(at.x, at.y);
  await page.waitForTimeout(300);
  for (let i = 0; i < 6; i++) { await page.click('#btnArrangeNarrower'); await page.waitForTimeout(120); }
  await page.waitForTimeout(400);
  const narrowed = await page.evaluate(() => JSON.parse(JSON.stringify(
    SF.Editor.currentSlide().design.regions.title)));
  assert.equal(narrowed.cols, 6, 'six clicks should take twelve columns to six');
  assert.equal(narrowed.col, 1, 'and pin it to the first, freeing columns 7 to 12 in one piece');
  checks++;

  /* 5. The sizer buttons do the same thing as the keys they mirror.
        Re-seeded and re-selected, because the checks above deliberately leave
        the slide in states of their own. */
  await page.evaluate((k) => {
    const s = SF.Editor.currentSlide();
    s.design.regions = { title: { col: 1, row: 1, cols: 11, rows: 2 } };
    s.design.regions[k] = { col: 1, row: 3, cols: 6, rows: 4 };
    SF.Editor.refreshCanvas();
    SF.Arrange.afterPaint();
  }, key);
  await page.waitForTimeout(600);
  at = await centreOf(`.sf-slot[data-block-key="${key}"]`);
  await page.mouse.click(at.x, at.y);
  await page.waitForTimeout(300);
  const widened = (await regionOf(key)).cols;
  await page.click('#btnArrangeWider');
  await page.waitForTimeout(300);
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

  /* 7b. Where the words sit inside the rows the region gave them, which is a
         different question from where the region sits. A three-row region
         holding two rows of text could not put them in rows 2-3 before this:
         the vertical anchor moves the region and leaves the text at its top.
         Measured in rows, on a region with spare ones, because that is the
         only case where it can show. */
  await page.evaluate((k) => {
    const r = SF.Editor.currentSlide().design.regions[k];
    r.rows = 6;
    delete r.alignY;
    SF.Editor.refreshCanvas();
    SF.Arrange.afterPaint();
  }, key);
  await page.waitForTimeout(700);
  at = await centreOf(`.sf-slot[data-block-key="${key}"]`);
  await page.mouse.click(at.x, at.y);
  await page.waitForTimeout(300);
  assert.match(await bar(), /lines used, \d+ spare/,
    `the bar should say how many rows are spare, said "${await bar()}"`);
  const packed = {};
  for (const side of ['', 'middle', 'bottom']) {
    await page.selectOption('#arrangeAlignY', side);
    await page.waitForTimeout(500);
    packed[side || 'top'] = await page.evaluate((k) => {
      const slot = document.querySelector('#previewBox .sf-slot[data-block-key="' + k + '"]');
      const kid = slot.firstElementChild;
      const a = slot.getBoundingClientRect(), b = kid.getBoundingClientRect();
      const scale = document.querySelector('#previewBox .slide').getBoundingClientRect().width / 1280;
      return {
        above: Math.round((b.top - a.top) / scale / 36 * 10) / 10,
        below: Math.round((a.bottom - b.bottom) / scale / 36 * 10) / 10,
        attr: slot.getAttribute('data-align-y'),
        stored: SF.Editor.currentSlide().design.regions[k].alignY ?? null,
      };
    }, key);
  }
  assert.equal(packed.top.above, 0, 'top should pack the words against the first row');
  assert.equal(packed.top.stored, null, 'and store nothing, because it is the default');
  assert.equal(packed.top.attr, null, 'and stamp nothing, so an untouched slide renders as before');
  assert.equal(packed.bottom.below, 0, 'bottom should pack them against the last row');
  assert.equal(packed.bottom.stored, 'bottom', 'and store the side on the region');
  assert.ok(Math.abs(packed.middle.above - packed.middle.below) < 0.2,
    `middle should split the spare rows, got ${packed.middle.above} above and ${packed.middle.below} below`);
  assert.ok(packed.bottom.above > 1, `bottom should actually move it, ${packed.bottom.above} rows down`);
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
    assert.ok(await allGated(), 'and disable the controls again');
    assert.match(await bar(), /Click a block/, 'and go back to asking for one');
    checks++;
  }

  assert.deepEqual(errors, []);
  console.log(`ok · layout face: ${checks} checks · a click selects (words included), a wobble does not move, `
    + `arrows and sizers write regions, taller pushes the rest down and Fit to text closes the `
    + `gap in one click, narrowing frees one contiguous half, an anchor sticks, text packs to `
    + `the top, middle or `
    + `bottom of its own rows, the bar speaks SF.latticeFit, `
    + `Theme drops the map and Escape finishes`);
} finally {
  await browser.close();
  await harness.stop(relay);
  fs.rmSync(dir, { recursive: true, force: true });
}
