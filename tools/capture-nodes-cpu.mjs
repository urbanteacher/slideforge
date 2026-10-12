#!/usr/bin/env node
/* The CPU as Nodes draws it (the Visual tab's Plan view), captured for the CPU lesson:
 * the whole diagram, and where each labelled part sits, so the lesson can light one part at a time.
 *   node tools/capture-nodes-cpu.mjs [url]
 * Writes assets/lesson/nodes/cpu-plan.png and cpu-parts.json. */
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const url = process.argv[2] || 'https://the-teaching-model.vercel.app/framework/gcse-cs/2';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 1100 }, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: 'networkidle' });
await page.click('#panel-tab-visual');
const stage = page.locator('.cad-stage').first();
await stage.waitFor();
await page.waitForTimeout(2500);
await stage.scrollIntoViewIfNeeded();
// The examiner-confusion pins are the app's, not the lesson's: hidden for a clean diagram.
await page.addStyleTag({ content: '.cad-label:has(.cad-pin) { visibility: hidden !important; }' });
await page.waitForTimeout(800);
const box = await stage.boundingBox();
await stage.screenshot({ path: 'assets/lesson/nodes/cpu-plan.png' });
const parts = await page.$$eval('.cad-stage .cad-label', (els, origin) => els.map((e) => {
  const r = e.getBoundingClientRect();
  return { name: e.textContent.trim(), x: r.x - origin.x, y: r.y - origin.y, w: r.width, h: r.height, shown: getComputedStyle(e).visibility !== 'hidden' };
}), { x: box.x, y: box.y });
writeFileSync('assets/lesson/nodes/cpu-parts.json', JSON.stringify({ from: url, w: box.width, h: box.height, scale: 2, parts }, null, 2));
console.log(box.width, box.height, parts.filter((p) => p.shown).map((p) => p.name).join(' | '));
await browser.close();
