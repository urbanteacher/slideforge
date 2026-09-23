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

  /* The fallback lived in localStorage for good, and a slide carrying a
     pasted screenshot is megabytes — taken out of the same few megabytes
     every saved lesson has to fit in, so copying one slide could be what
     made the next autosave fail. A small copy still goes there, so another
     tab can paste it; a large one stays in this tab, in memory and in
     sessionStorage, which has a quota of its own. */
  var SHARED_MAX = 100 * 1024;
  var held = null;

  function stash(text) {
    var t = String(text || '');
    held = t;
    try {
      if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(KEY, t);
    } catch (e) {}
    try {
      if (typeof localStorage === 'undefined') return;
      if (t.length <= SHARED_MAX) localStorage.setItem(KEY, t);
      else localStorage.removeItem(KEY);
    } catch (e) {}
  }

  function recall() {
    if (held) return held;
    try {
      var mine = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(KEY) : null;
      if (mine) return mine;
    } catch (e) {}
    try {
      if (typeof localStorage === 'undefined') return null;
      return localStorage.getItem(KEY);
    } catch (e) {
      return null;
    }
  }

  /* Give back the space an oversized copy from before this change is still
     holding. */
  try {
    if (typeof localStorage !== 'undefined') {
      var left = localStorage.getItem(KEY);
      if (left && left.length > SHARED_MAX) localStorage.removeItem(KEY);
    }
  } catch (e) {}

  SF.SlideClip = {
    KEY: KEY,
    MARK: MARK,
    pack: pack,
    unpack: unpack,
    stash: stash,
    recall: recall
  };
})(typeof window !== 'undefined' ? window : globalThis);
