/* Rosling in motion: 62 countries, 1955–2005, fertility against life
 * expectancy (his 2006 TED chart), played, scrubbed or set side by side.
 *
 * Its point is object constancy. With a key (Altair's key='country:N'),
 * each bubble is one country all the way through, so the eye can follow it.
 * Without one, Vega matches marks to rows by their order, and when the order
 * changes between frames the marks swap countries mid-flight: the red trail
 * that starts as the United Kingdom ends up somewhere else.
 *
 * figureData:
 *   series   [{ id, group, frames: { [year]: [x, y, size] } }]
 *   years    [1955, 1960, …]
 *   x, y, size, groups   as the bubbles figure takes them
 *   source
 * Each step may set:
 *   caption
 *   year          the year shown (default the first)
 *   play          { from, to, seconds }: plays from one year to the other
 *   tween         false: jump from frame to frame (no in-between), as a slider of years does
 *   panels        'pair': two charts side by side, no key (left) and key (right);
 *                 'frames-tweens': two charts on one clock, frames (left) and tweens (right).
 *                 A frames chart leaves its trail as dots, one per measured year, and a
 *                 tweened one as a line: the dots are data, the line between them is drawn
 *   trace         { from, to } with no play: the trails drawn whole, standing still
 *   label         true: the followed bubble carries its country's name, and the trail
 *                 its first year (and, standing still, its last)
 *   explain       [left lines, right lines] (or one list for one chart): a box in each
 *                 chart's empty top-right corner saying what that chart is doing
 *   measured      true: hollow rings on the followed country's measured years, so a tween
 *                 line is seen passing through the data it was drawn between
 *   dim           true: every other country fades back, leaving the followed one
 *   keyed         false: (one panel) marks matched by order, not by key
 *   trail         a series id followed by a red trail
 *   multiples     true: one small chart per year, all at once
 */
import { NU, W, H, el, set, scale, lerp, tween, format, textWidth } from './kit.js';

/** @param {Element} parent @param {any} d @param {{x0: number, x1: number, y0: number, y1: number}} rect @param {any} st @param {number} fs @param {boolean} labels */
function axes(parent, d, rect, st, fs, labels) {
  var sx = scale(d.x.domain, [rect.x0, rect.x1], d.x.log), sy = scale(d.y.domain, [rect.y1, rect.y0], d.y.log);
  var g = el('g', { 'font-family': NU.sans, 'font-size': fs, fill: st.soft }, parent);
  (d.x.ticks || []).forEach(function (/** @type {number} */ t) {
    el('line', { x1: sx(t), x2: sx(t), y1: rect.y0, y2: rect.y1, stroke: NU.line }, g);
    if (labels) el('text', { x: sx(t), y: rect.y1 + fs * 1.6, 'text-anchor': 'middle' }, g, format(d.x.format || 'd', t));
  });
  (d.y.ticks || []).forEach(function (/** @type {number} */ t) {
    el('line', { x1: rect.x0, x2: rect.x1, y1: sy(t), y2: sy(t), stroke: NU.line }, g);
    if (labels) el('text', { x: rect.x0 - fs * 0.8, y: sy(t) + fs * 0.33, 'text-anchor': 'end' }, g, format(d.y.format || 'd', t));
  });
  if (labels) {
    el('text', { x: rect.x1, y: rect.y1 + fs * 3.3, 'text-anchor': 'end', 'font-size': fs + 1, fill: st.ink }, g, d.x.title || '');
    el('text', { x: rect.x0 - fs * 2.6, y: rect.y0 - fs, 'font-size': fs + 1, fill: st.ink }, g, d.y.title || '');
  }
  return { sx: sx, sy: sy };
}

/** One chart of the series in `rect`: marks, a trail and the year behind them.
 * @param {Element} parent @param {any} d @param {any} rect @param {any} st @param {{keyed: boolean, fs: number, labels: boolean, tag?: string, jump?: boolean}} o */
function panel(parent, d, rect, st, o) {
  var g = el('g', {}, parent);
  var yearText = el('text', { x: (rect.x0 + rect.x1) / 2, y: (rect.y0 + rect.y1) / 2 + (rect.y1 - rect.y0) * 0.16, 'text-anchor': 'middle', 'font-family': NU.sans, 'font-weight': 700, 'font-size': (rect.y1 - rect.y0) * 0.42, fill: st.ink, opacity: 0.07 }, g);
  var s = axes(g, d, rect, st, o.fs, o.labels);
  if (o.tag) el('text', { x: rect.x0, y: rect.y0 - o.fs * 2.4, 'font-family': NU.mono, 'font-size': o.fs + 3, fill: NU.paper }, g, o.tag);
  var sizeD = d.size.domain, sizeR = d.size.range, k = (rect.x1 - rect.x0) / (W - 220);
  /** @param {number} v */
  function radius(v) { return lerp(sizeR[0], sizeR[1], Math.sqrt(Math.max(0, v - sizeD[0]) / (sizeD[1] - sizeD[0]))) * Math.max(0.45, k); }
  /* Frames leave dots (a zero-length stroke with a round cap is a dot), tweens a line. */
  var trail = el('path', { fill: 'none', stroke: NU.red, 'stroke-width': o.jump ? 11 : 3.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0.9 }, g);
  var ringsG = el('g', { 'pointer-events': 'none' }, g);
  var marksG = el('g', {}, g);
  var labelsG = el('g', { 'font-family': NU.sans, 'font-size': o.fs + 3, 'font-weight': 600, fill: NU.paper, 'pointer-events': 'none' }, g);
  var nameText = el('text', { 'paint-order': 'stroke', stroke: NU.stage, 'stroke-width': 4 }, labelsG);
  var firstText = el('text', { 'text-anchor': 'middle', 'font-weight': 400, 'font-size': o.fs + 1, 'paint-order': 'stroke', stroke: NU.stage, 'stroke-width': 4 }, labelsG);
  var lastText = el('text', { 'text-anchor': 'end', 'font-weight': 400, 'font-size': o.fs + 1, 'paint-order': 'stroke', stroke: NU.stage, 'stroke-width': 4 }, labelsG);
  var boxG = el('g', { 'pointer-events': 'none' }, g);
  var view = { label: false, ends: false, dim: false };
  /* One mark per slot. Keyed, slot i is always series i. Unkeyed, slot i takes whichever
     series is i-th in that year's order, as Vega does when nothing says who is who. */
  var marks = d.series.map(function () { return el('circle', { r: 0, 'fill-opacity': 0.8, stroke: NU.stage, 'stroke-width': 1 }, marksG); });
  /* The rows as they arrive each year: sorted by population, largest first, as a query might
     return them. As Bangladesh, Pakistan and Nigeria grow past the UK, the order changes. */
  var orders = /** @type {Record<string, number[]>} */ ({});
  d.years.forEach(function (/** @type {number} */ y) {
    orders[y] = d.series.map(function (/** @type {any} */ _, /** @type {number} */ i) { return i; })
      .sort(function (a, b) { return d.series[b].frames[y][2] - d.series[a].frames[y][2]; });
  });
  /** Where slot i sits at a (fractional) year, and which country it shows. @param {number} i @param {number} t */
  function at(i, t) {
    var ys = d.years, j = Math.max(0, Math.min(ys.length - 2, Math.floor((t - ys[0]) / (ys[1] - ys[0])))), k2 = Math.max(0, Math.min(1, (t - ys[j]) / (ys[j + 1] - ys[j])));
    var sa = o.keyed ? i : orders[ys[j]][i], sb = o.keyed ? i : orders[ys[j + 1]][i];
    var fa = d.series[sa].frames[ys[j]], fb = d.series[sb].frames[ys[j + 1]];
    return { x: s.sx(lerp(fa[0], fb[0], k2)), y: s.sy(lerp(fa[1], fb[1], k2)), r: radius(lerp(fa[2], fb[2], k2)), series: k2 < 0.5 ? sa : sb };
  }
  var trailId = -1, trailPts = /** @type {number[][]} */ ([]);
  return {
    /** @param {number} t @param {boolean} reset */
    show: function (t, reset) {
      yearText.textContent = String(Math.round(t));
      if (reset) trailPts = [];
      var here = /** @type {any} */ (null);
      d.series.forEach(function (/** @type {any} */ _, /** @type {number} */ i) {
        var p = at(i, t), ser = d.series[p.series], grp = d.groups[ser.group];
        var followed = i === trailId;
        if (followed) here = p;
        set(marks[i], { cx: p.x, cy: p.y, r: followed ? Math.max(9, p.r) : p.r, fill: followed ? NU.red : grp ? grp.color : '#8796a8', stroke: followed ? NU.paper : NU.stage, 'stroke-width': followed ? 2.5 : 1, opacity: followed || !view.dim ? 1 : 0.18 });
        var last = trailPts[trailPts.length - 1];
        if (i === trailId && !(last && last[0] === p.x && last[1] === p.y)) trailPts.push([p.x, p.y]);
      });
      var pts = trailPts.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); });
      set(trail, { d: o.jump ? pts.map(function (p) { return 'M' + p + 'h0'; }).join('') : pts.length > 1 ? 'M' + pts.join('L') : '' });
      /* The name rides with the bubble; the years sit at the trail's two ends. */
      var on = view.label && here;
      set(nameText, { x: on ? here.x + Math.max(9, here.r) + 8 : 0, y: on ? here.y - Math.max(9, here.r) - 2 : 0, opacity: on ? 1 : 0 });
      nameText.textContent = on ? d.series[here.series].id : '';
      var a = trailPts[0], z = trailPts[trailPts.length - 1];
      set(firstText, { x: a ? a[0] : 0, y: a ? a[1] + o.fs * 2 + 4 : 0, opacity: view.label && a ? 1 : 0 });
      firstText.textContent = String(d.years[0]);
      set(lastText, { x: z ? z[0] - 16 : 0, y: z ? z[1] + o.fs * 2 + 6 : 0, opacity: view.label && view.ends && z && trailPts.length > 1 ? 1 : 0 });
      lastText.textContent = String(d.years[d.years.length - 1]);
    },
    /** What this chart is doing, in a box in its empty top-right corner. @param {string[]|null} lines */
    explain: function (lines) {
      boxG.textContent = '';
      if (!lines || !lines.length) return;
      var size = o.fs + 2, lh = size * 1.4, pad = size * 0.8;
      var w = pad * 2 + Math.max.apply(null, lines.map(function (l, n) { return textWidth(l, n ? size : size + 1, n > 0); }));
      var h = pad * 2 + lh * lines.length - (lh - size);
      var x = rect.x1 - w - 6, y = rect.y0 + 6;
      el('rect', { x: x, y: y, width: w, height: h, rx: 6, fill: NU.deep, 'fill-opacity': 0.92, stroke: NU.mist, 'stroke-opacity': 0.5 }, boxG);
      lines.forEach(function (l, n) {
        el('text', { x: x + pad, y: y + pad + size * 0.85 + n * lh, 'font-family': NU.sans, 'font-size': n ? size : size + 1, 'font-weight': n ? 400 : 700, fill: n ? NU.paper : NU.red }, boxG, l);
      });
    },
    /** @param {{label?: boolean, ends?: boolean, dim?: boolean, measured?: boolean}} v */
    setView: function (v) {
      view.label = !!v.label; view.ends = !!v.ends; view.dim = !!v.dim;
      ringsG.textContent = '';
      /* A frames chart's dots already are the measured years; the rings go on a tween's line. */
      if (v.measured && trailId >= 0 && o.keyed && !o.jump) {
        var ser = d.series[trailId];
        d.years.forEach(function (/** @type {number} */ y) {
          var f = ser.frames[y];
          el('circle', { cx: s.sx(f[0]), cy: s.sy(f[1]), r: 6.5, fill: NU.stage, stroke: NU.paper, 'stroke-width': 2 }, ringsG);
        });
        g.insertBefore(ringsG, labelsG);
      } else g.insertBefore(ringsG, marksG);
    },
    jump: !!o.jump,
    /** @param {string|null} id */
    follow: function (id) {
      var i = d.series.findIndex(function (/** @type {any} */ x) { return x.id === id; });
      trailId = i < 0 ? -1 : o.keyed ? i : orders[d.years[0]].indexOf(i);
      if (trailId >= 0) marksG.appendChild(marks[trailId]);
    },
    node: g
  };
}

export var motion = {
  /** @param {any} fig */
  mount: function (fig) {
    var d = fig.data, svg = fig.svg, st = fig.stage;
    var root = el('g', {}, svg);
    if (d.source) el('text', { x: 64, y: H - 76, 'font-family': NU.sans, 'font-size': 13, fill: st.soft }, svg, d.source);
    var panels = /** @type {any[]} */ ([]), layout = '', cancel = function () {}, now = d.years[0];

    /** @param {any} step */
    function build(step) {
      var want = step.multiples ? 'multiples' : step.panels === 'pair' || step.panels === 'frames-tweens' ? step.panels : step.keyed === false ? 'one-unkeyed' : 'one';
      if (want === layout) return;
      layout = want; root.textContent = ''; panels = [];
      if (want === 'frames-tweens') {
        panels.push(panel(root, d, { x0: 120, x1: 600, y0: 190, y1: H - 160 }, st, { keyed: true, fs: 13, labels: true, jump: true, tag: 'frames: one picture per 5 years' }));
        panels.push(panel(root, d, { x0: 760, x1: W - 60, y0: 190, y1: H - 160 }, st, { keyed: true, fs: 13, labels: true, tag: 'tweens: the in-between drawn' }));
      } else if (want === 'pair') {
        panels.push(panel(root, d, { x0: 120, x1: 600, y0: 190, y1: H - 160 }, st, { keyed: false, fs: 13, labels: true, tag: "no key: marks follow row order" }));
        panels.push(panel(root, d, { x0: 760, x1: W - 60, y0: 190, y1: H - 160 }, st, { keyed: true, fs: 13, labels: true, tag: "key='country:N'" }));
      } else if (want === 'multiples') {
        var cols = 6, gw = (W - 140) / cols, gh = (H - 300) / 2;
        d.years.forEach(function (/** @type {number} */ y, /** @type {number} */ i) {
          var x0 = 90 + (i % cols) * gw, y0 = 170 + Math.floor(i / cols) * (gh + 20);
          var p = panel(root, d, { x0: x0 + 10, x1: x0 + gw - 14, y0: y0, y1: y0 + gh - 10 }, st, { keyed: true, fs: 10, labels: false });
          p.show(y, true); p.__year = y;
          panels.push(p);
        });
      } else panels.push(panel(root, d, { x0: 150, x1: W - 90, y0: 160, y1: H - 140 }, st, { keyed: want === 'one', fs: 15, labels: true }));
    }

    return {
      /** @param {any} step @param {boolean} animate */
      update: function (step, animate) {
        cancel();
        st.caption(step.caption);
        build(step);
        if (layout === 'multiples') {
          panels.forEach(function (p) { p.follow(step.trail || null); p.show(p.__year, true); });
          return;
        }
        panels.forEach(function (p, n) {
          p.follow(step.trail || null);
          if (p.setView) p.setView({ label: step.label, ends: !step.play, dim: step.dim, measured: step.measured });
          var ex = step.explain;
          if (p.explain) p.explain(ex ? (Array.isArray(ex[0]) ? ex[n] : n === 0 ? ex : null) : null);
        });
        var play = step.play, gap = d.years[1] - d.years[0];
        /* Frames: hold each year, then jump, as a slider of years does. */
        /** @param {any} p @param {number} t @param {number} from @param {number} to */
        function timeFor(p, t, from, to) { return p.jump || step.tween === false ? Math.min(to, from + Math.floor((t - from) / gap + 1e-9) * gap) : t; }
        if (!play && step.trace) {
          /* The whole journey at once, standing still: what each version leaves behind. */
          var a = step.trace.from, b = step.trace.to;
          panels.forEach(function (p) {
            for (var n = 0; n <= 100; n++) p.show(timeFor(p, a + (b - a) * n / 100, a, b), n === 0);
          });
          now = b;
          return;
        }
        if (!play) { now = step.year || d.years[0]; panels.forEach(function (p) { p.show(now, true); }); return; }
        var from = play.from, to = play.to;
        panels.forEach(function (p) { p.show(from, true); });
        var span = to - from;
        cancel = tween(animate && fig.interactive ? (play.seconds || 10) * 1000 : 0, function (k) {
          var t = from + span * k;
          now = t;
          panels.forEach(function (p) { p.show(timeFor(p, t, from, to), false); });
        }, function (t) { return t; });
      }
    };
  }
};
