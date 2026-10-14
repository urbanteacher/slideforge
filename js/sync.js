/* SlideForge — lessons saved to the teacher's account, and back (docs/data-storage-plan.md, step 4).

   While a teacher is signed in (js/cloud.js), every document this browser keeps is kept in step with their account:
   Lesson-studio lessons, older (classic) lessons and games. It runs on sign-in, every half minute, and when the tab
   is hidden. The browser's own copy stays the instant one; the account is the copy every other device reads.

   What "in step" means, per document, is remembered here (localStorage, per account): the local and the online
   modified times as they were when the two last matched. Against that:
   - changed here only:                     uploaded;
   - changed online only (another device):  downloaded and filed here;
   - changed in both:                       the newer wins, and the copy here is first kept as a restore point
                                            (History), so the losing edit is never lost;
   - deleted here, after being in step:     marked deleted online (and so on every device's next pass);
   - deleted online:                        left here untouched (a deletion never removes the only copy a
                                            device has; delete it here too if it should go).
   Pictures are still inside the lessons (step 5 moves them to the bucket), so a lesson over 12 MB is not uploaded
   and the account dialog says so.

   SF.Sync
     now()      a promise of a pass: { up, down, kept, skipped: [titles], error }
     status()   the last pass's result and when it finished */
(function (global) {
  'use strict';
  /** @type {any} */
  var SF = global.SF = global.SF || {};

  var EVERY_MS = 30000;
  var MAX_BYTES = 12 * 1024 * 1024;
  var KEY = 'slideforge.sync.v1.';

  /** @type {any} */ var last = null;
  /** @type {Promise<any> | null} */ var running = null;
  /** @type {any} */ var timer = null;
  /** @type {string} */ var userId = '';

  function stateKey() { return KEY + userId; }
  function readState() {
    try { return JSON.parse(localStorage.getItem(stateKey()) || '{}') || {}; } catch (e) { return {}; }
  }
  /** @param {any} st */
  function writeState(st) {
    try { localStorage.setItem(stateKey(), JSON.stringify(st)); } catch (e) { /* a full storage keeps the old state: the next pass re-checks */ }
  }

  /** Every document this browser keeps, as { kind, id, title, folder, modified }. */
  function localDocs() {
    var out = [];
    (SF.Store ? SF.Store.list() : []).forEach(function (/** @type {any} */ d) {
      // A Lesson-studio lesson's Library card is not a document of its own: the lesson travels as kind 'lesson'.
      if (!d || !d.id || d.labCard) return;
      out.push({ kind: 'classic', id: String(d.id), title: d.title || 'Untitled', folder: d.libraryGroup || '', modified: Number(d.modified) || 0 });
    });
    (SF.GameStore ? SF.GameStore.list() : []).forEach(function (/** @type {any} */ g) {
      if (!g || !g.id) return;
      out.push({ kind: 'game', id: String(g.id), title: g.title || 'Untitled game', folder: '', modified: Number(g.modified) || 0 });
    });
    var rows = SF.LabEngine && SF.LabEngine.savedRows ? SF.LabEngine.savedRows() : Promise.resolve([]);
    return rows.then(function (/** @type {any[]} */ lessons) {
      (lessons || []).forEach(function (r) {
        if (!r || !r.id) return;
        out.push({ kind: 'lesson', id: String(r.id), title: r.title || 'Untitled', folder: r.libraryGroup || '', modified: Number(r.modified) || 0 });
      });
      return out;
    }, function () { return out; });
  }

  /** The document itself, as it is filed here. @param {any} d */
  function bodyOf(d) {
    if (d.kind === 'lesson') return SF.LabEngine.savedDeck(d.id);
    var store = d.kind === 'game' ? SF.GameStore : SF.Store;
    return Promise.resolve(store && store.get ? store.get(d.id) : null);
  }

  /** File a downloaded document here. Resolves when it is kept. @param {string} kind @param {any} body */
  function file(kind, body) {
    if (kind === 'lesson') {
      return SF.LabEngine.restoreDecks([body]).then(function (/** @type {number} */ n) {
        if (!n) throw new Error('the lesson could not be filed here');
        // The lesson open in the studio is shown as it now is, so an edit here does not carry on from the old copy.
        var shell = SF.Shell && SF.Shell.current && SF.Shell.current();
        if (SF.LabEngine.currentId && SF.LabEngine.currentId() === body.id && shell && shell.restoreDoc) shell.restoreDoc(body);
      });
    }
    var ok = kind === 'game' ? SF.GameStore.save(SF.normalizeGame(body)) : SF.Store.save(SF.normalizeDeck(body));
    return ok === false ? Promise.reject(new Error('this browser’s storage is full')) : Promise.resolve();
  }

  /** @param {any} d */
  function keep(d) {
    if (!SF.History || !SF.History.snapshot) return Promise.resolve();
    return bodyOf(d).then(function (b) { return b ? SF.History.snapshot(b, 'Before a newer copy came from another device') : null; }).catch(function () {});
  }

  /** A fingerprint of a document's content, its own modified time left out (a re-save that changed nothing must not
      upload again). FNV-1a over its JSON. @param {any} body */
  function fingerprint(body) {
    var text = JSON.stringify(Object.assign({}, body, { modified: 0 }));
    var h = 0x811c9dc5;
    for (var i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return (h >>> 0).toString(36) + ':' + text.length;
  }

  /** @param {any} res */
  function check(res) { if (res && res.error) throw new Error(res.error.message || 'the account did not answer'); return res; }

  function pass() {
    var client = SF.Cloud && SF.Cloud.client();
    if (!client || !userId) return Promise.resolve({ up: 0, down: 0, kept: 0, skipped: [], error: 'not signed in' });
    var st = readState(), up = 0, down = 0, kept = 0, skipped = [], sent = [], touched = {};
    return Promise.all([
      localDocs(),
      client.from('documents').select('id,kind,title,modified,deleted').then(check)
    ]).then(function (got) {
      var here = {}, there = {};
      got[0].forEach(function (/** @type {any} */ d) { here[d.kind + ':' + d.id] = d; });
      (got[1].data || []).forEach(function (/** @type {any} */ r) { there[r.kind + ':' + r.id] = Object.assign({}, r, { modified: Date.parse(r.modified) || 0 }); });
      var keys = Object.keys(Object.assign({}, here, there));
      // One at a time: a lesson can be megabytes, and a free project is small.
      return keys.reduce(function (chain, k) {
        return chain.then(function () {
          var l = here[k], r = there[k], s = st[k];
          var localChanged = !!l && (!s || l.modified > s.l);
          var remoteChanged = !!r && !r.deleted && (!s || r.modified > s.r);
          if (l && (!r || r.deleted && !s)) return push(l);
          if (!l && r && !r.deleted) {
            if (s) return client.from('documents').update({ deleted: true, modified: new Date().toISOString() }).eq('id', r.id).then(check).then(function () { delete st[k]; });
            return pull(r);
          }
          if (!l || !r || r.deleted) return;
          if (localChanged && remoteChanged) return l.modified >= r.modified ? push(l) : keep(l).then(function () { kept++; return pull(r); });
          if (localChanged) return push(l);
          if (remoteChanged) return pull(r);
        });
      }, Promise.resolve());

      /** @param {any} l */
      function push(l) {
        return bodyOf(l).then(function (body) {
          if (!body) return;
          var size = JSON.stringify(body).length;
          if (size > MAX_BYTES) { skipped.push(l.title); return; }
          var k = l.kind + ':' + l.id, fp = fingerprint(body), was = st[k];
          // Saved again with nothing changed: in step already, at its new time.
          if (was && was.h === fp && there[k] && !there[k].deleted) { st[k] = { l: l.modified, r: was.r, h: fp }; return; }
          var at = new Date(l.modified || Date.now()).toISOString();
          return client.from('documents').upsert({ id: l.id, kind: l.kind, title: l.title, folder: l.folder, modified: at, deleted: false, body: body }, { onConflict: 'owner,id' })
            .then(check).then(function () { up++; sent.push(k); st[k] = { l: l.modified, r: Date.parse(at), h: fp }; });
        });
      }
      /** @param {any} r */
      function pull(r) {
        return client.from('documents').select('body').eq('id', r.id).eq('kind', r.kind).single().then(check).then(function (/** @type {any} */ res) {
          var fp = fingerprint(res.data.body);
          return file(r.kind, res.data.body).then(function () { down++; touched[r.kind + ':' + r.id] = { r: r.modified, h: fp }; });
        });
      }
    }).then(function () {
      // Filing a download stamps it as modified now, here: that stamp is what "in step" is measured from.
      if (!Object.keys(touched).length) return;
      return localDocs().then(function (docs) {
        docs.forEach(function (d) { var k = d.kind + ':' + d.id; if (k in touched) st[k] = { l: d.modified, r: touched[k].r, h: touched[k].h }; });
      });
    }).then(function () {
      writeState(st);
      return { up: up, down: down, kept: kept, skipped: skipped, sent: sent, error: '' };
    }, function (/** @type {any} */ e) {
      writeState(st);
      return { up: up, down: down, kept: kept, skipped: skipped, sent: sent, error: (e && e.message) || 'the sync failed' };
    });
  }

  function now() {
    if (running) return running;
    running = pass().then(function (res) {
      last = Object.assign({ at: Date.now() }, res);
      running = null;
      listeners.forEach(function (fn) { try { fn(last); } catch (e) { console.error(e); } });
      return last;
    });
    return running;
  }

  /** @type {Array<(s: any) => void>} */ var listeners = [];

  function start(/** @type {any} */ u) {
    clearInterval(timer);
    userId = u && u.id ? String(u.id) : '';
    if (!userId) return;
    now();
    timer = setInterval(now, EVERY_MS);
  }

  SF.Sync = {
    now: now,
    status: function () { return last; },
    onStatus: function (/** @type {(s: any) => void} */ fn) { listeners.push(fn); if (last) fn(last); }
  };

  /* The account dialog: when lessons last went to the account, and a button for now. */
  /** @param {any} r */
  function said(r) {
    if (!r) return 'Your lessons save to your account while you are signed in.';
    var t = new Date(r.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (r.error) return 'Not saved to your account at ' + t + ': ' + r.error + '. Your lessons are still kept in this browser; it tries again shortly.';
    var parts = [];
    if (r.up) parts.push(r.up + ' saved up');
    if (r.down) parts.push(r.down + ' brought from another device');
    if (r.kept) parts.push(r.kept + ' older ' + (r.kept === 1 ? 'copy' : 'copies') + ' kept in History');
    return 'In step with your account at ' + t + (parts.length ? ' (' + parts.join(', ') + ')' : '') + '.' +
      (r.skipped.length ? ' Too big to save online yet, kept in this browser only: ' + r.skipped.join(', ') + '.' : '');
  }
  function wire() {
    var line = document.getElementById('accountSync');
    var accountSyncNow = /** @type {HTMLButtonElement | null} */ (document.getElementById('accountSyncNow'));
    if (accountSyncNow) accountSyncNow.onclick = function () {
      accountSyncNow.disabled = true;
      if (line) line.textContent = 'Saving to your account\u2026';
      now().then(function () { accountSyncNow.disabled = false; });
    };
    SF.Sync.onStatus(function (r) {
      if (line) line.textContent = said(r);
      if (r && !r.error && (r.down || r.kept) && SF.toast) SF.toast(said(r));
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();

  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden' && userId) now(); });
  if (SF.Cloud) SF.Cloud.ready().then(function (on) { if (on) SF.Cloud.onChange(start); });
})(window);
