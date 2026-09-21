/* SlideForge — the presentation engine.

   Slides and content only. Questions live in games (js/games.js); a
   presentation refers to one with a game-embed slide, which expands into that
   game's questions when the show runs. Nothing here knows how a game is
   scored. */
(function (global) {
  'use strict';

  /** @type {import("../src/types.js").SlideForgeGlobal} */
  var SF = global.SF;
  /* The editor's hands on the canvas — dragging, selecting, placing a block on
     the lattice. It lives in src/editor/arrange.js and is installed here
     because it belongs to this engine, not to the canvas it manipulates. */
  SF.installArrange(SF);

  /* The header and footer slot panel — also authoring UI, also installed by
     the engine that owns it. It builds its panel detached; drawInspector
     mounts it into the Header & footer pane. */
  SF.installHeaderFooterUI(SF);

  /* The third canvas face. Defining it here is all this does; the shell calls
     SF.Artwork.install() from init(), once every script has run. */
  SF.installArtwork(SF);

  /* The Look pane and editing a block in place on the canvas. Defined here at
     editor load; js/render.js and src/render/lattice.js reach it at render
     time, which is the inversion noted in that file's header. */
  SF.installCustom(SF);

  var el = SF.el;
  /* The four inspector tabs and the Header & footer panel. UI and
     drawContentFields are accessors: the shell assigns UI after this runs, and
     drawContentFields is a var set further down this file.

     This sits below `var el = SF.el` deliberately: el is a var, not a hoisted
     declaration, so a seam above it captures undefined. That cost a round of
     verification — the Layout and Motion panes, the two that use el directly,
     threw "el is not a function" while the other three were fine. */
  var paneSet = SF.createPanes(SF, {
    el: el, touched: touched, draw: draw, drawInspector: drawInspector,
    drawRail: drawRail, repaint: repaint,
    drawLayoutPicker: drawLayoutPicker, drawUnusedOnLayout: drawUnusedOnLayout,
    UI: function () { return UI; },
    drawContentFields: function () { return drawContentFields; }
  });
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

  /* The rail, the sorter and every way of reordering slides now live in
     src/editor/rail.js. `deck` and `sel` go in as accessors because both are
     reassigned as documents open and selections move; `UI` because the shell
     assigns it at install. Everything else is a function declaration, so it is
     hoisted and safe to hand over by value from here. */
  var railParts = SF.createRail(SF, {
    el: el, $: $, touched: touched, draw: draw, current: current,
    drawInspector: drawInspector, addSlide: addSlide, restoreHistory: restoreHistory,
    gameFor: gameFor, slideOpts: slideOpts, openActivityLibrary: openActivityLibrary,
    UI: function () { return UI; },
    deck: function () { return deck; },
    sel: function () { return sel; },
    setSel: function (i) { sel = i; }
  });
  var focusThumb = railParts.focusThumb, beginPlacing = railParts.beginPlacing,
      movePlaceTo = railParts.movePlaceTo, commitPlacing = railParts.commitPlacing,
      cancelPlacing = railParts.cancelPlacing, toggleHidden = railParts.toggleHidden,
      drawRail = railParts.drawRail, select = railParts.select, nudge = railParts.nudge,
      sendTo = railParts.sendTo, sorterOpen = railParts.sorterOpen,
      openSorter = railParts.openSorter, pick = railParts.pick,
      sorterKeys = railParts.sorterKeys, drawFoot = railParts.drawFoot;

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
      SF.setNotes(s.notes);
      return;
    }

    var node = SF.renderSlide(deck, s, Object.assign(slideOpts(sel), s.type === 'experiment' ? {interactive:true} : {}));
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
    SF.setNotes(s.notes);
    /* The canvas was just rebuilt, so anything the art face puts on top of it —
       the selection ring, the ghost on a hidden shape — has to go back on. */
    if (SF.Artwork) SF.Artwork.afterPaint();
    if (SF.Arrange) SF.Arrange.afterPaint();
    if (SF.HeaderFooterUI) SF.HeaderFooterUI.refresh();
  }

  /* ------------------------------------------------------------ inspector */

  /* The rail for one block. Shown instead of the slide's own fields while a
     block is selected on the canvas, because that is what the author is
     pointing at. The kind decides how its single `text` field is read, so the
     label and the hint come from the registry rather than from a branch here. */
  /* Which block the canvas last asked to edit. Arrange selection is one way in;
     clicking a block's words on the canvas is the other, and it must not have
     to enter the Layout face first. */
  var focusedBlockId = null;
  function focusedBlock() {
    var s = current();
    return (focusedBlockId && s && SF.freeBlockById(s, focusedBlockId)) || null;
  }

  /* Every chart kind, grouped by what the chart is for. A chart block draws
     through the same renderer a chart slide does — all twenty work, tested one
     by one — so it offers the same twenty, from the same list. A block that
     could only be seven of them was a limit in the rail, not in the drawing. */
  /* Shared by the chart slide's own field and by a chart block's, which offer
 the same kinds because they draw through the same renderer. */
  var CHART_LABELS = {
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

  function chartTypeOptions() {
    var opts = [];
    (SF.CHART_TAXONOMY || []).forEach(function (cat) {
      cat.kinds.forEach(function (k) {
        var home = SF.chartPrimaryCategory(k);
        if (home && home.key !== cat.key) return;
        opts.push({ value: k, label: CHART_LABELS[k] || k, group: cat.label });
      });
    });
    return opts;
  }

  function drawBlockInspector(insp, s, block) {
    var spec = (SF.FREE_KINDS || {})[block.kind] || {};
    insp.appendChild(el('h4', 'eyebrow', 'SELECTED ITEM'));
    insp.appendChild(el('h4', 'insp-title', spec.label || block.kind));
    insp.appendChild(UI.field('Kind', UI.select(
      Object.keys(SF.FREE_KINDS || {}).map(function (k) {
        return { value: k, label: SF.FREE_KINDS[k].label || k };
      }), block.kind, function (v) { block.kind = v; touched(); draw(); })));
    /* The picture kind gets a picker below instead of a box to type a path in. */
    var area = block.kind === 'image' ? null : document.createElement('textarea');
    if (area) area.dataset.contentKey = SF.freeBlockKey(block.id);
    if (area) {
      /* Narrowed once, so the handler below does not re-widen it. */
      var field = area;
      field.rows = spec.draw ? 5 : 3;
      field.value = String(block.text == null ? '' : block.text);
      field.onchange = function () { block.text = field.value; touched(); draw(); };
      insp.appendChild(UI.field(spec.label || 'Content', field, spec.hint || ''));
    }
    /* Rank, not point size: the same words are a title on one slide and a
       caption on another, and the block should be able to say which. */
    if (!spec.draw) {
      insp.appendChild(UI.field('Size', UI.select(
        (SF.FREE_SIZES || []).map(function (k) { return { value: k, label: k }; }),
        block.size || spec.size || 'body',
        function (v) { block.size = v; touched(); draw(); })));
    }
    if (block.kind === 'image') {
      insp.appendChild(UI.field('Picture', imagePickerField(
        function () { return block.text || ''; },
        function (v) { block.text = v; touched(); draw(); },
        { label: 'Picture for this block' }), spec.hint));
      insp.appendChild(UI.field('Fit', UI.select(
        [{ value: 'cover', label: 'Fill the cell' }, { value: 'contain', label: 'Fit inside it' }],
        block.fit === 'contain' ? 'contain' : 'cover',
        function (v) { block.fit = v; touched(); draw(); })));
      /* The same words an image slide uses for the same three decisions, so a
         teacher who has framed one picture already knows how to frame this. */
      insp.appendChild(UI.field('Frame', UI.select(
        [{ value: '', label: 'Fill the cell' }].concat(
          (SF.IMAGE_FRAME_KEYS || []).map(function (k) { return { value: k, label: k }; })),
        block.frame || '',
        function (v) { block.frame = v; touched(); draw(); }),
        'The cell says how much room; this says what shape to take in it.'));
      insp.appendChild(UI.field('Image motion', UI.select(
        [{ value: '', label: 'Still' },
         { value: 'zoom', label: 'Slow zoom' },
         { value: 'travel', label: 'Travel between two points' }],
        block.imageMotion || '',
        function (v) { if (v) block.imageMotion = v; else delete block.imageMotion; touched(); draw(); }),
        'Plays in Present, not on the canvas. Reduced-motion settings are respected.'));
      if (block.imageMotion) {
        var focal = [['focalX', 'Focus horizontal'], ['focalY', 'Focus vertical']];
        if (block.imageMotion === 'travel') {
          focal = focal.concat([['focalX2', 'Travels to horizontal'], ['focalY2', 'Travels to vertical']]);
        }
        focal.forEach(function (pair) {
          var n = document.createElement('input');
          n.type = 'number'; n.min = '0'; n.max = '100';
          n.value = String(block[pair[0]] == null ? 50 : block[pair[0]]);
          n.onchange = function () {
            if (Number.isFinite(n.valueAsNumber)) { block[pair[0]] = n.valueAsNumber; touched(); draw(); }
          };
          insp.appendChild(UI.field(pair[1], n));
        });
        if (block.imageMotion === 'travel') {
          insp.appendChild(UI.field('How long the move takes', UI.select(
            [{ value: '12', label: '12 seconds' }, { value: '20', label: '20 seconds' }, { value: '30', label: '30 seconds' }],
            String(block.imageTravelSecs || 20),
            function (v) { block.imageTravelSecs = Number(v); touched(); draw(); })));
        }
      }
    }
    if (block.kind === 'chart') {
      insp.appendChild(UI.field('Chart type', UI.select(chartTypeOptions(),
        block.chartKind || 'bar',
        function (v) { block.chartKind = v; touched(); draw(); }),
        'Grouped by what the chart is for, after the FT\u2019s Visual Vocabulary.'));
    }
    /* Duplicate and delete belong wherever the item is selected. They lived
       only on the arrange bar, so removing one thing meant entering the Layout
       face to do it and leaving again — for an action that has nothing to do
       with arranging. */
    var acts = el('div', 'format-tools');
    acts.appendChild(UI.button('\u29c9 Duplicate', 'ghost', function () {
      var list = SF.freeBlocksOf(s, true);
      var copy = Object.assign({}, block, {
        id: 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
      });
      list.push(copy);
      if (!s.design) s.design = {};
      if (!s.design.regions) s.design.regions = {};
      var regions = s.design.regions;
      var r = regions[SF.freeBlockKey(block.id)];
      /* One block-height below, and never past the foot of the grid. */
      if (r) regions[SF.freeBlockKey(copy.id)] = {
        col: r.col, row: Math.min(16, r.row + r.rows), cols: r.cols, rows: r.rows
      };
      focusedBlockId = copy.id;
      touched(); draw();
      SF.toast && SF.toast('Copied below. Drag it anywhere.');
    }));
    /* The same act as the Layout bar's ✕ and the Delete key, through the one
       function that knows what a block leaves behind. This used to be its own
       implementation and forgot the formatting, which then sat on the slide
       keyed to an id nothing rendered. */
    acts.appendChild(UI.button('\u2715 Delete', 'ghost', function () {
      if (!SF.removeFreeBlock(s, SF.freeBlockKey(block.id))) return;
      focusedBlockId = null;
      if (SF.Arrange && SF.Arrange.deselect) SF.Arrange.deselect();
      touched(); draw();
      SF.toast && SF.toast('Item removed. Undo brings it back.');
    }));
    insp.appendChild(UI.field('This item', acts));
    /* The rail's faces row is drawn by the branch below this one, so selecting
       an item used to take ▦ Arrange off the screen — and Arrange is where the
       slot names, the fit check and the nudges live, none of which the item's
       own fields replace. Carry it across. One id, because the two branches
       are exclusive: the block inspector returns before the faces row runs. */
    var faces = el('div', 'format-tools canvas-faces');
    faces.setAttribute('role', 'group');
    faces.setAttribute('aria-label', 'Canvas tools');
    var arranging = !!(SF.Arrange && SF.Arrange.isArranging());
    var lay = UI.button('\u25A6 Layout', arranging ? 'active' : 'ghost', function () {
      if (SF.Arrange) SF.Arrange.setArranging(!SF.Arrange.isArranging());
    });
    lay.id = 'btnArrange';
    lay.title = 'Move blocks on the 16x12 lattice';
    lay.setAttribute('aria-pressed', String(arranging));
    faces.appendChild(lay);
    insp.appendChild(faces);
    insp.appendChild(el('p', 'hint',
      'Drag it to move, or drag a corner to resize. Esc deselects and gives the slide\u2019s own fields back.'));
  }

  function drawInspector() {
    var insp = $('inspector');
    if (!insp) return;
    insp.innerHTML = '';
    var s = current();
    if (!s) { delete insp.dataset.slide; return; }
    var picked = (SF.Arrange && SF.Arrange.selectedBlock && SF.Arrange.selectedBlock()) || focusedBlock();
    if (picked) { insp.dataset.slide = s.id; drawBlockInspector(insp, s, picked); return; }
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
    paneSet.drawPane(insp, s, designPane);
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
      /* "Arrange", not "Layout". There were two ▦ Layout buttons in this one
         panel, four rows apart: this one toggles block arranging on the
         lattice, the tab below picks a slide layout. Same glyph, same word,
         different jobs. This is the one that moves, and Arrange is what the
         code has always called it — SF.Arrange, isArranging, btnArrange,
         src/editor/arrange.js — so the panel now says what the code says. */
      { id: 'btnArrange', label: '▦ Arrange',
        title: 'Move and size blocks on the slide grid',
        isOn: function () { return !!(SF.Arrange && SF.Arrange.isArranging()); },
        set: function (on) { if (SF.Arrange) SF.Arrange.setArranging(on); } },
      { id: 'btnHeaderFooter', label: '▣ Header & footer',
        title: 'Header and footer slots',
        isOn: function () { return designPane === 'chrome'; },
        set: function (on) { designPane = on ? 'chrome' : 'edit'; drawInspector(); } }
    ].forEach(function (face) {
      var on = face.isOn();
      /* Asked again at click time, not closed over from draw time. The faces
         set their own state and repaint the canvas, not the rail, so nothing
         rebuilt this row when one turned on — and a handler holding the `on`
         it was built with kept calling set(true). ▦ Arrange could be turned on
         and then never off: four clicks, still arranging. Found by
         tools/smoke/layout-face.mjs, which needed to leave the face. */
      var b = UI.button(face.label, on ? 'active' : 'ghost', function () {
        face.set(!face.isOn());
      });
      b.id = face.id;
      b.title = face.title;
      b.setAttribute('aria-pressed', String(on));
      faces.appendChild(b);
    });
    insp.appendChild(faces);

    var panes = el('div', 'format-tools design-panes');
    panes.setAttribute('role', 'tablist');
    panes.setAttribute('aria-label', 'Slide tools');
    /* One declaration, in src/editor/panes.js. This strip and the dispatch in
       drawInspector read the same table, so a tab cannot exist without a body
       or a body without a tab. */
    paneSet.tabs().forEach(function (item) {
      var on = designPane === item.key;
      var b = UI.button(item.icon + ' ' + item.label, on ? 'active' : 'ghost', function () {
        designPane = item.key;
        drawInspector();
      });
      b.title = item.title;
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

  /* The deck settings dialog lives in src/editor/deck-settings.js. deck, UI
     and ws go in as accessors: the first two are reassigned as decks load and
     the third is declared further down this file. */
  var deckSettings = SF.createDeckSettings(SF, {
    $: $, el: el, current: current, touched: touched, draw: draw, pick: pick, select: select,
    deck: function () { return deck; },
    UI: function () { return UI; },
    ws: function () { return ws; }
  });
  var openDeckSettings = deckSettings.openDeckSettings;
  var openAiSmokeTest = deckSettings.openAiSmokeTest;


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
  /* One picture field: type a path, or choose a file and carry it inside the
     deck as a data URL. The same three controls were written out four times in
     this file already — card pictures, the image slide, the poster, the split
     — each with its own copy of the reader and the size warning. New callers
     ask for it here instead of growing a fifth.

     `get` and `set` rather than a slide and a key, because the value lives
     somewhere different every time: s.images[i], s.image, a block's text. */
  function imagePickerField(get, set, opts) {
    opts = opts || {};
    var box = el('div', 'card-pic-field');
    var url = UI.text(get() || '', function (v) { set(String(v).trim()); }, opts.placeholder || 'Image URL or asset path');
    url.setAttribute('aria-label', opts.label || 'Image URL or asset path');
    box.appendChild(url);
    var pick = el('input');
    pick.type = 'file';
    pick.accept = 'image/*';
    pick.setAttribute('aria-label', opts.fileLabel || 'Choose an image file');
    pick.addEventListener('change', function () {
      var f = pick.files && pick.files[0];
      if (!f) return;
      /* The deck carries the bytes, and the library is localStorage, so a big
         picture is the thing most likely to fill it. Warn rather than refuse:
         it is the author's deck and their storage. */
      if (f.size > 3.5 * 1024 * 1024) SF.toast('That image is over 3.5 MB — it may exceed the browser storage limit.');
      var fr = new FileReader();
      fr.onload = function () { set(String(fr.result)); };
      fr.readAsDataURL(f);
    });
    box.appendChild(pick);
    if (get()) box.appendChild(UI.button('Remove image', 'ghost', function () { set(''); }));
    return box;
  }

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
  /* The per-slide-type content fields live in src/editor/content-fields.js.
     deck and UI go in as accessors; everything else it needs is a function
     declaration that never changes. */
  var contentFields = SF.createContentFields(SF, {
    CHART_LABELS: CHART_LABELS,
    chartTypeOptions: chartTypeOptions,
    draw: draw,
    drawCallouts: drawCallouts,
    drawImageFields: drawImageFields,
    drawInfoPits: drawInfoPits,
    drawLayers: drawLayers,
    drawPairPits: drawPairPits,
    drawPits: drawPits,
    drawVideoFields: drawVideoFields,
    el: el,
    repaint: repaint,
    richField: richField,
    touched: touched,
    deck: function () { return deck; },
    UI: function () { return UI; }
  });
  var drawContentFields = contentFields.drawContentFields;

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
    setDoc: function (d) { deck = d; sel = savedSelection(); railParts.resetPlacing(); },
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
      if (railParts.isPlacing()) {
        if (e.key === 'Escape') { e.preventDefault(); cancelPlacing(); }
        else if (e.key === 'Enter' || (mod && e.key.toLowerCase() === 'v')) { e.preventDefault(); commitPlacing(); }
        else if (e.key === 'Home') { e.preventDefault(); movePlaceTo(0); }
        else if (e.key === 'End') { e.preventDefault(); movePlaceTo(deck.slides.length); }
        else if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); movePlaceTo(railParts.placeTarget() - 1); }
        else if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); movePlaceTo(railParts.placeTarget() + 1); }
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
      /* Reopen the copy already in the Library rather than minting another.
         The link is how a lesson gets bookmarked and shared, so it is followed
         over and over — and makeLesson mints fresh ids, so every follow used to
         leave one more copy the Library does not list, with the author's edits
         stranded in whichever of them they happened to be editing that day.

         Store.list() is sorted by modified, so the first match is the one most
         recently worked on: after a pile of duplicates already exists, that is
         the one with the work in it.

         Taking a clean build is still available and still deliberate — File →
         reload from this version, which says out loud that the previous copy
         stays in the Library. The Demo button is unchanged too: it goes
         through useLesson, not through here. */
      var mine = SF.Store.list().filter(function (d) {
        return d && d.sourceKey === requestedLesson;
      })[0] || null;
      loaded = mine || SF.Studio.makeLesson(requestedLesson);
      /* buildLesson stamps sourceKey only on the Library seed packs and the
         demo, so the galleries and the motion lab arrived anonymous and the
         lookup above could never match one — they were the packs duplicating
         hardest. Stamp what this document was built from, and the next follow
         of the same link finds it. Nothing else reads sourceKey for a key that
         is not a seed: seedLibrary walks LIBRARY_SEED_KEYS, keepOneDemoCopy
         wants the demo's own folder, and File → reload matches on title. */
      if (loaded && !loaded.sourceKey) loaded.sourceKey = requestedLesson;
      /* Saved either way: a new build has to be filed, and re-opening an old
         one has to become the last-opened document, or a later reload with no
         ?lesson= would land back on whatever was open before. */
      SF.Store.save(loaded, { force: true });
      if (!mine && SF.keepOneDemoCopy) SF.keepOneDemoCopy(loaded);
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
    /** Redraw the rail — the canvas calls this when the selection changes. */
    refreshInspector: drawInspector,
    /** One picture field — path, file picker, remove — for any caller. */
    imagePickerField: imagePickerField,
    /** Put the rail on one block, because the canvas was clicked on it. */
    focusBlock: function (id) { focusedBlockId = id || null; drawInspector(); },
    clearBlockFocus: function () { if (focusedBlockId) { focusedBlockId = null; drawInspector(); } },
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
      /* The deck you just opened is the one to come back to.
         Saving the deck being left writes the store's last-opened id as a side
         effect — flush() does it when there are pending edits, and the line
         above does it unconditionally to catch a deck mutated without going
         through touched(). Both happen after the incoming deck was saved, so
         without this the id left behind is the deck you switched away from:
         open a lesson from the Library, reload, and you are back on the
         previous one. Stated here rather than left to the order of two saves
         that exist for another reason.
         It costs a `modified` bump on the deck being opened, which floats it to
         the top of the Library — which is where the thing you just opened
         belongs. */
      SF.Store.save(deck);
      sel = savedSelection();
      SF.Shell.syncChrome();
      draw();
    }
  };
})(window);
