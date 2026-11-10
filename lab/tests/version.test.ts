// A lesson's version (core/version.ts, BACKLOG CS-12) and what it needs (core/needs.ts, CS-13).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Deck, Slide } from '../src/core';
import { DECK_VERSION, upgradeDeck, upgradeSteps } from '../src/core/version';
import { lessonNeeds, slideNeeds } from '../src/core/needs';

const slide = (extra: Partial<Slide> = {}, layers: unknown[] = []) => ({ id: 's', name: 'S', background: '', layers, transition: { type: 'none', duration: 0 }, notes: '', ...extra }) as unknown as Slide;
const deck = (version: unknown, slides: Slide[] = [slide()]) => ({ id: 'd', title: 'D', width: 1920, height: 1080, version, slides }) as unknown as Deck;

test('every version below this one has an upgrade step', () => {
  assert.deepEqual(upgradeSteps(), Array.from({ length: DECK_VERSION - 1 }, (_, i) => i + 1));
});

test('an older or unstamped deck is upgraded on a copy; a current one is left alone', () => {
  for (const v of [1, undefined, null, '1']) {
    const d = deck(v);
    const up = upgradeDeck(d);
    assert.equal(up.deck.version, DECK_VERSION);
    assert.equal(up.from, 1);
    assert.equal(up.newer, false);
    assert.notEqual(up.deck, d, 'the deck that came in is not changed');
  }
  const now = deck(DECK_VERSION);
  assert.equal(upgradeDeck(now).deck, now);
});

test('a stamp that cannot be read is not upgraded over: it may be from a studio that writes versions differently', () => {
  for (const v of [0, 2.5, 'x', '', -1, {}]) {
    const d = deck(v);
    const up = upgradeDeck(d);
    assert.equal(up.deck, d, `version ${JSON.stringify(v)} is left as it is`);
    assert.equal(up.newer, true);
    assert.ok(Number.isNaN(up.from));
  }
  // A newer version written as text is still newer, not "unstamped".
  const text = upgradeDeck(deck(String(DECK_VERSION + 1)));
  assert.deepEqual([text.from, text.newer], [DECK_VERSION + 1, true]);
});

test('a deck from a newer studio is left exactly as it is, and said', () => {
  const d = deck(DECK_VERSION + 3);
  const up = upgradeDeck(d);
  assert.equal(up.deck, d);
  assert.deepEqual([up.from, up.newer], [DECK_VERSION + 3, true]);
});

test('a lesson needs a room for its games and activities, and the internet for YouTube and other sites', () => {
  const video = { id: 'v', kind: 'video', name: 'V', visible: true, params: { src: 'https://youtu.be/abc' } };
  const web = { id: 'w', kind: 'image', name: 'W', visible: true, params: { src: 'https://example.org/a.png' } };
  const local = { id: 'l', kind: 'image', name: 'L', visible: true, params: { src: 'data:image/png;base64,AA' } };
  const off = { ...web, id: 'o', visible: false };
  assert.deepEqual(slideNeeds(slide({ game: { id: 'g' } as Slide['game'] })), ['room']);
  assert.deepEqual(slideNeeds(slide({}, [video, local])), ['internet']);
  assert.deepEqual(slideNeeds(slide({}, [local, off])), []);
  const d = deck(DECK_VERSION, [slide(), slide({ activity: { key: 'a', page: 0 } }, [web]), slide({ hidden: true, game: { id: 'g' } as Slide['game'] }), slide({}, [video])]);
  assert.deepEqual(lessonNeeds(d), { room: [2], internet: [2, 4] });
});
