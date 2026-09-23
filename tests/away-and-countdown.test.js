'use strict';
/* UX-61 and UX-62, through the real relay.
 *
 * A phone that puts the lesson in the background tells the host, and only the
 * host: the other phones never hear of it. A countdown before the phones go
 * dark reaches every phone, and a countdown of 0 takes the warning back.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { freePort, start, connect, stop } = require('./harness');

test('a phone that leaves the lesson is shown to the host, and to nobody else', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-away-'));
  const port = await freePort();
  const server = await start(port, dir);
  const sockets = [];
  t.after(async () => {
    await stop(server);
    sockets.forEach(s => s.socket.close());
    fs.rmSync(dir, { recursive: true, force: true });
  });
  const host = await connect(port); sockets.push(host);
  host.send({ t: 'host', title: 'Away check', mode: 'individual' });
  const room = await host.next('hosted');
  const ada = await connect(port); sockets.push(ada);
  ada.send({ t: 'join', pin: room.pin, name: 'Ada' });
  await ada.next('joined');
  const ben = await connect(port); sockets.push(ben);
  ben.send({ t: 'join', pin: room.pin, name: 'Ben' });
  await ben.next('joined');
  await host.until('players', m => (m.list || []).length === 2);

  ada.send({ t: 'away', away: true });
  const gone = await host.until('players', m => (m.list || []).some(p => p.name === 'Ada' && p.away));
  assert.equal(gone.list.find(p => p.name === 'Ben').away, false, 'only the phone that left is away');

  ada.send({ t: 'away', away: false });
  await host.until('players', m => (m.list || []).every(p => !p.away));

  /* Nothing about it reaches another phone. */
  assert.equal(ben.has('away'), false);
  assert.equal(ben.has('players'), false, 'phones never receive the roster');
});

test('a countdown before the phones go dark reaches every phone, and 0 cancels it', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-soon-'));
  const port = await freePort();
  const server = await start(port, dir);
  const sockets = [];
  t.after(async () => {
    await stop(server);
    sockets.forEach(s => s.socket.close());
    fs.rmSync(dir, { recursive: true, force: true });
  });
  const host = await connect(port); sockets.push(host);
  host.send({ t: 'host', title: 'Countdown check', mode: 'individual' });
  const room = await host.next('hosted');
  const p = await connect(port); sockets.push(p);
  p.send({ t: 'join', pin: room.pin, name: 'Cam' });
  await p.next('joined');

  host.send({ t: 'blankSoon', seconds: 10 });
  assert.equal((await p.until('blankSoon', m => m.seconds === 10)).seconds, 10);
  host.send({ t: 'blankSoon', seconds: 0 });
  assert.equal((await p.until('blankSoon', m => m.seconds === 0)).seconds, 0);
  /* Clamped: nobody can put the room on a ten-minute fuse by accident. */
  host.send({ t: 'blankSoon', seconds: 600 });
  assert.equal((await p.until('blankSoon', m => m.seconds === 60)).seconds, 60);

  /* A phone cannot start one. */
  p.send({ t: 'blankSoon', seconds: 5 });
  host.send({ t: 'blankPhones', on: true });
  await p.until('blankPhones', m => m.on === true);
  /* Every countdown sent so far was read above, so any blankSoon still
     waiting could only be the one the phone tried to start. */
  assert.equal(p.has('blankSoon'), false);
});
