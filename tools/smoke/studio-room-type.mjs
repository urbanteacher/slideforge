#!/usr/bin/env node
/* Host live from a Type answer lesson, on the REAL path (lab-engine-plan M8: Type answer), end to end in a browser:
 * the real relay (tests/harness.js, a free port, never 8787), the page opened with no flag, and a lab deck made here
 * with the studio's own Browse (Quiz studio -> Type answer -> Add to the lesson: the real game slides, three
 * questions). Two raw-socket phones (join.html's side), one typing the right answer in another case, with an article
 * and a stray mark, one typing a wrong one:
 *
 *   route      the shell's Host live opens the studio's show and room, not SlideForge's own
 *   question   the phones are sent input `text`, no options, the style `type`; the wall counts answers and shows none of them
 *   reveal     Next (after the grace) reveals: the typed answers as groups, the right one marked and written as the question
 *              accepts it; the accepted answer said; right and wrong told to the phones
 *   scores     the relay's scores: the right phone has points, the wrong one none; the rail shows the gain
 *   ranking    a lesson that also has Ranking challenge is hosted by the studio too (the room runs Ranking)
 *
 * Needs lab-app/ built (npm --prefix lab run build:app). */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import harness from '../../tests/harness.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-studio-room-type-'));
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

  // ---- a lab deck with a Type answer game, made the way a teacher makes one: from Browse in the Quiz studio
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
  await addGame('Type answer', /^Type answer/);
  const deck = await page.evaluate(() => SF.Shell.current().doc().slides.filter((s) => s.game).map((s) => ({ format: s.game.format, role: s.game.role, input: s.game.quiz?.input, accept: s.game.quiz?.accept, answer: s.game.quiz?.answer, seconds: s.game.settings?.seconds })));
  assert.ok(deck.length >= 7 && deck.every((s) => s.format === 'type'), 'the Type answer game: ' + JSON.stringify(deck.map((s) => s.format)));
  const first = deck.find((s) => s.role === 'question');
  assert.equal(first.input, 'text');
  assert.ok(first.accept.length >= 1 && first.answer, 'the question has its accepted answers');
  const spelled = String(first.accept[0]);
  const typedRight = ` The ${spelled.toUpperCase()}! `; // another case, a leading article and a stray mark: still the answer
  step(`a lab deck with the Type answer game (${deck.filter((s) => s.role === 'question').length} questions, first accepts ${JSON.stringify(first.accept)})`);

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
  step('Host live (the shell\'s button) opened the studio\'s show and room for a Type answer lesson; the classic room did not start');

  const pin = (await lab.locator('[data-testid=pin]').textContent()).trim();
  const ana = await join(pin, 'Ana'), bo = await join(pin, 'Bo');
  await lab.locator('[data-testid=player-count]').filter({ hasText: '2 players in' }).waitFor({ timeout: 10000 });

  await lab.getByRole('button', { name: 'Start' }).click();
  await lab.locator('.wall-layer[data-view=slide], .wall-layer[data-view=question]').waitFor({ timeout: 10000 });
  for (let i = 0; i < 40 && (await view()) !== 'question'; i++) { await next(); await page.waitForTimeout(250); }
  assert.equal(await view(), 'question', 'Next reaches the first question');
  const askedAt = Date.now();
  const q = await ana.next('question');
  await bo.next('question');
  assert.equal(q.input, 'text', 'the phone shows its text box from the text input, as join.html already does');
  assert.deepEqual(q.options, [], 'a typed question has no options');
  assert.equal(q.style, 'type');
  assert.equal(q.total, 3);
  assert.equal(await lab.locator('[data-testid=answered]').textContent(), '0 of 2 answered');
  step('the question is asked: input text, no options, style type, 0 of 2 answered');

  ana.send({ t: 'answer', text: typedRight });
  bo.send({ t: 'answer', text: 'zzz not it' });
  await lab.locator('[data-testid=answered]').filter({ hasText: '2 of 2 answered' }).waitFor({ timeout: 5000 });
  assert.equal(await lab.locator('[data-testid^=typed-]').count(), 0, 'what the room typed is not on the wall while the question is open');
  // Everyone is in and nobody is entered by hand: the room reveals by itself (classic's auto-reveal), or Next does it.
  if (Date.now() - askedAt < 1700) await page.waitForTimeout(1700 - (Date.now() - askedAt));
  if ((await view()) !== 'reveal') await next();
  await lab.locator('.wall-layer[data-view=reveal]').waitFor({ timeout: 8000 });
  const groups = await lab.locator('[data-testid^=typed-]').evaluateAll((els) => els.map((e) => ({ right: e.classList.contains('right'), text: e.textContent })));
  assert.equal(groups.length, 2, 'two different answers, two groups: ' + JSON.stringify(groups));
  assert.deepEqual(groups.map((g) => g.right).sort(), [false, true], 'the right one is marked');
  const rightGroup = groups.find((g) => g.right);
  assert.ok(rightGroup.text.includes(spelled) && rightGroup.text.endsWith('1'), 'the right group reads as the question accepts it (not as it was typed): ' + rightGroup.text);
  assert.ok(groups.find((g) => !g.right).text.includes('zzz not it'));
  assert.match(await lab.locator('[data-testid=reveal-said]').textContent(), new RegExp(`Answer: ${first.answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\. 1 of 2 got it right`));
  const rr = await ana.next('result'), wr = await bo.next('result');
  assert.equal(rr.right, true, 'Ana, typing it another way, is right');
  assert.equal(wr.right, false);
  assert.equal(rr.answer, first.answer, 'the phone is told the accepted answer');
  const gain = await lab.locator('[data-testid=rail-gain]').allTextContents();
  assert.equal(gain.length, 1, 'the rail shows what the one right answer gained');
  step(`reveal: two groups, "${spelled}" marked right (typed as ${JSON.stringify(typedRight)}); Ana told right, Bo wrong; "${gain[0]}" on the rail`);

  // ---- the other questions, nobody answering: the clock (or Next) reveals, and the scores follow
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

  // ======================================================== Ranking is the studio's too (its own style in the room's registry, fd5ca03)
  await addGame('ranking', /^Ranking challenge/);
  const formats = await page.evaluate(() => [...new Set(SF.Shell.current().doc().slides.filter((s) => s.game).map((s) => s.game.format))]);
  assert.deepEqual(formats.sort(), ['ranking', 'type']);
  await hostLive();
  await lab.locator('[data-testid=pin]').waitFor({ timeout: 30000 });
  const both = await page.evaluate(() => ({ shown: document.documentElement.classList.contains('lab-show'), classic: !!SF.Live?.active || !!document.querySelector('#joincard.on, #lobby.on') }));
  assert.deepEqual(both, { shown: true, classic: false }, 'a lesson with Type answer and Ranking is hosted by the studio');
  step('a lesson that also has Ranking challenge is hosted by the studio too; the classic room did not start');
  await lab.locator('body').press('Escape');
  await lab.locator('.show').waitFor({ state: 'detached', timeout: 8000 }).catch(async () => {
    await lab.getByRole('button', { name: 'Back to the lesson' }).click();
    await lab.locator('.show').waitFor({ state: 'detached', timeout: 5000 });
  });

  assert.deepEqual(errors, [], 'no page errors');
  console.log('studio-room-type: ok');
} finally {
  await Promise.all(phones.map((p) => p.close().catch(() => {})));
  await browser.close();
  await harness.stop(relay).catch(() => {});
  fs.rmSync(dir, { recursive: true, force: true });
}
