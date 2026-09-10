'use strict';
/* Moderated Q&A.

   The invariant worth locking down is the projection split: a question the
   host has not approved must never appear in anything a player receives. The
   host's own screen is usually the projected one, so "the host can see it" and
   "the room can see it" are only kept apart by moderation plus the decision to
   render pending items in presenter view alone. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { freePort, start, connect, stop, report } = require('./harness');

async function room(t, mode = 'individual') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'slideforge-qa-test-'));
  const port = await freePort();
  const relay = await start(port, dir);
  const sockets = [];
  t.after(async () => {
    await stop(relay);
    for (const c of sockets) c.socket.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });
  const host = await connect(port);
  sockets.push(host);
  host.send({ t: 'host', title: 'Q&A lesson', mode });
  const hosted = await host.next('hosted');
  host.send({ t: 'begin' });

  const join = async (name) => {
    const c = await connect(port);
    sockets.push(c);
    c.send({ t: 'join', pin: hosted.pin, name });
    await c.next('joined');
    return c;
  };
  return { port, host, hosted, join };
}

test('a pending question reaches the host but never a player', async (t) => {
  const { host, join } = await room(t);
  const ada = await join('Ada');
  const bo = await join('Bo');

  ada.send({ t: 'ask', text: 'Why does this work?' });
  await ada.next('asked');

  const forHost = await host.until('qa', m => m.items.length === 1, 'the question queued');
  assert.equal(forHost.pending, 1);
  assert.equal(forHost.open, 0);
  assert.equal(forHost.items[0].text, 'Why does this work?');

  /* Bo is sent a list on join and on every change; none of them may contain a
     pending question. */
  const forBo = await bo.latest('qaList');
  assert.deepEqual(forBo.items, []);
  assert.equal(forBo.pinned, null);

  host.send({ t: 'qaModerate', id: forHost.items[0].id, action: 'approve' });
  const approved = await bo.until('qaList', m => m.items.length === 1, 'approved reached Bo');
  assert.equal(approved.items.length, 1);
  assert.equal(approved.items[0].text, 'Why does this work?');
  assert.equal(approved.items[0].asked, false);   // Bo did not ask it
});

test('pinning is a display action, not a second route past approval', async (t) => {
  const { host, join } = await room(t);
  const ada = await join('Ada');
  ada.send({ t: 'ask', text: 'Can we go over question three?' });
  await ada.next('asked');
  const id = (await host.until('qa', m => m.items.length === 1, 'queued')).items[0].id;

  /* Pending: pinning must be refused outright. */
  host.send({ t: 'qaPin', id });
  let state = await host.until('qa', m => m.items[0].state === 'pending', 'still pending');
  assert.equal(state.pinned, null, 'a pending question must not be pinnable');

  host.send({ t: 'qaModerate', id, action: 'approve' });
  host.send({ t: 'qaPin', id });
  state = await host.until('qa', m => m.pinned != null, 'pinned once approved');
  assert.equal(state.pinned.id, id);

  /* Dismissing or answering something on the wall has to take it down. */
  host.send({ t: 'qaModerate', id, action: 'answered' });
  state = await host.until('qa', m => m.items[0].state === 'answered', 'answered');
  assert.equal(state.pinned, null, 'answering must unpin');
  assert.equal(state.items[0].state, 'answered');
});

test('votes order the queue, cannot be cast on your own or on a pending question', async (t) => {
  const { host, join } = await room(t);
  const ada = await join('Ada');
  const bo = await join('Bo');
  const cy = await join('Cy');

  ada.send({ t: 'ask', text: 'First question' });
  await ada.next('asked');
  bo.send({ t: 'ask', text: 'Second question' });
  await bo.next('asked');

  let state = await host.until('qa', m => m.items.length === 2, 'both questions queued');
  const first = state.items.find(q => q.text === 'First question').id;
  const second = state.items.find(q => q.text === 'Second question').id;

  /* Voting before approval is refused. */
  bo.send({ t: 'qaVote', id: first });
  bo.send({ t: 'ask', text: 'probe' });          // a message we can await on
  await bo.next('asked');
  state = await host.until('qa', m => m.items.length === 3, 'the probe queued');
  assert.equal(state.items.find(q => q.id === first).votes, 0);

  host.send({ t: 'qaModerate', id: first, action: 'approve' });
  host.send({ t: 'qaModerate', id: second, action: 'approve' });
  await host.until('qa',
    m => m.items.filter(q => q.state === 'approved').length === 2, 'both approved');

  /* Ada cannot upvote her own; Bo and Cy can. */
  ada.send({ t: 'qaVote', id: first });
  bo.send({ t: 'qaVote', id: first });
  cy.send({ t: 'qaVote', id: first });
  cy.send({ t: 'qaVote', id: second });
  state = await host.until('qa',
    m => m.items.find(q => q.id === second).votes === 1, 'all votes counted');
  assert.equal(state.items.find(q => q.id === first).votes, 2, 'the asker must not count');
  assert.equal(state.items.find(q => q.id === second).votes, 1);

  /* Most-voted first, so the queue reflects what the room wants answered. */
  const approvedOrder = state.items.filter(q => q.state === 'approved').map(q => q.id);
  assert.deepEqual(approvedOrder.slice(0, 2), [first, second]);

  /* And a vote toggles off. */
  bo.send({ t: 'qaVote', id: first });
  state = await host.until('qa',
    m => m.items.find(q => q.id === first).votes === 1, 'vote toggled off');
  assert.equal(state.items.find(q => q.id === first).votes, 1);
});

test('five open questions each, and a dismissal does not count against you', async (t) => {
  const { host, join } = await room(t);
  const ada = await join('Ada');

  for (let i = 1; i <= 5; i++) {
    ada.send({ t: 'ask', text: 'Question ' + i });
    await ada.next('asked');
  }
  ada.send({ t: 'ask', text: 'One too many' });
  const rejected = await ada.next('askRejected');
  assert.match(rejected.reason, /five/i);

  let state = await host.until('qa', m => m.items.length === 5, 'five queued');
  assert.equal(state.items.length, 5);

  /* The host judged that one, not Ada — so it frees a slot. */
  host.send({ t: 'qaModerate', id: state.items[0].id, action: 'dismiss' });
  await host.until('qa', m => m.items.some(q => q.state === 'dismissed'), 'dismissed');
  ada.send({ t: 'ask', text: 'Allowed again' });
  await ada.next('asked');
  state = await host.until('qa', m => m.items.length === 6, 'sixth queued');
  assert.ok(state.items.some(q => q.text === 'Allowed again'));
});

test('someone joining mid-session gets the approved list and not the pending one', async (t) => {
  const { host, join } = await room(t);
  const ada = await join('Ada');

  ada.send({ t: 'ask', text: 'Approved before they arrived' });
  await ada.next('asked');
  ada.send({ t: 'ask', text: 'Still waiting for the teacher' });
  await ada.next('asked');

  const state = await host.until('qa', m => m.items.length === 2, 'both queued');
  const approvedId = state.items.find(q => q.text === 'Approved before they arrived').id;
  host.send({ t: 'qaModerate', id: approvedId, action: 'approve' });
  await host.until('qa', m => m.open === 1, 'approved');

  const late = await join('Late');
  const list = await late.until('qaList', m => m.items.length === 1, 'late sees approved');
  assert.equal(list.items.length, 1);
  assert.equal(list.items[0].text, 'Approved before they arrived');
});

test('the session report records what was asked, moderated and shown', async (t) => {
  const { host, join } = await room(t);
  const ada = await join('Ada');
  const bo = await join('Bo');

  ada.send({ t: 'ask', text: 'Does this appear in the report?' });
  await ada.next('asked');
  ada.send({ t: 'ask', text: 'This one gets dismissed' });
  await ada.next('asked');

  let state = await host.until('qa', m => m.items.length === 2, 'both questions queued');
  const keep = state.items.find(q => q.text.startsWith('Does this')).id;
  const drop = state.items.find(q => q.text.startsWith('This one')).id;

  host.send({ t: 'qaModerate', id: keep, action: 'approve' });
  host.send({ t: 'qaModerate', id: drop, action: 'dismiss' });
  await host.until('qa', m => m.items.find(q => q.id === drop).state === 'dismissed', 'dismissed');
  bo.send({ t: 'qaVote', id: keep });
  await host.until('qa', m => m.items.find(q => q.id === keep).votes === 1, 'vote counted');
  host.send({ t: 'qaPin', id: keep });
  await host.until('qa', m => m.pinned && m.pinned.id === keep, 'pinned');

  const r = await report(host);
  const asked = r.questions.find(q => q.id === keep);
  assert.equal(asked.text, 'Does this appear in the report?');
  assert.equal(asked.name, 'Ada', 'the report attributes the question');
  assert.equal(asked.state, 'approved');
  assert.equal(asked.votes, 1);
  assert.equal(asked.shown, true);
  assert.ok(asked.shownAt);

  const dismissed = r.questions.find(q => q.id === drop);
  assert.equal(dismissed.state, 'dismissed');
  assert.equal(dismissed.shown, false);

  /* A dismissed question is not held against the person who asked it. */
  assert.equal(r.attendance.find(p => p.name === 'Ada').questionsAsked, 1);
  assert.equal(r.summary.questionsAsked, 1);
  assert.equal(r.summary.questionsShown, 1);
});

test('text is trimmed, capped, and an empty question is ignored', async (t) => {
  const { host, join } = await room(t);
  const ada = await join('Ada');

  ada.send({ t: 'ask', text: '   ' });
  ada.send({ t: 'ask', text: '  Trimmed please  ' });
  await ada.next('asked');
  ada.send({ t: 'ask', text: 'x'.repeat(400) });
  await ada.next('asked');

  const state = await host.until('qa', m => m.items.length === 2, 'two queued');
  assert.equal(state.items.length, 2, 'an empty question is not queued');
  assert.ok(state.items.some(q => q.text === 'Trimmed please'));
  assert.equal(state.items.find(q => q.text.startsWith('xxx')).text.length, 240);
});
