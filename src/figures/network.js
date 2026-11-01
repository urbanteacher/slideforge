/* A network, three ways: as dots and lines, as a grid, and stored as a list.
 *
 * Made for IPDV Week 8 (docs/ipdv-week8-plan.md §5). The room hovers a node
 * and its neighbours light; drags a node and its edges follow (the position
 * was only ever a choice); and steps the same network from a picture into a
 * matrix, and the matrix into a new order, where clusters show up as blocks.
 *
 * figureData:
 *   nodes   [{ id, label?, group? }]
 *   links   [{ source, target, line?, value? }]  undirected; two links may join the same pair (two lines)
 *   layouts { name: { id: [x, y] } }            positions in slide pixels, made by the builder
 *   colours { key: hex }                        a link's colour by its `line`, a node's by its `group`
 *   nodeColour? hex, linkColour? hex            otherwise
 *   valueTitle? 'Scenes together'               the hover card's name for a link's value
 *   r? number                                   node radius (default 9)
 *   key? [{ mark, colour?, text }]              how to read it, in plain words (kit.js keyRow); a step's `key` replaces it
 * Each step may set:
 *   caption, explain
 *   view    'link' | 'matrix' | 'store'          store: the picture, the edge list and the matrix side by side
 *   layout  a key of layouts                      (link view) the nodes move there
 *   order   'name' | 'degree' | 'group'          (matrix view) the rows and columns, in that order
 *   labels  'all' | 'hubs' | 'none'               hubs: the busiest nodes only
 *   lit     a node id, or 'A-B' for an edge       lit before anyone points
 *   geo     true                                   draws "drawn where it really is" under the picture
 */
import { NU, W, H, el, set, tween, lerp, tooltipCard, textWidth, keyRow } from './kit.js';

var PLOT = { x0: 70, y0: 140, x1: W - 70, y1: H - 80 };

/** @param {any} l */
function key(l) { return l.source < l.target ? l.source + '-' + l.target : l.target + '-' + l.source; }

export var network = {
  /** @param {any} fig */
  mount: function (fig) {
    var d = fig.data, svg = fig.svg, st = fig.stage;
    /* Copies: the figure notes each node's links on it, and a slide's data may be frozen (the Lesson studio's is). */
    var nodes = (d.nodes || []).map(function (/** @type {any} */ n) { return Object.assign({}, n); }), links = d.links || [];
    var byId = /** @type {Record<string, any>} */ ({});
    nodes.forEach(function (/** @type {any} */ n) { byId[n.id] = n; n.links = []; n.near = {}; });
    links.forEach(function (/** @type {any} */ l) {
      if (!byId[l.source] || !byId[l.target]) return;
      byId[l.source].links.push(l); byId[l.target].links.push(l);
      byId[l.source].near[l.target] = true; byId[l.target].near[l.source] = true;
    });
    nodes.forEach(function (/** @type {any} */ n) { n.degree = Object.keys(n.near).length; });
    var hubs = nodes.slice().sort(function (/** @type {any} */ a, /** @type {any} */ b) { return b.degree - a.degree; }).slice(0, 8).map(function (/** @type {any} */ n) { return n.id; });
    var r = d.r || 9, ink = st.ink, soft = st.soft;
    var paper = !st.dark;
    var nodeFill = function (/** @type {any} */ n) { return (d.colours && n.group != null && d.colours[n.group]) || d.nodeColour || (paper ? NU.navy : NU.paper); };
    var linkStroke = function (/** @type {any} */ l) { return (d.colours && l.line && d.colours[l.line]) || d.linkColour || (paper ? '#8a96a3' : 'rgba(255,255,255,.45)'); };

    var layer = el('g', {}, svg), keyG = el('g', { 'pointer-events': 'none' }, svg), cards = el('g', { 'pointer-events': 'none' }, svg);
    var view = '', step = /** @type {any} */ ({}), pos = /** @type {Record<string, number[]>} */ ({}), cancel = function () {}, fade = function () {};
    var draw = /** @type {any} */ ({}), hovered = /** @type {string|null} */ (null);

    /* ------------------------------------------------ the picture: dots and lines */
    function linkView(/** @type {any} */ box) {
      var g = el('g', {}, layer);
      if (step.geo && !(step.key || d.key)) el('text', { x: PLOT.x1, y: PLOT.y0 - 6, 'text-anchor': 'end', 'font-family': NU.sans, 'font-size': 15, fill: soft }, g, 'Each station drawn where it really is');
      /* Two lines between one pair (Circle and District) sit side by side, not on top of each other. */
      var pairCount = /** @type {Record<string, number>} */ ({}), pairSeen = /** @type {Record<string, number>} */ ({});
      links.forEach(function (/** @type {any} */ l) { pairCount[key(l)] = (pairCount[key(l)] || 0) + 1; });
      var lines = links.map(function (/** @type {any} */ l) {
        var k = key(l), i = (pairSeen[k] = (pairSeen[k] || 0) + 1) - 1;
        return { l: l, off: (i - (pairCount[k] - 1) / 2) * (box ? 3 : 4.2), node: el('line', { stroke: linkStroke(l), 'stroke-width': box ? 3 : d.colours && l.line ? 4 : 2.2, 'stroke-linecap': 'round' }, g) };
      });
      var dots = nodes.map(function (/** @type {any} */ n) {
        return { n: n, node: el('circle', { r: box ? r * 1.6 : r, fill: d.colours && l0(n) ? '#fff' : nodeFill(n), stroke: d.colours && l0(n) ? '#14181f' : paper ? '#fff' : NU.stage, 'stroke-width': 2, cursor: fig.interactive ? 'grab' : null }, g) };
      });
      function l0(/** @type {any} */ n) { return n.group == null; }
      /* Big dots with short names (A to H) carry the name inside, as the side-by-side view does. */
      var inner = box || (r >= 14 && nodes.every(function (/** @type {any} */ n) { return String(n.label || n.id).length <= 2; }));
      var names = nodes.map(function (/** @type {any} */ n) {
        return el('text', { 'font-family': NU.sans, 'font-size': box ? 22 : inner ? Math.round(r * 0.95) : 13, 'font-weight': inner ? 700 : 600, fill: inner ? '#fff' : ink, 'text-anchor': inner ? 'middle' : 'start', 'pointer-events': 'none',
          stroke: inner ? null : paper ? NU.paper : NU.stage, 'stroke-width': inner ? null : 3.5, 'paint-order': 'stroke' }, g, n.label || n.id);
      });
      /* Which corner of its dot each name sits at: 0 up-right, 1 down-right, 2 up-left, 3 down-left. */
      var corner = nodes.map(function () { return 0; });
      function nameAt(/** @type {number[]} */ p, /** @type {number} */ c) {
        var right = c < 2, up = c % 2 === 0;
        return { x: right ? p[0] + r + 4 : p[0] - r - 4, y: up ? p[1] - r + 2 : p[1] + r + 12, 'text-anchor': right ? 'start' : 'end' };
      }
      function place() {
        lines.forEach(function (o) {
          var a = pos[o.l.source], b = pos[o.l.target];
          if (!a || !b) return;
          var dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1, ox = -dy / len * o.off, oy = dx / len * o.off;
          set(o.node, { x1: a[0] + ox, y1: a[1] + oy, x2: b[0] + ox, y2: b[1] + oy });
        });
        dots.forEach(function (o) { var p = pos[o.n.id]; if (p) set(o.node, { cx: p[0], cy: p[1] }); });
        names.forEach(function (t, i) {
          var p = pos[nodes[i].id];
          if (p) set(t, inner ? { x: p[0], y: p[1] + (box ? 8 : r * 0.34) } : nameAt(p, corner[i]));
        });
      }
      function light(/** @type {string|null} */ id) {
        var lit = id && byId[id] ? byId[id] : null, edge = id && !lit ? id : null;
        var labels = step.labels || (nodes.length > 30 ? 'hubs' : 'all');
        lines.forEach(function (o) {
          var on = lit ? (o.l.source === lit.id || o.l.target === lit.id) : edge ? key(o.l) === edge : true;
          set(o.node, { opacity: on ? 1 : 0.12, stroke: edge && on ? NU.red : linkStroke(o.l), 'stroke-width': (edge && on) ? 6 : box ? 3 : d.colours && o.l.line ? 4 : 2.2 });
        });
        dots.forEach(function (o) {
          var on = lit ? o.n === lit || lit.near[o.n.id] : edge ? edge.split('-').indexOf(o.n.id) >= 0 : true;
          /* In the side-by-side view a dot that is not lit goes pale but keeps its letter. */
          if (inner && !on) { set(o.node, { opacity: 1, fill: '#dfe5ec' }); return; }
          set(o.node, { opacity: on ? 1 : 0.18, fill: lit && o.n === lit ? NU.red : edge && on ? NU.red : d.colours && l0(o.n) ? '#fff' : nodeFill(o.n) });
        });
        /* Labels never sit on each other: the lit node first, then the busiest, each only where it fits. */
        var want = names.map(function (_, i) {
          var n = nodes[i], on = inner || (lit ? n === lit || lit.near[n.id] : labels === 'all' || (labels === 'hubs' && hubs.indexOf(n.id) >= 0));
          if (edge) on = box || edge.split('-').indexOf(n.id) >= 0;
          return on;
        });
        var rank = nodes.map(function (_, i) { return i; }).sort(function (a, b) {
          return (nodes[b] === lit ? 1 : 0) - (nodes[a] === lit ? 1 : 0) || nodes[b].degree - nodes[a].degree;
        });
        /* Each name tries the four corners of its dot, and takes the first that covers no other name and no other dot. */
        var placed = /** @type {number[][]} */ ([]);
        var clash = function (/** @type {number[]} */ b, /** @type {number[][]} */ list) { return list.some(function (q) { return b[0] < q[2] && q[0] < b[2] && b[1] < q[3] && q[1] < b[3]; }); };
        var others = function (/** @type {number} */ i) {
          return nodes.filter(function (_, k) { return k !== i && pos[nodes[k].id]; }).map(function (m) { var q = pos[m.id]; return [q[0] - r - 1, q[1] - r - 1, q[0] + r + 1, q[1] + r + 1]; });
        };
        rank.forEach(function (i) {
          var t = names[i], p = pos[nodes[i].id], show = want[i] && !!p;
          if (show && !inner) {
            var w = textWidth(String(nodes[i].label || nodes[i].id), 13, false) + 4, dotsNear = others(i), got = -1;
            /* First a corner clear of dots and names; failing that, one clear of names only. */
            for (var pass = 0; pass < 2 && got < 0; pass++) {
              for (var c = 0; c < 4 && got < 0; c++) {
                var at = nameAt(p, c), x0 = at['text-anchor'] === 'start' ? at.x - 2 : at.x - w + 2, b = [x0, at.y - 12, x0 + w, at.y + 4];
                if (!clash(b, placed) && (pass || !clash(b, dotsNear))) { got = c; placed.push(b); }
              }
            }
            show = got >= 0;
            if (show) { corner[i] = got; set(t, nameAt(p, got)); }
          }
          set(t, { opacity: show ? 1 : 0 });
          /* A pale dot's letter is navy, so it stays readable. */
          if (inner) { var lit2 = lit ? nodes[i] === lit || lit.near[nodes[i].id] : edge ? edge.split('-').indexOf(nodes[i].id) >= 0 : true; set(t, { fill: lit2 ? '#fff' : NU.navy }); }
        });
        cards.textContent = '';
        if (lit && !box) {
          var p = pos[lit.id], rows = /** @type {[string, string][]} */ ([['Name', lit.label || lit.id], ['Neighbours', String(lit.degree)]]);
          var lineNames = Array.from(new Set(lit.links.map(function (/** @type {any} */ l) { return l.line; }).filter(Boolean)));
          if (lineNames.length) rows.push(['Lines', String(lineNames.length)]);
          /* The card keeps off the names and the lit stations, and out of a story panel's column. */
          var blocks = placed.concat(nodes.filter(function (/** @type {any} */ m) { return (m === lit || lit.near[m.id]) && pos[m.id]; }).map(function (/** @type {any} */ m) { var q = pos[m.id]; return [q[0] - r - 4, q[1] - r - 4, q[0] + r + 4, q[1] + r + 4]; }));
          if (p) tooltipCard(cards, rows, p[0], p[1], { avoid: r + 8, blocks: blocks, minY: PLOT.y0, maxX: fig.story ? fig.story.x - 12 : undefined });
        }
      }
      return { place: place, light: light, dots: dots };
    }

    /* ------------------------------------------------ the grid: a row and a column per node */
    function matrixView(/** @type {any} */ box) {
      var g = el('g', {}, layer), n = nodes.length;
      var room = !box && n > 20 ? 26 : 0;
      var size = box ? box.size : Math.min(PLOT.y1 - PLOT.y0 - 10 - room, 540), x0 = box ? box.x : fig.story ? 200 + (fig.story.x - 24 - 200 - size) / 2 : (W - size) / 2 + 60, y0 = box ? box.y : PLOT.y0 + 6 + room, cell = size / n;
      var labelled = n <= 20;
      el('rect', { x: x0, y: y0, width: size, height: size, fill: paper ? '#fff' : 'rgba(255,255,255,.03)', stroke: paper ? '#d9d4ca' : NU.line }, g);
      var heads = labelled ? nodes.map(function (/** @type {any} */ m) {
        return {
          row: el('text', { 'font-family': NU.mono, 'font-size': Math.min(20, cell * 0.5), 'text-anchor': 'end', fill: ink }, g, m.label || m.id),
          col: el('text', { 'font-family': NU.mono, 'font-size': Math.min(20, cell * 0.5), 'text-anchor': 'middle', fill: ink }, g, m.label || m.id)
        };
      }) : [];
      var zeros = box ? nodes.map(function () { return nodes.map(function () { return el('text', { 'font-family': NU.mono, 'font-size': cell * 0.38, 'text-anchor': 'middle', fill: soft, opacity: 0.6 }, g, '0'); }); }) : [];
      var band = el('g', {}, g);
      var rowBand = el('rect', { x: x0, height: cell, width: size, fill: NU.red, opacity: 0 }, band);
      var colBand = el('rect', { y: y0, width: cell, height: size, fill: NU.red, opacity: 0 }, band);
      var maxV = Math.max(1, Math.max.apply(null, links.map(function (/** @type {any} */ l) { return l.value || 1; })));
      var cells = /** @type {any[]} */ ([]);
      links.forEach(function (/** @type {any} */ l) {
        if (!byId[l.source] || !byId[l.target]) return;
        [[l.source, l.target], [l.target, l.source]].forEach(function (p) {
          var a = byId[p[0]], b = byId[p[1]], same = a.group != null && a.group === b.group;
          var fill = box ? (paper ? NU.navy : NU.paper) : same && d.colours && d.colours[a.group] ? d.colours[a.group] : paper ? NU.navy : NU.mist;
          cells.push({ a: a, b: b, l: l, node: el('rect', { width: Math.max(1, cell - (n > 40 ? 0.6 : 2)), height: Math.max(1, cell - (n > 40 ? 0.6 : 2)), rx: n > 40 ? 0 : 3, fill: fill, opacity: box ? 1 : 0.62 + 0.38 * Math.sqrt((l.value || maxV) / maxV) }, g) });
          if (box) cells[cells.length - 1].one = el('text', { 'font-family': NU.mono, 'font-size': cell * 0.38, 'font-weight': 700, 'text-anchor': 'middle', fill: '#fff', 'pointer-events': 'none' }, g, '1');
        });
      });
      var at = /** @type {Record<string, number>} */ ({});
      function order(/** @type {string} */ how) {
        var list = nodes.slice();
        if (how === 'degree') list.sort(function (/** @type {any} */ a, /** @type {any} */ b) { return b.degree - a.degree || String(a.label || a.id).localeCompare(String(b.label || b.id)); });
        else if (how === 'group') list.sort(function (/** @type {any} */ a, /** @type {any} */ b) { return (a.group - b.group) || String(a.label || a.id).localeCompare(String(b.label || b.id)); });
        else if (how === 'name') list.sort(function (/** @type {any} */ a, /** @type {any} */ b) { return String(a.label || a.id).localeCompare(String(b.label || b.id)); });
        var next = /** @type {Record<string, number>} */ ({});
        list.forEach(function (/** @type {any} */ m, /** @type {number} */ i) { next[m.id] = i; });
        return next;
      }
      function place(/** @type {Record<string, number>} */ from, /** @type {Record<string, number>} */ to, /** @type {number} */ k) {
        var p = function (/** @type {string} */ id) { return lerp(from[id], to[id], k); };
        var pad = n > 40 ? 0.3 : 1;
        cells.forEach(function (c) {
          set(c.node, { x: x0 + p(c.b.id) * cell + pad, y: y0 + p(c.a.id) * cell + pad });
          if (c.one) set(c.one, { x: x0 + (p(c.b.id) + 0.5) * cell, y: y0 + (p(c.a.id) + 0.5) * cell + cell * 0.13 });
        });
        heads.forEach(function (h, i) {
          var id = nodes[i].id;
          set(h.row, { x: x0 - 10, y: y0 + (p(id) + 0.5) * cell + cell * 0.17 });
          set(h.col, { x: x0 + (p(id) + 0.5) * cell, y: y0 - 10 });
        });
        zeros.forEach(function (row, i) { row.forEach(function (/** @type {any} */ t, /** @type {number} */ j) { set(t, { x: x0 + (p(nodes[j].id) + 0.5) * cell, y: y0 + (p(nodes[i].id) + 0.5) * cell + cell * 0.13 }); }); });
      }
      function arrange(/** @type {string} */ how, /** @type {boolean} */ animate) {
        var to = order(how), from = Object.keys(at).length ? at : to;
        cancel();
        at = to;
        cancel = tween(animate ? 1100 : 0, function (k) { place(from, to, k); });
      }
      function light(/** @type {string|null} */ id, /** @type {any} */ cellHit) {
        cards.textContent = '';
        var lit = id && byId[id] ? byId[id] : null, edge = id && !lit ? id : null;
        set(rowBand, { opacity: 0 }); set(colBand, { opacity: 0 });
        /* In a big grid a lit pair keeps the rest at full strength, so the blocks still show around it. */
        var keepAll = edge && !box && !labelled;
        cells.forEach(function (c) {
          var on = lit ? c.a === lit || c.b === lit : edge ? key(c.l) === edge : true;
          set(c.node, { opacity: on || keepAll ? (box ? 1 : 0.62 + 0.38 * Math.sqrt((c.l.value || maxV) / maxV)) : 0.12, fill: (edge && on) ? NU.red : c.node.getAttribute('data-fill') || c.node.getAttribute('fill') });
          if (!c.node.getAttribute('data-fill')) c.node.setAttribute('data-fill', c.node.getAttribute('fill'));
          if (!(edge && on)) set(c.node, { fill: c.node.getAttribute('data-fill') });
          /* A faded square's 1 fades with it, in navy, so it still reads as a 1. */
          if (c.one) set(c.one, { fill: on ? '#fff' : NU.navy, opacity: on ? 1 : 0.35 });
        });
        if (lit) {
          set(rowBand, { y: y0 + at[lit.id] * cell, opacity: 0.16 });
          set(colBand, { x: x0 + at[lit.id] * cell, opacity: 0.16 });
        }
        /* A grid too big to name every row names the lit ones, so a still can be read without pointing. */
        var hit = edge ? cells.find(function (c) { return key(c.l) === edge; }) : null;
        if (hit && !box) {
          set(rowBand, { y: y0 + at[hit.a.id] * cell, opacity: 0.22 });
          set(colBand, { x: x0 + at[hit.b.id] * cell, opacity: 0.22 });
        }
        if (!labelled && !box) {
          var named = lit ? [[lit, lit]] : hit ? [[hit.a, hit.b]] : [];
          named.forEach(function (pair) {
            el('text', { x: x0 - 10, y: y0 + (at[pair[0].id] + 0.5) * cell + 5, 'font-family': NU.sans, 'font-size': 15, 'font-weight': 700, 'text-anchor': 'end', fill: NU.red }, cards, pair[0].label || pair[0].id);
            el('text', { x: x0 + (at[pair[1].id] + 0.5) * cell, y: y0 - 8, 'font-family': NU.sans, 'font-size': 15, 'font-weight': 700, 'text-anchor': 'middle', fill: NU.red }, cards, pair[1].label || pair[1].id);
          });
          if (hit) el('circle', { cx: x0 + (at[hit.b.id] + 0.5) * cell, cy: y0 + (at[hit.a.id] + 0.5) * cell, r: Math.max(9, cell * 2), fill: 'none', stroke: NU.red, 'stroke-width': 3 }, cards);
        }
        if (cellHit && !box) {
          var rows = /** @type {[string, string][]} */ ([['Row', cellHit.a.label || cellHit.a.id], ['Column', cellHit.b.label || cellHit.b.id]]);
          if (cellHit.l.value != null) rows.push([d.valueTitle || 'Value', String(cellHit.l.value)]);
          set(rowBand, { y: y0 + at[cellHit.a.id] * cell, opacity: 0.16 });
          set(colBand, { x: x0 + at[cellHit.b.id] * cell, opacity: 0.16 });
          tooltipCard(cards, rows, x0 + (at[cellHit.b.id] + 1) * cell, y0 + (at[cellHit.a.id] + 1) * cell, { maxX: fig.story ? fig.story.x - 12 : undefined });
        }
      }
      function hit(/** @type {any} */ p) {
        var i = Math.floor((p.y - y0) / cell), j = Math.floor((p.x - x0) / cell);
        if (i < 0 || j < 0 || i >= n || j >= n) return null;
        return cells.find(function (c) { return at[c.a.id] === i && at[c.b.id] === j; }) || null;
      }
      return { arrange: arrange, light: light, hit: hit };
    }

    /* ------------------------------------------------ stored: picture, list and grid, side by side */
    function storeView() {
      var g = el('g', { 'font-family': NU.sans }, layer);
      var heads = [['The picture', 70], ['The edge list', 548], ['The matrix', 812]];
      heads.forEach(function (h) { el('text', { x: h[1], y: 150, 'font-size': 20, 'font-weight': 700, fill: NU.red }, g, String(h[0])); });
      el('text', { x: 548, y: 176, 'font-size': 15, fill: soft }, g, 'one row per edge');
      el('text', { x: 812, y: 176, 'font-size': 15, fill: soft }, g, '1 = joined, 0 = not');
      var pic = linkView(true);
      var list = el('g', { 'font-family': NU.mono, 'font-size': 19 }, g);
      el('text', { x: 560, y: 214, fill: soft, 'font-weight': 700 }, list, 'source  target');
      var rows = links.map(function (/** @type {any} */ l, /** @type {number} */ i) {
        var y = 246 + i * 34;
        return { k: key(l), bg: el('rect', { x: 548, y: y - 24, width: 214, height: 32, rx: 4, fill: NU.red, opacity: 0 }, list), text: el('text', { x: 560, y: y, fill: ink }, list, '  ' + l.source + '       ' + l.target) };
      });
      var grid = matrixView({ x: 852, y: 216, size: 360 });
      grid.arrange('name', false);
      function light(/** @type {string|null} */ id) {
        pic.light(id); grid.light(id, null);
        rows.forEach(function (o) {
          var on = id && byId[id] ? o.k.split('-').indexOf(id) >= 0 : o.k === id;
          set(o.bg, { opacity: on ? 0.22 : 0 });
        });
      }
      function hitRow(/** @type {any} */ p) {
        if (p.x < 548 || p.x > 762) return null;
        var o = rows.find(function (_, i) { var y = 246 + i * 34; return p.y >= y - 24 && p.y <= y + 8; });
        return o ? o.k : null;
      }
      return { place: pic.place, light: light, hitRow: hitRow, grid: grid };
    }

    /* ------------------------------------------------ pointing and dragging */
    var dragging = /** @type {string|null} */ (null);
    function nearest(/** @type {any} */ p, /** @type {number} */ within) {
      var best = null, bd = within * within;
      nodes.forEach(function (/** @type {any} */ n) {
        var q = pos[n.id]; if (!q) return;
        var dd = (q[0] - p.x) * (q[0] - p.x) + (q[1] - p.y) * (q[1] - p.y);
        if (dd < bd) { bd = dd; best = n.id; }
      });
      return best;
    }
    function point(/** @type {any} */ p) {
      if (view === 'link') return nearest(p, 22);
      if (view === 'store') { var n = nearest(p, 34); if (n) return n; var row = draw.hitRow(p); if (row) return row; var c = draw.grid.hit(p); return c ? key(c.l) : null; }
      return null;
    }
    if (fig.interactive) {
      svg.addEventListener('pointerdown', function (/** @type {PointerEvent} */ e) {
        if (view !== 'link') return;
        var id = nearest(fig.toSlide(e), 22);
        if (!id) return;
        dragging = id;
        cancel();
        try { svg.setPointerCapture(e.pointerId); } catch (err) { /* not every pointer can be captured */ }
      });
      svg.addEventListener('pointermove', function (/** @type {PointerEvent} */ e) {
        var p = fig.toSlide(e);
        if (dragging) {
          pos[dragging] = [Math.max(PLOT.x0, Math.min(fig.story ? fig.story.x - 24 : PLOT.x1, p.x)), Math.max(PLOT.y0, Math.min(PLOT.y1, p.y))];
          draw.place(); draw.light(dragging);
          return;
        }
        if (view === 'matrix') { var c = draw.hit(p); draw.light(null, c); return; }
        var id = point(p);
        if (id !== hovered) { hovered = id; draw.light(id || step.lit || null, null); }
      });
      var drop = function () { dragging = null; };
      svg.addEventListener('pointerup', drop);
      svg.addEventListener('pointercancel', drop);
      svg.addEventListener('pointerleave', function () { dragging = null; hovered = null; if (draw.light) draw.light(step.lit || null, null); });
    }

    return {
      /** @param {any} next @param {boolean} animate */
      update: function (next, animate) {
        var was = step;
        step = next;
        st.caption(step.caption);
        keyRow(keyG, step.key || d.key, st);
        var v = step.view || 'link';
        var layouts = d.layouts || {}, target = layouts[step.layout || Object.keys(layouts)[0]] || {};
        if (v !== view || (v === 'store')) {
          cancel();
          layer.textContent = ''; cards.textContent = '';
          view = v;
          if (v === 'store') { pos = JSON.parse(JSON.stringify(layouts.store || target)); draw = storeView(); draw.place(); }
          else if (v === 'matrix') { draw = matrixView(null); draw.arrange(step.order || 'name', false); }
          else { pos = JSON.parse(JSON.stringify(target)); draw = linkView(null); draw.place(); }
          /* The fade has its own handle: a re-order that cancels the grid's travel must not leave it half faded. */
          fade();
          if (animate) { set(layer, { opacity: 0 }); fade = tween(500, function (k) { set(layer, { opacity: k }); }); } else set(layer, { opacity: 1 });
          draw.light(step.lit || null, null);
          return;
        }
        if (v === 'matrix') { if (was.order !== step.order) draw.arrange(step.order || 'name', animate); draw.light(step.lit || null, null); return; }
        /* Same picture, new layout: every node travels to its new place. */
        var from = JSON.parse(JSON.stringify(pos));
        cancel();
        layer.textContent = ''; draw = linkView(null);
        cancel = tween(animate ? 1400 : 0, function (k) {
          Object.keys(target).forEach(function (id) { var a = from[id] || target[id], b = target[id]; pos[id] = [lerp(a[0], b[0], k), lerp(a[1], b[1], k)]; });
          draw.place();
        });
        draw.light(step.lit || null, null);
      },
      destroy: function () { cancel(); fade(); }
    };
  }
};
