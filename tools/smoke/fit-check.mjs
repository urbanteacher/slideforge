#!/usr/bin/env node
/* Smoke: SF.measureSlideFit and SF.probeLayoutFit, exercised on production
 * rendering with no lab page involved. That independence is the point — these
 * are the two functions js/editor.js will call, so they have to hold up without
 * the lattice, the recipes, or anything else the concept lab adds.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import harness from '../../tests/harness.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-fit-check-'));
const port = await harness.freePort();
const relay = await harness.start(port, dir);
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => typeof window.SF?.measureSlideFit === 'function', null, { timeout: 30000 });

  /* A host of slide size, mounted and laid out but off screen. */
  await page.evaluate(() => {
    const host = document.createElement('div');
    host.id = 'fit-host';
    host.style.cssText = 'position:fixed;left:-4000px;top:0;width:1280px;height:720px';
    document.body.append(host);
    window.__settle = async () => {
      await document.fonts.ready;
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
    };
    window.__mount = async (deck, slide, index) => {
      const host = document.querySelector('#fit-host');
      const root = window.SF.renderSlide(deck, slide, { index, total: deck.slides.length, revealed: 99 });
      host.replaceChildren(root);
      await window.__settle();
      return root;
    };
  });

  /* A detached root answers null rather than a plausible pass. */
  assert.equal(
    await page.evaluate(() => {
      const d = window.SF.buildLesson('layout-bank');
      return window.SF.measureSlideFit(window.SF.renderSlide(d, d.slides[0], { index: 0, total: 1 }));
    }),
    null,
    'a detached slide should not be measurable'
  );

  /* Real slides, rendered by production, mostly fit their own frame. */
  const sweep = await page.evaluate(async () => {
    const d = window.SF.buildLesson('layout-bank');
    const out = [];
    for (let i = 0; i < d.slides.length; i++) {
      const root = await window.__mount(d, d.slides[i], i);
      const v = window.SF.measureSlideFit(root);
      out.push({ n: i + 1, type: d.slides[i].type, fits: v.fits, legible: v.legible, smallest: v.smallest, issues: v.issues.length });
    }
    return out;
  });
  assert.equal(sweep.length, 97, `expected 97 slides, measured ${sweep.length}`);
  const unfit = sweep.filter((s) => !s.fits);
  /* One known overflow in the bank. The budget equals it on purpose: slack is
     where a regression hides, and this check is meant to catch production drift. */
  assert.ok(
    unfit.length <= 1,
    `${unfit.length} production slides overflow their own frame: ${unfit.slice(0, 8).map((s) => '#' + s.n + ' ' + s.type).join(', ')}`
  );

  /* Legibility is read from painted size, so charts are included rather than
     skipped: SVG text has no offsetHeight and scales with its viewBox. */
  const charts = sweep.filter((s) => s.type === 'chart');
  assert.ok(charts.length > 0, 'no chart slides in the bank');
  assert.ok(
    charts.every((c) => c.smallest !== null),
    'chart slides reported no smallest text, so SVG labels were skipped'
  );
  const scaled = await page.evaluate(async () => {
    const d = window.SF.buildLesson('layout-bank');
    const i = d.slides.findIndex((s) => s.type === 'chart');
    const root = await window.__mount(d, d.slides[i], i);
    const text = root.querySelector('svg text');
    const declared = parseFloat(getComputedStyle(text).fontSize);
    return { declared, scale: window.SF.svgScale(text), measured: window.SF.measureSlideFit(root).smallest };
  });
  assert.ok(scaled.scale > 0 && scaled.scale < 1, `expected a viewBox downscale, got ${scaled.scale}`);
  assert.ok(
    scaled.measured < scaled.declared,
    `painted size ${scaled.measured} should be under the declared ${scaled.declared}`
  );

  /* Overflow is reported with a direction and an amount, not just a boolean. */
  const overflowing = await page.evaluate(async () => {
    const d = window.SF.buildLesson('layout-bank');
    const slide = structuredClone(d.slides.find((s) => s.type === 'content'));
    slide.bullets = Array.from({ length: 14 }, (_, i) => `Point ${i + 1}. ` + 'words that keep going and going '.repeat(4));
    const root = await window.__mount(d, slide, 0);
    return window.SF.measureSlideFit(root);
  });
  assert.equal(overflowing.fits, false, 'fourteen long bullets should not fit');
  assert.ok(overflowing.issues.length, 'no issues reported for an overflowing slide');
  for (const issue of overflowing.issues) {
    assert.match(issue.direction, /^(top|bottom|left|right|clipped-bottom|clipped-right|spill-top|spill-bottom)$/, `odd direction ${issue.direction}`);
    assert.ok(issue.px > 0, 'an issue with no measured amount');
    assert.ok(issue.element, 'an issue with no element name');
  }

  /* A compare grid too tall for the room left under its heading. Centred, it
     used to overflow both ways with every word still on the slide, so the
     frame test passed a grid covering its own title. Now the renderer steps it
     down until it fits, and past the last rung the fit check says it spills. */
  const compare = await page.evaluate(async () => {
    const d = window.SF.buildLesson('layout-bank');
    const five = [
      'Goal\tIdentify good movies in genres I like\tIdentify common or unique words in favourite genres',
      'Domain\tGeneral population, movie enthusiasts\tMusic listeners, linguists, fans',
      'Task\tWhat is a good movie for me?\tWhat word patterns stand out?',
      'Data\tRatings, box office, reviews\tLyrics, word frequencies, position, genre',
      'Idiom\tStacked bar chart of ratings\tStreamgraph, unit chart, area chart',
    ];
    const measure = async (bullets) => {
      const slide = { id: 'cmp', type: 'compare', title: 'From the movie example to your music project',
        subtitle: 'Movie project\tMusic project', bullets,
        body: 'This abstraction clarifies what you want to achieve before you choose a chart.' };
      const root = await window.__mount(d, slide, 0);
      const grid = root.querySelector('.compare');
      const title = root.querySelector('h2').getBoundingClientRect();
      const v = window.SF.measureSlideFit(root);
      return {
        rung: Number(grid.dataset.fit || 0),
        clearOfTitle: grid.firstElementChild.getBoundingClientRect().top >= title.bottom - 1,
        spill: v.issues.filter((i) => i.direction.startsWith('spill')).map((i) => i.direction),
        /* The grid's own type, not the slide's smallest: the page number is
           smaller than the floor on every slide and is not this layout's. */
        smallest: Math.min(...[...grid.querySelectorAll('.compare-cell, .compare-aspect')]
          .filter((n) => n.textContent.trim())
          .map((n) => parseFloat(getComputedStyle(n).fontSize))),
        floor: window.SF.LEGIBLE_FLOOR,
      };
    };
    return { five: await measure(five), twelve: await measure(five.concat(five, five.slice(0, 2))) };
  });
  assert.ok(compare.five.rung >= 1, 'five two-line compare rows should step down a rung');
  assert.equal(compare.five.clearOfTitle, true, 'the compare grid covered its heading');
  assert.deepEqual(compare.five.spill, [], `five compare rows still spill: ${compare.five.spill}`);
  assert.equal(compare.twelve.clearOfTitle, true, 'an over-full compare grid covered its heading');
  assert.deepEqual(compare.twelve.spill, ['spill-bottom'], 'an over-full compare grid should be reported as spilling downward only');
  assert.ok(compare.twelve.smallest >= compare.twelve.floor, `compare type went under the floor: ${compare.twelve.smallest}px`);

  /* probeLayoutFit: the estimate must match what the conversion produces, since
     both run prepareLayout on a clone. */
  const probes = await page.evaluate(async () => {
    const d = window.SF.buildLesson('layout-bank');
    const source = d.slides.find((s) => s.type === 'content');
    const host = document.querySelector('#fit-host');
    const api = {
      index: 0,
      total: d.slides.length,
      prepareLayout: window.SF.prepareLayout,
      renderSlide: window.SF.renderSlide,
      settle: window.__settle,
    };
    const out = [];
    for (const type of ['table', 'quote', 'statement', 'journey', 'keywords']) {
      const predicted = await window.SF.probeLayoutFit(d, source, type, host, api);
      /* Now convert for real and measure the result the same way. */
      const applied = window.SF.prepareLayout(structuredClone(source), type);
      const root = await window.__mount(d, applied, 0);
      const actual = window.SF.measureSlideFit(root);
      out.push({ type, predicted: predicted.fits, actual: actual.fits, keepsHeading: predicted.keepsHeading });
    }
    return out;
  });
  for (const p of probes) {
    assert.equal(p.predicted, p.actual, `${p.type}: predicted ${p.predicted}, rendering gave ${p.actual}`);
  }

  /* prepareLayout keeps the title field; the layout decides whether to show it. */
  const byType = Object.fromEntries(probes.map((p) => [p.type, p.keepsHeading]));
  assert.equal(byType.table, true, 'a table should still show the heading');
  assert.equal(byType.quote, false, 'a quote shows the words without the title');
  assert.equal(byType.statement, false, 'a statement shows the words without the title');

  assert.deepEqual(errors, []);
  console.log(
    `Fit check passed: 97 slides measured, ${unfit.length} overflow their frame` +
      `${unfit.length ? ' (' + unfit.map((s) => '#' + s.n + ' ' + s.type).join(', ') + ')' : ''} · ` +
      `chart labels paint ${scaled.measured}px from a declared ${scaled.declared}px · ` +
      `${probes.length} layout probes agreed with their own rendering · ` +
      `five compare rows fit on rung ${compare.five.rung}, twelve spill and are reported`
  );
} finally {
  await browser.close();
  await harness.stop(relay);
  fs.rmSync(dir, { recursive: true, force: true });
}
