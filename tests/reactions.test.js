'use strict';
/* Reactions.
 *
 * The whole risk with this feature is that it becomes the thing the roadmap
 * explicitly deferred — a chat that turns the room into Slack. What keeps it
 * from being that is a set of refusals, so refusals are what this file tests:
 * a fixed set of kinds and no text, a rate limit per person, a ceiling for the
 * room, nothing during a question, nothing at all when the host has switched
 * it off, and nothing written down anywhere afterwards.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { freePort, start, connect, stop, report } = require('./harness');

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function room(t, n = 3) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'slideforge-react-'));
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
  host.send({ t: 'host', title: 'Reactions', mode: 'individual' });
  const hosted = await host.next('hosted');
  const players = [];
  for (let i = 0; i < n; i++) {
    const p = await connect(port);
    sockets.push(p);
    p.send({ t: 'join', pin: hosted.pin, name: 'P' + (i + 1) });
    players.push({ sock: p, joined: await p.next('joined') });
  }
  return { host, hosted, players, dir, port };
}

/* Nothing of this type arrived. Checked by looking at the queue rather than
   awaiting a timeout: awaiting one leaves a waiter registered, and that
   waiter then swallows the next real message — which is how the first draft
   of this file "proved" that reactions after a refusal never arrive. */
async function quiet(sock, type, ms = 400) {
  await wait(ms);
  return !sock.has(type);
}

test('a reaction reaches the wall and nobody else', async (t) => {
  const { host, players } = await room(t, 3);
  const [ada, bo] = players;
  assert.equal(ada.joined.reactions, true, 'a phone is told it may react');
  host.send({ t: 'begin' });
  await ada.sock.next('begun');

  ada.sock.send({ t: 'react', kind: 'clap' });
  const seen = await host.next('reaction');
  assert.equal(seen.kind, 'clap');
  /* No name, no id — there is nothing for the wall to do with either, and a
     reaction that can be attributed is a reaction people stop sending. */
  assert.equal(seen.name, undefined);
  assert.equal(seen.playerId, undefined);
  assert.equal(seen.id, undefined);

  // The sender gets an acknowledgement so their phone can twitch.
  assert.equal((await ada.sock.next('reacted')).kind, 'clap');
  // Another phone hears nothing: this is not a feed.
  assert.ok(await quiet(bo.sock, 'reaction'));
});

test('only the four kinds, and never as text', async (t) => {
  const { host, players } = await room(t, 1);
  const [ada] = players;
  host.send({ t: 'begin' });
  await ada.sock.next('begun');

  for (const kind of ['clap', 'yes', 'wow', 'idea']) {
    ada.sock.send({ t: 'react', kind });
    assert.equal((await host.next('reaction')).kind, kind);
    await wait(2600);            // the rate limit, deliberately waited out
  }

  /* Anything else is dropped. There is no free-text reaction and no way to
     smuggle one in as a kind. */
  for (const kind of ['boo', 'thumbsdown', '', null, 42, '<script>x</script>']) {
    ada.sock.send({ t: 'react', kind });
  }
  ada.sock.send({ t: 'react', text: 'this is a chat message now' });
  assert.ok(await quiet(host, 'reaction'), 'something other than the four got through');
});

test('one each per two and a half seconds', async (t) => {
  const { host, players } = await room(t, 1);
  const [ada] = players;
  host.send({ t: 'begin' });
  await ada.sock.next('begun');

  ada.sock.send({ t: 'react', kind: 'clap' });
  await host.next('reaction');
  /* Held down, or tapped twenty times, is still one reaction — what makes a
     gesture a gesture is that it cannot be sustained. */
  for (let i = 0; i < 20; i++) ada.sock.send({ t: 'react', kind: 'clap' });
  assert.ok(await quiet(host, 'reaction'));

  await wait(2600);
  ada.sock.send({ t: 'react', kind: 'yes' });
  assert.equal((await host.next('reaction')).kind, 'yes', 'and then it is allowed again');
});

test('the room has a ceiling as well as each person', async (t) => {
  /* Twenty phones reacting at once is a moment; twenty phones reacting for a
     minute is a screen nobody can read a slide through. Each is inside its own
     rate limit here, so only the room ceiling can stop them. */
  const { host, players } = await room(t, 20);
  host.send({ t: 'begin' });
  await players[0].sock.next('begun');

  players.forEach((p) => p.sock.send({ t: 'react', kind: 'clap' }));
  let through = 0;
  for (;;) {
    const got = await Promise.race([
      host.next('reaction').catch(() => null),
      wait(500).then(() => null)
    ]);
    if (!got) break;
    through++;
  }
  assert.ok(through >= 8, 'a real burst still reads as a burst, got ' + through);
  assert.ok(through <= 12, 'but it is bounded, got ' + through);
});

test('nothing during a question', async (t) => {
  const { host, players } = await room(t, 2);
  const [ada] = players;
  host.send({ t: 'begin' });
  await ada.sock.next('begun');
  host.send({ t: 'question', id: 'q1', question: 'Which one?', options: ['A', 'B'], timeLimit: 0 });
  await ada.sock.next('question');

  /* Reactions belong to the explaining, not the answering. */
  ada.sock.send({ t: 'react', kind: 'clap' });
  assert.ok(await quiet(host, 'reaction'));

  host.send({ t: 'idle' });
  await ada.sock.next('idle');
  ada.sock.send({ t: 'react', kind: 'clap' });
  assert.equal((await host.next('reaction')).kind, 'clap', 'and again once it is over');
});

test('the host can switch them off in the moment', async (t) => {
  const { host, players } = await room(t, 2);
  const [ada] = players;
  host.send({ t: 'begin' });
  await ada.sock.next('begun');

  host.send({ t: 'reactions', on: false });
  /* The phones are told, so the control disappears rather than sending into
     a void — being ignored silently is what makes a room stop trusting a
     control. */
  assert.equal((await ada.sock.next('reactions')).on, false);
  ada.sock.send({ t: 'react', kind: 'clap' });
  assert.ok(await quiet(host, 'reaction'));

  host.send({ t: 'reactions', on: true });
  assert.equal((await ada.sock.next('reactions')).on, true);
  ada.sock.send({ t: 'react', kind: 'clap' });
  assert.equal((await host.next('reaction')).kind, 'clap');
});

test('every way into the room is told whether reactions are on', async (t) => {
  const { host, hosted, players, port } = await room(t, 1);
  host.send({ t: 'reactions', on: false });
  await players[0].sock.next('reactions');

  /* Joining fresh. A phone that missed the toggle would otherwise show a
     button that silently does nothing. */
  const late = await connect(port);
  t.after(() => late.socket.close());
  late.send({ t: 'join', pin: hosted.pin, name: 'Late' });
  assert.equal((await late.next('joined')).reactions, false);

  /* And being admitted from the waiting room, which is a different code path
     and had the field missing on the first attempt. */
  host.send({ t: 'begin' });
  await late.next('begun');
  host.send({ t: 'question', id: 'q1', question: 'Q', options: ['A', 'B'], timeLimit: 0 });
  await late.next('question');
  const held = await connect(port);
  t.after(() => held.socket.close());
  held.send({ t: 'join', pin: hosted.pin, name: 'Held' });
  await held.next('waiting');
  host.send({ t: 'round', gameId: 'g2' });
  assert.equal((await held.next('joined')).reactions, false);
});

test('a reaction leaves no trace in the session record', async (t) => {
  const { host, players } = await room(t, 2);
  const [ada, bo] = players;
  host.send({ t: 'begin' });
  await ada.sock.next('begun');
  host.send({ t: 'at', slideId: 's4', title: 'Osmosis', n: 4 });

  ada.sock.send({ t: 'react', kind: 'clap' });
  await host.next('reaction');
  bo.sock.send({ t: 'react', kind: 'idea' });
  await host.next('reaction');

  /* Deliberately unrecorded. It is the one channel here with no purpose
     beyond the room feeling present, and a count of it would turn a gesture
     into a metric — which is a different feature, and one nobody asked for. */
  const r = await report(host);
  const raw = JSON.stringify(r);
  assert.equal(raw.includes('clap'), false);
  assert.equal(raw.includes('idea'), false);
  assert.equal(raw.includes('react'), false);
  assert.equal(r.summary.reactions, undefined);
});
