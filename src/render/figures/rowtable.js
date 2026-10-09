/* The row under the pointer: what a tooltip is made of.
 *
 * The chart on the left and the table it was drawn from on the right. Hover
 * a bubble and its row lights in the table, and a line carries the row's
 * fields across into the card: a tooltip is that row, printed. Nothing is
 * computed; Vega looks up the datum behind the mark.
 *
 * figureData: the bubbles figure's data (rows, x, y, size, groups, tooltip) plus
 *   columns  [{ field, title, format? }] the table's columns, in order
 * Each step may set: caption, demo (a row id shown before anyone hovers), card (false hides the card).
 */
import { NU, W, H, el, set, format, tooltipCard } from './kit.js';
import { scatter, tooltipRows } from './plots.js';

var PLOT = { x0: 110, x1: 600, y0: 170, y1: H - 160 };
var TABLE = { x: 680, y: 150, w: W - 740, rows: 15, lh: 27 };

export var rowtable = {
  /** @param {any} fig */
  mount: function (fig) {
    var d = fig.data, svg = fig.svg, st = fig.stage;
    var plot = scatter(svg, d, PLOT, { ink: st.ink, soft: st.soft, font: 13 });
    var rows = d.rows.slice().sort(function (/** @type {any} */ a, /** @type {any} */ b) { return a.country < b.country ? -1 : 1; });
    var cols = d.columns, weights = cols.map(function (/** @type {any} */ c, /** @type {number} */ i) { return i === 0 ? 1.7 : 1; });
    var unit = TABLE.w / weights.reduce(function (a, b) { return a + b; }, 0);
    var colX = weights.map(function (_, i) { return TABLE.x + weights.slice(0, i).reduce(function (a, b) { return a + b; }, 0) * unit; });
    var tbl = el('g', { 'font-family': NU.mono, 'font-size': 14 }, svg);
    el('rect', { x: TABLE.x - 12, y: TABLE.y - 28, width: TABLE.w + 24, height: TABLE.lh * (TABLE.rows + 1) + 20, rx: 8, fill: 'rgba(255,255,255,.04)', stroke: NU.line }, tbl);
    cols.forEach(function (/** @type {any} */ c, /** @type {number} */ i) {
      el('text', { x: colX[i], y: TABLE.y - 6, fill: NU.mist, 'font-weight': 700 }, tbl, c.field);
    });
    var lit = el('rect', { x: TABLE.x - 8, width: TABLE.w + 16, height: TABLE.lh, rx: 4, fill: 'rgba(200,16,46,.28)', stroke: NU.red, 'stroke-width': 1.5, opacity: 0 }, tbl);
    var cells = Array.from({ length: TABLE.rows }, function (_, r) {
      return cols.map(function (/** @type {any} */ c, /** @type {number} */ i) { return el('text', { x: colX[i], y: TABLE.y + 22 + r * TABLE.lh, fill: NU.paper }, tbl); });
    });
    var count = el('text', { x: TABLE.x, y: TABLE.y + 22 + TABLE.rows * TABLE.lh + 14, 'font-family': NU.sans, 'font-size': 13, fill: NU.mist }, svg, rows.length + ' rows · one per country · the table behind the chart');
    var link = el('path', { fill: 'none', stroke: NU.red, 'stroke-width': 2, 'stroke-dasharray': '5 4', opacity: 0, 'pointer-events': 'none' }, svg);
    var ring = el('circle', { fill: 'none', stroke: NU.paper, 'stroke-width': 2.5, opacity: 0, 'pointer-events': 'none' }, svg);
    var cardLayer = el('g', { 'pointer-events': 'none' }, svg);
    var showCard = true;

    /** Show the table around one row, and light it. @param {any} m */
    function focus(m) {
      var at = m ? rows.indexOf(m.row) : 0, top = Math.max(0, Math.min(rows.length - TABLE.rows, at - Math.floor(TABLE.rows / 2)));
      cells.forEach(function (line, r) {
        var row = rows[top + r];
        line.forEach(function (t, i) { var c = cols[i], v = row[c.field]; t.textContent = c.format ? format(c.format, v) : String(v).length > 15 ? String(v).slice(0, 14) + '…' : String(v); });
      });
      cardLayer.textContent = '';
      if (!m) { set(lit, { opacity: 0 }); set(link, { opacity: 0 }); set(ring, { opacity: 0 }); return; }
      var ly = TABLE.y + 22 + (at - top) * TABLE.lh - 19;
      set(lit, { y: ly, opacity: 1 });
      set(ring, { cx: m.x, cy: m.y, r: m.r + 4, opacity: 1 });
      if (showCard) {
        var card = tooltipCard(cardLayer, tooltipRows(m.row, d.tooltip), m.x, m.y, { avoid: m.r + 10, maxX: TABLE.x - 70 });
        var x1 = card.x + card.w, y1 = card.y + card.h / 2;
        set(link, { d: 'M' + (TABLE.x - 10) + ' ' + (ly + TABLE.lh / 2) + ' C ' + (TABLE.x - 60) + ' ' + (ly + TABLE.lh / 2) + ', ' + (x1 + 50) + ' ' + y1 + ', ' + x1 + ' ' + y1, opacity: 1 });
      } else set(link, { opacity: 0 });
    }
    var hovered = /** @type {any} */ (null), demo = /** @type {any} */ (null);
    if (fig.interactive) {
      svg.addEventListener('pointermove', function (/** @type {PointerEvent} */ e) {
        var m = plot.nearest(fig.toSlide(e));
        if (m && m !== hovered) { hovered = m; focus(m); }
      });
      svg.addEventListener('pointerleave', function () { hovered = null; focus(demo); });
    }
    return {
      /** @param {any} step */
      update: function (step) {
        st.caption(step.caption);
        showCard = step.card !== false;
        demo = step.demo ? plot.byId[step.demo] : null;
        plot.paint({ colour: true });
        focus(hovered || demo);
        void count;
      }
    };
  }
};
