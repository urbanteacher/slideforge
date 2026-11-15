'use strict';
/* IPDV Week 10, visualisation for machine learning (tools/build-ipdv-week10.js): the lesson is built in, every
 * Build-it shows the picture its code drew, the drawings are plain SVG, the numbers said out loud are the ones
 * steps.py computed from the songs, the lab notebooks are there, and the lesson stays small enough to load. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(ROOT, 'assets/lesson/ipdv/week10');
const FILE = path.join(ROOT, 'js/lessons-ipdv-week10.js');
const FACTS = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/ipdv-week10/data/facts.json'), 'utf8'));

function lesson(key) {
  const context = { window: { SF: { LESSONS: [], LIBRARY_SEED_KEYS: {} } } };
  vm.runInNewContext(fs.readFileSync(FILE, 'utf8'), context);
  return { lesson: context.window.SF.LESSONS.find((l) => l.key === key), seeds: context.window.SF.LIBRARY_SEED_KEYS };
}
const words = (s) => JSON.stringify([s.title, s.subtitle, s.body, s.bullets, s.figureData && s.figureData.rows, s.figureSteps]);

test('Week 10 is built in, in the Northeastern folder, with a student copy', () => {
  const { lesson: l, seeds } = lesson('ipdv-ml-w10');
  assert.ok(l, 'the lecture is built in');
  assert.equal(seeds['ipdv-ml-w10'], 'nul');
  assert.equal(seeds['ipdv-ml-w10-student'], 'nul');
  assert.ok(l.slides.length >= 40);
  assert.match(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), /js\/lessons-ipdv-week10\.js/);
});

test('it stays small enough to load with every page (under 1 MB)', () => {
  assert.ok(fs.statSync(FILE).size < 1024 * 1024, `${Math.round(fs.statSync(FILE).size / 1024)} KB`);
});

test('every Build-it shows the picture its code drew, and the library way comes before its Altair build', () => {
  const { lesson: l } = lesson('ipdv-ml-w10');
  const steps = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/ipdv-week10/code/steps.json'), 'utf8')).steps;
  const { LAB_ONLY } = require(path.join(ROOT, 'tools/ipdv-week10/lesson.js'));
  const BUILD_ITS = fs.readFileSync(path.join(DIR, 'week10_build_its.py'), 'utf8');
  const at = (id) => l.slides.findIndex((s) => s.image === `assets/lesson/ipdv/week10/build-${id}.svg`);
  for (const st of steps) {
    assert.ok(fs.existsSync(path.join(DIR, `code-${st.id}.png`)), `code-${st.id}.png`);
    if (LAB_ONLY.includes(st.id)) assert.ok(BUILD_ITS.includes(st.code.trim().split('\n')[0]), `${st.id} is in week10_build_its.py`);
    else assert.ok(at(st.id) >= 0, `a slide shows build-${st.id}`);
    for (const name of st.new) assert.ok(st.code.includes(name), `${st.id}: ${name} is in its code`);
  }
  assert.ok(at('lib-look') < at('look') && at('lib-confusion') < at('confusion'));
  for (const s of l.slides) {
    if (s.type === 'statement') assert.ok(String(s.body || '').trim(), `${s.title}: words in body`);
    if (s.image) assert.ok(fs.existsSync(path.join(ROOT, s.image)), `${s.image} exists`);
    if (s.type === 'image' && /\/orig-/.test(s.image)) assert.ok(String(s.body || '').split('\n').length >= 2, `${s.title}: facts on the back`);
  }
});

test('the drawings are plain SVG: no foreignObject, no bare &', () => {
  for (const f of fs.readdirSync(DIR).filter((n) => n.endsWith('.svg'))) {
    const svg = fs.readFileSync(path.join(DIR, f), 'utf8');
    assert.ok(!/<foreignObject/i.test(svg), `${f}: foreignObject`);
    assert.ok(!/&(?![a-z]+;|#\d+;)/i.test(svg), `${f}: a bare &`);
  }
});

test('the numbers the lecture says out loud are the ones computed from the songs', () => {
  const { lesson: l } = lesson('ipdv-ml-w10');
  const all = l.slides.map(words).join(' ');
  const pct = (v, d = 0) => `${(v * 100).toFixed(d)}%`;
  for (const said of [FACTS.rows.toLocaleString('en-GB'), FACTS.tracks.toLocaleString('en-GB'), pct(FACTS.accuracy), pct(FACTS.baseline),
    pct(FACTS.alwaysNo, 1), pct(FACTS.hitAccuracy, 1), `found ${FACTS.hitsFoundCount}`]) assert.ok(all.includes(said), `the lecture says ${said}`);
  // the stories the slides tell must still be true of the data
  assert.ok(FACTS.hitAccuracy <= FACTS.alwaysNo, 'the hit model does no better than always saying no');
  assert.ok(FACTS.accuracy > FACTS.logistic && FACTS.logistic > FACTS.baseline);
  assert.deepEqual(FACTS.songs.map((s) => s.genres), [['rap'], ['rock'], ['latin']], 'the opener’s songs keep their one genre');
  assert.equal(Object.keys(FACTS.permutation).pop(), 'liveness', 'liveness matters least');
});

test('the lab is there: the tutorial, the challenge and its solutions, and the data beside them', () => {
  for (const f of ['10_Notebook_IPDV_Machine_Learning.ipynb', '10_Activity_IPDV_Model_Check.ipynb', '10_Activity_IPDV_Model_Check_Solutions.ipynb']) {
    const nb = JSON.parse(fs.readFileSync(path.join(ROOT, 'lessons', f), 'utf8'));
    assert.ok(nb.cells.length > 10, f);
  }
  const student = fs.readFileSync(path.join(ROOT, 'lessons/10_Activity_IPDV_Model_Check.ipynb'), 'utf8');
  const teacher = fs.readFileSync(path.join(ROOT, 'lessons/10_Activity_IPDV_Model_Check_Solutions.ipynb'), 'utf8');
  assert.ok(!/⟦|⟧/.test(student + teacher), 'no blank markers left');
  assert.ok(!/Teacher copy|Marking guide/.test(student), 'the student copy has no answers');
  assert.match(teacher, /Marking guide/);
  for (const f of ['songs.csv', 'week10_build_its.py']) assert.ok(fs.existsSync(path.join(DIR, f)), f);
});
