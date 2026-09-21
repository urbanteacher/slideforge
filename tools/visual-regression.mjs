#!/usr/bin/env node
/* SlideForge Visual Regression Baseline Suite
 *
 * Captures and verifies deterministic 1280x720 slide screenshots: every game
 * style across every theme, plus a set of slide layouts.
 *
 * The layouts are here because every layout bug found in the September 2026
 * session — a fourth card clipped off the bottom, an image caption running
 * past the slide edge, a line chart's end-label cut mid-word, a gallery credit
 * below the fold — was caught by eye and none would have been caught twice.
 * Each fixture below is shaped to hold one of those open.
 *
 * Layouts run against three themes rather than all seven. Studio and
 * northeastern are the two carrying per-layout overrides, and midnight is the
 * plain case; a geometry regression shows up in any of them, while the full
 * matrix would add ~22MB of PNGs to a baseline directory already at 40MB.
 * Widen LAYOUT_THEMES if that trade stops being worth it.
 *
 * Usage:
 *   node tools/visual-regression.mjs --update          # Capture and write baseline images
 *   node tools/visual-regression.mjs --check           # Check against baselines (default)
 *   node tools/visual-regression.mjs --style choice    # Check a single style
 *   node tools/visual-regression.mjs --theme studio    # Check a single theme
 *   node tools/visual-regression.mjs --update --style choice --theme midnight
 */
import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const BASELINES_DIR = path.join(ROOT, 'tools', 'baselines');
const DIFFS_DIR = path.join(BASELINES_DIR, 'diffs');

const args = process.argv.slice(2);
const isUpdate = args.includes('--update');
const styleArgIdx = args.indexOf('--style');
const filterStyle = styleArgIdx >= 0 && args[styleArgIdx + 1] ? args[styleArgIdx + 1].trim() : null;
const themeArgIdx = args.indexOf('--theme');
const filterTheme = themeArgIdx >= 0 && args[themeArgIdx + 1] ? args[themeArgIdx + 1].trim() : null;
const thresholdArgIdx = args.indexOf('--threshold');
const diffThreshold = thresholdArgIdx >= 0 && args[thresholdArgIdx + 1]
  ? parseFloat(args[thresholdArgIdx + 1])
  : 0.001; // 0.1% of pixels max tolerance for subpixel antialiasing
const testDiff = args.includes('--test-diff');

/* One fixture per thing that can go wrong, named for what it holds open. */
const LAYOUT_CASES = [
  'layout-title', 'layout-section', 'layout-content', 'layout-cards3',
  'layout-cards4', 'layout-cards7', 'layout-keywords', 'layout-quote',
  'layout-table', 'layout-split', 'layout-image-caption', 'layout-gallery',
  'layout-chart-bar', 'layout-chart-line', 'layout-chart-pie',
  /* Added 2026-09-18. The list above covered 11 of 38 slide types, and the
     September bugs all landed in the other 27: a compare table six rows deep
     ran 26px past its frame, a beforeafter rendered two empty frames because
     its images were read from the wrong field, and a split with a cover image
     cropped a three-part diagram to its middle third while printing white
     caption text on a red gradient. Each fixture below holds one of those
     open. Written out rather than borrowed from a lesson, for the reason in
     the block comment at the top of the layout branch. */
  'layout-statement', 'layout-keyfact', 'layout-italics', 'layout-links',
  'layout-journey', 'layout-stats', 'layout-compare', 'layout-compare6',
  'layout-funnel', 'layout-timeline', 'layout-iceberg', 'layout-spectrum',
  'layout-sourcecheck', 'layout-beforeafter', 'layout-split-cover'
];
const LAYOUT_THEMES = ['northeastern', 'studio', 'midnight'];

let spawnedServer = null;

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => {
      const port = s.address().port;
      s.close(() => resolve(port));
    });
    s.on('error', reject);
  });
}

function isPortOpen(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const s = net.createConnection({ port, host, timeout: 600 }, () => {
      s.destroy();
      resolve(true);
    });
    s.on('error', () => resolve(false));
    s.on('timeout', () => {
      s.destroy();
      resolve(false);
    });
  });
}

async function startServerIfNeeded() {
  if (process.env.SF_URL) {
    const u = new URL(process.env.SF_URL);
    return { url: process.env.SF_URL, port: Number(u.port) || 80, spawned: false };
  }

  const defaultPort = 8787;
  const isDefaultRunning = await isPortOpen(defaultPort);
  if (isDefaultRunning) {
    return { url: `http://127.0.0.1:${defaultPort}/`, port: defaultPort, spawned: false };
  }

  const port = await freePort();
  const child = spawn(process.execPath, ['server/server.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1' },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  spawnedServer = child;

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Server startup timed out')), 8000);
    child.stdout.on('data', (d) => {
      if (String(d).includes('SlideForge is running')) {
        clearTimeout(timer);
        resolve();
      }
    });
    child.on('exit', (c) => {
      clearTimeout(timer);
      reject(new Error('Server exited unexpectedly with code ' + c));
    });
  });

  return { url: `http://127.0.0.1:${port}/`, port, spawned: true };
}

/**
 * Hold the shot until the slide's decoration has actually arrived.
 *
 * A theme hangs its art on elements whose pictures come from CSS, not from
 * markup: Northeastern's monogram is an SVG `mask` and the London skyline is a
 * `background-image`. Neither is an <img>, so nothing in the page reports them
 * as pending — no load event, no decode() to await, and document.fonts.ready
 * says nothing about either.
 *
 * Waiting for the element instead does not work. Measured at the instant the
 * old code took the screenshot, .nu-n already had its full 900px box while
 * performance.getEntriesByType('resource') held no entry for the monogram at
 * all: the browser lays the element out first and only fetches a CSS image
 * when it comes to paint it. So "exists and has non-zero layout" is true a
 * frame before there is anything to see, which is precisely the window the
 * flake lived in — the shot either caught the paint or caught a blank
 * 900x694 gap, with nothing in between. Hence 13.87%, every time, or nothing.
 *
 * So the URLs are read back out of the computed styles and loaded explicitly.
 * Once each one has been through an Image, it is in the cache and the next
 * paint has it. Errors resolve rather than reject: a missing asset should
 * fail as a visual diff that shows which asset is missing, not as a suite
 * that hangs for thirty seconds.
 */
async function waitForSlideArt(page, selector) {
  await page.evaluate(async (root) => {
    const stage = document.querySelector(root);
    if (!stage) return;
    /* Every way a stylesheet can name a picture, on the elements and on their
       generated boxes — the skyline and the monogram are on real elements,
       but other themes draw their art in ::before and ::after. */
    const PROPS = ['backgroundImage', 'maskImage', 'webkitMaskImage',
      'borderImageSource', 'listStyleImage'];
    const urls = new Set();
    const collect = (node, pseudo) => {
      const cs = getComputedStyle(node, pseudo || undefined);
      for (const prop of PROPS) {
        const value = cs[prop];
        if (!value || value === 'none') continue;
        /* One declaration can carry several, and image-set() nests them. */
        for (const m of value.matchAll(/url\((['"]?)([^'")]+)\1\)/g)) {
          if (!m[2].startsWith('data:')) urls.add(m[2]);
        }
      }
    };
    for (const node of [stage, ...stage.querySelectorAll('*')]) {
      collect(node, null);
      collect(node, '::before');
      collect(node, '::after');
    }
    /* Across a run of several hundred shots the same dozen theme assets come
       round again and again; re-Imaging a cached URL costs a promise and a
       task per shot for nothing. The page outlives the shots, so what has
       already been through here is remembered on it. */
    const seen = (window.__vrLoadedArt = window.__vrLoadedArt || new Set());
    const fresh = [...urls].filter((url) => !seen.has(url));
    await Promise.all(fresh.map((url) => new Promise((done) => {
      const img = new Image();
      img.onload = img.onerror = () => { seen.add(url); done(); };
      img.src = url;
    })));
    await document.fonts.ready;
    /* Two frames: the first schedules the paint that now has its pictures,
       the second is after it has been composited. */
    await new Promise((go) => requestAnimationFrame(() => requestAnimationFrame(go)));
  }, selector);
}

function cleanup() {
  if (spawnedServer) {
    try {
      spawnedServer.kill('SIGTERM');
    } catch (e) {}
    spawnedServer = null;
  }
}

process.on('exit', cleanup);
process.on('SIGINT', () => { cleanup(); process.exit(130); });
process.on('SIGTERM', () => { cleanup(); process.exit(143); });

async function run() {
  console.log('\n======================================================');
  console.log('   SlideForge Visual Regression Baseline Suite');
  console.log('======================================================');
  console.log(`Mode:      ${isUpdate ? 'UPDATE (writing baseline images)' : 'CHECK (verifying against stored baselines)'}`);
  if (filterStyle) console.log(`Filter:    style="${filterStyle}"`);
  if (filterTheme) console.log(`Filter:    theme="${filterTheme}"`);
  console.log(`Tolerance: ${(diffThreshold * 100).toFixed(2)}% pixel mismatch\n`);

  fs.mkdirSync(BASELINES_DIR, { recursive: true });
  fs.mkdirSync(DIFFS_DIR, { recursive: true });

  const serverInfo = await startServerIfNeeded();
  console.log(`✓ Relay server ready at ${serverInfo.url} (spawned: ${serverInfo.spawned})`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(serverInfo.url, { waitUntil: 'domcontentloaded', timeout: 20000 });

  const catalog = await page.evaluate(() => {
    return {
      styles: Object.keys(window.SF?.GAME_STYLES || {}),
      themes: Object.keys(window.SF?.THEMES || {})
    };
  });

  /* --style names a game style or a layout fixture; both are captures. */
  if (filterStyle && !catalog.styles.includes(filterStyle) && !LAYOUT_CASES.includes(filterStyle)) {
    console.error(`Unknown capture: "${filterStyle}".\nGame styles: ${catalog.styles.join(', ')}`
      + `\nLayouts: ${LAYOUT_CASES.join(', ')}`);
    await browser.close();
    cleanup();
    process.exit(1);
  }

  if (filterTheme && !catalog.themes.includes(filterTheme)) {
    console.error(`Unknown theme: "${filterTheme}".\nValid themes: ${catalog.themes.join(', ')}`);
    await browser.close();
    cleanup();
    process.exit(1);
  }

  const styles = filterStyle
    ? (catalog.styles.includes(filterStyle) ? [filterStyle] : [])
    : catalog.styles;
  const themes = filterTheme ? [filterTheme] : catalog.themes;

  const combinations = [];
  for (const style of styles) {
    for (const theme of themes) {
      combinations.push({ style, theme, kind: 'game' });
    }
  }

  /* --style and --theme filter the layouts too, so a single failing fixture
     can be re-run on its own the same way a game style can. */
  const layoutCases = filterStyle
    ? LAYOUT_CASES.filter((c) => c === filterStyle)
    : LAYOUT_CASES;
  const layoutThemes = filterTheme
    ? LAYOUT_THEMES.filter((t) => t === filterTheme)
    : LAYOUT_THEMES;
  for (const layout of layoutCases) {
    for (const theme of layoutThemes) {
      combinations.push({ style: layout, theme, kind: 'layout' });
    }
  }

  console.log(`Testing ${combinations.length} captures — `
    + `${styles.length} game styles × ${themes.length} themes, `
    + `${layoutCases.length} layouts × ${layoutThemes.length} themes...\n`);

  let passed = 0;
  let updated = 0;
  let failed = 0;
  const failures = [];
  const startTime = Date.now();

  for (let idx = 0; idx < combinations.length; idx++) {
    const { style, theme, kind } = combinations[idx];
    const key = `${style}--${theme}`;
    const baselinePath = path.join(BASELINES_DIR, `${key}.png`);
    const baselineExists = fs.existsSync(baselinePath);

    // 1. Render deterministic slide in browser
    await page.evaluate(({ st, th, injectTestDiff, kind }) => {
      /* Bingo deals each card with Math.random (js/bingo.js), which is right
         for the game — every participant should get a different card — and
         fatal for a baseline, because the render differs every run. Before
         this, bingo failed by ~0.5% immediately after being updated, against
         a baseline written seconds earlier.
         Seed it here rather than in the product: the randomness is wanted,
         it is only this harness that needs the same card twice. */
      const realRandom = Math.random;
      let seed = 0x2f6e2b1;
      Math.random = function () {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 0x100000000;
      };
      try {
      let rd, slide;
      if (kind === 'layout') {
        /* Fixtures are written out rather than borrowed from a lesson, so a
           baseline never moves because somebody edited the lecture. Content is
           sized to the failure it holds open: four cards because a fourth used
           to fall off the bottom, a chart with long series names because an
           end-label used to be cut mid-word, a gallery layer with a source
           line because that line used to sit below the fold. */
        const bullets = (n, text) => Array.from({ length: n }, (_, i) => text + ' ' + (i + 1)
          + ' — enough words on this line to wrap at least once in a narrow column.');
        const build = {
          'layout-title': { type: 'title', title: 'A course title\nover two lines', subtitle: 'Week 1 · Lecture 1' },
          'layout-section': { type: 'section', title: 'A section break', subtitle: 'The pause before the next idea.' },
          'layout-content': { type: 'content', title: 'Bullets that wrap', bullets: bullets(4, 'Point') },
          'layout-cards3': { type: 'cards', title: 'Three cards', bullets: bullets(3, 'Card') },
          'layout-cards4': { type: 'cards', title: 'Four cards — the one that used to clip', bullets: bullets(4, 'Card') },
          'layout-cards7': { type: 'cards', title: 'Seven cards — four across, two rows', bullets: bullets(7, 'Card') },
          'layout-keywords': { type: 'keywords', title: 'Keywords', bullets: [
            'PLAN\tdefine purpose and audience; establish success metrics',
            'PREPARE\tclean and validate; inspect outliers; tidy the shape',
            'PRESENT\tchoose the idiom; build hierarchy; annotate',
            'POLISH\ttest for accessibility; verify; optimise for the medium'] },
          'layout-quote': { type: 'quote', body: 'A long enough quotation that it has to wrap across more than a single line on the slide.', subtitle: 'Attributed to someone' },
          'layout-table': { type: 'table', title: 'A table', body: 'Area|Leave|Remain\nBoston|75|25\nBristol|38|62\nLambeth|21|79' },
          'layout-split': { type: 'split', title: 'Image and text', bullets: bullets(3, 'Point'),
            image: 'assets/brand/nu-london-skyline.png', imageFit: 'contain',
            subtitle: 'Northeastern University London' },
          'layout-image-caption': { type: 'image', title: 'A caption over an image', subtitle: 'Source · a credit line that used to be clipped',
            image: 'assets/brand/nu-london-skyline.png', imageFit: 'contain',
            design: { imageFrame: '4:3', capStyle: 'bar' } },
          'layout-gallery': { type: 'gallery', title: 'An image stack', imageFit: 'contain',
            design: { imageFrame: '4:3' },
            layers: [
              { image: 'assets/lesson/anscombe/anscombe-i.svg', caption: 'Dataset I — a straight relationship', source: 'Anscombe, F.J. (1973)' },
              { image: 'assets/lesson/anscombe/anscombe-ii.svg', caption: 'Dataset II — a curve, not a line', source: 'Anscombe, F.J. (1973)' }] },
          'layout-chart-bar': { type: 'chart', chartKind: 'bar', title: 'Bar chart',
            body: 'Area|Leave %|Remain %\nBoston|75|25\nBlackpool|67|33\nBristol|38|62\nCambridge|26|74' },
          'layout-chart-line': { type: 'chart', chartKind: 'line', title: 'Line chart with long series names',
            body: 'Year|Boston|Cambridge|Bristol\n1996|41|22|35\n2006|58|25|38\n2016|75|26|38' },
          'layout-chart-pie': { type: 'chart', chartKind: 'pie', title: 'Pie chart',
            body: 'Continent|Share\nAsia|46\nEurope|21\nAfrica|33' },

          'layout-statement': { type: 'statement', title: 'A statement that carries the whole slide.',
            body: 'And a line underneath it that has to wrap, because the pair is what the layout is for.' },
          'layout-keyfact': { type: 'keyfact', title: 'One fact', subtitle: 'With a qualifier above it',
            body: 'Friday after each lab,\n12:00' },
          'layout-italics': { type: 'italics', title: 'A phrase set apart from its explanation.',
            body: 'The explanation runs underneath at body size and is long enough to wrap onto a second line.' },
          'layout-links': { type: 'links', title: 'Resources', bullets: [
            'Course handbook\thttps://example.ac.uk/handbook',
            'Reading list\thttps://example.ac.uk/reading',
            'Submission point\thttps://example.ac.uk/canvas'] },
          'layout-journey': { type: 'journey', title: 'Six stops', subtitle: 'Weeks 1 to 6',
            bullets: bullets(6, 'Week') },
          'layout-stats': { type: 'stats', title: 'Three numbers', subtitle: 'With a context line',
            bullets: ['8%\tof men', '0.5%\tof women', '1 in 12\tin this room'] },
          'layout-compare': { type: 'compare', title: 'Three rows', subtitle: 'Do\tDon\u2019t',
            bullets: [
              'Audience\tKnow what they need\tDo not assume colour reads the same',
              'Start\tUse a familiar chart\tDo not overload one view',
              'Labels\tAxes, units, legends\tDo not hide the range'] },
          /* Six labelled rows is the case that overflowed by 26px. Held open
             deliberately: the verdict is that it should be split, and a
             baseline is how we notice if it silently starts "fitting". */
          'layout-compare6': { type: 'compare', title: 'Six rows — the case that does not fit', subtitle: 'Do\tDon\u2019t',
            bullets: [
              'Audience\tKnow their expertise and what they need\tDo not assume colour means the same to everyone',
              'Starting point\tStart simple, with a familiar chart type\tDo not overload one view with every variable',
              'Labelling\tLabel axes, units, titles and legends\tDo not hide the context or the relevant range',
              'Honesty\tShow uncertainty — error bars, intervals\tDo not distort; keep the representation proportional',
              'Comparison\tUse common baselines and aligned scales\tDo not decorate; minimise non-data ink',
              'Process\tIterate — test it on someone, then fix it\tDo not ship the first draft'] },
          'layout-funnel': { type: 'funnel', title: 'An ordered ranking', subtitle: 'Most accurate at the top',
            bullets: ['Position on a common scale\t100', 'Position, non-aligned\t85',
              'Length, direction, angle\t70', 'Area\t55', 'Volume, curvature\t40',
              'Shading, saturation\t28'] },
          'layout-timeline': { type: 'timeline', title: 'Five events', subtitle: 'Across a term',
            bullets: ['Week 1\tIntroductions', 'Week 4\tColour', 'Week 7\tReading week',
              'Week 9\tNetworks', 'Week 11\tMachine learning'] },
          'layout-iceberg': { type: 'iceberg', title: 'What lies beneath', subtitle: 'What the room sees',
            bullets: ['Preparation\tthe hours nobody watches', 'Revision\tthe drafts thrown away',
              'Feedback\tthe conversations in between'] },
          'layout-spectrum': { type: 'spectrum', title: 'Place them on the line', subtitle: 'Rarely\tConstantly',
            bullets: ['Email\t20', 'Spreadsheets\t55', 'Notebooks\t85'] },
          'layout-sourcecheck': { type: 'sourcecheck', title: 'A claim worth checking.',
            subtitle: 'Where it comes from',
            bullets: ['Source\tA named book\tWith an edition and a year',
              'Method\tHow the number was produced\tAnd on whom',
              'Limit\tWhat it does not cover\tStated plainly'],
            body: 'The takeaway line that sits under the rows.' },
          /* Two images and a divider. This rendered as two empty frames for a
             whole session because the images were written to slide.image
             instead of slide.exploration, and nothing failed. */
          'layout-beforeafter': { type: 'beforeafter', title: 'Before and after',
            exploration: {
              before: 'assets/lesson/anscombe/anscombe-i.svg',
              after: 'assets/lesson/anscombe/anscombe-ii.svg',
              beforeLabel: 'Dataset I', afterLabel: 'Dataset II',
              alt: 'Two Anscombe scatterplots compared with a divider' } },
          /* The combination that failed: a cover image crops a wide diagram,
             and the caption sits on a scrim over it. layout-split above uses
             contain and no scrim, so neither behaviour was covered. */
          'layout-split-cover': { type: 'split', title: 'Cover image with a caption scrim',
            bullets: bullets(2, 'Point'),
            image: 'assets/brand/nu-london-skyline.png',
            subtitle: 'A credit line over the picture',
            design: { capStyle: 'scrim' } }
        }[st];
        rd = window.SF.normalizeDeck({ title: 'Baseline', theme: th, slides: [build] });
        rd.theme = th;
        slide = rd.slides[0];
      } else {
      const g = window.SF.makeGame('Sample ' + st, st);
      g.id = 'baseline-' + st;
      g.questions.forEach((q, i) => { q.id = 'q-' + i; });
      rd = window.SF.gameToRunDeck(g);
      rd.theme = th;

      // Select representative game slide (first quiz or board)
      slide = rd.slides.find((s) => s.type === 'quiz' || (s.id && !s.id.includes('howto') && s.type !== 'section')) || rd.slides[0];
      }

      let stage = document.getElementById('visualRegressionStage');
      if (!stage) {
        stage = document.createElement('div');
        stage.id = 'visualRegressionStage';
        stage.style.position = 'fixed';
        stage.style.top = '0';
        stage.style.left = '0';
        stage.style.width = '1280px';
        stage.style.height = '720px';
        stage.style.zIndex = '999999';

        const styleEl = document.createElement('style');
        styleEl.id = 'visualRegressionNoAnim';
        styleEl.textContent = '#visualRegressionStage, #visualRegressionStage * { animation: none !important; transition: none !important; }';
        document.head.appendChild(styleEl);

        document.body.appendChild(stage);
      }
      stage.innerHTML = '';
      /* A race only renders as a race when it is given lanes: layoutQuiz gates
         `is-race` and the whole strip on opts.lanes. Without them this captured
         an ordinary quiz wearing the race style, which is how a heading that ran
         underneath the countdown passed 642 baselines without one of them
         noticing. Fixed names and positions, because a baseline cannot move. */
      const renderOpts = { interactive: false };
      if (st === 'race') {
        renderOpts.lanes = [
          { name: 'Red', at: 3 }, { name: 'Blue', at: 2 },
          { name: 'Green', at: 1 }, { name: 'Yellow', at: 0 }
        ];
        renderOpts.trackLength = 5;
      }
      const node = window.SF.renderSlide(rd, slide, renderOpts);
      node.style.position = 'relative';
      stage.appendChild(node);

      if (injectTestDiff) {
        const bug = document.createElement('div');
        bug.id = 'visualRegressionTestBug';
        bug.style.position = 'absolute';
        bug.style.bottom = '20px';
        bug.style.left = '20px';
        bug.style.width = '120px';
        bug.style.height = '60px';
        bug.style.background = '#ff0000';
        stage.appendChild(bug);
      }
      } finally {
        Math.random = realRandom;
      }
    }, { st: style, th: theme, injectTestDiff: testDiff, kind: kind });

    await waitForSlideArt(page, '#visualRegressionStage');
    const currentBuffer = await page.locator('#visualRegressionStage .slide').screenshot({ animations: 'disabled' });

    // 2. If update mode or baseline does not exist yet: write baseline
    if (isUpdate || !baselineExists) {
      fs.writeFileSync(baselinePath, currentBuffer);
      updated++;
      const action = isUpdate ? 'UPDATED' : 'CREATED (new baseline)';
      console.log(`  [${String(idx + 1).padStart(3)}/${combinations.length}] ${key.padEnd(28)} → ${action}`);
      continue;
    }

    // 3. Check mode: Compare current rendering against stored baseline
    const baselineBuffer = fs.readFileSync(baselinePath);

    // Fast exact-buffer check
    if (Buffer.compare(currentBuffer, baselineBuffer) === 0) {
      passed++;
      console.log(`  [${String(idx + 1).padStart(3)}/${combinations.length}] ${key.padEnd(28)} → PASS (exact match 0.00% diff)`);
      continue;
    }

    // Pixel-level diffing in Chromium canvas
    const base64Current = currentBuffer.toString('base64');
    const base64Baseline = baselineBuffer.toString('base64');

    const diffResult = await page.evaluate(async ({ curr, base, threshold }) => {
      const toBlob = (b64) => {
        const bin = atob(b64);
        const len = bin.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
        return new Blob([bytes], { type: 'image/png' });
      };

      const imgA = await createImageBitmap(toBlob(curr));
      const imgB = await createImageBitmap(toBlob(base));
      const w = imgA.width;
      const h = imgB.height;

      if (w !== imgB.width || h !== imgB.height) {
        return {
          pass: false,
          reason: `Dimension mismatch: ${w}x${h} vs ${imgB.width}x${imgB.height}`,
          diffPixels: w * h,
          diffRatio: 1
        };
      }

      const canvasA = new OffscreenCanvas(w, h);
      const ctxA = canvasA.getContext('2d');
      ctxA.drawImage(imgA, 0, 0);
      const dataA = ctxA.getImageData(0, 0, w, h).data;

      const canvasB = new OffscreenCanvas(w, h);
      const ctxB = canvasB.getContext('2d');
      ctxB.drawImage(imgB, 0, 0);
      const dataB = ctxB.getImageData(0, 0, w, h).data;

      const diffCanvas = new OffscreenCanvas(w, h);
      const diffCtx = diffCanvas.getContext('2d');
      const diffImageData = diffCtx.createImageData(w, h);
      const diffData = diffImageData.data;

      let diffPixels = 0;
      for (let i = 0; i < dataA.length; i += 4) {
        const dr = Math.abs(dataA[i] - dataB[i]);
        const dg = Math.abs(dataA[i + 1] - dataB[i + 1]);
        const db = Math.abs(dataA[i + 2] - dataB[i + 2]);
        const da = Math.abs(dataA[i + 3] - dataB[i + 3]);

        if (dr > 10 || dg > 10 || db > 10 || da > 10) {
          diffPixels++;
          diffData[i] = 255;     // bright pink-red for difference
          diffData[i + 1] = 0;
          diffData[i + 2] = 85;
          diffData[i + 3] = 255;
        } else {
          // Dim unchanged background
          diffData[i] = Math.round(dataA[i] * 0.2);
          diffData[i + 1] = Math.round(dataA[i + 1] * 0.2);
          diffData[i + 2] = Math.round(dataA[i + 2] * 0.2);
          diffData[i + 3] = 255;
        }
      }

      diffCtx.putImageData(diffImageData, 0, 0);
      const diffBlob = await diffCanvas.convertToBlob();
      const diffBuffer = await diffBlob.arrayBuffer();
      const bytes = new Uint8Array(diffBuffer);
      let binary = '';
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + chunkSize, bytes.length)));
      }
      const diffBase64 = btoa(binary);

      const totalPixels = w * h;
      const diffRatio = diffPixels / totalPixels;
      const pass = diffRatio <= threshold;

      return {
        pass,
        diffPixels,
        totalPixels,
        diffRatio,
        diffBase64: pass ? null : diffBase64
      };
    }, { curr: base64Current, base: base64Baseline, threshold: diffThreshold });

    if (diffResult.pass) {
      passed++;
      const pct = (diffResult.diffRatio * 100).toFixed(3);
      console.log(`  [${String(idx + 1).padStart(3)}/${combinations.length}] ${key.padEnd(28)} → PASS (${pct}% diff <= ${(diffThreshold * 100).toFixed(2)}%)`);
    } else {
      failed++;
      const pct = (diffResult.diffRatio * 100).toFixed(2);
      console.error(`  [${String(idx + 1).padStart(3)}/${combinations.length}] ${key.padEnd(28)} → FAIL (${pct}% diff, ${diffResult.diffPixels} mismatched pixels)`);

      // Write actual & diff files for inspection
      const actualPath = path.join(DIFFS_DIR, `${key}-actual.png`);
      const diffPath = path.join(DIFFS_DIR, `${key}-diff.png`);
      fs.writeFileSync(actualPath, currentBuffer);
      if (diffResult.diffBase64) {
        fs.writeFileSync(diffPath, Buffer.from(diffResult.diffBase64, 'base64'));
      }
      failures.push({ key, pct, diffPixels: diffResult.diffPixels, diffPath });
    }
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n------------------------------------------------------');
  console.log(`Finished in ${durationSec}s: ${passed} passed, ${updated} updated, ${failed} failed`);
  console.log('------------------------------------------------------');

  if (failed > 0) {
    console.error('\nVisual regressions detected in:');
    for (const f of failures) {
      console.error(`  ✗ ${f.key}: ${f.pct}% mismatch (${f.diffPixels} px) → diff: ${f.diffPath}`);
    }
    console.error('\nIf these UI changes were intentional, update baselines with:');
    console.error('  npm run visual:update\n');
    await browser.close();
    cleanup();
    process.exit(1);
  }

  console.log('\n✓ Visual regression suite passed cleanly!\n');
  await browser.close();
  cleanup();
  process.exit(0);
}

run().catch((err) => {
  console.error('\nVisual regression runner failed:', err);
  cleanup();
  process.exit(1);
});
