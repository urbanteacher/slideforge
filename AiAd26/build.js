#!/usr/bin/env node
'use strict';
/* Builds the AI Awareness Day 2026 starter decks into SlideForge bundles.
 *
 *   node AiAd26/build.js
 *   node AiAd26/build.js --out /somewhere/else
 *
 * Writes one bundle per principle plus a combined one, into AiAd26/bundles/.
 * Import any of them with File → Import → From a file.
 *
 * The decks are run through SF.normalizeDeck rather than written out by hand,
 * so a slide here gets exactly the same defaults, clamping and field stripping
 * as a slide built in the editor. If a field name below is wrong, normalize
 * drops it and the check at the bottom of this file fails — which is the point
 * of building through the model rather than emitting JSON directly.
 *
 * Follows tools/build-ipdv-lesson.js, which does the same job for the IPDV
 * lecture. The mock window at the top is why: js/model.js is a browser script
 * that hangs itself off window, so it needs one to attach to under node.
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

const { STARTERS } = require('./starters.js');

/* One fixed timestamp for the whole build. Date.now() would give every deck a
   different created/modified pair and make the bundles churn on every rebuild,
   which turns a content diff into a noise diff. */
const STAMP = Date.parse('2026-09-15T00:00:00Z');

/* Deterministic ids. SF.uid() is random, which is right in the app — two
   teachers editing at once must not collide — and wrong here, where rebuilding
   an unchanged deck should produce a byte-identical file. Short, stable, and
   namespaced per deck so no two slides can collide. */
function deckId(key) {
  return 'aiad26' + key.slice(0, 6).padEnd(6, 'x');
}
function slideId(key, i) {
  return 'aiad' + key.slice(0, 4).padEnd(4, 'x') + String(i).padStart(4, '0');
}

function buildDeck(starter) {
  const deck = SF.normalizeDeck({
    id: deckId(starter.key),
    title: `${starter.principle} · ${starter.title}`,
    theme: starter.theme,
    aspect: '16:9',
    org: 'AI Awareness Day 2026',
    /* The campaign badge for this principle, as the deck's mark. One file per
       principle because the five are genuinely different drawings, not one
       shape in five colours — the dark wedge moves and the word takes its own
       angle in each.

       logoReverse 'never' because each badge already contains both grounds: a
       dark wedge with the principle knocked out in white, and the campaign
       line in ink on the colour. The invert css/app.css applies on dark themes
       would flatten all of that to a single white silhouette. */
    logo: `assets/brand/aiad26/aiad26-${starter.key}.svg`,
    logoOn: 'all',
    logoReverse: 'never',
    /* 'large' is 72px. The badge is square and carries the campaign line
       inside it, so it needs the height a wordmark does not — and 72 is the
       ceiling: renderSlide writes the height inline from this field, so a
       stylesheet cannot raise it without !important, and overriding an
       author's own size control from a theme would be the wrong trade. */
    logoSize: 'large',
    showSlideNumbers: false,
    finalScores: false,
    created: STAMP,
    modified: STAMP,
    slides: starter.slides.map((s, i) => Object.assign({ id: slideId(starter.key, i) }, s))
  });

  /* showSlideNumbers is off deliberately: a five-slide starter with "3 / 11"
     in the corner invites the room to work out how long is left instead of
     answering the question in front of them. */
  return deck;
}

/* ------------------------------------------------------------------- checks
 *
 * Cheap assertions that catch the two failure modes that actually happen:
 * a field name the model does not know (silently dropped), and a feedback
 * block that will not present because it is missing a prompt or an option. */
function checkDeck(deck, starter) {
  const problems = [];

  /* The logo is three fields that have to survive together, and two of them
     are not normalised by the model — they ride through on Object.assign, so a
     typo does not error, it just quietly stops being there. */
  const wantLogo = `assets/brand/aiad26/aiad26-${starter.key}.svg`;
  if (deck.logo !== wantLogo) problems.push(`logo is "${deck.logo}", expected "${wantLogo}"`);
  if (!fs.existsSync(path.join(__dirname, '..', wantLogo))) {
    problems.push(`logo file missing on disk: ${wantLogo}`);
  }
  if (deck.logoOn !== 'all') problems.push(`logoOn is "${deck.logoOn}", expected "all"`);
  if (deck.logoReverse !== 'never') {
    problems.push(`logoReverse is "${deck.logoReverse}", expected "never"`);
  }

  if (deck.slides.length !== starter.slides.length) {
    problems.push(`slide count changed: ${starter.slides.length} in, ${deck.slides.length} out`);
  }

  starter.slides.forEach((src, i) => {
    const out = deck.slides[i];
    if (!out) return;
    const where = `slide ${i + 1} (${src.type})`;

    if (out.type !== src.type) {
      problems.push(`${where}: type became "${out.type}" — not a known slide type`);
    }
    if (src.hidden === true && out.hidden !== true) {
      problems.push(`${where}: hidden flag was dropped`);
    }
    if (src.progressive === true && out.progressive !== true) {
      problems.push(`${where}: progressive flag was dropped`);
    }
    if (src.feedback) {
      /* slideFeedback() returns null for anything that will not present —
         no prompt, a poll with fewer than two live options, a scale missing
         an end label. A null here means a silent no-op in the room. */
      if (!SF.slideFeedback(out)) {
        problems.push(`${where}: feedback "${src.feedback.kind}" will not present`);
      } else if (out.feedback.kind !== src.feedback.kind) {
        problems.push(`${where}: feedback kind became "${out.feedback.kind}"`);
      }
    }
    if ((src.bullets || []).length !== (out.bullets || []).length) {
      problems.push(`${where}: bullet count changed`);
    }
  });

  return problems;
}

function bundle(decks) {
  return {
    kind: 'slideforge-bundle',
    version: 1,
    exported: new Date(STAMP).toISOString(),
    decks: decks,
    games: []
  };
}

function write(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function main() {
  const outIndex = process.argv.indexOf('--out');
  const outDir = outIndex > -1 && process.argv[outIndex + 1]
    ? process.argv[outIndex + 1]
    : path.join(__dirname, 'bundles');

  fs.mkdirSync(outDir, { recursive: true });

  const built = [];
  let failed = 0;

  STARTERS.forEach((starter) => {
    const deck = buildDeck(starter);
    const problems = checkDeck(deck, starter);

    const name = 'AiAd26-' + starter.principle.charAt(0) +
      starter.principle.slice(1).toLowerCase();
    write(path.join(outDir, name + '.sfbundle.json'), bundle([deck]));
    built.push(deck);

    const shown = deck.slides.filter((s) => s.hidden !== true).length;
    const notes = deck.slides.filter((s) => String(s.notes || '').trim()).length;
    const live = deck.slides.filter((s) => SF.slideFeedback(s)).length;

    console.log(`${name}.sfbundle.json`);
    console.log(`    ${deck.slides.length} slides — ${shown} in the show, ` +
      `${deck.slides.length - shown} held back as extension`);
    console.log(`    ${notes} carry presenter notes · ${live} carry a live activity`);
    if (problems.length) {
      failed += problems.length;
      problems.forEach((p) => console.log(`    !! ${p}`));
    }
  });

  write(path.join(outDir, 'AiAd26-All-Five.sfbundle.json'), bundle(built));
  console.log('AiAd26-All-Five.sfbundle.json');
  console.log(`    all ${built.length} decks in one import`);

  if (failed) {
    console.error(`\n${failed} problem(s) — see !! above.`);
    process.exit(1);
  }
  console.log('\nAll five decks built clean.');
}

module.exports = { buildDeck, checkDeck, STARTERS };

if (require.main === module) main();
