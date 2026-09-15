#!/usr/bin/env node
/* Screenshots of what the room sees on their own phones, for the demo deck.
 *
 *   node tools/capture-phone.mjs
 *
 * Starts a relay, hosts the demo lesson, joins it from a phone-sized browser,
 * and photographs the learner screens as the wall moves through the lesson.
 * The demo used to describe these in words, which is the one thing a picture
 * of a phone is better at.
 *
 * Writes assets/demo-phone/*.jpg. Re-run it whenever the learner screens
 * change — a screenshot nobody can regenerate is a screenshot that goes stale
 * and then lies about the product. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import harness from '../tests/harness.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'assets', 'demo-phone');
fs.mkdirSync(OUT, { recursive: true });

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-phone-'));
const port = await harness.freePort();
const relay = await harness.start(port, dir);
const browser = await chromium.launch({ headless: true });
const base = `http://127.0.0.1:${port}`;
const shots = [];

async function shot(page, name) {
  /* JPEG: these are flat UI at 2x, so the quality loss is invisible and the
     repo carries a third of the bytes. */
  const file = path.join(OUT, name + '.jpg');
  await page.screenshot({ path: file, type: 'jpeg', quality: 88 });
  shots.push(name);
  console.log('  ▸ ' + name);
}

try {
  const wallCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const wall = await wallCtx.newPage();
  await wall.goto(base);
  await wall.waitForFunction(() => window.SF?.Editor?.deck());

  /* The demo itself, so the phones are answering the deck we ship. */
  await wall.evaluate(() => SF.Editor.useLesson(SF.Studio.DEMO_KEY));
  await wall.waitForFunction(() => SF.Editor.deck().slides.length > 40);
  await wall.evaluate(() => SF.Editor.workspace.hostLive());
  await wall.waitForFunction(() => SF.Live.pin);
  const pin = await wall.evaluate(() => SF.Live.pin);
  console.log('room ' + pin);

  /* A phone, described to the page as one: the learner screens read the
     viewport, and a desktop-width join page is not the thing to photograph. */
  const phoneCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  });
  const phone = await phoneCtx.newPage();

  await phone.goto(base + '/join.html');
  await phone.waitForSelector('#pin');
  await phone.locator('#pin').fill(pin);
  await phone.locator('#name').fill('Priya');
  await shot(phone, 'phone-join');

  await phone.locator('#joinBtn').click();
  await phone.waitForSelector('#scWait.on');
  await shot(phone, 'phone-waiting');

  await wall.waitForFunction(() => SF.Live.players.length === 1);
  await wall.evaluate(() => SF.Live.begin());
  await wall.waitForSelector('#player.on');

  async function goToSlide(pred, label) {
    const idx = await wall.evaluate(p => {
      const fn = new Function('s', 'return ' + p);
      return SF.Player.deck.slides.findIndex(s => fn(s));
    }, pred);
    if (idx < 0) { console.log('  (no slide for ' + label + ')'); return -1; }
    await wall.evaluate(i => SF.Player.goTo(i), idx);
    await phone.waitForTimeout(700);
    return idx;
  }

  if (await goToSlide("s.feedback && s.feedback.kind === 'poll'", 'poll') >= 0) {
    await shot(phone, 'phone-poll');
    const opt = phone.locator('#scFeedback button, #scPoll button').first();
    if (await opt.count()) { await opt.click(); await phone.waitForTimeout(500); await shot(phone, 'phone-poll-answered'); }
  }
  if (await goToSlide("s.feedback && s.feedback.kind === 'wordcloud'", 'word cloud') >= 0) {
    await shot(phone, 'phone-wordcloud');
  }
  if (await goToSlide("s.feedback && s.feedback.kind === 'scale'", 'scale') >= 0) {
    await shot(phone, 'phone-scale');
  }
  if (await goToSlide("s.type === 'quiz'", 'live check') >= 0) {
    await phone.waitForTimeout(600);
    await shot(phone, 'phone-check');
    const pad = phone.locator('#qPad button').first();
    if (await pad.count()) { await pad.click(); await phone.waitForTimeout(600); await shot(phone, 'phone-check-answered'); }
  }

  /* And the other phone screen: a read-only share, paged at their own pace. */
  const share = await wall.evaluate(async () => {
    const r = await fetch('/api/share', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doc: SF.Editor.deck() })
    });
    const j = await r.json();
    return j.id;
  });
  const reader = await phoneCtx.newPage();
  await reader.goto(base + '/view.html?s=' + share);
  await reader.waitForTimeout(1800);
  await shot(reader, 'phone-share');

  console.log('\n' + shots.length + ' screenshots in assets/demo-phone');
} finally {
  await browser.close();
  await harness.stop(relay);
  fs.rmSync(dir, { recursive: true, force: true });
}
