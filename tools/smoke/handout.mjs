#!/usr/bin/env node
/* The PDF handout, built from the real lecture, as the studio makes it (lab/src/export/handout.ts): the lesson opened
 * in the studio, then the print document Export → PDF handout opens (SF.LabEngine.handoutHtml).
 *
 * The student copy is every shown slide fully built, one to a page, with no answer slides and no speaker notes; the
 * teacher copy adds the answer slides and each slide's notes. Every page is a picture of the slide, and every picture
 * has to arrive.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import harness from '../../tests/harness.js';
import { handoutPage, openInStudio } from './lib/handout.mjs';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-handout-'));
const port = await harness.freePort();
const relay = await harness.start(port, dir);
const browser = await chromium.launch({ headless: true });
try {
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('app: ' + e.message));
  await page.goto(`http://127.0.0.1:${port}/`);
  await openInStudio(page, 'ipdv-intro');
  const lesson = await page.evaluate(() => {
    const d = SF.LabEngine.labDeck(), shown = d.slides.filter((s) => !s.hidden);
    return { title: d.title, shown: shown.length, answers: shown.filter((s) => s.game && s.game.role === 'answer').length, noted: shown.filter((s) => String(s.notes || '').trim()).length };
  });
  assert.match(lesson.title, /Advanced Information Presentation/, 'the IPDV lecture is open in the studio');
  assert.ok(lesson.shown >= 35, `the full lecture is open, got ${lesson.shown} shown slides`);

  const pages = async (doc) => doc.evaluate(() => [...document.querySelectorAll('section.page')].map((p) => ({ img: !!p.querySelector('img')?.naturalWidth, notes: (p.querySelector('.notes')?.innerText || '').trim() })));

  const student = await handoutPage(page);
  const sp = await pages(student);
  assert.equal(sp.length, lesson.shown - lesson.answers, `the student copy is every shown slide but the answers (${sp.length} pages)`);
  assert.ok(sp.every((p) => p.img), 'every page of the student copy is its slide’s picture');
  assert.ok(sp.every((p) => !p.notes), 'no speaker notes in a student copy');
  assert.match(await student.locator('.toolbar .hint').innerText(), /Student copy/);
  const pdf = path.join(dir, 'handout.pdf');
  await student.pdf({ path: pdf, printBackground: true, preferCSSPageSize: true });
  assert.ok(fs.statSync(pdf).size > 50_000, 'the PDF is a real multi-page file');
  const kb = (fs.statSync(pdf).size / 1024).toFixed(0);
  await student.close();

  const teacher = await handoutPage(page, { teacher: true });
  const tp = await pages(teacher);
  assert.equal(tp.length, lesson.shown, 'the teacher copy is every shown slide, the answers included');
  assert.ok(tp.every((p) => p.img), 'every page of the teacher copy is its slide’s picture');
  assert.equal(tp.filter((p) => p.notes).length, lesson.noted, 'each slide with notes carries them in the teacher copy');
  assert.match(await teacher.locator('.toolbar .hint').innerText(), /Teacher copy/);
  await teacher.close();

  assert.deepEqual(errors, [], 'no page errors');
  console.log(`handout ok · ${lesson.title}: student copy ${sp.length} pages (${kb} KB PDF), teacher copy ${tp.length} with ${lesson.noted} slides’ notes`);
} finally {
  await browser.close();
  await harness.stop(relay).catch(() => {});
}
