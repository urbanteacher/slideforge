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

const chain = (term: string, extra: object = {}) => quiz('conceptchain', { options: ['Accept', 'Reject'], term, question: 'Add the next justified link', points: 1, conceptChain: true, ...extra });
const links = () => deckOf('concept-chain', [chain('Cell'), chain('Tissue')]);

test('the registry takes Concept chain; the room hosts it; the phones are told to send a link when the idea box opens', () => {
  assert.equal(styleForFormat('concept-chain')?.key, 'conceptchain');
  assert.deepEqual(canHostInStudio(links()), { ok: true, reason: '' });
  const q = showFromDeck(links()).slides.find((s) => s.quiz)!.quiz!;
  assert.deepEqual(styleFor(q).spoken, { accepts: [0], scores: true, counts: 'links', proposals: 'link', chain: true });
  assert.deepEqual(styleFor(q).companion!(q), { role: 'discuss', headPrompt: 'Concept chain', participation: 'Send a link on your phone when the idea box opens, or propose it aloud. The teacher chooses which to weigh.' });
});

test('Accept with no link typed does nothing and says so; Reject puts the proposal down; neither reveals the term', async () => {
  const { host, sent } = await room(links());
  assert.equal(host.verdict(0), true, 'handled: the press is the desk\'s, not a reveal');
  assert.equal(host.state.spoken.notice, 'Type the proposed link before Accept');
  host.revealWith(0); // the entry window's press: the same
  assert.deepEqual([sent('oralCredit').length, sent('reveal').length, host.state.spoken.links.length], [0, 0, 0]);
  host.chainLink('Cells make tissue');
  host.verdict(1);
  assert.deepEqual([host.state.spoken.pendingLink, host.state.spoken.notice, sent('oralCredit').length, sent('reveal').length], ['', 'Put down. Weigh another, or Next to close the term.', 0, 0]);
});

test('an accepted link is credited as it lands and the term stays open; Next then closes it as Accept; a term nothing grew from closes as Reject', async () => {
  const { host, sent, wall } = await room(links(), 'teams');
  host.useProposal(2, 'Cells make tissue'); // Bo, on Blue
  assert.deepEqual([host.state.spoken.pendingLink, host.state.spoken.recipient], ['Cells make tissue', { type: 'player', id: 2 }]);
  host.verdict(0);
  const q = host.slide!.quiz!;
  assert.deepEqual(sent('oralCredit'), [{ t: 'oralCredit', id: q.id, gameId: q.gameId, style: 'conceptchain', recipient: { type: 'player', id: 2 }, scoreSpoken: false }]);
  assert.equal(sent('reveal').length, 0, 'the term stays open');
  assert.deepEqual(host.state.spoken.links, [{ slideId: q.id, term: 'Cell', link: 'Cells make tissue' }]);
  assert.deepEqual([host.state.spoken.recipient, host.state.spoken.onTable, host.state.spoken.pendingLink, host.state.spoken.credit?.line], [{ type: 'room' }, null, '', 'Blue +1000']);
  const d = wall().question!.detail;
  assert.deepEqual(d.kind === 'spoken' && d.spoken.chain?.rows.map((r) => [r.term, r.links, r.now]), [['Cell', ['Cells make tissue'], true]]);
  host.next(); // closes the term
  assert.deepEqual(sent('reveal').map((r) => [r.correct, r.answer]), [[0, 'Accept']], 'the chain grew from it');
  assert.deepEqual(sent('promptEnd').length, 1);
  assert.equal(host.state.revealed.includes(q.id), true, 'the relay never answers a term, so the room has it revealed as sent');
  host.next(); // the next term
  host.next(); // closes it with nothing accepted
  assert.deepEqual(sent('reveal').map((r) => r.correct), [0, 1], 'nothing grew from the second term: Reject');
});

test('in a teams room an Accept with no speaker is held; the link is already on the map, and the speaker completes the credit', async () => {
  const { host, sent } = await room(links(), 'teams');
  host.chainLink('Tissue makes organs');
  host.verdict(0);
  assert.equal(sent('oralCredit').length, 0, 'held until the teacher says who spoke');
  assert.deepEqual([host.state.spoken.links.length, host.state.spoken.pending?.choice], [1, 0]);
  host.recipient({ type: 'team', id: 1 });
  assert.deepEqual([sent('oralCredit').length, sent('oralCredit')[0]?.recipient, host.state.spoken.pending], [1, { type: 'team', id: 1 }, null]);
});

test('the chain map keeps every term of the game, shrinks the earlier ones and shows the latest links of the one that is up', async () => {
  const { chainOf } = await import('../src/live/spoken');
  const link = (n: number, slideId: string, term: string, l: string) => ({ slideId, term, link: `${l}${n}` });
  const all = [link(1, 'a', 'A', 'x'), link(2, 'b', 'B', 'x'), link(3, 'c', 'C', 'x'), link(4, 'd', 'D', 'x'), ...Array.from({ length: 8 }, (_, i) => link(i, 'e', 'E', 'y'))];
  const m = chainOf(all, 'e', 'E', 'draft');
  assert.equal(m.earlier, 1, 'past three earlier terms only the latest show');
  assert.deepEqual(m.rows.map((r) => [r.term, r.now]), [['B', false], ['C', false], ['D', false], ['E', true]]);
  const now = m.rows[3];
  assert.deepEqual([now.links.length, now.more, now.links[0]], [6, 2, 'y2'], 'the newest six, and a count of the rest');
  assert.equal(m.pending, 'draft');
  const fresh = chainOf([link(1, 'a', 'A', 'x')], 'z', 'Z', '');
  assert.deepEqual(fresh.rows.map((r) => [r.term, r.now, r.links.length]), [['A', false, 1], ['Z', true, 0]], 'the term that is up is on the map even before it has a link');
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
