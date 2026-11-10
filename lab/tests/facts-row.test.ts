// The Status row "Facts to check" (app/factsWarning.ts, CR-36): put right once the facts are, rather than still
// saying there are facts to check at the next show.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import './dom-stand-in';
import { blankDeck } from '../src/core';
import { useStore } from '../src/store';
import { useStatus } from '../src/shell';
import { factsNotice } from '../src/app/factsWarning';

test('the row says the facts are done once none is left', () => {
  const d = blankDeck();
  d.slides[0].factCheck = { note: 'the date' };
  useStore.getState().loadDeck(d);
  assert.match(factsNotice(), /^Facts to check on slide 1/);
  assert.equal(useStatus.getState().jobs.find((j) => j.id === 'facts-to-check')?.state, 'info');
  useStore.getState().updateSlide((s) => { delete s.factCheck; });
  assert.equal(factsNotice(), '');
  const row = useStatus.getState().jobs.find((j) => j.id === 'facts-to-check');
  assert.equal(row?.state, 'done');
  assert.equal(row?.title, 'No facts left to check');
});
