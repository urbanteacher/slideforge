/* Königsberg's seven bridges, where graph theory began (Euler, 1736).
 *
 * Made for IPDV Week 8 (docs/ipdv-week8-plan.md §5). First the city: click
 * a piece of land to stand on it, then click bridges to cross them, each
 * once. Nobody manages all seven. Then Euler's move: the land shrinks to four
 * dots, the bridges become seven lines, and the answer is in the dots alone:
 * how many lines meet at each one.
 *
 * figureData: none needed.
 * Each step may set:
 *   caption, explain
 *   show   'city' | 'graph' | 'degree' | 'eighth'
 *   walk   [bridge numbers, 1–7]   a walk already made (from the land the first bridge leaves)
 *   from   'N' | 'S' | 'I' | 'E'    where that walk starts
 * With a story panel (figureStory) the city is drawn smaller, in the space to its left.
 */
import { NU, W, H, el, set, tween, lerp } from './kit.js';

/* The city, stylised: the Pregel runs in from the west, wraps round the
   Kneiphof island, and splits into two arms that cut off the east. */
var LAND = {
  N: { name: 'North bank', at: [400, 196], dot: [560, 196] },
  S: { name: 'South bank', at: [400, 572], dot: [560, 560] },
  I: { name: 'The island (Kneiphof)', at: [560, 384], dot: [560, 378] },
  E: { name: 'The east', at: [1060, 384], dot: [960, 378] }
};
/* Each bridge: the two lands it joins, and where it is drawn (a centre and an angle). */
var BRIDGES = [
  { a: 'I', b: 'N', x: 480, y: 286, rot: 90 },
  { a: 'I', b: 'N', x: 640, y: 286, rot: 90 },
  { a: 'I', b: 'S', x: 480, y: 470, rot: 90 },
  { a: 'I', b: 'S', x: 640, y: 470, rot: 90 },
  { a: 'I', b: 'E', x: 742, y: 378, rot: 0 },
  { a: 'N', b: 'E', x: 900, y: 270, rot: 80 },
  { a: 'S', b: 'E', x: 900, y: 488, rot: 100 }
];
/* The bridge a later town might add, which makes a walk possible. */
var EIGHTH = { a: 'N', b: 'S', x: 200, y: 384, rot: 90 };
var WATER = '#5b8db8', GROUND = '#e9e1cf', ISLAND = '#efe8d8';

export var bridges = {
  /** @param {any} fig */
  mount: function (fig) {
    var svg = fig.svg, st = fig.stage;
    /* The city is drawn in its own 1280-wide space. It is cropped to the part that matters and fitted into a box:
       the whole slide's middle, or, beside a story panel, the space to its left. Either way it stays clear of the caption. */
    var CROP = { x: 100, y: 122, w: 1050, h: 500 };
    var box = fig.story ? { x: 48, y: 196, w: fig.story.x - 48 - 24 } : { x: 64, y: 150, w: W - 128 };
    var k = Math.min(box.w / CROP.w, (H - 96 - box.y) / CROP.h), clip = 'fig-bridges-' + Math.random().toString(36).slice(2);
    var defs = el('defs', {}, svg), cp = el('clipPath', { id: clip }, defs);
    el('rect', { x: CROP.x, y: CROP.y, width: CROP.w, height: CROP.h, rx: 8 / k }, cp);
    var world = el('g', { transform: 'translate(' + (box.x - CROP.x * k) + ' ' + (box.y - CROP.y * k) + ') scale(' + k + ')' }, svg);
    var inside = el('g', { 'clip-path': 'url(#' + clip + ')' }, world);
    var city = el('g', {}, inside);
    el('rect', { x: 0, y: 118, width: W, height: 538, fill: GROUND }, city);
    var river = el('g', { fill: 'none', stroke: WATER, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, city);
    el('path', { d: 'M-20 384 L560 384', 'stroke-width': 96 }, river);
    el('ellipse', { cx: 560, cy: 378, rx: 200, ry: 118, fill: WATER, stroke: 'none' }, river);
    el('path', { d: 'M700 340 C820 300 900 266 1300 236', 'stroke-width': 74 }, river);
    el('path', { d: 'M700 416 C820 456 900 492 1300 524', 'stroke-width': 74 }, river);
    el('ellipse', { cx: 560, cy: 378, rx: 128, ry: 52, fill: ISLAND, stroke: '#cbbf9f', 'stroke-width': 2 }, city);
    var landText = Object.keys(LAND).map(function (k) {
      var l = /** @type {any} */ (LAND)[k];
      return el('text', { x: l.at[0], y: l.at[1] + (k === 'I' ? 6 : 0), 'text-anchor': 'middle', 'font-family': NU.sans, 'font-size': k === 'I' ? 17 : 20, 'font-weight': 700, fill: '#5a4a2a', 'pointer-events': 'none' }, city, l.name);
    });
    /* Land you can click: invisible zones over each piece of land. */
    var zones = {
      N: el('rect', { x: 0, y: 118, width: W, height: 120, fill: 'transparent' }, city),
      S: el('rect', { x: 0, y: 530, width: W, height: 126, fill: 'transparent' }, city),
      I: el('ellipse', { cx: 560, cy: 378, rx: 128, ry: 52, fill: 'transparent' }, city),
      E: el('path', { d: 'M780 378 L1280 300 L1280 460 Z', fill: 'transparent' }, city)
    };
    var deck = el('g', {}, inside);
    function bridgeShape(/** @type {any} */ b, /** @type {number} */ i, /** @type {any} */ parent) {
      var g = el('g', { transform: 'translate(' + b.x + ' ' + b.y + ') rotate(' + b.rot + ')', cursor: fig.interactive ? 'pointer' : null }, parent);
      var plank = el('rect', { x: -52, y: -15, width: 104, height: 30, rx: 5, fill: '#8a6a43', stroke: '#5b4426', 'stroke-width': 2 }, g);
      var num = el('text', { x: 0, y: 7, 'text-anchor': 'middle', 'font-family': NU.sans, 'font-size': 19, 'font-weight': 700, fill: '#fff', transform: 'rotate(' + -b.rot + ')' }, g, String(i + 1));
      return { g: g, plank: plank, num: num };
    }
    var planks = BRIDGES.map(function (b, i) { return bridgeShape(b, i, deck); });
    var extra = bridgeShape(EIGHTH, 7, deck);
    var walker = el('circle', { r: 13, fill: NU.red, stroke: '#fff', 'stroke-width': 3, opacity: 0, 'pointer-events': 'none' }, inside);
    /* Where the walk stands, above the map on the left; Start again above it on the right. */
    var right = box.x + CROP.w * k;
    var status = el('text', { x: box.x, y: box.y - 16, 'font-family': NU.sans, 'font-size': 20, 'font-weight': 700, fill: st.ink }, svg);
    var again = el('g', { cursor: 'pointer', display: 'none' }, svg);
    el('rect', { x: right - 140, y: box.y - 46, width: 140, height: 36, rx: 18, fill: NU.red }, again);
    el('text', { x: right - 70, y: box.y - 22, 'text-anchor': 'middle', 'font-family': NU.sans, 'font-size': 16, 'font-weight': 700, fill: '#fff' }, again, 'Start again');

    /* The graph: four dots and the bridges as lines (two lines between one pair bow apart). */
    var graph = el('g', { opacity: 0, 'pointer-events': 'none' }, inside);
    function edgePath(/** @type {any} */ b, /** @type {number} */ bow) {
      var p = /** @type {any} */ (LAND)[b.a].dot, q = /** @type {any} */ (LAND)[b.b].dot, mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
      var dx = q[0] - p[0], dy = q[1] - p[1], len = Math.hypot(dx, dy);
      return 'M' + p[0] + ' ' + p[1] + ' Q' + (mx - dy / len * bow) + ' ' + (my + dx / len * bow) + ' ' + q[0] + ' ' + q[1];
    }
    var bows = [-60, 60, 60, -60, 0, -40, 40];
    var edges = BRIDGES.map(function (b, i) { return el('path', { d: edgePath(b, bows[i]), fill: 'none', stroke: st.ink, 'stroke-width': 5 }, graph); });
    var eighthEdge = el('path', { d: 'M560 196 C 140 250, 140 506, 560 560', fill: 'none', stroke: NU.red, 'stroke-width': 5, 'stroke-dasharray': '12 9', opacity: 0 }, graph);
    var dots = Object.keys(LAND).map(function (k) {
      var l = /** @type {any} */ (LAND)[k];
      return {
        k: k,
        dot: el('circle', { cx: l.dot[0], cy: l.dot[1], r: 26, fill: NU.navy, stroke: '#fff', 'stroke-width': 3 }, graph),
        deg: el('text', { x: l.dot[0], y: l.dot[1] + 9, 'text-anchor': 'middle', 'font-family': NU.sans, 'font-size': 26, 'font-weight': 700, fill: '#fff', opacity: 0 }, graph, ''),
        /* Each name sits clear of the lines: the banks above and below their dots, the island and the east beside theirs. */
        name: el('text', { x: l.dot[0] + (k === 'E' ? 40 : k === 'I' ? -40 : 0), y: l.dot[1] + (k === 'N' ? -38 : k === 'S' ? 54 : 8), 'text-anchor': k === 'E' ? 'start' : k === 'I' ? 'end' : 'middle', 'font-family': NU.sans, 'font-size': 22, 'font-weight': 600, fill: st.soft }, graph, l.name)
      };
    });

    /* ---------------------------------------------- walking */
    var here = /** @type {string|null} */ (null), used = /** @type {number[]} */ ([]), show = 'city', cancel = function () {};
    function moveWalker(/** @type {number[]} */ to, /** @type {boolean} */ animate) {
      var fx = Number(walker.getAttribute('cx') || to[0]), fy = Number(walker.getAttribute('cy') || to[1]);
      cancel();
      cancel = tween(animate ? 450 : 0, function (k) { set(walker, { cx: lerp(fx, to[0], k), cy: lerp(fy, to[1], k) }); });
    }
    function paint() {
      planks.forEach(function (p, i) { set(p.plank, { fill: used.indexOf(i) >= 0 ? NU.red : '#8a6a43', stroke: used.indexOf(i) >= 0 ? '#7a0a1c' : '#5b4426' }); });
      set(walker, { opacity: here ? 1 : 0 });
      if (show !== 'city') { status.textContent = ''; again.setAttribute('display', 'none'); return; }
      var left = here ? BRIDGES.map(function (b, i) { return i; }).filter(function (i) { return used.indexOf(i) < 0 && (BRIDGES[i].a === here || BRIDGES[i].b === here); }) : [];
      status.textContent = !here ? 'Click a piece of land to start' : used.length === 7 ? 'All seven! (Check again…)' : !left.length ? 'Stuck: ' + used.length + ' of 7 crossed, no bridge left from here' : used.length + ' of 7 crossed';
      set(status, { fill: here && !left.length ? NU.red : st.ink });
      again.setAttribute('display', fig.interactive && here ? 'inline' : 'none');
    }
    function cross(/** @type {number} */ i, /** @type {boolean} */ animate) {
      var b = BRIDGES[i];
      if (!here || used.indexOf(i) >= 0 || (b.a !== here && b.b !== here)) return false;
      here = b.a === here ? b.b : b.a;
      used.push(i);
      moveWalker(/** @type {any} */ (LAND)[here].at.map(function (v, j) { return j ? v + 26 : v; }), animate);
      return true;
    }
    function start(/** @type {string} */ land) {
      here = land; used = [];
      var at = /** @type {any} */ (LAND)[land].at;
      set(walker, { cx: at[0], cy: at[1] + 26 });
    }
    if (fig.interactive) {
      Object.keys(zones).forEach(function (k) {
        /** @type {any} */ (zones)[k].addEventListener('click', function () { if (show === 'city' && !here) { start(k); paint(); } });
      });
      planks.forEach(function (p, i) { p.g.addEventListener('click', function (/** @type {Event} */ e) { e.stopPropagation(); if (show === 'city' && cross(i, true)) paint(); }); });
      again.addEventListener('click', function (/** @type {Event} */ e) { e.stopPropagation(); here = null; used = []; paint(); });
    }

    /* ---------------------------------------------- steps */
    var fade = function () {};
    return {
      /** @param {any} step @param {boolean} animate */
      update: function (step, animate) {
        st.caption(step.caption);
        var was = show;
        show = step.show || 'city';
        if (step.walk && step.from) { start(step.from); step.walk.forEach(function (/** @type {number} */ n) { cross(n - 1, false); }); }
        else if (show !== 'city') { here = null; used = []; }
        var toGraph = show !== 'city' ? 1 : 0, fromGraph = was !== 'city' ? 1 : 0;
        fade();
        fade = tween(animate && toGraph !== fromGraph ? 1300 : 0, function (k) {
          var g = lerp(fromGraph, toGraph, k);
          set(city, { opacity: 1 - g * 0.85 });
          set(deck, { opacity: 1 - g });
          set(graph, { opacity: g });
          landText.forEach(function (t) { set(t, { opacity: 1 - g }); });
        });
        var degree = show === 'degree' || show === 'eighth';
        var count = /** @type {Record<string, number>} */ ({ N: 0, S: 0, I: 0, E: 0 });
        BRIDGES.forEach(function (b) { count[b.a]++; count[b.b]++; });
        if (show === 'eighth') { count.N++; count.S++; }
        dots.forEach(function (o) {
          var odd = count[o.k] % 2 === 1;
          o.deg.textContent = String(count[o.k]);
          set(o.deg, { opacity: degree ? 1 : 0 });
          set(o.dot, { fill: degree && odd ? NU.red : NU.navy });
        });
        set(eighthEdge, { opacity: show === 'eighth' ? 1 : 0 });
        set(extra.g, { display: 'none' });
        edges.forEach(function (e) { set(e, { stroke: st.ink }); });
        paint();
      },
      destroy: function () { cancel(); fade(); }
    };
  }
};
