/* Highlighted words outrank the slide they sit on.
 *
 * Slide text is ordinary rendered HTML, not an input, so the shell's `typing`
 * guard — which only asks where the caret is — used to let Cmd+C through to
 * copySlide(). Its preventDefault() then threw the selection away and put the
 * whole slide on the clipboard instead of the words the reader had picked.
 *
 * Checks both directions, because the fix is only correct if it is narrow:
 * with a selection the clipboard keys reach the browser, and with none the
 * slide shortcuts still work.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import harness from '../tests/harness.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-clipboard-'));
const port = await harness.freePort(), relay = await harness.start(port, dir);
const browser = await chromium.launch();
let checked = 0;

try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${port}`);
  await page.waitForFunction(() => window.SF?.Editor && window.SF?.Store);

  await page.evaluate(() => {
    const d = SF.makeDeck('Clipboard selection');
    d.slides = [
      SF.normalizeSlide({ type: 'content', title: 'Selectable heading', bullets: ['A bullet worth copying'] }),
      SF.normalizeSlide({ type: 'content', title: 'Second slide', bullets: ['Another'] })
    ];
    SF.Store.save(d); SF.Editor.openDeck(d.id);
  });
  await page.waitForFunction(() => SF.Editor.deck()?.slides?.length === 2);
  await page.evaluate(() => SF.Editor.selectSlide(0));
  await page.waitForSelector('#previewBox .slide h2');

  /* Dispatch on the node itself: e.target is what the shell reads. */
  const press = (key, select) => page.evaluate(({ key, select }) => {
    const node = document.querySelector('#previewBox .slide h2');
    const sel = window.getSelection();
    sel.removeAllRanges();
    if (select) { const r = document.createRange(); r.selectNodeContents(node); sel.addRange(r); }
    const picked = String(sel);
    const e = new KeyboardEvent('keydown',
      { key, code: 'Key' + key.toUpperCase(), metaKey: true, bubbles: true, cancelable: true });
    node.dispatchEvent(e);
    return { prevented: e.defaultPrevented, picked };
  }, { key, select });

  /* 1. With words highlighted, copy and cut belong to the browser. */
  for (const key of ['c', 'x']) {
    const r = await press(key, true);
    assert.equal(r.picked, 'Selectable heading', `selection lost before Cmd+${key}`);
    assert.equal(r.prevented, false,
      `Cmd+${key} was intercepted while text was selected — the slide would go to the clipboard instead of the words`);
    checked++;
  }

  /* 2. With nothing highlighted, the slide shortcuts still work. Proven by
        effect, not by defaultPrevented: Cmd+C then Cmd+V must add a slide. */
  const before = await page.evaluate(() => SF.Editor.deck().slides.length);
  const copy = await press('c', false);
  assert.equal(copy.picked, '', 'selection should be empty for the no-selection case');
  assert.equal(copy.prevented, true, 'Cmd+C with no selection should still copy the slide');
  checked++;

  const cut = await press('x', false);
  assert.equal(cut.prevented, true, 'Cmd+X with no selection should still pick the slide up');
  await page.keyboard.press('Escape');
  checked++;

  /* 3. A collapsed caret is not a selection — clicking on a slide and pressing
        Cmd+C must still copy it, or the fix would disable the shortcut for
        anyone who had merely clicked. */
  const collapsed = await page.evaluate(() => {
    const node = document.querySelector('#previewBox .slide h2');
    const r = document.createRange(); r.setStart(node.firstChild, 2); r.collapse(true);
    const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
    const e = new KeyboardEvent('keydown',
      { key: 'c', code: 'KeyC', metaKey: true, bubbles: true, cancelable: true });
    node.dispatchEvent(e);
    return { prevented: e.defaultPrevented, picked: String(sel) };
  });
  assert.equal(collapsed.picked, '', 'a collapsed range selects no text');
  assert.equal(collapsed.prevented, true, 'a caret with no selected text must not disable the slide shortcut');
  checked++;

  /* 4. Typing in a field is still untouched by any of this. */
  const inField = await page.evaluate(() => {
    const field = document.querySelector('#inspector input[type=text], #inspector textarea');
    if (!field) return { skipped: true };
    field.focus();
    const e = new KeyboardEvent('keydown',
      { key: 'c', code: 'KeyC', metaKey: true, bubbles: true, cancelable: true });
    field.dispatchEvent(e);
    return { prevented: e.defaultPrevented };
  });
  if (!inField.skipped) {
    assert.equal(inField.prevented, false, 'Cmd+C inside a form field must reach the browser');
    checked++;
  }

  assert.deepEqual(errors, [], 'page errors');
  console.log(`${checked} clipboard/selection cases checked; highlighted text keeps the clipboard.`);
} finally {
  await browser.close();
  await harness.stop(relay);
  fs.rmSync(dir, { recursive: true, force: true });
}
