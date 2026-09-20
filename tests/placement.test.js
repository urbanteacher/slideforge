'use strict';
/* One rule for putting something on the canvas.
 *
 * There were four. Adding an item looked for a free declared slot and halved
 * whatever was still in the way; dragging clamped to the grid and overlapped
 * freely; resizing did the same; the arrow keys did the same again. So the
 * canvas protected you when you inserted and abandoned you the moment you
 * moved what you had inserted — two headings could be dropped onto identical
 * cells, and nothing anywhere could say so, because latticeFit measures
 * whether a block's own words fit its own rows and reported "2 spare" over
 * the collision.
 *
 * The rule now: the block being moved gets exactly what was asked for,
 * whatever it lands on is pushed to the nearest free place, and a move that
 * cannot be resolved is refused whole rather than half-applied. Pushing
 * rather than stopping at the neighbour's edge is not a preference — a first
 * version stopped, and it made the canvas unusable, because building a layout
 * means growing one block through where another currently sits. gridstack and
 * react-grid-layout both push, and neither offers a stop-at-the-edge mode.
 *
 * These are the geometry and the search, which are pure and belong in the
 * fast suite. The three paths that call them are held to it by
 * tools/smoke/canvas-placement.mjs, on a real canvas with real pointers.
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

const GRID = { cols: 12, rows: 16 };
const r = (col, row, cols, rows) => ({ col, row, cols, rows });
/* The module runs in a vm, so objects it returns carry that realm's
   Object.prototype and deepStrictEqual rejects them against host literals
   however equal their contents. Round-trip before comparing. */
const plain = (v) => JSON.parse(JSON.stringify(v));

test('two regions share a cell, or they do not', () => {
  const SF = load();
  assert.equal(SF.regionsOverlap(r(1, 1, 5, 4), r(6, 1, 5, 4)), false, 'side by side, touching');
  assert.equal(SF.regionsOverlap(r(1, 1, 5, 4), r(5, 1, 5, 4)), true, 'one column into each other');
  assert.equal(SF.regionsOverlap(r(1, 1, 5, 4), r(1, 5, 5, 4)), false, 'stacked, touching');
  assert.equal(SF.regionsOverlap(r(1, 1, 5, 4), r(1, 4, 5, 4)), true, 'one row into each other');
  assert.equal(SF.regionsOverlap(r(1, 1, 12, 16), r(6, 8, 2, 2)), true, 'wholly inside counts');
  assert.equal(SF.regionsOverlap(null, r(1, 1, 2, 2)), false, 'a missing region is in nobody’s way');
});

test('every pair sharing a cell is reported, which nothing could ask before', () => {
  const SF = load();
  assert.deepEqual(plain(SF.overlapsIn({ a: r(1, 1, 5, 4), b: r(7, 1, 5, 4) })), [], 'clear');
  /* The exact state a drag used to produce: dropped onto its neighbour and
     given identical coordinates. */
  assert.deepEqual(plain(SF.overlapsIn({ a: r(7, 2, 5, 4), b: r(7, 2, 5, 4) })), [['a', 'b']]);
  const three = SF.overlapsIn({ a: r(1, 1, 6, 6), b: r(4, 4, 6, 6), c: r(11, 15, 2, 2) });
  assert.deepEqual(plain(three), [['a', 'b']], 'only the pair that touches');
});

test('a free place is the one nearest where it was asked for', () => {
  const SF = load();
  assert.deepEqual(plain(SF.freePlacement(r(1, 1, 4, 4), [], GRID)), r(1, 1, 4, 4),
    'somewhere free is left exactly where it was asked for, with no moved flag');
  const bumped = SF.freePlacement(r(7, 2, 5, 4), [r(7, 2, 5, 4)], GRID);
  assert.ok(bumped.moved, 'a taken spot reports that it had to move');
  assert.equal(SF.regionsOverlap(bumped, r(7, 2, 5, 4)), false, 'and lands clear');
  assert.equal(bumped.cols, 5, 'without being resized to fit');
  assert.equal(bumped.rows, 4);
  /* Rows weigh more than columns because these layouts are stacks: sliding
     along a row reads as the same place, dropping down a row does not. */
  assert.equal(bumped.row, 2, 'staying on its row when the row can hold it');
  assert.equal(SF.freePlacement(r(1, 1, 12, 16), [r(6, 8, 1, 1)], GRID), null,
    'a slide with no room for it says so rather than inventing a position');
  assert.equal(SF.freePlacement(r(1, 1, 13, 4), [], GRID), null, 'wider than the grid cannot be placed');
});

test('the block being moved gets what was asked for, and what it lands on moves', () => {
  const SF = load();
  const before = { a: r(1, 2, 5, 4), b: r(7, 2, 5, 4) };
  const after = SF.resolvePlacement(before, 'a', r(7, 2, 5, 4), GRID, []);
  assert.ok(after, 'the move is possible');
  assert.deepEqual(plain(after.a), r(7, 2, 5, 4), 'the moved block lands exactly where it was dropped');
  assert.equal(SF.regionsOverlap(after.a, after.b), false, 'and the one it landed on has shifted clear');
  assert.deepEqual(plain(SF.overlapsIn(after)), [], 'leaving nothing overlapping');
  assert.deepEqual(plain(before.b), r(7, 2, 5, 4), 'without writing through to the caller’s map');
});

test('growing a block through its neighbour is how a layout gets built', () => {
  const SF = load();
  /* The case that broke the first version, which stopped at the neighbour's
     edge: recreating `split` needs a 12-row copy column where a second item
     currently sits, and it came out 4 rows tall. */
  const before = { copy: r(1, 1, 11, 3), media: r(1, 5, 11, 3) };
  const after = SF.resolvePlacement(before, 'copy', r(1, 2, 6, 12), GRID, []);
  assert.ok(after, 'it must be possible at all');
  assert.deepEqual(plain(after.copy), r(1, 2, 6, 12), 'the copy column gets its full height');
  assert.deepEqual(plain(SF.overlapsIn(after)), [], 'and the media block is out of its way');
});

test('what cannot be pushed is an obstacle, and an unresolvable move is refused whole', () => {
  const SF = load();
  /* A block the layout drew is not an item's to shove, and a picture belongs
     to the decorative plane. Taking a layout block off the slide is the way
     past one. */
  const before = { title: r(1, 1, 12, 2), item: r(1, 4, 6, 4) };
  const onto = SF.resolvePlacement(before, 'item', r(1, 1, 12, 2), GRID, ['title']);
  assert.equal(onto, null, 'a move onto something immovable is refused');
  assert.deepEqual(plain(before.item), r(1, 4, 6, 4), 'and nothing is half-applied');
  const around = SF.resolvePlacement(before, 'item', r(1, 3, 6, 4), GRID, ['title']);
  assert.ok(around, 'clear of it is still allowed');
  assert.deepEqual(plain(around.item), r(1, 3, 6, 4));
  assert.deepEqual(plain(around.title), r(1, 1, 12, 2), 'and the immovable block has not moved');
});

test('a full slide refuses rather than stacking', () => {
  const SF = load();
  const before = { a: r(1, 1, 12, 8), b: r(1, 9, 12, 8), c: r(1, 1, 3, 3) };
  const after = SF.resolvePlacement(before, 'c', r(4, 4, 3, 3), GRID, ['a', 'b']);
  assert.equal(after, null, 'nowhere for the pushed block to go means the move does not happen');
});
