'use strict';
/* Which Lesson studio a browser gets, and what its Library lists.
 *
 * The lab, for everyone: the classic studios are retired, and no address or
 * stored choice brings them back. Only the browser smokes, under automation,
 * still drive them until they are rewritten for the lab. With the classic studio showing, the lab's Library cards (one title
 * slide standing in for a lab lesson) stay out of the Library, or they would
 * sit beside their own originals looking like lessons of one slide. */
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

test('the lab is SlideForge\u2019s studios for everyone: no address or stored choice brings the classic ones back', () => {
  assert.equal(engine('').LabEngine.enabled(), true, 'the lab');
  assert.equal(engine('?classic=1').LabEngine.enabled(), true, '?classic=1 no longer opens the classic studios');
  assert.equal(engine('', 'classic').LabEngine.enabled(), true, 'nor does a choice stored before they were retired');
  assert.equal(engine('').LabEngine.useClassic, undefined, 'and there is no way to ask for them');
  // Only the browser smokes, under automation, still drive the classic studios, and one written for the lab opts in.
  assert.equal(engine('', null, true).LabEngine.enabled(), false);
  assert.equal(engine('?classic=0', null, true).LabEngine.enabled(), true);
});

test('with the classic studio showing, the lab’s cards stay out of the Library, and lessons stay in', () => {
  const { LabEngine } = engine('', null, true);
  const one = [{ type: 'title' }];
  assert.equal(LabEngine.isHiddenCard({ id: 'x', labCard: true, slides: one }), true, 'a card that says so');
  assert.equal(LabEngine.isHiddenCard({ id: 'lab-gv0mxdsrlvky', slides: one }), true, 'an older card of a lesson’s lab copy');
  assert.equal(LabEngine.isHiddenCard({ id: 'rp2yh3j7', slides: one }), true, 'an older card of a lab deck, by the lab’s eight-character id');
  assert.equal(LabEngine.isHiddenCard({ id: 'gv0mxdsrlvky', slides: one }), false, 'a one-slide SlideForge lesson stays');
  assert.equal(LabEngine.isHiddenCard({ id: 'lab-gv0mxdsrlvky', slides: [one[0], one[0]] }), false, 'anything with slides of its own stays');
  // With the lab showing, the cards are the Library's way to its lessons.
  assert.equal(engine('').LabEngine.isHiddenCard({ id: 'x', labCard: true, slides: one }), false);
});
