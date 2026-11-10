// Icons and connectors (BACKLOG CS-17): the icon set the lesson file names, and connectors kept on the layers they
// join (core/connectors.ts), which the store runs inside every change.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Deck, Slide } from '../src/core';
import { connectorGeometry, syncConnectors } from '../src/core/connectors';
import { cloneSlide } from '../src/core/defaults';
import { LESSON_ICONS, readLesson } from '../src/decks/lessonFormat';
import icons from '../src/assets/icons.json';

const box = (x: number, y: number, w = 200, h = 100) => ({ x, y, w, h, rot: 0 });
const layer = (id: string, kind: string, b?: ReturnType<typeof box>, params: Record<string, unknown> = {}) => ({ id, kind, name: id, visible: true, box: b, params });

test('the icon set: Lucide\'s drawing for every listed icon, in its groups, credited', () => {
  const set = icons as unknown as { source: string; size: number; groups: Record<string, string[]>; icons: Record<string, unknown[]> };
  assert.match(set.source, /Lucide.*ISC/);
  assert.equal(set.size, 24);
  const listed = Object.values(set.groups).flat();
  assert.deepEqual([...listed].sort(), Object.keys(set.icons).sort());
  assert.ok(listed.length >= 100);
  for (const name of ['lightbulb', 'chart-column', 'user', 'clock', 'megaphone']) assert.ok(LESSON_ICONS.includes(name), name);
});

test('side by side, a connector leaves the facing sides; one above the other, top and bottom', () => {
  const across = connectorGeometry(box(100, 100), box(600, 140));
  assert.equal(across.ends.side, 'h');
  assert.deepEqual([across.box.x + across.ends.x1, across.box.y + across.ends.y1], [300, 150], 'the right side of the first');
  assert.deepEqual([across.box.x + across.ends.x2, across.box.y + across.ends.y2], [600, 190], 'the left side of the second');
  const down = connectorGeometry(box(100, 100), box(120, 500));
  assert.equal(down.ends.side, 'v');
  assert.deepEqual([down.box.x + down.ends.x1, down.box.y + down.ends.y1], [200, 200]);
  assert.deepEqual([down.box.x + down.ends.x2, down.box.y + down.ends.y2], [220, 500]);
});

test('the store\'s sync: a connector follows its layers, and one whose layer has gone says so', () => {
  const deck = { slides: [{ id: 's', layers: [
    layer('a', 'text', box(100, 100)), layer('b', 'text', box(600, 100)),
    layer('c', 'connector', box(0, 0, 10, 10), { from: 'a', to: 'b' }),
    layer('d', 'connector', box(0, 0, 10, 10), { from: 'a', to: 'gone' }),
  ] }] } as unknown as Deck;
  syncConnectors(deck);
  const [c, d] = [deck.slides[0].layers[2], deck.slides[0].layers[3]];
  assert.equal(c.params._side, 'h');
  assert.equal(c.box!.x + Number(c.params._x2), 600);
  assert.equal(d.params._lost, true);
  (deck.slides[0].layers[1] as Slide['layers'][number]).box = box(100, 600);
  syncConnectors(deck);
  assert.equal(c.params._side, 'v', 'moved below, so it now runs down');
  assert.equal(c.box!.y + Number(c.params._y2), 600);
});

test('the lesson file\'s icons layout names icons from the set', () => {
  const lesson = (items: unknown) => JSON.stringify({ format: 'slideforge-lesson/1', title: 'T', slides: [{ layout: 'icons', title: 'Look at', items }] });
  assert.deepEqual(readLesson(lesson([['user', 'People', 'Who'], ['clock', 'Time', 'When']])).problems, []);
  assert.deepEqual(readLesson(lesson([['unicorn', 'A', 'B'], ['clock', 'Time', 'When']])).problems, ['Slide 1: row 1\'s icon "unicorn" is not in the studio\'s set (docs/lesson-format.md lists them).']);
  assert.deepEqual(readLesson(lesson([['clock', 'Time', 'When']])).problems, ['Slide 1: "items" must be two to six [icon, label, what it means].']);
});

test('a slide copied with its connectors (Duplicate, the gallery) keeps them joined to the copies', () => {
  const s = { id: 's', name: 'S', background: '', transition: { type: 'none', duration: 0 }, notes: '', layers: [
    layer('a', 'text', box(100, 100)), layer('b', 'text', box(600, 100)), layer('c', 'connector', box(0, 0, 10, 10), { from: 'a', to: 'b' }),
  ] } as unknown as Slide;
  const copy = cloneSlide(s);
  const [a, b, c] = copy.layers;
  assert.notEqual(a.id, 'a');
  assert.deepEqual([c.params.from, c.params.to], [a.id, b.id], 'joined to the copies');
  const deck = { slides: [copy] } as unknown as Deck;
  syncConnectors(deck);
  assert.equal(c.params._lost, undefined, 'not lost');
  assert.deepEqual([s.layers[2].params.from, s.layers[2].params.to], ['a', 'b'], 'the original is left as it was');
});

test('a connector to a hidden layer has lost it, and says so', () => {
  const deck = { slides: [{ id: 's', layers: [
    layer('a', 'text', box(100, 100)), { ...layer('b', 'text', box(600, 100)), visible: false },
    layer('c', 'connector', box(0, 0, 10, 10), { from: 'a', to: 'b' }),
  ] }] } as unknown as Deck;
  syncConnectors(deck);
  assert.equal(deck.slides[0].layers[2].params._lost, true);
});

test('a rotated layer is joined at the edge it is drawn with, not its unrotated box', () => {
  // A 200 × 100 box turned a quarter is drawn 100 wide and 200 high about the same middle (200, 150).
  const turned = { x: 100, y: 100, w: 200, h: 100, rot: 90 };
  const g = connectorGeometry(turned, box(600, 100));
  assert.equal(g.ends.side, 'h');
  assert.equal(Math.round(g.box.x + g.ends.x1), 250, 'the right edge of what is drawn, not 300');
});
