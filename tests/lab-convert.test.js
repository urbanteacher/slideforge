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

/* A lesson as the shell hands it to the lab: with its games compiled by SlideForge (js/lab-engine.js). */
function lessonWithGames(key) {
  const store = {};
  const localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
  const context = { window: {}, console, localStorage, Date, location: { search: '' }, navigator: { webdriver: true }, document: { getElementById: () => null } };
  context.globalThis = context;
  vm.createContext(context);
  for (const f of ['js/model.js', 'js/lessons.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), context);
  context.SF = context.window.SF;
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/lab-engine.js'), 'utf8'), context);
  const SF = context.window.SF;
  const out = JSON.parse(JSON.stringify(SF.LabEngine.lessonGames(SF.buildLesson(key))));
  Object.defineProperty(out, 'SF', { value: SF });
  return out;
}

test('Week 2’s five Checks come into the lab as its own games: each question, then its answer, ready for the room', { skip }, async () => {
  const { deckFromSlideForge } = await converter();
  const src = lessonWithGames('ipdv-vc-hybrid');
  const checks = src.slides.filter((s) => s.type === 'game');
  assert.equal(checks.length, 5);
  assert.equal(Object.keys(src.labGames).length, 5, 'every Check went over compiled');
  const deck = deckFromSlideForge({ ...asData(src), games: src.labGames }, 'nul', { games: '' });
  assert.equal(deck.slides.length, src.slides.length - 5 + 5 * 2, 'every slide, a Check as its question and its answer');
  checks.forEach((c) => {
    const game = SF_GAME(src, c);
    const made = deck.slides.filter((s) => s.sourceSlideId === c.id);
    assert.deepEqual(made.map((s) => s.game && s.game.role), ['question', 'answer'], c.title + ': no cover, as SlideForge plays it');
    const q = made[0].game.quiz;
    assert.equal(q.question, game.question, 'the question the room is asked');
    assert.deepEqual(q.options, game.options);
    assert.equal(q.correct, game.correct, 'and the answer the relay marks');
    assert.equal(made[0].game.label, c.gameTitle || c.title);
    assert.ok(made[1].layers.some((l) => l.kind === 'text' && String(l.params.text).includes(game.explanation.slice(0, 20))), 'the answer says why');
    assert.ok(made[0].notes.includes(c.notes.slice(0, 20)), 'the teacher’s notes come too');
    assert.equal(made[0].transition.type, 'morph', 'a game’s steps keep their morph');
  });
  // In order: each Check where the lesson has it.
  const order = deck.slides.map((s) => s.sourceSlideId).filter((id, i, a) => a.indexOf(id) === i);
  assert.deepEqual(order, src.slides.map((s) => s.id));
});

test('a lab copy made before games were built gets its Checks in place', { skip }, async () => {
  const { deckFromSlideForge, carryDeckMissing } = await converter();
  const src = lessonWithGames('ipdv-vc-hybrid');
  const fresh = deckFromSlideForge({ ...asData(src), games: src.labGames }, 'nul', { games: '' });
  const old = JSON.parse(JSON.stringify(fresh));
  old.slides = old.slides.filter((s) => !s.game);
  const n = carryDeckMissing(old, src.slides, 'nul', 3, undefined, { theme: src.theme, title: src.title }, src.labGames);
  assert.equal(n, 10);
  assert.deepEqual(old.slides.map((s) => s.sourceSlideId), fresh.slides.map((s) => s.sourceSlideId));
});

/** A Check's one question, as SlideForge's game store has it. */
function SF_GAME(src, check) {
  const g = src.labGames[check.gameId];
  return g.slides.find((s) => s.type === 'quiz');
}

test('in the live room, each Check the lab built is SlideForge\u2019s own quiz question, with its answer drawn on reveal', { skip }, async () => {
  const { deckFromSlideForge } = await converter();
  const src = lessonWithGames('ipdv-vc-hybrid');
  const deck = deckFromSlideForge({ ...asData(src), games: src.labGames }, 'nul', { games: '' });
  // What the lab hands the room: a picture of each slide, carrying its game (lab/src/embed.ts stills).
  const stills = deck.slides.map((s) => ({ id: s.id, sourceSlideId: s.sourceSlideId, image: 'still.jpg', notes: s.notes || '', hidden: false, name: s.name, game: s.game }));
  const room = src.SF.labShowSlides(stills).map((it) => it.sf).filter((s) => s && s.type === 'quiz');
  assert.equal(room.length, 5, 'five questions for the phones');
  src.slides.filter((s) => s.type === 'game').forEach((c, i) => {
    const q = SF_GAME(src, c);
    assert.equal(room[i].question, q.question);
    assert.equal(room[i].correct, q.correct, 'marked against the Check\u2019s own answer');
    assert.ok(room[i].design && room[i].design.labStill && room[i].design.labReveal, 'the lab draws the question, and its answer on reveal');
  });
});

test('the Week 2 cover as you left it: your N where you moved it, the date, and the rail along the foot', { skip }, async () => {
  const { deckFromSlideForge } = await converter();
  const src = lesson('ipdv-vc-hybrid');
  // The pose on the Week 2 cover in the Library (Artwork face: the N moved up and left).
  src.slides[0].art = { pictures: [], poses: { 'nu-n': { x: 511, y: 112 } } };
  const deck = deckFromSlideForge(asData(src), 'nul', { games: '' });
  const cover = deck.slides[0];
  assert.deepEqual([art(cover, 'N').box.x, art(cover, 'N').box.y], [511 * 1.5, 112 * 1.5], 'the N sits where it was moved');
  assert.deepEqual([art(cover, 'N').box.w, art(cover, 'N').box.h], [900 * 1.5, 694 * 1.5], 'at its size');
  const date = cover.layers.find((l) => l.name === 'Date');
  assert.equal(date.params.text, '21 September 2026');
  assert.equal(date.params.uppercase, true, 'in NU London’s tracked capitals');
  // The rail on every slide, filled as far as the slide is through the lesson.
  const wide = (s) => art(s, 'Rail, so far').box.w;
  assert.ok(deck.slides.every((s) => art(s, 'Rail')), 'the rail runs along every slide');
  assert.ok(wide(deck.slides[0]) < wide(deck.slides[deck.slides.length - 1]));
  assert.equal(wide(deck.slides[deck.slides.length - 1]), 1920, 'and is full on the last');
});

test('a copy given its artwork earlier takes the new pieces and keeps the ones it has', { skip }, async () => {
  const { deckFromSlideForge, carryDeckArt } = await converter();
  const src = lesson('ipdv-vc-hybrid');
  const old = deckFromSlideForge(asData(src), 'nul', { games: '' });
  old.slides.forEach((s) => { s.layers = s.layers.filter((l) => !/^Theme · Rail/.test(l.name)); });
  const moved = art(old.slides[0], 'N'); moved.box.x = 40;
  carryDeckArt(old, src.slides, { theme: src.theme, title: src.title });
  assert.ok(old.slides.every((s) => art(s, 'Rail')), 'the rail came in');
  assert.equal(art(old.slides[0], 'N').box.x, 40, 'the N the author moved in the lab stays put');
  assert.equal(old.slides[0].layers.filter((l) => l.name === 'Theme · N').length, 1, 'and is not drawn twice');
});

test('a split’s picture comes in as SlideForge shows it: whole, on its side, at its share of the width', { skip }, async () => {
  const { deckFromSlideForge } = await converter();
  const src = lesson('ipdv-vc-hybrid');
  const deck = deckFromSlideForge(asData(src), 'nul', { games: '' });
  const splits = src.slides.filter((s) => s.type === 'split');
  assert.ok(splits.length >= 8);
  splits.forEach((s) => {
    const made = deck.slides.find((x) => x.sourceSlideId === s.id);
    const pic = made.layers.find((l) => l.kind === 'image');
    assert.equal(pic.params.fit, s.imageFit === 'contain' ? 'contain' : 'cover', s.title + ': the picture whole, not cropped');
    assert.equal(pic.box.x === 0, s.imageSide === 'left', s.title + ': on the side SlideForge has it');
    if (s.design.imageShare === 65) assert.equal(pic.box.w, 1248, s.title + ': 65% of the width');
    const words = made.layers.filter((l) => l.kind === 'text' && l.box && !l.params.hfSlot);
    words.forEach((l) => assert.ok(s.imageSide === 'left' ? l.box.x >= pic.box.x + pic.box.w - 1 : l.box.x + l.box.w <= pic.box.x + 1, s.title + ': the words clear of the picture'));
  });
});

test('a game’s question is never more than two lines, however long', { skip }, async () => {
  const { deckFromSlideForge } = await converter();
  const src = lessonWithGames('ipdv-vc-hybrid');
  const deck = deckFromSlideForge({ ...asData(src), games: src.labGames }, 'nul', { games: '' });
  const questions = deck.slides.filter((s) => s.game).map((s) => s.layers.find((l) => l.name === 'Question'));
  assert.equal(questions.length, 10);
  questions.forEach((q) => {
    const lines = (q.box.h - 8) / (q.params.size * q.params.lineHeight);
    assert.ok(lines <= 2.5, `"${q.params.text.slice(0, 40)}…" takes ${lines.toFixed(1)} lines at ${q.params.size}px`);
    // The question takes its options' size (rule 4), and options are never set under 44px.
    assert.ok(q.params.size >= 44, 'and no smaller than its options may be');
  });
});

/* The lab's own measure of how tall words set in a box are (lab/src/engine/raster.ts). */
let measure = null;
async function measurer() {
  if (measure) return measure;
  measuringCanvas();
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-lab-raster-'));
  execFileSync(process.execPath, [VITE, 'build', '--ssr', 'src/engine/raster.ts', '--outDir', out, '--logLevel', 'error'], { cwd: LAB, stdio: 'pipe' });
  measure = (await import(pathToFileURL(path.join(out, 'raster.js')).href)).measureTextHeight;
  return measure;
}

test('beside a picture at 65%, the points fit their column at the lab’s reading size', { skip }, async () => {
  const { deckFromSlideForge } = await converter();
  const measureTextHeight = await measurer();
  const src = lesson('ipdv-vc-hybrid');
  const deck = deckFromSlideForge(asData(src), 'nul', { games: '' });
  const s = src.slides.find((x) => x.design && x.design.imageShare === 65);
  const made = deck.slides.find((x) => x.sourceSlideId === s.id);
  const pic = made.layers.find((l) => l.kind === 'image');
  const points = made.layers.find((l) => l.name === 'Bullet points');
  assert.equal(pic.box.x - (points.box.x + points.box.w), 54, 'the column runs to the grid\u2019s gutter short of the picture');
  const h = measureTextHeight({ ...points.params, size: 36 }, points.box.w);
  assert.ok(h <= points.box.h, `at 36px the points take ${Math.round(h)}px of their ${Math.round(points.box.h)}px`);
  assert.ok(points.box.y + points.box.h <= 1071, 'and stay above the rail');
});

/* Any of the lab's modules, built as the converter is. */
const bundles = {};
async function bundle(entry) {
  if (bundles[entry]) return bundles[entry];
  measuringCanvas();
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-lab-mod-'));
  execFileSync(process.execPath, [VITE, 'build', '--ssr', entry, '--outDir', out, '--logLevel', 'error'], { cwd: LAB, stdio: 'pipe' });
  bundles[entry] = await import(pathToFileURL(path.join(out, path.basename(entry).replace(/\.ts$/, '.js'))).href);
  return bundles[entry];
}

const RIGHT_GREEN = '#1f9d5a';

test('a lesson’s Check comes in as SlideForge showed it: four buttons, the right one lit green, the question at their size', { skip }, async () => {
  const { deckFromSlideForge } = await converter();
  const src = lessonWithGames('ipdv-vc-hybrid');
  const deck = deckFromSlideForge({ ...asData(src), games: src.labGames }, 'nul', { games: '' });
  src.slides.filter((s) => s.type === 'game').forEach((c) => {
    const [ask, answer] = deck.slides.filter((s) => s.sourceSlideId === c.id);
    assert.equal(ask.game.look, 'buttons');
    const q = SF_GAME(src, c);
    const buttons = (s) => q.options.map((_, k) => s.layers.find((l) => l.name === `Button ${k + 1}`));
    buttons(ask).forEach((b) => assert.ok(b && b.params.fill !== RIGHT_GREEN, 'no answer shown while asking'));
    buttons(answer).forEach((b, k) => assert.equal(b.params.fill === RIGHT_GREEN, k === q.correct, 'the right one green, where it stood'));
    // Where it stood: the same box on the question and the answer, so the reveal lights it in place.
    assert.deepEqual(buttons(answer)[q.correct].params.morph, buttons(ask)[q.correct].params.morph);
    const words = ask.layers.find((l) => l.name === 'Button 1 — words');
    assert.equal(ask.layers.find((l) => l.name === 'Question').params.size, words.params.size, 'the question at the buttons’ size');
  });
});

test('the Look switch builds a Check again the other way and keeps what the lesson hangs on it', { skip }, async () => {
  const { deckFromSlideForge } = await converter();
  const { relookGame } = await bundle('src/model/gameLook.ts');
  const src = lessonWithGames('ipdv-vc-hybrid');
  const deck = deckFromSlideForge({ ...asData(src), games: src.labGames }, 'nul', { games: '' });
  const check = src.slides.find((s) => s.type === 'game');
  const before = deck.slides.filter((s) => s.sourceSlideId === check.id);
  const id = before[0].game.id, count = deck.slides.length;
  before[0].game.settings.seconds = 30;
  const made = relookGame(deck, id, 'walls');
  assert.equal(made.length, 2);
  assert.equal(deck.slides.length, count, 'no slide gained or lost');
  const after = deck.slides.filter((s) => s.sourceSlideId === check.id);
  assert.deepEqual(after.map((s) => s.game.look), ['walls', 'walls']);
  assert.ok(after[0].layers.some((l) => l.name === 'Option 1'), 'the rows of the walls');
  assert.equal(after[0].game.id, id, 'still one game in the room');
  assert.equal(after[0].game.settings.seconds, 30, 'its time kept');
  assert.equal(after[0].notes, before[0].notes, 'its notes kept');
  assert.ok(after[0].layers.some((l) => l.name === 'Theme · Rail'), 'its theme’s artwork kept');
  assert.equal(deck.slides.indexOf(after[0]), deck.slides.indexOf(before[0]) === -1 ? deck.slides.indexOf(after[0]) : deck.slides.indexOf(after[0]), 'in its place');
  assert.equal(relookGame(deck, id, 'walls').length, 0, 'already that look: nothing to do');
});
