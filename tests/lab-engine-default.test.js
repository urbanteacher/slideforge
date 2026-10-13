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

/* M15, M14: the studio's slideshow for Present, Teacher Presenter, Notes and Rehearse is the default. The way back is
   the File menu's "Use the classic slideshow", or ?studioPresent=0 (and =1 to turn the studio's back on). */
function trialFlag(search, stored) {
  const store = stored ? { 'slideforge.studioPresent': stored } : {};
  const localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  };
  const context = { window: {}, console, URLSearchParams, localStorage, location: { search }, navigator: { webdriver: false }, document: { getElementById: () => null } };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js/lab-engine.js'), 'utf8'), context);
  return { LabEngine: context.window.SF.LabEngine, store };
}

test('the studio’s slideshow is on by default, and the classic one is the way back', () => {
  assert.equal(trialFlag('').LabEngine.studioPresent(), true, 'on by default');
  assert.equal(trialFlag('?studioPresent=0').LabEngine.studioPresent(), false, '?studioPresent=0 chooses the classic slideshow');
  assert.equal(trialFlag('?studioPresent=1', '0').LabEngine.studioPresent(), true, '?studioPresent=1 turns the studio’s back on');
  assert.equal(trialFlag('?studioPresent=no', '0').LabEngine.studioPresent(), false, 'only 1 and 0 are read');
  assert.equal(trialFlag('', '0').LabEngine.studioPresent(), false, 'the stored choice stays');
  assert.equal(trialFlag('', '1').LabEngine.studioPresent(), true, 'a choice stored in the trial stays on');
  const t = trialFlag('');
  t.LabEngine.setStudioPresent(false);
  assert.equal(t.store['slideforge.studioPresent'], '0');
  t.LabEngine.setStudioPresent(true);
  assert.equal('slideforge.studioPresent' in t.store, false, 'on removes the key');
});

/* M14: a slide of the lesson the lab copy was made from that the lab cannot build (a motion, quiz or blank slide,
   a game it has no copy of) is put back by SlideForge's show and room, and never seen by the studio's. Such a
   lesson stays classic's; a hidden one, one the lab built, or a game whose saved game is gone does not count. */
function withSource(slides, labSlides, games, compiles) {
  const store = {};
  const localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
  const source = { id: 'src', slides };
  const SF = { Store: { get: (id) => (id === 'src' ? source : null) }, GameStore: { get: (id) => (games || {})[id] || null } };
  // M13: with SlideForge's game code here, the lesson's games go to cannotBuild compiled, and the lab builds those it can.
  if (compiles) SF.compileGame = (g) => [{ type: 'quiz', question: g.id }];
  const context = { window: { SF }, console, URLSearchParams, localStorage, location: { search: '' }, navigator: { webdriver: false }, document: { getElementById: () => null }, performance: { now: () => 0 }, clearTimeout, setTimeout };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js/lab-engine.js'), 'utf8'), context);
  const deck = { id: 'lab', sourceId: 'src', slides: labSlides };
  const builds = new Set(['title', 'content', 'image']);
  context.window.SF.LabEngine.ready({
    getDeck: () => deck, listSaved: () => Promise.resolve([]), subscribe: () => {},
    cannotBuild: (ss, labGames) => ss.filter((s) => !builds.has(s.type) && !(s.type === 'game' && labGames && labGames[s.gameId] && compiles.includes(s.gameId))).map((s) => s.id)
  });
  return context.window.SF.LabEngine.classicOnly();
}

test('a slide the lab cannot build keeps the lesson on SlideForge’s show and room (M14)', () => {
  const lab = [{ id: 'l1', sourceSlideId: 'a' }, { id: 'l2', sourceSlideId: 'b' }];
  assert.equal(withSource([{ id: 'a', type: 'title' }, { id: 'b', type: 'content' }], lab), '', 'everything built');
  assert.match(withSource([{ id: 'a', type: 'title' }, { id: 'm', type: 'motion', title: 'Spin' }, { id: 'b', type: 'content' }], lab), /"Spin" is a SlideForge motion slide the studio does not build/);
  assert.match(withSource([{ id: 'a', type: 'title' }, { id: 'q', type: 'quiz' }, { id: 'x', type: 'blank' }], lab), /"quiz" is a SlideForge quiz slide .* \(and 1 more\)/);
  assert.equal(withSource([{ id: 'a', type: 'title' }, { id: 'm', type: 'motion', hidden: true }], lab), '', 'a hidden one is not shown');
  assert.equal(withSource([{ id: 'a', type: 'title' }, { id: 'g', type: 'game', gameId: 'gone' }], lab), '', 'a game whose saved game is gone is left out by SlideForge too');
  assert.match(withSource([{ id: 'a', type: 'title' }, { id: 'g', type: 'game', gameId: 'kept', title: 'Boss' }], lab, { kept: { id: 'kept' } }), /"Boss" is a SlideForge game slide/);
  assert.equal(withSource([{ id: 'a', type: 'title' }, { id: 'g', type: 'game', gameId: 'kept' }], [...lab, { id: 'l3', sourceSlideId: 'g' }], { kept: { id: 'kept' } }), '', 'a game the lab built from its compiled copy is the lab’s');
  // M13: a game the lab can build that its copy does not have was deleted there; one it cannot build stays classic's.
  const kept = { kept: { id: 'kept' }, board: { id: 'board' } };
  assert.equal(withSource([{ id: 'a', type: 'title' }, { id: 'g', type: 'game', gameId: 'kept' }], lab, kept, ['kept']), '', 'deleted in the lab, it stays deleted');
  assert.match(withSource([{ id: 'a', type: 'title' }, { id: 'g', type: 'game', gameId: 'board', title: 'Bingo' }], lab, kept, ['kept']), /"Bingo" is a SlideForge game slide/);
  assert.match(withSource([{ id: 'g', type: 'game', gameId: 'kept', title: 'Old' }], [{ id: 'l1' }], kept, ['kept']), /"Old" is a SlideForge game slide/, 'a copy that does not name its sources is not given the games');
});
