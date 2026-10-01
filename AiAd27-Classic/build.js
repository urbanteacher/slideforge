#!/usr/bin/env node
'use strict';
/* Builds the 2026 lessons in their 2027 styling into SlideForge bundles.
 *
 *   node AiAd27-Classic/build.js
 *
 * Same route as AiAd26/build.js and AiAd27/build.js: every deck goes through
 * SF.normalizeDeck, so a slide here gets what a slide built in the editor
 * gets, and the checks fail the build on what normalize drops silently.
 *
 * What is new here is `run` (see starters.js). It is stripped before
 * normalising, written at the top of the slide's presenter notes, and kept in
 * bundles/run.json for export.mjs, which numbers the steps against the PDF.
 */
const fs = require('node:fs');
const path = require('node:path');

const store = new Map();
const localStorage = {
  getItem: (k) => store.get(k) || null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};
global.window = { localStorage: localStorage };
global.localStorage = localStorage;

require(path.join(__dirname, '..', 'js', 'model.js'));
const SF = global.window.SF;
const { LESSONS } = require('./starters.js');
const { DECK_SETTINGS } = require('../AiAd27/deck-settings.js');

const STAMP = Date.parse('2026-10-01T00:00:00Z');

/** "45 sec", "1 min", "1 min 30 sec", "5 min". */
function clock(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (!m) return `${s} sec`;
  return s ? `${m} min ${s} sec` : `${m} min`;
}

const slugOf = (lesson) => lesson.slug || lesson.key;
const nameOf = (lesson) => slugOf(lesson).charAt(0).toUpperCase() + slugOf(lesson).slice(1);

/* The steps, in show order: one per slide carrying `run`, with a following
   `run.with: 'previous'` slide folded into it. `slides` holds the deck slide
   indexes each step covers, for export.mjs to turn into PDF page numbers. */
function stepsOf(lesson) {
  const steps = [];
  lesson.slides.forEach((s, i) => {
    if (s.hidden === true || !s.run) return;
    if (s.run.with === 'previous' && steps.length) {
      steps[steps.length - 1].slides.push(i);
      return;
    }
    steps.push(Object.assign({ slides: [i] }, s.run));
  });
  return steps;
}

function buildDeck(lesson) {
  const steps = stepsOf(lesson);
  const stepAt = new Map();
  steps.forEach((step, n) => step.slides.forEach((i) => stepAt.set(i, n)));

  const slides = lesson.slides.map((src, i) => {
    const slide = Object.assign({}, src);
    delete slide.run;
    /* The run sheet line heads the presenter notes, so the teacher in the
       room and the page on the website read the same step. Numbered by step,
       not slide: the PDF adds a voting page after each poll, so its page
       numbers are not the deck's. */
    if (stepAt.has(i) && steps[stepAt.get(i)].slides[0] === i) {
      const n = stepAt.get(i);
      const step = steps[n];
      const head = [`STEP ${n + 1} OF ${steps.length} · ${clock(step.time).toUpperCase()}`, step.step];
      if (step.pupils) head.push(`Pupils: ${step.pupils}`);
      if (step.tip) head.push(`Tip: ${step.tip}`);
      slide.notes = head.join('\n') + (src.notes ? '\n\n' + src.notes : '');
    }
    return Object.assign({ id: 'a27c' + slugOf(lesson).slice(0, 4).padEnd(4, 'x') + String(i).padStart(4, '0') }, slide);
  });

  return SF.normalizeDeck({
    id: 'aiad27c' + slugOf(lesson).slice(0, 5).padEnd(5, 'x'),
    title: `${lesson.principle} · ${lesson.title}`,
    theme: `aiad27-${lesson.key}`,
    aspect: '16:9',
    ...DECK_SETTINGS,
    /* Off, as in 2026: the count includes the held-back slides, so the room
       would see "4 / 14" in a deck that shows nine. */
    showSlideNumbers: false,
    finalScores: false,
    created: STAMP,
    modified: STAMP,
    slides: slides
  });
}

function checkDeck(deck, lesson) {
  const problems = [];
  if (deck.theme !== `aiad27-${lesson.key}`) problems.push(`theme is "${deck.theme}"`);
  ['assets/brand/aiad27/aiad27-lockup.svg', `assets/brand/aiad27/poster-${lesson.key}.svg`].forEach((f) => {
    if (!fs.existsSync(path.join(__dirname, '..', f))) problems.push(`missing ${f}`);
  });

  lesson.slides.forEach((src, i) => {
    const out = deck.slides[i];
    const where = `slide ${i + 1} (${src.type})`;
    if (!out) { problems.push(`${where}: missing`); return; }
    if (out.type !== src.type) problems.push(`${where}: became "${out.type}"`);
    if (src.hidden === true && out.hidden !== true) problems.push(`${where}: hidden flag dropped`);
    if (src.progressive === true && out.progressive !== true) problems.push(`${where}: progressive dropped`);
    if ((src.bullets || []).length !== (out.bullets || []).length) problems.push(`${where}: bullet count changed`);
    if (src.feedback && !SF.slideFeedback(out)) problems.push(`${where}: feedback "${src.feedback.kind}" will not present`);
    if (src.image && out.image !== src.image) problems.push(`${where}: image dropped`);

    /* The 2027 compositions: an A–D ballot holds four cards, and the rules
       slide holds three. More than that falls off the slide. */
    if (src.type === 'cards' && (src.bullets || []).length > 4) problems.push(`${where}: ${src.bullets.length} cards, the ballot holds 4`);
    if (src.type === 'journey' && (src.bullets || []).length !== 3) problems.push(`${where}: ${src.bullets.length} rules, expected 3`);

    /* Every slide the room sees is a teacher step, so the website can show
       all of them and run its lesson clock. */
    if (src.hidden !== true) {
      if (!src.run) problems.push(`${where}: shown but has no run step`);
      else if (src.run.with !== 'previous' && !(src.run.time > 0 && String(src.run.step || '').trim())) {
        problems.push(`${where}: run step needs both words and a time`);
      }
    }
  });
  return problems;
}

function main() {
  const outDir = path.join(__dirname, 'bundles');
  fs.mkdirSync(outDir, { recursive: true });

  const built = [];
  const runs = [];
  let failed = 0;

  LESSONS.forEach((lesson) => {
    const deck = buildDeck(lesson);
    const problems = checkDeck(deck, lesson);
    const steps = stepsOf(lesson);
    const total = steps.reduce((n, s) => n + s.time, 0);
    const name = 'AiAd27-Classic-' + nameOf(lesson);

    fs.writeFileSync(path.join(outDir, name + '.sfbundle.json'),
      JSON.stringify({ kind: 'slideforge-bundle', version: 1, exported: new Date(STAMP).toISOString(), decks: [deck], games: [] }, null, 2) + '\n');
    built.push(deck);
    runs.push({
      file: name,
      wp: lesson.wp,
      kind: lesson.kind,
      title: lesson.title,
      principle: lesson.principle,
      prep: lesson.prep,
      steps: steps.map((s) => ({
        slides: s.slides,
        action: s.step,
        duration: clock(s.time),
        seconds: s.time,
        student_action: s.pupils || '',
        teacher_tip: s.tip || ''
      }))
    });

    const shown = deck.slides.filter((s) => s.hidden !== true).length;
    console.log(`${name}.sfbundle.json  —  ${lesson.title}`);
    console.log(`    ${shown} slides in the show, ${deck.slides.length - shown} held back · ${steps.length} steps · ${clock(total)}`);
    if (problems.length) { failed += problems.length; problems.forEach((p) => console.log(`    !! ${p}`)); }
  });

  fs.writeFileSync(path.join(outDir, 'AiAd27-Classic-All.sfbundle.json'),
    JSON.stringify({ kind: 'slideforge-bundle', version: 1, exported: new Date(STAMP).toISOString(), decks: built, games: [] }, null, 2) + '\n');
  fs.writeFileSync(path.join(outDir, 'run.json'), JSON.stringify(runs, null, 2) + '\n');
  console.log(`AiAd27-Classic-All.sfbundle.json — all ${built.length} decks in one import`);

  if (failed) { console.error(`\n${failed} problem(s).`); process.exit(1); }
  console.log('\nAll built clean.');
}

module.exports = { buildDeck, checkDeck, stepsOf, LESSONS };
if (require.main === module) main();
