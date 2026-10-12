'use strict';
/* Speaker notes on another device.
 *
 * The show opens a channel on the relay and says where it is on every move; a
 * phone or a prompt screen holding the channel's id sees that slide's notes at
 * the same moment, and can ask the show for Next or Back. The 32-hex id is the
 * only key, so what matters is that a wrong id gets nothing, that a notes screen
 * can only ask for Next or Back, and that the channel ends with the show.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { freePort, start, connect, stop } = require('./harness');

test('a notes screen follows the show, may step it, and ends with it', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-prompter-'));
  const port = await freePort();
  const relay = await start(port, dir);
  try {
    const show = await connect(port);
    show.send({ t: 'prompterOpen' });
    const { id } = await show.next('prompterReady');
    assert.match(id, /^[a-f0-9]{32}$/);
    show.send({ t: 'prompterState', state: { index: 0, total: 3, title: 'One', notes: 'Say hello.', next: 'Two', startedAt: 1, evil: '<x>' } });

    const phone = await connect(port);
    phone.send({ t: 'prompterWatch', id });
    const first = (await phone.next('prompterState')).state;
    assert.equal(first.notes, 'Say hello.', 'a screen that joins late gets where the show is now');
    assert.equal(first.total, 3);
    assert.equal(first.evil, undefined, 'only the fields a notes screen needs are passed on');
    assert.equal((await show.next('prompterWatchers')).n, 1);

    show.send({ t: 'prompterState', state: { index: 1, total: 3, title: 'Two', notes: 'Ask the room.', next: 'Three' } });
    assert.equal((await phone.next('prompterState')).state.notes, 'Ask the room.', 'it moves when the show moves');

    phone.send({ t: 'prompterCmd', cmd: 'next' });
    assert.equal((await show.next('prompterCmd')).cmd, 'next', 'the phone is a clicker');
    await new Promise((r) => setTimeout(r, 200));
    phone.send({ t: 'prompterCmd', cmd: 'goto', to: 9 });
    phone.send({ t: 'prompterState', state: { notes: 'hijack' } });
    await new Promise((r) => setTimeout(r, 300));
    assert.equal(show.has('prompterCmd'), false, 'only Next and Back are passed to the show');

    const stranger = await connect(port);
    stranger.send({ t: 'prompterWatch', id: 'f'.repeat(32) });
    await stranger.next('prompterEnd');
    assert.equal(stranger.has('prompterState'), false, 'a wrong id sees nothing');

    show.socket.close();
    await phone.next('prompterEnd');
    const late = await connect(port);
    late.send({ t: 'prompterWatch', id });
    await late.next('prompterEnd');
    for (const c of [phone, stranger, late]) c.socket.close();
  } finally {
    await stop(relay);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
