/* SlideForge — the presentation engine.

   Slides and content only. Questions live in games (js/games.js); a
   presentation refers to one with a game-embed slide, which expands into that
   game's questions when the show runs. Nothing here knows how a game is
   scored. */
(function (global) {
  'use strict';

  var SF = global.SF;
  var el = SF.el;
  var $ = function (id) { return document.getElementById(id); };
  var UI;

  var deck = null;
  var sel = 0;
  var saveTimer = null;

  /* ------------------------------------------------------------ helpers */

  function current() { return deck.slides[sel]; }

  function touched() {
    SF.Shell.touch();
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
      game: s.type === 'game' ? gameFor(s) : null
    };
  }

  /* ------------------------------------------------------------ rail */

  function drawRail() {
    var rail = $('railList');
    rail.innerHTML = '';
    $('railCount').textContent = String(deck.slides.length);

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
      rail.appendChild(row);
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

  function drawPreview() {
    var box = $('previewBox');
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
      $('notes').value = s.notes || '';
      return;
    }

    var node = SF.renderSlide(deck, s, slideOpts(sel));
    box.appendChild(node);

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
      requestAnimationFrame(function () {
        var scale = box.clientWidth / SF.SLIDE_W;
        rail.style.transform = 'scale(' + scale + ')';
      });
    }

    requestAnimationFrame(function () { SF.fit(box, node); });
    $('notes').value = s.notes || '';
  }

  /* ------------------------------------------------------------ inspector */

  function drawInspector() {
    var insp = $('inspector');
    insp.innerHTML = '';
    var s = current();
    if (!s) return;

    var tabs = el('div', 'inspector-tabs');
    ['content', 'engage'].forEach(function (key) {
      var b = UI.button(key === 'content' ? '✎  Design & content' : '✳  Engagement', inspectorTab === key ? 'active' : '', function () { inspectorTab = key; drawInspector(); });
      tabs.appendChild(b);
    });
    insp.appendChild(tabs);
    insp.appendChild(el('h4','eyebrow', inspectorTab === 'content' ? 'MAKE IT YOURS' : 'INVITE EVERY VOICE'));
    insp.appendChild(el('h4', 'insp-title',
      'Slide ' + (sel + 1) + ' — ' + SF.SLIDE_TYPES[s.type].label));

    if (inspectorTab === 'engage') {
      drawLearning(insp, s);
      if (s.type !== 'game') drawFeedback(insp, s);
      else drawGameEmbed(insp, s);
      return;
    }

    if (s.type === 'game') {
      drawGameEmbed(insp, s);
    } else {
      drawLayoutPicker(insp, s);
      drawContentFields(insp, s);
    }

    drawLogoFields(insp);

    insp.appendChild(UI.button(s.type === 'game' ? '✳ Plan the learning moment →' : s.feedback ? '✳ Edit audience activity →' : '✳ Add audience activity →', 'engage-link', function () { inspectorTab = 'engage'; drawInspector(); }));

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

  function drawLogoFields(insp) {
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
        draw();
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
        SF.toast('Keep the logo under 1.5 MB so the lesson stays portable.');
        return;
      }
      var fr = new FileReader();
      fr.onload = function () {
        deck.logo = fr.result;
        if (deck.logoOn === 'none') deck.logoOn = 'all';
        touched();
        draw();
      };
      fr.readAsDataURL(f);
    });
    wrap.appendChild(pick);
    insp.appendChild(UI.field('Lesson logo', wrap,
      'Corner mark on slides. PNG or SVG works best.'));
    if (deck.logo) {
      insp.appendChild(UI.field('Show logo on', UI.select([
        { value: 'all', label: 'Every slide' },
        { value: 'title', label: 'Title slide only' },
        { value: 'none', label: 'Hidden' }
      ], deck.logoOn === 'title' || deck.logoOn === 'none' ? deck.logoOn : 'all',
        function (v) { deck.logoOn = v; touched(); draw(); })));
    }
  }

  function drawLearning(insp, s) {
    var prompts = {
      Remember: 'Recall: What do you already know about this idea?',
      Understand: 'Explain this idea in your own words.',
      Apply: 'Where could you use this in a real situation?',
      Analyze: 'Compare two approaches. What patterns do you notice?',
      Evaluate: 'Which approach would you choose, and why?',
      Create: 'Design a new solution using what you have learned.'
    };
    var level = s.bloom || 'Understand';
    insp.appendChild(UI.field('Thinking level · Bloom’s taxonomy', UI.select(Object.keys(prompts).map(function (k) { return {value:k,label:k}; }), level, function (v) { s.bloom = v; touched(); drawInspector(); })));
    var coach = el('div', 'learning-coach');
    coach.appendChild(el('span','eyebrow','A PROMPT TO TRY'));
    coach.appendChild(el('p',null,prompts[level] || prompts.Understand));
    coach.appendChild(UI.button('Use as a brainstorm →', 'ghost', function () { s.feedback = SF.makeFeedback('brainstorm'); s.feedback.prompt = prompts[level] || prompts.Understand; touched(); draw(); }));
    insp.appendChild(coach);
    insp.appendChild(UI.field('After the responses, I will…', UI.area(s.nextStep || '', function (v) { s.nextStep = v; touched(); }, 2), 'Plan a re-explanation, peer discussion or stretch question. This note is for you.'));
  }

  function drawLayoutPicker(insp, s) {
    var grid = el('div', 'type-grid');
    SF.DECK_TYPES.forEach(function (t) {
      var b = el('button', s.type === t ? 'on' : null);
      b.appendChild(el('span', 'g', SF.SLIDE_TYPES[t].icon));
      b.appendChild(el('span', null, SF.SLIDE_TYPES[t].label));
      b.onclick = function () {
        s.type = t;
        if ((t === 'content' || t === 'cards' || t === 'split' || t === 'keywords' || t === 'italics' || t === 'links') && !s.bullets.length) {
          s.bullets = (t === 'keywords' || t === 'italics' || t === 'links')
            ? [SF.formatKeywordLine('', ''), SF.formatKeywordLine('', ''), SF.formatKeywordLine('', '')]
            : ['', '', ''];
        }
        if (t === 'split' && s.imageSide !== 'left') s.imageSide = 'right';
        touched();
        draw();
      };
      grid.appendChild(b);
    });
    insp.appendChild(UI.field('Layout', grid));
  }

  /* Click-to-fill slots for bullets and cards — plain text, no formatting ribbon. */
  var PIT_MAX = { content: 8, cards: 6, split: 5, keywords: 8, italics: 8, links: 8 };

  function ensurePits(s) {
    if (!Array.isArray(s.bullets)) s.bullets = [];
    var min = 3;
    var empty = (s.type === 'keywords' || s.type === 'italics' || s.type === 'links')
      ? SF.formatKeywordLine('', '') : '';
    while (s.bullets.length < min) s.bullets.push(empty);
  }

  function drawPairPits(wrap, s, kind) {
    var italic = kind === 'italics';
    var links = kind === 'links';
    wrap.innerHTML = '';
    wrap.className = 'pit-list keyword-pits' + (italic ? ' italics-pits' : '') + (links ? ' links-pits' : '');
    ensurePits(s);
    var max = PIT_MAX[kind] || 8;
    var leadPh = links ? 'Link label' : italic ? 'Phrase in italics' : 'Keyword';
    var trailPh = links ? 'https://…' : italic ? 'plain explanation' : 'definition in plain language';
    var leadCls = links ? 'ln-label-input' : italic ? 'it-phrase-input' : 'kw-term-input';
    var trailCls = links ? 'ln-url-input' : italic ? 'it-note-input' : 'kw-def-input';
    var addLabel = links ? 'link' : italic ? 'phrase' : 'keyword';
    s.bullets.forEach(function (line, i) {
      var parsed = SF.parseKeywordLine(line);
      var row = el('div', 'pit-row keyword' + ((parsed.term || parsed.def) ? '' : ' empty'));
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
      row.appendChild(el('span', 'pit-i', s.type === 'cards' ? String(i + 1).padStart(2, '0') : '•'));
      var input = UI.text(text, function (v) {
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
        if (s.bullets.length <= 1) {
          s.bullets[0] = '';
        } else {
          s.bullets.splice(i, 1);
        }
        ensurePits(s);
        touched();
        drawPits(wrap, s);
        repaint();
      };
      row.appendChild(kill);
      wrap.appendChild(row);
    });
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

  function drawImageFields(insp, s, opts) {
    opts = opts || {};
    if (opts.caption !== false) {
      insp.appendChild(UI.field(opts.captionLabel || 'Caption',
        UI.area(s.title, function (v) { s.title = v; touched(); repaint(); }, 2)));
    }
    insp.appendChild(UI.field('Image URL or data',
      UI.text(s.image, function (v) { s.image = v.trim(); touched(); repaint(); }),
      'Paste a URL, or embed a local file below.'));

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
      fr.onload = function () { s.image = fr.result; touched(); draw(); };
      fr.readAsDataURL(f);
    });
    insp.appendChild(UI.field('Embed a local file', pick));
    insp.appendChild(UI.field('Fit', UI.select(
      [{ value: 'cover', label: 'Fill the panel (crop)' },
       { value: 'contain', label: 'Fit inside (letterbox)' }],
      s.imageFit, function (v) { s.imageFit = v; touched(); repaint(); })));
    if (opts.side) {
      insp.appendChild(UI.field('Image side', UI.select(
        [{ value: 'right', label: 'Right — text on the left' },
         { value: 'left', label: 'Left — text on the right' }],
        s.imageSide === 'left' ? 'left' : 'right',
        function (v) { s.imageSide = v; touched(); draw(); })));
    }
  }

  function drawContentFields(insp, s) {
    if (s.type === 'quote') {
      insp.appendChild(UI.field('Quotation',
        UI.area(s.body, function (v) { s.body = v; touched(); repaint(); }, 4)));
      insp.appendChild(UI.field('Attribution',
        UI.text(s.subtitle, function (v) { s.subtitle = v; touched(); repaint(); })));
      return;
    }

    if (s.type === 'image') {
      drawImageFields(insp, s);
      return;
    }

    if (s.type === 'split') {
      insp.appendChild(UI.field('Title',
        UI.area(s.title, function (v) { s.title = v; touched(); repaint(); }, 2)));
      var pits = el('div');
      drawPits(pits, s);
      insp.appendChild(UI.field('Points — click a pit to fill (up to 5)', pits,
        'Keep it short — the image carries half the meaning.'));
      drawImageFields(insp, s, { caption: false, side: true });
      return;
    }

    if (s.type === 'keywords') {
      insp.appendChild(UI.field('Title',
        UI.area(s.title, function (v) { s.title = v; touched(); repaint(); }, 2)));
      var kw = el('div');
      drawPairPits(kw, s, 'keywords');
      insp.appendChild(UI.field('Keywords — bold term, lowercase definition', kw,
        'The slide shows the term in bold and the definition in lowercase.'));
      return;
    }

    if (s.type === 'italics') {
      insp.appendChild(UI.field('Title',
        UI.area(s.title, function (v) { s.title = v; touched(); repaint(); }, 2)));
      var it = el('div');
      drawPairPits(it, s, 'italics');
      insp.appendChild(UI.field('Italics — emphasised phrase, plain note', it,
        'The slide shows the phrase in italics and the explanation in regular type.'));
      return;
    }

    if (s.type === 'links') {
      insp.appendChild(UI.field('Title',
        UI.area(s.title, function (v) { s.title = v; touched(); repaint(); }, 2)));
      var ln = el('div');
      drawPairPits(ln, s, 'links');
      insp.appendChild(UI.field('Links — label + http(s) URL', ln,
        'Only http and https links become clickable. Opens in a new tab.'));
      return;
    }

    insp.appendChild(UI.field(s.type === 'content' ? 'Title' : 'Heading',
      UI.area(s.title, function (v) { s.title = v; touched(); repaint(); }, 2)));

    if (s.type === 'title' || s.type === 'section') {
      insp.appendChild(UI.field('Subtitle',
        UI.text(s.subtitle, function (v) { s.subtitle = v; touched(); repaint(); })));
    }

    if (s.type === 'content' || s.type === 'cards') {
      var bulletPits = el('div');
      drawPits(bulletPits, s);
      insp.appendChild(UI.field(
        s.type === 'cards' ? 'Cards — click a pit to fill (up to 6)' : 'Bullets — click a pit to fill',
        bulletPits,
        'Empty pits stay off the slide until you type. Prefix with "- " for a sub-bullet.'
      ));
    }
  }

  /* The embed inspector is deliberately thin: everything about how the game
     plays is edited in the game engine, not here. */
  function drawGameEmbed(insp, s) {
    var game = gameFor(s);

    var swap = UI.button(game ? 'Choose a different game' : 'Choose a game', 'primary', insertGame);
    swap.style.width = '100%';
    insp.appendChild(UI.field('Game', swap));

    if (!game) {
      insp.appendChild(UI.field(null, null,
        s.gameId
          ? 'The game this slide pointed at has been deleted. Pick another, or delete this slide.'
          : 'No game chosen yet — this slide is skipped when you present.'));
      return;
    }

    var facts = el('div', 'hint');
    facts.style.cssText =
      'padding:10px 12px;background:var(--ui-bg);border-radius:6px;line-height:1.7;white-space:pre-line';
    facts.textContent =
      SF.gameStyle(game.style).label + '\n' +
      game.questions.length + (game.questions.length === 1 ? ' question' : ' questions') + '\n' +
      (game.settings.mode === 'teams'
        ? 'Teams: ' + game.settings.teams.map(function (t) { return t.name; }).join(', ')
        : 'Scored individually') + '\n' +
      (game.settings.defaultTime ? game.settings.defaultTime + 's default countdown' : 'No countdown');
    insp.appendChild(UI.field('What plays here', facts));

    var edit = UI.button('Edit this game', null, function () {
      SF.Shell.activate('game', { toast: false });
      SF.Games.openGame(game.id);
    });
    edit.style.width = '100%';
    insp.appendChild(UI.field(null, edit,
      'Questions, teams and timing are all edited in the game engine.'));
  }

  /* ---------------------------------------------------- audience feedback */

  /* Attached to the slide rather than replacing it: the slide still says what
     it says, and the room's responses gather in the rail beside it. */
  function drawFeedback(insp, s) {
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
        touched();
        drawInspector();
        repaint();
      };
      picker.appendChild(b);
    });

    insp.appendChild(UI.field('Audience feedback', picker,
      current
        ? SF.FEEDBACK_KINDS[current].blurb + ' Collected while this slide is up.'
        : 'Attach a poll, scale, word cloud or brainstorm. Responses appear in the rail beside the slide, and need a live session.'));

    if (!current) return;
    var f = s.feedback;

    if (SF.slideFeedback(s)) {
      insp.appendChild(UI.field('Preview as', UI.segmented([
        { value: 'rail', icon: '◨', label: 'Beside the slide' },
        { value: 'focus', icon: '⛶', label: 'Full screen' }
      ], feedbackPresentAs(s), function (v) {
        if (!s.feedback) return;
        s.feedback.presentAs = v === 'focus' ? 'focus' : 'rail';
        touched();
        drawInspector();
        drawPreview();
      }),
        'Saved on this slide — Present and Host live open the same way. ' +
        'Host live shows the join QR, PIN, and who arrives. Press E to toggle.'));
    }

    insp.appendChild(UI.field('Prompt for the room',
      UI.area(f.prompt, function (v) { f.prompt = v; touched(); repaint(); }, 2),
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
        f.lowLabel = v.slice(0, 40); touched(); repaint();
      }, 'Not at all')));
      endRow.appendChild(UI.field('High end', UI.text(f.highLabel, function (v) {
        f.highLabel = v.slice(0, 40); touched(); repaint();
      }, 'Completely')));
      insp.appendChild(UI.field('The two ends', endRow,
        'Both are required — without them the room cannot tell which way the ' +
        'scale runs, and a bare 1-to-5 means nothing on the wall either.'));

      insp.appendChild(UI.field('Points', UI.segmented(
        SF.SCALE_POINTS.map(function (n) {
          return { value: String(n), icon: String(n), label: n === 5 ? 'Usual' : '' };
        }), String(f.points), function (v) {
          f.points = Number(v); touched(); drawInspector(); repaint();
        }),
        'An odd count leaves a real middle to sit in. More than seven is a ' +
        'distinction nobody makes honestly on a phone.'));

      insp.appendChild(el('div', 'hint',
        'Results show the spread, the average, and a flag when the two ends ' +
        'together outweigh the middle — a mean of 3 from a room at 1 and 5 is ' +
        'the opposite of a room all sitting at 3.'));
    } else {
      insp.appendChild(UI.field('Responses allowed each',
        UI.num(f.max, function (v) { f.max = Math.max(1, Math.min(5, v || 1)); touched(); }, 1, 5),
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
      if (!confirm('You have no games yet. Create one now?')) return;
      SF.Shell.activate('game', { toast: false });
      SF.Games.newGame();
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

  function hostLive() {
    var run = runDeck();
    /* A deck can be hosted for feedback alone — it does not need a game. */
    if (!run.games.length && !run.feedbackSlides) {
      SF.toast('Nothing to host yet — add a game, or attach feedback to a slide');
      return;
    }
    SF.Live.host(run);
  }

  /* ------------------------------------------------------------ workspace */

  function repaint() { drawPreview(); drawRail(); }
  function draw() { drawRail(); drawFoot(); drawPreview(); drawInspector(); }

  var ws = {
    key: 'deck',
    railLabel: 'Slides',
    notesLabel: 'Speaker notes — visible in presenter view only',
    fileSuffix: '.sfdeck.json',
    store: SF.Store,
    doc: function () { return deck; },
    setDoc: function (d) { deck = d; sel = 0; },
    blank: function () { return SF.makeDeck('Untitled presentation'); },
    draw: draw,
    flush: flush,
    play: present,
    hostLive: hostLive,
    onTitle: function (v) { deck.title = v || 'Untitled presentation'; touched(); },
    onTheme: function (v) { deck.theme = v; touched(); draw(); },
    describe: function (d) {
      var games = d.slides.filter(function (s) { return s.type === 'game'; }).length;
      return d.slides.length + (d.slides.length === 1 ? ' slide' : ' slides') +
        (games ? ' · ' + games + (games === 1 ? ' game' : ' games') : '') +
        ' · ' + new Date(d.modified).toLocaleString();
    },
    keydown: function (e) {
      if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); select(sel + 1); }
      else if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); select(sel - 1); }
      else if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); removeSlide(); }
      else if (e.key === 'F5') { e.preventDefault(); present(); }
      else if ((e.metaKey || e.ctrlKey) && e.key === 'd') { e.preventDefault(); duplicate(); }
    }
  };

  function install() {
    UI = SF.Shell.UI;
    SF.Shell.register(ws);

    var last = SF.Store.lastId();
    var loaded = (last && SF.Store.get(last)) || SF.Store.list()[0] || null;

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

    deck = loaded;
    sel = 0;

    $('notes').addEventListener('input', function () {
      if (SF.Shell.current() !== ws) return;
      current().notes = $('notes').value;
      touched();
    });

    $('btnPresent').onclick = present;
    $('btnPresenter').onclick = function () {
      SF.Store.save(deck);
      if (!SF.Player.open) SF.Player.start(runDeck(), runIndexFor(sel), { fullscreen: false });
      SF.Player.openPresenter();
    };
  }

  SF.Editor = {
    install: install,
    addSlide: addSlide,
    insertStarter: insertStarter,
    attachFeedback: function (kind) {
      if (current().type === 'game') addSlide('content');
      current().feedback = SF.makeFeedback(kind);
      current().feedback.prompt = kind === 'wordcloud' ? 'What comes to mind in one word?' : kind === 'poll' ? 'How confident do you feel about this topic?' : 'What would you add?';
      if (kind === 'poll') current().feedback.options = ['Getting started', 'Almost there', 'Ready to apply it'];
      inspectorTab = 'engage'; touched(); draw();
    },
    insertNewGame: function (style) {
      var g = SF.makeGame('Quick knowledge check', style);
      g.theme = deck.theme; g.settings.defaultTime = 0; g.settings.scoreboard = false;
      g.settings.scoreSlide = false;
      SF.GameStore.save(g);
      addSlide('game'); current().gameId = g.id; current().gameTitle = g.title; current().title = g.title;
      inspectorTab = 'content'; touched(); draw();
    },
    useLesson: function () {
      flush(); SF.Store.save(deck); deck = SF.Studio.makeLesson(); sel = 0;
      SF.Store.save(deck); SF.Shell.syncChrome(); draw();
    },
    deck: function () { return deck; },
    selected: function () { return sel; },
    openDeck: function (id) {
      var d = SF.Store.get(id);
      if (!d) return;
      deck = d;
      sel = 0;
      SF.Shell.syncChrome();
      draw();
    }
  };
})(window);
