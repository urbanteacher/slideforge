/* Reduced motion in the lab (lab/src/engine/motion.ts). A computer set to
 * prefers-reduced-motion, a deck set to reduce, or a show told Reduced gets
 * entrances that fade rather than travel, chart experiments that cross-fade
 * rather than morph, and loops and slow zooms that hold still.
 *
 * The engine is the lab's TypeScript, built here with the lab's own Vite as a
 * server bundle, as tests/lab-convert.test.js builds the converter. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');

const LAB = path.resolve(__dirname, '..', 'lab');
const VITE = path.join(LAB, 'node_modules', 'vite', 'bin', 'vite.js');
const skip = fs.existsSync(VITE) ? false : 'the lab has no node_modules to build the engine with';

const built = {};
async function lab(entry) {
  if (built[entry]) return built[entry];
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-lab-motion-'));
  execFileSync(process.execPath, [VITE, 'build', '--ssr', `src/engine/${entry}.ts`, '--outDir', out, '--logLevel', 'error'], { cwd: LAB, stdio: 'pipe' });
  built[entry] = await import(pathToFileURL(path.join(out, `${entry}.js`)).href);
  return built[entry];
}

/* A computer's setting, stood in for: matchMedia is read once, then its answer live. */
const media = { matches: false };
globalThis.matchMedia = (q) => (q === '(prefers-reduced-motion: reduce)' ? media : { matches: false });

async function layer(kind, anim, params = {}) {
  const { defaultAnim } = await lab('anim');
  return { id: 'l1', kind, name: kind, visible: true, locked: false, opacity: 1, blend: 'normal', box: { x: 100, y: 100, w: 600, h: 200, rot: 0 }, params, anim: { ...defaultAnim(), ...anim }, interact: {} };
}

test('the show, the deck and the computer decide together', { skip }, async () => {
  const { reducesMotion } = await lab('motion');
  media.matches = false;
  assert.equal(reducesMotion(undefined), false, 'full motion by default');
  assert.equal(reducesMotion('system', 'reduce'), true, 'a deck set to reduce');
  assert.equal(reducesMotion('reduce'), true, 'a show told Reduced');
  media.matches = true;
  assert.equal(reducesMotion('system'), true, 'a computer set to reduce motion, read live');
  assert.equal(reducesMotion('full', 'reduce'), false, 'only a show told Full overrides it');
  media.matches = false;
});

test('an entrance that travels only fades', { skip }, async () => {
  const { layerState } = await lab('anim');
  for (const type of ['rise', 'slideLeft', 'zoomIn', 'pop', 'spin', 'blur', 'wipeUp']) {
    const l = await layer('shape', { type, duration: 1, easing: 'linear' });
    const full = layerState(l, 0, 0.1, 0.1), calm = layerState(l, 0, 0.1, 0.1, true);
    assert.ok(full.dy || full.dx || full.scale !== 1 || full.rot || full.blur || full.clip[1] > -9 || full.clip[2] < 9, `${type} moves in full motion`);
    assert.deepEqual([calm.dx, calm.dy, calm.scale, calm.rot, calm.blur], [0, 0, 1, 0, 0], `${type} stays in its place`);
    assert.deepEqual(calm.clip, [-9, -9, 9, 9], `${type} is not wiped`);
    assert.ok(calm.opacity > 0 && calm.opacity < 1, `${type} fades in`);
    assert.equal(layerState(l, 0, 5, 5, true).opacity, 1, `${type} arrives`);
  }
});

test('letters and a chart that draws itself arrive together, as one fade', { skip }, async () => {
  const { layerState } = await lab('anim');
  const words = await layer('text', { type: 'words', duration: 0.7, stagger: 0.13 }, { text: 'Two kinds of seeing' });
  assert.ok(Number.isFinite(layerState(words, 0, 0.05, 0.05).textT), 'word by word in full motion');
  const calm = layerState(words, 0, 0.05, 0.05, true);
  assert.equal(calm.textT, Infinity, 'every word drawn at once');
  assert.ok(calm.opacity > 0 && calm.opacity < 1);
  const chart = await layer('chart', { type: 'draw', duration: 0.6, stagger: 0.1 }, { chart: 'column', data: 'A\t1\nB\t2' });
  assert.equal(layerState(chart, 0, 0.2, 0.2, true).textT, Infinity, 'every bar drawn at once');
});

test('loops and a picture’s slow zoom hold still; a zoom to a detail is already there', { skip }, async () => {
  const { layerState } = await lab('anim');
  for (const loop of ['float', 'pulse', 'sway', 'spin', 'breathe']) {
    const l = await layer('shape', { loop, loopSpeed: 1, loopAmount: 1 });
    const a = layerState(l, undefined, Infinity, 3.7, true);
    assert.deepEqual([a.dy, a.scale, a.rot, a.opacity], [0, 1, 0, 1], `${loop} holds still`);
  }
  const zoom = await layer('image', { type: 'none' }, { motion: 'zoom', motionSecs: 20, focus: [0.8, 0.2] });
  assert.notDeepEqual(layerState(zoom, undefined, 10, 10).view, [0.5, 0.5, 1], 'zooms in full motion');
  assert.deepEqual(layerState(zoom, undefined, 10, 10, true).view, [0.5, 0.5, 1], 'the whole picture, still');
  const detail = await layer('image', { type: 'none' }, { motion: 'detail', focus: [0.7, 0.3], zoom: 2 });
  assert.deepEqual(layerState(detail, undefined, 0.1, 0.1, true).view, layerState(detail, undefined, Infinity, 0).view, 'on the detail at once');
});

/* A canvas that records the outline of every mark painted, with the alpha it was painted at. */
function recorder() {
  const marks = [];
  let alpha = 1, path = [];
  const stack = [];
  const ctx = new Proxy({}, {
    get(_, k) {
      if (k === 'globalAlpha') return alpha;
      if (k === 'save') return () => stack.push(alpha);
      if (k === 'restore') return () => { alpha = stack.pop() ?? 1; };
      if (k === 'beginPath') return () => { path = []; };
      if (k === 'moveTo' || k === 'lineTo') return (x, y) => path.push(`${x.toFixed(1)},${y.toFixed(1)}`);
      if (k === 'fill') return () => { if (path.length > 2) marks.push({ at: path.join(' '), alpha }); };
      if (k === 'measureText') return (s) => ({ width: String(s).length * 10, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 });
      return () => {};
    },
    set(_, k, v) { if (k === 'globalAlpha') alpha = v; return true; },
  });
  return { ctx, marks };
}

test('a chart experiment cross-fades between its states rather than morphing', { skip }, async () => {
  const { drawExperiment } = await lab('experiment');
  const draw = (p) => { const r = recorder(); drawExperiment(r.ctx, 1600, 700, { preset: 'polling', ...p }); return r.marks; };
  const before = new Set(draw({ _step: 0 }).map((m) => m.at)), after = new Set(draw({ _step: 1 }).map((m) => m.at));
  assert.ok(before.size && after.size);
  const morph = draw({ _step: 1, _from: 0, _k: 0.5 });
  assert.ok(morph.some((m) => !before.has(m.at) && !after.has(m.at)), 'in full motion the pie’s wedges pass through shapes of their own');
  const fade = draw({ _step: 1, _from: 0, _k: 0.5, _fade: 1 });
  assert.ok(fade.every((m) => before.has(m.at) || after.has(m.at)), 'reduced, every mark is the old picture’s or the new one’s');
  assert.ok(fade.some((m) => before.has(m.at) && !after.has(m.at) && m.alpha < 1), 'the old picture fading out');
  assert.ok(fade.some((m) => after.has(m.at) && !before.has(m.at) && m.alpha < 1), 'the new one fading in');
});
