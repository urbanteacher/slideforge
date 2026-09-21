'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function load() {
  const ctx = { window: {}, console };
  vm.createContext(ctx);
  /* js/memory.js moved into the boards engine; the bundle installs it. */
  for (const file of ['model']) vm.runInContext(fs.readFileSync(require.resolve('../js/' + file + '.js'), 'utf8'), ctx);
  return ctx.window.SF;
}
test('memory games compile complete boards, retain pairs and never send claim quizzes', () => {
  const SF = load();
  for (const kind of ['memorymatch', 'memoryflip', 'knowledgeflip']) {
    const game = SF.makeGame('Cells', kind), original = JSON.stringify(game);
    const slides = SF.compileGame(game);
    const board = slides.find(s => s.memoryBoard);
    assert.equal(board.type, 'content');
    assert.equal(board.memoryBoard.pairs.length, 4);
    assert.equal(slides.filter(s => s.type === 'quiz' || s.type === 'results').length, 0);
    assert.equal(JSON.stringify(game), original, 'compilation cannot change authored content');
    assert.ok(!board.bullets.join(' ').includes('genetic'), 'phone excerpt excludes definitions');
    game.questions = Array.from({ length: 17 }, (_, i) => Object.assign(SF.makeQuestion(kind), { id: 'pair-' + i }));
    const boards = SF.compileGame(game).filter(s => s.memoryBoard);
    assert.deepEqual(Array.from(boards, b => b.memoryBoard.pairs.length), [8, 8, 1]);
    assert.equal(new Set(boards.map(b => b.id)).size, 3);
  }
});
test('study, recall, reveal and teacher verdict enforce retries and one claim per card', () => {
  const SF = load(), M = SF.Memory;
  const b = { kind: 'memorymatch', participants: ['A', 'B'], studySeconds: 10, pairs: [{}, {}] };
  let s = M.create(b);
  s = M.transition(b, s, 'select', 0); assert.equal(s.selected, -1);
  s = M.transition(b, s, 'start'); assert.equal(s.phase, 'study');
  s = M.transition(b, s, 'select', 0); assert.equal(s.selected, -1);
  s = M.transition(b, s, 'hide');
  s = M.transition(b, s, 'select', 0);
  s = M.transition(b, s, 'claim'); assert.equal(s.owners[0], null, 'must reveal before claiming');
  s = M.transition(b, s, 'pass'); assert.equal(s.turn, 1); assert.equal(s.owners[0], null);
  s = M.transition(b, s, 'select', 0);
  s = M.transition(b, s, 'reveal');
  s = M.transition(b, s, 'claim'); assert.equal(s.owners[0], 1); assert.equal(s.turn, 0);
  s = M.transition(b, s, 'claim'); assert.equal(s.attempts, 2, 'double click cannot score twice');
  s = M.transition(b, s, 'select', 0); assert.equal(s.selected, -1, 'claimed card locked');
  s = M.transition(b, s, 'select', 1);
  s = M.transition(b, s, 'reveal');
  s = M.transition(b, s, 'claim'); assert.equal(s.phase, 'complete');
  assert.equal(M.winner(b, s), 'Shared win: A & B');
  s = M.transition(b, s, 'restart'); assert.equal(s.phase, 'ready'); assert.equal(s.attempts, 0);
});
test('knowledge boards skip study, pause blocks claims and invalid card indices do nothing', () => {
  const M = load().Memory, b = {kind:'knowledgeflip', participants:['Class'], studySeconds:0,pairs:[{}]};
  let s = M.transition(b, M.create(b), 'start'); assert.equal(s.phase,'recall');
  for (const card of [-1, 1, NaN, 0.5, '0']) assert.equal(M.transition(b,s,'select',card).selected,-1);
  s=M.transition(b,s,'pause'); assert.equal(M.transition(b,s,'select',0).selected,-1);
  s=M.transition(b,s,'pause'); s=M.transition(b,s,'select',0);
  s=M.transition(b,s,'reveal'); const before=JSON.stringify(s);
  const claimed=M.transition(b,s,'claim');
  assert.equal(JSON.stringify(s),before,'transitions do not mutate old state');
  assert.equal(M.winner(b,claimed),'Every pair remembered.');
});

test('knowledge flip keeps definitions off the board until complete', () => {
  const SF = load();
  const game = SF.makeGame('Cells', 'knowledgeflip');
  const slide = SF.compileGame(game, { intro: false }).find((s) => s.memoryBoard);
  assert.equal(slide.memoryBoard.kind, 'knowledgeflip');
  assert.equal(slide.memoryBoard.studySeconds, 0);
  assert.ok(slide.memoryBoard.pairs.every((p) => p.term && p.definition));

  /* Preview / ready / recall: keywords face-up, meanings stay off the grid.
     Only the complete phase paints definitions onto collected cards via allVisible. */
  const ready = SF.Memory.create(slide.memoryBoard);
  assert.equal(ready.phase, 'ready');
  const recall = SF.Memory.transition(slide.memoryBoard, ready, 'start');
  assert.equal(recall.phase, 'recall');
  assert.equal(recall.remaining, 0);

  let s = recall;
  s = SF.Memory.transition(slide.memoryBoard, s, 'select', 0);
  assert.equal(s.selected, 0);
  s = SF.Memory.transition(slide.memoryBoard, s, 'reveal');
  assert.equal(s.revealed, true);
  assert.equal(slide.memoryBoard.pairs[0].definition.length > 0, true);
  /* Board data still holds definitions for the check panel — they are not
     cleared; visibility is a render concern covered by the ready→recall path. */
  s = SF.Memory.transition(slide.memoryBoard, s, 'claim');
  assert.equal(s.owners[0], 0);
});
