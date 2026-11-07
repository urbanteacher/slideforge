/* One chart, told: the author's moves on a line chart, one per step, then the chart opened to the reader.
 * Made for IPDV Week 9 (docs/ipdv-week9-plan.md): the same London NO2 data goes from a bare line to a
 * headline, notes and a highlight (author-driven), then every monitor appears and the hover card wakes up
 * (reader-driven). Lead first, then let go: a martini glass on one slide. Its first use is the hook, a
 * guess before the line is drawn.
 *
 * figureData:
 *   years    [2010, …, 2025]
 *   series   [{ id, name, borough, type, v: { [year]: value } }]   one line each
 *   hero     the id of the line the author tells (drawn red)
 *   yMax     the top of the y axis          unit   the y axis' words ('NO₂ (µg/m³)')
 *   refs     [{ y, text }]  reference lines (a legal limit, a guideline)
 *   notes    [{ year, text, at }]  annotations: a rule at the year, words ending at it, `at` high
 *   types    { [type]: colour }  the colours when the lines are coloured by type
 *   plot     { x0, x1, y0, y1 }  where the chart sits (default: the left part, beside a story panel)
 *   key      [{ mark, colour, text }]  a how-to-read-it key (kit.js keyRow), in the story column when there is one;
 *            with keyOnChart, a row along the chart's top edge instead, to save room
 *   heroLabel  the hero line's name, written on the chart beside the line's start
 * Each step may set:
 *   caption, explain
 *   upto       the last year of the hero line (it draws itself to there); 0 for none
 *   headline   the author's title above the chart, and sub, a line under it
 *   refs       how many reference lines show          notes   how many notes show
 *   others     'none' | 'grey' | 'type': the other lines, absent, grey, or coloured by their type
 *   hover      true: point at a line and it lights with its tooltip card, as Altair's tooltip does
 *   lit        { id, year }: a line lit with its card, as if pointed at (a still shows it)
 *   bands      [{ from, to, text }]: answer ranges to vote on, drawn from the year `bandsFrom` to the end;
 *              bandAnswer (an index) lights the right one and fades the rest
 *   reveal     { year, text }: the hero's value at that year, called out large
 */
import { NU, W, H, el, set, tween, tooltipCard, keyRow, textWidth } from './kit.js';

var GREY = '#cfd5dc';

export var story = {
  /** @param {any} fig */
  mount: function (fig) {
    var d = fig.data, svg = fig.svg, st = fig.stage, years = d.years || [], series = d.series || [];
    /* With the question on top (figureCaptionTop) the chart starts lower and runs to the foot. */
    var P = d.plot || { x0: 120, x1: fig.story ? fig.story.x - 60 : W - 90, y0: fig.captionTop ? 262 : 214, y1: fig.captionTop ? 636 : 600 };
    var yMax = d.yMax || 100, first = years[0], last = years[years.length - 1];
    var x = function (/** @type {number} */ yr) { return P.x0 + (yr - first) / (last - first) * (P.x1 - P.x0); };
    var y = function (/** @type {number} */ v) { return P.y1 - v / yMax * (P.y1 - P.y0); };
    var hero = series.find(function (/** @type {any} */ s) { return s.id === d.hero; });
    var ink = st.ink, soft = st.soft;

    /* axes: a light grid every 20, the years beneath */
    var axes = el('g', {}, svg);
    for (var v = 0; v <= yMax; v += yMax > 120 ? 40 : 20) {
      el('line', { x1: P.x0, x2: P.x1, y1: y(v), y2: y(v), stroke: v === 0 ? '#9aa3ad' : '#e6e2da', 'stroke-width': v === 0 ? 1.5 : 1 }, axes);
      el('text', { x: P.x0 - 12, y: y(v) + 5, 'text-anchor': 'end', 'font-family': NU.sans, 'font-size': 15, fill: soft }, axes, String(v));
    }
    years.forEach(function (/** @type {number} */ yr, /** @type {number} */ i) {
      if (years.length > 10 && i % 3 && yr !== last) return;
      el('text', { x: x(yr), y: P.y1 + 26, 'text-anchor': 'middle', 'font-family': NU.sans, 'font-size': 15, fill: soft }, axes, String(yr));
    });
    if (d.unit) el('text', { x: P.x0 - 12, y: P.y0 - 14, 'text-anchor': 'end', 'font-family': NU.sans, 'font-size': 14, 'font-weight': 600, fill: soft }, axes, d.unit);

    /* drawn in this order: answer bands, the other lines, then reference lines and notes over them */
    var bandsG = el('g', {}, svg), othersG = el('g', {}, svg), refsG = el('g', {}, svg), notesG = el('g', {}, svg);
    var heroG = el('g', {}, svg), headG = el('g', {}, svg), cardG = el('g', {}, svg), keyG = el('g', {}, svg);
    if (d.key && d.keyOnChart) {
      /* the key along the chart's top edge, right-aligned, on the row the axis label starts */
      var kx = P.x1;
      d.key.slice().reverse().forEach(function (/** @type {any} */ it) {
        var tw = textWidth(it.text, 15, true);
        el('text', { x: kx, y: P.y0 - 10, 'text-anchor': 'end', 'font-family': NU.sans, 'font-size': 15, fill: ink }, keyG, it.text);
        el('line', { x1: kx - tw - 30, x2: kx - tw - 8, y1: P.y0 - 15, y2: P.y0 - 15, stroke: it.colour || NU.navy, 'stroke-width': 4, 'stroke-linecap': 'round' }, keyG);
        kx -= tw + 50;
      });
    } else keyRow(keyG, d.key, st, fig.story);
    var heroName = d.heroLabel && hero ? el('text', { x: x(first) + 4, y: y(hero.v[first]) - 14, 'font-family': NU.sans, 'font-size': 16, 'font-weight': 700, fill: NU.red, stroke: NU.paper, 'stroke-width': 5, 'paint-order': 'stroke', opacity: 0 }, svg, d.heroLabel) : null;

    /** The path of a line, up to a (fractional) year. @param {any} s @param {number} upto */
    function pathOf(s, upto) {
      var pts = [];
      for (var i = 0; i < years.length; i++) {
        var yr = years[i], val = s.v[yr];
        if (val == null) continue;
        if (yr <= upto) { pts.push([x(yr), y(val)]); continue; }
        /* the part-way point to the next year, so a line draws itself smoothly */
        var prev = pts.length ? pts[pts.length - 1] : null, k = upto - years[i - 1];
        if (prev && k > 0 && s.v[years[i - 1]] != null) pts.push([prev[0] + (x(yr) - prev[0]) * k, prev[1] + (y(val) - prev[1]) * k]);
        break;
      }
      return pts.length ? 'M' + pts.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' L') : '';
    }

    /* the other lines, drawn once; a step only restyles them */
    var others = series.filter(function (/** @type {any} */ s) { return s !== hero; }).map(function (/** @type {any} */ s) {
      return { s: s, node: el('path', { d: pathOf(s, last), fill: 'none', stroke: GREY, 'stroke-width': 1.6, 'stroke-linejoin': 'round', opacity: 0 }, othersG) };
    });
    var heroPath = el('path', { fill: 'none', stroke: NU.red, 'stroke-width': 5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, heroG);
    var heroDot = el('circle', { r: 7, fill: NU.red, stroke: '#fff', 'stroke-width': 2.5, opacity: 0 }, heroG);
    var heroVal = el('text', { 'font-family': NU.sans, 'font-size': 22, 'font-weight': 700, fill: NU.red, stroke: NU.paper, 'stroke-width': 5, 'paint-order': 'stroke', opacity: 0 }, heroG);
    var shownUpto = 0, mode = 'none', cancel = function () {}, step = /** @type {any} */ ({});
    var litLine = /** @type {any} */ (null);

    function styleOthers(/** @type {string} */ m, /** @type {number} */ k, /** @type {string} */ from) {
      others.forEach(function (o) {
        var to = m === 'none' ? 0 : m === 'type' ? 0.8 : 1, was = from === 'none' ? 0 : from === 'type' ? 0.8 : 1;
        set(o.node, { opacity: was + (to - was) * k, stroke: m === 'type' ? ((d.types || {})[o.s.type] || GREY) : GREY, 'stroke-width': m === 'type' ? 2 : 1.6 });
      });
    }

    /** Light one line (or none) and give it Altair's card at a year. @param {any} s @param {number} yr @param {number} [px] @param {number} [py] */
    function light(s, yr, px, py) {
      cardG.textContent = '';
      if (litLine) { litLine.node.parentNode && othersG.insertBefore(litLine.node, othersG.firstChild); styleOthers(mode, 1, mode); }
      litLine = null;
      if (!s) return;
      var o = others.find(function (/** @type {any} */ q) { return q.s === s; });
      if (o) { litLine = o; set(o.node, { stroke: NU.navy, 'stroke-width': 4, opacity: 1 }); othersG.appendChild(o.node); }
      var val = s.v[yr];
      if (val == null) return;
      var cx = px == null ? x(yr) : px, cy = py == null ? y(val) : py;
      el('circle', { cx: x(yr), cy: y(val), r: 6, fill: o ? NU.navy : NU.red, stroke: '#fff', 'stroke-width': 2 }, cardG);
      tooltipCard(cardG, [['site', s.name], ['borough', s.borough], ['type', s.type], ['year', String(yr)], ['no2', String(val)]], cx, cy,
        { size: 17, maxX: fig.story ? fig.story.x - 12 : W - 12, minY: 130, blocks: [[0, H - 80, W, H], [cx - 8, cy - 8, cx + 8, cy + 8]] });
    }

    if (fig.interactive) {
      svg.addEventListener('pointermove', function (/** @type {PointerEvent} */ e) {
        if (!step.hover) return;
        var p = fig.toSlide(e);
        if (p.x < P.x0 - 10 || p.x > P.x1 + 10 || p.y < P.y0 - 20 || p.y > P.y1 + 10) { light(step.lit ? series.find(function (/** @type {any} */ s) { return s.id === step.lit.id; }) : null, step.lit ? step.lit.year : 0); return; }
        var yr = Math.round(first + (p.x - P.x0) / (P.x1 - P.x0) * (last - first)), best = null, dist = 26;
        series.forEach(function (/** @type {any} */ s) {
          if (s !== hero && mode === 'none') return;
          if (s === hero && !((step.upto == null ? last : step.upto) >= first)) return;
          var val = s.v[yr];
          if (val == null) return;
          var dd = Math.abs(y(val) - p.y);
          if (dd < dist) { dist = dd; best = s; }
        });
        light(best, yr);
      });
      svg.addEventListener('pointerleave', function () { if (step.hover) light(null, 0); });
    }

    return {
      /** @param {any} next @param {boolean} animate */
      update: function (next, animate) {
        step = next;
        st.caption(next.caption);
        cancel();
        /* reference lines and notes: shown up to their counts */
        refsG.textContent = '';
        (d.refs || []).slice(0, next.refs || 0).forEach(function (/** @type {any} */ r, /** @type {number} */ i) {
          el('line', { x1: P.x0, x2: P.x1, y1: y(r.y), y2: y(r.y), stroke: i ? '#54a24b' : NU.navy, 'stroke-width': 2.5, 'stroke-dasharray': i ? '3 5' : '9 6' }, refsG);
          el('text', { x: P.x0 + 8, y: y(r.y) - 9, 'font-family': NU.sans, 'font-size': 16, 'font-weight': 700, fill: i ? '#3b7a35' : NU.navy, stroke: NU.paper, 'stroke-width': 5, 'paint-order': 'stroke' }, refsG, r.text);
        });
        notesG.textContent = '';
        (d.notes || []).slice(0, next.notes || 0).forEach(function (/** @type {any} */ n) {
          el('line', { x1: x(n.year), x2: x(n.year), y1: P.y0, y2: P.y1, stroke: '#8a96a3', 'stroke-width': 1.5 }, notesG);
          el('text', { x: x(n.year) - 8, y: y(n.at), 'text-anchor': 'end', 'font-family': NU.sans, 'font-size': 17, 'font-weight': 600, fill: ink, stroke: NU.paper, 'stroke-width': 5, 'paint-order': 'stroke' }, notesG, n.text);
        });
        /* answer ranges to vote on, over the years still to come */
        bandsG.textContent = '';
        if (next.bands) {
          var bx = x(next.bandsFrom || Math.min(last, (next.upto || first) + 1)) - 8;
          /* bandAnswer: the right band lit, the others faded, so the line reads over them */
          var ans = next.bandAnswer;
          next.bands.forEach(function (/** @type {any} */ b, /** @type {number} */ i) {
            var right = ans === i, faded = ans != null && !right;
            var g = el('g', { opacity: faded ? 0.28 : 1 }, bandsG);
            el('rect', { x: bx, y: y(b.to), width: P.x1 - bx, height: y(b.from) - y(b.to) - 3, rx: 6, fill: right ? '#fbe5e8' : i % 2 ? '#eef1f5' : '#e3e8ef', stroke: right ? NU.red : 'none', 'stroke-width': 2 }, g);
            el('text', { x: bx + 18, y: (y(b.to) + y(b.from)) / 2 + 9, 'font-family': NU.sans, 'font-size': 26, 'font-weight': 700, fill: right ? NU.red : NU.navy }, g, right ? b.text + '  ✓' : b.text);
          });
        }
        /* the author's headline */
        headG.textContent = '';
        if (next.headline) {
          el('text', { x: P.x0 - 40, y: P.y0 - 58, 'font-family': NU.sans, 'font-size': 25, 'font-weight': 700, fill: ink }, headG, next.headline);
          if (next.sub) el('text', { x: P.x0 - 40, y: P.y0 - 32, 'font-family': NU.sans, 'font-size': 17, fill: soft }, headG, next.sub);
        }
        /* the hero line draws itself to its year; the other lines fade to their mode */
        var to = next.upto == null ? last : next.upto, from = animate ? shownUpto : to, was = animate ? mode : next.others || 'none';
        var newMode = next.others || 'none';
        litLine = null; cardG.textContent = '';
        cancel = tween(animate ? Math.max(500, Math.abs(to - from) * 260) : 0, function (/** @type {number} */ k) {
          var at = from + (to - from) * k;
          set(heroPath, { d: hero && at >= first ? pathOf(hero, at) : '' });
          styleOthers(newMode, k, was);
          if (k >= 1 && hero && to >= first) {
            var lastYr = years.filter(function (/** @type {number} */ yr) { return yr <= to && hero.v[yr] != null; }).pop();
            set(heroDot, { cx: x(lastYr), cy: y(hero.v[lastYr]), opacity: 1 });
            var big = next.reveal && next.reveal.year === lastYr;
            heroVal.textContent = big ? next.reveal.text : String(hero.v[lastYr]);
            set(heroVal, { x: x(lastYr) + (big ? -16 : 0), y: y(hero.v[lastYr]) + (big ? 46 : 28), 'text-anchor': big ? 'end' : 'middle', 'font-size': big ? 34 : 22, opacity: next.lit ? 0 : 1 }); /* a lit road is the reader's: the hero's number steps back */
          } else { set(heroDot, { opacity: 0 }); set(heroVal, { opacity: 0 }); }
          /* a line lit as if pointed at, once the lines have settled */
          if (k >= 1 && next.lit) light(series.find(function (/** @type {any} */ q) { return q.id === next.lit.id; }), next.lit.year);
        }, function (/** @type {number} */ t) { return t; });
        shownUpto = to; mode = newMode;
        /* a key on the chart names the other lines, so it shows only while they do */
        if (d.keyOnChart) set(keyG, { opacity: newMode === 'none' ? 0 : 1 });
        if (heroName) { set(heroName, { opacity: to > first ? 1 : 0 }); svg.appendChild(heroName); }
      },
      destroy: function () { cancel(); }
    };
  }
};
