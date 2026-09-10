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
     fileSuffix     extension used by Export
*/
(function (global) {
  'use strict';

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
      if (label) f.appendChild(el('label', null, label));
      if (node) f.appendChild(node);
      if (hint) f.appendChild(el('div', 'hint', hint));
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
    select: function (options, value, onchange) {
      var s = el('select');
      options.forEach(function (o) {
        var op = el('option', null, o.label);
        op.value = o.value;
        s.appendChild(op);
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
    /** Two-choice segmented control, used for mode pickers. */
    segmented: function (choices, value, onchange) {
      var grid = el('div', 'type-grid');
      grid.style.gridTemplateColumns = 'repeat(' + choices.length + ', 1fr)';
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

  /* ------------------------------------------------------------ modals */

  function openModal(id, onClose) {
    var m = $(id);
    m.classList.add('on');
    var close = function () {
      m.classList.remove('on');
      if (onClose) onClose();
    };
    m.querySelector('[data-close]').onclick = close;
    m.onclick = function (e) { if (e.target === m) close(); };
    return close;
  }

  /**
   * Generic document picker, used by Open in both engines and by
   * "Insert game" in the presentation editor.
   * @param {object} o { title, items, empty, onPick, onDelete, describe }
   */
  function picker(o) {
    $('pickerTitle').textContent = o.title;
    var body = $('pickerBody');

    function draw() {
      body.innerHTML = '';
      var items = o.items();
      if (!items.length) {
        body.appendChild(el('div', 'empty-note', o.empty || 'Nothing saved yet.'));
        return;
      }
      items.forEach(function (it) {
        var row = el('div', 'deck-item');
        var info = el('div', 'info');
        info.appendChild(el('div', 'nm', it.title));
        info.appendChild(el('div', 'mt', o.describe(it)));
        if (o.wide) row.classList.add('wide');
        row.appendChild(info);

        if (o.onDelete) {
          var kill = el('button', 'kill', '🗑');
          kill.title = 'Delete';
          kill.onclick = function (e) {
            e.stopPropagation();
            if (o.onDelete(it) !== false) draw();
          };
          row.appendChild(kill);
        }
        row.onclick = function () { close(); o.onPick(it); };
        body.appendChild(row);
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
    Array.prototype.forEach.call($('wsSwitch').children, function (b) {
      b.classList.toggle('on', b.dataset.go === key);
    });

    $('railLabel').textContent = ws.railLabel;
    $('notesLabel').textContent = ws.notesLabel;
    try { localStorage.setItem(LAST_WS, key); } catch (e) {}

    syncChrome();
    ws.draw();
    if (!opts || opts.toast !== false) {
      SF.toast(key === 'deck' ? 'Presentation' : 'Game');
    }
  }

  /** Push the active document's title/theme into the shared chrome. */
  function syncChrome() {
    var doc = active.doc();
    $('docTitle').value = doc.title;
    $('docTitle').placeholder = active.key === 'deck' ? 'Presentation title' : 'Game title';
    $('themeSel').value = doc.theme;
    if (active.key === 'deck') $('numToggle').checked = doc.showSlideNumbers !== false;
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
    active.store.save(active.doc());
    active._dirty = false;
    if (!quiet) SF.toast('Saved to this browser');
  }

  /** Engines call this from their debounced save path. */
  function touch() {
    if (active) active._dirty = true;
  }

  /* ------------------------------------------------------------ file I/O */

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

  /* Import sniffs the file rather than trusting the extension, and switches
     workspace if you drop a game while editing a presentation. */
  function importDoc(e) {
    var f = e.target.files && e.target.files[0];
    if (!f) return;
    var fr = new FileReader();
    fr.onload = function () {
      var raw;
      try { raw = JSON.parse(fr.result); } catch (err) {
        SF.toast('That file is not valid JSON');
        return;
      }
      if (active.flush) active.flush();
      var isGame = raw && (raw.kind === 'game' || Array.isArray(raw.questions));
      var key = isGame ? 'game' : 'deck';
      var ws = workspaces[key];
      var doc = isGame ? SF.normalizeGame(raw) : SF.normalizeDeck(raw);
      if (!doc) { SF.toast('That file is not a SlideForge document'); return; }

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

  /* ------------------------------------------------------------ boot */

  function init() {
    Object.keys(SF.THEMES).forEach(function (k) {
      var o = el('option', null, SF.THEMES[k].name);
      o.value = k;
      $('themeSel').appendChild(o);
    });

    Array.prototype.forEach.call($('wsSwitch').children, function (b) {
      b.onclick = function () { activate(b.dataset.go); };
    });

    $('docTitle').addEventListener('input', function () {
      active.onTitle($('docTitle').value);
    });
    $('themeSel').addEventListener('change', function () {
      active.onTheme($('themeSel').value);
    });
    $('numToggle').addEventListener('change', function () {
      var d = workspaces.deck.doc();
      d.showSlideNumbers = $('numToggle').checked;
      workspaces.deck.store.save(d);
      workspaces.deck.draw();
    });

    $('btnSave').onclick = function () { save(false, true); };
    $('btnExport').onclick = exportDoc;
    $('btnImport').onclick = function () { $('fileInput').click(); };
    $('fileInput').addEventListener('change', importDoc);
    $('btnHelp').onclick = function () { $('cheats').classList.add('on'); };

    $('btnNew').onclick = function () {
      if (active.flush) active.flush();
      /* An engine can intercept New when creating a document needs a decision
         first — a game has to know its style before it has any content. */
      if (active.newDoc) { active.newDoc(); return; }
      var d = active.blank();
      active.setDoc(d);
      active.store.save(d);
      active._dirty = false;
      syncChrome();
      active.draw();
      SF.toast('New ' + (active.key === 'deck' ? 'presentation' : 'game'));
    };

    $('btnOpen').onclick = function () {
      if (active.flush) active.flush();
      var ws = active;
      picker({
        title: ws.key === 'deck' ? 'Open a presentation' : 'Open a game',
        items: function () { return ws.store.list(); },
        empty: 'Nothing saved yet — press New to start one.',
        describe: ws.describe,
        onPick: function (it) {
          ws.setDoc(ws.store.get(it.id));
          ws._dirty = false;
          syncChrome();
          ws.draw();
        },
        onDelete: function (it) {
          if (!confirm('Delete "' + it.title + '"? This cannot be undone.')) return false;
          ws.store.remove(it.id);
        }
      });
    };

    $('btnLive').onclick = function () {
      if (active.flush) active.flush();
      active.hostLive();
    };

    // engines register themselves when their script runs
    SF.Editor.install();
    SF.Games.install();

    var want = null;
    try { want = localStorage.getItem(LAST_WS); } catch (e) {}
    active = workspaces[want === 'game' ? 'game' : 'deck'];
    document.body.classList.add(active.key === 'game' ? 'ws-game' : 'ws-deck');
    Array.prototype.forEach.call($('wsSwitch').children, function (b) {
      b.classList.toggle('on', b.dataset.go === active.key);
    });
    $('railLabel').textContent = active.railLabel;
    $('notesLabel').textContent = active.notesLabel;
    syncChrome();
    active.draw();

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
      if (SF.Player.open) return;
      var t = e.target.tagName;
      var typing = t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT';
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
    touch: touch,
    syncChrome: syncChrome,
    picker: picker,
    openModal: openModal,
    current: function () { return active; },
    UI: UI
  };
})(window);
