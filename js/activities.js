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

  function deck() { return SF.Editor.deck(); }

  /* ------------------------------------------------------------ inserting */

  /**
   * Put an activity into the deck.
   *
   * Every branch ends in the deck editor's own insert, so an activity chosen
   * here is indistinguishable from one chosen in Lesson studio — same slide,
   * same undo, same place in the running order.
   */
  function insert(a) {
    if (a.target === 'game' && a.style) {
      SF.Editor.insertNewGame(a.style, { title: a.title });
    } else if (a.target === 'feedback' && a.feedbackKind) {
      SF.Editor.attachFeedback(a.feedbackKind, { prompt: a.blurb });
      /* attachFeedback lands on the slide you were on, and makes a blank one
         when that was a game. A blank one arrives called 'Slide title', so
         name it after the activity that asked for it. */
      var landed = deck().slides[SF.Editor.selected()];
      if (landed && (!landed.title || landed.title === 'Slide title')) {
        landed.title = a.title;
        landed.notes = steps(a);
      }
    } else if (a.target === 'moment') {
      SF.Editor.insertStarter(momentSlide(a));
    } else {
      SF.Editor.insertStarter(activitySlide(a));
    }
    SF.toast(a.title + ' added to the lesson.');
    draw();
  }

  /** How the protocol runs, in the notes of the slide that announces it. A
   *  moment has no screen component, so the notes are the activity. */
  function momentSlide(a) {
    var s = SF.makeSlide('section');
    s.title = a.title;
    s.subtitle = a.minutes + ' minutes';
    s.notes = steps(a);
    return s;
  }

  /** A slide activity lands in its named layout, so there is a shape to write
   *  into rather than a blank page. */
  function activitySlide(a) {
    var s = SF.makeSlide(a.layout || 'content');
    if (SF.prepareLayout) SF.prepareLayout(s, a.layout || 'content');
    s.title = a.title;
    s.notes = steps(a);
    return s;
  }

  function steps(a) {
    return a.blurb + '\n\n' + a.steps.map(function (step, i) {
      return (i + 1) + '. ' + step;
    }).join('\n');
  }

  /* ---------------------------------------------------------------- rail */

  /* The deck, so the lesson can be watched being built. Drawn here rather
     than delegated because Lesson studio's rail carries editing affordances
     this studio has no business offering. */
  function drawRail() {
    var list = document.getElementById('railList');
    var count = document.getElementById('railCount');
    var d = deck();
    if (count) count.textContent = String(d.slides.length);
    if (!list) return;
    list.replaceChildren();
    d.slides.forEach(function (slide, i) {
      var row = el('button', 'plan-item');
      row.appendChild(el('span', 'plan-item-icon',
        (SF.SLIDE_TYPES[slide.type] || {}).icon || '▢'));
      row.appendChild(el('strong', null,
        slide.title || slide.question || slide.gameTitle || 'Untitled slide'));
      row.title = 'Open slide ' + (i + 1) + ' in Lesson studio';
      row.onclick = function () { SF.Shell.activate('deck'); };
      list.appendChild(row);
    });
  }

  function drawRailFoot() {
    var foot = document.getElementById('railFoot');
    if (!foot) return;
    foot.replaceChildren();
    var n = deck().slides.length;
    foot.appendChild(el('p', 'hint',
      n + (n === 1 ? ' slide' : ' slides') + ' in this lesson.'));
    foot.appendChild(SF.Shell.UI.button('Open in Lesson studio', '', function () {
      SF.Shell.activate('deck');
    }));
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
      '. Choosing one adds it to the lesson, where you write its content.'));

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
    /* A slide arc is several slides with an order between them, and nothing
       builds one yet, so it says so rather than dropping a single slide and
       calling it done. */
    if (a.target === 'slide-arc') {
      b.disabled = true;
      b.title = 'A run of slides — not buildable in one step yet.';
    } else {
      b.onclick = function () { insert(a); };
    }
    return b;
  }

  /* ----------------------------------------------------------- inspector */

  function drawInspector() {
    var insp = document.getElementById('inspector');
    if (!insp) return;
    insp.replaceChildren();
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

  /* -------------------------------------------------------- registration */

  /* doc, setDoc and store all point at the deck: this studio edits the
     lesson, it does not own a document of its own. */
  var ws = {
    key: 'plan',
    railLabel: 'Lesson',
    settingsLabel: 'Presentation settings — theme, logo, colours',
    notesLabel: 'Speaker notes — visible in presenter view only',
    fileSuffix: '.sfdeck.json',
    store: SF.Store,
    doc: function () { return deck(); },
    setDoc: function (d) { SF.Editor.workspace.setDoc(d); },
    blank: function () { return SF.makeDeck('Untitled presentation'); },
    draw: draw,
    play: function () { SF.Editor.workspace.play(); },
    settings: function () { SF.Editor.workspace.settings(); },
    onTitle: function (v) { SF.Editor.workspace.onTitle(v); },
    onTheme: function (v) { SF.Editor.workspace.onTheme(v); },
    describe: function (d) { return SF.Editor.workspace.describe(d); }
  };

  SF.Activities.workspace = ws;
  if (SF.Shell && SF.Shell.register) SF.Shell.register(ws);
})(typeof window === 'undefined' ? {} : window);
