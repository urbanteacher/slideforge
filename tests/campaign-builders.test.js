'use strict';
/* The two builders must describe the same deck.
 *
 * AiAd27/build.js writes the importable bundles; tools/build-aiad-lessons.mjs
 * writes the Library cards. Both wrap the same starters27.js, and each used to
 * carry its own copy of the deck-level settings. They drifted — the Library
 * decks gained a closing note and page numbers, the bundles did not — and
 * AiAd27/preview.html, which reads a bundle, quietly showed a different deck
 * from the one in the app.
 *
 * They share AiAd27/deck-settings.js now, so this should hold by construction.
 * It is checked anyway, because the last three times a field went missing it
 * was because somebody added it in one place.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const { DECK_SETTINGS, SHARED_DECK_FIELDS } = require('../AiAd27/deck-settings.js');

function library() {
  const c = { window: {}, console,
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} } };
  vm.createContext(c);
  for (const f of ['model', 'lessons']) vm.runInContext(fs.readFileSync(path.join(root, 'js', f + '.js'), 'utf8'), c);
  return c.window.SF;
}

const STRANDS = ['safe', 'smart', 'creative', 'responsible', 'future'];

test('the bundle and the Library describe the same deck', () => {
  const SF = library();
  const bundlePath = path.join(root, 'AiAd27', 'bundles', 'AiAd27-All-Five.sfbundle.json');
  if (!fs.existsSync(bundlePath)) {
    /* Bundles are build output and gitignored; a clean checkout has none. */
    return;
  }
  const decks = JSON.parse(fs.readFileSync(bundlePath, 'utf8')).decks;

  for (const strand of STRANDS) {
    const theme = 'aiad27-' + strand;
    const bundle = decks.find(d => d.theme === theme);
    const lib = SF.buildLesson(theme);
    assert.ok(bundle, theme + ': missing from the bundle');

    for (const field of SHARED_DECK_FIELDS) {
      assert.deepEqual(bundle[field] ?? null, lib[field] ?? null,
        theme + '.' + field + ': the bundle and the Library disagree — is it set in both builders?');
    }

    /* And both must match the shared source, not merely each other: two
       builders can agree while both being stale. */
    for (const [field, want] of Object.entries(DECK_SETTINGS)) {
      assert.deepEqual(lib[field] ?? null, want ?? null,
        theme + '.' + field + ': the Library has drifted from AiAd27/deck-settings.js');
    }

    /* The slides themselves come from one file, so a count mismatch means one
       builder is filtering or padding the other is not. */
    assert.equal(bundle.slides.length, lib.slides.length,
      theme + ': different slide counts from the same starters');
  }
});

test('the composition table is not written down twice', () => {
  const SF = library();

  /* There are two copies of the campaign's type-to-composition map:
     COMPOSITION_DEFAULTS in AiAd27/starters27.js, which is baked into every
     slide's design at build time, and CAMPAIGN_COMPOSITIONS in src/themes.js,
     which is the theme's defaults. They are the same ten pairs today and
     nothing links them.

     The baked one wins. slideComposition reads slide.design.composition
     first, so editing src/themes.js changes nothing for a deck that already
     exists — the change looks applied, the decks carry on as before, and the
     two only disagree somewhere nobody is looking. That is the fault this
     whole document keeps finding: a fact held in two places.

     Checked against real slides rather than by parsing both files, so it
     tests what the renderer will actually resolve. */
  for (const strand of STRANDS) {
    const theme = 'aiad27-' + strand;
    const defaults = SF.THEMES[theme].defaults;
    for (const slide of SF.buildLesson(theme).slides) {
      if (slide.hidden) continue;
      const baked = slide.design && slide.design.composition;
      assert.ok(baked,
        theme + '/' + slide.type + ': no composition baked by starters27.js — ' +
        'without one the slide renders on the legacy path and loses the ' +
        'campaign header, closing rule and lockup');
      assert.equal(defaults[slide.type], baked,
        theme + '/' + slide.type + ': starters27.js bakes "' + baked +
        '" but src/themes.js defaults to "' + defaults[slide.type] + '" — ' +
        'the baked one wins, so the theme table is quietly dead');
    }
  }
});
