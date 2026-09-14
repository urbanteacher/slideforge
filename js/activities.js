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
  /* The nineteen activities whose teacher notes hold a worked answer rather
     than run-the-room guidance. Read rather than inferred: a note saying
     "allow two minutes to plan" is not an answer, a game reveals its own, and
     a reflection has none to reveal. Listing them is honest about that — a
     regex over the notes got four of them wrong in both directions. */
  var ANSWER_ACTIVITIES = [
    'think-pair-share', 'daily-review-routine', 'do-now-bell-ringer',
    'i-do-we-do-you-do', 'concept-development', 'flipped-instruction',
    'worked-example-analysis', 'error-analysis', 'quick-practice-stations',
    'concept-card-sort', 'guided-inquiry-investigation', 'problem-based-learning',
    'differentiated-practice-menu', 'design-and-create-task',
    'dialogue-chain-discussion', 'scenario-analysis-discussion',
    'whiteboards-on-walls', 'connect-four-concept-edition', 'preview-next-lesson'
  ];

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
      /* The worked answer comes across from the teacher notes, where it has
         always been written and never been seen by a room. It arrives as a
         draft and nothing else: every one of these is written about perimeter
         and rectangles, so showing it unread would put another subject's
         answer on the wall. The card stays shut in the show until somebody
         has made it theirs. */
      if (i === 0 && a.teacherNotes && ANSWER_ACTIVITIES.indexOf(a.key) >= 0) {
        s.modelAnswer = a.teacherNotes;
        s.modelAnswerDraft = true;
      }
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
    if (selected) {
      var match = chosen().find(function (row) { return row.slide.id === selected; });
      if (match) return match;
    }
    if (SF.Editor && SF.Editor.currentSlideId) {
      var curId = SF.Editor.currentSlideId();
      var fromEditor = chosen().find(function (row) {
        return row.slide.id === curId || row.slides.some(function (s) { return s.id === curId; });
      });
      if (fromEditor) {
        selected = fromEditor.slide.id;
        return fromEditor;
      }
    }
    return null;
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

    /* Quiz studio puts "Write questions" on the rail. Activities already had
       the same AI path in the inspector (generateActivityContent); it was easy
       to miss because the rail looked empty of AI. Same brief, same review
       step — only the door moved into view. */
    var writeBtn = SF.Shell.UI.button('✨ Write content', 'ghost', writeSelectedActivity);
    var canWrite = !!(row && A.activity(row.slide.activity) &&
      (A.activity(row.slide.activity).fields || []).some(function (f) { return f.type !== 'minutes'; }));
    writeBtn.disabled = !canWrite;
    writeBtn.title = !row
      ? 'Pick an activity in the list first.'
      : !canWrite
        ? 'This activity runs in the room — there are no slide boxes to fill.'
        : 'Draft the slide boxes for this activity from a topic. You review every line before you teach.';
    browseActions.appendChild(writeBtn);
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

  /* Things the room has to have in its hands before the activity can run.
     Twenty of the fifty-four need some — cards to cut out, sticky notes, chart
     paper — and a lesson taught in a computer lab has none of them. Saying so
     on the card is the difference between choosing an activity and discovering
     halfway through the week that it cannot be run. */
  var PHYSICAL = /card|sticky|paper|marker|print|scissor|poster|handout|whiteboard|worksheet|pen\b|recording sheet|task sheet/i;
  function physicalKit(a) {
    return (a.materials || []).filter(function (m) { return PHYSICAL.test(m); });
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
    var kit = physicalKit(a);
    if (kit.length) {
      var need = el('span', 'activity-kit', 'NEEDS: ' + kit.join(' · '));
      need.title = 'This activity cannot run on screens alone — ' + kit.join(', ') +
        ' have to be in the room.';
      b.appendChild(need);
      b.classList.add('needs-kit');
    }
    b.onclick = function () { insert(a); };
    return b;
  }

  /* ----------------------------------------------------------- inspector */

  function appendHowTo(parent, picked, row) {
    if (!parent || !picked) return;
    var isGame = picked.target === 'game' || (row && row.slide && row.slide.type === 'game');
    var book = SF.Playbook ? (
      (row && row.slide && row.slide.type === 'game' && SF.GameStore)
        ? SF.Playbook.forGame(SF.GameStore.get(row.slide.gameId) || { style: picked.style, format: picked.key })
        : SF.Playbook.forKey(picked.key)
    ) : null;

    var title = (book && book.title) || picked.title;
    var stepsList = (book && book.howToPlay && book.howToPlay.length) ? book.howToPlay : (picked.steps || []);
    if (!stepsList.length) return;

    var box = el('details', 'howto');
    var open = false;
    try { open = localStorage.getItem('slideforge.howtoOpen') === '1'; } catch (e) {}
    box.open = open;

    var summary = el('summary', 'howto-summary');
    var prefix = isGame ? 'How to play — ' : 'How to run — ';
    summary.appendChild(el('span', null, prefix + title));
    summary.appendChild(el('span', 'howto-toggle', open ? 'Hide' : 'Reveal'));
    box.appendChild(summary);

    var body = el('div', 'howto-body');
    var aim = (book && book.aim) || picked.blurb;
    if (aim) body.appendChild(el('p', 'howto-aim', aim));

    var ol = el('ol', 'howto-steps act-steps');
    stepsList.forEach(function (step) {
      ol.appendChild(el('li', null, step));
    });
    body.appendChild(ol);

    var meta = [];
    if (book) {
      if (book.phases) meta.push(['Phases', book.phases]);
      if (book.timer) meta.push(['Timer', book.timer]);
      if (book.players) meta.push(['Players', book.players]);
      if (book.scoring) meta.push(['Scoring', book.scoring]);
      if (book.judgement) meta.push(['Judgement', book.judgement]);
    } else {
      if (picked.minutes) meta.push(['Duration', picked.minutes + ' min']);
      if (picked.materials && picked.materials.length) meta.push(['Materials', picked.materials.join(' · ')]);
    }
    if (meta.length || (book && book.note) || picked.teacherNotes || picked.mappingReason) {
      var eng = el('div', 'howto-engine');
      meta.forEach(function (pair) {
        eng.appendChild(el('div', null, pair[0] + ' · ' + pair[1]));
      });
      if (book && book.note) eng.appendChild(el('div', 'howto-note', book.note));
      else if (picked.teacherNotes) eng.appendChild(el('div', 'howto-note', picked.teacherNotes));
      if (picked.mappingReason) eng.appendChild(el('div', null, picked.mappingReason));
      body.appendChild(eng);
    }

    box.appendChild(body);

    box.addEventListener('toggle', function () {
      var label = box.querySelector('.howto-toggle');
      if (label) label.textContent = box.open ? 'Hide' : 'Reveal';
      try { localStorage.setItem('slideforge.howtoOpen', box.open ? '1' : '0'); } catch (e) {}
    });

    parent.appendChild(box);
  }

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

      /* The catalogue already names every box this activity needs, so the
         brief can be exact where a general "write me a starter" cannot. */
      if (SF.AI && SF.AI.generateActivityContent && (picked.fields || []).length) {
        insp.appendChild(writeActivityBox(picked, row));
      }

      appendHowTo(insp, picked, row);

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

  /* Fill this activity's boxes from a topic. Everything lands through the same
     write() the teacher's own typing goes through, so an AI draft is a draft
     like any other — editable, undoable, and saved the same way. */
  /* Fill the selected activity's boxes from a topic — same path as the
     inspector "Write this activity" box, reachable from the rail so Activities
     matches Quiz studio's "Write questions" affordance. */
  function writeSelectedActivity() {
    if (!SF.AI || !SF.AI.generateActivityContent) { SF.toast('AI engine not loaded.'); return; }
    var row = current();
    var picked = row && A.activity(row.slide.activity);
    if (!picked) { SF.toast('Pick an activity in the list first.'); return; }
    var fields = (picked.fields || []).filter(function (f) { return f.type !== 'minutes'; });
    if (!fields.length) {
      SF.toast((picked.title || 'This activity') + ' has nothing to write — it runs in the room, not on the slide.');
      return;
    }
    SF.askText({
      title: 'Write “' + picked.title + '”',
      detail: 'Fills the activity boxes below for a topic. You can edit or undo anything it writes. ' +
        'Needs the AI server key — without it, starter copy in the catalogue is still editable.',
      placeholder: 'Osmosis in plant cells',
      confirm: '✨ Write it'
    }, function (topic) {
      var t = String(topic || '').trim();
      if (!t) { SF.toast('Give it a topic to write about.'); return; }
      SF.toast('Writing…');
      Promise.resolve(SF.AI.generateActivityContent(picked, { topic: t })).then(function (res) {
        if (!res || res.error) {
          SF.toast(res && res.error ? res.error : 'Nothing came back.');
          return;
        }
        Object.keys(res.values).forEach(function (path) { write(row.slide, path, res.values[path]); });
        SF.Editor.commitActivityChange();
        draw();
        SF.toast('Written — read it before you teach it.');
      }).catch(function () {
        SF.toast('Could not write this just now.');
      });
    });
  }

  function writeActivityBox(picked, row) {
    var box = el('div', 'ai-write');
    var topic = SF.Shell.UI.text('', function () {}, 'Osmosis in plant cells');
    box.appendChild(SF.Shell.UI.field('✨ Write this activity', topic,
      'A topic. It fills the boxes below; you can edit or undo anything it writes.'));
    var guard = el('p', 'hint', '');
    guard.setAttribute('role', 'status');
    var go = SF.Shell.UI.button('✨ Write it', 'ghost', function () {
      var t = String(topic.value || '').trim();
      if (!t) { guard.textContent = 'Give it a topic to write about.'; return; }
      go.disabled = true;
      guard.textContent = 'Writing…';
      Promise.resolve(SF.AI.generateActivityContent(picked, { topic: t })).then(function (res) {
        go.disabled = false;
        if (!res || res.error) { guard.textContent = res && res.error ? res.error : 'Nothing came back.'; return; }
        var slide = row.slide;
        Object.keys(res.values).forEach(function (path) { write(slide, path, res.values[path]); });
        SF.Editor.commitActivityChange();
        guard.textContent = '';
        draw();
        SF.toast('Written — read it before you teach it.');
      }).catch(function () {
        go.disabled = false;
        guard.textContent = 'Could not write this just now.';
      });
    });
    box.appendChild(go);
    box.appendChild(guard);
    return box;
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
  SF.Activities.draw = draw;
  SF.Activities.select = function (slideId) { selected = slideId; draw(); };
  SF.Activities.workspace = ws;
  if (SF.Shell && SF.Shell.register) SF.Shell.register(ws);
})(typeof window === 'undefined' ? {} : window);
