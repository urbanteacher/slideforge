#!/usr/bin/env node
'use strict';
/* Generates lessons/01_Lecture_IPDV_Introduction.sfbundle.json from the IPDV
 * lesson definition in js/lessons.js.
 *
 *   node tools/build-ipdv-lesson.js
 *   node tools/build-ipdv-lesson.js --out /custom/path
 *
 * The bundle format packages both the presentation deck and its embedded
 * formative quiz so it can be imported via File -> Import -> From a file.
 */
const fs = require('node:fs');
const path = require('node:path');

// Set up mock window and storage for model and lessons runtime
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
require(path.join(__dirname, '..', 'js', 'lessons.js'));

const SF = global.window.SF;

function buildBundle() {
  const spec = (SF.LESSONS || []).find((l) => l.key === 'ipdv-intro');
  if (!spec) {
    throw new Error('ipdv-intro lesson spec not found in SF.LESSONS');
  }

  const deck = SF.buildLesson('ipdv-intro');
  if (!deck) {
    throw new Error('Failed to build ipdv-intro lesson deck');
  }

  // Retrieve any embedded games saved during buildLesson
  const gameIds = new Set();
  deck.slides.forEach((s) => {
    if (s.gameId) gameIds.add(s.gameId);
  });

  const games = Array.from(gameIds).map((id) => SF.GameStore.get(id)).filter(Boolean);

  return {
    kind: 'slideforge-bundle',
    version: 1,
    exported: new Date().toISOString(),
    decks: [SF.normalizeDeck(deck)],
    games: games.map(SF.normalizeGame)
  };
}

module.exports = { buildBundle: buildBundle };

if (require.main === module) {
  const defaultDir = path.join(__dirname, '..', 'lessons');
  const outIndex = process.argv.indexOf('--out');
  const outDir = outIndex > -1 && process.argv[outIndex + 1] ? process.argv[outIndex + 1] : defaultDir;

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const bundle = buildBundle();
  const file = path.join(outDir, '01_Lecture_IPDV_Introduction.sfbundle.json');
  fs.writeFileSync(file, JSON.stringify(bundle, null, 2), 'utf8');

  const deck = bundle.decks[0];
  const notesCount = deck.slides.filter((s) => String(s.notes || '').trim()).length;
  const game = bundle.games[0];

  console.log('Wrote ' + file);
  console.log('  ' + deck.slides.length + ' slides (' + notesCount + ' carrying presenter notes)');
  if (game) {
    console.log('  Embedded game: "' + game.title + '" with ' + game.questions.length + ' questions');
  }
}
