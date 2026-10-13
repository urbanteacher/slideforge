// Horse race in the studio's room (lab-engine-plan M8): fast, no browser, no relay. The wire against the classic recording is in
// live-replay.test.ts; here the track itself: the lead game makes the room a race, a team moves only when most of its members
// agree on the right answer, an individual race follows the players' own right answers, the first past the post is told, and
// the wall draws the lanes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Slide } from '../src/core';
import { emptyRoom, showFromDeck, styleForFormat, type PlayerRow, type RoomState } from '../src/live';
import { Race, trackLengthOf } from '../src/live/mechanics';
import { canHostInStudio } from '../src/show/canHost';
import { shownDeck, stepsOf } from '../src/show/steps';
import { wallOf } from '../src/show/wallModel';

const slide = (id: string, name: string, game?: Slide['game']) =>
  ({ id, name, background: '', layers: [], transition: { type: 'none', duration: 0 }, notes: '', game }) as unknown as Slide;
const quiz = (question: string, style = 'race') => ({ type: 'quiz', style, input: 'choice', question, options: ['A', 'B', 'C'], correct: 1, points: 1000, explanation: '' });
const deck = (settings: object = {}) => ({ title: 'Race', slides: [
  slide('c', 'Cover', { id: 'g', format: 'horse-race', label: 'Horse race', role: 'cover', settings } as never),
  slide('q0', 'Q0', { id: 'g', format: 'horse-race', label: 'Horse race', role: 'question', key: '0', settings, quiz: quiz('One?') } as never),
  slide('q1', 'Q1', { id: 'g', format: 'horse-race', label: 'Horse race', role: 'question', key: '1', settings, quiz: quiz('Two?') } as never),
] });

const player = (id: number, name: string, correct = 0, team: number | null = null): PlayerRow => ({ id, name, score: 0, connected: true, away: false, manual: false, team, correct });

test('the lead game makes the room a race: the registry takes it, every question takes part, the track is 3 to 12 steps', () => {
  assert.equal(styleForFormat('horse-race')?.key, 'race');
  assert.deepEqual(canHostInStudio(deck()), { ok: true, reason: '' });
  const show = showFromDeck(deck());
  assert.equal(show.mechanic, 'race');
  assert.equal(show.trackLength, 5, 'five steps when the game does not say');
  assert.equal(show.slides[0].style, 'race', 'the phones wear the race skin on every step');
  assert.equal(showFromDeck(deck({ trackLength: 99 })).trackLength, 12);
  assert.equal(showFromDeck(deck({ trackLength: 1 })).trackLength, 3);
  assert.equal(trackLengthOf(undefined), 5);
  // A lesson led by a plain quiz is not a race, whatever follows.
  const quizFirst = { title: 'Mixed', slides: [slide('q', 'Q', { id: 'a', format: 'choice', label: 'Quiz', role: 'question', key: '0', settings: {}, quiz: quiz('?', 'choice') } as never), ...deck().slides] };
  assert.equal(showFromDeck(quizFirst as never).mechanic, 'points');
});

test('a team moves when most of its members picked the right answer; a tie, a wrong majority or nobody answering does not', () => {
  const race = new Race(5);
  const teams = ['Red', 'Blue', 'Green', 'Yellow'];
  // Red: 2 of 3 right. Blue: tied 1-1 between right and wrong. Green: wrong majority. Yellow: nobody answered.
  const moved = race.advance('teams', teams, [], [[0, 2, 1], [0, 1, 1], [2, 0, 0], [0, 0, 0]], 1);
  assert.deepEqual(moved, ['t0']);
  assert.deepEqual(race.lanes('teams', teams, []).map((l) => [l.key, l.pos]), [['t0', 1], ['t1', 0], ['t2', 0], ['t3', 0]], 'leaders first, ties in the room\'s order');
  const view = race.view('teams', teams, [], moved);
  assert.equal(view.note, '1 team moves up');
  assert.equal(race.view('teams', teams, [], []).note, 'Nobody moved — nothing scored that round');
});

test('the first past the post is told; a lane already home stays home', () => {
  const race = new Race(3);
  const teams = ['Red', 'Blue'];
  for (let i = 0; i < 5; i++) race.advance('teams', teams, [], [[0, 1, 0], [0, 0, 1]], 1);
  const v = race.view('teams', teams, [], []);
  assert.equal(v.title, 'Photo finish!');
  assert.equal(v.note, 'Red is past the post');
  assert.deepEqual(v.lanes.map((l) => l.pos), [3, 0], 'a lane is not carried past the finish');
  assert.equal(race.result('teams', teams, []).note, 'Red is past the post');
  assert.equal(new Race(5).result('teams', teams, []).note, 'Red finishes furthest along', 'nobody finished: the furthest along, the first lane on a tie');
});

test('an individual race follows the players\' own right answers, from the player list the relay sends after the reveal', () => {
  const race = new Race(5);
  const players = [player(1, 'Ada', 0), player(2, 'Bo', 0)];
  assert.equal(race.stale('individual', players), false);
  const later = [player(1, 'Ada', 1), player(2, 'Bo', 0)];
  assert.equal(race.stale('individual', later), true, 'Ada is ahead of her lane');
  assert.deepEqual(race.advance('individual', [], later, [], -1), ['p1']);
  assert.equal(race.stale('individual', later), false);
  assert.deepEqual(race.view('individual', [], later, ['p1']).note, '1 runner moves up');
  assert.equal(race.stale('teams', later), false, 'a teams race does not read the players\' counts');
});

const room = (over: Partial<RoomState> = {}): RoomState => ({
  ...emptyRoom(), connected: true, live: true, pin: '123456', joinUrl: 'http://10.0.0.5:8787/join.html', phase: 'question', question: { id: 'q0', slideId: 'q0', options: ['A', 'B', 'C'], timeLimit: 0 },
  mode: 'teams', teams: ['Red', 'Blue'], players: [player(1, 'Ada', 0, 0), player(2, 'Bo', 0, 1)], ...over,
});

test('wall: the track is beside the question, and on the scores', () => {
  const { steps, show } = stepsOf(shownDeck({ ...deck(), width: 1920, height: 1080 } as never));
  const at = steps.findIndex((s) => s.room.id === 'q0');
  const race = new Race(show.trackLength!);
  race.advance('teams', ['Red', 'Blue'], [], [[0, 1, 0], [0, 0, 1]], 1);
  const view = race.view('teams', ['Red', 'Blue'], [], ['t0']);
  const w = wallOf({ steps, at, scoresOn: false, fallbackJoin: '', room: room({ mech: { race: view, boss: null, drip: null } }) });
  assert.equal(w.view, 'question');
  assert.deepEqual(w.mech.race?.lanes.map((l) => [l.name, l.pos, l.moved]), [['Red', 1, true], ['Blue', 0, false]]);
  const last = wallOf({ steps, at: steps.length - 1, scoresOn: false, fallbackJoin: '', room: room({ question: null, mech: { race: view, boss: null, drip: null } }) });
  assert.equal(last.view, 'leaderboard');
  assert.equal(last.mech.race?.length, 5);
});
