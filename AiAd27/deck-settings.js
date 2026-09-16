'use strict';
/* Deck-level settings for the AI Awareness Day 2027 starters.
 *
 * One source, because there are two builders. AiAd27/build.js writes the
 * importable bundles and tools/build-aiad-lessons.mjs writes the Library
 * cards, both wrapping the same starters27.js — and each used to carry its
 * own copy of these fields. They drifted: the Library decks gained a closing
 * note and page numbers and the bundles did not, so AiAd27/preview.html, which
 * reads a bundle, showed a different deck from the one in the app.
 *
 * Anything that describes the deck rather than a slide belongs here. Anything
 * a slide says belongs in starters27.js.
 */
const DECK_SETTINGS = {
  org: 'AI Awareness Day 2027',

  /* The campaign lockup. It holds the corner the composition header reserves
     for it, on every slide — 2026 carries its badge throughout too, and
     'title' left that corner empty on six slides in seven. */
  logo: 'assets/brand/aiad27/aiad27-lockup.svg',
  logoOn: 'all',
  logoSize: 'large',

  /* Unset on purpose: the lockup is a single ink, so the shared dark-ground
     rule reverses it to white on the scenario and rules slides and leaves it
     alone on the five light ones. Saying 'never' here would freeze it dark on
     a dark ground, which is how it was invisible before. */
  logoReverse: undefined,

  /* The line the composition prints on its closing rule. The lockup says the
     same words; the repetition is deliberate, the way a printed programme
     carries its mark on every page. */
  closingNote: 'Keep humans in the loop',

  /* Carried by the closing rule, so it reads as a position in the five
     minutes rather than as clutter: "04 / 07" tells a room how far in it is. */
  showSlideNumbers: true
};

/* The fields both builders must agree on, for the parity check in the tests.
   undefined is a real value here — it means "leave it to the ground". */
const SHARED_DECK_FIELDS = Object.keys(DECK_SETTINGS);

module.exports = { DECK_SETTINGS, SHARED_DECK_FIELDS };
