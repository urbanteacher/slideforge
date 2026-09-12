'use strict';
/* Deleting a session.
 *
 * A list of records with no way to remove one is not a feature, it is a
 * leak: ninety test runs from an afternoon could only be cleared by deleting
 * files by hand. But these are attendance records — who was in the room and
 * what they answered — so the ability to destroy one is held to the same bar
 * as the ability to read it, and refused outright while the lesson is live.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { freePort, start, connect, stop } = require('./harness');

test('a session can be deleted, but only by whoever could read it', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'slideforge-del-'));
  const port = await freePort();
  const relay = await start(port, dir);
  const sockets = [];
  t.after(async () => {
    await stop(relay);
    for (const s of sockets) s.socket.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const host = await connect(port);
  sockets.push(host);
  host.send({ t: 'host', title: 'Deletable lesson', mode: 'individual' });
  const hosted = await host.next('hosted');
  const { id, token } = hosted.session;
  const url = 'http://127.0.0.1:' + port + '/api/sessions/' + id;
  const del = (tok) => fetch(url, {
    method: 'DELETE',
    headers: tok ? { Authorization: 'Bearer ' + tok } : {}
  }).then(async (r) => ({ status: r.status, body: await r.json() }));

  /* Refused while the room is still recording. Unlinking the journal from
     under a live host would leave it appending to a file that is gone, and
     the lesson would look fine right up until the report came back empty. */
  const live = await del(token);
  assert.equal(live.status, 409);
  assert.match(live.body.error, /still running/);
  assert.equal(fs.readdirSync(dir).length, 2, 'nothing removed while live');

  host.send({ t: 'end' });
  await host.next('sessionClosed');

  /* The token is the whole of the authorisation, so a wrong one and a
     missing one are both refused — and neither is allowed to reveal whether
     the session exists. */
  assert.equal((await del('0'.repeat(64))).status, 403);
  assert.equal((await del(null)).status, 403);
  assert.equal(fs.readdirSync(dir).length, 2, 'a refusal never deletes');

  /* Both files go: the meta and the journal. A journal left without its meta
     is an orphan nothing can authorise, read or clean up. */
  const gone = await del(token);
  assert.equal(gone.status, 200);
  assert.equal(gone.body.deleted, id);
  assert.equal(fs.readdirSync(dir).length, 0);

  /* Deleting twice is not an error worth panicking about, but it must not
     report success either — the UI drops the row on 404 as well as 200, and
     that only holds if 404 really means "not here". */
  const again = await del(token);
  assert.equal(again.status, 404);
  assert.match(again.body.error, /already be deleted/);

  /* An id that was never a session is the same answer, not a crash. */
  const nonsense = await fetch('http://127.0.0.1:' + port + '/api/sessions/not-a-uuid',
    { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } });
  assert.equal(nonsense.status, 404);
});
