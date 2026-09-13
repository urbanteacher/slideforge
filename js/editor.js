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
    var ub = /** @type {HTMLButtonElement|null} */ (document.querySelector('[data-history=undo]'));
    var rb = /** @type {HTMLButtonElement|null} */ (document.querySelector('[data-history=redo]'));
    if (ub) ub.disabled = !past.length;
    if (rb) rb.disabled = !future.length;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      saveTimer = null;
      SF.Store.save(deck);
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
    return input;
  }

  /* ------------------------------------------------------------ rail */

  function drawRail() {
    var rail = $('railList');
    if (!rail) return;
    rail.innerHTML = '';
    var count = $('railCount');
    if (count) count.textContent = String(deck.slides.length);

    deck.slides.forEach(function (s, i) {
      var row = el('div', 'thumb' + (i === sel ? ' sel' : ''));
      row.draggable = true;
      row.tabIndex = 0;
      row.setAttribute('role', 'button');
      row.setAttribute('aria-label', 'Slide ' + (i + 1) + ': ' + (s.title || SF.SLIDE_TYPES[s.type].label));
      row.setAttribute('aria-current', i === sel ? 'true' : 'false');
      row.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); select(i); } };
      row.dataset.i = String(i);
      row.appendChild(el('div', 'num', String(i + 1)));

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
      var mark = el('span', 'thumb-tx', txIcon);
      mark.title = 'Transition: ' + txLabel;
      mark.setAttribute('aria-label', 'Transition ' + txLabel);
      row.appendChild(mark);

      row.onclick = function () { select(i); };
      wireDrag(row);
      if (rail) rail.appendChild(row);
      requestAnimationFrame(function () { SF.fit(frame, node); });
    });
  }

  function select(i) {
    sel = Math.max(0, Math.min(deck.slides.length - 1, i));
    draw();
  }

  var dragFrom = null;
  function wireDrag(row) {
    row.addEventListener('dragstart', function (e) {
      dragFrom = Number(row.dataset.i);
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', String(dragFrom)); } catch (err) {}
    });
    row.addEventListener('dragover', function (e) {
      e.preventDefault();
      row.classList.add('drag-over');
    });
    row.addEventListener('dragleave', function () { row.classList.remove('drag-over'); });
    row.addEventListener('drop', function (e) {
      e.preventDefault();
      row.classList.remove('drag-over');
      var to = Number(row.dataset.i);
      if (dragFrom == null || dragFrom === to) return;
      var moved = deck.slides.splice(dragFrom, 1)[0];
      deck.slides.splice(to, 0, moved);
      sel = to;
      dragFrom = null;
      touched();
      draw();
    });
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
    var ins = UI.button('+ Game', null, insertGame);
    ins.title = 'Drop a game into the presentation at this point';
    actions.appendChild(ins);
    foot.appendChild(actions);
  }

  /* ------------------------------------------------------------ preview */

  /* Preview mode for a feedback slide: 'rail' shows it beside the slide as the
     room will see it, 'focus' shows the full-screen version. Stored on the
     feedback so Present / Host live open the same way. */
  var inspectorTab = 'content';

  function feedbackPresentAs(slide) {
    var f = slide && slide.feedback;
    return (f && f.presentAs === 'focus') ? 'focus' : 'rail';
  }

  function bindCanvasContent(box,node,s){
    if(['game','quiz','explain','results'].includes(s.type))return;
    node.querySelectorAll('[data-content-key]').forEach(function(target){
      var key=target.dataset.contentKey;target.classList.add('canvas-editable');target.title='Double-click to edit this content';
      target.ondblclick=function(e){
        e.preventDefault();e.stopPropagation();var existing=box.querySelector('.canvas-edit-form');if(existing)existing.remove();
        var old=key.startsWith('bullets.')?s.bullets[Number(key.slice(8))]:s[key];
        var form=el('div','canvas-edit-form'),label=el('label',null,'Edit slide content'),area=el('textarea');area.value=old||'';area.rows=3;area.setAttribute('aria-label','Edit slide content');label.appendChild(area);form.appendChild(label);
        form.appendChild(UI.button('Save content','primary',function(){SF.Custom.rebase(s,key,String(old||''),area.value);if(key.startsWith('bullets.'))s.bullets[Number(key.slice(8))]=area.value;else s[key]=area.value;touched();draw();}));
        form.appendChild(UI.button('Cancel','ghost',function(){form.remove();}));box.appendChild(form);area.focus();
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
  }

  /* ------------------------------------------------------------ inspector */

  function drawInspector() {
    var insp = $('inspector');
    if (!insp) return;
    insp.innerHTML = '';
    var s = current();
    if (!s) return;

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
    var history=el('div','format-tools');
    var undo=UI.button('↶ Undo','ghost',function(){restoreHistory(false);});undo.disabled=!past.length;undo.dataset.history='undo';
    var redo=UI.button('↷ Redo','ghost',function(){restoreHistory(true);});redo.disabled=!future.length;redo.dataset.history='redo';
    history.appendChild(undo);history.appendChild(redo);
    history.appendChild(UI.button('Theme','ghost',openDeckSettings));insp.appendChild(history);
    insp.appendChild(el('h4','eyebrow', inspectorTab === 'content' ? 'MAKE IT YOURS' : 'INVITE EVERY VOICE'));
    insp.appendChild(el('h4', 'insp-title',
      'Slide ' + (sel + 1) + ' — ' + SF.SLIDE_TYPES[s.type].label));

    if (inspectorTab === 'engage') {
      drawFeedback(insp, s);
      return;
    }

    drawLayoutPicker(insp, s);
    drawContentFields(insp, s);
    SF.Custom.inspector(insp, s, function () { touched(); draw(); });

    insp.appendChild(UI.field('Transition in', UI.select(
      SF.TRANSITIONS.map(function (t) {
        return { value: t, label: t[0].toUpperCase() + t.slice(1) };
      }),
      s.transition, function (v) { s.transition = v; touched(); drawRail(); })));

    var row = el('div', 'field');
    row.appendChild(UI.button('Duplicate', null, duplicate));
    var del = UI.button('Delete', null, removeSlide);
    del.style.marginLeft = '6px';
    row.appendChild(del);
    insp.appendChild(row);
  }

  /** Thin inspector for an embedded game: edit the game in Quiz studio. */
  function drawGameSlideInspector(insp, s) {
    var history = el('div', 'format-tools');
    var undo = UI.button('↶ Undo', 'ghost', function () { restoreHistory(false); });
    undo.disabled = !past.length;
    var redo = UI.button('↷ Redo', 'ghost', function () { restoreHistory(true); });
    redo.disabled = !future.length;
    history.appendChild(undo);
    history.appendChild(redo);
    insp.appendChild(history);

    insp.appendChild(el('h4', 'eyebrow', 'CHECK IN THE LESSON'));
    insp.appendChild(el('h4', 'insp-title', 'Slide ' + (sel + 1) + ' — Game'));

    drawGameEmbed(insp, s);

    insp.appendChild(UI.field('Transition in', UI.select(
      SF.TRANSITIONS.map(function (t) {
        return { value: t, label: t[0].toUpperCase() + t.slice(1) };
      }),
      s.transition, function (v) { s.transition = v; touched(); drawRail(); })));

    var row = el('div', 'field');
    row.appendChild(UI.button('Duplicate', null, duplicate));
    var del = UI.button('Delete', null, removeSlide);
    del.style.marginLeft = '6px';
    row.appendChild(del);
    insp.appendChild(row);
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

    body.appendChild(UI.field('AI assistance', box));
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
    insp.appendChild(UI.field('Logo size',UI.select([{value:'small',label:'Small'},{value:'medium',label:'Medium'},{value:'large',label:'Large'}],deck.logoSize||'medium',function(v){deck.logoSize=v;touched();if(redraw)redraw();else draw();})));

    insp.appendChild(UI.field('Show logo on', UI.select([
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
    var box = el('details', 'layout-library'), summary = el('summary', null, 'Layout · ' + SF.SLIDE_TYPES[s.type].label);
    box.appendChild(summary);
    /** @type {[string, string[]][]} */
    var layoutGroups = [
      ['Introduce', ['title', 'introduction', 'section', 'quote']],
      ['Explain & organise', ['content', 'journey', 'mindmap', 'keywords', 'italics', 'cards', 'table', 'chart']],
      ['Show & explore', ['split', 'image', 'gallery', 'beforeafter', 'explore', 'simulation', 'video', 'links']]
    ];
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
        b.onclick = function () { SF.prepareLayout(s, type); touched(); draw(); };
        grid.appendChild(b);
        box.addEventListener('toggle', function () {
          if (box.open) requestAnimationFrame(function () { SF.fit(frame, node); });
        });
      });
      box.appendChild(grid);
    });
    insp.appendChild(box);
    drawVariants(insp,s);
    var hidden=SF.ContentTools.hidden(s);
    if(hidden.length){var saved=el('details','saved-content');saved.appendChild(el('summary',null,'Saved content outside this layout · '+hidden.length));
      saved.appendChild(el('p','hint','These items are still saved. Choose one to show it in a suitable layout.'));
      hidden.forEach(function(item){saved.appendChild(UI.button('Show '+item.label,'ghost',function(){SF.prepareLayout(s,item.layout);touched();draw();}));});insp.appendChild(saved);
    }
  }

  /**
   * Three alternative layouts for the words and picture already on this slide.
   *
   * The Layout grid above says what a layout is called; this says what this
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
    insp.appendChild(UI.field('Try another layout', row,
      'Preview your content in another structure. Unused content stays saved and can be restored.'));
  }

  /* Text fields preserve formatting separately from lesson content. */
  var PIT_MAX = { journey: 6, mindmap: 6, content: 8, cards: 6, split: 5, keywords: 8, italics: 8, links: 8 };

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
      var def = UI.text(parsed.def, function (v) {
        s.bullets[i] = SF.formatKeywordLine(SF.parseKeywordLine(s.bullets[i]).term, v);
        touched();
        repaint();
        row.classList.toggle('empty', !SF.parseKeywordLine(s.bullets[i]).term && !SF.parseKeywordLine(s.bullets[i]).def);
      }, trailPh);
      def.className = (def.className ? def.className + ' ' : '') + trailCls;
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

  function drawPits(wrap, s) {
    wrap.innerHTML = '';
    wrap.className = 'pit-list';
    ensurePits(s);
    var max = PIT_MAX[s.type] || 8;
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
    if (s.type === 'title') {
      var dateInput = el('input');
      dateInput.type = 'date'; dateInput.value = s.date || '';
      dateInput.setAttribute('aria-label', 'Slide date');
      dateInput.onchange = function () { s.date = dateInput.value; touched(); repaint(); };
      insp.appendChild(UI.field('Slide date', dateInput, 'Optional. Choose the lesson date; it stays fixed when you reopen the presentation.'));
      insp.appendChild(UI.button('Insert today’s date', 'ghost', function () {
        var today = new Date();
        s.date = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
        touched(); draw();
      }));
    }
    if (s.type === 'journey') {
      insp.appendChild(UI.field('Journey title',
        richField(s, 'title', 'text', function (v) { s.title = v; touched(); repaint(); })));
      insp.appendChild(UI.field('Context',
        richField(s, 'subtitle', 'text', function (v) { s.subtitle = v; touched(); repaint(); })));
      insp.appendChild(UI.field('Show as', UI.select(
        [{ value: 'path', label: 'Route with milestones' },
         { value: 'handover', label: 'Connected stages' }],
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
      insp.appendChild(UI.field('Chart type', UI.select(
        [{ value: 'bar', label: 'Bar — compare magnitude' },
         { value: 'line', label: 'Line — change over time' },
         { value: 'pie', label: 'Pie — parts of one whole' }],
        s.chartKind, function (v) { s.chartKind = v; touched(); repaint(); })));
      insp.appendChild(UI.field('Data \u2014 one row per line',
        richField(s, "body", "area", function (v) { s.body = v; touched(); repaint(); }, 9),
        'First row names the series, first column the categories. Separate ' +
        'cells with | \u2014 or paste a range straight from a spreadsheet, ' +
        'which arrives tab-separated and needs no editing.'));
      var cd = SF.chartData(s);
      var note = cd.series.length
        ? cd.series.length + (cd.series.length === 1 ? ' series' : ' series') + ' \u00d7 ' +
          cd.categories.length + (cd.categories.length === 1 ? ' category' : ' categories')
        : 'No data yet \u2014 needs a header row and at least one row of values.';
      insp.appendChild(el('p', 'hint', note));
      /* Said plainly rather than enforced: the author may have a reason, and
         a slide that silently drops a column is worse than a warning. */
      if (s.chartKind === 'pie' && cd.series.length > 1) {
        insp.appendChild(el('p', 'hint field-warn',
          'A pie shows one series. Only \u201c' + cd.series[0].name + '\u201d is drawn; the rest are ignored. Bar compares them all.'));
      }
      if (cd.series.length > 6) {
        insp.appendChild(el('p', 'hint field-warn',
          'Six series is the ceiling \u2014 past that the colours stop being tellable apart. Group the tail into \u201cOther\u201d, or split the chart.'));
      }
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

    if (s.type === 'quote') {
      insp.appendChild(UI.field('Quotation',
        richField(s, "body", "area", function (v) { s.body = v; touched(); repaint(); }, 4)));
      insp.appendChild(UI.field('Attribution',
        richField(s, "subtitle", "text", function (v) { s.subtitle = v; touched(); repaint(); })));
      return;
    }

    if (s.type === 'image') {
      drawImageFields(insp, s);
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
    var refresh = after || function () { refresh(); };
    var kinds = Object.keys(SF.FEEDBACK_KINDS);
    var current = s.feedback && s.feedback.kind ? s.feedback.kind : '';

    var picker = el('div', 'type-grid');
    picker.style.gridTemplateColumns = 'repeat(4, 1fr)';
    [{ value: '', icon: '—', label: 'None' }].concat(kinds.map(function (k) {
      return {
        value: k,
        icon: SF.FEEDBACK_KINDS[k].icon,
        label: SF.FEEDBACK_KINDS[k].label
      };
    })).forEach(function (c) {
      var b = el('button', current === c.value ? 'on' : null);
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

    insp.appendChild(UI.field('Audience feedback', picker,
      current
        ? SF.FEEDBACK_KINDS[current].blurb + ' Collected while this slide is up.'
        : 'Attach a poll, scale, word cloud or brainstorm. Responses appear in the rail beside the slide, and need a live session.'));

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
        drawPreview();
      }),
        'Saved on this slide — Present and Host live open the same way. ' +
        'Host live shows the join QR, PIN, and who arrives. Press E to toggle.'));
    }

    insp.appendChild(UI.field('Prompt for the room',
      UI.area(f.prompt, function (v) { f.prompt = v; refresh(); }, 2),
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
        f.lowLabel = v.slice(0, 40); refresh();
      }, 'Not at all')));
      endRow.appendChild(UI.field('High end', UI.text(f.highLabel, function (v) {
        f.highLabel = v.slice(0, 40); refresh();
      }, 'Completely')));
      insp.appendChild(UI.field('The two ends', endRow,
        'Both are required — without them the room cannot tell which way the ' +
        'scale runs, and a bare 1-to-5 means nothing on the wall either.'));

      insp.appendChild(UI.field('Points', UI.segmented(
        SF.SCALE_POINTS.map(function (n) {
          return { value: String(n), icon: String(n), label: n === 5 ? 'Usual' : '' };
        }), String(f.points), function (v) {
          f.points = Number(v); refresh();
        }),
        'An odd count leaves a real middle to sit in. More than seven is a ' +
        'distinction nobody makes honestly on a phone.'));

      insp.appendChild(el('div', 'hint',
        'Results show the spread, the average, and a flag when the two ends ' +
        'together outweigh the middle — a mean of 3 from a room at 1 and 5 is ' +
        'the opposite of a room all sitting at 3.'));
    } else {
      insp.appendChild(UI.field('Responses allowed each',
        UI.num(f.max, function (v) { f.max = Math.max(1, Math.min(5, v || 1)); refresh(); }, 1, 5),
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

  function addSlide(type) {
    var s = SF.makeSlide(type);
    if (type === 'content' || type === 'cards' || type === 'split') s.bullets = ['', '', ''];
    if (type === 'keywords' || type === 'italics' || type === 'links') {
      s.bullets = [
        SF.formatKeywordLine('', ''),
        SF.formatKeywordLine('', ''),
        SF.formatKeywordLine('', '')
      ];
    }
    if (current()) s.transition = current().transition;
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
    /* Always land on Design & content so Layout is visible after insert. */
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
    setDoc: function (d) { deck = d; sel = savedSelection(); },
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
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); restoreHistory(e.shiftKey); }
      else if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); select(sel + 1); }
      else if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); select(sel - 1); }
      else if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); removeSlide(); }
      else if (e.key === 'F5') { e.preventDefault(); present(); }
      else if ((e.metaKey || e.ctrlKey) && e.key === 'd') { e.preventDefault(); duplicate(); }
    }
  };

  function install() {
    UI = SF.Shell.UI;
    SF.Shell.register(ws);
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

    if (requestedLesson && SF.Studio && SF.Studio.makeLesson) {
      loaded = SF.Studio.makeLesson(requestedLesson);
      SF.Store.save(loaded);
      try {
        if (window.history && window.history.replaceState) {
          var cleanUrl = window.location.pathname + (window.location.hash || '');
          window.history.replaceState(null, '', cleanUrl);
        }
      } catch (e) {}
    } else {
      loaded = (last && SF.Store.get(last)) || SF.Store.list()[0] || null;
      if (!loaded) {
        loaded = SF.Studio.makeLesson();
        SF.Store.save(loaded);
      } else if (loaded.slides.some(function (s) { return s.type === 'quiz' || s.type === 'results'; })) {
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
        if (!SF.Player.open) SF.Player.start(runDeck(), runIndexFor(sel), { fullscreen: false });
        SF.Player.openPresenter();
      };
    }
  }

  /* Helper for creating a fully configured game from activity presets */
  SF.createPresetGame = function (style, preset, theme, options) {
    preset = preset || {};
    var g = SF.makeGame(preset.title || 'Quick knowledge check', style);
    g.theme = theme || 'midnight';
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
    if (!options || options.save !== false) SF.GameStore.save(g);
    return g;
  };

  SF.Editor = {
    install: install,
    addSlide: addSlide,
    insertStarter: insertStarter,
    commitActivityChange: touched,
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
      flush(); SF.Store.save(deck); deck = SF.Studio.makeLesson(key); sel = 0;
      SF.Store.save(deck); SF.Shell.syncChrome(); draw();
    },
    deck: function () { return deck; },
    selected: function () { return sel; },
    /* The activities studio attaches feedback with this editor rather than a
       second one of its own — same picker, same prompts, same per-kind
       settings. It passes its own redraw. */
    drawFeedback: drawFeedback,
    openDeck: function (id) {
      var d = SF.Store.get(id);
      if (!d) return;
      deck = d;
      sel = savedSelection();
      SF.Shell.syncChrome();
      draw();
    }
  };
})(window);
