#!/usr/bin/env node
/* Build the Lesson studio's copies of SlideForge's built-in lessons.
 *
 *   node tools/build-lab-lessons.mjs            every built-in lesson the Library offers
 *   node tools/build-lab-lessons.mjs ipdv-ia-w5 just these
 *
 * Each lesson is converted by the lab itself, in a real browser (its figures need one to draw their
 * stills), and written to assets/lab-lessons/<key>.lesson.json; js/lab-lessons.js lists them with
 * each lesson's fingerprint (js/lesson-hash.js) and the converter version. When a browser opens a
 * built-in lesson it has no lab copy of yet, it takes the shipped copy instead of converting
 * (js/lab-engine.js prebuilt), if the lesson's fingerprint and the converter version still match.
 *
 * A lesson the lab cannot build whole is left out and converts in the browser as before; the tool
 * says which. Run it after changing a lesson or bumping the converter (CARRIED): the tests fail
 * until the copies match (tests/lab-lessons.test.js). Needs the lab built (npm --prefix lab run
 * build:app) and Playwright. Starts its own server on a spare port. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'assets', 'lab-lessons');
const only = process.argv.slice(2);
const PORT = 8790 + Math.floor(Math.random() * 100);

/* The lessons as Node sees them, for the fingerprint the tests check: the same scripts, in the
   page's order. The browser's fingerprint must agree, or the tests would check something else. */
export function nodeLessons() {
  const store = {};
  const localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
  const context = { window: {}, console, localStorage, Date };
  context.globalThis = context;
  vm.createContext(context);
  for (const f of ['js/model.js', 'js/lessons.js', 'js/lessons-ipdv-week4.js', 'js/lessons-ipdv-week5.js', 'js/lessons-ipdv-week7.js', 'js/lesson-hash.js']) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), context);
  }
  const SF = context.window.SF;
  return { SF, hash: (key) => { const d = SF.buildLesson(key); return d && d.sourceKey === key ? SF.lessonHash(SF.normalizeDeck(JSON.parse(JSON.stringify(d)))) : null; } };
}

/* A lab deck carries each picture as data in every place it is used: a theme's logo is on every slide.
   The shipped copy keeps each once, in `pictures`, and refers to it as '@picture:<n>'; the lab puts
   them back when it takes the copy (lab/src/embed.ts unpackPictures). */
function packPictures(deck) {
  const pictures = [], at = new Map();
  const walk = (v) => {
    if (typeof v === 'string') {
      if (!v.startsWith('data:') || v.length < 1000) return v;
      if (!at.has(v)) { at.set(v, pictures.length); pictures.push(v); }
      return '@picture:' + at.get(v);
    }
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  const packed = walk(deck);
  if (pictures.length) packed.pictures = pictures;
  return packed;
}

async function main() {
  const server = spawn(process.execPath, ['server/server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const node = nodeLessons();
  const index = {};
  const left = [];
  try {
    await new Promise((r) => setTimeout(r, 800));
    const page = await browser.newPage();
    page.on('pageerror', (e) => console.error('page error:', e.message));
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction(() => window.SF && SF.LabEngine && SF.LabEngine.convertForBuild && SF.lessonHash, null, { timeout: 120000 });
    const keys = (await page.evaluate(() => SF.LESSONS.map((l) => l.key))).filter((k) => !only.length || only.includes(k));
    fs.mkdirSync(OUT, { recursive: true });
    for (const key of keys) {
      const r = await page.evaluate(async (key) => {
        const d = SF.Studio.makeLesson(key);
        if (!d || d.sourceKey !== key) return null; // not one the Library offers
        const hash = SF.lessonHash(SF.normalizeDeck(JSON.parse(JSON.stringify(d))));
        const deck = await SF.LabEngine.convertForBuild(JSON.parse(JSON.stringify(d)));
        const at = new Map(d.slides.map((s, i) => [s.id, i]));
        const made = new Set(deck.slides.map((s) => s.sourceSlideId));
        const missing = d.slides.filter((s) => !made.has(s.id)).map((s) => s.type);
        // Each slide names the slide it came from by place: the ids are this build's alone.
        deck.slides.forEach((s) => { if (s.sourceSlideId && at.has(s.sourceSlideId)) s.sourceSlideId = '#' + at.get(s.sourceSlideId); else delete s.sourceSlideId; });
        delete deck.sourceId;
        deck.id = 'lab-' + key;
        return { hash, deck, missing, carried: deck.carried };
      }, key);
      if (!r) continue;
      if (r.missing.length) { left.push(`${key} (${r.missing.join(', ')})`); continue; }
      const want = node.hash(key);
      if (want !== r.hash) throw new Error(`${key}: the browser's fingerprint ${r.hash} is not Node's ${want}; js/lesson-hash.js must read a lesson the same way in both`);
      const file = `assets/lab-lessons/${key}.lesson.json`;
      fs.writeFileSync(path.join(ROOT, file), JSON.stringify(packPictures(r.deck)));
      index[key] = { file, hash: r.hash, carried: r.carried };
      console.log(`${key}: ${r.deck.slides.length} slides, ${Math.round(fs.statSync(path.join(ROOT, file)).size / 1024)} KB`);
    }
  } finally {
    await browser.close();
    server.kill();
  }
  // Rebuilding some keys keeps the others listed.
  const prev = only.length && fs.existsSync(path.join(ROOT, 'js', 'lab-lessons.js'))
    ? (() => { const c = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js', 'lab-lessons.js'), 'utf8'), c); return c.window.SF.LAB_LESSONS; })() : {};
  const all = { ...prev, ...index };
  const sorted = Object.fromEntries(Object.keys(all).sort().map((k) => [k, all[k]]));
  fs.writeFileSync(path.join(ROOT, 'js', 'lab-lessons.js'), `/* Generated by tools/build-lab-lessons.mjs: do not edit by hand, rebuild instead.
   The Lesson studio's copies of the built-in lessons, converted ahead of time: the file, the lesson's
   fingerprint (js/lesson-hash.js) and the converter version each was made with. js/lab-engine.js
   uses one only while both still match. */
(function (global) {
  'use strict';
  /** @type {any} */
  var SF = global.SF = global.SF || {};
  SF.LAB_LESSONS = ${JSON.stringify(sorted, null, 1)};
})(typeof window !== 'undefined' ? window : globalThis);
`);
  console.log(`js/lab-lessons.js: ${Object.keys(sorted).length} lessons`);
  if (left.length) console.log('Left to convert in the browser (the lab cannot build all of them yet): ' + left.join('; '));
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e); process.exit(1); });
