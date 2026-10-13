// Phone reactions in the studio's room (live/reactions.ts), as classic has them (js/live.js `reaction`, js/player.js
// showReaction): fast, no browser. The relay's refusals (kinds, rates, ceilings, none in a question, none when off) are
// tests/reactions.test.js's; this file checks what the host does with what arrives, and the teacher's T.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LiveHost, REACTION_CAP, REACTION_GLYPH, Room, addGlyph, glyphOf, nextReaction, reactionKind, reactionsSay, type RoomShow } from '../src/live';
import { Recorded } from './replay-kit';

const HOSTED = { t: 'hosted', session: { id: 's', title: 't', createdAt: 0 }, hostToken: 'h', pin: '123456', joinUrl: 'http://x/join.html', mode: 'individual', teams: [] };
const show: RoomShow = { title: 'Plain', slides: [{ id: 'a', title: 'One', text: '', activity: 'content', style: 'points' }] };

test('the kinds and glyphs are classic\'s (and the relay\'s four)', () => {
  assert.deepEqual(Object.keys(REACTION_GLYPH), ['clap', 'yes', 'wow', 'idea']);
  assert.deepEqual(Object.values(REACTION_GLYPH), ['👏', '👍', '😮', '💡']);
  assert.equal(reactionKind('clap'), 'clap');
  assert.equal(reactionKind('toString'), null);
  assert.equal(reactionKind(3), null);
});

test('the room keeps only the last reaction, counting arrivals; none over a question, an unknown kind, or with reactions off', () => {
  const room = new Room();
  room.received(HOSTED as never);
  const causes: string[] = [];
  room.subscribe((_s, c) => causes.push(c.t));
  room.received({ t: 'reaction', kind: 'clap' } as never);
  room.received({ t: 'reaction', kind: 'clap' } as never);
  assert.deepEqual(room.state.reaction, { n: 2, kind: 'clap' });
  assert.deepEqual(causes, ['reaction', 'reaction']);
  room.received({ t: 'reaction', kind: 'boo' } as never);
  assert.deepEqual(room.state.reaction, { n: 2, kind: 'clap' }, 'an unknown kind is not drawn');
  assert.equal(causes.length, 2, 'and does not repaint');
  assert.deepEqual(nextReaction(null, 'wow', true, 'question'), null, 'nothing over an open question');
  assert.deepEqual(nextReaction(null, 'wow', false, 'running'), null, 'nothing when off');
  room.sent({ t: 'reactions', on: false });
  assert.equal(room.state.reactions, false);
  assert.equal(room.state.reaction, null, 'switching off clears the wall');
  room.received({ t: 'reaction', kind: 'idea' } as never);
  assert.equal(room.state.reaction, null);
});

test('a glyph is placed as classic places it, and no more than its ceiling are in the air', () => {
  const g = glyphOf({ n: 1, kind: 'idea' }, () => 0.5);
  assert.deepEqual(g, { n: 1, glyph: '💡', left: 41, drift: 0, spin: 0, delay: 60 });
  let air = addGlyph([], { n: 1, kind: 'yes' });
  assert.equal(addGlyph(air, { n: 1, kind: 'yes' }), air, 'the same arrival is drawn once');
  for (let n = 2; n <= REACTION_CAP + 5; n++) air = addGlyph(air, { n, kind: 'yes' });
  assert.equal(air.length, REACTION_CAP);
});

test('T switches reactions off and on (classic\'s toast), and a new room after a relay restart is told they are off', async () => {
  const sock = new Recorded();
  const host = new LiveHost({ url: 'ws://test', show, makeSocket: () => sock });
  host.start();
  await new Promise((r) => setTimeout(r, 0));
  sock.feed(HOSTED);
  host.begin();
  assert.equal(host.reactions(), false);
  assert.equal(reactionsSay(false), 'Reactions off');
  assert.match(reactionsSay(true), /^Reactions on/);
  assert.deepEqual(sock.sent.filter((m) => m.t === 'reactions'), [{ t: 'reactions', on: false }]);
  const before = sock.sent.length;
  sock.feed(HOSTED); // the relay restarted: a new room, reactions on by default
  assert.deepEqual(sock.sent.slice(before).map((m) => m.t).slice(0, 2), ['reactions', 'begin']);
  assert.equal(host.reactions(), true);
  await host.end();
});
