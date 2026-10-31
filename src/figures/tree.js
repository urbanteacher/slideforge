/* One hierarchy, four drawings: links, an indented list, an icicle and a treemap.
 *
 * Made for IPDV Week 8 (docs/ipdv-week8-plan.md §5). Every node is one
 * rectangle that travels between the four layouts, so the room watches the
 * same London become a family tree, a file explorer, stacked bars and boxes
 * inside boxes. Hover a node: its size, and its path back to the root.
 *
 * figureData:
 *   root     { name, value?, children? }      a leaf has a value; a parent's is the sum of its children
 *   colours  { name: hex }                    by the root's child each node descends from (Inner, Outer)
 *   valueTitle 'People', format ',d'
 *   key?     [{ mark, colour?, text }]        how to read it, in plain words (kit.js keyRow); a step's `key` replaces it
 * Each step may set: caption, explain, layout ('link' | 'indent' | 'icicle' | 'treemap'), lit (a node's name).
 */
import { NU, W, H, el, set, tween, lerp, format, textWidth, tooltipCard, keyRow } from './kit.js';

var BOX = { x0: 70, y0: 150, x1: W - 70, y1: H - 78 };

/** @param {any} node @param {any} parent @param {number} depth @param {any[]} out */
function flatten(node, parent, depth, out) {
  var n = { name: node.name, parent: parent, depth: depth, kids: /** @type {any[]} */ ([]), value: node.value || 0, branch: parent ? (depth === 1 ? node.name : parent.branch) : null };
  out.push(n);
  (node.children || []).forEach(function (/** @type {any} */ c) { var k = flatten(c, n, depth + 1, out); n.kids.push(k); });
  if (n.kids.length) n.value = n.kids.reduce(function (s, k) { return s + k.value; }, 0);
  return n;
}

/* Squarified treemap (Bruls, Huizing & van Wijk, 2000): lay the children in
   rows, each row as square as it can be. @param {any[]} kids @param {any} r */
function squarify(kids, r, /** @type {(k: any, rect: any) => void} */ put) {
  var items = kids.slice().sort(function (a, b) { return b.value - a.value; });
  items.forEach(function (k) { if (!(k.weight > 0)) k.weight = k.value; });
  items.sort(function (a, b) { return b.weight - a.weight; });
  var total = items.reduce(function (s, k) { return s + k.weight; }, 0) || 1;
  var x = r.x, y = r.y, w = r.w, h = r.h, scale = (w * h) / total;
  var row = /** @type {any[]} */ ([]);
  function worst(/** @type {any[]} */ list, /** @type {number} */ side) {
    var s = list.reduce(function (a, k) { return a + k.weight * scale; }, 0), mx = 0, mn = Infinity;
    list.forEach(function (k) { mx = Math.max(mx, k.weight * scale); mn = Math.min(mn, k.weight * scale); });
    return Math.max(side * side * mx / (s * s), (s * s) / (side * side * mn));
  }
  function lay(/** @type {any[]} */ list) {
    var s = list.reduce(function (a, k) { return a + k.weight * scale; }, 0);
    if (w >= h) { var cw = s / h, cy = y; list.forEach(function (k) { var kh = k.weight * scale / cw; put(k, { x: x, y: cy, w: cw, h: kh }); cy += kh; }); x += cw; w -= cw; }
    else { var ch = s / w, cx = x; list.forEach(function (k) { var kw = k.weight * scale / ch; put(k, { x: cx, y: y, w: kw, h: ch }); cx += kw; }); y += ch; h -= ch; }
  }
  items.forEach(function (k) {
    var side = Math.min(w, h);
    if (!row.length || worst(row.concat([k]), side) <= worst(row, side)) row.push(k);
    else { lay(row); row = [k]; }
  });
  if (row.length) lay(row);
}

export var tree = {
  /** @param {any} fig */
  mount: function (fig) {
    var d = fig.data, svg = fig.svg, st = fig.stage, ink = st.ink, soft = st.soft;
    var all = /** @type {any[]} */ ([]);
    var root = flatten(d.root || { name: 'root' }, null, 0, all);
    var leaves = all.filter(function (n) { return !n.kids.length; });
    var depthMax = Math.max.apply(null, all.map(function (n) { return n.depth; }));
    var fmt = d.format || ',d';
    var colour = function (/** @type {any} */ n) { return (d.colours && n.branch && d.colours[n.branch]) || (st.dark ? NU.mist : NU.navy); };

    /* ---------------------------------------------- the four layouts: a rectangle per node */
    var L = /** @type {Record<string, Record<string, any>>} */ ({ link: {}, indent: {}, icicle: {}, treemap: {} });
    /* Links: depth across, leaves evenly down; a parent sits level with the middle of its children. */
    var colW = (BOX.x1 - BOX.x0 - 260) / Math.max(1, depthMax), gap = (BOX.y1 - BOX.y0) / leaves.length;
    leaves.forEach(function (n, i) { n.ly = BOX.y0 + gap * (i + 0.5); });
    (function up(/** @type {any} */ n) { if (n.kids.length) { n.kids.forEach(up); n.ly = (n.kids[0].ly + n.kids[n.kids.length - 1].ly) / 2; } })(root);
    all.forEach(function (n) { var s = n.kids.length ? 14 : 10; L.link[n.name] = { x: BOX.x0 + 10 + n.depth * colW - s / 2, y: n.ly - s / 2, w: s, h: s, rx: s / 2 }; });
    /* Indented: one row per node in reading order, like a folder list; the bar is its size. */
    var rowH = (BOX.y1 - BOX.y0) / all.length, barX = 470, barW = BOX.x1 - barX;
    all.forEach(function (n, i) { L.indent[n.name] = { x: barX, y: BOX.y0 + i * rowH + 1.5, w: Math.max(2, barW * n.value / root.value), h: rowH - 3, rx: 2 }; });
    /* Icicle: a band per level, each node as wide as its share of the root. */
    var bandH = (BOX.y1 - BOX.y0) / (depthMax + 1), iw = BOX.x1 - BOX.x0;
    (function across(/** @type {any} */ n, /** @type {number} */ x) {
      L.icicle[n.name] = { x: x, y: BOX.y0 + n.depth * bandH, w: iw * n.value / root.value, h: bandH - 4, rx: 2 };
      var cx = x; n.kids.forEach(function (/** @type {any} */ k) { across(k, cx); cx += iw * k.value / root.value; });
    })(root, BOX.x0);
    /* Treemap: boxes inside boxes, a header strip on each parent for its name. The strips and
       padding take room, so a parent is laid out by its value plus that room (repeated until it
       settles): every leaf's area stays in proportion to its value, the point of a treemap. */
    var frame = { x: BOX.x0, y: BOX.y0, w: BOX.x1 - BOX.x0, h: BOX.y1 - BOX.y0 };
    for (var pass = 0; pass < 24; pass++) {
      (function nest(/** @type {any} */ n, /** @type {any} */ r) {
        L.treemap[n.name] = { x: r.x, y: r.y, w: r.w, h: r.h, rx: 2 };
        if (!n.kids.length) { n.extra = 0; return; }
        var pad = n.depth === 0 ? 0 : 4, head = n.depth === 0 ? 0 : 22;
        var inner = { x: r.x + pad, y: r.y + head + pad, w: Math.max(1, r.w - pad * 2), h: Math.max(1, r.h - head - pad * 2) };
        squarify(n.kids, inner, function (k, rect) { nest(k, rect); });
        n.extra = r.w * r.h - inner.w * inner.h + n.kids.reduce(function (s, k) { return s + k.extra; }, 0);
      })(root, frame);
      var per = (frame.w * frame.h - root.kids.reduce(function (s, k) { return s + k.extra; }, 0)) / (root.value || 1);
      all.forEach(function (n) { if (n.depth > 0) n.weight = n.value + n.extra / per; });
    }

    /* ---------------------------------------------- drawing */
    var keyG = el('g', { 'pointer-events': 'none' }, svg), links = el('g', {}, svg), boxes = el('g', {}, svg), labels = el('g', { 'font-family': NU.sans, 'pointer-events': 'none' }, svg), cards = el('g', { 'pointer-events': 'none' }, svg);
    var paths = all.filter(function (n) { return n.parent; }).map(function (n) { return { n: n, node: el('path', { fill: 'none', stroke: soft, 'stroke-width': 1.5 }, links) }; });
    var rects = all.map(function (n) {
      var fill = n.depth === 0 ? (st.dark ? '#2b5a85' : '#dfe6ee') : colour(n);
      return { n: n, node: el('rect', { fill: fill, stroke: st.dark ? NU.stage : '#fff', 'stroke-width': 1 }, boxes) };
    });
    var names = all.map(function (n) { return el('text', { 'font-size': 13, fill: ink }, labels, n.name); });
    var nums = all.map(function (n) { return el('text', { 'font-size': 12, fill: soft, 'text-anchor': 'end' }, labels, format(fmt, n.value)); });
    var at = /** @type {Record<string, any>} */ ({}), layout = '', cancel = function () {}, lit = /** @type {string|null} */ (null);

    /** Each node's rectangle, between two layouts. */
    function place(/** @type {string} */ from, /** @type {string} */ to, /** @type {number} */ k) {
      rects.forEach(function (o) {
        var a = L[from][o.n.name], b = L[to][o.n.name], r = { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), w: lerp(a.w, b.w, k), h: lerp(a.h, b.h, k), rx: lerp(a.rx, b.rx, k) };
        at[o.n.name] = r;
        set(o.node, { x: r.x, y: r.y, width: Math.max(0.5, r.w), height: Math.max(0.5, r.h), rx: Math.min(r.rx, r.w / 2, r.h / 2) });
        /* In a treemap the root is the frame, and a parent shows only its header. */
        var o2 = to === 'treemap' || to === 'icicle' ? (o.n.depth === 0 ? 0.55 : o.n.kids.length ? 0.45 + 0.15 * o.n.depth : 0.92) : o.n.depth === 0 ? 1 : 0.95;
        set(o.node, { 'fill-opacity': lerp(Number(o.node.getAttribute('data-op') || o2), o2, k) });
        if (k >= 1) o.node.setAttribute('data-op', String(o2));
      });
      var linkOn = to === 'link' ? k : from === 'link' ? 1 - k : 0;
      paths.forEach(function (o) {
        var p = at[o.n.parent.name], c = at[o.n.name], x1 = p.x + p.w / 2, y1 = p.y + p.h / 2, x2 = c.x + c.w / 2, y2 = c.y + c.h / 2, mx = (x1 + x2) / 2;
        set(o.node, { d: 'M' + x1 + ' ' + y1 + ' C' + mx + ' ' + y1 + ' ' + mx + ' ' + y2 + ' ' + x2 + ' ' + y2, opacity: linkOn });
      });
      if (k >= 1) writeLabels(to);
    }
    /** Labels where the layout leaves room for them, and none while moving. */
    function writeLabels(/** @type {string} */ to) {
      all.forEach(function (n, i) {
        var r = at[n.name], t = names[i], v = nums[i], show = true, vshow = false, size = 13;
        if (to === 'link') {
          size = n.kids.length ? 15 : 12.5;
          if (n.kids.length) set(t, { x: r.x + r.w / 2, y: r.y - 8, 'text-anchor': 'middle', transform: null }); else set(t, { x: r.x + r.w + 8, y: r.y + r.h / 2 + 4.5, 'text-anchor': 'start', transform: null });
        } else if (to === 'indent') {
          size = Math.min(13, rowH * 0.82);
          set(t, { x: BOX.x0 + 14 + n.depth * 30, y: r.y + r.h * 0.78, 'text-anchor': 'start', transform: null });
          set(v, { x: barX - 14, y: r.y + r.h * 0.78 }); vshow = true;
          set(v, { 'font-size': size });
        } else {
          var head = to === 'treemap' && n.kids.length;
          size = to === 'icicle' ? (n.depth < 2 ? 16 : 12.5) : n.depth === 0 ? 0 : head ? 13 : r.w > 120 && r.h > 50 ? 14 : 11.5;
          /* An icicle's leaves are narrow strips: their names stand upright, reading up from the bottom. */
          var upright = to === 'icicle' && !n.kids.length;
          if (upright) set(t, { x: r.x + r.w / 2 + 4.5, y: r.y + r.h - 8, 'text-anchor': 'start', transform: 'rotate(-90 ' + (r.x + r.w / 2 + 4.5) + ' ' + (r.y + r.h - 8) + ')' });
          else set(t, { x: r.x + 6, y: r.y + (head ? 16 : to === 'icicle' ? r.h / 2 + 5 : 17), 'text-anchor': 'start', transform: null });
          show = size > 0 && (upright ? textWidth(n.name, size, false) < r.h - 14 && r.w > 14 : textWidth(n.name, size, false) < r.w - 10 && r.h > 18);
          if (!head && to === 'treemap' && show && r.h > 40) { set(v, { x: r.x + r.w - 6, y: r.y + r.h - 7 }); set(v, { 'font-size': 11.5 }); vshow = true; }
          if (to === 'icicle' && n.depth < 3 && show && r.w > textWidth(n.name, size, false) + 110) { set(v, { x: r.x + r.w - 8, y: r.y + r.h / 2 + 5 }); set(v, { 'font-size': 13 }); vshow = true; }
        }
        var dark = st.dark || (to !== 'link' && to !== 'indent');
        /* Over lines (links and the indented list), a label wears an outline of the ground, so no line runs through it. */
        var halo = to === 'link' || to === 'indent';
        set(t, { 'font-size': size, 'font-weight': n.kids.length ? 700 : 500, fill: halo ? ink : dark && n.depth > 0 ? '#fff' : ink, opacity: show ? 1 : 0,
          stroke: halo ? (st.dark ? NU.stage : NU.paper) : null, 'stroke-width': halo ? 4 : null, 'paint-order': halo ? 'stroke' : null });
        set(v, { fill: to === 'link' || to === 'indent' ? soft : 'rgba(255,255,255,.85)', opacity: vshow ? 1 : 0 });
      });
    }
    function light(/** @type {string|null} */ name) {
      cards.textContent = '';
      var n = all.find(function (m) { return m.name === name; });
      var chain = /** @type {any[]} */ ([]);
      for (var m = n; m; m = m.parent) chain.push(m);
      rects.forEach(function (o) { set(o.node, { stroke: chain.indexOf(o.n) >= 0 ? NU.red : st.dark ? NU.stage : '#fff', 'stroke-width': chain.indexOf(o.n) >= 0 ? 3 : 1 }); });
      paths.forEach(function (o) { set(o.node, { stroke: chain.indexOf(o.n) >= 0 ? NU.red : soft, 'stroke-width': chain.indexOf(o.n) >= 0 ? 3 : 1.5 }); });
      if (!n) return;
      var r = at[n.name], path = chain.slice().reverse().map(function (x) { return x.name; }).join(' › ');
      var rows = /** @type {[string, string][]} */ ([['Name', n.name], [d.valueTitle || 'Value', format(fmt, n.value)], ['Share', format('.1%', n.value / root.value)]]);
      if (path.length > 46) path = '… › ' + chain.slice(0, 2).reverse().map(function (x) { return x.name; }).join(' › ');
      rows.push(['Path', path]);
      tooltipCard(cards, rows, r.x + Math.min(r.w, 40), r.y + Math.min(r.h, 30));
    }
    if (fig.interactive) {
      svg.addEventListener('pointermove', function (/** @type {PointerEvent} */ e) {
        var p = fig.toSlide(e), best = /** @type {any} */ (null);
        all.forEach(function (n) {
          var r = at[n.name]; if (!r) return;
          var pad = layout === 'link' ? 8 : 0;
          if (p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad && (!best || n.depth > best.depth)) best = n;
        });
        var name = best ? best.name : null;
        if (name !== lit) { lit = name; light(name); }
      });
      svg.addEventListener('pointerleave', function () { lit = null; light(stepLit); });
    }
    var stepLit = /** @type {string|null} */ (null);
    return {
      /** @param {any} step @param {boolean} animate */
      update: function (step, animate) {
        st.caption(step.caption);
        keyRow(keyG, step.key || d.key, st);
        var to = L[step.layout] ? step.layout : 'link', from = layout || to;
        stepLit = step.lit || null;
        cancel();
        labels.setAttribute('opacity', '0');
        cancel = tween(animate && from !== to ? 1500 : 0, function (k) { place(from, to, k); if (k >= 1) labels.setAttribute('opacity', '1'); });
        layout = to;
        light(lit || stepLit);
      },
      destroy: function () { cancel(); }
    };
  }
};
