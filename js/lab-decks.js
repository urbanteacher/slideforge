/* Lab decks the app ships as files: a ?lesson=<key> link opens the deck exactly
   as it was built — its own layers, pictures and motion — rather than a lesson
   converted from SF.LESSONS. Key → the deck file, relative to the app root.
   Read by js/lab-engine.js install(). */
(function (global) {
  'use strict';
  /** @type {any} */
  var SF = global.SF = global.SF || {};
  SF.LAB_DECKS = Object.assign(SF.LAB_DECKS || {}, {
    // Mark Martin MBE: "From a school street to the world stage" (The Air Pollution Project).
    'air-pollution-story': 'assets/air-pollution/Air-Pollution-Story.lesson.json',
  });
})(window);
