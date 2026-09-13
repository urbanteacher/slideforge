#!/usr/bin/env node
/* What the desk shows about the poll it is running.
 *
 * Every kind of quick poll, launched from the desk, checked for the thing
 * that was missing: the answers on offer. The desk was told the question and
 * how many had replied, but never what they were choosing between — so a
 * teacher running "1 to 5" from the desk could watch eleven votes arrive
 * without being able to see which end was "rarely" and which was "extremely".
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import harness from '../tests/harness.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-desk-poll-'));
const port = await harness.freePort();
const relay = await harness.start(port, dir);
const browser = await chromium.launch({ headless: true });
const players = [];
try {
  const wall = await browser.newPage({ viewport: { width: 1280, height: 820 } });
  const errors = [];
  wall.on('pageerror', (e) => errors.push('wall: ' + e.message));
  await wall.goto(`http://127.0.0.1:${port}/?lesson=ipdv-intro`);
  await wall.waitForFunction(() => window.SF?.Editor?.deck());

  await wall.locator('#btnLive').click();
  await wall.waitForSelector('#lobby.on');
  await wall.waitForFunction(() => /^\d{4,6}$/.test((document.getElementById('lobbyPin')?.textContent || '').trim()));
  const pin = (await wall.locator('#lobbyPin').innerText()).trim();
  for (const name of ['Amara', 'Bo']) {
    const p = await harness.connect(port);
    p.send({ t: 'join', pin, name });
    players.push(p);
  }
  await wall.waitForFunction(() => (SF.Live.players || []).length === 2);

  const [desk] = await Promise.all([
    wall.context().waitForEvent('page'),
    wall.locator('#lobbyStart').click()
  ]);
  desk.on('pageerror', (e) => errors.push('desk: ' + e.message));
  await desk.waitForLoadState();
  await desk.waitForSelector('#boxNow .slide');
  await desk.locator('[data-panel=quick]').click();

  const chips = () => desk.evaluate(() =>
    [...document.querySelectorAll('#pollChoices li')].map((n) => n.textContent));

  async function ask(preset, question, expected) {
    await desk.locator(`[data-poll=${preset}]`).click();
    await desk.locator('#pollPrompt').fill(question);
    await desk.locator('#pollLaunch').click();
    await wall.waitForFunction(() => !!(SF.Live.customPromptOpen && SF.Live.customPromptOpen()));
    await desk.waitForFunction(
      (q) => (document.getElementById('pollState') || {}).textContent === q, question);

    assert.deepEqual(await chips(), expected, `${preset}: the desk lists the answers on offer`);

    /* Whatever the desk lists has to be what the room is actually offered. */
    const onWall = await wall.evaluate(() => (SF.Live.prompt.options || []).slice());
    if (preset !== 'wordcloud') {
      assert.equal(onWall.length, expected.length,
        `${preset}: one chip per option the room has`);
    } else {
      assert.equal(onWall.length, 0, 'a word cloud offers no fixed options');
    }

    await desk.locator('#pollEnd').click();
    await wall.waitForFunction(() => !(SF.Live.customPromptOpen && SF.Live.customPromptOpen()));
    await desk.waitForFunction(() => document.getElementById('pollChoices').hidden);
    await desk.locator('#pollPrompt').fill('');
  }

  await ask('yesno', 'Shall we do another example, or move on?', ['Yes', 'No']);
  await ask('truefalse', 'A pie chart can show change over time.', ['True', 'False']);
  await ask('abcd', 'Which encoding is most accurate?', ['A', 'B', 'C', 'D']);
  /* The one the whole thing is for: a bare 1..5 is meaningless without the
     two words that say which end is which. */
  await ask('scale', 'How often do you read the axis first?',
    ['1 · Not at all', '2', '3', '4', '5 · Completely']);
  await ask('wordcloud', 'One word: how was that?', ['Open replies — the room types']);

  /* Custom answers typed into the box, not a preset — the ordinary case. */
  await desk.locator('[data-poll=yesno]').click();
  await desk.locator('#pollPrompt').fill('Which did you find hardest?');
  await desk.locator('#pollOptions').fill('Anscombe\nColour\nThe 4Ps');
  await desk.locator('#pollLaunch').click();
  await wall.waitForFunction(() => !!(SF.Live.customPromptOpen && SF.Live.customPromptOpen()));
  await desk.waitForFunction(() => document.querySelectorAll('#pollChoices li').length === 3);
  assert.deepEqual(await chips(), ['Anscombe', 'Colour', 'The 4Ps'],
    'typed answers reach the desk, not just the presets');
  await desk.locator('#pollEnd').click();

  assert.deepEqual(errors, [], 'no page errors');
  console.log('PASS: the desk shows the answers on offer — yes/no, true/false, A-D, 1-5 with both ends named, word cloud, and typed answers');
} finally {
  players.forEach((p) => { try { p.socket.close(); } catch (e) {} });
  await browser.close();
  await harness.stop(relay);
  fs.rmSync(dir, { recursive: true, force: true });
}
