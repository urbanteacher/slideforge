#!/usr/bin/env node
/* Row audit: every campaign block, against the 16x36 body lattice.
 *
 *   node tools/row-audit.mjs            # summary per composition
 *   node tools/row-audit.mjs --detail   # every block
 *
 * Reads AiAd27/preview.html, which is the page that shows the deck — a
 * detached render is a different layout context and has already produced two
 * wrong line counts in this work. Measures with offsetHeight rather than a
 * scaled rect, for the same reason.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {chromium} from 'playwright';
import harness from '../tests/harness.js';

const detail = process.argv.includes('--detail');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-row-audit-'));
const port = await harness.freePort();
const relay = await harness.start(port, dir);
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
  await page.goto(`http://127.0.0.1:${port}/AiAd27/preview.html`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(async () => {
    await Promise.all([...document.images].map((i) => (i.decode ? i.decode().catch(() => {}) : null)));
  });
  await page.waitForTimeout(600);

  const rows = await page.evaluate(() => {
    const PITCH = 36;
    const out = [];
    for (const slide of document.querySelectorAll('.thumb .slide.cp')) {
      const body = slide.querySelector('.cp-body');
      if (!body) continue;
      const bodyH = body.offsetHeight;
      const bRect = body.getBoundingClientRect();
      const k = bRect.height / bodyH;
      /* The blocks a person places: anything with a content key, plus the
         media and the repeated row containers. */
      const nodes = [...body.querySelectorAll(
        '[data-content-key],.cp-art,.cp-choice,.cp-rule,.cp-compare-row,.cp-compare-head,.cp-lane,.cp-risk,.cp-credit'
      )];
      const blocks = [];
      const seen = new Set();
      for (const n of nodes) {
        if (n.offsetHeight < 5) continue;
        /* A container already counted covers its children. */
        if ([...seen].some((p) => p.contains(n))) continue;
        seen.add(n);
        const top = (n.getBoundingClientRect().top - bRect.top) / k;
        const h = n.offsetHeight;
        const row = Math.floor((top + 0.5) / PITCH) + 1;
        blocks.push({
          name: (n.dataset.contentKey || n.className.split(' ')[0] || n.tagName).slice(0, 18),
          top: Math.round(top * 10) / 10,
          h,
          row,
          offTop: Math.round(Math.abs(top - (row - 1) * PITCH)),
          spanRows: Math.max(1, Math.ceil((h - 0.5) / PITCH)),
          offHeight: Math.round(Math.abs(h - Math.round(h / PITCH) * PITCH)),
        });
      }
      out.push({
        composition: slide.dataset.composition || '(none)',
        theme: (slide.className.match(/theme-aiad27-(\w+)/) || [])[1],
        bodyH, blocks,
      });
    }
    return out;
  });

  const byComp = {};
  for (const r of rows) (byComp[r.composition] = byComp[r.composition] || []).push(r);

  console.log(`Row audit — 16 x 36 on a ${[...new Set(rows.map((r) => r.bodyH))].join('/')}px body`);
  console.log(`${rows.length} campaign slides, ${rows.reduce((a, r) => a + r.blocks.length, 0)} blocks\n`);
  console.log('composition'.padEnd(14), 'slides', 'blocks', 'tops on line', 'worst off', 'heights whole');
  const order = Object.keys(byComp).sort();
  let onAll = 0, totAll = 0;
  for (const c of order) {
    const rs = byComp[c];
    const bs = rs.flatMap((r) => r.blocks);
    const on = bs.filter((b) => b.offTop <= 3).length;
    const worst = Math.max(...bs.map((b) => b.offTop));
    const whole = bs.filter((b) => b.offHeight <= 3).length;
    onAll += on; totAll += bs.length;
    console.log(
      c.padEnd(14), String(rs.length).padEnd(6), String(bs.length).padEnd(6),
      `${on}/${bs.length}`.padEnd(13), String(worst).padEnd(10), `${whole}/${bs.length}`
    );
  }
  console.log(`\nall: ${onAll}/${totAll} block tops on a row line (${Math.round(onAll / totAll * 100)}%)`);

  if (detail) {
    for (const c of order) {
      console.log(`\n=== ${c}`);
      const r = byComp[c][0];
      for (const b of r.blocks) {
        console.log('  ', b.name.padEnd(18), 'top', String(b.top).padStart(6),
          'row', String(b.row).padStart(3), b.offTop <= 3 ? 'ON ' : `off ${b.offTop}`.padEnd(7),
          'h', String(b.h).padStart(5), '=', String(b.spanRows).padStart(2) + ' rows',
          b.offHeight <= 3 ? 'whole' : `+${b.offHeight}`);
      }
    }
  }
} finally {
  await browser.close();
  await harness.stop(relay);
  fs.rmSync(dir, { recursive: true, force: true });
}
