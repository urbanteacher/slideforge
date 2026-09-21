#!/usr/bin/env node
/* The slide sorter is a fixed overlay at z-index 210; the player is 100. A
   sorter left open when the show starts therefore covers the show with a grid
   of every slide — the lesson runs underneath and the room sees thumbnails.
   Nothing has closed it since the sorter was added.

   No mouse can reach this: the sorter intercepts the click on Rehearse, and
   ⌘G does not reach the editor once the player has the keyboard. So this
   drives workspace.play(), which is the same door Present uses and the one
   any other caller — a shortcut, the shell, a future button — would come
   through. The guard lives in runDeck because all six show paths pass it. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import harness from '../../tests/harness.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-sorter-present-'));
const port = await harness.freePort();
const relay = await harness.start(port, dir);
const browser = await chromium.launch({ headless: true });
const errors = [];
try {
  const page = await (await browser.newContext()).newPage();
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${port}`);
  await page.waitForFunction(() => window.SF?.Editor?.deck());

  await page.evaluate(() => {
    const d = SF.makeDeck('Sorter over the show');
    d.slides = ['title', 'content', 'content', 'section', 'content'].map(t => SF.makeSlide(t));
    SF.Store.save(d); SF.Editor.openDeck(d.id); SF.Editor.workspace.draw();
  });

  /* Open the sorter, then start the show without closing it. */
  await page.click('#btnSorter');
  await page.waitForSelector('.sorter', { state: 'visible' });
  const stacked = await page.evaluate(() => ({
    sorter: getComputedStyle(document.querySelector('.sorter')).zIndex,
    player: getComputedStyle(document.getElementById('player')).zIndex
  }));
  assert.ok(Number(stacked.sorter) > Number(stacked.player),
    `the premise: sorter ${stacked.sorter} must outrank player ${stacked.player}`);

  await page.evaluate(() => SF.Editor.workspace.play());
  await page.waitForFunction(() => document.getElementById('player').classList.contains('on'));

  const after = await page.evaluate(() => {
    const s = document.querySelector('.sorter');
    return {
      playing: document.getElementById('player').classList.contains('on'),
      sorterPresent: !!s,
      thumbsOverShow: document.querySelectorAll('.sorter .thumb').length,
      slideOnScreen: !!document.querySelector('#player .deck-viewport .slide')
    };
  });
  assert.equal(after.playing, true, 'the show did not start');
  assert.equal(after.sorterPresent, false,
    `the sorter is still over the show with ${after.thumbsOverShow} thumbnails`);
  assert.equal(after.slideOnScreen, true, 'no slide is on the wall');
  assert.deepEqual(errors, [], 'page errors');
  console.log('PASS: the sorter closes when the show starts, and the slide is what the room sees');
} finally {
  await browser.close();
  await harness.stop(relay);
  fs.rmSync(dir, { recursive: true, force: true });
}
