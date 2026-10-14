#!/usr/bin/env node
/* Lessons saved to the teacher's account (js/sync.js, docs/data-storage-plan.md step 4), across two devices: two
 * separate browser profiles, signed in as the same teacher, sharing one stand-in for the account's documents table
 * (held here in Node, reached through a page binding). Checks: what one device keeps reaches the other (a classic
 * lesson, a game, a Lesson-studio lesson); an edit on either travels; when both edit, the newer wins and the older
 * is kept in History; a deletion is marked online and leaves the other device's copy alone. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import harness from '../../tests/harness.js';

const step = (m) => console.log('  ✓ ' + m);
const LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
const USER = { id: 'u-teacher', email: 'mark@urbanteacher.co.uk' };

/* The account's documents table, as the stand-in's backend: rows by id (one teacher). */
const table = new Map();
/* The account's assets table and media bucket: hash → row, path → { type, base64 }. */
const assets = new Map();
const bucket = new Map();
const db = (op) => {
  if (op.do === 'list') return [...table.values()].map(({ body, ...r }) => r);
  if (op.do === 'get') { const r = table.get(op.id); return r && r.kind === op.kind ? { body: r.body } : null; }
  if (op.do === 'upsert') { table.set(op.row.id, JSON.parse(JSON.stringify(op.row))); return null; }
  if (op.do === 'update') { const r = table.get(op.id); if (r) Object.assign(r, op.patch); return null; }
  if (op.do === 'assets') return [...assets.values()].map((a) => ({ hash: a.hash }));
  if (op.do === 'asset') { assets.set(op.row.hash, op.row); return null; }
  if (op.do === 'upload') { if (bucket.has(op.path)) return { error: { message: 'The resource already exists', statusCode: '409' } }; bucket.set(op.path, { type: op.type, b64: op.b64 }); return { ok: true }; }
  if (op.do === 'download') return bucket.get(op.path) || null;
  throw new Error('unknown op ' + op.do);
};

/* supabase-js as far as js/cloud.js and js/sync.js use it, signed in already. */
const FAKE = `window.supabase = { createClient() {
  const call = (op) => window.__db(op).then((data) => ({ data, error: null }));
  const docs = () => {
    let id = null, kind = null, patch = null, cols = '';
    const q = {
      select(c) { cols = c; return q; },
      eq(k, v) { if (k === 'id') id = v; if (k === 'kind') kind = v; return q; },
      single() { return call({ do: 'get', id, kind }); },
      upsert(row) { return call({ do: 'upsert', row }); },
      update(p) { patch = p; return q; },
      then(ok, bad) { return (patch ? call({ do: 'update', id, patch }) : call({ do: 'list' })).then(ok, bad); },
    };
    return q;
  };
  return {
    auth: {
      getSession: () => Promise.resolve({ data: { session: { user: ${JSON.stringify(USER)} } } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signInWithOtp: () => Promise.resolve({ error: null }),
      signOut: () => Promise.resolve({ error: null }),
    },
    from: (t) => t === 'documents' ? docs()
      : t === 'assets' ? { select: () => call({ do: 'assets' }), upsert: (row) => call({ do: 'asset', row }) }
      : { select: () => Promise.resolve({ data: [{ domain: 'urbanteacher.co.uk' }] }) },
    storage: { from: () => ({
      upload: async (path, blob, o) => {
        const b64 = await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1]); fr.readAsDataURL(blob); });
        const r = await window.__db({ do: 'upload', path, type: o.contentType, b64 });
        return r && r.error ? { data: null, error: r.error } : { data: { path }, error: null };
      },
      download: async (path) => {
        const r = await window.__db({ do: 'download', path });
        if (!r) return { data: null, error: { message: 'Object not found' } };
        const bytes = Uint8Array.from(atob(r.b64), (c) => c.charCodeAt(0));
        return { data: new Blob([bytes], { type: r.type }), error: null };
      },
    }) },
  };
} };`;

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-sync-'));
const port = await harness.freePort();
const relay = await harness.start(port, dir, { SUPABASE_URL: 'https://slideforgetest.supabase.co', SUPABASE_ANON_KEY: 'anon-test-key' });
const browser = await chromium.launch();
const errors = [];
const device = async (name) => {
  const ctx = await browser.newContext();
  await ctx.exposeBinding('__db', (_src, op) => db(op));
  await ctx.route(LIB, (r) => r.fulfill({ body: FAKE, contentType: 'application/javascript' }));
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(name + ': ' + e.message));
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.waitForFunction(() => window.SF?.Sync && SF.Cloud?.user() && SF.LabEngine?.savedRows, null, { timeout: 60000 });
  await page.waitForFunction(() => SF.Sync.status(), null, { timeout: 60000 });
  return page;
};
const sync = (page) => page.evaluate(() => SF.Sync.now());
try {
  // ---- device A keeps a classic lesson, a game and a Lesson-studio lesson
  const a = await device('A');
  await a.evaluate(async () => {
    const d = SF.makeDeck('Sync check lesson'); d.id = 'sync-classic'; d.slides = [SF.normalizeSlide({ type: 'content', title: 'Photosynthesis', bullets: ['Light, water, carbon dioxide'] })];
    SF.Store.save(d, { force: true });
    const g = SF.makeGame('Sync check game', 'choice'); g.id = 'sync-game'; SF.GameStore.save(g);
    const lab = SF.LabEngine.labDeck(); lab.id = 'sync-lab'; lab.title = 'Sync check studio lesson';
    await SF.LabEngine.restoreDecks([lab]);
  });
  const ra = await sync(a);
  assert.equal(ra.error, '');
  for (const id of ['sync-classic', 'sync-game', 'sync-lab']) assert.ok(table.has(id), id + ' reached the account');
  assert.equal(table.get('sync-lab').kind, 'lesson');
  step(`device A saved up a classic lesson, a game and a studio lesson (${ra.up} documents)`);

  // ---- device B signs in and has all three
  const b = await device('B');
  await sync(b);
  const onB = await b.evaluate(async () => ({ classic: SF.Store.get('sync-classic')?.title, game: SF.GameStore.get('sync-game')?.title, lab: (await SF.LabEngine.savedRows()).some((r) => r.id === 'sync-lab') }));
  assert.deepEqual(onB, { classic: 'Sync check lesson', game: 'Sync check game', lab: true });
  step('device B, signed in as the same teacher, brought all three down');

  // ---- an edit on B travels to A
  await b.evaluate(() => { const d = SF.Store.get('sync-classic'); d.title = 'Sync check lesson, edited on B'; SF.Store.save(d, { force: true }); });
  await sync(b);
  await sync(a);
  assert.equal(await a.evaluate(() => SF.Store.get('sync-classic').title), 'Sync check lesson, edited on B');
  step('an edit on device B reached device A');
  // A pass with nothing changed moves nothing.
  const quiet = await sync(a);
  assert.deepEqual([quiet.up, quiet.down], [0, 0], 'nothing travels when nothing changed: ' + JSON.stringify(quiet.sent));
  step('a pass with nothing changed uploads and downloads nothing');

  // ---- both edit the game: the newer wins, the older is kept in History
  await a.evaluate(() => { const g = SF.GameStore.get('sync-game'); g.title = 'Game, older edit on A'; SF.GameStore.save(g); });
  await a.waitForTimeout(30);
  await b.evaluate(() => { const g = SF.GameStore.get('sync-game'); g.title = 'Game, newer edit on B'; SF.GameStore.save(g); });
  await sync(b);
  const ca = await sync(a);
  assert.equal(await a.evaluate(() => SF.GameStore.get('sync-game').title), 'Game, newer edit on B');
  assert.equal(ca.kept, 1, 'the older copy was kept as a restore point');
  assert.equal(table.get('sync-game').body.title, 'Game, newer edit on B');
  step('both devices edited the game: the newer edit won everywhere, and A’s older copy went to History');

  // ---- a deletion on A is marked online; B keeps its copy
  await a.evaluate(() => SF.Store.remove('sync-classic'));
  await sync(a);
  assert.equal(table.get('sync-classic').deleted, true);
  await sync(b);
  assert.ok(await b.evaluate(() => !!SF.Store.get('sync-classic')), 'B keeps its own copy');
  const back = await sync(a);
  assert.equal(await a.evaluate(() => SF.Store.get('sync-classic')), null, 'the deleted lesson does not come back to A');
  assert.equal(back.down, 0);
  step('a deletion on A is marked online, does not come back to A, and leaves B’s copy alone');

  // ---- pictures: kept in the bucket once, a reference in the online lesson, whole again on the other device
  const picture = await a.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 240; c.height = 240;
    const g = c.getContext('2d');
    const img = g.createImageData(240, 240);
    for (let i = 0; i < img.data.length; i++) img.data[i] = (i % 4 === 3) ? 255 : (Math.random() * 256) | 0;
    g.putImageData(img, 0, 0);
    return c.toDataURL('image/png');
  });
  assert.ok(picture.length > 20000, 'a real picture, not an icon');
  await a.evaluate((src) => {
    for (const [id, title] of [['sync-pics-1', 'Pictures one'], ['sync-pics-2', 'Pictures two']]) {
      const d = SF.makeDeck(title); d.id = id; d.slides = [SF.normalizeSlide({ type: 'image', title: 'A leaf', image: src })];
      SF.Store.save(d, { force: true });
    }
  }, picture);
  await sync(a);
  const online = JSON.stringify(table.get('sync-pics-1').body);
  assert.ok(!online.includes('data:image/'), 'the online lesson holds no embedded picture');
  assert.match(online, /sf-asset:[0-9a-f]{64}\.png/);
  assert.equal(bucket.size, 1, 'the picture used in two lessons is stored once');
  assert.equal(assets.size, 1);
  assert.ok([...bucket.keys()][0].startsWith(USER.id + '/'), 'in the teacher’s own folder');
  assert.ok(online.length < picture.length / 4, `the online lesson is small (${online.length} characters, the picture ${picture.length})`);
  await sync(b);
  const onB2 = await b.evaluate(() => [SF.Store.get('sync-pics-1')?.slides[0]?.image, SF.Store.get('sync-pics-2')?.slides[0]?.image]);
  assert.equal(onB2[0], picture, 'device B has the picture back, exactly');
  assert.equal(onB2[1], picture);
  const again = await sync(b);
  assert.equal(again.up, 0, 'putting the pictures back is not a change to upload');
  step(`pictures: one copy in the bucket for two lessons, a ${online.length}-character online lesson, the exact picture back on device B`);

  // ---- the dialog says so
  const line = await a.evaluate(() => document.getElementById('accountSync').textContent);
  assert.match(line, /In step with your account at/);
  assert.deepEqual(errors, [], 'no page errors');
  console.log('cloud-sync: ok');
} finally {
  await browser.close();
  await harness.stop(relay).catch(() => {});
}
