/* The slide review dialog, driven the way an author reaches it.
 *
 * This is the AiAd27 preview page and check-fit.mjs generalised to any deck:
 * the same grid of real renders, and the same "does it leave the stage"
 * measurement, reached from Look instead of a terminal. The campaign scripts
 * proved the idea on five fixed decks; this proves it on an arbitrary one.
 *
 * The deck below carries a slide that cannot fit on purpose. A fit checker
 * that never fails is the failure mode worth guarding against, so the check
 * has to come back clean on the good slides AND dirty on the bad one.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import harness from '../../tests/harness.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-review-'));
const port = await harness.freePort(), relay = await harness.start(port, dir);
const browser = await chromium.launch();
let checked = 0;

try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${port}`);
  await page.waitForFunction(() => window.SF?.Editor && window.SF?.Review);

  await page.evaluate(() => {
    const d = SF.makeDeck('Review tool');
    d.slides = [
      SF.normalizeSlide({ type: 'title', title: 'A cover that fits', subtitle: 'Fine' }),
      SF.normalizeSlide({ type: 'content', title: 'An ordinary slide', bullets: ['One', 'Two'] }),
      SF.normalizeSlide({
        type: 'content', title: 'Far too much for one slide',
        bullets: Array.from({ length: 16 }, (_, i) =>
          'Bullet ' + (i + 1) + ' carrying a long sentence that should push this slide past its own boundary')
      }),
      SF.normalizeSlide({ type: 'content', title: 'A hidden one', bullets: ['x'], hidden: true })
    ];
    SF.Store.save(d); SF.Editor.openDeck(d.id);
  });
  await page.waitForFunction(() => SF.Editor.deck()?.slides?.length === 4);
  await page.evaluate(() => SF.Editor.selectSlide(0));

  /* 1. Reached from the presentation row, not from a terminal — the point of
     the change. It sat in Look until the row existed; a deck-wide audit in a
     pane that customises one slide was the wrong drawer. */
  const button = page.locator('.canvas-faces button', { hasText: 'Review' });
  await button.waitFor({ timeout: 10000 });
  checked++;

  await button.click();
  const dialog = page.locator('dialog.slide-review');
  await dialog.waitFor();

  /* 2. A grid of real renders, hidden slides left out by default. */
  await page.waitForFunction(() => document.querySelectorAll('.review-thumb .slide').length === 3);
  assert.equal(await dialog.locator('.review-tile').count(), 3, 'hidden slide should be out by default');
  assert.match(await dialog.locator('.review-status').innerText(), /3 slides shown/);
  checked++;

  /* 3. The toggle brings it back, labelled. */
  await dialog.locator('input[type=checkbox]').click();
  await page.waitForFunction(() => document.querySelectorAll('.review-tile').length === 4);
  assert.ok((await dialog.locator('.review-caption').allInnerTexts()).some(t => /Hidden/.test(t)),
    'a hidden slide must say so');
  await dialog.locator('input[type=checkbox]').click();
  await page.waitForFunction(() => document.querySelectorAll('.review-tile').length === 3);
  checked++;

  /* 4. The measurement itself: clean on the good slides, dirty on the bad one. */
  await dialog.locator('button', { hasText: 'Check slide fit' }).click();
  await page.waitForFunction(() => /checked/.test(document.querySelector('.review-status').textContent),
    null, { timeout: 60000 });
  const verdicts = await dialog.locator('.review-result').allInnerTexts();
  assert.equal(verdicts.length, 3, 'every shown slide gets a verdict');
  assert.equal(verdicts.filter(v => /Fits slide boundary, nothing over the words/.test(v)).length, 2, 'the two good slides must pass');
  assert.equal(await dialog.locator('.review-failed').count(), 1, 'the overflowing slide must be flagged');
  assert.match(await dialog.locator('.review-status').innerText(), /3 slides checked · 1 need review/);
  checked++;

  /* 5. Enlarge, navigate, and stop at the ends. */
  await dialog.locator('.review-tile').first().click();
  const controls = dialog.locator('.review-view-controls');
  await controls.waitFor();
  const position = () => controls.locator('span').first().innerText();
  assert.equal(await position(), '1 / 3');
  assert.equal(await controls.locator('button', { hasText: 'Previous' }).isDisabled(), true,
    'Previous must be dead on the first slide');
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(() =>
    /2 \/ 3/.test(document.querySelector('.review-view-controls span').textContent));
  await controls.locator('button', { hasText: 'Next' }).click();
  await page.waitForFunction(() =>
    /3 \/ 3/.test(document.querySelector('.review-view-controls span').textContent));
  assert.equal(await controls.locator('button', { hasText: 'Next' }).isDisabled(), true,
    'Next must be dead on the last slide');
  await controls.locator('button', { hasText: 'Back to grid' }).click();
  await page.waitForFunction(() => !document.querySelector('.review-viewer').hidden === false);
  checked++;

  /* 6. Junk in stays out, with something a person can read. */
  const refused = await page.evaluate(() => {
    const tries = [{}, { decks: [] }, { slides: [] }, null];
    return tries.map(v => { try { SF.Review.readDecks(v); return 'accepted'; } catch (e) { return e.message; } });
  });
  assert.ok(refused.every(m => /at least one slide/.test(m)),
    'every malformed input needs the same readable refusal, got: ' + JSON.stringify(refused));
  checked++;

  /* 7. Closing tidies up after itself — the off-screen measuring stage most
        of all, since it renders full-size slides outside the viewport. */
  await dialog.locator('button', { hasText: 'Close' }).click();
  await page.waitForFunction(() => !document.querySelector('dialog.slide-review'));
  assert.equal(await page.locator('.slide-fit-stage').count(), 0, 'the measuring stage must not be left behind');
  checked++;

  assert.deepEqual(errors, [], 'page errors');
  console.log(`${checked} review-tool cases checked; any deck can be reviewed and fit-checked.`);
} finally {
  await browser.close();
  await harness.stop(relay);
  fs.rmSync(dir, { recursive: true, force: true });
}
