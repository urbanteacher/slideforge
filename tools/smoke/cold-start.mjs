#!/usr/bin/env node
/* Smoke: what the app opens with, on a first visit and on a return.
 *
 *   node tools/smoke-cold-start.mjs
 *
 * Runs in throwaway browser profiles, so it never touches the storage of a
 * browser somebody is working in — which is the only honest way to test a
 * cold start. It used to open the 74-slide IPDV lecture, because the Library
 * seeds that first and the fallback took Store.list()[0]; for anybody but its
 * author that is a stranger's lecture to type over.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import harness from '../../tests/harness.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-cold-'));
const port = await harness.freePort();
const relay = await harness.start(port, dir);
const browser = await chromium.launch({ headless: true });
const base = `http://127.0.0.1:${port}/`;

try {
  const ctx = await browser.newContext();          // never visited before
  const page = await ctx.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.SF?.Editor?.deck(), { timeout: 20000 });
  await page.waitForTimeout(700);

  const first = await page.evaluate(() => {
    const d = SF.Editor.deck();
    return { title: d.title, slides: d.slides.length, type: d.slides[0] && d.slides[0].type,
             sourceKey: d.sourceKey || null, library: SF.Store.list().length };
  });
  assert.equal(first.slides, 1, 'a first visit opens one slide, not a lecture');
  assert.equal(first.type, 'title');
  assert.equal(first.title, 'Untitled lesson');
  assert.equal(first.sourceKey, null, 'the blank deck is nobody else’s lesson');
  assert.ok(first.library > 1, 'the brand packs are still seeded into the Library');
  console.log('✓ First visit: blank deck (1 title slide), ' + first.library + ' documents in the Library');

  /* One click to the templates, from the canvas rather than inside File. */
  const opened = await page.evaluate(async () => {
    const b = document.getElementById('btnLibraryOpen');
    if (!b) return 'no button';
    b.click();
    await new Promise((r) => setTimeout(r, 600));
    const dlg = document.querySelector('dialog[open]');
    return dlg ? (dlg.querySelector('h2') || {}).textContent : 'no dialog';
  });
  assert.equal(opened, 'Library', 'the canvas Library button opens the Library');
  console.log('✓ Library is one click from the canvas');

  /* And a return visit resumes the work, which is the half that already worked. */
  await page.evaluate(() => {
    const dlg = document.querySelector('dialog[open]'); if (dlg) dlg.close();
    const d = SF.Editor.deck();
    d.title = 'Half-finished lecture';
    d.slides[0].title = 'MINE';
    SF.Store.save(d);
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.SF?.Editor?.deck(), { timeout: 20000 });
  await page.waitForTimeout(600);
  const back = await page.evaluate(() => {
    const d = SF.Editor.deck();
    return { title: d.title, slide: d.slides[0].title };
  });
  assert.equal(back.title, 'Half-finished lecture');
  assert.equal(back.slide, 'MINE');
  console.log('✓ Return visit: reopens the document you were editing, with your words');
  console.log('\nCold start is blank; the Library is one click away; returning resumes.');
} finally {
  await browser.close();
  await harness.stop(relay);
  fs.rmSync(dir, { recursive: true, force: true });
}
