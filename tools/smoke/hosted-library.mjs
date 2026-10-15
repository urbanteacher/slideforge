#!/usr/bin/env node
/* Smoke: the hosted site's Library (js/builtins.js).
 *
 *   node tools/smoke/run.mjs hosted-library
 *
 * A new visitor's Library starts empty, with SlideForge's built-in lessons offered as templates at its foot. Using
 * one files a copy, which the Library then holds and the templates no longer offer. Runs in a throwaway profile,
 * told it is the hosted site (localStorage slideforge.seedLibrary = '0'), since the relay here is on localhost.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import harness from '../../tests/harness.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-hosted-'));
const port = await harness.freePort();
const relay = await harness.start(port, dir);
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const base = `http://127.0.0.1:${port}/`;
const shot = process.env.SF_SHOT || '';

try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('slideforge.seedLibrary', '0'); } catch (e) {} });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.SF?.Shell?.current()?.lab && SF.Shell.current().doc().id, null, { timeout: 60000 });
  await page.waitForTimeout(700);

  const empty = await page.evaluate(() => ({
    filed: SF.Store.list().filter((d) => d.sourceKey).length,
    templates: SF.BuiltIns.templates().length
  }));
  assert.equal(empty.filed, 0, 'nothing built-in is filed in a new visitor’s Library');
  assert.ok(empty.templates > 10, 'the built-ins are offered as templates');
  console.log(`  ✓ a new visitor’s Library holds no built-in lesson; ${empty.templates} are offered as templates`);

  await page.evaluate(() => SF.Studio.openLessons());
  const dlg = page.locator('#lessonModal');
  await dlg.waitFor({ state: 'visible' });
  assert.match(await dlg.locator('.library-note').first().innerText(), /^0 lessons in this browser/);
  const box = dlg.locator('.library-templates');
  assert.equal(await box.evaluate((b) => b.open), true, 'an empty Library shows its templates open');
  assert.equal(await box.locator('.library-row').count(), empty.templates);
  assert.match(await dlg.locator('footer').innerText(), /Saved in this browser/);
  console.log('  ✓ the Library says it is empty, with the built-in lessons open at its foot, and saved in this browser');
  if (shot) await page.screenshot({ path: shot });

  const title = await box.locator('.library-row strong').first().innerText();
  await box.locator('.library-row button', { hasText: 'Use' }).first().click();
  await page.waitForFunction((t) => SF.Shell.current().doc().title === t, title, { timeout: 60000 });
  await page.waitForTimeout(1500);
  const after = await page.evaluate(() => SF.BuiltIns.templates().length);
  assert.equal(after, empty.templates - 1, 'a template used is no longer offered');
  await page.evaluate(() => SF.Studio.openLessons());
  await dlg.waitFor({ state: 'visible' });
  assert.match(await dlg.locator('.library-note').first().innerText(), /^1 lesson in this browser/);
  assert.ok(await dlg.locator('.library-row:not(.library-templates .library-row) strong', { hasText: title }).count() >= 1);
  console.log(`  ✓ using “${title}” opens it and files one copy in the Library`);

  /* Signed in (a stand-in for the account, as js/cloud.js and js/sync.js report it): the footer says so. */
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    SF.Cloud.user = () => ({ id: 'u1', email: 'teacher@urbanteacher.co.uk' });
    SF.Sync.status = () => ({ at: Date.now(), up: 1, down: 0, kept: 0, builtIn: 1, skipped: [], error: '' });
    SF.Studio.openLessons();
  });
  await dlg.waitFor({ state: 'visible' });
  const foot = await dlg.locator('footer').innerText();
  assert.match(foot, /Saved in this browser and to your account, teacher@urbanteacher\.co\.uk, in step at /);
  assert.match(foot, /Built-in lessons join it once you change them\./);
  assert.equal(await dlg.locator('footer .local-dot.is-synced').count(), 1);
  await page.evaluate(() => {
    SF.Sync.status = () => ({ at: Date.now(), up: 0, down: 0, kept: 0, builtIn: 0, skipped: [], error: 'the account did not answer' });
    document.getElementById('lessonModal').close();
    SF.Studio.openLessons();
  });
  assert.match(await dlg.locator('footer').innerText(), /Not saved to your account \(teacher@urbanteacher\.co\.uk\) just now: the account did not answer/);
  console.log('  ✓ signed in, the footer says the Library is saved to the account, or that the last save to it failed');

  assert.deepEqual(errors, [], 'no page errors');
  await ctx.close();
} finally {
  await browser.close();
  await harness.stop(relay);
}
