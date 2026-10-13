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

/* M14: the studio's show and room are the only ones. What they cannot run (a guard's reason, or classicOnly) is
   refused with a toast that says what and why, and nothing else starts: there is no classic show, room, viewer or
   handout to hand the lesson to. */
function noFallback(why) {
  const toasts = [], opened = [];
  const SF = { toast: (t) => toasts.push(t), Store: { get: () => null }, GameStore: { get: () => null } };
  const localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  const context = { window: { SF }, console, URLSearchParams, localStorage, location: { search: '' }, navigator: { webdriver: false }, document: { getElementById: () => null, documentElement: { classList: { add: () => {}, remove: () => {} } } }, performance: { now: () => 0 }, clearTimeout, setTimeout };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js/lab-engine.js'), 'utf8'), context);
  const LE = context.window.SF.LabEngine;
  LE.ready({
    getDeck: () => ({ id: 'lab', slides: [{ id: 'a' }] }), listSaved: () => Promise.resolve([]), subscribe: () => {},
    whyNotInStudio: () => why.room || '', whyNotPresentInStudio: () => why.show || '',
    hostInStudio: () => { opened.push('room'); return true; }, presentInStudio: () => { opened.push('show'); return true; },
    rehearseInStudio: () => { opened.push('rehearse'); return true; },
    shareDeck: () => ({ id: 'lab', studio: 1, slides: [], pad: why.big ? 'x'.repeat(8 * 1024 * 1024) : '' }),
    handout: () => Promise.resolve('')
  });
  return { LE, toasts, opened };
}

test('what the studio cannot run is refused with the reason; nothing falls back to classic (M14)', async () => {
  assert.equal('studioPresent' in noFallback({}).LE, false, 'the File menu’s "Use the classic slideshow" is gone');
  const room = noFallback({ room: '"Mind" is Mind reveal, which the room does not run' });
  room.LE.hostLive();
  assert.deepEqual(room.toasts, ['Host live cannot start: "Mind" is Mind reveal, which the room does not run.']);
  assert.deepEqual(room.opened, [], 'no room opened');
  const show = noFallback({ show: '"Fig" has a live figure the lesson does not carry' });
  assert.deepEqual({ ...(await show.LE.studioShareDeck()) }, { why: '"Fig" has a live figure the lesson does not carry' });
  show.LE.studioHandout();
  assert.deepEqual(show.toasts, ['The PDF handout cannot start: "Fig" has a live figure the lesson does not carry.']);
  const big = noFallback({ big: true });
  assert.match((await big.LE.studioShareDeck()).why, /^the lesson is 8\.0 MB with its pictures, over the room server’s 7\.5 MB/);
  const fine = noFallback({});
  fine.LE.hostLive();
  assert.deepEqual(fine.opened, ['room'], 'a lesson the studio runs is hosted there');
  assert.ok((await fine.LE.studioShareDeck()).doc, 'and shared as the lab deck');
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

test('a slide the lab cannot build is a reason the studio refuses the lesson (M14)', () => {
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
