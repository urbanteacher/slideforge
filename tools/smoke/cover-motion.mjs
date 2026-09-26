#!/usr/bin/env node
/* Smoke: the generated cover backdrop, in a browser, across themes.
 *
 * The unit test covers the names. What needs a real browser is everything that
 * makes it safe to put behind a title: it has to paint in the theme's own
 * colours on a theme whose ground is a gradient, sit under the words, catch no
 * clicks, tell a screen reader nothing, and hold still for anyone who asked
 * for less motion.
 *
 * The colours are the reason this exists. The first version mixed the accent
 * towards --s-bg, which half the themes set to a linear-gradient — color-mix()
 * with a gradient in it is invalid, so the blobs computed to transparent on
 * exactly the themes with the most interesting grounds, and the feature did
 * nothing while looking implemented.
 *
 * Each show goes straight to SF.Player, and the probes render against a deck
 * of their own: the classic editor that used to hold both went with the
 * classic studios.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import harness from '../../tests/harness.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-cover-'));
const port = await harness.freePort();
const relay = await harness.start(port, dir);
const browser = await chromium.launch({ headless: true });
const problems = [];
try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.waitForFunction(() => window.SF?.Player && SF.renderSlide);
  /* The deck the off-screen probes render against. */
  await page.evaluate(() => { window.__probeDeck = Object.assign(SF.makeDeck('w'), { theme: 'midnight' }); });

  /** Render one cover off-screen and report what the backdrop resolved to. */
  const cover = (theme, backdrop, type = 'title') => page.evaluate(({ theme, backdrop, type }) => {
    document.getElementById('cover-probe')?.remove();
    const frame = document.createElement('div');
    frame.id = 'cover-probe';
    Object.assign(frame.style, { position: 'fixed', inset: '0', width: '1280px', height: '720px', zIndex: '99999' });
    const deck = Object.assign(SF.makeDeck('Cover'), { theme: theme });
    const slide = SF.normalizeSlide(Object.assign(SF.makeSlide(type), {
      title: 'Information Presentation & Data Visualisation',
      subtitle: 'LDSCI6253 · Lecture 1',
      design: { backdrop: backdrop }
    }));
    const node = SF.renderSlide(deck, slide, { index: 0, total: 12 });
    frame.appendChild(node);
    document.body.appendChild(frame);

    const layer = node.querySelector('.slide-motion');
    if (!layer) return { layer: null };
    const kids = Array.from(node.children);
    const painted = Array.from(layer.querySelectorAll('.mo'))
      .map((el) => getComputedStyle(el))
      .filter((cs) => cs.display !== 'none')
      .map((cs) => ({ colour: cs.backgroundColor + ' ' + cs.backgroundImage, animation: cs.animationName }));
    const after = getComputedStyle(layer, '::after');
    return {
      layer: layer.className,
      aria: layer.getAttribute('aria-hidden'),
      clicks: getComputedStyle(layer).pointerEvents,
      behindTheWords: kids.indexOf(layer) < kids.indexOf(node.querySelector('.pad')),
      painted: painted,
      afterAnimation: after.content === 'none' ? '' : after.animationName
    };
  }, { theme, backdrop, type });

  /* A ground that is a flat colour, and three that are gradients. */
  for (const theme of ['ukbt', 'northeastern', 'midnight', 'paper', 'studio']) {
    for (const backdrop of ['drift', 'grid', 'glow']) {
      const seen = await cover(theme, backdrop);
      const where = theme + '/' + backdrop;
      if (!seen.layer) { problems.push(where + ': no backdrop layer at all'); continue; }
      if (!/motion-/.test(seen.layer)) problems.push(where + ': layer is unnamed — ' + seen.layer);
      if (seen.aria !== 'true') problems.push(where + ': backdrop is not hidden from a screen reader');
      if (seen.clicks !== 'none') problems.push(where + ': backdrop catches clicks');
      if (!seen.behindTheWords) problems.push(where + ': backdrop is not behind the pad');
      /* Something visible, and it must not be transparent — which is what a
         color-mix() against a gradient token computes to. */
      const visible = seen.painted.filter((p) =>
        !/rgba\(0, 0, 0, 0\)/.test(p.colour) || /gradient/.test(p.colour));
      if (!visible.length && !seen.afterAnimation) {
        problems.push(where + ': nothing paints — ' + JSON.stringify(seen.painted));
      }
      /* And it moves: either a blob animation or the travelling grid. */
      const moving = seen.painted.some((p) => p.animation && p.animation !== 'none') ||
        (seen.afterAnimation && seen.afterAnimation !== 'none');
      if (!moving) problems.push(where + ': nothing is animating');
    }
  }
  console.log('✓ Five themes × three backdrops: painted in theme colour, behind the words, silent to a reader');

  /* A section slide is the other full-bleed layout and gets the same. */
  const section = await cover('midnight', 'drift', 'section');
  if (!section.layer) problems.push('a section slide got no backdrop');
  /* And a layout with content on it gets none: it would sit under the words. */
  const content = await cover('midnight', 'drift', 'content');
  if (content.layer) problems.push('a content slide should not take a cover backdrop');
  console.log('✓ Covers only — title and section, not a slide with content on it');

  /* Reduced motion keeps the ground and drops the movement. */
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const still = await cover('midnight', 'drift');
  const stillMoving = still.painted.some((p) => p.animation && p.animation !== 'none');
  if (stillMoving) problems.push('reduced motion: the backdrop is still animating');
  if (!still.painted.length) problems.push('reduced motion: the ground went with the motion');
  console.log('✓ Reduced motion holds the ground still rather than removing it');
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  /* --- words arriving one at a time ------------------------------------- */
  const words = await page.evaluate(() => {
    const deck = Object.assign(SF.makeDeck('w'), { theme: 'midnight' });
    const build = (extra) => {
      const slide = SF.normalizeSlide(Object.assign(SF.makeSlide('statement'), extra));
      const node = SF.renderSlide(deck, slide, { index: 0, total: 1 });
      return node.querySelector('.statement');
    };
    const rise = build({ body: 'Every chart is a choice', design: { words: 'rise' } });
    const plain = build({ body: 'Every chart is a choice' });
    /* The author's own bold has to survive being cut into words. */
    const bold = build({
      body: 'Every chart is a choice',
      formatting: { body: { text: 'Every chart is a choice', marks: [{ kind: 'bold', value: true, start: 6, end: 11 }] } },
      design: { words: 'rise' }
    });
    /* Long prose is not kinetic type; the wrap gives up rather than making
       four hundred spans. */
    const essay = build({ body: new Array(60).fill('word').join(' '), design: { words: 'rise' } });
    return {
      classes: rise.className,
      count: rise.querySelectorAll('.w').length,
      delays: Array.from(rise.querySelectorAll('.w')).map((w) => parseInt(w.style.getPropertyValue('--d'), 10)),
      spacesKept: /\s/.test(rise.textContent.replace(/\u00a0/g, ' ')),
      text: rise.textContent,
      plainHasSpans: plain.querySelectorAll('.w').length,
      boldKept: !!bold.querySelector('[style*="font-weight"]'),
      boldWords: bold.querySelectorAll('.w').length,
      essaySpans: essay.querySelectorAll('.w').length
    };
  });
  if (!/words words-rise/.test(words.classes)) problems.push('words: the effect is not on the line — ' + words.classes);
  if (words.count !== 5) problems.push('words: expected five spans, got ' + words.count);
  if (words.text !== 'Every chart is a choice') problems.push('words: the line no longer reads the same — ' + words.text);
  if (!words.spacesKept) problems.push('words: the spaces between them were eaten');
  if (words.plainHasSpans) problems.push('words: a statement with no effect should not be cut up');
  if (!words.boldKept) problems.push("words: the author's bold was lost in the wrap");
  if (words.boldWords !== 5) problems.push('words: formatting changed the word count — ' + words.boldWords);
  if (words.essaySpans) problems.push('words: sixty words should not be animated one at a time');
  /* Eased, not linear: each delay is later than the last, and the gaps shrink. */
  const gaps = words.delays.slice(1).map((d, i) => d - words.delays[i]);
  if (!gaps.every((g) => g > 0)) problems.push('words: the stagger is not in order — ' + words.delays.join(','));
  if (!(gaps[0] > gaps[gaps.length - 1])) {
    problems.push('words: the stagger is linear rather than eased — ' + gaps.join(','));
  }
  console.log('✓ Words arrive in an eased wave —', words.delays.join('ms, ') + 'ms, formatting intact');

  /* In the show they animate. (That they held still in the classic editor's
     #previewBox is no longer checked: that editor went with the classic studios,
     and the lab draws its own canvas.) */
  const playing = await page.evaluate(async () => {
    const d = Object.assign(SF.makeDeck('w'), { theme: 'midnight' });
    d.slides[0] = SF.normalizeSlide(Object.assign(SF.makeSlide('statement'),
      { body: 'Every chart is a choice', design: { words: 'rise' } }));
    SF.Player.start(d, 0, { fullscreen: false });
    await new Promise((go) => setTimeout(go, 200));
    const onWall = Array.from(document.querySelectorAll('#player .statement .w'))
      .map((w) => getComputedStyle(w).animationName);
    return { onWall: onWall };
  });
  if (!playing.onWall.length || !playing.onWall.every((n) => n === 'sf-word-rise')) {
    problems.push('words: the entrance does not run in the show — ' + playing.onWall.join(','));
  }
  console.log('✓ It plays on the wall');

  /* --- and it still reads as a sentence ---------------------------------- */
  /* Splitting text into LETTERS is an accessibility disaster — Roselli tested
     eight screen-reader/browser pairs and six failed, from "text never
     announced" to letters read one at a time. Splitting into WORDS with the
     spaces left as real text nodes should be invisible to the tree; this
     proves it rather than assuming it, because a future change to per-letter
     effects would break silently. */
  const trees = await page.evaluate(() => {
    const build = (design) => {
      const slide = SF.normalizeSlide(Object.assign(SF.makeSlide('statement'),
        { body: 'Every chart is a choice', subtitle: 'LDSCI6253', design: design }));
      const node = SF.renderSlide(window.__probeDeck, slide, { index: 0, total: 1 });
      const line = node.querySelector('.statement');
      return { spans: line.querySelectorAll('.w').length, text: line.textContent };
    };
    return { plain: build({}), split: build({ words: 'rise' }) };
  });
  if (trees.split.spans < 5) problems.push('the words were not split at all');
  if (trees.plain.spans) problems.push('an unsplit statement has word spans');
  if (trees.plain.text !== trees.split.text) {
    problems.push('splitting changed the text: ' + JSON.stringify(trees.split.text));
  }
  const plainTree = (await page.evaluate(() => {
    document.getElementById('a11y-probe')?.remove();
    const frame = document.createElement('div');
    frame.id = 'a11y-probe';
    Object.assign(frame.style, { position: 'fixed', inset: '0', width: '1280px', height: '720px' });
    const slide = SF.normalizeSlide(Object.assign(SF.makeSlide('statement'),
      { body: 'Every chart is a choice', subtitle: 'LDSCI6253' }));
    frame.appendChild(SF.renderSlide(window.__probeDeck, slide, { index: 0, total: 1 }));
    document.body.appendChild(frame);
    return true;
  }), await page.locator('#a11y-probe').ariaSnapshot());
  const splitTree = (await page.evaluate(() => {
    document.getElementById('a11y-probe')?.remove();
    const frame = document.createElement('div');
    frame.id = 'a11y-probe';
    Object.assign(frame.style, { position: 'fixed', inset: '0', width: '1280px', height: '720px' });
    const slide = SF.normalizeSlide(Object.assign(SF.makeSlide('statement'),
      { body: 'Every chart is a choice', subtitle: 'LDSCI6253', design: { words: 'rise' } }));
    frame.appendChild(SF.renderSlide(window.__probeDeck, slide, { index: 0, total: 1 }));
    document.body.appendChild(frame);
    return true;
  }), await page.locator('#a11y-probe').ariaSnapshot());
  if (plainTree.trim() !== splitTree.trim()) {
    problems.push('the split changed the accessibility tree:\n  plain: ' +
      plainTree.trim() + '\n  split: ' + splitTree.trim());
  }
  await page.evaluate(() => document.getElementById('a11y-probe')?.remove());
  console.log('✓ The accessibility tree is the same split or not —', JSON.stringify(splitTree.trim().slice(0, 48)));

  /* --- the two controls, in a browser ------------------------------------ */
  const knobs = await page.evaluate(() => {
    const read = (design) => {
      const slide = SF.normalizeSlide(Object.assign(SF.makeSlide('statement'),
        { body: 'Every chart is a choice', design: design }));
      const line = SF.renderSlide(window.__probeDeck, slide, { index: 0, total: 1 })
        .querySelector('.statement');
      return {
        dur: line.style.getPropertyValue('--w-dur'),
        cycle: line.style.getPropertyValue('--w-cycle'),
        delays: Array.from(line.querySelectorAll('.w')).map((w) => parseInt(w.style.getPropertyValue('--d'), 10))
      };
    };
    return {
      gentle: read({ words: 'rise', wordSpeed: 'gentle' }),
      quick: read({ words: 'rise', wordSpeed: 'quick' }),
      together: read({ words: 'rise', wordStagger: 'together' }),
      one: read({ words: 'rise', wordStagger: 'one' })
    };
  });
  const last = (r) => r.delays[r.delays.length - 1];
  if (!(parseInt(knobs.gentle.dur, 10) > parseInt(knobs.quick.dur, 10))) {
    problems.push('speed: gentle is not slower than quick — ' + knobs.gentle.dur + ' vs ' + knobs.quick.dur);
  }
  if (!(last(knobs.gentle) > last(knobs.quick))) {
    problems.push('speed: the wave does not follow the speed — ' + last(knobs.gentle) + ' vs ' + last(knobs.quick));
  }
  if (knobs.together.delays.some((d) => d !== 0)) {
    problems.push('spacing: "together" still staggers — ' + knobs.together.delays.join(','));
  }
  if (!(last(knobs.one) > last(knobs.quick))) {
    problems.push('spacing: "one at a time" is not the widest spread');
  }
  /* The origin of the wave, as delays on the page: first-to-last ascends,
     last-to-first descends, and centre-out is symmetric with its middle at
     zero — the shape is the whole feature, so it is checked as a shape. */
  const origins = await page.evaluate(() => {
    const delays = (from) => {
      const slide = SF.normalizeSlide(Object.assign(SF.makeSlide('statement'),
        { body: 'Every chart is a choice', design: { words: 'rise', wordStagger: 'one', wordFrom: from } }));
      const line = SF.renderSlide(window.__probeDeck, slide, { index: 0, total: 1 })
        .querySelector('.statement');
      return Array.from(line.querySelectorAll('.w'))
        .map((w) => parseInt(w.style.getPropertyValue('--d'), 10));
    };
    return { first: delays('first'), center: delays('center'), last: delays('last') };
  });
  const rising = (a) => a.every((v, i) => i === 0 || v > a[i - 1]);
  if (!rising(origins.first)) problems.push('first-to-last is not in order — ' + origins.first.join(','));
  if (!rising([...origins.last].reverse())) problems.push('last-to-first is not reversed — ' + origins.last.join(','));
  const c = origins.center;
  if (c[2] !== 0) problems.push('centre-out does not lead with the middle word — ' + c.join(','));
  if (c[0] !== c[4] || c[1] !== c[3]) problems.push('centre-out is not symmetric — ' + c.join(','));
  if (!(c[0] > c[1])) problems.push('centre-out does not reach the ends last — ' + c.join(','));
  console.log('✓ The wave can start anywhere — centre-out is', c.join('/'));

  console.log('✓ Speed and spacing reach the slide — gentle', knobs.gentle.dur,
    'quick', knobs.quick.dur + ', together', knobs.together.delays.join('/'),
    'one at a time', knobs.one.delays.join('/'));

  /* --- and leaving again ------------------------------------------------- */
  /* The property that matters for a cover left on screen: the words come
     back. An entrance that only runs once looks identical for the first six
     seconds and then stops for good. */
  const cycle = await page.evaluate(async () => {
    const d = Object.assign(SF.makeDeck('loop'), { theme: 'midnight' });
    d.slides[0] = SF.normalizeSlide(Object.assign(SF.makeSlide('statement'),
      { body: 'Every chart is a choice', design: { words: 'rise', wordsLoop: true } }));
    SF.Player.start(d, 0, { fullscreen: false });
    const first = () => document.querySelector('#player .statement .w');
    const wait = (ms) => new Promise((go) => setTimeout(go, ms));
    await wait(150);
    const style = getComputedStyle(first());
    const read = () => Number(getComputedStyle(first()).opacity);
    /* Sampled as fractions of the cycle the slide is actually using, not at
       fixed times: pinned to 2.4s and 5.3s, this leg reported "the words did
       not come back" the first time the cycle was retuned, which is a test
       measuring its own assumptions. */
    const cycle = parseFloat(style.animationDuration) * 1000 || 7000;
    const atFraction = async (f) => {
      const target = cycle * f;
      await wait(Math.max(0, target - (Date.now() - t0)));
      return read();
    };
    const t0 = Date.now();
    const held = await atFraction(0.34);      /* mid-hold */
    const leaving = await atFraction(0.74);   /* the wave out */
    const back = await atFraction(1.16);      /* round again, and arrived */
    return { name: style.animationName, repeats: style.animationIterationCount,
      cycle: cycle, held: held, leaving: leaving, back: back };
  });
  if (cycle.name !== 'sf-cycle-rise') problems.push('cycle: wrong animation — ' + cycle.name);
  if (cycle.repeats !== 'infinite') problems.push('cycle: it does not repeat — ' + cycle.repeats);
  if (!(cycle.held > 0.9)) problems.push('cycle: the words are not solid during the hold — ' + cycle.held);
  if (!(cycle.leaving < 0.6)) problems.push('cycle: the words never leave — ' + cycle.leaving);
  if (!(cycle.back > 0.6)) problems.push('cycle: the words did not come back — ' + cycle.back);
  console.log('✓ In, hold, out, round again — over', cycle.cycle + 'ms: held', cycle.held +
    ', leaving', cycle.leaving + ', back', cycle.back);
  await page.keyboard.press('Escape');

  /* --- the arcs a choreography can land with ----------------------------- */
  /* These three are the reason a plan is more than a start position. The
     numbers say where a word comes from; the arc says what it does when it
     gets there, and only a browser can answer whether it really does it. */
  const staged = async (plan, line) => {
    await page.evaluate(([plan, line]) => {
      const d = Object.assign(SF.makeDeck('arc'), { theme: 'midnight' });
      d.slides[0] = SF.normalizeSlide(Object.assign(SF.makeSlide('statement'), {
        body: line,
        design: Object.assign({ words: 'rise', wordSpeed: 'gentle' },
          plan ? { wordPlan: plan } : {})
      }));
      SF.Player.start(d, 0, { fullscreen: false });
    }, [plan, line]);
    await page.waitForTimeout(140);
  };
  const LINE = 'Every chart is a choice';
  const at = (over) => Object.assign({ dx: 0, dy: 0, rot: 0, scale: 1, blur: 0, delay: 0 }, over);
  const every = (over) => Array.from({ length: 5 }, () => at(over));

  /* A bounce has to cross the resting place. A settle approaches zero and
     stops; if this leg ever reports no crossing, the arc has quietly become
     an ease with extra keyframes. */
  await staged({ text: LINE, unit: 'word', words: every({ dx: -2, arc: 'bounce' }) }, LINE);
  const bounce = await page.evaluate(async () => {
    const w = document.querySelector('#player .statement.words-plan .w');
    const dur = parseFloat(getComputedStyle(w).animationDuration) * 1000;
    const wait = (ms) => new Promise((go) => setTimeout(go, ms));
    const xs = [];
    for (let i = 0; i <= 20; i++) {
      xs.push(+new DOMMatrixReadOnly(getComputedStyle(w).transform).m41.toFixed(2));
      await wait(dur / 20);
    }
    return { name: getComputedStyle(w).animationName, xs: xs };
  });
  if (bounce.name !== 'sf-word-plan-bounce') problems.push('bounce: wrong keyframes — ' + bounce.name);
  const past = Math.max(...bounce.xs);
  const crossings = bounce.xs.filter((x, i) => i && (x > 0) !== (bounce.xs[i - 1] > 0)).length;
  if (!(bounce.xs[0] < -40)) problems.push('bounce: it did not start off to the left — ' + bounce.xs[0]);
  if (!(past > 5)) problems.push('bounce: it never passes the resting place — furthest ' + past);
  /* Out past rest, back, and out again: a landing, not one overshoot. */
  if (crossings < 3) problems.push('bounce: only ' + crossings + ' crossings — that is a single overshoot');
  if (bounce.xs[bounce.xs.length - 1] !== 0) problems.push('bounce: it does not come to rest');
  console.log('✓ Bounce crosses the resting place', crossings, 'times, furthest', past + 'px past it');

  /* Mist is an ordering claim: in place BEFORE it is in focus. The arc also
     supplies its own fog, so asking for mist with blur 0 still mists. */
  await staged({ text: LINE, unit: 'word', words: every({ dy: 0.6, blur: 0, arc: 'mist' }) }, LINE);
  const mist = await page.evaluate(async () => {
    const w = document.querySelector('#player .statement.words-plan .w');
    const dur = parseFloat(getComputedStyle(w).animationDuration) * 1000;
    const wait = (ms) => new Promise((go) => setTimeout(go, ms));
    const out = [];
    for (let i = 0; i <= 10; i++) {
      const cs = getComputedStyle(w);
      out.push({ y: Math.abs(+new DOMMatrixReadOnly(cs.transform).m42.toFixed(1)),
        blur: +(/blur\(([\d.]+)px\)/.exec(cs.filter)?.[1] ?? 0) });
      await wait(dur / 10);
    }
    return { name: getComputedStyle(w).animationName, out: out, start: out[0] };
  });
  if (mist.name !== 'sf-word-plan-mist') problems.push('mist: wrong keyframes — ' + mist.name);
  if (!(mist.start.blur > 3)) problems.push('mist: the arc supplied no fog of its own — ' + mist.start.blur);
  const half = mist.out[5];
  const travelled = 1 - half.y / Math.max(mist.start.y, 0.01);
  const cleared = 1 - half.blur / Math.max(mist.start.blur, 0.01);
  if (!(travelled > cleared + 0.15)) {
    problems.push('mist: focus is not lagging the move — travelled ' +
      travelled.toFixed(2) + ', cleared ' + cleared.toFixed(2));
  }
  if (mist.out[10].blur !== 0) problems.push('mist: it never comes into focus');
  console.log('✓ Mist arrives before it focuses — half way through,',
    Math.round(travelled * 100) + '% moved but only', Math.round(cleared * 100) + '% cleared');

  /* --- letter by letter -------------------------------------------------- */
  const letters = Array.from({ length: 19 }, (unused, i) => at({ dy: -0.3, blur: 2, delay: i * 70 }));
  await staged({ text: LINE, unit: 'letter', words: letters }, LINE);
  await page.waitForTimeout(250);
  const split = await page.evaluate(() => {
    const line = document.querySelector('#player .statement');
    const words = Array.from(line.querySelectorAll('.wword'));
    const boxes = Array.from(line.querySelectorAll('.w'));
    return {
      letters: boxes.length, words: words.length,
      wordText: words.map((n) => n.textContent),
      display: words[0] && getComputedStyle(words[0]).display,
      /* Each word is one box, so a word can never be broken across lines —
         which is what animating letters would otherwise allow. */
      rows: new Set(words.map((n) => Math.round(n.getBoundingClientRect().top))).size,
      delays: boxes.slice(0, 3).map((n) => getComputedStyle(n).animationDelay),
      hidden: words.every((n) => n.getAttribute('aria-hidden') === 'true'),
      said: line.querySelector('.sr-only') && line.querySelector('.sr-only').textContent,
      wide: boxes.every((n) => n.getBoundingClientRect().width > 0)
    };
  });
  if (split.letters !== 19) problems.push('letters: ' + split.letters + ' boxes, expected 19');
  if (split.words !== 5) problems.push('letters: the words did not stay whole — ' + split.words + ' boxes');
  if (split.wordText.join(' ') !== LINE) problems.push('letters: the words read ' + split.wordText.join('|'));
  if (split.display !== 'inline-block') problems.push('letters: a word is not one box — ' + split.display);
  if (!split.wide) problems.push('letters: a letter box has no width');
  if (split.delays[0] === split.delays[1]) problems.push('letters: they all arrive together — ' + split.delays.join(','));

  /* The part that is easy to get wrong and invisible when you do. Nineteen
     one-character elements are read out as "E v e r y c h a r t" unless the
     split is hidden and the sentence handed back whole. Proved by comparing
     the tree with the same line unsplit, rather than by reasoning about it. */
  if (!split.hidden) problems.push('letters: the split is exposed to the accessibility tree');
  if (split.said !== LINE) problems.push('letters: the line was not handed back whole — ' + split.said);
  const spelled = await page.locator('#player .statement').ariaSnapshot();
  await staged(null, LINE);
  await page.waitForTimeout(250);
  const plain = await page.locator('#player .statement').ariaSnapshot();
  if (spelled !== plain) {
    problems.push('letters: a screen reader does not hear the same line —\n  split: ' +
      JSON.stringify(spelled) + '\n  plain: ' + JSON.stringify(plain));
  }
  console.log('✓ 19 letters in 5 unbreakable words on', split.rows,
    'rows, and a screen reader hears', JSON.stringify(plain.replace(/^- text: /, '')));
  await page.keyboard.press('Escape');

  assert.deepEqual(problems, []);
  assert.deepEqual(errors, []);
  console.log('\nCover motion smoke passed.');
} finally {
  await browser.close();
  relay.kill();
}
process.exit(0);
