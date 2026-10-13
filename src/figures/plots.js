/* The charts the figures draw, in any rectangle of the stage: a scatter of
 * bubbles (Rosling's chart) and horizontal bars. Each returns handles a
 * figure drives (colour, light, tooltip) rather than redrawing.
 *
 * Tooltips follow Altair: `tooltip` is the list of {field, title?, format?}
 * an Altair chart's encode(tooltip=[...]) makes, or 'all' for
 * mark_circle(tooltip=True), which shows every field raw, by its column name.
 */
import { NU, el, set, scale, lerp, tween, format, tooltipCard } from './kit.js';

var GREY = '#8796a8';

/**
 * The card's rows for one datum, as Vega builds them from the tooltip encoding.
 * @param {any} row @param {any} spec  list of {field, title, format}, 'all', or a single field string
 * @param {string[]} [columns]  the columns, in order, for 'all'
 * @returns {[string, string][]}
 */
export function tooltipRows(row, spec, columns) {
  if (!spec) return [];
  if (spec === 'all') return (columns || Object.keys(row)).map(function (k) { return [k, String(row[k])]; });
  var list = typeof spec === 'string' ? [{ field: spec }] : spec;
  return list.map(function (/** @type {any} */ t) {
    var v = row[t.field];
    var shown = v == null || (typeof v === 'number' && !isFinite(v)) ? (t.missing || '') : t.format ? format(t.format, v) : String(v);
    return [t.title || t.field, shown];
  });
}

/**
 * A scatter of bubbles in `rect`.
 * @param {Element} parent
 * @param {any} d  { rows, x, y, size, groups }  (see bubbles.js)
 * @param {{x0: number, x1: number, y0: number, y1: number}} rect
 * @param {{ink: string, soft: string, font?: number}} look
 */
export function scatter(parent, d, rect, look) {
  var sx = scale(d.x.domain, [rect.x0, rect.x1], d.x.log), sy = scale(d.y.domain, [rect.y1, rect.y0], d.y.log);
  var sizeD = (d.size && d.size.domain) || [1, 1], sizeR = (d.size && d.size.range) || [3, 40];
  var fs = look.font || 15;
  /** @param {number} v */
  function radius(v) { var k = Math.sqrt(Math.max(0, v - sizeD[0]) / Math.max(1e-9, sizeD[1] - sizeD[0])); return lerp(sizeR[0], sizeR[1], k); }
  var axes = el('g', { 'font-family': NU.sans, 'font-size': fs, fill: look.soft }, parent);
  /** Ticks inside the domain shown, gridlines and the two titles. @param {number[]} xd @param {number[]} yd */
  function drawAxes(xd, yd) {
    axes.textContent = '';
    (d.x.ticks || []).filter(function (/** @type {number} */ t) { return t >= xd[0] && t <= xd[1]; }).forEach(function (/** @type {number} */ t) {
      var x = sx(t);
      el('line', { x1: x, x2: x, y1: rect.y0, y2: rect.y1, stroke: NU.line }, axes);
      el('text', { x: x, y: rect.y1 + fs * 1.7, 'text-anchor': 'middle' }, axes, format(d.x.format || ',d', t));
    });
    (d.y.ticks || []).filter(function (/** @type {number} */ t) { return t >= yd[0] && t <= yd[1]; }).forEach(function (/** @type {number} */ t) {
      var y = sy(t);
      el('line', { x1: rect.x0, x2: rect.x1, y1: y, y2: y, stroke: NU.line }, axes);
      el('text', { x: rect.x0 - fs * 0.9, y: y + fs * 0.33, 'text-anchor': 'end' }, axes, format(d.y.format || ',d', t));
    });
    el('text', { x: rect.x1, y: rect.y1 + fs * 3.4, 'text-anchor': 'end', 'font-size': fs + 1, fill: look.ink }, axes, d.x.title || '');
    el('text', { x: rect.x0 - fs * 3.3, y: rect.y0 - fs * 1.1, 'font-size': fs + 1, fill: look.ink }, axes, d.y.title || '');
  }
  drawAxes(d.x.domain, d.y.domain);
  var clip = 'fig-clip-' + Math.round(Math.random() * 1e9);
  var cp = el('clipPath', { id: clip }, parent);
  el('rect', { x: rect.x0 - 40, y: rect.y0 - 40, width: rect.x1 - rect.x0 + 80, height: rect.y1 - rect.y0 + 80 }, cp);

  var rows = d.rows.slice().sort(function (/** @type {any} */ a, /** @type {any} */ b) { return b.size - a.size; });
  var g = el('g', { 'clip-path': 'url(#' + clip + ')' }, parent);
  /** @type {Record<string, {row: any, node: any, x: number, y: number, r: number}>} */
  var byId = {};
  rows.forEach(function (/** @type {any} */ r) {
    var m = { row: r, x: sx(r.x), y: sy(r.y), r: radius(r.size), node: null };
    m.node = el('circle', { cx: m.x, cy: m.y, r: m.r, fill: GREY, 'fill-opacity': 0.78, stroke: NU.stage, 'stroke-width': 1 }, g);
    byId[r.id] = m;
  });
  var api = {
    byId: byId, sx: sx, sy: sy, radius: radius,
    /** Zoom to new domains (the mantra's "zoom"), moving every bubble there.
     * @param {number[]} xd @param {number[]} yd @param {boolean} animate */
    rescale: function (xd, yd, animate) {
      sx = scale(xd, [rect.x0, rect.x1], d.x.log); sy = scale(yd, [rect.y1, rect.y0], d.y.log);
      api.sx = sx; api.sy = sy;
      drawAxes(xd, yd);
      var from = Object.keys(byId).map(function (k) { return [byId[k].x, byId[k].y]; });
      Object.keys(byId).forEach(function (k) { byId[k].x = sx(byId[k].row.x); byId[k].y = sy(byId[k].row.y); });
      var ks = Object.keys(byId);
      tween(animate ? 1200 : 0, function (t) {
        ks.forEach(function (k, i) { var m = byId[k]; set(m.node, { cx: lerp(from[i][0], m.x, t), cy: lerp(from[i][1], m.y, t) }); });
      });
    },
    /** Show only some rows (the mantra's "filter"); null shows all. @param {((row: any) => boolean)|null} keep */
    filter: function (keep) {
      Object.keys(byId).forEach(function (k) { set(byId[k].node, { display: !keep || keep(byId[k].row) ? null : 'none' }); });
      api.kept = keep;
    },
    /** @type {((row: any) => boolean)|null} */
    kept: null,
    /** Colour by group (or grey), with one row lit in red and the rest faded when asked.
     * @param {{colour?: boolean, lit?: string|string[]|null, fade?: number}} o */
    paint: function (o) {
      /** @type {string[]|null} */ var lit = o.lit == null ? null : Array.isArray(o.lit) ? o.lit : [o.lit];
      Object.keys(byId).forEach(function (k) {
        var m = byId[k], grp = d.groups && d.groups[m.row.group], on = !lit || lit.indexOf(m.row.id) >= 0;
        var fill = lit && on && !o.colour ? NU.red : o.colour && grp ? grp.color : GREY;
        set(m.node, { fill: fill, 'fill-opacity': on ? 0.82 : (o.fade == null ? 0.18 : o.fade) });
      });
    },
    /** The bubble under a point, as Vega picks the mark on top.
     * @param {{x: number, y: number}} p */
    nearest: function (p) {
      var best = null, bestD = Infinity;
      Object.keys(byId).forEach(function (k) {
        var m = byId[k], dist = Math.hypot(m.x - p.x, m.y - p.y);
        if (api.kept && !api.kept(m.row)) return;
        if (dist <= m.r + 6 && dist - m.r < bestD) { bestD = dist - m.r; best = m; }
      });
      return best;
    }
  };
  return api;
}

/**
 * Horizontal bars of `rows` [{id, label, value, parts?: [{id, value, row}]}] in `rect`.
 * With `split`, each bar is drawn as its parts, the way Vega splits an
 * aggregate when an unaggregated field lands in its tooltip (Guide §4).
 * @param {Element} parent @param {any} d @param {any} rect @param {any} look
 */
export function bars(parent, d, rect, look) {
  var fs = look.font || 15, n = d.rows.length, band = (rect.y1 - rect.y0) / n, max = d.max || Math.max.apply(null, d.rows.map(function (/** @type {any} */ r) { return r.value; }));
  var sx = scale([0, max], [rect.x0, rect.x1]);
  var g = el('g', { 'font-family': NU.sans, 'font-size': fs }, parent);
  (d.ticks || []).forEach(function (/** @type {number} */ t) {
    el('line', { x1: sx(t), x2: sx(t), y1: rect.y0, y2: rect.y1, stroke: NU.line }, g);
    el('text', { x: sx(t), y: rect.y1 + fs * 1.6, 'text-anchor': 'middle', fill: look.soft }, g, format(d.format || '.3s', t));
  });
  if (d.title) el('text', { x: rect.x1, y: rect.y1 + fs * 3.2, 'text-anchor': 'end', fill: look.ink, 'font-size': fs + 1 }, g, d.title);
  /** @type {any[]} */
  var marks = [];
  d.rows.forEach(function (/** @type {any} */ r, /** @type {number} */ i) {
    var y = rect.y0 + i * band + band * 0.18, h = band * 0.64;
    el('text', { x: rect.x0 - 12, y: y + h / 2 + fs * 0.35, 'text-anchor': 'end', fill: look.ink }, g, r.label);
    var whole = el('rect', { x: rect.x0, y: y, width: Math.max(0, sx(r.value) - rect.x0), height: h, fill: r.color || NU.mist, rx: 2 }, g);
    var parts = el('g', { opacity: 0 }, g), x = rect.x0;
    (r.parts || []).forEach(function (/** @type {any} */ p) {
      var w = sx(p.value) - rect.x0;
      var node = el('rect', { x: x, y: y, width: Math.max(0.5, w), height: h, fill: r.color || NU.mist, stroke: NU.stage, 'stroke-width': 0.8 }, parts);
      marks.push({ row: p.row, bar: r, node: node, x: x + w / 2, y: y + h / 2, x0: x, x1: x + w, y0: y, y1: y + h });
      x += w;
    });
    marks.push({ row: r.row || r, bar: r, whole: true, node: whole, x: (rect.x0 + sx(r.value)) / 2, y: y + h / 2, x0: rect.x0, x1: sx(r.value), y0: y, y1: y + h, parts: parts });
  });
  return {
    /** @param {boolean} on */
    split: function (on) { marks.forEach(function (m) { if (m.whole) { set(m.parts, { opacity: on ? 1 : 0 }); set(m.node, { opacity: on ? 0 : 1 }); } }); this._split = on; },
    _split: false,
    /** The whole bar for a row id. @param {string} id */
    find: function (id) { return marks.find(function (m) { return m.whole && m.bar.id === id; }) || null; },
    /** @param {{x: number, y: number}} p */
    nearest: function (p) {
      var split = this._split;
      return marks.find(function (m) { return !!m.whole === !split && p.x >= m.x0 && p.x <= m.x1 && p.y >= m.y0 && p.y <= m.y1; }) || null;
    }
  };
}

/** A card for a mark, kept clear of it. @param {Element} layer @param {any} mark @param {[string, string][]} rows */
export function cardAt(layer, mark, rows) {
  layer.textContent = '';
  if (!mark || !rows.length) return null;
  return tooltipCard(layer, rows, mark.x, mark.y, { avoid: (mark.r || 8) + 10 });
}
