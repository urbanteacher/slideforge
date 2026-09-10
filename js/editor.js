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
      row.dataset.i = String(i);
      row.appendChild(el('div', 'num', String(i + 1)));

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
      row.appendChild(frame);

      var node = SF.renderSlide(deck, s, Object.assign(slideOpts(i), { chrome: false }));
      frame.appendChild(node);

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
    foot.appendChild(UI.button('+ Slide', null, function () { addSlide('content'); }));
    var ins = UI.button('+ Game', null, insertGame);
    ins.title = 'Drop a game into the presentation at this point';
    foot.appendChild(ins);
  }

  /* ------------------------------------------------------------ preview */

  /* Preview mode for a feedback slide: 'rail' shows it beside the slide as the
     room will see it, 'focus' shows the full-screen version. Sample responses
     stand in, because you cannot judge a layout against no data. */
  var fbPreview = 'rail';

  function drawPreview() {
    var box = $('previewBox');
    box.innerHTML = '';
    box.classList.remove('railed');
    var s = current();
    if (!s) return;

    var f = SF.slideFeedback(s);
    var digest = f ? SF.sampleFeedbackDigest(f) : null;
    var kind = f ? SF.FEEDBACK_KINDS[f.kind] : null;

    if (f && fbPreview === 'focus') {
      /* The focus view replaces the slide, so preview it the same way. */
      var focus = SF.feedbackFocus(deck, digest, {
        title: kind.label,
        subtitle: f.prompt,
        options: f.options,
        footnote: '14 of 18 responded',
        sample: true
      });
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
      SF.paintFeedbackRail(rail, digest, {
        title: kind.label,
        subtitle: f.prompt,
        options: f.options,
        footnote: 'Sample — 14 of 18 responded'
      });
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

    insp.appendChild(el('h4', 'insp-title',
      'Slide ' + (sel + 1) + ' — ' + SF.SLIDE_TYPES[s.type].label));

    if (s.type === 'game') {
      drawGameEmbed(insp, s);
    } else {
      drawLayoutPicker(insp, s);
      drawContentFields(insp, s);
    }

    if (s.type !== 'game') drawFeedback(insp, s);

    insp.appendChild(UI.field('Transition in', UI.select(
      SF.TRANSITIONS.map(function (t) {
        return { value: t, label: t[0].toUpperCase() + t.slice(1) };
      }),
      s.transition, function (v) { s.transition = v; touched(); })));

    var row = el('div', 'field');
    row.appendChild(UI.button('Duplicate', null, duplicate));
    var del = UI.button('Delete', null, removeSlide);
    del.style.marginLeft = '6px';
    row.appendChild(del);
    insp.appendChild(row);
  }

  function drawLayoutPicker(insp, s) {
    var grid = el('div', 'type-grid');
    SF.DECK_TYPES.forEach(function (t) {
      var b = el('button', s.type === t ? 'on' : null);
      b.appendChild(el('span', 'g', SF.SLIDE_TYPES[t].icon));
      b.appendChild(el('span', null, SF.SLIDE_TYPES[t].label));
      b.onclick = function () {
        s.type = t;
        if (t === 'content' && !s.bullets.length) s.bullets = ['New point'];
        touched();
        draw();
      };
      grid.appendChild(b);
    });
    insp.appendChild(UI.field('Layout', grid));
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
      insp.appendChild(UI.field('Caption',
        UI.text(s.title, function (v) { s.title = v; touched(); repaint(); })));
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
        [{ value: 'cover', label: 'Fill the slide (crop)' },
         { value: 'contain', label: 'Fit inside (letterbox)' }],
        s.imageFit, function (v) { s.imageFit = v; touched(); repaint(); })));
      return;
    }

    insp.appendChild(UI.field(s.type === 'content' ? 'Title' : 'Heading',
      UI.text(s.title, function (v) { s.title = v; touched(); repaint(); })));

    if (s.type === 'title' || s.type === 'section') {
      insp.appendChild(UI.field('Subtitle',
        UI.text(s.subtitle, function (v) { s.subtitle = v; touched(); repaint(); })));
    }

    if (s.type === 'content') {
      insp.appendChild(UI.field('Bullets — one per line',
        UI.area(s.bullets.join('\n'), function (v) {
          s.bullets = v.split('\n');
          touched(); repaint();
        }, 7),
        'Start a line with "- " or indent it to make a sub-bullet.'));
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
            : c.value === 'wordcloud'
              ? 'One word for how this feels'
              : 'What would you add?';
        }
        touched();
        drawInspector();
        drawRail();
      };
      picker.appendChild(b);
    });

    insp.appendChild(UI.field('Audience feedback', picker,
      current
        ? SF.FEEDBACK_KINDS[current].blurb + ' Collected while this slide is up.'
        : 'Attach a poll, word cloud or brainstorm. Responses appear in the rail beside the slide, and need a live session.'));

    if (!current) return;
    var f = s.feedback;

    if (SF.slideFeedback(s)) {
      insp.appendChild(UI.field('Preview as', UI.segmented([
        { value: 'rail', icon: '◨', label: 'Beside the slide' },
        { value: 'focus', icon: '⛶', label: 'Full screen' }
      ], fbPreview, function (v) { fbPreview = v; drawInspector(); drawPreview(); }),
        'Sample responses, so you can judge the layout before anyone has answered. ' +
        'Press E during the show to switch to full screen.'));
    }

    insp.appendChild(UI.field('Prompt for the room',
      UI.area(f.prompt, function (v) { f.prompt = v; touched(); drawRail(); }, 2),
      'Shown on the phones. Keep it short — the slide carries the detail.'));

    if (SF.FEEDBACK_KINDS[current].needsOptions) {
      var wrap = el('div');
      drawPollOptions(wrap, f);
      insp.appendChild(UI.field('Options', wrap, 'Two to six. No correct answer — this is not scored.'));
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
        f.options[i] = v; touched(); drawRail();
      }, 'Option ' + (i + 1)));
      var kill = el('button', 'kill', '×');
      kill.title = 'Remove';
      kill.onclick = function () {
        if (f.options.length <= 2) { SF.toast('A poll needs at least two options'); return; }
        f.options.splice(i, 1);
        touched(); drawPollOptions(wrap, f);
      };
      row.appendChild(kill);
      wrap.appendChild(row);
    });
    if (f.options.length < 6) {
      var add = UI.button('+ Add option', 'ghost', function () {
        f.options.push('');
        touched(); drawPollOptions(wrap, f);
      });
      add.style.fontSize = '12px';
      wrap.appendChild(add);
    }
  }

  /* ------------------------------------------------------------ slide ops */

  function addSlide(type) {
    var s = SF.makeSlide(type);
    if (current()) s.transition = current().transition;
    deck.slides.splice(sel + 1, 0, s);
    sel += 1;
    touched();
    draw();
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
      /* First run: a sample presentation with a sample game embedded, so the
         relationship between the two engines is visible immediately. */
      var game = SF.starterGame();
      SF.GameStore.save(game);
      loaded = SF.makeDeck('Sample presentation');
      loaded.slides = SF.starterDeck().slides.filter(function (s) {
        return s.type !== 'quiz' && s.type !== 'results';
      });
      var embed = SF.makeSlide('game');
      embed.gameId = game.id;
      embed.gameTitle = game.title;
      embed.title = game.title;
      loaded.slides.push(embed);
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
