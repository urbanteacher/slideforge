'use strict';
/* Which Lesson studio a browser gets, and how lessons reach it.
 *
 * The lab, for everyone: the classic studios are gone, and no address,
 * stored choice or automation brings them back. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function engine(search, stored, automated = false) {
  const store = stored ? { 'sf.lessonEngine': stored } : {};
  const localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  };
  /* No #app element, so the lab's frame is never mounted: there is no page here. */
  const context = { window: {}, console, localStorage, location: { search }, navigator: { webdriver: automated }, document: { getElementById: () => null } };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js/lab-engine.js'), 'utf8'), context);
  return { LabEngine: context.window.SF.LabEngine, store };
}

test('the lab is SlideForge\u2019s studios for everyone: no address, stored choice or automation brings the classic ones back', () => {
  assert.equal(engine('').LabEngine.enabled(), true, 'the lab');
  assert.equal(engine('?classic=1').LabEngine.enabled(), true, '?classic=1 no longer opens the classic studios');
  assert.equal(engine('', 'classic').LabEngine.enabled(), true, 'nor does a choice stored before they were retired');
  assert.equal(engine('', null, true).LabEngine.enabled(), true, 'nor automation: the smokes drive the lab');
  assert.equal(engine('').LabEngine.useClassic, undefined, 'and there is no way to ask for them');
  assert.equal(engine('').LabEngine.isHiddenCard, undefined, 'with no classic studio, no Library card is hidden');
});

/* The Library, the demo, File → reload and a ?lesson= link open a lesson in
   the lab directly; nothing goes through the classic editor. */
function withBank(search, automated = false) {
  const saves = [], calls = [];
  const docs = [{ id: 'mine', title: 'Week 2', sourceKey: 'week-2', slides: [{ type: 'title' }] }];
  const context = {
    window: { setTimeout: () => 0 }, console, URLSearchParams, localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    location: { search, pathname: '/', hash: '' }, history: { replaceState: (a, b, url) => calls.push(['url', url]) },
    navigator: { webdriver: automated }, setTimeout: () => 0,
    document: { getElementById: () => null, querySelectorAll: () => [], createElement: () => ({ setAttribute() {}, classList: { add() {} } }), documentElement: { classList: { add() {}, toggle() {} } } }
  };
  context.globalThis = context;
  vm.createContext(context);
  const SF = context.window.SF = {
    Store: { save: (d) => saves.push(d.id), list: () => docs, get: (id) => docs.find((d) => d.id === id) || null },
    Studio: { makeLesson: (key) => ({ id: 'built-' + key, title: key, sourceKey: key === 'layout-bank' ? key : undefined, slides: [] }) },
    restoreLibrarySeed: (k) => calls.push(['restore', k]),
    keepOneDemoCopy: (d) => calls.push(['one', d.id]),
    seedLibrary: () => calls.push(['seed']),
    Shell: { register: () => {} }
  };
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js/lab-engine.js'), 'utf8'), context);
  return { LabEngine: SF.LabEngine, saves, calls };
}

test('the demo and File → reload build the lesson afresh, file it once, and open it in the lab', () => {
  const { LabEngine, saves, calls } = withBank('');
  assert.equal(LabEngine.openKey('layout-bank'), true);
  assert.ok(saves.includes('built-layout-bank'), 'filed');
  assert.deepEqual(calls.filter((c) => c[0] !== 'seed'), [['restore', 'layout-bank'], ['one', 'built-layout-bank']]);
  assert.equal(LabEngine.openLesson(null), false, 'nothing to open');
});

test('a ?lesson= link reopens the Library’s copy rather than building another, and leaves the address clean', () => {
  const again = withBank('?lesson=week-2');
  again.LabEngine.install();
  assert.deepEqual(again.saves, ['mine'], 'the copy already in the Library');
  assert.ok(again.calls.some((c) => c[0] === 'url' && c[1] === '/'), 'the parameter comes off the address');
  const fresh = withBank('?lesson=week-3');
  fresh.LabEngine.install();
  assert.deepEqual(fresh.saves, ['built-week-3'], 'a first follow builds it');
});
