/* Code ↔ chart: the lecture's answer to "how does that work in Altair?"
 *
 * The Altair on the page (left), the chart it makes on the stage (right) and
 * the mechanics strip beneath both: input → parameter → predicate → visual
 * response, the grammar of the students' guide (§5). Each Next types one
 * more line, lights it, changes the chart to match, and lights the strip box
 * that line belongs to. The chart is live: hover it, and it answers with the
 * tooltip the code on the left has built so far.
 *
 * figureData:
 *   code     the program's lines, all of them; steps reveal them
 *   chart    'scatter' | 'bars'
 *   plot     the chart's data, as scatter() or bars() take it (plots.js);
 *            without it, the figure's own data is the chart's
 *   columns  for tooltip='all': the columns in the order the table has them
 *   guide    the footer: where the same pattern is in the student's guide
 *   strip    { input, parameter, predicate, response }: the four boxes' words
 * Each step may set:
 *   caption, show (the line indexes on the page, in order, or a count from
 *   the top), lit ([line indexes] to light; default: the lines this step typed), tooltip (the spec in force: a list,
 *   'all', or null), demo (a row id whose card is pinned open), strip (which
 *   box is lit: 'input' | 'parameter' | 'predicate' | 'response'), stripText
 *   (this step's words for the boxes), split (bars drawn as their parts),
 *   bug ([line indexes] ringed in red), colour, mark (a row id lit in red).
 */
import { NU, W, H, SPLIT, el, set, tween } from './kit.js';
import { scatter, bars, tooltipRows, cardAt } from './plots.js';

var CODE = { x: 56, y: 150, size: 15, lh: 22.5 };
var CHART = { x0: SPLIT.x + 96, x1: W - 50, y0: 170, y1: SPLIT.y - 92 };
var BOXES = [
  ['input', 'INPUT', 'what the reader does'],
  ['parameter', 'PARAMETER', 'what the chart stores'],
  ['predicate', 'PREDICATE', 'what it tests'],
  ['response', 'VISUAL RESPONSE', 'what changes']
];

/* Python, coloured just enough to read: strings and numbers navy, comments grey, keywords bold. */
var TOKENS = /(#.*$)|('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")|\b(\d+(?:\.\d+)?)\b|\b(import|from|as|True|False|None|def|return|lambda|if|else)\b|(\balt\.)/g;
/** @param {Element} text @param {string} line */
function colour(text, line) {
  text.textContent = '';
  var last = 0, m;
  TOKENS.lastIndex = 0;
  /** @param {string} s @param {Record<string, any>} [a] */
  function span(s, a) { if (s) el('tspan', a || {}, text, s); }
  while ((m = TOKENS.exec(line))) {
    span(line.slice(last, m.index));
    if (m[1]) span(m[1], { fill: NU.dim, 'font-style': 'italic' });
    else if (m[2]) span(m[2], { fill: NU.navy, 'font-weight': 600 });
    else if (m[3]) span(m[3], { fill: NU.navy });
    else if (m[4]) span(m[4], { 'font-weight': 700 });
    else if (m[5]) span(m[5], { fill: NU.dim });
    last = m.index + m[0].length;
  }
  span(line.slice(last));
}

export var codechart = {
  /** @param {any} fig */
  mount: function (fig) {
    var d = fig.data, svg = fig.svg, st = fig.stage, code = d.code || [];

    /* The page: the program, one text per line, and a bar that marks the lit ones. */
    var page = el('g', { 'font-family': NU.mono, 'font-size': CODE.size }, svg);
    var lines = code.map(function (/** @type {string} */ src) {
      var bug = el('rect', { x: CODE.x - 12, width: SPLIT.x - CODE.x - 4, height: CODE.lh, rx: 5, fill: 'none', stroke: NU.red, 'stroke-width': 2.5, opacity: 0 }, page);
      var bar = el('rect', { x: CODE.x - 22, width: 5, height: CODE.lh - 4, fill: NU.red, opacity: 0 }, page);
      var text = el('text', { x: CODE.x, fill: NU.ink, style: 'white-space:pre' }, page);
      return { src: src, text: text, bar: bar, bug: bug, typed: false };
    });
    /** A line's place on the page: its rank among the lines shown, so a variant takes its original's place.
     * @param {any} l @param {number} rank */
    function place(l, rank) {
      var y = CODE.y + rank * CODE.lh;
      set(l.text, { y: y }); set(l.bar, { y: y - CODE.size + 1 }); set(l.bug, { y: y - CODE.size - 2 });
    }
    if (d.guide) el('text', { x: W - 50, y: SPLIT.y - 12, 'text-anchor': 'end', 'font-family': NU.sans, 'font-size': 13, 'font-weight': 700, 'letter-spacing': 1.4, fill: NU.red }, svg, d.guide.toUpperCase());

    /* The stage: the chart the code makes. */
    var look = { ink: NU.paper, soft: NU.mist, font: 14 };
    var plotData = d.plot || d;
    /* Bars carry their category labels on the left: give them room clear of the page. */
    var chart = d.chart === 'bars' ? bars(svg, plotData, Object.assign({}, CHART, { x0: SPLIT.x + 210 }), look) : scatter(svg, plotData, CHART, look);
    var ring = el('circle', { r: 0, fill: 'none', stroke: NU.paper, 'stroke-width': 2.5, opacity: 0, 'pointer-events': 'none' }, svg);
    var cardLayer = el('g', { 'pointer-events': 'none' }, svg);

    /* The strip: four boxes along the foot. */
    var stripG = el('g', { 'font-family': NU.sans }, svg), bw = (W - 128 - 3 * 34) / 4;
    var boxes = BOXES.map(function (b, i) {
      var x = 64 + i * (bw + 34), y = SPLIT.y + 22;
      var r = el('rect', { x: x, y: y, width: bw, height: 86, rx: 10, fill: 'rgba(255,255,255,.04)', stroke: NU.line, 'stroke-width': 1.5 }, stripG);
      var label = el('text', { x: x + 16, y: y + 26, 'font-size': 13, 'font-weight': 700, 'letter-spacing': 1.6, fill: NU.mist }, stripG, b[1]);
      el('text', { x: x + bw - 14, y: y + 26, 'text-anchor': 'end', 'font-size': 12, fill: NU.mist, opacity: 0.8 }, stripG, b[2]);
      var words = el('text', { x: x + 16, y: y + 60, 'font-size': 19, fill: NU.paper }, stripG);
      if (i < 3) el('path', { d: 'M' + (x + bw + 8) + ' ' + (y + 43) + ' h18 m-7 -7 l7 7 l-7 7', fill: 'none', stroke: NU.mist, 'stroke-width': 2 }, stripG);
      return { key: b[0], rect: r, label: label, words: words };
    });

    var spec = /** @type {any} */ (null), pinned = /** @type {any} */ (null), hovered = /** @type {any} */ (null);
    function paintCard() {
      var m = hovered || pinned, rows = m && spec ? tooltipRows(m.row, spec, d.columns) : [];
      set(ring, { opacity: m && rows.length && m.r ? 1 : 0, cx: m ? m.x : 0, cy: m ? m.y : 0, r: m && m.r ? m.r + 4 : 0 });
      cardAt(cardLayer, rows.length ? m : null, rows);
    }
    if (fig.interactive) {
      svg.addEventListener('pointermove', function (/** @type {PointerEvent} */ e) {
        var p = fig.toSlide(e), best = p.x > SPLIT.x && p.y < SPLIT.y ? chart.nearest(p) : null;
        if (best !== hovered) { hovered = best; paintCard(); }
      });
      svg.addEventListener('pointerleave', function () { hovered = null; paintCard(); });
    }

    var cancel = function () {}, /** @type {number[]} */ shownLines = [];
    return {
      /** @param {any} step @param {boolean} animate */
      update: function (step, animate) {
        cancel();
        st.caption(step.caption);
        /** @type {number[]} */
        var show = Array.isArray(step.show) ? step.show : code.map(function (/** @type {string} */ _, /** @type {number} */ i) { return i; }).slice(0, step.show == null ? code.length : step.show);
        var fresh = show.filter(function (i) { return shownLines.indexOf(i) < 0; });
        var lit = step.lit || (shownLines.length ? fresh : []);
        var bugs = step.bug || [];
        lines.forEach(function (/** @type {any} */ l, /** @type {number} */ i) {
          var rank = show.indexOf(i), on = rank >= 0;
          if (on) place(l, rank);
          set(l.text, { opacity: !on ? 0 : lit.length && lit.indexOf(i) < 0 ? 0.34 : 1 });
          set(l.bar, { opacity: on && lit.indexOf(i) >= 0 ? 1 : 0 });
          set(l.bug, { opacity: on && bugs.indexOf(i) >= 0 ? 1 : 0 });
          if (on) colour(l.text, l.src);
          else l.text.textContent = '';
        });
        /* New lines type themselves in, a character at a time, while the chart waits for them. */
        var typing = animate && shownLines.length ? fresh : [];
        shownLines = show;
        var total = typing.reduce(function (n, i) { return n + lines[i].src.length; }, 0);
        function settle() {
          spec = step.tooltip === undefined ? spec : step.tooltip;
          if (d.chart === 'bars') /** @type {any} */ (chart).split(!!step.split);
          else /** @type {any} */ (chart).paint({ colour: !!step.colour, lit: step.mark || null, fade: 0.3 });
          pinned = step.demo ? (d.chart === 'bars' ? /** @type {any} */ (chart).find(step.demo) : /** @type {any} */ (chart).byId[step.demo]) : null;
          paintCard();
          boxes.forEach(function (b) {
            var on = step.strip === b.key, words = (step.stripText || {})[b.key] ?? (d.strip || {})[b.key] ?? '';
            set(b.rect, { stroke: on ? NU.red : NU.line, fill: on ? 'rgba(200,16,46,.16)' : 'rgba(255,255,255,.04)' });
            set(b.label, { fill: on ? NU.paper : NU.mist });
            b.words.textContent = words;
          });
        }
        if (!typing.length) { settle(); return; }
        typing.forEach(function (i) { lines[i].text.textContent = ''; });
        cancel = tween(Math.min(2600, total * 22), function (k) {
          var chars = Math.round(k * total);
          typing.forEach(function (i) {
            var src = lines[i].src, n = Math.max(0, Math.min(src.length, chars));
            if (n >= src.length) colour(lines[i].text, src); else lines[i].text.textContent = src.slice(0, n);
            chars -= src.length;
          });
          if (k >= 1) settle();
        }, function (t) { return t; });
      }
    };
  }
};
