#!/usr/bin/env node
/* Smoke: a sample class (SF.Demo) with fake players on a multiple-choice quiz. */
import { chromium } from 'playwright';

const BASE = process.env.SF_URL || 'http://127.0.0.1:8787/';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

try {
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForFunction(() => window.SF?.createPresetGame && SF.Demo && SF.Player, null, { timeout: 20000 });
  /* The classic Quiz studio's Try demo is gone; its route was SF.Demo.start on
     the game's run deck, which is what stays. */
  await page.evaluate(() => {
    const g = SF.createPresetGame('choice', structuredClone(SF.GAME_FORMAT_PRESETS.choice), null);
    SF.Demo.start(SF.gameToRunDeck(g), { fullscreen: false, mode: 'class' });
  });
  await page.waitForSelector('#player.on', { timeout: 10000 });
  console.log('✓ Demo player opened');

  await page.waitForSelector('.scorerail, .deck-viewport.railed', { timeout: 8000 });
  const sub = await page.locator('.rail-sub').innerText().catch(() => '');
  if (!/sample|DEMO/i.test(sub)) {
    /* Wait for demo attach */
    await page.waitForTimeout(500);
  }
  const sub2 = (await page.locator('.rail-sub').innerText().catch(() => '')).trim();
  console.log('✓ Rail:', sub2 || '(waiting)');

  /* Advance to a quiz if on intro */
  for (let i = 0; i < 4; i++) {
    if (await page.locator('#player .layout-quiz, #player .opt').count()) break;
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(500);
  }

  await page.waitForTimeout(3500);
  const tallyOn = await page.locator('#player .tally.on, #player .tally .cnt').count();
  const answeredNote = await page.locator('.rnote, .rail-news').innerText().catch(() => '');
  console.log('✓ Fake answers in flight (tally parts:', tallyOn, ')');

  await page.waitForTimeout(5000);
  const scores = await page.locator('.scorerail .rows .row, .scorerail .rows > div').count();
  if (scores < 1) throw new Error('expected sample players on the rail');
  console.log('✓ Sample players on rail:', scores);

  await page.keyboard.press('Escape');
  await page.waitForSelector('#player.on', { state: 'hidden', timeout: 8000 }).catch(() => {});
  console.log('✓ Esc exited demo');

  console.log('\nFake-player demo smoke passed.');
  await browser.close();
  process.exit(0);
} catch (err) {
  console.error('\nFAILED:', err.message);
  await page.screenshot({ path: 'tools/smoke-fake-demo-fail.png', fullPage: true }).catch(() => {});
  await browser.close();
  process.exit(1);
}
