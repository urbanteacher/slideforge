#!/usr/bin/env node
/* Lesson bank follows the Library folder. Cloning from another Northeastern
 * check must not list UK Black Tech or the old generic databanks. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import harness from '../tests/harness.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-lbank-'));
const port = await harness.freePort();
const relay = await harness.start(port, dir);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${port}/?lesson=ipdv-intro`);
  await page.waitForFunction(() => window.SF?.Editor?.deck() && window.SF?.LessonBank);

  const setup = await page.evaluate(() => {
    const nul = SF.Editor.deck();
    const gameSlide = nul.slides.find((s) => s.type === 'game' && s.gameId);
    const other = nul.slides.find((s) => s.type === 'game' && s.gameId && s.gameId !== gameSlide.gameId);
    SF.Editor.selectSlide(gameSlide.id);
    SF.Games.openGame(gameSlide.gameId);
    SF.Shell.activate('game', { toast: false });
    return {
      folder: SF.LessonBank.folderId(nul),
      from: gameSlide.gameTitle,
      other: other && other.gameTitle,
      bank: SF.LessonBank.folderBank(SF.LessonBank.folderId(nul), gameSlide.gameId).map((r) => r.title)
    };
  });
  assert.equal(setup.folder, 'nul');
  assert.ok(setup.bank.length > 0, 'IPDV should offer other checks in Northeastern');
  assert.ok(setup.bank.every((t) => !/UK Black Tech/i.test(t)), 'UKBT titles must not appear in the NUL bank');

  await page.getByRole('button', { name: 'Lesson bank' }).click();
  await page.locator('#pickerModal.on').waitFor();
  const picker = page.locator('#pickerBody');
  await picker.waitFor();
  const titles = await picker.locator('.nm').allTextContents();
  assert.ok(titles.length > 0, 'Lesson bank picker has rows');
  assert.ok(titles.every((t) => !/General Knowledge/i.test(t)));
  assert.ok(titles.every((t) => !/UK Black Tech/i.test(t)));

  const before = await page.evaluate(() => SF.Games.game().questions.length);
  await picker.locator('.deck-item').first().click();
  await page.locator('dialog.ask-modal[open] #askYes').waitFor();
  await page.locator('dialog.ask-modal[open] #askYes').click();
  await page.waitForFunction((n) => (window.SF.Games.game().questions || []).length > n, before);

  assert.equal(errors.join('\n'), '');
  console.log('PASS lesson bank: Northeastern folder, clone into this check');
} finally {
  await browser.close();
  relay.kill();
}
