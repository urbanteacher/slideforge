/* SlideForge — the presentation engine.

   Slides and content only. Questions live in games (js/games.js); a
   presentation refers to one with a game-embed slide, which expands into that
   game's questions when the show runs. Nothing here knows how a game is
   scored. */
(function (global) {
  'use strict';

  /** @type {import("../src/types.js").SlideForgeGlobal} */
  var SF = global.SF;
  var el = SF.el;
  var $ = function (id) { return document.getElementById(id); };
  var UI;

  var deck = null;
  var sel = 0;
  var saveTimer = null;
  var historyId=null, past=[], future=[], checkpoint=null, restoring=false;
  function remember() {
    if (!deck) return;
    if(historyId!==deck.id){historyId=deck.id;past=[];future=[];checkpoint=JSON.stringify(deck);return;}
    var now=JSON.stringify(deck);
    if(!restoring && checkpoint && now!==checkpoint){past.push(checkpoint);if(past.length>60)past.shift();future=[];}
    checkpoint=now;
  }
  function restoreHistory(redo) {
    var from=redo?future:past,to=redo?past:future;
    if(!from.length)return;
    clearTimeout(saveTimer);saveTimer=null;
    to.push(JSON.stringify(deck));deck=JSON.parse(from.pop());checkpoint=JSON.stringify(deck);
    sel=Math.min(sel,deck.slides.length-1);restoring=true;touched();restoring=false;
    SF.Shell.syncChrome();draw();
  }

  function rememberSelection() {
    if (!deck || !deck.slides[sel]) return;
    try { sessionStorage.setItem('slideforge.selection.' + deck.id, deck.slides[sel].id); } catch (e) {}
  }
  function savedSelection() {
    var id;
    try { id = sessionStorage.getItem('slideforge.selection.' + deck.id); } catch (e) {}
    return Math.max(0, deck.slides.findIndex(function (s) { return s.id === id; }));
  }

  /* ------------------------------------------------------------ helpers */

  function current() { return deck.slides[sel]; }

  function touched() {
    remember();
    SF.Shell.touch();
    if (SF.History && SF.History.noteChange) SF.History.noteChange(deck);
    var ub = /** @type {HTMLButtonElement|null} */ (document.querySelector('[data-history=undo]'));
    var rb = /** @type {HTMLButtonElement|null} */ (document.querySelector('[data-history=redo]'));
    if (ub) ub.disabled = !past.length;
    if (rb) rb.disabled = !future.length;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      saveTimer = null;
      SF.Store.save(deck);
      if (SF.Shell.stored) SF.Shell.stored();
    }, 600);
  }

  /* Commit an edit that is still inside the debounce window. Called when the
     page is closing: it writes work in flight and nothing else, so closing an
     untouched document can never overwrite what is already stored. */
  function flush() {
    if (!saveTimer) return;
    clearTimeout(saveTimer);
    saveTimer = null;
    SF.Store.save(deck);
    if (SF.Shell.stored) SF.Shell.stored();
  }

  /* Drop a pending autosave without writing. Used when the open document is
     about to be deleted — otherwise the timer (or openDeck's flush) puts it
     straight back into the Library. */
  function cancelPendingSave() {
    if (!saveTimer) return;
    clearTimeout(saveTimer);
    saveTimer = null;
  }

  function gameFor(slide) {
    return slide.gameId ? SF.GameStore.get(slide.gameId) : null;
  }

  function slideOpts(i) {
    var s = deck.slides[i];
    return {
      index: i,
      total: deck.slides.length,
      interactive: false,
      game: s.type === 'game' ? gameFor(s) : null,
      join: s.type === 'join' ? SF.sampleJoinInfo() : null
    };
  }

  function richField(s, key, kind, change, extra) {
    var value = key.indexOf('bullets.') === 0 ? s.bullets[Number(key.split('.')[1])] : s[key];
    var input = UI[kind](value, function (v) {
      SF.Custom.rebase(s, key, String(value || ''), v);
      value = v; change(v);
    }, extra);
    SF.Custom.bind(input, s, key, function () { touched(); repaint(); });
    /* Named so the canvas can hand a block to the field that owns it. A block
       drawing only part of its field cannot be typed into in place — a
       keywords row draws its term and definition as two nodes sharing one
       bullets.N key — and the rail has always had the right control for it,
       with the two halves kept apart. Before this it got a floating panel
       instead, which is the one thing the rail was supposed to stop. */
    input.dataset.contentKey = key;
    return input;
  }

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
    if (from == null || at == null || !deck.slides[from]) return false;
    var landed = reorder([from], at);
    if (landed < 0) return false;
    sel = landed;
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
    if (!deck.slides[i] || placing != null) return;
    sel = i;
    placing = i;
    placeAt = i;
    draw();
    var slot = showCaret(placeAt);
    if (slot) slot.focus();
  }

  function movePlaceTo(at) {
    if (placing == null) return;
    placeAt = Math.max(0, Math.min(deck.slides.length, at));
    var slot = showCaret(placeAt);
    if (slot) { slot.focus(); slot.scrollIntoView({ block: 'nearest' }); }
    drawPlacingBar();
  }

  function commitPlacing(at) {
    if (placing == null) return;
    var from = placing;
    var to = at == null ? placeAt : at;
    placing = null; placeAt = null; caretAt = null;
    if (moveSlide(from, to)) touched();
    draw();
    focusThumb(sel);
  }

  function cancelPlacing() {
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
  function slideHaystack(s) {
    var parts = [s.title, s.subtitle, s.body, s.notes, s.quote, s.attribution, s.gameTitle];
    if (Array.isArray(s.bullets)) parts = parts.concat(s.bullets);
    if (Array.isArray(s.options)) parts = parts.concat(s.options);
    return parts.filter(Boolean).join(' \n ');
  }

  /* Fields a replace may touch. Deliberately not `options` or `gameTitle`:
     a quiz answer and a game's name are keys other things match on, and
     rewriting them from a find box breaks those links silently. */
  var REPLACE_KEYS = ['title', 'subtitle', 'body', 'notes', 'quote', 'attribution'];

  function replaceEverywhere(term, next) {
    /* Before, not after. A replace across seventy slides is the one edit in
       this editor that cannot be eyeballed, and undo only helps the person
       who notices within the session. */
    if (SF.History && SF.History.ready()) SF.History.snapshot(deck, 'Before replacing “' + term + '”');
    var q = String(term), to = String(next);
    var slides = 0, hits = 0;
    deck.slides.forEach(function (s) {
      var touchedSlide = false;
      REPLACE_KEYS.forEach(function (k) {
        var was = s[k];
        if (typeof was !== 'string' || was.indexOf(q) < 0) return;
        var now = was.split(q).join(to);
        hits += was.split(q).length - 1;
        /* Through rebase, not straight onto the field: bold, colour and
           links are stored as offsets into this string, and moving the text
           under them without moving them repaints the formatting over the
           wrong words. */
        if (SF.Custom && SF.Custom.rebase) SF.Custom.rebase(s, k, was, now);
        s[k] = now;
        touchedSlide = true;
      });
      if (Array.isArray(s.bullets)) {
        s.bullets.forEach(function (b, bi) {
          if (typeof b !== 'string' || b.indexOf(q) < 0) return;
          var now = b.split(q).join(to);
          hits += b.split(q).length - 1;
          if (SF.Custom && SF.Custom.rebase) SF.Custom.rebase(s, 'bullets.' + bi, b, now);
          s.bullets[bi] = now;
          touchedSlide = true;
        });
      }
      if (touchedSlide) slides++;
    });
    if (!hits) { SF.toast('Nothing to replace.'); return; }
    touched();
    draw();
    SF.toast('Replaced ' + hits + ' ' + (hits === 1 ? 'match' : 'matches') +
      ' across ' + slides + ' ' + (slides === 1 ? 'slide' : 'slides') + '. ⌘Z undoes it.');
  }

  function findInDeck() {
    /* Mark the File-menu / toast hint as seen once someone opens Find —
       they have found the door; nagging again would be noise. */
    try { localStorage.setItem('slideforge.findHint.v1', '1'); } catch (e) {}
    SF.askText({
      title: 'Find in this lesson',
      detail: 'Searches slide text and speaker notes. Open again anytime with ⌘F (Ctrl+F).',
      placeholder: 'A word or phrase',
      confirm: 'Find'
    }, function (term) {
      var q = String(term || '').trim().toLowerCase();
      if (!q) return;
      var hits = [];
      deck.slides.forEach(function (s, i) {
        var hay = slideHaystack(s);
        if (hay.toLowerCase().indexOf(q) < 0) return;
        /* A line of context, so a list of twelve hits is choosable without
           opening each one. */
        var line = hay.split('\n').filter(function (l) {
          return l.toLowerCase().indexOf(q) >= 0;
        })[0] || '';
        hits.push({ i: i, slide: s, line: line.trim().slice(0, 120) });
      });
      if (!hits.length) { SF.toast('No slide mentions “' + term + '”.'); return; }
      SF.Shell.picker({
        title: hits.length + (hits.length === 1 ? ' slide mentions ' : ' slides mention ') + '“' + term + '”',
        wide: true,
        items: function () {
          var rows = hits.map(function (h) {
            return {
              id: String(h.i),
              title: (h.i + 1) + '. ' + (h.slide.title || SF.SLIDE_TYPES[h.slide.type].label) +
                (h.slide.hidden === true ? '  · hidden' : ''),
              blurb: h.line
            };
          });
          rows.push({ id: 'replace', title: '↦ Replace “' + term + '” everywhere',
            blurb: 'Rewrites it across slide text and notes, keeping bold, colour and links on the right words.' });
          return rows;
        },
        describe: function (it) { return it.blurb; },
        onPick: function (it) {
          if (it.id === 'replace') {
            SF.askText({
              title: 'Replace “' + term + '” everywhere',
              detail: 'Across ' + hits.length + ' ' + (hits.length === 1 ? 'slide' : 'slides') +
                '. Slide text and notes only — quiz options and game names are left alone, ' +
                'because other things match on those. One undo puts it back.',
              placeholder: 'Replace with…',
              confirm: 'Replace all'
            }, function (next) { replaceEverywhere(term, next); });
            return;
          }
          select(Number(it.id));
        }
      });
    });
  }

  /* Paste a picture — or a whole slide — straight onto the deck.

     The way a lecture picture is actually obtained is a screenshot of a
     chart, and every other tool in the room takes it from the clipboard.
     Without this the route is: save the screenshot to a file, find the
     Image field, browse to it, delete the file later. That is four steps
     around a keystroke people already know.

     A copied SlideForge slide (JSON on the clipboard) wins over an image, so
     Cmd/Ctrl+V between browsers pastes the slide rather than ignoring it.

     Only when the open slide has somewhere to put a picture, and never while
     the cursor is in a field — pasting text into a text box must stay pasting
     text into a text box. */

  function pasteOnDocument(e) {
    if (SF.Player && SF.Player.open) return;
    if (document.querySelector('dialog[open]')) return;
    var t = /** @type {HTMLElement|null} */ (e.target);
    var tag = t ? t.tagName : '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || (t && t.isContentEditable)) return;

    var clipText = e.clipboardData && e.clipboardData.getData('text/plain');
    var slidePayload = SF.SlideClip && SF.SlideClip.unpack(clipText);
    if (slidePayload) {
      e.preventDefault();
      insertCopiedSlide(slidePayload);
      return;
    }

    var s = deck.slides[sel];
    if (!s) return;
    /* Where the picture can go, and what this slide would have to become to
       take it. Refused only where a picture makes no sense — a chart, a
       table, a code listing. Everywhere else a paste is an intention, not a
       mistake, so it is answered rather than ignored. */
    var target = SF.pasteTarget ? SF.pasteTarget(s) : null;
    if (!target) return;
    var items = (e.clipboardData && e.clipboardData.items) || [];
    var file = null;
    for (var i = 0; i < items.length; i++) {
      if (items[i].kind === 'file' && /^image\//.test(items[i].type)) { file = items[i].getAsFile(); break; }
    }
    if (!file) return;
    e.preventDefault();
    /* Same ceiling the file picker warns at, for the same reason: a deck
       lives in localStorage and a pasted screenshot is a data URI inside
       it. A warning rather than a refusal — the author knows what the
       picture is worth. */
    if (file.size > 3.5 * 1024 * 1024) {
      SF.toast('That image is over 3.5 MB — it may exceed the browser storage limit.');
    }
    var fr = new FileReader();
    fr.onload = function () {
      var uri = fr.result;

      function put(slide) {
        if (target.field === 'layer') {
          /* A gallery holds layers. Setting slide.image here is what the old
             handler did, and the gallery layout never reads it: the toast
             said "pasted" and the slide stayed empty. */
          slide.layers = (slide.layers || []).concat([{ image: uri, caption: '', source: '' }]);
        } else {
          slide.image = uri;
        }
      }

      /* Already the right shape: paste and say so. */
      if (target.become === s.type) {
        put(s);
        touched(); draw();
        SF.toast('Pasted onto slide ' + (sel + 1) + '.');
        return;
      }

      /* It is not, so say what it would become before changing it. The words
         survive either way — split and image both keep the fields they do not
         draw — but a layout change is the author's decision, not a side
         effect of a keystroke. Undo covers it regardless. */
      var label = (SF.SLIDE_TYPES[target.become] || {}).label || target.become;
      var lines = (s.bullets || []).filter(function (b) { return String(b).trim(); }).length;
      var keeps = lines
        ? 'Your heading and ' + lines + (lines === 1 ? ' point stay' : ' points stay') + ' on the slide.'
        : 'Your heading stays on the slide.';
      if (!SF.askChoice) {
        SF.prepareLayout(s, target.become); put(s);
        touched(); draw();
        SF.toast('Slide ' + (sel + 1) + ' is now ' + label + '.');
        return;
      }
      SF.askChoice({
        title: 'This slide cannot hold a picture yet',
        detail: 'Slide ' + (sel + 1) + ' is ' + ((SF.SLIDE_TYPES[s.type] || {}).label || s.type) +
          '. It can become ' + label + ' and take the picture, or the picture can go on a slide of its own.',
        options: [
          { value: 'convert', label: 'Make this slide ' + label,
            detail: keeps + ' Undo puts it back.' },
          { value: 'new', label: 'Put it on a new slide',
            detail: 'Leaves this slide alone and adds a picture slide after it.' }
        ]
      }, function (choice) {
        if (choice === 'new') {
          var next = makeLayoutSlide('image');
          put(next);
          deck.slides.splice(sel + 1, 0, next);
          sel += 1;
          touched(); draw();
          SF.toast('Added a picture slide after slide ' + sel + '.');
          return;
        }
        SF.prepareLayout(s, target.become);
        put(s);
        touched(); draw();
        SF.toast('Slide ' + (sel + 1) + ' is now ' + label + '.');
      });
    };
    fr.readAsDataURL(file);
  }

  function drawRail() {
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
    var btn = $('btnSorter');
    if (!btn) return;
    btn.title = 'Block view — the whole deck at once, to rearrange it (⌘G)';
    btn.setAttribute('aria-label', 'Block view of all slides');
    btn.onclick = openSorter;
  }

  function select(i) {
    sel = Math.max(0, Math.min(deck.slides.length - 1, i));
    draw();
  }

  /** Move the selected slide by `delta` places. */
  function nudge(delta) {
    if (!moveSlide(sel, sel + (delta > 0 ? delta + 1 : delta))) return;
    touched();
    draw();
    focusThumb(sel);
  }

  /** Send the selected slide to a slot outright — the front, or the end. */
  function sendTo(at) {
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
    sel = i;
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
    sel = landed;
    anchor = landed;
    touched();
    drawSorter();
    var tile = sorter && sorter.querySelector('.sorter-tile.sel');
    if (tile) /** @type {HTMLElement} */ (tile).focus();
  }

  function drawSorter() {
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
      tile.ondblclick = function () { sel = i; closeSorter(); };
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
      sel = landed; anchor = landed;
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

  /* ------------------------------------------------------------ preview */

  /* Preview mode for a feedback slide: 'rail' shows it beside the slide as the
     room will see it, 'focus' shows the full-screen version. Stored on the
     feedback so Present / Host live open the same way. */
  var inspectorTab = 'content';
  var designPane = 'edit';
  var designPaneSlide = '';

  function feedbackPresentAs(slide) {
    var f = slide && slide.feedback;
    return (f && f.presentAs === 'focus') ? 'focus' : 'rail';
  }

  /* One click puts a caret in the block. It was a double-click on to a panel,
     and the panel was handed `box` — the whole preview — as its anchor, so it
     opened in the same place whichever block you picked, and docked over the
     rail whenever it was taller than the canvas. The block itself is the
     anchor now, and for a block whose text round-trips there is no panel at
     all. See editCanvasBlock. */
  function bindCanvasContent(box,node,s){
    if(['game','quiz','explain','results'].includes(s.type))return;
    node.querySelectorAll('[data-content-key]').forEach(function(target){
      var key=target.dataset.contentKey;target.classList.add('canvas-editable');target.title='Click to edit these words';
      target.onclick=function(e){
        if(target.isContentEditable)return;
        if(e.target instanceof Element && e.target.closest('a'))return;
        e.preventDefault();e.stopPropagation();
        if (!SF.Custom || !SF.Custom.editCanvasBlock) return;
        SF.Custom.editCanvasBlock(target, s, key, {
          onSave: function () { touched(); draw(); },
          onCancel: function () { touched(); repaint(); }
        });
      };
      if(/^bullets\.\d+$/.test(key)){
        target.draggable=true;var i=Number(key.slice(8));target.title+=' · drag to reorder';
        target.ondragstart=function(e){contentDrag={slide:s.id,index:i};e.dataTransfer.setData('text/plain',String(i));};
        target.ondragover=function(e){if(contentDrag&&contentDrag.slide===s.id)e.preventDefault();};
        target.ondragend=function(){contentDrag=null;};
        target.ondrop=function(e){if(!contentDrag||contentDrag.slide!==s.id)return;e.preventDefault();var from=contentDrag.index;contentDrag=null;if(SF.ContentTools.move(s,from,i)){touched();draw();}};
      }
    });
  }
  function drawPreview() {
    var box = $('previewBox');
    if (!box) return;
    box.innerHTML = '';
    box.classList.remove('railed');
    var s = current();
    if (!s) return;

    var f = SF.slideFeedback(s);
    var digest = f ? SF.sampleFeedbackDigest(f) : null;
    var fbPreview = feedbackPresentAs(s);

    if (f && fbPreview === 'focus') {
      /* The focus view replaces the slide, so preview it the same way. */
      var focus = SF.feedbackFocus(deck, digest,
        Object.assign(SF.feedbackViewOpts(f), {
          footnote: digest.answered + ' of ' + digest.players + ' responded',
          sample: true
        }));
      box.appendChild(focus);
      requestAnimationFrame(function () { SF.fit(box, focus); });
      var notesArea = /** @type {HTMLTextAreaElement|null} */ ($('notes'));
      if (notesArea) notesArea.value = s.notes || '';
      return;
    }

    var node = SF.renderSlide(deck, s, slideOpts(sel));
    box.appendChild(node);
    bindCanvasContent(box,node,s);
    SF.bindCanvasRegions(node,s,function(key){
      touched();draw();
      var handle=box && box.querySelector('button[data-move-item='+key+']');if(handle)/** @type {HTMLButtonElement} */ (handle).focus();
    });

    /* Swap sides, on the canvas rather than buried in the inspector.
       imageSide already existed as a dropdown three fields down; putting it
       where the thing it moves actually is turns a setting into a gesture. */
    if (s.type === 'split') {
      var swap = el('button', 'canvas-btn swap-sides', '\u21c4');
      swap.type = 'button';
      swap.title = 'Swap the text and the image (\u21c4)';
      swap.setAttribute('aria-label', 'Swap the text and the image');
      swap.onclick = function (ev) {
        ev.stopPropagation();
        SF.swapImagePlacement(s);
        touched();
        draw();
      };
      box.appendChild(swap);
    }

    if (f) {
      /* Railed, so the slide narrows exactly as it will in the show. */
      box.classList.add('railed');
      var rail = SF.feedbackRail(deck);
      box.appendChild(rail);
      SF.paintFeedbackRail(rail, digest,
        Object.assign(SF.feedbackViewOpts(f), {
          footnote: 'Sample — ' + digest.answered + ' of ' + digest.players + ' responded'
        }));
      /* Same surface as the slide it is previewed against — the rehearsal has
         to show the colours the room will get. */
      SF.railSurface(rail, node);
      var boxEl = box;
      requestAnimationFrame(function () {
        if (!boxEl) return;
        var scale = boxEl.clientWidth / SF.SLIDE_W;
        rail.style.transform = 'scale(' + scale + ')';
      });
    }

    var boxEl2 = box;
    requestAnimationFrame(function () { if (boxEl2) SF.fit(boxEl2, node); });
    var notesArea2 = /** @type {HTMLTextAreaElement|null} */ ($('notes'));
    if (notesArea2) notesArea2.value = s.notes || '';
    /* The canvas was just rebuilt, so anything the art face puts on top of it —
       the selection ring, the ghost on a hidden shape — has to go back on. */
    if (SF.Artwork) SF.Artwork.afterPaint();
    if (SF.Arrange) SF.Arrange.afterPaint();
    if (SF.HeaderFooterUI) SF.HeaderFooterUI.refresh();
  }

  /* ------------------------------------------------------------ inspector */

  function drawInspector() {
    var insp = $('inspector');
    if (!insp) return;
    insp.innerHTML = '';
    var s = current();
    if (!s) { delete insp.dataset.slide; return; }
    /* Which slide's fields these are. A canvas click hands a composite block
       to the rail field that owns it, and the fields are keyed by content key
       alone — bullets.0 exists on every slide that has a bullet. Without this
       a rail that had not caught up would take the click and focus the last
       slide's first point, which looks like it worked. */
    insp.dataset.slide = s.id;

    /* A game slide is a pointer into Quiz studio — not a place to redesign
       content or attach engagement. One panel: what is linked, edit there,
       slide-only chrome (transition / duplicate). Avoids Design vs Engagement
       tabs, Logo & theme, and “Plan the learning moment” all repeating the
       same doorway. */
    if (s.type === 'game') {
      drawGameSlideInspector(insp, s);
      return;
    }

    var tabs = el('div', 'inspector-tabs');
    ['content', 'engage'].forEach(function (key) {
      var b = UI.button(key === 'content' ? '✎  Design & content' : '✳  Engagement', inspectorTab === key ? 'active' : '', function () { inspectorTab = key; drawInspector(); });
      tabs.appendChild(b);
    });
    insp.appendChild(tabs);
    drawInspectorChrome(insp, { theme: true });
    if (s.id !== designPaneSlide) {
      designPaneSlide = s.id;
      designPane = 'edit';
    }
    if (inspectorTab === 'content') drawDesignPaneTabs(insp);
    insp.appendChild(el('h4','eyebrow', inspectorTab === 'content' ? 'MAKE IT YOURS' : 'GAMES AND THE ROOM'));
    insp.appendChild(el('h4', 'insp-title',
      'Slide ' + (sel + 1) + ' — ' + SF.SLIDE_TYPES[s.type].label));

    if (inspectorTab === 'engage') {
      drawEngagePane(insp, s);
      return;
    }

    if (designPane !== 'chrome' && SF.HeaderFooterUI) SF.HeaderFooterUI.close();
    if (designPane === 'customise') {
      SF.Custom.inspector(insp, s, function () { touched(); draw(); }, { bare: true });
    } else if (designPane === 'layout') {
      drawLayoutPicker(insp, s);
    } else if (designPane === 'chrome') {
      /* The panel is built once by js/header-footer.js and re-parented here on
         every draw. innerHTML = '' above detaches its children but does not
         destroy a node something still holds a reference to, so the fields keep
         their identity — and their focus — across a redraw. */
      if (SF.HeaderFooterUI) SF.HeaderFooterUI.mount(insp);
    } else if (designPane === 'transition') {
      insp.appendChild(el('p', 'hint',
        'How this slide arrives on the screen. The words stay as they are.'));
      insp.appendChild(UI.field('Transition in', UI.select(
        SF.TRANSITIONS.map(function (t) {
          return { value: t, label: t[0].toUpperCase() + t.slice(1) };
        }),
        s.transition, function (v) { s.transition = v; touched(); drawRail(); drawInspector(); })));
      if (s.transition === 'morph') {
        insp.appendChild(el('p', 'hint',
          'Morph carries one thing across the cut instead of dissolving the slide: the same picture, ' +
          'the same chart table, or the same heading text as the slide before this one. With nothing ' +
          'shared \u2014 or in a browser without view transitions, or when less motion has been asked ' +
          'for \u2014 it is a fade.'));
      }
      /* A statement is one line with nothing else on the slide, which is the
         only place per-word motion reads as deliberate rather than restless. */
      if (s.type === 'statement') {
        var d = s.design || (s.design = {});
        insp.appendChild(UI.field('Words arrive', UI.select([
          { value: '', label: 'All at once' },
          { value: 'rise', label: 'Rise — up from below, one at a time' },
          { value: 'fade', label: 'Fade — in place, one at a time' },
          { value: 'reveal', label: 'Reveal — wiped up, one at a time' }
        ], String(d.words || ''), function (v) {
          if (v) d.words = v; else delete d.words;
          touched(); repaint(); drawRail(); drawInspector();
        }), 'Plays when the slide arrives in the show — eased, with a little motion blur. Held still for anyone who asked for less motion.'));
        if (d.words) {
          insp.appendChild(UI.field('Speed', UI.select([
            { value: 'gentle', label: 'Gentle — slower, and holds longer' },
            { value: 'medium', label: 'Medium' },
            { value: 'quick', label: 'Quick' }
          ], String(d.wordSpeed || 'medium'), function (v) {
            if (v && v !== 'medium') d.wordSpeed = v; else delete d.wordSpeed;
            touched(); repaint();
          }), 'Moves the whole thing together — each word, the wave between them, and the hold if they leave again.'));
          insp.appendChild(UI.field('Spacing', UI.select([
            { value: 'together', label: 'Together — the line arrives as one' },
            { value: 'wave', label: 'Wave — eased, a little apart' },
            { value: 'one', label: 'One at a time — the widest spread' }
          ], String(d.wordStagger || 'wave'), function (v) {
            if (v && v !== 'wave') d.wordStagger = v; else delete d.wordStagger;
            /* Redrawn, not just repainted: choosing Together takes the
               direction control away, and choosing a wave brings it back. */
            touched(); repaint(); drawInspector();
          }), 'How far apart the words are. The wave is always eased — it starts quickly and slows as it finishes.'));
          /* Which end the wave starts from. The renderer has read this since
             the word animation landed — wordFrom() in js/render.js, with
             three orders in WORD_FROMS — and the motion-lab specimen deck
             demonstrates all three. There was simply never a control, so the
             only way to ask for anything but 'first' was to hand-edit the
             deck JSON. The line above already redraws the pane for it.

             Hidden for Together, where every word shares one beat and a
             direction would be a setting with nothing to order. */
          if ((d.wordStagger || 'wave') !== 'together') {
            insp.appendChild(UI.field('Direction', UI.select([
              { value: 'first', label: 'From the first word' },
              { value: 'last', label: 'From the last word' },
              { value: 'center', label: 'From the centre — outwards to both ends' }
            ], String(d.wordFrom || 'first'), function (v) {
              if (v && v !== 'first') d.wordFrom = v; else delete d.wordFrom;
              touched(); repaint();
            }), 'Which end the wave starts from. From the centre sends it outwards both ways at once; with an even number of words the middle two share the first beat.'));
          }
          /* The AI button. Everything above is a choice from a list; this is
             the one control that can produce something not on any list —
             per-word coordinates, which is what a motion designer would
             keyframe by hand. */
          var planBox = el('div', 'word-plan');
          var plan = d.wordPlan;
          var planFresh = plan && String(plan.text || '').trim() === String(s.body || '').trim();
          /* Said back in the author's terms, because the plan is the one
             thing in this pane with no visible control to read it off: how
             many pieces, of what kind, and which landings were used. */
          var planSummary = function () {
            var n = (plan.words || []).length;
            var arcs = [];
            (plan.words || []).forEach(function (w) {
              var a = (w && w.arc) || 'settle';
              if (arcs.indexOf(a) < 0) arcs.push(a);
            });
            return n + ' ' + (plan.unit === 'letter' ? 'letter' : 'word') + (n === 1 ? '' : 's') +
              ' placed, landing ' + arcs.join(' and ') + '.';
          };
          var planStatus = el('p', 'hint',
            planFresh
              ? ('\u2728 Choreographed' + (plan.note ? ': ' + plan.note : '') +
                 ' \u2014 ' + planSummary())
              : plan
                ? 'The choreography was written for different words. Ask again, or clear it.'
                : 'Per-word coordinates: where each word comes from, how it turns, when, ' +
                  'and how it lands \u2014 settling, bouncing, or condensing out of mist. ' +
                  'Ask for letter by letter and it works in letters.');
          var brief = UI.text('', function () {});
          brief.placeholder = 'Optional: bounce in, out of smoke, one letter at a time…';
          var ask = UI.button('\u2728 Choreograph these words', 'primary', function () {
            if (!SF.AI || !SF.AI.generateWordMotion) {
              planStatus.textContent = 'The AI engine is not loaded in this build.';
              return;
            }
            ask.disabled = true;
            planStatus.textContent = '\u2728 Placing the words\u2026';
            Promise.resolve(SF.AI.generateWordMotion(s.body, { mood: brief.value }))
              .then(function (res) {
                if (!res || res.error) {
                  planStatus.textContent = (res && res.error) || 'Nothing came back.';
                  return;
                }
                /* Stored with the line it was written for, so editing the
                   words retires it rather than misapplying it. */
                d.wordPlan = { text: String(s.body || '').trim(), note: res.note,
                  unit: res.unit === 'letter' ? 'letter' : 'word', words: res.words };
                if (!d.words) d.words = 'rise';
                touched(); repaint(); drawInspector();
              })
              .catch(function () { planStatus.textContent = 'Could not write a choreography just now.'; })
              .finally(function () { ask.disabled = false; });
          });
          planBox.appendChild(brief);
          planBox.appendChild(ask);
          if (plan) {
            planBox.appendChild(UI.button('Clear choreography', 'ghost', function () {
              delete d.wordPlan; touched(); repaint(); drawInspector();
            }));
          }
          planBox.appendChild(planStatus);
          insp.appendChild(UI.field('AI choreography', planBox));
          insp.appendChild(UI.field('And leave again', UI.select([
            { value: '', label: 'No — they arrive and stay' },
            { value: 'loop', label: 'Yes — in, hold, out, round again' }
          ], d.wordsLoop ? 'loop' : '', function (v) {
            if (v) d.wordsLoop = true; else delete d.wordsLoop;
            touched(); repaint(); drawRail();
          }), 'For a cover on screen while the room fills. Four seconds of the six are the hold, so the line is readable every time round.'));
        }
      }
    } else {
      drawContentFields(insp, s);
      drawUnusedOnLayout(insp, s);
    }
    if (designPane === 'transition') SF.Custom.tagControls(insp,s,'Motion');
  }

  /** Undo, theme, duplicate and delete — slide chrome, not part of the words. */
  /* opts.theme is gone: the Theme button moved to drawDesignPaneTabs, which is
     the row that governs the whole presentation. The parameter stays so the
     two call sites keep reading the same, and so a future chrome option has
     somewhere to land. */
  function drawInspectorChrome(insp, opts) {
    opts = opts || {};
    var history = el('div', 'format-tools insp-chrome');
    var undo = UI.button('↶ Undo', 'ghost', function () { restoreHistory(false); });
    undo.disabled = !past.length;
    undo.dataset.history = 'undo';
    var redo = UI.button('↷ Redo', 'ghost', function () { restoreHistory(true); });
    redo.disabled = !future.length;
    redo.dataset.history = 'redo';
    history.appendChild(undo);
    history.appendChild(redo);
    var copyBtn = UI.button('⎘ Copy', 'ghost', function () { copySlide(); });
    copyBtn.title = 'Copy this slide (⌘C / Ctrl+C) — paste in another deck or browser';
    copyBtn.setAttribute('aria-label', 'Copy this slide');
    history.appendChild(copyBtn);
    var pasteBtn = UI.button('⎘ Paste', 'ghost', function () { pasteSlideButton(); });
    pasteBtn.title = 'Paste a copied slide after this one (⌘V / Ctrl+V)';
    pasteBtn.setAttribute('aria-label', 'Paste slide');
    history.appendChild(pasteBtn);
    var dup = UI.button('⧉ Duplicate', 'ghost', duplicate);
    dup.title = 'Duplicate this slide in this deck (⌘D / Ctrl+D)';
    dup.setAttribute('aria-label', 'Duplicate this slide');
    history.appendChild(dup);
    var del = UI.button('✕ Delete', 'ghost', removeSlide);
    del.title = 'Delete this slide';
    del.setAttribute('aria-label', 'Delete this slide');
    del.disabled = deck.slides.length === 1;
    history.appendChild(del);
    insp.appendChild(history);
  }

  /** Icon tabs under Undo / Theme so look, layout and motion stay off the editing rail. */
  function drawDesignPaneTabs(insp) {
    /* The three canvas faces, on their own row above the pane switcher. They
       were in the canvas bar, where they wrapped it to two rows and pushed
       Panel onto a line of its own; and their controls have no business
       covering the slide they arrange. Ids are kept because artwork.js and
       arrange.js look their toggle up by id to relabel it, but the click is
       wired here — this row is rebuilt on every draw, so a listener bound once
       at install would be lost with the old node. */
    var faces = el('div', 'format-tools canvas-faces');
    faces.setAttribute('role', 'group');
    faces.setAttribute('aria-label', 'Presentation and canvas tools');
    /* Theme belongs with these, not with Copy and Delete. It sets the whole
       presentation, the way header and footer slots do; the row above it is
       what you do to one slide.
       No flag needed: this row only draws on the Content tab of a non-game
       slide, which is exactly where drawInspectorChrome used to pass
       theme: true. The same sheet is on the top bar as Settings, so the
       Engagement tab is not left without a way in. */
    var themeBtn = UI.button('◈ Theme', 'ghost', openDeckSettings);
    themeBtn.title = 'Theme, logo, slide shape and numbers — the whole presentation';
    faces.appendChild(themeBtn);
    /* Review belongs here for the same reason Theme does: it opens every slide
       in the deck at once, and can review a file someone sent you, so the Look
       pane's one slide was never its subject. It is not a rival to the Layout
       face's fit check either — that reads one arranged slide's regions, this
       reads the whole deck's boundary, and since SF.Review.check now asks
       SF.latticeFit as well the two cannot disagree about a slide they both
       measure. */
    if (SF.Review) {
      var reviewBtn = UI.button('◱ Review', 'ghost', function () {
        var deck = SF.Editor && SF.Editor.deck ? SF.Editor.deck() : null;
        if (deck) SF.Review.open(deck);
      });
      reviewBtn.title = 'Every slide at once — check fit and look through the deck';
      faces.appendChild(reviewBtn);
    }
    /* Named rather than positional: a mixed [id, label, title, fn, fn] literal
       infers a union of string and two function shapes, and neither function
       is then callable. */
    [
      { id: 'btnArtFlip', label: '◇ Artwork',
        title: "Move, size, hide or replace this slide's artwork",
        isOn: function () { return !!(SF.Artwork && SF.Artwork.isEditing()); },
        set: function (on) { if (SF.Artwork) SF.Artwork.setEditing(on); } },
      { id: 'btnArrange', label: '▦ Layout',
        title: 'Move blocks on the 16x12 lattice',
        isOn: function () { return !!(SF.Arrange && SF.Arrange.isArranging()); },
        set: function (on) { if (SF.Arrange) SF.Arrange.setArranging(on); } },
      { id: 'btnHeaderFooter', label: '▣ Header & footer',
        title: 'Header and footer slots',
        isOn: function () { return designPane === 'chrome'; },
        set: function (on) { designPane = on ? 'chrome' : 'edit'; drawInspector(); } }
    ].forEach(function (face) {
      var on = face.isOn();
      var b = UI.button(face.label, on ? 'active' : 'ghost', function () { face.set(!on); });
      b.id = face.id;
      b.title = face.title;
      b.setAttribute('aria-pressed', String(on));
      faces.appendChild(b);
    });
    insp.appendChild(faces);

    var panes = el('div', 'format-tools design-panes');
    panes.setAttribute('role', 'tablist');
    panes.setAttribute('aria-label', 'Slide tools');
    [
      ['edit', '✎', 'Edit', 'Edit the words on this slide'],
      ['customise', '✦', 'Look', 'Customise this slide'],
      ['layout', '▦', 'Layout', 'Choose a different layout'],
      ['transition', '↝', 'Motion', 'How this slide arrives']
    ].forEach(function (item) {
      var on = designPane === item[0];
      var b = UI.button(item[1] + ' ' + item[2], on ? 'active' : 'ghost', function () {
        designPane = item[0];
        drawInspector();
      });
      b.title = item[3];
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(on));
      panes.appendChild(b);
    });
    insp.appendChild(panes);
  }

  /** Thin inspector for an embedded game: edit the game in Quiz studio. */
  function drawGameSlideInspector(insp, s) {
    drawInspectorChrome(insp, { theme: false });

    insp.appendChild(el('h4', 'eyebrow', 'CHECK IN THE LESSON'));
    insp.appendChild(el('h4', 'insp-title', 'Slide ' + (sel + 1) + ' — Game'));

    drawGameEmbed(insp, s);

    insp.appendChild(UI.field('Transition in', UI.select(
      SF.TRANSITIONS.map(function (t) {
        return { value: t, label: t[0].toUpperCase() + t.slice(1) };
      }),
      s.transition, function (v) { s.transition = v; touched(); drawRail(); })));
  }

  /**
   * Settings that belong to the whole presentation rather than to one slide.
   *
   * The logo lived in the slide inspector, which was the wrong place twice
   * over: it is one mark for the whole deck, so it read as a per-slide
   * property it is not, and it sat below the layout and content fields where
   * a teacher had to scroll past everything they were actually editing to
   * reach it.
   */
  function openDeckSettings() {
    var body = $('settingsBody');
    var title = $('settingsTitle');
    if (title) title.textContent = 'Presentation settings';
    if (!body) return;
    var bodyEl = body;

    function draw2() {
      bodyEl.innerHTML = '';
      /* The only way to set a theme now that the top bar has no dropdown. */
      bodyEl.appendChild(UI.field('Theme', SF.Shell.themePicker(deck.theme, function (v) {
        ws.onTheme(v);
        draw2();
      }), 'Sets the default colours for the presentation. Customise this slide can override text and background colours.'));
      drawLogoFields(bodyEl, draw2);
      drawAspect(bodyEl, draw2);
      drawNumbers(bodyEl);
      drawEnding(bodyEl, draw2);
      drawAiSettings(bodyEl, draw2);
      drawReadiness(bodyEl);
    }
    draw2();
    SF.Shell.openModal('settingsModal', function () {
      SF.Store.save(deck);
      draw();
    });
  }

  /**
   * How the lesson finishes, when it has a game in it.
   *
   * An embedded game already puts its board up the moment that game ends —
   * which is mid-lesson. Ten slides later it is gone, and with two games there
   * are two boards and never a combined one. Offered only when the deck
   * actually embeds a game: an option that does nothing is worse than no
   * option, because it reads as broken rather than as not applicable.
   *
   * @param {HTMLElement} body   settings panel
   * @param {function} draw2     redraw the panel
   */
  /* The shape of the stage. In deck settings, not per slide: a deck whose
     slides disagreed about their own proportions would letterbox differently
     from one slide to the next, which reads as the projector losing sync. */
  function drawAspect(body, draw2) {
    var current = (SF.ASPECTS && SF.ASPECTS[deck.aspect]) ? deck.aspect : '16:9';
    var opts = Object.keys(SF.ASPECTS || { '16:9': 1 }).map(function (k) {
      return { value: k, label: SF.ASPECTS[k].label };
    });
    body.appendChild(UI.field('Slide shape', UI.select(opts, current, function (v) {
      deck.aspect = v;
      touched();
      draw2();
      draw();
    }),
      current === '16:9'
        ? 'What most projectors and every laptop want.'
        : 'Slides keep their width and gain height, so nothing you have written moves — ' +
          'there is simply more room under it. Check a busy slide before you teach.'));
  }

  /* Slide numbers used to be a checkbox in the top bar, and the only one:
     every other document-wide choice lives here, so it joins them. */
  function drawNumbers(body) {
    var box = el('div');
    box.appendChild(UI.check('Show slide numbers', deck.showSlideNumbers !== false, function (v) {
      deck.showSlideNumbers = v; touched(); draw();
    }));
    box.appendChild(el('div', 'hint', 'A small counter in the corner of every slide but the title, on the projector and in the shared link.'));
    body.appendChild(UI.field('Slide numbers', box));
  }

  function drawEnding(body, draw2) {
    var games = deck.slides.filter(function (s) { return s.type === 'game'; });
    if (!games.length) return;
    var box = el('div');
    box.appendChild(UI.check('Finish on the final scores', deck.finalScores === true, function (v) {
      deck.finalScores = v; touched(); draw2(); draw();
    }));
    box.appendChild(el('div', 'hint', games.length === 1
      ? 'Adds one scoreboard after your last slide, covering the whole lesson.'
      : 'Adds one scoreboard after your last slide, adding up all ' +
        games.length + ' games rather than showing each in turn.'));
    body.appendChild(UI.field('How the lesson ends', box,
      deck.finalScores
        ? 'Your own last slide still plays; the scores come after it.'
        : 'Off, so the lesson ends on the slide you wrote.'));
  }

  function drawAiSettings(body, draw2) {
    var box = el('div', 'ai-settings-box');

    /* No key field. The credential lives in the server's environment
       (GEMINI_API_KEY) and never reaches a browser, so there is nothing here
       for a teacher to paste, leak or have read out of localStorage by
       anything else running on the page. This panel reports what the
       deployment can do; it cannot change it. */
    var badge = el('div', 'ai-badge');
    badge.style.marginBottom = '8px';
    badge.style.fontSize = '13px';
    badge.style.fontWeight = '600';
    box.appendChild(badge);

    var note = el('div', 'hint', '');
    note.style.marginTop = '6px';
    box.appendChild(note);

    function paint(live) {
      badge.textContent = live
        ? '● Live AI active — generated on this server'
        : '○ Smart pedagogical heuristics active (no setup needed)';
      badge.style.color = live ? 'var(--s-accent, #38bdf8)' : 'var(--s-dim, #94a3b8)';
      note.textContent = live
        ? 'Suggestions are generated by this SlideForge server, which holds the ' +
          'API key. Nothing is sent from this browser to the AI provider, and ' +
          'the key is never loaded into the page.'
        : 'Instant polls and checks work with no setup, from the wording on your ' +
          'slide. For generated questions and distractors, set GEMINI_API_KEY in ' +
          'the environment of the server running SlideForge, then restart it.';
    }

    paint(!!(SF.AI && SF.AI.liveAIKnown && SF.AI.liveAIKnown()));
    if (SF.AI && SF.AI.checkLiveAI) SF.AI.checkLiveAI().then(paint);

    var actions = el('div', 'ai-smoke-actions');
    actions.style.marginTop = '10px';
    actions.appendChild(UI.button('Open AI smoke test…', 'primary', function () {
      openAiSmokeTest();
    }));
    box.appendChild(actions);
    box.appendChild(el('div', 'hint',
      'Checks /api/ai/status and runs one small generate call. Use it before class to confirm the key and model are live.'));

    body.appendChild(UI.field('AI assistance', box));
  }

  /**
   * Interactive AI smoke test — live status + one generate round-trip.
   * Opens in the settings sheet so Lesson studio keeps one modal pattern.
   */
  function openAiSmokeTest() {
    var body = $('settingsBody');
    var title = $('settingsTitle');
    if (title) title.textContent = 'AI smoke test';
    if (!body) return;
    var bodyEl = body;
    var pollTimer = null;
    var inFlight = false;

    function stopPoll() {
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    }

    function line(logEl, kind, msg) {
      var row = el('div', 'ai-smoke-line ai-smoke-' + (kind || 'info'));
      var stamp = new Date();
      var hh = String(stamp.getHours()).padStart(2, '0');
      var mm = String(stamp.getMinutes()).padStart(2, '0');
      var ss = String(stamp.getSeconds()).padStart(2, '0');
      row.appendChild(el('span', 'ai-smoke-time', hh + ':' + mm + ':' + ss));
      row.appendChild(el('span', 'ai-smoke-msg', msg));
      logEl.insertBefore(row, logEl.firstChild);
      while (logEl.children.length > 40) logEl.removeChild(logEl.lastChild);
    }

    function paintStatus(card, s) {
      card.innerHTML = '';
      var live = !!(s && s.available);
      var badge = el('div', 'ai-badge');
      badge.style.fontSize = '13px';
      badge.style.fontWeight = '600';
      badge.style.color = live ? 'var(--s-accent, #38bdf8)' : 'var(--s-dim, #94a3b8)';
      badge.textContent = live
        ? '● AI is live'
        : '○ AI offline (heuristics only)';
      card.appendChild(badge);

      var dl = el('div', 'ai-smoke-meta');
      function meta(k, v) {
        var row = el('div', 'ai-smoke-meta-row');
        row.appendChild(el('span', 'ai-smoke-k', k));
        row.appendChild(el('span', 'ai-smoke-v', v == null || v === '' ? '—' : String(v)));
        dl.appendChild(row);
      }
      meta('Origin', s && s.origin);
      meta('Model', s && s.model);
      meta('Available', s ? String(!!s.available) : '—');
      meta('HTTP', s && s.httpStatus ? String(s.httpStatus) : '—');
      meta('Probe', s && s.ms != null ? (s.ms + ' ms') : '—');
      meta('lastError', s && s.lastError != null ? String(s.lastError) : 'none');
      if (s && s.error) meta('Error', s.error);
      meta('Checked', s && s.at ? s.at.replace('T', ' ').replace(/\.\d+Z$/, ' Z') : '—');
      card.appendChild(dl);
    }

    function refreshStatus(card, logEl, quiet) {
      if (!SF.AI || !SF.AI.probeStatus) {
        if (!quiet) line(logEl, 'fail', 'SF.AI.probeStatus is missing in this build.');
        return Promise.resolve(null);
      }
      return SF.AI.probeStatus().then(function (s) {
        paintStatus(card, s);
        if (!quiet) {
          line(logEl, s.available ? 'ok' : 'warn',
            s.available
              ? ('Status OK — ' + (s.model || 'model?') + ' in ' + s.ms + ' ms')
              : ('Status offline' + (s.error ? (': ' + s.error) : '') +
                (s.lastError != null ? (' (lastError ' + s.lastError + ')') : '') +
                ' · ' + s.ms + ' ms'));
        }
        return s;
      });
    }

    function drawPanel() {
      bodyEl.innerHTML = '';

      var intro = el('div', 'hint',
        'Realtime check of this deployment’s AI. Status refreshes every few seconds while this panel is open. Run the generate test once before class.');
      intro.style.marginBottom = '12px';
      bodyEl.appendChild(intro);

      var statusCard = el('div', 'ai-smoke-card');
      bodyEl.appendChild(UI.field('Live status', statusCard));

      var topicBox = el('div');
      var topicInput = UI.text('SlideForge', null, 'Topic for the smoke reply');
      topicBox.appendChild(topicInput);
      bodyEl.appendChild(UI.field('Generate topic', topicBox,
        'Sent in a tiny fixed prompt. Does not touch your lesson.'));

      var logEl = el('div', 'ai-smoke-log');
      bodyEl.appendChild(UI.field('Event log', logEl));

      var resultEl = el('pre', 'ai-smoke-result');
      resultEl.textContent = 'Generate result will appear here.';
      bodyEl.appendChild(UI.field('Last generate', resultEl));

      var row = el('div', 'ai-smoke-actions');
      var btnRefresh = UI.button('Refresh status', 'ghost', function () {
        refreshStatus(statusCard, logEl, false);
      });
      var btnRun = UI.button('Run generate test', 'primary', function () {
        if (inFlight) {
          line(logEl, 'warn', 'Already running a generate test.');
          return;
        }
        inFlight = true;
        btnRun.disabled = true;
        btnRun.textContent = 'Generating…';
        line(logEl, 'info', 'POST /api/ai/generate…');
        var topic = topicInput.value || 'SlideForge';
        (SF.AI && SF.AI.runSmokeTest
          ? SF.AI.runSmokeTest({ topic: topic })
          : Promise.resolve({ ok: false, error: 'SF.AI.runSmokeTest missing', ms: 0, httpStatus: 0, text: null, parsed: null }))
          .then(function (r) {
            if (r.ok) {
              line(logEl, 'ok', 'Generate OK in ' + r.ms + ' ms (HTTP ' + r.httpStatus + ')');
              SF.toast('AI smoke test passed — ' + r.ms + ' ms');
            } else {
              line(logEl, 'fail',
                'Generate failed' +
                (r.httpStatus ? (' HTTP ' + r.httpStatus) : '') +
                (r.error ? (': ' + r.error) : '') +
                ' · ' + r.ms + ' ms');
              SF.toast('AI smoke test failed' + (r.error ? (': ' + r.error) : ''));
            }
            try {
              resultEl.textContent = JSON.stringify({
                ok: r.ok,
                httpStatus: r.httpStatus,
                ms: r.ms,
                error: r.error,
                parsed: r.parsed,
                text: r.text
              }, null, 2);
            } catch (e) {
              resultEl.textContent = String(r && r.text || r && r.error || e);
            }
            /* Keep the app-wide AI badge in sync after a real round-trip. */
            return refreshStatus(statusCard, logEl, true);
          })
          .finally(function () {
            inFlight = false;
            btnRun.disabled = false;
            btnRun.textContent = 'Run generate test';
          });
      });
      var btnBack = UI.button('← Presentation settings', 'ghost', function () {
        stopPoll();
        openDeckSettings();
      });
      row.appendChild(btnRun);
      row.appendChild(btnRefresh);
      row.appendChild(btnBack);
      bodyEl.appendChild(row);

      line(logEl, 'info', 'Panel open — probing status…');
      refreshStatus(statusCard, logEl, false);
      stopPoll();
      pollTimer = setInterval(function () {
        refreshStatus(statusCard, logEl, true);
      }, 4000);
    }

    drawPanel();
    SF.Shell.openModal('settingsModal', function () {
      stopPoll();
    });
  }

  /* What will go wrong in the room, listed before the room.
     In the settings sheet rather than behind its own button: it is the last
     thing you look at before presenting, and it belongs next to the other
     whole-deck settings rather than being one more control on the bar. */
  function drawReadiness(insp) {
    var r = SF.readiness(deck, function (id) { return SF.GameStore.get(id); });
    var box = el('div', 'ready-box');

    if (!r.items.length) {
      box.appendChild(el('div', 'ready-ok', '\u2713 Nothing to fix. Every slide has ' +
        'something on it and no media is missing.'));
      insp.appendChild(UI.field('Ready to teach', box));
      return;
    }

    r.items.forEach(function (f) {
      var row = el('button', 'ready-row ready-' + f.level);
      row.type = 'button';
      row.appendChild(el('span', 'ready-dot', f.level === 'stop' ? '!' : '?'));
      var t = el('span', 'ready-text');
      t.appendChild(el('strong', null, f.title));
      t.appendChild(el('span', null, ' ' + f.detail));
      row.appendChild(t);
      /* Clicking takes you to the slide, because a list of problems you then
         have to go and find is a list of problems. */
      if (f.slide != null) {
        row.title = 'Go to slide ' + (f.slide + 1);
        row.onclick = function () {
          select(f.slide);
          var close = /** @type {HTMLElement|null} */ (document.querySelector('#settingsModal [data-close]'));
          if (close) close.click();
        };
      } else {
        row.disabled = true;
      }
      box.appendChild(row);
    });

    insp.appendChild(UI.field('Ready to teach', box,
      r.stop
        ? r.stop + (r.stop === 1 ? ' thing will' : ' things will') + ' visibly fail in front of a class.'
        : 'Nothing will break. The rest depends on the room you are in.'));
  }

  function drawLogoFields(insp, redraw) {
    var wrap = el('div', 'logo-fields');
    if (deck.logo) {
      var preview = el('div', 'logo-preview');
      var img = document.createElement('img');
      img.src = deck.logo;
      img.alt = 'Lesson logo';
      preview.appendChild(img);
      var clear = UI.button('Remove logo', 'ghost', function () {
        deck.logo = '';
        deck.logoOn = 'none';
        touched();
        if (redraw) redraw(); else draw();
      });
      preview.appendChild(clear);
      wrap.appendChild(preview);
    }
    var pick = el('input');
    pick.type = 'file';
    pick.accept = 'image/png,image/jpeg,image/svg+xml,image/webp,image/gif';
    pick.style.fontSize = '12px';
    pick.addEventListener('change', function () {
      var f = pick.files && pick.files[0];
      if (!f) return;
      if (f.size > 1.5 * 1024 * 1024) {
        /* Say the size. "Keep it under 1.5 MB" leaves someone staring at a
           file picker wondering whether anything happened at all. */
        SF.toast('That file is ' + (f.size / 1024 / 1024).toFixed(1) + ' MB. ' +
          'Logos have to stay under 1.5 MB, or the lesson outgrows the ' +
          'browser storage it is saved in.');
        pick.value = '';
        return;
      }
      var fr = new FileReader();
      fr.onerror = function () { SF.toast('That file could not be read.'); };
      fr.onload = function () {
        /* Decode it before keeping it. A file with an image extension the
           browser cannot actually draw stores fine and renders as nothing,
           which is the one failure that looks exactly like the feature being
           broken \u2014 an empty corner and no message anywhere. */
        if (typeof fr.result !== 'string') return;
        var dataUrl = fr.result;
        var test = new Image();
        test.onload = function () {
          deck.logo = dataUrl;
          /* A logo nobody can see is indistinguishable from no logo, so
             uploading one turns it on. */
          if (deck.logoOn === 'none') deck.logoOn = 'all';
          touched();
          if (redraw) redraw(); else draw();
        };
        test.onerror = function () {
          SF.toast('That file is named like an image but the browser cannot ' +
            'draw it, so it would leave an empty corner. Try a PNG or SVG.');
          pick.value = '';
        };
        test.src = dataUrl;
      };
      fr.readAsDataURL(f);
    });
    wrap.appendChild(pick);
    insp.appendChild(UI.field('Lesson logo', wrap,
      'Corner mark on slides. PNG or SVG works best.'));
    var url=UI.text('',function(){},'https://…');
    insp.appendChild(UI.field('Or use a logo image URL',url));
    insp.appendChild(UI.button('Use logo URL','ghost',function(){
      var src=SF.safeHref(url.value);if(!src){SF.toast('Enter an http or https image URL');return;}
      var image=new Image();image.onload=function(){deck.logo=src;if(deck.logoOn==='none')deck.logoOn='all';touched();if(redraw)redraw();else draw();};
      image.onerror=function(){SF.toast('Could not load that image. Check the URL or upload a file.');};image.src=src;
    }));
    if (!deck.logo) return;

    /* Where the logo goes is the header/footer slots' business once they are
       switched on: a logo slot reads deck.logo and header-footer.css hides
       .slide-logo on a managed slide, so Logo size and Show logo on would be
       two controls for a position they no longer decide. The upload above
       stays either way — it is the only thing that sets deck.logo, and the
       slot has nothing to draw without it.
       Not removed outright: every one of the 22 library decks still uses the
       legacy path, because headerFooter.enabled defaults to false. */
    var managed = !!(deck.headerFooter && deck.headerFooter.enabled);
    if (managed) {
      insp.appendChild(el('p', 'hint',
        'Header and footer slots are on, so they decide where this logo sits and how '
        + 'big it is. Put it in a slot from Header & footer in the slide panel.'));
    }

    if (!managed) insp.appendChild(UI.field('Logo size',UI.select([{value:'small',label:'Small'},{value:'medium',label:'Medium'},{value:'large',label:'Large'}],deck.logoSize||'medium',function(v){deck.logoSize=v;touched();if(redraw)redraw();else draw();})));

    insp.appendChild(UI.field('Organisation',
      UI.text(deck.org || '', function (v) {
        deck.org = v.trim(); touched(); if (redraw) redraw(); else draw();
      }, 'Northeastern University London'),
      'Printed by themes that carry an institution line — on this theme, across ' +
      'the top of section slides. Leave it empty and nothing is printed.'));

    /* A one-colour lockup only works on the grounds it was drawn for. The
       themes already flip it white on the slides they paint dark, but a deck
       whose logo is already white needs that turned off, and a deck taught on
       a dark projector may want it on throughout. */
    insp.appendChild(UI.field('On dark slides', UI.select([
      { value: 'auto', label: 'Let the theme decide' },
      { value: 'always', label: 'Always show the logo white' },
      { value: 'never', label: 'Never change it — my logo is already light' }
    ], deck.logoReverse === 'always' || deck.logoReverse === 'never' ? deck.logoReverse : 'auto',
      function (v) { deck.logoReverse = v; touched(); if (redraw) redraw(); else draw(); }),
      'Your logo is one colour, and a dark title or section slide swallows a dark one. ' +
      'Auto turns it white only where this theme paints a dark ground; a picture slide ' +
      'can still be set on its own in Customise this slide.'));

    if (!managed) insp.appendChild(UI.field('Show logo on', UI.select([
      { value: 'all', label: 'Every slide' },
      /* Was "Title slide only", which named a layout rather than a position
         and so did nothing at all on a deck that opens on a Section. */
      { value: 'title', label: 'First slide only' },
      { value: 'none', label: 'Hidden' }
    ], deck.logoOn === 'title' || deck.logoOn === 'none' ? deck.logoOn : 'all',
      function (v) { deck.logoOn = v; touched(); if (redraw) redraw(); else draw(); })));

    /* Where it actually lands, on a real slide.
       "I added a logo and cannot see it" has three causes and this answers
       all of them: it is set to Hidden, it is on the first slide only and you
       are looking at another one, or you are looking at the slide list, which
       leaves the logo off along with the slide numbers. */
    var shown = deck.slides.filter(function (sl, i) {
      return SF.deckShowsLogo(deck, sl, i);
    }).length;
    var sample = 0;
    for (var i = 0; i < deck.slides.length; i++) {
      if (SF.deckShowsLogo(deck, deck.slides[i], i)) { sample = i; break; }
    }

    if (shown) {
      var frame = el('div', 'logo-shot');
      var slide = SF.renderSlide(deck, deck.slides[sample], {
        index: sample, total: deck.slides.length
      });
      frame.appendChild(slide);
      SF.fit(frame, slide);
      insp.appendChild(UI.field('On the slide', frame,
        'Slide ' + (sample + 1) + ' of ' + deck.slides.length + ' \u00b7 on ' + shown +
        (shown === 1 ? ' slide' : ' slides') +
        '. The slide list on the left leaves it off, along with the numbers.'));
    } else {
      insp.appendChild(UI.field(null, null,
        'Set to Hidden, so it appears on no slides.'));
    }
  }

  function drawLayoutPicker(insp, s) {
    var box = el('div', 'layout-library');
    box.appendChild(el('p', 'hint',
      'Change the shape of this slide, or add a new one at the end of the deck. The words you just edited stay on the slide.'));
    /* Grouped by what each layout says about itself. Join is authorable but
       has no group — it is inserted by the live flow, not chosen as a shape. */
    /** @type {[string, string[]][]} */
    var layoutGroups = SF.LAYOUT_GROUPS.map(function (g) {
      return [g[1], Object.keys(SF.SLIDE_TYPES).filter(function (k) {
        return SF.SLIDE_TYPES[k].group === g[0];
      })];
    });
    drawVariants(box, s);
    layoutGroups.forEach(function (group) {
      box.appendChild(el('h4', null, group[0]));
      var grid = el('div', 'layout-library-grid');
      group[1].forEach(function (type) {
        var b = el('button', 'layout-choice' + (s.type === type ? ' on' : ''));
        b.type = 'button';
        b.setAttribute('aria-pressed', String(s.type === type));
        var frame = el('div', 'variant-frame');
        var trial = SF.prepareLayout(SF.normalizeSlide(JSON.parse(JSON.stringify(s))), type);
        var node = SF.renderSlide(deck, trial, { index: sel, total: deck.slides.length, chrome: false });
        frame.appendChild(node);
        b.appendChild(frame);
        b.appendChild(el('span', null, SF.SLIDE_TYPES[type].label));
        b.onclick = function () { chooseLayout(s, type); };
        grid.appendChild(b);
      });
      box.appendChild(grid);
    });
    insp.appendChild(box);
    requestAnimationFrame(function () {
      box.querySelectorAll('.variant-frame').forEach(function (frame) {
        var node = frame.firstElementChild;
        if (node) SF.fit(frame, node);
      });
      /* Second frame, because fit() has just rescaled every trial and the
         measurement below reads painted geometry. */
      requestAnimationFrame(function () { markLayoutFit(box); });
    });
  }

  /**
   * Label each layout thumbnail with whether this slide's words would survive
   * the change.
   *
   * The picker already renders a trial of every candidate shape and throws the
   * render away. These are the same renders, still mounted, so measuring them
   * costs one pass — no second render, no extra state.
   *
   * Only problems are labelled. A badge on the 27 shapes that are fine is noise;
   * the two that would break are the whole point.
   *
   * @param {HTMLElement} box the .layout-library just drawn
   */
  function markLayoutFit(box) {
    if (!SF.measureSlideFit) return;
    box.querySelectorAll('.layout-choice').forEach(function (el2) {
      var choice = /** @type {HTMLElement} */ (el2);
      var node = choice.querySelector('.variant-frame > *');
      if (!node) return;
      /* fit() scales the trial down, and getBoundingClientRect is post-transform.
         Scaling the tolerance with it keeps the threshold at one slide pixel
         rather than the eight or so a thumbnail would otherwise allow. */
      var scale = node.getBoundingClientRect().width / SF.SLIDE_W;
      if (!(scale > 0)) return;
      var verdict = SF.measureSlideFit(node, { tolerance: SF.FIT_TOLERANCE * scale });
      if (!verdict) return;
      var badge = choice.querySelector('.layout-fit') || el('span', 'layout-fit');
      if (!verdict.fits) {
        choice.dataset.fit = 'tight';
        badge.textContent = 'may not fit';
        badge.title = 'Your words overflow this shape: ' +
          verdict.issues.slice(0, 3).map(function (i) {
            return i.element + ' ' + i.direction + ' by ' + Math.round(i.px) + 'px';
          }).join(', ') + '. Nothing is shrunk to hide it.';
      } else if (!verdict.legible) {
        choice.dataset.fit = 'small';
        badge.textContent = 'small text';
        badge.title = 'This shape paints text at ' + verdict.smallest + 'px in ' +
          verdict.smallestIn + ', under the ' + SF.LEGIBLE_FLOOR + 'px floor. It fits, but the back of the room will not read it.';
      } else {
        choice.dataset.fit = 'ok';
        badge.remove();
        return;
      }
      if (!badge.parentNode) choice.appendChild(badge);
    });
  }

  /**
   * Callouts: which categories the chart is walked through, and what to say.
   *
   * Chosen from the chart's own categories rather than typed, for two
   * reasons: a typo would point at nothing, and a category renamed in the
   * table would leave the callout behind. Stored as the label, looked up at
   * the press — so inserting a row above it does not move the callout.
   *
   * @param {HTMLElement} insp
   * @param {object} s
   * @param {{categories: string[]}} cd  the chart's parsed data
   */
  function drawCallouts(insp, s, cd) {
    var cats = (cd && cd.categories) || [];
    if (!cats.length) return;
    var list = Array.isArray(s.callouts) ? s.callouts : [];
    var box = el('div', 'callout-list');
    list.forEach(function (callout, i) {
      var row = el('div', 'callout-row');
      var pick = UI.select(cats.map(function (c) { return { value: c, label: c }; }),
        String(callout.label || cats[0]), function (v) {
          s.callouts[i].label = v; touched(); repaint();
        });
      row.appendChild(UI.field('Zoom to', pick));
      row.appendChild(UI.field('Say', UI.text(callout.note || '', function (v) {
        s.callouts[i].note = v; touched(); repaint();
      })));
      row.appendChild(UI.button('Remove', 'ghost', function () {
        s.callouts.splice(i, 1);
        if (!s.callouts.length) delete s.callouts;
        touched(); draw();
      }));
      box.appendChild(row);
    });
    if (list.length < 6) {
      box.appendChild(UI.button('Add a callout', 'ghost', function () {
        s.callouts = (Array.isArray(s.callouts) ? s.callouts : []).concat([
          { label: cats[Math.min(list.length, cats.length - 1)], note: '' }
        ]);
        touched(); draw();
      }));
    }
    insp.appendChild(UI.field('Walk the chart (optional)', box,
      'Next zooms to each of these in turn before the slide moves on, and the last press puts the whole chart back. Say what the room should notice \u2014 left empty, the category is named instead.'));
  }

  /**
   * Extra fields this layout does not draw. They are still on the slide —
   * switching layout used to look like they had vanished.
   *
   * “Show” changes the shape of this slide (or makes a copy). That used to
   * happen on the click, which felt like the current layout being overpowered.
   */
  function drawUnusedOnLayout(parent, s) {
    var hidden = SF.ContentTools.hidden(s);
    if (!hidden.length) return;
    var note = el('div', 'unused-on-layout');
    note.appendChild(el('p', 'hint',
      (hidden.length === 1
        ? 'This layout is not showing one thing still stored on the slide. It is not deleted. '
        : 'This layout is not showing ' + hidden.length + ' things still stored on the slide. They are not deleted. ')
      + 'Showing one changes this slide — you will be asked first.'));
    hidden.forEach(function (item) {
      var layoutName = (SF.SLIDE_TYPES[item.layout] && SF.SLIDE_TYPES[item.layout].label) || item.layout;
      note.appendChild(UI.button('Show the ' + item.label + ' · ' + layoutName, 'ghost', function () {
        restoreUnused(s, item);
      }));
    });
    parent.appendChild(note);
  }

  function restoreUnused(s, item) {
    var here = (SF.SLIDE_TYPES[s.type] && SF.SLIDE_TYPES[s.type].label) || s.type;
    var there = (SF.SLIDE_TYPES[item.layout] && SF.SLIDE_TYPES[item.layout].label) || item.layout;
    function overwrite() {
      SF.prepareLayout(s, item.layout);
      touched();
      draw();
      SF.toast('This slide is now ' + there + ', so the ' + item.label + ' can show.');
    }
    function addCopy() {
      var next = SF.normalizeSlide(JSON.parse(JSON.stringify(s)));
      next.id = SF.uid();
      SF.prepareLayout(next, item.layout);
      deck.slides.push(next);
      sel = deck.slides.length - 1;
      inspectorTab = 'content';
      designPane = 'edit';
      touched();
      draw();
      SF.toast(there + ' added at the end, with the ' + item.label + ' showing.');
    }
    if (!SF.askChoice) { overwrite(); return; }
    SF.askChoice({
      title: 'Show the ' + item.label + '?',
      detail: 'This slide is a ' + here + '. That layout cannot display the ' + item.label + '. Changing it to ' + there + ' will. Cancel keeps this slide as it is.',
      options: [
        { value: 'overwrite', label: 'Change this slide',
          detail: 'This slide becomes ' + there + '. The ' + item.label + ' will show. Undo puts it back.' },
        { value: 'add', label: 'Make a new slide instead',
          detail: 'Puts a copy as ' + there + ' at the end of the deck. This slide stays a ' + here + '.' }
      ]
    }, function (choice) {
      if (choice === 'add') addCopy();
      else overwrite();
    });
  }

  /**
   * Three alternative layouts for the words and picture already on this slide.
   *
   * The grouped grid below names every layout; this row shows what this
   * slide would look like as one, using the real content. Nothing is
   * converted or discarded on the way: normalizeSlide keeps every field
   * whatever the type, so title, bullets, body and image all survive a switch
   * and switching back returns exactly what was there.
   */
  function variantsFor(slide) {
    var hasImage = !!String(slide.image || '').trim();
    var lines = (slide.bullets || []).filter(function (b) { return String(b).trim(); }).length;
    var hasBody = !!String(slide.body || '').trim();

    /* Ordered by how well each one suits what the slide actually holds, then
       cut to three — a row of eight previews is the grid again, not a
       suggestion. */
    var ranked = [];
    /* Four or more candidates each, because the current layout is struck out
       below and a list of exactly three would come back as two. */
    if (hasImage && lines) ranked.push('split', 'image', 'content', 'cards');
    else if (hasImage) ranked.push('image', 'split', 'quote', 'section');
    else if (lines >= 3) ranked.push('cards', 'content', 'keywords', 'table');
    else if (lines) ranked.push('content', 'cards', 'section', 'split');
    else if (hasBody) ranked.push('quote', 'section', 'title', 'content');
    else ranked.push('section', 'title', 'content', 'quote');

    return ranked.filter(function (t, i) {
      return t !== slide.type && ranked.indexOf(t) === i && SF.SLIDE_TYPES[t];
    }).slice(0, 3);
  }

  function drawVariants(insp, s) {
    var picks = variantsFor(s);
    if (!picks.length) return;

    var row = el('div', 'variant-row');
    picks.forEach(function (type) {
      var card = el('button', 'variant-card');
      card.type = 'button';
      card.title = 'Use the ' + SF.SLIDE_TYPES[type].label + ' layout';

      /* A real render of a real copy, so the preview cannot promise something
         the switch will not deliver. The copy is thrown away either way. */
      var trial = SF.prepareLayout(SF.normalizeSlide(JSON.parse(JSON.stringify(s))), type);
      var frame = el('div', 'variant-frame');
      var node = SF.renderSlide(deck, trial, { index: sel, total: deck.slides.length, chrome: false });
      frame.appendChild(node);
      SF.fit(frame, node);
      card.appendChild(frame);
      card.appendChild(el('span', 'variant-name', SF.SLIDE_TYPES[type].label));
      card.onclick = function () {
        SF.prepareLayout(s, type);
        touched();
        draw();
      };
      row.appendChild(card);
    });
    insp.appendChild(UI.field('Try another look', row,
      'The same words, in a different shape. Extra material stays on the slide even if this layout does not draw it.'));
  }

  /* Text fields preserve formatting separately from lesson content. */
  /* Read off the layout table rather than repeated here: a layout that grew a
     pit cap in one file and not the other is exactly the drift this removes. */
  var PIT_MAX = (function () {
    var m = {};
    Object.keys(SF.SLIDE_TYPES).forEach(function (k) {
      if (SF.SLIDE_TYPES[k].pits) m[k] = SF.SLIDE_TYPES[k].pits;
    });
    return m;
  })();

  function ensurePits(s) {
    if (!Array.isArray(s.bullets)) s.bullets = [];
    var min = 3;
    var empty = (s.type === 'keywords' || s.type === 'italics' || s.type === 'links')
      ? SF.formatKeywordLine('', '') : '';
    while (s.bullets.length < min) s.bullets.push(empty);
  }

  var contentDrag=null;
  function contentOrder(row,s,i,wrap,redraw){
    var controls=el('div','content-order');
    function move(to){if(!SF.ContentTools.move(s,i,to))return;touched();redraw();repaint();var next=wrap.querySelectorAll('.content-grip')[to];if(next)next.focus();}
    var grip=UI.button('⠿','content-grip',function(){});grip.title='Drag to reorder; Alt + ↑ or ↓ to move';grip.setAttribute('aria-label','Reorder item '+(i+1));grip.draggable=true;
    grip.ondragstart=function(e){contentDrag={slide:s.id,index:i};e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',String(i));};
    grip.ondragend=function(){contentDrag=null;wrap.querySelectorAll('.content-drop').forEach(function(n){n.classList.remove('content-drop');});};
    grip.onkeydown=function(e){if(e.altKey&&['ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();move(i+(e.key==='ArrowUp'?-1:1));}};
    row.ondragover=function(e){if(contentDrag&&contentDrag.slide===s.id){e.preventDefault();e.dataTransfer.dropEffect='move';row.classList.add('content-drop');}};
    row.ondragleave=function(){row.classList.remove('content-drop');};
    row.ondrop=function(e){row.classList.remove('content-drop');if(!contentDrag||contentDrag.slide!==s.id)return;e.preventDefault();var from=contentDrag.index;contentDrag=null;if(SF.ContentTools.move(s,from,i)){touched();redraw();repaint();}};
    controls.appendChild(grip);
    /** @type {[string, number][]} */
    var moveButtons = [['↑', -1], ['↓', 1]];
    moveButtons.forEach(function (pair) {
      var delta = pair[1];
      var b = UI.button(pair[0], 'move-point', function () { move(i + delta); });
      b.setAttribute('aria-label', 'Move item ' + (i + 1) + (delta < 0 ? ' up' : ' down'));
      b.disabled = i + delta < 0 || i + delta >= s.bullets.length;
      controls.appendChild(b);
    });
    row.appendChild(controls);
  }
  function bulkContent(wrap,s,redraw){
    var box=el('details','bulk-content');box.appendChild(el('summary',null,'Paste several points at once'));
    var area=el('textarea');area.rows=5;area.placeholder='Paste one point per line…';area.setAttribute('aria-label','Points to insert');box.appendChild(area);
    var status=el('p','hint');status.setAttribute('role','status');box.appendChild(status);
    area.oninput=function(){status.textContent=SF.ContentTools.lines(area.value).length+' points to add. Existing content will be kept.';};
    box.appendChild(UI.button('Insert points','primary',function(){var n=SF.ContentTools.append(s,area.value);if(!n){status.textContent='Paste at least one point first.';return;}touched();redraw();repaint();SF.toast(n+' points inserted');}));wrap.appendChild(box);
    if(s.bullets.filter(function(v){return v.trim();}).length>(PIT_MAX[s.type]||8)){
      wrap.appendChild(el('p','hint','More content than this layout comfortably holds. Spread it over matching slides to keep it readable.'));
      wrap.appendChild(UI.button('Spread across slides','ghost',function(){var slides=SF.ContentTools.split(s,PIT_MAX[s.type]||8);deck.slides.splice.apply(deck.slides,[sel,1].concat(slides));touched();draw();}));
    }
  }
  function drawPairPits(wrap, s, kind) {
    var italic = kind === 'italics';
    var links = kind === 'links';
    wrap.innerHTML = '';
    wrap.className = 'pit-list keyword-pits' + (italic ? ' italics-pits' : '') + (links ? ' links-pits' : '');
    ensurePits(s);
    var max = PIT_MAX[kind] || 8;
    var leadPh = kind === 'journey' ? 'Milestone heading' : kind === 'mindmap' ? 'Branch heading' : links ? 'Link label' : italic ? 'Phrase in italics' : 'Keyword';
    var trailPh = kind === 'journey' ? 'What happens here' : kind === 'mindmap' ? 'Short explanation' : links ? 'https://…' : italic ? 'plain explanation' : 'definition in plain language';
    var leadCls = links ? 'ln-label-input' : italic ? 'it-phrase-input' : 'kw-term-input';
    var trailCls = links ? 'ln-url-input' : italic ? 'it-note-input' : 'kw-def-input';
    var addLabel = kind === 'journey' ? 'milestone' : kind === 'mindmap' ? 'branch' : links ? 'link' : italic ? 'phrase' : 'keyword';
    s.bullets.forEach(function (line, i) {
      var parsed = SF.parseKeywordLine(line);
      var row = el('div', 'pit-row keyword' + ((parsed.term || parsed.def) ? '' : ' empty'));
      contentOrder(row,s,i,wrap,function(){drawPairPits(wrap,s,kind);});
      row.appendChild(el('span', 'pit-i', String(i + 1).padStart(2, '0')));
      var term = UI.text(parsed.term, function (v) {
        s.bullets[i] = SF.formatKeywordLine(v, SF.parseKeywordLine(s.bullets[i]).def);
        touched();
        repaint();
        row.classList.toggle('empty', !SF.parseKeywordLine(s.bullets[i]).term && !SF.parseKeywordLine(s.bullets[i]).def);
      }, leadPh);
      term.className = (term.className ? term.className + ' ' : '') + leadCls;
      term.dataset.contentKey = 'bullets.' + i;
      term.dataset.contentPart = 'lead';
      var def = UI[kind === 'journey' ? 'area' : 'text'](parsed.def, function (v) {
        s.bullets[i] = SF.formatKeywordLine(SF.parseKeywordLine(s.bullets[i]).term, v);
        touched();
        repaint();
        row.classList.toggle('empty', !SF.parseKeywordLine(s.bullets[i]).term && !SF.parseKeywordLine(s.bullets[i]).def);
      }, kind === 'journey' ? 4 : trailPh);
      if (kind === 'journey') def.setAttribute('aria-label', 'What happens here');
      def.className = (def.className ? def.className + ' ' : '') + trailCls;
      def.dataset.contentKey = 'bullets.' + i;
      def.dataset.contentPart = 'trail';
      if (links) def.inputMode = 'url';
      var fields = el('div', 'kw-pit-fields');
      fields.appendChild(term);
      fields.appendChild(def);
      row.appendChild(fields);
      var kill = el('button', 'kill', '×');
      kill.type = 'button';
      kill.title = 'Remove';
      kill.setAttribute('aria-label', 'Remove row ' + (i + 1));
      kill.onclick = function () {
        if (s.bullets.length <= 1) s.bullets[0] = SF.formatKeywordLine('', '');
        else s.bullets.splice(i, 1);
        ensurePits(s);
        touched();
        drawPairPits(wrap, s, kind);
        repaint();
      };
      row.appendChild(kill);
      wrap.appendChild(row);
    });
    bulkContent(wrap,s,function(){drawPairPits(wrap,s,kind);});
    if (s.bullets.length < max) {
      var add = UI.button('+ Add ' + addLabel, 'ghost pit-add', function () {
        s.bullets.push(SF.formatKeywordLine('', ''));
        touched();
        drawPairPits(wrap, s, kind);
        repaint();
        var sel = wrap.querySelectorAll('.' + leadCls);
        if (sel.length) sel[sel.length - 1].focus();
      });
      wrap.appendChild(add);
    }
  }

  function drawKeywordPits(wrap, s) {
    drawPairPits(wrap, s, 'keywords');
  }

  /* Three fields per pit for the infographic layouts — label · value · note —
     written back as one tab-separated line so the row still reorders, bulk
     pastes and spreads across slides like any other bullet. `cols` names the
     fields per type; a two-column type (Versus) simply omits the third. */
  var INFO_COLS = {
    stats:    ['Label', 'Value', 'Note'],
    funnel:   ['Stage', 'Value', 'Note'],
    timeline: ['Date', 'Event', 'Detail'],
    compare:  ['Left column', 'Right column', 'Row label (optional)']
  };
  function drawInfoPits(wrap, s) {
    wrap.innerHTML = '';
    wrap.className = 'pit-list keyword-pits info-pits';
    ensurePits(s);
    var max = PIT_MAX[s.type] || 8;
    var cols = INFO_COLS[s.type] || INFO_COLS.stats;
    var compare = s.type === 'compare';
    function isEmpty(line) { var p = SF.parseInfoLine(line); return !(p.label || p.value || p.note); }
    function readRow(i) {
      var p = SF.parseInfoLine(s.bullets[i]);
      /* Versus stores an optional row label first: "aspect\tleft\tright".
         In the inspector the label is the third field, so map both ways. */
      return compare && p.note ? [p.value, p.note, p.label] : [p.label, p.value, p.note];
    }
    function writeRow(i, parts) {
      s.bullets[i] = compare
        ? (parts[2] ? SF.formatInfoLine(parts[2], parts[0], parts[1]) : SF.formatInfoLine(parts[0], parts[1], ''))
        : SF.formatInfoLine(parts[0], parts[1], parts[2]);
    }
    s.bullets.forEach(function (line, i) {
      var row = el('div', 'pit-row keyword' + (isEmpty(line) ? ' empty' : ''));
      contentOrder(row, s, i, wrap, function () { drawInfoPits(wrap, s); });
      row.appendChild(el('span', 'pit-i', String(i + 1).padStart(2, '0')));
      var fields = el('div', 'kw-pit-fields info-pit-fields');
      cols.forEach(function (ph, c) {
        var input = UI.text(readRow(i)[c], function (v) {
          var parts = readRow(i); parts[c] = v; writeRow(i, parts);
          touched(); repaint();
          row.classList.toggle('empty', isEmpty(s.bullets[i]));
        }, ph);
        input.className = (input.className ? input.className + ' ' : '') + (c === 0 ? 'kw-term-input' : 'kw-def-input');
        input.setAttribute('aria-label', ph + ' ' + (i + 1));
        fields.appendChild(input);
      });
      row.appendChild(fields);
      var kill = el('button', 'kill', '×');
      kill.type = 'button';
      kill.title = 'Remove';
      kill.setAttribute('aria-label', 'Remove row ' + (i + 1));
      kill.onclick = function () {
        if (s.bullets.length <= 1) s.bullets[0] = '';
        else s.bullets.splice(i, 1);
        ensurePits(s);
        touched();
        drawInfoPits(wrap, s);
        repaint();
      };
      row.appendChild(kill);
      wrap.appendChild(row);
    });
    bulkContent(wrap, s, function () { drawInfoPits(wrap, s); });
    if (s.bullets.length < max) {
      var add = UI.button('+ Add row', 'ghost pit-add', function () {
        s.bullets.push('');
        touched();
        drawInfoPits(wrap, s);
        repaint();
        var sel = wrap.querySelectorAll('.kw-term-input');
        if (sel.length) sel[sel.length - 1].focus();
      });
      wrap.appendChild(add);
    }
  }

  /* URL box + file picker + clear for one card's picture. Writes into
     s.images[i], which the renderer already reads. */
  function cardImageField(s, i, redraw) {
    if (!Array.isArray(s.images)) s.images = [];
    var box = el('div', 'card-pic-field');
    var url = UI.text(s.images[i] || '', function (v) { s.images[i] = v.trim(); touched(); repaint(); }, 'Image URL');
    url.setAttribute('aria-label', 'Image URL for card ' + (i + 1));
    box.appendChild(url);
    var pick = el('input');
    pick.type = 'file';
    pick.accept = 'image/*';
    pick.setAttribute('aria-label', 'Image file for card ' + (i + 1));
    pick.addEventListener('change', function () {
      var f = pick.files && pick.files[0];
      if (!f) return;
      if (f.size > 3.5 * 1024 * 1024) SF.toast('That image is over 3.5 MB — it may exceed the browser storage limit.');
      var fr = new FileReader();
      fr.onload = function () { s.images[i] = String(fr.result); touched(); redraw(); repaint(); };
      fr.readAsDataURL(f);
    });
    box.appendChild(pick);
    if (s.images[i]) {
      box.appendChild(UI.button('Remove image', 'ghost', function () {
        s.images[i] = ''; touched(); redraw(); repaint();
      }));
    }
    return box;
  }

  function drawPits(wrap, s) {
    wrap.innerHTML = '';
    wrap.className = 'pit-list';
    ensurePits(s);
    var max = PIT_MAX[s.type] || 8;
    var pictureCards = s.type === 'cards' && (s.design || {}).cardsMode === 'pictures';
    s.bullets.forEach(function (text, i) {
      var row = el('div', 'pit-row' + (String(text).trim() ? '' : ' empty'));
      contentOrder(row,s,i,wrap,function(){drawPits(wrap,s);});
      row.appendChild(el('span', 'pit-i', s.type === 'cards' ? String(i + 1).padStart(2, '0') : '•'));
      var input = richField(s, "bullets." + i, "text", function (v) {
        s.bullets[i] = v;
        touched();
        repaint();
        row.classList.toggle('empty', !String(v).trim());
      }, s.type === 'cards' ? 'Card ' + (i + 1) : 'Point ' + (i + 1));
      row.appendChild(input);
      /* Picture cards: each card owns an image slot, so the picker sits under
         its own card rather than in a separate list the author has to match
         up by number. */
      if (pictureCards) {
        var fields = el('div', 'kw-pit-fields card-pic-fields');
        row.replaceChild(fields, input);
        fields.appendChild(input);
        fields.appendChild(cardImageField(s, i, function () { drawPits(wrap, s); }));
      }
      var kill = el('button', 'kill', '×');
      kill.type = 'button';
      kill.title = 'Remove';
      kill.setAttribute('aria-label', 'Remove point ' + (i + 1));
      kill.onclick = function () {
        SF.Custom.removeBullet(s,i);
        ensurePits(s);
        touched();
        drawPits(wrap, s);
        repaint();
      };
      row.appendChild(kill);
      wrap.appendChild(row);
    });
    bulkContent(wrap,s,function(){drawPits(wrap,s);});
    if (s.bullets.length < max) {
      var add = UI.button('+ Add ' + (s.type === 'cards' ? 'card' : 'point'), 'ghost pit-add', function () {
        s.bullets.push('');
        touched();
        drawPits(wrap, s);
        repaint();
        var inputs = wrap.querySelectorAll('input');
        if (inputs.length) inputs[inputs.length - 1].focus();
      });
      wrap.appendChild(add);
    }
  }

  /* One block per layer: the picture, what it shows, and whose it is. Kept in
     a plain list rather than the pit editor the bullet layouts use, because a
     layer is three fields and a file picker, not a line of text. */
  function drawLayers(host, s) {
    host.textContent = '';
    if (!Array.isArray(s.layers)) s.layers = [];
    s.layers.forEach(function (layer, i) {
      var row = el('div', 'layer-row');
      var head = el('div', 'layer-head');
      head.appendChild(el('span', 'layer-num', String(i + 1)));
      var del = UI.button('Remove', 'ghost', function () {
        s.layers.splice(i, 1); touched(); drawLayers(host, s); repaint();
      });
      head.appendChild(del);
      row.appendChild(head);

      row.appendChild(UI.field('Image URL or data',
        UI.text(layer.image, function (v) { layer.image = v.trim(); touched(); repaint(); })));

      var pick = el('input');
      pick.type = 'file';
      pick.accept = 'image/*';
      pick.style.fontSize = '12px';
      pick.addEventListener('change', function () {
        var f = pick.files && pick.files[0];
        if (!f) return;
        if (f.size > 3.5 * 1024 * 1024) {
          SF.toast('That image is over 3.5 MB — it may exceed the browser storage limit.');
        }
        var fr = new FileReader();
        fr.onload = function () { layer.image = String(fr.result); touched(); draw(); };
        fr.readAsDataURL(f);
      });
      row.appendChild(UI.field('Embed a local file', pick,
        'Choose another file to replace the picture.'));
      if (String(layer.image || '').trim()) {
        row.appendChild(UI.button('Remove image', 'ghost', function () {
          layer.image = ''; touched(); drawLayers(host, s); repaint();
        }));
      }
      row.appendChild(UI.field('Caption',
        UI.text(layer.caption, function (v) { layer.caption = v; touched(); repaint(); })));
      row.appendChild(UI.field('Source / credit',
        UI.text(layer.source, function (v) { layer.source = v; touched(); repaint(); })));
      host.appendChild(row);
    });

    if (s.layers.length >= SF.GALLERY_MAX) {
      host.appendChild(el('div', 'hint', 'Eight is the most a stack can hold — past that it stops being a stack.'));
      return;
    }
    host.appendChild(UI.button('+ Add a picture', 'ghost', function () {
      s.layers.push({ image: '', caption: '', source: '' });
      touched(); drawLayers(host, s); repaint();
    }));
  }

  function drawImageFields(insp, s, opts) {
    opts = opts || {};
    if (opts.caption !== false) {
      insp.appendChild(UI.field(opts.captionLabel || 'Caption',
        richField(s, "title", "area", function (v) { s.title = v; touched(); repaint(); }, 2)));
    }
    var imgWrap = el('div');
    imgWrap.appendChild(UI.text(s.image, function (v) { s.image = v.trim(); touched(); repaint(); }));
    var pick = el('input');
    pick.type = 'file';
    pick.accept = 'image/*';
    pick.style.cssText = 'font-size:12px;margin-top:7px;display:block;width:100%';
    pick.addEventListener('change', function () {
      var f = pick.files && pick.files[0];
      if (!f) return;
      if (f.size > 3.5 * 1024 * 1024) {
        SF.toast('That image is over 3.5 MB — it may exceed the browser storage limit.');
      }
      var fr = new FileReader();
      fr.onload = function () { s.image = fr.result; touched(); draw(); };
      fr.readAsDataURL(f);
    });
    imgWrap.appendChild(pick);
    if (String(s.image || '').trim()) {
      var clearImg = UI.button('Remove image', 'ghost', function () {
        s.image = ''; touched(); draw();
      });
      clearImg.style.cssText = 'font-size:12px;margin-top:7px;width:100%';
      imgWrap.appendChild(clearImg);
    }
    insp.appendChild(UI.field('Image', imgWrap,
      String(s.image || '').trim()
        ? 'Replace with a new URL or file, or remove to clear the picture.'
        : 'Paste a URL, or embed a local file.'));
    insp.appendChild(UI.field('Fit', UI.select(
      [{ value: 'cover', label: 'Fill the panel (crop)' },
       { value: 'contain', label: 'Fit inside (letterbox)' }],
      s.imageFit, function (v) { s.imageFit = v; touched(); repaint(); })));

    /* Where a borrowed chart says whose it is. Offered on split as well as
       image slides: the attribution belongs beside the picture, not buried in
       a bullet that scrolls past. */
    if (opts.credit !== false) insp.appendChild(UI.field('Source / credit',
      richField(s, "subtitle", "text", function (v) { s.subtitle = v; touched(); repaint(); }),
      'Shown small under the caption — e.g. Financial Times, 2016.'));
  }

  /* Video and music are references, so this is a text field first and a file
     picker never — see safeMedia in model.js for why. The picker below writes
     a path, it does not read the file. */
  function drawVideoFields(insp, s) {
    insp.appendChild(UI.field('Caption',
      richField(s, "title", "area", function (v) { s.title = v; touched(); repaint(); }, 2)));
    insp.appendChild(UI.field('Video URL or path',
      UI.text(s.video, function (v) { s.video = SF.safeMedia(v); touched(); repaint(); },
        'clips/mitosis.mp4'),
      'An http(s) URL, or a path relative to the app folder. The file is not ' +
      'copied into the deck \u2014 keep it beside index.html and it works offline.'));

    var posterWrap = el('div');
    posterWrap.appendChild(UI.text(s.videoPoster, function (v) {
      s.videoPoster = SF.safeMedia(v); touched(); repaint();
    }));
    if (String(s.videoPoster || '').trim()) {
      var clearPoster = UI.button('Remove poster', 'ghost', function () {
        s.videoPoster = ''; touched(); draw();
      });
      clearPoster.style.cssText = 'font-size:12px;margin-top:7px;width:100%';
      posterWrap.appendChild(clearPoster);
    }
    insp.appendChild(UI.field('Poster image URL (optional)', posterWrap,
      String(s.videoPoster || '').trim()
        ? 'The still shown before it plays. Replace the URL or remove to clear it.'
        : 'The still shown before it plays, and in the slide rail.'));

    insp.appendChild(UI.field('Start at (seconds)',
      UI.num(s.videoStart || null, function (v) {
        s.videoStart = Math.max(0, Number(v) || 0); touched(); repaint();
      }, 0, null, '0'),
      'For a clip inside a longer file.'));

    insp.appendChild(UI.field('Stop at (seconds)',
      UI.num(s.videoEnd || null, function (v) {
        s.videoEnd = Math.max(0, Number(v) || 0); touched(); repaint();
      }, 0, null, 'plays to the end'),
      'Leave empty to play to the end. Stops the clip without you reaching for the keyboard.'));

    insp.appendChild(UI.field('Fit', UI.select(
      [{ value: 'cover', label: 'Fill the slide (crop)' },
       { value: 'contain', label: 'Fit inside (letterbox)' }],
      s.imageFit, function (v) { s.imageFit = v; touched(); repaint(); })));

    insp.appendChild(UI.check('Play when the slide appears', s.videoAutoplay,
      function (v) { s.videoAutoplay = v; touched(); repaint(); }));
    insp.appendChild(UI.check('Loop', s.videoLoop,
      function (v) { s.videoLoop = v; touched(); repaint(); }));
    insp.appendChild(UI.check('Start muted', s.videoMuted,
      function (v) { s.videoMuted = v; touched(); repaint(); }));
    insp.appendChild(el('p', 'hint',
      'Browsers refuse to autoplay sound until you have clicked something on ' +
      'the page. Presenting counts as that click, so this normally works \u2014 ' +
      'but tick "start muted" if a clip has to play the instant a slide lands.'));
  }

  function drawContentFields(insp, s) {
    // Additional authored fields exposed by shared structured compositions.
    var composition = SF.slideComposition(deck, s);
    if (composition === 'poster-art' || composition === 'ballot') {
      insp.appendChild(UI.field(composition === 'poster-art' ? 'Supporting line' : 'Voting instruction',
        richField(s, 'body', 'area', function(v){s.body=v;touched();repaint();}, 2)));
    }
    if (composition === 'ballot') {
      insp.appendChild(UI.field('Context',
        richField(s, 'subtitle', 'text', function(v){s.subtitle=v;touched();repaint();})));
    }
    /* Slide date moved to the Header & footer pane on 2026-09-18, next to the
       date slot that can now display it. It is the same slide.date either way;
       a title slide still prints it under the subtitle. */
    if (s.type === 'journey') {
      insp.appendChild(UI.field('Journey title',
        richField(s, 'title', 'text', function (v) { s.title = v; touched(); repaint(); })));
      insp.appendChild(UI.field('Context',
        richField(s, 'subtitle', 'text', function (v) { s.subtitle = v; touched(); repaint(); })));
      insp.appendChild(UI.field('Show as', UI.select(
        [{ value: 'path', label: 'Route with milestones' },
         { value: 'handover', label: 'Connected stages' },
         { value: 'stepper', label: 'Stepper — numbered discs on one rail' }],
        s.journeyMode || 'path', function (v) { s.journeyMode = v; touched(); repaint(); })));
      var stops = el('div');
      drawPairPits(stops, s, 'journey');
      insp.appendChild(UI.field('Milestones · heading and detail', stops,
        'Use up to six short stops for a route, or two to three connected stages. Next reveals each one.'));
      insp.appendChild(UI.field('Takeaway / reading',
        richField(s, 'body', 'area', function (v) { s.body = v; touched(); repaint(); }, 2)));
      return;
    }
    if (s.type === 'mindmap') {
      insp.appendChild(UI.field('Central idea', richField(s, 'title', 'area', function (v) { s.title = v; touched(); repaint(); }, 2)));
      var branches = el('div');
      drawPairPits(branches, s, 'mindmap');
      insp.appendChild(UI.field('Branches · heading and explanation', branches,
        'Keep to six short branches for a readable map. Build on Next reveals one branch at a time.'));
      return;
    }
    if (s.type === 'orgchart') {
      insp.appendChild(UI.field('Title',
        richField(s, 'title', 'area', function (v) { s.title = v; touched(); repaint(); }, 2)));
      insp.appendChild(UI.field('Subtitle',
        richField(s, 'subtitle', 'text', function (v) { s.subtitle = v; touched(); repaint(); })));
      var people = el('div');
      drawPits(people, s);
      insp.appendChild(UI.field('People · one per line', people,
        'Name | Role | Reports to | photo. Reports-to is a name on this slide, not a row number — reorder freely. Leave Reports to blank for a flat team (no connectors).'));
      var tree = SF.orgTree(s.bullets || []);
      insp.appendChild(el('p', 'hint',
        tree.people.length
          ? tree.people.length + (tree.people.length === 1 ? ' person' : ' people') +
            (tree.levels > 1 ? ' · ' + tree.levels + ' levels' : ' · flat team')
          : 'No people yet.'));
      (tree.warnings || []).forEach(function (w) {
        insp.appendChild(el('p', 'hint field-warn', w));
      });
      if (tree.levels > 4) {
        insp.appendChild(el('p', 'hint field-warn',
          'This tree is ' + tree.levels + ' levels deep — it still draws, but cards shrink. Prefer fewer layers on a lecture slide.'));
      }
      return;
    }
    if (s.type === 'keyfact') {
      insp.appendChild(UI.field('Heading',
        richField(s, 'title', 'text', function (v) { s.title = v; touched(); repaint(); })));
      insp.appendChild(UI.field('What the fact is',
        richField(s, 'subtitle', 'text', function (v) { s.subtitle = v; touched(); repaint(); }),
        'The small line above the fact — "Canvas deadline", "Pass mark", "Word limit". A number on its own does not mean anything.'));
      insp.appendChild(UI.field('The fact',
        richField(s, 'body', 'area', function (v) { s.body = v; touched(); repaint(); }, 2),
        'Keep it to a few words. This is set large, and long sentences stop being one thing the room can hold.'));
      var notes = el('div');
      drawPits(notes, s);
      insp.appendChild(UI.field('Supporting points', notes,
        'Everything that matters less than the fact above. Three or four at most.'));
      return;
    }
    if (SF.INFO_LAYOUTS && SF.INFO_LAYOUTS.indexOf(s.type) >= 0) {
      var INFO_HINTS = {
        stats:    ['Stats · label, value, note', 'Three to six. The value is set large — "92%", "£1.2m", "3 of 5". Ring and bar styles read the leading number.'],
        compare:  ['Rows · left, right, optional label', 'Each row is one point of comparison. Add a row label when the rows need naming ("Cost", "Speed").'],
        funnel:   ['Stages · name, value, note', 'Top to bottom. Numeric values set the band widths; without numbers the bands narrow evenly.'],
        timeline: ['Events · date, event, detail', 'Up to eight. Dates can be years, terms or "Week 3" — they are labels, not parsed.']
      };
      var hint = INFO_HINTS[s.type];
      insp.appendChild(UI.field('Heading',
        richField(s, 'title', 'text', function (v) { s.title = v; touched(); repaint(); })));
      if (s.type === 'compare') {
        insp.appendChild(UI.field('Column headings',
          richField(s, 'subtitle', 'text', function (v) { s.subtitle = v; touched(); repaint(); }),
          'Left | Right — "Before | After", "Myth | Fact", "Option A | Option B".'));
      } else {
        insp.appendChild(UI.field('Context line',
          richField(s, 'subtitle', 'text', function (v) { s.subtitle = v; touched(); repaint(); }),
          'Optional. Where the numbers come from, or the period they cover.'));
      }
      var pits = el('div');
      drawInfoPits(pits, s);
      insp.appendChild(UI.field(hint[0], pits, hint[1]));
      insp.appendChild(UI.field('Takeaway',
        richField(s, 'body', 'area', function (v) { s.body = v; touched(); repaint(); }, 2),
        'Optional line under the graphic — the one sentence the numbers add up to.'));
      return;
    }
    if (s.type === 'introduction') {
      insp.appendChild(UI.field('Lecturer name', richField(s, 'title', 'text', function (v) { s.title = v; touched(); repaint(); })));
      insp.appendChild(UI.field('Job title', richField(s, 'subtitle', 'text', function (v) { s.subtitle = v; touched(); repaint(); })));
      insp.appendChild(UI.field('Introduction', richField(s, 'body', 'area', function (v) { s.body = v; touched(); repaint(); }, 4)));
      drawImageFields(insp, s, { caption: false, credit: false });
      return;
    }

    if (SF.Explore && SF.Explore.inspector(insp, s, UI, function () { touched(); repaint(); }, function () { touched(); draw(); })) return;
    if (s.type === 'video') {
      drawVideoFields(insp, s);
      return;
    }

    if (s.type === 'chart') {
      insp.appendChild(UI.field('Chart title',
        richField(s, "title", "area", function (v) { s.title = v; touched(); repaint(); }, 2)));
      /* Grouped by the Financial Times' Visual Vocabulary, whose argument is
         the order of the questions: decide which relationship in the data
         matters, then pick a chart inside that family. Seventeen types in a
         flat list invites choosing by appearance, which on this module is
         the wrong lesson to teach by accident.

         The labels stay — a heading says what question the family answers,
         and the option says what that particular chart is for. */
      var LABELS = {
        bar: 'Bar — compare magnitude',
        stack: 'Stacked bar — the total, and what makes it up',
        hbar: 'Horizontal bar — when the names are long',
        line: 'Line — change over time',
        area: 'Area — change over time, with the volume under it',
        pie: 'Pie — parts of one whole',
        donut: 'Donut — parts of one whole, total in the middle',
        treemap: 'Treemap — parts of one whole, biggest owns the eye',
        waffle: 'Waffle — parts of one whole, counted as squares',
        bullet: 'Bullet — actual against a target',
        combo: 'Columns + markers — size and a rate together',
        radar: 'Radar — several variables on one shape (teach with care)',
        sankey: 'Sankey — where a quantity goes',
        scatter: 'Scatter — do two things move together',
        histogram: 'Histogram — the shape of one variable',
        box: 'Box plot — spread, skew and outliers',
        pictogram: 'Pictogram — counted in icons, not measured',
        dumbbell: 'Dumbbell — the gap between two states',
        matrix: 'Evidence matrix — ratings across conditions',
        multiples: 'Small multiples — one panel each, same scale'
      };
      /* Once each. A <select> cannot hold the poster's cross-listings: two
         options sharing a value are not two choices, and picking the second
         makes the control jump to the first — so "Bar" chosen under Ranking
         would silently relocate to Magnitude. The chooser below keeps the
         cross-listing, where it can be shown without that failure. */
      var chartOpts = [];
      (SF.CHART_TAXONOMY || []).forEach(function (cat) {
        cat.kinds.forEach(function (k) {
          var home = SF.chartPrimaryCategory(k);
          if (home && home.key !== cat.key) return;
          chartOpts.push({ value: k, label: LABELS[k] || k, group: cat.label });
        });
      });
      insp.appendChild(UI.field('Chart type', UI.select(chartOpts,
        s.chartKind, function (v) { s.chartKind = v; touched(); repaint(); }),
        'Grouped by what the chart is for, after the FT\u2019s Visual Vocabulary.'));

      /* The poster's own route in: the question first, the shape second. */
      var chooser = UI.button('Not sure which? Start from the question \u2192', 'ghost', function () {
        SF.Shell.picker({
          title: 'What matters most in this data?',
          wide: true,
          items: function () {
            return (SF.CHART_TAXONOMY || []).map(function (cat) {
              var can = cat.kinds.length;
              var lacks = (cat.missing || []).length
                ? '  Not drawn here: ' + cat.missing.join(', ') + '.'
                : '';
              return {
                id: cat.key,
                title: cat.label + ' \u00b7 ' + cat.question,
                blurb: cat.note + (can
                  ? '  \u2014 ' + can + (can === 1 ? ' chart here.' : ' charts here.')
                  : '  \u2014 SlideForge draws no maps, so nothing here yet.') + lacks
              };
            });
          },
          describe: function (it) { return it.blurb; },
          onPick: function (it) {
            var cat = (SF.CHART_TAXONOMY || []).filter(function (c) { return c.key === it.id; })[0];
            if (!cat) return;
            if (!cat.kinds.length) {
              SF.toast(cat.label + ': ' + cat.missing.slice(0, 3).join(', ') +
                ' and others are the usual answers, and none of them is drawn here. Use an image for now.');
              return;
            }
            SF.Shell.picker({
              title: cat.label + ' \u00b7 ' + cat.question,
              wide: true,
              items: function () {
                /* Only pickable things. A row that does nothing when
                   clicked reads as a control that is broken, so what is
                   missing was said on the category instead. */
                return cat.kinds.map(function (k) {
                  var also = SF.chartCategories(k)
                    .filter(function (c) { return c.key !== cat.key; })
                    .map(function (c) { return c.label.toLowerCase(); });
                  return { id: k, title: LABELS[k] || k,
                    blurb: (k === s.chartKind ? 'What this slide uses now.' : 'Switch this slide to it.') +
                      (also.length ? '  Also answers ' + also.join(' and ') + '.' : '') };
                });
              },
              describe: function (it) { return it.blurb; },
              onPick: function (it) {
                if (!it.id) return;
                s.chartKind = it.id; touched(); repaint();
                SF.toast('Now a ' + (LABELS[it.id] || it.id).split(' \u2014 ')[0].toLowerCase() + '.');
              }
            });
          }
        });
      });
      /* Quiet, and under the menu it supplements rather than competing with
         it. The grouped menu is the everyday route; this is for the question
         "which of these should it even be", which is asked once a slide. */
      chooser.style.cssText = 'font-size:11.5px;margin:-4px 0 10px;padding:2px 0;border:0;background:none;' +
        'text-decoration:underline;text-underline-offset:3px;opacity:.72;width:auto';
      insp.appendChild(chooser);

    /* Each idiom reads the same pasted table differently, and an author who
       is not told will paste the shape the last one wanted. */
    var SHAPES = {
      scatter: 'Two numeric columns: the first is x, the second y. One row per point.',
      histogram: 'One column of numbers. SlideForge counts them into bins.',
      box: 'One row per group: its name, then every value measured in it.',
      pictogram: 'One row per category, with the count beside it.',
      treemap: 'One series of parts that make a whole — same paste as a pie. Largest block draws the eye first.',
      waffle: 'One series of parts that make a whole. A single percentage (≤100) fills that many of 100 squares; several categories share the grid.',
      bullet: 'First series is Actual, second is Target. One row per category.',
      combo: 'First series draws as columns; every series after that draws as markers on the same axis.',
      radar: 'At least three categories (the spokes). Each series is one polygon.',
      sankey: 'Three columns: from, to, amount. One row per flow.',
      dumbbell: 'One row per category, then exactly two numbers — the two states being compared.',
      matrix: 'First row names the conditions. Then one row per item, with a rating in each cell.',
      multiples: 'One row per panel; the columns become the axis inside every panel. Read transposed.'
    };
    if (SHAPES[s.chartKind]) insp.appendChild(el('p', 'hint', SHAPES[s.chartKind]));

    if (s.chartKind === 'pictogram') {
      insp.appendChild(UI.field('Icon', UI.text(s.chartIcon || '', function (v) {
        s.chartIcon = String(v).trim().slice(0, 4); touched(); repaint();
      }), 'One emoji or character, repeated once per unit. A person, a book, a bus — something the room can count at a glance.'));
      insp.appendChild(UI.field('One icon is worth',
        UI.num(s.chartUnit > 1 ? s.chartUnit : null, function (v) {
          s.chartUnit = Math.max(1, Number(v) || 1); touched(); repaint();
        }, 1, null, 'chosen for you'),
        'Left empty, a unit is picked that keeps the longest row under twenty icons — past that nobody counts, they estimate.'));
    }
      insp.appendChild(UI.field('Data \u2014 one row per line',
        richField(s, "body", "area", function (v) { s.body = v; touched(); repaint(); }, 9),
        'First row names the series, first column the categories. Separate ' +
        'cells with | \u2014 or paste a range straight from a spreadsheet, ' +
        'which arrives tab-separated and needs no editing.'));
      insp.appendChild(UI.field('Source & caveat',
        UI.text(s.chartSource || '', function (v) {
          s.chartSource = String(v).slice(0, 200); touched(); repaint();
        }),
        'Printed under the chart and carried into the handout. Where the numbers came from, ' +
        'and what they are not \u2014 "Selected platform peaks, not annual means" does more ' +
        'for a room than a citation.'));

      var cd = SF.chartData(s);
      var note = cd.series.length
        ? cd.series.length + (cd.series.length === 1 ? ' series' : ' series') + ' \u00d7 ' +
          cd.categories.length + (cd.categories.length === 1 ? ' category' : ' categories')
        : 'No data yet \u2014 needs a header row and at least one row of values.';
      insp.appendChild(el('p', 'hint', note));
      /* Said plainly rather than enforced: the author may have a reason, and
         a slide that silently drops a column is worse than a warning. */
      if (['pie', 'donut', 'pictogram', 'treemap', 'waffle'].indexOf(s.chartKind) >= 0 && cd.series.length > 1) {
        var oneName = s.chartKind === 'donut' ? 'donut'
          : s.chartKind === 'treemap' ? 'treemap'
          : s.chartKind === 'waffle' ? 'waffle'
          : s.chartKind === 'pictogram' ? 'pictogram' : 'pie';
        insp.appendChild(el('p', 'hint field-warn',
          'A ' + oneName + ' shows one series. Only \u201c' +
          cd.series[0].name + '\u201d is drawn; the rest are ignored. Bar compares them all.'));
      }
      if (s.chartKind === 'combo' && cd.series.length < 2) {
        insp.appendChild(el('p', 'hint field-warn',
          'Columns + markers needs at least two series — the first for the columns, another for the markers.'));
      }
      if (s.chartKind === 'bullet' && cd.series.length < 1) {
        insp.appendChild(el('p', 'hint field-warn',
          'A bullet needs an Actual series; add a Target series as the second column to mark the goal.'));
      }
      /* Stacking negatives is not a thing this renderer does, and silently
         dropping them would make a total that does not match the data. */
      if (s.chartKind === 'stack' && cd.series.some(function (sr) {
        return sr.values.some(function (v) { return v != null && v < 0; });
      })) {
        insp.appendChild(el('p', 'hint field-warn',
          'Stacked bars add values up, so negatives are left out of the stack. Use grouped bars to show them.'));
      }
      /* The two ends are the whole idiom, so a third series is not a
         variation on it — the bar would join a pair it does not describe. */
      if (s.chartKind === 'dumbbell' && cd.series.length !== 2) {
        insp.appendChild(el('p', 'hint field-warn', cd.series.length < 2
          ? 'A dumbbell needs two numbers per row \u2014 the two states you are comparing.'
          : 'A dumbbell draws the first two series. The bar joins a pair, so the rest are left out; ' +
            'use grouped bars to show them all.'));
      }
      /* Ordinal, not interval: the point the source chart makes, and the one
         a data-visualisation course should not let slide. */
      if (s.chartKind === 'matrix') {
        insp.appendChild(el('p', 'hint',
          'Shade carries an order, not a distance. Low / Medium / High are ordinal \u2014 ' +
          'the gap between them is not a number, so say so in the source line.'));
      }
      /* The shared scale is what makes the layout a comparison rather than
         a wall of little charts, so an outlier is worth warning about. */
      if (s.chartKind === 'multiples' && cd.categories.length > 12) {
        insp.appendChild(el('p', 'hint field-warn',
          cd.categories.length + ' panels is past the point where each one is readable on a wall. ' +
          'Around eight is the most a room can compare at once.'));
      }
      if (cd.series.length > 6) {
        insp.appendChild(el('p', 'hint field-warn',
          'Six series is the ceiling \u2014 past that the colours stop being tellable apart. Group the tail into \u201cOther\u201d, or split the chart.'));
      }
      drawCallouts(insp, s, cd);
      return;
    }

    if (s.type === 'table') {
      insp.appendChild(UI.field('Table title',
        richField(s, "title", "area", function (v) { s.title = v; touched(); repaint(); }, 2)));
      insp.appendChild(UI.field('Rows \u2014 one per line',
        richField(s, "body", "area", function (v) { s.body = v; touched(); repaint(); }, 9),
        'Separate cells with | \u2014 or paste a range straight from a ' +
        'spreadsheet, which arrives tab-separated and needs no editing. ' +
        'Up to 12 rows and 6 columns.'));
      insp.appendChild(UI.check('First row is a header', s.tableHeader,
        function (v) { s.tableHeader = v; touched(); repaint(); }));
      var rows = SF.parseTable(s.body);
      insp.appendChild(el('p', 'hint', rows.length
        ? rows.length + (rows.length === 1 ? ' row' : ' rows') + ' \u00d7 ' +
          rows[0].length + (rows[0].length === 1 ? ' column' : ' columns') +
          (s.tableHeader && rows.length > 1 ? ', the first a header' : '')
        : 'Nothing parsed yet.'));
      return;
    }

    if (s.type === 'code') {
      insp.appendChild(UI.field('Slide title',
        richField(s, 'title', 'text', function (v) { s.title = v; touched(); repaint(); })));
      insp.appendChild(UI.field('Language', UI.select([
        { value: 'python', label: 'Python' },
        { value: 'javascript', label: 'JavaScript' },
        { value: 'text', label: 'Plain text' }
      ], s.language === 'javascript' ? 'javascript' : (s.language === 'text' ? 'text' : 'python'),
        function (v) { s.language = v; touched(); repaint(); }),
        'Label only — nothing runs on the wall. This is a viewer, not an editor.'));
      if (s.code == null) s.code = String(s.body || '');
      insp.appendChild(UI.field('Source',
        UI.area(s.code || '', function (v) {
          s.code = v;
          touched();
          repaint();
        }, 12),
        'What the projector types. Keep it short enough to read from the back of the room.'));
      var box = el('div');
      box.appendChild(UI.check('Type on enter', s.typewrite !== false, function (v) {
        s.typewrite = v;
        touched();
        repaint();
      }));
      box.appendChild(el('div', 'hint',
        'In Present, the code drips in character by character. Next skips to the finished source. The Lesson studio preview always shows the full text.'));
      insp.appendChild(UI.field('Playback', box));
      insp.appendChild(UI.field('Speed (ms per character)',
        UI.num(s.typeSpeed || 28, function (v) {
          s.typeSpeed = Math.max(8, Math.min(120, Number(v) || 28));
          touched();
        }, 8, 120),
        'Lower is faster. Around 24–36 feels like someone typing.'));
      return;
    }

    if (s.type === 'quote') {
      insp.appendChild(UI.field('Quotation',
        richField(s, "body", "area", function (v) { s.body = v; touched(); repaint(); }, 4)));
      insp.appendChild(UI.field('Attribution',
        richField(s, "subtitle", "text", function (v) { s.subtitle = v; touched(); repaint(); })));
      return;
    }

    if (s.type === 'statement') {
      insp.appendChild(UI.field('The line',
        richField(s, "body", "area", function (v) { s.body = v; touched(); repaint(); }, 3),
        'Six words reads best — it is set as large as it fits, so a sentence steps down.'));
      insp.appendChild(UI.field('Underneath (optional)',
        richField(s, "subtitle", "text", function (v) { s.subtitle = v; touched(); repaint(); }),
        'Who said it, or what it is from. Left empty, nothing is drawn.'));
      return;
    }

    if (s.type === 'image') {
      drawImageFields(insp, s);
      insp.appendChild(UI.field('Flip to facts', UI.area(s.body || '', function (v) {
        s.body = v; touched(); repaint();
      }, 4), 'Optional: one short fact per line. Adds a button to reveal a clean facts panel.'));
      return;
    }

    if (s.type === 'gallery') {
      insp.appendChild(UI.field('Title',
        richField(s, "title", "area", function (v) { s.title = v; touched(); repaint(); }, 2)));
      var stackBox = el('div');
      drawLayers(stackBox, s);
      insp.appendChild(UI.field('Pictures · one moment each', stackBox,
        'Shown one in front of the last. Turn on Build on Next to step through them.'));
      insp.appendChild(UI.field('Fit', UI.select(
        [{ value: 'cover', label: 'Fill the frame (crop)' },
         { value: 'contain', label: 'Fit inside (letterbox)' }],
        s.imageFit, function (v) { s.imageFit = v; touched(); repaint(); })));
      return;
    }

    if (s.type === 'split') {
      insp.appendChild(UI.field('Title',
        richField(s, "title", "area", function (v) { s.title = v; touched(); repaint(); }, 2)));
      var pits = el('div');
      drawPits(pits, s);
      insp.appendChild(UI.field('Points · drag to reorder', pits,
        'Keep it short — the image carries half the meaning.'));
      drawImageFields(insp, s, { caption: false, side: true });
      return;
    }

    if (s.type === 'keywords') {
      insp.appendChild(UI.field('Title',
        richField(s, "title", "area", function (v) { s.title = v; touched(); repaint(); }, 2)));
      var kw = el('div');
      drawPairPits(kw, s, 'keywords');
      insp.appendChild(UI.field('Keywords — bold term, lowercase definition', kw,
        'The slide shows the term in bold and the definition in lowercase.'));
      return;
    }

    if (s.type === 'italics') {
      insp.appendChild(UI.field('Title',
        richField(s, "title", "area", function (v) { s.title = v; touched(); repaint(); }, 2)));
      var it = el('div');
      drawPairPits(it, s, 'italics');
      insp.appendChild(UI.field('Italics — emphasised phrase, plain note', it,
        'The slide shows the phrase in italics and the explanation in regular type.'));
      return;
    }

    if (s.type === 'links') {
      insp.appendChild(UI.field('Title',
        richField(s, "title", "area", function (v) { s.title = v; touched(); repaint(); }, 2)));
      var ln = el('div');
      drawPairPits(ln, s, 'links');
      insp.appendChild(UI.field('Links — label + http(s) URL', ln,
        'Only http and https links become clickable. Opens in a new tab.'));
      return;
    }

    insp.appendChild(UI.field(s.type === 'content' ? 'Title' : 'Heading',
      richField(s, "title", "area", function (v) { s.title = v; touched(); repaint(); }, 2)));

    if (s.type === 'title' || s.type === 'section' || s.type === 'join') {
      insp.appendChild(UI.field('Subtitle',
        richField(s, "subtitle", "text", function (v) { s.subtitle = v; touched(); repaint(); })));
    }

    if (s.type === 'join') {
      var joinPits = el('div');
      drawPits(joinPits, s);
      insp.appendChild(UI.field('Lines under the heading (optional)', joinPits,
        'Keep short — the QR and PIN own the slide. Host live replaces the sample code.'));
      return;
    }

    if (s.type === 'content' || s.type === 'cards') {
      var bulletPits = el('div');
      drawPits(bulletPits, s);
      insp.appendChild(UI.field(
        s.type === 'cards' ? 'Cards · drag to reorder' : 'Bullets — click a pit to fill',
        bulletPits,
        'Empty pits stay off the slide until you type. Prefix with "- " for a sub-bullet.'
      ));
    }
  }

  /* The embed inspector is deliberately thin: everything about how the game
     plays is edited in Quiz studio, not here. One primary action, one summary. */
  function drawGameEmbed(insp, s) {
    var game = gameFor(s);

    if (!game) {
      var pick = UI.button('Choose a game →', 'primary', insertGame);
      pick.style.width = '100%';
      insp.appendChild(UI.field('Linked check', pick,
        s.gameId
          ? 'The game this slide pointed at has been deleted. Pick another, or delete this slide.'
          : 'No game chosen yet — this slide is skipped when you present.'));
      return;
    }

    var gfmt = SF.gameFormat(game.format);
    var title = game.title || (gfmt ? gfmt.label : SF.gameStyle(game.style).label);
    var facts = el('div', 'game-embed-card');
    facts.appendChild(el('strong', 'game-embed-title', title));
    facts.appendChild(el('div', 'hint',
      (gfmt ? gfmt.label + ' · ' : '') +
      SF.gameStyle(game.style).label + '\n' +
      game.questions.length + (game.questions.length === 1 ? ' question' : ' questions') + ' · ' +
      (game.settings.mode === 'teams'
        ? game.settings.teams.length + ' teams'
        : 'individual') +
      (game.settings.defaultTime ? ' · ' + game.settings.defaultTime + 's countdown' : '')));
    insp.appendChild(facts);

    var edit = UI.button('Edit in Quiz studio →', 'primary', function () {
      SF.Shell.activate('game', { toast: false });
      SF.Games.openGame(game.id);
    });
    edit.style.width = '100%';
    insp.appendChild(UI.field(null, edit,
      'Questions, How to play, teams and timing are edited there — not on this slide.'));

    var swap = UI.button('Replace with a different game…', 'ghost', insertGame);
    swap.style.width = '100%';
    insp.appendChild(swap);

    insp.appendChild(el('p', 'hint',
      'Presentation theme and logo stay under the rail ⚙ — this slide only links the check.'));
  }

  /* Canvas ＋ Add activity, this pane, and the rail + Activity all open the
     same catalogue. Games land as the next slide; polls and clouds attach
     beside this one. Saved games stay a reuse path, not a second catalogue. */
  function openActivityLibrary() {
    if (SF.Studio && SF.Studio.openLibrary) SF.Studio.openLibrary('all');
    else insertGame();
  }

  function drawEngagePane(insp, s) {
    var wrap = el('div', 'engage-add');
    var add = UI.button('＋ Add activity', 'primary', openActivityLibrary);
    add.id = 'inspAddActivity';
    add.title = 'Same catalogue as ＋ Add activity on the canvas. Games land as the next slide; polls and clouds attach beside this one.';
    add.setAttribute('aria-label', 'Add activity');
    wrap.appendChild(add);
    var saved = (SF.GameStore && SF.GameStore.list) ? SF.GameStore.list() : [];
    if (saved.length) {
      var reuse = UI.button('Insert a saved game…', 'ghost', insertGame);
      reuse.id = 'inspInsertSavedGame';
      wrap.appendChild(reuse);
    }
    insp.appendChild(UI.field('Add a game or activity', wrap,
      'Knowledge checks go between slides. Polls, word clouds, brainstorms and scales sit beside this slide.'));
    drawFeedback(insp, s);
  }

  /* ---------------------------------------------------- audience feedback */

  /* Attached to the slide rather than replacing it: the slide still says what
     it says, and the room's responses gather in the rail beside it. */
  /**
   * The audience-feedback editor: picker, prompt, and the per-kind settings.
   *
   * `after` is how the caller repaints once something changes. It defaults to
   * the deck editor's own redraw, and the activities studio passes its own —
   * otherwise choosing a poll there would repaint an inspector that is not on
   * screen and leave the one that is showing stale.
   *
   * @param {HTMLElement} insp
   * @param {any} s slide to attach to
   * @param {() => void} [after]
   */
  function drawFeedback(insp, s, after) {
    /* Choosing a kind remounts this inspector. Typing in a field only
       needs the preview — a full draw here used to recurse into itself
       (`refresh = function () { refresh(); }`) so Poll / Cloud / etc.
       never appeared to do anything. */
    function refresh() {
      if (after) after();
      else { touched(); draw(); }
    }
    function live() {
      if (after) after();
      else { touched(); repaint(); }
    }
    var kinds = Object.keys(SF.FEEDBACK_KINDS);
    var current = s.feedback && s.feedback.kind ? s.feedback.kind : '';

    var picker = el('div', 'type-grid feedback-kinds');
    picker.style.gridTemplateColumns = 'repeat(4, 1fr)';
    [{ value: '', icon: '—', label: 'None' }].concat(kinds.map(function (k) {
      return {
        value: k,
        icon: SF.FEEDBACK_KINDS[k].icon,
        label: SF.FEEDBACK_KINDS[k].label
      };
    })).forEach(function (c) {
      var b = el('button', current === c.value ? 'on' : null);
      b.type = 'button';
      b.appendChild(el('span', 'g', c.icon));
      b.appendChild(el('span', null, c.label));
      b.onclick = function () {
        s.feedback = c.value ? SF.makeFeedback(c.value) : null;
        if (s.feedback && !s.feedback.prompt) {
          s.feedback.prompt = c.value === 'poll'
            ? 'What do you think?'
            : c.value === 'scale'
              ? 'How confident do you feel about this?'
              : c.value === 'wordcloud'
                ? 'One word for how this feels'
                : 'What would you add?';
        }
        refresh();
      };
      picker.appendChild(b);
    });

    insp.appendChild(UI.field('Audience feedback on this slide', picker,
      current
        ? SF.FEEDBACK_KINDS[current].blurb + ' Collected while this slide is up.'
        : 'Or pick a kind here. Responses appear in the rail beside the slide, and need a live session.'));

    if (!current) return;
    var f = s.feedback;

    /* Same How to play strip as Quiz studio — every activity gets one. */
    if (SF.Playbook) {
      var book = SF.Playbook.forKey(f.kind);
      if (book && book.howToPlay && book.howToPlay.length) {
        var how = el('details', 'howto');
        var open = true;
        try { if (localStorage.getItem('slideforge.howtoOpen') === '0') open = false; } catch (e) {}
        how.open = open;
        var sum = el('summary', 'howto-summary');
        sum.appendChild(el('span', null, 'How to play — ' + book.title));
        sum.appendChild(el('span', 'howto-toggle', open ? 'Hide' : 'Reveal'));
        how.appendChild(sum);
        var body = el('div', 'howto-body');
        if (book.aim) body.appendChild(el('p', 'howto-aim', book.aim));
        var ol = el('ol', 'howto-steps');
        book.howToPlay.forEach(function (step) { ol.appendChild(el('li', null, step)); });
        body.appendChild(ol);
        how.appendChild(body);
        how.addEventListener('toggle', function () {
          var label = how.querySelector('.howto-toggle');
          if (label) label.textContent = how.open ? 'Hide' : 'Reveal';
          try { localStorage.setItem('slideforge.howtoOpen', how.open ? '1' : '0'); } catch (e) {}
        });
        insp.appendChild(how);
      }
    }

    if (SF.slideFeedback(s)) {
      insp.appendChild(UI.field('Preview as', UI.segmented([
        { value: 'rail', icon: '◨', label: 'Beside the slide' },
        { value: 'focus', icon: '⛶', label: 'Full screen' }
      ], feedbackPresentAs(s), function (v) {
        if (!s.feedback) return;
        s.feedback.presentAs = v === 'focus' ? 'focus' : 'rail';
        refresh();
      }),
        'Saved on this slide — Present and Host live open the same way. ' +
        'Host live shows the join QR, PIN, and who arrives. Press E to toggle.'));
    }

    insp.appendChild(UI.field('Prompt for the room',
      UI.area(f.prompt, function (v) { f.prompt = v; live(); }, 2),
      'Shown on the phones. Keep it short — the slide carries the detail.'));

    if (SF.FEEDBACK_KINDS[current].needsOptions) {
      var wrap = el('div');
      drawPollOptions(wrap, f);
      insp.appendChild(UI.field('Options', wrap, 'Two to six. No correct answer — this is not scored.'));
    } else if (current === 'scale') {
      /* The author names the two ends and picks how many steps between them.
         The points themselves are numbered, not written: naming all five is
         where a scale turns into a poll nobody can read at a glance. */
      var endRow = el('div', 'setrow');
      endRow.appendChild(UI.field('Low end', UI.text(f.lowLabel, function (v) {
        f.lowLabel = v.slice(0, 40); live();
      }, 'Not at all')));
      endRow.appendChild(UI.field('High end', UI.text(f.highLabel, function (v) {
        f.highLabel = v.slice(0, 40); live();
      }, 'Completely')));
      insp.appendChild(UI.field('The two ends', endRow,
        'Both are required — without them the room cannot tell which way the ' +
        'scale runs, and a bare 1-to-5 means nothing on the wall either.'));

      insp.appendChild(UI.field('Points', UI.segmented(
        SF.SCALE_POINTS.map(function (n) {
          return { value: String(n), icon: String(n), label: n === 5 ? 'Usual' : '' };
        }), String(f.points), function (v) {
          f.points = Number(v); live();
        }),
        'An odd count leaves a real middle to sit in. More than seven is a ' +
        'distinction nobody makes honestly on a phone.'));

      insp.appendChild(el('div', 'hint',
        'Results show the spread, the average, and a flag when the two ends ' +
        'together outweigh the middle — a mean of 3 from a room at 1 and 5 is ' +
        'the opposite of a room all sitting at 3.'));
    } else {
      insp.appendChild(UI.field('Responses allowed each',
        UI.num(f.max, function (v) { f.max = Math.max(1, Math.min(5, v || 1)); live(); }, 1, 5),
        current === 'wordcloud'
          ? 'A word or short phrase per response.'
          : 'Longer contributions, shown newest first with names.'));
    }
  }

  function drawPollOptions(wrap, f) {
    wrap.innerHTML = '';
    f.options.forEach(function (text, i) {
      var row = el('div', 'opt-row');
      row.appendChild(el('span', 'poll-i', String(i + 1)));
      row.appendChild(UI.text(text, function (v) {
        f.options[i] = v; touched(); repaint();
      }, 'Option ' + (i + 1)));
      var kill = el('button', 'kill', '×');
      kill.title = 'Remove';
      kill.onclick = function () {
        if (f.options.length <= 2) { SF.toast('A poll needs at least two options'); return; }
        f.options.splice(i, 1);
        touched(); drawPollOptions(wrap, f); repaint();
      };
      row.appendChild(kill);
      wrap.appendChild(row);
    });
    if (f.options.length < 6) {
      var add = UI.button('+ Add option', 'ghost', function () {
        f.options.push('');
        touched(); drawPollOptions(wrap, f); repaint();
      });
      add.style.fontSize = '12px';
      wrap.appendChild(add);
    }
  }

  /* ------------------------------------------------------------ slide ops */

  function makeLayoutSlide(type) {
    var s = SF.makeSlide(type);
    if (SF.prepareLayout) SF.prepareLayout(s, type);
    if (type === 'content' || type === 'cards' || type === 'split') s.bullets = ['', '', ''];
    if (type === 'keywords' || type === 'italics' || type === 'links') {
      s.bullets = [
        SF.formatKeywordLine('', ''),
        SF.formatKeywordLine('', ''),
        SF.formatKeywordLine('', '')
      ];
    }
    if (current()) s.transition = current().transition;
    return s;
  }

  /**
   * Layout library: overwrite this slide, or append a new one at the end
   * of the deck (the bottom of the slide list).
   */
  function chooseLayout(s, type) {
    var label = (SF.SLIDE_TYPES[type] && SF.SLIDE_TYPES[type].label) || type;
    function overwrite() {
      SF.prepareLayout(s, type);
      touched();
      draw();
      SF.toast('This slide is now ' + label + '.');
    }
    function addNew() {
      var next = makeLayoutSlide(type);
      deck.slides.push(next);
      sel = deck.slides.length - 1;
      inspectorTab = 'content';
      touched();
      draw();
      SF.toast(label + ' added at the end of the deck.');
    }
    if (s.type === type) {
      SF.ask({
        title: 'Add another ' + label + ' slide?',
        detail: 'This slide is already that layout. A new one will go at the bottom of the slide list.',
        confirm: 'Add at the end'
      }, addNew);
      return;
    }
    if (!SF.askChoice) { overwrite(); return; }
    SF.askChoice({
      title: 'Use ' + label + '?',
      detail: 'Overwrite this slide, or add a new one at the bottom of the slide list.',
      options: [
        { value: 'overwrite', label: 'Overwrite this slide',
          detail: 'Changes the current slide to ' + label + '. Words and pictures stay where they still fit.' },
        { value: 'add', label: 'Add a new slide',
          detail: 'Puts a ' + label + ' slide at the end of the deck, like + Slide.' }
      ]
    }, function (choice) {
      if (choice === 'add') addNew();
      else overwrite();
    });
  }

  function addSlide(type) {
    var s = makeLayoutSlide(type);
    deck.slides.splice(sel + 1, 0, s);
    sel += 1;
    touched();
    draw();
  }

  /** Insert a ready-made slide (from the starter library) after the selection. */
  function insertStarter(slide) {
    if (!slide) return;
    slide = SF.normalizeSlide(slide);
    if (current()) slide.transition = current().transition || slide.transition;
    deck.slides.splice(sel + 1, 0, slide);
    sel += 1;
    /* Always land on Design & content so the new slide's words are ready. */
    inspectorTab = 'content';
    touched();
    draw();
    var insp = $('inspector');
    if (insp) insp.scrollTop = 0;
  }

  function insertGame() {
    var games = SF.GameStore.list();
    var s = current();
    var replacing = s && s.type === 'game';

    if (!games.length) {
      SF.ask({ title: 'You have no games yet.',
        detail: 'Create one now? This opens Quiz studio.',
        confirm: 'Create a game', danger: false }, function () {
          SF.Shell.activate('game', { toast: false });
          SF.Games.newGame();
        });
      return;
    }

    SF.Shell.picker({
      title: replacing ? 'Choose a game for this slide' : 'Insert a game',
      items: function () { return SF.GameStore.list(); },
      empty: 'No games yet.',
      describe: SF.Games.describe,
      onPick: function (g) {
        var target;
        if (replacing) {
          target = s;
        } else {
          target = SF.makeSlide('game');
          deck.slides.splice(sel + 1, 0, target);
          sel += 1;
        }
        target.gameId = g.id;
        target.gameTitle = g.title;
        target.title = g.title;
        touched();
        draw();
        SF.toast('"' + g.title + '" plays at slide ' + (sel + 1));
      }
    });
  }

  function duplicate() {
    var copy = SF.normalizeSlide(JSON.parse(JSON.stringify(current())));
    copy.id = SF.uid();
    deck.slides.splice(sel + 1, 0, copy);
    sel++;
    touched();
    draw();
  }

  /** Pack the current slide for the system clipboard (and a same-browser stash). */
  function copySlide() {
    if (!SF.SlideClip) {
      SF.toast('Copy is not available in this build.');
      return;
    }
    var s = current();
    if (!s) return;
    var slide = JSON.parse(JSON.stringify(s));
    var game = null;
    if (slide.type === 'game' && slide.gameId && SF.GameStore) {
      var g = SF.GameStore.get(slide.gameId);
      if (g) game = JSON.parse(JSON.stringify(g));
    }
    var text = SF.SlideClip.pack(slide, game);
    SF.SlideClip.stash(text);
    function ok(cross) {
      SF.toast(cross
        ? 'Slide copied — paste in another deck or browser'
        : 'Slide copied in this browser');
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { ok(true); }).catch(function () { ok(false); });
    } else {
      ok(false);
    }
  }

  /**
   * Insert a packed slide after the selection. Fresh ids so two pastes do not
   * share one game or collide with the source deck.
   * @param {{ slide: object, game: object|null }} payload
   */
  function insertCopiedSlide(payload) {
    if (!payload || !payload.slide) return;
    var slide = SF.normalizeSlide(JSON.parse(JSON.stringify(payload.slide)));
    slide.id = SF.uid();
    if (slide.type === 'game' && payload.game && SF.GameStore) {
      var game = JSON.parse(JSON.stringify(payload.game));
      game.id = SF.uid();
      SF.GameStore.save(game, { force: true });
      slide.gameId = game.id;
      if (game.title) {
        slide.gameTitle = game.title;
        slide.title = game.title;
      }
    } else if (slide.type === 'game' && !payload.game) {
      /* Slide shell without the quiz — still pasteable; wire a game later. */
      slide.gameId = '';
    }
    deck.slides.splice(sel + 1, 0, slide);
    sel++;
    touched();
    draw();
    SF.toast('Pasted as slide ' + (sel + 1));
  }

  /** Paste button: read system clipboard, then fall back to the local stash. */
  function pasteSlideButton() {
    if (!SF.SlideClip) {
      SF.toast('Paste is not available in this build.');
      return;
    }
    function apply(text) {
      var payload = SF.SlideClip.unpack(text) || SF.SlideClip.unpack(SF.SlideClip.recall());
      if (!payload) {
        SF.toast('Nothing to paste — copy a slide first');
        return;
      }
      insertCopiedSlide(payload);
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.readText) {
      navigator.clipboard.readText().then(apply).catch(function () { apply(null); });
    } else {
      apply(null);
    }
  }

  function removeSlide() {
    if (deck.slides.length === 1) { SF.toast('A presentation needs at least one slide'); return; }
    deck.slides.splice(sel, 1);
    if (sel >= deck.slides.length) sel = deck.slides.length - 1;
    touched();
    draw();
  }

  /* ------------------------------------------------------------ running */

  function runDeck() {
    var run = SF.buildRunDeck(deck, function (id) { return SF.GameStore.get(id); });
    if (run.missingGames.length) {
      SF.toast('Missing game: ' + run.missingGames.join(', '));
    }
    return run;
  }

  /** Where the current slide lands once games have been expanded. */
  function runIndexFor(i) {
    var n = 0;
    for (var k = 0; k < i; k++) {
      var s = deck.slides[k];
      if (s.type !== 'game') { n++; continue; }
      var g = SF.GameStore.get(s.gameId);
      n += g ? SF.compileGame(g).length : 1;
    }
    return n;
  }

  function present() {
    SF.Store.save(deck);
    SF.Player.start(runDeck(), runIndexFor(sel));
  }

  /* The same run deck Present builds, with a sample room attached. Quiz
     studio could already rehearse one game and Activities one activity;
     nothing could rehearse the lesson those sit inside, which is the thing
     a teacher is actually about to stand up and do.

     Not fullscreen, because a dry run is something you watch while still
     holding the editor in your head — and it leaves Esc meaning "stop
     rehearsing" rather than "leave fullscreen". */
  function rehearse() {
    SF.Store.save(deck);
    var run = runDeck();
    if (!run.slides.length) {
      SF.toast('Add a slide before rehearsing.');
      return;
    }
    if (!SF.Demo) {
      SF.Player.start(run, runIndexFor(sel), { fullscreen: false });
      return;
    }
    SF.Demo.start(run, {
      fullscreen: false,
      startIndex: runIndexFor(sel),
      /* Let the room follow the lesson: scored questions get answers, spoken
         formats get a speaker, discussion formats get neither. */
      auto: true
    });
  }

  function hostLive() {
    SF.Store.save(deck);
    SF.Live.host(runDeck());
  }

  /* ------------------------------------------------------------ workspace */

  function repaint() { drawPreview(); drawRail(); }
  function draw() { rememberSelection(); if(historyId!==deck.id) remember(); drawRail(); drawFoot(); drawPreview(); drawInspector(); }

  var ws = {
    key: 'deck',
    railLabel: 'Slides',
    settingsLabel: 'Presentation settings — theme, logo, colours',
    notesLabel: 'Speaker notes — visible in presenter view only',
    fileSuffix: '.sfdeck.json',
    store: SF.Store,
    doc: function () { return deck; },
    setDoc: function (d) { deck = d; sel = savedSelection(); placing = null; placeAt = null; },
    blank: function () { return SF.makeDeck('Untitled presentation'); },
    draw: draw,
    flush: flush,
    play: present,
    hostLive: hostLive,
    settings: openDeckSettings,
    onTitle: function (v) { deck.title = v || 'Untitled presentation'; touched(); },
    onTheme: function (v) { deck.theme = v; touched(); draw(); },
    describe: function (d) {
      var games = d.slides.filter(function (s) { return s.type === 'game'; }).length;
      return d.slides.length + (d.slides.length === 1 ? ' slide' : ' slides') +
        (games ? ' · ' + games + (games === 1 ? ' game' : ' games') : '') +
        ' · ' + new Date(d.modified).toLocaleString();
    },
    keydown: function (e) {
      if (e.defaultPrevented) return;
      // Canvas modes own positioning and deletion, even without a selection.
      var canvasMode = (SF.Artwork && SF.Artwork.isEditing()) || (SF.Arrange && SF.Arrange.isArranging());
      if (canvasMode && (/^Arrow/.test(e.key) || ['Delete', 'Backspace', 'j', 'k', 'h', 'H'].includes(e.key))) {
        e.preventDefault();
        return;
      }
      var mod = e.metaKey || e.ctrlKey;
      if (sorterOpen()) { sorterKeys(e); return; }
      if (mod && e.key.toLowerCase() === 'g') { e.preventDefault(); openSorter(); return; }
      if (mod && e.key.toLowerCase() === 'f') { e.preventDefault(); findInDeck(); return; }
      /* A slide in hand owns the keyboard: the arrows aim it instead of
         changing the selection, and nothing that edits the deck can fire until
         it has been put down or dropped. */
      if (placing != null) {
        if (e.key === 'Escape') { e.preventDefault(); cancelPlacing(); }
        else if (e.key === 'Enter' || (mod && e.key.toLowerCase() === 'v')) { e.preventDefault(); commitPlacing(); }
        else if (e.key === 'Home') { e.preventDefault(); movePlaceTo(0); }
        else if (e.key === 'End') { e.preventDefault(); movePlaceTo(deck.slides.length); }
        else if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); movePlaceTo(placeAt - 1); }
        else if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); movePlaceTo(placeAt + 1); }
        return;
      }
      if (mod && e.key.toLowerCase() === 'x') { e.preventDefault(); beginPlacing(sel); return; }
      if (mod && e.key.toLowerCase() === 'c') { e.preventDefault(); copySlide(); return; }
      /* Paste of a slide is handled on the document paste event (so the
         system clipboard works across browsers). Cmd/Ctrl+V while placing
         still means "put the slide down" above. */
      /* Alt + arrows to shuffle a slide along, the same grip the bullet list
         inside a slide already uses. */
      if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault(); nudge(e.key === 'ArrowUp' ? -1 : 1); return;
      }
      if (e.altKey && (e.key === 'Home' || e.key === 'End')) {
        e.preventDefault(); sendTo(e.key === 'Home' ? 0 : deck.slides.length); return;
      }
      if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); restoreHistory(e.shiftKey); }
      /* Both axes move the selection. The rail runs down the page, so the
         vertical pair is the honest one — but a deck is a sequence, every
         other tool in the room pages through it sideways, and the sorter in
         this app already answers to left and right. Binding one pair and not
         the other means the key someone actually presses does nothing. */
      else if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'j') { e.preventDefault(); select(sel + 1); }
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'k') { e.preventDefault(); select(sel - 1); }
      else if (e.key === 'h' || e.key === 'H') { e.preventDefault(); toggleHidden(sel); }
      else if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); removeSlide(); }
      else if (e.key === 'F5') { e.preventDefault(); present(); }
      else if (mod && e.key === 'd') { e.preventDefault(); duplicate(); }
    }
  };

  function install() {
    UI = SF.Shell.UI;
    SF.Shell.register(ws);
    /* On the document, because the slide being pasted onto is the selected
       one wherever the focus happens to be — and the handler bows out on
       its own when the focus is somewhere a paste means something else. */
    document.addEventListener('paste', pasteOnDocument);
    var railGo = /** @type {HTMLInputElement|null} */ ($('railGo'));
    if (railGo) {
      var goField = railGo;
      function jumpToTyped() {
        var n = parseInt(goField.value, 10);
        if (!n) { goField.value = String(sel + 1); return; }
        select(n - 1);
        focusThumb(sel);
      }
      goField.addEventListener('change', jumpToTyped);
      goField.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); jumpToTyped(); goField.blur(); }
      });
    }
    /* Once: Find is easy to miss next to Present keys. Opening Find marks
       it seen so this does not repeat. */
    setTimeout(function () {
      try {
        if (localStorage.getItem('slideforge.findHint.v1') === '1') return;
        localStorage.setItem('slideforge.findHint.v1', '1');
      } catch (e) { return; }
      SF.toast('Find across the lesson: ⌘F / Ctrl+F');
    }, 1800);
    /* The activities studio is a third view of this same deck, so it
       delegates title, theme, play and settings back here rather than
       keeping a second copy of any of them. */
    SF.Editor.workspace = ws;

    var requestedLesson = null;
    try {
      if (typeof window !== 'undefined' && window.location && window.location.search) {
        var params = new URLSearchParams(window.location.search);
        requestedLesson = params.get('lesson');
      }
    } catch (e) {}

    var last = SF.Store.lastId();
    var loaded = null;

    /* Asked BEFORE the Library is seeded, because seeding puts eleven brand
       packs in the store and every question about "is this a first visit"
       would answer no from then on. */
    var firstEverVisit = !last && !SF.Store.list().length;

    if (SF.seedLibrary) SF.seedLibrary();

    if (requestedLesson && SF.Studio && SF.Studio.makeLesson) {
      loaded = SF.Studio.makeLesson(requestedLesson);
      SF.Store.save(loaded, { force: true });
      if (SF.keepOneDemoCopy) SF.keepOneDemoCopy(loaded);
      try {
        if (window.history && window.history.replaceState) {
          var cleanUrl = window.location.pathname + (window.location.hash || '');
          window.history.replaceState(null, '', cleanUrl);
        }
      } catch (e) {}
    } else {
      loaded = (last && SF.Store.get(last)) || null;

      /* A first visit opens an empty deck, not a finished lecture.
         It used to land in the 74-slide IPDV lecture, because that was the
         first thing the Library seeded and the fallback took Store.list()[0].
         For the person who wrote it that reads as "where I left off". For
         anybody else it is a stranger's lecture, and the instinct is to type
         over it — which is how a template gets edited into a one-off.

         makeDeck already gives exactly the right thing: one title slide and
         nothing else. The eleven packs are still seeded and one click away in
         the Library, which is where a blank deck should send you. */
      if (!loaded && firstEverVisit) {
        loaded = SF.makeDeck('Untitled lesson');
        SF.Store.save(loaded, { force: true });
        if (SF.toast) {
          setTimeout(function () {
            SF.toast('A blank deck to start. Library has the templates, the lecture and the demo.');
          }, 900);
        }
      }
      if (!loaded) {
        /* Not a first visit, but nothing opens — a cleared last-id, or every
           document deleted. Whatever is in the Library beats a blank. */
        loaded = SF.Store.list()[0] || SF.makeDeck('Untitled lesson');
        SF.Store.save(loaded, { force: true });
      }
      if (loaded && loaded.slides.some(function (s) { return s.type === 'quiz' || s.type === 'results'; })) {
        /* Decks authored before questions moved into games still hold quiz
           slides; lift them out into a game once, on load. */
        var made = SF.migrateDeckQuizzes(loaded, function (g) { SF.GameStore.save(g); });
        SF.Store.save(loaded);
        if (made) {
          setTimeout(function () {
            SF.toast('Questions moved into a game: "' + made.title + '"');
          }, 700);
        }
      }
    }

    deck = loaded;
    sel = savedSelection();
    if (SF.Store.sweepUnused) SF.Store.sweepUnused(loaded && loaded.id);
    if (requestedLesson) SF.Player.forgetRun();
    else SF.Player.restoreRun();

    /* If this tab was hosting when it reloaded, walk back into the room the
       server is holding rather than leaving a class of phones stranded. Quiet
       when there is nothing held, which is almost always. */
    if (SF.Live && SF.Live.resumeHeldRoom) {
      try { SF.Live.resumeHeldRoom(SF.Player.open ? SF.Player.deck : runDeck()); } catch (e) {}
    }

    var notesInput = /** @type {HTMLTextAreaElement|null} */ ($('notes'));
    if (notesInput) {
      var nInput = notesInput;
      nInput.addEventListener('input', function () {
        if (SF.Shell.current() !== ws) return;
        current().notes = nInput.value;
        touched();
      });
    }

    var btnPresent = $('btnPresent');
    if (btnPresent) btnPresent.onclick = present;
    var btnRehearse = $('btnRehearse');
    if (btnRehearse) btnRehearse.onclick = rehearse;
    var btnPresenter = $('btnPresenter');
    if (btnPresenter) {
      btnPresenter.onclick = function () {
        SF.Store.save(deck);
        /* Teacher Presenter first: the pop-out is the whole point of this button. The wall
           feed starts after, so the desk has a show to follow — not instead
           of the pop-out. */
        var desk = SF.Player.openPresenter();
        if (!desk) return;
        if (!SF.Player.open) SF.Player.start(runDeck(), runIndexFor(sel), { fullscreen: false });
        if (SF.Player.syncPresenter) SF.Player.syncPresenter();
      };
    }
  }

  /* Helper for creating a fully configured game from activity presets */
  SF.createPresetGame = function (style, preset, theme, options) {
    preset = preset || {};
    var g = SF.makeGame(preset.title || 'Quick knowledge check', style);
    g.theme = SF.resolveTheme(theme);
    g.settings.defaultTime = 0;
    g.settings.scoreboard = false;
    g.settings.scoreSlide = false;
    if (preset.settings) Object.assign(g.settings, preset.settings);
    if (preset.format) g.format = preset.format;
    else if (SF.isSpecialStyle && SF.isSpecialStyle(style)) g.format = style;
    if (preset.seeds && preset.seeds.length) {
      g.questions = preset.seeds.map(function (fields) {
        var seeded = SF.makeQuestion(style);
        Object.keys(fields).forEach(function (k) { seeded[k] = fields[k]; });
        return SF.normalizeQuestion(seeded, style);
      });
    } else if (preset.seed && ['memorymatch', 'memoryflip', 'knowledgeflip', 'lowstakes'].indexOf(style) === -1) {
      var q = SF.makeQuestion(style);
      Object.keys(preset.seed).forEach(function (k) { q[k] = preset.seed[k]; });
      g.questions = [SF.normalizeQuestion(q, style)];
    }
    if (!options || options.save !== false) {
      var host = (SF.Editor && SF.Editor.deck && SF.Editor.deck()) || null;
      if (host && SF.LessonBank && SF.LessonBank.stamp) SF.LessonBank.stamp(g, host);
      SF.GameStore.save(g);
    }
    return g;
  };

  SF.Editor = {
    install: install,
    addSlide: addSlide,
    insertStarter: insertStarter,
    commitActivityChange: touched,
    /** The slide the canvas is showing, for tools that edit it in place. */
    currentSlide: current,
    /** Repaint the canvas after such a tool has changed that slide. Redraws the
        rail too, because a thumbnail is the same render and would otherwise
        keep showing artwork where it no longer is. */
    refreshCanvas: function () { drawRail(); drawPreview(); },
    /** Insert an activity sequence as one edit, preserving page order. */
    insertStarters: function (slides) {
      if (!slides || !slides.length) return;
      var ready = slides.map(function (s) { return SF.normalizeSlide(s); });
      deck.slides.splice.apply(deck.slides, [sel + 1, 0].concat(ready));
      sel += 1;
      inspectorTab = 'content'; touched(); draw();
    },
    selectSlide: function (id) {
      var at = deck.slides.findIndex(function (s) { return s.id === id; });
      if (at >= 0) { sel = at; rememberSelection(); }
    },
    /**
     * @param {string} kind  a FEEDBACK_KINDS key
     * @param {object} [preset] { prompt, options } for a catalogue format
     *   that is this kind of prompt worded a particular way
     */
    attachFeedback: function (kind, preset) {
      preset = preset || {};
      if (current().type === 'game') addSlide('content');
      current().feedback = SF.makeFeedback(kind);
      current().feedback.prompt = preset.prompt || (kind === 'wordcloud' ? 'What comes to mind in one word?' : kind === 'poll' ? 'How confident do you feel about this topic?' : 'What would you add?');
      if (preset.options) current().feedback.options = preset.options.slice();
      else if (kind === 'poll') current().feedback.options = ['Getting started', 'Almost there', 'Ready to apply it'];
      inspectorTab = 'engage'; touched(); draw();
    },
    /**
     * @param {string} style   a GAME_STYLES key
     * @param {object} [preset] { title, settings } for a catalogue format that
     *   is this engine set up a particular way rather than a new engine
     */
    insertNewGame: function (style, preset) {
      var g = SF.createPresetGame(style, preset, deck.theme);
      addSlide('game'); current().gameId = g.id; current().gameTitle = g.title; current().title = g.title;
      inspectorTab = 'content'; touched(); draw();
    },
    useLesson: function (key) {
      flush(); SF.Store.save(deck);
      if (SF.History && SF.History.ready() && (deck.slides || []).length) {
        SF.History.snapshot(deck, 'Before opening another lesson');
      }
      deck = SF.Studio.makeLesson(key); sel = 0;
      /* Opening a factory pack again is an intentional restore — clear any
         Library dismiss so seedLibrary does not keep hiding it. */
      if (deck && deck.sourceKey && SF.restoreLibrarySeed) SF.restoreLibrarySeed(deck.sourceKey);
      SF.Store.save(deck, { force: true });
      /* Here rather than in the Demo button, so every route to the demo keeps
         one document rather than a pile of invisible copies. */
      if (SF.keepOneDemoCopy) SF.keepOneDemoCopy(deck);
      SF.Shell.syncChrome(); draw();
    },
    deck: function () { return deck; },
    selected: function () { return sel; },
    findInDeck: findInDeck,
    /* The activities studio attaches feedback with this editor rather than a
       second one of its own — same picker, same prompts, same per-kind
       settings. It passes its own redraw. */
    drawFeedback: drawFeedback,
    openAiSmokeTest: openAiSmokeTest,
    cancelPendingSave: cancelPendingSave,
    /**
     * @param {string} id
     * @param {{ abandon?: boolean }} [opts]  abandon: do not flush/save the
     *   document you are leaving (delete path — otherwise it reappears).
     */
    openDeck: function (id, opts) {
      var d = SF.Store.get(id);
      if (!d) return;
      if (opts && opts.abandon) {
        cancelPendingSave();
      } else {
        flush();
        if (deck && deck.id !== id) SF.Store.save(deck);
      }
      deck = d;
      sel = savedSelection();
      SF.Shell.syncChrome();
      draw();
    }
  };
})(window);
