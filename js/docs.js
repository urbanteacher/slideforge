/* SlideForge — every saved document, through one door.

   What a teacher keeps lives in two stores today:
   - SlideForge's own (src/storage.js: SF.Store and SF.GameStore, in
     localStorage): games, older lessons, and the Library's card for each
     Lesson-studio lesson;
   - the Lesson studio's (lab/src/embed.ts, in IndexedDB): the lessons
     themselves, with their pictures.

   The Library and the backup used to read only the first, so a backup
   carried a card for each studio lesson and none of its slides. SF.Docs
   reads both. It is also the one place a cloud copy (docs/data-storage-plan.md)
   plugs in: whatever saves through here can be synced from here.

   list()      every document, newest first: { id, kind, title, folder, modified }
               kind is 'lesson' (Lesson studio), 'classic' (an older lesson) or 'game'
   bundle()    a promise of the whole library as one backup file's contents
   restore(b)  a promise: a backup filed back, by id, so a second restore replaces
               rather than duplicates. Resolves to { decks, games, lessons }. */
(function (global) {
  'use strict';
  /** @type {any} */
  var SF = global.SF = global.SF || {};

  function list() {
    var rows = [];
    (SF.Store ? SF.Store.list() : []).forEach(function (/** @type {any} */ d) {
      rows.push({ id: d.id, kind: d.labCard ? 'lesson' : 'classic', title: d.title || 'Untitled', folder: d.libraryGroup || '', modified: d.modified || 0 });
    });
    (SF.GameStore ? SF.GameStore.list() : []).forEach(function (/** @type {any} */ g) {
      rows.push({ id: g.id, kind: 'game', title: g.title || 'Untitled', folder: '', modified: g.modified || 0 });
    });
    return rows.sort(function (a, b) { return b.modified - a.modified; });
  }

  function labDecks() {
    return SF.LabEngine && SF.LabEngine.savedDecks ? SF.LabEngine.savedDecks() : Promise.resolve([]);
  }

  function bundle() {
    return labDecks().then(function (/** @type {any[]} */ lessons) {
      return {
        kind: 'slideforge-bundle',
        /* 2: the Lesson studio's lessons travel too (labDecks). A version 1 file restores as before. */
        version: 2,
        exported: new Date().toISOString(),
        decks: SF.Store ? SF.Store.list() : [],
        games: SF.GameStore ? SF.GameStore.list() : [],
        labDecks: lessons
      };
    });
  }

  /** @param {any} raw */
  function restore(raw) {
    var decks = (Array.isArray(raw && raw.decks) ? raw.decks : []).map(SF.normalizeDeck).filter(Boolean);
    var games = (Array.isArray(raw && raw.games) ? raw.games : []).map(SF.normalizeGame).filter(Boolean);
    var lessons = Array.isArray(raw && raw.labDecks) ? raw.labDecks : [];
    games.forEach(function (/** @type {any} */ g) { SF.GameStore.save(g); });
    decks.forEach(function (/** @type {any} */ d) { SF.Store.save(d); });
    if (!lessons.length || !SF.LabEngine || !SF.LabEngine.restoreDecks) {
      return Promise.resolve({ decks: decks.length, games: games.length, lessons: 0 });
    }
    return SF.LabEngine.restoreDecks(lessons).then(function (/** @type {number} */ n) {
      return { decks: decks.length, games: games.length, lessons: n };
    });
  }

  SF.Docs = { list: list, bundle: bundle, restore: restore };
})(window);
