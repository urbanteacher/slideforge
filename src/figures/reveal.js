/* A list revealed one row at a time, on one slide: the question and its answer together, not a blank
 * slide and then an answers slide. Each row is a drawn icon, a name, words that stay, and a tag and
 * words that arrive on their step. The row being talked about is full strength with a red marker; the
 * others dim. A still (thumbnail, PDF, student copy) shows every row, full strength.
 *
 * figureData:
 *   rows   [{ icon?: svg string, ring?: colour, name?, say?, tag?: { text, fill }, text? }]
 *   mode   'answers': every row shows from the start, its tag and text arrive on its step
 *          'build':   each row arrives on its step
 *   sub    a line under the title          rail   a line joining the icons (numbered steps)
 *   dim    false: rows already shown stay full strength; only the red marker says which row is in hand
 *   nameX, sayX, tagX, textX, size, max     where the columns sit, the words' size, a row's most height
 * Each step may set: caption, explain, upto (the last row shown or answered; -1 for none), and all: every row
 * shown at full strength, as a still shows them, so the list can be read whole before the show moves on.
 */
import { NU, H, el, set, tween, wrap } from './kit.js';

var TOP = 140, BOTTOM = H - 92;

export var reveal = {
  /** @param {any} fig */
  mount: function (fig) {
    var d = fig.data, svg = fig.svg, st = fig.stage, rows = d.rows || [], build = d.mode === 'build';
    var ink = st.ink, rule = st.dark ? NU.line : '#d9d4ca';
    var top = TOP;
    if (d.sub) { el('text', { x: 64, y: 136, 'font-family': NU.sans, 'font-size': 20, fill: st.soft }, svg, d.sub); top = 160; }
    var rh = Math.min(d.max || 120, (BOTTOM - top) / Math.max(1, rows.length));
    var iconX = 104, nameX = d.nameX || 160, sayX = d.sayX || nameX, tagX = d.tagX || 470;
    var textX = d.textX || (rows.some(function (/** @type {any} */ r) { return r.tag; }) ? 712 : 470), size = d.size || 21;
    var tagW = Math.max.apply(null, [60].concat(rows.filter(function (/** @type {any} */ r) { return r.tag; }).map(function (/** @type {any} */ r) { return r.tag.text.length * 10.5 + 34; })));
    if (d.rail && rows.length > 1) el('line', { x1: iconX, y1: top + rh / 2, x2: iconX, y2: top + rh * (rows.length - 0.5), stroke: rule, 'stroke-width': 6 }, svg);
    /** @param {string} t @param {number} x @param {number} cy @param {number} sz @param {number} width @param {any} attrs @param {Element} g */
    function words(t, x, cy, sz, width, attrs, g) {
      var lines = wrap(t, sz, width);
      lines.forEach(function (l, k) {
        el('text', Object.assign({ x: x, y: cy + sz * 0.35 - (lines.length - 1) * sz * 0.65 + k * sz * 1.3, 'font-family': NU.sans, 'font-size': sz, fill: ink }, attrs), g, l);
      });
    }
    var parts = rows.map(function (/** @type {any} */ r, /** @type {number} */ i) {
      var y0 = top + i * rh, cy = y0 + rh / 2, rr = Math.min(32, rh * 0.36);
      var row = el('g', {}, svg);
      if (i) el('line', { x1: 64, y1: y0, x2: 1216, y2: y0, stroke: rule, 'stroke-width': 1.5 }, row);
      var mark = el('rect', { x: 52, y: y0 + 8, width: 5, height: rh - 16, rx: 2, fill: NU.red, opacity: 0 }, row);
      el('circle', { cx: iconX, cy: cy, r: rr, fill: r.ring || (st.dark ? 'rgba(255,255,255,.1)' : '#eef1f5') }, row);
      var icon = el('g', { transform: 'translate(' + iconX + ' ' + cy + ') scale(' + (rr / 32).toFixed(3) + ')' }, row);
      if (r.icon) icon.innerHTML = r.icon;
      if (r.name) {
        var nl = wrap(r.name, 26, Math.max(120, (r.say && sayX > nameX ? sayX : r.tag ? tagX : textX) - nameX - 24));
        nl.forEach(function (l, k) { el('text', { x: nameX, y: cy + 9 - (nl.length - 1) * 15 + k * 30, 'font-family': NU.serif, 'font-size': 26, fill: ink }, row, l); });
      }
      if (r.say) words(r.say, sayX, cy, d.saySize || 19, (r.tag ? tagX : textX) - sayX - 24, { 'font-style': 'italic' }, row);
      var answer = el('g', {}, row), ask = el('g', {}, row);
      if (r.tag) {
        el('rect', { x: tagX, y: cy - 19, width: tagW, height: 38, rx: 19, fill: r.tag.fill }, answer);
        el('text', { x: tagX + tagW / 2, y: cy + 6, 'text-anchor': 'middle', 'font-family': NU.sans, 'font-size': 15, 'font-weight': 700, 'letter-spacing': 1.2, fill: '#fff' }, answer, r.tag.text);
        el('rect', { x: tagX, y: cy - 19, width: 60, height: 38, rx: 19, fill: 'none', stroke: rule, 'stroke-width': 2, 'stroke-dasharray': '5 4' }, ask);
        el('text', { x: tagX + 30, y: cy + 7, 'text-anchor': 'middle', 'font-family': NU.sans, 'font-size': 20, 'font-weight': 700, fill: st.soft }, ask, '?');
      }
      if (r.text) words(r.text, textX, cy, size, 1216 - textX, {}, answer);
      return { row: row, mark: mark, answer: answer, ask: ask, op: 1 };
    });
    var cancel = function () {};
    return {
      /** @param {any} step @param {boolean} animate */
      update: function (step, animate) {
        st.caption(step.caption);
        var upto = typeof step.upto === 'number' ? step.upto : rows.length - 1;
        /* A still shows everything, full strength; live, the row in hand is full and the rest dim. */
        var all = !fig.interactive || !!step.all;
        var want = parts.map(function (_, /** @type {number} */ i) {
          var shown = i <= upto;
          var faint = d.dim === false ? 1 : 0.4;
          var row = build ? (shown ? (all || i === upto ? 1 : faint) : 0) : (all || upto < 0 || i === upto ? 1 : faint);
          return { row: row, answer: shown ? 1 : 0, ask: shown ? 0 : 1, mark: !all && i === upto ? 1 : 0 };
        });
        var from = parts.map(function (p) { return { row: Number(p.row.getAttribute('opacity') || 1), answer: Number(p.answer.getAttribute('opacity') || 1) }; });
        cancel();
        cancel = tween(animate ? 350 : 0, function (/** @type {number} */ k) {
          parts.forEach(function (p, i) {
            set(p.row, { opacity: from[i].row + (want[i].row - from[i].row) * k });
            set(p.answer, { opacity: from[i].answer + (want[i].answer - from[i].answer) * k });
          });
        });
        parts.forEach(function (p, i) { set(p.ask, { opacity: want[i].ask }); set(p.mark, { opacity: want[i].mark }); });
      },
      destroy: function () { cancel(); }
    };
  }
};
