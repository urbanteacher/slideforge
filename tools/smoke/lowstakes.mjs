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
  await page.waitForSelector('#wsSwitch', { timeout: 10000 });

  await page.click('button[data-go="game"]');
  await page.waitForTimeout(300);
  await page.click('#btnActivitiesGame');
  const card = page.locator('.activity-card', { hasText: 'Low-Stakes Quiz' });
  await card.waitFor({ timeout: 8000 });
  await card.click();
  note('Low-Stakes Quiz added from library');

  /* Picking a format inside Quiz studio now opens that game here, so there is
     no hop through the deck. Tolerate both: older decks may still have the
     game filed as a slide. */
  const edit = page.getByRole('button', { name: /Edit in Quiz studio/ });
  if (await edit.count()) await edit.click();
  note('Opened game editor');

  await page.waitForSelector('#previewBox .lowstakes-board-slide, #previewBox .lsq-list', { timeout: 10000 });
  const previewQs = await page.locator('#previewBox .lsq-question').count();
  if (previewQs < 3) throw new Error('expected worksheet questions, got ' + previewQs);
  note('Editor preview worksheet: ' + previewQs + ' questions');

  await page.click('#btnPlay');
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
