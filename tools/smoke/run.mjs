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
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/* Curated, not complete: the whole suite takes far longer than a push should
   wait, and these are the ones that measure rendered geometry rather than a
   long activity flow. Anything not named here still runs in `--set all`. */
const SETS = {
  ci: ['fit-check', 'demo-deck', 'layout-fit', 'lesson-bank', 'handout', 'canvas-edit'],
  canvas: ['canvas-edit', 'demo-deck', 'layout-fit', 'fit-check', 'row-grid'],
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

const results = [];
for (const name of chosen) {
  console.log('\n── ' + name + ' (' + (results.length + 1) + '/' + chosen.length + ')');
  results.push(await run(name));
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
