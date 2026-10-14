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
   Pictures and videos (step 5): this browser's copy keeps them inside the lesson, as the editor, Export and Share
   expect. The online copy does not: each embedded picture is stored once in the account's private bucket (media,
   under the teacher's own folder, named by its SHA-256), and the online lesson holds "sf-asset:<hash>.<ext>" in its
   place. Downloading puts the pictures back, so a lesson arrives whole. A picture used in many lessons is stored
   once. A lesson still over 12 MB without its pictures is not uploaded, and the account dialog says so.

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
  /* The online form: 2 keeps pictures in the bucket (step 5). A document last uploaded in an older form is uploaded
     once more, so pictures already online move to the bucket too. */
  var FORM = 2;

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

  /* ------------------------------------------------------------ pictures to the bucket, and back */
  var EMBEDDED = /data:((?:image|video|audio)\/[a-z0-9.+-]+);base64,[A-Za-z0-9+/=]+/gi;
  var REF = /sf-asset:([0-9a-f]{64})\.([a-z0-9]+)/g;
  var SMALL = 2048;   // a tiny picture (an icon) stays in the lesson: not worth a request of its own
  var EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg', 'image/avif': 'avif', 'video/mp4': 'mp4', 'video/webm': 'webm', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/wav': 'wav' };
  var TYPE = Object.keys(EXT).reduce(function (o, t) { o[EXT[t]] = t; return o; }, /** @type {any} */ ({}));
  /** @type {Record<string, true>} */ var stored = {};       // hashes already in the bucket, this account
  /** @type {Record<string, string>} */ var pictures = {};   // hash → data URL, as downloaded this session

  /** Every string in a document, rewritten by `fn` (which may resolve later). @param {any} v @param {(s: string) => Promise<string>} fn */
  function mapStrings(v, fn) {
    if (typeof v === 'string') return fn(v);
    if (Array.isArray(v)) return Promise.all(v.map(function (x) { return mapStrings(x, fn); }));
    if (v && typeof v === 'object') {
      var keys = Object.keys(v);
      return Promise.all(keys.map(function (k) { return mapStrings(v[k], fn); })).then(function (vals) {
        var out = /** @type {any} */ ({}); keys.forEach(function (k, i) { out[k] = vals[i]; }); return out;
      });
    }
    return Promise.resolve(v);
  }
  /** @param {ArrayBuffer} buf */
  function hex(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); }

  /** One embedded picture put in the bucket (once), and its reference. @param {any} client @param {string} url @param {string} type */
  function store(client, url, type) {
    return fetch(url).then(function (r) { return r.blob(); }).then(function (blob) {
      return blob.arrayBuffer().then(function (buf) { return crypto.subtle.digest('SHA-256', buf); }).then(function (d) {
        var hash = hex(d), ext = EXT[type.toLowerCase()] || 'bin', ref = 'sf-asset:' + hash + '.' + ext;
        pictures[hash] = url;
        if (stored[hash]) return ref;
        var path = userId + '/' + hash + '.' + ext;
        return client.storage.from('media').upload(path, blob, { contentType: type, upsert: false }).then(function (/** @type {any} */ r) {
          // Already there (another lesson, another device): the same bytes, by its name.
          if (r && r.error && !/exists|duplicate|409/i.test(String(r.error.message || r.error.statusCode || ''))) throw new Error('a picture could not be stored online: ' + (r.error.message || 'the bucket refused it'));
          return client.from('assets').upsert({ hash: hash, path: path, bytes: blob.size, type: type }, { onConflict: 'owner,hash' }).then(check);
        }).then(function () { stored[hash] = true; return ref; });
      });
    });
  }

  /** The online copy of a document: its embedded pictures in the bucket, a reference in their place. @param {any} client @param {any} body */
  function withRefs(client, body) {
    return mapStrings(body, function (text) {
      if (text.length < SMALL || text.indexOf('data:') < 0) return Promise.resolve(text);
      var found = text.match(EMBEDDED) || [];
      var big = found.filter(function (m) { return m.length >= SMALL; });
      if (!big.length) return Promise.resolve(text);
      // One at a time, in order: a lesson can carry dozens of pictures, and the free plan is small.
      return big.reduce(function (chain, m) {
        return chain.then(function (acc) {
          var type = /^data:([^;]+);/.exec(m)[1];
          return store(client, m, type).then(function (ref) { return acc.split(m).join(ref); });
        });
      }, Promise.resolve(text));
    });
  }

  /** A blob as a data URL. @param {Blob} blob */
  function dataUrl(blob) {
    return new Promise(function (resolve, reject) { var fr = new FileReader(); fr.onload = function () { resolve(String(fr.result)); }; fr.onerror = reject; fr.readAsDataURL(blob); });
  }
  /** A downloaded document with its pictures back in it. @param {any} client @param {any} body */
  function withPictures(client, body) {
    return mapStrings(body, function (text) {
      if (text.indexOf('sf-asset:') < 0) return Promise.resolve(text);
      var refs = text.match(REF) || [];
      return refs.reduce(function (chain, ref) {
        return chain.then(function (acc) {
          var m = /sf-asset:([0-9a-f]{64})\.([a-z0-9]+)/.exec(ref), hash = m[1], ext = m[2];
          var got = pictures[hash] ? Promise.resolve(pictures[hash]) : client.storage.from('media').download(userId + '/' + hash + '.' + ext).then(function (/** @type {any} */ r) {
            if (r && r.error) throw new Error('a picture could not be fetched: ' + (r.error.message || 'not found'));
            var blob = r.data.type ? r.data : new Blob([r.data], { type: TYPE[ext] || 'application/octet-stream' });
            return dataUrl(blob).then(function (u) { pictures[hash] = u; stored[hash] = true; return u; });
          });
          return got.then(function (u) { return acc.split(ref).join(u); });
        });
      }, Promise.resolve(text));
    });
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
      client.from('documents').select('id,kind,title,modified,deleted').then(check),
      client.from('assets').select('hash').then(check)
    ]).then(function (got) {
      (got[2].data || []).forEach(function (/** @type {any} */ a) { stored[a.hash] = true; });
      var here = {}, there = {};
      got[0].forEach(function (/** @type {any} */ d) { here[d.kind + ':' + d.id] = d; });
      (got[1].data || []).forEach(function (/** @type {any} */ r) { there[r.kind + ':' + r.id] = Object.assign({}, r, { modified: Date.parse(r.modified) || 0 }); });
      var keys = Object.keys(Object.assign({}, here, there));
      // One at a time: a lesson can be megabytes, and a free project is small.
      return keys.reduce(function (chain, k) {
        return chain.then(function () {
          var l = here[k], r = there[k], s = st[k];
          var localChanged = !!l && (!s || l.modified > s.l || s.v !== FORM);
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
          var k = l.kind + ':' + l.id, fp = fingerprint(body), was = st[k];
          // Saved again with nothing changed: in step already, at its new time.
          if (was && was.h === fp && was.v === FORM && there[k] && !there[k].deleted) { st[k] = { l: l.modified, r: was.r, h: fp, v: FORM }; return; }
          return withRefs(client, body).then(function (online) {
            if (JSON.stringify(online).length > MAX_BYTES) { skipped.push(l.title); return; }
            var at = new Date(l.modified || Date.now()).toISOString();
            return client.from('documents').upsert({ id: l.id, kind: l.kind, title: l.title, folder: l.folder, modified: at, deleted: false, body: online }, { onConflict: 'owner,id' })
              .then(check).then(function () { up++; sent.push(k); st[k] = { l: l.modified, r: Date.parse(at), h: fp, v: FORM }; });
          });
        });
      }
      /** @param {any} r */
      function pull(r) {
        return client.from('documents').select('body').eq('id', r.id).eq('kind', r.kind).single().then(check).then(function (/** @type {any} */ res) {
          return withPictures(client, res.data.body);
        }).then(function (/** @type {any} */ body) {
          var fp = fingerprint(body);
          return file(r.kind, body).then(function () { down++; touched[r.kind + ':' + r.id] = { r: r.modified, h: fp }; });
        });
      }
    }).then(function () {
      // Filing a download stamps it as modified now, here: that stamp is what "in step" is measured from.
      if (!Object.keys(touched).length) return;
      return localDocs().then(function (docs) {
        docs.forEach(function (d) { var k = d.kind + ':' + d.id; if (k in touched) st[k] = { l: d.modified, r: touched[k].r, h: touched[k].h, v: FORM }; });
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
    stored = {}; pictures = {};
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
