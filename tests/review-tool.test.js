'use strict';
/* The slide review dialog — the AiAd27 preview page and check-fit.mjs
 * generalised to any deck, reached from Look instead of a terminal.
 *
 * Driven in a browser because the thing under test is a measurement of laid
 * out text: whether content leaves the stage cannot be decided from the model.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const root = path.resolve(__dirname, '..');

test('any deck can be reviewed, and the fit check still fails on overflow',
  { timeout: 120000 }, async () => {
    const { stdout } = await promisify(execFile)(
      process.execPath, ['tools/smoke/review-tool.mjs'],
      { cwd: root, timeout: 115000 });
    assert.match(stdout, /any deck can be reviewed and fit-checked/);
  });
