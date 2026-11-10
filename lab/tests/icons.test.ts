// The slide icons (BACKLOG CS-17, CR-15, CR-21 to CR-24): names that are only object properties are not icons, Lucide's
// older names reach their icons, every element Lucide draws is drawn (polylines and polygons too, filled dots
// filled), and the set carries Lucide's licence, with Feather's MIT notice, wherever it goes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { drawElements, hasIcon, iconName } from '../src/kinds/icon/draw';
import icons from '../src/assets/icons.json';
import { root } from './replay-kit';

/** A canvas context that writes down what is drawn. */
function recorder() {
  const calls: string[] = [];
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (_t, k) => (typeof k === 'string' && ['save', 'restore', 'translate', 'scale', 'beginPath', 'moveTo', 'lineTo', 'closePath', 'arc', 'ellipse', 'roundRect', 'stroke', 'fill'].includes(k) ? (...a: unknown[]) => { calls.push(`${k}(${a.join(',')})`); } : undefined),
    set: () => true,
  });
  return { ctx: ctx as never, calls };
}

test('a name that is only a property of every object is not an icon, and draws nothing', () => {
  for (const name of ['constructor', 'toString', '__proto__', 'valueOf']) {
    assert.equal(hasIcon(name), false, name);
    assert.equal(iconName(name), null, name);
  }
});

test('Lucide\'s older names reach the icon they now go by', () => {
  assert.equal(iconName('house'), 'house');
  assert.equal(iconName('home'), 'house');
  assert.equal(iconName('alert-triangle'), 'triangle-alert');
  assert.equal(iconName('unicorn'), null);
});

test('polylines and polygons are drawn; an element Lucide fills is filled as well as stroked', () => {
  const { ctx, calls } = recorder();
  drawElements(ctx, [['polyline', { points: '4 12 10 18 20 6' }], ['polygon', { points: '2,2 6,2 4,6' }], ['circle', { cx: 7, cy: 7, r: 0.5, fill: 'currentColor' }]], 0, 0, 24, '#000');
  assert.deepEqual(calls.filter((c) => /^(moveTo|lineTo|closePath|fill|stroke)/.test(c)), [
    'moveTo(4,12)', 'lineTo(10,18)', 'lineTo(20,6)', 'stroke()',
    'moveTo(2,2)', 'lineTo(6,2)', 'lineTo(4,6)', 'closePath()', 'stroke()',
    'fill()', 'stroke()',
  ]);
});

test('the set carries Lucide\'s licence and Feather\'s MIT notice, in the file and beside the app', () => {
  const set = icons as unknown as { source: string; license: string };
  assert.match(set.source, /lucide-react@\d+\.\d+\.\d+/);
  assert.match(set.license, /ISC License/);
  assert.match(set.license, /Cole Bemis/);
  const file = resolve(root, 'lab/public/icons-LICENSE.txt');
  assert.ok(existsSync(file));
  assert.match(readFileSync(file, 'utf8'), /Cole Bemis/);
});
