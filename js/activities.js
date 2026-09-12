/* SlideForge — the activities workspace.

   The third studio. Lesson studio edits a deck, Quiz studio edits a game,
   and this one edits a plan: which activities a lesson runs, in what order,
   and roughly how long that takes.

   It authors no content. Choosing "Think-Pair-Square-Share" records that the
   lesson has one, not what the prompt says — the prompt belongs to the slide
   the activity builds. Keeping the plan thin is what stops it becoming a
   second place for questions to live and drift.

   The catalogue it browses is SF.Activities, built in src/ and checked. */
/** @type {import("../src/types.js").SlideForgeGlobal} */
(function (global) {
  'use strict';
  /** @type {import("../src/types.js").SlideForgeGlobal} */
  var SF = global.SF;
  var el = SF.el;
  var A = SF.Activities;

  /** @type {import("../src/types.js").Plan} */
  var plan = A.makePlan('Untitled lesson plan');
  var phaseFilter = 'all';
  var selected = -1;

  function touched() { plan.modified = Date.now(); SF.Shell.touch(); }

  /* ------------------------------------------------------------ the rail */

  function drawRail() {
    var list = document.getElementById('railList');
    var count = document.getElementById('railCount');
    if (count) count.textContent = String(plan.items.length);
    if (!list) return;
    list.replaceChildren();

    if (!plan.items.length) {
      list.appendChild(el('p', 'hint', 'No activities yet. Pick one from the catalogue to start building the lesson.'));
      return;
    }

    /* Grouped by phase and labelled with a running total, because the
       question a plan answers is "does this fit in the hour", and a flat
       list of names cannot answer it. */
    A.planByPhase(plan, A.PHASES).forEach(function (group) {
      var head = el('div', 'plan-phase');
      head.appendChild(el('span', 'plan-phase-icon', group.phase.icon));
      head.appendChild(el('strong', null, group.phase.label));
      var mins = group.items.reduce(function (n, item) {
        return n + ((A.activity(item.key) || {}).minutes || 0);
      }, 0);
      if (mins) head.appendChild(el('span', 'plan-phase-mins', mins + 'm'));
      list.appendChild(head);

      group.items.forEach(function (item) {
        var a = A.activity(item.key);
        var at = plan.items.indexOf(item);
        var row = el('button', 'plan-item' + (at === selected ? ' sel' : ''));
        row.appendChild(el('span', 'plan-item-icon', a.icon));
        row.appendChild(el('strong', null, a.title));
        if (a.minutes) row.appendChild(el('span', 'plan-item-mins', a.minutes + 'm'));
        row.onclick = function () { selected = at; draw(); };
        list.appendChild(row);
      });
    });
  }

  function drawRailFoot() {
    var foot = document.getElementById('railFoot');
    if (!foot) return;
    foot.replaceChildren();
    var mins = A.planMinutes(plan);
    foot.appendChild(el('p', 'hint',
      plan.items.length
        ? plan.items.length + (plan.items.length === 1 ? ' activity' : ' activities') +
          (mins ? ' · about ' + mins + ' minutes' : '')
        : 'An empty plan.'));
    if (selected > -1) {
      var remove = SF.Shell.UI.button('Remove', '', function () {
        plan.items.splice(selected, 1);
        selected = -1;
        touched();
        draw();
      });
      foot.appendChild(remove);
    }
  }

  /* ------------------------------------------------- the catalogue stage */

  function add(key) {
    plan.items.push({ id: SF.uid(), key: key });
    selected = plan.items.length - 1;
    touched();
    draw();
    SF.toast((A.activity(key) || {}).title + ' added to the plan.');
  }

  function drawStage() {
    var box = document.getElementById('previewBox');
    if (!box) return;
    box.replaceChildren();
    var wrap = el('div', 'plan-catalogue');

    var tabs = el('div', 'library-tabs');
    var counts = A.phaseCounts();
    tabs.appendChild(SF.Shell.UI.button('All phases', phaseFilter === 'all' ? 'active' : '', function () {
      phaseFilter = 'all'; draw();
    }));
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
    wrap.appendChild(el('p', 'library-note',
      shown.length + (shown.length === 1 ? ' activity' : ' activities') +
      (phaseFilter === 'all' ? ' across every phase.' : ' in this phase.') +
      ' Choosing one adds it to the plan; its content is written where it lands.'));

    var grid = el('div', 'activity-grid');
    shown.forEach(function (a) {
      var card = el('button', 'activity-card act-' + a.target);
      card.appendChild(el('span', 'activity-icon', a.icon));
      card.appendChild(el('strong', null, a.title));
      card.appendChild(el('span', 'activity-description', a.blurb));
      var tag = a.target === 'moment' ? 'IN THE ROOM · ON A CLOCK'
        : a.target === 'feedback' ? 'BESIDE YOUR SLIDE'
        : a.target === 'slide' ? 'A SLIDE IN YOUR DECK'
        : a.target === 'slide-arc' ? 'A RUN OF SLIDES'
        : 'A GAME IN QUIZ STUDIO';
      card.appendChild(el('span', 'activity-tag',
        (a.minutes ? a.minutes + ' MIN · ' : '') + tag + '  ↗'));
      card.onclick = function () { add(a.key); };
      grid.appendChild(card);
    });
    wrap.appendChild(grid);
    box.appendChild(wrap);
  }

  /* ------------------------------------------------------- the inspector */

  function drawInspector() {
    var insp = document.getElementById('inspector');
    if (!insp) return;
    insp.replaceChildren();
    var item = plan.items[selected];
    var a = item && A.activity(item.key);
    if (!a) {
      insp.appendChild(el('p', 'hint', 'Pick an activity in the rail to see how it runs.'));
      return;
    }
    insp.appendChild(el('span', 'eyebrow', 'IN THE LESSON'));
    insp.appendChild(el('h3', null, a.icon + '  ' + a.title));
    insp.appendChild(el('p', 'hint', a.blurb));

    var phase = A.PHASES.find(function (p) { return p.key === a.phase; });
    if (phase) insp.appendChild(el('p', 'hint', phase.icon + ' ' + phase.label + ' · ' + phase.blurb));
    if (a.minutes) insp.appendChild(el('p', 'hint', 'About ' + a.minutes + ' minutes.'));

    /* A timed protocol is the whole activity — there is no game to open and
       nothing to author, so the steps are the thing to show. */
    if (a.steps && a.steps.length) {
      insp.appendChild(el('span', 'eyebrow', 'HOW IT RUNS'));
      var ol = el('ol', 'plan-steps');
      a.steps.forEach(function (step) { ol.appendChild(el('li', null, step)); });
      insp.appendChild(ol);
    }
  }

  function draw() { drawRail(); drawRailFoot(); drawStage(); drawInspector(); }

  /* -------------------------------------------------------- registration */

  var ws = {
    key: 'plan',
    railLabel: 'Plan',
    settingsLabel: 'Lesson plan settings',
    notesLabel: 'The plan is a running order. Content is written where each activity lands.',
    fileSuffix: '.sfplan.json',
    store: SF.PlanStore,
    doc: function () { return plan; },
    setDoc: function (d) { plan = d; selected = -1; },
    blank: function () { return A.makePlan('Untitled lesson plan'); },
    draw: draw,
    play: function () {
      /* Compiling a plan into slides and games is the next boundary. Saying
         so is better than a button that looks broken. */
      SF.toast('A plan cannot be run yet — build its activities in Lesson studio.');
    },
    settings: function () {
      SF.toast('A plan has no settings yet.');
    },
    onTitle: function (v) { plan.title = v || 'Untitled lesson plan'; touched(); },
    onTheme: function (v) { plan.theme = v; touched(); },
    describe: A.describePlan,
    keydown: function (e) {
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault(); selected = Math.min(plan.items.length - 1, selected + 1); draw();
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault(); selected = Math.max(0, selected - 1); draw();
      } else if ((e.key === 'Backspace' || e.key === 'Delete') && selected > -1) {
        e.preventDefault();
        plan.items.splice(selected, 1); selected = -1; touched(); draw();
      }
    }
  };

  SF.Activities.workspace = ws;
  if (SF.Shell && SF.Shell.register) SF.Shell.register(ws);
})(typeof window === 'undefined' ? {} : window);
