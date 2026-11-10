// A share whose pictures travel apart (viewer/state.ts withPictures, BACKLOG CS-14 step 2): fetched back by number,
// a missing one left empty and counted, and an old share, its pictures inside, handed back as it was.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sharedDeck, withPictures } from '../src/viewer/state';

const deck = (extra: Record<string, unknown>) => ({ title: 'T', width: 1920, height: 1080, studio: 1, slides: [{ id: 's', name: 'S', background: '', notes: '', transition: { type: 'none', duration: 0 }, layers: [{ id: 'a', kind: 'image', params: { src: '@picture:0' } }, { id: 'b', kind: 'image', params: { src: '@picture:1' } }] }], ...extra });

test('the pictures come back by number, and the viewer reads the lesson whole', async () => {
  const asked: number[] = [];
  const { doc, missing } = await withPictures(deck({ pictureCount: 2 }), async (n) => { asked.push(n); return `data:image/png;base64,P${n}`; });
  assert.equal(missing, 0);
  assert.deepEqual(asked.sort(), [0, 1]);
  const shared = sharedDeck(doc);
  assert.deepEqual(shared!.deck.slides[0].layers.map((l) => l.params.src), ['data:image/png;base64,P0', 'data:image/png;base64,P1']);
});

test('a picture that cannot be had is left empty and counted', async () => {
  const { doc, missing } = await withPictures(deck({ pictureCount: 2 }), async (n) => (n === 1 ? null : 'data:image/png;base64,P0'));
  assert.equal(missing, 1);
  assert.equal(sharedDeck(doc)!.deck.slides[0].layers[1].params.src, '');
});

test('a share made the old way, pictures inside, is handed back as it was', async () => {
  const old = deck({ pictures: ['data:image/png;base64,A', 'data:image/png;base64,B'] });
  const { doc, missing } = await withPictures(old, async () => { throw new Error('not asked'); });
  assert.equal(doc, old);
  assert.equal(missing, 0);
});
