/* SlideForge — a lesson's fingerprint.

   The Lesson studio ships its own copy of each built-in lesson, converted
   ahead of time (assets/lab-lessons/, built by tools/build-lab-lessons.mjs),
   so opening one is instant and nothing is converted in the browser. A
   shipped copy is used only for the lesson it was made from: same slides,
   same words, same settings. This is how that is told.

   Ids are left out, and so are the times a copy was made and saved: a
   lesson is given new ones each time it is put in a Library, and they say
   nothing about what is on its slides. Everything else counts, in any order
   of keys, so a lesson edited in the classic editor, or rebuilt from a
   changed js/lessons.js, no longer matches and is converted afresh.

   Plain script, no dependencies: the build tool and the tests run it in Node. */
(function (global) {
  'use strict';
  /** @type {any} */
  var SF = global.SF = global.SF || {};
  /** @type {Record<string, number>} */
  var VOLATILE = { id: 1, gameId: 1, modified: 1, created: 1 };

  /** @param {any} v @returns {string} */
  function canon(v) {
    if (Array.isArray(v)) return '[' + v.map(function (x) { return canon(x === undefined ? null : x); }).join(',') + ']';
    if (v && typeof v === 'object') {
      return '{' + Object.keys(v).filter(function (k) { return !VOLATILE[k] && v[k] !== undefined && typeof v[k] !== 'function'; }).sort()
        .map(function (k) { return JSON.stringify(k) + ':' + canon(v[k]); }).join(',') + '}';
    }
    return JSON.stringify(v === undefined ? null : v);
  }

  /** Two 32-bit FNV-1a passes with different starts, as 16 hex digits. @param {string} s */
  function fnv(s) {
    var a = 0x811c9dc5, b = 0x01000193 ^ 0x9e3779b9;
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      a = Math.imul(a ^ c, 0x01000193) >>> 0;
      b = Math.imul(b ^ c, 0x01000193) >>> 0;
      b = (b ^ (b >>> 13)) >>> 0;
    }
    return ('0000000' + a.toString(16)).slice(-8) + ('0000000' + b.toString(16)).slice(-8);
  }

  /** @param {any} lesson */
  SF.lessonHash = function (lesson) { return fnv(canon(lesson)); };
})(typeof window !== 'undefined' ? window : globalThis);
