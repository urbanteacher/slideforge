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

  /* 5. And the grid itself has to sit where the slide's body is.
        .sf-lattice is positioned absolutely at left 52 / top 88, which is
        measured from .pad — but a composition's .cp-body is position:relative
        and already sits at exactly 52,88, so inside one the inset was applied
        twice. The grid started at 104,176 and ran to 752 on a slide 720 tall:
        its last rows were under the footer and off the bottom of the slide,
        which is what "Layout pushes content off the screen" looked like.
        A uniform shift has no spread, so the drift measurements never saw
        this — only looking at it did. */
  await page.evaluate(() => {
    const d = SF.makeDeck('Lattice box');
    d.theme = 'aiad27-future';
    d.slides = [SF.normalizeSlide({ type: 'compare', title: 'Strengthening, or replacing?',
      bullets: ['You draft\tIt drafts', 'You decide\tIt decides'],
      design: { composition: 'comparison' } })];
    SF.Store.save(d);
    SF.Editor.openDeck(d.id);
  });
  await page.waitForSelector('#previewBox .cp-body', { timeout: 20000 });
  await page.waitForTimeout(500);
  await page.click('#btnArrange');
  await page.waitForSelector('#previewBox.arranging .sf-slot', { timeout: 10000 });
  await page.waitForTimeout(400);
  const boxes = await page.evaluate(() => {
    const root = document.querySelector('#previewBox .slide');
    const rb = root.getBoundingClientRect();
    const scale = rb.width / 1280;
    const at = (el) => {
      const b = el.getBoundingClientRect();
      return { top: Math.round((b.top - rb.top) / scale), left: Math.round((b.left - rb.left) / scale),
               bottom: Math.round((b.bottom - rb.top) / scale) };
    };
    const body = root.querySelector('.cp-body');
    const lat = root.querySelector('.sf-lattice');
    const foot = root.querySelector('.cp-footer');
    const lowest = Array.from(root.querySelectorAll('.cp-body .sf-slot'))
      .map((n) => at(n).bottom).sort((a, b) => b - a)[0];
    return { body: at(body), lattice: lat ? at(lat) : null, footerTop: foot ? at(foot).top : null, lowest };
  });
  assert.ok(boxes.lattice, 'the composition slide must be latticed for this to mean anything');
  assert.deepEqual(boxes.lattice, boxes.body,
    'the grid must be flush to the body between the header and the footer:\n  body    ' +
    JSON.stringify(boxes.body) + '\n  lattice ' + JSON.stringify(boxes.lattice));
  assert.ok(boxes.lowest <= boxes.footerTop,
    'no slot may reach under the footer — lowest ' + boxes.lowest + ', footer at ' + boxes.footerTop);
  assert.ok(boxes.lattice.bottom <= 720, 'and none of the grid may fall off the slide');
  await page.evaluate(() => SF.Arrange.setArranging(false));
  checks++;

  /* 6. And seeding must not depend on what is docked beside the canvas.
        A slide with a poll attached renders with 438px of right padding to
        make room for the rail, so its body is nine columns wide rather than
        twelve. Seeding measured the canvas, wrote nine-column regions, and
        the slide kept them after the rail closed — squeezed into two thirds
        of itself for good. The arrangement is a fact about the slide, so it
        is measured from a clean render of the slide alone. */
  const railSeed = await page.evaluate(async () => {
    const make = () => {
      const d = SF.makeDeck('Rail seeding');
      d.theme = 'aiad27-future';
      d.slides = [SF.normalizeSlide({ type: 'cards', title: 'What would you struggle with most?',
        bullets: ['Starting from nothing\tThe blank page.', 'Explaining my reasoning\tSaying why.'],
        design: { composition: 'ballot' } })];
      SF.Store.save(d);
      return d;
    };
    const seedOf = async (withRail) => {
      const d = make();
      SF.Editor.openDeck(d.id);
      await new Promise((r) => setTimeout(r, 1200));
      /* Through the editor, so the canvas rails the way it does for an
         author who attaches a poll — setting the field by hand does not. */
      if (withRail) { SF.Editor.attachFeedback('poll'); await new Promise((r) => setTimeout(r, 900)); }
      SF.Arrange.setArranging(true);
      await new Promise((r) => setTimeout(r, 900));
      const regions = JSON.parse(JSON.stringify(SF.Editor.currentSlide().design.regions || {}));
      SF.Arrange.setArranging(false);
      await new Promise((r) => setTimeout(r, 300));
      const pad = document.querySelector('#previewBox .pad');
      return { regions, padRight: pad ? getComputedStyle(pad).paddingRight : null };
    };
    const off = await seedOf(false);
    const on = await seedOf(true);
    return { off, on };
  });
  assert.ok(Object.keys(railSeed.on.regions).length, 'the railed slide must have been seeded');
  assert.notEqual(railSeed.on.padRight, railSeed.off.padRight,
    'the rail must actually be changing the canvas, or this check proves nothing — got ' +
    railSeed.on.padRight + ' both ways');
  assert.deepEqual(railSeed.on.regions, railSeed.off.regions,
    'the same slide must seed the same regions with a rail open and closed:\n  rail on  ' +
    JSON.stringify(railSeed.on.regions) + '\n  rail off ' + JSON.stringify(railSeed.off.regions));
  checks++;

  assert.deepEqual(errors, [], 'no page errors');
  console.log('ok · canvas placement: ' + checks + ' checks · a drop, a corner resize, the arrow keys and an ' +
    'insert all go through one rule, so none of them can leave two blocks sharing a cell; a resize still ' +
    'grows through its neighbour, which is how a layout gets built; and the grid is flush to the body between ' +
    'a composition\u2019s header and footer rather than running off the bottom of the slide, and a slide seeds ' +
    'the same regions whether or not a poll rail is docked beside it');
} finally {
  await browser?.close();
  relay.kill();
  fs.rmSync(dir, { recursive: true, force: true });
}
