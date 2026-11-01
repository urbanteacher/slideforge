/* A drawn picture of panels side by side, shown one panel per click: the panel in hand at full strength, the
 * ones before it dimmed, the ones after it not there yet. A still (thumbnail, PDF) shows every panel.
 *
 * figureData:
 *   svg     the picture's own markup (an SVG the size of the slide), drawn over the whole slide, heading included;
 *           inside the data, not a file, so a still or a PDF never prints before it has loaded
 *   boxes   [[x, y, w, h], …] each panel, left to right; a panel's box takes in the arrow before it
 *   ground  the picture's background colour, which covers a panel not yet shown
 * Each step may set: caption, upto (the last panel shown).
 */
import { el, set, tween } from './kit.js';

export var panels = {
  /** @param {any} fig */
  mount: function (fig) {
    var d = fig.data, svg = fig.svg, st = fig.stage, boxes = d.boxes || [], ground = d.ground || '#fbfaf8';
    var pic = el('g', {}, svg);
    pic.innerHTML = String(d.svg || '');
    var covers = boxes.map(function (/** @type {number[]} */ b) {
      return el('rect', { x: b[0], y: b[1], width: b[2], height: b[3], fill: ground, opacity: 0, 'pointer-events': 'none' }, svg);
    });
    var cancel = function () {};
    return {
      /** @param {any} step @param {boolean} animate */
      update: function (step, animate) {
        st.caption(step.caption);
        var upto = typeof step.upto === 'number' ? step.upto : boxes.length - 1, all = !fig.interactive;
        /* Not yet: covered. In hand: clear. Before it: a veil, so it reads as done. */
        var want = covers.map(function (_, /** @type {number} */ i) { return all || i === upto ? 0 : i < upto ? 0.62 : 1; });
        var from = covers.map(function (c) { return Number(c.getAttribute('opacity') || 0); });
        cancel();
        cancel = tween(animate ? 350 : 0, function (/** @type {number} */ k) {
          covers.forEach(function (c, i) { set(c, { opacity: from[i] + (want[i] - from[i]) * k }); });
        });
      },
      destroy: function () { cancel(); }
    };
  }
};
