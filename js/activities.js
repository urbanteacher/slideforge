/* SlideForge — the activities workspace.

   The third studio, and a third view of the same deck rather than a third
   document. Picking an activity puts it in the lesson, exactly as picking a
   game does: the rail is the deck's slides, and it grows as you choose.

   An earlier version kept its own list of chosen activities in the rail.
   That made a second place for a lesson to live, and left the teacher to
   assemble the real thing afterwards from a column of names. There is one
   lesson, and this studio writes into it.

   The catalogue is SF.Activities — the 54, built in src/ and checked. */
(function (global) {
  'use strict';
  /** @type {import("../src/types.js").SlideForgeGlobal} */
  var SF = global.SF;
  var el = SF.el;
  var A = SF.Activities;

  var phaseFilter = 'all';
  /** Slide id of the chosen activity the rail foot acts on, or null. */
  var selected = null;

  function deck() {
    return (SF.Editor && SF.Editor.deck && SF.Editor.deck()) || { slides: [], theme: 'studio' };
  }

  /* ------------------------------------------------------------ inserting */

  /**
   * Put an activity into the deck.
   *
   * Every branch ends in the deck editor's own insert, so an activity chosen
   * here is indistinguishable from one chosen in Lesson studio — same slide,
   * same undo, same place in the running order.
   */
  function insert(a) {
    var previous = current();
    if (previous) SF.Editor.selectSlide(previous.slides[previous.slides.length - 1].id);
    if (a.target === 'game' && a.style) {
      var game = SF.createPresetGame(a.style, Object.assign({ title: a.title }, a.gamePreset || {}), deck().theme);
      var gameSlide = SF.makeSlide('game');
      gameSlide.gameId = game.id;
      gameSlide.title = gameSlide.gameTitle = game.title;
      gameSlide.activity = a.key;
      gameSlide.activityInstance = gameSlide.id;
      gameSlide.notes = steps(a);
      SF.Editor.insertStarters([gameSlide]);
      selected = gameSlide.id;
    } else {
      var slides = activitySlides(a);
      SF.Editor.insertStarters(slides);
      selected = slides[0].id;
    }
    SF.Shell.touch();
    SF.toast(a.title + ' added to the lesson.');
    draw();
  }

  /** Feedback activities own a fresh slide so their prompts and materials
   * cannot replace an existing activity's response collection. */
  function activitySlides(a) {
    var parts = a.pages || [{ layout: a.layout || 'keywords', fields: a.fields }];
    var instance;
    return parts.map(function (part, i) {
      var s = SF.makeSlide(part.layout);
      if (SF.prepareLayout) SF.prepareLayout(s, part.layout);
      s.title = a.title;
      s.notes = steps(a);
      s.activity = a.key;
      s.activityPage = i;
      if (a.presentation) s.activityPresentation = a.presentation;
      instance = instance || s.id;
      s.activityInstance = instance;
      if (a.target === 'feedback') {
        s.feedback = Object.assign(SF.makeFeedback(a.feedbackKind),
          JSON.parse(JSON.stringify(a.feedbackPreset || {})));
      }
      if (part.layout === 'table') s.tableHeader = false;
      applyFields(part, s);
      return s;
    });
  }

  /* ------------------------------------------------------- activity fields */

  /* A keywords bullet is one string holding a label and its text either side
     of a tab, so `bullets.0` alone would make a teacher type the tab. These
     two paths address the halves: `bullets.0.term` and `bullets.0.def`. */
  var KEYWORD_HALF = /^(bullets\.\d+)\.(term|def)$/;

  /** Read a dotted path off a slide: `title`, `bullets.0`, `bullets.0.def`. */
  function read(slide, path) {
    var half = path.match(KEYWORD_HALF);
    if (half) {
      var line = SF.parseKeywordLine(read(slide, half[1]) || '');
      return half[2] === 'term' ? line.term : line.def;
    }
    return path.split('.').reduce(function (at, key) {
      return at == null ? undefined : at[key];
    }, slide);
  }

  /** Write one, growing the array if the path points past its end — a layout
   *  with two pits has to accept a third question without losing it. */
  function write(slide, path, value) {
    var half = path.match(KEYWORD_HALF);
    if (half) {
      var line = SF.parseKeywordLine(read(slide, half[1]) || '');
      write(slide, half[1], half[2] === 'term'
        ? SF.formatKeywordLine(value, line.def)
        : SF.formatKeywordLine(line.term, value));
      return;
    }
    var parts = path.split('.');
    var last = parts.pop();
    var at = parts.reduce(function (node, key) { return node[key]; }, slide);
    if (Array.isArray(at)) {
      var i = Number(last);
      while (at.length <= i) at.push('');
      at[i] = value;
    } else {
      at[last] = value;
    }
  }

  /** The field defaults, written onto a slide as it is created. A worked
   *  example to overwrite beats an empty pit and a guess about what goes in
   *  it — the same argument the game presets already make. */
  function applyFields(a, slide) {
    var fields = a.fields || [];
    /* An activity that names its bullets owns all of them. The layout's own
       placeholders are dropped first, or Hook & Predict's two questions
       arrive followed by a stray "Third point" that nobody asked for. */
    if (fields.some(function (f) { return /^bullets\./.test(f.slide); })) slide.bullets = [];
    fields.forEach(function (f) {
      /* On a keywords box the field's own label is the box's label, so the
         catalogue says it once. The teacher edits the content; the label is
         what the activity calls that box. */
      var half = f.slide.match(KEYWORD_HALF);
      if (half && half[2] === 'def') write(slide, half[1] + '.term', f.label);
      if (f.value !== undefined) write(slide, f.slide, f.type === 'minutes' ? Number(f.value) * 60 : f.value);
    });
  }

  function steps(a) {
    return a.blurb + '\n\n' + a.steps.map(function (step, i) {
      return (i + 1) + '. ' + step;
    }).join('\n') + (a.materials ? '\n\nMaterials (source):\n' + a.materials.join(' · ') : '') +
      (a.teacherNotes ? '\n\nTeacher guidance / example answers (draft):\n' + a.teacherNotes : '') +
      (a.mappingReason ? '\n\nImplementation note:\n' + a.mappingReason : '');
  }

  /* ---------------------------------------------------------------- rail */

  /** The deck slides that were chosen here, with the position each holds in
   *  the lesson so a row can say where it landed. */
  function chosen() {
    var groups = [];
    deck().slides.forEach(function (slide, i) {
      if (!slide.activity) return;
      var key = slide.activityInstance || slide.id;
      var group = groups.find(function (row) { return row.key === key; });
      if (group) group.slides.push(slide);
      else groups.push({ key: key, slide: slide, slides: [slide], at: i });
    });
    return groups;
  }

  /* Only what was chosen in this studio, not the whole deck. Quiz studio's
     rail lists the questions of the game being built rather than every slide
     in the lesson, and this is the same idea: a lesson of twenty slides is
     not what you came to this tab to look at.

     Built as Quiz studio's `.qthumb` rather than Lesson studio's `.thumb` —
     number, title, a line of meta — because these are list entries, not
     slides to preview. */
  function drawRail() {
    var list = document.getElementById('railList');
    var count = document.getElementById('railCount');
    var rows = chosen();
    if (count) count.textContent = String(rows.length);
    if (!list) return;
    list.replaceChildren();

    if (!rows.length) {
      list.appendChild(el('p', 'hint',
        'Nothing chosen yet. Pick an activity and it lands in the lesson.'));
      return;
    }

    rows.forEach(function (row, n) {
      var a = A.activity(row.slide.activity);
      var thumb = el('div', 'qthumb');
      thumb.tabIndex = 0;
      thumb.setAttribute('role', 'button');
      thumb.setAttribute('aria-label',
        (a ? a.title : row.slide.title) + ' — slide ' + (row.at + 1) + ', edit activity');
      thumb.appendChild(el('div', 'qn', String(n + 1)));

      var body = el('div', 'qbody');
      body.appendChild(el('div', 'qtext', a ? a.title : (row.slide.title || 'Activity')));
      var meta = el('div', 'qmeta');
      if (a) meta.appendChild(el('span', null, a.minutes + ' min'));
      meta.appendChild(el('span', null, 'slide ' + (row.at + 1) + (row.slides.length > 1 ? ' · ' + row.slides.length + ' slides' : '')));
      if (row.slide.type === 'game') meta.appendChild(el('span', 'why', 'game'));
      else if (row.slide.feedback) meta.appendChild(el('span', 'why', 'feedback'));
      body.appendChild(meta);
      thumb.appendChild(body);

      if (row.slide.id === selected) thumb.classList.add('sel');
      var pick = function () { selected = row.slide.id; SF.Editor.selectSlide(selected); draw(); };
      thumb.onclick = pick;
      thumb.onkeydown = function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); }
      };
      list.appendChild(thumb);
    });
  }

  /** The chosen row that is selected, or null. Held by slide id rather than
   *  by index, so editing the lesson elsewhere cannot shift the selection
   *  onto a different activity. */
  function current() {
    return chosen().find(function (row) { return row.slide.id === selected; }) || null;
  }

  function duplicateCurrent() {
    var row = current();
    if (!row) return;
    SF.Editor.selectSlide(row.slides[row.slides.length - 1].id);
    var copies = row.slides.map(function (slide) {
      var copy = JSON.parse(JSON.stringify(slide));
      copy.id = SF.makeSlide(copy.type).id;
      if (copy.type === 'game') {
        var original = SF.GameStore.get(copy.gameId);
        if (original) {
          var game = JSON.parse(JSON.stringify(original));
          game.id = SF.makeGame(game.title, game.style).id;
          SF.GameStore.save(game); copy.gameId = game.id;
        }
      }
      return copy;
    });
    copies.forEach(function (copy) { copy.activityInstance = copies[0].id; });
    SF.Editor.insertStarters(copies);
    selected = copies[0].id;
    SF.Shell.touch(); draw();
  }

  function removeCurrent() {
    var row = current();
    if (!row) return;
    var d = deck();
    row.slides.forEach(function (slide) { d.slides.splice(d.slides.indexOf(slide), 1); });
    if (!d.slides.length) d.slides.push(SF.makeSlide('title'));
    selected = null;
    SF.Editor.selectSlide(d.slides[Math.min(row.at, d.slides.length - 1)].id);
    if (SF.Editor.commitActivityChange) SF.Editor.commitActivityChange();
    SF.Editor.workspace.draw();
    SF.Shell.touch();
    draw();
  }

  function openActivityPicker() {
    SF.Shell.picker({
      title: 'Choose an activity to add',
      wide: true,
      items: function () {
        return A.ACTIVITIES.filter(function (a) { return a.enabled !== false; });
      },
      empty: 'No activities found.',
      describe: function (a) {
        var phase = A.PHASES.find(function (p) { return p.key === a.phase; });
        var phaseLabel = phase ? phase.label + ' · ' : '';
        return (a.icon ? a.icon + ' ' : '') + phaseLabel + a.minutes + ' min · ' + a.blurb;
      },
      onPick: function (a) {
        insert(a);
      }
    });
  }

  function browseActivities() {
    selected = null;
    phaseFilter = 'all';
    var box = document.getElementById('previewBox');
    if (box) box.scrollTop = 0;
    draw();
  }

  /* Matching Quiz studio's rail foot layout:
     - summary status line (count, minutes, deck slides)
     - primary action: + Activity
     - secondary actions: Duplicate and Remove
     - tertiary action: Browse activities */
  function drawRailFoot() {
    var foot = document.getElementById('railFoot');
    if (!foot) return;
    foot.replaceChildren();
    var rows = chosen();
    var slides = deck().slides.length;
    var mins = rows.reduce(function (t, row) {
      var a = A.activity(row.slide.activity);
      return t + ((a && a.minutes) || 0);
    }, 0);
    var statusParts = [
      rows.length ? rows.length + (rows.length === 1 ? ' activity' : ' activities') : '0 activities',
      mins ? 'about ' + mins + (mins === 1 ? ' minute' : ' minutes') : '',
      slides + (slides === 1 ? ' slide' : ' slides') + ' in the lesson'
    ].filter(Boolean);
    foot.appendChild(el('p', 'hint', statusParts.join(' · ')));

    var row = current();

    var addActions = el('div', 'rail-actions');
    var addBtn = SF.Shell.UI.button('+ Activity', 'primary', openActivityPicker);
    addBtn.title = 'Add an activity from the 54 pedagogical activities catalogue';
    addActions.appendChild(addBtn);
    foot.appendChild(addActions);

    var itemActions = el('div', 'rail-actions');
    var dup = SF.Shell.UI.button('Duplicate', '', duplicateCurrent);
    var cut = SF.Shell.UI.button('Remove', '', removeCurrent);
    dup.disabled = !row;
    cut.disabled = !row;
    if (!row) {
      dup.title = cut.title = 'Pick an activity in the list first.';
    } else {
      dup.title = 'Duplicate selected activity (⌘D)';
      cut.title = 'Remove selected activity (Backspace / Delete)';
    }
    itemActions.appendChild(dup);
    itemActions.appendChild(cut);
    foot.appendChild(itemActions);

    var browseActions = el('div', 'rail-actions');
    var browseBtn = SF.Shell.UI.button('Browse activities', '', browseActivities);
    browseBtn.title = 'Browse the 54 pedagogical activities catalogue';
    browseActions.appendChild(browseBtn);
    foot.appendChild(browseActions);
  }

  /* --------------------------------------------------------------- stage */

  function drawStage() {
    var box = document.getElementById('previewBox');
    if (!box) return;
    box.replaceChildren();
    var wrap = el('div', 'plan-catalogue');

    var tabs = el('div', 'library-tabs');
    var counts = A.phaseCounts();
    tabs.appendChild(SF.Shell.UI.button('All phases', phaseFilter === 'all' ? 'active' : '',
      function () { phaseFilter = 'all'; draw(); }));
    A.PHASES.forEach(function (p) {
      if (!counts[p.key]) return;
      tabs.appendChild(SF.Shell.UI.button(
        p.icon + ' ' + p.label + ' (' + counts[p.key] + ')',
        phaseFilter === p.key ? 'active' : '',
        function () { phaseFilter = p.key; draw(); }
      ));
    });
    wrap.appendChild(tabs);

    var shown = A.ACTIVITIES.filter(function (a) {
      return a.enabled !== false && (phaseFilter === 'all' || a.phase === phaseFilter);
    });
    var phase = A.PHASES.find(function (p) { return p.key === phaseFilter; });
    wrap.appendChild(el('p', 'library-note',
      (phase ? phase.blurb + ' ' : '') +
      shown.length + (shown.length === 1 ? ' activity' : ' activities') +
      '. Each includes editable starter copy and teacher instructions.'));

    var grid = el('div', 'activity-grid');
    shown.forEach(function (a) { grid.appendChild(card(a)); });
    wrap.appendChild(grid);
    box.appendChild(wrap);
  }

  function card(a) {
    var b = el('button', 'activity-card act-' + a.target);
    b.appendChild(el('span', 'activity-icon', a.icon));
    b.appendChild(el('strong', null, a.title));
    b.appendChild(el('span', 'activity-description', a.blurb));
    var tag = a.target === 'moment' ? 'IN THE ROOM · ON A CLOCK'
      : a.target === 'feedback' ? 'BESIDE YOUR SLIDE'
      : a.target === 'game' ? 'A GAME IN THIS LESSON'
      : a.target === 'slide-arc' ? 'A RUN OF SLIDES'
      : 'A SLIDE IN THIS LESSON';
    b.appendChild(el('span', 'activity-tag', a.minutes + ' MIN · ' + tag + '  ↗'));
    b.onclick = function () { insert(a); };
    return b;
  }

  /* ----------------------------------------------------------- inspector */

  function drawInspector() {
    var insp = document.getElementById('inspector');
    if (!insp) return;
    insp.replaceChildren();

    /* Selecting in the rail shows that activity, the way selecting a question
       in Quiz studio shows that question. Its steps are the useful thing —
       for the ten protocols they are the whole activity. */
    var row = current();
    var picked = row && A.activity(row.slide.activity);
    if (picked) {
      insp.appendChild(el('span', 'eyebrow', 'IN THE LESSON'));
      insp.appendChild(el('h3', null, picked.icon + '  ' + picked.title));
      insp.appendChild(el('p', 'hint', picked.blurb));
      var ph = A.PHASES.find(function (p) { return p.key === picked.phase; });
      insp.appendChild(el('p', 'hint',
        (ph ? ph.icon + ' ' + ph.label + ' · ' : '') +
        'about ' + picked.minutes + ' min · slide ' + (row.at + 1)));
      var actions = el('div', 'act-actions');
      actions.style.display = 'flex';
      actions.style.gap = '8px';
      actions.style.margin = '8px 0';
      var editBtn = SF.Shell.UI.button(row.slide.type === 'game' ? 'Edit questions and answers' : 'Edit this slide', '', function () {
        SF.Editor.selectSlide(row.slide.id);
        if (row.slide.type === 'game') {
          SF.Games.openGame(row.slide.gameId); SF.Shell.activate('game');
        } else SF.Shell.activate('deck');
      });
      var showcaseBtn = SF.Shell.UI.button('▷ Showcase activity', 'ghost', function () {
        showcaseRow(row);
      });
      showcaseBtn.title = 'Rehearse or showcase this activity in isolation';
      actions.appendChild(editBtn);
      actions.appendChild(showcaseBtn);
      insp.appendChild(actions);
      if (picked.materials) insp.appendChild(el('p', 'hint', 'Materials: ' + picked.materials.join(' · ')));
      insp.appendChild(el('p', 'hint', 'Starter copy is an editable draft. Replace examples to match your lesson.'));
      if (picked.teacherNotes) insp.appendChild(el('p', 'hint', picked.teacherNotes));
      if (picked.mappingReason) insp.appendChild(el('p', 'hint', picked.mappingReason));

      /* What this activity asks the teacher for, edited against the real
         slide. Without it the slide lands in the right layout and leaves
         them guessing which pit is the hook and which is the question. */
      row.slides.forEach(function (slide) {
        var fields = picked.pages ? picked.pages[slide.activityPage || 0].fields : picked.fields;
        if (!fields || !fields.length) return;
        if (picked.pages) insp.appendChild(el('h4', null, 'Slide ' + ((slide.activityPage || 0) + 1)));
        /* Mark dirty and stop. Repainting the deck editor draws its
           inspector over this one, and repainting this one mid-keystroke
           takes the focus out of the field being typed into. The rail row
           shows the activity's name, not the slide's, so nothing here needs
           redrawing; Lesson studio draws fresh when you switch to it. */
        var changed = function () { SF.Editor.commitActivityChange(); };
        if (slide.type === 'keywords') {
          var views = [{ value: 'rows', label: 'Labelled rows' }, { value: 'steps', label: 'Numbered steps' }, { value: 'brief', label: 'Opening brief' }];
          if (slide.bullets.length === 4) views.push({ value: 'panels', label: 'Four panels' });
          insp.appendChild(SF.Shell.UI.field('Visual structure', SF.Shell.UI.select(views,
            slide.activityPresentation || 'rows', function (value) { slide.activityPresentation = value; changed(); })));
        }
        fields.forEach(function (f) {
          var now = read(slide, f.slide);
          var input = f.type === 'minutes'
            ? SF.Shell.UI.num((Number(now) || 0) / 60, function (v) {
                write(slide, f.slide, Math.max(0, Number(v) || 0) * 60); changed();
              }, 0, 120)
            : f.type === 'area'
              ? SF.Shell.UI.area(String(now == null ? '' : now), function (v) {
                  write(slide, f.slide, v); changed();
                }, 3)
              : SF.Shell.UI.text(String(now == null ? '' : now), function (v) {
                  write(slide, f.slide, v); changed();
                });
          insp.appendChild(SF.Shell.UI.field(f.label, input, f.hint));
        });
      });

      /* Most of these activities are asking the room something — Muddiest
         Point, Four-Corner, Brain Dump, the reflection ladder. Attaching a
         poll or a word cloud is what turns "discuss in pairs" into something
         the teacher can see, on phones or read off the wall, and none of it
         is new: it is slide.feedback, which already reaches the presenter
         rail and the learner's phone. A game slide is left out because it
         collects answers already. */
      if (row.slide.type !== 'game' && SF.Editor.drawFeedback) {
        insp.appendChild(el('span', 'eyebrow', 'SEE WHAT THE ROOM THINKS'));
        SF.Editor.drawFeedback(insp, row.slide, function () {
          /* This one does repaint: choosing a kind reveals its own settings,
             and the rail row picks up its feedback mark. */
          SF.Editor.commitActivityChange();
          draw();
        });
      }

      insp.appendChild(el('span', 'eyebrow', 'HOW IT RUNS'));
      var ol = el('ol', 'act-steps');
      picked.steps.forEach(function (step) { ol.appendChild(el('li', null, step)); });
      insp.appendChild(ol);
      return;
    }

    insp.appendChild(el('span', 'eyebrow', 'THE LESSON CATALOGUE'));
    insp.appendChild(el('h3', null, A.ACTIVITIES.length + ' activities'));
    insp.appendChild(el('p', 'hint',
      'Choosing one writes it into the lesson you are building — the same ' +
      'slide, the same running order and the same undo as Lesson studio.'));
    insp.appendChild(el('span', 'eyebrow', 'WHAT THE COLOURS MEAN'));
    [['act-slide', 'A slide in your deck, in a shape worth teaching from.'],
     ['act-game', 'A game, built by the same engines as Quiz studio.'],
     ['act-feedback', 'A prompt beside the slide, collecting in the rail.'],
     ['act-moment', 'A timed protocol. Happens in the room, not on screen.']
    ].forEach(function (pair) {
      var row = el('p', 'hint act-legend ' + pair[0]);
      row.appendChild(el('span', 'activity-icon', '●'));
      row.appendChild(el('span', null, pair[1]));
      insp.appendChild(row);
    });
  }

  function draw() { drawRail(); drawRailFoot(); drawStage(); drawInspector(); }

  /* ---------------------------------------------------------- showcasing */

  /* The player is a full-viewport overlay, so while a showcase is running
     this button sits underneath it. It used to relabel itself to "✕ Exit
     showcase" and close the player — an exit no pointer could ever take,
     because the slide is drawn on top of it. The only way to reach it was
     to tab to a control nobody can see.

     Leaving a showcase is Esc or the HUD's ✕, which is what the opening
     toast tells the teacher. So the button starts showcases and gets out of
     the way while one is up, rather than advertising a second way out. */
  function syncShowcaseButton() {
    var btn = /** @type {HTMLButtonElement|null} */ (
      document.getElementById('btnDemoActivity')
    );
    if (btn) btn.disabled = !!(SF.Player && SF.Player.open);
  }

  function showcaseDeck(isolatedDeck, title, fallbackGame) {
    if (!SF.Player) return;
    var run = SF.buildRunDeck(isolatedDeck, function (id) {
      if (fallbackGame && (fallbackGame.id === id || id === 'showcase-game')) return fallbackGame;
      return SF.GameStore ? SF.GameStore.get(id) : null;
    });
    if (!run.slides.length) {
      if (SF.toast) SF.toast('No slides found to showcase.');
      return;
    }
    var hasFb = run.slides.some(function (s) { return SF.slideFeedback && SF.slideFeedback(s); });
    SF.Player.start(run, 0, {
      fullscreen: false,
      demo: true,
      demoMode: hasFb ? 'discuss' : 'class'
    });
    if (SF.toast) SF.toast('Showcasing ' + (title || 'activity') + ' — press Esc or ✕ to exit');
  }

  function showcaseRow(row) {
    if (!row) return;
    var a = A.activity(row.slide.activity);
    var title = a ? a.title : (row.slide.title || 'Activity');
    var isolatedDeck = {
      id: 'showcase-' + row.key,
      title: title,
      theme: deck().theme || 'studio',
      slides: row.slides.map(function (s) { return JSON.parse(JSON.stringify(s)); }),
      quiz: { mode: 'individual', teams: [], scoreboard: false }
    };
    showcaseDeck(isolatedDeck, title);
  }

  function showcaseActivityDef(a) {
    if (!a) return;
    var slides;
    var transientGame = null;
    if (a.target === 'game' && a.style) {
      transientGame = SF.createPresetGame ? SF.createPresetGame(a.style, Object.assign({ title: a.title }, a.gamePreset || {}), deck().theme) : null;
      var gameSlide = SF.makeSlide('game');
      gameSlide.gameId = transientGame ? transientGame.id : 'showcase-game';
      gameSlide.title = gameSlide.gameTitle = (transientGame && transientGame.title) || a.title;
      gameSlide.activity = a.key;
      gameSlide.activityInstance = gameSlide.id;
      gameSlide.notes = steps(a);
      slides = [gameSlide];
    } else {
      slides = activitySlides(a);
    }
    var isolatedDeck = {
      id: 'showcase-' + a.key,
      title: a.title,
      theme: deck().theme || 'studio',
      slides: slides,
      quiz: { mode: 'individual', teams: [], scoreboard: false }
    };
    showcaseDeck(isolatedDeck, a.title, transientGame);
  }

  function showcaseActivity() {
    var row = current();
    if (row) {
      showcaseRow(row);
      return;
    }
    var all = chosen();
    if (all.length > 0) {
      selected = all[0].slide.id;
      SF.Editor.selectSlide(selected);
      draw();
      showcaseRow(all[0]);
      return;
    }
    SF.Shell.picker({
      title: 'Choose an activity to showcase',
      wide: true,
      items: function () {
        return A.ACTIVITIES.filter(function (a) { return a.enabled !== false; });
      },
      describe: function (a) {
        var phase = A.PHASES.find(function (p) { return p.key === a.phase; });
        var phaseLabel = phase ? phase.label + ' · ' : '';
        return (a.icon ? a.icon + ' ' : '') + phaseLabel + a.minutes + ' min · ' + a.blurb;
      },
      onPick: function (a) {
        showcaseActivityDef(a);
      }
    });
  }

  /* -------------------------------------------------------- registration */

  /* doc, setDoc and store all point at the deck: this studio edits the
     lesson, it does not own a document of its own. */
  var ws = {
    key: 'plan',
    railLabel: 'Activities',
    settingsLabel: 'Presentation settings — theme, logo, colours',
    notesLabel: 'Speaker notes — visible in presenter view only',
    fileSuffix: '.sfdeck.json',
    store: SF.Store,
    doc: function () { return deck(); },
    setDoc: function (d) { SF.Editor.workspace.setDoc(d); },
    blank: function () { return SF.makeDeck('Untitled presentation'); },
    draw: draw,
    play: function () {
      if (current() || chosen().length) showcaseActivity();
      else SF.Editor.workspace.play();
    },
    settings: function () { SF.Editor.workspace.settings(); },
    onTitle: function (v) { SF.Editor.workspace.onTitle(v); },
    onTheme: function (v) { SF.Editor.workspace.onTheme(v); },
    describe: function (d) { return SF.Editor.workspace.describe(d); },
    keydown: function (e) {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (current()) {
          e.preventDefault();
          removeCurrent();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        if (current()) {
          e.preventDefault();
          duplicateCurrent();
        }
      }
    }
  };

  var toDeck = document.getElementById('btnPlanToDeck');
  if (toDeck) toDeck.onclick = function () { SF.Shell.activate('deck'); };

  var btnDemo = document.getElementById('btnDemoActivity');
  if (btnDemo) btnDemo.onclick = showcaseActivity;

  /* Any open player covers the toolbar, not just a showcase, so both events
     drive the button rather than a flag this file keeps for itself. */
  if (SF.Player && SF.Player.on) {
    SF.Player.on('open', syncShowcaseButton);
    SF.Player.on('close', syncShowcaseButton);
  }

  SF.Activities.makeSlides = activitySlides;
  SF.Activities.showcase = showcaseActivity;
  SF.Activities.showcaseRow = showcaseRow;
  SF.Activities.showcaseDef = showcaseActivityDef;
  SF.Activities.workspace = ws;
  if (SF.Shell && SF.Shell.register) SF.Shell.register(ws);
})(typeof window === 'undefined' ? {} : window);
