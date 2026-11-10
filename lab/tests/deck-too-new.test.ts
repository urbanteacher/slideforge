// A lesson saved by a newer studio (core/version.ts, BACKLOG CS-12, CR-04): the studio opens it exactly as it came,
// with no repairs or refit, and the autosave does not write over it, so nothing that studio added is lost.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import './dom-stand-in';
import { DECK_VERSION, blankDeck, type Deck } from '../src/core';
import { useStore } from '../src/store';
import { notSavedWhy } from '../src/app/embed';

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
