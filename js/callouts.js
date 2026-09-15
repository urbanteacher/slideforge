/* Chart callouts — "look at this bit now", as steps inside one slide.
 *
 * Teaching a chart is directing attention: the room is shown twelve years of
 * data and has to be told which two matter. Until now the options were to talk
 * over the whole chart and hope, or to paste four cropped screenshots as four
 * slides — which loses the thing that makes a chart a chart, that the detail is
 * part of the whole.
 *
 * So a chart slide can carry up to six callouts, each naming a CATEGORY from
 * its own table, and Next walks them: the chart zooms and pans to that band,
 * the note appears underneath, and the last press puts the whole chart back
 * before the slide moves on.
 *
 * Named rather than positioned. A callout stored as "60% across" points
 * somewhere else the moment a row is inserted; a callout stored as "2020"
 * still means 2020. The position is looked up at the moment of the press, off
 * the axis label the renderer already drew — which is why this works on every
 * idiom with a category axis (bar, column, line, area, dumbbell…) without the
 * chart renderers knowing callouts exist.
 */
(function (global) {
  'use strict';
  /** @type {any} */
  var SF = global.SF = global.SF || {};

  /* How much of the plot a callout fills: about three bands.
 
     A band plus its neighbours, because a bar with no neighbours has lost the
     comparison it was drawn for — and that is the whole reason to zoom into a
     chart rather than crop one. Measured on the six-year cycle-hires chart:
     at one band (scale 3.2) you see 2020 and no axis, which is a screenshot
     with extra steps; at three (scale 2.0) you see 2019, 2020, 2021 and the
     gridlines they sit on. */
  var BANDS_IN_VIEW = 3;
  var MIN_ZOOM = 1.3;
  var MAX_ZOOM = 2.6;

  /** @param {object} slide @returns {{label: string, note: string}[]} */
  function list(slide) {
    return (slide && Array.isArray(slide.callouts) ? slide.callouts : [])
      .filter(function (c) { return c && String(c.label || '').trim(); });
  }

  function has(slide) { return list(slide).length > 0; }

  /**
   * Where this player is in the walk.
   *
   * -1 is the whole chart before it starts; 0..n-1 are the callouts; n is the
   * whole chart again, after. The two whole-chart states look identical and
   * are not the same thing: from "before", a press back leaves the slide
   * backwards, and from "after" it returns to the last callout — which is
   * what undoing the press that ended the walk should do.
   */
  function at(player, slide) {
    var all = (player && player.calloutStates) || {};
    var n = slide ? all[slide.id] : -1;
    return Number.isInteger(n) ? n : -1;
  }

  function set(player, slide, n) {
    if (!player || !slide) return;
    player.calloutStates = player.calloutStates || {};
    player.calloutStates[slide.id] = n;
  }

  /**
   * The axis label for a category, as the renderer drew it.
   *
   * Matched on the trimmed text because that is what the author typed into the
   * table and what the chart printed; a category the chart does not have is a
   * callout that does nothing rather than a callout that zooms somewhere
   * arbitrary.
   */
  function labelNode(svg, label) {
    var want = String(label || '').trim().toLowerCase();
    var found = null;
    Array.prototype.forEach.call(svg.querySelectorAll('.ch-cat'), function (node) {
      if (found) return;
      if (String(node.textContent || '').trim().toLowerCase() === want) found = node;
    });
    return found;
  }

  /**
   * Put one callout on screen, or the whole chart when index is out of range.
   *
   * The transform is the same arithmetic the image explorer uses: with the
   * origin at 0 0, bringing the point at (x, y) to the middle is
   * translate(50 - x·z, 50 - y·z) at scale z. Clamped to the frame so a
   * callout on the first or last category pans to the edge and stops rather
   * than showing empty space beside the chart.
   *
   * @param {HTMLElement} root the rendered .slide
   * @param {object} slide
   * @param {number} index
   */
  function apply(root, slide, index) {
    if (!root) return;
    var svg = root.querySelector('.chart-svg');
    var all = list(slide);
    var note = root.querySelector('.ch-callout');
    if (!svg) return;

    var callout = index >= 0 && index < all.length ? all[index] : null;
    if (!callout) {
      svg.style.transform = '';
      svg.classList.remove('ch-zoomed');
      if (note) { note.textContent = ''; note.classList.remove('on'); }
      return;
    }

    var box = svg.viewBox && svg.viewBox.baseVal;
    var label = labelNode(svg, callout.label);
    if (!box || !box.width || !label) {
      /* Nothing to point at: say the note anyway rather than silently doing
         nothing, because the author asked for a beat here. */
      if (note) { note.textContent = callout.note || callout.label; note.classList.add('on'); }
      return;
    }

    var cats = svg.querySelectorAll('.ch-cat').length || 1;
    var zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, cats / BANDS_IN_VIEW));
    var x = Number(label.getAttribute('x')) / box.width * 100;
    /* Vertically the window is anchored on the label, not on the bars.
 
       Centring on the upper two thirds — where the bars' tops and the line's
       path are — looked right and cut the axis labels off the bottom, which
       takes away the one thing that says which band is being looked at. A
       zoomed 2020 that does not say 2020 is a crop. So the label's own y is
       the anchor, pulled up by a third of the visible height so the bars
       above it come with it. */
    var labelY = Number(label.getAttribute('y')) / box.height * 100;
    var y = labelY - (100 / zoom) / 3;
    var slack = -(zoom - 1) * 100;
    var tx = Math.max(slack, Math.min(0, 50 - x * zoom));
    var ty = Math.max(slack, Math.min(0, 50 - y * zoom));
    svg.style.transformOrigin = '0 0';
    svg.style.transform = 'translate(' + tx.toFixed(2) + '%, ' + ty.toFixed(2) + '%) scale(' + zoom.toFixed(3) + ')';
    svg.classList.add('ch-zoomed');
    if (note) {
      note.textContent = callout.note ||
        ('Look at ' + callout.label + ' — ' + (index + 1) + ' of ' + all.length);
      note.classList.add('on');
    }
  }

  /**
   * Step the walk. Returns true when the press was used here, which is how
   * the player knows not to change slide — the same contract SF.Explore has.
   *
   * @param {object} player
   * @param {number} dir +1 or -1
   */
  function step(player, dir) {
    if (!player || !player.open) return false;
    var slide = player.wallSlide ? player.wallSlide() : null;
    if (!slide || !has(slide)) return false;
    var all = list(slide);
    var now = at(player, slide);
    var next = now + (dir < 0 ? -1 : 1);
    /* Past "after", or back before "before", the press belongs to the deck.
       The state is left where it is so the chart is whole when the slide is
       next seen, and so stepping back into it lands on the last callout. */
    if (next > all.length || next < -1) return false;
    set(player, slide, next);
    /* The step that ends the walk is a beat of its own: the whole chart comes
       back — and the note clears with it, because a line about 2020 under a
       chart that is no longer showing 2020 points at nothing. Zooming out and
       changing slide in one press would lose the "now look at it all again"
       the walk was building to. */
    apply(player._current, slide, next);
    if (player.syncPresenter) player.syncPresenter();
    return true;
  }

  /** What the desk should say the next press will do. */
  function nextAction(player) {
    var slide = player && player.wallSlide ? player.wallSlide() : null;
    if (!slide || !has(slide)) return '';
    return at(player, slide) < list(slide).length ? 'callout' : '';
  }

  /** Re-apply after a redraw, so a repaint does not throw the walk away. */
  function restore(player, slide, root) {
    if (!slide || !has(slide)) return;
    apply(root, slide, at(player, slide));
  }

  SF.Callouts = {
    list: list, has: has, at: at, apply: apply, step: step,
    nextAction: nextAction, restore: restore
  };
})(typeof window !== 'undefined' ? window : globalThis);
