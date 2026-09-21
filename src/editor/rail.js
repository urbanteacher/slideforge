/* The rail: the column of slides down the left of Lesson studio, and every way
 * of reordering them — drag, carry (⌘X), the nudges, and the slide sorter.
 *
 * Moved out of js/editor.js, where it was 746 of 3,335 lines under four of that
 * file's own banners — rail, carrying a slide, dragging, slide sorter — with
 * find-and-replace and paste wedged between the two halves. Those 231 lines are
 * about the document, not the rail, and stay where they were.
 *
 * 33 functions move; 18 of them were already private to this subject and stay
 * private now. `deck` is read forty times and never written, so it comes in as
 * a read accessor. `sel` is read thirty times and written seven, so it comes in
 * as a read accessor plus setSel — safe because no function reads it again
 * after writing it, which was checked rather than assumed.
 *
 * `placing` and `placeAt` used to be read from outside: js/editor.js cleared
 * them in setDoc and tested them in its key handler. They are this module's
 * state, so the module answers instead — isPlacing, placeTarget, resetPlacing.
 *
 * This is arranging *slides in the deck*. src/editor/arrange.js arranges
 * *blocks on the lattice*; the two are different subjects with similar names.
 */
export function createRail(SF, helpers) {
  const {el, $, touched, draw, current, drawInspector, addSlide,
         restoreHistory, gameFor, slideOpts, openActivityLibrary, setSel} = helpers;

  /* ------------------------------------------------------------ rail

     Two ways to reorder, because they answer different questions.

     Dragging is right for a slide that has drifted a place or two. It is
     hopeless for "this belongs at the front", which on a fifty-slide deck is a
     four-thousand-pixel drag through a six-hundred-pixel window. So a slide can
     also be picked up (⌘X), carried while you scroll, read and think, and put
     down somewhere else. The mouse button is never held, so nothing is racing
     you and the rail still scrolls normally.

     Both paths speak the same two words. A *slot* is the gap between two
     slides, numbered 0..length — reordering moves a slide into a slot, never
     onto another slide, which is what makes "above or below this one?"
     answerable. The caret is drawn in the slot, so what you see is exactly
     where it lands. */

  var dragFrom = null;   /* index being dragged, or null */
  var placing = null;    /* index being carried by ⌘X, or null */
  var placeAt = null;    /* slot the carried slide would land in */
  var caretAt = null;    /* slot the caret is currently drawn in */

  /** Move slides into a slot, keeping their order among themselves.

      `at` is a slot in the array as it stands *now*, which is the only frame
      the caret can honestly point at — so the arithmetic has to account for the
      slides being lifted out of it. Doing that by walking the deck once and
      dropping the moved run in when the slot comes round is both easier to read
      than index bookkeeping and correct for a scattered selection, which is
      what the sorter hands it.

      @param {number[]} indices which slides to move
      @param {number} at the slot they should land in
      @returns {number} the moved run's new first index, or -1 for a no-op */
  function reorder(indices, at) {
    var deck = helpers.deck();
    var picked = indices.slice().sort(function (a, b) { return a - b; });
    if (!picked.length) return -1;
    at = Math.max(0, Math.min(deck.slides.length, at));
    var taken = {};
    picked.forEach(function (i) { taken[i] = true; });
    var moved = picked.map(function (i) { return deck.slides[i]; });
    var next = [], landed = -1;
    for (var i = 0; i <= deck.slides.length; i++) {
      if (i === at) { landed = next.length; next = next.concat(moved); }
      if (i < deck.slides.length && !taken[i]) next.push(deck.slides[i]);
    }
    if (next.length !== deck.slides.length) return -1;
    var same = next.every(function (slide, i) { return slide === deck.slides[i]; });
    if (same) return -1;
    deck.slides.length = 0;
    for (var n = 0; n < next.length; n++) deck.slides.push(next[n]);
    return landed;
  }

  /** The rail's case: one slide into one slot. */
  function moveSlide(from, at) {
    var deck = helpers.deck();
    if (from == null || at == null || !deck.slides[from]) return false;
    var landed = reorder([from], at);
    if (landed < 0) return false;
    setSel(landed);
    return true;
  }

  /** Which slot a pointer resting on this row means: above it or below it. */
  function slotFor(row, clientY) {
    var i = Number(row.dataset.i);
    var box = row.getBoundingClientRect();
    return clientY < box.top + box.height / 2 ? i : i + 1;
  }

  /** @returns {HTMLElement|null} the slot the caret now sits in */
  function showCaret(at) {
    var rail = $('railList');
    if (!rail) return null;
    /* dragover fires on every pointer move, mostly over the same half of the
       same row, so only touch the DOM when the answer has actually changed. */
    if (at === caretAt) return at == null ? null : /** @type {HTMLElement|null} */ (
      rail.querySelector('.rail-slot.at'));
    caretAt = at;
    var was = rail.querySelectorAll('.rail-slot.at');
    for (var i = 0; i < was.length; i++) was[i].classList.remove('at');
    var slot = /** @type {HTMLElement|null} */ (
      at == null ? null : rail.querySelector('.rail-slot[data-at="' + at + '"]'));
    if (slot) slot.classList.add('at');
    return slot;
  }

  function focusThumb(i) {
    var rail = $('railList');
    var row = /** @type {HTMLElement|null} */ (
      rail && rail.querySelector('.thumb[data-i="' + i + '"]'));
    if (!row) return;
    row.focus();
    row.scrollIntoView({ block: 'nearest' });
  }

  /* ------------------------------------------------- carrying a slide */

  function beginPlacing(i) {
    var deck = helpers.deck();
    if (!deck.slides[i] || placing != null) return;
    setSel(i);
    placing = i;
    placeAt = i;
    draw();
    var slot = showCaret(placeAt);
    if (slot) slot.focus();
  }

  function movePlaceTo(at) {
    var deck = helpers.deck();
    if (placing == null) return;
    placeAt = Math.max(0, Math.min(deck.slides.length, at));
    var slot = showCaret(placeAt);
    if (slot) { slot.focus(); slot.scrollIntoView({ block: 'nearest' }); }
    drawPlacingBar();
  }

  function commitPlacing(at) {
    var sel = helpers.sel();
    if (placing == null) return;
    var from = placing;
    var to = at == null ? placeAt : at;
    placing = null; placeAt = null; caretAt = null;
    if (moveSlide(from, to)) touched();
    draw();
    focusThumb(sel);
  }

  function cancelPlacing() {
    var sel = helpers.sel();
    if (placing == null) return;
    placing = null; placeAt = null; caretAt = null;
    draw();
    focusThumb(sel);
  }

  /* The band above the rail while a slide is in hand. It says which slide is
     being carried and which position it would land in — the position, not the
     slot, because "lands at 1" is the thing being asked for and "slot 0" is
     bookkeeping. */
  function drawPlacingBar() {
    var deck = helpers.deck();
    var UI = helpers.UI();
    var rail = $('railList');
    var host = rail && rail.parentNode;
    if (!rail || !host) return;
    var found = host.querySelector('.rail-placing');
    if (placing == null) { if (found) host.removeChild(found); return; }
    var bar = /** @type {HTMLElement} */ (found || el('div', 'rail-placing'));
    if (!found) host.insertBefore(bar, rail);
    bar.innerHTML = '';
    var s = deck.slides[placing];
    var lands = placeAt > placing ? placeAt : placeAt + 1;
    bar.appendChild(el('strong', null, 'Carrying slide ' + (placing + 1) + ' → lands at ' + lands));
    bar.appendChild(el('span', 'rail-placing-what', s.title || SF.SLIDE_TYPES[s.type].label));
    bar.appendChild(el('span', 'rail-placing-hint',
      '↑ ↓ Home End to choose a place · Enter to drop it · Esc to cancel'));
    bar.appendChild(UI.button('Cancel', 'ghost', cancelPlacing));
  }

  /* --------------------------------------------------------- dragging */

  /* Native drag fires no events while the pointer sits still, so a drag that
     has to cross more of the deck than the rail can show needs the rail to come
     to it. Ramped by how far into the margin the pointer is, so easing towards
     the edge reads as "faster", not as a switch being thrown. */
  /** @type {{ y: number|null, raf: number }} */
  var scroller = { y: null, raf: 0 };
  function autoScroll() {
    scroller.raf = 0;
    var rail = $('railList');
    if (!rail || scroller.y == null) return;
    var box = rail.getBoundingClientRect();
    var margin = 56, top = 0;
    if (scroller.y < box.top + margin) top = (scroller.y - box.top - margin) / margin;
    else if (scroller.y > box.bottom - margin) top = (scroller.y - box.bottom + margin) / margin;
    if (top) rail.scrollTop += Math.max(-1, Math.min(1, top)) * 18;
    scroller.raf = requestAnimationFrame(autoScroll);
  }

  function endDrag() {
    dragFrom = null;
    scroller.y = null;
    if (scroller.raf) cancelAnimationFrame(scroller.raf);
    scroller.raf = 0;
    showCaret(placing == null ? null : placeAt);
    var rail = $('railList');
    if (rail) rail.classList.remove('dragging');
  }

  function dropAt(at) {
    var sel = helpers.sel();
    var from = dragFrom;
    endDrag();
    if (!moveSlide(from, at)) return;
    touched();
    draw();
    focusThumb(sel);
  }

  function wireDrag(row) {
    row.addEventListener('dragstart', function (e) {
      dragFrom = Number(row.dataset.i);
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', String(dragFrom)); } catch (err) {}
      var rail = $('railList');
      if (rail) rail.classList.add('dragging');
    });
    /* Abandoning a drag has to clear the held index too. It used to be cleared
       only by a successful drop, so a drag released over the stage left the rail
       believing a slide was still in the air. */
    row.addEventListener('dragend', endDrag);
    row.addEventListener('dragover', function (e) {
      if (dragFrom == null) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      showCaret(slotFor(row, e.clientY));
    });
    row.addEventListener('drop', function (e) {
      if (dragFrom == null) return;
      e.preventDefault();
      dropAt(slotFor(row, e.clientY));
    });
  }

  /* ------------------------------------------------------------ drawing */

  function railSlot(at) {
    var deck = helpers.deck();
    var slot = el('div', 'rail-slot');
    slot.dataset.at = String(at);
    if (placing != null) {
      slot.tabIndex = 0;
      slot.setAttribute('role', 'button');
      slot.setAttribute('aria-label', at >= deck.slides.length
        ? 'Drop after the last slide'
        : 'Drop before slide ' + (at + 1));
      slot.onclick = function (e) { e.stopPropagation(); commitPlacing(at); };
      slot.onfocus = function () { placeAt = at; showCaret(at); drawPlacingBar(); };
    }
    slot.addEventListener('dragover', function (e) {
      if (dragFrom == null) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      showCaret(at);
    });
    slot.addEventListener('drop', function (e) {
      if (dragFrom == null) return;
      e.preventDefault();
      dropAt(at);
    });
    return slot;
  }

  /* Keep a slide in the deck and out of the show. Written work does not have
     to be finished work, and the alternative people actually use — deleting
     it and hoping it is in an export somewhere — loses the slide. */
  function toggleHidden(i) {
    var deck = helpers.deck();
    var s = deck.slides[i];
    if (!s) return;
    if (s.hidden === true) delete s.hidden; else s.hidden = true;
    touched();
    draw();
    SF.toast(s.hidden === true
      ? '"' + (s.title || SF.SLIDE_TYPES[s.type].label) + '" is hidden from the show. It stays in the deck.'
      : '"' + (s.title || SF.SLIDE_TYPES[s.type].label) + '" is back in the show.');
  }

  /* Find a slide in a deck too long to eyeball. A 74-slide lecture is past
     the point where a rail of thumbnails answers "where did I say that" —
     the pictures stop being distinguishable somewhere around forty.

     Searches what a person would expect to be searchable: the words on the
     slide and the words they wrote underneath it. Notes are included because
     the phrase you remember is as often in the script as on the wall. */
  function drawRail() {
    var deck = helpers.deck();
    var sel = helpers.sel();
    var UI = helpers.UI();
    var rail = $('railList');
    if (!rail) return;
    if (placing != null && !deck.slides[placing]) { placing = null; placeAt = null; }
    rail.innerHTML = '';
    rail.classList.toggle('placing', placing != null);
    caretAt = null;
    var count = $('railCount');
    var go = /** @type {HTMLInputElement|null} */ ($('railGo'));
    var total = $('railTotal');
    var off = deck.slides.filter(function (x) { return x.hidden === true; }).length;
    var n = deck.slides.length;
    /* Don't overwrite the field while someone is typing a number to jump. */
    if (go && go !== document.activeElement) {
      go.max = String(Math.max(1, n));
      go.value = String(sel + 1);
    }
    if (total) total.textContent = String(n);
    if (count) {
      count.textContent = off ? (n - off) + ' of ' + n : String(n);
      count.title = off ? off + ' slide' + (off === 1 ? '' : 's') + ' hidden from the show' : '';
    }
    drawSorterButton();

    /* The rail scrolls itself towards the pointer during a drag; it listens on
       the list rather than on each row so the margins still work when the
       pointer is between two slides. Assigned, not added, because the rail is
       redrawn on every keystroke and listeners would stack. */
    rail.ondragover = function (e) {
      if (dragFrom == null) return;
      e.preventDefault();
      scroller.y = e.clientY;
      if (!scroller.raf) scroller.raf = requestAnimationFrame(autoScroll);
    };

    var list = /** @type {HTMLElement} */ (rail);
    list.appendChild(railSlot(0));

    deck.slides.forEach(function (s, i) {
      var row = el('div', 'thumb' + (i === sel ? ' sel' : '') + (i === placing ? ' carried' : '') +
        (s.hidden === true ? ' hidden-slide' : ''));
      row.draggable = true;
      row.tabIndex = 0;
      row.setAttribute('role', 'button');
      row.setAttribute('aria-label', 'Slide ' + (i + 1) + ': ' + (s.title || SF.SLIDE_TYPES[s.type].label) +
        (s.hidden === true ? ' — hidden from the show' : ''));
      row.setAttribute('aria-current', i === sel ? 'true' : 'false');
      /* Only when the row itself has focus: the grip inside it is a button, and
         swallowing its Enter here would redraw the rail out from under the
         click it was about to fire. */
      row.onkeydown = function (e) {
        if (e.target !== row) return;
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault(); e.stopPropagation();
        if (placing != null) commitPlacing(slotFor(row, row.getBoundingClientRect().top));
        else select(i);
      };
      row.dataset.i = String(i);

      var gutter = el('div', 'thumb-gutter');
      gutter.appendChild(el('div', 'num', String(i + 1)));
      var grip = UI.button('⠿', 'thumb-grip', function (e) {
        e.stopPropagation();
        beginPlacing(i);
      });
      grip.title = 'Pick this slide up to move it (⌘X). Drag to nudge it a place or two.';
      grip.setAttribute('aria-label', 'Move slide ' + (i + 1));
      gutter.appendChild(grip);
      /* In the gutter beside the number, because hiding is a fact about
         where the slide sits in the running order rather than about its
         content — and because a control the rail does not show is a control
         only its author knows about. */
      var eye = UI.button(s.hidden === true ? '⦸' : '👁', 'thumb-hide', function (e) {
        e.stopPropagation();
        toggleHidden(i);
      });
      eye.title = s.hidden === true
        ? 'Hidden from the show — click to put it back (H)'
        : 'Hide from the show, keeping it in the deck (H)';
      eye.setAttribute('aria-label', (s.hidden === true ? 'Show' : 'Hide') + ' slide ' + (i + 1));
      eye.setAttribute('aria-pressed', String(s.hidden === true));
      gutter.appendChild(eye);
      row.appendChild(gutter);

      var body = el('div', 'thumb-body');
      var frame = el('div', 'frame');
      if (s.type === 'game') {
        var g = gameFor(s);
        frame.appendChild(el('div', 'badge quiz', g ? 'GAME' : 'MISSING'));
      } else if (s.feedback && s.feedback.kind) {
        var live = SF.slideFeedback(s);
        frame.appendChild(el('div', 'badge fb' + (live ? '' : ' warn'),
          SF.FEEDBACK_KINDS[s.feedback.kind].icon +
          (live ? '' : ' !')));
      }
      /* Slides chosen in the activities studio say so, the way a game does.
         Named after the phase rather than a flat "ACTIVITY", because where
         it belongs in the lesson is the thing worth reading off a rail —
         and it is the one fact the slide itself cannot show. Drawn after the
         two above so a game or a feedback slide keeps its own badge; this
         one sits under it. */
      var act = s.activity && SF.Activities && SF.Activities.activity(s.activity);
      if (act) {
        var ph = SF.Activities.PHASES.find(function (p) { return p.key === act.phase; });
        var mark = el('div', 'badge act' + (act.target === 'moment' ? ' timed' : ''),
          (ph ? ph.label : 'Activity').toUpperCase());
        mark.title = act.title + (act.minutes ? ' · about ' + act.minutes + ' min' : '');
        frame.appendChild(mark);
      }
      body.appendChild(frame);

      var node = SF.renderSlide(deck, s, Object.assign(slideOpts(i), { chrome: false }));
      frame.appendChild(node);
      row.appendChild(body);

      var tx = s.transition || 'fade';
      var txIcon = { none: '—', fade: '◌', push: '→', zoom: '⊕', wipe: '▭' }[tx] || '◌';
      var txLabel = tx === 'none' ? 'None' : tx.charAt(0).toUpperCase() + tx.slice(1);
      var txMark = el('span', 'thumb-tx', txIcon);
      txMark.title = 'Transition: ' + txLabel;
      txMark.setAttribute('aria-label', 'Transition ' + txLabel);
      row.appendChild(txMark);

      /* Clicking a slide while another is in hand puts it down, above or below
         depending on which half was clicked — the same rule the drag caret
         follows, so the two never disagree. */
      row.onclick = function (e) {
        if (placing != null) commitPlacing(slotFor(row, e.clientY));
        else select(i);
      };
      wireDrag(row);
      list.appendChild(row);
      list.appendChild(railSlot(i + 1));
      requestAnimationFrame(function () { SF.fit(frame, node); });
    });

    drawPlacingBar();
    if (placing != null) showCaret(placeAt);
  }

  /* The rail head is shared with the quiz studio, which has no sorter, so the
     button is built here rather than sitting in the markup for both. */
  function drawSorterButton() {
    var deck = helpers.deck();
    var btn = $('btnSorter');
    if (!btn) return;
    btn.title = 'Block view — the whole deck at once, to rearrange it (⌘G)';
    btn.setAttribute('aria-label', 'Block view of all slides');
    btn.onclick = openSorter;
  }

  function select(i) {
    var deck = helpers.deck();
    setSel(Math.max(0, Math.min(deck.slides.length - 1, i)));
    draw();
  }

  /** Move the selected slide by `delta` places. */
  function nudge(delta) {
    var sel = helpers.sel();
    if (!moveSlide(sel, sel + (delta > 0 ? delta + 1 : delta))) return;
    touched();
    draw();
    focusThumb(sel);
  }

  /** Send the selected slide to a slot outright — the front, or the end. */
  function sendTo(at) {
    var deck = helpers.deck();
    var sel = helpers.sel();
    if (!moveSlide(sel, at)) return;
    touched();
    draw();
    focusThumb(sel);
  }

  /* ------------------------------------------------------- slide sorter

     The rail is a column one slide wide: right for working on a slide, wrong
     for seeing a lesson. Fifty-two slides in it is four thousand pixels of
     scroll, so "what shape is this lecture, and is that run in the right
     place?" is a question you can only answer by remembering.

     The sorter answers it by showing the whole deck at once. Every slide is on
     screen, so every move is a short drag with both ends visible, and slides
     can be picked in a group — click, shift-click a run, ⌘-click to add — and
     moved together, which is the thing the rail could never do. */

  var sorter = null;         /* the overlay element, or null when closed */
  var picked = [];           /* indices selected in the sorter */
  var anchor = 0;            /* where a shift-click measures its range from */
  var sorterDrag = false;
  var sorterAt = null;       /* slot the caret is pointing at */

  function sorterOpen() { return !!sorter; }

  function openSorter() {
    var sel = helpers.sel();
    if (sorter) return;
    picked = [sel];
    anchor = sel;
    sorter = el('div', 'sorter');
    document.body.appendChild(sorter);
    document.body.classList.add('sorter-on');
    drawSorter();
    var tile = sorter.querySelector('.sorter-tile.sel');
    if (tile) {
      /** @type {HTMLElement} */ (tile).focus();
      tile.scrollIntoView({ block: 'center' });
    }
  }

  function closeSorter() {
    var sel = helpers.sel();
    if (!sorter) return;
    sorter.remove();
    sorter = null;
    sorterDrag = false;
    sorterAt = null;
    document.body.classList.remove('sorter-on');
    draw();
    focusThumb(sel);
  }

  /** Selection, as the sorter means it: a set, with `sel` on the last one
      touched so closing the sorter leaves the editor where you were looking. */
  function pick(i, e) {
    if (e && e.shiftKey) {
      var lo = Math.min(anchor, i), hi = Math.max(anchor, i);
      picked = [];
      for (var n = lo; n <= hi; n++) picked.push(n);
    } else if (e && (e.metaKey || e.ctrlKey)) {
      var at = picked.indexOf(i);
      if (at < 0) picked.push(i);
      else if (picked.length > 1) picked.splice(at, 1);
      anchor = i;
    } else {
      picked = [i];
      anchor = i;
    }
    setSel(i);
    drawSorter();
  }

  /** Which slot a pointer over this tile means. Tiles sit side by side, so the
      answer is left half or right half — the same rule the rail applies top and
      bottom, turned ninety degrees. */
  function sorterSlotFor(tile, clientX) {
    var i = Number(tile.dataset.i);
    var box = tile.getBoundingClientRect();
    return clientX < box.left + box.width / 2 ? i : i + 1;
  }

  /* The caret is one absolutely positioned bar rather than a gap element per
     slide: in a wrapping grid a zero-width gap would still take a cell and push
     the layout around as it appeared. */
  function showSorterCaret(at) {
    if (!sorter) return;
    sorterAt = at;
    var bar = /** @type {HTMLElement|null} */ (sorter.querySelector('.sorter-caret'));
    if (!bar) return;
    if (at == null) { bar.hidden = true; return; }
    var tiles = sorter.querySelectorAll('.sorter-tile');
    var last = at >= tiles.length;
    var tile = /** @type {HTMLElement|null} */ (tiles[last ? tiles.length - 1 : at]);
    if (!tile) { bar.hidden = true; return; }
    bar.hidden = false;
    bar.style.top = tile.offsetTop + 'px';
    bar.style.height = tile.offsetHeight + 'px';
    bar.style.left = (last ? tile.offsetLeft + tile.offsetWidth + 5 : tile.offsetLeft - 7) + 'px';
  }

  /** Put the held slides down in `at`, and keep them selected where they land
      so a run can be nudged twice without picking it up again. */
  function sorterDrop(at) {
    var count = picked.length;
    var landed = reorder(picked, at);
    sorterDrag = false;
    showSorterCaret(null);
    if (landed < 0) return;
    picked = [];
    for (var n = 0; n < count; n++) picked.push(landed + n);
    setSel(landed);
    anchor = landed;
    touched();
    drawSorter();
    var tile = sorter && sorter.querySelector('.sorter-tile.sel');
    if (tile) /** @type {HTMLElement} */ (tile).focus();
  }

  function drawSorter() {
    var deck = helpers.deck();
    var sel = helpers.sel();
    var UI = helpers.UI();
    if (!sorter) return;
    picked = picked.filter(function (i) { return deck.slides[i]; });
    if (!picked.length) picked = [Math.min(sel, deck.slides.length - 1)];
    sorter.innerHTML = '';

    var head = el('div', 'sorter-head');
    head.appendChild(el('strong', null, 'Slide sorter'));
    head.appendChild(el('span', 'sorter-count',
      deck.slides.length + ' slides' +
      (picked.length > 1 ? ' · ' + picked.length + ' selected' : '')));
    head.appendChild(el('span', 'sorter-hint',
      'Drag to move · shift-click for a run · ⌘-click to add · ↵ to edit · esc to close'));
    head.appendChild(UI.button('Done', 'primary', closeSorter));
    sorter.appendChild(head);

    var grid = el('div', 'sorter-grid');
    var bar = el('div', 'sorter-caret');
    bar.hidden = true;
    grid.appendChild(bar);

    deck.slides.forEach(function (s, i) {
      var on = picked.indexOf(i) >= 0;
      var tile = el('div', 'sorter-tile' + (on ? ' sel' : ''));
      tile.dataset.i = String(i);
      tile.draggable = true;
      tile.tabIndex = 0;
      tile.setAttribute('role', 'button');
      tile.setAttribute('aria-label', 'Slide ' + (i + 1) + ': ' + (s.title || SF.SLIDE_TYPES[s.type].label));
      tile.setAttribute('aria-pressed', on ? 'true' : 'false');

      var frame = el('div', 'frame');
      var node = SF.renderSlide(deck, s, Object.assign(slideOpts(i), { chrome: false }));
      frame.appendChild(node);
      tile.appendChild(frame);

      var foot = el('div', 'sorter-foot');
      foot.appendChild(el('span', 'sorter-num', String(i + 1)));
      foot.appendChild(el('span', 'sorter-title', oneLine(s.title) || SF.SLIDE_TYPES[s.type].label));
      tile.appendChild(foot);

      tile.onclick = function (e) { pick(i, e); };
      tile.ondblclick = function () { setSel(i); closeSorter(); };
      tile.addEventListener('dragstart', function (e) {
        /* Dragging a slide that is not in the selection takes just that one —
           anything else would move slides you cannot see yourself holding. */
        if (picked.indexOf(i) < 0) { picked = [i]; anchor = i; drawSorter(); }
        sorterDrag = true;
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', String(i)); } catch (err) {}
      });
      tile.addEventListener('dragend', function () {
        sorterDrag = false;
        showSorterCaret(null);
      });
      tile.addEventListener('dragover', function (e) {
        if (!sorterDrag) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        showSorterCaret(sorterSlotFor(tile, e.clientX));
      });
      tile.addEventListener('drop', function (e) {
        if (!sorterDrag) return;
        e.preventDefault();
        sorterDrop(sorterSlotFor(tile, e.clientX));
      });

      grid.appendChild(tile);
      requestAnimationFrame(function () { SF.fit(frame, node); });
    });

    /* Dropping past the last tile means the end of the deck. */
    grid.addEventListener('dragover', function (e) {
      if (!sorterDrag || e.target !== grid) return;
      e.preventDefault();
      showSorterCaret(deck.slides.length);
    });
    grid.addEventListener('drop', function (e) {
      if (!sorterDrag || e.target !== grid) return;
      e.preventDefault();
      sorterDrop(deck.slides.length);
    });
    sorter.appendChild(grid);
  }

  /** Slide titles wrap on purpose — on a slide. In a caption they cannot. */
  function oneLine(text) { return String(text || '').replace(/\s+/g, ' ').trim(); }

  /** How many tiles fit across, so ↑ and ↓ can step a row at a time. */
  function sorterColumns() {
    if (!sorter) return 1;
    var tiles = sorter.querySelectorAll('.sorter-tile');
    if (tiles.length < 2) return 1;
    var top = /** @type {HTMLElement} */ (tiles[0]).offsetTop, n = 0;
    for (var i = 0; i < tiles.length; i++) {
      if (/** @type {HTMLElement} */ (tiles[i]).offsetTop !== top) break;
      n++;
    }
    return Math.max(1, n);
  }

  function sorterKeys(e) {
    var deck = helpers.deck();
    var sel = helpers.sel();
    var mod = e.metaKey || e.ctrlKey;
    var last = deck.slides.length - 1;
    var step = null;
    if (e.key === 'Escape') { e.preventDefault(); closeSorter(); return; }
    if (e.key === 'Enter') { e.preventDefault(); closeSorter(); return; }
    if (mod && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      picked = deck.slides.map(function (s, i) { return i; });
      drawSorter();
      return;
    }
    if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); restoreHistory(e.shiftKey); drawSorter(); return; }
    if (e.key === 'ArrowRight') step = sel + 1;
    else if (e.key === 'ArrowLeft') step = sel - 1;
    else if (e.key === 'ArrowDown') step = sel + sorterColumns();
    else if (e.key === 'ArrowUp') step = sel - sorterColumns();
    else if (e.key === 'Home') step = 0;
    else if (e.key === 'End') step = last;
    if (step == null) return;
    e.preventDefault();
    var to = Math.max(0, Math.min(last, step));
    /* Alt turns the arrows from "look at that one" into "put it there", which
       is how a sorter stays usable without a mouse. */
    if (e.altKey) {
      var at = to > sel ? to + 1 : to;
      var landed = reorder(picked, at);
      if (landed < 0) return;
      var count = picked.length;
      picked = [];
      for (var n = 0; n < count; n++) picked.push(landed + n);
      setSel(landed); anchor = landed;
      touched();
      drawSorter();
    } else {
      pick(to, e.shiftKey ? { shiftKey: true } : null);
    }
    var tile = sorter && sorter.querySelector('.sorter-tile.sel');
    if (tile) {
      /** @type {HTMLElement} */ (tile).focus();
      tile.scrollIntoView({ block: 'nearest' });
    }
  }

  function drawFoot() {
    var UI = helpers.UI();
    var foot = $('railFoot');
    if (!foot) return;
    foot.innerHTML = '';
    var s = current();
    if (s) {
      var txWrap = el('div', 'rail-tx');
      var lab = el('label', null, 'Transition in');
      var txSel = UI.select(
        SF.TRANSITIONS.map(function (t) {
          return { value: t, label: t[0].toUpperCase() + t.slice(1) };
        }),
        s.transition,
        function (v) {
          s.transition = v;
          touched();
          drawRail();
          drawInspector();
        }
      );
      if (!txSel.id) txSel.id = 'rail-tx-' + SF.uid();
      lab.htmlFor = txSel.id;
      txWrap.appendChild(lab);
      txWrap.appendChild(txSel);
      txWrap.addEventListener('click', function (e) { e.stopPropagation(); });
      foot.appendChild(txWrap);
    }
    var actions = el('div', 'rail-actions');
    var addSlideBtn = UI.button('+ Slide', 'primary', function () {
      if (SF.Studio && SF.Studio.openStarters) SF.Studio.openStarters();
      else addSlide('content');
    });
    addSlideBtn.title = 'Insert a slide starter, then pick a layout';
    actions.appendChild(addSlideBtn);
    var ins = UI.button('+ Activity', null, openActivityLibrary);
    ins.id = 'railAddActivity';
    ins.title = 'Add a game or activity — same catalogue as ＋ Add activity';
    actions.appendChild(ins);
    foot.appendChild(actions);
  }


  /* js/editor.js used to reach into `placing` and `placeAt` directly. It asks
     now, so the carry state has one owner. */
  function isPlacing() { return placing != null; }
  function placeTarget() { return placeAt; }
  function resetPlacing() { placing = null; placeAt = null; }

  return {
    focusThumb, beginPlacing, movePlaceTo, commitPlacing, cancelPlacing, toggleHidden, drawRail, select, nudge, sendTo, sorterOpen, openSorter, closeSorter, pick, sorterKeys, drawFoot,
    isPlacing, placeTarget, resetPlacing
  };
}
