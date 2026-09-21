'use strict';
/* Every <script src> in every page has to resolve to a file that exists.
 *
 * Added after src/editor/customize.js: js/customize.js was deleted and its tag
 * removed from index.html, but presenter.html, view.html and
 * modular-canvas/preview.html loaded it too. Nothing failed until a smoke
 * asserted SF.Custom on the preview page, forty minutes later. A missing
 * script is silent — the browser 404s it and carries on with a subsystem
 * quietly absent — so it is worth a test rather than a habit.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

function pages(dir, found) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) pages(full, found);
    else if (e.name.endsWith('.html')) found.push(full);
  }
  return found;
}

test('every script a page loads is a file that exists', () => {
  const missing = [];
  for (const page of pages(ROOT, [])) {
    const html = fs.readFileSync(page, 'utf8');
    for (const m of html.matchAll(/<script[^>]+src="([^"]+)"/g)) {
      const src = m[1];
      if (/^(https?:)?\/\//.test(src) || src.startsWith('data:')) continue;
      const bare = src.split('?')[0];
      const from = bare.startsWith('/')
        ? path.join(ROOT, bare)
        : path.resolve(path.dirname(page), bare);
      /* A page in a subdirectory may reach the app's js/ from the root. */
      const alt = path.join(ROOT, bare.replace(/^(\.\.\/)+/, ''));
      if (!fs.existsSync(from) && !fs.existsSync(alt)) {
        missing.push(path.relative(ROOT, page) + ' -> ' + src);
      }
    }
  }
  assert.deepEqual(missing, [], 'script tags pointing at files that do not exist');
});
