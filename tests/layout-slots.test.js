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
  assert.deepEqual(slots.insertionRegionFor({ type: 'content' }, 1), { col: 9, row: 8, cols: 4, rows: 3 });
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
    assert.ok(Object.keys(SF.layoutRegionsFor(slide)).length, type + ' must declare at least one slot');
  }
  for (const composition of ['poster-art', 'voice', 'ballot', 'prompt', 'rules', 'commitment', 'comparison', 'reveal-map', 'credits', 'lanes']) {
    const regions = SF.layoutRegionsFor({ type: 'title', design: { composition } });
    assert.ok(Object.keys(regions).length, composition + ' must declare its own slots');
  }
});
