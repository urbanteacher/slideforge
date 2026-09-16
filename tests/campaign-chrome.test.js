'use strict';
/* The furniture around a campaign slide — header, closing rule, both marks.
 *
 * Driven in a browser because every fault it guards was a rendered fact
 * rather than a modelled one: a colour that matched its own ground, a
 * reservation for something absent, an artboard silently scaled down.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const root = path.resolve(__dirname, '..');

test('campaign slide chrome holds across all five strands',
  { timeout: 120000 }, async () => {
    const { stdout } = await promisify(execFile)(
      process.execPath, ['tools/smoke-campaign-chrome.mjs'],
      { cwd: root, timeout: 115000 });
    assert.match(stdout, /header, rule and both marks hold/);
  });
