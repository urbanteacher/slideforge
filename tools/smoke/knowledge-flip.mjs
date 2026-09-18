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
  await page.waitForSelector('#wsSwitch', { timeout: 10000 });

  /* Prefer Quiz studio browse → still embeds on the lesson; then Edit this game. */
  await page.click('button[data-go="game"]');
  await page.waitForTimeout(300);
  await page.click('#btnActivitiesGame');
  const kf = page.locator('.activity-card', { hasText: 'Knowledge Flip' });
  await kf.waitFor({ timeout: 8000 });
  await kf.click();
  note('Knowledge Flip added from library');

  /* Picking a format inside Quiz studio now opens that game here, so there is
     no hop through the deck. Tolerate both: older decks may still have the
     game filed as a slide. */
  const edit = page.getByRole('button', { name: /Edit in Quiz studio/ });
  if (await edit.count()) await edit.click();
  note('Opened game editor');

  await page.waitForSelector('#previewBox .memory-board-slide, #previewBox .mem-grid', { timeout: 10000 });
  const preview = page.locator('#previewBox');
  const cardCount = await preview.locator('.mem-card').count();
  if (cardCount < 4) throw new Error('expected ≥4 keyword cards, got ' + cardCount);
  note('Editor preview board: ' + cardCount + ' keyword cards');

  const defOnBoard = await preview.locator('.mem-definition').count();
  if (defOnBoard !== 0) throw new Error('definitions should stay off the preview board, found ' + defOnBoard);
  note('Definitions stay off the board in preview');

  const status = (await preview.locator('.mem-status strong').innerText()).trim();
  note('Ready copy: ' + status.slice(0, 80));

  await page.click('#btnPlay');
  await page.waitForSelector('#player.on, #player.open, #player:not([hidden])', { timeout: 5000 }).catch(() => {});
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
