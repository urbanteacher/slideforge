/* Command palette — ⌘K / Ctrl+K.

   One place to find everything the app can do, by name. It came out of the
   22 September review: the editor has more shortcuts than Figma Slides and a
   new user had no way to discover any of them, while the header grew a second
   and third button for the same action because a button was the only way to
   be found.

   It owns no actions. Each workspace lists its own through commands() — the
   editor's call the same functions its buttons do — and the shell adds the
   ones that are buttons in the header, which the palette runs by clicking the
   button itself. So a command cannot drift from the control it stands for:
   it is that control. Remove a button and its command goes with it.

   Ranked by a plain subsequence match, words starting a label scoring
   highest. Typing a number offers "Go to slide N". */
(function (global) {
  'use strict';
  /** @type {import("../src/types.js").SlideForgeGlobal} */
  var SF = global.SF = global.SF || {};

  /**
   * @typedef {{ id: string, label: string, keys?: string, group?: string,
   *   words?: string, run: function(): void, enabled?: function(): boolean }} Command
   */

  /* How well `query` matches `text`: 0 is no match. Every query character
     must appear in order; a match at the start of a word is worth more than
     one inside it, and a run of consecutive characters more than scattered
     ones, so "dup" finds Duplicate before it finds "Add up". */
  function score(query, text) {
    var q = String(query || '').toLowerCase().replace(/\s+/g, ' ').trim();
    var t = String(text || '').toLowerCase();
    if (!q) return 1;
    var at = 0, total = 0, run = 0, last = -2;
    for (var i = 0; i < q.length; i++) {
      var ch = q.charAt(i);
      if (ch === ' ') { run = 0; continue; }
      var found = t.indexOf(ch, at);
      if (found < 0) return 0;
      var wordStart = found === 0 || /[\s\-·/&(]/.test(t.charAt(found - 1));
      run = found === last + 1 ? run + 1 : 0;
      total += 1 + (wordStart ? 6 : 0) + run * 2;
      last = found;
      at = found + 1;
    }
    /* A label that starts with the query beats one that merely contains it. */
    if (t.indexOf(q) === 0) total += 20;
    else if (t.indexOf(q) > 0) total += 8;
    return total;
  }

  /**
   * @param {string} query
   * @param {Command[]} commands
   * @returns {Command[]}
   */
  function rank(query, commands) {
    return commands
      .map(function (c, i) {
        var s = Math.max(score(query, c.label), score(query, c.words || '') * 0.6);
        return { c: c, s: s, i: i };
      })
      .filter(function (x) { return x.s > 0; })
      .sort(function (a, b) { return b.s - a.s || a.i - b.i; })
      .map(function (x) { return x.c; });
  }

  var box = null, field = null, list = null, note = null;
  var shown = /** @type {Command[]} */ ([]);
  var active = 0;
  var source = /** @type {function(string): Command[]} */ (function () { return []; });

  function build() {
    box = document.createElement('dialog');
    box.className = 'palette';
    box.setAttribute('aria-label', 'Commands');
    box.innerHTML =
      '<input class="palette-field" type="text" role="combobox" aria-expanded="true" ' +
      'aria-controls="paletteList" aria-autocomplete="list" autocomplete="off" spellcheck="false" ' +
      'placeholder="Type a command, or a slide number…" aria-label="Search commands">' +
      '<ul class="palette-list" id="paletteList" role="listbox" aria-label="Commands"></ul>' +
      '<p class="palette-note"></p>';
    document.body.appendChild(box);
    field = /** @type {HTMLInputElement} */ (box.querySelector('.palette-field'));
    list = /** @type {HTMLElement} */ (box.querySelector('.palette-list'));
    note = /** @type {HTMLElement} */ (box.querySelector('.palette-note'));
    field.addEventListener('input', function () { active = 0; draw(); });
    field.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Home' && e.ctrlKey) { e.preventDefault(); active = 0; paint(); }
      else if (e.key === 'Enter') { e.preventDefault(); choose(active); }
    });
    /* A click on the backdrop closes it, as it does for every other sheet. */
    box.addEventListener('click', function (e) { if (e.target === box) close(); });
  }

  function move(by) {
    if (!shown.length) return;
    active = (active + by + shown.length) % shown.length;
    paint();
  }

  function paint() {
    if (!list || !field) return;
    Array.prototype.forEach.call(list.children, function (li, i) {
      var on = i === active;
      li.classList.toggle('on', on);
      li.setAttribute('aria-selected', String(on));
      if (on) {
        field.setAttribute('aria-activedescendant', li.id);
        li.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  function draw() {
    if (!list || !field || !note) return;
    var all = source(field.value).filter(function (c) { return !c.enabled || c.enabled(); });
    shown = rank(field.value, all).slice(0, 60);
    list.replaceChildren();
    shown.forEach(function (c, i) {
      var li = document.createElement('li');
      li.id = 'palette-' + i;
      li.setAttribute('role', 'option');
      var name = document.createElement('span');
      name.className = 'palette-label';
      name.textContent = c.label;
      li.appendChild(name);
      if (c.group) {
        var g = document.createElement('span');
        g.className = 'palette-group';
        g.textContent = c.group;
        li.appendChild(g);
      }
      if (c.keys) {
        var k = document.createElement('kbd');
        k.textContent = c.keys;
        li.appendChild(k);
      }
      li.addEventListener('mousemove', function () { if (active !== i) { active = i; paint(); } });
      /* mousedown, not click: the field would lose focus first. */
      li.addEventListener('mousedown', function (e) { e.preventDefault(); choose(i); });
      list.appendChild(li);
    });
    note.textContent = shown.length ? '↑↓ to choose · Enter to run · Esc to close' : 'Nothing matches “' + field.value + '”';
    paint();
  }

  function choose(i) {
    var c = shown[i];
    if (!c) return;
    close();
    /* After the dialog has gone, so the command sees the page as it was and
       can open a dialog of its own. */
    setTimeout(function () { c.run(); }, 0);
  }

  function close() {
    if (box && box.open) box.close();
  }

  /**
   * @param {function(string): Command[]} commands  asked afresh on every keystroke
   */
  function open(commands) {
    if (!box) build();
    if (!box || !field) return;
    source = commands;
    field.value = '';
    active = 0;
    draw();
    if (!box.open) box.showModal();
    field.focus();
  }

  SF.Palette = {
    open: open,
    close: close,
    isOpen: function () { return !!(box && box.open); },
    rank: rank,
    score: score
  };
})(typeof window !== 'undefined' ? window : globalThis);
