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
