// A lesson saved by a newer studio (core/version.ts, BACKLOG CS-12, CR-04): the studio opens it exactly as it came,
// with no repairs or refit, and the autosave does not write over it, so nothing that studio added is lost.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DECK_VERSION, blankDeck, type Deck } from '../src/core';

// The store and the save path draw text, so they reach for a canvas as they load; a bare stand-in is enough here.
const ctx = new Proxy({}, { get: () => () => ({ width: 0 }) });
(globalThis as { document?: unknown }).document ??= { createElement: () => ({ getContext: () => ctx, style: {} }), fonts: undefined };
const { useStore } = await import('../src/store');
const { notSavedWhy } = await import('../src/app/embed');

test('a deck from a newer studio is opened as it came, and not saved here', () => {
  const d = { ...blankDeck(), version: DECK_VERSION + 1, theme: 'paper', future: { kept: true } } as Deck & { future: unknown };
  const before = JSON.stringify(d);
  useStore.getState().loadDeck(d);
  const st = useStore.getState();
  assert.equal(st.deck, d, 'the very deck that came in');
  assert.equal(JSON.stringify(st.deck), before, 'nothing repaired, pinned or refitted');
  assert.equal(st.deckTooNew, DECK_VERSION + 1);
  assert.match(notSavedWhy(st.deck), /newer version of the studio/);
});

test('a current deck opens as usual and is saved', () => {
  useStore.getState().loadDeck(blankDeck());
  const st = useStore.getState();
  assert.equal(st.deckTooNew, null);
  assert.equal(st.deck.version, DECK_VERSION);
  assert.equal(notSavedWhy(st.deck), '');
});
