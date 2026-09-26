#!/usr/bin/env node
/* One way to run the smokes.
 *
 * There were 42 of these as tools/smoke-*.mjs, mixed in with the ten real
 * tools, and three hand-kept indexes disagreeing about them: 31 npm scripts
 * naming them one at a time, an `npm run smoke` chain of 22, and five listed
 * individually in CI. Twelve had no npm entry at all; nine of those were in
 * fact run, by a unit test shelling out to the path, which is a fourth index
 * and the least visible of them.
 *
 * This file discovers them instead of listing them, so a new smoke is
 * reachable the moment it is written and cannot fall out of an index kept by
 * hand. The sets below are the only hand-kept part, and they say which smokes
 * are fast enough for every push rather than which ones exist — and the runner
 * refuses a set naming a file that is gone, rather than quietly running one
 * fewer than it says.
 *
 *   node tools/smoke/run.mjs                 every smoke
 *   node tools/smoke/run.mjs canvas-edit     one, by name
 *   node tools/smoke/run.mjs fit-check demo  several
 *   node tools/smoke/run.mjs --set ci        what CI runs
 *   node tools/smoke/run.mjs --list          names and sets
 *
 * Each smoke owns a browser, so they run one at a time on purpose.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import harness from '../../tests/harness.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/* Curated, not complete: the whole suite takes far longer than a push should
   wait, and these are the ones that measure rendered geometry rather than a
   long activity flow. Anything not named here still runs with no arguments.

   Nine of the `ci` names used to be reached a second way, by a unit test in
   tests/ that spawned the smoke and matched a line of its output. Those
   wrappers are gone: they put a browser inside `npm test`, which is meant to
   be the fast check, and they were a second index of which smokes matter,
   kept in nine separate files. The coverage did not move — it is named here
   instead, where the other sets are, and the runner fails if any of it goes
   missing. Measured at 150s for the whole ci set, of which demo-deck is 39. */
const SETS = {
  ci: [
    'campaign-chrome', 'chrome-region', 'demo-deck', 'desk-overlay', 'exports', 'fit-check', 'handout',
    'lab-lesson', 'live-quiz', 'refresh', 'review-tool', 'share', 'slide-review', 'type-scale',
  ],
  /* Everything that touches saving, reloading, exporting or sharing a deck.
     The four added to `ci` above came from here after all four turned out to
     have been broken for a day without anyone noticing: refresh by a real
     regression, and exports, share and live-quiz by a path this suite's own
     move redirected. A curated set that does not include the things most
     likely to break quietly is a curated set that hides them. */
  deck: ['refresh', 'cold-start', 'exports', 'share', 'live-quiz'],
  /* The measures a slide answers to. (The classic canvas's three faces went
     with the classic studios; the lab edits slides now.) */
  canvas: ['demo-deck', 'fit-check', 'row-grid', 'type-scale'],
  review: ['review-tool', 'slide-review', 'fit-check'],
};

function available() {
  return fs.readdirSync(HERE)
    .filter((f) => f.endsWith('.mjs') && f !== 'run.mjs')
    .map((f) => f.replace(/\.mjs$/, ''))
    .sort();
}

function run(name) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(process.execPath, [path.join(HERE, name + '.mjs')], { stdio: 'inherit' });
    child.on('exit', (code) => resolve({ name, code: code ?? 1, ms: Date.now() - started }));
    child.on('error', () => resolve({ name, code: 1, ms: Date.now() - started }));
  });
}

const argv = process.argv.slice(2);
const names = available();

if (argv.includes('--list')) {
  console.log(names.length + ' smokes in tools/smoke:\n  ' + names.join('\n  '));
  console.log('\nsets:');
  for (const [key, list] of Object.entries(SETS)) console.log('  --set ' + key + ' → ' + list.join(', '));
  process.exit(0);
}

let chosen;
const setAt = argv.indexOf('--set');
if (setAt >= 0) {
  const key = argv[setAt + 1];
  if (!SETS[key]) {
    console.error('No such set: ' + key + '. Known sets: ' + Object.keys(SETS).join(', '));
    process.exit(2);
  }
  /* A set naming a smoke that no longer exists is a silently shrinking CI
     run, so say so rather than quietly running four of five. */
  const missing = SETS[key].filter((n) => !names.includes(n));
  if (missing.length) {
    console.error('Set "' + key + '" names smokes that are not in tools/smoke: ' + missing.join(', '));
    process.exit(2);
  }
  chosen = SETS[key];
} else {
  const asked = argv.filter((a) => !a.startsWith('-'));
  const unknown = asked.filter((n) => !names.includes(n));
  if (unknown.length) {
    console.error('No such smoke: ' + unknown.join(', ') + '\nTry --list.');
    process.exit(2);
  }
  chosen = asked.length ? asked : names;
}

/* Most smokes start their own server through tests/harness.js and are
   self-contained. Fourteen do not: they read a base URL and default it to
   port 8787, which is the dev server a person starts by hand. When that is
   up the suite reads 49/49; when it is not, those fourteen die in four
   tenths of a second with a raw Playwright stack trace and no hint that a
   missing server is the reason. The same suite, two answers, depending on
   something outside it.

   So the runner starts one, always, and points them at it. Always rather
   than only-when-8787-is-down, because a run that behaves differently
   depending on what else is running on the machine is the thing being fixed;
   a smoke should not be able to tell whether you happen to be developing at
   the time. Three env names because the fourteen ask in three different ways
   — SF_URL, SF_BASE_URL and SLIDEFORGE_URL — which is its own small mess and
   worth collapsing separately. An explicitly set name is left alone, so
   pointing the suite at a deployed build still works. */
const port = await harness.freePort();
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-smoke-run-'));
const relay = await harness.start(port, dir);
const base = 'http://127.0.0.1:' + port;
for (const name of ['SF_URL', 'SF_BASE_URL', 'SLIDEFORGE_URL']) {
  if (!process.env[name]) process.env[name] = base;
}
console.log('serving the app at ' + base + ' for smokes that need one');

const results = [];
try {
  for (const name of chosen) {
    console.log('\n── ' + name + ' (' + (results.length + 1) + '/' + chosen.length + ')');
    results.push(await run(name));
  }
} finally {
  relay.kill();
  fs.rmSync(dir, { recursive: true, force: true });
}

const failed = results.filter((r) => r.code !== 0);
const seconds = (ms) => (ms / 1000).toFixed(1) + 's';
console.log('\n' + '─'.repeat(54));
for (const r of results) console.log((r.code === 0 ? '  ok   ' : '  FAIL ') + r.name.padEnd(24) + seconds(r.ms));
console.log('─'.repeat(54));
console.log(results.length - failed.length + '/' + results.length + ' passed in '
  + seconds(results.reduce((n, r) => n + r.ms, 0)));
if (failed.length) {
  console.error('failed: ' + failed.map((r) => r.name).join(', '));
  process.exit(1);
}
