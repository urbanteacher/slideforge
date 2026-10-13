// Boss battle in the studio's room (lab-engine-plan M8): fast, no browser, no relay. The wire against the classic recording is in
// live-replay.test.ts; here the boss's health from its own game's questions only (the fix classic had after a boss lesson with
// a quiz beside it gave the boss the quiz's HP too), the damage by difficulty, the Game panel's own say, the hit rules, and the wall.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Slide } from '../src/core';
import { emptyRoom, showFromDeck, styleFor, styleForFormat, type RoomState } from '../src/live';
import { Boss, damageOf } from '../src/live/mechanics';
import { canHostInStudio } from '../src/show/canHost';
import { shownDeck, stepsOf } from '../src/show/steps';
import { wallOf } from '../src/show/wallModel';

const slide = (id: string, name: string, game?: Slide['game']) =>
  ({ id, name, background: '', layers: [], transition: { type: 'none', duration: 0 }, notes: '', game }) as unknown as Slide;
const q = (question: string, style: string, extra: object = {}) => ({ type: 'quiz', style, input: 'choice', question, options: ['A', 'B', 'C'], correct: 1, points: 1000, explanation: '', ...extra });
const g = (id: string, format: string, role: string, key: string | null, quiz?: object, settings: object = {}) =>
  slide(`${id}-${key ?? role}`, `${id} ${key ?? role}`, { id, format, label: id, role, ...(key != null ? { key } : {}), settings, ...(quiz ? { quiz } : {}) } as never);
const bossGame = [
  g('boss', 'boss-battle', 'cover', null),
  g('boss', 'boss-battle', 'question', '0', q('Easy?', 'boss', { difficulty: 'easy', bossDamage: 1 })),
  g('boss', 'boss-battle', 'question', '1', q('Medium?', 'boss', { difficulty: 'medium', bossDamage: 2 })),
  g('boss', 'boss-battle', 'question', '2', q('Boss?', 'boss', { difficulty: 'boss', bossDamage: 5 })),
];
const quizGame = [g('quiz', 'choice', 'cover', null), g('quiz', 'choice', 'question', '0', q('Plain?', 'choice')), g('quiz', 'choice', 'question', '1', q('Plainer?', 'choice'))];

test('the boss has the HP of its own game\'s questions, not the whole lesson\'s', () => {
  assert.equal(styleForFormat('boss-battle')?.key, 'boss');
  assert.deepEqual(canHostInStudio({ slides: bossGame }), { ok: true, reason: '' });
  assert.equal(showFromDeck({ title: 'B', slides: bossGame }).bossHp, 8, 'easy 1 + medium 2 + boss 5');
  const both = showFromDeck({ title: 'B', slides: [...bossGame, ...quizGame] });
  assert.equal(both.mechanic, 'boss');
  assert.equal(both.bossHp, 8, 'a quiz beside the boss adds nothing to it');
  const quizFirst = showFromDeck({ title: 'B', slides: [...quizGame, ...bossGame] });
  assert.equal(quizFirst.mechanic, 'points', 'the lead game decides: a quiz first is no boss lesson');
  assert.equal(quizFirst.bossHp, undefined);
  // Questions that name no difficulty are medium: two HP each.
  const plain = showFromDeck({ title: 'B', slides: [g('boss', 'boss-battle', 'question', '0', q('A?', 'boss')), g('boss', 'boss-battle', 'question', '1', q('B?', 'boss'))] });
  assert.equal(plain.bossHp, 4);
});

test('a question\'s difficulty is its damage; the Game panel\'s difficulty and damage win over the question\'s', () => {
  const slides = [...bossGame];
  slides[1] = g('boss', 'boss-battle', 'question', '0', q('Easy?', 'boss', { difficulty: 'easy', bossDamage: 1 }), { difficulty: 'hard', damage: 3 });
  const asked = showFromDeck({ title: 'B', slides }).slides.filter((s) => s.quiz).map((s) => s.quiz!);
  assert.deepEqual(asked.map((x) => [x.difficulty, x.bossDamage]), [['hard', 3], ['medium', 2], ['boss', 5]]);
  assert.deepEqual(asked.map(damageOf), [3, 2, 5]);
  assert.equal(damageOf({ difficulty: 'easy' }), 1);
  assert.equal(damageOf({}), 2, 'two when nothing says');
  // A question with no difficulty is made medium, as its compile does.
  const bare = showFromDeck({ title: 'B', slides: [g('boss', 'boss-battle', 'question', '0', q('A?', 'boss'))] }).slides[0].quiz!;
  assert.deepEqual([bare.difficulty, bare.bossDamage], ['medium', 2]);
});

test('a right answer credits +1; the reveal says the option', () => {
  const quiz = showFromDeck({ title: 'B', slides: bossGame }).slides.find((s) => s.quiz)!.quiz!;
  const style = styleFor(quiz);
  assert.deepEqual(style.gains!(quiz, [{ id: 1, response: 1 }, { id: 2, response: 0 }]), [[1, 1], [2, 0]]);
  assert.deepEqual(style.reveal(quiz), { correct: 1, answer: 'B' });
});

test('the room hits when most of a team picked the right answer (any team will do), or most of an individual room did', () => {
  const quiz = showFromDeck({ title: 'B', slides: bossGame }).slides.find((s) => s.quiz)!.quiz!; // easy: 1 damage
  const a = (...r: number[]) => r.map((response) => ({ response }));
  const boss = new Boss(8);
  // Teams: Red tied, Blue's majority right.
  let r = boss.strike(quiz, 1, 'teams', [[0, 1, 1], [0, 2, 1], [0, 0, 0]], 1, []);
  assert.deepEqual([r.verdict.right, r.verdict.value, boss.hp], [true, 1, 7]);
  assert.equal(r.view.note, 'Hit! −1 · 7 / 8 HP left');
  assert.equal(r.view.attack, 'The attack: 1 of 2 teams agreed on the right answer');
  // Teams: every team tied or wrong.
  r = boss.strike(quiz, 2, 'teams', [[0, 1, 1], [2, 1, 0]], 1, []);
  assert.deepEqual([r.verdict.right, r.verdict.value, boss.hp], [false, 0, 7]);
  assert.equal(r.view.note, 'Miss — boss still at 7 / 8 HP');
  // Individual: a bare majority is needed, half is not.
  r = boss.strike(quiz, 3, 'individual', [], 1, a(1, 1, 0, 0));
  assert.equal(r.verdict.right, false);
  r = boss.strike(quiz, 4, 'individual', [], 1, a(1, 1, 0));
  assert.deepEqual([r.verdict.right, boss.hp, r.view.attack], [true, 6, 'The attack: 2 of 3 right (67%)']);
  assert.equal(boss.strike(quiz, 5, 'individual', [], -1, a(1, 1)).verdict.right, false, 'an open question has no option to be right');
  assert.equal(r.verdict.term, 'Q4 · easy · 6/8 HP left');
});

test('the boss does not go below nothing, the last blow is only the HP that was left, and the scores say how it ended', () => {
  const quiz = showFromDeck({ title: 'B', slides: bossGame }).slides.filter((s) => s.quiz)[2].quiz!; // boss: 5 damage
  const boss = new Boss(3);
  const r = boss.strike(quiz, 3, 'teams', [[0, 2, 0]], 1, []);
  assert.deepEqual([boss.hp, r.view.damage, r.view.prevHp, r.view.title], [0, 3, 3, 'Boss defeated!']);
  assert.equal(boss.strike(quiz, 4, 'teams', [[0, 2, 0]], 1, []).view.note, 'Boss already defeated');
  assert.equal(boss.result(), 'The room brought the boss down');
  assert.equal(new Boss(11).result(), 'Boss survived at 11 / 11 HP');
});

const room = (over: Partial<RoomState> = {}): RoomState => ({
  ...emptyRoom(), connected: true, live: true, pin: '123456', joinUrl: 'http://10.0.0.5:8787/join.html', phase: 'revealed', revealed: ['boss-0'],
  question: { id: 'boss-0', slideId: 'boss-0', options: ['A', 'B', 'C'], timeLimit: 0 }, ...over,
});

test('wall: the boss with its health bar and the blow beside the question', () => {
  const { steps } = stepsOf(shownDeck({ title: 'B', slides: bossGame, width: 1920, height: 1080 } as never));
  const at = steps.findIndex((s) => s.room.quiz);
  const boss = new Boss(8);
  const quiz = steps[at].room.quiz!;
  const { view } = boss.strike(quiz, 1, 'teams', [[0, 2, 0]], 1, []);
  const w = wallOf({ steps, at, scoresOn: false, fallbackJoin: '', room: room({ mech: { race: null, boss: view, drip: null } }) });
  assert.equal(w.view, 'reveal');
  assert.deepEqual([w.mech.boss?.hp, w.mech.boss?.max, w.mech.boss?.damage, w.mech.boss?.note], [7, 8, 1, 'Hit! −1 · 7 / 8 HP left']);
});
