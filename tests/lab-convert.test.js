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

/* Some layouts size their type by measuring it (lab/src/engine/raster.ts), on a canvas Node does not
   have. A stand-in measures every character at an average width: enough to lay a slide out, and the
   tests below ask where things are and what they are, not how a line breaks. */
function measuringCanvas() {
  if (typeof globalThis.OffscreenCanvas !== 'undefined') return;
  let font = '16px sans-serif';
  const ctx = new Proxy({}, {
    get: (_, k) => k === 'measureText' ? (s) => {
      const px = Number(/(\d+(?:\.\d+)?)px/.exec(font)?.[1] ?? 16);
      const w = String(s).length * px * 0.52;
      return { width: w, actualBoundingBoxAscent: px * 0.8, actualBoundingBoxDescent: px * 0.2, fontBoundingBoxAscent: px * 0.9, fontBoundingBoxDescent: px * 0.25, actualBoundingBoxLeft: 0, actualBoundingBoxRight: w };
    } : k === 'font' ? font : () => undefined,
    set: (_, k, v) => { if (k === 'font') font = String(v); return true; },
  });
  globalThis.OffscreenCanvas = class { constructor(w, h) { this.width = w; this.height = h; } getContext() { return ctx; } };
}

let built = null;
async function converter() {
  if (built) return built;
  measuringCanvas();
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

const art = (slide, name) => slide.layers.find((l) => l.name === 'Theme · ' + name);
const from = (deck, src, type) => deck.slides.filter((s) => { const o = src.slides.find((x) => x.id === s.sourceSlideId); return o && o.type === type; });

test('a NU London lesson wears its theme: the cover’s N, skyline and course line, red section breaks, SlideForge’s frame', { skip }, async () => {
  const { deckFromSlideForge } = await converter();
  const src = lesson('ipdv-vc-hybrid');
  const deck = deckFromSlideForge(asData(src), 'nul', { games: '' });
  const cover = from(deck, src, 'title')[0];
  assert.equal(cover.ground, 'quiet');
  for (const name of ['Ground', 'Skyline', 'N', 'Eyebrow', 'Logo']) assert.ok(art(cover, name), 'the cover has its ' + name);
  assert.equal(art(cover, 'Eyebrow').params.text, src.title.toUpperCase(), 'the course line is the lesson’s name');
  // Behind the words: every piece but the course line and the logo sits under the title.
  const hero = cover.layers.findIndex((l) => l.name === 'Hero');
  assert.ok(cover.layers.indexOf(art(cover, 'N')) < hero && cover.layers.indexOf(art(cover, 'Skyline')) < hero);
  const sections = from(deck, src, 'section');
  assert.ok(sections.length >= 3);
  sections.forEach((s) => { assert.equal(s.ground, 'loud', 'a section break is Northeastern red'); assert.ok(art(s, 'N') && !art(s, 'Skyline')); });
  assert.deepEqual(Object.keys(deck.headerFooter.slots).sort(), ['footer-right', 'header-right'], 'the logo top right and the page bottom right, nothing else');
});

test('an AI Awareness Day strand keeps its own colour, with its rule on every slide and its fold on the cover', { skip }, async () => {
  const { deckFromSlideForge } = await converter();
  const src = lesson('aiad26-smart');
  const deck = deckFromSlideForge(asData(src), 'aiad26', { frame: false, games: '', set: '2' });
  assert.equal(deck.styleGuide.theme.accent, '#ff6734', 'Smart is orange, not Safe’s cyan');
  deck.slides.forEach((s) => assert.equal(art(s, 'Edge').params.fill, '#ff6734'));
  const cover = from(deck, src, 'title')[0];
  assert.ok(art(cover, 'Fold') && art(cover, 'Seam'));
  assert.notEqual(cover.ground, 'quiet', 'the 2026 covers are white');
});

test('UKBT Institute slides carry the waves, the cover its object by place, the section breaks lime', { skip }, async () => {
  const { deckFromSlideForge } = await converter();
  const src = lesson('ukbt-institute-partnership');
  const deck = deckFromSlideForge(asData(src), 'ukbt-institute', { frame: false, games: '' });
  deck.slides.forEach((s) => assert.ok(art(s, 'Waves'), s.name + ' has the waves'));
  const cover = from(deck, src, 'title')[0];
  assert.ok(art(cover, 'Chevron, back') && art(cover, 'Chevron, front') && art(cover, 'Object'));
  from(deck, src, 'section').forEach((s) => assert.equal(art(s, 'Ground').params.color, '#cefd85'));
});

test('an AI Awareness 2027 cover keeps its poster, and its title keeps clear of it', { skip }, async () => {
  const { deckFromSlideForge } = await converter();
  const src = lesson('aiad27-safe');
  const deck = deckFromSlideForge(asData(src), 'aiad27', { frame: false, games: '', set: '1' });
  const cover = from(deck, src, 'title')[0];
  const poster = art(cover, 'Poster');
  assert.ok(poster && /poster/.test(poster.params.src), 'the poster is on the cover');
  assert.equal(cover.ground, 'loud', 'on the strand’s colour');
  const hero = cover.layers.find((l) => l.name === 'Hero');
  assert.ok(hero.box.x + hero.box.w <= poster.box.x, 'the title stops short of the poster');
});

test('a lab copy made before the artwork gets it once, on the slides it belongs to', { skip }, async () => {
  const { deckFromSlideForge, carryDeckArt } = await converter();
  const src = lesson('ipdv-vc-hybrid');
  const fresh = deckFromSlideForge(asData(src), 'nul', { games: '' });
  const old = JSON.parse(JSON.stringify(fresh));
  old.slides.forEach((s) => { s.layers = s.layers.filter((l) => !l.name.startsWith('Theme · ')); });
  const n = carryDeckArt(old, src.slides, { theme: src.theme, title: src.title });
  assert.equal(n, fresh.slides.filter((s) => s.layers.some((l) => l.name.startsWith('Theme · '))).length);
  assert.equal(carryDeckArt(old, src.slides, { theme: src.theme, title: src.title }), 0, 'and only once');
});
