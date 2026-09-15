'use strict';
/* View-only share: create / read / withdraw, and the durable flag that tells
   the author whether the copy will survive the next deploy. */
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
    cwd: ROOT,
    env: Object.assign({ ...process.env, PORT: String(port), HOST: '127.0.0.1' }, env),
    stdio: ['ignore', 'pipe', 'pipe']
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Relay startup timed out')), 5000);
    child.stdout.on('data', (d) => {
      if (String(d).includes('SlideForge is running')) { clearTimeout(timer); resolve(); }
    });
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
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

test('share is read-only, withdrawable, and reports durability honestly', async (t) => {
  const durableDir = fs.mkdtempSync(path.join(os.tmpdir(), 'slideforge-share-'));
  const port = await freePort();
  const relay = await start(port, { SLIDEFORGE_SHARE_DIR: durableDir });
  t.after(async () => {
    await stop(relay);
    fs.rmSync(durableDir, { recursive: true, force: true });
  });

  const base = 'http://127.0.0.1:' + port;
  const doc = { title: 'Share me', slides: [{ id: 's1', type: 'content', title: 'Hello' }] };

  const created = await json(base + '/api/share', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ doc })
  });
  assert.equal(created.status, 200);
  assert.match(created.body.id, /^[a-f0-9]{32}$/);
  assert.match(created.body.key, /^[a-f0-9]{32}$/);
  /* Temp dir is outside the app tree → durable. */
  assert.equal(created.body.durable, true);

  const ok = await json(base + '/api/share/' + created.body.id);
  assert.equal(ok.status, 200);
  assert.equal(ok.body.doc.title, 'Share me');
  assert.equal(ok.body.key, undefined, 'withdrawal key must never reach a viewer');

  const badId = await json(base + '/api/share/' + '0'.repeat(32));
  assert.equal(badId.status, 404);

  const wrongKey = await json(base + '/api/share/' + created.body.id, {
    method: 'DELETE',
    headers: { Authorization: 'Bearer ' + 'a'.repeat(32) }
  });
  assert.equal(wrongKey.status, 403);

  const gone = await json(base + '/api/share/' + created.body.id, {
    method: 'DELETE',
    headers: { Authorization: 'Bearer ' + created.body.key }
  });
  assert.equal(gone.status, 200);

  const after = await json(base + '/api/share/' + created.body.id);
  assert.equal(after.status, 404);
});

test('default share shelf under the app tree is not marked durable', async (t) => {
  const port = await freePort();
  const env = { ...process.env, PORT: String(port), HOST: '127.0.0.1' };
  delete env.SLIDEFORGE_SHARE_DIR;
  delete env.SLIDEFORGE_DATA_DIR;
  const child = spawn(process.execPath, ['server/server.js'], {
    cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe']
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Relay startup timed out')), 5000);
    child.stdout.on('data', (d) => {
      if (String(d).includes('SlideForge is running')) { clearTimeout(timer); resolve(); }
    });
    child.on('exit', (c) => { clearTimeout(timer); reject(new Error('Relay exited ' + c)); });
  });
  t.after(async () => { await stop(child); });

  const created = await json('http://127.0.0.1:' + port + '/api/share', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ doc: { title: 'Tmp', slides: [{ id: 's1', type: 'content', title: 'A' }] } })
  });
  assert.equal(created.status, 200);
  assert.equal(created.body.durable, false);

  /* Clean up the file we just wrote into the workspace shelf. */
  await json('http://127.0.0.1:' + port + '/api/share/' + created.body.id, {
    method: 'DELETE',
    headers: { Authorization: 'Bearer ' + created.body.key }
  });
});

/* Host is a forbidden header for fetch(), and this is a test about which Host
   the client sent, so it has to speak HTTP directly. */
function postRaw(port, headers, body) {
  const http = require('node:http');
  return new Promise((resolve, reject) => {
    const payload = Buffer.from(body);
    const req = http.request({
      host: '127.0.0.1', port, path: '/api/share', method: 'POST',
      headers: Object.assign({
        'Content-Type': 'application/json',
        'Content-Length': payload.length
      }, headers)
    }, (res) => {
      let out = '';
      res.on('data', (d) => { out += d; });
      res.on('end', () => {
        let parsed = {};
        try { parsed = JSON.parse(out); } catch (e) {}
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    req.end(payload);
  });
}

test('the share link names a host a phone can reach, not localhost', async (t) => {
  const port = await freePort();
  const relay = await start(port);
  t.after(() => stop(relay));

  const doc = { title: 'Reachable', slides: [{ id: 's1', type: 'content', title: 'Hi' }] };
  const post = (headers) => postRaw(port, headers, JSON.stringify({ doc }));

  /* A laptop opened at localhost. The QR used to carry "localhost", which on
     a phone is the phone — a valid code pointing at nothing. */
  const local = await post({ Host: 'localhost:' + port });
  assert.equal(local.status, 200);
  assert.ok(!/localhost|127\.0\.0\.1/.test(local.body.base),
    'a loopback Host must be answered with the LAN address, got ' + local.body.base);
  assert.equal(local.body.url, local.body.base + '/view.html?s=' + local.body.id);

  /* A real name is how the client reached us, so it is the right answer —
     on a deploy the LAN address is a container's private IP. */
  const named = await post({ Host: 'slides.example.ac.uk' });
  assert.equal(named.body.base, 'http://slides.example.ac.uk');

  /* Render terminates TLS in front of this process. */
  const proxied = await post({
    Host: 'internal:10000',
    'X-Forwarded-Host': 'slideforge-rpjj.onrender.com',
    'X-Forwarded-Proto': 'https'
  });
  assert.equal(proxied.body.base, 'https://slideforge-rpjj.onrender.com');
  assert.match(proxied.body.url, /^https:\/\/slideforge-rpjj\.onrender\.com\/view\.html\?s=[a-f0-9]{32}$/);
});
