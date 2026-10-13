// The proposals of the spoken games in the studio's room (lab-engine-plan M8): Connection maker's bridge and Concept chain's link. An idea
// box opens beside the question for the phones, the teacher puts one proposal on the table (its author becomes the speaker), and the verdict
// credits the author. The wire against the classic recordings is in live-replay-spoken.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { manualState, showFromDeck, styleFor, styleForFormat } from '../src/live';
import { canHostInStudio } from '../src/show/canHost';
import { deckOf, quiz, room } from './spoken-kit';

const conn = (extra: object = {}) => quiz('connection', { options: ['Accept', 'Reject'], itemA: 'CPU', itemB: 'RAM', question: 'How do they connect?', points: 1, ...extra });
const ideas = (id: string, items: [number, string, string][]) => ({ t: 'responses', id, kind: 'brainstorm', answered: items.length, players: 2, total: items.length, items: items.map(([pid, name, text], seq) => ({ pid, name, text, seq })) });

test('the registry takes Connection maker; the room hosts it; its verdicts are Accept and Reject, and it can score', () => {
  assert.equal(styleForFormat('connection-maker')?.key, 'connection');
  assert.deepEqual(canHostInStudio(deckOf('connection-maker', [conn()])), { ok: true, reason: '' });
  const q = showFromDeck(deckOf('connection-maker', [conn({ options: ['x'], itemA: ' CPU ', confidence: true })])).slides.find((s) => s.quiz)!.quiz!;
  assert.deepEqual([q.options, q.itemA, q.confidence], [['Accept', 'Reject'], 'CPU', false]);
  assert.deepEqual(styleFor(q).spoken, { accepts: [0], scores: true, counts: 'bridges made', proposals: 'bridge' });
});

test('the proposals reach the teacher with their authors and the wall without them; one put on the table makes its author the speaker', async () => {
  const { host, sock, sent, wall } = await room(deckOf('connection-maker', [conn()]), 'teams');
  const box = host.state.spoken.proposalPrompt!;
  assert.equal(sent('prompt')[0].id, box);
  sock.feed(ideas(box, [[1, 'Ada', 'RAM feeds the CPU'], [2, 'Bo', 'Both hold what the program needs']]));
  const m = manualState(host) as { proposals: { pid: number; name: string; text: string }[]; onTable: string; question: { spoken: boolean; scoreSpoken: boolean } };
  assert.deepEqual(m.proposals.map((p) => [p.pid, p.name, p.text]), [[1, 'Ada', 'RAM feeds the CPU'], [2, 'Bo', 'Both hold what the program needs']]);
  assert.equal(m.question.spoken, true);
  const d = wall().question!.detail;
  assert.deepEqual(d.kind === 'spoken' && d.spoken.ideas, [{ pid: 1, text: 'RAM feeds the CPU' }, { pid: 2, text: 'Both hold what the program needs' }], 'the wall has the words and who to credit, never a name to draw');
  host.useProposal(2, 'Both hold what the program needs');
  assert.deepEqual(host.state.spoken.recipient, { type: 'player', id: 2 });
  assert.equal((manualState(host) as { onTable: string }).onTable, 'Both hold what the program needs');
  const on = wall().question!.detail;
  assert.equal(on.kind === 'spoken' && on.spoken.onTable, 'Both hold what the program needs');
  // The verdict is credited to the author's team (Bo is on Blue), and the box closes with it.
  host.verdict(0);
  assert.deepEqual([sent('reveal')[0].spoken, host.state.spoken.credit?.line], [{ recipient: { type: 'player', id: 2 } }, 'Blue +1000']);
  assert.deepEqual(sent('promptEnd').length, 1);
  assert.equal(host.state.spoken.proposalPrompt, null);
});

test('a proposal is only put on the table by its author being in the room, and not once the question is revealed', async () => {
  const { host } = await room(deckOf('connection-maker', [conn()]));
  host.useProposal(9, 'A bridge from nobody');
  assert.deepEqual(host.state.spoken.recipient, { type: 'room' }, 'a player who is not in the room is nobody');
  assert.equal(host.state.spoken.onTable?.text, 'A bridge from nobody', 'its words are still on the table');
  host.verdict(1);
  host.useProposal(1, 'Late');
  assert.deepEqual(host.state.spoken.recipient, { type: 'room' }, 'revealed: the speaker is not changed');
});

test('a question closed by Next leaves the idea box to close as the show leaves the slide; a new question brings its own box and a clear table', async () => {
  const { host, sent } = await room(deckOf('connection-maker', [conn(), conn({ itemA: 'Disk', itemB: 'Cache' })]));
  host.useProposal(1, 'Disk backs the cache');
  host.next(); // reveals the first, no verdict
  host.next(); // the second
  assert.equal(sent('prompt').length, 2);
  assert.equal(sent('promptEnd').length, 1, 'the first box closed as the show left it');
  assert.equal(host.state.spoken.onTable, null, 'the table is cleared for the next item');
  assert.match(String(sent('prompt')[1].prompt), /Disk.*Cache/);
});
