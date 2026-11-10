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
   * Upload the copy: online when `isPrivate` is a boolean (a signed-in teacher's studio share), else to the relay.
   * @param {any} body  the copy to share
   * @param {boolean|null} isPrivate
   * @returns {Promise<{ id: string, key?: string, base?: string, durable: boolean, online: boolean }>}
   */
  function upload(body, isPrivate) {
    var client = isPrivate === null ? null : cloudClient();
    if (client) {
      var id = newShareId();
      return client.from('shares').insert({ id: id, title: String(body.title || '').slice(0, 200), private: !!isPrivate, doc: body })
        .then(function (/** @type {any} */ r) {
          if (r && r.error) throw new Error(r.error.message || 'the account refused it');
          return { id: id, base: location.origin, durable: true, online: true };
        });
    }
    return fetch('/api/share', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doc: body })
    }).then(function (r) {
      return r.json().then(function (/** @type {any} */ j) { if (!r.ok) throw new Error(j.error || ('HTTP ' + r.status)); return Object.assign({ online: false }, j); });
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
      upload(body, isPrivate).then(function (j) {
        var base = String(j.base || location.origin).replace(/\/$/, '');
        var url = opts.studio ? base + '/lab-app/view.html?s=' + j.id : (j.url || (base + '/view.html?s=' + j.id));
        var watched = false;
        if (typeof opts.watchOn === 'function') watched = !!opts.watchOn(j.id);
        var followUrl = (choice === 'follow' && watched) ? url + '&follow=1' : '';

        try {
          var keys = JSON.parse(localStorage.getItem('slideforge.shares.v1') || '[]');
          keys.unshift({ id: j.id, key: j.key || '', online: !!j.online, private: isPrivate === true, title: doc.title || '', at: Date.now() });
          localStorage.setItem('slideforge.shares.v1', JSON.stringify(keys.slice(0, 40)));
        } catch (e) {}

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
          : 'On this server, shared copies live with the app files and are gone at the next deploy unless a persistent disk is attached (SLIDEFORGE_DATA_DIR).';

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
})(typeof window !== 'undefined' ? window : globalThis);
