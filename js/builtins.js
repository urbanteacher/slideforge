/* SlideForge — the lessons SlideForge ships, kept apart from a teacher's own.

   On this machine (localhost), where lessons are written, every built-in lesson is filed in the Library as before
   (js/lessons.js seedLibrary, js/lab-engine.js seedShipped). On the hosted site a new visitor's Library starts empty:
   the built-ins are offered as templates at the foot of the Library, and using one files a copy.

   A built-in's copy that nobody has changed is not the teacher's work, so it is not saved to their account
   (js/sync.js). It joins the account the first time it changes. What "unchanged" means is remembered here, per
   browser: the modified time each copy had when it was filed. A copy already in the account stays in step as before.

   When a built-in lesson changes (a rebuilt js/lessons-*.js), a copy nobody has changed is swapped for the lesson as
   it is now, the next time the page loads (refresh). A copy that was changed, or that this browser can't vouch for,
   is kept, renamed "(earlier copy)", and the new lesson is filed beside it. Nothing anyone made is deleted.

   SF.BuiltIns
     seeding()                 whether this browser's Library is filled with the built-ins
     note(key, modified)       a copy just filed, as it was built ("kind:id")
     isTemplateLesson(deck)    a Lesson-studio deck that is a built-in's copy
     leaveOut(docs, inAccount) the documents sync should leave alone, by key
     templates()               the built-ins this Library does not hold yet: [{ key, title, group, shipped }]
     refresh(rows, forget)     bring built-in copies up to date; rows are the Lesson studio's saved copies */
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

  /* ------------------------------------------- bringing copies up to date

     A copy is told from the lesson it was built from by a fingerprint of its slides and settings (js/lesson-hash.js),
     leaving out what the Library changes: its name, its folder. Unchanged means both halves are as filed:
     - the classic deck, which nothing has edited since the classic editor went (26 September 2026): a deck filed
       before then may have been edited there, so it can't be vouched for;
     - its Lesson-studio copies, where every edit is made: each still has the modified time noted when it was filed. */
  var EDITOR_GONE = Date.UTC(2026, 8, 26);
  var EARLIER = ' (earlier copy)';
  /** @type {Record<string, 1>} */ var CHROME = { title: 1, libraryGroup: 1, folder: 1 };

  /** @param {any} d */
  function contentHash(d) {
    /** @type {any} */ var c = {};
    Object.keys(d || {}).forEach(function (k) { if (!CHROME[k]) c[k] = d[k]; });
    return SF.lessonHash(SF.normalizeDeck(JSON.parse(JSON.stringify(c))));
  }

  /** The lesson as it is now, built without filing its games (a build files them otherwise). @param {string} key */
  function dryBuild(key) {
    var games = SF.GameStore;
    if (games) SF.GameStore = Object.assign({}, games, { save: function () { return true; } });
    try { return SF.buildLesson(key); } finally { if (games) SF.GameStore = games; }
  }

  /**
   * @param {any[]} rows  the Lesson studio's saved copies: { id, sourceId, modified }
   * @param {(id: string) => void} [forget]  removes a Lesson-studio copy
   * @returns {{ updated: string[], kept: string[], fresh: any[], swaps: { copies: string[], deck: any }[] }}
   */
  function refresh(rows, forget) {
    var out = { updated: /** @type {string[]} */ ([]), kept: /** @type {string[]} */ ([]), fresh: /** @type {any[]} */ ([]),
      swaps: /** @type {{ copies: string[], deck: any }[]} */ ([]) };
    if (!SF.Store || !SF.Store.list || !SF.buildLesson || !SF.lessonHash || !SF.normalizeDeck) return out;
    var seeds = SF.LIBRARY_SEED_KEYS || {}, m = read(), changed = false;
    /** @type {Record<string, true>} */ var known = {};
    (SF.LESSONS || []).forEach(function (/** @type {any} */ l) { if (l && l.key) known[l.key] = true; });
    /** @type {Record<string, string>} */ var now = {};
    SF.Store.list().forEach(function (/** @type {any} */ d) {
      var key = d && d.sourceKey;
      if (!key || d.labCard || !seeds[key] || !known[key]) return;
      if (!(key in now)) { var built = dryBuild(key); now[key] = built ? contentHash(built) : ''; }
      if (!now[key] || contentHash(d) === now[key]) return;
      var copies = (rows || []).filter(function (r) { return r && r.sourceId === d.id; });
      var asFiled = (Number(d.created) || 0) >= EDITOR_GONE && copies.every(function (r) {
        var k = 'lesson:' + r.id;
        return k in m && m[k] !== MINE && m[k] === Number(r.modified);
      });
      var fresh = SF.buildLesson(key);
      if (!fresh) return;
      fresh.sourceKey = key;
      if (d.libraryGroup) fresh.libraryGroup = d.libraryGroup;
      if (asFiled) {
        copies.forEach(function (r) {
          if (forget) forget(r.id);
          SF.Store.remove(r.id);
          if (('lesson:' + r.id) in m) { delete m['lesson:' + r.id]; changed = true; }
        });
        SF.Store.remove(d.id);
        out.updated.push(fresh.title || key);
        out.swaps.push({ copies: copies.map(function (r) { return r.id; }), deck: fresh });
      } else {
        /* No longer the built-in's copy: the teacher's own, under a name that says which it is. */
        var rename = function (/** @type {any} */ x) { if (x && String(x.title || '').indexOf(EARLIER) < 0) x.title = (x.title || fresh.title || key) + EARLIER; };
        rename(d);
        delete d.sourceKey;
        SF.Store.save(d, { force: true });
        copies.forEach(function (r) { var c = SF.Store.get(r.id); if (c) { rename(c); SF.Store.save(c, { force: true }); } });
        out.kept.push(fresh.title || key);
      }
      SF.Store.save(fresh, { force: true });
      out.fresh.push(fresh);
    });
    if (changed) write(m);
    return out;
  }

  SF.BuiltIns = { seeding: seeding, note: note, isTemplateLesson: isTemplateLesson, leaveOut: leaveOut, templates: templates, refresh: refresh };
})(window);
