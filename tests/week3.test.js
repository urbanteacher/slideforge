/* Week 3 (data abstraction): its lesson, and the chart-experiment kinds it
 * brought, which are written once in lab/src/engine/experimentKinds.ts and
 * drawn by both engines. Node strips the file's types, so it is imported as is. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const kinds = () => import(path.join(ROOT, 'lab/src/engine/experimentKinds.ts'));

function sf() {
  const store = {};
  const localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
  const context = { window: {}, console, localStorage, Date };
  context.globalThis = context;
  vm.createContext(context);
  for (const f of ['js/model.js', 'js/lessons.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), context);
  return context.window.SF;
}

const texts = (els, prefix) => els.filter((e) => e.tag === 'text' && (e.key || '').startsWith(prefix)).map((e) => e.text);

test('every state of the new demonstrations draws, and no picture repeats a key', async () => {
  const { KIND_PRESETS, KINDS, kindPicture } = await kinds();
  for (const [name, p] of Object.entries(KIND_PRESETS)) {
    for (const st of p.states) {
      const els = kindPicture(p.data, st, '#000');
      if (!KINDS.includes(st.kind)) { assert.equal(els, null, `${name}: ${st.kind} is an older kind`); continue; }
      assert.ok(els.length > 4, `${name} / ${st.label} draws`);
      const keys = els.map((e) => e.key).filter(Boolean);
      assert.equal(new Set(keys).size, keys.length, `${name} / ${st.label}: keys are unique`);
      els.filter((e) => e.pts).forEach((e) => assert.equal(e.pts.length, 64, 'every mark is 64 points, so it can become any other'));
    }
  }
});

test('the fruit table melts long with every value travelling, and its derived totals are the supplied ones', async () => {
  const { KIND_PRESETS, kindPicture } = await kinds();
  const p = KIND_PRESETS.reshape;
  const wide = kindPicture(p.data, p.states[0], '#000'), long = kindPicture(p.data, p.states[3], '#000');
  const cells = (els) => els.filter((e) => /^cell:/.test(e.key || '')).map((e) => e.key + '=' + e.text).sort();
  assert.equal(cells(wide).length, 18);
  assert.deepEqual(cells(long), cells(wide), 'the same 18 values, under the same keys');
  assert.ok(long.some((e) => e.key === 'head:s:0' && e.text === 'April'), 'the April heading drops into a row');
  assert.deepEqual(texts(kindPicture(p.data, p.states[5], '#000'), 'total:'), ['172', '156', '140', '167', '120', '111']);
});

test('the task demonstration’s answers are the table’s', async () => {
  const { KIND_PRESETS, kindPicture } = await kinds();
  const p = KIND_PRESETS.tasks;
  assert.deepEqual(texts(kindPicture(p.data, p.states[0], '#000'), 'aggv:'), ['394', '330', '142']);
  assert.deepEqual(texts(kindPicture(p.data, p.states[1], '#000'), 'val:'), ['65']);
  assert.deepEqual(texts(kindPicture(p.data, p.states[4], '#000'), 'tot:'), ['172', '167', '156', '140', '120', '111'], 'sorted totals');
  const bal = KIND_PRESETS.derive;
  assert.deepEqual(texts(kindPicture(bal.data, bal.states[2], '#000'), 'bal:'), ['8', '-12', '3', '20', '-11', '22']);
  assert.deepEqual(texts(kindPicture(bal.data, bal.states[3], '#000'), 'bal:'), ['8', '-4', '-1', '19', '8', '30']);
});

test('Week 3 builds whole: its checks inline, its experiments known to SlideForge, its pictures on disk', () => {
  const SF = sf();
  const deck = SF.buildLesson('ipdv-da');
  assert.equal(deck.theme, 'northeastern');
  assert.equal(deck.slides.filter((s) => s.type === 'game' && s.gameId).length, 7);
  const ex = deck.slides.filter((s) => s.type === 'experiment');
  assert.deepEqual([...ex.map((s) => s.experiment.preset)], ['nested', 'reshape', 'derive', 'tasks', 'cluster', 'perception', 'rescue3d', 'scales', 'pies', 'units', 'network', 'idioms', 'emoji']);
  deck.slides.forEach((s) => { if (s.image) assert.ok(fs.existsSync(path.join(ROOT, s.image)), s.image); });
  assert.equal(SF.LESSONS.find((l) => l.key === 'ipdv-da').libraryGroup, 'nul');
});

test('a pictogram keeps one icon per row, not just the first four characters', () => {
  const SF = sf();
  const deck = SF.buildLesson('ipdv-da');
  const s = deck.slides.find((x) => x.chartKind === 'pictogram');
  assert.equal(SF.normalizeDeck(deck).slides.find((x) => x.id === s.id).chartIcon, '🐄 🐑 🐖');
});

test('the perception experiment reveals the ratios the room estimated, and its pictures are on disk', async () => {
  const { KIND_PRESETS, kindPicture } = await kinds();
  const p = KIND_PRESETS.perception;
  const revealed = p.states.filter((st) => st.mode !== 'ranking').map((st) => kindPicture(p.data, st, '#000').find((e) => e.key === 'ch:answer').text);
  assert.deepEqual(revealed, ['45%', '65%', '35%', '60%', '50%']);
  assert.ok(!kindPicture(p.data, { ...p.states[0], labels: false }, '#000').some((e) => e.key === 'ch:answer'), 'the phones never see the answer');
  for (const ch of ['position', 'length', 'angle', 'area', 'lightness']) assert.ok(fs.existsSync(path.join(ROOT, `assets/lesson/ipdv/perception-${ch}.svg`)), ch);
});

test('red–green collapses under simulated deuteranopia and blue–orange does not', async () => {
  const { KIND_PRESETS, kindPicture } = await kinds();
  const p = KIND_PRESETS.scales;
  const rgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const gap = (st) => { const els = kindPicture(p.data, st, '#000'); const a = rgb(els.find((e) => e.key === 'cell:0:6').fill), b = rgb(els.find((e) => e.key === 'cell:1:6').fill); return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); };
  const by = (label) => p.states.find((st) => st.label === label);
  assert.ok(gap(by('Diverging')) > 150, 'red and green are far apart to typical vision');
  assert.ok(gap(by('Deuteranopia')) < 30, 'and nearly the same with deuteranopia');
  assert.ok(gap(by('Deuteranopia again')) > 120, 'blue and orange stay apart');
});

test('the lyric network finds the ballads and the club songs from its links alone', async () => {
  const { KIND_PRESETS, kindPicture } = await kinds();
  const p = KIND_PRESETS.network;
  const els = kindPicture(p.data, p.states.find((st) => st.labels), '#000');
  const fill = (w) => { const j = ['love', 'party', 'heart', 'dance', 'baby', 'night'].indexOf(w); return els.find((e) => e.key === `node:${j}`).fill; };
  assert.equal(fill('love'), fill('heart')); assert.equal(fill('love'), fill('baby'));
  assert.equal(fill('party'), fill('dance')); assert.equal(fill('party'), fill('night'));
  assert.notEqual(fill('love'), fill('party'));
});
