#!/usr/bin/env node
/* Smoke-test Knowledge Flip in a real browser. */
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
    const g = SF.createPresetGame('knowledgeflip', structuredClone(SF.GAME_FORMAT_PRESETS['knowledge-flip']), null);
    SF.Player.start(SF.gameToRunDeck(g), 0, { fullscreen: false });
  });
  note('Knowledge Flip built from its preset');
  /* The editor preview's board checks went with the editor; the same checks run on the player's board below. */

  await page.waitForSelector('#player .deck-viewport .slide', { timeout: 10000 });
  note('Play view opened (intro or board)');

  /* Advance past intro section to the memory board */
  for (let i = 0; i < 6; i++) {
    if (await page.locator('#player .mem-grid').count()) break;
    await page.locator('#player').click({ position: { x: 700, y: 400 } }).catch(() => {});
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(400);
  }
  await page.waitForSelector('#player .mem-grid', { timeout: 8000 });
  note('On the Knowledge Flip board');

  const board = page.locator('#player');
  const cardCount = await board.locator('.mem-card').count();
  if (cardCount < 4) throw new Error('expected ≥4 keyword cards, got ' + cardCount);
  note('Board: ' + cardCount + ' keyword cards');

  const defOnBoard = await board.locator('.mem-definition').count();
  if (defOnBoard !== 0) throw new Error('definitions should stay off the board, found ' + defOnBoard);
  note('Definitions stay off the board');

  const openBtn = page.locator('#player button', { hasText: 'Open the board' });
  await openBtn.waitFor({ timeout: 5000 });
  await openBtn.click();
  note('Opened board → recall (skipped study)');

  await page.waitForSelector('#player .mem-card:not([disabled])', { timeout: 5000 });
  const firstCard = page.locator('#player .mem-card:not([disabled])').first();
  const term = (await firstCard.locator('.mem-term').innerText()).trim();
  await firstCard.click();
  note('Chose keyword: ' + term);

  await page.waitForSelector('#player .mem-check', { timeout: 5000 });
  await page.locator('#player .mem-check button', { hasText: 'Reveal definition' }).click();
  note('Revealed definition');

  const defText = (await page.locator('#player .mem-check p').innerText()).trim();
  if (!defText || /Explain the meaning/.test(defText)) {
    throw new Error('definition did not appear after reveal: ' + defText);
  }
  note('Definition shown in check panel: ' + defText.slice(0, 60));

  await page.locator('#player .mem-check button', { hasText: 'Claim card' }).click();
  note('Claimed +1');

  const collected = await page.locator('#player .mem-card.collected').count();
  if (collected < 1) throw new Error('expected a collected card');
  note('Board shows ' + collected + ' collected card(s)');

  await page.screenshot({ path: 'tools/smoke-kf-ok.png' });
  console.log('\nKnowledge Flip smoke test passed.');
  console.log(log.map((l) => '  · ' + l).join('\n'));
  await browser.close();
  process.exit(0);
} catch (err) {
  console.error('\nKnowledge Flip smoke test FAILED:', err.message);
  try {
    await page.screenshot({ path: 'tools/smoke-kf-fail.png', fullPage: true });
    console.error('Screenshot: tools/smoke-kf-fail.png');
  } catch (_) {}
  await browser.close();
  process.exit(1);
}
