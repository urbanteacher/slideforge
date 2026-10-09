/* The world map: projections that morph, a choropleth whose class breaks can
 * be switched, Greenland dragged to its true size, symbols, a tooltip on
 * every country, and Rosling's bubbles flying home to their countries.
 *
 * The geometry is made at build time (tools/ipdv-week5/world.js): every
 * country in three projections with the same vertices, so a morph moves each
 * point from one projection to the next. It is a served file
 * (figureData.world), fetched once and shared by every map slide.
 *
 * figureData:
 *   world    the geometry file's URL
 *   tooltip  [{ field, title, format }] read from a country (name, income, health, population, gdp)
 *   source   the credit line
 *   scatter  for the finale: { [country name]: [x, y] } bubble positions in slide pixels,
 *            and radius/colour per country in `bubbles`
 * Each step may set:
 *   caption
 *   projection   'mercator' | 'equalEarth' | 'robinson' (a change morphs)
 *   fill         { field, breaks: [..], colors: [..], title, format, method } a choropleth;
 *                omitted: plain land
 *   lit          country name(s), or ISO numeric codes, outlined in red
 *   greenland    true: Greenland in red and draggable (Mercator); [lon, lat] moves it there
 *   symbols      { field, max, color }: circles at the countries' centres, area by value
 *   fly          'scatter' (bubbles at their chart places) | 'home' (at their countries)
 *   label        text set large over the map (a verdict, a question)
 */
import { NU, W, H, el, set, tween, lerp, format, tooltipCard } from './kit.js';

/** @type {Record<string, Promise<any>>} */
var cache = {};
/** @param {string} url */
function load(url) {
  if (!cache[url]) cache[url] = fetch(url).then(function (r) { if (!r.ok) throw new Error('map ' + r.status); return r.json(); });
  return cache[url];
}

/* The 1000x560 world, scaled to leave room for a legend under it. */
var MAP = { x: 200, y: 100, s: 0.88 };
var NODATA = { stage: '#2a3d52', paper: '#dcd8cf' };

/** @param {number[][][]} rings @param {number} [dx] @param {number} [dy] */
function pathOf(rings, dx, dy) {
  var ox = MAP.x + (dx || 0), oy = MAP.y + (dy || 0), k = MAP.s, s = '';
  for (var r = 0; r < rings.length; r++) {
    var ring = rings[r];
    for (var i = 0; i < ring.length; i++) s += (i ? 'L' : 'M') + (ring[i][0] * k + ox).toFixed(1) + ' ' + (ring[i][1] * k + oy).toFixed(1);
    s += 'Z';
  }
  return s;
}
/** @param {number[][][]} a @param {number[][][]} b @param {number} k */
function mix(a, b, k) {
  return a.map(function (ring, r) { return ring.map(function (p, i) { var q = b[r][i]; return [lerp(p[0], q[0], k), lerp(p[1], q[1], k)]; }); });
}

export var worldmap = {
  /** @param {any} fig */
  mount: function (fig) {
    var d = fig.data, svg = fig.svg, st = fig.stage, ground = st.dark ? 'stage' : 'paper';
    var land = st.dark ? '#33506e' : '#c9c3b6', edge = st.dark ? NU.stage : NU.paper;
    var layer = el('g', {}, svg), symbolLayer = el('g', {}, svg), flyLayer = el('g', {}, svg);
    var legend = el('g', { 'font-family': NU.sans }, svg);
    var big = el('text', { x: W / 2, y: H / 2, 'text-anchor': 'middle', 'font-family': NU.serif, 'font-size': 64, fill: st.ink, opacity: 0, 'pointer-events': 'none' }, svg);
    var cardLayer = el('g', { 'pointer-events': 'none' }, svg);
    if (d.source) el('text', { x: W - 64, y: 92, 'text-anchor': 'end', 'font-family': NU.sans, 'font-size': 12, fill: st.soft }, svg, d.source);
    var loading = el('text', { x: W / 2, y: H / 2, 'text-anchor': 'middle', 'font-family': NU.sans, 'font-size': 18, fill: st.soft }, svg, 'Drawing the world…');

    /** @type {any} */ var world = null;
    /** @type {any[]} */ var shapes = [];
    var proj = 'equalEarth', pending = /** @type {any} */ (null), cancel = function () {}, cancelFly = function () {};
    var greenland = /** @type {any} */ (null), gOffset = [0, 0], hovered = /** @type {any} */ (null), step = /** @type {any} */ ({});

    function fillOf(/** @type {any} */ c) {
      var f = step.fill;
      if (!f) return land;
      var v = c[f.field];
      if (v == null) return NODATA[ground];
      if (f.categories) return (f.categories[v] && f.categories[v].color) || NODATA[ground];
      var i = 0;
      while (i < f.breaks.length && v >= f.breaks[i]) i++;
      return f.colors[Math.min(i, f.colors.length - 1)];
    }
    function paintFills() {
      var lit = step.lit == null ? [] : [].concat(step.lit);
      shapes.forEach(function (s) {
        var isLit = lit.indexOf(s.c.name) >= 0 || lit.indexOf(s.c.code) >= 0, isG = step.greenland && s.c.code === 304;
        set(s.node, { fill: isG ? NU.red : fillOf(s.c), stroke: isLit ? NU.red : edge, 'stroke-width': isLit ? 2.5 : 0.6 });
        if (isLit) s.node.parentNode.appendChild(s.node);
      });
    }
    /* Greenland on Mercator, wherever it has been dragged. The shape is turned across the globe
       (a rotation that carries its centre from home to the new place), not slid in latitude:
       sliding would keep its 61 degrees of longitude, which at the equator is far too wide. Then
       Mercator's formula draws it, so it shrinks as it comes south: its true size, honestly. */
    var HOME = [-41, 74];
    /** @param {number[]} p lon/lat in degrees */
    function vec(p) { var l = p[0] * Math.PI / 180, f = p[1] * Math.PI / 180; return [Math.cos(f) * Math.cos(l), Math.cos(f) * Math.sin(l), Math.sin(f)]; }
    function greenlandPath() {
      var m = world.mercator, rings = greenland.c.lonlat;
      var a = vec(HOME), b = vec([HOME[0] + gOffset[0], Math.max(-70, Math.min(80, HOME[1] + gOffset[1]))]);
      var axis = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
      var sin = Math.hypot(axis[0], axis[1], axis[2]), cos = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
      var k = sin > 1e-9 ? [axis[0] / sin, axis[1] / sin, axis[2] / sin] : [0, 0, 1];
      var out = rings.map(function (/** @type {number[][]} */ ring) {
        return ring.map(function (p) {
          /* Rodrigues: v cos + (k × v) sin + k (k · v)(1 − cos). */
          var v = vec(p), kv = k[0] * v[0] + k[1] * v[1] + k[2] * v[2];
          var c = [k[1] * v[2] - k[2] * v[1], k[2] * v[0] - k[0] * v[2], k[0] * v[1] - k[1] * v[0]];
          var r = [0, 1, 2].map(function (i) { return v[i] * cos + c[i] * sin + k[i] * kv * (1 - cos); });
          var lon = Math.atan2(r[1], r[0]), lat = Math.max(-1.45, Math.min(1.47, Math.asin(Math.max(-1, Math.min(1, r[2])))));
          return [m.tx + m.k * lon, m.ty - m.k * Math.log(Math.tan(Math.PI / 4 + lat / 2))];
        });
      });
      return pathOf(out);
    }
    /** @param {string} to @param {boolean} animate */
    function morph(to, animate) {
      var from = proj;
      if (from === to) { shapes.forEach(function (s) { set(s.node, { d: pathOf(s.c.shapes[to]) }); }); return; }
      cancel();
      cancel = tween(animate ? 1800 : 0, function (k) {
        shapes.forEach(function (s) { set(s.node, { d: pathOf(mix(s.c.shapes[from], s.c.shapes[to], k)) }); });
        if (k >= 1) proj = to;
      });
      proj = to;
    }
    function paintLegend() {
      legend.textContent = '';
      var f = step.fill;
      if (!f || f.categories) return;
      /* The classes as a number line: where each break falls among the values. */
      var x0 = 220, x1 = W - 220, y = H - 82, vals = shapes.map(function (s) { return s.c[f.field]; }).filter(function (v) { return v != null; });
      var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals), sx = function (/** @type {number} */ v) { return x0 + (v - lo) / (hi - lo) * (x1 - x0); };
      var edges = [lo].concat(f.breaks, [hi]);
      for (var i = 0; i < f.colors.length; i++) el('rect', { x: sx(edges[i]), y: y - 12, width: Math.max(1, sx(edges[i + 1]) - sx(edges[i])), height: 12, fill: f.colors[i], stroke: edge, 'stroke-width': 0.6 }, legend);
      vals.forEach(function (v) { el('line', { x1: sx(v), x2: sx(v), y1: y + 3, y2: y + 11, stroke: st.ink, 'stroke-opacity': 0.45 }, legend); });
      f.breaks.forEach(function (/** @type {number} */ b) { el('text', { x: sx(b), y: y - 18, 'text-anchor': 'middle', 'font-size': 13, fill: st.ink }, legend, format(f.format || '.3s', b)); });
      el('text', { x: x0, y: y + 28, 'font-size': 13, fill: st.soft }, legend, (f.title || f.field) + (f.method ? ' · ' + f.method : '') + ' · each tick is a country');
    }
    function paintSymbols() {
      symbolLayer.textContent = '';
      var sy = step.symbols;
      if (!sy) return;
      shapes.slice().sort(function (a, b) { return (b.c[sy.field] || 0) - (a.c[sy.field] || 0); }).forEach(function (s) {
        var v = s.c[sy.field];
        if (v == null) return;
        var c = s.c.centroid[proj];
        el('circle', { cx: c[0] * MAP.s + MAP.x, cy: c[1] * MAP.s + MAP.y, r: Math.sqrt(v / sy.max) * 40, fill: sy.color || NU.red, 'fill-opacity': 0.55, stroke: st.dark ? NU.paper : NU.ink, 'stroke-width': 0.8 }, symbolLayer);
      });
    }
    /* The finale: each country's bubble from its place on Rosling's chart to its place on the map. */
    /** @param {boolean} animate */
    function paintFly(animate) {
      cancelFly();
      var mode = step.fly;
      if (!mode) { flyLayer.textContent = ''; return; }
      if (!flyLayer.childNodes.length) {
        Object.keys(d.scatter || {}).forEach(function (name) {
          var s = shapes.find(function (x) { return x.c.name === name; });
          var b = d.bubbles[name];
          if (!s || !b) return;
          var c = el('circle', { r: b.r, fill: b.color, 'fill-opacity': 0.82, stroke: NU.stage, 'stroke-width': 1 }, flyLayer);
          c.__from = d.scatter[name]; c.__to = [s.c.centroid[proj][0] * MAP.s + MAP.x, s.c.centroid[proj][1] * MAP.s + MAP.y]; c.__name = name;
          set(c, { cx: c.__from[0], cy: c.__from[1] });
        });
      }
      var nodes = Array.prototype.slice.call(flyLayer.childNodes);
      var home = mode === 'home';
      set(layer, { opacity: home ? 1 : 0.12 });
      cancelFly = tween(animate ? 2600 : 0, function (k) {
        nodes.forEach(function (/** @type {any} */ c, /** @type {number} */ i) {
          /* Staggered a little, so the flight reads as a flock and not a jump. */
          var kk = Math.max(0, Math.min(1, (k * 1.25) - (i / nodes.length) * 0.25)), t = home ? kk : 1 - kk;
          set(c, { cx: lerp(c.__from[0], c.__to[0], t), cy: lerp(c.__from[1], c.__to[1], t) - Math.sin(t * Math.PI) * 40 });
        });
      });
    }
    function paintCard() {
      cardLayer.textContent = '';
      var s = hovered;
      if (!s || !d.tooltip || !s.c.name) return;
      var rows = d.tooltip.map(function (/** @type {any} */ t) { var v = s.c[t.field]; return [t.title || t.field, v == null ? 'no data' : t.format ? format(t.format, v) : String(v)]; });
      var c = s.c.centroid[proj];
      tooltipCard(cardLayer, rows, c[0] * MAP.s + MAP.x, c[1] * MAP.s + MAP.y, { avoid: 14 });
    }

    function draw() {
      loading.remove();
      world.countries.forEach(function (/** @type {any} */ c) {
        var node = el('path', { d: pathOf(c.shapes[proj]), fill: land, stroke: edge, 'stroke-width': 0.6, 'stroke-linejoin': 'round' }, layer);
        var s = { c: c, node: node };
        shapes.push(s);
        if (c.code === 304) greenland = s;
      });
      if (fig.interactive) {
        var dragging = false, start = [0, 0], startOffset = [0, 0];
        svg.addEventListener('pointermove', function (/** @type {PointerEvent} */ e) {
          var p = fig.toSlide(e);
          if (dragging) {
            /* Pointer pixels back to degrees on Mercator, so Greenland follows the hand. */
            var m = world.mercator, lon = ((p.x - MAP.x) / MAP.s - m.tx) / m.k * 180 / Math.PI;
            var lat = (2 * Math.atan(Math.exp((m.ty - (p.y - MAP.y) / MAP.s) / m.k)) - Math.PI / 2) * 180 / Math.PI;
            gOffset = [startOffset[0] + lon - start[0], startOffset[1] + lat - start[1]];
            set(greenland.node, { d: greenlandPath() });
            return;
          }
          var target = /** @type {any} */ (e.target);
          var s = shapes.find(function (x) { return x.node === target; }) || null;
          if (s !== hovered) { hovered = s; paintCard(); }
        });
        svg.addEventListener('pointerdown', function (/** @type {PointerEvent} */ e) {
          if (!step.greenland || proj !== 'mercator' || e.target !== greenland.node) return;
          var p = fig.toSlide(e), m = world.mercator;
          start = [((p.x - MAP.x) / MAP.s - m.tx) / m.k * 180 / Math.PI, (2 * Math.atan(Math.exp((m.ty - (p.y - MAP.y) / MAP.s) / m.k)) - Math.PI / 2) * 180 / Math.PI];
          startOffset = gOffset.slice(); dragging = true;
          svg.setPointerCapture(e.pointerId);
        });
        svg.addEventListener('pointerup', function () { dragging = false; });
        svg.addEventListener('pointerleave', function () { if (!dragging) { hovered = null; paintCard(); } });
      }
      if (pending) { var p = pending; pending = null; apply(p.step, false); }
    }
    /** @param {any} next @param {boolean} animate */
    function apply(next, animate) {
      step = next;
      st.caption(step.caption);
      morph(step.projection || proj, animate);
      if (Array.isArray(step.greenland)) {
        var to = step.greenland, from = gOffset.slice();
        var aim = [to[0] - HOME[0], to[1] - HOME[1]];
        tween(animate ? 2000 : 0, function (k) { gOffset = [lerp(from[0], aim[0], k), lerp(from[1], aim[1], k)]; if (greenland) set(greenland.node, { d: greenlandPath() }); });
      } else if (!step.greenland) gOffset = [0, 0];
      paintFills(); paintLegend(); paintSymbols(); paintFly(animate);
      if (greenland && step.greenland && proj === 'mercator') set(greenland.node, { d: greenlandPath(), cursor: 'grab' });
      big.textContent = step.label || '';
      set(big, { opacity: step.label ? 1 : 0 });
    }
    load(d.world).then(function (w) { world = w; draw(); }, function (err) { loading.textContent = 'The map could not load: ' + err.message; });

    return {
      /** @param {any} next @param {boolean} animate */
      update: function (next, animate) {
        if (!world) { pending = { step: next }; st.caption(next.caption); proj = next.projection || proj; return; }
        apply(next, animate);
      }
    };
  }
};
