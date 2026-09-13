#!/usr/bin/env node
/* The student handout, built from the real lecture.
 *
 * The unit tests cover the rules; this checks them against the deck that is
 * actually going to be handed out — forty slides, a four-question check, five
 * response moments and a set of plots that have to arrive as pictures.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import harness from '../tests/harness.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-handout-'));
const port = await harness.freePort();
const relay = await harness.start(port, dir);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('app: ' + e.message));
  await page.goto(`http://127.0.0.1:${port}/?lesson=ipdv-intro`);
  await page.waitForFunction(() => window.SF?.Editor?.deck());
  assert.equal(await page.evaluate(() => SF.Editor.deck().slides.length), 40,
    'the lecture under test is the full one');

  const [pdf] = await Promise.all([
    page.context().waitForEvent('page'),
    page.evaluate(() => SF.Print.open(SF.Editor.deck()))
  ]);
  pdf.on('pageerror', (e) => errors.push('handout: ' + e.message));
  await pdf.waitForSelector('.pdf-page');
  /* The button only enables once every image and font has settled, so this is
     also the check that nothing hangs. */
  await pdf.waitForFunction(
    () => { const b = document.querySelector('.pdf-toolbar button'); return b && !b.disabled; },
    { timeout: 40000 });
  assert.equal(await pdf.locator('.pdf-toolbar button').innerText(), 'Print / Save as PDF',
    'the handout finished preparing rather than reporting a failure');

  const pages = await pdf.locator('.pdf-page').count();
  assert.ok(pages >= 44, `the whole lecture is there, got ${pages} pages`);

  const text = await pdf.evaluate(() => document.body.innerText);

  /* The check expands into one page per question, with the options offered
     and nothing saying which is right. */
  for (const q of ['core purpose', 'Anscombe', 'Sankey', 'historical breakthrough']) {
    assert.ok(text.includes(q), `question about ${q} reached the handout`);
  }
  assert.ok(!text.includes('This activity is not available'),
    'the embedded check expanded rather than falling back to a placeholder');

  /* Nothing that would tell a student the answer. */
  const leaks = [
    ['Munzner emphasizes that visualization is designed', 'a quiz explanation'],
    ['Welcome to Advanced Information Presentation', 'a speaker note'],
    ['Close the lecture. Remind them of the lab', 'another speaker note']
  ];
  for (const [needle, what] of leaks) {
    assert.ok(!text.includes(needle), `${what} must not be in a student handout`);
  }
  /* An answer-reveal card would carry a lettered key beside the right option. */
  assert.equal(await pdf.locator('.pdf-page .ex-answer').count(), 0,
    'no answer-reveal card was printed');
  assert.equal(await pdf.locator('.pdf-page .layout-results, .pdf-page .layout-join').count(), 0,
    'no results or join page was printed');

  /* Pictures have to be pictures, not empty frames. */
  const media = await pdf.evaluate(() => {
    const out = { broken: 0, backgrounds: 0 };
    document.querySelectorAll('.pdf-page img').forEach((i) => {
      if (!i.complete || i.naturalWidth === 0) out.broken++;
    });
    document.querySelectorAll('.pdf-page .img').forEach((n) => {
      if (getComputedStyle(n).backgroundImage !== 'none') out.backgrounds++;
    });
    return out;
  });
  assert.equal(media.broken, 0, 'every <img> on the handout loaded');
  assert.ok(media.backgrounds > 0, 'the picture slides carried their images through');

  /* A handout is fixed-size paper: content that overflows its page is lost,
     not scrolled to. */
  const spill = await pdf.evaluate(() => {
    const bad = [];
    document.querySelectorAll('.pdf-page').forEach((p, i) => {
      const slide = p.querySelector('.slide');
      if (slide && (slide.scrollHeight > slide.clientHeight + 4 || slide.scrollWidth > slide.clientWidth + 4)) {
        bad.push(i + ' ' + slide.className.replace(/theme-\S+\s*/, '').trim());
      }
    });
    return bad;
  });
  assert.deepEqual(spill, [], 'no page overflows the paper');

  /* Every response moment has to be answerable on paper. The lecture's two
     open ones — a word cloud and a confidence scale — carry no options, and
     printed as bare questions they gave a student nothing to record. */
  const unanswerable = await pdf.evaluate(() => {
    const bad = [];
    document.querySelectorAll('.pdf-page').forEach((p, i) => {
      const t = (p.innerText || '').replace(/\s+/g, ' ').trim();
      if (/\?/.test(t) && p.querySelectorAll('li').length === 0 && !p.querySelector('.img, img')) {
        bad.push((i + 1) + ': ' + t.slice(0, 50));
      }
    });
    return bad;
  });
  assert.deepEqual(unanswerable, [], 'no question is printed with nothing to answer on');

  /* The confidence scale prints its points rather than a bare question. */
  const scale = await pdf.evaluate(() => {
    const p = [...document.querySelectorAll('.pdf-page')]
      .find((n) => /How confident do you feel/.test(n.innerText));
    return p ? [...p.querySelectorAll('li')].map((li) => li.innerText.trim()) : null;
  });
  assert.ok(scale && scale.length === 5, 'the scale printed all five points');
  assert.match(scale[0], /Need guidance/, 'the low end says what it means');
  assert.match(scale[4], /Ready to critique/, 'and so does the high end');

  /* Mind maps arrive whole — every branch, not just the centre. */
  const maps = await pdf.evaluate(() => [...document.querySelectorAll('.pdf-page')]
    .map((p, i) => ({ page: i + 1, branches: p.querySelectorAll('.mindmap-branch').length }))
    .filter((x) => x.branches > 0));
  assert.equal(maps.length, 2, 'both mind maps are in the handout');
  maps.forEach((m) => assert.equal(m.branches, 6, `page ${m.page} kept all six branches`));

  assert.deepEqual(errors, [], 'no page errors');
  console.log(`PASS: ${pages}-page handout from the 40-slide lecture — questions without answers, no notes, every image loaded, nothing over the edge`);
} finally {
  await browser.close();
  await harness.stop(relay);
  fs.rmSync(dir, { recursive: true, force: true });
}
