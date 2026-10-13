// The questions box in the studio's room (live/questions.ts): fast, no browser. The room keeps the relay's `qa`; the host
// sends classic's moderation frames (qaModerate, qaPin) and the floor; the desk's buttons are classic's; the wall shows the
// pinned question; the Teacher Presenter's commands carry the action. The phones' list (`qaList`) is the relay's to send,
// on a fresh join and after every change (server.js qaForPlayer), so the host has nothing to resend.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LiveHost, Room, emptyRoom, qaButtons, qaOf, type RoomShow } from '../src/live';
import { parseToShow } from '../src/presenter/protocol';
import { wallOf } from '../src/show/wallModel';
import { Recorded } from './replay-kit';

const HOSTED = { t: 'hosted', session: { id: 's', title: 't', createdAt: 0 }, hostToken: 'h', pin: '123456', joinUrl: 'http://x/join.html', mode: 'individual', teams: [] };
const QA = {
  t: 'qa', pending: 1, open: 1, pinned: { id: 2, text: 'Why blue?', name: 'Ada', votes: 3 },
  items: [{ id: 2, text: 'Why blue?', name: 'Ada', at: 5, state: 'approved', votes: 3 }, { id: 1, text: 'And red?', name: '', at: 4, state: 'pending', votes: 0 }],
};
const show: RoomShow = { title: 'Plain', slides: [{ id: 'a', title: 'One', text: '', activity: 'content', style: 'points' }, { id: 'b', title: 'Two', text: '', activity: 'content', style: 'points' }] };

async function opened() {
  const sock = new Recorded();
  const host = new LiveHost({ url: 'ws://test', show, makeSocket: () => sock });
  host.start();
  await new Promise((r) => setTimeout(r, 0));
  sock.feed(HOSTED);
  return { sock, host };
}

test('the room keeps the relay\'s questions box: every question, the pinned one, the counts; a rehost keeps it, a new room empties it', () => {
  const room = new Room();
  room.received(HOSTED as never);
  assert.deepEqual(room.state.qa, { items: [], pinned: null, pending: 0, open: 0 });
  room.received(QA as never);
  assert.equal(room.state.qa.items.length, 2);
  assert.deepEqual(room.state.qa.pinned, { id: 2, text: 'Why blue?', name: 'Ada', votes: 3 });
  assert.equal(room.state.qa.pending, 1);
  room.received({ t: 'rehosted', phase: 'idle', pin: '123456', hostToken: 'h', joinUrl: 'x', mode: 'individual', teams: [], session: HOSTED.session } as never);
  assert.equal(room.state.qa.items.length, 2, 'the same room after a blip');
  room.received(HOSTED as never);
  assert.equal(room.state.qa.items.length, 0, 'a new room has no questions');
  // Made safe: a state the desk does not know waits; missing fields are empty.
  assert.deepEqual(qaOf({ items: [{ id: '7', text: 3, state: 'odd' }], pinned: null }).items[0], { id: 7, text: '3', name: '', at: 0, state: 'pending', votes: 0 });
});

test('the host sends classic\'s moderation frames and the floor; a new room after a relay restart gets the floor again', async () => {
  const { sock, host } = await opened();
  host.begin();
  const from = sock.sent.length;
  assert.equal(host.qa(1, 'approve'), true);
  host.qa(2, 'pin'); host.qa(2, 'unpin'); host.qa(2, 'answered'); host.qa(1, 'dismiss'); host.qa(2, 'pending');
  assert.equal(host.qa(1, 'explode' as never), false);
  assert.deepEqual(sock.sent.slice(from), [
    { t: 'qaModerate', id: 1, action: 'approve' }, { t: 'qaPin', id: 2 }, { t: 'qaPin', id: null },
    { t: 'qaModerate', id: 2, action: 'answered' }, { t: 'qaModerate', id: 1, action: 'dismiss' }, { t: 'qaModerate', id: 2, action: 'pending' },
  ]);
  // The floor: auto, open, shut, round again; or a mode named.
  assert.equal(host.state.floor, 'auto');
  assert.deepEqual([host.floor(), host.floor(), host.floor(), host.floor('open')], ['open', 'shut', 'auto', 'open']);
  assert.equal(host.state.floor, 'open');
  assert.deepEqual(sock.sent.filter((m) => m.t === 'floor').map((m) => (m as { mode: string }).mode), ['open', 'shut', 'auto', 'open']);
  const before = sock.sent.length;
  sock.feed(HOSTED); // the relay restarted: a new room
  assert.deepEqual(sock.sent.slice(before).map((m) => m.t).slice(0, 3), ['floor', 'begin', 'at']);
  await host.end();
});

test('the desk\'s buttons are classic\'s: approve or hide a waiting one; on or off the wall, answered, hide; reopen an answered one', () => {
  const acts = (state: 'pending' | 'approved' | 'answered' | 'dismissed', pinned: number | null = null) => qaButtons({ id: 2, state }, pinned).map((b) => b.action);
  assert.deepEqual(acts('pending'), ['approve', 'dismiss']);
  assert.deepEqual(acts('approved'), ['pin', 'answered', 'dismiss']);
  assert.deepEqual(acts('approved', 2), ['unpin', 'answered', 'dismiss']);
  assert.deepEqual(acts('answered'), ['approve']);
  assert.deepEqual(acts('dismissed'), []);
});

test('the wall shows the pinned question; the Teacher Presenter\'s commands carry the action and the floor', () => {
  const steps = [{ room: show.slides[0] }] as unknown as Parameters<typeof wallOf>[0]['steps'];
  const room = { ...emptyRoom(), live: true, pin: '123456', phase: 'idle' as const, qa: qaOf(QA) };
  const wall = wallOf({ room, steps, at: 0, scoresOn: false, fallbackJoin: '' });
  assert.equal(wall.view, 'slide');
  assert.equal(wall.qa?.text, 'Why blue?');
  assert.equal(wallOf({ room: { ...room, qa: { ...room.qa, pinned: null } }, steps, at: 0, scoresOn: false, fallbackJoin: '' }).qa, null);
  assert.deepEqual(parseToShow({ t: 'cmd', cmd: 'qa', qa: { id: 2, action: 'pin' } }), { t: 'cmd', cmd: 'qa', n: undefined, qa: { id: 2, action: 'pin' } });
  assert.deepEqual(parseToShow({ t: 'cmd', cmd: 'qa', qa: { id: 2, action: 'explode' } }), { t: 'cmd', cmd: 'qa', n: undefined });
  assert.deepEqual(parseToShow({ t: 'cmd', cmd: 'floor', floor: 'shut' }), { t: 'cmd', cmd: 'floor', n: undefined, floor: 'shut' });
});
