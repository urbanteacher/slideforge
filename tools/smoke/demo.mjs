#!/usr/bin/env node
/* Smoke: Quiz studio Try demo for Low-Stakes (interactive preview). */
import { chromium } from 'playwright';

const BASE = process.env.SF_URL || 'http://127.0.0.1:8787/';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

try {
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.click('button[data-go="game"]');
  await page.waitForTimeout(300);
  await page.click('#btnActivitiesGame');
  await page.locator('.activity-card', { hasText: 'Low-Stakes Quiz' }).click();
  /* Picking a format inside Quiz studio now opens that game here, so there is
     no hop through the deck. Tolerate both: older decks may still have the
     game filed as a slide. */
  const edit = page.getByRole('button', { name: /Edit in Quiz studio/ });
  if (await edit.count()) await edit.click();
  await page.waitForSelector('#previewBox .lsq-list', { timeout: 10000 });

  await page.click('#btnDemoGame');
  await page.waitForSelector('.stage-wrap.demo-on', { timeout: 5000 });
  console.log('✓ Demo mode on');

  await page.locator('#previewBox button', { hasText: 'Start the quiz' }).click();
  await page.waitForTimeout(400);
  const mid = await page.locator('#previewBox .lsq-answer').count();
  if (mid !== 0) throw new Error('answers visible during demo quiz');
  console.log('✓ Demo quiz started — answers hidden');

  await page.locator('#previewBox button', { hasText: 'Reveal answers' }).click();
  await page.waitForTimeout(400);
  const shown = await page.locator('#previewBox .lsq-answer').count();
  if (shown < 3) throw new Error('demo reveal failed');
  console.log('✓ Demo reveal works (' + shown + ' answers)');

  await page.click('#btnDemoGame');
  await page.waitForSelector('.stage-wrap:not(.demo-on)', { timeout: 5000 });
  console.log('✓ Demo exited');

  console.log('\nDemo preview smoke passed.');
  await browser.close();
  process.exit(0);
} catch (err) {
  console.error('\nFAILED:', err.message);
  await page.screenshot({ path: 'tools/smoke-demo-fail.png' }).catch(() => {});
  await browser.close();
  process.exit(1);
}
