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
   */
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
    SF.askChoice({
      title: 'Share “' + (doc.title || 'this lesson') + '”',
      detail: 'Either one puts a copy on this server at an address nobody can guess. They cannot ' +
        'edit it and it is not listed anywhere — but a link that escapes is a lesson that ' +
        'escaped. Games are not carried across; the slides are. You get a key that withdraws it.',
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
            'works while you are presenting.' }
      ]
    }, function (choice) {
      toast('Uploading a copy…');
      fetch('/api/share', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        /* Practice carries the solo-playable games inside the copy. */
        body: JSON.stringify({ doc: choice === 'practice' && SF.practiceDoc
          ? SF.practiceDoc(doc, function (id) { return SF.GameStore ? SF.GameStore.get(id) : null; })
          : doc })
      }).then(function (r) {
        return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || ('HTTP ' + r.status)); return j; });
      }).then(function (j) {
        var url = j.url || (String(j.base || location.origin).replace(/\/$/, '') + '/view.html?s=' + j.id);
        var watched = false;
        if (typeof opts.watchOn === 'function') watched = !!opts.watchOn(j.id);
        else if (SF.Live && SF.Live.watchOn) watched = !!SF.Live.watchOn(j.id);
        var followUrl = (choice === 'follow' && watched) ? url + '&follow=1' : '';

        try {
          var keys = JSON.parse(localStorage.getItem('slideforge.shares.v1') || '[]');
          keys.unshift({ id: j.id, key: j.key, title: doc.title || '', at: Date.now() });
          localStorage.setItem('slideforge.shares.v1', JSON.stringify(keys.slice(0, 40)));
        } catch (e) {}

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(function () {
            toast('Link copied. Anyone with it can read the lesson.');
          }, function () { toast('Shared: ' + url); });
        } else {
          toast('Shared: ' + url);
        }

        var durability = j.durable
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
            title: 'Your read-only link',
            detail: 'Anyone with this address can open the lesson. Scan the code or paste the link — it is already on your clipboard. ' + durability,
            value: url, qr: true, confirm: 'Done'
          }, function () {});
        }
      }).catch(function (e) {
        toast('Could not share: ' + (e.message || e));
      });
    });
  }

  SF.shareLessonDoc = shareLessonDoc;
})(typeof window !== 'undefined' ? window : globalThis);
