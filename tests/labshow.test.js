'use strict';
/* A lab lesson's games in the live room (src/deck/labshow.js).
 *
 * The lab's game slides carry what SlideForge needs to play them; the show turns a question into
 * SlideForge's quiz slide under the lab's drawing, folds its answer slide into the reveal, and plays
 * a board on SlideForge's own board. These pin that: what the room is asked, what it is not, and
 * that nothing the lab drew is lost or asked twice.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');

function load() {
  const data = {};
  const c = { window: {}, console,
    localStorage: { getItem: k => data[k] || null, setItem: (k, v) => data[k] = String(v), removeItem: k => delete data[k] } };
  vm.createContext(c);
  vm.runInContext(fs.readFileSync(path.join(root, 'js', 'model.js'), 'utf8'), c);
  return c.window.SF;
}
const SF = load();

const still = (id, game) => ({ id, image: 'data:image/jpeg;base64,x', notes: id + ' notes', hidden: false, name: id, game });
const quiz = { type: 'quiz', question: 'Which gas do plants take in?', options: ['Oxygen', 'Carbon dioxide'], correct: 1, style: 'choice', input: 'choice', timeLimit: 20, points: 1000 };

test('a question plays as SlideForge’s quiz, under the lab’s drawing, its answer as the reveal', () => {
  const g = (role, key, extra = {}) => ({ id: 'g1', format: 'choice', label: 'Multiple choice', role, key, settings: { seconds: 15, points: 500 }, ...extra });
  const out = SF.labShowSlides([
    still('intro', null),
    still('cover', g('cover')),
    still('q0', g('question', '0', { quiz })),
    still('a0', g('answer', '0')),
    still('after', null),
  ]);
  assert.deepEqual(Array.from(out, x => x.id), ['intro', 'cover', 'q0', 'after'], 'the answer is not a step of its own');
  const q = out[2].sf;
  assert.equal(q.type, 'quiz');
  assert.equal(q.question, quiz.question);
  assert.equal(q.correct, 1);
  assert.equal(q.timeLimit, 15, 'the Game panel’s time wins over the question’s own');
  assert.equal(q.points, 500);
  assert.equal(q.gameId, 'g1');
  assert.equal(q.design.labStill, true, 'the lab draws over it');
  assert.equal(q.design.labReveal, 'a0', 'and draws its answer slide when revealed');
  assert.equal(q.notes, 'q0 notes');
  assert.ok(!out[0].sf && !out[1].sf && !out[3].sf, 'everything else stays a picture');
});

test('no time in the Game panel means no clock, whatever the question had', () => {
  const out = SF.labShowSlides([still('q', { id: 'g', format: 'choice', label: 'x', role: 'question', key: '0', settings: {}, quiz })]);
  assert.equal(out[0].sf.timeLimit, 0);
});

test('a question read before it is asked keeps both drawings: the reading, then the recall', () => {
  const g = (role, extra = {}) => ({ id: 'd', format: 'definition-challenge', label: 'Definition challenge', role, key: '0', settings: { seconds: 30 }, ...extra });
  const def = { ...quiz, style: 'definition', input: 'text', passage: 'A catalyst…', answer: 'the catalyst' };
  const out = SF.labShowSlides([still('read', g('question', { quiz: def })), still('ask', g('question', { quiz: def })), still('ans', g('answer'))]);
  assert.deepEqual(Array.from(out, x => x.id), ['read'], 'asked once, not twice');
  assert.equal(out[0].sf.design.labAsk, 'ask');
  assert.equal(out[0].sf.design.labReveal, 'ans');
});

test('a board plays on SlideForge’s own board: the lab’s cover, then the board, the rest stood down', () => {
  const board = { type: 'content', title: 'Quiz bowl', bowlBoard: { categories: ['Cells'], values: [100], cells: [] } };
  const g = (role, key, extra = {}) => ({ id: 'b', format: 'quiz-bowl', label: 'Quiz bowl', role, key, settings: {}, ...extra });
  const out = SF.labShowSlides([
    still('cover', g('cover')),
    still('board', g('board', undefined, { board: [board] })),
    still('cell0', g('question', '0')),
    still('cell0a', g('answer', '0')),
  ]);
  assert.deepEqual(Array.from(out, x => x.id), ['cover', 'board']);
  assert.equal(out[1].sf.length, 1);
  assert.equal(out[1].sf[0].id, 'board');
  assert.ok(out[1].sf[0].bowlBoard, 'SlideForge’s board, as it compiles it');
  assert.ok(!(out[1].sf[0].design && out[1].sf[0].design.labStill), 'drawn by SlideForge, not under the lab');
});

test('a round played in one go gives each of its questions an id of its own, and the round its clock', () => {
  const qs = [0, 1, 2].map(k => ({ ...quiz, style: 'speed', roundSeconds: 60, question: 'Q' + k }));
  const out = SF.labShowSlides([still('sprint', { id: 's', format: 'beat-the-clock', label: 'Beat the clock', role: 'board', settings: { seconds: 45 }, board: qs })]);
  const ids = out[0].sf.map(s => s.id);
  assert.equal(new Set(ids).size, 3);
  assert.ok(out[0].sf.every(s => s.roundSeconds === 45 && s.gameId === 's'));
});

test('Word reveal plays on SlideForge’s wall, where its letters drip on the clock the phones are scored by', () => {
  const out = SF.labShowSlides([still('w', { id: 'w', format: 'word-reveal', label: 'Word reveal', role: 'question', key: '0', settings: {}, quiz: { ...quiz, style: 'wordreveal', input: 'text' } })]);
  assert.equal(out[0].sf.type, 'quiz');
  assert.ok(!(out[0].sf.design && out[0].sf.design.labStill));
});

test('a question with nothing to ask (a board slide, an end) stays a picture', () => {
  const out = SF.labShowSlides([still('end', { id: 'e', format: 'horse-race', label: 'Horse race', role: 'end', settings: {} })]);
  assert.ok(!out[0].sf);
});
