'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');

async function setup() {
  const { GAME_STYLES } = await import('../src/games/registry.js');
  const { createBoardRuntime } = await import('../src/boards/runtime.js');
  const namespace = {};
  return { styles: GAME_STYLES, namespace, boards: createBoardRuntime(() => namespace, GAME_STYLES) };
}

test('board lifecycle uses late-loaded runtimes and unmounts each family once', async () => {
  const { boards, namespace, styles } = await setup();
  const events = [];
  const host = {};
  boards.reset(host); // No runtime modules loaded yet.
  for (const key of ['memoryflip', 'bingo', 'bowl', 'lowstakes']) {
    const board = styles[key].boardEngine;
    namespace[board.runtime] = {
      mount: (owner, slide) => { assert.equal(owner, host); events.push('mount:' + slide.id); },
      unmount: () => events.push('unmount:' + board.key),
      command: (action, card) => events.push([board.key, action, card])
    };
    boards.mount(host, { id: key, [board.field]: {} }, {});
    host[board.states][key] = { phase: 'recall' };
  }
  assert.equal(boards.command('memory', 'claim', 2), true);
  assert.equal(boards.command('not-a-board', 'claim', 2), false);
  boards.reset(host);
  assert.equal(events.filter(event => event === 'unmount:memory').length, 1);
  assert.equal(events.filter(event => typeof event === 'string' && event.startsWith('unmount:')).length, 4);
  assert.deepEqual(events.find(Array.isArray), ['memory', 'claim', 2]);
  assert.deepEqual(boards.snapshot(host), {
    memoryStates: {}, bingoStates: {}, bowlStates: {}, lowstakesStates: {}
  });
});

test('presenter snapshots, render state and command names preserve the wire contract', async () => {
  const { boards, styles } = await setup();
  const host = {};
  const sent = [];
  for (const key of ['memoryflip', 'bingo', 'bowl', 'lowstakes']) {
    const board = styles[key].boardEngine;
    const slide = { id: key, [board.field]: {} };
    const state = { phase: 'recall', owners: [null, 0], turn: 1 };
    host[board.states] = { [slide.id]: state };
    const received = boards.snapshot(boards.snapshot(host));
    const options = boards.renderOptions(received, slide, (command, data) => sent.push({ command, data }));
    assert.equal(options[board.state], state);
    assert.equal(boards.current(received, slide), state);
    options[board.command]('claim', 0);
    assert.deepEqual(sent.pop(), { command: board.key, data: { action: 'claim', card: 0 } });
    assert.equal(boards.renderOptions(received, slide)[board.command], null, 'next-slide previews cannot send commands');
  }
  assert.equal(boards.forSlide({ type: 'quiz' }), null);
  assert.equal(boards.current(host, { id: 'memoryflip', type: 'content' }), null, 'a reused ID is not a board');
});

test('shared sessions exclude paused and blank time, preserve state and dispose stale timers', async () => {
  const { styles } = await setup();
  const { createBoardRuntime } = await import('../src/boards/runtime.js');
  let now = 1000;
  const timers = new Map();
  const boards = createBoardRuntime(() => ({}), styles, {
    now: () => now,
    every: (fn, delay) => { assert.equal(delay, 1000); timers.set(1, fn); return 1; },
    cancel: id => timers.delete(id)
  });
  let syncs = 0;
  const player = { syncPresenter: () => syncs++ };
  const slide = { id: 'same-board', bingoBoard: {} };
  const options = { player, slide, node: { querySelector: () => null },
    create: () => ({ elapsed: 0, phase: 'calling' }), render: () => {}, command: () => {},
    tick: (session, dt) => { player.bingoStates[slide.id].elapsed += dt; } };
  const session = boards.createSession('bingo', options);
  session.start();
  assert.equal(syncs, 1);
  const staleCallback = timers.get(1);
  now += 1500;
  staleCallback();
  assert.equal(player.bingoStates[slide.id].elapsed, 1.5);
  player.blank = true;
  now += 5000;
  staleCallback();
  player.blank = false;
  player.bingoStates[slide.id].paused = true;
  now += 5000;
  staleCallback();
  player.bingoStates[slide.id].paused = false;
  now += 500;
  session.stop();
  assert.equal(player.bingoStates[slide.id].elapsed, 2);
  assert.equal(timers.size, 0);
  now += 10000;
  staleCallback();
  assert.equal(player.bingoStates[slide.id].elapsed, 2, 'disposed callbacks cannot change state');
  const state = player.bingoStates[slide.id];
  const resumed = boards.createSession('bingo', options);
  assert.equal(player.bingoStates[slide.id], state, 'returning to a board reuses its state');
  resumed.start();
  now += 1000;
  resumed.stop();
  assert.equal(state.elapsed, 3, 'time spent on another slide is excluded');
});

test('presenter clock refresh preserves controls but verdicts invalidate the render stamp', async () => {
  const { boards, namespace } = await setup();
  const slide = { id: 'memory', memoryBoard: {} };
  const state = { phase: 'study', elapsed: 0, remaining: 10, owners: [null] };
  const host = { memoryStates: { memory: state } };
  const stamp = boards.stamp(host, slide, 'studio');
  state.remaining = 9;
  state.elapsed = 1;
  assert.equal(boards.stamp(host, slide, 'studio'), stamp);
  const clock = { textContent: '' };
  const box = { querySelector: selector => selector === '.mem-time' ? clock : null };
  assert.equal(boards.refreshClock(box, host, slide), true);
  assert.equal(clock.textContent, '9s');
  state.owners[0] = 0;
  assert.notEqual(boards.stamp(host, slide, 'studio'), stamp);
  assert.notEqual(boards.stamp(host, slide, 'midnight'), boards.stamp(host, slide, 'studio'));
  namespace.LowStakes = { formatClock: seconds => 'clock:' + seconds };
  const worksheet = { id: 'sheet', lowstakesBoard: {} };
  host.lowstakesStates = { sheet: { phase: 'quiz', remaining: 45 } };
  const paperClock = { textContent: '' };
  assert.equal(boards.refreshClock({ querySelector: () => paperClock }, host, worksheet), true);
  assert.equal(paperClock.textContent, 'clock:45');
});

test('board verdict hooks keep worksheet evidence separate from scored claims', async () => {
  const { boards, namespace } = await setup();
  namespace.Memory = {};
  namespace.Bingo = {};
  namespace.Bowl = {};
  namespace.LowStakes = {};
  const reports = [];
  boards.onVerdict(value => reports.push(value));
  const claim = { slideId: 'b', right: true, value: 200 };
  namespace.Bowl.onVerdict(claim);
  assert.equal(reports[0], claim);
  namespace.LowStakes.onReveal({ slideId: 'w', title: 'Recall', count: 5, early: true });
  assert.deepEqual(reports[1], { slideId: 'w', title: 'Recall', kind: 'lowstakes', set: 1,
    card: 0, term: '5 questions · early reveal', participant: 'The class', right: true, value: 0 });
});

test('board authoring hooks edit the selected question and apply settings to the whole board', async () => {
  const { styles } = await setup();
  const { makeGame } = await import('../src/games/factories.js');
  for (const [key, label, value, field] of [
    ['memorymatch', 'Study time for the whole board (seconds)', 17, 'studySeconds'],
    ['bingo', 'Card size', '4', 'gridSize'],
    ['bowl', 'Target score', '1500', 'bowlTarget'],
    ['lowstakes', 'Quiz time limit', '240', null]
  ]) {
    const game = makeGame('Board', key);
    if (game.questions.length === 1) game.questions.push(structuredClone(game.questions[0]));
    const fields = [];
    const element = () => ({ appendChild() {} });
    const input = (value, change) => ({ value, change });
    const noop = () => {};
    let touched = 0;
    const context = {
      SF: { makeGame, bowlGrid: (await import('../src/games/bowl.js')).bowlGrid },
      game, st: game.settings, el: element,
      UI: { field: (label, input) => { fields.push({ label, input }); return element(); },
        text: input, area: input, num: input,
        select: (items, value, change) => input(value, change),
        segmented: (items, value, change) => input(value, change) },
      touched: () => touched++, repaint: noop, drawRail: noop, drawPreview: noop, draw2: noop,
      boardSettingLink: element, questionOps: element
    };
    const board = styles[key].boardEngine;
    board.authorQuestion(element(), game.questions[0], context);
    assert.ok(fields.length, key + ' has question fields');
    fields[0].input.change('Edited item');
    assert.ok(touched > 0, key + ' edits trigger persistence');
    fields.length = 0;
    board.authorInspector(element(), game.questions[0], context);
    board.authorSettings(element(), context);
    fields.find(item => item.label === label).input.change(value);
    if (field === 'bowlTarget') {
      assert.equal(game.settings.bowlTarget, Number(value));
      assert.ok(game.questions.every(question => question.targetScore == null), key);
    }
    else if (field) assert.ok(game.questions.every(question => question[field] === Number(value)), key);
    else assert.equal(game.settings.defaultTime, Number(value));
  }
});

test('Markdown exporter accepts injected game lookup without browser storage', async () => {
  const { renderMarkdown } = await import('../src/deck/markdown.js');
  const { parseTable, slideExcerpt, prepareLayout } = await import('../src/deck/content.js');
  assert.deepEqual(parseTable('Term | Meaning\nCell | Unit of life'), [['Term', 'Meaning'], ['Cell', 'Unit of life']]);
  assert.equal(slideExcerpt({ type: 'content', bullets: ['One', 'Two'], progressive: true }, 1), 'One');
  assert.equal(prepareLayout({ bullets: [] }, 'cards').bullets.length, 3);
  const markdown = renderMarkdown({ title: 'Lesson', slides: [{ type: 'game', gameId: 'quiz' }] }, id => {
    assert.equal(id, 'quiz');
    return { title: 'Recall', style: 'truefalse', questions: [{ question: 'Ready?' }] };
  });
  assert.match(markdown, /Knowledge check: Recall/);
  assert.match(markdown, /- True\n- False/);
  assert.match(renderMarkdown({ slides: [{ type: 'game', gameId: 'missing' }] }), /Game not found/);
});
