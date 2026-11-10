// The studio's IndexedDB helpers (core/idb.ts): every write settles, an aborted one included, so a full browser
// storage fails a save with a reason instead of leaving it (and every save queued behind it) waiting for ever; and
// the page keeps one connection, which it gives up when another tab needs to upgrade the database.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { idbForget, idbGet, idbGetMany, idbSet, idbSetMany } from '../src/core/idb';

type Ev = (() => void) | null;
type Outcome = 'complete' | 'abort' | 'error';

/** A small stand-in for the browser's indexedDB: records in a Map, each transaction ending as `outcome` says. */
function fakeIdb(outcome: () => Outcome = () => 'complete') {
  const m = new Map<string, unknown>();
  let opens = 0;
  const db = {
    onversionchange: null as Ev, onclose: null as Ev, closed: false,
    close() { this.closed = true; },
    transaction() {
      const end = outcome();
      const tx = { oncomplete: null as Ev, onerror: null as Ev, onabort: null as Ev, error: null as DOMException | null,
        objectStore: () => ({
          put: (v: unknown, k: string) => { if (end === 'complete') m.set(k, structuredClone(v)); return {}; },
          delete: (k: string) => { m.delete(k); return {}; },
          get: (k: string) => {
            const r = { result: undefined as unknown, onsuccess: null as Ev, onerror: null as Ev };
            setTimeout(() => { r.result = structuredClone(m.get(k)); r.onsuccess?.(); });
            return r;
          },
        }) };
      setTimeout(() => setTimeout(() => {
        if (end === 'complete') tx.oncomplete?.();
        else if (end === 'abort') { tx.error = new DOMException('The quota has been exceeded.', 'QuotaExceededError'); tx.onabort?.(); }
        else { tx.error = new DOMException('Write failed', 'UnknownError'); tx.onerror?.(); tx.onabort?.(); }
      }));
      return tx;
    },
  };
  const factory = {
    open() {
      opens++;
      const req = { result: db, onsuccess: null as Ev, onerror: null as Ev, onupgradeneeded: null as Ev };
      setTimeout(() => req.onsuccess?.());
      return req;
    },
  };
  return { factory, db, m, opens: () => opens };
}

function install(f: ReturnType<typeof fakeIdb>) {
  idbForget();
  (globalThis as { indexedDB?: unknown }).indexedDB = f.factory;
}

test('a write the browser aborts (storage full) rejects with its reason, and the next write still runs', async () => {
  let n = 0;
  const f = fakeIdb(() => (n++ === 0 ? 'abort' : 'complete'));
  install(f);
  await assert.rejects(idbSetMany([['pic:a', 1], ['deck:x', 2]]), { name: 'QuotaExceededError' });
  await idbSet('deck:x', 3);
  assert.equal(f.m.get('deck:x'), 3);
});

test('a failed write rejects once, even though the browser then aborts it too', async () => {
  const f = fakeIdb(() => 'error');
  install(f);
  await assert.rejects(idbSet('k', 1), { name: 'UnknownError' });
});

test('the page keeps one connection, and gives it up when another tab needs to upgrade', async () => {
  const f = fakeIdb();
  install(f);
  await idbSet('a', 1);
  await idbSet('b', 2);
  assert.deepEqual(await idbGetMany(['a', 'missing', 'b']), [1, undefined, 2]);
  assert.equal(await idbGet('a'), 1);
  assert.equal(f.opens(), 1);
  f.db.onversionchange?.();
  assert.equal(f.db.closed, true);
  await idbGet('a');
  assert.equal(f.opens(), 2, 'opened again after giving the old one up');
});
