// Pictures kept once, apart from the lesson's record (app/pictureStore.ts, BACKLOG CS-14): a lesson read back is the
// lesson that was saved, an unchanged picture is not written again, a missing one keeps its reference, and the sweep
// takes only pictures nobody refers to that are more than a day old.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PIC_MIN, pictureStore, type Kv } from '../src/app/pictureStore';

function memoryKv() {
  const m = new Map<string, unknown>();
  const writes: string[] = [];
  const kv: Kv = {
    get: async <T>(k: string) => structuredClone(m.get(k)) as T | undefined,
    getMany: async <T>(ks: string[]) => ks.map((k) => structuredClone(m.get(k)) as T | undefined),
    set: async (k, v) => { writes.push(k); m.set(k, structuredClone(v)); },
    setMany: async (es) => { for (const [k, v] of es) { writes.push(k); m.set(k, structuredClone(v)); } },
    del: async (k) => { m.delete(k); },
    keys: async () => [...m.keys()],
  };
  return { kv, m, writes };
}
const pic = (c: string) => `data:image/jpeg;base64,${c.repeat(PIC_MIN)}`;
const deck = (a: string, b: string) => ({ id: 'd', title: 'D', slides: [{ id: 's1', layers: [{ params: { src: a } }, { params: { src: b, fill: '#fff' } }] }, { id: 's2', layers: [{ params: { items: [{ src: a }] } }] }] });

test('a lesson stored and read back is the lesson that was saved, and the one passed in is not changed', async () => {
  const { kv, m } = memoryKv();
  const store = pictureStore(kv);
  const d = deck(pic('A'), 'data:image/png;base64,small');
  const before = JSON.stringify(d);
  const stored = await store.stash(d);
  assert.equal(JSON.stringify(d), before);
  const text = JSON.stringify(stored);
  assert.ok(!text.includes(pic('A')), 'the big picture is not in the record');
  assert.ok(text.includes('data:image/png;base64,small'), 'a small one stays in place');
  assert.equal((text.match(/sf-pic:[0-9a-f]{64}/g) ?? []).length, 2, 'used twice, referred to twice');
  assert.equal([...m.keys()].filter((k) => k.startsWith('pic:')).length, 1, 'kept once');
  await kv.set('deck:d', stored);
  const back = await store.restore(await kv.get('deck:d'));
  assert.deepEqual(back, { value: d, missing: [] });
});

test('an unchanged picture is not written again; a new one is', async () => {
  const { kv, writes } = memoryKv();
  const store = pictureStore(kv);
  await store.stash(deck(pic('A'), pic('B')));
  const n = writes.length;
  await store.stash(deck(pic('A'), pic('B')));
  assert.equal(writes.length, n);
  await store.stash(deck(pic('A'), pic('C')));
  assert.equal(writes.length, n + 1);
});

test('a lesson saved with its pictures inside reads as it always did', async () => {
  const { kv } = memoryKv();
  const d = deck(pic('A'), pic('B'));
  assert.deepEqual(await pictureStore(kv).restore(d), { value: d, missing: [] });
});

test('a missing picture keeps its reference, so the next save does not lose it, and is listed', async () => {
  const { kv, m } = memoryKv();
  const store = pictureStore(kv);
  const stored = await store.stash(deck(pic('A'), pic('B')));
  const gone = [...m.keys()].find((k) => k.startsWith('pic:'))!;
  m.delete(gone);
  const { value, missing } = await pictureStore(kv).restore(stored);
  assert.deepEqual(missing, [gone.slice(4)]);
  assert.ok(JSON.stringify(value).includes(`sf-pic:${gone.slice(4)}`));
  const again = await pictureStore(kv).stash(value);
  assert.ok(JSON.stringify(again).includes(`sf-pic:${gone.slice(4)}`));
});

test('the sweep takes only unreferenced pictures over a day old', async () => {
  let t = 1_000_000;
  const { kv, m } = memoryKv();
  const store = pictureStore(kv, () => t);
  await kv.set('deck:keep', await store.stash(deck(pic('A'), pic('A'))));
  await store.stash(deck(pic('B'), pic('B'))); // written, then its lesson never saved
  t += 60 * 60 * 1000;
  assert.equal(await store.sweep(), 0, 'a young orphan stays: another tab may be about to save its lesson');
  t += 24 * 60 * 60 * 1000;
  assert.equal(await store.sweep(), 1);
  const left = [...m.keys()].filter((k) => k.startsWith('pic:'));
  assert.equal(left.length, 1);
  const back = await store.restore(await kv.get('deck:keep'));
  assert.deepEqual(back.missing, []);
});

test('after an hour a picture is written again, in case another tab swept it', async () => {
  let t = 0;
  const { kv, writes } = memoryKv();
  const store = pictureStore(kv, () => t);
  await store.stash(deck(pic('A'), pic('A')));
  const n = writes.length;
  t += 2 * 60 * 60 * 1000;
  await store.stash(deck(pic('A'), pic('A')));
  assert.equal(writes.length, n + 1);
});

test('on a page with no SHA-256 (plain http on the school network) a lesson is kept whole, and still saves', async () => {
  const { kv, m } = memoryKv();
  const store = pictureStore(kv, () => 0, null);
  const d = deck(pic('A'), pic('B'));
  const stored = await store.stash(d);
  assert.equal(stored, d, 'kept with its pictures inside, as before CS-14');
  assert.equal([...m.keys()].filter((k) => k.startsWith('pic:')).length, 0);
  // A lesson stored on a secure page, opened later on the plain one, still reads back whole.
  const kept = await pictureStore(kv).stash(d);
  assert.deepEqual((await store.restore(kept)).value, d);
});
