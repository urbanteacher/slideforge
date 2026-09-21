'use strict';
/* Two screens, two blanks.
 *
 * The presenter window's key handler had `case 'B'` twice in one switch: once
 * beside 'b' and '.' for blanking the wall, and again below for Shift+B
 * blanking the phones. The first wins, so the second was dead code and the
 * phones could not be blanked at all — Shift+B blanked the wall instead,
 * silently, with the comment above the dead line still describing the
 * behaviour it was meant to have.
 *
 * Nothing catches that: it is valid JavaScript, it throws nothing, and the
 * only symptom is a key that does the wrong thing in a room. So this drives
 * the real handler with real key events, and separately refuses a duplicate
 * case label anywhere in the switch — which is the general form of the bug
 * and costs one line to hold.
 *
 * Caps Lock is why the shifted branch is not simply `case 'B'` on its own:
 * it sends key 'B' with shiftKey false, and blanking the wall is what that
 * should still do.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SOURCE = path.resolve(__dirname, '..', 'src/presenter/window.js');

/** The key switch, lifted out of the module and given a recording Player. */
function handler() {
  const src = fs.readFileSync(SOURCE, 'utf8');
  const start = src.indexOf("case 'b': case 'B'");
  assert.ok(start > 0, 'the key switch must be findable — has the blank case been renamed?');
  const end = src.indexOf('\n    }\n', start);
  const body = src.slice(start, end);
  const fn = new Function('e', `
    const calls = [];
    const Player = {
      control: (x) => calls.push('control:' + x), emit: (x) => calls.push('emit:' + x),
      resetScores: () => calls.push('resetScores'), close: () => calls.push('close'),
      endSpontaneous() {}, _focus: false, spontaneous: false
    };
    const SF = {}; const toggleSoloFeedback = () => {};
    switch (e.key) {
      ${body}
    }
    return calls;
  `);
  return (key, shiftKey) => fn({ key, shiftKey, preventDefault() {} });
}

test('B blanks the wall, Shift+B blanks the phones', () => {
  const press = handler();
  assert.deepEqual(press('b', false), ['control:blank'], 'plain b blanks the wall');
  assert.deepEqual(press('B', true), ['emit:blankPhonesToggle'],
    'Shift+B blanks the phones — this returned control:blank while the case was shadowed');
  assert.deepEqual(press('.', false), ['control:blank'], 'and . still blanks the wall');
});

test('Caps Lock does not turn B into the shifted command', () => {
  const press = handler();
  /* key 'B', shiftKey false. Splitting the shifted branch into its own case
     would leave this doing nothing at all. */
  assert.deepEqual(press('B', false), ['control:blank']);
});

test('no key is claimed twice in the switch', () => {
  const src = fs.readFileSync(SOURCE, 'utf8');
  const start = src.indexOf("case 'b': case 'B'");
  const end = src.indexOf('\n    }\n', start);
  const cases = src.slice(start, end).match(/case '([^']+)':/g).map((c) => c.slice(6, -2));
  const seen = new Set(), twice = [];
  for (const c of cases) { if (seen.has(c)) twice.push(c); seen.add(c); }
  assert.deepEqual(twice, [],
    'a second case for the same key is unreachable and silent: ' + twice.join(', '));
});
