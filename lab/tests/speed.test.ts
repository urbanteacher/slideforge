// What a change costs (CR-65, CR-66): the store brings connectors up to date only on the slides a change touched, and
// a connector is drawn again only when a layer it joins moves, not on every keystroke elsewhere on its slide.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import './dom-stand-in';
import '../src/kinds';
import { produce } from 'immer';
import type { Deck, Layer, Slide } from '../src/core';
import { sameReads, slideReads } from '../src/engine';
import { syncChangedConnectors } from '../src/store/store';

const box = (x: number, y: number) => ({ x, y, w: 200, h: 100, rot: 0 });
const layer = (id: string, kind: string, b: ReturnType<typeof box>, params: Record<string, unknown> = {}) => ({ id, kind, name: id, visible: true, opacity: 1, blend: 'normal', box: b, params, anim: {}, interact: {} }) as unknown as Layer;
const slide = (id: string, layers: Layer[]) => ({ id, name: id, background: '#fff', notes: '', transition: { type: 'none', duration: 0 }, layers }) as unknown as Slide;

test('a connector is drawn again when a layer it joins moves, not when something else on the slide changes', () => {
  const s0 = slide('s', [layer('a', 'shape', box(100, 100)), layer('b', 'shape', box(600, 100)), layer('t', 'text', box(100, 600), { text: 'Hi' }), layer('c', 'connector', box(0, 0), { from: 'a', to: 'b' })]);
  const c = s0.layers[3];
  const before = slideReads(c, s0);
  const typed = produce(s0, (s) => { s.layers[2].params.text = 'Hi there'; });
  assert.notEqual(typed.layers, s0.layers, 'the slide\'s layers did change');
  assert.ok(sameReads(before, slideReads(typed.layers[3], typed)), 'typing elsewhere: not drawn again');
  const moved = produce(s0, (s) => { s.layers[1].box!.x = 900; });
  assert.ok(!sameReads(before, slideReads(moved.layers[3], moved)), 'a joined layer moved: drawn again');
  assert.equal(slideReads(s0.layers[0], s0), null, 'a kind that does not read its slide reads nothing');
});

test('the store syncs connectors only on the slides a change touched, and leaves the rest as they were', () => {
  const deck = { id: 'd', title: 'D', width: 1920, height: 1080, version: 2, slides: Array.from({ length: 150 }, (_, i) => slide(`s${i}`, [
    ...Array.from({ length: 28 }, (_, k) => layer(`l${i}-${k}`, 'shape', box(k * 10, 100))),
    layer(`a${i}`, 'shape', box(100, 400)), layer(`c${i}`, 'connector', box(0, 0), { from: `l${i}-0`, to: `a${i}` }),
  ])) } as unknown as Deck;
  const synced = syncChangedConnectors({ ...deck, slides: [] } as Deck, deck); // bring every connector up to date once
  const move = (d: Deck) => produce(d, (x) => { x.slides[7].layers[0].box!.y = 700; });
  const changed = move(synced);
  const next = syncChangedConnectors(synced, changed);
  assert.equal(next.slides[3], synced.slides[3], 'an untouched slide is the same object');
  const c = next.slides[7].layers.find((l) => l.kind === 'connector')!;
  assert.ok(Math.abs(c.box!.y + Number(c.params._y1) - 700) < 1 || c.params._side === 'v', 'the moved slide\'s connector follows');
  // What a drag step costs on a lesson this size, measured, not assumed.
  const t = performance.now();
  for (let i = 0; i < 50; i++) syncChangedConnectors(synced, move(synced));
  const per = (performance.now() - t) / 50;
  console.log(`  a drag step on 150 slides × 30 layers: ${per.toFixed(3)} ms`);
  assert.ok(per < 5, `${per.toFixed(2)} ms a step`);
});
