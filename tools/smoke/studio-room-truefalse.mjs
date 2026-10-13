#!/usr/bin/env node
/* Host live from a plain True or false lesson, on the REAL path (lab-engine-plan M8: True or false), end to end in a
 * browser: the real relay (tests/harness.js, a free port, never 8787), the page opened with no flag, and a lab deck
 * made here with the studio's own Browse (Quiz studio -> True or false -> Add to the lesson: the real game slides,
 * three statements). Two raw-socket phones (join.html's side), one right and one wrong:
 *
 *   route      the shell's Host live opens the studio's show and room, not SlideForge's
 *   question   the phones are sent two options, True and False, the style `truefalse`, input `choice`; the wall counts answers
 *   reveal     Next (after the grace) reveals: the two votes as tiles, the right one marked; right and wrong told to the phones
 *   scores     the relay's scores: the right phone has points, the wrong one none; the rail shows the gain
 *   showdown   a lesson that also has the True / false showdown is not routed: the classic Host live opens instead
 *
 * Needs lab-app/ built (npm --prefix lab run build:app). */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import harness from '../../tests/harness.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-studio-room-tf-'));
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
  const lab = page.frames().find((f) => f.url().includes('/lab-app/'));
  assert.ok(lab, 'the lab is the shell\'s frame');

  // ---- a lab deck with a True or false game, made the way a teacher makes one: from Browse in the Quiz studio
  const addGame = async (find, card) => {
    await page.evaluate(() => SF.Shell.activate('game'));
    await page.waitForFunction(() => SF.Shell.current().key === 'game' && SF.Shell.current().lab);
    await lab.getByLabel('Find a game').waitFor({ timeout: 30000 });
    await lab.getByLabel('Find a game').fill(find);
    await lab.locator('.browse-card-head').filter({ hasText: card }).first().click();
    await lab.getByRole('button', { name: 'Add to the lesson' }).click();
    await page.waitForTimeout(2000);
    await page.evaluate(() => SF.Shell.activate('deck'));
    await page.waitForFunction(() => SF.Shell.current().key === 'deck' && SF.Shell.current().lab);
  };
  await addGame('True or false', /^True or false/);
  const deck = await page.evaluate(() => SF.Shell.current().doc().slides.filter((s) => s.game).map((s) => ({ format: s.game.format, role: s.game.role, correct: s.game.quiz?.correct, options: s.game.quiz?.options, seconds: s.game.settings?.seconds })));
  assert.ok(deck.length >= 7 && deck.every((s) => s.format === 'truefalse'), 'the plain True or false game, not the showdown: ' + JSON.stringify(deck.map((s) => s.format)));
  const first = deck.find((s) => s.role === 'question');
  assert.deepEqual(first.options, ['True', 'False']);
  step(`a lab deck with the True or false game (${deck.filter((s) => s.role === 'question').length} statements, first answer ${first.options[first.correct]})`);

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

  // ======================================================== the room
  await hostLive();
  await lab.locator('[data-testid=pin]').waitFor({ timeout: 30000 });
  const mode = await page.evaluate(() => ({ shown: document.documentElement.classList.contains('lab-show'), classic: !!SF.Live?.active || !!document.querySelector('#joincard.on, #lobby.on') }));
  assert.equal(mode.shown, true);
  assert.equal(mode.classic, false, 'SlideForge\'s own room did not start');
  step('Host live (the shell\'s button) opened the studio\'s show and room for a True or false lesson; the classic room did not start');

  const pin = (await lab.locator('[data-testid=pin]').textContent()).trim();
  const ana = await join(pin, 'Ana'), bo = await join(pin, 'Bo');
  await lab.locator('[data-testid=player-count]').filter({ hasText: '2 players in' }).waitFor({ timeout: 10000 });

  await lab.getByRole('button', { name: 'Start' }).click();
  await lab.locator('.wall-layer[data-view=slide], .wall-layer[data-view=question]').waitFor({ timeout: 10000 });
  for (let i = 0; i < 40 && (await view()) !== 'question'; i++) { await next(); await page.waitForTimeout(250); }
  assert.equal(await view(), 'question', 'Next reaches the first statement');
  const askedAt = Date.now();
  const q = await ana.next('question');
  await bo.next('question');
  assert.deepEqual(q.options, ['True', 'False'], 'the phones are sent two options: True and False');
  assert.equal(q.style, 'truefalse');
  assert.equal(q.input, 'choice', 'the phone shows its two big buttons from the choice input, as join.html already does');
  assert.equal(q.total, 3);
  assert.equal(await lab.locator('[data-testid=answered]').textContent(), '0 of 2 answered');
  step('the statement is asked: two options, style truefalse, input choice, 0 of 2 answered');

  const right = first.correct, wrong = 1 - first.correct;
  ana.send({ t: 'answer', choice: right });
  bo.send({ t: 'answer', choice: wrong });
  await lab.locator('[data-testid=answered]').filter({ hasText: '2 of 2 answered' }).waitFor({ timeout: 5000 });
  // Everyone is in and nobody is entered by hand: the room reveals by itself (classic's auto-reveal), or Next does it.
  if (Date.now() - askedAt < 1700) await page.waitForTimeout(1700 - (Date.now() - askedAt));
  if ((await view()) !== 'reveal') await next();
  await lab.locator('.wall-layer[data-view=reveal]').waitFor({ timeout: 8000 });
  assert.equal(await lab.locator('[data-testid=tally].tally-pair').count(), 1, 'True and False are drawn as two tiles');
  const tally = await lab.locator('[data-testid^=tally-]').evaluateAll((els) => els.map((e) => ({ right: e.classList.contains('right'), text: e.textContent })));
  assert.equal(tally.length, 2);
  assert.deepEqual(tally.map((t) => t.right), [right === 0, right === 1], 'the right tile is marked');
  assert.match(tally[0].text, /True.*1$/);
  assert.match(tally[1].text, /False.*1$/);
  assert.match(await lab.locator('[data-testid=reveal-said]').textContent(), new RegExp(`Answer: ${first.options[right]}\\. 1 of 2 got it right`));
  assert.equal((await ana.next('result')).right, true);
  assert.equal((await bo.next('result')).right, false);
  const gain = await lab.locator('[data-testid=rail-gain]').allTextContents();
  assert.equal(gain.length, 1, 'the rail shows what the one right answer gained');
  step(`reveal: two tiles, one vote each, ${first.options[right]} marked right; Ana told right, Bo wrong; "${gain[0]}" on the rail`);

  // ---- the other two statements, nobody answering: the clock (or Next) reveals, and the scores follow
  for (let i = 0; i < 160 && (await view()) !== 'leaderboard'; i++) {
    if ((await view()) === 'question') { await page.waitForTimeout(1700); }
    await next();
    await page.waitForTimeout(250);
  }
  assert.equal(await view(), 'leaderboard');
  const rows = await lab.locator('[data-testid=board-row]').evaluateAll((els) => els.map((e) => [...e.children].map((c) => c.textContent)));
  assert.deepEqual(rows[0].slice(0, 2), ['1', 'Ana']);
  assert.ok(Number(rows[0][2]) > 0, 'Ana has points');
  assert.deepEqual(rows[1], ['2', 'Bo', '0']);
  step(`scores: Ana ${rows[0][2]}, Bo 0 (the relay marked the verdicts the host sent)`);

  await lab.locator('body').press('Escape');
  await lab.locator('[data-testid=ended]').waitFor({ timeout: 8000 });
  await lab.getByRole('button', { name: 'Back to the lesson' }).click();
  await lab.locator('.show').waitFor({ state: 'detached', timeout: 5000 });
  step('Esc ends the room and Back returns to the editor');

  // ======================================================== the Showdown is the classic host's
  await addGame('showdown', /^True \/ false showdown/);
  const formats = await page.evaluate(() => [...new Set(SF.Shell.current().doc().slides.filter((s) => s.game).map((s) => s.game.format))]);
  assert.deepEqual(formats.sort(), ['true-false', 'truefalse']);
  await page.evaluate(() => { window.__toasts = []; const t = document.getElementById('toast'); new MutationObserver(() => window.__toasts.push(t.textContent)).observe(t, { childList: true, characterData: true, subtree: true }); });
  await hostLive();
  await page.waitForFunction(() => !!document.querySelector('#joincard.on, #lobby.on') || !!SF.Live?.active || (window.__toasts || []).some((t) => /Preparing the show/.test(t)), null, { timeout: 60000 });
  assert.equal(await lab.locator('.show').count(), 0, 'the studio\'s show did not open for a lesson with the Showdown in it');
  assert.equal(await page.evaluate(() => document.documentElement.classList.contains('lab-show')), false);
  step('a lesson that also has the True / false showdown is not routed: the classic Host live starts');
  await page.evaluate(() => { try { SF.Live.stop(); } catch (e) { /* the classic room may still be preparing */ } });

  assert.deepEqual(errors, [], 'no page errors');
  console.log('studio-room-truefalse: ok');
} finally {
  await Promise.all(phones.map((p) => p.close().catch(() => {})));
  await browser.close();
  await harness.stop(relay).catch(() => {});
  fs.rmSync(dir, { recursive: true, force: true });
}
