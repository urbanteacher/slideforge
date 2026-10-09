/* Live figures: the `figure` slide type.
 *
 * A figure is a purpose-built, full-bleed stage at the slide's true 1280x720,
 * drawn in SVG with real pointer events: the room can hover a bubble and read
 * its tooltip, drag a country, watch a chart move between states. It was made
 * for the IPDV Week 5 lecture (docs/ipdv-week5-plan.md §5A), where the slides
 * have to do what they teach, and no layout could.
 *
 *   { type: 'figure', figure: 'bubbles', figureData: {…}, figureSteps: [{caption, …}, …] }
 *
 * Steps are walked by Next and Previous through the same hook Explore uses
 * (src/render/explore.js delegates here), so Teacher Presenter and the
 * Lesson studio's show step them as they step an experiment. A still (a
 * thumbnail, a print, the student copy) shows the last step, without clocks
 * or pointers.
 *
 * The Lesson studio converts the slides it can build and plays the rest as
 * SlideForge's own (lab/src/embed.ts cannotBuild); a figure is one of the
 * rest, so it plays natively there too.
 *
 * Installed per page, before installExplore (index.html, presenter.html,
 * view.html), like the other teaching interactions.
 */
import { W, H, NS, stage as makeStage } from './kit.js';
import { bubbles } from './bubbles.js';
import { codechart } from './codechart.js';
import { worldmap } from './worldmap.js';
import { motion } from './motion.js';
import { linked } from './linked.js';
import { rowtable } from './rowtable.js';

/** @type {Record<string, {mount: (fig: any) => {update: (step: any, animate: boolean) => void, destroy?: () => void}}>} */
var FIGURES = { bubbles: bubbles, codechart: codechart, worldmap: worldmap, motion: motion, linked: linked, rowtable: rowtable };

var CSS = '.figure-slide .fig-svg{position:absolute;inset:0;width:100%;height:100%;z-index:60;display:block;user-select:none;-webkit-user-select:none;touch-action:none}' +
  '.figure-slide .pad{visibility:hidden}' +
  '.figure-slide .fig-svg text{font-kerning:normal}';

/** @param {any} SF */
export function installFigures(SF) {
  var styled = false;
  function style() {
    if (styled || typeof document === 'undefined') return;
    styled = true;
    var s = document.createElement('style');
    s.setAttribute('data-sf', 'figures');
    s.textContent = CSS;
    document.head.appendChild(s);
  }
  /** @param {any} slide */
  function active(slide) { return !!(slide && slide.type === 'figure'); }
  /** @param {any} slide */
  function steps(slide) { var s = Array.isArray(slide.figureSteps) ? slide.figureSteps.filter(function (/** @type {any} */ x) { return x && typeof x === 'object'; }) : []; return s.length ? s : [{}]; }
  /** @param {any} slide */
  function count(slide) { return steps(slide).length; }

  /** @param {any} root @param {HTMLElement} pad @param {any} slide @param {any} opts */
  function render(root, pad, slide, opts) {
    style();
    root.classList.add('figure-slide');
    var live = !!(opts.interactive || opts.exploreCommand);
    var list = steps(slide), last = list.length - 1;
    var at = opts.exploreState && Number.isInteger(opts.exploreState.figureStep) ? opts.exploreState.figureStep : live ? 0 : last;
    var svg = /** @type {SVGSVGElement} */ (document.createElementNS(NS, 'svg'));
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('class', 'fig-svg');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', String(slide.figureAlt || slide.title || 'Live figure'));
    root.appendChild(svg);
    /* A figure is somewhere to point, drag and click: a press on it is for the
       figure, never the player's "next". Next stays on the keys and clicker. */
    if (live) svg.addEventListener('click', function (e) { e.stopPropagation(); });
    var make = FIGURES[String(slide.figure || '')];
    if (!make) {
      var t = document.createElementNS(NS, 'text');
      t.setAttribute('x', '64'); t.setAttribute('y', '120'); t.textContent = 'Unknown figure: ' + String(slide.figure || '(none)');
      svg.appendChild(t);
      return;
    }
    var stage = makeStage(svg, { ground: slide.figureGround, eyebrow: slide.figureEyebrow, title: slide.title, credit: slide.figureCredit });
    var fig = {
      svg: svg, stage: stage, data: slide.figureData || {}, interactive: live,
      /** Where a pointer event lands, in slide pixels, whatever scale the slide is drawn at. */
      toSlide: function (/** @type {PointerEvent} */ e) {
        var m = svg.getScreenCTM(), p = svg.createSVGPoint();
        p.x = e.clientX; p.y = e.clientY;
        return m ? p.matrixTransform(m.inverse()) : { x: 0, y: 0 };
      },
      send: function (/** @type {string} */ action, /** @type {any} */ value) { if (opts.exploreCommand) opts.exploreCommand(action, value); }
    };
    /* A figure that fails says so on the slide; it never takes the show down with it. */
    /** @param {any} err */
    function failed(err) {
      var t = document.createElementNS(NS, 'text');
      t.setAttribute('x', '64'); t.setAttribute('y', '160'); t.setAttribute('fill', '#c8102e'); t.setAttribute('font-size', '22');
      t.textContent = 'This figure could not be drawn: ' + String(err && err.message || err);
      svg.appendChild(t);
      if (typeof console !== 'undefined') console.error(err);
    }
    var inst = null, shown = -1;
    try { inst = make.mount(fig); } catch (err) { failed(err); return; }
    /** @param {number} i @param {boolean} animate */
    function show(i, animate) {
      var k = Math.max(0, Math.min(last, i));
      stage.pips(k, list.length);
      try { if (inst) inst.update(Object.assign({ index: k }, list[k]), animate && k !== shown); } catch (err) { failed(err); }
      shown = k;
    }
    show(at, false);
    /* Chrome paints SVG text from the size it first laid it out at. The player
       lays a slide out at 1280x720, then scales it to the wall (and zooms it in
       on arrival), and text that has not changed since keeps its first, larger
       paint: titles and axis labels spill across the stage. Writing each text
       again once the slide has settled makes Chrome paint it at the wall's
       scale. Found presenting Week 5; nothing else in SlideForge draws SVG text
       live on a scaled slide. */
    if (live && typeof requestAnimationFrame === 'function') {
      var refresh = function () {
        if (!svg.isConnected) return;
        svg.querySelectorAll('text, tspan').forEach(function (t) {
          if (t.childNodes.length === 1 && t.firstChild && t.firstChild.nodeType === 3) { var v = t.textContent; t.textContent = ''; t.textContent = v; }
        });
      };
      requestAnimationFrame(function () { requestAnimationFrame(refresh); });
      setTimeout(refresh, 480);
      setTimeout(refresh, 1100);
      if (typeof ResizeObserver === 'function') new ResizeObserver(refresh).observe(root);
    }
    root._exploreRefresh = function (/** @type {any} */ next) {
      if (next && Number.isInteger(next.figureStep)) show(next.figureStep, true);
    };
  }

  SF.Figures = { active: active, count: count, steps: steps, render: render, kinds: Object.keys(FIGURES) };
}
