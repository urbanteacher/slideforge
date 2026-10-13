#!/usr/bin/env node
/* Host live from a Multiple-choice lesson, on the REAL path (lab-engine-plan M7 slice 3), end to end in a browser:
 * the real relay (tests/harness.js, a free port, never 8787), the page opened with no flag, the shipped lesson
 * "Lab 1" (ipdv-lab1: one Multiple choice question, no feedback; the smoke shortens its clock to 6 s), and raw-socket
 * phones speaking join.html's side. The shell's own Host live button (the lab's tools row presses it) must open the
 * studio's show and room, not SlideForge's:
 *
 *   room 1 (phones only)
 *     the frame fills the page; the classic room is not started
 *     lobby       PIN, join address and a QR code of the join link; the phones appear as they join
 *     Start       the show steps to the lesson's first slide; a Next inside the grace is swallowed
 *     question    answer count (aria-live), the clock counting down, the standings rail beside the slide
 *     time up     nobody presses Next: the clock runs out into the reveal, as classic's does
 *     reveal      the tally per option, the right one marked, what each phone gained on the rail
 *     scores      the leaderboard, best first
 *     end         Next past the last step ends the room: the final standings stay up, with the report; the
 *                 phones are told it is over; Open in Reports opens the shell's Reports; Back gives the page back
 *   no relay: a relay that never answers closes the show within ~10 s and says why; nothing else starts (M14)
 *   room 2 (teacher entry)
 *     the show's Teacher entry opens manual.html#<key>; a learner added there joins the lobby; with the teacher
 *     entering answers there is no clock; "Live answers" and the C key record the learner's answer
 *
 * Needs lab-app/ built (npm --prefix lab run build:app). */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import harness from '../../tests/harness.js';

const RIGHT = 'The Monday after the lab, by 23:59';
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
  await page.goto(`http://127.0.0.1:${port}/`); // no ?studioRoom=1: this is the path a teacher takes
  await page.waitForFunction(() => window.SF?.Shell?.current()?.lab && SF.Shell.current().doc().id, null, { timeout: 90000 });
  const before = await page.evaluate(() => SF.Shell.current().doc().id);
  await page.evaluate(() => SF.LabEngine.openKey('ipdv-lab1'));
  await page.waitForFunction((id) => SF.Shell.current().doc().id !== id && SF.Shell.current().doc().slides.some((s) => s.game), before, { timeout: 90000 });
  // A 6 s clock on the question, so the smoke can watch it run out.
  await page.evaluate(() => {
    const d = JSON.parse(JSON.stringify(SF.Shell.current().doc()));
    for (const s of d.slides) if (s.game?.role === 'question') s.game.settings.seconds = 6;
    SF.Shell.current().restoreDoc(d);
  });
  await page.waitForFunction(() => SF.Shell.current().doc().slides.some((s) => s.game?.role === 'question' && s.game.settings.seconds === 6), null, { timeout: 30000 });
  const lab = page.frames().find((f) => f.url().includes('/lab-app/'));
  assert.ok(lab, 'the lab is the shell\'s frame');
  assert.equal(await lab.getByRole('button', { name: 'Host live (studio)' }).count(), 0, 'the developer button is not offered without the flag');

  // The show starts on the slide being edited: go to the question's slide (38 of 42), as a teacher would.
  const goto = lab.getByLabel('Go to slide');
  await goto.fill('38');
  await goto.press('Enter');
  const hostLive = () => lab.getByRole('button', { name: /^◉ Host live$/ }).click();
  const view = () => lab.locator('.wall-layer').getAttribute('data-view');
  const next = () => lab.locator('body').press('ArrowRight');
  const join = async (pin, name) => {
    const p = await harness.connect(port);
    p.send({ t: 'join', pin, name });
    await p.next('joined');
    phones.push(p);
    return p;
  };
  const toQuestion = async () => {
    await lab.getByRole('button', { name: 'Start' }).click();
    await lab.locator('.wall-layer[data-view=slide], .wall-layer[data-view=question]').waitFor({ timeout: 10000 });
    for (let i = 0; i < 120 && (await view()) !== 'question'; i++) { await next(); await page.waitForTimeout(250); }
    assert.equal(await view(), 'question', 'Next reaches the question');
  };

  // ======================================================== room 1: phones only
  await hostLive();
  await lab.locator('[data-testid=pin]').waitFor({ timeout: 30000 });
  const mode = await page.evaluate(() => {
    const r = document.getElementById('labFrame').getBoundingClientRect();
    return { shown: document.documentElement.classList.contains('lab-show'), w: r.width, h: r.height, x: r.x, y: r.y, vw: innerWidth, vh: innerHeight, classic: !!SF.Live?.active || !!document.querySelector('#joincard.on, #lobby.on') };
  });
  assert.equal(mode.shown, true);
  assert.deepEqual([mode.x, mode.y, mode.w, mode.h], [0, 0, mode.vw, mode.vh], 'the frame fills the page');
  assert.equal(mode.classic, false, 'SlideForge\'s own room did not start');
  step('Host live (the shell\'s button) opened the studio\'s show and room, the frame filling the page; the classic room did not start');

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
  assert.equal(await lab.getByRole('button', { name: 'Start' }).isDisabled(), true, 'Start waits for a player');
  step(`lobby: PIN ${pin}, address ${addr}, QR encodes the join link, wall text ${small.toFixed(1)}px at ${type.w} wide`);

  const ana = await join(pin, 'Ana'), bo = await join(pin, 'Bo');
  await lab.locator('[data-testid=player-count]').filter({ hasText: '2 players in' }).waitFor({ timeout: 10000 });
  assert.deepEqual((await lab.locator('.lobby-list li').allTextContents()).sort(), ['Ana', 'Bo']);
  step('the phones appear in the lobby as they join');

  await toQuestion();
  const askedAt = Date.now();
  const q = await ana.next('question');
  assert.equal(q.options.length, 4);
  assert.equal(q.options.indexOf(RIGHT), 2);
  assert.equal(q.timeLimit, 6, 'the phones are given the clock');
  await bo.next('question');
  assert.equal(await lab.locator('[data-testid=answered]').textContent(), '0 of 2 answered');
  assert.match(await lab.locator('[data-testid=timer]').textContent(), /^[1-6]s$/, 'the clock is on the wall');
  assert.equal(await lab.locator('[data-testid=rail-row]').count(), 2, 'the standings rail is beside the slide');
  const stage = await lab.locator('.show-stage').evaluate((e) => { const r = e.getBoundingClientRect(); return { right: r.right, vw: innerWidth }; });
  assert.ok(stage.right <= stage.vw * (1 - 420 / 1920) + 2, 'the slide leaves the rail its room');
  step('the question is asked: 0 of 2 answered, the clock counting down, the standings rail beside the slide');

  ana.send({ t: 'answer', choice: q.options.indexOf(RIGHT) });
  await lab.locator('[data-testid=answered]').filter({ hasText: '1 of 2 answered' }).waitFor({ timeout: 5000 });
  if (Date.now() - askedAt < 1100) {
    await next();
    await page.waitForTimeout(300);
    assert.equal(await view(), 'question', 'a Next inside the grace does not reveal');
    step('a Next inside the grace is swallowed (the answer is not shown early)');
  }

  // ---- nobody presses Next: the clock runs out into the reveal
  await lab.locator('.wall-layer[data-view=reveal]').waitFor({ timeout: 15000 });
  const took = Date.now() - askedAt;
  assert.ok(took >= 5000 && took < 12000, `the reveal came from the clock (${took} ms after the question)`);
  const tally = await lab.locator('[data-testid^=tally-]').evaluateAll((els) => els.map((e) => ({ right: e.classList.contains('right'), text: e.textContent })));
  assert.deepEqual(tally.map((t) => t.right), [false, false, true, false], 'the right option is marked');
  assert.match(tally[2].text, /Monday after.*1$/, 'one vote for it');
  assert.match(await lab.locator('[data-testid=reveal-said]').textContent(), /Answer: The Monday after the lab, by 23:59\. 1 of 1 got it right/);
  assert.equal((await ana.next('result')).right, true);
  assert.equal((await bo.next('result')).right, false, 'a phone that did not answer is told it missed');
  const gain = await lab.locator('[data-testid=rail-gain]').allTextContents();
  assert.equal(gain.length, 1, 'the rail shows what the one right answer gained');
  assert.match(gain[0], /^\+\d+$/);
  step(`time up: the clock ran out into the reveal (${took} ms), tally per option, the right one marked, "${gain[0]}" on the rail, the phones told`);

  // ---- on to the scores
  for (let i = 0; i < 120 && (await view()) !== 'leaderboard'; i++) { await next(); await page.waitForTimeout(250); }
  assert.equal(await view(), 'leaderboard');
  const rows = await lab.locator('[data-testid=board-row]').evaluateAll((els) => els.map((e) => [...e.children].map((c) => c.textContent)));
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0].slice(0, 2), ['1', 'Ana']);
  assert.ok(Number(rows[0][2]) > 0, 'Ana has points');
  assert.deepEqual(rows[1], ['2', 'Bo', '0']);
  step(`leaderboard: Ana ${rows[0][2]}, Bo 0`);

  // ---- reactions (classic's): on a plain slide after the game, a phone's clap rises over the foot of the slide, and is gone
  for (let i = 0; i < 40 && (await view()) !== 'slide'; i++) { await next(); await page.waitForTimeout(250); }
  assert.equal(await view(), 'slide', 'the lesson goes on to a plain slide after its game');
  await page.waitForTimeout(300);
  bo.send({ t: 'react', kind: 'clap' });
  await lab.locator('.show-reactbay .show-reaction').filter({ hasText: '👏' }).waitFor({ timeout: 5000 });
  await lab.locator('.show-reaction').waitFor({ state: 'detached', timeout: 6000 });
  step('reactions: a phone\'s clap rises over the foot of the slide on the wall, and is gone');

  // ---- the end: Next past the last step ends the room; the final standings stay up
  for (let i = 0; i < 120 && (await lab.locator('[data-testid=ended]').count()) === 0; i++) { await next(); await page.waitForTimeout(250); }
  await lab.locator('[data-testid=ended] h2').filter({ hasText: 'The room has ended' }).waitFor({ timeout: 8000 });
  const finalRows = await lab.locator('[data-testid=final-row]').evaluateAll((els) => els.map((e) => [...e.children].map((c) => c.textContent)));
  assert.deepEqual(finalRows.map((r) => r[1]), ['Ana', 'Bo']);
  assert.ok(await ana.next('over'), 'ending the room told the phone it is over');
  const late = await harness.connect(port);
  late.send({ t: 'join', pin, name: 'Late' });
  assert.match((await late.next('error')).message, /No quiz found/, 'the PIN no longer opens a room');
  await late.close();
  step('the room ended: the final standings stay up; the phones are told; the PIN is closed');

  await lab.getByRole('button', { name: 'Open in Reports' }).click();
  const reports = page.locator('dialog.reports-modal[open]');
  await reports.waitFor({ timeout: 8000 });
  await reports.getByText(/from 2 people across 1 revealed check/).waitFor({ timeout: 10000 });
  step('Open in Reports: the shell\'s Reports opens on this session: 1 marked answer from 2 people');
  await page.keyboard.press('Escape');
  await reports.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {});

  await lab.getByRole('button', { name: 'Back to the lesson' }).click();
  await lab.locator('.show').waitFor({ state: 'detached', timeout: 5000 });
  const back = await page.evaluate(() => ({ shown: document.documentElement.classList.contains('lab-show'), h: document.getElementById('labFrame').getBoundingClientRect().height, vh: innerHeight }));
  assert.equal(back.shown, false);
  assert.ok(back.h < back.vh - 20, 'the shell\'s own rows are back around the frame');
  step('Back to the lesson: the show closes and the shell\'s chrome is back');

  // ======================================================== room 2: teacher entry
  await goto.fill('38');
  await goto.press('Enter');
  await hostLive();
  await lab.locator('[data-testid=pin]').waitFor({ timeout: 30000 });
  const pin2 = (await lab.locator('[data-testid=pin]').textContent()).trim();
  assert.notEqual(pin2, pin);
  const cy = await join(pin2, 'Cy');
  await page.mouse.move(900, 900); // wakes the show's bar
  await lab.getByRole('button', { name: 'More controls' }).click(); // Teacher entry is in the bar's More menu
  const [entry] = await Promise.all([page.context().waitForEvent('page'), lab.getByRole('menuitem', { name: /Teacher entry/ }).click()]);
  await entry.waitForLoadState('domcontentloaded');
  assert.match(entry.url(), /\/manual\.html#[a-f0-9]{32}$/, 'manual.html opens with the room\'s key');
  await entry.locator('#addNames summary').click();
  await entry.locator('#names').fill('Dee');
  await entry.locator('#add').click();
  await lab.locator('[data-testid=player-count]').filter({ hasText: '2 players in' }).waitFor({ timeout: 10000 });
  assert.deepEqual((await lab.locator('.lobby-list li').allTextContents()).sort(), ['Cy', 'Dee']);
  step('Teacher entry opens manual.html#<key>; the learner added there is in the lobby');

  await toQuestion();
  const q2 = await cy.next('question');
  assert.equal(q2.timeLimit, 0, 'no clock while the teacher enters answers');
  assert.equal(await lab.locator('[data-testid=timer]').count(), 0, 'and none on the wall');
  await entry.getByRole('tab', { name: 'Live answers' }).click();
  await entry.locator('#entries').waitFor({ timeout: 10000 });
  await entry.keyboard.press('c');
  await lab.locator('[data-testid=answered]').filter({ hasText: '1 of 2 answered' }).waitFor({ timeout: 8000 });
  cy.send({ t: 'answer', choice: q2.options.indexOf(RIGHT) });
  await lab.locator('[data-testid=answered]').filter({ hasText: '2 of 2 answered' }).waitFor({ timeout: 5000 });
  step('"Live answers" and the C key in manual.html record the learner\'s answer: 2 of 2 answered, no clock');
  await page.waitForTimeout(1700);
  await next();
  await lab.locator('.wall-layer[data-view=reveal]').waitFor({ timeout: 5000 });
  const marks = await lab.locator('[data-testid^=tally-]').evaluateAll((els) => els.map((e) => e.textContent));
  assert.match(marks[2], /Monday after.*2$/, 'both answers were C');
  step('Next reveals: the entered answer counts with the phone\'s');
  await entry.close();

  await lab.locator('body').press('Escape'); // End: the room ends, the standings stay
  await lab.locator('[data-testid=ended]').waitFor({ timeout: 8000 });
  await lab.getByRole('button', { name: 'Back to the lesson' }).click();
  await lab.locator('.show').waitFor({ state: 'detached', timeout: 5000 });
  step('Esc ends the room and Back returns to the editor');

  // ======================================================== the safety net: a relay that is not there
  await page.evaluate(() => { window.__toasts = []; const t = document.getElementById('toast'); new MutationObserver(() => window.__toasts.push(t.textContent)).observe(t, { childList: true, characterData: true, subtree: true }); });
  await harness.stop(relay); // the relay is gone: the page is loaded, and the room cannot open
  await goto.fill('38');
  await goto.press('Enter');
  await hostLive();
  await lab.locator('.show').waitFor({ timeout: 10000 });
  await page.waitForFunction(() => !document.documentElement.classList.contains('lab-show'), null, { timeout: 20000 });
  assert.equal(await lab.locator('.show').count(), 0, 'the studio\'s show closed');
  const toasts = await page.evaluate(() => window.__toasts);
  assert.ok(toasts.some((t) => /did not answer, so the room could not open/.test(t)), `the toast says why (${JSON.stringify(toasts)})`);
  assert.equal(await page.evaluate(() => !!(window.SF.Live && SF.Live.active) || !!(window.SF.Player && SF.Player.open)), false, 'no classic room or player starts');
  step('no relay: a relay that never answers closes the show and says why; nothing else starts');

  assert.deepEqual(errors, [], 'no page errors');
  console.log('studio-room: ok');
} finally {
  await Promise.all(phones.map((p) => p.close().catch(() => {})));
  await browser.close();
  await harness.stop(relay).catch(() => {});
  fs.rmSync(dir, { recursive: true, force: true });
}
