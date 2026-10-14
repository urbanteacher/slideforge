#!/usr/bin/env node
/* The lab as the Lesson studio (js/lab-engine.js). The lab takes the rail, the
 * stage and the inspector; the shell's name field, Library, demo and Present
 * drive it; a SlideForge lesson opens as a lab copy with its own id, and the
 * original is not written to. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import harness from '../../tests/harness.js';
import { leaveFullscreen } from './lib/fullscreen.mjs';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-lab-lesson-'));
const port = await harness.freePort();
const relay = await harness.start(port, dir);
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${port}/`);
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
  // The shell's second row sits in the lab's tools row: its buttons press the shell's own.
  const lab = page.frameLocator('#labFrame');
  await lab.getByRole('button', { name: /See the demo/ }).click();
  await page.waitForFunction(() => String(SF.Shell.current().doc().id).startsWith('lab-'), null, { timeout: 60000 });
  const demo = await page.evaluate(() => {
    const lab = SF.Shell.current().doc();
    const classic = SF.Store.get(lab.sourceId);
    return {
      labSlides: lab.slides.length, sourceId: lab.sourceId, classicId: classic.id,
      classicSlides: classic.slides.length,
      typed: lab.slides.some((s) => typeof s.type === 'string'),
      games: lab.slides.filter((s) => s.game).length,
      storedSlides: (SF.Store.get(lab.id) || { slides: [] }).slides.length,
      title: document.getElementById('docTitle').value,
    };
  });
  assert.equal(demo.sourceId, demo.classicId, 'the lab copy names the lesson it came from');
  assert.ok(demo.labSlides > 80, `the demo converts (${demo.labSlides} slides)`);
  assert.ok(demo.games > 0, 'the lesson’s games are built in the lab');
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

  // The shows run on a short lesson with a game: every show draws each of the lesson's slides first,
  // and the demo's hundred and more take minutes without a graphics card.
  const before = await page.evaluate(() => SF.Shell.current().doc().id);
  await page.evaluate(() => SF.LabEngine.openKey('attention'));
  await page.waitForFunction((id) => SF.Shell.current().doc().id !== id && String(SF.Shell.current().doc().id).startsWith('lab-'), before, { timeout: 60000 });
  const lesson = await page.evaluate(() => SF.Shell.current().doc().slides.length);

  // Every show is the studio's (M14): Present, the Quiz studio's Present and Rehearse open its show over the frame;
  // SlideForge's classic player is gone.
  const studioShow = async (open, what) => {
    await open();
    await lab.locator('.show').waitFor({ timeout: 30000 });
    assert.deepEqual(await page.evaluate(() => ({ shown: document.documentElement.classList.contains('lab-show'), classic: !!(window.SF.Player && SF.Player.open) })), { shown: true, classic: false }, what + ' opens the studio’s show');
    await leaveFullscreen(page);
    await lab.locator('body').press('Escape');
    if (await lab.locator('.show').count()) await lab.locator('body').press('Escape');
    await lab.locator('.show').waitFor({ state: 'detached', timeout: 8000 });
    await page.waitForFunction(() => !document.documentElement.classList.contains('lab-show'), null, { timeout: 5000 });
  };
  await studioShow(() => lab.getByRole('button', { name: 'Present', exact: true }).click(), 'Present');
  await studioShow(() => page.evaluate(() => document.getElementById('btnRehearse').click()), 'Rehearse');

  // Share is the lab deck for the studio viewer, and fits the server's limit.
  const share = await page.evaluate(async () => { const got = await SF.LabEngine.studioShareDeck(); return { mb: got.doc ? JSON.stringify(got.doc).length / 1048576 : -1, why: got.why || '' }; });
  assert.ok(share.mb > 0 && share.mb < 8, `a shared copy is the lab deck and fits in 8 MB (${share.mb.toFixed(1)} MB${share.why ? ', ' + share.why : ''})`);
  const shareMB = share.mb;

  // The Quiz studio is the same lesson, and its Present is the lesson's show.
  await page.evaluate(() => SF.Shell.activate('game'));
  await page.waitForFunction(() => SF.Shell.current().key === 'game' && SF.Shell.current().lab);
  await studioShow(() => page.evaluate(() => document.getElementById('btnPlay').click()), 'The Quiz studio’s Present');
  await page.evaluate(() => SF.Shell.activate('deck'));

  assert.equal(errors.join('\n'), '');
  console.log(`PASS lab lesson: lab in the workspace, name synced, demo converted to ${demo.labSlides} slides, Library card, a ${lesson}-slide lesson presented and rehearsed in the studio's show (and from the Quiz studio), share ${shareMB.toFixed(1)} MB as the lab deck`);
} finally {
  await browser.close();
  relay.kill();
}
