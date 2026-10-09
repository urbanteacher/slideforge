/* The live figures' shared kit: SVG nodes, scales, easing, number formats and
 * the tooltip card. Every figure draws at the slide's true 1280x720 (the
 * renderer scales the whole slide), so the numbers here are slide pixels.
 *
 * The tooltip card copies vega-tooltip's default look (white card, grey
 * keys right-aligned, values left), so what students see on the wall is what
 * Altair shows them in Jupyter. It is drawn in plain SVG, never
 * foreignObject: a still of a figure is an SVG picture, and the Lesson
 * studio's renderer refuses pictures with HTML inside.
 */

export var NS = 'http://www.w3.org/2000/svg';
export var W = 1280, H = 720;
/** Where the split ground's page ends: right edge and foot. */
export var SPLIT = { x: 640, y: 548 };

/** The deck's colours: Northeastern navy, red and warm white. Anything else on a figure is data. */
export var NU = {
  red: '#c8102e', navy: '#0c3354', deep: '#071f35', stage: '#06192c', paper: '#fbfaf8',
  ink: '#14181f', dim: '#5a6572', mist: '#9fb3c8', line: 'rgba(255,255,255,.14)',
  serif: "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif",
  sans: "'Avenir Next', Avenir, 'Segoe UI', Arial, sans-serif",
  mono: "'JetBrains Mono', 'SF Mono', Menlo, Consolas, monospace"
};

/**
 * @param {string} tag
 * @param {Record<string, any>} [attrs]
 * @param {Element} [parent]
 * @param {string} [text]
 * @returns {any}
 */
export function el(tag, attrs, parent, text) {
  var n = document.createElementNS(NS, tag);
  Object.keys(attrs || {}).forEach(function (k) { if (attrs && attrs[k] != null) n.setAttribute(k, String(attrs[k])); });
  if (text != null) n.textContent = text;
  if (parent) parent.appendChild(n);
  return n;
}

/** @param {Element} node @param {Record<string, any>} attrs */
export function set(node, attrs) {
  Object.keys(attrs).forEach(function (k) { if (attrs[k] == null) node.removeAttribute(k); else node.setAttribute(k, String(attrs[k])); });
  return node;
}

/** A linear or log scale from a domain to a range. */
export function scale(domain, range, log) {
  var f = log ? Math.log : function (/** @type {number} */ v) { return v; };
  var d0 = f(domain[0]), d1 = f(domain[1]);
  /** @param {number} v */
  var s = function (v) { return range[0] + (f(v) - d0) / (d1 - d0) * (range[1] - range[0]); };
  return s;
}

export var ease = {
  /** @param {number} t */ inOut: function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
  /** @param {number} t */ out: function (t) { return 1 - Math.pow(1 - t, 3); }
};
/** @param {number} a @param {number} b @param {number} t */
export function lerp(a, b, t) { return a + (b - a) * t; }

/** True when the room has asked for less motion: a figure then jumps to where it is going. */
export function reduced() {
  try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
}

/**
 * Run `frame(k)` from 0 to 1 over `ms`, eased; returns a cancel function. With
 * reduced motion, or no animation frames (a still), it calls frame(1) at once.
 * @param {number} ms @param {(k: number) => void} frame @param {(t: number) => number} [curve]
 */
export function tween(ms, frame, curve) {
  if (ms <= 0 || reduced() || typeof requestAnimationFrame !== 'function') { frame(1); return function () {}; }
  var start = 0, id = 0, done = false, c = curve || ease.inOut;
  /** @param {number} now */
  function tick(now) {
    if (done) return;
    if (!start) start = now;
    var k = Math.min(1, (now - start) / ms);
    frame(c(k));
    if (k < 1) id = requestAnimationFrame(tick); else done = true;
  }
  id = requestAnimationFrame(tick);
  return function () { done = true; cancelAnimationFrame(id); };
}

/* ------------------------------------------------------------ formats */

/** d3-format's handful the lecture uses: ',d' ',.0f' '.1f' '.1%' '$,.0f' and '.3s'. */
export function format(spec, v) {
  if (v == null || !isFinite(v)) return 'n/a';
  var money = spec.charAt(0) === '$', s = money ? spec.slice(1) : spec;
  var comma = s.indexOf(',') >= 0, m = s.match(/\.(\d+)([f%s])?/) || [], dp = m[1] ? Number(m[1]) : 0, kind = m[2] || (s.slice(-1) === 'd' ? 'd' : 'f');
  var out;
  if (kind === '%') out = (v * 100).toFixed(dp) + '%';
  else if (kind === 's') {
    var units = [[1e12, 'T'], [1e9, 'G'], [1e6, 'M'], [1e3, 'k']], u = units.find(function (x) { return Math.abs(v) >= /** @type {number} */ (x[0]); });
    out = u ? (v / /** @type {number} */ (u[0])).toPrecision(dp || 3).replace(/\.0+$/, '') + u[1] : String(Math.round(v));
  } else {
    out = kind === 'd' ? String(Math.round(v)) : v.toFixed(dp);
    if (comma) { var parts = out.split('.'); parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ','); out = parts.join('.'); }
  }
  return (money ? '$' : '') + out;
}

/* ------------------------------------------------------------ the tooltip card */

/**
 * vega-tooltip's card, at projector size, with its corner at (x, y) and kept
 * on the stage. `rows` are [key, value] pairs, as Altair's tooltip list makes
 * them: the title, then the formatted field.
 * @param {Element} parent @param {[string, string][]} rows @param {number} x @param {number} y
 * @param {{size?: number, avoid?: number, maxX?: number}} [o]  maxX: the card stays left of it
 */
export function tooltipCard(parent, rows, x, y, o) {
  var size = (o && o.size) || 19, pad = size * 0.55, lh = size * 1.45;
  var g = el('g', { class: 'fig-tooltip', 'pointer-events': 'none' }, parent);
  var keyW = 0, valW = 0;
  rows.forEach(function (r) { keyW = Math.max(keyW, textWidth(r[0], size, true)); valW = Math.max(valW, textWidth(r[1], size, false)); });
  var w = pad * 2 + keyW + size * 0.5 + valW, h = pad * 2 + lh * rows.length - (lh - size * 1.15);
  var gap = (o && o.avoid) || 16, maxX = (o && o.maxX) || W - 12;
  var left = x + gap, top = y + gap;
  if (left + w > maxX) left = x - gap - w;
  if (top + h > H - 12) top = y - gap - h;
  left = Math.max(12, left); top = Math.max(12, top);
  set(g, { transform: 'translate(' + left + ' ' + top + ')' });
  el('rect', { x: 3, y: 3, width: w, height: h, rx: 4, fill: 'rgba(0,0,0,.28)' }, g);
  el('rect', { width: w, height: h, rx: 4, fill: '#ffffff', stroke: '#d9d9d9', 'stroke-width': 1 }, g);
  rows.forEach(function (r, i) {
    var baseline = pad + size * 0.92 + i * lh;
    el('text', { x: pad + keyW, y: baseline, 'text-anchor': 'end', 'font-family': NU.sans, 'font-size': size, fill: '#808080' }, g, r[0]);
    el('text', { x: pad + keyW + size * 0.5, y: baseline, 'font-family': NU.sans, 'font-size': size, 'font-weight': 600, fill: '#14181f' }, g, r[1]);
  });
  return { node: g, x: left, y: top, w: w, h: h };
}

/** A width for text before it is drawn: Avenir-ish average advances, close enough to size a card. */
export function textWidth(text, size, light) {
  var w = 0;
  for (var i = 0; i < text.length; i++) {
    var c = text.charAt(i);
    w += /[ijl.,'|!:;]/.test(c) ? 0.28 : /[mwMW@%]/.test(c) ? 0.86 : /[A-Z0-9$]/.test(c) ? 0.64 : c === ' ' ? 0.3 : 0.53;
  }
  return w * size * (light ? 1 : 1.04);
}

/* ------------------------------------------------------------ stage furniture */

/**
 * The stage every figure stands on: a full-bleed ground, an eyebrow, a title,
 * a caption for the step and step pips. Returns the parts a figure fills in.
 * @param {Element} svg @param {{ground?: string, eyebrow?: string, title?: string, credit?: string}} o
 */
export function stage(svg, o) {
  var ground = o.ground || 'stage', dark = ground !== 'paper', split = ground === 'split';
  var ink = dark ? NU.paper : NU.ink, soft = dark ? NU.mist : NU.dim;
  el('rect', { width: W, height: H, fill: dark ? NU.stage : NU.paper }, svg);
  if (dark) {
    var defs = el('defs', {}, svg), glow = el('radialGradient', { id: 'fig-glow', cx: '50%', cy: '42%', r: '70%' }, defs);
    el('stop', { offset: '0', 'stop-color': '#0f3156', 'stop-opacity': 0.9 }, glow);
    el('stop', { offset: '1', 'stop-color': NU.stage, 'stop-opacity': 0 }, glow);
    el('rect', { width: W, height: H, fill: 'url(#fig-glow)' }, svg);
  }
  /* Split: the page (warm white, for code and words) on the left, the stage on the right. */
  if (split) el('rect', { width: SPLIT.x, height: SPLIT.y, fill: NU.paper }, svg);
  if (o.eyebrow) el('text', { x: 64, y: 58, 'font-family': NU.sans, 'font-size': 15, 'font-weight': 700, 'letter-spacing': 2.6, fill: NU.red }, svg, o.eyebrow.toUpperCase());
  var title = o.title ? el('text', { x: 64, y: 100, 'font-family': NU.serif, 'font-size': split ? 32 : 38, fill: split ? NU.ink : ink }, svg, o.title) : null;
  var caption = el('text', { x: 64, y: H - 34, 'font-family': NU.sans, 'font-size': 22, fill: ink, class: 'fig-caption' }, svg);
  var pips = el('g', { transform: 'translate(' + (W - 64) + ' ' + (H - 41) + ')' }, svg);
  if (o.credit) el('text', { x: W - 64, y: 58, 'text-anchor': 'end', 'font-family': NU.sans, 'font-size': 13, fill: soft }, svg, o.credit);
  return {
    ink: ink, soft: soft, dark: dark, title: title,
    /** @param {string} text */
    caption: function (text) { caption.textContent = text || ''; },
    /** @param {number} at @param {number} of */
    pips: function (at, of) {
      pips.textContent = '';
      if (of < 2) return;
      for (var i = 0; i < of; i++) el('circle', { cx: -(of - 1 - i) * 18, cy: 0, r: i === at ? 5 : 3.5, fill: i === at ? NU.red : soft, opacity: i === at ? 1 : 0.55 }, pips);
    }
  };
}
