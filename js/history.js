/* Restore points for a document.

   Deliberately IndexedDB and not localStorage. Decks already live in
   localStorage next to their embedded images, which is the one storage in
   this app under real pressure — a deck with pasted screenshots is megabytes,
   and keeping ten copies of it beside the original is how the whole library
   stops saving. IndexedDB is a different budget, asynchronous, and the right
   home for something written often and read almost never.

   Absent rather than broken where IndexedDB is not available: a private
   window with storage disabled, or a page opened from file:// in a browser
   that refuses it. The caller asks `ready()` and hides the feature. Nothing
   here throws into the editor's path.

   What it is not: a branching timeline, or undo across sessions. It is the
   answer to "that was better twenty minutes ago", which is the question
   people actually ask a presentation tool. */
(function (global) {
  'use strict';
  /** @type {any} */
  var SF = global.SF = global.SF || {};

  var DB = 'slideforge', STORE = 'snapshots', VERSION = 1;
  /* Enough to cover a working session without becoming an archive. Older
     ones go first, per document, so a deck you have not touched in a week
     does not lose its history because another one was busy. */
  var KEEP = 25;
  var db = null, failed = false;

  function open() {
    if (db) return Promise.resolve(db);
    if (failed || !global.indexedDB) return Promise.resolve(null);
    return new Promise(function (resolve) {
      var req;
      try { req = global.indexedDB.open(DB, VERSION); }
      catch (e) { failed = true; resolve(null); return; }
      req.onupgradeneeded = function () {
        var d = req.result;
        if (!d.objectStoreNames.contains(STORE)) {
          var st = d.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
          st.createIndex('docId', 'docId', { unique: false });
        }
      };
      req.onsuccess = function () { db = req.result; resolve(db); };
      req.onerror = function () { failed = true; resolve(null); };
      req.onblocked = function () { failed = true; resolve(null); };
    });
  }

  function tx(mode) {
    return open().then(function (d) {
      if (!d) return null;
      try { return d.transaction(STORE, mode).objectStore(STORE); }
      catch (e) { return null; }
    });
  }

  function ready() { return !!global.indexedDB && !failed; }

  /** Every snapshot for one document, newest first. */
  function list(docId) {
    return tx('readonly').then(function (st) {
      if (!st) return [];
      return new Promise(function (resolve) {
        var out = [];
        var req = st.index('docId').openCursor(IDBKeyRange.only(String(docId)));
        req.onsuccess = function () {
          var cur = req.result;
          if (!cur) { resolve(out.sort(function (a, b) { return b.at - a.at; })); return; }
          /* The document itself is not read here — a list of twenty decks
             would be megabytes to draw six lines of text. */
          out.push({ id: cur.value.id, at: cur.value.at, label: cur.value.label,
                     slides: cur.value.slides, title: cur.value.title });
          cur.continue();
        };
        req.onerror = function () { resolve([]); };
      });
    });
  }

  function prune(docId) {
    return list(docId).then(function (rows) {
      if (rows.length <= KEEP) return;
      var doomed = rows.slice(KEEP);
      return tx('readwrite').then(function (st) {
        if (!st) return;
        doomed.forEach(function (r) { try { st.delete(r.id); } catch (e) {} });
      });
    });
  }

  /**
   * Keep a copy of this document as it is now.
   * @param {any} doc
   * @param {string} label  why it was taken — shown in the list
   */
  function snapshot(doc, label) {
    if (!doc || !doc.id) return Promise.resolve(false);
    var copy;
    /* Cloned through JSON so a later edit cannot reach back into a stored
       snapshot through a shared array. */
    try { copy = JSON.parse(JSON.stringify(doc)); } catch (e) { return Promise.resolve(false); }
    return tx('readwrite').then(function (st) {
      if (!st) return false;
      return new Promise(function (resolve) {
        var req;
        try {
          req = st.add({
            docId: String(doc.id), at: Date.now(), label: String(label || 'Autosave'),
            title: String(doc.title || ''), slides: (doc.slides || []).length, doc: copy
          });
        } catch (e) { resolve(false); return; }
        req.onsuccess = function () { prune(doc.id); resolve(true); };
        /* A full disk is not worth a dialog in the middle of a lecture: the
           work is still saved where it always was. */
        req.onerror = function () { resolve(false); };
      });
    });
  }

  /** The stored document for one snapshot, or null. */
  function get(id) {
    return tx('readonly').then(function (st) {
      if (!st) return null;
      return new Promise(function (resolve) {
        var req = st.get(id);
        req.onsuccess = function () { resolve(req.result ? req.result.doc : null); };
        req.onerror = function () { resolve(null); };
      });
    });
  }

  function removeAll(docId) {
    return list(docId).then(function (rows) {
      return tx('readwrite').then(function (st) {
        if (!st) return;
        rows.forEach(function (r) { try { st.delete(r.id); } catch (e) {} });
      });
    });
  }

  SF.History = { ready: ready, snapshot: snapshot, list: list, get: get, removeAll: removeAll, KEEP: KEEP };
})(window);
