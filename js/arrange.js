/* SlideForge — arranging content by region.
   The third face of a slide, after content and artwork: where each block sits.

   A drag here never stores a coordinate. It stores a cell range on the 16x12
   lattice — col, row and spans — because free-form {x,y,w,h} forfeits reflow,
   re-theming, aspect export and print, and a slide that has been pinned to
   pixels can never be re-themed or re-exported without being rebuilt by hand.
   Snapping is therefore not a convenience laid over free movement: the cell IS
   the unit, and the guides only report which edges a cell happens to line up
   with once it lands.

   Seeding matters as much as the drag. Entering this face on a slide that has
   never been arranged reads where the theme has already put each block and
   writes that as its region, so nothing moves at the moment the lattice comes
   on. Only once the author drags does the slide actually disagree with its
   theme. */
(function (global) {
  'use strict';
  var SF = global.SF;
  if (!SF) return;

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

  /* Where the theme has already put a block, as a cell range. Rounded to the
     nearest cell for the origin and up for the span, so seeding never makes a
     block smaller than the room it is already using. */
  function measureRegion(node, r, scale) {
    var g = L();
    var a = node.getBoundingClientRect();
    var x = (a.left - r.left) / scale - g.left;
    var y = (a.top - r.top) / scale - g.top;
    var col = clamp(Math.round(x / g.stepX) + 1, 1, g.cols);
    var row = clamp(Math.round(y / g.stepY) + 1, 1, g.rows);
    var cols = clamp(Math.ceil(a.width / scale / g.stepX), 1, g.cols - col + 1);
    var rows = clamp(Math.ceil(a.height / scale / g.stepY), 1, g.rows - row + 1);
    return { col: col, row: row, cols: cols, rows: rows };
  }

  /* Read the arrangement the theme is already producing and write it down. All
     blocks at once: placing one and leaving the rest in flow would reflow the
     ones left behind, so the first drag would appear to move everything. */
  function seed() {
    var s = slide();
    var rt = root();
    if (!s || !rt) return false;
    if (rt.classList.contains('sf-latticed')) return false;
    var host = SF.latticeHost(rt);
    if (!host) return false;
    var kids = Array.prototype.slice.call(host.children).filter(function (n) {
      return n.nodeType === 1;
    });
    if (!kids.length) return false;
    var scale = scaleOf(rt);
    var r = rt.getBoundingClientRect();
    var map = regionsOf(s, true);
    kids.forEach(function (node, i) {
      map[SF.blockKeyOf(node, i)] = measureRegion(node, r, scale);
    });
    commit(true);
    return true;
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
  }

  function beginDrag(e) {
    if (!arranging || e.button !== 0 || e.isPrimary === false) return;
    if (cancelDrag) cancelDrag();
    var slot = e.target.closest && e.target.closest('.sf-slot');
    if (!slot) { select(null); return; }
    e.preventDefault();
    select(slot);
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
      if (slide() !== s || !arranging) return;
      if (!moved) return;
      map[key] = landed;
      commit(true);
      afterPaint();
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
    r.cols = clamp(r.cols + dCols, 1, r.anchorX ? g.cols : g.cols - r.col + 1);
    r.rows = clamp(r.rows + dRows, 1, r.anchorY ? g.rows : g.rows - r.row + 1);
    Object.assign(r, SF.anchorRegion(r));
    commit(true);
    afterPaint();
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
    afterPaint();
  }

  var installed = false;
  function install() {
    if (installed) return;
    installed = true;
    var b = box();
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
      if (!arranging || (SF.Player && SF.Player.open) || !host || !host.getClientRects().length) return;
      var from = /** @type {Element|null} */ (e.target);
      if (from && from.closest && from.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], dialog')) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        setArranging(false);
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
      if(dx)delete r.anchorX;
      if(dy)delete r.anchorY;
      r.col = clamp(r.col + dx, 1, g.cols - r.cols + 1);
      r.row = clamp(r.row + dy, 1, g.rows - r.rows + 1);
      commit(true);
      afterPaint();
    }, true);
    paintBar();
  }

  SF.Arrange = {
    install: install,
    afterPaint: afterPaint,
    isArranging: function () { return arranging; },
    setArranging: setArranging
  };
})(window);
