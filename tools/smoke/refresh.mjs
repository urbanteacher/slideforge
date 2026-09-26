#!/usr/bin/env node
/* Real browser regression for item 20: reload the wall, the live host and phones.
   The deck is built and run directly (SF.Player, SF.Live), since the show and
   the room are what reloads; the lab builds its own shows the same way. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import harness from '../../tests/harness.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-refresh-'));
const port = await harness.freePort();
const relay = await harness.start(port, dir);
const browser = await chromium.launch({ headless: true });
const base = `http://127.0.0.1:${port}`;
const errors = [];
try {
  const context = await browser.newContext();
  const host = await context.newPage();
  host.on('pageerror', e => errors.push(e.message));
  await host.goto(base);
  await host.waitForFunction(() => window.SF?.Player && SF.Shell?.current()?.doc()?.id, null, { timeout: 60000 });
  // The classic editor's selection restore went with the classic studios; the lab keeps its own slide.
  const deckId = await host.evaluate(() => {
    const d = SF.makeDeck('Refresh regression');
    const g = SF.makeGame('Embedded check', 'choice');
    g.settings.defaultTime = 0;
    SF.GameStore.save(g);
    const embed = SF.makeSlide('game'); embed.gameId = g.id;
    d.slides = [SF.makeSlide('title'), SF.makeSlide('content'), embed, SF.makeSlide('content')];
    SF.Store.save(d);
    return d.id;
  });
  const runDeck = (id) => SF.buildRunDeck(SF.Store.get(id), (g) => SF.GameStore.get(g));

  await host.evaluate(`SF.Player.start((${runDeck})(${JSON.stringify(deckId)}), 0, { fullscreen: false })`);
  await host.evaluate(() => SF.Player.goTo(2));
  const wall = await host.evaluate(() => ({ id: SF.Player.deck.slides[SF.Player.idx].id, index: SF.Player.idx }));
  await host.reload();
  assert.deepEqual(await host.evaluate(() => ({ id: SF.Player.deck.slides[SF.Player.idx].id, index: SF.Player.idx })), wall);
  assert.equal(await host.evaluate(() => SF.Player.open), true);
  await host.evaluate(() => SF.Player.close());
  await host.reload();
  assert.equal(await host.evaluate(() => SF.Player.open), false);
  console.log('✓ Compiled presentation and position survive; explicit exit stays exited');

  await host.evaluate(`SF.Live.host((${runDeck})(${JSON.stringify(deckId)}))`);
  await host.waitForFunction(() => SF.Live.pin);
  const pin = await host.evaluate(() => SF.Live.pin);
  const phone = await context.newPage();
  phone.on('pageerror', e => errors.push(e.message));
  await phone.goto(base + '/join.html');
  await phone.locator('#pin').fill(pin);
  await phone.locator('#name').fill('Reload Learner');
  await phone.locator('#joinBtn').click();
  await phone.waitForSelector('#scWait.on');
  const identity = await phone.evaluate(pin => sessionStorage.getItem('slideforge.resume.' + pin), pin);
  await phone.reload();
  await phone.waitForSelector('#scWait.on');
  assert.equal(await phone.evaluate(pin => sessionStorage.getItem('slideforge.resume.' + pin), pin), identity);
  await host.waitForFunction(() => SF.Live.players.length === 1 && SF.Live.players[0].connected);
  await host.evaluate(() => SF.Live.begin());
  await host.evaluate(() => SF.Player.goTo(SF.Player.deck.slides.length - 1));
  const liveWall = await host.evaluate(() => ({ id: SF.Player.deck.slides[SF.Player.idx].id, index: SF.Player.idx }));
  await host.reload();
  await host.waitForFunction(() => SF.Live.active && SF.Live.pin);
  assert.equal(await host.evaluate(() => SF.Live.pin), pin);
  assert.deepEqual(await host.evaluate(() => ({ id: SF.Player.deck.slides[SF.Player.idx].id, index: SF.Player.idx })), liveWall);
  assert.equal(await host.evaluate(() => SF.Player.open && !!SF.Player.gate), true);
  await phone.reload();
  await phone.waitForFunction(() => !document.querySelector('#scJoin').classList.contains('on'));
  await host.waitForFunction(() => SF.Live.players.length === 1 && SF.Live.players[0].connected);
  console.log('✓ Typed-PIN learner rejoins the same seat; live host returns to the same slide and PIN');

  await host.evaluate(() => SF.Player.goTo(SF.Player.deck.slides.findIndex(s => s.type === 'quiz')));
  await phone.waitForSelector('#scQuestion.on');
  await phone.locator('#qPad button').first().click();
  await host.waitForFunction(() => SF.Live.snapshot && SF.Live.snapshot.answers.length === 1);
  const quizId = await host.evaluate(() => SF.Player.deck.slides[SF.Player.idx].id);
  await host.reload();
  await host.waitForFunction(() => SF.Live.active);
  assert.equal(await host.evaluate(() => SF.Player.deck.slides[SF.Player.idx].id), quizId);
  await phone.reload();
  await phone.waitForSelector('#scQuestion.on');
  await host.waitForFunction(() => SF.Live.snapshot && SF.Live.snapshot.answers.length === 1);
  await host.evaluate(() => SF.Player.next());
  await phone.waitForSelector('#scResult.on');
  console.log('✓ Reload during a question preserves the submitted answer and teacher reveal');

  await phone.goto(base + '/join.html?pin=' + pin);
  await phone.waitForFunction(() => !document.querySelector('#scJoin').classList.contains('on'));
  const fresh = await context.newPage();
  await fresh.goto(base + '/join.html?pin=' + pin);
  assert.equal(await fresh.locator('#name').inputValue(), '');
  assert.equal(await fresh.locator('#scJoin').evaluate(e => e.classList.contains('on')), true);
  await fresh.goto(base + '/join.html?pin=000000');
  assert.equal(await fresh.locator('#name').inputValue(), '');
  console.log('✓ QR reload rejoins; a fresh tab or different PIN requires a new join');

  await host.evaluate(() => SF.Player.close());
  await phone.waitForSelector('#scOver.on');
  await phone.reload();
  assert.equal(await phone.locator('#scJoin').evaluate(e => e.classList.contains('on')), true);
  assert.equal(await phone.evaluate(pin => sessionStorage.getItem('slideforge.resume.' + pin), pin), null);
  assert.deepEqual(errors, []);
  console.log('✓ Ended rooms do not auto-rejoin; no browser errors');
} finally {
  await browser.close();
  await harness.stop(relay);
  fs.rmSync(dir, { recursive: true, force: true });
}
