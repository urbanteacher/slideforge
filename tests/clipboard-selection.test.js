'use strict';
/* Keyboard shortcuts versus a text selection.
 *
 * The shell's `typing` guard only asks where the caret is. Slide text is
 * ordinary rendered HTML, so highlighting a heading and pressing Cmd+C used
 * to reach copySlide() and lose the selection to its preventDefault().
 * Driven in a browser because the bug lives in real Selection behaviour.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const root = path.resolve(__dirname, '..');

test('highlighted text keeps the clipboard, and the slide shortcuts survive',
  { timeout: 90000 }, async () => {
    const { stdout } = await promisify(execFile)(
      process.execPath, ['tools/smoke-clipboard-selection.mjs'],
      { cwd: root, timeout: 85000 });
    assert.match(stdout, /highlighted text keeps the clipboard/);
  });
