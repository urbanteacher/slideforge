#!/usr/bin/env node
/* Smoke: walking a chart, spotlighting a build, and morphing between slides.
 *
 * All three are things only a browser can answer. A callout's position is
 * looked up off the axis label the chart renderer drew, so this checks the
 * lookup finds the right band and that the zoom keeps the label in frame —
 * the first version centred on the bars and cut the labels off the bottom,
 * which turns "look at 2020" into a crop of an unnamed bar.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import harness from '../../tests/harness.js';

const TABLE = 'Year\tHires\n2018\t10567540\n2019\t10424955\n2020\t10434167\n' +
  '2021\t10941264\n2022\t11505872\n2023\t8531168';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-callout-'));
const port = await harness.freePort();
const relay = await harness.start(port, dir);
const browser = await chromium.launch({ headless: true });
const problems = [];
try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.waitForFunction(() => window.SF?.Editor?.deck());

  /* --- the walk ---------------------------------------------------------- */
  await page.evaluate((table) => {
    const deck = Object.assign(SF.makeDeck('callouts'), { theme: 'northeastern' });
    SF.Editor.workspace.setDoc(deck);
    const d = SF.Editor.deck();
    d.slides = [
      SF.normalizeSlide(Object.assign(SF.makeSlide('chart'), {
        chartKind: 'bar', title: 'Santander Cycle hires by year', body: table,
        callouts: [
          { label: '2020', note: 'Lockdown year — and the annual total barely moved.' },
          { label: '2023', note: 'This is the drop worth explaining.' }
        ]
      })),
      SF.normalizeSlide(Object.assign(SF.makeSlide('content'), { title: 'After' }))
    ];
    SF.Editor.selectSlide(d.slides[0].id);
    SF.Editor.workspace.play({ fullscreen: false });
  }, TABLE);
  await page.waitForFunction(() => window.SF?.Player?.open);
  await page.waitForTimeout(500);

  const look = () => page.evaluate(() => {
    const svg = document.querySelector('#player .chart-svg');
    const note = document.querySelector('#player .ch-callout');
    const box = svg && svg.getBoundingClientRect();
    /* Which category labels are actually inside the frame after the zoom. */
    const wrap = document.querySelector('#player .chart-wrap');
    const frame = wrap && wrap.getBoundingClientRect();
    const visible = Array.from(document.querySelectorAll('#player .ch-cat')).filter((t) => {
      const r = t.getBoundingClientRect();
      return frame && r.width && r.left >= frame.left - 2 && r.right <= frame.right + 2 &&
        r.top >= frame.top - 2 && r.bottom <= frame.bottom + 2;
    }).map((t) => String(t.textContent || '').trim());
    return {
      idx: SF.Player.idx,
      at: SF.Callouts.at(SF.Player, SF.Player.wallSlide()),
      zoomed: !!(svg && svg.classList.contains('ch-zoomed')),
      note: note ? note.textContent : '(no slot)',
      shown: !!(note && note.classList.contains('on')),
      visible: visible,
      clipped: !!(box && frame && (box.width > frame.width + 2))
    };
  });

  const whole = await look();
  if (whole.zoomed) problems.push('the chart starts zoomed');
  if (whole.visible.length !== 6) problems.push('the whole chart should show all six labels — ' + whole.visible.join(','));

  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(800);
  const first = await look();
  if (!first.zoomed) problems.push('the first press did not zoom');
  if (first.at !== 0) problems.push('the walk is not at the first callout — ' + first.at);
  if (!/Lockdown year/.test(first.note)) problems.push('the note did not arrive — ' + first.note);
  /* The band and its neighbours, and the label still readable: that is the
     difference between zooming into a chart and cropping one. */
  if (!first.visible.includes('2020')) {
    problems.push('the callout lost its own axis label — visible: ' + first.visible.join(','));
  }
  if (first.visible.length < 2 || first.visible.length > 4) {
    problems.push('a callout should show about three bands, got ' + first.visible.join(','));
  }
  if (first.idx !== 0) problems.push('the press moved the deck instead of the chart');
  console.log('✓ First press zooms to 2020 and keeps', first.visible.join(', '), 'in frame');

  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(700);
  const second = await look();
  if (second.at !== 1 || !/drop worth explaining/.test(second.note)) {
    problems.push('the second callout did not arrive — ' + JSON.stringify(second));
  }
  if (!second.visible.includes('2023')) problems.push('the second callout lost its label');

  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(700);
  const back = await look();
  if (back.zoomed) problems.push('the closing press should put the whole chart back');
  if (back.shown) problems.push('the note should clear with the zoom it describes');
  if (back.idx !== 0) problems.push('the closing press should not also change slide');
  console.log('✓ The closing press hands the whole chart back, without changing slide');

  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(600);
  if ((await look()).idx !== 1) problems.push('the press after the walk did not move the deck');
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(600);
  const returned = await look();
  if (returned.at !== 2 || returned.zoomed) {
    problems.push('coming back to the slide should show the whole chart — ' + JSON.stringify(returned));
  }
  console.log('✓ Next leaves the slide; coming back shows the chart whole');

  /* --- the spotlight build ---------------------------------------------- */
  const spot = await page.evaluate(async () => {
    const deck = Object.assign(SF.makeDeck('spot'), { theme: 'midnight' });
    SF.Editor.workspace.setDoc(deck);
    const d = SF.Editor.deck();
    d.slides[0] = SF.normalizeSlide(Object.assign(SF.makeSlide('content'), {
      title: 'Why that pie fails',
      bullets: ['Wrong question', 'Angles are hard', 'COVID vanishes', 'Seasons vanish'],
      progressive: true, buildMode: 'spot'
    }));
    SF.Editor.selectSlide(d.slides[0].id);
    SF.Editor.workspace.play({ fullscreen: false });
    const wait = (ms) => new Promise((go) => setTimeout(go, ms));
    await wait(400);
    const read = () => {
      const slide = document.querySelector('#player .slide');
      const steps = Array.from(slide.querySelectorAll('.step'));
      return {
        marked: slide.classList.contains('build-spot'),
        vignette: Number(getComputedStyle(slide, '::after').opacity),
        live: steps.filter((n) => n.classList.contains('step-live')).length,
        opacities: steps.map((n) => Number(Number(getComputedStyle(n).opacity).toFixed(2)))
      };
    };
    const before = read();
    /* The vignette fades in over 500ms — measured before that and this test
       reports a feature that works as broken. */
    SF.Player.next(); await wait(750);
    const one = read();
    SF.Player.next(); SF.Player.next(); await wait(400);
    const three = read();
    return { before: before, one: one, three: three };
  });
  if (!spot.before.marked) problems.push('the slide is not marked as a spotlight build');
  if (spot.before.vignette !== 0) problems.push('the vignette is up before the build starts');
  if (spot.one.vignette !== 1) problems.push('the vignette did not arrive with the first point');
  if (spot.one.live !== 1 || spot.three.live !== 1) {
    problems.push('exactly one point should be live — ' + spot.one.live + '/' + spot.three.live);
  }
  /* Two points behind, held back; the live one at full strength. */
  const dimmed = spot.three.opacities.filter((o) => o > 0 && o < 0.6).length;
  if (dimmed !== 2) problems.push('the points already made are not held back — ' + spot.three.opacities.join(','));
  if (spot.three.opacities[2] !== 1) problems.push('the live point is not at full strength');
  console.log('✓ Spotlight: one live point at 1, the rest at', spot.three.opacities.filter((o) => o > 0 && o < 1)[0]);

  /* --- morph ------------------------------------------------------------- */
  const morph = await page.evaluate(async (table) => {
    if (typeof document.startViewTransition !== 'function') return { unsupported: true };
    const deck = Object.assign(SF.makeDeck('morph'), { theme: 'northeastern' });
    SF.Editor.workspace.setDoc(deck);
    const d = SF.Editor.deck();
    d.slides = [
      SF.normalizeSlide(Object.assign(SF.makeSlide('chart'),
        { chartKind: 'bar', title: 'Six years', body: table, transition: 'morph' })),
      SF.normalizeSlide(Object.assign(SF.makeSlide('chart'),
        { chartKind: 'line', title: 'The same six years', body: table, transition: 'morph' })),
      /* Nothing shared: this one has to fall back rather than misfire. */
      SF.normalizeSlide(Object.assign(SF.makeSlide('content'),
        { title: 'Something else entirely', bullets: ['x'], transition: 'morph' }))
    ];
    SF.Editor.selectSlide(d.slides[0].id);
    SF.Editor.workspace.play({ fullscreen: false });
    const wait = (ms) => new Promise((go) => setTimeout(go, ms));
    await wait(400);
    const named = () => Array.from(document.querySelectorAll('#player .slide *'))
      .filter((n) => n.style && n.style.viewTransitionName)
      .map((n) => n.style.viewTransitionName);
    SF.Player.next(); await wait(80);
    const during = named();
    await wait(800);
    const slides = document.querySelectorAll('#player .slide').length;
    SF.Player.next(); await wait(80);
    const unrelated = named();
    await wait(800);
    return { during: during, slides: slides, unrelated: unrelated,
      left: document.querySelectorAll('#player .slide').length };
  }, TABLE);
  if (morph.unsupported) {
    console.log('… morph skipped: this browser has no view transitions');
  } else {
    if (!morph.during.includes('sf-morph-chart')) {
      problems.push('the shared chart was not named for the morph — ' + morph.during.join(','));
    }
    if (morph.slides !== 1) problems.push('the outgoing slide was left behind — ' + morph.slides);
    if (morph.unrelated.includes('sf-morph-chart')) {
      problems.push('a slide with nothing in common was morphed anyway');
    }
    if (morph.left !== 1) problems.push('the fallback left two slides in the viewport');
    console.log('✓ Morph names the shared chart, and falls back when nothing is shared');
  }

  assert.deepEqual(problems, []);
  assert.deepEqual(errors, []);
  console.log('\nChart callouts, spotlight builds and morph smoke passed.');
} finally {
  await browser.close();
  relay.kill();
}
process.exit(0);
