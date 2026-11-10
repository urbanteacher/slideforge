/* Share a lesson as a read-only or follow-along link.

   Used by the editor toolbar and by Teacher Presenter. Dialogs always run in
   the window that calls shareLessonDoc — so the desk can open them locally
   instead of bouncing teachers to the wall. */
(function (global) {
  'use strict';
  /** @type {import("../src/types.js").SlideForgeGlobal} */
  var SF = global.SF = global.SF || {};

  /**
   * @param {object} doc  lesson deck to upload
   * @param {object} [opts]
   * @param {boolean} [opts.live]  room is running (enables follow-along)
   * @param {function(string): boolean} [opts.watchOn]  register share id for follow
   * @param {function(string)=} [opts.toast]  status messages
   * @param {boolean} [opts.studio]  a lab deck, for the studio viewer (lab-app/view.html, M12)
   */
  /* An audience link never carries the speaker notes. They were in every shared
     copy, unseen on the page but in the lesson anyone with the link could fetch
     (/api/share/<id>). The presenter's notes go only to their own private link:
     Notes on another device (js/player.js). */
  /** @param {any} doc */
  function withoutNotes(doc) {
    var copy = JSON.parse(JSON.stringify(doc));
    (copy.slides || []).forEach(function (/** @type {any} */ s) {
      if (!s) return;
      delete s.notes;
      (s.layers || []).forEach(function (/** @type {any} */ l) { if (l) delete l.notes; });
    });
    return copy;
  }

  /* Notes on another device: the studio's show with its notes card (js/lab-engine.js, the Present menu's item). */
  function notesElsewhere() {
    var start = document.getElementById('btnNotesElsewhere');
    if (start) { start.click(); return; }
    (SF.toast || function () {})('Open the lesson in SlideForge, then choose this again.');
  }

  /* Online shares (BACKLOG CS-06, supabase/migrations/0002_shares.sql): a Lesson-studio share made by a signed-in
     teacher goes to the teacher's account rather than the relay's disk, so it survives an app update, and it can be
     private: only a signed-in teacher can open it. Signed out, a share goes to the relay as before. */
  function cloudClient() {
    var c = SF.Cloud;
    return c && c.user && c.user() && c.client ? c.client() : null;
  }

  /** A share's id: 32 hex characters, as the relay's own ids, so the follow link and the viewer read it the same. */
  function newShareId() {
    var b = new Uint8Array(16);
    crypto.getRandomValues(b);
    return Array.prototype.map.call(b, function (/** @type {number} */ x) { return (x < 16 ? '0' : '') + x.toString(16); }).join('');
  }

  /**
   * The copy split for travel (BACKLOG CS-14, step 2): a studio copy's pictures (packed by shareCopy into
   * `pictures`, the slides holding `@picture:N`) go one request each after the lesson, which carries
   * `pictureCount` instead, so a share is no longer held to the size of one request. A copy without them is sent whole.
   * @param {any} body
   * @returns {{ doc: any, pictures: string[] }}
   */
  function splitPictures(body) {
    var pics = Array.isArray(body && body.pictures) ? body.pictures : [];
    if (!pics.length) return { doc: body, pictures: [] };
    var doc = Object.assign({}, body, { pictureCount: pics.length });
    delete doc.pictures;
    return { doc: doc, pictures: pics };
  }

  var SHARES_KEY = 'slideforge.shares.v1';
  /** This browser's list of the shares it made, newest first, with the keys that withdraw them. */
  function readShares() { try { var v = JSON.parse(localStorage.getItem(SHARES_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  /** @param {any} entry */
  function rememberShare(entry) {
    try { localStorage.setItem(SHARES_KEY, JSON.stringify([entry].concat(readShares().filter(function (s) { return s && s.id !== entry.id; })).slice(0, 40))); } catch (e) {}
  }
  /** @param {string} id */
  function forgetShare(id) {
    try { localStorage.setItem(SHARES_KEY, JSON.stringify(readShares().filter(function (s) { return s && s.id !== id; }))); } catch (e) {}
  }

  /** A step tried up to three times, a moment apart: one dropped request among forty pictures is not the end.
   *  @param {function(): Promise<any>} step @param {number=} left @returns {Promise<any>} */
  function retried(step, left) {
    left = left === undefined ? 2 : left;
    return step().catch(function (/** @type {any} */ e) {
      if (!left || (e && e.final)) throw e;
      return new Promise(function (r) { setTimeout(r, 800 * (3 - left)); }).then(function () { return retried(step, left - 1); });
    });
  }

  /**
   * Upload the copy: online when `isPrivate` is a boolean (a signed-in teacher's studio share), else to the relay.
   * Its pictures follow the lesson, two at a time, each tried up to three times. The share is remembered in this
   * browser, with its key, before they go, so it can always be withdrawn. If one cannot be sent, the half-made share
   * is taken down again, so no link goes out with pictures missing; if even that fails, the error says a copy was
   * left, and the share stays in the list to withdraw.
   * @param {any} body  the copy to share
   * @param {boolean|null} isPrivate
   * @param {function(string)=} say  progress, for the toast
   * @returns {Promise<{ id: string, key?: string, base?: string, durable: boolean, online: boolean }>}
   */
  function upload(body, isPrivate, say) {
    var split = splitPictures(body), pics = split.pictures, n = pics.length;
    var done = 0;
    var tell = function () { done++; if (n > 1 && say) say('Uploading pictures\u2026 ' + done + ' of ' + n); };
    /** Every picture, two at a time; the first that cannot be sent (after its tries) stops the rest.
     *  @param {function(number): Promise<any>} one @returns {Promise<void>} */
    var each = function (one) {
      var i = 0, failed = false;
      var worker = function () {
        if (failed || i >= n) return Promise.resolve();
        var k = i++;
        return retried(function () { return one(k); }).then(function () { tell(); return worker(); }, function (/** @type {any} */ e) {
          failed = true;
          var why = e && e.message ? e.message : String(e);
          throw new Error(/picture \d+ of/.test(why) ? why : 'picture ' + (k + 1) + ' of ' + n + ': ' + why);
        });
      };
      return Promise.all([worker(), worker()]).then(function () {});
    };
    /** Taken down after a picture failed; the error says whether a copy was left.
     *  @param {string} id @param {function(): Promise<boolean>} withdraw @param {any} e */
    var undo = function (id, withdraw, e) {
      var why = e && e.message ? e.message : String(e);
      return withdraw().then(function (ok) { return ok; }, function () { return false; }).then(function (ok) {
        if (ok) { forgetShare(id); throw e; }
        throw new Error(why + '. A copy without all its pictures was left; withdraw it from your shared lessons.');
      });
    };
    var title = String(body.title || '');
    var client = isPrivate === null ? null : cloudClient();
    if (client) {
      var id = newShareId();
      return client.from('shares').insert({ id: id, title: title.slice(0, 200), private: !!isPrivate, doc: split.doc })
        .then(function (/** @type {any} */ r) {
          if (r && r.error) throw new Error(r.error.message || 'the account refused it');
          if (!n) return;
          rememberShare({ id: id, key: '', online: true, private: !!isPrivate, title: title, at: Date.now() });
          return each(function (k) {
            // upsert: a try that reached the database but whose answer was lost does not trip over itself.
            return client.from('share_pictures').upsert({ share_id: id, n: k, data: pics[k] }).then(function (/** @type {any} */ q) {
              if (q && q.error) throw Object.assign(new Error('picture ' + (k + 1) + ' of ' + n + ': ' + (q.error.message || 'refused')), { final: /violates|check constraint|permission|row-level/i.test(q.error.message || '') });
            });
          }).catch(function (/** @type {any} */ e) {
            // supabase-js says a refusal in { error }, rather than by throwing: only a delete with no error counts.
            return undo(id, function () { return client.from('shares').delete().eq('id', id).then(function (/** @type {any} */ d) { return !(d && d.error); }); }, e);
          });
        })
        .then(function () { return { id: id, base: location.origin, durable: true, online: true }; });
    }
    return fetch('/api/share', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(n ? { doc: split.doc, pictures: n } : { doc: body })
    }).then(function (r) {
      return r.json().then(function (/** @type {any} */ j) { if (!r.ok) throw new Error(j.error || ('HTTP ' + r.status)); return Object.assign({ online: false }, j); });
    }).then(function (/** @type {any} */ made) {
      if (!n) return made;
      var auth = { Authorization: 'Bearer ' + made.key };
      rememberShare({ id: made.id, key: made.key, online: false, private: false, title: title, at: Date.now() });
      return each(function (k) {
        return fetch('/api/share/' + made.id + '/picture/' + k, { method: 'PUT', headers: auth, body: pics[k] }).then(function (r) {
          if (r.ok) return;
          return r.json().catch(function () { return {}; }).then(function (/** @type {any} */ j) {
            // A refusal (too large, not a picture, the wrong key) is the same the next time: not tried again.
            throw Object.assign(new Error('picture ' + (k + 1) + ' of ' + n + ': ' + (j.error || 'refused')), { final: r.status >= 400 && r.status < 500 });
          });
        });
      }).then(function () { return made; }, function (/** @type {any} */ e) {
        return undo(made.id, function () { return fetch('/api/share/' + made.id, { method: 'DELETE', headers: auth }).then(function (r) { return r.ok || r.status === 404; }); }, e);
      });
    });
  }


  function shareLessonDoc(doc, opts) {
    opts = opts || {};
    var toast = opts.toast || (SF.toast ? function (m) { SF.toast(m); } : function () {});
    if (!doc) { toast('No lesson to share.'); return; }
    if (!SF.askChoice || !SF.askText) { toast('Share dialog is not available.'); return; }
    if (location.protocol !== 'http:' && location.protocol !== 'https:') {
      toast('Sharing needs the SlideForge server.');
      return;
    }

    var liveNow = !!opts.live;
    /** @type {{ choice: string, body: any }} */
    var sent = { choice: '', body: null };
    SF.askChoice({
      title: 'Share “' + (doc.title || 'this lesson') + '”',
      detail: 'The first three put a copy ' + (opts.studio && cloudClient() ? 'in your account' : 'on this server') + ', without your notes, at an address nobody can guess. They cannot ' +
        'edit it and it is not listed anywhere — but a link that escapes is a lesson that ' +
        'escaped. ' + (opts.studio ? 'The games come as their slides; practice lets one learner answer them. ' : 'Games are not carried across; the slides are. ') +
        (opts.studio && cloudClient() ? 'Next you choose whether anyone with the link can open it, or only signed-in teachers.' : 'You get a key that withdraws it.' + (opts.studio && SF.Cloud && SF.Cloud.client && SF.Cloud.client() ? ' Sign in to keep it in your account, where it survives app updates and can be for teachers only.' : '')),
      options: [
        { value: 'practice', label: 'Practice: the games, for one learner',
          detail: 'The slides and every game that can be played alone: they answer, see the answer and why, and keep a score on their own device. Games that need a room — spoken, boards, sorts on phones — say so instead.' },
        { value: 'read', label: 'A link to read at their own pace',
          detail: 'They open it whenever they like and page through it themselves. Works whether or not you are presenting.' },
        { value: 'follow', label: 'A screen that follows you live',
          disabled: !liveNow,
          detail: 'Full screen on a desktop or a second projector. It moves when you move, ' +
            'including through a build, and cannot run ahead. No PIN, and nobody watching ' +
            'appears in your reports.',
          why: 'Needs a room running — press Host live first, then share again. It only ' +
            'works while you are presenting.' },
        { value: 'notes', label: 'Your notes on your phone or a prompt screen',
          detail: 'For you, not the room: a private link to your speaker notes, which follow the show as it moves. ' +
            'Your phone can press Next and Back. It starts the show if it is not running, and stops when the show ends.' }
      ]
    }, function (choice) {
      /* Not a copy on the server: the notes go to the show's own private channel (js/player.js). */
      if (choice === 'notes') { notesElsewhere(); return; }
      sent.choice = choice;
      /* Practice carries the solo-playable games inside the copy. */
      /* A studio copy carries its games as slides; practice is a flag the studio viewer reads. */
      var body = withoutNotes(opts.studio
        ? (choice === 'practice' ? Object.assign({}, doc, { practice: true }) : doc)
        : choice === 'practice' && SF.practiceDoc
          ? SF.practiceDoc(doc, function (id) { return SF.GameStore ? SF.GameStore.get(id) : null; })
          : doc);
      sent.body = body;
      /* Signed in, a studio share asks who may open it; signed out (or a classic copy), it goes to the relay. */
      if (opts.studio && cloudClient()) {
        SF.askChoice({
          title: 'Who can open it?',
          detail: 'It is kept in your account, so the link survives app updates.',
          options: [
            { value: 'open', label: 'Anyone with the link',
              detail: 'Students and colleagues open it without signing in, as before.' },
            { value: 'teachers', label: 'Signed-in teachers only',
              detail: 'Only a teacher signed in to SlideForge with a work email can open it. Anyone else is asked to sign in. For colleagues, not students.' }
          ]
        }, function (who) { if (who) send(who === 'teachers'); });
        return;
      }
      send(null);
    });

    /** @param {boolean|null} isPrivate */
    function send(isPrivate) {
      var choice = sent.choice, body = sent.body;
      toast('Uploading a copy…');
      upload(body, isPrivate, toast).then(function (j) {
        var base = String(j.base || location.origin).replace(/\/$/, '');
        var url = opts.studio ? base + '/lab-app/view.html?s=' + j.id : (j.url || (base + '/view.html?s=' + j.id));
        var watched = false;
        if (typeof opts.watchOn === 'function') watched = !!opts.watchOn(j.id);
        var followUrl = (choice === 'follow' && watched) ? url + '&follow=1' : '';

        rememberShare({ id: j.id, key: j.key || '', online: !!j.online, private: isPrivate === true, title: doc.title || '', at: Date.now() });

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(function () {
            toast(isPrivate ? 'Link copied. Only signed-in teachers can open it.' : 'Link copied. Anyone with it can read the lesson.');
          }, function () { toast('Shared: ' + url); });
        } else {
          toast('Shared: ' + url);
        }

        var durability = j.online
          ? 'It is kept in your account, so it survives app updates.'
          : j.durable
          ? 'This server keeps shared copies on durable storage — they survive an app update.'
          : 'This is a quick share: it lasts until the app is next updated or restarted, and an older one makes way when the shelf is full. Sign in to keep a share in your account instead.';

        if (followUrl) {
          SF.askText({
            title: 'Follow-along link for a big screen',
            detail: 'Open this on a desktop and it full-screens the lesson and moves when you do. ' +
              'No PIN and no joining — whoever holds the address watches, and they cannot run ahead ' +
              'of you or answer anything. It stops working when this room ends, or when you withdraw ' +
              'the shared copy. Scan the code or paste the link.',
            value: followUrl, qr: true, confirm: 'Next — the read-only link'
          }, function () { readOnlyDialog(); });
          return;
        }
        readOnlyDialog();
        function readOnlyDialog() {
          SF.askText({
            title: isPrivate ? 'Your link for teachers' : 'Your read-only link',
            detail: (isPrivate ? 'Only a teacher signed in to SlideForge can open this address; anyone else is asked to sign in. ' : 'Anyone with this address can open the lesson. ') +
              'Scan the code or paste the link — it is already on your clipboard. ' + durability,
            value: url, qr: true, confirm: 'Done'
          }, function () {});
        }
      }).catch(function (e) {
        toast('Could not share: ' + (e.message || e));
      });
    }
  }

  SF.shareLessonDoc = shareLessonDoc;
  /* The upload on its own, for tests/share-upload.test.js: the dialogs above are the way in for everyone else. */
  SF.shareUpload = upload;
})(typeof window !== 'undefined' ? window : globalThis);
