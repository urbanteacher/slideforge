'use strict';
/* A seam must not capture a name that is assigned below it.
 *
 * The modules under src/ are handed their dependencies by a call like
 *   SF.createPanes(SF, { el: el, repaint: repaint, … })
 * in a js/ file. A function declaration hoists, so passing one is safe
 * wherever the call sits. A `var` does not: if it is assigned further down the
 * file, the seam captures undefined and the module calls it later and throws —
 * usually inside an event handler, where the only symptom is that a pane stops
 * redrawing.
 *
 * This has happened four times: viewport/hud/cheats in the presenter move, ws
 * in deck settings, el in the panes move, and drawRail when the rail
 * extraction turned a hoisted function into a late var and silently broke a
 * seam written before it. Three of the four were found by a smoke run minutes
 * to hours later; none by a unit test. Hence this.
 *
 * Accessors are the fix and are not flagged: `drawRail: function () { … }`
 * reads the binding when it is called, not when it is passed.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

/** Line at which a name becomes usable. 0 = hoisted function declaration. */
function bindings(lines) {
  const at = new Map();
  lines.forEach((line, i) => {
    const fn = /^\s*function ([A-Za-z_$][\w$]*)/.exec(line);
    if (fn && !at.has(fn[1])) at.set(fn[1], 0);
    /* `var a = x.a, b = x.b` — each name binds on this line. */
    for (const m of line.matchAll(/(?:^|[\s,(])([A-Za-z_$][\w$]*)\s*=\s*[A-Za-z_$]/g)) {
      if (!at.has(m[1])) at.set(m[1], i + 1);
    }
  });
  return at;
}

test('no seam captures a name bound below it', () => {
  const problems = [];
  for (const file of fs.readdirSync(path.join(ROOT, 'js')).filter((f) => f.endsWith('.js'))) {
    if (file === 'model.js' || file === 'qr.js') continue;
    const lines = fs.readFileSync(path.join(ROOT, 'js', file), 'utf8').split('\n');
    const at = bindings(lines);
    lines.forEach((line, i) => {
      if (!/SF\.(create|install)[A-Za-z]+\(SF\s*,\s*\{?/.test(line)) return;
      /* The call may span lines; read from it to its own closing `});`,
         and no further — reading past it attributes the next seam's
         arguments to this one. */
      let block = '';
      for (let j = i; j < lines.length; j++) {
        block += lines[j] + '\n';
        if (/\}\);\s*$/.test(lines[j]) || /\);\s*$/.test(lines[j])) break;
      }
      /* `name: value` where value is a bare identifier — a captured binding. */
      for (const m of block.matchAll(/(\w+)\s*:\s*([A-Za-z_$][\w$]*)\s*[,}\n]/g)) {
        const bound = at.get(m[2]);
        if (bound !== undefined && bound > i + 1) {
          problems.push(`js/${file}:${i + 1} passes ${m[1]}: ${m[2]} — bound at line ${bound}`);
        }
      }
    });
  }
  assert.deepEqual(problems, [], 'seams capturing names bound below them (use an accessor)');
});
