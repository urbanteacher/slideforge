'use strict';
/* The AI stadium (src/figures/stadium.js) and the Youth Charter lesson that
 * plays it: every step names a zone the figure draws, and every zone the
 * lesson describes says what the AI does, who decides, the catch and a
 * question for the room. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const DRAWN = ['gates', 'control', 'stands', 'pitch', 'dugout', 'medical', 'tv', 'grounds', 'training', 'scouting', 'business', 'home'];

function lesson(key) {
  const context = { window: { SF: { LESSONS: [], LIBRARY_SEED_KEYS: {} } } };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js/lessons-youth-charter.js'), 'utf8'), context);
  return { lesson: context.window.SF.LESSONS.find((l) => l.key === key), seeds: context.window.SF.LIBRARY_SEED_KEYS };
}

test('the figure draws every zone the lesson names, in the same order', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/figures/stadium.js'), 'utf8');
  const ids = [...src.matchAll(/\{ id: '([a-z]+)', box:/g)].map((m) => m[1]);
  assert.deepEqual(ids, DRAWN);
});

test('The AI stadium: every map step is a zone, and every zone is complete', () => {
  const { lesson: l, seeds } = lesson('yc-premier-league-ai');
  assert.ok(l, 'the lesson is built in');
  assert.equal(seeds['yc-premier-league-ai'], 'youth-charter', 'filed in the Youth Charter folder');
  const maps = l.slides.filter((s) => s.type === 'figure');
  assert.equal(maps.length, 2, 'inside the ground, then beyond it');
  const visited = new Set();
  maps.forEach((s) => {
    assert.equal(s.figure, 'stadium');
    const zones = s.figureData.zones;
    assert.deepEqual(Object.keys(zones).sort(), [...DRAWN].sort());
    for (const [id, z] of Object.entries(zones)) for (const k of ['name', 'does', 'decides', 'risk', 'ask']) assert.ok(String(z[k] || '').trim(), `${id} has its ${k}`);
    s.figureSteps.forEach((st) => {
      assert.ok(st.zone === 'all' || st.zone === 'cloud' || DRAWN.includes(st.zone), `step ${st.zone} is a zone`);
      visited.add(st.zone);
    });
  });
  assert.deepEqual(DRAWN.filter((id) => !visited.has(id)), [], 'the two maps visit every zone');
});
