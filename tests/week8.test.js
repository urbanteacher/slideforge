'use strict';
/* IPDV Week 8, networks and trees (tools/build-ipdv-week8.js), and the three
 * figures it brought (src/figures/bridges.js, network.js, tree.js): the lesson
 * is built in, every live step explains itself, every outside picture has its
 * facts, the drawings are plain SVG, and the data the figures draw is the
 * data the lecture states. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(ROOT, 'assets/lesson/ipdv/week8');

function lesson(key) {
  const context = { window: { SF: { LESSONS: [], LIBRARY_SEED_KEYS: {} } } };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js/lessons-ipdv-week8.js'), 'utf8'), context);
  return { lesson: context.window.SF.LESSONS.find((l) => l.key === key), seeds: context.window.SF.LIBRARY_SEED_KEYS };
}

test('Week 8 is built in, in the Northeastern folder, with a student copy', () => {
  const { lesson: l, seeds } = lesson('ipdv-net-w8');
  assert.ok(l, 'the lecture is built in');
  assert.equal(seeds['ipdv-net-w8'], 'nul');
  assert.equal(seeds['ipdv-net-w8-student'], 'nul');
  assert.ok(l.slides.length >= 45);
  assert.match(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), /js\/lessons-ipdv-week8\.js/);
});

test('every live figure is one SlideForge draws, and every step says why', () => {
  const { lesson: l } = lesson('ipdv-net-w8');
  const index = fs.readFileSync(path.join(ROOT, 'src/figures/index.js'), 'utf8');
  const figures = l.slides.filter((s) => s.type === 'figure');
  assert.ok(figures.length >= 8);
  for (const s of figures) {
    assert.match(index, new RegExp(`\\b${s.figure}: ${s.figure}\\b`), `${s.figure} is registered`);
    s.figureSteps.forEach((st, i) => {
      assert.ok(String(st.caption || '').trim(), `${s.title} step ${i + 1} has a caption`);
      assert.ok(String(st.explain || '').trim(), `${s.title} step ${i + 1} has a Why?`);
    });
  }
});

test('outside pictures carry a red title and their facts; statements carry their words', () => {
  const { lesson: l } = lesson('ipdv-net-w8');
  for (const s of l.slides) {
    if (s.type === 'image' && /\/orig-/.test(s.image)) {
      assert.equal(s.design.capStyle, 'top', `${s.title}: the title above`);
      assert.ok(String(s.body || '').split('\n').length >= 2, `${s.title}: facts on the back`);
    }
    if (s.type === 'statement') assert.ok(String(s.body || '').trim(), `${s.title}: words in body`);
    if (s.image) assert.ok(fs.existsSync(path.join(ROOT, s.image)), `${s.image} exists`);
  }
});

test('the drawings are plain SVG: no foreignObject, no bare &', () => {
  for (const f of fs.readdirSync(DIR).filter((n) => n.endsWith('.svg'))) {
    const svg = fs.readFileSync(path.join(DIR, f), 'utf8');
    assert.ok(!/<foreignObject/i.test(svg), `${f}: foreignObject`);
    assert.ok(!/&(?![a-z]+;|#\d+;)/i.test(svg), `${f}: a bare &`);
  }
});

test('the numbers the lecture says out loud are the data\'s', () => {
  const tube = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/ipdv-week8/data/tube.json'), 'utf8'));
  assert.equal(tube.stations.find((s) => s.name === "King's Cross St. Pancras").lines.length, 6, "King's Cross joins six lines");
  const mis = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/ipdv-week8/data/miserables.json'), 'utf8'));
  const valjean = mis.nodes.findIndex((n) => n.name === 'Valjean');
  const near = new Set(mis.links.flatMap((l) => (l.source === valjean ? [l.target] : l.target === valjean ? [l.source] : [])));
  assert.equal(near.size, 36, 'Valjean shares scenes with 36 characters');
  const b = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/ipdv-week8/data/boroughs.json'), 'utf8')).boroughs;
  assert.equal(b.length, 33);
  assert.equal(b.slice().sort((x, y) => y.population - x.population)[0].borough, 'Croydon', 'Croydon is the largest borough');
});

test('Königsberg: degrees 5, 3, 3, 3, and the walk on the slide gets stuck after six', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/figures/bridges.js'), 'utf8');
  const bridges = [...src.matchAll(/\{ a: '([NSIE])', b: '([NSIE])', x:/g)].slice(0, 7).map((m) => [m[1], m[2]]);
  const deg = { N: 0, S: 0, I: 0, E: 0 };
  bridges.forEach(([a, b]) => { deg[a]++; deg[b]++; });
  assert.deepEqual(deg, { N: 3, S: 3, I: 5, E: 3 });
  const { lesson: l } = lesson('ipdv-net-w8');
  const step = l.slides.find((s) => s.figure === 'bridges').figureSteps.find((s) => s.walk);
  let here = step.from;
  const used = [];
  for (const n of step.walk) {
    const [a, b] = bridges[n - 1];
    assert.ok(a === here || b === here, `bridge ${n} leaves ${here}`);
    here = a === here ? b : a; used.push(n - 1);
  }
  const left = bridges.map((_, i) => i).filter((i) => !used.includes(i) && bridges[i].includes(here));
  assert.deepEqual(left, [], 'no bridge left from where the walk ends');
});

test('no card slide holds more than four cards: the Lesson studio draws four and drops the rest', () => {
  const { lesson: l } = lesson('ipdv-net-w8');
  for (const s of l.slides.filter((x) => x.type === 'cards')) {
    assert.ok(s.bullets.length <= 4, `${s.title}: ${s.bullets.length} cards`);
  }
});
