#!/usr/bin/env node
/* Smoke: one truth about deleting, and about what can be deleted.
 *
 * There were four. Two buttons ran their own implementation of "take this
 * item off the slide" and disagreed about what an item leaves behind: the
 * Layout bar's ✕ dropped the block's formatting, the rail's ✕ Delete left it
 * on the slide as an orphan keyed to an id nothing rendered any more. Each
 * cleared its own selection and not the other's, so deleting from the rail
 * left corner handles on the canvas and deleting from the bar left the rail
 * still drawing the fields of a block that was gone. The Delete key meant a
 * third thing entirely — the whole slide — and once an item could be selected
 * outside the Layout face it meant it with an item visibly selected and
 * handled: select a picture, press Delete, lose the slide.
 *
 * So the checks are about agreement rather than about any one path:
 *   - two predicates, each answering its own question: canRemoveBlock for
 *     "is this an item the slide owns", canDeleteBlock for "can this come off
 *     the canvas", which everything can — an item is removed outright, a
 *     layout block is taken off and keeps its words
 *   - all three paths leave byte-identical slide state
 *   - all three clear both selections, rail and canvas
 *   - Delete means the item when one is selected and the slide when none is,
 *     and never the slide while something is selected
 *   - Escape drops a selection made outside the Layout face, which is what the
 *     rail's own hint has always claimed and never did (inside the face it
 *     still leaves the face, which already drops the selection)
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import harness from '../../tests/harness.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-delete-truth-'));
const port = await harness.freePort();
const relay = await harness.start(port, dir);
const browser = await chromium.launch();
let checks = 0;

try {
  /* Tall for the same reason layout-face is: #inspector shares the stage
     column, and a short viewport leaves a canvas too small to click into. */
  const page = await browser.newPage({ viewport: { width: 1700, height: 1500 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForFunction(() => typeof window.SF?.Arrange?.setArranging === 'function', null, { timeout: 30000 });

  /* Two slides, so "the slide was deleted" is never confused with "the deck
     was left alone", and a picture item, because a text item takes the caret
     and would swallow Delete before anything under test saw it. */
  const reset = async () => {
    await page.evaluate(() => {
      const d = SF.makeDeck('Delete truth');
      d.slides = [
        SF.normalizeSlide({ type: 'content', title: 'Subject', blocks: [
          { id: 'pic', kind: 'image', text: 'assets/img/nul-mark.png' },
          { id: 'keep', kind: 'heading', text: 'Left alone' }
        ] }),
        SF.normalizeSlide({ type: 'content', title: 'Witness' })
      ];
      const s = d.slides[0];
      s.design = { regions: {
        title: { col: 1, row: 1, cols: 12, rows: 2 },
        'blocks.pic': { col: 1, row: 4, cols: 11, rows: 5 },
        'blocks.keep': { col: 1, row: 10, cols: 11, rows: 3 }
      } };
      s.formatting = { 'blocks.pic': { bold: true }, 'blocks.keep': { italic: true } };
      SF.Store.save(d);
      SF.Editor.openDeck(d.id);
    });
    await page.waitForSelector('#previewBox [data-block-key="blocks.pic"]', { timeout: 20000 });
    await page.waitForTimeout(400);
  };

  /* Everything the act is supposed to touch, and the two selections it is
     supposed to clear, in one comparable shape. */
  const snapshot = () => page.evaluate(() => {
    const s = SF.Editor.deck().slides[0];
    return {
      slides: SF.Editor.deck().slides.length,
      title: s.title,
      blocks: SF.freeBlocksOf(s).map((b) => b.id),
      regions: Object.keys(s.design?.regions || {}).sort(),
      formatting: Object.keys(s.formatting || {}).sort(),
      canvasSelection: !!SF.Arrange.hasSelection(),
      handles: document.querySelectorAll('#previewBox .sf-handle').length,
      railOnItem: /SELECTED ITEM/.test(document.getElementById('inspector').textContent)
    };
  });

  /* Select the picture the way a person does — a click on the canvas. */
  const selectPic = async () => {
    await page.click('#previewBox [data-block-key="blocks.pic"] .free-block');
    await page.waitForTimeout(450);
  };

  await reset();

  /* 1. One predicate, and it refuses what the layout drew. */
  const verdicts = await page.evaluate(() => {
    const s = SF.Editor.deck().slides[0];
    return {
      freeBlock: SF.canRemoveBlock(s, 'blocks.pic'),
      layoutBlock: SF.canRemoveBlock(s, 'title'),
      unknownId: SF.canRemoveBlock(s, 'blocks.nothing-here'),
      notAKey: SF.canRemoveBlock(s, ''),
      noSlide: SF.canRemoveBlock(null, 'blocks.pic')
    };
  });
  /* canRemoveBlock is still the narrow question — is this an item the slide
     owns, which can be taken off it outright. A layout block is not, and
     answering false is what stops it being spliced out of a list it was never
     in. It is not the question "can this come off the canvas". */
  assert.deepEqual(verdicts, { freeBlock: true, layoutBlock: false, unknownId: false, notAKey: false, noSlide: false },
    'one predicate must answer for every key: ' + JSON.stringify(verdicts));
  const canDelete = await page.evaluate(() => {
    const s = SF.Editor.deck().slides[0];
    return {
      freeBlock: SF.canDeleteBlock(s, 'blocks.pic'),
      layoutBlock: SF.canDeleteBlock(s, 'title'),
      alreadyOff: (SF.deleteBlock(s, 'title'), SF.canDeleteBlock(s, 'title')),
      notAKey: SF.canDeleteBlock(s, ''),
      noSlide: SF.canDeleteBlock(null, 'title')
    };
  });
  /* canDeleteBlock is the wider one the canvas asks, and it says yes to both
     kinds — and no to a block already taken off, so a second Delete cannot
     record it twice. */
  assert.deepEqual(canDelete,
    { freeBlock: true, layoutBlock: true, alreadyOff: false, notAKey: false, noSlide: false },
    'everything on the canvas can come off it, once: ' + JSON.stringify(canDelete));
  checks++;

  /* 2. Three paths, one outcome. Each runs on the same fixture and the
        results are compared to each other, not to a number written here —
        the claim is that they agree, whatever they do. */
  await selectPic();
  const beforeSelected = await snapshot();
  assert.ok(beforeSelected.canvasSelection && beforeSelected.handles === 4 && beforeSelected.railOnItem,
    'a canvas click must select on both sides before any of this means anything: ' + JSON.stringify(beforeSelected));
  checks++;

  await page.click('#inspector button:has-text("Delete")');
  await page.waitForTimeout(600);
  const viaRail = await snapshot();

  await reset();
  await selectPic();
  await page.keyboard.press('Delete');
  await page.waitForTimeout(600);
  const viaKey = await snapshot();

  await reset();
  await page.click('#btnArrange');
  await page.waitForSelector('#previewBox.arranging .sf-slot', { timeout: 10000 });
  await page.waitForTimeout(300);
  const at = await page.evaluate(() => {
    const n = document.querySelector('#previewBox .sf-slot[data-block-key="blocks.pic"]');
    const b = n.getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  });
  await page.mouse.click(at.x, at.y);
  await page.waitForTimeout(350);
  await page.click('#btnArrangeRemove');
  await page.waitForTimeout(600);
  await page.evaluate(() => SF.Arrange.setArranging(false));
  await page.waitForTimeout(400);
  const viaBar = await snapshot();

  /* The bar path leaves the Layout face, so compare what the act is about. */
  const act = (r) => ({ slides: r.slides, title: r.title, blocks: r.blocks, regions: r.regions, formatting: r.formatting });
  assert.deepEqual(act(viaKey), act(viaRail),
    'the Delete key and the rail button must leave the same slide:\n  key  ' +
    JSON.stringify(act(viaKey)) + '\n  rail ' + JSON.stringify(act(viaRail)));
  assert.deepEqual(act(viaBar), act(viaRail),
    'the Layout bar and the rail button must leave the same slide:\n  bar  ' +
    JSON.stringify(act(viaBar)) + '\n  rail ' + JSON.stringify(act(viaRail)));
  checks++;

  /* And what they agree on has to be right: the item and everything keyed to
     it gone, the slide and its neighbour still there. An earlier pair agreed
     on nothing and this is what each of them missed. */
  assert.deepEqual(viaRail.blocks, ['keep'], 'the selected item goes and the other stays');
  assert.deepEqual(viaRail.regions, ['blocks.keep', 'title'], 'its region goes with it');
  assert.deepEqual(viaRail.formatting, ['blocks.keep'], 'and its formatting, rather than orphaning it');
  assert.equal(viaRail.slides, 2, 'the slide survives its item');
  checks++;

  /* 3. Both selections dropped, by all three. A stale one shows as handles on
        a block that is gone, or a rail editing it. */
  for (const [name, r] of [['rail', viaRail], ['key', viaKey], ['bar', viaBar]]) {
    assert.equal(r.canvasSelection, false, name + ' must drop the canvas selection');
    assert.equal(r.handles, 0, name + ' must take the handles with it');
    assert.equal(r.railOnItem, false, name + ' must stop the rail editing a block that is gone');
  }
  checks++;

  /* 4. Delete means the slide when nothing is selected — the behaviour that
        was always there and must survive the change. */
  await reset();
  await page.evaluate(() => SF.Arrange.deselect());
  await page.click('#previewBox');
  await page.waitForTimeout(300);
  await page.evaluate(() => SF.Arrange.deselect());
  await page.waitForTimeout(300);
  const noSel = await page.evaluate(() => SF.Arrange.hasSelection());
  assert.equal(noSel, false, 'nothing selected for the slide-delete check');
  await page.keyboard.press('Delete');
  await page.waitForTimeout(600);
  assert.equal(await page.evaluate(() => SF.Editor.deck().slides.length), 1,
    'with no item selected, Delete still removes the slide');
  checks++;

  /* 5. And never the slide under a block the layout drew. */
  await reset();
  await page.click('#btnArrange');
  await page.waitForSelector('#previewBox.arranging .sf-slot', { timeout: 10000 });
  await page.waitForTimeout(300);
  const onTitle = await page.evaluate(() => {
    const n = document.querySelector('#previewBox .sf-slot[data-block-key="title"]');
    const b = n.getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  });
  await page.mouse.click(onTitle.x, onTitle.y);
  await page.waitForTimeout(350);
  const heldTitle = await page.evaluate(() => ({
    selected: document.querySelector('#previewBox [data-arrange-selected]')?.dataset.blockKey || null,
    removeDisabled: document.getElementById('btnArrangeRemove').disabled
  }));
  assert.equal(heldTitle.selected, 'title', 'the layout block must really be selected for this to mean anything');
  assert.equal(heldTitle.removeDisabled, false, 'and it can be taken off the slide');
  await page.keyboard.press('Delete');
  await page.waitForTimeout(600);
  const survived = await page.evaluate(() => {
    const s = SF.Editor.currentSlide();
    return {
      slides: SF.Editor.deck().slides.length,
      title: s.title,
      hidden: SF.hiddenBlocksOf(s),
      drawn: !!document.querySelector('#previewBox .sf-slot[data-block-key="title"]'),
      blocks: SF.freeBlocksOf(s).map((b) => b.id)
    };
  });
  /* Taken off, not deleted, and the difference is the whole point: the block
     stops being drawn, the words stay for the rail to edit, and the slide it
     belonged to is still there. Delete used to take that slide instead. */
  assert.equal(survived.drawn, false, 'Delete takes a layout block off the slide');
  assert.deepEqual(survived.hidden, ['title'], 'and records which one');
  assert.equal(survived.title, 'Subject', 'without emptying the field it draws');
  assert.equal(survived.slides, 2, 'and without deleting the slide it belongs to');
  assert.deepEqual(survived.blocks, ['pic', 'keep'], 'nor taking the items with it');
  checks++;

  /* 5b. Which means the canvas can be cleared completely — the thing the
         refusal used to prevent. Everything off, nothing left drawn, the
         slide still there to build on, and a way back for what was hidden. */
  const cleared = await page.evaluate(() => {
    const s = SF.Editor.currentSlide();
    const keys = Array.from(document.querySelectorAll('#previewBox .sf-slot'))
      .map((n) => n.dataset.blockKey).filter(Boolean);
    const kinds = keys.map((k) => SF.deleteBlock(s, k));
    SF.Editor.refreshCanvas();
    return { keys, kinds };
  });
  await page.waitForTimeout(700);
  const empty = await page.evaluate(() => ({
    drawn: document.querySelectorAll('#previewBox .sf-slot').length,
    slides: SF.Editor.deck().slides.length,
    title: SF.Editor.currentSlide().title,
    items: SF.freeBlocksOf(SF.Editor.currentSlide()).length,
    canBringBack: SF.hiddenBlocksOf(SF.Editor.currentSlide()).length
  }));
  assert.ok(cleared.keys.length, 'there must be something on the canvas to clear');
  assert.equal(empty.drawn, 0,
    'every block on the canvas must be able to come off it, got ' + empty.drawn + ' left from ' + JSON.stringify(cleared.keys));
  assert.equal(empty.slides, 2, 'clearing a slide is not deleting it');
  assert.equal(empty.items, 0, 'the items are gone for real');
  assert.equal(empty.title, 'Subject', 'the layout words are kept');
  assert.ok(empty.canBringBack > 0, 'and what was hidden can be brought back');
  checks++;

  /* 6. An item selected on the canvas with the Layout face closed: Escape
        drops it. This is the case that did nothing at all before, while the
        rail's hint promised it gave the slide's own fields back. */
  await page.evaluate(() => SF.Arrange.setArranging(false));
  await reset();
  await selectPic();
  assert.equal(await page.evaluate(() => SF.Arrange.hasSelection()), true, 'selected before Escape');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  const escaped = await snapshot();
  assert.equal(escaped.canvasSelection, false, 'Escape drops the selection');
  assert.equal(escaped.handles, 0, 'and the handles');
  assert.equal(escaped.railOnItem, false, 'and gives the slide’s own fields back');
  assert.deepEqual(escaped.blocks, ['pic', 'keep'], 'without deleting anything');
  checks++;

  assert.deepEqual(errors, [], 'no page errors');
  console.log('ok · delete truth: ' + checks + ' checks · an item is removed outright and a layout block is ' +
    'taken off with its words kept, so the whole canvas can be cleared and brought back; the rail button, the ' +
    'Layout bar and the Delete key leave byte-identical slides and clear both selections; Delete means the slide ' +
    'only when nothing is selected, and Escape drops a selection made outside the Layout face');
} finally {
  await browser?.close();
  relay.kill();
  fs.rmSync(dir, { recursive: true, force: true });
}
