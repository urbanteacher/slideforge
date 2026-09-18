#!/usr/bin/env node
/* Smoke NUL-theme layouts under the modular model:
 *   row 1  = fixed header band
 *   last   = fixed footer band
 *   middle = the challenge (content / media blocks)
 *
 * Default lesson is layout-bank (97 slides). Override with --lesson <key>.
 *
 * Measures what's in the middle, how it sits on a row pitch, and fit check.
 * No snapping coded — observation only.
 *
 *   npm start
 *   node tools/smoke-nul-row-middle.mjs
 *   node tools/smoke-nul-row-middle.mjs --lesson pace-nul
 *   node tools/smoke-nul-row-middle.mjs --json
 */
import { chromium } from 'playwright';

const url = process.env.SLIDEFORGE_URL || 'http://localhost:8787';
const args = process.argv.slice(2);
const jsonOut = args.includes('--json');
let lessonKey = 'layout-bank';
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--lesson') {
    if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error('--lesson needs a key');
    lessonKey = args[++i];
  }
}
const STAGE = 720;
const PITCH = 37; /* 16×37 body arithmetic elsewhere; here 1+N+1 on full stage */
const HEADER_ROWS = 1;
const FOOTER_ROWS = 1;
const HEADER_H = HEADER_ROWS * PITCH; /* 37 */
const FOOTER_H = FOOTER_ROWS * PITCH; /* 37 */
const MIDDLE_TOP = HEADER_H;
const MIDDLE_BOTTOM = STAGE - FOOTER_H;
const MIDDLE_H = MIDDLE_BOTTOM - MIDDLE_TOP; /* 646 */
const MIDDLE_ROWS = Math.round(MIDDLE_H / PITCH); /* ~17.5 → report exact */

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 960 } });
try {
  const response = await page.goto(url, { timeout: 30000 });
  if (!response?.ok()) throw new Error(`Could not load ${url}. Start with npm start.`);
  await page.waitForFunction(() => window.SF?.buildLesson && window.SF?.Review?.check);
  await page.addStyleTag({
    content: '#nulMid *,#nulMid *::before,#nulMid *::after{animation:none!important;transition:none!important}',
  });

  const report = await page.evaluate(
    async ({ HEADER_H, FOOTER_H, MIDDLE_TOP, MIDDLE_BOTTOM, MIDDLE_H, PITCH, STAGE, lessonKey }) => {
      let stage = document.querySelector('#nulMid');
      if (!stage) {
        stage = document.createElement('div');
        stage.id = 'nulMid';
        Object.assign(stage.style, {
          position: 'fixed',
          inset: '0',
          width: '1280px',
          height: '720px',
          zIndex: '999999',
        });
        document.body.append(stage);
      }

      if (!SF.LESSONS.some((l) => l.key === lessonKey)) throw new Error('Unknown lesson: ' + lessonKey);
      const deck = SF.buildLesson(lessonKey);
      const slides = [];
      const headerBand = { top: 0, bottom: HEADER_H, h: HEADER_H };
      const footerBand = { top: STAGE - FOOTER_H, bottom: STAGE, h: FOOTER_H };
      const middleBand = { top: MIDDLE_TOP, bottom: MIDDLE_BOTTOM, h: MIDDLE_H };

      function classify(el) {
        const cls = String(el.className || '');
        const tag = el.tagName.toLowerCase();
        if (cls.includes('split-media') || cls.includes('img ') || cls.includes('img-') || tag === 'img')
          return 'image';
        if (cls.includes('lecturer-portrait')) return 'image';
        if (tag === 'video' || cls.includes('video')) return 'video';
        if (cls.includes('chart') || (tag === 'canvas' && cls.includes('chart'))) return 'chart';
        if (cls.includes('chart-wrap') || cls.includes('chart-root') || el.querySelector?.('canvas.chart, .chart'))
          return 'chart';
        if (tag === 'h1' || tag === 'h2') return 'heading';
        if (tag === 'ul' || tag === 'ol') return 'list';
        if (cls.includes('cap') || cls.includes('sub') || cls.includes('attrib') || cls.includes('q'))
          return 'text';
        if (cls.includes('journey')) return 'structure';
        if (cls.includes('split-copy') || cls.includes('lecturer-copy')) return 'copy';
        if (cls.includes('accent') || cls.includes('track')) return 'chrome';
        if (cls.includes('iframe') || tag === 'iframe') return 'embed';
        return 'block';
      }

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

        const slideBox = root.getBoundingClientRect();
        const pad = root.querySelector('.pad') || root;
        const padBox = pad.getBoundingClientRect();

        /* Actual chrome positions (logo / page number) vs reserved bands. */
        const logo = root.querySelector('.slide-logo');
        const pagenum = root.querySelector('.pagenum');
        const chromeActual = {};
        for (const [name, el] of [
          ['logo', logo],
          ['pagenum', pagenum],
        ]) {
          if (!el || getComputedStyle(el).display === 'none') continue;
          const r = el.getBoundingClientRect();
          chromeActual[name] = {
            y: Math.round(r.top - slideBox.top),
            h: Math.round(r.height),
            inHeader: r.bottom - slideBox.top <= HEADER_H + 8,
            inFooter: r.top - slideBox.top >= STAGE - FOOTER_H - 8,
          };
        }

        /* Direct pad children that intersect the middle band. */
        const middleBlocks = [];
        for (const el of pad.children) {
          if (el.getAttribute('aria-hidden') === 'true') continue;
          const r = el.getBoundingClientRect();
          if (r.height < 2 || r.width < 2) continue;
          const top = r.top - slideBox.top;
          const bottom = r.bottom - slideBox.top;
          /* Intersect middle */
          const iTop = Math.max(top, MIDDLE_TOP);
          const iBottom = Math.min(bottom, MIDDLE_BOTTOM);
          if (iBottom <= iTop) continue;
          const relTop = iTop - MIDDLE_TOP;
          const relBottom = iBottom - MIDDLE_TOP;
          const h = iBottom - iTop;
          middleBlocks.push({
            kind: classify(el),
            cls: String(el.className || el.tagName).slice(0, 48),
            text: (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 42),
            y: Math.round(top),
            h: Math.round(h),
            fullH: Math.round(bottom - top),
            relTop: Math.round(relTop),
            relBottom: Math.round(relBottom),
            spanRows: Math.round((h / PITCH) * 10) / 10,
            startRow: Math.round((relTop / PITCH) * 10) / 10,
            bleedsHeader: top < MIDDLE_TOP - 1,
            bleedsFooter: bottom > MIDDLE_BOTTOM + 1,
          });
        }

        /* Edge errors vs middle row lines (uniform pitch). */
        const lines = Array.from({ length: Math.floor(MIDDLE_H / PITCH) + 1 }, (_, n) => n * PITCH);
        const edges = middleBlocks.flatMap((b) => [b.relTop, b.relBottom]);
        const errors = edges.map((y) => {
          let best = Infinity;
          for (const line of lines) best = Math.min(best, Math.abs(y - line));
          return best;
        });
        const mean = errors.length ? errors.reduce((a, b) => a + b, 0) / errors.length : 0;
        const worst = errors.length ? Math.max(...errors) : 0;
        const allWithin6 = errors.every((e) => e <= 6);

        const kinds = [...new Set(middleBlocks.map((b) => b.kind))];
        if (slide.type === 'chart' && !kinds.includes('chart')) kinds.push('chart');
        if (slide.type === 'video' && !kinds.includes('video')) kinds.push('video');
        if ((slide.type === 'image' || slide.type === 'gallery') && !kinds.includes('image')) kinds.push('image');
        const fit = await SF.Review.check(deck, slide, i);

        slides.push({
          n: i + 1,
          type: slide.type,
          composition: root.dataset.composition || slide.design?.composition || '',
          title: String(slide.title || '').replace(/\s+/g, ' ').trim().slice(0, 48),
          padPadding: getComputedStyle(pad).padding,
          chromeActual,
          middleBlocks,
          kinds,
          hasMedia:
            kinds.some((k) => k === 'image' || k === 'video' || k === 'chart' || k === 'embed') ||
            ['image', 'gallery', 'video', 'chart', 'split'].includes(slide.type),
          grid: {
            mean: Math.round(mean * 10) / 10,
            worst: Math.round(worst * 10) / 10,
            allWithin6,
            edges: errors.length,
          },
          fits: fit.fits,
          over: (fit.over || []).slice(0, 2),
        });
      }

      return {
        key: lessonKey,
        deck: deck.title,
        theme: deck.theme,
        headerBand,
        footerBand,
        middleBand,
        middleRows: Math.round((MIDDLE_H / PITCH) * 10) / 10,
        pitch: PITCH,
        slides,
      };
    },
    { HEADER_H, FOOTER_H, MIDDLE_TOP, MIDDLE_BOTTOM, MIDDLE_H, PITCH, STAGE, lessonKey },
  );

  /* Aggregate by slide type (and composition when present). */
  const byType = new Map();
  for (const s of report.slides) {
    const label = s.composition ? `${s.type}/${s.composition}` : s.type;
    if (!byType.has(label)) byType.set(label, []);
    byType.get(label).push(s);
  }

  const mediaSlides = report.slides.filter((s) => s.hasMedia);
  const chartSlides = report.slides.filter((s) => s.kinds.includes('chart') || s.type === 'chart');
  const videoSlides = report.slides.filter((s) => s.kinds.includes('video') || s.type === 'video');
  const imageSlides = report.slides.filter(
    (s) => s.kinds.includes('image') || s.type === 'image' || s.type === 'gallery' || s.type === 'split',
  );
  const snapped = report.slides.filter((s) => s.grid.allWithin6);
  const bleed = report.slides.filter((s) =>
    s.middleBlocks.some((b) => b.bleedsHeader || b.bleedsFooter),
  );
  const fitFails = report.slides.filter((s) => !s.fits);
  const means = report.slides.map((s) => s.grid.mean);
  const worsts = report.slides.map((s) => s.grid.worst);
  const overallMean = means.length ? Math.round((means.reduce((a, b) => a + b, 0) / means.length) * 10) / 10 : 0;
  const overallWorst = worsts.length ? Math.round(Math.max(...worsts) * 10) / 10 : 0;

  if (jsonOut) {
    console.log(
      JSON.stringify(
        {
          ...report,
          summary: {
            slides: report.slides.length,
            snapped: snapped.length,
            bleed: bleed.length,
            fitFails: fitFails.length,
            media: mediaSlides.length,
            charts: chartSlides.length,
            videos: videoSlides.length,
            images: imageSlides.length,
            overallMean,
            overallWorst,
            byType: [...byType.entries()].map(([label, list]) => ({
              label,
              n: list.length,
              mean: Math.round((list.reduce((a, s) => a + s.grid.mean, 0) / list.length) * 10) / 10,
              worst: Math.round(Math.max(...list.map((s) => s.grid.worst)) * 10) / 10,
              snapped: list.filter((s) => s.grid.allWithin6).length,
              bleed: list.filter((s) => s.middleBlocks.some((b) => b.bleedsHeader || b.bleedsFooter)).length,
              media: list.filter((s) => s.hasMedia).length,
              fitFails: list.filter((s) => !s.fits).length,
            })),
          },
        },
        null,
        2,
      ),
    );
  } else {
    console.log('NUL-theme layout smoke — fixed header/footer, measure the middle\n');
    console.log(`Lesson: ${report.key} · ${report.deck} · theme ${report.theme}`);
    console.log(
      `Model: header ${HEADER_ROWS}×${PITCH}px (0–${HEADER_H}) · middle ${report.middleRows} rows (${MIDDLE_TOP}–${MIDDLE_BOTTOM}, ${MIDDLE_H}px) · footer ${FOOTER_ROWS}×${PITCH}px (${STAGE - FOOTER_H}–${STAGE})`,
    );
    console.log(`Pitch ${PITCH}px · ${report.slides.length} slides\n`);

    console.log('By layout type (count · mean/worst px · snapped · bleed · media · fit fails):');
    console.log('-'.repeat(100));
    const typeRows = [...byType.entries()]
      .map(([label, list]) => ({
        label,
        n: list.length,
        mean: Math.round((list.reduce((a, s) => a + s.grid.mean, 0) / list.length) * 10) / 10,
        worst: Math.round(Math.max(...list.map((s) => s.grid.worst)) * 10) / 10,
        snapped: list.filter((s) => s.grid.allWithin6).length,
        bleed: list.filter((s) => s.middleBlocks.some((b) => b.bleedsHeader || b.bleedsFooter)).length,
        media: list.filter((s) => s.hasMedia).length,
        fitFails: list.filter((s) => !s.fits).length,
        kinds: [...new Set(list.flatMap((s) => s.kinds))].join('+'),
      }))
      .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label));

    for (const row of typeRows) {
      console.log(
        row.label.padEnd(28),
        String(row.n).padStart(3),
        `${row.mean}/${row.worst}`.padStart(10),
        `snap ${row.snapped}/${row.n}`.padStart(10),
        `bleed ${row.bleed}`.padStart(9),
        `media ${row.media}`.padStart(9),
        row.fitFails ? `FIT ${row.fitFails}` : 'fit ok',
        row.kinds.slice(0, 36),
      );
    }

    console.log('\nOverall:');
    console.log(`  Middle snap @ ${PITCH}px: ${snapped.length}/${report.slides.length} fully within 6px (mean ${overallMean}, worst ${overallWorst}).`);
    console.log(`  Bleed into header/footer bands: ${bleed.length}/${report.slides.length}.`);
    console.log(
      `  Media in middle: ${mediaSlides.length} (charts≈${chartSlides.length}, video≈${videoSlides.length}, image/split/gallery≈${imageSlides.length}).`,
    );
    console.log(`  Fit check failures: ${fitFails.length}.`);

    if (fitFails.length) {
      console.log('\nFit failures:');
      for (const f of fitFails.slice(0, 20)) {
        const why =
          f.over?.map((o) => `${(o.text || '').slice(0, 36)} ${o.past}px`).join('; ') || 'overflow';
        console.log(`  #${f.n} ${f.type}: ${why}`);
      }
    }

    /* Compact per-slide table for the full bank */
    console.log('\nAll slides (n type/comp · kinds · mean/worst · flags):');
    for (const s of report.slides) {
      const flags = [];
      if (s.grid.allWithin6) flags.push('SNAP');
      if (s.middleBlocks.some((b) => b.bleedsHeader || b.bleedsFooter)) flags.push('BLEED');
      if (s.hasMedia) flags.push('MEDIA');
      if (!s.fits) flags.push('OVER');
      const label = s.composition ? `${s.type}/${s.composition}` : s.type;
      console.log(
        String(s.n).padStart(3),
        label.padEnd(26),
        (s.kinds.join('+') || '—').slice(0, 24).padEnd(24),
        `${s.grid.mean}/${s.grid.worst}`.padStart(9),
        flags.join(',') || '',
      );
    }

    console.log('\nInterpretation:');
    console.log('  Header/footer = fixed 1-row chrome model; middle is where every layout differs.');
    console.log('  Full-bleed image/split/video claim the whole stage and intentionally BLEED chrome.');
    console.log('  Charts/lists/headings must earn spans inside the middle — that is the hard part.');
    console.log('  0% snap today ⇒ row system would re-fit content, not merely name existing edges.');
  }
} finally {
  await browser.close();
}
