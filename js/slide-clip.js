/* Slide copy buffer — system clipboard + same-browser fallback.
   Format is plain JSON so Cmd/Ctrl+C in one browser can Cmd/Ctrl+V in another. */
(function (global) {
  'use strict';
  /** @type {import("../src/types.js").SlideForgeGlobal} */
  var SF = global.SF = global.SF || {};
  var KEY = 'slideforge.slideClip.v1';
  var MARK = 'slideforge-slide';

  /**
   * @param {object} slide
   * @param {object|null} [game]  embedded game when the slide is type "game"
   * @returns {string}
   */
  function pack(slide, game) {
    var payload = { format: MARK, v: 1, slide: slide };
    if (game) payload.game = game;
    return JSON.stringify(payload);
  }

  /**
   * @param {string|null|undefined} text
   * @returns {{ slide: object, game: object|null, v: number }|null}
   */
  function unpack(text) {
    if (!text || typeof text !== 'string') return null;
    var t = text.trim();
    if (!t || t.charAt(0) !== '{') return null;
    try {
      var o = JSON.parse(t);
      if (!o || o.format !== MARK || !o.slide || typeof o.slide !== 'object') return null;
      return { slide: o.slide, game: o.game && typeof o.game === 'object' ? o.game : null, v: o.v || 1 };
    } catch (e) {
      return null;
    }
  }

  function stash(text) {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(KEY, String(text || ''));
    } catch (e) {}
  }

  function recall() {
    try {
      if (typeof localStorage === 'undefined') return null;
      return localStorage.getItem(KEY);
    } catch (e) {
      return null;
    }
  }

  SF.SlideClip = {
    KEY: KEY,
    MARK: MARK,
    pack: pack,
    unpack: unpack,
    stash: stash,
    recall: recall
  };
})(typeof window !== 'undefined' ? window : globalThis);
