/* Rosling's bubbles: a scatter of countries the room can hover, exactly as an
 * Altair chart with a tooltip behaves in Jupyter.
 *
 * figureData:
 *   rows     [{ id, name, x, y, size, group, …fields the tooltip reads }]
 *   x, y     { title, log?, domain: [lo, hi], ticks: [..], format }
 *   size     { domain: [lo, hi], range: [rMin, rMax] }   area-true: radius by square root
 *   groups   { key: { label, color } }
 *   tooltip  [{ field, title, format? }]                 Altair's tooltip list, in order
 *   source   the credit line
 * Each step may set:
 *   caption  what the step says
 *   colour   true: bubbles take their group colour (else grey)
 *   legend   true: the group legend shows
 *   point    a row id: a pointer glides to it and its tooltip opens, pinned
 *   clock    'run' (counts up from the slide's arrival) or 'stop' (shows the time it took)
 *   lit      a row id (or ids) drawn in red; the rest fade
 *   focus    { x: [lo, hi], y: [lo, hi] } zoom the chart to that window
 *   only     a group key: show only that group's bubbles
 */
import { NU, W, H, el, set, tween, ease, lerp } from './kit.js';
import { scatter, tooltipRows, cardAt } from './plots.js';

var PLOT = { x0: 130, x1: W - 90, y0: 160, y1: H - 140 };

/** The pointer the figures glide in: an arrow, drawn on the stage. @param {Element} parent */
export function pointer(parent) {
  return el('path', { d: 'M0 0 L0 30 L8 23 L13 35 L18 33 L13 21 L23 21 Z', fill: NU.paper, stroke: NU.ink, 'stroke-width': 1.5, opacity: 0, 'pointer-events': 'none' }, parent);
}

/** Group colours as a legend row. @param {Element} parent @param {any} groups @param {number} x @param {number} y @param {string} ink */
export function legendRow(parent, groups, x, y, ink) {
  var g = el('g', { 'font-family': NU.sans, 'font-size': 15, opacity: 0 }, parent);
  Object.keys(groups || {}).forEach(function (k, i) {
    var gx = x + (i % 3) * 230, gy = y + Math.floor(i / 3) * 26;
    el('circle', { cx: gx, cy: gy - 5, r: 7, fill: groups[k].color }, g);
    el('text', { x: gx + 14, y: gy, fill: ink }, g, groups[k].label);
  });
  return g;
}

export var bubbles = {
  /** @param {any} fig */
  mount: function (fig) {
    var d = fig.data, svg = fig.svg, st = fig.stage;
    var plot = scatter(svg, d, PLOT, { ink: st.ink, soft: st.soft });
    if (d.source) el('text', { x: 64, y: H - 76, 'font-family': NU.sans, 'font-size': 13, fill: st.soft }, svg, d.source);
    var legend = legendRow(svg, d.groups, PLOT.x0 + 10, PLOT.y0 + 10, st.ink);
    var clock = el('text', { x: W - 64, y: 100, 'text-anchor': 'end', 'font-family': NU.mono, 'font-size': 34, fill: NU.paper, opacity: 0 }, svg);
    var ring = el('circle', { r: 0, fill: 'none', stroke: NU.paper, 'stroke-width': 3, 'pointer-events': 'none', opacity: 0 }, svg);
    var cursor = pointer(svg);
    var cardLayer = el('g', { 'pointer-events': 'none' }, svg);

    var pinned = /** @type {any} */ (null), hovered = /** @type {any} */ (null);
    function paintCard() {
      var m = hovered || pinned;
      set(ring, { opacity: m ? 1 : 0, cx: m ? m.x : 0, cy: m ? m.y : 0, r: m ? m.r + 4 : 0 });
      cardAt(cardLayer, m, m ? tooltipRows(m.row, d.tooltip) : []);
    }
    if (fig.interactive) {
      svg.addEventListener('pointermove', function (/** @type {PointerEvent} */ e) {
        var best = plot.nearest(fig.toSlide(e));
        if (best !== hovered) { hovered = best; paintCard(); }
      });
      svg.addEventListener('pointerleave', function () { hovered = null; paintCard(); });
    }

    var started = Date.now(), timer = 0, stopped = 0, cancel = function () {}, zoomed = d.x.domain.join() + '|' + d.y.domain.join();
    function tick() {
      if (!clock.isConnected && started < Date.now() - 1000) { window.clearInterval(timer); timer = 0; return; }
      var s = Math.floor(((stopped || Date.now()) - started) / 1000);
      clock.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    }

    return {
      /** @param {any} step @param {boolean} animate */
      update: function (step, animate) {
        cancel();
        st.caption(step.caption);
        plot.paint({ colour: !!step.colour, lit: step.lit, fade: 0.4 });
        /* The mantra: zoom to a window of the chart, filter to a group. */
        var f = step.focus || {}, xd = f.x || d.x.domain, yd = f.y || d.y.domain, key = xd.join() + '|' + yd.join();
        if (key !== zoomed) { plot.rescale(xd, yd, animate); zoomed = key; }
        plot.filter(step.only ? function (/** @type {any} */ r) { return r.group === step.only; } : null);
        set(legend, { opacity: step.legend ? 1 : 0 });

        /* The clock: only on a live wall, never in a still. */
        if (step.clock === 'run' && fig.interactive) {
          stopped = 0; set(clock, { opacity: 1, fill: NU.paper }); tick();
          if (!timer) timer = window.setInterval(tick, 250);
        } else if (step.clock === 'stop' && fig.interactive) {
          if (!stopped) stopped = Date.now();
          window.clearInterval(timer); timer = 0; tick(); set(clock, { opacity: 1, fill: NU.red });
        } else { window.clearInterval(timer); timer = 0; set(clock, { opacity: 0 }); }

        var target = step.point && plot.byId[step.point];
        pinned = null; paintCard();
        if (!target) { set(cursor, { opacity: 0 }); return; }
        /* A pointer glides in from the corner, settles on the bubble, and the card opens. */
        var from = { x: W - 140, y: H - 110 }, to = { x: target.x + 2, y: target.y + 2 };
        cancel = tween(animate ? 1300 : 0, function (k) {
          set(cursor, { opacity: fig.interactive ? 1 : 0, transform: 'translate(' + lerp(from.x, to.x, k) + ' ' + lerp(from.y, to.y, k) + ')' });
          if (k >= 1) { pinned = target; paintCard(); }
        }, ease.inOut);
      },
      destroy: function () { cancel(); window.clearInterval(timer); }
    };
  }
};
