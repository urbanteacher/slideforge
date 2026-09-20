'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadModel() {
  const store = {};
  const localStorage = {
    getItem: (key) => key in store ? store[key] : null,
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; }
  };
  const context = { window: {}, console, localStorage, Date };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.resolve(__dirname, '../js/model.js'), 'utf8'), context);
  return context.window.SF;
}

test('the layout slot catalogue is declarative and uses stable slots', async () => {
  const slots = await import('../src/render/layout-slots.js');
  const content = slots.layoutRegionsFor({ type: 'content' });
  assert.deepEqual(content.title, { col: 1, row: 1, cols: 12, rows: 2 });
  /* The rail sits below the copy, not beside it: the copy blocks span columns
     1 to 11, so a rail starting at column 9 overlapped the bullets an item was
     meant to sit near. */
  assert.deepEqual(slots.insertionRegionFor({ type: 'content' }, 1), { col: 1, row: 13, cols: 12, rows: 4 });
  assert.equal(slots.insertionRegionFor({ type: 'title' }, 0), null,
    'a layout without an item rail must not invent a free coordinate');

  const awareness = slots.layoutRegionsFor({ type: 'title', design: { composition: 'poster-art' } });
  assert.deepEqual(awareness['cp-title-copy'], { col: 1, row: 4, cols: 6, rows: 8, alignY: 'middle' });
  assert.deepEqual(awareness['cp-art'], { col: 8, row: 3, cols: 5, rows: 10, alignY: 'middle' });
});

test('every authorable layout and every AI Awareness composition declares coordinates', () => {
  const SF = loadModel();
  for (const type of SF.DECK_TYPES) {
    const slide = SF.makeSlide(type);
    assert.equal(SF.hasLayoutTemplate(slide), true, type + ' must own a layout template');
    /* The rule is that every block a layout draws has declared coordinates.
       Blank draws none — it is an empty canvas an author puts items on — so
       the rule is vacuous for it rather than broken. It still has to own a
       template above, because that is what gives its items somewhere to land:
       the check below holds it to an insert rail, which for every other type
       is optional. */
    if (type === 'blank') {
      assert.equal(Object.keys(SF.layoutRegionsFor(slide)).length, 0,
        'blank draws nothing, so it declares no slots');
      assert.ok(SF.insertionRegionFor(slide, 0, 'text'),
        'blank must say where the first item goes, having no slot to fall back on');
      continue;
    }
    assert.ok(Object.keys(SF.layoutRegionsFor(slide)).length, type + ' must declare at least one slot');
  }
  for (const composition of ['poster-art', 'voice', 'ballot', 'prompt', 'rules', 'commitment', 'comparison', 'reveal-map', 'credits', 'lanes']) {
    const regions = SF.layoutRegionsFor({ type: 'title', design: { composition } });
    assert.ok(Object.keys(regions).length, composition + ' must declare its own slots');
  }
});
