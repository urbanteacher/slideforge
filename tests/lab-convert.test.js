/* A SlideForge lesson converted into the lab, and a lab copy brought up to
 * date when a newer converter can build more of its lesson.
 *
 * The converter is the lab's TypeScript (lab/src/model/fromSlideForge.ts), so
 * it is built here with the lab's own Vite, as a server bundle, and imported.
 * Without the lab's node_modules there is nothing to build it with, and the
 * tests say so rather than failing. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');

const ROOT = path.resolve(__dirname, '..');
const LAB = path.join(ROOT, 'lab');
const VITE = path.join(LAB, 'node_modules', 'vite', 'bin', 'vite.js');
const skip = fs.existsSync(VITE) ? false : 'the lab has no node_modules to build the converter with';

let built = null;
async function converter() {
  if (built) return built;
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-lab-convert-'));
  execFileSync(process.execPath, [VITE, 'build', '--ssr', 'src/model/fromSlideForge.ts', '--outDir', out, '--logLevel', 'error'], { cwd: LAB, stdio: 'pipe' });
  built = await import(pathToFileURL(path.join(out, 'fromSlideForge.js')).href);
  return built;
}

function lesson(key) {
  const store = {};
  const localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  };
  const context = { window: {}, console, localStorage, Date };
  context.globalThis = context;
  vm.createContext(context);
  for (const f of ['js/model.js', 'js/lessons.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), context);
  return JSON.parse(JSON.stringify(context.window.SF.buildLesson(key)));
}

const asData = (d) => ({ key: d.id, title: d.title, theme: d.theme, slides: d.slides, images: new Proxy({}, { get: (_, k) => k }) });
const experiments = (deck) => deck.slides.filter((s) => s.layers.some((l) => l.kind === 'experiment'));

test('Week 2 comes into the lab with its chart experiments, leaving only its games', { skip }, async () => {
  const { deckFromSlideForge, CARRIED } = await converter();
  const src = lesson('ipdv-vc-hybrid');
  const deck = deckFromSlideForge(asData(src), 'nul', { games: '' });
  const want = src.slides.filter((s) => s.type === 'experiment');
  assert.ok(want.length >= 10, 'the lesson still has its experiments');
  assert.equal(experiments(deck).length, want.length, 'every experiment is built');
  assert.equal(deck.slides.length, src.slides.filter((s) => s.type !== 'game').length, 'only the games stay SlideForge’s');
  assert.equal(deck.carried, CARRIED);
  // Each keeps its own preset and, where it has them, its own states.
  want.forEach((s) => {
    const made = deck.slides.find((x) => x.sourceSlideId === s.id);
    const layer = made.layers.find((l) => l.kind === 'experiment');
    assert.equal(layer.params.preset, s.experiment.preset);
    if (s.experiment.states && s.experiment.states.length) assert.deepEqual(JSON.parse(layer.params.states), s.experiment.states);
  });
});

test('a lab copy made before experiments gets them back in place, and a slide its author deleted stays deleted', { skip }, async () => {
  const { deckFromSlideForge, carryDeckMissing, CARRIED } = await converter();
  const src = lesson('ipdv-vc-hybrid');
  const fresh = deckFromSlideForge(asData(src), 'nul', { games: '' });
  // The copy as the old converter left it, plus an author's edits: one ordinary slide deleted.
  const old = JSON.parse(JSON.stringify(fresh));
  old.slides = old.slides.filter((s) => !s.layers.some((l) => l.kind === 'experiment'));
  old.carried = 1;
  const deleted = old.slides.find((s) => src.slides.find((x) => x.id === s.sourceSlideId).type === 'content');
  old.slides = old.slides.filter((s) => s !== deleted);

  const n = carryDeckMissing(old, src.slides, 'nul', 1);
  assert.equal(n, experiments(fresh).length, 'every experiment came in');
  assert.ok(!old.slides.some((s) => s.sourceSlideId === deleted.sourceSlideId), 'the deleted slide is not brought back');
  // In the lesson's order: the same sequence a fresh conversion has, less the deleted slide.
  assert.deepEqual(old.slides.map((s) => s.sourceSlideId), fresh.slides.map((s) => s.sourceSlideId).filter((id) => id !== deleted.sourceSlideId));
  // Framed like their neighbours: the deck's header and footer are on the new slides.
  const added = experiments(old)[0];
  assert.ok(added.layers.some((l) => typeof l.params.hfSlot === 'string'), 'the header and footer are on it');
  // Once brought up to date there is nothing more to take.
  assert.equal(carryDeckMissing(old, src.slides, 'nul', CARRIED), 0);
});

test('a copy too old to know its slides’ sources is left as it is', { skip }, async () => {
  const { deckFromSlideForge, carryDeckMissing } = await converter();
  const src = lesson('ipdv-vc-hybrid');
  const old = deckFromSlideForge(asData(src), 'nul', { games: '' });
  old.slides = old.slides.filter((s) => !s.layers.some((l) => l.kind === 'experiment'));
  old.slides.forEach((s) => { delete s.sourceSlideId; });
  const before = old.slides.length;
  assert.equal(carryDeckMissing(old, src.slides, 'nul', 1), 0);
  assert.equal(old.slides.length, before);
});
