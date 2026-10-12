'use strict';
/* The Lesson studio's shipped copies of the built-in lessons (assets/lab-lessons/, js/lab-lessons.js)
 * match the lessons and the converter they were made from. A browser uses a copy only while both
 * match (js/lab-engine.js prebuilt), so a stale one is never shown; it is converted again instead,
 * which is slower. This says when to rebuild: node tools/build-lab-lessons.mjs */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { pathToFileURL } = require('node:url');

const ROOT = path.resolve(__dirname, '..');
const REBUILD = 'run: node tools/build-lab-lessons.mjs';

function shipped() {
  const c = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js', 'lab-lessons.js'), 'utf8'), c);
  return c.window.SF.LAB_LESSONS || {};
}
const CARRIED = Number(/export const CARRIED = (\d+);/.exec(fs.readFileSync(path.join(ROOT, 'lab/src/model/fromSlideForge.ts'), 'utf8'))[1]);

test('each shipped lesson copy is there, and made by the converter version the lab has', () => {
  const all = shipped();
  assert.ok(Object.keys(all).length >= 30, 'the built-in lessons are shipped');
  for (const [key, e] of Object.entries(all)) {
    assert.ok(fs.existsSync(path.join(ROOT, e.file)), `${key}: ${e.file} is missing; ${REBUILD}`);
    assert.equal(e.carried, CARRIED, `${key} was made by converter version ${e.carried}, the lab is at ${CARRIED}; ${REBUILD}`);
    const deck = JSON.parse(fs.readFileSync(path.join(ROOT, e.file), 'utf8'));
    assert.equal(deck.carried, e.carried, `${key}: the file and the list disagree; ${REBUILD}`);
    // Each slide names the one it came from by place, never by this build's ids.
    assert.ok(deck.slides.every((s) => !s.sourceSlideId || /^#\d+$/.test(s.sourceSlideId)), `${key}: a slide names its source by id`);
  }
});

test('each shipped lesson copy was made from the lesson as it is now', async () => {
  const { nodeLessons } = await import(pathToFileURL(path.join(ROOT, 'tools', 'build-lab-lessons.mjs')).href);
  const { hash } = nodeLessons();
  const stale = Object.entries(shipped()).filter(([key, e]) => hash(key) !== e.hash).map(([key]) => key);
  assert.deepEqual(stale, [], `these lessons changed since their copies were made: ${stale.join(', ')}; ${REBUILD}`);
});

test('a lesson’s fingerprint leaves out its ids and times, and nothing else', () => {
  const c = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js', 'lesson-hash.js'), 'utf8'), c);
  const h = c.window.SF.lessonHash;
  const a = { id: 'x', modified: 1, title: 'T', slides: [{ id: 's1', type: 'title', title: 'Hi' }] };
  assert.equal(h(a), h({ title: 'T', slides: [{ title: 'Hi', type: 'title', id: 's2' }], id: 'y', modified: 2 }), 'ids, times and key order do not count');
  assert.notEqual(h(a), h({ ...a, slides: [{ id: 's1', type: 'title', title: 'Hi!' }] }), 'a word counts');
  assert.notEqual(h(a), h({ ...a, slides: [...a.slides, { id: 's3', type: 'title', title: '' }] }), 'a slide counts');
});
