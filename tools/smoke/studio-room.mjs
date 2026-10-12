#!/usr/bin/env node
/* The Lesson studio's own show with its own room (lab-engine-plan M7 slice 2), end to end in a browser:
 * the real relay (tests/harness.js, a free port, never 8787), the lab as the shell's frame with
 * ?studioRoom=1, the lesson "The art of paying attention" (one Multiple choice question), and two raw-socket
 * phones speaking join.html's side. Host live (studio) opens the show; the wall is HTML over the slide:
 *
 *   lobby       PIN, join address and a QR code of the join link; the phones appear as they join
 *   Start       the show steps to the lesson's first slide
 *   question    the answer count updates (aria-live); a Next inside the grace is swallowed
 *   reveal      Next shows the answer: the tally per option, the right one marked; the phone is told it was right
 *   scores      the leaderboard, best first, from the relay's scores
 *   end         Next past the last slide ends the show, and the room: the phones are told it is over
 *
 * Needs lab-app/ built (npm --prefix lab run build:app). */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import harness from '../../tests/harness.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-studio-room-'));
const port = await harness.freePort();
assert.notEqual(port, 8787);
const relay = await harness.start(port, dir);
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const phones = [];
const step = (m) => console.log('  ✓ ' + m);
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${port}/?studioRoom=1`);
  await page.waitForFunction(() => window.SF?.Shell?.current()?.lab && SF.Shell.current().doc().id, null, { timeout: 90000 });
  // The Library's "The art of paying attention": one Multiple choice question among a few slides.
  const before = await page.evaluate(() => SF.Shell.current().doc().id);
  await page.evaluate(() => SF.LabEngine.openKey('attention'));
  await page.waitForFunction((id) => SF.Shell.current().doc().id !== id && SF.Shell.current().doc().slides.some((s) => s.game), before, { timeout: 90000 });
  const lab = page.frames().find((f) => f.url().includes('/lab-app/'));
  assert.ok(lab, 'the lab is the shell\'s frame');

  // Without the flag nothing is offered; with it, Host live (studio) is in the lab's tools row.
  const hostBtn = lab.getByRole('button', { name: 'Host live (studio)' });
  await hostBtn.waitFor({ timeout: 30000 });
  assert.ok(await hostBtn.isEnabled(), 'the lesson has a Multiple choice game, so the button is on');
  step('Host live (studio) is offered behind ?studioRoom=1 (read through the shell frame)');
  await hostBtn.click();

  // ---- lobby
  const view = () => lab.locator('.wall-layer').getAttribute('data-view');
  await lab.locator('[data-testid=pin]').waitFor({ timeout: 30000 });
  const pin = (await lab.locator('[data-testid=pin]').textContent()).trim();
  assert.match(pin, /^\d{6}$/, 'a six-digit PIN');
  const addr = (await lab.locator('[data-testid=join-url]').textContent()).trim();
  assert.match(addr, /:\d+$|\./, 'a join address');
  const qr = await lab.locator('[data-testid=qr] svg').evaluate((s) => ({ title: s.querySelector('title')?.textContent, path: s.querySelector('path')?.getAttribute('d')?.length ?? 0 }));
  assert.ok(qr.path > 500, 'the QR code is drawn');
  assert.match(qr.title, new RegExp(`join\\.html\\?pin=${pin}`), 'the QR code encodes the join link with the PIN in it');
  const type = await lab.locator('.lobby-pin').evaluate((e) => ({ px: parseFloat(getComputedStyle(e).fontSize), w: innerWidth }));
  const small = await lab.locator('.lobby-count').evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
  assert.ok(small >= 36 * type.w / 1920 - 0.6, `wall text is at least 36px at 1920 wide (${small}px at ${type.w})`);
  // The lobby fits the screen, and its parts do not lie on one another.
  const boxes = await lab.evaluate(() => Object.fromEntries(['.lobby-url', '.lobby-pin', '[data-testid=qr]', '.lobby-players', '.wall-start'].map((q) => { const r = document.querySelector(q).getBoundingClientRect(); return [q, { l: r.left, t: r.top, r: r.right, b: r.bottom }]; })));
  const all = Object.values(boxes);
  for (const [k, b] of Object.entries(boxes)) assert.ok(b.l >= 0 && b.t >= 0 && b.r <= type.w && b.b <= 1080, `${k} is on screen: ${JSON.stringify(b)}`);
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
    const a = all[i], c = all[j];
    assert.ok(a.r <= c.l + 1 || c.r <= a.l + 1 || a.b <= c.t + 1 || c.b <= a.t + 1, `lobby parts overlap: ${Object.keys(boxes)[i]} and ${Object.keys(boxes)[j]}`);
  }
  assert.equal(await lab.getByRole('button', { name: 'Start' }).isDisabled(), true, 'Start waits for a player');
  step(`lobby: PIN ${pin}, address ${addr}, QR encodes the join link, wall text ${small.toFixed(1)}px at ${type.w} wide`);

  // ---- two phones join
  const join = async (name) => {
    const p = await harness.connect(port);
    p.send({ t: 'join', pin, name });
    await p.next('joined');
    phones.push(p);
    return p;
  };
  const ana = await join('Ana'), bo = await join('Bo');
  await lab.locator('[data-testid=player-count]').filter({ hasText: '2 players in' }).waitFor({ timeout: 10000 });
  const names = await lab.locator('.lobby-list li').allTextContents();
  assert.deepEqual(names.sort(), ['Ana', 'Bo']);
  step('the phones appear in the lobby as they join');

  // ---- Start, then Next through the lesson's slides to the question
  await lab.getByRole('button', { name: 'Start' }).click();
  await lab.locator('.wall-layer[data-view=slide], .wall-layer[data-view=question]').waitFor({ timeout: 10000 });
  const next = () => lab.locator('body').press('ArrowRight');
  let askedAt = 0;
  for (let i = 0; i < 60 && (await view()) !== 'question'; i++) { await next(); await page.waitForTimeout(450); }
  assert.equal(await view(), 'question', 'Next reaches the question');
  askedAt = Date.now();
  const q = await ana.next('question');
  assert.equal(q.options.length, 4);
  assert.equal((await bo.next('question')).options.length, 4);
  assert.equal(await lab.locator('[data-testid=answered]').textContent(), '0 of 2 answered');
  step('the question is asked; the wall counts answers (0 of 2)');

  // ---- an answer arrives, a Next inside the grace is swallowed
  ana.send({ t: 'answer', choice: q.options.indexOf('Remove distractions') });
  await lab.locator('[data-testid=answered]').filter({ hasText: '1 of 2 answered' }).waitFor({ timeout: 5000 });
  if (Date.now() - askedAt < 1100) {
    await next();
    await page.waitForTimeout(300);
    assert.equal(await view(), 'question', 'a Next inside the grace does not reveal');
    step('a Next inside the grace is swallowed (the answer is not shown early)');
  }
  await page.waitForTimeout(Math.max(0, 1700 - (Date.now() - askedAt)));

  // ---- reveal
  await next();
  await lab.locator('.wall-layer[data-view=reveal]').waitFor({ timeout: 5000 });
  const tally = await lab.locator('[data-testid^=tally-]').evaluateAll((els) => els.map((e) => ({ right: e.classList.contains('right'), text: e.textContent })));
  assert.equal(tally.length, 4);
  assert.deepEqual(tally.map((t) => t.right), [false, true, false, false], 'the right option is marked');
  assert.match(tally[1].text, /Remove distractions.*1$/, 'one vote for it');
  const said = await lab.locator('[data-testid=reveal-said]').textContent();
  assert.match(said, /Answer: Remove distractions\. 1 of 1 got it right/);
  const res = await ana.next('result');
  assert.equal(res.right, true);
  assert.equal((await bo.next('result')).right, false, 'a phone that did not answer is told it missed');
  step('reveal: the tally per option, the right one marked, "1 of 1 got it right"; the phones are told');

  // ---- on to the scores
  for (let i = 0; i < 60 && (await view()) !== 'leaderboard'; i++) { await next(); await page.waitForTimeout(450); }
  assert.equal(await view(), 'leaderboard');
  const rows = await lab.locator('[data-testid=board-row]').evaluateAll((els) => els.map((e) => [...e.children].map((c) => c.textContent)));
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0].slice(0, 2), ['1', 'Ana']);
  assert.ok(Number(rows[0][2]) > 0, 'Ana has points');
  assert.deepEqual(rows[1], ['2', 'Bo', '0']);
  const heading = await lab.locator('.wall-board h2').textContent();
  step(`leaderboard (${heading}): Ana ${rows[0][2]}, Bo 0`);

  // ---- the end: Next past the last slide closes the show, and the room
  for (let i = 0; i < 60 && (await lab.locator('.show').count()) > 0; i++) { await next(); await page.waitForTimeout(450); }
  assert.equal(await lab.locator('.show').count(), 0, 'the show closes at its end');
  const over = await ana.next('over');
  assert.ok(over, 'ending the show ended the room: the phone is told it is over');
  const late = await harness.connect(port);
  late.send({ t: 'join', pin, name: 'Late' });
  assert.match((await late.next('error')).message, /No quiz found/, 'the PIN no longer opens a room');
  await late.close();
  step('ending the show ends the room');

  assert.deepEqual(errors, [], 'no page errors');
  console.log('studio-room: ok');
} finally {
  await Promise.all(phones.map((p) => p.close().catch(() => {})));
  await browser.close();
  await harness.stop(relay);
  fs.rmSync(dir, { recursive: true, force: true });
}
