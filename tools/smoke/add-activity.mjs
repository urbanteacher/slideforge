#!/usr/bin/env node
/* Canvas ＋ Add activity, Engagement, and the rail + Activity open one
 * catalogue. Engagement used to only attach a poll; adding a game lived
 * somewhere else. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import harness from '../../tests/harness.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-add-act-'));
const port = await harness.freePort();
const relay = await harness.start(port, dir);
const browser = await chromium.launch({ headless: true });

async function libraryOpen(page) {
  const modal = page.locator('#activityModal');
  await modal.waitFor({ state: 'visible' });
  const tabs = page.locator('#activityModal .library-tabs');
  await tabs.getByRole('tab', { name: /^All activities/ }).waitFor();
  await tabs.getByRole('tab', { name: /^Knowledge checks/ }).waitFor();
  await tabs.getByRole('tab', { name: /^Quick quizzes/ }).waitFor();
  await tabs.getByRole('tab', { name: /^Games \(/ }).waitFor();
  await tabs.getByRole('tab', { name: /^Memory \(/ }).waitFor();
  await tabs.getByRole('tab', { name: /^Word \(/ }).waitFor();
  await tabs.getByRole('tab', { name: /^Discuss \(/ }).waitFor();
  await tabs.getByRole('tab', { name: /^Gather feedback/ }).waitFor();
}

async function closeLibrary(page) {
  await page.locator('#activityModal header button[aria-label="Close activity library"]').click();
  await page.locator('#activityModal').waitFor({ state: 'hidden' });
}

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${port}/?lesson=ipdv-intro`);
  await page.waitForFunction(() => window.SF?.Editor?.deck() && window.SF?.Studio?.openLibrary);

  await page.locator('#btnActivities').click();
  await libraryOpen(page);
  await closeLibrary(page);

  await page.locator('.inspector-tabs').locator('button', { hasText: 'Engagement' }).click();
  await page.locator('#inspAddActivity').waitFor();
  assert.match(await page.locator('#inspAddActivity').innerText(), /Add activity/);
  await page.locator('#inspAddActivity').click();
  await libraryOpen(page);
  await closeLibrary(page);

  /* The rail's way in is now the first card of + Slide (UX-23). */
  await page.locator('.rail-actions button', { hasText: '+ Slide' }).click();
  await page.locator('#starterActivity').click();
  await libraryOpen(page);

  const tabs = page.locator('#activityModal .library-tabs');
  await tabs.getByRole('tab', { name: /^Games \(/ }).click();
  await page.locator('#activityModal .activity-card').filter({ hasText: 'Boss Battle' }).waitFor();
  assert.equal(await page.locator('#activityModal .activity-card strong', { hasText: /^Poll$/ }).count(), 0,
    'Games filter should hide audience prompts');

  await tabs.getByRole('tab', { name: /^Gather feedback/ }).click();
  await page.locator('#activityModal .activity-card').filter({ hasText: 'Poll' }).first().click();
  await page.locator('#activityModal').waitFor({ state: 'hidden' });
  const pollKind = await page.evaluate(() => {
    const s = SF.Editor.deck().slides[SF.Editor.selected()];
    return s.feedback && s.feedback.kind;
  });
  assert.equal(pollKind, 'poll', 'library Poll should attach audience feedback on this slide');
  await page.locator('#inspector .feedback-kinds').getByRole('button', { name: 'Poll' }).waitFor();

  await page.locator('#inspAddActivity').click();
  await libraryOpen(page);
  await page.locator('#activityModal .library-tabs').getByRole('tab', { name: /^Knowledge checks/ }).click();
  await page.locator('#activityModal .activity-card').filter({ hasText: 'Multiple choice' }).first().click();
  await page.locator('#activityModal').waitFor({ state: 'hidden' });
  const gameType = await page.evaluate(() => {
    const s = SF.Editor.deck().slides[SF.Editor.selected()];
    return s.type;
  });
  assert.equal(gameType, 'game', 'library Multiple choice should insert a game slide');

  assert.equal(errors.join('\n'), '');
  console.log('PASS add activity: canvas, Engagement and rail open one library');
} finally {
  await browser.close();
  relay.kill();
}
