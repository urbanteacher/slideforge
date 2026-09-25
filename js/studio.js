/* Local lesson-design tools. Reuses the existing game and feedback engines. */
(function () {
  'use strict';
  /** @type {import("../src/types.js").SlideForgeGlobal} */
  var SF = window.SF;
  var el = SF.el;
  var returnFocus;
  /* The lessons themselves live in js/lessons.js, as data. This only turns
     the chosen one into a deck. */
  function makeLesson(key) {
    return (SF.buildLesson && SF.buildLesson(key)) || SF.makeDeck('Untitled lesson');
  }

  /* The official demo. One deck, named once: every layout in the picker, all
     twenty chart idioms, the design variants, the activities, the games, and
     the two ways to share — each slide saying in its notes when to reach for
     it. There used to be a second demo behind File → Open demo lesson, built
     on the server, which meant the deck most often shown to somebody else was
     the one deck that could not be opened from a file:// copy. */
  var DEMO_KEY = 'layout-bank';

  /**
   * Open the demo as a fresh copy.
   *
   * The demo is not filed in the Library — it is a showcase, and ninety-odd
   * slides of sample content on the same shelf as the real lessons is one
   * misplaced click from being edited by mistake. It lives in a folder the
   * Library does not list, as exactly one document; useLesson() replaces that
   * document rather than adding to it.
   */
  function openDemo() {
    var spec = (SF.LESSONS || []).filter(function (l) { return l.key === DEMO_KEY; })[0];
    if (!spec || !SF.Editor || !SF.Editor.useLesson) {
      SF.toast('The demo is missing from this build.');
      return;
    }
    SF.Editor.useLesson(DEMO_KEY);
    SF.toast('Demo opened — ' + (spec.slides || []).length +
      ' slides. It is not filed in the Library; press Demo again for a fresh copy.');
  }

  /** Pick a document from the Library (Store, grouped by brand). */
  function openLessons() {
    returnFocus = document.activeElement;
    var modal = /** @type {HTMLDialogElement|null} */ (document.getElementById('lessonModal'));
    var body = document.getElementById('lessonBody');
    if (!modal || !body) return;
    var dlg = modal;
    var pane = body;
    if (SF.seedLibrary) SF.seedLibrary();
    var picked = Object.create(null);
    var searchQuery = '';
    var searchCaret = 0;
    var keepSearchFocus = false;

    function selectedIds() {
      return Object.keys(picked).filter(function (id) { return picked[id]; });
    }

    function folders() {
      if (SF.LibraryFolders && SF.LibraryFolders.catalog) return SF.LibraryFolders.catalog();
      return SF.LIBRARY_GROUPS || [
        { id: 'nul', label: 'Northeastern' },
        { id: 'ukbt', label: 'UK Black Tech' },
        { id: 'ukbt-institute', label: 'UKBT Institute' },
        { id: 'other', label: 'Other' }
      ];
    }

    function when(at) {
      var secs = Math.max(0, Math.round((Date.now() - Number(at || 0)) / 1000));
      if (secs < 45) return 'Just now';
      var mins = Math.round(secs / 60);
      if (mins < 60) return mins + (mins === 1 ? ' min ago' : ' min ago');
      var hrs = Math.round(mins / 60);
      if (hrs < 8) return hrs + (hrs === 1 ? ' hour ago' : ' hours ago');
      return new Date(at).toLocaleDateString([], { day: 'numeric', month: 'short' });
    }

    function currentId() {
      return (SF.Editor && SF.Editor.deck && SF.Editor.deck()) ? SF.Editor.deck().id : '';
    }

    function openDoc(id) {
      if (!SF.Editor || !SF.Editor.openDeck) return;
      var ws = SF.Editor.workspace;
      if (ws && ws.flush) ws.flush();
      SF.Editor.openDeck(id);
      dlg.close();
      var d = SF.Store.get(id);
      SF.toast('Opened “' + ((d && d.title) || 'lesson') + '”. Save writes this same document.');
    }

    function renameDoc(deck) {
      SF.ask({
        title: 'Rename this lesson',
        detail: 'The name is what you see in the Library.',
        confirm: 'Rename',
        value: deck.title || ''
      }, function (value) {
        var title = String(value || '').trim();
        if (!title) return;
        var next = SF.Store.get(deck.id);
        if (!next) return;
        next.title = title;
        SF.Store.save(next, { force: true });
        if (currentId() === next.id) {
          var open = SF.Editor.deck();
          if (open) open.title = title;
          if (SF.Shell && SF.Shell.syncChrome) SF.Shell.syncChrome();
        }
        draw();
      });
    }

    function moveDoc(deck) {
      SF.askChoice({
        title: 'Move “' + deck.title + '”',
        detail: 'Folders are for finding the file. How it looks is still Settings → Theme.',
        options: folders().map(function (g) {
          return { value: g.id, label: g.label, detail: g.id === deck.libraryGroup ? 'Current folder' : '' };
        })
      }, function (group) {
        fileInGroup([deck.id], group);
      });
    }

    function fileInGroup(ids, group) {
      if (!group) return;
      ids.forEach(function (id) {
        var next = SF.Store.get(id);
        if (!next) return;
        next.libraryGroup = group;
        SF.Store.save(next, { force: true });
        if (currentId() === next.id) {
          var openMove = SF.Editor.deck();
          if (openMove) openMove.libraryGroup = group;
        }
      });
      draw();
    }

    function createFolder() {
      var selected = selectedIds();
      SF.ask({
        title: 'New folder',
        detail: selected.length
          ? 'Name the folder. The ' + selected.length + ' selected lesson' +
            (selected.length === 1 ? '' : 's') + ' will move into it.'
          : 'A folder is just a shelf in this browser. Looks still come from Settings → Theme.',
        confirm: 'Create folder',
        value: '',
        placeholder: 'e.g. Week 3'
      }, function (value) {
        var name = String(value || '').trim();
        if (!name) return;
        if (!SF.LibraryFolders || !SF.LibraryFolders.create) {
          SF.toast('Folders are not available in this build.');
          return;
        }
        var id = SF.LibraryFolders.create(name);
        if (!id) return;
        if (selected.length) fileInGroup(selected, id);
        else draw();
        SF.toast('Folder “' + name + '” created.');
      });
    }

    function renameFolder(folder) {
      SF.ask({
        title: 'Rename folder',
        detail: folder.builtin
          ? 'Only the name in the Library changes. New lessons in this brand still land here.'
          : 'The lessons inside stay put.',
        confirm: 'Rename',
        value: folder.label || ''
      }, function (value) {
        var name = String(value || '').trim();
        if (!name || !SF.LibraryFolders) return;
        SF.LibraryFolders.rename(folder.id, name);
        draw();
      });
    }

    function removeFolder(folder) {
      if (folder.builtin) {
        SF.toast('Brand folders stay — rename them, or move the lessons out.');
        return;
      }
      var n = ((SF.Store.list() || []).filter(function (d) {
        return d.libraryGroup === folder.id;
      })).length;
      SF.ask({
        title: 'Remove folder “' + folder.label + '”?',
        detail: n
          ? n + ' lesson' + (n === 1 ? '' : 's') + ' will move to Other. They are not deleted.'
          : 'The empty folder will be removed.',
        confirm: 'Remove folder'
      }, function () {
        (SF.Store.list() || []).forEach(function (d) {
          if (d.libraryGroup !== folder.id) return;
          d.libraryGroup = 'other';
          SF.Store.save(d, { force: true });
          if (currentId() === d.id) {
            var open = SF.Editor.deck();
            if (open) open.libraryGroup = 'other';
          }
        });
        if (SF.LibraryFolders) SF.LibraryFolders.remove(folder.id);
        draw();
      });
    }

    function deleteDocs(ids) {
      if (!ids.length) { SF.toast('Tick the ones to delete first.'); return; }
      var n = ids.length;
      SF.ask({
        title: n === 1 ? 'Delete this lesson?' : 'Delete ' + n + ' lessons?',
        detail: 'This cannot be undone. Export first if you need a copy.',
        confirm: n === 1 ? 'Delete' : 'Delete ' + n,
        danger: true
      }, function () {
        var open = currentId();
        var doomedOpen = ids.indexOf(open) >= 0;
        /* Remember factory sourceKeys before remove, or seedLibrary puts the
           pack back the next time the Library opens. */
        ids.forEach(function (id) {
          var row = SF.Store.get(id);
          if (row && row.sourceKey && SF.dismissLibrarySeed) SF.dismissLibrarySeed(row.sourceKey);
        });
        /* Cancel autosave first: a pending timer would write the deleted deck
           back a moment later. Then remove. Then switch away without flush —
           openDeck's normal path saves the document you leave. */
        if (doomedOpen && SF.Editor && SF.Editor.cancelPendingSave) {
          SF.Editor.cancelPendingSave();
        }
        ids.forEach(function (id) { SF.Store.remove(id); if (SF.LabEngine) SF.LabEngine.forget(id); });
        picked = Object.create(null);
        if (doomedOpen) {
          var leftover = SF.Store.list()[0];
          if (leftover && SF.Editor && SF.Editor.openDeck) {
            SF.Editor.openDeck(leftover.id, { abandon: true });
          } else if (SF.Editor && SF.Editor.workspace && SF.Editor.workspace.blank) {
            var blank = SF.Editor.workspace.blank();
            SF.Editor.workspace.setDoc(blank);
            if (SF.Shell && SF.Shell.syncChrome) SF.Shell.syncChrome();
            if (SF.Editor.workspace.draw) SF.Editor.workspace.draw();
          }
        }
        draw();
      });
    }

    function draw() {
      pane.replaceChildren();
      /* The demo document is deliberately off the shelf — and off the count,
         which would otherwise report a lesson the list does not show. */
      var all = ((SF.Store && SF.Store.list) ? SF.Store.list() : [])
        .filter(function (d) { return d.libraryGroup !== SF.DEMO_LIBRARY_GROUP; })
        /* A lesson now edited in the lab shows once, as the lab's card; the
           original is kept, unlisted, for the games the lab does not run. */
        .filter(function (d) { return !(SF.LabEngine && SF.LabEngine.hasCopy(d.id)); });
      var openId = currentId();
      var q = searchQuery.trim().toLowerCase();
      var collapsed = (SF.LibraryFolders && SF.LibraryFolders.collapsed)
        ? SF.LibraryFolders.collapsed() : {};

      pane.appendChild(el('p', 'library-note',
        all.length + (all.length === 1 ? ' lesson in this browser. ' : ' lessons in this browser. ') +
        'Folders are shelves — create as many as you need. Search when a folder gets long.'));

      var bar = el('div', 'library-toolbar');
      var find = document.createElement('input');
      find.type = 'search';
      find.className = 'library-find';
      find.placeholder = 'Find a lesson';
      find.setAttribute('aria-label', 'Find a lesson');
      find.value = searchQuery;
      find.oninput = function () {
        searchQuery = find.value;
        searchCaret = find.selectionStart || find.value.length;
        keepSearchFocus = true;
        draw();
      };
      bar.appendChild(find);
      var newFold = el('button', 'btn ghost', 'New folder');
      newFold.type = 'button';
      newFold.onclick = createFolder;
      bar.appendChild(newFold);
      var delSel = el('button', 'btn ghost', 'Delete selected');
      delSel.type = 'button';
      delSel.onclick = function () { deleteDocs(selectedIds()); };
      bar.appendChild(delSel);
      pane.appendChild(bar);

      var byGroup = {};
      folders().forEach(function (g) { byGroup[g.id] = []; });
      all.forEach(function (deck) {
        var g = deck.libraryGroup || 'other';
        if (!byGroup[g]) byGroup[g] = [];
        byGroup[g].push(deck);
      });

      var shown = 0;
      folders().forEach(function (g) {
        var rows = (byGroup[g.id] || []).filter(function (deck) {
          if (!q) return true;
          return String(deck.title || '').toLowerCase().indexOf(q) >= 0;
        });
        var emptyCustom = !g.builtin && !(byGroup[g.id] || []).length && !q;
        if (!rows.length && !emptyCustom) return;
        shown++;
        var box = document.createElement('details');
        box.className = 'library-group';
        var hasOpen = rows.some(function (d) { return d.id === openId; });
        var startOpen = !!q || hasOpen || emptyCustom || rows.length <= 8
          ? collapsed[g.id] !== true
          : collapsed[g.id] !== true && collapsed[g.id] !== undefined
            ? !collapsed[g.id]
            : false;
        /* Many lessons (a full NUL term) stay closed until you open the folder
           or search. The open document's folder stays expanded. */
        if (!q && !hasOpen && rows.length > 8 && collapsed[g.id] !== false) startOpen = false;
        if (hasOpen || q) startOpen = true;
        box.open = startOpen;
        box.addEventListener('toggle', function () {
          if (SF.LibraryFolders && SF.LibraryFolders.setCollapsed) {
            SF.LibraryFolders.setCollapsed(g.id, !box.open);
          }
        });

        var sum = document.createElement('summary');
        sum.className = 'library-folder-head';
        var tickAll = document.createElement('input');
        tickAll.type = 'checkbox';
        tickAll.className = 'lib-check';
        tickAll.setAttribute('aria-label', 'Select all in ' + g.label);
        var inFolder = (byGroup[g.id] || []).map(function (d) { return d.id; });
        tickAll.checked = inFolder.length > 0 && inFolder.every(function (id) { return picked[id]; });
        tickAll.onclick = function (e) { e.stopPropagation(); };
        tickAll.onchange = function (e) {
          e.stopPropagation();
          inFolder.forEach(function (id) {
            if (tickAll.checked) picked[id] = true;
            else delete picked[id];
          });
          draw();
        };
        sum.appendChild(tickAll);
        sum.appendChild(el('h3', null, g.label));
        sum.appendChild(el('span', 'library-folder-count',
          SF.LessonBank && SF.LessonBank.folderChip
            ? SF.LessonBank.folderChip(rows)
            : String(rows.length || (byGroup[g.id] || []).length)));
        var foldTools = el('span', 'library-folder-tools');
        var rnFold = el('button', 'btn ghost', 'Rename');
        rnFold.type = 'button';
        rnFold.onclick = function (e) { e.preventDefault(); e.stopPropagation(); renameFolder(g); };
        foldTools.appendChild(rnFold);
        if (!g.builtin) {
          var rmFold = el('button', 'btn ghost', 'Remove');
          rmFold.type = 'button';
          rmFold.onclick = function (e) { e.preventDefault(); e.stopPropagation(); removeFolder(g); };
          foldTools.appendChild(rmFold);
        }
        sum.appendChild(foldTools);
        box.appendChild(sum);

        if (!rows.length) {
          box.appendChild(el('p', 'library-empty', 'Empty folder — Move a lesson here, or it stays as a shelf.'));
        }
        rows.forEach(function (deck) {
          var row = el('article', 'library-row' + (deck.id === openId ? ' is-open' : ''));
          row.setAttribute('role', 'group');
          row.setAttribute('aria-label', deck.title || 'Untitled');
          var tick = document.createElement('input');
          tick.type = 'checkbox';
          tick.className = 'lib-check';
          tick.checked = !!picked[deck.id];
          tick.setAttribute('aria-label', 'Select ' + (deck.title || 'lesson'));
          tick.onclick = function (e) { e.stopPropagation(); };
          tick.onchange = function () {
            if (tick.checked) picked[deck.id] = true;
            else delete picked[deck.id];
          };
          row.appendChild(tick);
          var info = el('div', 'library-row-info');
          info.appendChild(el('strong', null, deck.title || 'Untitled'));
          info.appendChild(el('span', null,
            (SF.LessonBank && SF.LessonBank.deckFacts
              ? SF.LessonBank.deckFacts(deck)
              : ((deck.slides || []).length + ((deck.slides || []).length === 1 ? ' slide' : ' slides'))) +
            ' · ' + when(deck.modified) +
            (deck.id === openId ? ' · Open' : '')));
          row.appendChild(info);
          var tools = el('div', 'library-row-tools');
          var openBtn = el('button', 'btn ghost', 'Open');
          openBtn.type = 'button';
          openBtn.onclick = function (e) { e.stopPropagation(); openDoc(deck.id); };
          var rn = el('button', 'btn ghost', 'Rename');
          rn.type = 'button';
          rn.onclick = function (e) { e.stopPropagation(); renameDoc(deck); };
          var mv = el('button', 'btn ghost', 'Move');
          mv.type = 'button';
          mv.onclick = function (e) { e.stopPropagation(); moveDoc(deck); };
          var rm = el('button', 'btn ghost', 'Delete');
          rm.type = 'button';
          rm.onclick = function (e) { e.stopPropagation(); deleteDocs([deck.id]); };
          tools.appendChild(openBtn);
          tools.appendChild(rn);
          tools.appendChild(mv);
          tools.appendChild(rm);
          row.appendChild(tools);
          row.onclick = function (e) {
            if (e.target === tick || (e.target && e.target.closest && e.target.closest('.library-row-tools'))) return;
            openDoc(deck.id);
          };
          row.tabIndex = 0;
          row.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
              if (e.target !== row) return;
              e.preventDefault();
              openDoc(deck.id);
            }
          });
          box.appendChild(row);
        });
        pane.appendChild(box);
      });

      if (!all.length) {
        pane.appendChild(el('p', 'library-note', 'Nothing in the Library yet. Save a lesson or start from New.'));
      } else if (!shown) {
        pane.appendChild(el('p', 'library-note', 'Nothing matches “' + searchQuery + '”.'));
      }

      if (keepSearchFocus) {
        keepSearchFocus = false;
        find.focus();
        try { find.setSelectionRange(searchCaret, searchCaret); } catch (e) {}
      }
    }

    draw();
    dlg.showModal();
  }

  /** The tabs the library can open on. Anything else means "everything". */
  var LIBRARY_FILTERS = [
    ['all', 'All activities'],
    ['check', 'Knowledge checks'],
    ['quiz', 'Quick quizzes'],
    ['game', 'Games'],
    ['memory', 'Memory'],
    ['word', 'Word'],
    ['talk', 'Discuss'],
    ['feedback', 'Gather feedback']
  ];
  var LIBRARY_TABS = LIBRARY_FILTERS.map(function (t) { return t[0]; });
  var libraryQuery = '';

  /* Extra facets on top of kind (check vs feedback). A format can sit in
     more than one — Beat the Clock is a game and a quick quiz. */
  var ACTIVITY_GROUPS = {
    'choice': ['quiz'],
    'truefalse': ['quiz'],
    'type': ['quiz'],
    'slider': ['quiz'],
    'poll': [],
    'wordcloud': ['word'],
    'brainstorm': ['talk'],
    'scale': [],
    'true-false': ['game', 'quiz'],
    'low-stakes-quiz': ['quiz'],
    'quiz-bowl': ['game'],
    'beat-the-clock': ['game', 'quiz'],
    'boss-battle': ['game'],
    'horse-race': ['game'],
    'memory-flip': ['memory'],
    'memory-match': ['memory'],
    'memory-maze': ['memory'],
    'bingo': ['game'],
    'knowledge-flip': ['memory'],
    'definition-challenge': ['memory', 'word'],
    'emoji-guess': ['word'],
    'word-reveal': ['word'],
    'fill-in-the-blanks': ['quiz', 'word'],
    'heads-up': ['talk', 'word'],
    'spin-explain': ['talk'],
    'spot-the-error': ['quiz'],
    'ranking': ['quiz'],
    'odd-one-out': ['talk'],
    'compare-contrast': ['talk'],
    'predict-outcome': ['quiz'],
    'time-traveler': ['quiz'],
    'connection-maker': ['talk'],
    'question-cube': ['talk'],
    'random-challenge': ['talk'],
    'concept-chain': ['talk']
  };

  /**
   * @param {string} [filter] one of LIBRARY_TABS
   *
   * The filter is checked rather than trusted because this is wired straight
   * to a button's onclick, which hands the handler a PointerEvent. An event
   * is truthy, so `filter || 'all'` kept it, matched no category, and opened
   * the library on an empty grid reading "0 formats here".
   */
  function openLibrary(filter) {
    returnFocus = document.activeElement;
    libraryQuery = '';
    var modal = /** @type {HTMLDialogElement|null} */ (document.getElementById('activityModal'));
    if (modal) modal.showModal();
    /* Quiz studio opens on the checks, because feedback prompts attach to a
       slide and there is no slide here to attach them to. */
    drawLibrary(LIBRARY_TABS.indexOf(String(filter)) > -1 ? String(filter) : 'all');
  }

  /* One-click presentation shapes — fill the pits after they land. */
  /* Built from the layout table, so + Slide and the layout picker can never
     again offer different sets. A starter is a title, a blurb and the fields to
     lay over a fresh slide of that type. */
  var starters = (function () {
    var list = [];
    Object.keys(SF.SLIDE_TYPES).forEach(function (type) {
      (SF.SLIDE_TYPES[type].starters || []).forEach(function (st) {
        list.push({
          icon: SF.SLIDE_TYPES[type].icon,
          title: st.title,
          blurb: st.blurb,
          build: function () {
            var s = SF.makeSlide(type);
            if (SF.prepareLayout) SF.prepareLayout(s, type);
            Object.keys(st.seed || {}).forEach(function (f) {
              s[f] = Array.isArray(st.seed[f]) ? st.seed[f].slice() : st.seed[f];
            });
            return s;
          }
        });
      });
    });
    return list;
  })();


  function openStarters() {
    returnFocus = document.activeElement;
    var modal = /** @type {HTMLDialogElement|null} */ (document.getElementById('starterModal'));
    var body = document.getElementById('starterBody');
    if (!modal || !body) return;
    body.replaceChildren();
    body.appendChild(el('p', 'library-note', 'Pick a shape to insert after the selected slide. You can change Layout any time in the right panel.'));
    var grid = el('div', 'activity-grid starters-grid');
    var fits = [];
    /* Games and activities are slides too, so the one "+ Slide" in the rail
       offers them first rather than the rail carrying a second button for the
       same catalogue. It opens the library everything else opens. */
    var act = el('button', 'activity-card check starter-card starter-activity');
    act.type = 'button';
    act.id = 'starterActivity';
    act.appendChild(el('div', 'starter-activity-mark', '◇'));
    act.appendChild(el('strong', 'starter-title', 'A game or activity'));
    act.appendChild(el('span', 'activity-description',
      'Quizzes, polls, word games, discussion — the room answers from their phones.'));
    act.appendChild(el('span', 'activity-tag', 'OPEN CATALOGUE  ↗'));
    act.onclick = function () {
      if (modal) modal.close();
      openLibrary('all');
    };
    grid.appendChild(act);
    starters.forEach(function (st) {
      var b = el('button', 'activity-card check starter-card');
      b.type = 'button';
      /* The shape itself, rendered, rather than a letter standing for it. "K"
         and "•" say nothing about what you are about to insert, and the layout
         picker in the inspector has always shown real miniatures — this is the
         same thing at the point of creation rather than after it. */
      var frame = el('div', 'variant-frame starter-frame');
      var node = SF.renderSlide(SF.Editor.deck(), st.build(), { index: 0, total: 1, chrome: false });
      frame.appendChild(node);
      b.appendChild(frame);
      fits.push([frame, node]);
      /* Named, because the preview inside the card contains <strong> of its
         own — a keyword term, a mind-map branch — and an unqualified
         querySelector('strong') now finds the slide rather than the title. */
      b.appendChild(el('strong', 'starter-title', st.title));
      b.appendChild(el('span', 'activity-description', st.blurb));
      b.appendChild(el('span', 'activity-tag', 'INSERT SLIDE  ↗'));
      b.onclick = function () {
        if (modal) modal.close();
        SF.Editor.insertStarter(st.build());
        SF.toast(st.title + ' added. Layout is in the right panel.');
      };
      grid.appendChild(b);
    });
    body.appendChild(grid);
    modal.showModal();
    /* Measured after the dialog is up: a frame inside a closed <dialog> has
       no width, and SF.fit would scale every preview down to nothing. */
    requestAnimationFrame(function () {
      fits.forEach(function (pair) { SF.fit(pair[0], pair[1]); });
    });
  }

  /* Starter banks live in the model, alongside their format definitions. */
  var presets = SF.GAME_FORMAT_PRESETS || {};

  /* Discussion formats inserted as a prompt beside a slide. Question Cube
     was one until it became a game (23 Sep 2026); none are left, but the
     insert path still reads this map. */
  /** @type {Record<string, any>} */
  var feedbackPresets = {};


  /* [id, icon, title, blurb, kind, enabled] — Memory Maze stays out of scope. */
  var activities = [
    ['choice','?','Multiple choice','Check an idea. Discuss the why.','check',true],
    ['truefalse','½','True / False','Uncover a common misconception.','check',true],
    ['type','Aa','Type answer','Recall it without the clues — no options to pick from.','check',true],
    ['slider','↔','Slider','Estimate a value on a line — near enough counts.','check',true],
    ['poll','▤','Poll','Take the pulse of the room.','feedback',true],
    ['wordcloud','✳','Word cloud','Turn individual thoughts into patterns.','feedback',true],
    ['brainstorm','✎','Brainstorm','Make space for everyone’s ideas.','feedback',true],
    ['scale','≋','Scale','Explore confidence and agreement.','feedback',true],
    ['true-false','⚡','True/False Showdown','Fast retrieval under time pressure.','check',true],
    ['low-stakes-quiz','◎','Low-Stakes Quiz','Timed paper retrieval. Reveal answers when the clock ends — no scoreboard.','check',true],
    ['quiz-bowl','▦','Quiz Bowl','A category and value board. Pick an unused cell, answer aloud, the teacher awards it.','check',true],
    ['beat-the-clock','◷','Beat the Clock','Speeded multiple-choice fluency.','check',true],
    ['boss-battle','▲','Boss Battle','Shared goal: bring the boss HP down.','check',true],
    ['horse-race','♘','Horse Race','Team race across quick competitive rounds.','check',true],
    ['memory-flip','🂠','Memory Flip','Study the board, then build one class collection. Teacher checks each recall.','check',true],
    ['memory-match','⧉','Memory Match','Study, choose a hidden card, explain and claim. Teams rotate; misses can be retried.','check',true],
    ['memory-maze','⎇','Memory Maze','Hold a sequence, then navigate it.','check',false],
    ['bingo','▣','Bingo','Call a definition; the team holding that term explains it to claim the square. A line wins — no points.','check',true],
    ['knowledge-flip','↺','Knowledge Flip','Choose a visible keyword, explain it and collect the card. No study timer.','check',true],
    ['definition-challenge','¶','Definition Challenge','Read a passage, then answer from memory once it clears.','check',true],
    ['emoji-guess','☺','Emoji Guess','Decode a concept from symbols. Release the letter pattern, then a hint, as they get stuck.','check',true],
    ['word-reveal','…','Word Reveal','Guess from letters as they drip in.','check',true],
    ['fill-in-the-blanks','_','Fill in the Blanks','Type the missing word in a sentence, then discuss why it fits.','check',true],
    ['heads-up','↑','Heads Up','Describe a term; peers retrieve it.','check',true],
    ['spin-explain','◉','Spin & Explain','Spin a concept; explain it aloud.','check',true],
    ['spot-the-error','✗','Spot the Error','Find the mistake; explain the fix.','check',true],
    ['ranking','↕','Ranking Challenge','Order items by criteria — part marks on the scoreboard.','check',true],
    ['odd-one-out','◇','Odd One Out','Four equal items. Discuss the rule, then reveal the prepared odd one. No score.','check',true],
    ['compare-contrast','⇄','Compare & Contrast','Two equal items. Discuss alike and differ, then reveal prepared points. No score.','check',true],
    ['predict-outcome','→','Predict the Outcome','Choose what happens next, and why.','check',true],
    ['time-traveler','☽','Time Traveler','Recall events from year or clue.','check',true],
    ['connection-maker','⚭','Connection Maker','Link two ideas; explain the bridge.','check',true],
    ['question-cube','⚀','Question Cube','Roll a face — Define, Compare, Why, Example, What if, Benefits — and answer it aloud.','check',true],
    ['random-challenge','✦','Random Challenge','Draw varied open challenges. Count only — no scoreboard.','check',true],
    ['concept-chain','⛓','Concept Chain','Grow a justified chain. Type the link, Accept — it appears on the wall.','check',true]
  ];
  function activityMatches(a, filter, ignoreQuery) {
    if (filter === 'check' || filter === 'feedback') {
      if (a[4] !== filter) return false;
    } else if (filter && filter !== 'all') {
      var groups = ACTIVITY_GROUPS[a[0]] || [];
      if (groups.indexOf(filter) < 0) return false;
    }
    if (!ignoreQuery && libraryQuery) {
      var q = libraryQuery.toLowerCase();
      var hay = (a[0] + ' ' + a[2] + ' ' + a[3]).toLowerCase();
      if (hay.indexOf(q) < 0) return false;
    }
    return true;
  }

  function drawLibrary(filter) {
    var body = document.getElementById('activityBody');
    if (!body) return;
    var focused = /** @type {HTMLInputElement|null} */ (document.activeElement);
    var keepFind = !!focused && focused.id === 'activityFind';
    var caret = keepFind && focused ? (focused.selectionStart || 0) : 0;
    body.replaceChildren();
    var tabs = el('div','library-tabs');
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', 'Activity filters');
    LIBRARY_FILTERS.forEach(function (t) {
      var n = activities.filter(function (a) { return activityMatches(a, t[0], true); }).length;
      var b = SF.Shell.UI.button(t[1] + ' (' + n + ')', filter === t[0] ? 'active' : '', function () {drawLibrary(t[0]);});
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', filter === t[0] ? 'true' : 'false');
      tabs.appendChild(b);
    });
    body.appendChild(tabs);
    var find = el('input', 'library-find');
    find.id = 'activityFind';
    find.type = 'search';
    find.placeholder = 'Find a format…';
    find.setAttribute('aria-label', 'Find a format');
    find.value = libraryQuery;
    find.oninput = function () {
      libraryQuery = String(find.value || '');
      drawLibrary(filter);
    };
    body.appendChild(find);
    /* Say the numbers. "I cannot see the 27" is unanswerable from a grid you
       have to count yourself, and a tab filter quietly hides three of them —
       so the note states how many are here, how many are ready, and where
       the rest went. */
    var shown = activities.filter(function (a) { return activityMatches(a, filter); });
    var ready = shown.filter(function (a) { return a[5]; }).length;
    var tabCount = activities.filter(function (a) { return activityMatches(a, filter, true); }).length;
    var hidden = activities.length - tabCount;
    var note = shown.length + ' formats here \u00b7 ' + ready + ' ready to use, ' +
      (shown.length - ready) + ' planned.';
    if (hidden) note += ' ' + hidden + ' more on the other tabs.';
    if (libraryQuery && !shown.length) note = 'No formats match \u201c' + libraryQuery + '\u201d. Clear the search or pick another filter.';
    else note += ' Choose a format, add your lesson content, then try its demo. Memory Maze is not yet available.';
    body.appendChild(el('p','library-note', note));
    var grid = el('div','activity-grid');
    shown.forEach(function (a) {
      var b = el('button','activity-card ' + a[4]); b.disabled = !a[5];
      b.appendChild(el('span','activity-icon',a[1]));
      b.appendChild(el('strong',null,a[2])); b.appendChild(el('span','activity-description',a[3]));
      var book = SF.Playbook && SF.Playbook.forKey(a[0]);
      var setup = SF.Playbook && SF.Playbook.setupForKey(a[0]);
      if (setup) b.appendChild(el('span', 'activity-howto', setup.participation));
      else if (book && book.howToPlay && book.howToPlay[0]) b.appendChild(el('span', 'activity-howto', book.howToPlay[0]));
      if (a[5] && a[4] === 'check') {
        var style = SF.gameStyle((SF.formatStyle && SF.formatStyle(a[0])) || a[0]);
        var badges = SF.roomBadges(style && style.plays);
        if (badges) b.appendChild(badges);
      }
      b.appendChild(el('span','activity-tag',a[5] ? (a[4] === 'check' ? 'BETWEEN SLIDES  ↗' : 'BESIDE YOUR SLIDE  ↗') : 'PLANNED FORMAT'));
      /* Planned cards stay disabled — never call insert with an unimplemented style id. */
      if (a[5]) b.onclick = function () {
        var actModal = /** @type {HTMLDialogElement|null} */ (document.getElementById('activityModal'));
        if (actModal) actModal.close();
        if (a[4] === 'check') {
          var raw = presets[String(a[0])];
          var pre = raw ? {
            style: raw.style,
            title: raw.title,
            settings: raw.settings ? Object.assign({}, raw.settings) : undefined,
            seed: raw.seed ? Object.assign({}, raw.seed) : undefined,
            /* A format whose one question cannot show it seeds a whole set. */
            seeds: raw.seeds ? raw.seeds.map(function (q) { return Object.assign({}, q); }) : undefined
          } : {
            style: (SF.formatStyle && SF.formatStyle(a[0])) || a[0],
            title: a[2]
          };
          /* Catalogue id is always the format — even when the card is a bare
             engine — so Game settings lock to the right activity instead of
             offering Beat the Clock beside True/False. */
          pre.format = a[0];
          /* `.key`, not the workspace itself. Shell.current() hands back the
             workspace object, so `=== 'game'` was never true and this branch
             never ran: picking a format in Quiz studio built the game, filed
             it in the deck, left you editing the one you already had, and
             said "customize it in the right panel" about something the right
             panel was not showing. */
          var ws = SF.Shell && SF.Shell.current && SF.Shell.current();
          if (ws && ws.key === 'game') {
            var curG = SF.Games && SF.Games.game && SF.Games.game();
            var g = SF.createPresetGame(pre.style || a[0], pre, curG ? curG.theme : 'midnight');
            if (SF.Games && SF.Games.openGame) SF.Games.openGame(g.id);
            SF.toast('Switched to ' + a[2] + '. Customize it in the right panel.');
          } else {
            SF.Editor.insertNewGame(pre.style || a[0], pre);
            SF.toast(a[2] + ' added. Customize it in the right panel.');
          }
        } else {
          var fp = feedbackPresets[String(a[0])];
          SF.Editor.attachFeedback(fp ? fp.kind : a[0], fp);
          /* The feedback branch's own toast. It used to share an
             unconditional one below, which also fired after the two above and
             overwrote whichever had just run. */
          SF.toast(a[2] + ' added. Customize it in the right panel.');
        }
      };
      grid.appendChild(b);
    });
    body.appendChild(grid);
    if (keepFind) {
      find.focus();
      try { find.setSelectionRange(caret, caret); } catch (e) {}
    }
  }
  function init() {
    var modal = el('dialog','activity-modal'); modal.id = 'activityModal';
    modal.setAttribute('aria-labelledby','activityTitle');
    modal.innerHTML = '<header><div><span class="eyebrow">LESS WATCHING. MORE THINKING.</span><h2 id="activityTitle">Bring the room into the lesson.</h2></div><button class="btn ghost" aria-label="Close activity library">✕</button></header><div id="activityBody"></div><footer><span class="local-dot"></span> Design & preview locally · Planned formats are not yet available</footer>';
    document.body.appendChild(modal);
    modal.querySelector('header button').onclick = function () {modal.close();};
    modal.addEventListener('click', function (e) {if (e.target === modal) {var r = modal.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) modal.close();}});
    modal.addEventListener('close',function () {if (returnFocus) returnFocus.focus();});

    var startersModal = el('dialog', 'activity-modal'); startersModal.id = 'starterModal';
    startersModal.setAttribute('aria-labelledby', 'starterTitle');
    startersModal.innerHTML = '<header><div><span class="eyebrow">START FROM A SHAPE.</span><h2 id="starterTitle">Slide starters</h2></div><button class="btn ghost" aria-label="Close slide starters">✕</button></header><div id="starterBody"></div><footer><span class="local-dot"></span> Boilerplates only — customise after they land</footer>';
    document.body.appendChild(startersModal);
    startersModal.querySelector('header button').onclick = function () { startersModal.close(); };
    startersModal.addEventListener('click', function (e) {
      if (e.target === startersModal) {
        var r = startersModal.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) startersModal.close();
      }
    });
    startersModal.addEventListener('close', function () { if (returnFocus) returnFocus.focus(); });

    var lessonModal = el('dialog', 'activity-modal'); lessonModal.id = 'lessonModal';
    lessonModal.innerHTML = '<header><div><span class="eyebrow">YOUR LIBRARY</span><h2 id="lessonTitle">Library</h2></div><button class="btn ghost" aria-label="Close library">✕</button></header><div id="lessonBody"></div><footer><span class="local-dot"></span> Saved in this browser — Export or Share for a copy that leaves this machine</footer>';
    document.body.appendChild(lessonModal);
    lessonModal.querySelector('header button').onclick = function () { lessonModal.close(); };
    lessonModal.addEventListener('click', function (e) {
      if (e.target === lessonModal) {
        var r = lessonModal.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) lessonModal.close();
      }
    });
    lessonModal.addEventListener('close', function () { if (returnFocus) returnFocus.focus(); });

    var btnActivities = document.getElementById('btnActivities');
    /* Wrapped, not passed: onclick hands its handler the event, and this one
       takes a tab name. */
    if (btnActivities) btnActivities.onclick = function () { openLibrary('all'); };
    /* The same library from Quiz studio. One list, so a format cannot exist
       in one studio and not the other. */
    var gameLib = document.getElementById('btnActivitiesGame');
    if (gameLib) gameLib.onclick = function () { openLibrary('check'); };
    /* The demo, and the only thing that opens it. This button used to be a
       second copy of File → Library with a different label on it, which is
       two names for one list and no way at all to reach the demo. */
    var btnTemplate = document.getElementById('btnTemplate');
    if (btnTemplate) btnTemplate.onclick = openDemo;
    /* File → Library. Store documents, grouped by brand — not a clone shop. */
    var btnReadyMade = document.getElementById('btnReadyMade');
    if (btnReadyMade) btnReadyMade.onclick = openLessons;
    /* And on the canvas, one click from a blank deck. A first visit now opens
       empty rather than inside somebody's finished lecture, so the templates
       have to be reachable without knowing they live under File. */
    var btnLibraryOpen = document.getElementById('btnLibraryOpen');
    if (btnLibraryOpen) btnLibraryOpen.onclick = openLessons;
    document.querySelectorAll('.file-actions button').forEach(function (b) {
      b.addEventListener('click',function () {
        var menu = /** @type {HTMLDetailsElement|null} */ (document.querySelector('.file-menu'));
        if (menu) menu.open = false;
      });
    });
  }
  SF.Studio = {init:init,makeLesson:makeLesson,DEMO_KEY:DEMO_KEY,openDemo:openDemo,openLibrary:openLibrary,openStarters:openStarters,openLessons:openLessons};
})();
