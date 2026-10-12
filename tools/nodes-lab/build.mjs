#!/usr/bin/env node
/* Build a designed Nodes stage deck in the Lesson studio's own format (layers), using the lab's
 * real model code in its dev server (LAB_URL, default http://localhost:5299).
 *   node tools/nodes-lab/build.mjs
 * Writes lessons/nodes/critical-text-3.lesson.json: import it from SlideForge's Library. */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';

const LAB = process.env.LAB_URL || 'http://localhost:5299';
/* Which deck: ct3 (Critical Text stage 3), describe (Describe across the UK, Singapore and China) or cpu (the CPU lesson). */
const which = process.argv[2] || 'ct3';
const DECKS = {
  ct3: { file: 'ct3-deck.js', data: 'critical-text-3.json', out: 'critical-text-3' },
  describe: { file: 'describe-deck.js', data: 'describe-3.json', out: 'describe-three-systems' },
  cpu: { file: 'cpu-deck.js', data: 'gcse-cs-2.json', out: 'cpu-lesson' },
};
const spec = DECKS[which];
const data = JSON.parse(readFileSync(`tools/nodes-lab/${spec.data}`, 'utf8'));
const svg = (f) => 'data:image/svg+xml;base64,' + Buffer.from(readFileSync(`assets/lesson/nodes/ct3/${f}`)).toString('base64');
/* The CPU pictures (Nodes' Plan view), for the CPU lesson. */
if (which === 'cpu') {
  data.cpu = {};
  for (const n of ['plan', 'control-unit', 'alu', 'registers', 'pc', 'cache', 'clock']) data.cpu[n] = 'data:image/png;base64,' + readFileSync(`assets/lesson/nodes/cpu-${n}.png`).toString('base64');
}
data.svg = { front: svg('velox-front.svg'), back: svg('velox-back.svg') };
/* The kit in front of the deck: one module, so the deck uses the kit's helpers directly. */
const code = readFileSync('tools/nodes-lab/kit.js', 'utf8') + '\n' + readFileSync(`tools/nodes-lab/${spec.file}`, 'utf8');

const browser = await chromium.launch();
const page = await browser.newPage();
page.on('pageerror', (e) => console.error('page error:', e.message));
await page.goto(LAB, { waitUntil: 'networkidle' });
await page.evaluate((d) => { window.__nodesData = d; }, data);
await page.addScriptTag({ type: 'module', content: code });
await page.waitForFunction(() => window.__deck, null, { timeout: 30000 });
const deck = await page.evaluate(() => window.__deck);
writeFileSync(`lessons/nodes/${spec.out}.lesson.json`, JSON.stringify(deck, null, 1));
/* A still of every slide, as the lab draws it (its own exporter), for a contact sheet. */
const stillsDir = process.env.STILLS;
if (stillsDir) {
  const { mkdirSync } = await import('node:fs');
  mkdirSync(stillsDir, { recursive: true });
  const stills = await page.evaluate(async (d) => {
    const { renderStill } = await import('/src/export/exporters.ts');
    d.slides.forEach((s) => renderStill(s, d, 320, 'image/jpeg'));
    await document.fonts.load('800 40px Archivo'); await document.fonts.load('400 40px Archivo'); await document.fonts.ready;
    await new Promise((r) => setTimeout(r, 2500));
    d.slides.forEach((s) => renderStill(s, d, 320, 'image/jpeg'));
    await new Promise((r) => setTimeout(r, 800));
    return d.slides.map((s) => renderStill(s, d, 960, 'image/jpeg'));
  }, deck);
  stills.forEach((u, i) => writeFileSync(`${stillsDir}/${String(i + 1).padStart(2, '0')}.jpg`, Buffer.from(u.split(',')[1], 'base64')));
}
console.log(`${deck.slides.length} slides, ${deck.slides.reduce((n, s) => n + s.layers.length, 0)} layers · lessons/nodes/${spec.out}.lesson.json`);
await browser.close();
