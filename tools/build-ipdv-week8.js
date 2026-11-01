#!/usr/bin/env node
'use strict';

/* Week 8 · Who's connected to whom? Networks and trees (LDSCI6253), built as
 * a portable bundle.
 *
 *   node tools/build-ipdv-week8.js
 *
 * Writes lessons/08_Lecture_IPDV_Networks_Trees.sfbundle.json (and its
 * _STUDENT copy) and js/lessons-ipdv-week8.js, which seeds both into the
 * Northeastern folder. The plan is docs/ipdv-week8-plan.md.
 *
 * The data is in tools/ipdv-week8/data/ (TfL Open Data, ONS estimates, Les
 * Misérables), fetched once by fetch-tube.mjs. The Build-it pictures come
 * from tools/ipdv-week8/code/steps.py, which runs the Altair on the slides:
 * rerun it after changing any code. Everything the deck draws is
 * Northeastern navy, red and warm white, so any other colour is data. */
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

const DIR = 'assets/lesson/ipdv/week8';
const D = require('./ipdv-week8/drawings.js');
const { lesson, STUDENT, REFERENCE } = require('./ipdv-week8/lesson.js');

/* Every drawing is plain SVG: the Lesson studio cannot draw a foreignObject, and a bare & breaks the file. */
function writeSvg(name, svg) {
  if (/<foreignObject/i.test(svg)) throw new Error(`${name}: foreignObject`);
  if (/&(?![a-z]+;|#\d+;)/i.test(svg)) throw new Error(`${name}: a bare &`);
  for (const tag of svg.match(/<[a-zA-Z][^>]*>/g) || []) {
    const names = (tag.match(/\s([a-zA-Z:-]+)=/g) || []).map(a => a.trim());
    const dup = names.find((n, i) => names.indexOf(n) !== i);
    if (dup) throw new Error(`${name}: ${dup} given twice in ${tag.slice(0, 80)}`);
  }
  fs.writeFileSync(path.join(root, DIR, name), svg);
}

/* The Build-it slides: the words say what each new part does, in plain English. */
const BUILDS = {
  nodes: { title: 'The nodes: two small tables', from: 3, words: [
    'edges\tOne row for each edge: the two nodes it joins.',
    'nodes\tWhere to draw each node. We made these numbers up.',
    'mark_circle\tA dot for each node, at its x and y.',
    'mark_text\tThe same chart again, writing each node\'s name.'] },
  links: { title: 'The edges: join, then draw a line', from: 3, words: [
    '.merge(…) twice\tEach edge gets the x and y of its source, then of its target (x2, y2).',
    'mark_rule\tA straight line from (x, y) to (x2, y2): one per edge.',
    'links + dots\tLayers: the lines first, so the dots sit on top.'] },
  tube: { title: 'The Tube, with the same three layers', words: [
    'read_csv\tThe stations and the links, from TfL\'s open data.',
    'scale=None\tUse the colour column as it is: TfL\'s own colours, so colour is data, the line.',
    'lon, lat\tPosition is geography this time, as on Week 7\'s maps.'] },
  matrix: { title: 'A matrix: one mark_rect', words: [
    'pd.concat\tEach pair written both ways round: row a, column b and row b, column a.',
    'mark_rect\tA square for each pair, at row and column.',
    'sort=order\tThe order of the rows: here by name.'] },
  'matrix-grouped': { title: 'One line changes the order', words: [
    'sort_values\tOrder the characters by group, then name. Nothing else changed.',
    'The picture\tThe clusters appear as blocks on the diagonal.'] },
  icicle: { title: 'An icicle: four stacked bars', words: [
    'pd.concat\tThe same 33 boroughs four times, grouped four ways.',
    'sum(population)\tEach level adds up to all of London.',
    'alt.Order\tKeeps each borough under its own area and half.'] }
};

function drawPictures() {
  fs.mkdirSync(path.join(root, DIR), { recursive: true });
  writeSvg('route.svg', D.routeSvg());
  writeSvg('terms.svg', D.termsSvg());
  writeSvg('edge-types.svg', D.edgeTypesSvg());
  writeSvg('three-ways.svg', D.cardsSvg());
  writeSvg('jobs.svg', D.jobsSvg());
  writeSvg('breaks.svg', D.breaksSvg());
  writeSvg('move.svg', D.moveSvg());
  writeSvg('simpler.svg', D.simplerSvg());
  writeSvg('big-tree.svg', D.bigTreeSvg());
  writeSvg('disguise-networks.svg', D.disguiseNetSvg());
  writeSvg('disguise-trees.svg', D.disguiseTreeSvg());
  writeSvg('who.svg', D.whoSvg());
  writeSvg('pairs.svg', D.pairsSvg());
  for (const [id, o] of Object.entries(BUILDS)) writeSvg(`build-${id}.svg`, D.codeSvg(id, o));
}

const withWords = slides => slides.map(s => (s.type === 'statement' && !String(s.body || '').trim() ? { ...s, body: s.title } : s));
/* The teacher sees every slide. Reference slides say in their notes that they can be skipped when time is short. */
const reference = slides => {
  const missing = REFERENCE.filter(t => !slides.some(s => s.title === t));
  if (missing.length) throw new Error(`REFERENCE names no slide: ${missing.join(', ')}`);
  return slides.map(s => (REFERENCE.includes(s.title) ? { ...s, notes: `OPTIONAL: skip if short of time. ${s.notes || ''}` } : s));
};
const SPEC = {
  theme: 'northeastern', org: 'Northeastern University London', logo: 'assets/brand/nu-london-logo.png', logoOn: 'all', logoSize: 'small',
  key: 'ipdv-net', id: 'ipdv-net-2026', week: 8, title: 'LDSCI6253 Week 8 · Who’s connected to whom?',
  file: '08_Lecture_IPDV_Networks_Trees', builtIn: 'js/lessons-ipdv-week8.js', seed: 'ipdv-net-w8', icon: '⋈',
  blurb: 'Networks and trees on London: the Tube as a network, from Euler\'s bridges to Beck\'s map, stored as pairs, drawn as links and as a matrix; the 33 boroughs as a tree, an icicle and a treemap. Live figures to drag and point at, and the Altair for each.',
  slides: reference(withWords(lesson())), student: STUDENT
};

function buildDeck(spec) {
  const deck = SF.makeDeck(spec.title);
  Object.assign(deck, { id: spec.id, theme: spec.theme, libraryGroup: 'nul', sourceKey: spec.key, org: spec.org, logo: spec.logo, logoOn: spec.logoOn, logoSize: spec.logoSize, aspect: '16:9' });
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
    const out = deck.slides[i], where = `slide ${i + 1} (${source.type}: ${source.title})`;
    if (out.type !== source.type) throw new Error(`${where} became ${out.type}`);
    if (source.type === 'figure') {
      if (!SF.Figures || !SF.Figures.kinds.includes(source.figure)) throw new Error(`${where}: no figure "${source.figure}"`);
      if (JSON.stringify(out.figureData || {}) !== JSON.stringify(source.figureData || {})) throw new Error(`${where} changed its figure data`);
      if ((out.figureSteps || []).length !== source.figureSteps.length) throw new Error(`${where} lost figure steps`);
      if (source.figure !== 'reveal') source.figureSteps.forEach((st, k) => { if (!st.explain) throw new Error(`${where}: step ${k + 1} has no explain`); });
    }
    const pictures = [source.image].filter(Boolean);
    for (const p of pictures) if (!fs.existsSync(path.join(root, p))) throw new Error(`${where}: missing ${p}`);
    if (source.type === 'image' && source.design && source.design.capStyle === 'top' && !String(source.body || '').trim()) throw new Error(`${where}: an outside picture needs facts on its back`);
  });
}
function studentCopy(d, rules) {
  const copy = JSON.parse(JSON.stringify(d));
  copy.id = d.id + '-student';
  copy.title = d.title + ' (student copy)';
  const seen = {}, total = {};
  copy.slides.forEach(sl => { total[sl.title] = (total[sl.title] || 0) + 1; });
  copy.slides.forEach(sl => {
    if (REFERENCE.includes(sl.title)) sl.hidden = false;
    const n = (seen[sl.title] = (seen[sl.title] || 0) + 1);
    const rule = (rules.find(([t]) => t === sl.title) || [])[1];
    if (rule === 'none' || (rule === 'last' && n < total[sl.title])) sl.hidden = true;
  });
  return copy;
}

if (!SF.Figures) SF.installFigures(SF);
drawPictures();
const bundle = d => JSON.stringify({ kind: 'slideforge-bundle', version: 1, exported: new Date().toISOString(), decks: [embed(d)], games: [] }, null, 2) + '\n';

const L = SPEC, deck = buildDeck(L);
check(L, deck);
const file = path.join(root, `lessons/${L.file}.sfbundle.json`);
fs.writeFileSync(file, bundle(deck));
const student = studentCopy(deck, L.student);
fs.writeFileSync(path.join(root, `lessons/${L.file}_STUDENT.sfbundle.json`), bundle(student));
const hidden = new Set(student.slides.map((sl, i) => (sl.hidden ? i : -1)).filter(i => i >= 0));
const base = { theme: L.theme, org: L.org, logo: L.logo, logoOn: L.logoOn, logoSize: L.logoSize, libraryGroup: 'nul', kind: 'lecture', minutes: 90, icon: L.icon, games: [] };
const lessons = [
  { ...base, key: L.seed, title: L.title, blurb: L.blurb, slides: L.slides },
  { ...base, key: L.seed + '-student', title: L.title + ' (student copy)', blurb: `The Week ${L.week} lecture with the in-room steps hidden, for handouts and revision.`,
    slides: L.slides.map((sl, i) => ({ ...sl, hidden: hidden.has(i) })) }
];
fs.writeFileSync(path.join(root, L.builtIn), `/* Generated by tools/build-ipdv-week8.js: do not edit by hand, rebuild instead.
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
