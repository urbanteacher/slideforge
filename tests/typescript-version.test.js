'use strict';
/* One TypeScript for the root and the Lesson studio. They checked on different compilers (5.9 and 7.0),
 * and what passes one can fail the other: the classic JavaScript has 837 errors under 7, the studio none
 * under 5.9. Both are pinned to the same exact version until classic is deleted (lab-engine-plan M15),
 * after which the root checks only the shared logic and can move to 7 with the studio. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const version = (dir) => require(path.join(__dirname, '..', dir, 'package.json')).devDependencies.typescript;

test('the root and the Lesson studio use the same, exact TypeScript version', () => {
  const root = version('.'), lab = version('lab');
  assert.match(root, /^\d+\.\d+\.\d+$/, 'the root’s TypeScript is not pinned exactly: ' + root);
  assert.equal(lab, root, 'the studio and the root use different TypeScript versions');
});
