// Slider and the registry of room styles (lab-engine-plan M8). Fast, no browser, no relay:
//  - the registry: four styles, found by game format and by question (adding one is a file and a line);
//  - routing: a Slider game is hosted in the studio (Time traveler, another format on the same engine, is not);
//  - the question frame: input 'number' with the line's range, as classic sends it;
//  - marking by the tolerance, the reveal's answer and the teacher's number entry;
//  - the wall: the count while the question is open; on the reveal the line, the band and a marker per answer.
// The wire against the classic recording is in live-replay.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Slide } from '../src/core';
import { STYLES, emptyRoom, showFromDeck, styleForFormat, styleOf, type RoomState, type WallDetail } from '../src/live';
import { canHostInStudio } from '../src/show/canHost';
import { shownDeck, stepsOf } from '../src/show/steps';
import { wallOf } from '../src/show/wallModel';

const slide = (id: string, name: string, game?: Slide['game']) =>
  ({ id, name, background: '', layers: [], transition: { type: 'none', duration: 0 }, notes: '', game }) as unknown as Slide;
const game = (role: NonNullable<Slide['game']>['role'], extra: Partial<NonNullable<Slide['game']>> = {}) =>
  ({ id: 'gsl', format: 'slider', label: 'Estimate', role, settings: { seconds: 20, points: 1000 }, ...extra }) as NonNullable<Slide['game']>;

const quizOf = (extra: Record<string, unknown> = {}) => ({
  type: 'quiz', style: 'slider', input: 'number', correct: -1, points: 1000, question: 'In what year was the Web invented?',
  min: 1970, max: 2010, step: 1, target: 1989, tolerance: 3, unit: 'year', explanation: 'At CERN.', ...extra,
});
const sliderDeck = (extra: Slide[] = [], quiz: Record<string, unknown> = quizOf()) => ({
  title: 'Estimates',
  slides: [slide('cover', 'Cover', game('cover')), slide('q0', 'Q1', game('question', { key: '0', quiz })), slide('a0', 'A1', game('answer', { key: '0' })), ...extra],
});

test('the registry: four styles, found by format and by question; a question no style takes is not asked', () => {
  assert.deepEqual(STYLES.map((s) => s.key).slice(0, 4), ['choice', 'truefalse', 'type', 'slider']);
  assert.equal(styleForFormat('slider')?.key, 'slider');
  assert.equal(styleForFormat('time-traveler')?.name, 'Time traveler', 'Time traveler is its own entry on the same engine');
  assert.equal(styleOf({ style: 'slider', input: 'number' })?.name, 'Slider', 'without its format a slider question is a Slider');
  assert.equal(styleOf({ style: 'slider', input: 'number' })?.key, 'slider');
  assert.equal(styleOf({ style: 'truefalse', input: 'choice' })?.key, 'truefalse');
  assert.equal(styleOf({ style: 'zzz', input: 'zzz' }), undefined);
  for (const s of STYLES) assert.ok(s.name && s.formats.length && typeof s.mark === 'function' && typeof s.wall === 'function', s.key);
});

test('canHostInStudio: a Slider game is hosted, with the other styles; one the room does not run is not', () => {
  assert.deepEqual(canHostInStudio(sliderDeck()), { ok: true, reason: '' });
  const mc = slide('mq', 'MQ', { id: 'gmc', format: 'choice', label: 'Air', role: 'question', key: '0', settings: {}, quiz: { type: 'quiz', style: 'choice', input: 'choice', question: 'Q?', options: ['A', 'B'], correct: 0 } } as never);
  assert.equal(canHostInStudio(sliderDeck([mc])).ok, true);
  const tt = slide('tt', 'TT', { id: 'gtt', format: 'bingo', label: 'Timeline', role: 'question', key: '0', settings: {} } as never);
  assert.match(canHostInStudio(sliderDeck([tt])).reason, /"Timeline" is bingo, not Multiple choice, True or false/);
  assert.match(canHostInStudio(sliderDeck([], quizOf({ input: 'choice' }))).reason, /has a question that is not Slider/);
});

test('the show asks a Slider question as a number question with its range, no options and the answer said with its unit', () => {
  const { slides } = showFromDeck(sliderDeck());
  const s = slides.find((x) => x.activity === 'question')!;
  assert.equal(s.style, 'slider');
  const q = s.quiz!, style = styleOf(q)!;
  assert.equal(q.input, 'number');
  assert.deepEqual(q.options, []);
  assert.equal(q.correct, -1);
  assert.equal(q.answer, '1989 year');
  assert.equal(style.input, 'number');
  assert.deepEqual(style.range(q), { min: 1970, max: 2010, step: 1, unit: 'year' });
  assert.deepEqual(style.reveal(q), { correct: -1, answer: '1989 year' });
});

test('marking is by the tolerance, a number the teacher enters is a value, and nothing else is an answer', () => {
  const q = showFromDeck(sliderDeck()).slides.find((x) => x.activity === 'question')!.quiz!, style = styleOf(q)!;
  assert.deepEqual([1986, 1989, 1992, 1985, 1993, 2000].map((r) => style.mark(q, r)), [true, true, true, false, false, false]);
  assert.equal(style.mark(q, 'abc'), false);
  assert.equal(style.label(q, 1990), '1990 year');
  assert.deepEqual(style.manual({ value: 1990 }), { value: 1990 });
  assert.equal(style.manual({ value: Number.NaN }), undefined);
  assert.equal(style.manual({ text: '1990' }), undefined);
  assert.equal(styleOf({ style: 'choice', input: 'choice' })!.manual({ choice: 2 }), 2);
  assert.equal(styleOf({ style: 'type', input: 'text' })!.manual({ text: 'Paris' }), 'Paris');
});

const room = (over: Partial<RoomState> = {}): RoomState => ({
  ...emptyRoom(), connected: true, live: true, pin: '123456', joinUrl: 'http://10.0.0.5:8787/join.html', phase: 'running',
  players: [1, 2, 3, 4].map((id) => ({ id, name: `P${id}`, score: 0, connected: true, away: false, manual: false, team: null })),
  ...over,
});

test('wall: the count while the question is open; on the reveal the line, the band and a marker per answer', () => {
  const { steps } = stepsOf(shownDeck({ ...sliderDeck(), width: 1920, height: 1080 } as never));
  const at = steps.findIndex((s) => s.room.id === 'q0');
  const a = (id: number, response: number) => ({ id, name: `P${id}`, team: null, response, sure: null, elapsedMs: 500 });
  const answers = [a(1, 1990), a(2, 1980), a(3, 2000), a(4, 1990)];
  const tally = { id: 'q0', rev: 4, counts: [], answered: 4, sured: 0, total: 4, allIn: true, manual: false, answers };
  const input = { steps, at, scoresOn: false, fallbackJoin: '' };
  const open = wallOf({ ...input, room: room({ phase: 'question', question: { id: 'q0', slideId: 'q0', options: [], timeLimit: 20 }, tally: { ...tally, answered: 2, answers: answers.slice(0, 2) } }) });
  assert.equal(open.view, 'question');
  assert.equal(open.question!.answered, 2);
  assert.equal(open.question!.players, 4);
  assert.deepEqual(open.question!.detail, { kind: 'line', line: null }, 'the answers and the band are not drawn while it is open');
  assert.equal(open.question!.answer, '');

  const done = wallOf({ ...input, room: room({ phase: 'revealed', revealed: ['q0'], tally }) });
  assert.equal(done.view, 'reveal');
  assert.equal(done.question!.answer, '1989 year');
  assert.equal(done.question!.right, 2, 'two answers are inside 1989 ± 3');
  assert.equal(done.question!.explanation, 'At CERN.');
  const d = done.question!.detail;
  assert.equal(d.kind, 'line');
  const line = (d as Extract<WallDetail, { kind: 'line' }>).line!;
  assert.deepEqual([line.min, line.max, line.unit, line.band], [1970, 2010, 'year', '1989 ± 3 year']);
  assert.deepEqual([line.loPct, line.targetPct, line.hiPct], [40, 47.5, 55]);
  assert.deepEqual(line.marks.map((m) => [m.value, m.pct, m.row, m.right]), [[1980, 25, 0, false], [1990, 50, 0, true], [1990, 50, 1, true], [2000, 75, 0, false]], 'sorted, equal values stack, the right ones marked');
});
