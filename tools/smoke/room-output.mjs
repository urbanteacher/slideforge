#!/usr/bin/env node
/* Real browser check for the activities audit's wave 2: what the room sends
 * lands. A host and two phones, on their own relay:
 *   - Think: a phone writes a private note; the wall and desk count it, and
 *     the words never leave the phone.
 *   - Share: two ideas arrive; the desk spotlights one (on the wall, without
 *     a name) and hides the other; the spotlight is still up at Connect.
 *   - A held self-assessment: the wall shows how many are in, not the split,
 *     until the desk shows it; then the desk closes it. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import harness from '../../tests/harness.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-room-output-'));
const port = await harness.freePort();
const relay = await harness.start(port, dir);
const browser = await chromium.launch({ headless: true });
const base = `http://127.0.0.1:${port}`;
const shots = process.env.SF_SHOTS || '';
const errors = [];
try {
  const context = await browser.newContext();
  const host = await context.newPage({ viewport: { width: 1600, height: 900 } });
  host.on('pageerror', e => errors.push('host: ' + e.message));
  await host.goto(base);
  await host.waitForFunction(() => window.SF?.Editor?.deck() && SF.Activities);
  await host.evaluate(() => {
    const d = SF.makeDeck('Room output');
    const tps = SF.Activities.makeSlides(SF.Activities.activity('think-pair-share'))[0];
    const held = SF.Activities.makeSlides(SF.Activities.activity('structured-reflection-protocol'))[0];
    d.slides = [tps, held].map(s => Object.assign(s, { transition: 'none' }));
    SF.Store.save(d); SF.Editor.openDeck(d.id);
  });
  await host.evaluate(() => SF.Editor.workspace.hostLive());
  await host.waitForFunction(() => SF.Live.pin);
  const pin = await host.evaluate(() => SF.Live.pin);

  const phones = [];
  for (const name of ['Ada', 'Bo']) {
    const phone = await context.newPage({ viewport: { width: 390, height: 844 } });
    phone.on('pageerror', e => errors.push(name + ': ' + e.message));
    await phone.goto(base + '/join.html');
    await phone.locator('#pin').fill(pin);
    await phone.locator('#name').fill(name);
    await phone.locator('#joinBtn').click();
    await phone.waitForSelector('#scWait.on');
    phones.push(phone);
  }
  await host.waitForFunction(() => SF.Live.players.length === 2);
  await host.evaluate(() => { SF.Live.begin(); SF.Player.goTo(0); });

  /* Think: the note is counted, not sent. */
  await host.evaluate(() => SF.Player.next());
  await phones[0].waitForSelector('#stageNoteWrap:not([hidden])');
  await phones[0].locator('#stageNote').fill('Two rectangles, one perimeter');
  await host.waitForFunction(() => SF.Live.written && SF.Live.written.n === 1);
  assert.equal(await host.evaluate(() => document.querySelector('#player .step-live .sp-count').textContent),
    '1 of 2 have written something');
  assert.deepEqual(await host.evaluate(() => SF.Live.askState().written), { n: 1, of: 2 });
  assert.equal(await host.evaluate(() => JSON.stringify(SF.Live).includes('Two rectangles')), false,
    'the words never reach the host');
  console.log('✓ Think: "1 of 2 have written something", and the note stays on the phone');

  /* Share: spotlight one idea, hide the other. */
  await host.evaluate(() => { SF.Player.next(); SF.Player.next(); });
  await host.waitForFunction(() => SF.Live.prompt && SF.Live.prompt.origin === 'stage');
  for (const [i, idea] of [[0, 'A 1 by 5 and a 2 by 4'], [1, 'Squares always win']]) {
    await phones[i].waitForSelector('#scPrompt.on');
    await phones[i].locator('#fbText').fill(idea);
    await phones[i].locator('#fbSend').click();
  }
  await host.waitForFunction(() => (SF.Live.askState().ideas || []).length === 2);
  const ideas = await host.evaluate(() => SF.Live.askState().ideas);
  assert.ok(ideas.every(it => it.name), 'named on the desk');
  const best = ideas.find(it => /1 by 5/.test(it.text));
  const other = ideas.find(it => it !== best);
  await host.evaluate(k => SF.Live.askCommand({ action: 'spot', key: k }), best.key);
  await host.evaluate(k => SF.Live.askCommand({ action: 'hide', key: k }), other.key);
  const wall = await host.evaluate(() => ({
    spot: document.querySelector('#player .idea-spotlight')?.textContent || '',
    cards: [...document.querySelectorAll('#player .fbcard')].map(c => c.textContent)
  }));
  assert.match(wall.spot, /1 by 5/);
  assert.doesNotMatch(wall.spot, /Ada|Bo/, 'no name on the wall');
  assert.deepEqual(wall.cards, ['A 1 by 5 and a 2 by 4'], 'the hidden idea is off the wall');
  if (shots) { await host.mouse.move(800, 200); await host.waitForTimeout(1500); await host.screenshot({ path: path.join(shots, 'share-spotlight.png') }); }
  await host.evaluate(() => SF.Player.next());
  await host.waitForFunction(() => SF.Player.stage && SF.Player.stage.name === 'Connect');
  assert.match(await host.evaluate(() => document.querySelector('#player .idea-spotlight')?.textContent || ''), /1 by 5/,
    'the spotlight is still up for Connect');
  if (shots) { await host.mouse.move(800, 200); await host.waitForTimeout(1500); await host.screenshot({ path: path.join(shots, 'connect-spotlight.png') }); }
  console.log('✓ Share: one idea spotlighted without a name, one hidden; still up at Connect');

  /* A held self-assessment, shown and then closed from the desk. */
  await host.evaluate(() => SF.Player.goTo(1));
  await host.waitForFunction(() => SF.Live.prompt && SF.Live.prompt.hold);
  assert.equal(await host.evaluate(() => document.querySelector('#player .idea-spotlight')), null,
    'the spotlight belonged to the last slide');
  await phones[0].waitForSelector('#scPrompt.on #fbPad button');
  await phones[0].locator('#fbPad button').first().click();
  await host.waitForFunction(() => SF.Live.digest && SF.Live.digest.answered === 1);
  await host.waitForFunction(() => document.querySelector('#player .fb-held'));
  assert.equal(await host.evaluate(() => document.querySelectorAll('#player .fbrail .pollrow').length), 0,
    'no split on the wall while held');
  if (shots) { await host.mouse.move(800, 200); await host.waitForTimeout(1500); await host.screenshot({ path: path.join(shots, 'held.png') }); }
  await host.evaluate(() => SF.Live.askCommand({ action: 'show' }));
  assert.ok(await host.evaluate(() => document.querySelectorAll('#player .fbrail .pollrow').length > 0), 'shown');
  await host.evaluate(() => SF.Live.askCommand({ action: 'close' }));
  assert.equal(await host.evaluate(() => SF.Live.prompt), null);
  await phones[0].waitForFunction(() => !document.querySelector('#scPrompt').classList.contains('on'));
  /* A redraw of the slide is not a return to it: still closed. */
  await host.evaluate(() => SF.Player.goTo(1));
  assert.equal(await host.evaluate(() => SF.Live.prompt), null);
  console.log('✓ Held: the count, not the split, until Show results; Close stays closed on a redraw');

  /* Plus / Minus / Interesting: one box per stage, one spotlight from each,
     and the three side by side for the look back. */
  await host.evaluate(() => {
    const pmi = SF.Activities.makeSlides(SF.Activities.activity('plus-minus-interesting'))[0];
    pmi.transition = 'none';
    SF.Player.deck.slides.push(pmi);
    SF.Player.goTo(SF.Player.deck.slides.length - 1);
  });
  for (const [n, idea] of [[1, 'The garden plan'], [2, 'Units got mixed up'], [3, 'Squares win on area']]) {
    await host.evaluate(() => SF.Player.next());
    await host.waitForFunction(n => SF.Player.stage && SF.Player.stage.i === n - 1 && SF.Live.prompt && SF.Live.prompt.origin === 'stage', n);
    await phones[0].waitForSelector('#scPrompt.on');
    await phones[0].locator('#fbText').fill(idea);
    await phones[0].locator('#fbSend').click();
    await host.waitForFunction(t => (SF.Live.askState().ideas || []).some(it => it.text === t), idea);
    const key = await host.evaluate(t => SF.Live.askState().ideas.find(it => it.text === t).key, idea);
    await host.evaluate(k => SF.Live.askCommand({ action: 'spot', key: k }), key);
  }
  await host.evaluate(() => SF.Player.next());
  await host.waitForFunction(() => SF.Player.stage && SF.Player.stage.name === 'Look back');
  const labels = await host.evaluate(() => [...document.querySelectorAll('#player .idea-spotlight .is-label')].map(e => e.textContent));
  assert.deepEqual(labels, ['Plus', 'Minus', 'Interesting'], 'one spotlight from each column, named for it');
  if (shots) { await host.mouse.move(800, 200); await host.waitForTimeout(1500); await host.screenshot({ path: path.join(shots, 'pmi-look-back.png') }); }
  console.log('✓ PMI: a box per column, and the three spotlights side by side at the look back');

  assert.deepEqual(errors, []);
} finally {
  await browser.close();
  await harness.stop(relay);
  fs.rmSync(dir, { recursive: true, force: true });
}
