#!/usr/bin/env node
/* A lab copy whose live figures kept only their pictures (lab/src/app/embed.ts
 * figuresMended). A copy carried to version 15 after its lesson was filed again
 * under new slide ids found none of its figures, was marked up to date anyway,
 * and Present refused it: "has a live figure the lesson does not carry". Here
 * Week 5's copy is broken that way in this browser's store, opened again, and
 * must come back with every figure and present. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import harness from '../../tests/harness.js';

const KEY = 'ipdv-ia-w5';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-stale-figure-'));
const port = await harness.freePort();
const relay = await harness.start(port, dir);
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const open = async () => {
    await page.goto(`http://127.0.0.1:${port}/?lesson=${KEY}`);
    await page.waitForFunction(() => window.SF?.LabEngine?.labDeck?.()?.slides?.some((s) => s.liveFigure), null, { timeout: 90000 });
  };
  await open();
  const id = await page.evaluate(() => SF.LabEngine.labDeck().id);

  // The first save lands a few seconds after the lesson shows (its pictures are kept apart first, and the show's
  // pictures are being drawn meanwhile: lab/src/app/pictureStore.ts), so wait for the saved copy before breaking it.
  const hasSaved = (id) => new Promise((resolve) => {
    const req = indexedDB.open('slideforge-studio', 1);
    req.onsuccess = () => {
      const get = req.result.transaction('kv').objectStore('kv').get(`deck:${id}`);
      get.onsuccess = () => { resolve(!!get.result?.slides); req.result.close(); };
      get.onerror = () => { resolve(false); req.result.close(); };
    };
    req.onerror = () => resolve(false);
  });
  let saved = false;
  for (let i = 0; i < 90 && !saved; i++) {
    saved = await page.evaluate(hasSaved, id);
    if (!saved) await new Promise((r) => setTimeout(r, 1000));
  }
  assert.ok(saved, 'the lesson is saved in this browser');
  // Break the saved copy as an old one is: the figures gone, their slides' ids matching nothing, up to date.
  const broken = await page.evaluate((id) => new Promise((resolve, reject) => {
    const req = indexedDB.open('slideforge-studio', 1);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const st = req.result.transaction('kv', 'readwrite').objectStore('kv');
      const get = st.get(`deck:${id}`);
      get.onsuccess = () => {
        const d = get.result;
        let n = 0;
        d.slides.forEach((s) => { if (s.liveFigure) { delete s.figure; s.sourceSlideId = `stale-${n++}`; } });
        d.carried = 16;
        const put = st.put(d, `deck:${id}`);
        put.onsuccess = () => resolve(n);
        put.onerror = () => reject(put.error);
      };
    };
  }), id);
  assert.ok(broken >= 10, `Week 5 has its live figures (${broken})`);

  await open();
  // The saved copy itself is mended, not only the one on screen.
  const stored = (id) => new Promise((resolve) => {
    const req = indexedDB.open('slideforge-studio', 1);
    req.onsuccess = () => {
      const get = req.result.transaction('kv').objectStore('kv').get(`deck:${id}`);
      get.onsuccess = () => resolve(get.result.slides.filter((s) => s.liveFigure && s.figure?.figure).length);
    };
  });
  const mended = await page.waitForFunction(async ([id, n, read]) => (await new Function('return ' + read)()(id)) === n,
    [id, broken, stored.toString()], { timeout: 30000 }).then(() => true, () => false);
  assert.ok(mended, 'the saved copy has every figure again');

  // Present opens the studio's show (with 79 slides to draw first) rather than refusing.
  const lab = page.frameLocator('#labFrame');
  // Pressed without waiting for the page to settle: starting a show of 88 slides keeps it busy for a while, which
  // Playwright's click waits out and then gives up on. The wait just below is the one that matters.
  await lab.getByRole('button', { name: 'Present', exact: true }).evaluate((b) => { setTimeout(() => b.click(), 0); });
  const outcome = await page.waitForFunction(() => {
    const said = [...document.querySelectorAll('[class*=toast]')].map((e) => e.textContent).join(' ');
    if (/cannot start/.test(said)) return said;
    return document.getElementById('labFrame')?.contentDocument?.querySelector('.show') ? 'shown' : false;
  }, null, { timeout: 240000 }).then((h) => h.jsonValue());
  assert.equal(outcome, 'shown', 'Present opens the studio’s show');
  assert.deepEqual(errors, [], 'no page errors');
  console.log(`stale-figure: ${broken} live figures mended on reopen, and the lesson presents`);
} finally {
  await browser.close();
  relay.kill();
  fs.rmSync(dir, { recursive: true, force: true });
}
