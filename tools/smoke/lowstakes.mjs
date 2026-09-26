#!/usr/bin/env node
/* Smoke-test Low-Stakes Quiz in a real browser. */
import { chromium } from 'playwright';

const BASE = process.env.SF_URL || 'http://127.0.0.1:8787/';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const log = [];
function note(m) { log.push(m); console.log('✓', m); }

try {
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForFunction(() => window.SF?.createPresetGame && SF.Player, null, { timeout: 20000 });

  /* The classic Quiz studio (its library card, editor and Play) is gone: the
     game is built from its preset and played in the player, as Play did. */
  await page.evaluate(() => {
    const g = SF.createPresetGame('lowstakes', structuredClone(SF.GAME_FORMAT_PRESETS['low-stakes-quiz']), null);
    SF.Player.start(SF.gameToRunDeck(g), 0, { fullscreen: false });
  });
  note('Low-Stakes Quiz built from its preset');
  /* The editor preview's worksheet count went with the editor; the same count runs on the player's board below. */

  await page.waitForSelector('#player .deck-viewport .slide', { timeout: 10000 });
  note('Play view opened (intro or board)');

  for (let i = 0; i < 6; i++) {
    if (await page.locator('#player .lsq-list').count()) break;
    await page.locator('#player').click({ position: { x: 700, y: 400 } }).catch(() => {});
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(400);
  }
  await page.waitForSelector('#player .lsq-list', { timeout: 8000 });
  note('On the low-stakes board');

  const boardQs = await page.locator('#player .lsq-question').count();
  if (boardQs < 3) throw new Error('expected worksheet questions, got ' + boardQs);
  note('Worksheet: ' + boardQs + ' questions');

  await page.locator('#player button', { hasText: 'Start the quiz' }).click();
  await page.waitForTimeout(400);
  const mid = await page.locator('#player .lsq-answer').count();
  if (mid !== 0) throw new Error('answers visible during quiz');
  note('Quiz started — answers hidden');

  await page.locator('#player button', { hasText: 'Reveal answers' }).click();
  await page.waitForTimeout(400);
  const shown = await page.locator('#player .lsq-answer').count();
  if (shown < 3) throw new Error('answers not revealed, got ' + shown);
  note('Answers revealed: ' + shown);

  await page.screenshot({ path: 'tools/smoke-lowstakes-ok.png' });
  console.log('\nLow-Stakes smoke test passed.');
  console.log(log.map((l) => '  · ' + l).join('\n'));
  await browser.close();
  process.exit(0);
} catch (err) {
  console.error('\nLow-Stakes smoke test FAILED:', err.message);
  try {
    await page.screenshot({ path: 'tools/smoke-lowstakes-fail.png', fullPage: true });
    console.error('Screenshot: tools/smoke-lowstakes-fail.png');
  } catch (_) {}
  await browser.close();
  process.exit(1);
}
