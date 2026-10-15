/* SlideForge — the lessons SlideForge ships, kept apart from a teacher's own.

   On this machine (localhost), where lessons are written, every built-in lesson is filed in the Library as before
   (js/lessons.js seedLibrary, js/lab-engine.js seedShipped). On the hosted site a new visitor's Library starts empty:
   the built-ins are offered as templates at the foot of the Library, and using one files a copy.

   A built-in's copy that nobody has changed is not the teacher's work, so it is not saved to their account
   (js/sync.js). It joins the account the first time it changes. What "unchanged" means is remembered here, per
   browser: the modified time each copy had when it was filed. A copy already in the account stays in step as before.

   SF.BuiltIns
     seeding()                 whether this browser's Library is filled with the built-ins
     note(key, modified)       a copy just filed, as it was built ("kind:id")
     isTemplateLesson(deck)    a Lesson-studio deck that is a built-in's copy
     leaveOut(docs, inAccount) the documents sync should leave alone, by key
     templates()               the built-ins this Library does not hold yet: [{ key, title, group, shipped }] */
(function (global) {
  'use strict';
  /** @type {any} */
  var SF = global.SF = global.SF || {};

  var KEY = 'slideforge.builtinCopies.v1';
  /* For the smoke tests, which run on localhost: '0' or '1' says what a hosted or local browser would do. */
  var FORCE = 'slideforge.seedLibrary';
  var MINE = -1;

  /** @returns {Record<string, number>} */
  function read() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  /** @param {Record<string, number>} m */
  function write(m) {
    try { localStorage.setItem(KEY, JSON.stringify(m)); } catch (e) { /* full: the next pass decides again */ }
  }

  function seeding() {
    var forced = null;
    try { forced = localStorage.getItem(FORCE); } catch (e) {}
    if (forced === '0') return false;
    if (forced === '1') return true;
    var loc = global.location;
    if (!loc || !/^https?:$/.test(loc.protocol)) return true;
    return /^(localhost|127\.0\.0\.1|\[::1\])$/.test(loc.hostname);
  }

  /** @param {string} k @param {number} modified */
  function note(k, modified) {
    var m = read();
    if (k in m) return;
    m[k] = Number(modified) || 0;
    write(m);
  }

  /** Lesson-studio deck ids SlideForge ships (js/lab-decks.js). */
  function shippedIds() {
    /** @type {Record<string, true>} */ var ids = {};
    var all = SF.LAB_DECKS || {};
    Object.keys(all).forEach(function (k) { var e = all[k]; if (e && typeof e === 'object' && e.id) ids[e.id] = true; });
    return ids;
  }

  /** A classic document built from a built-in lesson: a Library pack, or the demo. @param {any} d */
  function isBuiltInClassic(d) {
    if (!d) return false;
    if (d.sourceKey && (SF.LIBRARY_SEED_KEYS || {})[d.sourceKey]) return true;
    return !!SF.DEMO_LIBRARY_GROUP && (d.libraryGroup === SF.DEMO_LIBRARY_GROUP || d.folder === SF.DEMO_LIBRARY_GROUP);
  }

  /** @param {any} deck */
  function isTemplateLesson(deck) {
    if (!deck) return false;
    if (shippedIds()[deck.id]) return true;
    var src = deck.sourceId && SF.Store && SF.Store.get ? SF.Store.get(deck.sourceId) : null;
    return isBuiltInClassic(src);
  }

  /**
   * The keys ("kind:id") of the documents sync leaves in this browser: built-ins' copies nobody has changed.
   * A copy seen for the first time is taken as built (the copies filed before this rule existed). A copy already
   * in the account, or changed since it was filed, is the teacher's.
   * @param {any[]} docs  sync's local documents: { kind, id, modified, sourceKey?, folder?, sourceDeckId?, sourceId? }
   * @param {(k: string) => boolean} inAccount
   */
  function leaveOut(docs, inAccount) {
    var m = read(), changed = false;
    /** @type {Record<string, true>} */ var classicIds = {};
    docs.forEach(function (d) { if (d.kind === 'classic' && isBuiltInClassic(d)) classicIds[d.id] = true; });
    var shipped = shippedIds();
    /** @type {Record<string, true>} */ var out = {};
    docs.forEach(function (d) {
      var k = d.kind + ':' + d.id;
      if (inAccount(k)) { if (k in m) { delete m[k]; changed = true; } return; }
      if (k in m) {
        // MINE: changed since it was filed, so the teacher's from now on, even before it reaches the account.
        if (m[k] === MINE) return;
        if (m[k] === d.modified) out[k] = true;
        else { m[k] = MINE; changed = true; }
        return;
      }
      var builtIn = d.kind === 'classic' ? !!classicIds[d.id]
        : d.kind === 'game' ? !!(d.sourceDeckId && classicIds[d.sourceDeckId])
          : !!(shipped[d.id] || (d.sourceId && classicIds[d.sourceId]));
      if (!builtIn) return;
      m[k] = d.modified; changed = true;
      out[k] = true;
    });
    if (changed) write(m);
    return out;
  }

  function templates() {
    /** @type {any[]} */ var out = [];
    var docs = SF.Store && SF.Store.list ? SF.Store.list() : [];
    /** @type {Record<string, true>} */ var have = {};
    docs.forEach(function (/** @type {any} */ d) { if (d.sourceKey) have[d.sourceKey] = true; have['id:' + d.id] = true; });
    var seeds = SF.LIBRARY_SEED_KEYS || {};
    (SF.LESSONS || []).forEach(function (/** @type {any} */ l) {
      if (l && seeds[l.key] && !have[l.key]) out.push({ key: l.key, title: l.title || l.key, group: seeds[l.key], shipped: false });
    });
    var all = SF.LAB_DECKS || {};
    Object.keys(all).forEach(function (k) {
      var e = all[k];
      if (e && typeof e === 'object' && e.id && e.libraryGroup && !have['id:' + e.id] && !have[k]) {
        out.push({ key: k, title: e.title || k, group: e.libraryGroup, shipped: true });
      }
    });
    return out;
  }

  SF.BuiltIns = { seeding: seeding, note: note, isTemplateLesson: isTemplateLesson, leaveOut: leaveOut, templates: templates };
})(window);
