'use strict';
/* The lab's own unit tests (lab/tests/*.test.ts), run from the root's npm test: built with the lab's Vite and
 * aliases (lab/vite.test.config.ts), then run with node --test. One root test per lab file, so a failure
 * names it; its output is shown when it fails. Without the lab's node_modules there is nothing to build
 * with, and this says so rather than failing (as tests/lab-convert.test.js does).
 * The root's node --test marks its children with NODE_TEST_CONTEXT. A nested node --test that inherits it
 * skips its files and exits 0, so every lab file passed without running; the child gets the environment
 * without it, and a file that reports no tests fails. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

const LAB = path.resolve(__dirname, '..', 'lab');
const VITE = path.join(LAB, 'node_modules', 'vite', 'bin', 'vite.js');
const skip = fs.existsSync(VITE) ? false : 'the lab has no node_modules to build its tests with';

let out = null;
function built() {
  if (out) return out;
  out = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-lab-unit-'));
  execFileSync(process.execPath, [VITE, 'build', '--config', 'vite.test.config.ts', '--logLevel', 'error'], { cwd: LAB, stdio: 'pipe', env: { ...process.env, SF_LAB_TEST_OUT: out } });
  return out;
}

const env = { ...process.env };
delete env.NODE_TEST_CONTEXT;

const files = fs.existsSync(path.join(LAB, 'tests')) ? fs.readdirSync(path.join(LAB, 'tests')).filter((f) => f.endsWith('.test.ts')) : [];
for (const f of files) {
  test('lab: ' + f, { skip }, () => {
    const file = path.join(built(), f.replace(/\.ts$/, '.mjs'));
    const r = spawnSync(process.execPath, ['--test', '--test-reporter=tap', file], { cwd: LAB, encoding: 'utf8', env });
    const said = r.stdout + r.stderr;
    assert.equal(r.status, 0, said.split('\n').filter((l) => /not ok|✖|Error|expected|actual/.test(l)).slice(0, 30).join('\n'));
    const ran = Number((/^# tests (\d+)/m.exec(r.stdout) || [])[1] || 0);
    assert.ok(ran > 0, 'ran no tests:\n' + said.slice(0, 2000));
  });
}
