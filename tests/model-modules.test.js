'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');

test('engine modules load without window and produce independent authoring documents', async () => {
  const { GAME_STYLES } = await import('../src/games/registry.js');
  const { makeGame } = await import('../src/games/factories.js');
  assert.equal(typeof global.window, 'undefined');
  for (const [key, engine] of Object.entries(GAME_STYLES)) {
    assert.equal(engine.key, key);
    for (const hook of ['make', 'normalize', 'problems', 'compile', 'mark', 'summary']) {
      assert.equal(typeof engine[hook], 'function', key + '.' + hook);
    }
    const before = JSON.stringify(engine.starters);
    const first = makeGame('First', key);
    const second = makeGame('Second', key);
    assert.notEqual(first.id, second.id);
    assert.notEqual(first.questions[0].id, second.questions[0].id);
    const expected = JSON.stringify(second);
    first.settings.teams[0].name = 'Edited';
    for (const question of first.questions) {
      for (const field of Object.keys(question)) {
        if (Array.isArray(question[field])) question[field].push('Edited');
        else if (typeof question[field] === 'string') question[field] = 'Edited';
      }
    }
    assert.equal(JSON.stringify(second), expected, key + ': documents share mutable data');
    assert.equal(JSON.stringify(engine.starters), before, key + ': starter bank changed');
  }
});

test('shared persistence preserves both storage namespaces and document references', async () => {
  const { createStores } = await import('../src/storage.js');
  const values = new Map();
  const normalized = [];
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const { Store, GameStore } = createStores({
    storage: () => storage,
    normalizeDeck: value => { normalized.push('deck'); return value; },
    normalizeGame: value => { normalized.push('game'); return value; }
  });
  const game = { id: 'same-id', title: 'Quiz' };
  const deck = { id: 'same-id', title: 'Lesson', slides: [{ type: 'game', gameId: game.id }] };
  assert.equal(Store.save(deck), true);
  assert.equal(GameStore.save(game), true);
  assert.ok(values.has('slideforge.decks.v1'));
  assert.ok(values.has('slideforge.games.v1'));
  assert.equal(values.get('slideforge.lastDeckId'), deck.id);
  assert.equal(values.get('slideforge.lastGameId'), game.id);
  assert.deepEqual(GameStore.usedBy(game.id), ['Lesson']);
  game.title = 'Edited quiz';
  GameStore.save(game);
  assert.equal(GameStore.list().length, 1);
  assert.equal(GameStore.get(game.id).title, 'Edited quiz');
  assert.equal(Store.get(deck.id).title, 'Lesson');
  GameStore.remove(game.id);
  assert.equal(GameStore.get(game.id), null);
  assert.equal(Store.list().length, 1);
  Store.clear();
  assert.deepEqual(Store.list(), []);
  assert.ok(normalized.includes('deck') && normalized.includes('game'));
});

test('persistence tolerates corrupt data, denied access, and quota failures', async () => {
  const { createStores } = await import('../src/storage.js');
  const warnings = [];
  let access = 'corrupt';
  const values = new Map();
  const { Store, GameStore } = createStores({
    normalizeDeck: value => value,
    normalizeGame: value => value,
    warn: message => warnings.push(message),
    storage: () => {
      if (access === 'denied') throw new Error('SecurityError');
      return {
        getItem: () => access === 'corrupt' ? '{' : '[]',
        setItem: (key, value) => {
          if (access === 'quota' && key.endsWith('.v1')) throw new Error('QuotaExceededError');
          values.set(key, value);
        }
      };
    }
  });
  for (const store of [Store, GameStore]) assert.deepEqual(store.list(), []);
  access = 'denied';
  for (const store of [Store, GameStore]) {
    assert.deepEqual(store.list(), []);
    assert.equal(store.lastId(), null);
    assert.equal(store.save({ id: 'blocked' }), false);
  }
  access = 'quota';
  assert.equal(Store.save({ id: 'deck' }), false);
  assert.equal(GameStore.save({ id: 'game' }), false);
  // Retain the existing last-opened behavior even if the document write fails.
  assert.equal(values.get('slideforge.lastDeckId'), 'deck');
  assert.equal(values.get('slideforge.lastGameId'), 'game');
  assert.ok(warnings.some(message => message === 'Could not save decks:'));
  assert.ok(warnings.some(message => message === 'Could not save games:'));
});

test('blank untitled decks are not filed until they have content', async () => {
  const { createStores, unusedDraft } = await import('../src/storage.js');
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const { Store } = createStores({
    storage: () => storage,
    normalizeDeck: value => value,
    normalizeGame: value => value
  });
  const blank = {
    id: 'blank-1',
    title: 'Untitled presentation',
    slides: [{ type: 'title', title: '', subtitle: '', body: '', bullets: [] }]
  };
  assert.equal(unusedDraft(blank), true);
  assert.equal(Store.save(blank), true);
  assert.equal(Store.list().length, 0);
  const seeded = {
    id: 'blank-2',
    title: 'Untitled presentation',
    slides: [{ type: 'title', title: 'Presentation title', subtitle: 'Your name', body: '', bullets: [] }]
  };
  assert.equal(unusedDraft(seeded), true);
  assert.equal(Store.save(seeded), true);
  assert.equal(Store.list().length, 0);
  assert.equal(Store.save(seeded, { force: true }), true);
  assert.equal(Store.list().length, 1);
  Store.remove('blank-2');
  assert.equal(Store.list().length, 0);
  blank.slides[0].title = 'Week 3';
  assert.equal(unusedDraft(blank), false);
  assert.equal(Store.save(blank), true);
  assert.equal(Store.list().length, 1);
  blank.slides[0].title = '';
  assert.equal(unusedDraft(blank), true);
  assert.equal(Store.save(blank), true);
  assert.equal(Store.list().length, 1);
  const namedEmpty = { id: 'named', title: 'Lesson 1', slides: [{ type: 'title', title: '' }] };
  assert.equal(unusedDraft(namedEmpty), false);
  const stray = { id: 'blocked' };
  assert.equal(unusedDraft(stray), false);
  Store.save({ id: 'keep-me', title: 'Kept', slides: [{ type: 'title', title: 'Hi' }] });
  assert.equal(Store.sweepUnused('keep-me'), 1);
  assert.deepEqual(Store.list().map(item => item.id), ['keep-me']);
});

test('deck content helpers and layout definitions export cleanly', async () => {
  const { DECK_TYPES, prepareLayout, parseTable, safeHref, safeMedia } = await import('../src/deck/content.js');
  assert.ok(Array.isArray(DECK_TYPES));
  assert.ok(DECK_TYPES.includes('title'));
  assert.ok(DECK_TYPES.includes('content'));

  const slide = { type: 'title', title: 'Hello' };
  const prepared = prepareLayout(slide, 'content');
  assert.equal(prepared.type, 'content');
  assert.ok(Array.isArray(prepared.bullets));

  const rows = parseTable('A\tB\nC\tD');
  assert.deepEqual(rows, [['A', 'B'], ['C', 'D']]);
  assert.equal(safeHref('https://example.com'), 'https://example.com');
  assert.equal(safeHref('javascript:alert(1)'), '');
  assert.equal(safeMedia('javascript:alert(1)'), '');
});

test('save assigns libraryGroup from theme when missing', async () => {
  const { createStores, libraryGroupFromTheme } = await import('../src/storage.js');
  assert.equal(libraryGroupFromTheme('ukbt'), 'ukbt');
  assert.equal(libraryGroupFromTheme('northeastern'), 'nul');
  assert.equal(libraryGroupFromTheme('studio'), 'other');
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const { Store } = createStores({
    storage: () => storage,
    normalizeDeck: value => value,
    normalizeGame: value => value
  });
  const deck = { id: 'd1', title: 'Lesson', theme: 'ukbt', slides: [{ type: 'title', title: 'Hi' }] };
  Store.save(deck);
  assert.equal(Store.get('d1').libraryGroup, 'ukbt');
});

test('custom library folders can be created and survive save', async () => {
  const { createStores, normalizeLibraryGroup } = await import('../src/storage.js');
  assert.equal(normalizeLibraryGroup('week-3', 'studio'), 'week-3');
  assert.equal(normalizeLibraryGroup('', 'ukbt'), 'ukbt');
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const { Store, LibraryFolders } = createStores({
    storage: () => storage,
    normalizeDeck: value => value,
    normalizeGame: value => value
  });
  const id = LibraryFolders.create('Week 3');
  assert.equal(id, 'week-3');
  LibraryFolders.rename(id, 'Week three');
  assert.equal(LibraryFolders.catalog().find(f => f.id === id).label, 'Week three');
  const deck = { id: 'd2', title: 'Seminar', theme: 'northeastern', libraryGroup: 'week-3', slides: [{ type: 'title', title: 'Hi' }] };
  Store.save(deck);
  assert.equal(Store.get('d2').libraryGroup, 'week-3');
});

test('board runtime manages lifecycle and snapshots without DOM dependencies', async () => {
  const { createBoardRuntime } = await import('../src/boards/runtime.js');
  const { GAME_STYLES } = await import('../src/games/registry.js');
  const boards = createBoardRuntime(() => ({}), GAME_STYLES);
  assert.equal(typeof boards.forSlide, 'function');
  assert.equal(typeof boards.renderOptions, 'function');
  assert.equal(typeof boards.snapshot, 'function');

  const memorySlide = { id: 's1', memoryBoard: { kind: 'memoryflip' } };
  const board = boards.forSlide(memorySlide);
  assert.ok(board);
  assert.equal(board.key, 'memory');

  const host = { memoryStates: { s1: { phase: 'study' } } };
  const current = boards.current(host, memorySlide);
  assert.deepEqual(current, { phase: 'study' });
  const snap = boards.snapshot(host);
  assert.deepEqual(snap.memoryStates, { s1: { phase: 'study' } });
});

