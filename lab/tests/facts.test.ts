// Facts to check before teaching (BACKLOG CS-03; core/facts.ts): the placeholders left in a slide's words and the
// author's "not yet checked" mark, and what Present says about them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Deck, Slide } from '../src/core';
import { describeFacts, factsOf, factsToCheck, placeholdersOf, sayNumbers } from '../src/core/facts';

const text = (t: string, visible = true) => ({ id: t, kind: 'text', visible, params: { text: t } });
const slide = (id: string, layers: unknown[], extra: Partial<Slide> = {}) =>
  ({ id, name: `S${id}`, background: '', layers, transition: { type: 'none', duration: 0 }, notes: '', ...extra }) as unknown as Slide;

test('a placeholder is square brackets round two or more underscores', () => {
  const s = slide('a', [text('Costs [€__] a year, says [source __].'), text('A list [1] and [_one_] and [x_y] are not.')]);
  assert.deepEqual(placeholdersOf(s), ['[€__]', '[source __]']);
});

test('placeholders are found deep in a layer, once each, but not in hidden layers or notes', () => {
  const cards = { id: 'c', kind: 'cards', visible: true, params: { items: [{ head: 'A [year __]', body: 'B [year __]' }] } };
  const s = slide('a', [cards, text('[gone __]', false)], { notes: 'Check [note __]' });
  assert.deepEqual(placeholdersOf(s), ['[year __]']);
});

test('the deck list: placeholders and marks on shown slides, numbered as the deck counts them', () => {
  const deck = { slides: [
    slide('1', [text('Fine')]),
    slide('2', [text('[n __] people')]),
    slide('3', [text('[x __]')], { hidden: true }),
    slide('4', [text('Goal-line technology from 2013')], { factCheck: { note: 'the 2013 date' } }),
    slide('5', [text('Plain')], { factCheck: { note: '' } }),
  ] } as unknown as Deck;
  const list = factsToCheck(deck);
  assert.deepEqual(list.map((f) => f.number), [2, 4, 5]);
  assert.equal(describeFacts(list), 'Slide 2 (S2): fill [n __]. Slide 4 (S4): check: the 2013 date. Slide 5 (S5): marked as not yet checked.');
});

test('slide numbers read as a sentence', () => {
  assert.equal(sayNumbers([4]), '4');
  assert.equal(sayNumbers([4, 7]), '4 and 7');
  assert.equal(sayNumbers([4, 7, 12]), '4, 7 and 12');
});

test('code on a slide is not a placeholder, and neither are addresses, pictures or a widget\'s page', () => {
  const code = text('class A: def [__init__](self): df["__x"]; [c for c in cols if not c.startswith("__")]; [link __text__](http://x)');
  const widget = { id: 'w', kind: 'widget', visible: true, params: { html: '<p>[year __]</p>' } };
  const pic = { id: 'p', kind: 'image', visible: true, params: { src: 'https://example.org/[__].png', alt: 'A map [place __]' } };
  assert.deepEqual(placeholdersOf(slide('a', [code, widget, pic])), ['[place __]']);
  assert.deepEqual(placeholdersOf(slide('b', [text('Still found: [€__], [year __] and [__].')])), ['[€__]', '[year __]', '[__]']);
});

test('a long run of underscores is read quickly', () => {
  const t = Date.now();
  placeholdersOf(slide('a', [text(`[${'_'.repeat(30_000)}`)]));
  assert.ok(Date.now() - t < 50);
});

test('a "not yet checked" mark of the wrong shape, read from a file, is a mark with nothing said, not a crash', () => {
  for (const fc of [{}, { note: 7 }, { note: null }]) {
    const f = factsOf(slide('a', [], { factCheck: fc as never }), 1);
    assert.equal(f?.note, '', JSON.stringify(fc));
    assert.match(describeFacts([f!]), /marked as not yet checked/);
  }
});
