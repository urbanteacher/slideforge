#!/usr/bin/env node
'use strict';

/* Week 5 · Charts that answer back (LDSCI6253): tooltips, interaction,
 * animation and maps, built as a portable bundle.
 *
 *   node tools/build-ipdv-week5.js
 *
 * Writes lessons/05_Lecture_IPDV_Interaction_Maps.sfbundle.json (and its
 * _STUDENT copy) and js/lessons-ipdv-week5.js, which seeds both into the
 * Northeastern folder. The plan is docs/ipdv-week5-plan.md.
 *
 * Two rules from the plan run through every slide:
 *  - See it → Name the mechanics → Build it. A real chart, the four-box
 *    strip (input → parameter → predicate → visual response), then the
 *    Altair, with a footer pointing to the same pattern in the student's
 *    guide (Guides for info vis/alt_Interaction_Animation_guide.ipynb).
 *  - The key moments are live figures (src/render/figures/), not pictures:
 *    the room hovers, drags and watches the chart move.
 * Everything the deck draws is Northeastern navy, red and warm white, so any
 * other colour on screen is data. */
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const memory = new Map();
global.localStorage = {
  getItem: key => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, String(value)),
  removeItem: key => memory.delete(key)
};
global.window = { localStorage: global.localStorage };
require(path.join(root, 'js/model.js'));
const SF = global.window.SF;

const DIR = 'assets/lesson/ipdv/week5';
const asset = name => `${DIR}/${name}`;

/* ---------------------------------------------------------------- pictures and data */

const { routeSvg, aheadSvg } = require('./ipdv-week5/journey.js');
const { strip, anatomy, STRIP, PARTS } = require('./ipdv-week5/drawings.js');
const FIG = require('./ipdv-week5/figures.js');
const { week5, maps } = require('./ipdv-week5/lesson.js');

/* Every drawing is plain SVG: the Lesson studio cannot draw a foreignObject,
   and a bare & breaks the file. */
function writeSvg(name, svg) {
  if (/<foreignObject/i.test(svg)) throw new Error(`${name}: foreignObject`);
  if (/&(?![a-z]+;|#\d+;)/i.test(svg)) throw new Error(`${name}: a bare &`);
  /* An attribute given twice makes the whole file invalid XML, and the picture blank. */
  for (const tag of svg.match(/<[a-zA-Z][^>]*>/g) || []) {
    const names = (tag.match(/\s([a-zA-Z:-]+)=/g) || []).map(a => a.trim());
    const dup = names.find((n, i) => names.indexOf(n) !== i);
    if (dup) throw new Error(`${name}: ${dup} given twice in ${tag.slice(0, 80)}`);
  }
  fs.writeFileSync(path.join(root, DIR, name), svg);
}
function drawPictures() {
  fs.mkdirSync(path.join(root, DIR), { recursive: true });
  /* The route: Weeks 1–5 built one week at a time, then what is still to come, one column at a time. */
  for (let i = 0; i < 5; i++) writeSvg(`route-${i + 1}.svg`, routeSvg(i));
  writeSvg('route.svg', routeSvg(null));
  for (let i = 0; i < 3; i++) writeSvg(`ahead-${i + 1}.svg`, aheadSvg(i));
  writeSvg('ahead.svg', aheadSvg(null));
  writeSvg('route-maps.svg', routeSvg(null, '7'));
  writeSvg('ahead-maps.svg', aheadSvg(null, '7'));
  /* The final piece itself: the students' five-chart infographic (Guides for info vis). */
  const finalPiece = path.join(process.env.HOME || '', 'Desktop/Guides for info vis/alt_Week5_visualisation_infographic.png');
  if (fs.existsSync(finalPiece)) fs.copyFileSync(finalPiece, path.join(root, DIR, 'infographic-final.png'));
  if (!fs.existsSync(path.join(root, DIR, 'infographic-final.png'))) throw new Error('missing infographic-final.png');
  STRIP.forEach((_, i) => writeSvg(`strip-${i + 1}.svg`, strip(i)));
  writeSvg('strip.svg', strip(null));
  PARTS.forEach((_, i) => writeSvg(`anatomy-${i + 1}.svg`, anatomy(i)));
  writeSvg('anatomy.svg', anatomy(null));
  /* The world the map figures fetch: built once, served beside the pictures. */
  fs.writeFileSync(path.join(root, DIR, 'world-110m.json'), JSON.stringify(FIG.geometry()));
}

/* ---------------------------------------------------------------- the lesson */

/* ---------------------------------------------------------------- build */

/* The two lectures: Week 5 (audience, interaction and animation) and Week 7
   (maps), which share the figures, the data and the route drawing. Each gets a
   lecture bundle, a student copy and a built-in lesson. The keys are new for
   the split, so no browser holds a stale copy of either. */
const BASE = {
  theme: 'northeastern', org: 'Northeastern University London',
  logo: 'assets/brand/nu-london-logo.png', logoOn: 'all', logoSize: 'small'
};
const LESSONS = [
  { ...BASE, key: 'ipdv-ia', id: 'ipdv-ia-2026', week: 5, title: 'LDSCI6253 Week 5 · Charts that answer back',
    file: '05_Lecture_IPDV_Interaction_Animation', builtIn: 'js/lessons-ipdv-week5.js', seed: 'ipdv-ia-w5', icon: '✦',
    blurb: 'Target audience, interaction and animation, on Hans Rosling\'s Gapminder world. Every technique is seen in a real chart, its mechanics named, then built in Altair, with live figures the room can hover, click and drag.',
    slides: week5(),
    student: [['One chart at a time', 'last'], ['Then one page', 'last'], ['Every interaction is four boxes', 'last'], ['Tooltip, exploded', 'last'],
      ['Starter: a static chart', 'none'], ['Your turn: one persona, one chart', 'none'], ['Questions?', 'none']] },
  { ...BASE, key: 'ipdv-maps', id: 'ipdv-maps-2026', week: 7, title: 'LDSCI6253 Week 7 · Where in the world? Maps',
    file: '07_Lecture_IPDV_Maps', builtIn: 'js/lessons-ipdv-week7.js', seed: 'ipdv-maps-w7', icon: '◍',
    blurb: 'When a map adds meaning, what every projection distorts, and how to colour a map honestly, with live projections, Greenland at its true size, class breaks that change the story, and the Altair for each.',
    slides: maps(),
    student: [['Name every mechanic', 'none'], ['Questions?', 'none']] }
];

function buildDeck(spec) {
  const deck = SF.makeDeck(spec.title);
  Object.assign(deck, {
    id: spec.id, theme: spec.theme, libraryGroup: 'nul', sourceKey: spec.key,
    org: spec.org, logo: spec.logo, logoOn: spec.logoOn, logoSize: spec.logoSize, aspect: '16:9'
  });
  deck.slides = spec.slides.map((s, i) => Object.assign(SF.makeSlide(s.type), { id: `${spec.key}-${String(i + 1).padStart(3, '0')}` }, s));
  return SF.normalizeDeck(deck);
}
function dataUri(file) {
  const ext = path.extname(file).slice(1).toLowerCase();
  const mime = ext === 'jpg' ? 'jpeg' : ext === 'svg' ? 'svg+xml' : ext;
  return `data:image/${mime};base64,${fs.readFileSync(path.join(root, file)).toString('base64')}`;
}
function embed(value) {
  if (Array.isArray(value)) return value.map(embed);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, embed(v)]));
  if (typeof value === 'string' && /^assets\/.*\.(png|jpe?g|gif|svg|webp)$/i.test(value)) return dataUri(value);
  return value;
}

function check(spec, deck) {
  if (deck.theme !== spec.theme) throw new Error(`theme became ${deck.theme}`);
  if (deck.slides.length !== spec.slides.length) throw new Error('SlideForge did not keep every slide');
  spec.slides.forEach((source, i) => {
    const out = deck.slides[i], where = `slide ${i + 1} (${source.type})`;
    if (out.type !== source.type) throw new Error(`${where} became ${out.type}`);
    if (source.type === 'figure') {
      if (!SF.Figures || !SF.Figures.kinds.includes(source.figure)) throw new Error(`${where}: no figure "${source.figure}"`);
      if (JSON.stringify(out.figureData) !== JSON.stringify(source.figureData)) throw new Error(`${where} changed its figure data`);
      if ((out.figureSteps || []).length !== source.figureSteps.length) throw new Error(`${where} lost figure steps`);
    }
    const pictures = [source.image, source.videoPoster, ...(source.layers || []).map(l => l.image)].filter(Boolean);
    for (const p of pictures) if (!fs.existsSync(path.join(root, p))) throw new Error(`${where}: missing ${p}`);
  });
}

if (!SF.Figures) SF.installFigures(SF);
drawPictures();
const bundle = d => JSON.stringify({ kind: 'slideforge-bundle', version: 1, exported: new Date().toISOString(), decks: [embed(d)], games: [] }, null, 2) + '\n';

/* The student copy: room-only and in-between slides hidden (not removed). */
function studentCopy(d, rules) {
  const copy = JSON.parse(JSON.stringify(d));
  copy.id = d.id + '-student';
  copy.title = d.title + ' (student copy)';
  const seen = {}, total = {};
  copy.slides.forEach(sl => { total[sl.title] = (total[sl.title] || 0) + 1; });
  copy.slides.forEach(sl => {
    const n = (seen[sl.title] = (seen[sl.title] || 0) + 1);
    const rule = (rules.find(([t]) => t === sl.title) || [])[1];
    if (rule === 'none' || (rule === 'last' && n < total[sl.title])) sl.hidden = true;
  });
  return copy;
}

for (const L of LESSONS) {
  const deck = buildDeck(L);
  check(L, deck);
  const file = path.join(root, `lessons/${L.file}.sfbundle.json`);
  fs.writeFileSync(file, bundle(deck));
  const student = studentCopy(deck, L.student);
  fs.writeFileSync(path.join(root, `lessons/${L.file}_STUDENT.sfbundle.json`), bundle(student));
  /* Built in: SlideForge's lesson list and the Northeastern folder's seeds. Slides point at
     the served pictures (assets/lesson/ipdv/week5/), not data URIs. */
  const hidden = new Set(student.slides.map((sl, i) => (sl.hidden ? i : -1)).filter(i => i >= 0));
  const base = { theme: L.theme, org: L.org, logo: L.logo, logoOn: L.logoOn, logoSize: L.logoSize, libraryGroup: 'nul', kind: 'lecture', minutes: 90, icon: L.icon, games: [] };
  const lessons = [
    { ...base, key: L.seed, title: L.title, blurb: L.blurb, slides: L.slides },
    { ...base, key: L.seed + '-student', title: L.title + ' (student copy)', blurb: `The Week ${L.week} lecture with the in-room steps hidden, for handouts and revision.`,
      slides: L.slides.map((sl, i) => (hidden.has(i) ? { ...sl, hidden: true } : sl)) }
  ];
  const builtInFile = path.join(root, L.builtIn);
  fs.writeFileSync(builtInFile, `/* Generated by tools/build-ipdv-week5.js: do not edit by hand, rebuild instead.
   ${L.title}, built into SlideForge's lesson list and seeded into the
   Northeastern folder of every browser's Library. Loaded after js/lessons.js,
   whose LESSONS and LIBRARY_SEED_KEYS it extends. */
(function (root) {
  'use strict';
  var SF = root.SF;
  if (!SF || !SF.LESSONS || !SF.LIBRARY_SEED_KEYS) return;
  var lessons = ${JSON.stringify(lessons)};
  lessons.forEach(function (lesson) {
    if (!SF.LESSONS.some(function (l) { return l.key === lesson.key; })) SF.LESSONS.push(lesson);
    SF.LIBRARY_SEED_KEYS[lesson.key] = 'nul';
  });
})(typeof window !== 'undefined' ? window : globalThis);
`);
  const shown = student.slides.filter(sl => !sl.hidden).length;
  console.log(`Week ${L.week}: ${deck.slides.length} slides (${shown} in the student copy) · ${Math.round(fs.statSync(file).size / 1024)} KB · ${path.relative(root, file)} · ${L.builtIn}`);
}
