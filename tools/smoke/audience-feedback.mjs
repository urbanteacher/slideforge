#!/usr/bin/env node
/* Audience feedback picker on the Engagement tab.
 *
 * Choosing Poll used to recurse (`refresh` called `refresh`) and look like
 * the buttons did nothing. This clicks every kind and None, and fails on a
 * page error. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import harness from '../../tests/harness.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-feedback-'));
const port = await harness.freePort();
const relay = await harness.start(port, dir);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${port}/?lesson=ipdv-intro`);
  await page.waitForFunction(() => window.SF?.Editor?.deck());

  await page.locator('.inspector-tabs').locator('button', { hasText: 'Engagement' }).click();
  const picker = page.locator('#inspector .feedback-kinds');
  await picker.getByRole('button', { name: 'Poll' }).waitFor();

  async function pick(label, kind) {
    await picker.getByRole('button', { name: label }).click();
    const got = await page.evaluate(() => {
      const s = SF.Editor.deck().slides[SF.Editor.selected()];
      return s.feedback && s.feedback.kind;
    });
    assert.equal(got, kind, label + ' should set feedback.kind');
    assert.ok(await picker.getByRole('button', { name: label }).evaluate((b) => b.classList.contains('on')));
  }

  await pick('Poll', 'poll');
  await page.getByLabel('Prompt for the room').waitFor();
  assert.ok(await page.locator('#inspector .opt-row').count() >= 2);

  await pick('Word cloud', 'wordcloud');
  await pick('Brainstorm', 'brainstorm');
  await pick('Scale', 'scale');
  await page.getByLabel('Low end').waitFor();

  await picker.getByRole('button', { name: 'None' }).click();
  const cleared = await page.evaluate(() => {
    const s = SF.Editor.deck().slides[SF.Editor.selected()];
    return s.feedback;
  });
  assert.equal(cleared, null);
  assert.equal(await page.getByLabel('Prompt for the room').count(), 0);
  assert.equal(errors.join('\n'), '');
  console.log('PASS audience feedback picker: Poll, Word cloud, Brainstorm, Scale, None');
} finally {
  await browser.close();
  relay.kill();
}
