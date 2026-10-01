#!/usr/bin/env node
/* PDFs of the six decks, and the website's teacher steps numbered against them.
 *
 *   node AiAd27-Classic/build.js
 *   node AiAd27-Classic/export.mjs            # needs the server (npm start)
 *
 * The PDF is the app's own handout route, SF.Print.open — the same pages a
 * teacher gets from Export → PDF handout — saved headlessly, as
 * tools/export-teaching-pdf.mjs does for the lectures. Two differences, both
 * because this PDF is projected rather than handed out:
 *
 *   - the handout footer ("Slide 4 / 14 · PDF 5 / 12") is removed. It counts
 *     the held-back slides, and a class reading "4 / 14" on the board is
 *     doing arithmetic instead of answering the question;
 *   - every page is checked for text running off it, since nobody in the room
 *     can scroll a PDF to find it.
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
await page.waitForFunction(() => window.SF && window.SF.Print && window.SF.renderSlide, null, { timeout: 30000 });

const out = [];
let failed = 0;

for (const run of runs) {
  const deck = JSON.parse(fs.readFileSync(path.join(__dirname, 'bundles', run.file + '.sfbundle.json'), 'utf8')).decks[0];

  /* Which deck slide each PDF page comes from. A poll adds a page after its
     slide (the options, for a room voting by hand), so page numbers run ahead
     of slide numbers from the first question on. */
  const sources = await page.evaluate((d) => window.SF.Print.pagesFor(d).map((p) => p._sourceSlide), deck);

  const popup = context.waitForEvent('page');
  await page.evaluate((d) => window.SF.Print.open(d), deck);
  const preview = await popup;
  preview.on('pageerror', (e) => errors.push(`${run.file}: ${e.message}`));
  await preview.waitForFunction(() => document.documentElement.dataset.pdfReady, null, { timeout: 30000 });

  const audit = await preview.evaluate(() => {
    document.querySelectorAll('.pdf-page-reference').forEach((n) => n.remove());
    const pages = Array.from(document.querySelectorAll('.pdf-page'));
    const overflow = [];
    pages.forEach((p, i) => {
      const box = p.getBoundingClientRect();
      p.querySelectorAll('h1,h2,h3,p,li,.cp-choice,.kw-def,.kw-term,span').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height || !el.textContent.trim()) return;
        if (r.bottom > box.bottom + 1 || r.right > box.right + 1) {
          overflow.push({ page: i + 1, text: el.textContent.trim().slice(0, 60) });
        }
      });
    });
    return { ready: document.documentElement.dataset.pdfReady, pages: pages.length, overflow };
  });

  const shots = path.join(__dirname, 'preview', run.file.replace('AiAd27-Classic-', '').toLowerCase());
  fs.rmSync(shots, { recursive: true, force: true });
  fs.mkdirSync(shots, { recursive: true });
  const pageEls = await preview.$$('.pdf-page');
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
  console.log(`${run.file}.pdf — ${audit.pages} pages, ${kb} KB${audit.ready === 'true' ? '' : ' (some resources did not load)'}`);
  if (audit.overflow.length) {
    failed += audit.overflow.length;
    audit.overflow.slice(0, 8).forEach((o) => console.log(`    !! page ${o.page}: runs off the page — "${o.text}"`));
  }
  if (audit.ready !== 'true') failed++;

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
