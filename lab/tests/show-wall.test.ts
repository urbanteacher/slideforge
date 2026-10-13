// The studio show's pure logic (lab/src/show): the room's steps placed on a lab deck, what the wall shows in
// each phase (room state + step -> view), and what one press of Next does. No browser, no relay: the real
// room end to end is tools/smoke/studio-room.mjs. lab-engine-plan M7 slice 2.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Slide } from '../src/core';
import { emptyRoom, type RoomState } from '../src/live';
import { shownDeck, slideFor, stepsOf } from '../src/show/steps';
import { GRACE_MS, joinLink, nextAction, shortAddress, wallOf } from '../src/show/wallModel';

const slide = (id: string, name: string, game?: Slide['game'], extra: Partial<Slide> = {}) =>
  ({ id, name, background: '', layers: [], transition: { type: 'none', duration: 0 }, notes: '', game, ...extra }) as unknown as Slide;
const game = (role: NonNullable<Slide['game']>['role'], extra: Partial<NonNullable<Slide['game']>> = {}) => ({ id: 'gm1', format: 'choice', label: 'Air', role, settings: { seconds: 20 }, ...extra });

/** intro, then a game: cover, two questions each followed by its answer; a hidden slide among them. */
function deck() {
  const slides: Slide[] = [slide('intro', 'Intro'), slide('hid', 'Hidden', undefined, { hidden: true }), slide('cover', 'Cover', game('cover'))];
  [['Which gas is most of the air?', ['Nitrogen', 'Oxygen', 'Argon'], 0], ['Which particle is positive?', ['Proton', 'Electron'], 0]].forEach(([question, options, correct], i) => {
    const quiz = { type: 'quiz', style: 'choice', input: 'choice', points: 1000, explanation: `Because ${i}.`, question, options, correct };
    slides.push(slide(`q${i}`, `Question ${i + 1}`, game('question', { key: String(i), quiz })), slide(`a${i}`, `Answer ${i + 1}`, game('answer', { key: String(i) })));
  });
  slides.push(slide('outro', 'Outro'));
  return { title: 'Air', slides, width: 1920, height: 1080 };
}

const shown = shownDeck(deck());
const { steps } = stepsOf(shown);

const room = (over: Partial<RoomState> = {}): RoomState => ({
  ...emptyRoom(), connected: true, live: true, pin: '123456', joinUrl: 'http://10.0.0.5:8787/join.html', phase: 'running',
  players: [{ id: 1, name: 'Ana', score: 900, connected: true, away: false, manual: false, team: null }, { id: 2, name: 'Bo', score: 0, connected: true, away: false, manual: false, team: null }],
  ...over,
});
const ask = (i: number, over: Partial<RoomState> = {}) => room({ phase: 'question', question: { id: `q${i}`, slideId: `q${i}`, options: [], timeLimit: 20 }, ...over });
const at = (id: string) => steps.findIndex((s) => s.room.id === id);

test('steps: hidden slides are out, answers are reveals, and each step knows its slides', () => {
  assert.deepEqual(shown.slides.map((s) => s.id), ['intro', 'cover', 'q0', 'a0', 'q1', 'a1', 'outro']);
  assert.deepEqual(steps.map((s) => s.room.id), ['intro', 'cover', 'q0', 'q1', 'gm1:scores', 'outro']);
  const q0 = steps[at('q0')];
  assert.equal(shown.slides[q0.slide].id, 'q0');
  assert.equal(shown.slides[q0.answer!].id, 'a0', 'the answer slide is where the reveal goes');
  assert.equal(slideFor(q0, false), q0.slide);
  assert.equal(slideFor(q0, true), q0.answer);
  assert.equal(steps[at('intro')].answer, null);
});

test('steps: a game with no end slide gets a scores step, which stands on the game\'s last slide', () => {
  const s = steps.find((x) => x.room.results)!;
  assert.ok(s, 'there is a scores step');
  assert.equal(shown.slides[s.slide].id, 'a1');
});

test('wall: before Start it is the lobby, with the PIN, the address and the link the QR encodes', () => {
  const w = wallOf({ room: room({ phase: 'lobby' }), steps, at: -1, scoresOn: false, fallbackJoin: 'http://x/join.html' });
  assert.equal(w.view, 'lobby');
  assert.deepEqual(w.join, { address: '10.0.0.5:8787', pin: '123456', link: 'http://10.0.0.5:8787/join.html?pin=123456' });
  assert.deepEqual(w.players.map((p) => p.name), ['Ana', 'Bo']);
});

test('wall: no PIN yet is "connecting"; the relay\'s join address missing falls back to this page\'s', () => {
  assert.equal(wallOf({ room: { ...emptyRoom() }, steps, at: -1, scoresOn: false, fallbackJoin: 'http://x/join.html' }).view, 'connecting');
  const w = wallOf({ room: room({ phase: 'lobby', joinUrl: null }), steps, at: -1, scoresOn: false, fallbackJoin: 'https://sf.example/join.html' });
  assert.equal(w.join?.link, 'https://sf.example/join.html?pin=123456');
});

test('wall: a question being asked shows the answer count and the clock, not the answer', () => {
  const tally = { id: 'q0', rev: 1, counts: [1, 1, 0], answered: 2, sured: 0, total: 2, allIn: true, manual: false, answers: [] };
  const w = wallOf({ room: ask(0, { tally }), steps, at: at('q0'), scoresOn: false, fallbackJoin: '' });
  assert.equal(w.view, 'question');
  assert.equal(w.question!.answered, 2);
  assert.equal(w.question!.players, 2);
  assert.equal(w.question!.timeLimit, 20);
  assert.equal(w.question!.answer, '', 'the answer is not on the wall until the reveal');
  assert.deepEqual(w.question!.options.map((o) => o.correct), [false, false, false]);
  assert.deepEqual([w.question!.n, w.question!.total], [1, 2]);
});

test('wall: the reveal shows the tally per option, the right one marked, and counts the right answers', () => {
  const answers = [{ id: 1, name: 'Ana', team: null, response: 0, sure: null, elapsedMs: 900 }, { id: 2, name: 'Bo', team: null, response: 1, sure: null, elapsedMs: 1200 }];
  const tally = { id: 'q0', rev: 2, counts: null, answered: 2, sured: 0, total: 2, allIn: true, manual: false, answers };
  const w = wallOf({ room: ask(0, { tally, phase: 'revealed', revealed: ['q0'] }), steps, at: at('q0'), scoresOn: false, fallbackJoin: '' });
  assert.equal(w.view, 'reveal');
  assert.deepEqual(w.question!.options.map((o) => o.count), [1, 1, 0], 'counted off the answers when the relay sends no counts');
  assert.deepEqual(w.question!.options.map((o) => o.correct), [true, false, false]);
  assert.equal(w.question!.answer, 'Nitrogen');
  assert.equal(w.question!.right, 1);
  assert.equal(w.question!.explanation, 'Because 0.');
});

test('wall: the leaderboard is best first, ties share a rank, and the game\'s last one is the final one', () => {
  const r = room({ players: [
    { id: 1, name: 'Cy', score: 500, connected: true, away: false, manual: false, team: null },
    { id: 2, name: 'Ana', score: 900, connected: true, away: false, manual: false, team: null },
    { id: 3, name: 'Bo', score: 500, connected: false, away: false, manual: false, team: null },
  ], phase: 'idle' });
  const w = wallOf({ room: r, steps, at: at('gm1:scores'), scoresOn: false, fallbackJoin: '' });
  assert.equal(w.view, 'leaderboard');
  assert.equal(w.final, true);
  assert.deepEqual(w.board.map((x) => [x.rank, x.name, x.score]), [[1, 'Ana', 900], [2, 'Bo', 500], [2, 'Cy', 500]]);
  // The S key puts the scores over any step, between questions too.
  const mid = wallOf({ room: ask(0, { revealed: ['q0'], phase: 'revealed' }), steps, at: at('q0'), scoresOn: true, fallbackJoin: '' });
  assert.equal(mid.view, 'leaderboard');
  assert.equal(mid.final, false);
});

test('wall: a plain slide shows nothing over it; an ended room says so', () => {
  assert.equal(wallOf({ room: room({ phase: 'idle' }), steps, at: at('intro'), scoresOn: false, fallbackJoin: '' }).view, 'slide');
  assert.equal(wallOf({ room: room({ ended: true, live: false }), steps, at: 0, scoresOn: false, fallbackJoin: '' }).view, 'ended');
});

test('Next: waits for a player, then starts the room', () => {
  assert.equal(nextAction({ room: room({ phase: 'lobby', players: [] }), steps, at: -1, sinceAsked: 0 }), 'wait');
  assert.equal(nextAction({ room: room({ phase: 'lobby' }), steps, at: -1, sinceAsked: 0 }), 'start');
});

test('Next on a question: swallowed through the grace, then reveals, then advances; held asks; the last step ends', () => {
  const q = at('q0');
  assert.equal(nextAction({ room: ask(0), steps, at: q, sinceAsked: GRACE_MS - 1 }), 'wait');
  assert.equal(nextAction({ room: ask(0), steps, at: q, sinceAsked: GRACE_MS }), 'reveal');
  assert.equal(nextAction({ room: ask(0, { revealed: ['q0'], phase: 'revealed' }), steps, at: q, sinceAsked: 99999 }), 'advance');
  assert.equal(nextAction({ room: room({ phase: 'idle' }), steps, at: q, sinceAsked: 99999 }), 'ask', 'a question the room is not asking (held after a relay restart) is asked by Next');
  assert.equal(nextAction({ room: room({ phase: 'idle' }), steps, at: at('intro'), sinceAsked: 0 }), 'advance');
  assert.equal(nextAction({ room: room({ phase: 'idle' }), steps, at: steps.length - 1, sinceAsked: 0 }), 'end');
  assert.equal(nextAction({ room: room({ ended: true }), steps, at: 0, sinceAsked: 0 }), 'none');
});

test('join address and link: as classic builds them (js/live.js shortHost, joinLink)', () => {
  assert.equal(shortAddress('https://slideforge.onrender.com/join.html'), 'slideforge.onrender.com');
  assert.equal(joinLink('http://a/join.html', '042913'), 'http://a/join.html?pin=042913');
  assert.equal(joinLink('http://a/join.html?x=1', '1'), 'http://a/join.html?x=1&pin=1');
});

test('wall: a True or false statement shows two votes, the right one marked on the reveal, and steps like any question', () => {
  const tf = shownDeck({
    title: 'Claims', width: 1920, height: 1080,
    slides: [
      slide('c', 'Cover', game('cover', { id: 'gt', format: 'truefalse' })),
      slide('s0', 'S', game('question', { id: 'gt', format: 'truefalse', key: '0', quiz: { type: 'quiz', style: 'truefalse', input: 'choice', points: 1000, explanation: 'Plants have them too.', question: 'Only animals have mitochondria.', options: ['True', 'False'], correct: 1 } })),
      slide('sa', 'A', game('answer', { id: 'gt', format: 'truefalse', key: '0' })),
    ],
  });
  const st = stepsOf(tf).steps;
  const i = st.findIndex((s) => s.room.id === 's0');
  assert.equal(st[i].room.style, 'truefalse', 'the phones are told the style');
  const answers = [{ id: 1, name: 'Ana', team: null, response: 1, sure: null, elapsedMs: 900 }, { id: 2, name: 'Bo', team: null, response: 0, sure: null, elapsedMs: 1200 }, { id: 3, name: 'Cy', team: null, response: 1, sure: null, elapsedMs: 1500 }];
  const tally = { id: 's0', rev: 3, counts: null, answered: 3, sured: 0, total: 3, allIn: true, manual: false, answers };
  const open = wallOf({ room: room({ phase: 'question', question: { id: 's0', slideId: 's0', options: ['True', 'False'], timeLimit: 15 }, tally }), steps: st, at: i, scoresOn: false, fallbackJoin: '' });
  assert.equal(open.view, 'question');
  assert.equal(open.question!.style, 'truefalse');
  assert.deepEqual(open.question!.options.map((o) => [o.label, o.correct]), [['True', false], ['False', false]], 'the right one is not marked while it is open');
  const done = wallOf({ room: room({ phase: 'revealed', revealed: ['s0'], tally }), steps: st, at: i, scoresOn: false, fallbackJoin: '' });
  assert.equal(done.view, 'reveal');
  assert.deepEqual(done.question!.options.map((o) => [o.label, o.count, o.correct]), [['True', 1, false], ['False', 2, true]]);
  assert.equal(done.question!.right, 2);
  assert.equal(done.question!.answer, 'False');
  assert.equal(nextAction({ room: room({ phase: 'question', question: { id: 's0', slideId: 's0', options: [], timeLimit: 15 } }), steps: st, at: i, sinceAsked: GRACE_MS + 1 }), 'reveal');
});
