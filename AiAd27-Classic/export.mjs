#!/usr/bin/env node
/* PDFs of the six decks, and the website's teacher steps numbered against them.
 *
 *   node AiAd27-Classic/build.js
 *   node AiAd27-Classic/export.mjs            # needs the server (npm start)
 *
 * The PDF is the app's own handout route: each deck opened in the studio (which converts it), then the studio's
 * handout (lab/src/export/handout.ts, the page Export → PDF handout opens), saved headlessly, as
 * tools/export-teaching-pdf.mjs does for the lectures. Every page is a picture of a slide as the studio draws it, so
 * the strand grounds and colours come through as they are on the board. Because this PDF is projected rather than
 * handed out, it is the teacher copy (the answer slides included) without its notes, and the preview window's
 * toolbar is left out.
 *
 * Writes:
 *   pdf/AiAd27-Classic-<Name>.pdf     the slides to present or print
 *   preview/<name>/NN.png              each PDF page, for review
 *   bundles/wp-instructions.json       each lesson's steps for the website,
 *                                      with "Slide n" meaning page n of the PDF,
 *                                      and its debate pack (debates.js)
 */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { handoutPage, openDeckInStudio } from '../tools/smoke/lib/handout.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const URL_BASE = process.env.SLIDEFORGE_URL || 'http://localhost:8787';
const runs = JSON.parse(fs.readFileSync(path.join(__dirname, 'bundles', 'run.json'), 'utf8'));

fs.mkdirSync(path.join(__dirname, 'pdf'), { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1400, height: 900 }, reducedMotion: 'reduce' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

const res = await page.goto(URL_BASE + '/', { waitUntil: 'domcontentloaded' }).catch(() => null);
if (!res || !res.ok()) {
  console.error(`Could not reach ${URL_BASE} — start the server (npm start) or set SLIDEFORGE_URL.`);
  await browser.close();
  process.exit(1);
}
await page.waitForFunction(() => window.SF && window.SF.LabEngine, null, { timeout: 30000 });

const out = [];
let failed = 0;

for (const run of runs) {
  const deck = JSON.parse(fs.readFileSync(path.join(__dirname, 'bundles', run.file + '.sfbundle.json'), 'utf8')).decks[0];

  await openDeckInStudio(page, deck);
  /* Which deck slide each PDF page comes from: the studio keeps it on each slide it converts (sourceSlideId). A game
     is several pages (its cover, its questions, its answers), so page numbers run ahead of slide numbers from the
     first game on. */
  const sources = await page.evaluate((d) => {
    const at = {}; d.slides.forEach((s, i) => { at[s.id] = i + 1; });
    return SF.LabEngine.labDeck().slides.filter((s) => !s.hidden).map((s) => at[s.sourceSlideId] || 0);
  }, deck);

  const preview = await handoutPage(page, { teacher: true });
  preview.on('pageerror', (e) => errors.push(`${run.file}: ${e.message}`));
  /* Projected, not handed out: the slides alone, edge to edge. */
  await preview.addStyleTag({ content: '.toolbar,.notes{display:none!important}html,body{background:#fff!important}.page{margin:0 auto!important;box-shadow:none!important}' });
  await preview.waitForTimeout(300);

  const audit = await preview.evaluate(() => {
    const pages = Array.from(document.querySelectorAll('section.page'));
    return { pages: pages.length, pictures: pages.filter((p) => p.querySelector('img')?.naturalWidth).length };
  });

  const shots = path.join(__dirname, 'preview', run.file.replace('AiAd27-Classic-', '').toLowerCase());
  fs.rmSync(shots, { recursive: true, force: true });
  fs.mkdirSync(shots, { recursive: true });
  const pageEls = await preview.$$('section.page');
  for (let i = 0; i < pageEls.length; i++) {
    await pageEls[i].screenshot({ path: path.join(shots, String(i + 1).padStart(2, '0') + '.png') });
  }

  const pdf = path.join(__dirname, 'pdf', run.file + '.pdf');
  await preview.pdf({ path: pdf, preferCSSPageSize: true, printBackground: true, tagged: true });
  await preview.close();

  /* Each step's pages: every PDF page drawn from one of its slides. */
  const steps = run.steps.map((s) => {
    const pages = [];
    sources.forEach((src, i) => { if (s.slides.includes(src - 1)) pages.push(i + 1); });
    const first = Math.min(...pages);
    const last = Math.max(...pages);
    return {
      action: s.action,
      duration: s.duration,
      resource_ref: !pages.length ? '' : first === last ? `Slide ${first}` : `Slides ${first}–${last}`,
      student_action: s.student_action,
      teacher_tip: s.teacher_tip,
      optional: s.optional
    };
  });

  const kb = Math.round(fs.statSync(pdf).size / 1024);
  console.log(`${run.file}.pdf — ${audit.pages} pages, ${kb} KB${audit.pictures === audit.pages ? '' : ' (some pictures did not load)'}`);
  if (audit.pictures !== audit.pages) failed++;
  if (sources.some((n) => !n)) console.log('    note: a page the studio added has no slide of its own in the deck; it counts in the page numbers');

  out.push({
    wp: run.wp,
    title: run.title,
    principle: run.principle,
    kind: run.kind,
    pdf: run.file + '.pdf',
    pages: audit.pages,
    preparation: run.prep,
    instructions: steps,
    debate_pack: run.debate_pack
  });
}

fs.writeFileSync(path.join(__dirname, 'bundles', 'wp-instructions.json'), JSON.stringify(out, null, 2) + '\n');
await browser.close();

if (errors.length) { console.error('\nPage errors:\n  ' + errors.join('\n  ')); failed += errors.length; }
if (failed) { console.error(`\n${failed} problem(s).`); process.exit(1); }
console.log('\nAll PDFs written; steps in bundles/wp-instructions.json.');
