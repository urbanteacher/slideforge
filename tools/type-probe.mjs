/*
 * Do the declared types actually catch anything?
 *
 * `npm run typecheck` passing proves nothing on its own — a codebase with no
 * annotations at all passes it too. This injects a realistic mistake, runs
 * the checker, and reverts. A MISSED line is a boundary the types do not
 * cover yet, which is the number worth tracking.
 *
 * Works on a throwaway copy of src/, never on the working tree, so an
 * interrupted run cannot leave an injected bug behind.
 *
 * Usage: npm run typecheck:probe
 */
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const cases = [
  ['typo in a slide field, in makeSlide', 'src/model.js',
    "s.title = 'Section heading';", "s.titel = 'Section heading';"],
  ['typo in a slide field, in an engine compile', 'src/games/choice.js',
    's.options = q.options.filter', 's.optoins = q.options.filter'],
  ['wrong type written into Question.question', 'src/model.js',
    "q.question = String(q.question || '');", 'q.question = 123;'],
  ['typo in a Question field, in normalizeQuestion', 'src/model.js',
    'q.voteOnly = q.voteOnly === true;', 'q.voteOnlyy = q.voteOnly === true;'],
  ['wrong argument count to gameStyle()', 'src/model.js',
    'gameStyle(style).normalize(q);', 'gameStyle(style, 1, 2).normalize(q);'],
  ['engine declares a mechanic that does not exist', 'src/games/race.js',
    "mechanic: 'race',", "mechanic: 'gallop',"],
  ['engine drops a required hook', 'src/games/race.js',
    'summary: function (q) { return choice.summary(q); }',
    'xsummary: function (q) { return choice.summary(q); }'],
  ['board engine field renamed out of sync', 'src/boards/bingo.js',
    "field: 'bingoBoard',", "field: 'bingoBoardd',"],
  ['board engine drops a required hook', 'src/boards/bingo.js',
    'decorateIntro,', 'xdecorateIntro,'],
  ['deck built with a theme that does not exist', 'src/model.js',
    "theme: 'studio',", "theme: 'chartreuse',"],
  ['engine given a style key that is not registered', 'src/games/race.js',
    "key: 'race',", "key: 'racing',"],
  ['slide given a transition that does not exist', 'src/model.js',
    "transition: 'fade',", "transition: 'dissolve',"],
];

const repo = process.argv[2] || '.';
const work = mkdtempSync(join(tmpdir(), 'slideforge-type-probe-'));
process.on('exit', () => rmSync(work, { recursive: true, force: true }));

for (const item of ['src', 'tsconfig.json', 'node_modules']) {
  cpSync(join(repo, item), join(work, item), { recursive: true });
}

function errorCount() {
  try {
    execFileSync('node_modules/.bin/tsc', ['--noEmit'], { cwd: work, encoding: 'utf8' });
    return 0;
  } catch (run) {
    return (String(run.stdout || '').match(/error TS/g) || []).length;
  }
}

const base = errorCount();
if (base !== 0) {
  console.error(`Working tree does not typecheck (${base} errors). Fix those first.`);
  process.exit(1);
}

let caught = 0;
let skipped = 0;
for (const [label, file, find, replace] of cases) {
  const path = join(work, file);
  const original = readFileSync(path, 'utf8');
  if (!original.includes(find)) {
    console.log(`ANCHOR?      ${label} — probe is stale, update it`);
    skipped++;
    continue;
  }
  writeFileSync(path, original.replace(find, replace));
  const n = errorCount();
  writeFileSync(path, original);
  if (n > base) caught++;
  console.log(`${n > base ? 'CAUGHT' : 'MISSED'} (${n})  ${label}`);
}

console.log(`\n${caught}/${cases.length} caught${skipped ? `, ${skipped} stale` : ''}`);
process.exitCode = caught + skipped === cases.length ? 0 : 1;
