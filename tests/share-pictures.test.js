'use strict';
/* A Lesson-studio share's pictures, apart from its lesson (BACKLOG CS-14, step 2): created with a count, each
   picture uploaded with the share's key and read back by number, the limits said, and gone with the share. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');

const ROOT = path.resolve(__dirname, '..');

async function freePort() {
  const s = net.createServer();
  await new Promise((r) => s.listen(0, '127.0.0.1', r));
  const p = s.address().port;
  await new Promise((r) => s.close(r));
  return p;
}
async function start(port, env) {
  const child = spawn(process.execPath, ['server/server.js'], {
    cwd: ROOT, env: Object.assign({ ...process.env, PORT: String(port), HOST: '127.0.0.1' }, env), stdio: ['ignore', 'pipe', 'pipe']
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Relay startup timed out')), 5000);
    child.stdout.on('data', (d) => { if (String(d).includes('SlideForge is running')) { clearTimeout(timer); resolve(); } });
    child.on('exit', (c) => { clearTimeout(timer); reject(new Error('Relay exited ' + c)); });
  });
  return child;
}
async function stop(child) {
  if (child.exitCode !== null || child.signalCode) return;
  await new Promise((r) => { child.once('exit', r); child.kill('SIGTERM'); });
}
async function json(url, opts) {
  const res = await fetch(url, opts);
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

test('a share made with its pictures apart: each uploaded with the key, read back, and gone with the share', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'slideforge-share-pics-'));
  const port = await freePort();
  const relay = await start(port, { SLIDEFORGE_SHARE_DIR: dir });
  t.after(async () => { await stop(relay); fs.rmSync(dir, { recursive: true, force: true }); });
  const base = 'http://127.0.0.1:' + port;

  const doc = { title: 'Big lesson', studio: 1, slides: [{ id: 's1', layers: [{ params: { src: '@picture:0' } }, { params: { src: '@picture:1' } }] }] };
  const made = await json(base + '/api/share', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ doc, pictures: 2 }) });
  assert.equal(made.status, 200);
  const { id, key } = made.body;

  const read = await json(base + '/api/share/' + id);
  assert.equal(read.body.pictures, 2, 'the viewer is told how many pictures to fetch');
  assert.equal(read.body.doc.pictureCount, 2, 'and the lesson says the same count, the server\'s');

  // Each picture is several megabytes: the two together are over the 8 MB one request may carry.
  const pic = (c) => 'data:image/jpeg;base64,' + c.repeat(5 * 1024 * 1024);
  const put = (n, body, k = key) => json(base + '/api/share/' + id + '/picture/' + n, { method: 'PUT', headers: { Authorization: 'Bearer ' + k }, body });
  assert.equal((await put(0, pic('A'))).status, 200);
  assert.equal((await put(1, pic('B'))).status, 200);
  assert.equal((await put(1, pic('B'), 'f'.repeat(32))).status, 403, 'another key cannot add or replace a picture');
  assert.equal((await put(2, pic('C'))).status, 400, 'no more pictures than the share said');
  assert.equal((await put(0, 'not a picture')).status, 400);

  // Sent as itself: its own type and bytes, kept by the browser, never run.
  const back = await fetch(base + '/api/share/' + id + '/picture/1');
  assert.equal(back.status, 200);
  assert.equal(back.headers.get('content-type'), 'image/jpeg');
  assert.match(back.headers.get('cache-control'), /immutable/);
  assert.equal(back.headers.get('x-content-type-options'), 'nosniff');
  assert.deepEqual(Buffer.from(await back.arrayBuffer()), Buffer.from(pic('B').split(',')[1], 'base64'));
  assert.equal((await put(1, 'data:text/html,<script>alert(1)</script>')).status, 400, 'a page is not a picture');

  const gone = await json(base + '/api/share/' + id, { method: 'DELETE', headers: { Authorization: 'Bearer ' + key } });
  assert.equal(gone.status, 200);
  assert.equal((await json(base + '/api/share/' + id + '/picture/0')).status, 404, 'withdrawn with the share');
  assert.equal(fs.existsSync(path.join(dir, id)), false);
});

test('a picture over 8 MB is refused, and a share made the old way reads as before', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'slideforge-share-pics-'));
  const port = await freePort();
  const relay = await start(port, { SLIDEFORGE_SHARE_DIR: dir });
  t.after(async () => { await stop(relay); fs.rmSync(dir, { recursive: true, force: true }); });
  const base = 'http://127.0.0.1:' + port;
  const old = await json(base + '/api/share', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ doc: { title: 'Old', slides: [] } }) });
  const read = await json(base + '/api/share/' + old.body.id);
  assert.equal(read.body.pictures, undefined);
  const made = await json(base + '/api/share', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ doc: { title: 'One', slides: [] }, pictures: 1 }) });
  const huge = 'data:image/png;base64,' + 'A'.repeat(9 * 1024 * 1024);
  const res = await fetch(base + '/api/share/' + made.body.id + '/picture/0', { method: 'PUT', headers: { Authorization: 'Bearer ' + made.body.key }, body: huge });
  assert.equal(res.status, 413, 'refused with a reply, not a cut connection');
  assert.match((await res.json()).error, /over 8 MB/);
  // A stranger's upload is turned away before it is read.
  const t0 = Date.now();
  const stranger = await fetch(base + '/api/share/' + made.body.id + '/picture/0', { method: 'PUT', headers: { Authorization: 'Bearer ' + 'f'.repeat(32) }, body: huge });
  assert.equal(stranger.status, 403);
  assert.ok(Date.now() - t0 < 2000);
});

test('a share that is refused leaves the shelf as it was, and the shelf makes room by taking the oldest', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'slideforge-share-pics-'));
  const port = await freePort();
  // A shelf of 1 MB for pictures, so the test can fill it.
  const relay = await start(port, { SLIDEFORGE_SHARE_DIR: dir, SLIDEFORGE_SHARE_SHELF_MB: '1' });
  t.after(async () => { await stop(relay); fs.rmSync(dir, { recursive: true, force: true }); });
  const base = 'http://127.0.0.1:' + port;
  const make = (pictures) => json(base + '/api/share', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ doc: { title: 'S', slides: [] }, pictures }) });
  const ids = [];
  for (let i = 0; i < 40; i++) ids.push((await make(1)).body);
  const files = () => fs.readdirSync(dir).filter((n) => n.endsWith('.json')).length;
  assert.equal(files(), 40);
  assert.equal((await make(601)).status, 413);
  assert.equal(files(), 40, 'a refused share takes nobody off the shelf');
  assert.ok(fs.existsSync(path.join(dir, ids[0].id + '.json')), 'not even the oldest');
  const put = (s, kb) => fetch(base + '/api/share/' + s.id + '/picture/0', { method: 'PUT', headers: { Authorization: 'Bearer ' + s.key }, body: 'data:image/png;base64,' + 'A'.repeat(kb * 1024) });
  assert.equal((await put(ids[5], 600)).status, 200);
  assert.equal((await put(ids[9], 600)).status, 200, 'room made for it');
  assert.ok(!fs.existsSync(path.join(dir, ids[5].id + '.json')), 'by taking the share whose pictures were oldest');
  assert.equal(files(), 39, 'and only that one: a share with no pictures frees no room, so it stays');
  assert.ok(fs.existsSync(path.join(dir, ids[9].id, '0.txt')));
  assert.equal((await put(ids[9], 1100)).status, 413, 'a picture larger than the whole shelf is refused');
});
