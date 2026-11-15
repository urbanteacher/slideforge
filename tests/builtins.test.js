'use strict';
/* The lessons SlideForge ships, kept apart from a teacher's own (js/builtins.js): the hosted site's Library starts
   empty, and a built-in's copy nobody has changed is not saved to the teacher's account. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'js', 'builtins.js'), 'utf8');

function load(hostname, extra) {
  const store = {};
  const localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); }
  };
  const SF = Object.assign({
    LIBRARY_SEED_KEYS: { 'ipdv-intro': 'nul', 'ukbt-template': 'ukbt' },
    DEMO_LIBRARY_GROUP: 'sf-demo',
    LESSONS: [{ key: 'ipdv-intro', title: 'IPDV intro' }, { key: 'ukbt-template', title: 'UKBT template' }, { key: 'not-a-pack', title: 'Loose' }],
    LAB_DECKS: { 'air-pollution-story': { id: 'air-pollution-story', title: 'Air', libraryGroup: 'ukbt-institute' }, 'plain-file': 'x.json' },
    Store: { list: () => [], get: () => null }
  }, extra || {});
  const window = { SF, location: { protocol: 'https:', hostname } };
  vm.runInNewContext(SRC, { window, localStorage });
  /* Results cross back out of the sandbox as plain values, so they compare as this realm's. */
  const plain = (v) => JSON.parse(JSON.stringify(v));
  const B = SF.BuiltIns;
  SF.BuiltIns = Object.assign({}, B, {
    templates: () => plain(B.templates()),
    leaveOut: (docs, inAccount) => plain(B.leaveOut(docs, inAccount))
  });
  return { SF, store };
}

test('the Library is filled with the built-ins on this machine, and not on the hosted site', () => {
  assert.equal(load('localhost').SF.BuiltIns.seeding(), true);
  assert.equal(load('127.0.0.1').SF.BuiltIns.seeding(), true);
  assert.equal(load('slideforge-rpjj.onrender.com').SF.BuiltIns.seeding(), false);
});

test('the hosted Library offers every built-in it does not hold as a template', () => {
  const { SF } = load('slideforge-rpjj.onrender.com');
  assert.deepEqual(SF.BuiltIns.templates().map((t) => [t.key, t.group, t.shipped]),
    [['ipdv-intro', 'nul', false], ['ukbt-template', 'ukbt', false], ['air-pollution-story', 'ukbt-institute', true]]);
  const held = load('x.onrender.com', { Store: { list: () => [{ id: 'd1', sourceKey: 'ipdv-intro' }, { id: 'air-pollution-story', labCard: true }], get: () => null } });
  assert.deepEqual(held.SF.BuiltIns.templates().map((t) => t.key), ['ukbt-template']);
});

test('an unchanged built-in copy, and its games and studio copy, stay out of the account until changed', () => {
  const { SF } = load('x.onrender.com');
  const docs = [
    { kind: 'classic', id: 'c1', modified: 100, sourceKey: 'ipdv-intro' },
    { kind: 'game', id: 'g1', modified: 100, sourceDeckId: 'c1' },
    { kind: 'lesson', id: 'l1', modified: 100, sourceId: 'c1' },
    { kind: 'lesson', id: 'air-pollution-story', modified: 100 },
    { kind: 'classic', id: 'demo', modified: 100, folder: 'sf-demo' },
    { kind: 'classic', id: 'own', modified: 100 },
    { kind: 'game', id: 'g2', modified: 100, sourceDeckId: 'own' }
  ];
  const none = () => false;
  assert.deepEqual(Object.keys(SF.BuiltIns.leaveOut(docs, none)).sort(),
    ['classic:c1', 'classic:demo', 'game:g1', 'lesson:air-pollution-story', 'lesson:l1']);
  /* Changed here: it is the teacher's from now on, and stays so. */
  docs[2].modified = 200;
  assert.ok(!SF.BuiltIns.leaveOut(docs, none)['lesson:l1']);
  assert.ok(!SF.BuiltIns.leaveOut(docs, none)['lesson:l1']);
  assert.ok(SF.BuiltIns.leaveOut(docs, none)['classic:c1']);
});

test('a built-in copy already in the account stays in step, as before', () => {
  const { SF } = load('x.onrender.com');
  const docs = [{ kind: 'classic', id: 'c1', modified: 100, sourceKey: 'ipdv-intro' }];
  assert.deepEqual(SF.BuiltIns.leaveOut(docs, (k) => k === 'classic:c1'), {});
});

test('a template opened in the studio is noted as built, and joins the account once changed', () => {
  const { SF } = load('x.onrender.com');
  SF.BuiltIns.note('lesson:new', 500);
  SF.BuiltIns.note('lesson:new', 900);   // noted once: a later note does not move the mark
  const doc = { kind: 'lesson', id: 'new', modified: 500 };
  assert.ok(SF.BuiltIns.leaveOut([doc], () => false)['lesson:new']);
  doc.modified = 501;
  assert.ok(!SF.BuiltIns.leaveOut([doc], () => false)['lesson:new']);
});

/* Bringing built-in copies up to date (refresh): a lesson rebuilt since this browser filed its copy. */
const HASH = fs.readFileSync(path.join(__dirname, '..', 'js', 'lesson-hash.js'), 'utf8');
function refreshWorld({ created = Date.UTC(2026, 10, 1), noted = 500, studioModified = 500, slides = ['old'] } = {}) {
  const docs = new Map();
  const put = (d) => docs.set(d.id, JSON.parse(JSON.stringify(d)));
  put({ id: 'c1', title: 'IPDV intro', sourceKey: 'ipdv-intro', libraryGroup: 'nul', created, modified: created, slides: slides.map((t) => ({ type: 'content', title: t })) });
  put({ id: 'lab-c1', title: 'IPDV intro', labCard: true, slides: [{ type: 'title' }] });
  put({ id: 'own', title: 'Mine', slides: [{ type: 'content', title: 'x' }] });
  let built = 0, gamesSaved = 0;
  const SF = {
    LIBRARY_SEED_KEYS: { 'ipdv-intro': 'nul' },
    LESSONS: [{ key: 'ipdv-intro', title: 'IPDV intro' }],
    normalizeDeck: (d) => d,
    GameStore: { save: () => { gamesSaved++; return true; } },
    buildLesson: (key) => { built++; SF.GameStore.save({}); return { id: 'n' + built, title: 'IPDV intro', sourceKey: key, libraryGroup: 'nul', created: Date.now(), slides: [{ type: 'content', title: 'new' }] }; },
    Store: { list: () => [...docs.values()].map((d) => JSON.parse(JSON.stringify(d))), get: (id) => (docs.has(id) ? JSON.parse(JSON.stringify(docs.get(id))) : null), save: put, remove: (id) => docs.delete(id) }
  };
  const store = { 'slideforge.builtinCopies.v1': JSON.stringify({ 'lesson:lab-c1': noted }) };
  const localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
  const window = { SF, location: { protocol: 'https:', hostname: 'x.onrender.com' } };
  vm.runInNewContext(HASH + '\n' + SRC, { window, localStorage, Date, JSON, Object });
  const forgot = [];
  const run = () => JSON.parse(JSON.stringify(SF.BuiltIns.refresh([{ id: 'lab-c1', sourceId: 'c1', modified: studioModified }], (id) => forgot.push(id))));
  return { SF, docs, forgot, run, games: () => gamesSaved, store };
}

test('a built-in copy that matches its lesson is left alone', () => {
  const w = refreshWorld({ slides: ['new'] });
  const r = w.run();
  assert.deepEqual([r.updated, r.kept], [[], []]);
  assert.ok(w.docs.has('c1') && w.docs.has('lab-c1'));
  assert.equal(w.games(), 0, 'checking a lesson files none of its games');
});

test('a copy nobody changed is swapped for the lesson as it is now, studio copy and all', () => {
  const w = refreshWorld();
  const r = w.run();
  assert.deepEqual(r.updated, ['IPDV intro']);
  assert.deepEqual(w.forgot, ['lab-c1']);
  assert.ok(!w.docs.has('c1') && !w.docs.has('lab-c1'), 'the old copy and its card are gone');
  const fresh = [...w.docs.values()].filter((d) => d.sourceKey === 'ipdv-intro');
  assert.equal(fresh.length, 1);
  assert.equal(fresh[0].slides[0].title, 'new');
  assert.equal(r.swaps[0].copies[0], 'lab-c1');
  assert.ok(w.docs.has('own'), 'the teacher’s own lessons are untouched');
  assert.ok(!('lesson:lab-c1' in JSON.parse(w.store['slideforge.builtinCopies.v1'])));
});

test('a copy changed in the studio is kept as an earlier copy, beside the new lesson', () => {
  const w = refreshWorld({ studioModified: 900 });
  const r = w.run();
  assert.deepEqual([r.updated, r.kept], [[], ['IPDV intro']]);
  assert.deepEqual(w.forgot, []);
  assert.equal(w.docs.get('c1').title, 'IPDV intro (earlier copy)');
  assert.equal(w.docs.get('c1').sourceKey, undefined, 'no longer the built-in’s copy');
  assert.equal(w.docs.get('lab-c1').title, 'IPDV intro (earlier copy)');
  assert.equal([...w.docs.values()].filter((d) => d.sourceKey === 'ipdv-intro').length, 1);
  w.run();
  assert.equal(w.docs.get('c1').title, 'IPDV intro (earlier copy)', 'named once, and a second pass changes nothing');
});

test('a copy filed before the classic editor went, or never noted, cannot be vouched for, so it is kept', () => {
  const old = refreshWorld({ created: Date.UTC(2026, 7, 1) });
  assert.deepEqual(old.run().kept, ['IPDV intro']);
  const unnoted = refreshWorld({ noted: undefined });
  delete unnoted.store['slideforge.builtinCopies.v1'];
  assert.deepEqual(unnoted.run().kept, ['IPDV intro']);
});
