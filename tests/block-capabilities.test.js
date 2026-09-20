'use strict';
/* Every kind answers for itself.
 *
 * What can be done to a block — typed into, resized, duplicated — used to be
 * inferred at four call sites by three mechanisms: a round-trip string
 * comparison, the `blocks.` key prefix twice over, and the presence of a
 * `draw` function standing in for "not prose". Each of this week's canvas
 * bugs was one of those inferences being wrong somewhere: handles that never
 * appeared on an item with words in it, four implementations of delete, two
 * copies of the same prefix test gating Duplicate and Remove.
 *
 * The answers now live on the kind. This holds the table to being complete,
 * which is the only part a new kind can get wrong silently: a ninth kind
 * added with a tag, a label and a footprint will render perfectly and answer
 * `undefined` to every question the canvas asks about it.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function load() {
  const dir = path.resolve(__dirname, '..');
  const stub = () => ({ style: {}, classList: { add() {}, contains: () => false },
    setAttribute() {}, appendChild() {} });
  const context = { window: {}, console, Date,
    document: { createElement: stub, querySelector: () => null, querySelectorAll: () => [] } };
  context.globalThis = context;
  vm.createContext(context);
  for (const f of ['js/model.js', 'js/render.js']) {
    vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), context);
  }
  return context.window.SF;
}

const EDITS = ['inline', 'rail', false];

test('every kind declares what can be done to it', () => {
  const SF = load();
  const kinds = SF.FREE_KINDS;
  const names = Object.keys(kinds);
  assert.ok(names.length >= 8, 'the table must have been found, got ' + names.length);
  const missing = [];
  for (const name of names) {
    const k = kinds[name];
    if (k.edits === undefined) missing.push(name + '.edits');
    else if (!EDITS.includes(k.edits)) missing.push(name + ".edits is " + JSON.stringify(k.edits));
    if (typeof k.resizes !== 'boolean') missing.push(name + '.resizes');
    if (typeof k.duplicates !== 'boolean') missing.push(name + '.duplicates');
  }
  assert.deepEqual(missing, [],
    'a kind that does not answer leaves the canvas inferring again:\n  ' + missing.join('\n  '));
});

test('what a kind renders is not what says where it is edited', () => {
  const SF = load();
  const kinds = SF.FREE_KINDS;
  /* `quote` draws its own markup and is still typed into where it sits, so
     the presence of `draw` never was a proxy for editability — which is the
     mistake two call sites were making and getting right by luck. If this
     ever becomes true, `edits` has stopped earning its place. */
  const drawnAndInline = Object.keys(kinds)
    .filter((k) => kinds[k].draw && kinds[k].edits === 'inline');
  assert.ok(drawnAndInline.length,
    'at least one kind must draw its own markup and still be typed into on the canvas, ' +
    'or `edits` is just spelling `!draw` a longer way');
  assert.ok(drawnAndInline.includes('quote'), 'quote is that kind, got ' + drawnAndInline.join(', '));
});

test('a kind that hands its words to the rail has somewhere to put them', () => {
  const SF = load();
  const kinds = SF.FREE_KINDS;
  /* 'rail' means the rendered form is not the stored form — a bullet list is
     lines, a pair is a tab — so the inspector needs a field for it. Every one
     of them draws, and none of them is the picture, which has no words at
     all and says `false` instead. */
  for (const name of Object.keys(kinds)) {
    if (kinds[name].edits !== 'rail') continue;
    assert.ok(kinds[name].draw,
      name + " edits in the rail but renders as plain prose, so it could be typed into where it sits");
  }
  assert.equal(kinds.image.edits, false, "a picture's text is a path, and the picker owns it");
});
