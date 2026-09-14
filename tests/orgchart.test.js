'use strict';
/* People & structure slides — parsePerson / orgTree. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function load() {
  const dir = path.resolve(__dirname, '..');
  const store = {};
  const localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  };
  const context = { window: {}, console, localStorage, Date };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(dir, 'js/model.js'), 'utf8'), context);
  return context.window.SF;
}

const plain = (v) => JSON.parse(JSON.stringify(v));

test('parsePerson reads pipe or tab lines', () => {
  const SF = load();
  assert.deepEqual(plain(SF.parsePerson('Ada | Director | ')), {
    name: 'Ada', role: 'Director', boss: '', photo: ''
  });
  assert.equal(SF.parsePerson('Bo\tEngineer\tAda\thttps://example.com/a.jpg').boss, 'Ada');
  assert.equal(SF.parsePerson('Bo\tEngineer\tAda\thttps://example.com/a.jpg').photo,
    'https://example.com/a.jpg');
  assert.equal(SF.parsePerson('Evil | x | y | javascript:alert(1)').photo, '',
    'unsafe photo schemes are refused');
});

test('a hierarchy hangs reports under the named boss', () => {
  const SF = load();
  const t = SF.orgTree([
    'Michael | Founder |',
    'Nicole | Client Success | Michael',
    'Ada | Strategy | Nicole'
  ]);
  assert.equal(t.roots.length, 1);
  assert.equal(t.roots[0].name, 'Michael');
  assert.equal(t.roots[0].reports[0].name, 'Nicole');
  assert.equal(t.roots[0].reports[0].reports[0].name, 'Ada');
  assert.equal(t.levels, 3);
  assert.equal(t.warnings.length, 0);
});

test('a flat team has no connectors to invent', () => {
  const SF = load();
  const t = SF.orgTree(['Ada | A |', 'Bo | B |', 'Cy | C |']);
  assert.equal(t.roots.length, 3);
  assert.equal(t.levels, 1);
  t.roots.forEach((r) => assert.equal(r.reports.length, 0));
});

test('unknown boss becomes an extra root, with a warning', () => {
  const SF = load();
  const t = SF.orgTree(['Ada | Lead | Micheal']);
  assert.equal(t.roots.length, 1);
  assert.equal(t.roots[0].name, 'Ada');
  assert.match(t.warnings[0], /Micheal/);
  assert.match(t.warnings[0], /top-level/);
});

test('self-report is dropped to top-level', () => {
  const SF = load();
  const t = SF.orgTree(['Ada | Lead | Ada']);
  assert.equal(t.roots[0].name, 'Ada');
  assert.equal(t.roots[0].reports.length, 0);
  assert.match(t.warnings[0], /themselves/);
});

test('a mutual loop draws a flat team rather than a blank slide', () => {
  const SF = load();
  const t = SF.orgTree(['Ada | A | Bo', 'Bo | B | Ada']);
  assert.equal(t.roots.length, 2);
  assert.equal(t.levels, 1);
  assert.ok(t.warnings.some((w) => /loop|flat/i.test(w)));
});

test('a cycle under a real root is lifted, not omitted', () => {
  const SF = load();
  const t = SF.orgTree([
    'Ceo | Head |',
    'Ada | A | Bo',
    'Bo | B | Ada'
  ]);
  assert.equal(t.roots[0].name, 'Ceo');
  assert.equal(t.people.length, 3);
  assert.ok(t.roots.some((r) => r.name === 'Ada') || t.roots.some((r) => r.name === 'Bo'),
    'orphans from the loop must still appear');
  assert.ok(t.warnings.some((w) => /loop/i.test(w)));
});

test('duplicate names keep the first and warn', () => {
  const SF = load();
  const t = SF.orgTree(['Ada | One |', 'Ada | Two |']);
  assert.equal(t.people.length, 1);
  assert.equal(t.people[0].role, 'One');
  assert.match(t.warnings[0], /both named/);
});

test('orgchart is a drawable slide type', () => {
  const SF = load();
  assert.ok(SF.SLIDE_TYPES.orgchart);
  assert.equal(SF.normalizeSlide({ type: 'orgchart' }).type, 'orgchart');
});
