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

  // The live stage: the lab draws its slides inside SlideForge's show, and makes room for the rail.
  const live = await page.evaluate(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    await wait(1500);
    const p = SF.LabStage.player();
    // The room eases across over about half a second of the show's clock.
    for (let k = 0; k < 40 && p && Math.abs(p.renderer.inset - p.insetTarget) > 0.01; k++) await wait(100);
    const vp = document.querySelector('#player .deck-viewport');
    const first = { onWall: SF.LabStage.active(), canvas: !!SF.Player._current.querySelector('canvas.lab-live'), railed: vp.classList.contains('railed'), inset: p && p.renderer.inset, target: p && p.insetTarget, railW: getComputedStyle(vp).getPropertyValue('--rail-w') };
    // Find a slide with builds, and walk them with Next.
    const run = SF.Player.deck.slides;
    let walked = null;
    for (let i = 0, seen = 0; i < run.length && !walked && seen < 20; i++) {
      if (!(run[i].design && run[i].design.labStill)) continue;
      seen++;
      SF.Player.goTo(i, 1); await wait(250);
      const s = p.state();
      if (s.steps > 0) { SF.Player.next(); await wait(150); walked = { wall: SF.Player.idx, wallBefore: i, step: p.state().step, steps: s.steps }; }
    }
    return { first, walked };
  });
  assert.ok(live.first.onWall && live.first.canvas, 'the lab draws the slide on the wall live');
  assert.ok(!live.first.railed || live.first.inset > 0.1, 'with the rail open, the lab keeps room beside it: ' + JSON.stringify(live.first));
  if (live.walked) assert.ok(live.walked.wall === live.walked.wallBefore && live.walked.step === 1, 'Next shows the lab slide’s first build before the show moves on');
  await page.evaluate(() => { if (SF.Demo && SF.Demo.stop) SF.Demo.stop(); if (SF.Player.open && SF.Player.close) SF.Player.close(); });

  // Share fits the server's limit.
  const shareMB = await page.evaluate(async () => JSON.stringify(await SF.LabEngine.shareDeck()).length / 1048576);
  assert.ok(shareMB < 8, `a shared copy fits in 8 MB (${shareMB.toFixed(1)} MB)`);

  // Present is SlideForge's show, with its HUD, and the lab drawing the slide live inside it.
  await page.click('#btnPresent');
  await page.waitForFunction(() => window.SF.Player.open && SF.LabStage.active(), null, { timeout: 90000 });

  assert.equal(errors.join('\n'), '');
  console.log(`PASS lab lesson: lab in the workspace, name synced, demo converted to ${demo.labSlides} slides, Library card, Rehearse with ${show.pictures} lab slides live and ${show.games} game slides, builds walked ${live.walked ? 'yes' : 'none found'}, share ${shareMB.toFixed(1)} MB, Present runs SlideForge's show with the lab live`);
} finally {
  await browser.close();
  relay.kill();
}
