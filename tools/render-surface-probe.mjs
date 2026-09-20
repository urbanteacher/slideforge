#!/usr/bin/env node
/* The guard for splitting js/render.js.
 *
 * Nothing outside the renderer reaches inside it — consumers read the flat SF
 * namespace. So the whole safety story for the split is that the set of names
 * the renderer puts on SF, and the set of slide types it can lay out, come out
 * the other side unchanged. This records both and fails on any drift.
 *
 * It fails in BOTH directions. A missing name breaks a consumer; an added one
 * quietly widens a public surface that is meant to be shrinking, and would let
 * a split "succeed" by exporting every internal it happened to move.
 *
 * The layout check is a static scan rather than a call into LAYOUTS, because
 * that table is a local and stays one. A layout that loses its registration
 * does not throw — renderSlide falls back to layoutContent — so a quiz would
 * render as a bullet list with a clean console. This is what catches that.
 *
 *   node tools/render-surface-probe.mjs            check against the baseline
 *   node tools/render-surface-probe.mjs --update   re-record it after a
 *                                                  deliberate surface change
 *
 * No server and no browser: the renderer is loaded into a DOM shim, the same
 * way tests/word-plan.test.js does.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = fileURLToPath(new URL('../', import.meta.url));
const at = (p) => root + p;
const BASELINE = at('tools/baselines/render-surface.json');
const update = process.argv.includes('--update');

/* Load order is index.html's, not a list kept in step with it by hand. Reading
   the tags also proves every renderer file is actually wired into the page —
   a split file nobody added a <script> for would otherwise pass here and fail
   only in the browser. */
function rendererScripts() {
  const html = readFileSync(at('index.html'), 'utf8');
  const found = [...html.matchAll(/<script src="(js\/render[^"?]*\.js)[^"]*"/g)].map((m) => m[1]);
  if (!found.length) throw new Error('No js/render*.js script tags found in index.html.');
  return found;
}

/* Enough DOM for the renderer to define itself. It is never asked to draw
   anything here; this probe is about what lands on SF, not about output. */
function sandbox() {
  const stub = () => ({
    style: {}, dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    setAttribute() {}, appendChild() {}, querySelector: () => null, querySelectorAll: () => []
  });
  const box = {
    console, Date, URL, URLSearchParams, Math, JSON,
    addEventListener() {}, removeEventListener() {},
    setInterval: () => 1, clearInterval() {}, setTimeout: () => 1, clearTimeout() {},
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    location: { protocol: 'http:', origin: 'http://localhost:8787' },
    document: {
      addEventListener() {}, removeEventListener() {},
      createElement: stub, createElementNS: stub,
      body: { classList: { add() {}, remove() {}, toggle() {}, contains: () => false } },
      getElementById: () => null, querySelector: () => null, querySelectorAll: () => []
    }
  };
  box.window = box;
  box.globalThis = box;
  return box;
}

const box = sandbox();
vm.createContext(box);
const run = (file) => vm.runInContext(readFileSync(at(file), 'utf8'), box, { filename: file });

/* model.js first, and its names are the baseline to subtract: the renderer's
   surface is what it ADDS to SF, not everything SF ends up holding. */
run('js/model.js');
const beforeRender = new Set(Object.keys(box.SF));

const scripts = rendererScripts();
for (const file of scripts) run(file);

const surface = Object.keys(box.SF).filter((k) => !beforeRender.has(k)).sort();

/* Which slide types have a layout, across however many files now own them.
   Both registration forms count: the object literal render.js starts with, and
   the SF.registerLayout calls the split introduces. */
function registeredTypes() {
  const types = new Set();
  for (const file of scripts) {
    const src = readFileSync(at(file), 'utf8');
    const literal = src.match(/var LAYOUTS = \{([\s\S]*?)\n  \};/);
    if (literal) for (const m of literal[1].matchAll(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:/gm)) types.add(m[1]);
    for (const m of src.matchAll(/registerLayout\(\s*['"]([a-z]+)['"]/g)) types.add(m[1]);
  }
  return [...types].sort();
}

const layouts = registeredTypes();
const record = { surface, layouts };

if (update) {
  writeFileSync(BASELINE, JSON.stringify(record, null, 2) + '\n');
  console.log(`Recorded ${surface.length} SF names and ${layouts.length} layouts from ${scripts.length} file(s).`);
  process.exit(0);
}

let expected;
try {
  expected = JSON.parse(readFileSync(BASELINE, 'utf8'));
} catch {
  console.error(`No baseline at ${BASELINE}. Run: node tools/render-surface-probe.mjs --update`);
  process.exit(1);
}

const diff = (was, now) => ({
  missing: was.filter((x) => !now.includes(x)),
  added: now.filter((x) => !was.includes(x))
});
const names = diff(expected.surface, surface);
const types = diff(expected.layouts, layouts);

const report = [];
if (names.missing.length) report.push(`  ${names.missing.length} SF name(s) GONE — a consumer is broken: ${names.missing.join(', ')}`);
if (names.added.length) report.push(`  ${names.added.length} SF name(s) ADDED — the public surface widened: ${names.added.join(', ')}`);
if (types.missing.length) report.push(`  ${types.missing.length} layout(s) UNREGISTERED — these render as bullets, silently: ${types.missing.join(', ')}`);
if (types.added.length) report.push(`  ${types.added.length} layout(s) added: ${types.added.join(', ')}`);

/* A type the model knows about with no layout behind it renders as content
   without complaining, which is worth saying even when nothing has drifted. */
const known = Object.keys(box.SF.SLIDE_TYPES || {});
const unlaid = known.filter((t) => !layouts.includes(t));

if (report.length) {
  console.error(`render surface drifted across ${scripts.join(', ')}:`);
  console.error(report.join('\n'));
  console.error('\nIf the change was deliberate, re-record with --update and note it in docs/render-split.md §7.');
  process.exit(1);
}

console.log(`render surface intact: ${surface.length} SF names, ${layouts.length} layouts, ${scripts.length} file(s).`);
if (unlaid.length) console.log(`No layout registered (falls back to content): ${unlaid.join(', ')}`);
