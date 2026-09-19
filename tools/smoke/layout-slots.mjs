import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import harness from '../../tests/harness.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-layout-slots-'));
const port = await harness.freePort();
const relay = await harness.start(port, dir);
let browser;
try {
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1500, height: 1100 } });
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const report = await page.evaluate(async () => {
    const stage = document.createElement('div');
    stage.style.cssText = 'position:fixed;left:-20000px;top:0;width:1280px;height:720px';
    document.body.append(stage);
    const style = document.createElement('style');
    style.textContent = '* { animation:none!important;transition:none!important }';
    stage.append(style);
    const keys = ['layout-bank', ...Object.keys(SF.LIBRARY_SEED_KEYS).filter(k => SF.LIBRARY_SEED_KEYS[k] === 'nul' || k.startsWith('aiad27-'))];
    const rows = [];
    for (const key of keys) {
      const deck = SF.buildLesson(key);
      for (const [index, slide] of deck.slides.entries()) {
        const root = SF.renderSlide(deck, slide, { index, total: deck.slides.length });
        stage.append(root);
        await document.fonts.ready;
        const host = SF.latticeHost(root);
        const kids = Array.from(host?.children || []).filter(n => !n.classList.contains('nu-eyebrow'));
        const map = SF.layoutRegionsFor(slide);
        const blocks = kids.map((n, i) => ({ key: SF.blockKeyOf(n, i), tag: n.tagName, cls: String(n.className), text: (n.textContent || '').slice(0, 35) }));
        rows.push({ lesson: key, index: index + 1, type: slide.type, composition: SF.slideComposition(deck, slide), design: slide.design, blocks, missing: blocks.filter(b => !map[b.key]).map(b => b.key) });
        root.remove();
      }
    }
    stage.remove();
    return rows;
  });
  if (process.argv.includes('--report')) console.log(JSON.stringify(report, null, 2));
  else {
    assert.ok(report.length > 200, 'demo, NUL and AIAD27 corpus must be included');
    assert.deepEqual(report.filter(r => r.missing.length), [], 'every rendered item must have declared coordinates');
    console.log(`Layout slots: ${report.length} reference slides checked.`);
  }
} finally {
  await browser?.close();
  relay.kill();
  fs.rmSync(dir, { recursive: true, force: true });
}
