// Hard rule 13 (docs/lab-engine-plan.md, from M1.5): small files. Aim for under 400 lines; a lab source file over
// 800 fails. ALLOWED lists the files still being split, each with why it waits; it must be empty when M1.5 is
// done, and a file on it that has come under the budget (or gone) must leave it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lineCount, sourceFiles } from './source';

const BUDGET = 800;

/** Files still over the budget, and why each one is waiting. */
const ALLOWED: Record<string, string> = {
};

test(`no lab source file is over ${BUDGET} lines, beyond the files still being split`, () => {
  const over = sourceFiles().filter((f) => lineCount(f) > BUDGET && !ALLOWED[f]).map((f) => `${f} (${lineCount(f)} lines)`);
  assert.deepEqual(over, [], `over ${BUDGET} lines: split them (hard rule 13)`);
});

test('every file on the allowlist is still there and still over the budget', () => {
  const files = new Set(sourceFiles());
  const stale = Object.keys(ALLOWED).filter((f) => !files.has(f) || lineCount(f) <= BUDGET);
  assert.deepEqual(stale, [], 'take these off the allowlist');
});
