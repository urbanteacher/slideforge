#!/usr/bin/env node
/* Can every slot layout in the bank be expressed as a vertical stack?
 *
 * This decides how rearranging should work. If slots are stacks, a reorder is a
 * list move and row positions can be derived by stacking — no coordinates in the
 * data, so no coordinate rewriting on every drag. If slots overlap or float, a
 * reorder means recomputing positions and we need freeform handles instead.
 *
 * Run with the server on 8787 (or set SF_BASE_URL).
 */
import { chromium } from 'playwright';

const BASE = (process.env.SF_BASE_URL || process.env.SF_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');
const ROWS = 16;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1500, height: 1100 } });
  await page.goto(`${BASE}/modular-canvas/preview.html`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForFunction(() => typeof window.__demoAuditAll === 'function', null, { timeout: 30000 });

  const types = await page.evaluate(async () => {
    const select = document.querySelector('#demo-slide');
    const seen = new Set();
    const out = [];
    for (let i = 0; i < select.options.length; i++) {
      select.value = String(i);
      select.dispatchEvent(new Event('change'));
      await new Promise((r) => setTimeout(r, 45));
      await new Promise(requestAnimationFrame);
      const root = document.querySelector('#demo-deck .safe-stage')?.firstElementChild;
      if (!root) continue;
      const type = document.querySelector('#demo-deck .safe-status')?.textContent.match(/· (\w+) ·/)?.[1];
      if (!type || seen.has(type)) continue;
      seen.add(type);
      const slots = [...root.querySelectorAll('.safe-slot')]
        .map((s) => {
          const a = s.style.gridArea.match(/(\d+) \/ (\d+) \/ span (\d+) \/ span (\d+)/);
          return a ? { name: s.dataset.name, row: +a[1], col: +a[2], rows: +a[3], cols: +a[4] } : null;
        })
        .filter(Boolean);
      out.push({ type, slots });
    }
    return out;
  });

  /* Two slots belong to the same stack when their column ranges intersect:
     side-by-side slots are separate stacks, stacked slots are one. */
  const intersects = (a, b) => a.col < b.col + b.cols && b.col < a.col + a.cols;
  let clean = 0;
  let sideBySide = 0;
  const spacerSizes = new Set();
  const failures = [];

  for (const { type, slots } of types) {
    const parent = slots.map((_, i) => i);
    const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
    for (let i = 0; i < slots.length; i++)
      for (let j = i + 1; j < slots.length; j++)
        if (intersects(slots[i], slots[j])) parent[find(i)] = find(j);

    const grouped = new Map();
    slots.forEach((s, i) => {
      const key = find(i);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(s);
    });
    const stacks = [...grouped.values()];

    const overlaps = [];
    const spacers = [];
    for (const stack of stacks) {
      stack.sort((a, b) => a.row - b.row);
      let cursor = 1;
      const gaps = [];
      for (const s of stack) {
        if (s.row < cursor) overlaps.push(`${s.name} starts at row ${s.row}, previous ends at ${cursor - 1}`);
        else if (s.row > cursor) gaps.push(s.row - cursor);
        cursor = Math.max(cursor, s.row + s.rows);
      }
      if (cursor <= ROWS) gaps.push(ROWS + 1 - cursor);
      gaps.forEach((g) => spacerSizes.add(g));
      spacers.push(gaps);
    }

    if (overlaps.length) failures.push({ type, overlaps });
    else clean++;
    if (stacks.length > 1) sideBySide++;

    console.log(
      `${type.padEnd(14)} ${stacks.length} stack${stacks.length > 1 ? 's' : ' '} · ` +
        `${overlaps.length ? 'OVERLAPS: ' + overlaps.join('; ') : 'ok'} · spacers ${JSON.stringify(spacers)}`
    );
  }

  console.log(
    `\n${clean}/${types.length} types express as vertical stacks · ` +
      `${sideBySide} use side-by-side stacks · spacer sizes ${[...spacerSizes].sort((a, b) => a - b).join(', ')} rows`
  );
  if (failures.length) {
    console.error(`\nNot stackable: ${failures.map((f) => f.type).join(', ')}`);
    console.error('Derived row positions cannot represent these; they need authored coordinates.');
    process.exitCode = 1;
  } else {
    console.log('Every layout is a stack: row positions can be derived, so a reorder is a list move.');
  }
} finally {
  await browser.close();
}
