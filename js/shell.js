/* SlideForge — the shell.

   Two engines share one window: the presentation editor (js/editor.js) and the
   game editor (js/games.js). Neither knows about the other. The shell owns the
   chrome — title, theme, New/Open/Save/Export/Import, the workspace switch —
   and forwards each action to whichever engine is active.

   An engine registers itself with SF.Shell.register(ws) and implements:
     key            'deck' | 'game'
     railLabel      heading above the rail
     notesLabel     label under the stage
     doc()          the document being edited
     setDoc(d)      adopt a document
     blank()        a fresh empty document
     newDoc()       optional: handle New itself (a game picks its style first)
     store          { list, get, save, remove }
     draw()         repaint rail + preview + inspector + rail footer
     onTitle(v)     title changed
     onTheme(v)     theme changed
     play()         run it
     settings()     open the document-wide settings sheet
     fileSuffix     extension used by Export
*/
(function (global) {
  'use strict';

  /** @type {import("../src/types.js").SlideForgeGlobal} */
  var SF = global.SF;
  var el = SF.el;
  var $ = function (id) { return document.getElementById(id); };

  var workspaces = {};
  var active = null;
  var LAST_WS = 'slideforge.workspace';

  /* ------------------------------------------------------------ shared UI */

  /* Both editors build their inspectors out of these, so the two panels look
     like one product rather than two. */
  var UI = {
    field: function (label, node, hint) {
      var f = el('div', 'field');
      function tipMark(text) {
        var tip = el('span', 'field-tip', '?');
        tip.setAttribute('data-tip', text);
        tip.title = text;
        tip.setAttribute('role', 'img');
        tip.setAttribute('aria-label', text);
        tip.tabIndex = 0;
        return tip;
      }
      if (label) {
        var caption = el('label', null, label);
        if (node && /^(INPUT|TEXTAREA|SELECT)$/.test(node.tagName)) {
          if (!node.id) node.id = 'field-' + SF.uid();
          caption.htmlFor = node.id;
        }
        if (hint) caption.appendChild(tipMark(hint));
        f.appendChild(caption);
      } else if (hint) {
        f.appendChild(tipMark(hint));
      }
      if (node) f.appendChild(node);
      return f;
    },
    text: function (value, oninput, placeholder) {
      var i = el('input');
      i.type = 'text';
      i.value = value || '';
      if (placeholder) i.placeholder = placeholder;
      i.addEventListener('input', function () { oninput(i.value); });
      return i;
    },
    area: function (value, oninput, rows) {
      var t = el('textarea');
      t.value = value || '';
      if (rows) t.rows = rows;
      t.addEventListener('input', function () { oninput(t.value); });
      return t;
    },
    num: function (value, oninput, min, max, placeholder) {
      var i = el('input');
      i.type = 'number';
      if (min != null) i.min = String(min);
      if (max != null) i.max = String(max);
      if (placeholder) i.placeholder = placeholder;
      i.value = value == null ? '' : String(value);
      i.addEventListener('input', function () {
        oninput(i.value === '' ? null : Number(i.value));
      });
      return i;
    },
    /* An option may carry `group`, in which case consecutive options sharing
       a name are wrapped in an optgroup. Grouped rather than sorted: a list
       of seventeen chart types is unreadable flat, and the heading a reader
       needs is the question the chart answers, not its alphabet. */
    select: function (options, value, onchange) {
      var s = el('select');
      var host = s, lastGroup = null;
      options.forEach(function (o) {
        if (o.group !== lastGroup) {
          lastGroup = o.group;
          if (o.group) {
            host = document.createElement('optgroup');
            host.label = o.group;
            s.appendChild(host);
          } else {
            host = s;
          }
        }
        var op = el('option', null, o.label);
        op.value = o.value;
        host.appendChild(op);
      });
      s.value = value;
      s.addEventListener('change', function () { onchange(s.value); });
      return s;
    },
    check: function (label, checked, onchange) {
      var w = el('label', 'switch');
      var c = el('input');
      c.type = 'checkbox';
      c.checked = !!checked;
      c.addEventListener('change', function () { onchange(c.checked); });
      w.appendChild(c);
      w.appendChild(el('span', null, label));
      return w;
    },
    button: function (label, cls, onclick) {
      var b = el('button', 'btn' + (cls ? ' ' + cls : ''), label);
      b.onclick = onclick;
      return b;
    },
    /** Segmented control. Short lists stay one row; long lists wrap. */
    segmented: function (choices, value, onchange) {
      var grid = el('div', 'type-grid');
      if (choices.length <= 4) {
        grid.style.gridTemplateColumns = 'repeat(' + choices.length + ', 1fr)';
      } else {
        grid.classList.add('type-grid-wrap');
      }
      choices.forEach(function (c) {
        var b = el('button', value === c.value ? 'on' : null);
        b.appendChild(el('span', 'g', c.icon));
        b.appendChild(el('span', null, c.label));
        b.onclick = function () { onchange(c.value); };
        grid.appendChild(b);
      });
      return grid;
    }
  };

  /**
   * The theme picker, as cards showing what each theme actually looks like.
   *
   * Shared, because both engines put it in their settings sheet and a theme
   * is a theme. THEMES carries one `swatch` colour each, which is enough for
   * a dropdown and not enough to choose by: the thing that distinguishes
   * Ocean from Ember on a wall is the accent against the background, not the
   * background alone. So each card is a real .slide element at 1280x720
   * scaled down \u2014 the same renderer, the same stylesheet, the same gradient
   * \u2014 rather than swatches kept in step with the CSS by hand.
   *
   * @param {string} current  theme key
   * @param {function} onPick called with the chosen key
   */
  function themePicker(current, onPick) {
    var grid = el('div', 'theme-grid');
    Object.keys(SF.THEMES).forEach(function (key) {
      var card = el('button', 'theme-card' + (key === current ? ' on' : ''));
      card.type = 'button';
      card.title = SF.THEMES[key].name;

      var frame = el('div', 'theme-frame');
      /* THEMES.swatch as a placeholder, which is what it is actually good
         for. SF.fit cannot size the slide until the sheet is on screen, and
         it waits on a ResizeObserver to do it — so without this the grid
         paints once as six black rectangles before the previews appear. */
      frame.style.background = SF.THEMES[key].swatch;
      var slide = el('div', 'slide theme-' + key + ' layout-section');
      var pad = el('div', 'pad');
      pad.appendChild(el('h1', null, 'Aa'));
      pad.appendChild(el('div', 'accent-bar'));
      slide.appendChild(pad);
      frame.appendChild(slide);
      card.appendChild(frame);
      /* The renderer's own scaler, not a CSS transform of my own: it sets
         --sf-scale as well as the transform, and it already knows to wait for
         a ResizeObserver when the box has no size yet \u2014 which is exactly the
         case here, because the sheet is still hidden when this is built. */
      SF.fit(frame, slide);

      card.appendChild(el('span', 'theme-name', SF.THEMES[key].name));
      card.onclick = function () { onPick(key); };
      grid.appendChild(card);
    });
    return grid;
  }

  /* ------------------------------------------------------------ modals */

  function openModal(id, onClose) {
    var m = $(id);
    if (!m) return function () {};
    var modalEl = m;
    modalEl.classList.add('on');
    var close = function () {
      modalEl.classList.remove('on');
      if (onClose) onClose();
    };
    var closeBtn = /** @type {HTMLElement|null} */ (modalEl.querySelector('[data-close]'));
    if (closeBtn) closeBtn.onclick = close;
    modalEl.onclick = function (e) { if (e.target === modalEl) close(); };
    return close;
  }

  /**
   * Generic document picker, used by File → Open saved quiz in Quiz studio
   * and by "Insert game" in the presentation editor.
   * @param {object} o { title, items, empty, onPick, onDelete, onDeleteMany, onClear, clearLabel, describe, wide? }
   */
  function picker(o) {
    var titleEl = $('pickerTitle');
    if (titleEl) titleEl.textContent = o.title;
    var body = $('pickerBody');
    if (!body) return;
    var bodyEl = body;
    var tools = $('pickerTools');
    var picked = Object.create(null);

    function selectedIds() {
      return Object.keys(picked).filter(function (id) { return picked[id]; });
    }

    function fillTools(items) {
      if (!tools) return;
      tools.innerHTML = '';
      if (o.onDeleteMany && items && items.length) {
        var del = el('button', 'btn ghost', 'Delete selected');
        del.type = 'button';
        del.onclick = function () {
          var ids = selectedIds();
          if (!ids.length) { SF.toast('Tick the ones to delete first.'); return; }
          o.onDeleteMany(ids, function () { picked = Object.create(null); draw(); });
        };
        tools.appendChild(del);
      }
      if (o.onClear && items && items.some(function (it) { return it.id !== 'keep'; })) {
        var clr = el('button', 'btn ghost', o.clearLabel || 'Clear all');
        clr.type = 'button';
        clr.onclick = function () { o.onClear(draw); };
        tools.appendChild(clr);
      }
    }

    function draw() {
      bodyEl.innerHTML = '';
      var items = o.items();
      fillTools(items);
      if (!items.length) {
        bodyEl.appendChild(el('div', 'empty-note', o.empty || 'Nothing saved yet.'));
        return;
      }
      items.forEach(function (it) {
        var row = el('div', 'deck-item');
        var info = el('div', 'info');
        info.appendChild(el('div', 'nm', it.title));
        info.appendChild(el('div', 'mt', o.describe(it)));
        if (o.wide) row.classList.add('wide');
        if (o.onDeleteMany && it.id !== 'keep') {
          var tick = document.createElement('input');
          tick.type = 'checkbox';
          tick.className = 'pick-tick';
          tick.checked = !!picked[it.id];
          tick.setAttribute('aria-label', 'Select ' + it.title);
          tick.onclick = function (e) { e.stopPropagation(); };
          tick.onchange = function (e) {
            e.stopPropagation();
            picked[it.id] = tick.checked;
          };
          row.appendChild(tick);
        }
        row.appendChild(info);

        if (o.onDelete) {
          var kill = el('button', 'kill', '🗑');
          kill.title = 'Delete';
          kill.onclick = function (e) {
            e.stopPropagation();
            /* The list redraws when the deletion happens, not when the button
               is pressed: confirming is a dialog now, and the answer arrives
               after this handler has returned. */
            o.onDelete(it, draw);
          };
          row.appendChild(kill);
        }
        row.onclick = function () { close(); o.onPick(it); };
        bodyEl.appendChild(row);
      });
    }

    draw();
    var close = openModal('pickerModal');
  }

  /* ------------------------------------------------------------ switching */

  function register(ws) {
    workspaces[ws.key] = ws;
  }

  function activate(key, opts) {
    var ws = workspaces[key];
    if (!ws || active === ws) return;

    if (active && active.flush) active.flush();   // commit edits in flight
    active = ws;

    document.body.classList.toggle('ws-deck', key === 'deck');
    document.body.classList.toggle('ws-game', key === 'game');
    document.body.classList.toggle('ws-plan', key === 'plan');
    /* The key itself, not a deck/game coin flip: a third studio forced to
       'deck' shows the lesson toolbar over the top of its own. */
    document.documentElement.setAttribute('data-ws', key);
    var wsSwitch = $('wsSwitch');
    if (wsSwitch) {
      Array.prototype.forEach.call(wsSwitch.children, function (b) {
        b.classList.toggle('on', b.dataset.go === key);
      });
    }

    var railLabel = $('railLabel');
    if (railLabel) railLabel.textContent = ws.railLabel;
    var notesLabel = $('notesLabel');
    if (notesLabel) notesLabel.textContent = ws.notesLabel;
    try { localStorage.setItem(LAST_WS, key); } catch (e) {}

    syncChrome();
    ws.draw();
    if (!opts || opts.toast !== false) {
      SF.toast(key === 'deck' ? 'Presentation' : key === 'plan' ? 'Lesson plan' : 'Game');
    }
  }

  /** Push the active document's title/theme into the shared chrome. */
  function syncChrome() {
    var doc = active.doc();
    var docTitle = /** @type {HTMLInputElement|null} */ ($('docTitle'));
    if (docTitle) {
      docTitle.value = doc.title;
      docTitle.placeholder = active.key === 'deck' ? 'Presentation title' : 'Game title';
    }
    var fold = $('docFolder');
    if (fold) {
      var folder = null;
      if (active.key === 'deck' && doc && doc.libraryGroup) {
        folder = libraryFolders().filter(function (g) { return g.id === doc.libraryGroup; })[0];
      }
      fold.textContent = folder ? folder.label : 'Library';
      fold.title = folder
        ? 'In Library · ' + folder.label + ' — click to open'
        : 'Open the Library';
    }
    /* A live lobby is chrome too, and its warning depends on which document
       is open — see deckMismatch in js/live.js. */
    if (SF.Live && SF.Live.syncLobby) SF.Live.syncLobby();
  }

  /**
   * Persist the active document.
   *
   * Background saves (switching workspace, closing the tab) only write when
   * something was actually edited. Writing unconditionally means an untouched
   * in-memory copy can overwrite newer data — the other engine's changes, or a
   * migration that rewrote the same record while this copy sat idle.
   * The Save button passes force, so it always writes.
   */
  function save(quiet, force) {
    if (!active) return;
    if (!force && !active._dirty) {
      if (!quiet) SF.toast('Nothing to save');
      return;
    }
    active.store.save(active.doc(), force ? { force: true } : undefined);
    active._dirty = false;
    if (quiet) return;
    if (active.key !== 'deck') {
      SF.toast('Saved to this browser');
      return;
    }
    var group = active.doc() && active.doc().libraryGroup;
    var folder = libraryFolders().filter(function (g) { return g.id === group; })[0];
    SF.toast(folder ? 'Saved in Library · ' + folder.label : 'Saved in Library');
  }

  function libraryFolders() {
    if (SF.LibraryFolders && SF.LibraryFolders.catalog) return SF.LibraryFolders.catalog();
    return SF.LIBRARY_GROUPS || [];
  }

  /** File → Save to Library. Ask which folder, then write that Store record. */
  function saveToLibrary() {
    if (!active) return;
    var menu = /** @type {HTMLDetailsElement|null} */ (document.querySelector('.file-menu'));
    if (menu) menu.open = false;
    if (active.key !== 'deck') {
      if (SF.History && SF.History.ready() && active.doc) {
        SF.History.snapshot(active.doc(), 'Before Save to browser');
      }
      save(false, true);
      return;
    }
    var doc = active.doc();
    var current = doc && doc.libraryGroup;
    var folders = libraryFolders();
    var options = folders.map(function (g) {
      return {
        value: g.id,
        label: g.label,
        detail: g.id === current ? 'Current folder' : ''
      };
    });
    options.push({
      value: '__new__',
      label: 'New folder…',
      detail: 'Create a shelf, then save this lesson there.'
    });
    SF.askChoice({
      title: 'Save to Library',
      detail: 'Choose a folder for “' + ((doc && doc.title) || 'this lesson') +
        '”. How it looks is still Settings → Theme.',
      options: options
    }, function (group) {
      if (group === '__new__') {
        SF.ask({
          title: 'New folder',
          detail: 'A name for the shelf in the Library.',
          confirm: 'Save here',
          value: '',
          placeholder: 'e.g. Week 3'
        }, function (name) {
          var label = String(name || '').trim();
          if (!label) return;
          if (!SF.LibraryFolders || !SF.LibraryFolders.create) {
            SF.toast('Folders are not available in this build.');
            return;
          }
          var id = SF.LibraryFolders.create(label);
          if (id) commitLibrarySave(id);
        });
        return;
      }
      commitLibrarySave(group);
    });
  }

  function commitLibrarySave(group) {
    if (active && active.flush) active.flush();
    var doc = active && active.doc && active.doc();
    if (doc && group) doc.libraryGroup = group;
    if (SF.History && SF.History.ready() && doc) {
      SF.History.snapshot(doc, 'Before Save to Library');
    }
    save(false, true);
  }

  /* "14 minutes ago" is what someone is looking for in this list; an ISO
     timestamp makes them do arithmetic to find the version from before
     lunch. Falls back to a date once the relative form stops being useful. */
  function when(at) {
    var secs = Math.max(0, Math.round((Date.now() - at) / 1000));
    if (secs < 45) return 'Just now';
    var mins = Math.round(secs / 60);
    if (mins < 60) return mins + (mins === 1 ? ' minute ago' : ' minutes ago');
    var hrs = Math.round(mins / 60);
    if (hrs < 8) return hrs + (hrs === 1 ? ' hour ago' : ' hours ago');
    return new Date(at).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  /** Engines call this from their debounced save path. */
  function touch() {
    if (active) active._dirty = true;
    setStored('saving');
  }

  /* Autosave pulse next to the title. The Library folder chip is where the
     file sits; this only says a write is in flight or landed. Not a button:
     File → Export and File → Library are the doors. Deliberately not driven
     by _dirty — that flag means "changed since the last explicit Save", and
     the autosave writes without clearing it. */
  var storedState = 'stored';
  var storedTimer = null;

  function setStored(state) {
    storedState = state;
    var el2 = $('storeState');
    if (!el2) return;
    clearTimeout(storedTimer);
    if (state === 'saving') {
      el2.textContent = 'Saving…';
      el2.className = 'store-state is-saving';
      storedTimer = setTimeout(function () { setStored('stored'); }, 900);
    } else {
      el2.textContent = 'Saved';
      el2.className = 'store-state';
    }
    el2.title = 'Autosaved in this browser. The Library folder next to the title is where the file sits.';
  }

  function openSaved() {
    if (!active) return;
    if (active.flush) active.flush();
    var ws = active;
    var openId = ws.doc() && ws.doc().id;
    if (ws.store.sweepUnused) ws.store.sweepUnused(openId);
    var scoped = ws.key === 'game' && SF.LessonBank && SF.LessonBank.savedList
      ? SF.LessonBank.savedList(ws.doc())
      : null;
    picker({
      title: scoped ? scoped.title : (ws.key === 'game' ? 'Saved quizzes & games' : 'Saved'),
      items: function () { return scoped ? scoped.items : ws.store.list(); },
      empty: scoped ? scoped.empty : (ws.key === 'game' ? 'No saved quizzes yet.' : 'Nothing saved yet.'),
      describe: ws.describe,
      onPick: function (it) {
        ws.setDoc(ws.store.get(it.id));
        ws._dirty = false;
        syncChrome();
        ws.draw();
      },
      /* Asked here rather than by the picker, because the answer arrives
         later now — the picker redraws when the delete actually happens. */
      onDelete: function (it, done) {
        SF.ask({ title: 'Delete “' + it.title + '”?',
          detail: 'This cannot be undone.',
          confirm: 'Delete', danger: true }, function () {
            ws.store.remove(it.id);
            done();
          });
      },
      onDeleteMany: function (ids, done) {
        var n = ids.length;
        SF.ask({
          title: n === 1 ? 'Delete this saved document?' : 'Delete ' + n + ' saved documents?',
          detail: 'This cannot be undone.',
          confirm: n === 1 ? 'Delete' : 'Delete ' + n,
          danger: true
        }, function () {
          ids.forEach(function (id) { ws.store.remove(id); });
          done();
        });
      }
    });
  }

  /* ------------------------------------------------------------ file I/O */

  /** Filename-safe, stable across saves so re-exporting overwrites in place. */
  function slugify(title, id) {
    var base = String(title || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48);
    if (!base) base = 'untitled';
    /* The id keeps two documents with the same name apart, and means a
       re-export lands on the same file rather than piling up copies. */
    return base + '-' + String(id || '').slice(0, 8).toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  /** Is the app being served by the relay (so it can write files)? */
  function servedByRelay() {
    return location.protocol === 'http:' || location.protocol === 'https:';
  }

  /**
   * Share the open lesson as a read-only or follow-along link.
   * Editor Share button and (via Player.control) any wall-side share entry.
   * Teacher Presenter opens the same dialogs on the desk via SF.shareLessonDoc.
   */
  function shareLesson() {
    if (!servedByRelay()) {
      SF.toast('Sharing needs the SlideForge server.');
      return;
    }
    var deckWs = workspaces.deck;
    if (!deckWs || !deckWs.doc) {
      SF.toast('No lesson to share.');
      return;
    }
    if (active && active.flush) active.flush();
    if (deckWs !== active && deckWs.flush) deckWs.flush();
    var menu = /** @type {HTMLDetailsElement|null} */ (document.querySelector('.file-menu'));
    if (menu) menu.open = false;
    if (typeof SF.shareLessonDoc !== 'function') {
      SF.toast('Share is not available in this build.');
      return;
    }
    SF.shareLessonDoc(deckWs.doc(), { live: !!(SF.Live && SF.Live.active) });
  }

  /** Authored lesson currently in the deck studio — for Presenter share prep. */
  function lessonDoc() {
    var deckWs = workspaces.deck;
    if (!deckWs || !deckWs.doc) return null;
    if (deckWs.flush) deckWs.flush();
    return deckWs.doc();
  }

  function download(name, obj) {
    var blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  /* ---- write every document into the project folder ---- */

  function exportAllToFolder() {
    var decks = SF.Store.list();
    var games = SF.GameStore.list();
    var jobs = decks.map(function (d) { return { kind: 'deck', doc: d }; })
      .concat(games.map(function (g) { return { kind: 'game', doc: g }; }));

    if (!jobs.length) { SF.toast('Nothing saved yet'); return; }

    var done = 0, failed = 0;
    SF.toast('Writing ' + jobs.length + ' file' + (jobs.length === 1 ? '' : 's') + '…');

    /* One at a time rather than in parallel: the relay is a single process and
       the point is a clear report at the end, not speed. */
    var next = function (i) {
      if (i >= jobs.length) {
        SF.toast(failed
          ? done + ' written, ' + failed + ' failed — see the relay output'
          : 'Wrote ' + done + ' file' + (done === 1 ? '' : 's') + ' to data/');
        return;
      }
      var job = jobs[i];
      fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: job.kind,
          slug: slugify(job.doc.title, job.doc.id),
          doc: job.doc
        })
      }).then(function (r) {
        if (r.ok) done++; else failed++;
      }).catch(function () {
        failed++;
      }).then(function () { next(i + 1); });
    };
    next(0);
  }

  /* ---- read them back ---- */

  function restoreFromFolder() {
    fetch('/api/data').then(function (r) { return r.json(); }).then(function (idx) {
      var files = (idx.decks || []).map(function (f) { return { kind: 'deck', f: f }; })
        .concat((idx.games || []).map(function (f) { return { kind: 'game', f: f }; }));

      if (!files.length) {
        SF.toast('No files in data/ yet — use Export → All to the app folder first');
        return;
      }

      var here = SF.Store.list().length + SF.GameStore.list().length;

      /* A restore replaces rather than merges. Merging looks friendlier but is
         wrong for the case this exists to serve: you restore *because* browser
         storage was lost, and the app has already re-seeded its samples by the
         time you get here — so merging leaves you with duplicates of
         everything. The folder is the source of truth; this makes the browser
         match it. Single-file Import is still there for merging one document. */
      var msg = 'Replace everything in this browser with the ' + files.length +
        ' document' + (files.length === 1 ? '' : 's') + ' in data/?\n\n' +
        (here
          ? 'The ' + here + ' currently here will be discarded, including any edits ' +
            'not yet exported.'
          : 'Nothing is currently stored here.');
      SF.ask({ title: 'Replace everything here?', detail: msg,
        confirm: 'Replace', danger: true }, function () {

      SF.Store.clear();
      SF.GameStore.clear();

      var loaded = 0;
      var pending = files.length;
      files.forEach(function (x) {
        var dir = x.kind === 'deck' ? 'decks' : 'games';
        fetch('data/' + dir + '/' + encodeURIComponent(x.f.file))
          .then(function (r) { return r.json(); })
          .then(function (raw) {
            var doc = x.kind === 'deck' ? SF.normalizeDeck(raw) : SF.normalizeGame(raw);
            if (doc) {
              (x.kind === 'deck' ? SF.Store : SF.GameStore).save(doc);
              loaded++;
            }
          })
          .catch(function () {})
          .then(function () {
            if (--pending) return;
            SF.toast('Restored ' + loaded + ' document' + (loaded === 1 ? '' : 's'));
            /* Both engines are now holding documents that were just deleted,
               so re-point them at what actually came back. */
            Object.keys(workspaces).forEach(function (k) {
              var ws = workspaces[k];
              var fresh = ws.store.list()[0] || ws.blank();
              ws.setDoc(fresh);
              ws._dirty = false;
            });
            syncChrome();
            active.draw();
          });
      });

      });   // SF.ask
    }).catch(function () {
      SF.toast('Could not reach the relay — is node server/server.js running?');
    });
  }

  function exportDoc() {
    var doc = active.doc();
    var data = JSON.stringify(doc, null, 2);
    var blob = new Blob([data], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (doc.title || 'untitled').replace(/[^\w\-]+/g, '_').slice(0, 60) +
                 active.fileSuffix;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    SF.toast('Downloaded');
  }

  /** One-way practice notes for Canvas / Colab — decks only. */
  function exportMarkdown() {
    var doc = active.doc();
    var md = SF.deckToMarkdown(doc);
    var blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (doc.title || 'untitled').replace(/[^\w\-]+/g, '_').slice(0, 60) + '.md';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    SF.toast('Practice notes downloaded');
  }

  /** Every document in one file, for a backup you can carry around. */
  function exportBundle() {
    var decks = SF.Store.list();
    var games = SF.GameStore.list();
    if (!decks.length && !games.length) { SF.toast('Nothing saved yet'); return; }
    var stamp = new Date().toISOString().slice(0, 10);
    download('slideforge-backup-' + stamp + '.sfbundle.json', {
      kind: 'slideforge-bundle',
      version: 1,
      exported: new Date().toISOString(),
      decks: decks,
      games: games
    });
    SF.toast('Backed up ' + decks.length + ' presentation' + (decks.length === 1 ? '' : 's') +
             ' and ' + games.length + ' game' + (games.length === 1 ? '' : 's'));
  }

  /** Restore a bundle by id, so re-importing is a restore not a duplicate. */
  function importBundle(raw) {
    var decks = (Array.isArray(raw.decks) ? raw.decks : []).map(SF.normalizeDeck).filter(Boolean);
    var games = (Array.isArray(raw.games) ? raw.games : []).map(SF.normalizeGame).filter(Boolean);
    if (!decks.length && !games.length) { SF.toast('That backup is empty'); return; }

    var existing = {};
    SF.Store.list().forEach(function (d) { existing[d.id] = 1; });
    SF.GameStore.list().forEach(function (g) { existing[g.id] = 1; });
    var replacing = decks.concat(games).filter(function (x) { return existing[x.id]; }).length;

    SF.ask({
      title: 'Restore ' + decks.length + ' presentation(s) and ' + games.length + ' game(s)?',
      detail: replacing
        ? replacing + ' already here will be replaced by the backup version.'
        : 'Nothing here will be overwritten.',
      confirm: 'Restore', danger: replacing > 0
    }, function () {

    games.forEach(function (g) { SF.GameStore.save(g); });
    decks.forEach(function (d) { SF.Store.save(d); });

    Object.keys(workspaces).forEach(function (k) {
      var ws = workspaces[k];
      var fresh = ws.store.get(ws.doc().id) || ws.store.list()[0];
      if (fresh) { ws.setDoc(fresh); ws._dirty = false; }
    });
    syncChrome();
    active.draw();
    SF.toast('Restored ' + (decks.length + games.length) + ' documents');

    });   // SF.ask
  }

  /* Import sniffs the file rather than trusting the extension, and switches
     workspace if you drop a game while editing a presentation. */
  function importDoc(e) {
    var f = e.target.files && e.target.files[0];
    if (!f) return;
    var fr = new FileReader();
    fr.onload = function () {
      var text = /** @type {string} */ (fr.result);
      var name = String(f.name || '').toLowerCase();

      /* Markdown outline → starter deck. Deliberately not a round-trip of
         practice notes: games and live bits are not reconstructed. */
      if (/\.md$/.test(name) || (SF.markdownToDeck && looksLikeMarkdown(text))) {
        if (!SF.markdownToDeck) { SF.toast('Markdown import is not available'); return; }
        if (active.flush) active.flush();
        if (SF.History && SF.History.ready() && active && active.doc) {
          SF.History.snapshot(active.doc(), 'Before importing Markdown');
        }
        var fromMd = SF.markdownToDeck(text);
        if (!fromMd || !(fromMd.slides || []).length) {
          SF.toast('That Markdown did not contain any slides');
          return;
        }
        activate('deck', { toast: false });
        workspaces.deck.setDoc(fromMd);
        workspaces.deck.store.save(fromMd);
        workspaces.deck._dirty = false;
        syncChrome();
        workspaces.deck.draw();
        SF.toast('Imported “' + fromMd.title + '” · ' + fromMd.slides.length +
          ' slide' + (fromMd.slides.length === 1 ? '' : 's') +
          ' — layout types are a starting point, not a lock.');
        return;
      }

      var raw;
      try { raw = JSON.parse(text); } catch (err) {
        SF.toast('That file is not valid JSON or Markdown');
        return;
      }
      if (active.flush) active.flush();

      if (raw && (raw.kind === 'slideforge-bundle' ||
                  (Array.isArray(raw.decks) && Array.isArray(raw.games)))) {
        importBundle(raw);
        return;
      }

      var isGame = raw && (raw.kind === 'game' || Array.isArray(raw.questions));
      var key = isGame ? 'game' : 'deck';
      var ws = workspaces[key];
      var doc = isGame ? SF.normalizeGame(raw) : SF.normalizeDeck(raw);
      if (!doc) { SF.toast('That file is not a SlideForge document'); return; }

      if (SF.History && SF.History.ready() && active && active.doc) {
        SF.History.snapshot(active.doc(), 'Before importing a file');
      }

      doc.id = SF.uid();                 // keep the file and this copy distinct
      activate(key, { toast: false });
      ws.setDoc(doc);
      ws.store.save(doc);
      ws._dirty = false;
      syncChrome();
      ws.draw();
      SF.toast('Imported "' + doc.title + '"' + (isGame ? ' as a game' : ''));
    };
    fr.readAsText(f);
    e.target.value = '';
  }

  /** Cheap sniff when the extension is missing or wrong. */
  function looksLikeMarkdown(text) {
    var t = String(text || '').trim();
    if (!t || t.charAt(0) === '{' || t.charAt(0) === '[') return false;
    return /^#{1,2}\s+\S/m.test(t) || /^[-*+]\s+\S/m.test(t) || /^>\s+\S/m.test(t);
  }

  /* ------------------------------------------------------------ boot */

  function init() {
    /* No theme control in the top bar: the picker in the settings sheet shows
       the colours instead of naming them, and two ways to set one thing is
       one way too many. onTheme is still the only path in. */
    var wsSwitch = $('wsSwitch');
    if (wsSwitch) {
      Array.prototype.forEach.call(wsSwitch.children, function (b) {
        b.onclick = function () { activate(b.dataset.go); };
      });
    }

    var docTitle = /** @type {HTMLInputElement|null} */ ($('docTitle'));
    if (docTitle) {
      docTitle.addEventListener('input', function () {
        if (docTitle) active.onTitle(docTitle.value);
      });
    }

    var btnSave = $('btnSave');
    if (btnSave) {
      btnSave.textContent = 'Save to Library…';
      btnSave.title = 'File this lesson in the Library — you choose the folder';
      btnSave.onclick = saveToLibrary;
    }

    /* Restored: these handlers were dropped when Lecture setup moved to ⚙.
       Export / Import / Help are file chrome — they are not lecture checks. */
    var btnExport = $('btnExport');
    if (btnExport) {
      btnExport.onclick = function () {
        var menu = /** @type {HTMLDetailsElement|null} */ (document.querySelector('.file-menu'));
        if (menu) menu.open = false;
        if (active.flush) active.flush();
        var doc = active.doc();
        var served = servedByRelay();
        var items = [
          { id: 'one', title: 'This ' + (active.key === 'deck' ? 'presentation' : 'game'),
            blurb: 'Downloads "' + doc.title + '" as a single file.' }
        ];
        if (active.key === 'deck') {
          items.push({ id: 'pdf', title: 'Student PDF handout', blurb: 'Printable slides: all reveals shown, stacks separated, no private notes or live results.' });
          items.push({
            id: 'md',
            title: 'Practice notes (.md)',
            blurb: 'Markdown for Canvas or Colab — prompts and content only, not the live room.'
          });
        }
        items.push({
          id: 'bundle', title: 'Everything, as one file',
          blurb: 'Downloads every presentation and game together as a backup.'
        });
        if (served) {
          items.splice(active.key === 'deck' ? 2 : 1, 0, {
            id: 'folder', title: 'Everything, into the app folder',
            blurb: 'Writes each one to data/ next to the app, so the folder is self-contained and can be committed.'
          });
        }
        picker({
          title: 'Export',
          items: function () { return items; },
          describe: function (it) { return it.blurb; },
          onPick: function (it) {
            if (it.id === 'one') return exportDoc();
            /* The handler flushes before opening the picker now, so this no
               longer needs its own flush the way it did when it was the only
               path that wrote from the live document. */
            if (it.id === 'pdf') return SF.Print.open(active.doc());
            if (it.id === 'md') return exportMarkdown();
            if (it.id === 'folder') return exportAllToFolder();
            exportBundle();
          }
        });
      };
    }
    var btnImport = $('btnImport');
    if (btnImport) {
      btnImport.onclick = function () {
        var menu = /** @type {HTMLDetailsElement|null} */ (document.querySelector('.file-menu'));
        if (menu) menu.open = false;
        if (!servedByRelay()) {
          var fi0 = /** @type {HTMLInputElement|null} */ ($('fileInput'));
          if (fi0) fi0.click();
          return;
        }
        picker({
          title: 'Import',
          items: function () {
            return [
              { id: 'file', title: 'From a SlideForge file',
                blurb: 'Pick a .sfdeck.json, .sfgame.json or backup file.' },
              { id: 'md', title: 'From a Markdown outline',
                blurb: 'Headings and lists become starter slides (title, content, cards, quote, image). Not a live lesson round-trip.' },
              { id: 'folder', title: 'From the app folder',
                blurb: 'Restore everything previously written to data/.' }
            ];
          },
          describe: function (it) { return it.blurb; },
          onPick: function (it) {
            if (it.id === 'folder') return restoreFromFolder();
            var fi = /** @type {HTMLInputElement|null} */ ($('fileInput'));
            if (!fi) return;
            if (it.id === 'md') fi.accept = '.md,text/markdown,text/plain';
            else fi.accept = '.json,application/json,.md,text/markdown';
            fi.click();
          }
        });
      };
    }
    var fileInput = $('fileInput');
    if (fileInput) fileInput.addEventListener('change', importDoc);

    var btnHelp = $('btnHelp');
    if (btnHelp) {
      btnHelp.onclick = function () {
        /* Lives in the Settings sheet; step out of it so the shortcut card
           is not read against a second dimmed layer. */
        var settings = $('settingsModal');
        if (settings) settings.classList.remove('on');
        var cheats = $('cheats');
        if (cheats) cheats.classList.add('on');
      };
    }

    /* Lecture setup — the things that go wrong between a working app and a
       working lecture, none of which is a bug and all of which look like one
       from the back of the room.

       Lives in File, not as a second gear beside it: ⚙ in the top bar was
       read as Settings, and Settings itself was a second unlabeled ⚙ on the
       rail, so File and Settings felt like one confused control. Settings is
       now a labeled button (theme, logo, numbers). This is the room-ops list.

       The addresses listed are the ones the app can work out for itself.
       Accounts and dashboards are not here on purpose: they are personal to
       whoever deployed this, they need a login anyway, and baking somebody's
       admin URLs into a page every student can open is a habit worth not
       starting. Nothing secret is ever put on this page. */
    var btnReady = $('btnLectureReady');
    if (btnReady) {
      btnReady.onclick = function () {
        if (active.flush) active.flush();

        function hosted() {
          return (location.protocol === 'http:' || location.protocol === 'https:') &&
            !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
        }

        /* Which ready-made lesson the open deck came from, if any. A deck
           does not record the lesson that built it, so the title is the only
           link back — enough to offer the reload, and it simply is not
           offered when nothing matches rather than guessing. */
        function lessonBehind() {
          var doc = active.doc();
          if (!doc || active.key !== 'deck') return null;
          return (SF.LESSONS || []).filter(function (l) { return l.title === doc.title; })[0] || null;
        }

        function savedCount() {
          try {
            var raw = JSON.parse(localStorage.getItem('slideforge.decks.v1') || '[]');
            return (Array.isArray(raw) ? raw : Object.values(raw)).length;
          } catch (e) { return 0; }
        }

        picker({
          title: 'Lecture setup',
          wide: true,
          items: function () {
            var items = [];
            items.push({ id: 'reports', title: 'Session reports…',
              blurb: 'Who was there, what they answered, how the room moved — after a lecture, not during one.' });
            if (hosted()) {
              items.push({ id: 'wake', title: 'Wake the server',
                blurb: 'A hosted free instance sleeps when idle and takes about a minute to answer the first request. Waking it now means the first phone to scan does not wait.' });
              items.push({ id: 'ai-test', title: 'AI smoke test…',
                blurb: 'Live status for /api/ai/status (model, lastError, latency) and one small generate call — confirm the key before class.' });
            } else {
              items.push({ id: 'ai-test', title: 'AI smoke test…',
                blurb: 'Check whether this local server has GEMINI_API_KEY and can generate. Same panel as Presentation settings → AI.' });
            }
            var lesson = lessonBehind();
            if (lesson) {
              items.push({ id: 'refresh', title: 'Reload “' + lesson.title + '” from this version of the app',
                blurb: 'This browser may be showing a copy it saved earlier. Rebuilds the lesson as the app now ships it — ' +
                  (lesson.slides || []).length + ' slides. Your current copy stays in File → Open.' });
            }
            var n = savedCount();
            if (n) {
              items.push({ id: 'wipe', title: 'Clear everything saved in this browser',
                blurb: 'Deletes all ' + n + ' saved ' + (n === 1 ? 'document' : 'documents') +
                  ' from this browser, including any you wrote yourself. Anything you have exported to a file is untouched. Asks first.' });
            }
            items.push({ id: 'open:' + location.origin + '/join.html',
              title: 'The join page, as a student sees it',
              blurb: location.host + '/join.html — open it on a phone to check the room can reach you.' });
            items.push({ id: 'open:' + location.origin + '/',
              title: 'This app’s address',
              blurb: location.host + ' — the address to type if the code will not scan.' });
            return items;
          },
          describe: function (it) { return it.blurb; },
          onPick: function (it) {
            if (it.id === 'reports') {
              if (SF.Reports && SF.Reports.open) SF.Reports.open();
              else SF.toast('Session reports are not available in this build.');
              return;
            }
            if (it.id.indexOf('open:') === 0) { window.open(it.id.slice(5), '_blank', 'noopener'); return; }

            if (it.id === 'ai-test') {
              if (SF.Editor && SF.Editor.openAiSmokeTest) SF.Editor.openAiSmokeTest();
              else SF.toast('AI smoke test is not available in this build.');
              return;
            }

            if (it.id === 'wake') {
              var began = Date.now();
              SF.toast('Waking the server…');
              /* Any answer means it is up; a 404 would wake it as well as a
                 200. Only a refusal is worth reporting as a failure. */
              fetch(location.origin + '/?wake=' + began, { cache: 'no-store' })
                .then(function () {
                  var secs = Math.round((Date.now() - began) / 100) / 10;
                  SF.toast(secs > 5
                    ? 'Awake — it had gone to sleep and took ' + secs + 's. It is ready now.'
                    : 'Awake and answering in ' + secs + 's. It was already up.');
                })
                .catch(function () { SF.toast('Could not reach the server. Check the connection before class.'); });
              return;
            }

            if (it.id === 'refresh') {
              var lesson = lessonBehind();
              if (!lesson) return;
              SF.Editor.useLesson(lesson.key);
              SF.toast('“' + lesson.title + '” reloaded from this version of the app. Your previous copy is in the Library.');
              return;
            }

            if (it.id === 'wipe') {
              var n = savedCount();
              SF.ask({
                title: 'Clear everything saved in this browser?',
                detail: 'All ' + n + ' saved ' + (n === 1 ? 'document' : 'documents') +
                  ' will be deleted from this browser, including any you wrote yourself. This cannot be undone. ' +
                  'Files you have exported are not affected. If you only want the newest version of a ready-made lesson, ' +
                  'close this and use the reload option instead — it keeps your work.',
                confirm: 'Delete them',
                danger: true
              }, function () {
                /* One last copy of what is open, so "clear everything" is
                   survivable by the document the lecturer was actually in. */
                if (SF.History && SF.History.ready() && active && active.doc) {
                  SF.History.snapshot(active.doc(), 'Before clearing this browser');
                }
                /** @type {string[]} */
                var keys = [];
                for (var i = 0; i < localStorage.length; i++) {
                  var k0 = localStorage.key(i);
                  if (k0) keys.push(k0);
                }
                keys.filter(function (k) {
                  return k && (k.indexOf('slideforge.decks') === 0 || k.indexOf('slideforge.games') === 0 ||
                    k.indexOf('slideforge.lastDeck') === 0 || k.indexOf('slideforge.lastGame') === 0 ||
                    k === 'slideforge.presentation' || k === 'slideforge.workspace' ||
                    k.indexOf('slideforge.selection.') === 0);
                }).forEach(function (k) { localStorage.removeItem(k); });
                location.href = location.origin + '/?_=' + Date.now();
              });
            }
          }
        });
      };
    }

    var storeBtn = $('storeState');
    if (storeBtn) setStored('stored');

    var docFolder = $('docFolder');
    if (docFolder) {
      docFolder.onclick = function () {
        if (SF.Studio && SF.Studio.openLessons) SF.Studio.openLessons();
        else SF.toast('The Library is not available in this workspace.');
      };
    }

    var btnFind = $('btnFind');
    if (btnFind) {
      btnFind.onclick = function () {
        if (SF.Editor && SF.Editor.findInDeck) SF.Editor.findInDeck();
        else SF.toast('Open a presentation to search it.');
      };
    }

    /* Restore points. Hidden rather than disabled where IndexedDB is not
       available — a greyed-out menu item is a question nobody can answer.
       “Keep a restore point now” used to live in File, next to History, which
       made two doors for the same shelf. It is the first row of this list. */
    var btnHistory = $('btnHistory');
    if (btnHistory) {
      if (!(SF.History && SF.History.ready())) btnHistory.hidden = true;
      else btnHistory.onclick = function () {
        if (active.flush) active.flush();
        var menu = /** @type {HTMLDetailsElement|null} */ (document.querySelector('.file-menu'));
        if (menu) menu.open = false;
        var doc = active.doc();
        function keepPoint() {
          return SF.History.snapshot(doc, 'Restore point').then(function (ok) {
            if (ok === true) {
              SF.toast('Restore point kept for “' + (doc.title || 'this document') + '”.');
            } else if (ok === 'same') {
              SF.toast('This version is already the latest restore point.');
            } else if (SF.unusedDraft && SF.unusedDraft(doc)) {
              SF.toast('Add something to the lesson first — empty drafts are not saved.');
            } else {
              SF.toast('Could not keep a restore point in this browser.');
            }
            return ok;
          });
        }
        SF.History.list(doc.id).then(function (rows) {
          picker({
            title: 'Earlier versions of “' + (doc.title || 'this document') + '”',
            wide: true,
            empty: 'No earlier versions yet. Keep a restore point before a rewrite, or wait — edits keep a quiet copy after a pause.',
            items: function () {
              var items = [{
                id: 'keep',
                title: 'Keep a restore point now',
                blurb: 'Snapshot this version. Use it before a big rewrite.'
              }];
              rows.forEach(function (r) {
                items.push({ id: String(r.id), title: r.label + ' · ' + when(r.at),
                  blurb: r.slides + (r.slides === 1 ? ' slide' : ' slides') +
                    (r.title && r.title !== doc.title ? ' · titled “' + r.title + '”' : '') });
              });
              return items;
            },
            clearLabel: 'Clear all',
            onClear: function (done) {
              SF.ask({
                title: 'Clear restore points for this lesson?',
                detail: 'Removes every earlier version of “' + (doc.title || 'this document') +
                  '”. The lesson you have open is not deleted.',
                confirm: 'Clear all',
                danger: true
              }, function () {
                SF.History.removeAll(doc.id).then(function () {
                  rows = [];
                  done();
                  SF.toast('Restore points cleared.');
                });
              });
            },
            describe: function (it) { return it.blurb; },
            onPick: function (it) {
              if (it.id === 'keep') { keepPoint(); return; }
              var row = rows.filter(function (r) { return String(r.id) === it.id; })[0];
              SF.ask({
                title: 'Restore this version?',
                detail: 'Opens “' + (row.title || doc.title) + '” as it was ' + when(row.at).toLowerCase() +
                  ', with ' + row.slides + (row.slides === 1 ? ' slide' : ' slides') +
                  '. The version you have now is kept first, so this is reversible.',
                confirm: 'Restore it'
              }, function () {
                SF.History.snapshot(active.doc(), 'Before restoring').then(function () {
                  return SF.History.get(row.id);
                }).then(function (old2) {
                  if (!old2) { SF.toast('That version could not be read.'); return; }
                  active.setDoc(active.key === 'game' ? SF.normalizeGame(old2) : SF.normalizeDeck(old2));
                  active.store.save(active.doc());
                  syncChrome();
                  if (active.draw) active.draw();
                  SF.toast('Restored. The version you were on is in this list as “Before restoring”.');
                });
              });
            }
          });
        });
      };
    }

    /* A copy someone who was not in the room can open. Only where a server
       is serving this — from a file:// page there is nowhere to put it.
       Teacher Presenter opens the same dialogs on the desk via share.js. */
    var btnShareTop = $('btnShareTop');
    /* Both surfaces, one handler. A previous pass wired only the top-bar
       button and left File → Share a read-only link in index.html with
       nothing behind it — a dead menu item, which is exactly what
       tests/menu-wiring.test.js exists to catch, and did. */
    var btnShare = $('btnShare');
    if (btnShareTop || btnShare) {
      if (!servedByRelay()) {
        if (btnShareTop) btnShareTop.hidden = true;
        if (btnShare) btnShare.hidden = true;
      } else {
        if (btnShareTop) btnShareTop.onclick = shareLesson;
        if (btnShare) btnShare.onclick = shareLesson;
      }
    }

    var btnSettings = $('btnSettings');
    function openSettings() {
      if (active.flush) active.flush();
      if (active.settings) active.settings();
    }
    if (btnSettings) btnSettings.onclick = openSettings;
    var btnRailSettings = $('btnRailSettings');
    if (btnRailSettings) btnRailSettings.onclick = openSettings;

    var btnNew = $('btnNew');
    if (btnNew) {
      btnNew.onclick = function () {
        if (active.flush) active.flush();
        var menu = /** @type {HTMLDetailsElement|null} */ (document.querySelector('.file-menu'));
        if (menu) menu.open = false;
        /* Blank documents only. The Library is File → Library; listing packs
           here again would make New a second catalogue. */
        picker({
          title: 'Start something new',
          items: function () {
            var items = [
              { id: 'deck', title: 'Blank presentation',
                blurb: 'An empty lesson. Add slides and activities as you go.' },
              { id: 'game', title: 'Blank game',
                blurb: 'A quiz or classroom game on its own. Pick the format next.' }
            ];
            return items;
          },
          describe: function (it) { return it.blurb; },
          onPick: function (it) {
            if (SF.History && SF.History.ready() && active && active.doc) {
              SF.History.snapshot(active.doc(), 'Before starting something new');
            }
            if (it.id === 'game') {
              activate('game', { toast: false });
              if (workspaces.game.newDoc) workspaces.game.newDoc();
              else {
                var g = workspaces.game.blank();
                workspaces.game.setDoc(g);
                workspaces.game.store.save(g);
                workspaces.game._dirty = false;
                syncChrome();
                workspaces.game.draw();
                SF.toast('New game');
              }
              return;
            }
            activate('deck', { toast: false });
            var d = workspaces.deck.blank();
            workspaces.deck.setDoc(d);
            workspaces.deck.store.save(d);
            workspaces.deck._dirty = false;
            syncChrome();
            workspaces.deck.draw();
            SF.toast('New presentation');
          }
        });
      };
    }

    /* Library: wired in js/studio.js (the grouped Store grid). A second
       handler here used to fight it and open a flat picker instead. */

    var btnOpen = $('btnOpen');
    if (btnOpen) {
      btnOpen.onclick = openSaved;
    }

    var btnLive = $('btnLive');
    if (btnLive) {
      btnLive.onclick = function () {
        if (active.flush) active.flush();
        if (!active.hostLive) {
          SF.toast('Host live is not available in this workspace');
          return;
        }
        try { active.hostLive(); }
        catch (e) {
          console.error(e);
          SF.toast('Host live failed — check the relay is running (node server/server.js)');
        }
      };
    }

    // engines register themselves when their script runs
    SF.Editor.install();
    SF.Games.install();

    var want = null;
    try { want = localStorage.getItem(LAST_WS); } catch (e) {}
    active = workspaces[want === 'game' || want === 'plan' ? want : 'deck'] || workspaces.deck;
    /* Toggled, not added: the inline script has already guessed from the same
       key, and add() alone would leave both classes on the body if the shell
       landed somewhere else. Keep html[data-ws] in lockstep — CSS prefers it. */
    document.body.classList.toggle('ws-deck', active.key === 'deck');
    document.body.classList.toggle('ws-game', active.key === 'game');
    document.body.classList.toggle('ws-plan', active.key === 'plan');
    document.documentElement.setAttribute('data-ws', active.key);
    var wsSwitchEl = $('wsSwitch');
    if (wsSwitchEl) {
      Array.prototype.forEach.call(wsSwitchEl.children, function (b) {
        b.classList.toggle('on', b.dataset.go === active.key);
      });
    }
    var railLbl = $('railLabel');
    if (railLbl) railLbl.textContent = active.railLabel;
    /* Name what Settings opens. The button says Settings; the title says
       which sheet, because Quiz studio's is teams and card size, not theme. */
    var cog = $('btnSettings'), what = active.settingsLabel || 'Settings';
    if (cog) {
      cog.title = what;
      cog.setAttribute('aria-label', what);
    }
    var railCog = $('btnRailSettings');
    if (railCog) {
      railCog.title = what;
      railCog.setAttribute('aria-label', what);
    }
    var notesLbl = $('notesLabel');
    if (notesLbl) notesLbl.textContent = active.notesLabel;
    syncChrome();
    active.draw();
    /* Reveal only after the active studio has painted — kills the empty
       lesson-shell flash on Quiz studio refresh. */
    document.documentElement.setAttribute('data-ready', '1');

    window.addEventListener('resize', function () { active.draw(); });
    /* Deliberately a flush, not a save: every edit is already persisted by the
       engines' debounce, and an unconditional write at unload can clobber
       newer data with an idle in-memory copy. */
    window.addEventListener('beforeunload', function () {
      Object.keys(workspaces).forEach(function (k) {
        if (workspaces[k].flush) workspaces[k].flush();
      });
    });

    document.addEventListener('keydown', function (e) {
      if (SF.Player.open || document.querySelector('dialog[open]')) return;
      var target = /** @type {HTMLElement|null} */ (e.target);
      var t = target ? target.tagName : '';
      var typing = t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT' ||
        !!(target && (target.isContentEditable ||
          (target.closest && target.closest('[contenteditable="true"]'))));
      var mod = e.metaKey || e.ctrlKey;

      if (mod && e.key === 's') { e.preventDefault(); save(); return; }
      if (mod && e.key === 'Enter') { e.preventDefault(); active.play(); return; }
      if (mod && e.key === 'e') {
        e.preventDefault();
        activate(active.key === 'deck' ? 'game' : 'deck');
        return;
      }
      if (typing) return;
      if (active.keydown) active.keydown(e);
    });
  }

  SF.Shell = {
    init: init,
    register: register,
    activate: activate,
    save: save,
    openSaved: openSaved,
    touch: touch,
    /* Engines call this when a debounced write has actually landed. */
    stored: function () { setStored('stored'); },
    syncChrome: syncChrome,
    picker: picker,
    themePicker: themePicker,
    openModal: openModal,
    shareLesson: shareLesson,
    lessonDoc: lessonDoc,
    current: function () { return active; },
    UI: UI
  };
})(window);
