'use strict';
/* SF.Docs (js/docs.js): one door to both stores, and a backup that carries the
   Lesson studio's lessons, not only their Library cards. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
/* Objects made inside the vm come from another realm: compare them as plain data. */
const plain = (v) => JSON.parse(JSON.stringify(v));

function load(lab) {
  const saved = { decks: [], games: [] };
  const store = (k) => ({
    list: () => saved[k].slice(),
    save: (d) => { saved[k] = saved[k].filter((x) => x.id !== d.id).concat([d]); return true; },
  });
  const SF = {
    Store: store('decks'), GameStore: store('games'),
    normalizeDeck: (d) => d, normalizeGame: (g) => g, LabEngine: lab,
  };
  const window = { SF };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/docs.js'), 'utf8'), { window, Promise });
  return { SF, saved };
}

test('the backup carries every Lesson-studio lesson whole', async () => {
  const lesson = { id: 'lab-1', title: 'Week 5', slides: [{ id: 's1', layers: [] }] };
  const { SF } = load({ savedDecks: () => Promise.resolve([lesson]) });
  SF.Store.save({ id: 'lab-1', title: 'Week 5', labCard: true, modified: 2, slides: [{}] });
  SF.Store.save({ id: 'old', title: 'Older', modified: 1, slides: [{}] });
  SF.GameStore.save({ id: 'g', title: 'Quiz', modified: 3 });
  const b = await SF.Docs.bundle();
  assert.equal(b.version, 2);
  assert.deepEqual(b.labDecks, [lesson]);
  assert.equal(b.decks.length, 2);
  assert.deepEqual(plain(SF.Docs.list()).map((r) => r.id + ':' + r.kind), ['g:game', 'lab-1:lesson', 'old:classic']);
});

test('a restore files the studio lessons back, and a version 1 backup still restores', async () => {
  const filed = [];
  const { SF, saved } = load({ restoreDecks: (ds) => { filed.push(...ds); return Promise.resolve(ds.length); } });
  const r = await SF.Docs.restore({ decks: [{ id: 'a', slides: [] }], games: [], labDecks: [{ id: 'lab-a' }] });
  assert.deepEqual(plain(r), { decks: 1, games: 0, lessons: 1 });
  assert.deepEqual(filed.map((d) => d.id), ['lab-a']);
  const v1 = await SF.Docs.restore({ version: 1, decks: [{ id: 'b', slides: [] }], games: [{ id: 'g' }] });
  assert.deepEqual(plain(v1), { decks: 1, games: 1, lessons: 0 });
  assert.deepEqual(saved.decks.map((d) => d.id), ['a', 'b']);
});

test('the shell backs up and restores through SF.Docs', () => {
  const shell = fs.readFileSync(path.join(__dirname, '../js/shell.js'), 'utf8');
  assert.match(shell, /SF\.Docs\.bundle\(\)/, 'export does not go through SF.Docs');
  assert.match(shell, /SF\.Docs\.restore\(raw\)/, 'import does not go through SF.Docs');
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  assert.match(html, /<script src="js\/docs\.js\?v=\d+"><\/script>/);
});
