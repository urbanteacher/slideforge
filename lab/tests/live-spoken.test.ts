// The spoken games in the studio's room (lab-engine-plan M8): fast, no browser, no relay. The wire against the classic recordings is
// in live-replay-spoken.test.ts; here the rules the replay cannot see: what is credited and to whom, the verdict held until the
// teacher says who spoke, a question closed by Next without a verdict, the cube's own faces, and the wall's view.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Slide } from '../src/core';
import { LiveHost, showFromDeck, styleFor, styleForFormat, type HostMessage, type SocketLike } from '../src/live';
import { creditFor, pickRecipient, ROOM, verdictScores, type SpokenSpec } from '../src/live/spoken';
import { canHostInStudio } from '../src/show/canHost';
import { shownDeck, stepsOf } from '../src/show/steps';
import { wallOf } from '../src/show/wallModel';

const slide = (id: string, name: string, game?: Slide['game']) =>
  ({ id, name, background: '', layers: [], transition: { type: 'none', duration: 0 }, notes: '', game }) as unknown as Slide;
const deckOf = (format: string, quizzes: object[], settings: object = {}) => ({ title: 'Spoken', slides: [
  slide('c', 'Cover', { id: 'g', format, label: 'Spoken', role: 'cover', settings } as never),
  ...quizzes.map((quiz, i) => slide(`q${i}`, `Q${i}`, { id: 'g', format, label: 'Spoken', role: 'question', key: String(i), settings, quiz } as never)),
] });
const quiz = (style: string, extra: object = {}) => ({ type: 'quiz', style, input: 'choice', question: 'Say it', options: ['x'], correct: 0, points: 0, explanation: 'why', ...extra });

class Fake implements SocketLike {
  readyState = 0;
  sent: HostMessage[] = [];
  private fns: Record<string, ((ev: { data?: unknown }) => void)[]> = {};
  constructor() { queueMicrotask(() => { this.readyState = 1; this.fire('open'); }); }
  addEventListener(type: string, fn: (ev: { data?: unknown }) => void) { (this.fns[type] ??= []).push(fn); }
  send(data: string) { this.sent.push(JSON.parse(data) as HostMessage); }
  close() { this.readyState = 3; this.fire('close'); }
  feed(m: unknown) { this.fire('message', JSON.stringify(m)); }
  private fire(type: string, data?: unknown) { for (const f of this.fns[type] ?? []) f({ data }); }
}

/** A room opened on a fake relay with two phones in it, the show begun and on its first question. */
async function room(d: ReturnType<typeof deckOf>, mode: 'individual' | 'teams' = 'individual') {
  const sock = new Fake();
  const { show, steps } = stepsOf(shownDeck(d));
  const host = new LiveHost({ url: 'ws://fake', show: { ...show, mode, teams: ['Red', 'Blue'] }, makeSocket: () => sock });
  host.start();
  await new Promise((r) => setTimeout(r, 0));
  sock.feed({ t: 'hosted', session: { id: 's', title: 'S', createdAt: 0 }, hostToken: 'h', pin: '123456', joinUrl: 'http://x/join.html', mode, teams: ['Red', 'Blue'] });
  sock.feed({ t: 'players', pin: '123456', joinUrl: 'http://x/join.html', joinOpen: true, waiting: 0, round: 0, mode, rows: [], counts: null, list: [
    { id: 1, name: 'Ada', score: 0, connected: true, away: false, manual: false, team: mode === 'teams' ? 0 : null },
    { id: 2, name: 'Bo', score: 0, connected: true, away: false, manual: false, team: mode === 'teams' ? 1 : null }] });
  host.begin();
  host.next(); // the first question
  const sent = (t: string) => sock.sent.filter((f) => f.t === t) as Record<string, unknown>[];
  const relayTook = (id: string) => { sock.feed({ t: 'teamAnswers', correct: 0, counts: [] }); sock.feed({ t: 'players', pin: '123456', joinUrl: 'http://x/join.html', joinOpen: false, waiting: 0, round: 1, mode, rows: [], counts: null, list: host.state.players }); return id; };
  const wall = (at = 1) => wallOf({ room: host.state, steps, at, scoresOn: false, fallbackJoin: '' });
  return { host, sock, show, sent, relayTook, wall };
}

test('the registry takes Random challenge and Question cube by format, on one engine; the room hosts them; their verdicts are the engine\'s', () => {
  assert.equal(styleForFormat('random-challenge')?.key, 'randomchallenge');
  assert.equal(styleForFormat('question-cube')?.key, 'randomchallenge');
  for (const format of ['random-challenge', 'question-cube']) assert.deepEqual(canHostInStudio(deckOf(format, [quiz('randomchallenge', { format })])), { ok: true, reason: '' });
  const q = (format: string, extra: object = {}) => showFromDeck(deckOf(format, [quiz('randomchallenge', { format, ...extra })])).slides.find((s) => s.quiz)!.quiz!;
  assert.deepEqual([q('random-challenge').options, q('question-cube').options], [['Complete', 'Skip'], ['Answered', 'Pass']]);
  assert.equal(q('random-challenge', { confidence: undefined }).confidence, false, 'nothing is answered on a phone, so no "how sure"');
  assert.equal(q('random-challenge', { challenge: 'Do the thing', question: 'old' }).question, 'Do the thing', 'the challenge is the question');
  assert.deepEqual(styleFor(q('question-cube')).spoken, { accepts: [0], scores: false, counts: 'completed' });
  assert.equal(styleFor(q('question-cube')).scoreSlide, false);
});

test('what a verdict credits: a team (teams room) or the named player (when the game scores spoken), never the room, never a pass', () => {
  const players = [{ id: 1, name: 'Ada', score: 0, connected: true, away: false, manual: false, team: 1 }];
  const spin: SpokenSpec = { accepts: [0, 1], half: 1, scores: true, counts: 'explained' };
  const ctx = (recipient: Parameters<typeof creditFor>[3]['recipient'], mode: string, scoreSpoken = false) => ({ recipient, players, teams: ['Red', 'Blue'], mode, scoreSpoken });
  assert.equal(verdictScores(spin, 0, 'teams', false), true);
  assert.equal(verdictScores(spin, 0, 'individual', false), false, 'an individual room scores spoken only when asked');
  assert.equal(verdictScores(spin, 0, 'individual', true), true);
  assert.equal(verdictScores(spin, 2, 'teams', true), false, 'a reject scores nothing');
  assert.equal(verdictScores({ accepts: [0], scores: false, counts: 'completed' }, 0, 'teams', true), false, 'Random challenge only counts');
  assert.deepEqual(creditFor('s', spin, 0, ctx({ type: 'player', id: 1 }, 'teams')), { slideId: 's', accepted: true, who: 'Blue', points: 1000, line: 'Blue +1000' });
  assert.equal(creditFor('s', spin, 1, ctx({ type: 'team', id: 0 }, 'teams')).points, 500, 'with a hint, half');
  assert.deepEqual(creditFor('s', spin, 0, ctx({ type: 'player', id: 1 }, 'individual')), { slideId: 's', accepted: true, who: 'Ada', points: 0, line: 'Ada' });
  assert.equal(creditFor('s', spin, 2, ctx({ type: 'player', id: 1 }, 'teams')).line, '', 'a reject names nobody');
  assert.deepEqual(pickRecipient({ type: 'team', id: 1 }, players, ['Red', 'Blue'], 'individual'), ROOM, 'no teams in an individual room');
  assert.deepEqual(pickRecipient({ type: 'player', id: 9 }, players, ['Red', 'Blue'], 'teams'), ROOM, 'a player who is not in the room is the room');
});

test('a verdict reveals the question as correct, naming who spoke; the speaker is cleared for the next item; the relay\'s count reaches the wall', async () => {
  const two = deckOf('random-challenge', [quiz('randomchallenge', { options: ['Complete', 'Skip'] }), quiz('randomchallenge', { options: ['Complete', 'Skip'], question: 'Two' })]);
  const { host, sock, sent, relayTook, wall } = await room(two);
  const q = host.slide!.quiz!;
  assert.equal(sent('question')[0].spoken, true);
  host.recipient({ type: 'player', id: 2 });
  assert.deepEqual(host.state.spoken.recipient, { type: 'player', id: 2 });
  assert.equal(host.verdict(0), true);
  assert.deepEqual([sent('reveal')[0].correct, sent('reveal')[0].answer, sent('reveal')[0].gains, sent('reveal')[0].spoken], [0, 'Complete', [], { recipient: { type: 'player', id: 2 } }]);
  assert.deepEqual(host.state.spoken.recipient, { type: 'room' }, 'cleared after the reveal');
  assert.equal(host.verdict(1), false, 'one verdict a question');
  relayTook(q.id);
  sock.feed({ t: 'oralCount', gameId: q.gameId, slideId: q.id, kind: 'randomchallenge', count: 1, accepted: true });
  const w = wall();
  assert.equal(w.view, 'reveal');
  const d = w.question!.detail;
  assert.equal(d.kind, 'spoken');
  if (d.kind === 'spoken') assert.deepEqual([d.spoken.given, d.spoken.count, d.spoken.counts], [0, 1, 'completed']);
});

test('a question closed by Next, or its clock, without a verdict takes the last option and names nobody it was not given to; the wall says it closed', async () => {
  const { host, sent } = await room(deckOf('question-cube', [quiz('randomchallenge', { format: 'question-cube', category: 'Why' })]));
  host.reveal();
  const r = sent('reveal')[0];
  assert.deepEqual([r.correct, r.answer, r.spoken], [1, 'Pass', { recipient: { type: 'room' } }]);
  assert.equal(host.state.spoken.verdicts[host.slide!.quiz!.id], undefined);
});

test('the cube names its face (the question\'s category) on the wall; Random challenge does not', async () => {
  const faceOf = async (format: string) => {
    const { wall } = await room(deckOf(format, [quiz('randomchallenge', { format, category: 'Why' })]));
    const d = wall().question!.detail;
    return d.kind === 'spoken' ? d.spoken : null;
  };
  const cube = await faceOf('question-cube');
  assert.equal(cube?.face, 'Why');
  assert.deepEqual(cube?.verdicts.map((v) => v.label), ['Answered', 'Pass']);
  assert.equal((await faceOf('random-challenge'))?.face, '');
});

const spinQuiz = (extra: object = {}) => quiz('spinexplain', { options: ['Clear', 'With hint', 'Reject'], term: 'Diffusion', question: 'Diffusion', hint: 'Particles', ...extra });

test('Spin and explain: in a teams room a verdict that scores is held until the teacher says who spoke, and the speaker completes it', async () => {
  const { host, sent, wall } = await room(deckOf('spin-explain', [spinQuiz()]), 'teams');
  assert.equal(host.verdict(1), true, 'With hint: accepted, so it would score');
  assert.equal(sent('reveal').length, 0, 'held: nothing is revealed yet');
  assert.deepEqual(host.state.spoken.pending, { slideId: host.slide!.quiz!.id, choice: 1 });
  const held = wall().question!.detail;
  assert.equal(held.kind === 'spoken' && held.spoken.held, 'With hint');
  host.recipient({ type: 'player', id: 2 }); // Bo, who is on Blue
  const r = sent('reveal')[0];
  assert.deepEqual([r.correct, r.answer, r.gains, r.spoken], [1, 'With hint', [], { recipient: { type: 'player', id: 2 } }]);
  assert.equal(host.state.spoken.pending, null);
  assert.deepEqual(host.state.spoken.credit, { slideId: host.slide!.quiz!.id, accepted: true, who: 'Blue', points: 500, line: 'Blue +500' }, 'half credit, to the speaker\'s team');
  assert.deepEqual(host.state.spoken.recent, [2]);
});

test('Spin and explain: counting a held verdict for the room lands it with no points; a Reject is never held; a held verdict belongs to its item', async () => {
  const two = deckOf('spin-explain', [spinQuiz(), spinQuiz({ question: 'Osmosis', term: 'Osmosis' })]);
  const a = await room(two, 'teams');
  a.host.verdict(0);
  a.host.verdictRoom();
  assert.deepEqual([a.sent('reveal')[0].correct, a.sent('reveal')[0].spoken], [0, { recipient: { type: 'room' } }]);
  assert.equal(a.host.state.spoken.credit?.points, 0);
  const b = await room(two, 'teams');
  b.host.verdict(2);
  assert.deepEqual([b.sent('reveal')[0].correct, b.host.state.spoken.credit?.line], [2, ''], 'Reject lands at once and names nobody');
  const c = await room(two, 'teams');
  c.host.verdict(0);
  assert.ok(c.host.state.spoken.pending);
  c.host.next(); // closes the held item without a verdict
  c.host.next();
  assert.equal(c.host.state.spoken.pending, null, 'the next item has no held verdict');
});
