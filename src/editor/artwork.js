/* SlideForge — the art face.
   A slide has two faces. The content face is the one the editor has always
   shown: text boxes, bullets, the inspector. This is the other one — the theme
   decoration and any pictures the author placed, made movable for as long as
   the flip is up, and inert again the moment it is down.

   It exists because the decoration was unreachable. The theme manifest appends
   it aria-hidden, and every theme sheet declares pointer-events:none on it, so
   there was no gesture that could move, replace or remove a shape. The art is
   also shared: art.layouts lists the slide types it paints on, so one purple
   arch is every title slide's purple arch. Poses are therefore per slide —
   moving it here must not move it on slide nine — and a slide nobody has posed
   still follows the theme, including when the theme changes.

   Coordinates are true slide pixels (1280x720). The canvas is a scaled render
   of that, so a drag has to be divided by the scale on the way in; storing
   screen pixels would move the artwork every time the zoom changed. */

/* Moved out of js/artwork.js and under the editor, the third file filed with
 * the engine that owns it. It calls SF.Editor fifteen times and is one of the
 * three canvas faces — Artwork, Arrange, Header & footer — that share an
 * isOn/set contract in the inspector's face row. All three now live here.
 *
 * It installs rather than returns: the public surface is the single SF.Artwork
 * assignment at the bottom, unchanged.
 *
 * Nothing runs at load. SF.Artwork.install() is a method the shell calls from
 * init(), after every script has run, and it keeps doing exactly that — this
 * factory only defines the object. That is the difference from
 * src/editor/header-footer.js, which did build its panel at load and had to be
 * made lazy when it moved.
 */
export function installArtwork(SF) {

  var SLIDE_W = 1280;
  /* Big enough to be worth warning about, matching the editor's existing image
     pickers: the deck is kept in browser storage as one JSON blob, and data
     URLs are what pushes it over. */
  var BIG_IMAGE = 3.5 * 1024 * 1024;

  var editing = false;
  var selected = null;
  var selectedSlide = null;
  var cancelDrag = null;

  function box() { return document.getElementById('previewBox'); }
  function slide() { return SF.Editor && SF.Editor.currentSlide && SF.Editor.currentSlide(); }

  function commit(repaint) {
    if (SF.Editor && SF.Editor.commitActivityChange) SF.Editor.commitActivityChange();
    if (repaint && SF.Editor && SF.Editor.refreshCanvas) SF.Editor.refreshCanvas();
  }

  /** The art record for a slide, created only when something is actually posed. */
  function artOf(s, make) {
    if (!s) return null;
    if (!s.art && make) s.art = { poses: {}, pictures: [] };
    if (s.art && make) {
      if (!s.art.poses) s.art.poses = {};
      if (!Array.isArray(s.art.pictures)) s.art.pictures = [];
    }
    return s.art || null;
  }

  /* The rendered slide is scaled to fit the canvas; a drag arrives in screen
     pixels and has to be stored in slide pixels or the same pose would mean a
     different place at every zoom level. */
  /* Screen pixels per slide pixel, measured on the slide rather than the box
     around it. The box is always 16:9 and the slide is fitted inside it by
     the smaller of the two ratios, so on a 4:3 or 16:10 deck the box is wider
     than the slide: a shape then moved about three-quarters of the way the
     pointer did on 4:3, and nine-tenths on 16:10. Arrange already measured
     .slide; this measured #previewBox. */
  function scaleOf(root) {
    var node = root && root.matches && root.matches('.slide') ? root
      : (root && root.querySelector && root.querySelector('.slide')) || root;
    var w = node ? node.getBoundingClientRect().width : 0;
    return w > 0 ? w / SLIDE_W : 1;
  }

  /* What a pointer landed on, if it is artwork: either a theme shape (keyed by
     the manifest's class) or a placed picture (keyed by its id). */
  /* A latticed picture is deliberately not findable here. It is a block, so
     the Layout face moves and sizes it by cell range and this face would be a
     second, disagreeing way to place the same thing — which is the fork the
     whole region model exists to avoid. */
  function targetOf(node) {
    var shape = node.closest && node.closest('.theme-art > *');
    if (shape) return { kind: 'shape', key: shape.getAttribute('data-art-key'), node: shape };
    var pic = node.closest && node.closest('.slide-art-img');
    if (pic) return { kind: 'picture', key: pic.getAttribute('data-art-pic'), node: pic };
    return null;
  }

  function pictureById(s, id) {
    var art = artOf(s);
    if (!art || !Array.isArray(art.pictures)) return null;
    return art.pictures.find(function (p) { return String(p.id) === String(id); }) || null;
  }

  /* Where a shape sits right now, whether or not it has been posed before.
     Read from the render rather than from the theme sheet, so the first move of
     a shape the author has never touched continues from where the theme put it
     instead of jumping to the origin.

     Measured with offsetLeft/offsetTop, in the coordinate space that
     node.style.left actually resolves in — the shape's own offsetParent, which
     is the theme's art layer. It used to be measured off the canvas instead:
     the shape's screen rect minus #previewBox's, divided by the slide scale.
     That is slide space, and the art layer is not the slide — a studio title's
     layer measures 219x233 inside a 1280-wide slide — so the number written
     into `left` was never the number read back out of it. Every nudge then
     added the shape's whole current offset rather than one pixel: one press of
     ArrowRight moved it 1px, the next moved it 874, the next 860. A drag
     compounded the same way on its second go.

     A transform does not move a box in layout, so pose.scale and pose.x are
     independent here, which is what lets them be set in either order. */
  function originOf(target, root) {
    if (target.kind === 'picture') {
      var pic = pictureById(slide(), target.key);
      return { x: (pic && pic.x) || 0, y: (pic && pic.y) || 0 };
    }
    var node = target.node;
    if (node.offsetParent) return { x: Math.round(node.offsetLeft), y: Math.round(node.offsetTop) };
    /* No offsetParent means the node is not rendered (display:none, or a
       detached measure pass); fall back to the pose it carries. */
    var pose = readPose(target);
    return { x: Math.round(pose.x || 0), y: Math.round(pose.y || 0) };
  }

  function writePose(target, patch) {
    var s = slide();
    var art = artOf(s, true);
    if (!art) return;
    if (target.kind === 'picture') {
      var pic = pictureById(s, target.key);
      if (pic) Object.assign(pic, patch);
      return;
    }
    art.poses[target.key] = Object.assign({}, art.poses[target.key], patch);
  }

  function readPose(target) {
    var s = slide();
    if (target.kind === 'picture') return pictureById(s, target.key) || {};
    var art = artOf(s);
    return (art && art.poses && art.poses[target.key]) || {};
  }

  function select(target) {
    var root = box();
    if (!root) return;
    root.querySelectorAll('[data-art-selected]').forEach(function (n) {
      n.removeAttribute('data-art-selected');
    });
    selected = target;
    selectedSlide = target ? slide() : null;
    if (target) target.node.setAttribute('data-art-selected', '');
    paintBar();
  }

  /* Hidden shapes are still drawn on the art face, ghosted, or hiding one would
     be a one-way door — there would be nothing left to click to bring it back. */
  function markHidden(root) {
    if (!root) return;
    var s = slide();
    var art = artOf(s);
    root.querySelectorAll('[data-art-key]').forEach(function (n) {
      var pose = art && art.poses && art.poses[n.getAttribute('data-art-key')];
      if (pose && pose.hidden) {
        n.setAttribute('data-art-hidden', '');
        n.style.display = 'block';
      } else n.removeAttribute('data-art-hidden');
    });
    root.querySelectorAll('[data-art-pic]').forEach(function (n) {
      var pic = pictureById(s, n.getAttribute('data-art-pic'));
      n.toggleAttribute('data-art-hidden', !!(pic && pic.hidden));
    });
  }

  // ------------------------------------------------------------------ drag
  function beginDrag(e) {
    if (!editing || e.button !== 0 || e.isPrimary === false) return;
    if (cancelDrag) cancelDrag();
    var root = box();
    if (!root) return;
    var target = targetOf(e.target);
    if (!target) { select(null); return; }
    e.preventDefault();
    select(target);
    /* Bound once, after the guard above, because the drag handlers below close
       over it: a captured `target` could in principle be reassigned before they
       run, so nothing downstream can rely on the null check. This is the thing
       that was picked, and it does not change for the life of the drag. */
    var picked = target;
    var owner = slide();
    var scale = scaleOf(root);
    var start = originOf(picked, root);
    var fromX = e.clientX;
    var fromY = e.clientY;
    var moved = false;

    function move(ev) {
      var dx = Math.round((ev.clientX - fromX) / scale);
      var dy = Math.round((ev.clientY - fromY) / scale);
      if (!moved && Math.abs(dx) < 2 && Math.abs(dy) < 2) return;
      moved = true;
      var x = start.x + dx;
      var y = start.y + dy;
      /* Painting straight onto the node keeps the drag at pointer speed; the
         pose is written once on release, so one drag is one undo step. */
      picked.node.style.left = x + 'px';
      picked.node.style.top = y + 'px';
      picked.node.style.right = 'auto';
      picked.node.style.bottom = 'auto';
      picked.node.dataset.artDragX = String(x);
      picked.node.dataset.artDragY = String(y);
    }
    function cleanup() {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', cancel);
      window.removeEventListener('blur', cancel);
      cancelDrag = null;
    }
    function cancel() {
      cleanup();
      if (SF.Editor && SF.Editor.refreshCanvas) SF.Editor.refreshCanvas();
    }
    function up() {
      cleanup();
      if (slide() !== owner || !editing) return;
      if (!moved) return;
      writePose(picked, {
        x: Number(picked.node.dataset.artDragX),
        y: Number(picked.node.dataset.artDragY)
      });
      commit(false);
      SF.toast && SF.toast('Moved. This slide only — other slides keep the theme.');
    }
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', cancel);
    window.addEventListener('blur', cancel);
    cancelDrag = cancel;
  }

  // --------------------------------------------------------------- actions
  /* Behind the words or in front of them. One control, two values, because
     those are the only two crossings the fixed stack made impossible — a
     picture could not go behind the text, a theme shape could not come in
     front of a picture. Ordering within a layer already worked: two pictures
     stack in array order.

     Stored on the item, not on the slide, so two pictures on one slide can sit
     on opposite sides of the text. */
  function setOrder(side) {
    if (!selected || (side !== 'back' && side !== 'front')) return;
    writePose(selected, { order: side });
    commit(true);
    afterPaint();
    /* Said rather than left to be noticed: putting a picture in front of the
       words is how a slide gets blanked, and the deck review is where that
       now shows up. */
    if (side === 'front' && selected && selected.kind === 'picture') {
      SF.toast && SF.toast('In front of the words. Review slides & check fit will say if it covers them.');
    }
  }

  /* Free by coordinates, or a block on the lattice. Moving one onto the
     lattice seeds a region from where it already is, so it does not jump; the
     x/y/w it had are kept, so moving it back puts it where it was. */
  function setPlacement(where) {
    if (!selected || selected.kind !== 'picture') return;
    var s = slide();
    var pic = pictureById(s, selected.key);
    if (!pic) return;
    var key = SF.artBlockKey(pic.id);
    var map = (s.design && s.design.regions) || null;
    if (where === 'lattice') {
      pic.place = 'lattice';
      if (!s.design) s.design = {};
      if (!s.design.regions) s.design.regions = {};
      map = s.design.regions;
      if (!map[key]) {
        /* One lookup, then read from it: box() twice is two lookups and the
           guard on the first says nothing about the second. */
        var host = box();
        var g = SF.latticeGeometry(host && host.querySelector('.slide'));
        var col = Math.max(1, Math.min(g.cols, Math.round((pic.x || 0) / g.stepX) + 1));
        var row = Math.max(1, Math.min(g.rows, Math.round((pic.y || 0) / g.stepY) + 1));
        var cols = Math.max(1, Math.min(g.cols - col + 1, Math.round((pic.w || 360) / g.stepX)));
        map[key] = { col: col, row: row, cols: cols, rows: Math.max(2, Math.round(cols * 0.6)) };
      }
      SF.toast && SF.toast('On the lattice. Use Layout to move and size it.');
    } else {
      delete pic.place;
      /* The region is left in place rather than deleted: moving it back onto
         the lattice should return it to the cells it had, not start again. */
      SF.toast && SF.toast('Free again. Drag to move it.');
    }
    selected = null;
    commit(true);
    afterPaint();
  }

  function toggleHidden() {
    if (!selected) return;
    var pose = readPose(selected);
    writePose(selected, { hidden: !pose.hidden });
    commit(true);
    afterPaint();
  }

  /* Delete removes a placed picture outright — it is the author's own asset and
     a data URL is worth reclaiming. A theme shape cannot be deleted, only
     hidden: it belongs to the theme, and the slide has no copy of it to restore
     from if the theme is later swapped. */
  function removeSelected() {
    if (!selected) return;
    if (selected.kind === 'shape') return toggleHidden();
    var s = slide();
    var art = artOf(s);
    if (!art) return;
    art.pictures = art.pictures.filter(function (p) { return String(p.id) !== String(selected.key); });
    selected = null;
    commit(true);
    afterPaint();
  }

  function resizeSelected(by) {
    if (!selected) return;
    var pose = readPose(selected);
    if (selected.kind === 'picture') {
      var w = Math.max(40, Math.round((pose.w || selected.node.getBoundingClientRect().width / scaleOf(box())) + by));
      writePose(selected, { w: w });
    } else {
      var scale = Math.max(0.2, Math.round(((pose.scale || 1) + by / 200) * 100) / 100);
      writePose(selected, { scale: scale });
    }
    commit(true);
    afterPaint();
  }

  /* Reset drops this slide's disagreement with the theme, rather than writing a
     pose that happens to match it — so the slide goes back to following the
     theme, including when the theme later changes. */
  function resetArt() {
    var s = slide();
    if (!s || !s.art) return;
    var kept = (s.art.pictures || []).length;
    s.art.poses = {};
    selected = null;
    if (!kept) delete s.art;
    commit(true);
    afterPaint();
    SF.toast && SF.toast(kept ? 'Theme artwork reset. Your pictures are still here.' : 'Theme artwork reset.');
  }

  function addPicture(file) {
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      SF.toast && SF.toast('Choose an image file.');
      return;
    }
    var owner = slide();
    if (!owner) return;
    if (file.size > BIG_IMAGE) {
      SF.toast && SF.toast('That image is over 3.5 MB — it may exceed the browser storage limit.');
    }
    var fr = new FileReader();
    fr.onload = function () {
      // Do not attach a delayed read to a different slide or an old undo snapshot.
      if (slide() !== owner) {
        SF.toast && SF.toast('Slide changed. Select the picture again on the intended slide.');
        return;
      }
      var s = owner;
      var art = artOf(s, true);
      if (!art) return;
      /* Placed a little in from the top-left rather than at the origin, so a new
         picture is never hiding under the slide's own edge furniture. */
      var id = 'pic-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      art.pictures.push({
        id: id,
        src: String(fr.result),
        x: 120, y: 120, w: 360, alt: ''
      });
      commit(true);
      afterPaint();
      var host = box();
      var node = host && host.querySelector('[data-art-pic="' + id + '"]');
      if (node && editing) select({kind: 'picture', key: id, node: node});
      SF.toast && SF.toast('Picture placed. Drag to move it, − / + to size it.');
    };
    fr.onerror = function () { SF.toast && SF.toast('Could not read that picture. Please try another file.'); };
    fr.readAsDataURL(file);
  }

  // ------------------------------------------------------------------- bar
  function paintBar() {
    var bar = document.getElementById('artBar');
    if (!bar) return;
    bar.hidden = !editing;
    var has = !!selected;
    var isShape = has && selected.kind === 'shape';
    var pose = has ? readPose(selected) : {};
    bar.querySelectorAll('[data-art-needs-selection]').forEach(function (b) {
      /** @type {HTMLButtonElement} */ (b).disabled = !has;
    });
    var hide = document.getElementById('btnArtHide');
    if (hide) hide.textContent = pose.hidden ? '◉ Show' : '◌ Hide';
    var order = /** @type {HTMLSelectElement|null} */ (document.getElementById('artOrder'));
    if (order) {
      /* The default differs by what is selected, and saying so is the point:
         a placed picture has always been in front, a theme shape behind. */
      order.value = SF.artOrder(pose, isShape ? 'back' : 'front');
      order.disabled = !has;
      order.title = 'Whether this artwork paints behind the words or over them';
    }
    var place = /** @type {HTMLSelectElement|null} */ (document.getElementById('artPlace'));
    if (place) {
      var pic = has && selected.kind === 'picture' ? pictureById(slide(), selected.key) : null;
      place.disabled = !pic;
      place.value = pic ? SF.artPlacement(pic) : 'free';
      place.title = pic
        ? 'Free is placed by hand and can bleed off the slide. On the lattice it is a block: '
          + 'it takes rows and columns and the others push away from it.'
        : 'Only a picture you placed can move onto the lattice — a theme shape belongs to the theme';
    }
    var del = /** @type {HTMLButtonElement|null} */ (document.getElementById('btnArtDelete'));
    if (del) {
      del.disabled = !has || isShape;
      del.title = isShape
        ? 'Theme shapes belong to the theme — hide it instead'
        : 'Remove this picture from the slide';
    }
    var what = document.getElementById('artWhat');
    if (what) {
      what.textContent = !has
        ? 'Click a shape or picture'
        : (isShape ? 'Theme shape · ' + selected.key : 'Your picture');
    }
  }

  /* The canvas is rebuilt by the editor, so anything the art face added to it —
     the selection ring, the ghost on a hidden shape — has to go back on after
     every repaint. */
  function afterPaint() {
    var root = box();
    if (!root) return;
    /* By id, as in arrange.js: after an undo the slide is a new object and
       the same slide, and the selection should survive it. */
    var now = slide();
    if (selectedSlide && now && selectedSlide.id === now.id) selectedSlide = now;
    if (selectedSlide && !(now && selectedSlide.id === now.id)) {
      selected = null;
      selectedSlide = null;
      if (cancelDrag) cancelDrag();
    }
    root.classList.toggle('art-editing', editing);
    if (!editing) { paintBar(); return; }
    markHidden(root);
    if (selected) {
      var again = selected.kind === 'picture'
        ? root.querySelector('[data-art-pic="' + selected.key + '"]')
        : root.querySelector('[data-art-key="' + selected.key + '"]');
      if (again) { selected.node = again; again.setAttribute('data-art-selected', ''); }
      else selected = null;
    }
    paintBar();
  }

  function setEditing(on) {
    if (on && SF.HeaderFooterUI) SF.HeaderFooterUI.close();
    if (on && SF.Arrange && SF.Arrange.isArranging()) SF.Arrange.setArranging(false);
    if (cancelDrag) cancelDrag();
    editing = !!on;
    if (!editing) selected = null;
    var toggle = document.getElementById('btnArtFlip');
    if (toggle) {
      toggle.setAttribute('aria-pressed', String(editing));
      toggle.textContent = editing ? '◆ Artwork' : '◇ Artwork';
    }
    if (SF.Editor && SF.Editor.refreshCanvas) SF.Editor.refreshCanvas();
    afterPaint();
  }

  /* The shell installs engines once, but a second call must not double-bind:
     two handlers on the flip would toggle the mode twice per click and leave it
     exactly where it started, which reads as a dead button. */
  var installed = false;
  function install() {
    if (installed) return;
    installed = true;
    var root = box();
    if (root) root.addEventListener('pointerdown', beginDrag);
    var flip = document.getElementById('btnArtFlip');
    if (flip) flip.addEventListener('click', function () { setEditing(!editing); });
    var hide = document.getElementById('btnArtHide');
    if (hide) hide.addEventListener('click', toggleHidden);
    var del = document.getElementById('btnArtDelete');
    if (del) del.addEventListener('click', removeSelected);
    var bigger = document.getElementById('btnArtBigger');
    if (bigger) bigger.addEventListener('click', function () { resizeSelected(40); });
    var smaller = document.getElementById('btnArtSmaller');
    if (smaller) smaller.addEventListener('click', function () { resizeSelected(-40); });
    var reset = document.getElementById('btnArtReset');
    if (reset) reset.addEventListener('click', resetArt);
    var order = /** @type {HTMLSelectElement|null} */ (document.getElementById('artOrder'));
    if (order) {
      /* Bound after the guard, because the listener closes over it and the
         null check above says nothing about what it holds when the event
         fires. */
      var picker = order;
      picker.addEventListener('change', function () { setOrder(picker.value); });
    }
    var place = /** @type {HTMLSelectElement|null} */ (document.getElementById('artPlace'));
    if (place) {
      var placePicker = place;
      placePicker.addEventListener('change', function () { setPlacement(placePicker.value); });
    }
    var pick = /** @type {HTMLInputElement|null} */ (document.getElementById('artPicture'));
    if (pick) {
      var input = pick;
      input.addEventListener('change', function () {
        addPicture(input.files && input.files[0]);
        input.value = '';
      });
    }
    /* Escape leaves the art face rather than only dropping the selection: it is
       a mode, and a mode needs one obvious way out. */
    document.addEventListener('keydown', function (e) {
      var host = box();
      if (!editing || (SF.Player && SF.Player.open) || !host || !host.getClientRects().length) return;
      var from = /** @type {Element|null} */ (e.target);
      if (from && from.closest && from.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], dialog')) return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); setEditing(false); return; }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (selected && /^Arrow(Left|Right|Up|Down)$/.test(e.key)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        var pos = originOf(selected, box());
        var step = e.shiftKey ? 10 : 1;
        writePose(selected, {
          x: pos.x + (e.key === 'ArrowRight' ? step : e.key === 'ArrowLeft' ? -step : 0),
          y: pos.y + (e.key === 'ArrowDown' ? step : e.key === 'ArrowUp' ? -step : 0)
        });
        commit(true);
        afterPaint();
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected) {
        var tag = document.activeElement && document.activeElement.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        e.preventDefault();
        e.stopImmediatePropagation();
        removeSelected();
      }
    }, true);
    paintBar();
  }

  SF.Artwork = {
    install: install,
    /** Called by the editor after it rebuilds the canvas. */
    afterPaint: afterPaint,
    isEditing: function () { return editing; },
    setEditing: setEditing
  };
}
