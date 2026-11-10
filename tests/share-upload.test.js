'use strict';
/* Sharing a lesson whose pictures travel apart (js/share.js upload, CR-49 to CR-52), against a stand-in relay: the
   share is remembered with its key before its pictures go, a dropped request is tried again, a refusal is not, a
   failed share is taken down, and when even that fails the teacher is told a copy was left, which stays listed to
   withdraw. Every error names its picture. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'js', 'share.js'), 'utf8');

/** share.js in a page of its own, with `relay` answering its requests. */
function page(relay) {
  const store = new Map();
  const asked = [];
  const ctx = {
    console, setTimeout, Promise, JSON, Object, Array, Uint8Array, String, Number, Error, Date,
    crypto: { getRandomValues: (b) => b.fill(7) },
    location: { origin: 'http://relay.test', protocol: 'http:' },
    localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); } },
    fetch: async (url, init = {}) => {
      asked.push((init.method || 'GET') + ' ' + url);
      const [status, body] = await relay(url, init, asked);
      if (status === 0) throw new TypeError('Failed to fetch');
      return { ok: status >= 200 && status < 300, status, json: async () => body };
    },
  };
  ctx.window = ctx;
  vm.runInNewContext(SRC, ctx);
  return { SF: ctx.SF, asked, shares: () => JSON.parse(store.get('slideforge.shares.v1') || '[]') };
}
const lesson = (n) => ({ title: 'Big lesson', slides: [], pictures: Array.from({ length: n }, (_, i) => 'data:image/png;base64,P' + i) });
const made = [200, { id: 'a'.repeat(32), key: 'k'.repeat(32), durable: false }];

test('a dropped request is tried again, and the share completes; it is remembered with its key', async () => {
  const dropped = new Set();
  const p = page(async (url, init) => {
    if (url === '/api/share') return made;
    if (/picture\/1$/.test(url) && !dropped.has(url)) { dropped.add(url); return [0]; }
    return [200, {}];
  });
  const j = await p.SF.shareUpload(lesson(3), null, () => {});
  assert.equal(j.id, 'a'.repeat(32));
  assert.equal(p.asked.filter((a) => /picture\/1$/.test(a)).length, 2, 'picture 2 tried twice');
  assert.deepEqual(p.shares().map((s) => [s.id, s.key]), [['a'.repeat(32), 'k'.repeat(32)]]);
});

test('a refused picture is not tried again; the share is taken down and forgotten; the error names the picture', async () => {
  const p = page(async (url, init) => {
    if (url === '/api/share') return made;
    if (init.method === 'DELETE') return [200, {}];
    if (/picture\/2$/.test(url)) return [413, { error: 'That picture is over 8 MB. Make it smaller and share again.' }];
    return [200, {}];
  });
  await assert.rejects(p.SF.shareUpload(lesson(4), null, () => {}), /^Error: picture 3 of 4: That picture is over 8 MB/);
  assert.equal(p.asked.filter((a) => /picture\/2$/.test(a)).length, 1, 'a refusal is the same the next time');
  assert.ok(p.asked.includes('DELETE /api/share/' + 'a'.repeat(32)));
  assert.deepEqual(p.shares(), [], 'taken down, so not listed');
});

test('when the share cannot be taken down either, the teacher is told a copy was left, and it stays listed', async () => {
  const p = page(async (url, init) => {
    if (url === '/api/share') return made;
    if (init.method === 'DELETE') return [0];
    return [0];
  });
  await assert.rejects(p.SF.shareUpload(lesson(2), null, () => {}), (e) => /picture \d of 2: Failed to fetch/.test(e.message) && /A copy without all its pictures was left/.test(e.message));
  assert.deepEqual(p.shares().map((s) => s.key), ['k'.repeat(32)], 'its key is kept, so it can be withdrawn');
});

test('pictures go two at a time, not all at once', async () => {
  let now = 0, most = 0;
  const p = page(async (url) => {
    if (url === '/api/share') return made;
    now++; most = Math.max(most, now);
    await new Promise((r) => setTimeout(r, 5));
    now--;
    return [200, {}];
  });
  await p.SF.shareUpload(lesson(6), null, () => {});
  assert.equal(most, 2);
});
