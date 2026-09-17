#!/usr/bin/env node
/* Smoke: the editor's layout picker says whether your words survive the change.
 *
 * The picker already renders a trial of every candidate shape. These are those
 * same renders, measured where they sit, so the guardrail costs one pass and no
 * extra state. This checks the wiring end to end in the real editor, not in the
 * concept lab.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import harness from '../tests/harness.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-layout-fit-'));
const port = await harness.freePort();
const relay = await harness.start(port, dir);
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1700, height: 1050 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForFunction(() => typeof window.SF?.measureSlideFit === 'function', null, { timeout: 30000 });
  await page.waitForSelector('.design-panes [role=tab]', { timeout: 30000 });

  const openLayout = async () => {
    await page.evaluate(() => {
      const tab = [...document.querySelectorAll('.design-panes [role=tab]')].find((b) => /Layout/.test(b.textContent || ''));
      if (!tab) throw new Error('no Layout tab');
      tab.click();
    });
    await page.waitForSelector('.layout-library', { timeout: 15000 });
    /* Every thumbnail carries a verdict, so nothing is silently unmeasured. */
    await page.waitForFunction(
      () => {
        const choices = [...document.querySelectorAll('.layout-choice')];
        return choices.length > 0 && choices.every((c) => c.dataset.fit);
      },
      null,
      { timeout: 20000 }
    );
    return page.evaluate(() => {
      const choices = [...document.querySelectorAll('.layout-choice')];
      const counts = {};
      for (const c of choices) counts[c.dataset.fit] = (counts[c.dataset.fit] || 0) + 1;
      return {
        total: choices.length,
        counts,
        badges: choices.filter((c) => c.querySelector('.layout-fit')).length,
        tooltips: choices
          .filter((c) => c.dataset.fit === 'tight')
          .map((c) => c.querySelector('.layout-fit').title),
      };
    });
  };

  /* A fresh slide holds little text, so nothing should overflow. */
  const quiet = await openLayout();
  assert.ok(quiet.total >= 30, `expected the full layout library, got ${quiet.total}`);
  assert.equal(quiet.counts.tight ?? 0, 0, 'a nearly empty slide should not overflow any shape');
  assert.equal(quiet.badges, quiet.total - (quiet.counts.ok ?? 0), 'badges and verdicts disagree');

  /* Overfill it through the editor's own fields, then ask again. */
  await page.evaluate(() => {
    const tab = [...document.querySelectorAll('.design-panes [role=tab]')].find((b) => /Edit/.test(b.textContent || ''));
    tab?.click();
  });
  await page.waitForTimeout(400);
  const filled = await page.evaluate(() => {
    const fields = [...document.querySelectorAll('.inspector textarea, .inspector input[type=text]')].slice(0, 6);
    for (const field of fields) {
      field.focus();
      field.value = 'A sentence that will not stop going on and on about the thing it describes, at length. '.repeat(3);
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
    }
    return fields.length;
  });
  assert.ok(filled > 0, 'found no editor fields to overfill');
  await page.waitForTimeout(600);

  const loud = await openLayout();
  assert.ok(loud.counts.tight > 0, 'no shape was flagged after overfilling the slide');
  assert.ok(loud.counts.ok > 0, 'every shape was flagged, which is not a useful guardrail');

  /* The report has to be actionable: which element, which way, how far. The top
     edge is never reported — a line box sits above its own ink. */
  for (const tip of loud.tooltips) {
    assert.match(tip, /overflow this shape/, `unhelpful tooltip: ${tip}`);
    assert.match(tip, /(bottom|left|right) by \d+px/, `no direction and amount in: ${tip}`);
    assert.doesNotMatch(tip, /top by/, `the top edge is line-box noise, not overflow: ${tip}`);
    assert.match(tip, /Nothing is shrunk/, 'the report should say nothing is auto-shrunk');
  }

  /* Legibility is the second verdict, and it is separate from fit. */
  const small = await page.evaluate(() =>
    [...document.querySelectorAll('.layout-choice[data-fit=small] .layout-fit')].map((b) => b.title));
  for (const tip of small) {
    assert.match(tip, /under the \d+px floor/, `unhelpful legibility tooltip: ${tip}`);
  }

  assert.deepEqual(errors, []);
  console.log(
    `ok · layout picker ${loud.total} shapes measured · ${loud.counts.tight} would overflow · ` +
      `${loud.counts.small ?? 0} paint text under the floor · reports carry direction and pixels`
  );
} finally {
  await browser.close();
  await harness.stop(relay);
  fs.rmSync(dir, { recursive: true, force: true });
}
