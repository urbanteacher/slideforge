// A connector in the editor (BACKLOG CS-17, CR-09, CR-12): double-clicking it offers no words to edit (its ends are
// layer ids, chosen by name in its tab), and a deck opened with a connector whose stored box is out of date has it
// brought up to date, so it is selected where it is drawn.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import './dom-stand-in';
import { blankDeck, type Deck } from '../src/core';
import { useStore } from '../src/store';
import { wordFields, editsOnCanvas } from '../src/ui/stage/CanvasEditors';

const box = (x: number, y: number, w = 200, h = 100) => ({ x, y, w, h, rot: 0 });
const layer = (id: string, kind: string, b: ReturnType<typeof box>, params: Record<string, unknown> = {}) => ({ id, kind, name: id, visible: true, opacity: 1, blend: 'normal', box: b, params, anim: {}, interact: {} });

test('a connector has no words to edit on the canvas', () => {
  const c = layer('c', 'connector', box(0, 0, 10, 10), { from: 'a', to: 'b' });
  assert.deepEqual(wordFields(c as never), []);
  assert.equal(editsOnCanvas(c as never), false);
});

test('a deck opened with a stale connector box has it brought up to date', () => {
  const d = blankDeck();
  d.slides[0].layers.push(layer('a', 'shape', box(100, 100)) as never, layer('b', 'shape', box(600, 100)) as never, layer('c', 'connector', box(0, 0, 10, 10), { from: 'a', to: 'b' }) as never);
  useStore.getState().loadDeck(d as Deck);
  const c = useStore.getState().deck.slides[0].layers.find((l) => l.id === 'c')!;
  assert.equal(c.box!.x, 300 - 24, 'starts at the right edge of the first, less its padding');
  assert.equal(c.params._side, 'h');
});
