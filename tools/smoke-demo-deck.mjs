#!/usr/bin/env node
/* Smoke: Demo engine loads layout-bank (97) and Audit all stays within budget. */
import { chromium } from 'playwright';

const BASE = process.env.SF_BASE_URL || process.env.SF_URL || 'http://127.0.0.1:8787';
const url = `${BASE.replace(/\/$/, '')}/modular-canvas/preview.html`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1100 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

try {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('#demo-deck');
  await page.waitForFunction(() => typeof window.__demoAuditAll === 'function', null, {
    timeout: 30000,
  });

  const boot = await page.evaluate(() => ({
    options: document.querySelector('#demo-slide')?.options?.length,
    engines: ['playground', 'safe-deck', 'demo-deck'].every((id) => document.getElementById(id)),
  }));
  if (boot.options !== 97) throw new Error(`expected 97 demo slides, got ${boot.options}`);
  if (!boot.engines) throw new Error('playground / safe-deck / demo-deck missing');

  const summary = await page.evaluate(async () => {
    const rows = await window.__demoAuditAll();
    const fail = rows.filter((r) => !r.fits);
    const tiny = rows.filter((r) => !r.legible);
    return {
      total: rows.length,
      needSpace: fail.length,
      fit: rows.length - fail.length,
      underFloor: tiny.length,
      smallest: Math.min(...rows.filter((r) => r.smallest != null).map((r) => r.smallest)),
    };
  });

  if (summary.total !== 97) throw new Error(`audit total ${summary.total}`);
  /* Budget is the one known over-budget slide: #94 compare needs 597px in a 576px
     body even with zero padding and zero row gap, so no recipe change closes it.
     The budget equals the known failure on purpose — slack hides regressions. */
  if (summary.needSpace > 1) {
    throw new Error(`too many overflows: ${summary.needSpace} (budget 1)`);
  }
  /* Legibility is a second, independent verdict: geometry can pass at a size
     nobody can read. Most of these sizes come from production CSS, so this is a
     ratchet against getting worse, not a claim that 24 is acceptable. */
  if (summary.underFloor > 44) {
    throw new Error(`more slides under the 20px floor: ${summary.underFloor} (was 44)`);
  }
  if (errors.length) throw new Error(`page errors: ${errors.slice(0, 3).join('; ')}`);

  console.log(
    `ok · demo-deck ${summary.fit}/${summary.total} fit · ${summary.needSpace} need space · ` +
      `${summary.underFloor} under the 20px floor (smallest ${summary.smallest}px)`
  );
} finally {
  await browser.close();
}
