#!/usr/bin/env node
/* Smoke-test every Export picker path for the IPDV lecture.
 *
 * Writes each artefact into a dated folder on the Desktop so you can open
 * the presentation file, the student PDF, the practice notes, the backup
 * bundle, and the app-folder write without hunting through Downloads.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import harness from '../../tests/harness.js';

/* '../..' — two levels, because this file lives in tools/smoke/ and ROOT is
   the repo. It was '..' when the smokes sat directly in tools/, and the move
   into their own folder did not change it: relative imports fail loudly, a
   path built by hand just points somewhere else. This one went looking for
   tools/data/decks and reported that the relay had not written the file. */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const stamp = new Date().toISOString().slice(0, 10);
const outDir = path.join(os.homedir(), 'Desktop', `SlideForge-exports-${stamp}`);
fs.mkdirSync(outDir, { recursive: true });

const sessionDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-exports-'));
const port = await harness.freePort();
const relay = await harness.start(port, sessionDir);
const browser = await chromium.launch({ headless: true });

const report = [];

function note(label, file, detail) {
  report.push({ label, file, detail });
  console.log(`  ✓ ${label} → ${file}${detail ? ` (${detail})` : ''}`);
}

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('app: ' + e.message));

  await page.goto(`http://127.0.0.1:${port}/`);
  await page.waitForFunction(() => window.SF?.Print && SF.Shell?.current()?.doc()?.id, null, { timeout: 60000 });
  /* The artefacts are built from the lecture itself, as SlideForge builds it,
     rather than through the lab, which would first draw every one of its
     slides as a picture. The picker below is the app's own. */
  const lecture = await page.evaluate(() => {
    window.__lecture = SF.buildLesson('ipdv-intro');
    return { title: window.__lecture.title, n: window.__lecture.slides.length, id: window.__lecture.id };
  });
  assert.match(lecture.title, /Advanced Information Presentation/, 'IPDV lecture loaded');
  assert.ok(lecture.n >= 35, `full lecture loaded, got ${lecture.n} slides`);
  console.log(`Export smoke: "${lecture.title}" (${lecture.n} slides) → ${outDir}`);

  /* ---- 1. This presentation (single-file JSON download) ---- */
  {
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.evaluate(() => {
        const doc = window.__lecture;
        const data = JSON.stringify(doc, null, 2);
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
        a.download = (doc.title || 'untitled').replace(/[^\w\-]+/g, '_').slice(0, 60) + '.sfdeck.json';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      })
    ]);
    const name = download.suggestedFilename() || 'presentation.sfdeck.json';
    const dest = path.join(outDir, name);
    await download.saveAs(dest);
    const parsed = JSON.parse(fs.readFileSync(dest, 'utf8'));
    assert.equal(parsed.slides.length, lecture.n, 'presentation file has every slide');
    note('This presentation', name, `${parsed.slides.length} slides`);
  }

  /* ---- 2. Student PDF handout ---- */
  {
    const [pdfPage] = await Promise.all([
      page.context().waitForEvent('page'),
      page.evaluate(() => SF.Print.open(window.__lecture))
    ]);
    pdfPage.on('pageerror', (e) => errors.push('handout: ' + e.message));
    await pdfPage.waitForSelector('.pdf-page');
    await pdfPage.waitForFunction(
      () => {
        const b = document.querySelector('.pdf-toolbar button');
        return b && !b.disabled && b.innerText === 'Print / Save as PDF';
      },
      { timeout: 60000 }
    );
    const pages = await pdfPage.locator('.pdf-page').count();
    assert.ok(pages >= lecture.n, `handout pages (${pages}) cover the deck (${lecture.n})`);
    const pdfName = 'Student_PDF_handout.pdf';
    const pdfPath = path.join(outDir, pdfName);
    await pdfPage.pdf({
      path: pdfPath,
      printBackground: true,
      preferCSSPageSize: true
    });
    assert.ok(fs.statSync(pdfPath).size > 50_000, 'PDF is a real multi-page file');
    note('Student PDF handout', pdfName, `${pages} pages, ${(fs.statSync(pdfPath).size / 1024).toFixed(0)} KB`);
    await pdfPage.close();
  }

  /* ---- 3. Practice notes (.md) ---- */
  {
    const md = await page.evaluate(() => SF.deckToMarkdown(window.__lecture));
    assert.ok(md && md.length > 200, 'markdown export has content');
    const mdName = (lecture.title || 'untitled').replace(/[^\w\-]+/g, '_').slice(0, 60) + '.md';
    fs.writeFileSync(path.join(outDir, mdName), md, 'utf8');
    note('Practice notes (.md)', mdName, `${md.length} chars`);
  }

  /* ---- 4. Everything, into the app folder (writes project data/decks/) ---- */
  {
    const result = await page.evaluate(async () => {
      const doc = window.__lecture;
      const slug = String(doc.title || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48) + '-' + String(doc.id || '').slice(0, 8).toLowerCase().replace(/[^a-z0-9]/g, '');
      const r = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'deck', slug, doc })
      });
      return { ok: r.ok, status: r.status, slug };
    });
    assert.ok(result.ok, `folder write failed: HTTP ${result.status}`);
    const written = path.join(ROOT, 'data', 'decks', result.slug + '.json');
    assert.ok(fs.existsSync(written), `relay wrote ${written}`);
    const folderCopy = path.join(outDir, 'app-folder');
    fs.mkdirSync(folderCopy, { recursive: true });
    fs.copyFileSync(written, path.join(folderCopy, path.basename(written)));
    note('Everything, into the app folder', `app-folder/${path.basename(written)}`);
  }

  /* ---- 5. Everything, as one file (backup bundle) ---- */
  {
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.evaluate(() => {
        const decks = SF.Store.list();
        const games = SF.GameStore.list();
        const stamp = new Date().toISOString().slice(0, 10);
        const blob = new Blob([JSON.stringify({
          kind: 'slideforge-bundle',
          version: 1,
          exported: new Date().toISOString(),
          decks,
          games
        }, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'slideforge-backup-' + stamp + '.sfbundle.json';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      })
    ]);
    const name = download.suggestedFilename() || 'slideforge-backup.sfbundle.json';
    const dest = path.join(outDir, name);
    await download.saveAs(dest);
    const bundle = JSON.parse(fs.readFileSync(dest, 'utf8'));
    assert.equal(bundle.kind, 'slideforge-bundle');
    assert.ok(bundle.decks.length >= 1, 'bundle includes at least the lecture');
    note('Everything, as one file', name, `${bundle.decks.length} deck(s), ${bundle.games.length} game(s)`);
  }

  /* ---- UI: Export picker lists every path we just exercised ---- */
  await page.evaluate(() => document.getElementById('btnExport')?.click());
  await page.waitForSelector('#pickerBody .deck-item .nm');
  const labels = await page.evaluate(() =>
    [...document.querySelectorAll('#pickerBody .deck-item .nm')].map((el) => el.textContent.trim())
  );
  for (const need of [
    'This presentation',
    'Student PDF handout',
    'Practice notes (.md)',
    'Everything, into the app folder',
    'Everything, as one file'
  ]) {
    assert.ok(labels.some((t) => t === need),
      `Export picker missing "${need}"; saw: ${labels.join(' | ')}`);
  }
  await page.keyboard.press('Escape');

  assert.deepEqual(errors, [], 'no page errors during export smoke');

  const readme = [
    `# SlideForge export smoke — ${stamp}`,
    '',
    `Lecture: ${lecture.title}`,
    `Slides: ${lecture.n}`,
    '',
    ...report.map((r) => `- **${r.label}**: \`${r.file}\`${r.detail ? ` — ${r.detail}` : ''}`),
    '',
    'Generated by `node tools/smoke/run.mjs exports`.',
    ''
  ].join('\n');
  fs.writeFileSync(path.join(outDir, 'README.md'), readme);

  console.log(`\nPASS: ${report.length} exports written to\n  ${outDir}`);
} finally {
  await browser.close();
  await harness.stop(relay);
  fs.rmSync(sessionDir, { recursive: true, force: true });
}
