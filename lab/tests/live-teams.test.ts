// Teams and rosters (lab-engine-plan M11b): how a lesson plays, the roster a teacher pastes, the team standings, what the
// host tells the relay, and what the wall and rail show in a teams room. Fast, no browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Slide } from '../src/core';
import { LiveHost, emptyRoom, normalizeTeams, parseRoster, roomPlay, showFromDeck, teamBoardOf, type HostMessage, type PlayerRow, type RoomState, type SocketLike } from '../src/live';
import { railOf } from '../src/show/rail';
import { shownDeck, stepsOf } from '../src/show/steps';
import { wallOf } from '../src/show/wallModel';

const player = (id: number, name: string, team: number | null, score = 0): PlayerRow => ({ id, name, score, connected: true, away: false, manual: false, team });
const room = (extra: Partial<RoomState> = {}): RoomState => ({ ...emptyRoom(), live: true, connected: true, pin: '123456', joinUrl: 'https://x.test/join.html', phase: 'lobby', ...extra });

test('team names are trimmed, cut, unique and at most six', () => {
  assert.deepEqual(normalizeTeams(['  Red ', 'red', 'Blue', '', 'x'.repeat(30)]), ['Red', 'Blue', 'x'.repeat(20)]);
  assert.deepEqual(normalizeTeams('A, B\nC'), ['A', 'B', 'C']);
  assert.equal(normalizeTeams(['1', '2', '3', '4', '5', '6', '7']).length, 6);
});

test('a room plays in teams only with two names; an individual room still carries the default four', () => {
  assert.deepEqual(roomPlay({ mode: 'teams', teams: ['Owls', 'Foxes'] }), { mode: 'teams', teams: ['Owls', 'Foxes'] });
  assert.deepEqual(roomPlay({ mode: 'teams', teams: ['Owls'] }), { mode: 'individual', teams: ['Red', 'Blue', 'Green', 'Yellow'] });
  assert.deepEqual(roomPlay({ mode: 'teams' }), { mode: 'teams', teams: ['Red', 'Blue', 'Green', 'Yellow'] });
  assert.deepEqual(roomPlay(undefined), { mode: 'individual', teams: ['Red', 'Blue', 'Green', 'Yellow'] });
});

test('a pasted roster: a name a line, numbers dropped, repeats and names already in the room left out', () => {
  const r = parseRoster('1. Ada Lovelace\r\n2) Grace Hopper\n\n  ada lovelace \nAlan\n' + 'z'.repeat(40), ['Alan']);
  assert.deepEqual(r.names, ['Ada Lovelace', 'Grace Hopper', 'z'.repeat(24)]);
  assert.equal(r.skipped, 2);
  assert.equal(parseRoster('').names.length, 0);
});

test('team standings: the relay\'s rows when it sends them, else the members\' average; ties share a rank', () => {
  const players = [player(1, 'a', 0, 900), player(2, 'b', 0, 500), player(3, 'c', 1, 700), player(4, 'd', null, 0)];
  const fallback = teamBoardOf({ mode: 'teams', teams: ['Owls', 'Foxes'], players, rows: [] })!;
  assert.deepEqual(fallback.map((t) => [t.name, t.score, t.members, t.rank]), [['Owls', 700, 2, 1], ['Foxes', 700, 1, 1]]);
  const sent = teamBoardOf({ mode: 'teams', teams: ['Owls', 'Foxes'], players, rows: [{ key: 't0', name: 'Owls', ci: 0, score: 640 }, { key: 't1', name: 'Foxes', ci: 1, score: 710 }] })!;
  assert.deepEqual(sent.map((t) => [t.name, t.score, t.rank]), [['Foxes', 710, 1], ['Owls', 640, 2]]);
  assert.deepEqual(sent[1].names, ['a', 'b']);
  assert.equal(teamBoardOf({ mode: 'individual', teams: ['A', 'B'], players, rows: [] }), null);
});

const slide = (id: string, name: string, game?: Slide['game']) => ({ id, name, background: '', layers: [], transition: { type: 'none', duration: 0 }, notes: '', game }) as unknown as Slide;
const quizDeck = (settings: Record<string, unknown>) => {
  const quiz = { type: 'quiz', style: 'choice', input: 'choice', points: 1000, explanation: '', question: 'Q?', options: ['a', 'b'], correct: 0 };
  return { title: 'T', width: 1920, height: 1080, slides: [slide('q0', 'Q', { id: 'g', format: 'choice', label: 'G', role: 'question', key: '0', settings, quiz })] };
};

test('the show carries how the room plays, from the first game\'s settings', () => {
  const s = showFromDeck(quizDeck({ mode: 'teams', teams: ['Owls', 'Foxes'] }));
  assert.deepEqual([s.mode, s.teams], ['teams', ['Owls', 'Foxes']]);
  assert.equal(showFromDeck(quizDeck({})).mode, 'individual');
});

class Fake implements SocketLike {
  readyState = 0;
  sent: HostMessage[] = [];
  private fns: Record<string, ((ev: { data?: unknown }) => void)[]> = {};
  constructor() { queueMicrotask(() => { this.readyState = 1; this.fire('open'); }); }
  addEventListener(type: string, fn: (ev: { data?: unknown }) => void) { (this.fns[type] ??= []).push(fn); }
  send(data: string) { this.sent.push(JSON.parse(data) as HostMessage); }
  close() { this.readyState = 3; this.fire('close'); }
  private fire(type: string) { for (const f of this.fns[type] ?? []) f({}); }
}

test('the host opens a teams room with the team names, and adds a pasted roster to a team', async () => {
  const socks: Fake[] = [];
  const host = new LiveHost({ url: 'ws://x', show: showFromDeck(quizDeck({ mode: 'teams', teams: ['Owls', 'Foxes'] })), makeSocket: () => { const f = new Fake(); socks.push(f); return f; } });
  void host.start();
  await new Promise((r) => setTimeout(r, 5));
  assert.deepEqual(socks[0].sent[0], { t: 'host', title: 'T', mode: 'teams', teams: [{ name: 'Owls' }, { name: 'Foxes' }] });
  host.manualAdd(['Ada', 'Alan'], 1);
  assert.deepEqual(socks[0].sent.at(-1), { t: 'manualAdd', names: ['Ada', 'Alan'], team: 1 });
  await host.end();
});

test('the wall in a teams room: the lobby lists teams with their members; the rail shows the teams with their gains', () => {
  const { steps } = stepsOf(shownDeck(quizDeck({ mode: 'teams', teams: ['Owls', 'Foxes'] })));
  const players = [player(1, 'Ada', 0, 600), player(2, 'Alan', 1, 300)];
  const lobby = wallOf({ room: room({ mode: 'teams', teams: ['Owls', 'Foxes'], players }), steps, at: -1, scoresOn: false, fallbackJoin: '' });
  assert.equal(lobby.view, 'lobby');
  assert.deepEqual(lobby.teams!.map((t) => [t.name, t.members]), [['Owls', 1], ['Foxes', 1]]);
  assert.equal(wallOf({ room: room({ players }), steps, at: -1, scoresOn: false, fallbackJoin: '' }).teams, null);
  const rows = [{ key: 't0', name: 'Owls', ci: 0, score: 600 }, { key: 't1', name: 'Foxes', ci: 1, score: 300 }];
  const rail = railOf({ board: [], teams: teamBoardOf({ mode: 'teams', teams: ['Owls', 'Foxes'], players, rows }), teamBefore: { 0: 400, 1: 300 }, before: {}, revealed: true, join: null })!;
  assert.deepEqual(rail.rows.map((r) => [r.name, r.score, r.gained]), [['Owls', 600, 200], ['Foxes', 300, 0]]);
  assert.equal(rail.scoreLabel, 'Team points');
});
