#!/usr/bin/env node
/* Smoke: what the app opens with, on a first visit and on a return.
 *
 *   node tools/smoke/run.mjs cold-start
 *
 * Runs in throwaway browser profiles, so it never touches the storage of a
 * browser somebody is working in — which is the only honest way to test a
 * cold start. It used to open the 74-slide IPDV lecture, because the Library
 * seeds that first and the fallback took Store.list()[0]; for anybody but its
 * author that is a stranger's lecture to type over. The lab is the studio
 * now, so the first visit is the lab's own lesson, and the return visit is the
 * lab lesson reopened from the lab's storage.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import harness from '../../tests/harness.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-cold-'));
const port = await harness.freePort();
const relay = await harness.start(port, dir);
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const base = `http://127.0.0.1:${port}/`;

try {
  const ctx = await browser.newContext();          // never visited before
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.SF?.Shell?.current()?.lab && SF.Shell.current().doc().id, null, { timeout: 60000 });
  await page.waitForTimeout(700);

  const first = await page.evaluate(() => {
    const d = SF.Shell.current().doc();
    return { key: SF.Shell.current().key, title: d.title, slides: d.slides.length, lab: SF.LabEngine.isLabDoc(d),
             sourceId: d.sourceId || null, library: SF.Store.list().length };
  });
  assert.equal(first.key, 'deck', 'a first visit opens the Lesson studio');
  assert.equal(first.lab, true, 'the lesson on screen is a lab lesson');
  assert.equal(first.sourceId, null, 'the first lesson is nobody else’s lesson');
  assert.equal(first.slides, 1, `a first visit opens one slide, not a lecture (got ${first.slides}: "${first.title}")`);
  assert.ok(first.library > 1, 'the brand packs are still seeded into the Library');
  console.log('✓ First visit: the lab’s blank lesson (1 slide), ' + first.library + ' documents in the Library');

  /* One click to the templates, from the document row rather than inside File. */
  const opened = await page.evaluate(async () => {
    const b = document.getElementById('btnLibraryOpen');
    if (!b) return 'no button';
    b.click();
    await new Promise((r) => setTimeout(r, 600));
    const dlg = document.querySelector('dialog[open]');
    return dlg ? (dlg.querySelector('h2') || {}).textContent : 'no dialog';
  });
  assert.equal(opened, 'Library', 'the Library button opens the Library');
  console.log('✓ Library is one click away');

  /* And a return visit resumes the work: the lab reopens the lesson it last
     had on screen, with your words on its slide. */
  const mine = await page.evaluate(async () => {
    const dlg = document.querySelector('dialog[open]'); if (dlg) dlg.close();
    const ws = SF.Shell.current();
    const d = JSON.parse(JSON.stringify(ws.doc()));
    d.title = 'Half-finished lecture';
    const text = d.slides[0].layers.find((l) => l.kind === 'text');
    if (text) text.params.text = 'MINE';
    // The blank lesson's slide is its ground alone: the words go in a text layer of their own, with a place on the slide.
    else d.slides[0].layers.push({ ...JSON.parse(JSON.stringify(d.slides[0].layers[0])), id: 'mine', kind: 'text', name: 'MINE',
      box: { x: 200, y: 400, w: 1400, h: 200, rot: 0 }, params: { text: 'MINE', size: 96, color: '#141414' } });
    ws.setDoc(d);
    for (let i = 0; i < 50 && ws.doc().title !== d.title; i++) await new Promise((r) => setTimeout(r, 100));
    ws.store.save(ws.doc());
    await new Promise((r) => setTimeout(r, 1200));
    return ws.doc().id;
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.SF?.Shell?.current()?.lab && SF.Shell.current().doc().id, null, { timeout: 60000 });
  await page.waitForTimeout(600);
  const back = await page.evaluate(() => {
    const d = SF.Shell.current().doc();
    return { id: d.id, title: d.title, shown: document.getElementById('docTitle').value,
             words: d.slides[0].layers.filter((l) => l.kind === 'text').map((l) => l.params.text) };
  });
  assert.equal(back.id, mine, 'the return visit reopens the same lesson');
  assert.equal(back.title, 'Half-finished lecture');
  assert.equal(back.shown, 'Half-finished lecture', 'the shell shows its name');
  assert.ok(back.words.includes('MINE'), 'with your words on the slide: ' + JSON.stringify(back.words));
  assert.deepEqual(errors, [], 'no page errors');
  console.log('✓ Return visit: reopens the document you were editing, with your words');
  console.log('\nCold start is blank; the Library is one click away; returning resumes.');
} finally {
  await browser.close();
  await harness.stop(relay);
  fs.rmSync(dir, { recursive: true, force: true });
}
