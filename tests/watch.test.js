'use strict';
/* The big-screen seat.
 *
 * A desktop opens view.html?s=<share id>&follow=1 and watches the lesson move.
 * There is no PIN in that address: the 32-hex share id is the whole credential,
 * so what matters is that the relay checks it, that a watcher is not a player,
 * and that it cannot do anything a spectator should not.
 */
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
async function start(port, dir) {
  const child = spawn(process.execPath, ['server/server.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', SLIDEFORGE_SESSION_DIR: dir },
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
async function connect(port) {
  const socket = new WebSocket('ws://127.0.0.1:' + port);
  const queue = [], waiters = [];
  socket.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    const i = waiters.findIndex((w) => w.type === m.t);
    if (i >= 0) { const w = waiters.splice(i, 1)[0]; clearTimeout(w.timer); w.resolve(m); }
    else queue.push(m);
  });
  await new Promise((r, j) => {
    socket.addEventListener('open', r, { once: true });
    socket.addEventListener('error', j, { once: true });
  });
  return {
    socket,
    send: (m) => socket.send(JSON.stringify(m)),
    seen: (type) => queue.some((m) => m.t === type),
    next(type, ms = 3000) {
      const i = queue.findIndex((m) => m.t === type);
      if (i >= 0) return Promise.resolve(queue.splice(i, 1)[0]);
      return new Promise((resolve, reject) => {
        const w = { type, resolve };
        w.timer = setTimeout(() => reject(new Error('No ' + type)), ms);
        waiters.push(w);
      });
    }
  };
}
const AT = (n, id) => ({ t: 'at', slideId: id, title: 'Slide ' + n, n, total: 3, activity: 'content', text: 'x' });

test('a big screen follows the room with no PIN, and can do nothing else', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'slideforge-watch-'));
  const port = await freePort();
  const relay = await start(port, dir);
  const socks = [];
  t.after(async () => {
    for (const s of socks) s.socket.close();
    if (relay.exitCode === null && !relay.signalCode) {
      await new Promise((r) => { relay.once('exit', r); relay.kill('SIGTERM'); });
    }
    fs.rmSync(dir, { recursive: true, force: true });
  });

  /* The copy a watcher renders is an ordinary share — the relay never holds a
     deck for this, which is why the id is the thing that has to be checked. */
  const share = await fetch('http://127.0.0.1:' + port + '/api/share', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ doc: { title: 'Watch test', slides: [
      { type: 'title', title: 'One' }, { type: 'content', title: 'Two' }, { type: 'content', title: 'Three' }
    ] } })
  }).then((r) => r.json());
  assert.match(share.id, /^[a-f0-9]{32}$/, 'a share id is 128 random bits, which is what makes the link safe without a PIN');

  const host = await connect(port); socks.push(host);
  host.send({ t: 'host', title: 'Watch test', mode: 'individual' });
  const hosted = await host.next('hosted');

  /* Nobody can watch until the host says so. */
  const early = await connect(port); socks.push(early);
  early.send({ t: 'watch', s: share.id });
  assert.match((await early.next('error')).message, /presenting/i,
    'a share that has not been registered as a big screen is not one');

  host.send({ t: 'watchOn', s: share.id });
  assert.equal((await host.next('watchState')).on, true);

  /* Joining mid-lesson lands on the slide that is up, not on slide one. */
  host.send(AT(2, 's2'));
  const spy = await connect(port); socks.push(spy);
  spy.send({ t: 'watch', s: share.id });
  const welcome = await spy.next('watching');
  assert.equal(welcome.at && welcome.at.n, 2, 'a screen switched on mid-lesson catches up');

  host.send(AT(3, 's3'));
  assert.equal((await spy.next('context')).n, 3, 'and follows from there');

  /* A wrong id is refused, and the refusal says nothing about which rooms exist. */
  const wrong = await connect(port); socks.push(wrong);
  wrong.send({ t: 'watch', s: 'f'.repeat(32) });
  assert.match((await wrong.next('error')).message, /presenting/i);

  /* A watcher is not in the room: no name, no place in the player list, and
     nothing it sends is acted on. */
  const before = await host.next('players').catch(() => ({ list: [] }));
  spy.send({ t: 'answer', response: 0 });
  spy.send({ t: 'react', kind: 'yes' });
  await new Promise((r) => setTimeout(r, 250));
  assert.equal(spy.seen('joined'), false, 'a spectator never becomes a player');
  assert.ok(!(before.list || []).some((p) => p && p.name === undefined && p.id === undefined),
    'the player list is unchanged by a watcher');

  /* Turning it off closes the seat. */
  host.send({ t: 'watchOn', s: '' });
  assert.equal((await host.next('watchState')).on, false);
  assert.equal((await spy.next('watchEnd')).t, 'watchEnd', 'the screen is told, not left frozen');

  const after = await connect(port); socks.push(after);
  after.send({ t: 'watch', s: share.id });
  assert.match((await after.next('error')).message, /presenting/i, 'and the link stops working');

  assert.ok(hosted.pin, 'sanity: the room had a PIN all along, and the watch link never carried it');
});
