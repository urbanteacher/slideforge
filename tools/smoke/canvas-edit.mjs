#!/usr/bin/env node
/* Smoke: clicking a block on the canvas edits it, where it is.
 *
 * Written because the thing this replaces failed in a way no test could see.
 * bindCanvasContent handed openCanvasEditor the whole #previewBox as the
 * anchor for its panel instead of the block that had been double-clicked, so
 * the panel opened in the same place whichever words you picked; and whenever
 * the panel was taller than the preview — which it was at any ordinary window,
 * measured 320x225 against a 392x219 canvas — it left the slide and docked
 * over the editor rail. One gesture, two unrelated destinations, and nothing
 * asserting that either of them had anything to do with the click.
 *
 * So the assertions here are about position as much as behaviour: the caret
 * lands in the block, the format bar sits against the block's own edge, and
 * the panel that is still needed for a composite block opens at that block
 * rather than in the middle of the canvas. Run at two window widths, because
 * the old bug only showed at one of them.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import harness from '../../tests/harness.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-canvas-edit-'));
const port = await harness.freePort();
const relay = await harness.start(port, dir);
const browser = await chromium.launch();
let checks = 0;

/* A tab or a block that draws only part of its field cannot be typed into in
   place, so the keywords row is here on purpose: its term and its definition
   are two nodes sharing one bullets.N key. */
const DECK = {
  title: 'Canvas edit',
  slides: [
    { type: 'content', title: 'Points that landed', bullets: ['First line', 'Second line'] },
    { type: 'keywords', title: 'Terms', bullets: ['Salience\tWhat the eye reaches first'] },
  ],
};

try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForFunction(() => typeof window.SF?.Custom?.editCanvasBlock === 'function', null, { timeout: 30000 });

  const open = async (index) => {
    await page.evaluate((spec) => {
      const d = SF.makeDeck(spec.title);
      d.slides = spec.slides.map((s) => SF.normalizeSlide(s));
      SF.Store.save(d);
      SF.Editor.openDeck(d.id);
      window.__deck = d;
      window.__deckIds = d.slides.map((x) => x.id);
    }, DECK);
    await page.waitForSelector('#previewBox [data-content-key]', { timeout: 20000 });
    if (index) {
      /* Through the rail, not SF.Editor.selectSlide: the canvas hands a
         composite block to the rail field that owns it, so the test has to
         put the rail in the state a click would. */
      await page.evaluate((i) => {
        const thumb = document.querySelector('.rail-list .thumb[data-i="' + i + '"]');
        if (!thumb) throw new Error('no rail thumb at ' + i);
        thumb.click();
      }, index);
      /* Wait on the rail's own stamp, so the test cannot race past the redraw
         and then assert against the previous slide's fields — which is exactly
         how it caught the stale-rail hazard in the first place. */
      await page.waitForFunction(
        (want) => document.getElementById('inspector')?.dataset.slide === want,
        await page.evaluate((i) => window.__deckIds[i], index),
        { timeout: 10000 }
      );
    }
    await page.waitForFunction(() => document.querySelectorAll('#previewBox [data-content-key]').length > 0);
    await page.waitForTimeout(400);
  };

  const geometry = (key) => page.evaluate((k) => {
    const node = [...document.querySelectorAll('#previewBox [data-content-key]')]
      .find((n) => n.dataset.contentKey === k);
    if (!node) return null;
    const bar = document.querySelector('.canvas-inline-tools');
    const form = document.querySelector('.canvas-edit-form');
    const box = (n) => { const r = n.getBoundingClientRect(); return { left: r.left, top: r.top, bottom: r.bottom, w: r.width, h: r.height }; };
    return {
      editing: node.getAttribute('contenteditable'),
      focused: document.activeElement === node,
      block: box(node),
      bar: bar ? box(bar) : null,
      form: form ? Object.assign(box(form), {
        docked: form.classList.contains('canvas-edit-docked'),
        host: form.parentElement.id || form.parentElement.className,
        text: form.querySelector('textarea')?.value,
      }) : null,
    };
  }, key);

  const click = async (key) => {
    await page.evaluate((k) => {
      const node = [...document.querySelectorAll('#previewBox [data-content-key]')]
        .find((n) => n.dataset.contentKey === k);
      if (!node) throw new Error('no block for ' + k);
      node.click();
    }, key);
    await page.waitForTimeout(350);
  };

  for (const size of [{ width: 1600, height: 1000 }, { width: 1100, height: 720 }]) {
    await page.setViewportSize(size);
    const where = `${size.width}x${size.height}`;
    await open(0);

    /* 1. One click, a caret in the words, and no panel anywhere. */
    await click('bullets.0');
    const inline = await geometry('bullets.0');
    assert.equal(inline.editing, 'plaintext-only', `${where}: one click should make the block editable`);
    assert.ok(inline.focused, `${where}: the caret should be in the block that was clicked`);
    assert.equal(inline.form, null, `${where}: a block that can be typed into must not open a panel`);
    checks++;

    /* 2. The bar is against this block's edge — the assertion the old panel
          would have failed, since it measured the whole preview. */
    assert.ok(inline.bar, `${where}: the format bar should be up`);
    assert.ok(Math.abs(inline.bar.left - inline.block.left) < 2,
      `${where}: bar left ${inline.bar.left} should track the block's ${inline.block.left}`);
    assert.ok(inline.bar.bottom <= inline.block.top + 1 || inline.bar.top >= inline.block.bottom - 1,
      `${where}: the bar should sit clear of the words, not over them`);
    assert.ok(inline.bar.left >= 0 && inline.bar.top >= 0,
      `${where}: the bar should stay on screen`);
    checks++;

    /* 3. Typing reaches the slide; Escape keeps it, as the Done button says
          and as every other slide editor does; Undo takes the edit back. */
    await page.evaluate(() => {
      const n = [...document.querySelectorAll('#previewBox [data-content-key]')].find((x) => x.dataset.contentKey === 'bullets.0');
      n.textContent = 'Typed straight in';
      n.dispatchEvent(new InputEvent('input', { bubbles: true }));
    });
    assert.equal(await page.evaluate(() => SF.Editor.currentSlide().bullets[0]), 'Typed straight in',
      `${where}: typing should reach the slide`);
    await page.evaluate(() => {
      const n = [...document.querySelectorAll('#previewBox [data-content-key]')].find((x) => x.dataset.contentKey === 'bullets.0');
      n.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    await page.waitForTimeout(400);
    assert.equal(await page.evaluate(() => SF.Editor.currentSlide().bullets[0]), 'Typed straight in',
      `${where}: Escape should keep what was typed`);
    assert.equal(await page.evaluate(() => !!document.querySelector('.canvas-inline-tools')), false,
      `${where}: the bar should go with the edit`);
    await page.evaluate(() => document.querySelector('[data-history=undo]').click());
    await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => SF.Editor.currentSlide().bullets[0]), 'First line',
      `${where}: one Undo should take the whole edit back`);
    checks++;

    /* 4. Bold lands on the words that were selected, not on the block, and is
          drawn without leaving the edit — the panel only showed marks on Save. */
    await click('title');
    const marked = await page.evaluate(() => {
      const n = [...document.querySelectorAll('#previewBox [data-content-key]')].find((x) => x.dataset.contentKey === 'title');
      const t = document.createTreeWalker(n, NodeFilter.SHOW_TEXT).nextNode();
      const r = document.createRange();
      r.setStart(t, 7); r.setEnd(t, 11);          // "that" in "Points that landed"
      const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
      document.dispatchEvent(new Event('selectionchange'));
      const b = [...document.querySelectorAll('.canvas-inline-tools button')].find((x) => x.textContent === 'B');
      b.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      b.click();
      return new Promise((done) => setTimeout(() => done({
        marks: SF.Editor.currentSlide().formatting?.title?.marks || [],
        bold: [...n.children].filter((c) => c.style.fontWeight === '800').map((c) => c.textContent),
        stillEditing: n.getAttribute('contenteditable'),
      }), 300));
    });
    assert.deepEqual(marked.marks.map((m) => [m.kind, m.start, m.end, m.value]), [['bold', 7, 11, true]],
      `${where}: bold should land on the selected offsets`);
    assert.deepEqual(marked.bold, ['that'], `${where}: only the selected word should be drawn bold`);
    assert.equal(marked.stillEditing, 'plaintext-only', `${where}: formatting should not end the edit`);
    checks++;

    /* 5. A composite block hands over to the rail. The keywords row draws its
          term and its definition as two nodes carrying one bullets.N key, so
          neither can be typed into without dropping the other half — and the
          rail control that keeps them apart has existed all along. What used
          to happen instead was a floating panel, and it was measured before
          its own toolbar existed: told it fitted at 212x225, drawn at 491x304
          in a 531x298 canvas. No panel, no measurement to get wrong. */
    await open(1);
    const key = await page.evaluate(() => {
      const term = document.querySelector('#previewBox .kw-term[data-content-key]');
      return term ? term.dataset.contentKey : null;
    });
    assert.ok(key, `${where}: the keywords row should render a term`);
    assert.equal(await page.evaluate((k) => {
      const term = document.querySelector('#previewBox .kw-term[data-content-key]');
      return SF.Custom.inlineEditable(term, SF.Editor.currentSlide(), k);
    }, key), false, `${where}: a term drawing half its field must not be typed into in place`);

    for (const [cls, part, expected] of [['kw-term', 'lead', 'Salience'], ['kw-def', 'trail', 'What the eye reaches first']]) {
      await page.evaluate((c) => document.querySelector('#previewBox .' + c + '[data-content-key]').click(), cls);
      await page.waitForTimeout(300);
      const handed = await page.evaluate(() => {
        const a = document.activeElement;
        return {
          inRail: !!(a && a.closest('#inspector')),
          key: a && a.dataset ? a.dataset.contentKey : null,
          part: a && a.dataset ? a.dataset.contentPart : null,
          value: a && 'value' in a ? a.value : null,
          panel: !!document.querySelector('.canvas-edit-form'),
          bar: !!document.querySelector('.canvas-inline-tools'),
        };
      });
      assert.ok(handed.inRail, `${where}: clicking .${cls} should focus a field in the rail`);
      assert.equal(handed.key, key, `${where}: it should be the field for ${key}`);
      assert.equal(handed.part, part, `${where}: and the ${part} half`);
      assert.equal(handed.value, expected, `${where}: holding "${expected}"`);
      assert.equal(handed.panel, false, `${where}: no panel over the canvas`);
      assert.equal(handed.bar, false, `${where}: and no in-place bar either`);
      checks++;
    }
    checks++;
  }

  assert.deepEqual(errors, []);
  console.log(`ok · canvas edit: ${checks} checks at two window widths · one click edits in place, `
    + `the bar tracks the block, a composite row hands its half to the rail field that owns it`);
} finally {
  await browser.close();
  await harness.stop(relay);
  fs.rmSync(dir, { recursive: true, force: true });
}
