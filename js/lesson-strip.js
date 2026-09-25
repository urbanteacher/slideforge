/* The strip along the foot of Quiz studio and Activities.

   The Lesson studio keeps its slides in a strip under the canvas; these two
   keep theirs there too, and it has two views, switched by the icons in its
   head beside the count:

   - Its questions, or the lesson's activities: what the rail used to list,
     as slides, each with duplicate and delete on it, dragged to reorder.
   - The lesson: every slide of the lesson in the order the show runs them,
     so a game or an activity is seen where it lands, and the one being edited
     is outlined. With the lab as the Lesson studio the slides are the lab's
     pictures (SF.LabEngine.stripDeck) and the games and activities
     SlideForge's own; in the classic studio they are the classic lesson's.
     A game or an activity there opens it; the lesson's own slides are the
     Lesson studio's to edit.

   So the rail is free for editing, and the panel on the right for how it
   looks and runs. The studio hands over what to draw (draw(o)); which view
   is the teacher's, and is kept. */
(function (global) {
  'use strict';
  /** @type {any} */
  var SF = global.SF = global.SF || {};

  var VIEW_KEY = 'sf-strip-view';
  /** 'items' or 'lesson' */
  var view = 'items';
  try { view = localStorage.getItem(VIEW_KEY) === 'lesson' ? 'lesson' : 'items'; } catch (e) {}

  /* Each thumbnail is kept, with what it was drawn from, so a redraw of the
     studio redraws only the slides that changed. */
  /** @type {Map<string, {sig: string, node: HTMLElement}>} */
  var tiles = new Map();
  var asked = 0;
  var lastFocus = '';
  /** @type {any} */ var last = null;
  /** @type {IntersectionObserver|null} */ var io = null;

  function $(id) { return document.getElementById(id); }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /** The lesson as the show runs it: { deck, slides }. */
  function lesson() {
    if (SF.LabEngine && SF.LabEngine.enabled && SF.LabEngine.enabled() && SF.LabEngine.stripDeck) {
      return SF.LabEngine.stripDeck();
    }
    var d = SF.Editor && SF.Editor.deck && SF.Editor.deck();
    return Promise.resolve({ deck: d, title: d && d.title, slides: d ? d.slides : [] });
  }

  function gameOf(s) { return s.type === 'game' && SF.GameStore ? SF.GameStore.get(s.gameId) : null; }
  function activityOf(s) { return s.activity && SF.Activities && SF.Activities.activity ? SF.Activities.activity(s.activity) : null; }

  function nameOf(s) {
    /* A converted slide's name starts with its number in the old lesson
       ("86 · Section"); the strip counts the show's own. */
    if (s.lab) return String(s.name || '').replace(/^\d+\s*·\s*/, '');
    var g = gameOf(s), act = activityOf(s);
    return (g && g.title) || s.gameTitle || (act && act.title) || s.title || '';
  }

  /* What a thumbnail was drawn from. A lab picture is its own record of the
     slide; a SlideForge slide is drawn from its fields, and a game's from the game. */
  function sigOf(s, i, from) {
    if (s.lab) return i + '|' + s.image.length + '|' + (s.hidden ? 1 : 0) + '|' + nameOf(s) + '|' + (from && from.activity || '');
    var g = gameOf(s);
    return i + '|' + JSON.stringify(s).length + '|' + (g ? g.modified + ':' + g.title : '');
  }

  /* A slide drawn by SlideForge's renderer is drawn when it scrolls near the
     strip's view: a lesson has a hundred of them. */
  function paintLater(frame, paint) {
    /** @type {any} */ (frame)._paint = paint;
    if (!io && global.IntersectionObserver) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          var f = /** @type {any} */ (e.target);
          if (!e.isIntersecting || !f._paint) return;
          if (io) io.unobserve(f);
          var p = f._paint; f._paint = null; p(f);
        });
      }, { root: $('lessonStripList'), rootMargin: '0px 600px' });
    }
    if (io) io.observe(frame);
    else { /** @type {any} */ (frame)._paint = null; paint(frame); }
  }

  /** A SlideForge slide, drawn into a thumbnail's frame. */
  function slidePainter(deck, s, i, total) {
    return function (frame) {
      var node = SF.renderSlide(deck, s, {
        index: i, total: total, interactive: false, authoring: true, chrome: false,
        game: gameOf(s), join: s.type === 'join' && SF.sampleJoinInfo ? SF.sampleJoinInfo() : null
      });
      frame.appendChild(node);
      requestAnimationFrame(function () { SF.fit(frame, node); });
    };
  }

  function meta(n, text) {
    var m = el('div', 'lthumb-meta');
    m.appendChild(el('b', null, String(n)));
    m.appendChild(el('span', null, text));
    return m;
  }

  function onPress(node, fn) {
    node.onclick = function () { fn(); };
    node.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } };
  }

  /* ------------------------------------------------------------- the lesson */

  /* `from` is the SlideForge slide a lab slide was built from, if the lesson still has it. */
  function lessonTile(s, i, deck, total, from, open) {
    var t = el('div', 'lthumb' + (s.hidden ? ' hidden-slide' : ''));
    var frame = el('div', 'lthumb-img');
    if (s.lab) {
      var img = el('img');
      img.src = s.image; img.alt = ''; img.decoding = 'async'; img.loading = 'lazy';
      frame.appendChild(img);
      /* An activity the lab has built as slides is badged as the ones it has not. */
      if (from && activityOf(from)) frame.appendChild(el('span', 'lthumb-badge act', 'Activity'));
    } else {
      frame.classList.add('classic');
      paintLater(frame, slidePainter(deck, s, deck && deck.slides ? deck.slides.indexOf(s) : i, total));
      if (s.type === 'game') frame.appendChild(el('span', 'lthumb-badge game', gameOf(s) ? 'Game' : 'Missing'));
      else if (activityOf(s)) frame.appendChild(el('span', 'lthumb-badge act', 'Activity'));
    }
    if (s.hidden) frame.appendChild(el('span', 'lthumb-hidden', 'Hidden'));
    t.appendChild(frame);
    t.appendChild(meta(i + 1, nameOf(s)));
    t.title = (i + 1) + '. ' + (nameOf(s) || 'Slide') + (s.lab ? ' — a slide of the lesson; edit it in Lesson studio' : '');
    if (open) {
      t.classList.add('opens');
      t.tabIndex = 0;
      t.setAttribute('role', 'button');
      onPress(t, open);
    }
    return t;
  }

  function drawLesson(o, list) {
    var mine = ++asked;
    lesson().then(function (l) {
      if (mine !== asked || view !== 'lesson') return;
      var slides = (l && l.slides) || [];
      var seen = new Set();
      /** @type {Record<string, any>} */ var byId = {};
      ((l && l.deck && l.deck.slides) || []).forEach(function (s) { byId[s.id] = s; });
      var nodes = slides.map(function (s, i) {
        var key = 'l:' + String(s.id || i);
        seen.add(key);
        var from = s.lab && s.sourceSlideId ? byId[s.sourceSlideId] : null;
        var open = o.opens ? o.opens(s, from) : null;
        var sig = sigOf(s, i, from) + (open ? '|o' : '');
        var had = tiles.get(key);
        if (had && had.sig === sig) {
          if (open) onPress(had.node, open);
          return had.node;
        }
        var node = lessonTile(s, i, l.deck, slides.length, from, open);
        tiles.set(key, { sig: sig, node: node });
        return node;
      });
      forget(seen, 'l:');
      place(list, nodes);

      var at = [];
      slides.forEach(function (s, i) {
        var on = !!(o.match && o.match(s));
        nodes[i].classList.toggle('sel', on);
        if (on) at.push(i);
      });
      var where = $('lessonStripAt');
      if (where && !o.match) {
        /* Nothing chosen to look for: the lesson's length. */
        where.textContent = slides.length + (slides.length === 1 ? ' slide' : ' slides');
        where.classList.remove('none');
        where.title = '';
      } else if (where) {
        where.textContent = at.length
          ? 'Slide ' + (at[0] + 1) + (at.length > 1 ? ' +' + (at.length - 1) : '') + ' of ' + slides.length
          : 'Not in the lesson';
        where.classList.toggle('none', !at.length);
        where.title = at.length
          ? 'Where this ' + o.what + ' plays in the lesson' + (at.length > 1 ? ', and ' + (at.length - 1) + ' more' : '')
          : 'This ' + o.what + ' is not in the lesson' + (l.title ? ' “' + l.title + '”' : '') + ' yet';
      }
      bringIntoView(list, nodes, at, 'l');
    }, function () {});
  }

  /* ------------------------------------------------ its questions or activities */

  /**
   * @typedef {{ key: string, title: string, sub?: string, sig: string, sel?: boolean,
   *   paint: (frame: HTMLElement) => void, badge?: string, warn?: string,
   *   pick: () => void, dup?: () => void, del?: () => void, delDisabled?: boolean,
   *   dupLabel?: string, delLabel?: string }} ItemTile
   */

  var dragFrom = -1;

  function wireActs(node, it) {
    var b = node.querySelectorAll('.lthumb-acts button');
    var k = 0;
    if (it.dup && b[k]) { b[k].onclick = function (e) { e.stopPropagation(); it.dup(); }; k++; }
    if (it.del && b[k]) { b[k].onclick = function (e) { e.stopPropagation(); it.del(); }; }
  }

  /** @param {ItemTile} it @param {number} i @param {any} items */
  function itemTile(it, i, items) {
    var t = el('div', 'lthumb opens');
    t.tabIndex = 0;
    t.setAttribute('role', 'button');
    t.setAttribute('aria-label', it.title + (it.sub ? ', ' + it.sub : ''));
    t.dataset.i = String(i);
    var frame = el('div', 'lthumb-img classic');
    paintLater(frame, it.paint);
    if (it.warn) {
      var w = el('span', 'lthumb-badge warn', '⚠');
      w.title = it.warn;
      frame.appendChild(w);
    } else if (it.badge) frame.appendChild(el('span', 'lthumb-badge ' + (it.badge === 'Game' ? 'game' : 'act'), it.badge));
    t.appendChild(frame);
    t.appendChild(meta(i + 1, it.title));
    t.title = it.title + (it.sub ? '\n' + it.sub : '') + (it.warn ? '\n⚠ ' + it.warn : '');

    var acts = el('div', 'lthumb-acts');
    if (it.dup) {
      var d = el('button', null, '⧉');
      d.type = 'button';
      d.title = it.dupLabel || 'Duplicate';
      d.setAttribute('aria-label', it.dupLabel || 'Duplicate');
      acts.appendChild(d);
    }
    if (it.del) {
      var x = /** @type {HTMLButtonElement} */ (el('button', null, '🗑'));
      x.type = 'button';
      x.title = it.delLabel || 'Delete';
      x.setAttribute('aria-label', it.delLabel || 'Delete');
      x.disabled = !!it.delDisabled;
      acts.appendChild(x);
    }
    if (acts.childNodes.length) { t.appendChild(acts); t.classList.add('has-acts'); }
    wireActs(t, it);
    onPress(t, it.pick);

    if (items.move) {
      t.draggable = true;
      t.addEventListener('dragstart', function (e) {
        dragFrom = Number(t.dataset.i);
        if (e.dataTransfer) { e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', String(dragFrom)); } catch (err) {} }
      });
      t.addEventListener('dragover', function (e) { if (dragFrom < 0) return; e.preventDefault(); t.classList.add('drop'); });
      t.addEventListener('dragleave', function () { t.classList.remove('drop'); });
      t.addEventListener('drop', function (e) {
        e.preventDefault();
        t.classList.remove('drop');
        var to = Number(t.dataset.i), from = dragFrom;
        dragFrom = -1;
        if (from >= 0 && from !== to && last && last.items.move) last.items.move(from, to);
      });
      t.addEventListener('dragend', function () { dragFrom = -1; });
    }
    return t;
  }

  function drawItems(o, list) {
    ++asked;
    var items = o.items;
    var all = items.tiles || [];
    var seen = new Set();
    var nodes = all.map(function (it, i) {
      var key = 'i:' + it.key;
      seen.add(key);
      var sig = i + '|' + it.sig + '|' + it.title + '|' + (it.warn || '') + '|' + (it.delDisabled ? 1 : 0);
      var had = tiles.get(key);
      /* Kept, but with this draw's actions: they close over the studio's state. */
      if (had && had.sig === sig) { wireActs(had.node, it); onPress(had.node, it.pick); return had.node; }
      var node = itemTile(it, i, items);
      tiles.set(key, { sig: sig, node: node });
      return node;
    });
    forget(seen, 'i:');
    if (!all.length) list.replaceChildren(el('p', 'lesson-strip-empty', items.empty || ''));
    else place(list, nodes);
    var at = [];
    all.forEach(function (it, i) { nodes[i].classList.toggle('sel', !!it.sel); if (it.sel) at.push(i); });
    var where = $('lessonStripAt');
    if (where) {
      where.classList.remove('none');
      where.title = '';
      where.textContent = at.length
        ? (items.short || '') + (at[0] + 1) + ' of ' + all.length
        : all.length + ' ' + (all.length === 1 ? items.one : items.many);
    }
    bringIntoView(list, nodes, at, 'i');
  }

  /* ---------------------------------------------------------------- shared */

  function forget(seen, prefix) {
    tiles.forEach(function (_, k) { if (k.indexOf(prefix) === 0 && !seen.has(k)) tiles.delete(k); });
  }

  function place(list, nodes) {
    var same = nodes.length === list.children.length && nodes.every(function (n, i) { return list.children[i] === n; });
    if (!same) list.replaceChildren.apply(list, nodes);
  }

  /* Brought into view when what is being edited moves, not on every redraw,
     so a strip scrolled by hand stays where it was put. */
  function bringIntoView(list, nodes, at, tag) {
    var focus = tag + ':' + at.join(',') + '/' + nodes.length;
    if (at.length && focus !== lastFocus) {
      var n = nodes[at[0]];
      var fresh = lastFocus.charAt(0) !== tag;
      var off = n.offsetLeft < list.scrollLeft || n.offsetLeft + n.offsetWidth > list.scrollLeft + list.clientWidth;
      if (fresh || off) {
        list.scrollTo({ left: Math.max(0, n.offsetLeft - list.clientWidth / 2 + n.offsetWidth / 2), behavior: fresh ? 'auto' : 'smooth' });
      }
    }
    lastFocus = focus;
  }

  function syncHead(o) {
    var label = $('lessonStripLabel');
    if (label) label.textContent = view === 'lesson' ? 'Lesson' : o.items.label;
    Array.prototype.forEach.call(document.querySelectorAll('[data-strip-view]'), function (b) {
      var v = b.getAttribute('data-strip-view');
      b.setAttribute('aria-pressed', String(v === view));
      b.classList.toggle('on', v === view);
      if (v === 'items') {
        b.title = 'All the ' + o.items.many;
        b.setAttribute('aria-label', 'All the ' + o.items.many);
      }
    });
  }

  /**
   * Draw the strip for the studio on screen.
   * @param {{ what: string,
   *   match: ((s: any) => boolean)|null,
   *   opens?: (s: any, from: any) => (null | (() => void)),
   *   items: { label: string, one: string, many: string, short?: string, empty?: string,
   *     tiles: ItemTile[], move?: (from: number, to: number) => void } }} o
   *   what: "game" or "activity", for the head's words;
   *   match: the lesson's slides that are the one being edited, or null for none;
   *   opens: for a game or activity slide of the lesson (and, for a lab slide,
   *     the SlideForge slide it was built from), what clicking it does;
   *   items: the other view — its label, its nouns, and its tiles.
   */
  function draw(o) {
    last = o;
    var list = $('lessonStripList');
    if (!list || !o) return;
    /* Only for the studio on screen: the lesson view draws every slide of the
       lesson, which is work to leave until someone can see it. Switching
       studios draws it again. */
    var ws = document.documentElement.getAttribute('data-ws');
    if (ws !== 'game' && ws !== 'plan') return;
    var strip = $('lessonStrip');
    if (strip) strip.setAttribute('data-view', view);
    syncHead(o);
    if (view === 'lesson') drawLesson(o, list);
    else drawItems(o, list);
  }

  function setView(v) {
    view = v === 'lesson' ? 'lesson' : 'items';
    try { localStorage.setItem(VIEW_KEY, view); } catch (e) {}
    lastFocus = '';
    if (last) draw(last);
  }

  function install() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-strip-view]'), function (b) {
      b.addEventListener('click', function () { setView(b.getAttribute('data-strip-view')); });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();

  SF.LessonStrip = { draw: draw, view: function () { return view; }, setView: setView };

  /* ------------------------------------------------------------ the folds

     The rail beside the strip is written in folds, as the lab's left panel
     is (Layers, Layouts …): Instructions, Question, Answers, Explanation,
     each opened and closed by its head, and kept the way it was left. */
  var FOLD_KEY = 'sf-ws-folds';
  /** @type {Record<string, boolean>} */ var shut = {};
  try { shut = JSON.parse(localStorage.getItem(FOLD_KEY) || '{}') || {}; } catch (e) { shut = {}; }

  /** A fold in `box`, titled `title`; returns its body to fill. */
  SF.Fold = function (box, title) {
    var sec = el('section', 'ws-fold');
    var head = /** @type {HTMLButtonElement} */ (el('button', 'ws-fold-head'));
    head.type = 'button';
    head.appendChild(el('span', 'ws-fold-caret', '\u203a'));
    head.appendChild(el('span', null, title));
    var body = el('div', 'ws-fold-body');
    function sync() {
      var open = !shut[title];
      sec.classList.toggle('open', open);
      head.setAttribute('aria-expanded', String(open));
      body.hidden = !open;
    }
    head.onclick = function () {
      shut[title] = !shut[title];
      if (!shut[title]) delete shut[title];
      try { localStorage.setItem(FOLD_KEY, JSON.stringify(shut)); } catch (e) {}
      sync();
    };
    sec.appendChild(head);
    sec.appendChild(body);
    sync();
    box.appendChild(sec);
    return body;
  };

  /* Slide notes, as a fold. The notes box itself moves in, so what the
     studio already listens to on it goes with it; it goes back under the
     Lesson studio's canvas when that is the studio on screen. */
  SF.Fold.notes = function (box, title) {
    var area = $('notes');
    if (!area) return;
    SF.Fold(box, title || 'Slide notes').appendChild(area);
  };
  /* Before the rail is cleared for a redraw: the notes box is kept, not thrown away with it. */
  SF.Fold.park = function () {
    var area = $('notes'), strip = $('notesStrip');
    if (area && strip && area.parentNode !== strip) strip.appendChild(area);
  };
  function notesHome() {
    var ws = document.documentElement.getAttribute('data-ws');
    var area = $('notes'), strip = $('notesStrip');
    if (area && strip && ws !== 'game' && ws !== 'plan' && area.parentNode !== strip) strip.appendChild(area);
  }
  if (global.MutationObserver) {
    new MutationObserver(notesHome).observe(document.documentElement, { attributes: true, attributeFilter: ['data-ws'] });
  }
})(window);
