'use strict';
/* Bandwidth (server/server.js, "bandwidth"): files are revalidated, not re-sent; text is gzipped; the studio's
   hashed chunks are cached for a year. Render's free plan sends 5 GB a month, and every visit used to re-download
   every file whole. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const zlib = require('node:zlib');
const harness = require('./harness.js');

/** A raw GET, so the test sees the bytes and headers as sent (fetch would unzip them). */
function get(port, url, headers = {}) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port, path: url, headers }, (res) => {
      const parts = [];
      res.on('data', (c) => parts.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(parts) }));
    }).on('error', reject);
  });
}

async function withRelay(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-static-'));
  const port = await harness.freePort();
  const relay = await harness.start(port, dir);
  try { await fn(port); } finally { await harness.stop(relay); }
}

test('text is gzipped when the browser accepts it, and unzips to the file', () => withRelay(async (port) => {
  const file = fs.readFileSync(path.join(harness.ROOT, 'js/model.js'));
  const r = await get(port, '/js/model.js', { 'Accept-Encoding': 'gzip, deflate, br' });
  assert.equal(r.status, 200);
  assert.equal(r.headers['content-encoding'], 'gzip');
  assert.equal(r.headers.vary, 'Accept-Encoding');
  assert.ok(r.body.length < file.length / 2, `gzipped ${r.body.length} of ${file.length}`);
  assert.ok(zlib.gunzipSync(r.body).equals(file));
  /* Served again, from the copy in memory: the same bytes. */
  const again = await get(port, '/js/model.js', { 'Accept-Encoding': 'gzip' });
  assert.ok(again.body.equals(r.body));
}));

test('without gzip in Accept-Encoding the file is sent as it is', () => withRelay(async (port) => {
  const file = fs.readFileSync(path.join(harness.ROOT, 'js/model.js'));
  const r = await get(port, '/js/model.js');
  assert.equal(r.headers['content-encoding'], undefined);
  assert.equal(Number(r.headers['content-length']), file.length);
  assert.ok(r.body.equals(file));
}));

test('a browser with the current copy gets 304 and no body, by ETag or by date', () => withRelay(async (port) => {
  const first = await get(port, '/index.html', { 'Accept-Encoding': 'gzip' });
  assert.equal(first.headers['cache-control'], 'no-cache');
  assert.match(first.headers.etag, /^W\/".+"$/);
  assert.ok(first.headers['last-modified']);
  const byTag = await get(port, '/index.html', { 'If-None-Match': first.headers.etag });
  assert.equal(byTag.status, 304);
  assert.equal(byTag.body.length, 0);
  const byDate = await get(port, '/index.html', { 'If-Modified-Since': first.headers['last-modified'] });
  assert.equal(byDate.status, 304);
  const stale = await get(port, '/index.html', { 'If-None-Match': 'W/"not-this-one"' });
  assert.equal(stale.status, 200);
}));

test('the studio\'s hashed chunks are cached for a year; everything else is revalidated', () => withRelay(async (port) => {
  const chunk = fs.readdirSync(path.join(harness.ROOT, 'lab-app/assets')).find((n) => /-[A-Za-z0-9_-]{8}\.js$/.test(n));
  assert.ok(chunk, 'a built lab-app chunk');
  const r = await get(port, '/lab-app/assets/' + chunk, { 'Accept-Encoding': 'gzip' });
  assert.equal(r.status, 200);
  assert.equal(r.headers['cache-control'], 'public, max-age=31536000, immutable');
  const page = await get(port, '/lab-app/index.html');
  assert.equal(page.headers['cache-control'], 'no-cache');
}));

test('video still streams in ranges, uncompressed, with its validators', () => withRelay(async (port) => {
  const clip = 'assets/lesson/ipdv/week5/ft-milton-map.mp4';
  const r = await get(port, '/' + clip, { Range: 'bytes=0-99', 'Accept-Encoding': 'gzip' });
  assert.equal(r.status, 206);
  assert.equal(r.body.length, 100);
  assert.equal(r.headers['content-encoding'], undefined);
  assert.ok(r.headers.etag);
  const whole = await get(port, '/' + clip, { 'Accept-Encoding': 'gzip' });
  assert.equal(whole.headers['content-encoding'], undefined, 'video is not gzipped');
}));
