#!/usr/bin/env node
'use strict';
/* Builds the AI Awareness Day 2027 starters into SlideForge bundles.
 *
 *   node AiAd27/build.js
 *
 * Five decks, three slides each, one theme. Same approach as AiAd26/build.js:
 * everything goes through SF.normalizeDeck so a slide here gets exactly what a
 * slide built in the editor gets, and the checks below fail the build on the
 * things normalize drops silently.
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
const { STARTERS_27 } = require('./starters27.js');

const STAMP = Date.parse('2026-09-16T00:00:00Z');

function buildDeck(starter) {
  return SF.normalizeDeck({
    id: 'aiad27' + starter.key.slice(0, 6).padEnd(6, 'x'),
    title: `${starter.principle} · ${starter.title}`,
    /* One theme per strand. The brief gives each a colour AND an icon, and
       requires that meaning is never carried by colour alone — so the strand
       name and its mark appear together on every slide. See css/aiad27.css. */
    theme: `aiad27-${starter.key}`,
    aspect: '16:9',
    org: 'AI Awareness Day 2027',
    /* The campaign lockup, on the title slide only. Every other slide is
       already stamped by the strand furniture, and the brief asks for one
       strong element per slide rather than several competing. */
    logo: 'assets/brand/aiad27/aiad27-lockup.svg',
    logoOn: 'all',
    logoSize: 'large',
    showSlideNumbers: false,
    finalScores: false,
    created: STAMP,
    modified: STAMP,
    slides: starter.slides.map((s, i) => Object.assign(
      { id: 'a27' + starter.key.slice(0, 4).padEnd(4, 'x') + String(i).padStart(4, '0') }, s))
  });
}

function checkDeck(deck, starter) {
  const problems = [];
  /* The lockup is shared; the strand icon is per theme and is referenced by
     css/aiad27.css rather than by the deck, so both are checked on disk. A
     missing icon is invisible at runtime — the mask simply paints nothing. */
  const wantLogo = 'assets/brand/aiad27/aiad27-lockup.svg';
  const wantIcon = `assets/brand/aiad27/icon-${starter.key}.svg`;
  if (deck.logo !== wantLogo) problems.push(`logo is "${deck.logo}", expected the campaign lockup`);
  [wantLogo, wantIcon].forEach((f) => {
    if (!fs.existsSync(path.join(__dirname, '..', f))) {
      problems.push(`missing: ${f} — run node AiAd27/make-marks.js`);
    }
  });
  if (deck.theme !== `aiad27-${starter.key}`) {
    problems.push(`theme is "${deck.theme}" — did src/model.js register it?`);
  }
  if (deck.logoOn !== 'all') problems.push(`logoOn is "${deck.logoOn}", expected "all"`);
  if (deck.logoReverse) problems.push(`logoReverse is "${deck.logoReverse}"; the ground should decide`);
  /* SEVEN student-facing slides, and they are a fixed sequence: title,
     scenario, choice, discuss, reveal, remember, action. Two more are hidden —
     the teacher page and the vocabulary — because the brief wants teacher
     guidance separate from what students see.

     Pinned rather than counted, because every one of these is load-bearing and
     losing one would be silent. */
  const shown = deck.slides.filter((s) => s.hidden !== true);
  const held = deck.slides.filter((s) => s.hidden === true);
  const want = ['title', 'quote', 'cards', 'statement', null, 'journey', 'keyfact'];

  if (shown.length !== 7) problems.push(`${shown.length} student-facing slides, expected 7`);
  want.forEach((type, i) => {
    /* Slide 5 is the reveal and varies by deck: the five arguments have five
       different shapes, which is the point of it not being pinned. */
    if (type && shown[i] && shown[i].type !== type) {
      problems.push(`slide ${i + 1} is "${shown[i].type}", expected "${type}"`);
    }
  });

  if (held.length !== 2) problems.push(`${held.length} hidden, expected 2`);
  if (!held.some((s) => s.type === 'content')) problems.push('no teacher preparation page');
  if (!held.some((s) => s.type === 'keywords')) problems.push('no vocabulary slide');

  /* Slide 3 carries the vote, and it has to work two ways: as a poll for a
     room with phones, and as cards on the wall for a room without. */
  const choice = shown[2];
  if (choice) {
    if (!SF.slideFeedback(choice)) problems.push('slide 3 has no working poll');
    if ((choice.bullets || []).filter((b) => String(b).trim()).length < 2) {
      problems.push('slide 3 offers fewer than two choices');
    }
  }
  /* Three rules on slide 6, never four: a fourth is one nobody remembers. */
  const rules = shown[5];
  if (rules && (rules.bullets || []).filter((b) => String(b).trim()).length !== 3) {
    problems.push('slide 6 does not carry exactly three rules');
  }

  starter.slides.forEach((src, i) => {
    const out = deck.slides[i];
    if (!out) return;
    const where = `slide ${i + 1} (${src.type})`;
    if (out.type !== src.type) problems.push(`${where}: became "${out.type}"`);
    if (src.progressive === true && out.progressive !== true) {
      problems.push(`${where}: progressive dropped`);
    }
    if (src.feedback && !SF.slideFeedback(out)) {
      problems.push(`${where}: feedback "${src.feedback.kind}" will not present`);
    }
    if ((src.bullets || []).length !== (out.bullets || []).length) {
      problems.push(`${where}: bullet count changed`);
    }
  });
  return problems;
}

function bundle(decks) {
  return {
    kind: 'slideforge-bundle', version: 1,
    exported: new Date(STAMP).toISOString(),
    decks: decks, games: []
  };
}

function main() {
  const outIndex = process.argv.indexOf('--out');
  const outDir = outIndex > -1 && process.argv[outIndex + 1]
    ? process.argv[outIndex + 1] : path.join(__dirname, 'bundles');
  fs.mkdirSync(outDir, { recursive: true });

  const built = [];
  let failed = 0;
  STARTERS_27.forEach((starter) => {
    const deck = buildDeck(starter);
    const problems = checkDeck(deck, starter);
    const name = 'AiAd27-' + starter.principle.charAt(0) + starter.principle.slice(1).toLowerCase();
    fs.writeFileSync(path.join(outDir, name + '.sfbundle.json'),
      JSON.stringify(bundle([deck]), null, 2) + '\n', 'utf8');
    built.push(deck);
    const live = deck.slides.filter((s) => SF.slideFeedback(s)).length;
    const shown = deck.slides.filter((s) => s.hidden !== true);
    const held = deck.slides.filter((s) => s.hidden === true);
    console.log(`${name}.sfbundle.json  —  ${starter.title}`);
    console.log(`    show: ${shown.map((s) => s.type).join(' → ')}`);
    console.log(`    held: ${held.map((s) => s.type).join(' + ')}  ·  ${live} live vote  ·  theme ${deck.theme}`);
    if (problems.length) { failed += problems.length; problems.forEach((p) => console.log(`    !! ${p}`)); }
  });

  fs.writeFileSync(path.join(outDir, 'AiAd27-All-Five.sfbundle.json'),
    JSON.stringify(bundle(built), null, 2) + '\n', 'utf8');
  const total = built.reduce((n, d) => n + d.slides.length, 0);
  const inShow = built.reduce((n, d) => n + d.slides.filter((s) => s.hidden !== true).length, 0);
  console.log(`AiAd27-All-Five.sfbundle.json\n    all five \u2014 ${inShow} slides in the show, ${total - inShow} held back`);
  console.log('    Keep Humans in the Loop \u00b7 Five Minutes to Think');

  if (failed) { console.error(`\n${failed} problem(s).`); process.exit(1); }
  console.log('\nAll five built clean.');
}

module.exports = { buildDeck, checkDeck, STARTERS_27 };
if (require.main === module) main();
