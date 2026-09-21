/* SlideForge — arranging content by region.
   The third face of a slide, after content and artwork: where each block sits.

   A drag here never stores a coordinate. It stores a cell range on the 16x12
   lattice — col, row and spans — because free-form {x,y,w,h} forfeits reflow,
   re-theming, aspect export and print, and a slide that has been pinned to
   pixels can never be re-themed or re-exported without being rebuilt by hand.
   Snapping is therefore not a convenience laid over free movement: the cell IS
   the unit, and the guides only report which edges a cell happens to line up
   with once it lands.

   Seeding applies the selected layout's declared slots. It does not read the
   rendered slide back into data: layout geometry stays stable as copy, fonts
   and themes change. */

/* Moved out of js/arrange.js and under the editor, where the measurements put
 * it. It calls SF.Editor forty-seven times and almost nothing else: it is not
 * part of the canvas, it is the authoring engine's hands on the canvas. Making
 * that explicit takes the canvas layer's editor coupling from 66 references to
 * 16 without rewriting a line of either.
 *
 * It installs rather than returns: the file's whole public surface is the one
 * `SF.Arrange = {…}` at the bottom, exactly as it was. js/editor.js calls this,
 * which is the architectural statement — the editor owns its own canvas tools.
 *
 * Nothing here runs at install time but function declarations and that final
 * assignment, so installing earlier than the old script tag did is strictly
 * more available, never less.
 */
export function installArrange(SF) {

  var SLIDE_W = 1280;
  var SLIDE_H = 720;
  /* How close a dragged edge has to come before a guide appears, in slide
     pixels. Cell snapping already quantises the move; this only decides when to
     say "that is flush with something". */
  var GUIDE_NEAR = 6;

  var arranging = false;
  var selected = null;
  var selectedSlide = null;
  var cancelDrag = null;
  var arrangedSlide = null;

  function L() { return SF.latticeGeometry ? SF.latticeGeometry(root()) : SF.LATTICE; }
  function box() { return document.getElementById('previewBox'); }
  function slide() { return SF.Editor && SF.Editor.currentSlide && SF.Editor.currentSlide(); }
  function root() { var b = box(); return b && b.querySelector('.slide'); }

  function commit(repaint) {
    if (SF.Editor && SF.Editor.commitActivityChange) SF.Editor.commitActivityChange();
    if (repaint && SF.Editor && SF.Editor.refreshCanvas) SF.Editor.refreshCanvas();
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  /* The canvas is a scaled render of a 1280x720 slide, so everything measured
     off the screen has to come back to slide pixels before it means anything. */
  function scaleOf(node) {
    var w = node.getBoundingClientRect().width;
    return w > 0 ? w / SLIDE_W : 1;
  }

  function regionsOf(s, make) {
    if (!s) return null;
    var d = s.design || (make ? (s.design = {}) : null);
    if (!d) return null;
    if (!d.regions && make) d.regions = {};
    return d.regions || null;
  }

  /* Layout coordinates belong to the layout definition.  This must not infer
     geometry from a one-off DOM render: changing a font, a theme or a title
     length would otherwise turn into an unrequested coordinate change. */
  /* Where the blocks on this slide actually are, in cells.

     Read off the rendered slide before it is latticed, which is the only
     witness that agrees with what the author is looking at. A composition
     lays its slide out in CSS — flex, gaps, centred columns — and the region
     map declared for it is a description of that written down separately.
     The two had drifted: across the ten AI Awareness compositions, 27 blocks
     sat somewhere other than where their declared region put them, so opening
     the Layout face re-placed them and the slide visibly changed under the
     author. On `prompt` the one-row gap between the eyebrow and the question
     closed to nothing and the question overflowed its box.

     Measuring instead of reading the table makes "opening Layout moves
     nothing" true by construction, for every composition, every slide type
     and every theme, with no second copy of the numbers to keep in step. */
  function measuredRegions() {
    var s = slide();
    var deck = SF.Editor && SF.Editor.deck && SF.Editor.deck();
    if (!s || !deck || !SF.renderSlide) return null;
    /* A clean render of this slide at its true size, off to the side —
       never the canvas the author is looking at.

       The canvas is whatever state the editor is in. With a poll docked
       beside it the pad carries 438px of right padding, so the body is nine
       columns wide instead of twelve; measuring there wrote nine-column
       regions and the slide kept them after the rail closed, squeezed into
       two thirds of itself for good. The zoom, the panel and the notes strip
       are all the same hazard. A slide's arrangement is a fact about the
       slide, so it is measured from the slide alone. */
    var stage = document.createElement('div');
    stage.style.cssText = 'position:fixed;left:-20000px;top:0;width:1280px;height:720px;pointer-events:none';
    document.body.appendChild(stage);
    var rt, host;
    try {
      rt = SF.renderSlide(deck, s, { index: 0, total: 1, interactive: false });
      stage.appendChild(rt);
      host = SF.latticeHost(rt);
    } catch (e) { host = null; }
    if (!rt || !host || host.querySelector('.sf-lattice')) { stage.remove(); return null; }
    var rb = rt.getBoundingClientRect();
    if (!rb.width || !rb.height) { stage.remove(); return null; }
    /* In the slide's own coordinates, not the host's. The lattice always
       occupies the same 1176x576 of the slide whatever box the composition
       drew its body in — `ballot` centres its body in 790px, and measuring
       against that made every child read as twelve columns wide. */
    var g = SF.LATTICE;
    var scale = rb.width / 1280;
    var stepX = g.w / g.cols, stepY = g.h / g.rows;
    var out = {};
    Array.prototype.slice.call(host.children).forEach(function (n, i) {
      if (n.nodeType !== 1) return;
      var b = n.getBoundingClientRect();
      if (!b.height || !b.width) return;
      var x = (b.left - rb.left) / scale - g.left;
      var y = (b.top - rb.top) / scale - g.top;
      var col = clamp(Math.round(x / stepX) + 1, 1, g.cols);
      var row = clamp(Math.round(y / stepY) + 1, 1, g.rows);
      /* Position to the nearest cell; height through the same arithmetic the
         fit check uses, so the two cannot disagree about the block they are
         both looking at. They did: this rounded a hair under a whole row and
         SF.linesFor rounds a pixel under one, so a block was seeded a row
         shorter than the check then asked for and opened red on a slide
         nobody had touched — seven of them across the first two dozen
         reference slides. Two places answering "how many rows do these words
         need" is one place too many. */
      var rows = SF.linesFor ? SF.linesFor(b.height / scale)
        : Math.max(1, Math.ceil(b.height / scale / stepY));
      out[blockKeyOfNode(n, i)] = {
        col: col, row: row,
        cols: clamp(Math.max(1, Math.ceil(b.width / scale / stepX - 0.06)), 1, g.cols - col + 1),
        rows: clamp(rows, 1, g.rows - row + 1)
      };
    });
    stage.remove();
    return Object.keys(out).length ? out : null;
  }

  function blockKeyOfNode(n, i) {
    return SF.blockKeyOf ? SF.blockKeyOf(n, i) : 'block-' + i;
  }

  function seed() {
    var s = slide();
    if (!s || !SF.layoutRegionsFor) return false;
    var map = regionsOf(s, true);
    if (Object.keys(map).length) return false;
    /* The declared map first, so slots the layout reserves but is not drawing
       keep their coordinates for an item to snap into later.

       Then, on a composition slide only, what is actually on the slide. The
       declared regions for the plain slide types are the ones every reference
       slide was measured against and they are right; a composition is laid
       out by its own CSS and the table describing it had drifted — 27 blocks
       across the ten of them sat somewhere other than where it said, so
       opening Layout re-placed them. Measuring everywhere was tried and costs
       more than it pays: the bullets on a content slide really do fill all
       twelve columns, and taking the declared eleven away removed the column
       of slack a nudge needs. */
    var composed = !!(s.design && s.design.composition) ||
      !!(SF.slideComposition && SF.Editor && SF.Editor.deck && SF.slideComposition(SF.Editor.deck(), s));
    var declared = SF.layoutRegionsFor(s);
    var measured = measuredRegions() || {};
    Object.assign(map, declared);
    Object.keys(measured).forEach(function (k) {
      if (composed || !declared[k]) { map[k] = measured[k]; return; }
      /* A plain type keeps its declared columns and takes its measured rows.

         The columns are a decision — where the copy column ends, which side
         the media sits on, how much slack a nudge has — and every reference
         slide was placed against them. The rows were a tariff written by
         hand, and the decks outgrew it: the bullet list is declared four rows
         and the layout bank's own slides need a median of eight and as many
         as fourteen; chart-wrap is declared eleven and needs twelve on all
         twenty of them. So 79 of 251 blocks opened Layout already red on a
         deck nobody had touched, which says the grid is wrong rather than
         the slide. Height is a fact about the words, so it is measured. */
      map[k] = { col: declared[k].col, cols: declared[k].cols,
                 row: measured[k].row, rows: measured[k].rows };
      if (declared[k].anchorX) map[k].anchorX = declared[k].anchorX;
      if (declared[k].anchorY) map[k].anchorY = declared[k].anchorY;
      if (declared[k].alignY) map[k].alignY = declared[k].alignY;
    });
    growToFit(s, map);
    commit(true);
    return true;
  }

  /* Give each block the lines its words actually need, once it is in the
     columns it will be drawn in.

     Measuring the clean render gets the height the block has at its natural
     width, and that is not the height it will have in the slot: a title
     measured across the pad and then given eight columns wraps taller. Seven
     blocks in the first two dozen reference slides opened red for exactly
     that reason — not a rounding error, a different question. The only
     authority on whether words fit a region is the check the face already
     uses, so the seed asks it, off-screen, and grows whatever comes up short
     before the author ever sees it.

     Never shrinks: empty lines under a heading are composition rather than
     slack, which is the rule the tariff has always followed. */
  function growToFit(s, map) {
    var deck = SF.Editor && SF.Editor.deck && SF.Editor.deck();
    if (!deck || !SF.renderSlide || !SF.latticeFit) return;
    var was = s.design && s.design.regions;
    var stage = document.createElement('div');
    stage.style.cssText = 'position:fixed;left:-20000px;top:0;width:1280px;height:720px;pointer-events:none';
    document.body.appendChild(stage);
    try {
      if (!s.design) s.design = {};
      s.design.regions = map;
      var rt = SF.renderSlide(deck, s, { index: 0, total: 1, interactive: false });
      stage.appendChild(rt);
      SF.latticeFit(rt).forEach(function (f) {
        var r = map[f.key];
        if (!r || f.need == null || f.need <= r.rows) return;
        r.rows = Math.min(f.need, L().rows - r.row + 1);
      });
    } catch (e) { /* a slide that cannot be rendered twice keeps its seed */ }
    stage.remove();
    if (was === undefined && s.design) delete s.design.regions;
    else if (s.design) s.design.regions = was;
  }

  // ------------------------------------------------------------------ guides
  function guideLayer(rt) {
    var layer = rt.querySelector('.sf-guides');
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'sf-guides';
      rt.appendChild(layer);
    }
    return layer;
  }
  function clearGuides() {
    var rt = root();
    var layer = rt && rt.querySelector('.sf-guides');
    if (layer) layer.remove();
  }

  /* Every line a block could be flush with: the slide's own edges and centre,
     and each other block's edges and centre. Reported after the cell snap, so
     a guide is a statement about where the block landed — never a force that
     pulled it somewhere the cell grid would not have put it. */
  function guideLines(exceptKey) {
    var g = L();
    var xs = [0, SLIDE_W / 2, SLIDE_W, g.left, g.left + g.w];
    var ys = [0, SLIDE_H / 2, SLIDE_H, g.top, g.top + g.h];
    var kinds = { x: {}, y: {} };
    xs.forEach(function (v) { kinds.x[v] = 'edge'; });
    ys.forEach(function (v) { kinds.y[v] = 'edge'; });
    var s = slide();
    var map = regionsOf(s);
    if (map) {
      Object.keys(map).forEach(function (k) {
        if (k === exceptKey) return;
        var r = map[k];
        var x1 = g.left + (r.col - 1) * g.stepX;
        var x2 = x1 + r.cols * g.stepX - (g.stepX - 65);
        var y1 = g.top + (r.row - 1) * g.stepY;
        var y2 = y1 + r.rows * g.stepY;
        [x1, x2].forEach(function (v) { xs.push(v); if (!kinds.x[v]) kinds.x[v] = 'block'; });
        [y1, y2].forEach(function (v) { ys.push(v); if (!kinds.y[v]) kinds.y[v] = 'block'; });
      });
    }
    return { xs: xs, ys: ys, kinds: kinds };
  }

  function drawGuides(region, key) {
    var rt = root();
    if (!rt) return;
    var g = L();
    var layer = guideLayer(rt);
    layer.replaceChildren();
    var lines = guideLines(key);
    var x1 = g.left + (region.col - 1) * g.stepX;
    var x2 = x1 + region.cols * g.stepX - (g.stepX - 65);
    var y1 = g.top + (region.row - 1) * g.stepY;
    var y2 = y1 + region.rows * g.stepY;
    function mark(axis, mine, pool) {
      mine.forEach(function (v) {
        pool.forEach(function (t) {
          if (Math.abs(v - t) > GUIDE_NEAR) return;
          var line = document.createElement('div');
          line.className = 'sf-guide';
          line.setAttribute('data-axis', axis);
          line.setAttribute('data-kind', lines.kinds[axis][t] || 'block');
          line.style[axis === 'x' ? 'left' : 'top'] = t + 'px';
          layer.appendChild(line);
        });
      });
    }
    mark('x', [x1, x2], lines.xs);
    mark('y', [y1, y2], lines.ys);
  }

  // -------------------------------------------------------------------- drag
  function select(slot) {
    var rt = root();
    if (rt) rt.querySelectorAll('[data-arrange-selected]').forEach(function (n) {
      n.removeAttribute('data-arrange-selected');
    });
    selected = slot ? slot.getAttribute('data-block-key') : null;
    selectedSlide = selected ? slide() : null;
    if (slot) slot.setAttribute('data-arrange-selected', '');
    paintBar();
    /* The rail follows the selection: click a block and the inspector becomes
       that block's editor rather than staying on the whole slide. */
    if (SF.Editor && SF.Editor.refreshInspector) SF.Editor.refreshInspector();
  }

  /* Corner handles on the selected item.

     Dragging a corner is the obvious way to resize a thing, and until now the
     only ways were four buttons on the arrange bar and Shift with an arrow
     key — both of which mean knowing the arrange bar exists. The handles sit
     on the selected item only, so an unselected slide is not covered in
     furniture, and on items rather than on the slide's own parts for the same
     reason dragging is: the layout owns those. */
  var CORNERS = ['nw', 'ne', 'sw', 'se'];
  function paintHandles(rt) {
    if (!rt) return;
    rt.querySelectorAll('.sf-handle').forEach(function (n) { n.remove(); });
    if (!selected || String(selected).indexOf('blocks.') !== 0) return;
    /* And the kind has to allow it. All eight do today, so this changes
       nothing now and stops a ninth arriving with handles it cannot use. */
    var held = SF.Arrange && SF.Arrange.selectedBlock && SF.Arrange.selectedBlock();
    var kind = held && SF.FREE_KINDS && SF.FREE_KINDS[held.kind];
    if (kind && kind.resizes === false) return;
    var slot = rt.querySelector('[data-block-key="' + selected + '"]');
    if (!slot) return;
    CORNERS.forEach(function (corner) {
      var h = document.createElement('span');
      h.className = 'sf-handle sf-handle-' + corner;
      h.dataset.corner = corner;
      h.setAttribute('aria-hidden', 'true');
      slot.appendChild(h);
    });
  }

  function beginResize(e) {
    var h = e.target.closest && e.target.closest('.sf-handle');
    if (!h || e.button !== 0 || e.isPrimary === false) return;
    var slot = h.closest('.sf-slot');
    var key = slot && slot.getAttribute('data-block-key');
    var s = slide();
    var map = regionsOf(s, true);
    var start = key && map[key];
    if (!start) return;
    e.preventDefault();
    /* Both listeners are on the canvas box, and stopPropagation does nothing
       to a sibling on the same element — so a corner press would also have
       started a move. */
    e.stopImmediatePropagation();
    var corner = h.dataset.corner;
    var g = L();
    var scale = scaleOf(root());
    var fromX = e.clientX, fromY = e.clientY;
    var landed = start, moved = false;

    function move(ev) {
      var dCol = Math.round((ev.clientX - fromX) / scale / g.stepX);
      var dRow = Math.round((ev.clientY - fromY) / scale / g.stepY);
      if (!dCol && !dRow && !moved) return;
      moved = true;
      /* West and north corners move the origin as well as the size, so the
         opposite edge stays where the author put it. */
      var west = corner === 'nw' || corner === 'sw';
      var north = corner === 'nw' || corner === 'ne';
      var col = start.col, row = start.row, cols = start.cols, rows = start.rows;
      if (west) { col = clamp(start.col + dCol, 1, start.col + start.cols - 1); cols = start.col + start.cols - col; }
      else { cols = clamp(start.cols + dCol, 1, g.cols - start.col + 1); }
      if (north) { row = clamp(start.row + dRow, 1, start.row + start.rows - 1); rows = start.row + start.rows - row; }
      else { rows = Math.max(1, start.rows + dRow); }
      landed = { col: col, row: row, cols: cols, rows: rows };
      slot.style.gridArea = landed.row + ' / ' + landed.col + ' / span ' + landed.rows + ' / span ' + landed.cols;
      slot.setAttribute('data-span', landed.rows + 'r x ' + landed.cols + 'c');
      drawGuides(landed, key);
    }
    function cleanup() {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', cleanup);
      clearGuides();
    }
    function up() {
      cleanup();
      if (slide() !== s || !moved) return;
      /* The same rule as a move: this block gets the size asked for, and
         whatever it grows over is pushed to the nearest free place. Stopping
         at the neighbour's edge was tried first and made the canvas unusable —
         building a layout means growing one block through where another
         currently sits. */
      var settled = settle(key, landed);
      if (!settled) {
        if (SF.Editor && SF.Editor.refreshCanvas) SF.Editor.refreshCanvas();
        SF.toast && SF.toast('No room to grow it that far.');
        return;
      }
      var shoved = Object.keys(settled).filter(function (k) {
        return k !== key && map[k] && (map[k].col !== settled[k].col || map[k].row !== settled[k].row);
      }).length;
      applySettled(map, settled);
      commit(true);
      afterPaint();
      if (shoved) SF.toast && SF.toast(shoved === 1 ? 'Resized. The item in the way shifted over.'
        : 'Resized. ' + shoved + ' items shifted over.');
    }
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', cleanup);
  }

  function beginDrag(e) {
    if (e.button !== 0 || e.isPrimary === false) return;
    if (e.target.closest && e.target.closest('.sf-handle')) return;
    var slot = e.target.closest && e.target.closest('.sf-slot');
    /* Outside the Layout face an item you added is still draggable — it is
       yours, and going into a mode to nudge it is a detour. The slide's own
       parts are not: moving those is what the Layout face is for. */
    var freeItem = !arranging && slot &&
      String(slot.getAttribute('data-block-key') || '').indexOf('blocks.') === 0;
    if (!arranging && !freeItem) return;
    if (cancelDrag) cancelDrag();
    if (!slot) { select(null); return; }
    /* A press on an item outside Layout might be the start of a drag or might
       be a click to type into it. Claiming it now would break the second, so
       the default is left alone until the pointer has actually travelled a
       cell, and the click is suppressed then instead. */
    if (!freeItem) { e.preventDefault(); select(slot); }
    var rt = root();
    var s = slide();
    var map = regionsOf(s, true);
    var key = slot.getAttribute('data-block-key');
    var start = map[key];
    if (!start) return;
    var g = L();
    var scale = scaleOf(rt);
    var fromX = e.clientX;
    var fromY = e.clientY;
    var landed = start;
    var moved = false;

    function move(ev) {
      /* Divide by the scale first: a drag is in screen pixels and a cell is in
         slide pixels, and mixing them makes the block drift at any zoom. */
      var dCol = Math.round((ev.clientX - fromX) / scale / g.stepX);
      var dRow = Math.round((ev.clientY - fromY) / scale / g.stepY);
      if (!dCol && !dRow && !moved) return;
      if (!moved && freeItem) {
        /* It is a drag after all: take the item now, and stop the press from
           also landing as a click that opens the text editor. */
        select(slot);
        slot.addEventListener('click', function once(ev) {
          ev.stopPropagation(); ev.preventDefault();
          slot.removeEventListener('click', once, true);
        }, true);
      }
      moved = true;
      slot.style.transform = '';
      landed = {
        col: clamp(start.col + dCol, 1, g.cols - start.cols + 1),
        row: clamp(start.row + dRow, 1, g.rows - start.rows + 1),
        cols: start.cols,
        rows: start.rows
      };
      slot.style.gridArea = landed.row + ' / ' + landed.col + ' / span ' + landed.rows + ' / span ' + landed.cols;
      slot.setAttribute('data-span', landed.rows + 'r x ' + landed.cols + 'c');
      drawGuides(landed, key);
    }
    function cleanup() {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', cancel);
      window.removeEventListener('blur', cancel);
      cancelDrag = null;
      clearGuides();
    }
    function cancel() {
      cleanup();
      if (SF.Editor && SF.Editor.refreshCanvas) SF.Editor.refreshCanvas();
    }
    function up() {
      cleanup();
      if (slide() !== s || (!arranging && !freeItem)) return;
      if (!moved) return;
      /* Where it was dropped, or the nearest free place if that was on top of
         something. Two blocks in one cell is not a smaller version of what was
         asked for — it is unreadable, and nothing downstream reports it. */
      var settled = settle(key, landed);
      if (!settled) {
        if (SF.Editor && SF.Editor.refreshCanvas) SF.Editor.refreshCanvas();
        SF.toast && SF.toast('No room there — something that cannot move is in the way.');
        return;
      }
      var shoved = Object.keys(settled).filter(function (k) {
        return k !== key && map[k] && (map[k].col !== settled[k].col || map[k].row !== settled[k].row);
      }).length;
      applySettled(map, settled);
      commit(true);
      afterPaint();
      if (shoved) SF.toast && SF.toast(shoved === 1 ? 'Moved. The item in the way shifted over.'
        : 'Moved. ' + shoved + ' items shifted over.');
    }
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', cancel);
    window.addEventListener('blur', cancel);
    cancelDrag = cancel;
  }

  // ----------------------------------------------------------------- actions
  function resize(dCols, dRows) {
    if (!selected) return;
    var s = slide();
    var map = regionsOf(s);
    var r = map && map[selected];
    if (!r) return;
    var g = L();
    var wasCols = r.cols;
    /* Rows are no longer clamped to the bottom of the grid. The line detector
       was adopted so that overflowing is a measurement rather than a veto, and
       clamping here made a block silently refuse to grow at the foot of a
       slide — which reads as a dead button. restackRegions reports the
       overrun instead. */
    r.cols = clamp(r.cols + dCols, 1, r.anchorX ? g.cols : g.cols - r.col + 1);
    /* Narrowing away from full width pins to the first column, so the half
       that is freed is the right-hand one and it is contiguous. Keeping the
       origin instead left a gap on both sides and nothing usable on either.
       Engine 3's rule, and the closest the lattice has to splitting a row. */
    if (dCols < 0 && wasCols >= g.cols && r.cols < g.cols && !r.anchorX) r.col = 1;
    if (dRows) {
      var cost = SF.restackRegions(map, selected, Math.max(1, r.rows + dRows));
      if (cost && cost.over) {
        SF.toast && SF.toast('That is ' + cost.used + ' of ' + cost.budget
          + ' lines — ' + cost.over + ' past the slide.');
      }
    }
    Object.assign(r, SF.anchorRegion(r));
    commit(true);
    afterPaint();
  }

  /* ------------------------------------------------------------ free blocks
     Add a block, duplicate one, remove one. The last thing the authoring audit
     found blocked, and the only one of the four that needed the model to grow
     rather than the arrange bar: every other block on a slide exists because
     the layout drew it, so there was nothing to add.

     A free block is placed where there is room rather than at the origin, and
     it gets a region immediately — without one it would flow at the end of the
     pad and the author would have to find it. */
  var overlaps = function (a, b) { return SF.regionsOverlap(a, b); };

  /* What is actually holding cells on this slide, read off the canvas rather
     than out of the region map.

     The map is a poor witness: it also carries slots the layout reserved but
     is not drawing — a title region on a slide with no title — and it carries
     nothing for a block that has been taken off. Counting those as occupied
     pushed items away from exactly the slots they were aimed at. The rendered
     lattice has no such problem, because a slot is in it precisely when it is
     on the slide, which is also the only sense in which something can be in
     the way. It counts pictures as well, which the two old call sites both
     missed by filtering keys to `blocks.` — an inserted item would land on a
     picture and neither path noticed. */
  function occupants(exceptKey) {
    var rt = root();
    var map = regionsOf(slide());
    if (!rt || !map) return [];
    return Array.prototype.slice.call(rt.querySelectorAll('.sf-slot[data-block-key]'))
      .map(function (n) { return n.getAttribute('data-block-key'); })
      .filter(function (k) { return k && k !== exceptKey && map[k]; })
      .map(function (k) { return map[k]; });
  }

  /* Which drawn blocks may not be pushed out of the way: everything that is
     not an item the author added. A block the layout drew belongs to the
     slide's type — taking it off the slide is the way past it — and a picture
     belongs to the decorative plane, which is freeform by design. */
  function immovable() {
    var rt = root();
    if (!rt) return [];
    return Array.prototype.slice.call(rt.querySelectorAll('.sf-slot[data-block-key]'))
      .map(function (n) { return n.getAttribute('data-block-key'); })
      .filter(function (k) { return k && k.indexOf('blocks.') !== 0; });
  }

  /* The one placement call. Every path that moves or resizes something goes
     through here, so there is one answer to "may this go there" instead of
     the four that disagreed. Returns the new map or null if it cannot be done.
     Only what is drawn takes part: the region map also names slots the layout
     reserved but is not showing, and those are not in anyone's way. */
  function settle(key, want) {
    var rt = root();
    var map = regionsOf(slide());
    if (!rt || !map) return null;
    var drawn = {};
    Array.prototype.slice.call(rt.querySelectorAll('.sf-slot[data-block-key]'))
      .forEach(function (n) {
        var k = n.getAttribute('data-block-key');
        if (k && map[k]) drawn[k] = map[k];
      });
    if (!drawn[key]) drawn[key] = map[key] || want;
    return SF.resolvePlacement(drawn, key, want, L(), immovable());
  }

  /* Write a resolved map back, so every mover applies it the same way. */
  function applySettled(map, settled) {
    Object.keys(settled).forEach(function (k) {
      if (!map[k]) return;
      map[k].col = settled[k].col; map[k].row = settled[k].row;
      map[k].cols = settled[k].cols; map[k].rows = settled[k].rows;
    });
  }

  /* Make room rather than refuse.

     An item arriving where something already sits used to be turned away, and
     before that it was dropped underneath everything and off the slide. Both
     are worse than the obvious thing: halve what is there and take the half
     that frees. The occupant is cut along its longer side — a wide block
     becomes two columns, a tall one two rows — so the newcomer arrives beside
     it rather than on top of it, and neither ends up a sliver.

     Returns the region the new item should take, and shrinks the occupant in
     `map` as a side effect. If nothing can be halved without leaving a strip
     narrower than one cell, the wanted region is handed back unchanged and the
     fit report is left to say it does not fit. */
  function makeRoom(map, want) {
    /* Only what is actually placed counts as in the way. The map also holds
       the layout's own reserved regions — a title slot on a slide with no
       title — and treating those as occupied halved every item that was
       correctly aimed at one, which is the opposite of snapping into place. */
    var drawn = occupants(null);
    var keys = Object.keys(map || {}).filter(function (k) {
      /* Halving only ever cuts an item: a block the layout drew is not the
         author's to shrink, and a picture belongs to the decorative plane. */
      return k.indexOf('blocks.') === 0 &&
        drawn.some(function (r) { return r === map[k]; });
    });
    var clash = keys.filter(function (k) { return map[k] && overlaps(map[k], want); });
    if (!clash.length) return want;
    clash.sort(function (a, b) {
      return (map[b].cols * map[b].rows) - (map[a].cols * map[a].rows);
    });
    var key = clash[0], r = map[key];
    if (r.cols >= r.rows) {
      var keep = Math.floor(r.cols / 2);
      if (keep < 1 || r.cols - keep < 1) return want;
      map[key] = { col: r.col, row: r.row, cols: keep, rows: r.rows };
      return { col: r.col + keep, row: r.row, cols: r.cols - keep, rows: r.rows };
    }
    var keepRows = Math.floor(r.rows / 2);
    if (keepRows < 1 || r.rows - keepRows < 1) return want;
    map[key] = { col: r.col, row: r.row, cols: r.cols, rows: keepRows };
    return { col: r.col, row: r.row + keepRows, cols: r.cols, rows: r.rows - keepRows };
  }

  function addBlock(kind) {
    var s = slide();
    if (!s) return;
    var spec = (SF.FREE_KINDS && SF.FREE_KINDS[kind]) || (SF.FREE_KINDS && SF.FREE_KINDS.text);
    if (!spec) return;
    var list = SF.freeBlocksOf(s, true);
    var id = 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    var map = regionsOf(s, true);
    /* Seed from the chosen layout's slot map. This remains deterministic even
       when the item is inserted before the author opens the Layout face. */
    if (!Object.keys(map).length) seed();
    map = regionsOf(s, true);
    /* The layout's own slot if it advertises one, otherwise the size the
       corpus says this kind of item is — and then room made for it. */
    /* The layout's own slot for this kind of item, if it has a free one —
       a heading to where it puts its title, a list to where it puts its list.
       Failing that the generic rail, and failing that the size the corpus
       says this kind of item is. */
    /* What is on the slide, not what the map happens to name. This used to
       filter to `blocks.` and so an item could be inserted straight on top of
       a picture — the one kind of occupant neither of the two old placement
       paths counted. */
    var placedBlocks = occupants(null);
    var want = (SF.insertionRegionFor && SF.insertionRegionFor(s, list.length, kind, placedBlocks)) ||
      { col: 1, row: 1, cols: spec.cols, rows: spec.rows };
    var before = Object.keys(map).length;
    /* design.regions is a coordinate map; the slot name travels on the block,
       not in it. */
    var placed = makeRoom(map, { col: want.col, row: want.row, cols: want.cols, rows: want.rows });
    /* Which of the layout's slots this item took, so it can be drawn as that
       slot rather than as a generic block: an item in the title slot should
       read as the title, not as a heading that happens to sit up there. */
    var took = { id: id, kind: kind, text: '' };
    if (want && want.slot) took.as = want.slot;
    list.push(took);
    map[SF.freeBlockKey(id)] = placed;
    var shared = before === Object.keys(map).length;
    selected = SF.freeBlockKey(id);
    selectedSlide = s;
    commit(true);
    afterPaint();
    SF.toast && SF.toast(spec.label + (shared
      ? ' added beside what was there — both now take half the space.'
      : ' added. Click it to type, drag to move.'));
  }

  /* Put everything on the slide in the middle of the grid.

     Content is top-aligned by default — .pad is a flex column starting at the
     top, and only title and section slides centre themselves — so a slide with
     four rows of content in a sixteen-row grid sits high with twelve rows of
     air beneath it. Measured across the library: of 686 slides, 291 fill the
     band and 259 are already about right, but 123 are top-heavy that way.

     An action rather than a new default. Centring every slide would stop the
     heading sitting in the same place from one slide to the next, so a deck
     would jitter as you advance through it — which is the reason top-aligned
     is the usual choice and not an oversight. This makes it a decision per
     slide, and ↺ Theme takes it back.

     The whole arrangement moves together, so the spacing the author set
     between blocks is preserved: this shifts the bounding box, it does not
     redistribute anything inside it. A block with a vertical anchor is left
     alone — it has been told where to be. */
  function centreInGrid() {
    var s = slide();
    var map = regionsOf(s);
    var keys = map ? Object.keys(map).filter(function (k) { return map[k]; }) : [];
    if (!keys.length) return;
    var g = L();
    var minRow = Infinity, maxRow = -Infinity;
    keys.forEach(function (k) {
      var r = map[k];
      minRow = Math.min(minRow, r.row);
      maxRow = Math.max(maxRow, r.row + r.rows - 1);
    });
    var usedRows = maxRow - minRow + 1;
    /* Down the slide only. Across it, the left edge is the thing to keep: the
       body, the header and the footer all start on column 1, and a block
       spanning eleven of twelve columns would be nudged one column right to
       "centre" it — breaking the flush edge to gain half a column of symmetry
       nobody asked for. Centring one block across is what the horizontal
       anchor is for, and it is per block because that is the only level at
       which the question makes sense.
       Clamped, so content taller than the grid stays inside it rather than
       being centred off the top: over-16 is allowed when an author asks for
       it, and should not arrive as a side effect of tidying. */
    var wantRow = clamp(Math.floor((g.rows - usedRows) / 2) + 1, 1, Math.max(1, g.rows - usedRows + 1));
    var dRow = wantRow - minRow;
    if (!dRow) { SF.toast && SF.toast('Already centred in the grid.'); return; }
    keys.forEach(function (k) {
      var r = map[k];
      if (!r.anchorY) r.row += dRow;
    });
    commit(true);
    afterPaint();
    SF.toast && SF.toast('Centred — ' + usedRows + ' of ' + g.rows + ' lines used, '
      + (g.rows - usedRows) + ' split above and below.');
  }

  /* ---------------------------------------------------------------- splits
     Cut a block's columns at a named proportion and put a new block in what
     is freed. The thing asked for at the start of all this — "if I want to
     split 50% left and 50% right that can allow to add new content" — and the
     reason it waited until last is that the second half of that sentence is
     the hard half: there was nothing to put in the freed columns until a block
     was a thing the model had.

     The proportion is of the block's own width, not the slide's, so splitting
     a half again gives quarters. Rounded to whole columns and clamped so both
     sides keep at least one: the cell is the unit, and a 20/80 of a 4-column
     block is 1 and 3 rather than 0.8 and 3.2.

     Columns only. A vertical split is the same idea and a different feature:
     rows already push down, so cutting a block's rows would have to decide
     what happens to everything under it, and that decision is not this one. */
  var SPLITS = [
    { value: '50', label: '50 · 50' },
    { value: '40', label: '40 · 60' },
    { value: '60', label: '60 · 40' },
    { value: '20', label: '20 · 80' },
    { value: '80', label: '80 · 20' }
  ];

  /* One axis or the other, and the shape of it is the same either way: divide
     the block's own footprint and put a new block in the part that is freed.

     Nothing else on the slide moves, because nothing needs to — the two halves
     together occupy exactly the cells the one block did. That is what made the
     row split safe to add after all: the note here used to say cutting rows
     would have to decide what happens to everything underneath, and it does
     not, any more than cutting columns decides what happens to either side.
     A split is not a resize. */
  function splitRegion(axis, firstPercent) {
    if (!selected) return;
    var s = slide();
    var map = regionsOf(s, true);
    var r = map && map[selected];
    if (!r) return;
    var down = axis === 'row';
    var span = down ? r.rows : r.cols;
    if (span < 2) {
      SF.toast && SF.toast(down
        ? 'Too short to split — one line cannot become two.'
        : 'Too narrow to split — one column cannot become two.');
      return;
    }
    var first = clamp(Math.round(span * firstPercent / 100), 1, span - 1);
    var second = span - first;
    var id = 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    SF.freeBlocksOf(s, true).push({ id: id, kind: 'text', text: '' });
    map[SF.freeBlockKey(id)] = down
      ? { col: r.col, row: r.row + first, cols: r.cols, rows: second }
      : { col: r.col + first, row: r.row, cols: second, rows: r.rows, alignY: r.alignY };
    /* The anchor on the axis being cut has to go. anchorRegion recomputes that
       coordinate from it on every render, so an anchored block would snap back
       across the half just freed and sit on top of the new one — the split
       would look as though it had not happened. Being half the size it was, it
       is no longer the thing the anchor was describing. The other axis keeps
       its anchor, which is untouched by the cut. */
    if (down) delete r.anchorY; else delete r.anchorX;
    /* And a vertical cut ends where the words were packed to: alignY says
       where text sits in rows the block no longer has all of. */
    if (down) delete r.alignY;
    if (down) r.rows = first; else r.cols = first;
    selected = SF.freeBlockKey(id);
    selectedSlide = s;
    commit(true);
    afterPaint();
    SF.toast && SF.toast('Split ' + first + ' · ' + second + (down ? ' lines' : ' columns')
      + '. Click the new block to type into it.');
  }

  function duplicateBlock() {
    var s = slide();
    var id = selected && SF.freeBlockId && SF.freeBlockId(selected);
    if (!s || !id) return;
    var block = SF.freeBlockById(s, id);
    var map = regionsOf(s, true);
    var from = map[selected];
    if (!block || !from) return;
    var copyId = 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    SF.freeBlocksOf(s, true).push({ id: copyId, kind: block.kind, text: block.text });
    /* One row below the original, not on top of it: a copy you cannot see is
       indistinguishable from a copy that did not happen. */
    var g = L();
    map[SF.freeBlockKey(copyId)] = {
      col: from.col, row: Math.min(g.rows, from.row + from.rows), cols: from.cols, rows: from.rows,
      alignY: from.alignY
    };
    selected = SF.freeBlockKey(copyId);
    commit(true);
    afterPaint();
    SF.toast && SF.toast('Copied, one row below.');
  }

  /* The rail draws whichever block the canvas is holding — drawInspector asks
     SF.Arrange.selectedBlock() before it asks its own focus. So a change to
     the canvas selection is a change to the rail, and the rail has to be told
     or it goes on drawing the fields of a block that is no longer selected,
     or no longer there. clearBlockFocus alone was not enough: selecting a
     slot inside the Layout face never sets the rail's own focus, so it had
     nothing to clear and nothing redrew. */
  function syncRail() {
    if (!SF.Editor) return;
    if (SF.Editor.clearBlockFocus) SF.Editor.clearBlockFocus();
    if (SF.Editor.refreshInspector) SF.Editor.refreshInspector();
  }

  /* Drop the selection on both sides. Called from here on Escape, and from
     the rail when it deletes the block the canvas is holding. */
  function deselect() {
    if (!selected) return;
    selected = null;
    selectedSlide = null;
    afterPaint();
    syncRail();
  }

  /* @returns {boolean} whether anything was removed, so a key handler can
     tell "I dealt with this" from "pass it on to the slide". */
  function removeBlock() {
    var s = slide();
    var what = s && SF.deleteBlock(s, selected);
    if (!what) return false;
    selected = null;
    /* Both selections, not just this one. */
    syncRail();
    commit(true);
    afterPaint();
    SF.toast && SF.toast(what === 'item'
      ? 'Item removed. Undo brings it back.'
      : 'Taken off this slide. Its words are kept — Undo, or Bring back in Layout.');
    return true;
  }

  /* Give the block the lines its words actually need, and push the rest down.
     The bridge between "I typed a longer heading" and "the slide is arranged
     again": the tariff still does not grow from paint, because rearranging a
     slide under someone who is still typing into it is worse than telling them
     it does not fit — but the telling is now one click from the fixing, and
     the number it uses is the one the Layout face is already showing. */
  function fitToText() {
    if (!selected) return;
    var v = verdictFor(selected);
    if (!v || v.need == null) return;
    var map = regionsOf(slide());
    var r = map && map[selected];
    if (!r) return;
    if (v.need === r.rows) { SF.toast && SF.toast('Already ' + r.rows + ' lines.'); return; }
    var was = r.rows;
    var cost = SF.restackRegions(map, selected, v.need);
    Object.assign(r, SF.anchorRegion(r));
    commit(true);
    afterPaint();
    SF.toast && SF.toast(was + ' lines to ' + v.need
      + (cost && cost.over ? ' — the slide is now ' + cost.over + ' lines over' : ''));
  }

  /* Drop the whole map rather than write regions that happen to match the
     theme, so the slide goes back to following its theme — including when the
     theme later changes. */
  function resetArrangement() {
    var s = slide();
    if (!s || !s.design || !s.design.regions) return;
    delete s.design.regions;
    selected = null;
    commit(false);
    setArranging(false);
    SF.toast && SF.toast('Arrangement reset — this slide follows its theme again.');
  }

  // ------------------------------------------------------------------- fit
  /* The last measurement, so the bar can speak without re-measuring on every
     repaint of its own text. */
  var verdict = [];

  /* Measured after a frame, not in the same tick as the paint that caused it:
     scrollHeight on a block whose font has not settled reports short, and a
     block would be declared to fit on the strength of a metric that is about to
     change. */
  function measure() {
    var rt = root();
    if (!rt || !arranging) return;
    requestAnimationFrame(function () {
      if (!arranging || rt !== root()) return;
      verdict = SF.latticeFit(rt);
      paintBar();
    });
  }

  function verdictFor(key) {
    return verdict.find(function (v) { return v.key === key; }) || null;
  }

  // --------------------------------------------------------------------- bar
  function paintBar() {
    var bar = document.getElementById('arrangeBar');
    if (!bar) return;
    bar.hidden = !arranging;
    bar.querySelectorAll('[data-arrange-needs-selection]').forEach(function (b) {
      /** @type {HTMLButtonElement} */ (b).disabled = !selected;
    });
    var map = regionsOf(slide());
    var region = selected && map && map[selected];
    var ax = /** @type {HTMLSelectElement|null} */ (document.getElementById('arrangeAnchorX'));
    var ay = /** @type {HTMLSelectElement|null} */ (document.getElementById('arrangeAnchorY'));
    if (ax) ax.value = (region && region.anchorX) || '';
    if (ay) ay.value = (region && region.anchorY) || '';
    var al = /** @type {HTMLSelectElement|null} */ (document.getElementById('arrangeAlignY'));
    if (al) al.value = (region && region.alignY) || '';
    /* Duplicate and Remove answer to a free block, not to any selection: a
       block the layout drew has no copy on the slide to duplicate and nothing
       to delete — removing it would mean removing the field it renders, which
       is the rail's job and a different act. Same asymmetry as ✕ in the art
       bar, and the title says why rather than the button just being dead. */
    var splitSel = /** @type {HTMLSelectElement|null} */ (document.getElementById('arrangeSplit'));
    if (splitSel) {
      var canCut = !!region && (region.cols > 1 || region.rows > 1);
      splitSel.disabled = !canCut;
      splitSel.title = !region ? 'Select a block to split'
        : !canCut ? 'A single cell cannot become two — make it wider or taller first'
        : 'Cut this block\'s ' + region.cols + ' columns or ' + region.rows
          + ' lines in two, and put a new block in the rest';
      /* An option for an axis with nothing to cut is offered and refused with
         a toast rather than hidden, because a select whose contents change as
         you move between blocks is harder to learn than one that always
         reads the same. */
    }
    var isFree = !!(selected && SF.freeBlockId && SF.freeBlockId(selected));
    var dup = /** @type {HTMLButtonElement|null} */ (document.getElementById('btnArrangeDuplicate'));
    if (dup) {
      /* Duplicate answers to two things: it must be an item the slide owns —
         a block the layout drew has no copy on the slide to make a second of
         — and the kind must allow it. The second used to be nobody's
         question; the key prefix was doing both jobs. */
      var held = SF.Arrange.selectedBlock && SF.Arrange.selectedBlock();
      var kindOf = held && SF.FREE_KINDS && SF.FREE_KINDS[held.kind];
      dup.disabled = !isFree || (kindOf ? kindOf.duplicates === false : false);
      dup.title = isFree ? 'Copy this block, one row below'
        : 'Only a block you added can be copied — this one is part of the layout';
    }
    var kill = /** @type {HTMLButtonElement|null} */ (document.getElementById('btnArrangeRemove'));
    if (kill) {
      /* Remove answers to both kinds now. Everything on the canvas can come
         off it, which is what leaves a slide blank to build on. */
      var can = !!(selected && SF.canDeleteBlock(slide(), selected));
      kill.disabled = !can;
      kill.title = !selected ? 'Select a block to take off the slide'
        : isFree ? 'Remove this item from the slide'
        : 'Take this off the slide. Its words are kept and the rail still edits them.';
    }
    /* The way back from a block taken off the slide. Hidden entirely when
       there is nothing to bring back, so it is not a dead control on every
       slide — and counted, because "one" and "all of them" are different
       decisions and the button should say which it is offering. */
    var back = /** @type {HTMLButtonElement|null} */ (document.getElementById('btnArrangeRestore'));
    if (back) {
      var off = SF.hiddenBlocksOf(slide()).length;
      back.hidden = !off;
      back.textContent = off > 1 ? '↩ Bring back ' + off : '↩ Bring back';
      back.title = off === 1
        ? 'Bring back the block taken off this slide'
        : 'Bring back the ' + off + ' blocks taken off this slide';
    }
    var fitBtn = /** @type {HTMLButtonElement|null} */ (document.getElementById('btnArrangeFit'));
    if (fitBtn) {
      var v0 = selected && verdictFor(selected);
      var need = v0 && v0.need;
      fitBtn.disabled = !selected || need == null || !region || need === region.rows;
      fitBtn.textContent = need != null && region && need !== region.rows
        ? '↕ Fit to text (' + need + ')' : '↕ Fit to text';
      fitBtn.title = need != null && region && need !== region.rows
        ? 'Give this block ' + need + ' lines instead of ' + region.rows
          + ', and push what is below it down'
        : 'This block already has the lines its words need';
    }
    var what = document.getElementById('arrangeWhat');
    if (!what) return;
    var over = verdict.filter(function (v) { return v.over; });
    if (selected) {
      var s = slide();
      var r = regionsOf(s) && regionsOf(s)[selected];
      var v = verdictFor(selected);
      var where = r ? ' · row ' + r.row + ', col ' + r.col + ' · ' + r.rows + 'r x ' + r.cols + 'c' : '';
      /* The number the author needs in order to act is the shortfall, so say
         what it needs rather than only that it does not fit. */
      var fit = !v ? ''
        : v.wide && v.need <= v.have ? ' — overflows sideways'
        : v.over ? ' — needs ' + v.need + ' lines, has ' + v.have
        /* Spare rows are the case where "text in rows" does something, so say
           how many there are rather than only that it fits. */
        : v.need != null && v.have > v.need ? ' — ' + v.need + ' of ' + v.have
            + ' lines used, ' + (v.have - v.need) + ' spare'
        : '';
      what.textContent = selected + where + fit;
      what.dataset.fit = v && v.over ? 'over' : 'ok';
      return;
    }
    what.textContent = !verdict.length ? 'Click a block'
      : over.length ? over.length + (over.length === 1 ? ' block does not fit' : ' blocks do not fit')
      : 'Click a block · all ' + verdict.length + ' fit';
    what.dataset.fit = over.length ? 'over' : 'ok';
  }

  function afterPaint() {
    if (arranging && arrangedSlide !== slide()) {
      setArranging(false);
      return;
    }
    if (selectedSlide && selectedSlide !== slide()) {
      selected = null;
      selectedSlide = null;
      verdict = [];
      if (cancelDrag) cancelDrag();
    }
    var rt = root();
    var b = box();
    if (b) b.classList.toggle('arranging', arranging);
    paintHandles(rt);
    if (!rt || !arranging) { paintBar(); return; }
    var s = slide();
    var map = regionsOf(s);
    rt.querySelectorAll('.sf-slot').forEach(function (slot) {
      var key = slot.getAttribute('data-block-key');
      /* A slot without a key is not a block this face owns — the lattice tags
         every cell it builds, so an untagged one came from somewhere else. */
      if (!key) return;
      var r = map && map[key];
      if (r) slot.setAttribute('data-span', r.rows + 'r x ' + r.cols + 'c');
      if (key === selected) slot.setAttribute('data-arrange-selected', '');
    });
    paintBar();
    measure();
  }

  function setArranging(on) {
    if (on && SF.HeaderFooterUI) SF.HeaderFooterUI.close();
    if (on && SF.Artwork && SF.Artwork.isEditing()) SF.Artwork.setEditing(false);
    if (cancelDrag) cancelDrag();
    arranging = !!on;
    arrangedSlide = arranging ? slide() : null;
    var hadSelection = !!selected;
    if (!arranging) { selected = null; verdict = []; clearGuides(); }
    var toggle = document.getElementById('btnArrange');
    if (toggle) {
      toggle.setAttribute('aria-pressed', String(arranging));
      toggle.textContent = arranging ? '▦ Layout' : '▤ Layout';
    }
    /* Seeding repaints on its own; when it finds the slide already latticed
       there is nothing to write and the canvas still has to be redrawn to put
       the grid and the handles on. */
    if (arranging && !seed() && SF.Editor && SF.Editor.refreshCanvas) SF.Editor.refreshCanvas();
    else if (!arranging && SF.Editor && SF.Editor.refreshCanvas) SF.Editor.refreshCanvas();
    /* Leaving the face drops the selection, and the rail draws whichever block
       the canvas is holding — so it has to be told, or it keeps the item's
       fields up for an item nothing is selecting any more. refreshCanvas
       redraws the thumbnails and the preview, not the inspector. */
    if (!arranging && hadSelection) syncRail();
    afterPaint();
  }

  var installed = false;
  function install() {
    if (installed) return;
    installed = true;
    var b = box();
    if (b) b.addEventListener('pointerdown', beginResize);
    if (b) b.addEventListener('pointerdown', beginDrag);
    var flip = document.getElementById('btnArrange');
    if (flip) flip.addEventListener('click', function () { setArranging(!arranging); });
    /* Named rather than positional: a mixed [id, cols, rows] literal infers
       (string|number)[], so the id could not be passed to getElementById
       without a cast that would hide a genuine mix-up. */
    var sizers = [
      { id: 'btnArrangeWider', cols: 1, rows: 0 },
      { id: 'btnArrangeNarrower', cols: -1, rows: 0 },
      { id: 'btnArrangeTaller', cols: 0, rows: 1 },
      { id: 'btnArrangeShorter', cols: 0, rows: -1 }
    ];
    sizers.forEach(function (sizer) {
      var el = document.getElementById(sizer.id);
      if (el) el.addEventListener('click', function () { resize(sizer.cols, sizer.rows); });
    });
    var reset = document.getElementById('btnArrangeReset');
    if (reset) reset.addEventListener('click', resetArrangement);
    var fit = document.getElementById('btnArrangeFit');
    if (fit) fit.addEventListener('click', fitToText);
    var centre = document.getElementById('btnArrangeCentre');
    if (centre) centre.addEventListener('click', centreInGrid);
    /* Both pickers are filled from FREE_KINDS rather than from markup, so a
       new kind appears in the arrange bar and on the canvas bar at once and
       the two can never offer different sets. */
    function wireAdder(id) {
      var found = /** @type {HTMLSelectElement|null} */ (document.getElementById(id));
      if (!found) return;
      /* Narrowed once, so the listener below does not re-widen it. */
      var picker = found;
      var keep = picker.options[0];
      picker.innerHTML = '';
      if (keep) picker.appendChild(keep);
      Object.keys(SF.FREE_KINDS || {}).forEach(function (kind) {
        var opt = document.createElement('option');
        opt.value = kind;
        opt.textContent = SF.FREE_KINDS[kind].label || kind;
        picker.appendChild(opt);
      });
      picker.addEventListener('change', function () {
        var kind = picker.value;
        picker.value = '';
        if (kind) addBlock(kind);
      });
    }
    wireAdder('arrangeAdd');
    wireAdder('canvasAddItem');
    var splitter = /** @type {HTMLSelectElement|null} */ (document.getElementById('arrangeSplit'));
    if (splitter) {
      var splitPicker = splitter;
      splitPicker.addEventListener('change', function () {
        /* "col:40" — the axis travels with the share, so one control offers
           both cuts and the option's own group says which is which. */
        var choice = String(splitPicker.value || '').split(':');
        splitPicker.value = '';
        if (choice.length === 2) splitRegion(choice[0], Number(choice[1]));
      });
    }
    var dup = document.getElementById('btnArrangeDuplicate');
    if (dup) dup.addEventListener('click', duplicateBlock);
    var kill = document.getElementById('btnArrangeRemove');
    if (kill) kill.addEventListener('click', removeBlock);
    var back = document.getElementById('btnArrangeRestore');
    if (back) back.addEventListener('click', function () {
      var s = slide();
      var n = s && SF.restoreAllBlocks(s);
      if (!n) return;
      commit(true);
      if (SF.Editor && SF.Editor.refreshCanvas) SF.Editor.refreshCanvas();
      afterPaint();
      SF.toast && SF.toast(n === 1 ? 'Block brought back.' : n + ' blocks brought back.');
    });
    ['X','Y'].forEach(function(axis){
      var control = /** @type {HTMLSelectElement|null} */ (document.getElementById('arrangeAnchor' + axis));
      if (!control) return;
      /* Bound after the guard: the listener closes over it, so the null check
         above proves nothing about what it holds when the event fires. */
      var picker = control;
      picker.addEventListener('change', function () {
        var map = regionsOf(slide()), r = selected && map && map[selected];
        if (!r) return;
        r['anchor' + axis] = picker.value;
        Object.assign(r,SF.anchorRegion(r));
        commit(true);afterPaint();
      });
    });
    /* Where the words sit inside the rows the region gave them. A different
       question from the anchors above, which move the region itself and leave
       the text at its top — a three-row region holding two rows of text could
       not put them in rows 2-3, which is the thing the lattice looked like it
       should already do. Deleted rather than stored when it is the default, so
       a region that has never chosen carries no key and renders as before. */
    var align = /** @type {HTMLSelectElement|null} */ (document.getElementById('arrangeAlignY'));
    if (align) {
      var alignPicker = align;
      alignPicker.addEventListener('change', function () {
        var map = regionsOf(slide()), r = selected && map && map[selected];
        if (!r) return;
        if (alignPicker.value) r.alignY = alignPicker.value;
        else delete r.alignY;
        commit(true);
        afterPaint();
      });
    }
    document.addEventListener('keydown', function (e) {
      /* One call, one value: box() twice is two lookups, and the guard on the
         first says nothing about the second. */
      var host = box();
      /* An item can be selected on the canvas without the Layout face being
         open, so a selection is reason enough to be here. It did not used to
         be: outside Layout this handler returned, Escape did nothing although
         the rail's own hint promised it deselected, and Delete fell through
         to the deck, where it deleted the whole slide out from under a
         selected item. */
      if ((!arranging && !selected) || (SF.Player && SF.Player.open) ||
          !host || !host.getClientRects().length) return;
      var from = /** @type {Element|null} */ (e.target);
      if (from && from.closest && from.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], dialog')) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        /* Inside the face Escape leaves it, which already drops the
           selection — that is long-standing and tested. Outside it there was
           nothing to leave and Escape did nothing at all, while the rail's
           own hint said it gave the slide's fields back. Now it does. */
        if (arranging) setArranging(false);
        else deselect();
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!selected) return;
        e.preventDefault();
        /* Handled either way. Falling through with a layout block selected
           would delete the slide it belongs to, which is not a smaller
           version of what was asked for. */
        e.stopImmediatePropagation();
        if (!removeBlock()) {
          SF.toast && SF.toast('Nothing to delete here.');
        }
        return;
      }
      if (!selected || e.metaKey || e.ctrlKey || e.altKey || !/^Arrow(Left|Right|Up|Down)$/.test(e.key)) return;
      var map = regionsOf(slide());
      var r = map && map[selected];
      if (!r) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      var dx = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      var dy = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
      if (e.shiftKey) { resize(dx, dy); return; }
      var g = L();
      /* A nudge is a small move and answers to the same rule as a big one. */
      var want = {
        col: clamp(r.col + dx, 1, g.cols - r.cols + 1),
        row: clamp(r.row + dy, 1, g.rows - r.rows + 1),
        cols: r.cols, rows: r.rows
      };
      var settled = settle(selected, want);
      if (!settled) { SF.toast && SF.toast('Something that cannot move is in the way.'); return; }
      if(dx)delete r.anchorX;
      if(dy)delete r.anchorY;
      applySettled(map, settled);
      commit(true);
      afterPaint();
    }, true);
    paintBar();
  }

  SF.Arrange = {
    install: install,
    afterPaint: afterPaint,
    /* The canvas bar offers the same ＋ Item the arrange bar does, so both
       call this rather than each growing their own copy of it. */
    addBlock: addBlock,
    /* Select an item from outside — a click on the canvas goes to the rail,
       and the corner handles have to come with it. Without this the rail said
       an item was selected while the canvas showed nothing to grab. */
    selectKey: function (key) {
      if (!key || String(key).indexOf('blocks.') !== 0) return;
      selected = key;
      selectedSlide = slide();
      afterPaint();
      /* afterPaint repaints the canvas; the rail has to be told too, or the
         handles appear on an item whose editor is no longer on screen. */
      if (SF.Editor && SF.Editor.refreshInspector) SF.Editor.refreshInspector();
    },
    /* Drop the canvas selection — the rail calls this when it deletes the
       block, so the handles do not outlive it. */
    deselect: deselect,
    /* Delete the selected item, if the selection is one that can go.
       @returns {boolean} whether it did. */
    removeSelected: removeBlock,
    /* Whether an item is selected on the canvas at all, Layout or not. */
    hasSelection: function () { return !!selected; },
    /* Which block the canvas has selected, so the inspector can edit it. */
    selectedBlock: function () {
      var id = selected ? SF.freeBlockId(selected) : null;
      var s = id ? slide() : null;
      return (s && SF.freeBlockById(s, id)) || null;
    },
    isArranging: function () { return arranging; },
    setArranging: setArranging
  };
}
