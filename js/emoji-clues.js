/* Shared emoji/clue tiling for wall and learner phone. Keep in sync with
   SF.emojiCluePieces / emojiClueLayout in js/model.js — join.html loads this
   alone so phones do not pull the whole model. */
(function (global) {
  'use strict';
  /** @type {import("../src/types.js").SlideForgeGlobal} */
  var SF = global.SF = global.SF || {};

  function emojiCluePieces(text) {
    var clueText = String(text || '');
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      return Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(clueText),
        function (part) { return part.segment; }).filter(function (part) { return part.trim(); });
    }
    return Array.from(clueText).filter(function (part) { return part.trim(); });
  }

  function emojiClueLayout(text) {
    var clueText = String(text || '');
    var pieces = emojiCluePieces(clueText);
    var tiled = pieces.length > 0 && pieces.length <= 10 && !/[a-zA-Z0-9]/.test(clueText);
    return { tiled: tiled, pieces: pieces, text: clueText };
  }

  SF.emojiCluePieces = emojiCluePieces;
  SF.emojiClueLayout = emojiClueLayout;
})(typeof window !== 'undefined' ? window : globalThis);
