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
    /* SF.Store.save answers false when the browser refuses the write (its storage is full: one
       classic lecture with pasted pictures can be bigger than all of localStorage). Each one
       refused is named, so the caller can say what was not kept rather than claim it was. */
    /** @type {string[]} */ var notKept = [];
    var keptGames = 0, keptDecks = 0;
    games.forEach(function (/** @type {any} */ g) {
      if (SF.GameStore.save(g) === false) notKept.push(g.title || 'Untitled game'); else keptGames++;
    });
    decks.forEach(function (/** @type {any} */ d) {
      if (SF.Store.save(d) === false) notKept.push(d.title || 'Untitled lesson'); else keptDecks++;
    });
    if (!lessons.length || !SF.LabEngine || !SF.LabEngine.restoreDecks) {
      return Promise.resolve({ decks: keptDecks, games: keptGames, lessons: 0, notKept: notKept });
    }
    return SF.LabEngine.restoreDecks(lessons).then(function (/** @type {number} */ n) {
      if (n < lessons.length) notKept.push((lessons.length - n) + ' Lesson-studio ' + (lessons.length - n === 1 ? 'lesson' : 'lessons'));
      return { decks: keptDecks, games: keptGames, lessons: n, notKept: notKept };
    });
  }

  /**
   * What a restore did not keep, in words for a toast; '' when everything was kept.
   * @param {any} result  what restore() resolved to
   * @param {boolean} [stillOpen]  the lesson is open in the studio all the same
   */
  function notKeptMessage(result, stillOpen) {
    var names = (result && result.notKept) || [];
    if (!names.length) return '';
    var list = names.length <= 3 ? names.map(function (n) { return '\u201c' + n + '\u201d'; }).join(', ') : names.length + ' documents';
    return 'Not saved: ' + list + ' did not fit in this browser\u2019s storage, so ' +
      (names.length === 1 ? 'it was' : 'they were') + ' not kept in the Library.' +
      (stillOpen ? ' The lesson is still open in the studio, which keeps its own copy.' : ' Keep the file you imported.');
  }

  SF.Docs = { list: list, bundle: bundle, restore: restore, notKeptMessage: notKeptMessage };
})(window);
