#!/usr/bin/env node
/* The lab as the Lesson studio (js/lab-engine.js). The lab takes the rail, the
 * stage and the inspector; the shell's name field, Library, demo and Present
 * drive it; a SlideForge lesson opens as a lab copy with its own id, and the
 * original is not written to. Under automation the classic studio is the
 * default, so this opts in with ?classic=0. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import harness from '../../tests/harness.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-lab-lesson-'));
const port = await harness.freePort();
const relay = await harness.start(port, dir);
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${port}/?classic=0`);
  await page.waitForFunction(() => window.SF?.Shell?.current()?.lab && SF.Shell.current().doc().id, null, { timeout: 60000 });

  const layout = await page.evaluate(() => ({
    rail: getComputedStyle(document.querySelector('#app > .rail')).display,
    inspector: getComputedStyle(document.querySelector('#app > .inspector')).display,
    frame: document.getElementById('labFrame').getBoundingClientRect().height,
    labTools: !!document.getElementById('labFrame').contentDocument.querySelector('.tb-tools'),
    labDocRow: !!document.getElementById('labFrame').contentDocument.querySelector('.brand'),
  }));
  assert.equal(layout.rail, 'none', 'the classic rail gives way to the lab');
  assert.equal(layout.inspector, 'none', 'the classic inspector gives way to the lab');
  assert.ok(layout.frame > 400, 'the lab fills the workspace');
  assert.ok(layout.labTools, 'the lab keeps its tools row');
  assert.ok(!layout.labDocRow, 'the shell owns the document row, so the lab shows none');

  // The shell's name field is the deck's name.
  await page.fill('#docTitle', 'Smoke lesson');
  await page.waitForFunction(() => SF.Shell.current().doc().title === 'Smoke lesson');

  // The demo is a SlideForge lesson: it opens as a lab copy, and the original stays as it was.
  await page.click('#btnTemplate');
  await page.waitForFunction(() => String(SF.Shell.current().doc().id).startsWith('lab-'), null, { timeout: 60000 });
  const demo = await page.evaluate(() => {
    const lab = SF.Shell.current().doc();
    const classic = SF.Editor.deck();
    return {
      labSlides: lab.slides.length, sourceId: lab.sourceId, classicId: classic.id,
      classicSlides: classic.slides.length,
      typed: lab.slides.some((s) => typeof s.type === 'string'),
      storedSlides: (SF.Store.get(lab.id) || { slides: [] }).slides.length,
      title: document.getElementById('docTitle').value,
    };
  });
  assert.equal(demo.sourceId, demo.classicId, 'the lab copy names the lesson it came from');
  assert.ok(demo.labSlides > 80, `the demo converts (${demo.labSlides} slides)`);
  assert.ok(demo.labSlides <= demo.classicSlides, 'games stay in the classic lesson');
  assert.equal(demo.typed, false, 'every slide is a lab slide');
  assert.ok(demo.storedSlides <= 1, 'the classic store holds only the Library card, never the lab lesson itself');
  assert.match(demo.title, /Layout bank/, 'the shell shows the opened lesson’s name');

  // The Library lists the lab copy once, as its card, and keeps the original unlisted.
  // (Once the lab has finished filing it: the lesson is on screen a moment before that.)
  await page.waitForFunction(() => SF.LabEngine.hasCopy(SF.Shell.current().doc().sourceId), null, { timeout: 10000 }).catch(() => {});
  const lib = await page.evaluate(() => {
    const lab = SF.Shell.current().doc();
    return { card: !!SF.Store.get(lab.id), originalHidden: SF.LabEngine.hasCopy(lab.sourceId), originalKept: !!SF.Store.get(lab.sourceId) };
  });
  assert.ok(lib.card, 'the lab lesson has a Library card');
  assert.ok(lib.originalHidden && lib.originalKept, 'the original is kept, and listed only through its lab copy: ' + JSON.stringify(lib));

  // The bridge: Rehearse runs SlideForge's player on the lab's slides as pictures, games back in place.
  await page.evaluate(() => document.getElementById('btnRehearse').click());
  await page.waitForFunction(() => window.SF.Player.open, null, { timeout: 90000 });
  const show = await page.evaluate(() => {
    const run = SF.Player.deck.slides;
    return { pictures: run.filter((s) => s.type === 'image' && String(s.image).startsWith('data:image/jpeg')).length, games: run.filter((s) => s.type === 'quiz').length, sameId: SF.Player.deck.id === SF.Shell.current().doc().id };
  });
  assert.equal(show.pictures, demo.labSlides, 'every lab slide is in the show as a picture');
  assert.ok(show.games > 0, 'the lesson’s games are back in the show');
  assert.ok(show.sameId, 'the show carries the lesson’s id, so the lobby knows it is this lesson');
  await page.evaluate(() => { if (SF.Demo && SF.Demo.stop) SF.Demo.stop(); if (SF.Player.open && SF.Player.close) SF.Player.close(); });

  // Share fits the server's limit.
  const shareMB = await page.evaluate(async () => JSON.stringify(await SF.LabEngine.shareDeck()).length / 1048576);
  assert.ok(shareMB < 8, `a shared copy fits in 8 MB (${shareMB.toFixed(1)} MB)`);

  // Present is the lab's show.
  await page.click('#btnPresent');
  await page.waitForFunction(() => !!document.getElementById('labFrame').contentDocument.querySelector('.present'));

  assert.equal(errors.join('\n'), '');
  console.log(`PASS lab lesson: lab in the workspace, name synced, demo converted to ${demo.labSlides} slides, Library card, Rehearse with ${show.pictures} pictures and ${show.games} game slides, share ${shareMB.toFixed(1)} MB, Present runs the lab`);
} finally {
  await browser.close();
  relay.kill();
}
