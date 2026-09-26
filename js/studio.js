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
    if (!spec || !SF.LabEngine || !SF.LabEngine.openKey(DEMO_KEY)) {
      SF.toast('The demo is missing from this build.');
      return;
    }
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

    /* The open lesson is the lab's, and its card has the lab deck's id. */
    function currentId() { return SF.LabEngine ? SF.LabEngine.currentId() : ''; }

    /* The Library renamed or moved the open lesson: the lab's copy takes it too. */
    function openTakes(patch) { if (SF.LabEngine) SF.LabEngine.retitle(patch); }

    function openDoc(id) {
      var picked = SF.Store.get(id);
      if (!picked || !SF.LabEngine || !SF.LabEngine.openLesson(picked)) return;
      dlg.close();
      SF.toast('Opened “' + (picked.title || 'lesson') + '”. Save writes this same document.');
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
          openTakes({ title: title });
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
        if (currentId() === next.id) openTakes({ libraryGroup: group });
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
          if (currentId() === d.id) openTakes({ libraryGroup: 'other' });
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
        ids.forEach(function (id) { SF.Store.remove(id); if (SF.LabEngine) SF.LabEngine.forget(id); });
        picked = Object.create(null);
        if (doomedOpen && SF.LabEngine) {
          /* The lab has already put a blank lesson up (SF.LabEngine.forget); the
             next lesson the Library lists beats it. */
          var left = SF.Store.list().filter(function (d) {
            return d.libraryGroup !== SF.DEMO_LIBRARY_GROUP && !SF.LabEngine.hasCopy(d.id);
          })[0];
          if (left) SF.LabEngine.openLesson(left);
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

  function init() {
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
  SF.Studio = {init:init,makeLesson:makeLesson,DEMO_KEY:DEMO_KEY,openDemo:openDemo,openLessons:openLessons};
})();
