/* Linked views: a scatter and a bar chart that answer each other, live. The
 * selections of the students' guide (§5–§9), one at a time:
 *
 *   hover    selection_point(on='pointerover')     the bubble under the pointer lights
 *   click    selection_point(toggle=True)          clicked bubbles stay lit; click again to drop
 *   legend   selection_point(bind='legend')        a region in the legend lights its countries
 *   brush    selection_interval()                  drag a rectangle; the bars count what is inside
 *
 * Whatever is selected, the bars on the right are filtered by it
 * (transform_filter), so one choice lights both views. Double-click clears,
 * as in Vega.
 *
 * figureData: the bubbles figure's data (rows, x, y, size, groups, tooltip), plus
 *   bars: { title }   the right-hand view: countries per region
 * Each step may set:
 *   caption, mode ('hover' | 'click' | 'legend' | 'brush' | 'none'),
 *   preset: { ids?: [..], group?: key, box?: [x0, y0, x1, y1] in data units }  a selection already made
 *   empty: true  an empty selection lights everything (Vega's default) — the bug the guide warns of
 *   code: [lines], guide: 'Guide §5'  the step's Altair, on a card beside the chart
 */
import { NU, W, H, el, set, scale } from './kit.js';
import { scatter, tooltipRows, cardAt } from './plots.js';

var PLOT = { x0: 120, x1: 760, y0: 170, y1: H - 150 };
var BARS = { x0: 1010, x1: W - 60, y0: 372, y1: H - 150 };
var CHIP = { x: 828, y: 132, w: W - 60 - 828, h: 196 };

export var linked = {
  /** @param {any} fig */
  mount: function (fig) {
    var d = fig.data, svg = fig.svg, st = fig.stage;
    var plot = scatter(svg, d, PLOT, { ink: st.ink, soft: st.soft, font: 14 });
    var keys = Object.keys(d.groups);
    /* The right-hand view: one bar per region, total and selected. */
    var bars = el('g', { 'font-family': NU.sans, 'font-size': 14 }, svg);
    el('text', { x: BARS.x0 - 150, y: BARS.y0 - 22, fill: st.ink, 'font-size': 16 }, bars, (d.bars && d.bars.title) || 'Countries selected, by region');
    var counts = keys.map(function (k) { return d.rows.filter(function (/** @type {any} */ r) { return r.group === k; }).length; });
    var max = Math.max.apply(null, counts), band = (BARS.y1 - BARS.y0) / keys.length, sx = scale([0, max], [BARS.x0, BARS.x1]);
    var barNodes = keys.map(function (k, i) {
      var y = BARS.y0 + i * band + band * 0.2, h = band * 0.6;
      el('text', { x: BARS.x0 - 10, y: y + h / 2 + 5, 'text-anchor': 'end', fill: st.ink, 'font-size': 13 }, bars, d.groups[k].label);
      el('rect', { x: BARS.x0, y: y, width: sx(counts[i]) - BARS.x0, height: h, fill: 'none', stroke: NU.line, 'stroke-width': 1.5 }, bars);
      var fillR = el('rect', { x: BARS.x0, y: y, width: 0, height: h, fill: d.groups[k].color }, bars);
      var n = el('text', { x: BARS.x0 + 6, y: y + h / 2 + 5, fill: NU.paper, 'font-size': 13 }, bars);
      return { key: k, fill: fillR, n: n, total: counts[i], y: y, h: h };
    });
    /* The legend, which the legend step makes a control. */
    var legend = el('g', { 'font-family': NU.sans, 'font-size': 14 }, svg);
    var legendItems = keys.map(function (k, i) {
      var x = PLOT.x0 + 8 + (i % 3) * 215, y = PLOT.y0 - 52 + Math.floor(i / 3) * 22;
      var g = el('g', { cursor: 'pointer' }, legend);
      el('rect', { x: x - 10, y: y - 15, width: 205, height: 21, fill: 'transparent' }, g);
      var dot = el('circle', { cx: x, cy: y - 5, r: 6, fill: d.groups[k].color }, g);
      var t = el('text', { x: x + 12, y: y, fill: st.ink }, g, d.groups[k].label);
      return { key: k, g: g, dot: dot, t: t };
    });
    /* The step's Altair, on a card of the page beside the chart. */
    var chip = el('g', { 'font-family': NU.mono, 'font-size': 14 }, svg);
    /** @param {string[]|undefined} lines @param {string|undefined} guide */
    function paintChip(lines, guide) {
      chip.textContent = '';
      if (!lines || !lines.length) return;
      el('rect', { x: CHIP.x, y: CHIP.y, width: CHIP.w, height: CHIP.h, rx: 10, fill: NU.paper }, chip);
      el('rect', { x: CHIP.x, y: CHIP.y, width: 5, height: CHIP.h, fill: NU.red }, chip);
      lines.forEach(function (line, i) { el('text', { x: CHIP.x + 20, y: CHIP.y + 32 + i * 22, fill: NU.ink, style: 'white-space:pre' }, chip, line); });
      if (guide) el('text', { x: CHIP.x + 20, y: CHIP.y + CHIP.h - 14, 'font-family': NU.sans, 'font-size': 12, 'font-weight': 700, 'letter-spacing': 1.3, fill: NU.red }, chip, guide.toUpperCase());
    }
    var brushRect = el('rect', { fill: 'rgba(255,255,255,.08)', stroke: NU.paper, 'stroke-width': 1.5, 'stroke-dasharray': '6 4', opacity: 0, 'pointer-events': 'none' }, svg);
    var cardLayer = el('g', { 'pointer-events': 'none' }, svg);

    var mode = 'none', emptyAll = false;
    var sel = { ids: /** @type {string[]} */ ([]), group: /** @type {string|null} */ (null), box: /** @type {number[]|null} */ (null), hover: /** @type {string|null} */ (null) };
    /** @param {any} r */
    function selected(r) {
      if (mode === 'hover') return sel.hover === r.id;
      if (mode === 'click') return sel.ids.indexOf(r.id) >= 0;
      if (mode === 'legend') return sel.group === r.group;
      if (mode === 'brush' && sel.box) { var b = sel.box, m = plot.byId[r.id]; return m.x >= b[0] && m.x <= b[2] && m.y >= b[1] && m.y <= b[3]; }
      return false;
    }
    function empty() {
      if (mode === 'hover') return !sel.hover;
      if (mode === 'click') return !sel.ids.length;
      if (mode === 'legend') return !sel.group;
      if (mode === 'brush') return !sel.box;
      return true;
    }
    function paint() {
      var none = empty(), all = none && (emptyAll || mode === 'none');
      Object.keys(plot.byId).forEach(function (k) {
        var m = plot.byId[k], on = all || (!none && selected(m.row)), g = d.groups[m.row.group];
        set(m.node, { fill: on ? g.color : '#8796a8', 'fill-opacity': on ? 0.85 : 0.22 });
      });
      barNodes.forEach(function (b) {
        var n = d.rows.filter(function (/** @type {any} */ r) { return r.group === b.key && (all || (!none && selected(r))); }).length;
        set(b.fill, { width: Math.max(0, sx(n) - BARS.x0) });
        b.n.textContent = n ? String(n) : '';
      });
      legendItems.forEach(function (it) { set(it.g, { opacity: mode === 'legend' && sel.group && sel.group !== it.key ? 0.35 : 1 }); });
      if (mode === 'brush' && sel.box) { var b = sel.box; set(brushRect, { x: b[0], y: b[1], width: b[2] - b[0], height: b[3] - b[1], opacity: 1 }); }
      else set(brushRect, { opacity: 0 });
    }
    var hovered = /** @type {any} */ (null);
    function paintCard() { cardAt(cardLayer, hovered, hovered ? tooltipRows(hovered.row, d.tooltip) : []); }

    if (fig.interactive) {
      var dragFrom = /** @type {{x: number, y: number}|null} */ (null);
      /** @param {any} p */
      function inPlot(p) { return p.x >= PLOT.x0 - 20 && p.x <= PLOT.x1 + 20 && p.y >= PLOT.y0 - 10 && p.y <= PLOT.y1 + 10; }
      svg.addEventListener('pointerdown', function (/** @type {PointerEvent} */ e) {
        var p = fig.toSlide(e);
        if (mode === 'brush' && inPlot(p)) { dragFrom = { x: p.x, y: p.y }; sel.box = [p.x, p.y, p.x, p.y]; svg.setPointerCapture(e.pointerId); paint(); }
      });
      svg.addEventListener('pointermove', function (/** @type {PointerEvent} */ e) {
        var p = fig.toSlide(e);
        if (dragFrom) {
          sel.box = [Math.min(dragFrom.x, p.x), Math.min(dragFrom.y, p.y), Math.max(dragFrom.x, p.x), Math.max(dragFrom.y, p.y)];
          paint(); return;
        }
        var m = /** @type {any} */ (inPlot(p) ? plot.nearest(p) : null);
        if (m !== hovered) { hovered = m; paintCard(); }
        if (mode === 'hover') { var id = m ? m.row.id : null; if (id !== sel.hover) { sel.hover = id; paint(); } }
      });
      svg.addEventListener('pointerup', function () { dragFrom = null; });
      svg.addEventListener('pointerleave', function () { hovered = null; paintCard(); if (mode === 'hover') { sel.hover = null; paint(); } });
      svg.addEventListener('click', function (/** @type {MouseEvent} */ e) {
        e.stopPropagation();
        var p = fig.toSlide(/** @type {any} */ (e));
        if (mode === 'click' && inPlot(p)) {
          var m = /** @type {any} */ (plot.nearest(p));
          if (m) { var i = sel.ids.indexOf(m.row.id); if (i >= 0) sel.ids.splice(i, 1); else sel.ids.push(m.row.id); paint(); }
        }
        if (mode === 'legend') {
          var hit = legendItems.find(function (it) { return it.g.contains(/** @type {any} */ (e.target)); });
          if (hit) { sel.group = sel.group === hit.key ? null : hit.key; paint(); }
        }
      });
      svg.addEventListener('dblclick', function (/** @type {MouseEvent} */ e) { e.stopPropagation(); sel = { ids: [], group: null, box: null, hover: null }; paint(); });
    }

    return {
      /** @param {any} step */
      update: function (step) {
        st.caption(step.caption);
        paintChip(step.code, step.guide);
        mode = step.mode || 'none';
        emptyAll = !!step.empty;
        var pr = step.preset || {};
        var box = null;
        if (pr.box) { var b = pr.box; box = [plot.sx(b[0]), plot.sy(b[3]), plot.sx(b[2]), plot.sy(b[1])]; }
        sel = { ids: (pr.ids || []).slice(), group: pr.group || null, box: box, hover: pr.hover || null };
        set(legend, { opacity: 1 });
        paint();
      }
    };
  }
};
