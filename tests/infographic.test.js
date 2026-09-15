'use strict';
/* Infographic layouts: stat tiles, versus, funnel, timeline — plus the line
   parser they share. Model-level only; rendering is exercised in the browser. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

/* The model bundle expects a browser-ish window; load js/model.js into a vm
   the same way the other model tests do. */
function loadSF() {
  const store = {};
  const localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  };
  const context = { window: {}, console, localStorage, Date };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.resolve(__dirname, '..', 'js/model.js'), 'utf8'), context);
  return context.window.SF;
}

test('parseInfoLine splits label · value · note on tabs or pipes', async () => {
  const { parseInfoLine, formatInfoLine, infoNumber } = await import('../src/deck/content.js');
  assert.deepEqual(parseInfoLine('Completion\t92%\tup from 81%'), { label: 'Completion', value: '92%', note: 'up from 81%' });
  assert.deepEqual(parseInfoLine('Completion | 92% | up from 81%'), { label: 'Completion', value: '92%', note: 'up from 81%' });
  assert.deepEqual(parseInfoLine('Only a label'), { label: 'Only a label', value: '', note: '' });
  assert.deepEqual(parseInfoLine('a\tb\tc\td'), { label: 'a', value: 'b', note: 'c · d' }, 'extra parts fold into the note');
  assert.deepEqual(parseInfoLine(''), { label: '', value: '', note: '' });
  assert.equal(formatInfoLine('A', 'B', ''), 'A\tB', 'trailing empty fields are dropped');
  assert.equal(formatInfoLine('A', '', 'C'), 'A\t\tC', 'an empty middle field is kept so the note stays in column three');
  assert.equal(infoNumber('92%'), 92);
  assert.equal(infoNumber('£1,240'), 1240);
  assert.equal(infoNumber('4.6 / 5'), 4.6);
  assert.ok(Number.isNaN(infoNumber('n/a')));
});

test('the four infographic types are deck layouts in their own picker group', async () => {
  const { SLIDE_TYPES, LAYOUT_GROUPS, DECK_TYPES, BULLET_LAYOUTS, INFO_LAYOUTS } = await import('../src/deck/content.js');
  assert.deepEqual(INFO_LAYOUTS, ['stats', 'compare', 'funnel', 'timeline']);
  for (const t of INFO_LAYOUTS) {
    assert.ok(SLIDE_TYPES[t], t + ' is a slide type');
    assert.equal(SLIDE_TYPES[t].group, 'infographic');
    assert.ok(DECK_TYPES.includes(t), t + ' can be picked');
    assert.ok(BULLET_LAYOUTS.includes(t), t + ' is a bullet layout, so pits/reorder/bulk paste apply');
    assert.ok(SLIDE_TYPES[t].starters && SLIDE_TYPES[t].starters.length, t + ' has a starter');
  }
  assert.ok(LAYOUT_GROUPS.some(g => g[0] === 'infographic'), 'the picker has an Infographic group');
});

test('makeSlide seeds and normalizeSlide keeps the new types', async () => {
  const { makeSlide, normalizeSlide, INFO_LAYOUTS } = loadSF();
  for (const t of INFO_LAYOUTS) {
    const s = makeSlide(t);
    assert.equal(s.type, t);
    assert.ok(s.title, t + ' seeds a title');
    assert.ok(Array.isArray(s.bullets) && s.bullets.length >= 3, t + ' seeds pits');
    const n = normalizeSlide({ type: t, bullets: ['a\tb\tc'], design: { statStyle: 'ring' } });
    assert.equal(n.type, t, 'normalize does not fall back to content');
    assert.deepEqual(n.bullets, ['a\tb\tc']);
  }
  assert.equal(makeSlide('compare').subtitle, 'Option A | Option B', 'versus seeds its column headings');
});

test('slideSteps reads one beat per infographic element, in presenter form', async () => {
  const { slideSteps, slideExcerpt } = await import('../src/deck/content.js');
  const stats = { type: 'stats', bullets: ['Completion\t92%\tup from 81%', '', 'Median\t14 min'], progressive: true };
  assert.deepEqual(slideSteps(stats), ['Completion · 92% · up from 81%', 'Median · 14 min']);
  const tl = { type: 'timeline', bullets: ['1786\tPlayfair\tBar chart', '1983\tTufte\tData-ink'] };
  assert.equal(slideSteps(tl).length, 2);
  assert.equal(slideExcerpt(tl), '1786 · Playfair · Bar chart\n1983 · Tufte · Data-ink');
  assert.equal(slideExcerpt(stats, 1), 'Completion · 92% · up from 81%', 'progressive excerpt honours the revealed count');
});

test('markdown export keeps infographic content as bullets', async () => {
  const { deckToMarkdown, makeDeck, normalizeDeck } = loadSF();
  const deck = makeDeck('Numbers');
  deck.slides = [{ type: 'stats', title: 'By the numbers', bullets: ['Completion\t92%\tup from 81%'] }];
  const md = deckToMarkdown(normalizeDeck(deck));
  assert.match(md, /By the numbers/);
  assert.match(md, /92%/);
});
