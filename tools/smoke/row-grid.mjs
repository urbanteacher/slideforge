#!/usr/bin/env node
/* Smoke-test the modular row-span concept BEFORE coding snaps.
 *
 * Renders Awareness Day 2027 (aiad27-*) and generic layout lessons, measures
 * block edges against candidate body row grids, and reports whether a flush
 * row system would formalise what exists or move content.
 *
 * Also runs SF.Review.check (the Review button on the presentation row) so boundary
 * overflow stays visible beside the grid numbers.
 *
 * Usage:
 *   npm start
 *   node tools/smoke-row-grid.mjs
 *   SLIDEFORGE_URL=http://127.0.0.1:8787 node tools/smoke-row-grid.mjs --json
 *
 * Exit 0 always for the grid report (measurement). Exit 1 only if Playwright
 * or the app fails to load.
 */
import { chromium } from 'playwright';

const url = process.env.SLIDEFORGE_URL || 'http://localhost:8787';
const jsonOut = process.argv.includes('--json');

const CAMPAIGN = [
  'aiad27-safe',
  'aiad27-smart',
  'aiad27-creative',
  'aiad27-responsible',
  'aiad27-future',
];
const GENERIC = [
  'pace-nul',
  'motion-lab',
  'vibe-product',
  'vibe-editorial',
  'vibe-cinematic',
  'vibe-studio-teach',
  'vibe-brutal',
];

/* Body height for campaign chrome is 592px. Uniform pitches divide it exactly.
 * Guttered pitches: n content bands of `band` with `gap` between them. */
const GRIDS = [
  { id: '8×74', kind: 'uniform', rows: 8, pitch: 74 },
  { id: '12×42+8', kind: 'gutter', rows: 12, band: 42, gap: 8 },
  { id: '16×37', kind: 'uniform', rows: 16, pitch: 37 },
  { id: '24×17+8', kind: 'gutter', rows: 24, band: 17, gap: 8 },
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 960 } });
try {
  const response = await page.goto(url, { timeout: 30000 });
  if (!response?.ok()) {
    throw new Error(`Could not load ${url}. Start the server with npm start.`);
  }
  await page.waitForFunction(() => window.SF?.buildLesson && window.SF?.renderSlide && window.SF?.Review?.check);

  await page.addStyleTag({
    content: '#rowGridStage *,#rowGridStage *::before,#rowGridStage *::after{animation:none!important;transition:none!important}',
  });

  const keys = [...CAMPAIGN, ...GENERIC];
  const raw = await page.evaluate(async ({ keys, grids }) => {
    function linesFor(grid, bodyH) {
      if (grid.kind === 'uniform') {
        const pitch = bodyH / grid.rows;
        return Array.from({ length: grid.rows + 1 }, (_, i) => i * pitch);
      }
      const out = [];
      for (let i = 0; i < grid.rows; i++) {
        const start = i * (grid.band + grid.gap);
        out.push(start, start + grid.band);
      }
      out.push(bodyH);
      return [...new Set(out.map((n) => Math.round(n * 1000) / 1000))];
    }
    function nearestError(y, lines) {
      let best = Infinity;
      for (const line of lines) best = Math.min(best, Math.abs(y - line));
      return best;
    }

    let stage = document.querySelector('#rowGridStage');
    if (!stage) {
      stage = document.createElement('div');
      stage.id = 'rowGridStage';
      Object.assign(stage.style, {
        position: 'fixed',
        inset: '0',
        width: '1280px',
        height: '720px',
        zIndex: '999999',
        overflow: 'hidden',
      });
      document.body.append(stage);
    }

    const slides = [];
    for (const key of keys) {
      if (!SF.LESSONS.some((l) => l.key === key)) throw new Error('Unknown lesson: ' + key);
      const deck = SF.buildLesson(key);
      for (let i = 0; i < deck.slides.length; i++) {
        const slide = deck.slides[i];
        const root = SF.renderSlide(deck, slide, {
          interactive: false,
          revealed: 9999,
          index: i,
          total: deck.slides.length,
        });
        root.style.transform = 'none';
        stage.replaceChildren(root);
        await document.fonts.ready;
        await Promise.all([...root.querySelectorAll('img')].map((img) => img.decode().catch(() => {})));
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

        const bodyEl = root.querySelector('.cp-body') || root.querySelector('.pad');
        if (!bodyEl) continue;
        const bodyBox = bodyEl.getBoundingClientRect();
        const bodyH = bodyBox.height;
        const region = root.querySelector('.cp-body') ? 'cp-body' : 'pad';

        const edges = [];
        for (const child of bodyEl.children) {
          if (child.getAttribute('aria-hidden') === 'true') continue;
          if (child.classList.contains('sr-only')) continue;
          const r = child.getBoundingClientRect();
          if (r.height < 2 || r.width < 2) continue;
          edges.push(r.top - bodyBox.top, r.bottom - bodyBox.top);
        }

        const perGrid = {};
        for (const grid of grids) {
          const lines = linesFor(grid, bodyH);
          const errors = edges.map((y) => nearestError(y, lines));
          const mean = errors.length ? errors.reduce((a, b) => a + b, 0) / errors.length : 0;
          const worst = errors.length ? Math.max(...errors) : 0;
          const within6 = errors.length ? errors.filter((e) => e <= 6).length / errors.length : 1;
          const allWithin6 = errors.every((e) => e <= 6);
          perGrid[grid.id] = {
            mean: Math.round(mean * 10) / 10,
            worst: Math.round(worst * 10) / 10,
            within6: Math.round(within6 * 1000) / 1000,
            allWithin6,
            edges: errors.length,
            bodyH: Math.round(bodyH * 10) / 10,
          };
        }

        const fit = await SF.Review.check(deck, slide, i);
        slides.push({
          key,
          family: key.startsWith('aiad27-') ? 'aiad27' : key,
          slide: i + 1,
          type: slide.type,
          hidden: !!slide.hidden,
          region,
          composition: root.dataset.composition || '',
          edgeCount: edges.length,
          grids: perGrid,
          fits: fit.fits,
          over: (fit.over || []).slice(0, 3),
          unavailableImages: fit.unavailableImages || 0,
        });
      }
    }
    return slides;
  }, { keys, grids: GRIDS });

  function aggregateFamily(slide) {
    if (slide.key.startsWith('aiad27-')) return 'aiad27';
    if (slide.key === 'pace-nul') return 'northeastern';
    if (slide.key === 'vibe-brutal') return 'brutal';
    if (slide.key === 'vibe-studio-teach' || slide.key === 'motion-lab') return 'studio';
    if (slide.key === 'vibe-product' || slide.key === 'vibe-editorial' || slide.key === 'vibe-cinematic') {
      return 'ukbt-ish';
    }
    return slide.key;
  }

  /* Modular-block concept only applies where a composition body exists.
     Pad-only slides (teacher prep, non-composition layouts) are reported apart. */
  const modular = raw.filter((s) => s.region === 'cp-body');
  const padOnly = raw.filter((s) => s.region === 'pad');

  function summarise(list) {
    const byFamily = new Map();
    for (const s of list) {
      const fam = aggregateFamily(s);
      if (!byFamily.has(fam)) byFamily.set(fam, []);
      byFamily.get(fam).push(s);
    }
    const summary = {};
    for (const [fam, famList] of byFamily) {
      const heights = famList.map((s) => s.grids['16×37'].bodyH);
      summary[fam] = {
        slides: famList.length,
        bodyH: Math.round((heights.reduce((a, b) => a + b, 0) / heights.length) * 10) / 10,
        grids: {},
      };
      for (const g of GRIDS) {
        const means = famList.map((s) => s.grids[g.id].mean);
        const worsts = famList.map((s) => s.grids[g.id].worst);
        const perfect = famList.filter((s) => s.grids[g.id].allWithin6).length;
        summary[fam].grids[g.id] = {
          mean: Math.round((means.reduce((a, b) => a + b, 0) / means.length) * 10) / 10,
          worst: Math.round(Math.max(...worsts) * 10) / 10,
          perfectPct: Math.round((perfect / famList.length) * 1000) / 10,
          perfect,
        };
      }
    }
    return summary;
  }

  const summary = summarise(modular);
  const padSummary = summarise(padOnly);
  const fitFails = raw.filter((s) => !s.fits || s.unavailableImages);
  const campaign = raw.filter((s) => s.key.startsWith('aiad27-'));
  const generic = raw.filter((s) => !s.key.startsWith('aiad27-'));

  function printTable(title, summaryObj, order) {
    console.log(title);
    const header = ['Family'.padEnd(14), ...GRIDS.map((g) => g.id.padStart(18))].join('  ');
    console.log(header);
    console.log('-'.repeat(header.length));
    for (const fam of order) {
      const row = summaryObj[fam];
      if (!row) continue;
      const cells = GRIDS.map((g) => {
        const x = row.grids[g.id];
        return `${x.mean}/${x.worst} ${String(x.perfectPct).padStart(4)}%`.padStart(18);
      });
      console.log(fam.padEnd(14), ...cells, `  (${row.slides} slides, body≈${row.bodyH}px)`);
    }
    console.log('');
  }

  if (jsonOut) {
    console.log(
      JSON.stringify(
        { checked: raw.length, modular: modular.length, padOnly: padOnly.length, summary, padSummary, fitFails: fitFails.length, slides: raw },
        null,
        2,
      ),
    );
  } else {
    console.log('Row-grid smoke (measure only — no snapping coded)\n');
    console.log(`Checked ${raw.length} slides · campaign ${campaign.length} · generic ${generic.length}`);
    console.log(`Composition body (.cp-body): ${modular.length} · pad-only: ${padOnly.length}`);
    console.log(`Fit check failures: ${fitFails.length} (boundary overflow or bad images)\n`);

    printTable(
      'A) Modular body slides — mean/worst px error · % slides with every edge ≤6px of a row line:\n',
      summary,
      ['aiad27', 'northeastern', 'ukbt-ish', 'studio', 'brutal'],
    );
    if (Object.keys(padSummary).length) {
      printTable(
        'B) Pad-only slides (no composition chrome — weaker signal for the row concept):\n',
        padSummary,
        Object.keys(padSummary),
      );
    }

    console.log('Interpretation:');
    const a16 = summary.aiad27?.grids['16×37'];
    if (a16) {
      console.log(
        `  AiAd27 @ 16×37 on .cp-body: mean ${a16.mean}px, worst ${a16.worst}px, fully-snapped ${a16.perfectPct}% (${a16.perfect}/${summary.aiad27.slides}).`,
      );
      if (a16.perfectPct < 20) {
        console.log('  → Looks regular, but is NOT a formal snap system. Snapping would MOVE content.');
        console.log('  → Before coding snaps: re-fit AiAd27 CSS onto 16×37, then re-run this + check fit.');
      } else {
        console.log('  → High snap rate — formalising the grid is closer to documenting than reflowing.');
      }
    } else {
      console.log('  → No AiAd27 slides used .cp-body — campaign chrome missing; investigate compositions.');
    }
    console.log('  Generic layouts are looser on every grid → deliberate per-theme re-fit later, not a silent retrofit.');
    console.log('  Fit checker (0 failures today) is the authoring guardrail once spans exist.');
    console.log('  Caveat: only .cp-body rows are comparable to the 592px campaign arithmetic.');

    if (fitFails.length) {
      console.log('\nFit failures (first 12):');
      for (const f of fitFails.slice(0, 12)) {
        const why =
          f.over?.map((o) => `${o.text?.slice?.(0, 40) || '?'} ${o.past}px`).join('; ') ||
          (f.unavailableImages ? `${f.unavailableImages} bad image(s)` : 'overflow');
        console.log(`  ${f.key} #${f.slide} (${f.type}): ${why}`);
      }
    }
  }
} finally {
  await browser.close();
}
