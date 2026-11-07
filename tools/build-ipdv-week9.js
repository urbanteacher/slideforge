#!/usr/bin/env node
'use strict';

/* Week 9 · Who drives the story? Narrative and experiential visualisation
 * (LDSCI6253), built as a portable bundle.
 *
 *   node tools/build-ipdv-week9.js
 *
 * Writes lessons/09_Lecture_IPDV_Narrative_Experiential.sfbundle.json (and its
 * _STUDENT copy) and js/lessons-ipdv-week9.js, which seeds both into the
 * Northeastern folder. The plan is docs/ipdv-week9-plan.md.
 *
 * The data is in tools/ipdv-week9/data/no2.json (the London Air Quality
 * Network), fetched once by fetch-air.mjs. The Build-it pictures come
 * from tools/ipdv-week9/code/steps.py, which runs the Altair on the slides:
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

const DIR = 'assets/lesson/ipdv/week9';
const D = require('./ipdv-week9/drawings.js');
const { lesson, STUDENT, REFERENCE, BUILDS } = require('./ipdv-week9/lesson.js');

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

function drawPictures() {
  fs.mkdirSync(path.join(root, DIR), { recursive: true });
  writeSvg('route.svg', D.routeSvg());
  writeSvg('spectrum.svg', D.spectrumSvg());
  writeSvg('martini.svg', D.martiniSvg());
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
  key: 'ipdv-story', id: 'ipdv-story-2026', week: 9, title: 'LDSCI6253 Week 9 · Who drives the story?',
  file: '09_Lecture_IPDV_Narrative_Experiential', builtIn: 'js/lessons-ipdv-week9.js', seed: 'ipdv-story-w9', icon: '❦',
  blurb: 'Narrative and experiential visualisation on London\'s air: guess Marylebone Road\'s NO₂ before you see it, then one chart told by the author (headline, notes, highlight), opened to the reader, and both at once as a martini glass. Ways to make a number felt, and the Altair for each.',
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
  if (typeof value === 'string' && /^\/?assets\/.*\.(png|jpe?g|gif|svg|webp)$/i.test(value)) return dataUri(value.replace(/^\//, ''));
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
      if (!['reveal', 'panels'].includes(source.figure)) source.figureSteps.forEach((st, k) => { if (!st.explain) throw new Error(`${where}: step ${k + 1} has no explain`); });
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
fs.writeFileSync(path.join(root, L.builtIn), `/* Generated by tools/build-ipdv-week9.js: do not edit by hand, rebuild instead.
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
