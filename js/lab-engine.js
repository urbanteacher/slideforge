/* The lab as the Lesson studio.

   The lab (lab/, built into lab-app/) is SlideForge's lesson engine. It runs in
   a frame over the workspace — the rail, the stage and the inspector — so its
   styles and its keyboard and paste handling stay its own, and it registers
   with the shell as the 'deck' engine. The shell keeps what it always had: the
   title, File, the Library, Save, restore points, Present.

   The classic Lesson studio (js/editor.js) still loads, hidden, because the
   Library, the demo, New and the Activities and Quiz studios open lessons
   through it. When it is handed a lesson, it tells the lab, and the lab opens
   its own copy: converted the first time, with an id of its own, so the
   original lesson is never written to by the lab.

   ?classic=1 on the address, or SF.LabEngine.useClassic(true), brings the
   classic studio back for this browser. */
(function (global) {
  'use strict';
  /** @type {any} */
  var SF = global.SF = global.SF || {};
  var KEY = 'sf.lessonEngine';

  function enabled() {
    try {
      if (/[?&]classic=1\b/.test(location.search)) return false;
      if (/[?&]classic=0\b/.test(location.search)) return true;
      /* The browser smokes (tools/smoke/) drive the classic studio's rail,
         stage and inspector, so under automation the classic studio is the
         one on screen. A smoke written for the lab opts in with ?classic=0. */
      if (navigator.webdriver) return false;
      return localStorage.getItem(KEY) !== 'classic';
    } catch (e) { return true; }
  }

  /** @type {any} */ var api = null;
  /** @type {HTMLIFrameElement|null} */ var frame = null;
  /** @type {Array<function(any):void>} */ var waiting = [];
  /** @type {Array<any>} */ var saved = [];
  var lastClassic = null;
  var placeholder = { id: '', title: 'Untitled lesson', slides: [] };

  /* A lesson asked for on the address (?lesson=, the link a lesson is shared
     and bookmarked by). The classic editor opens it while the shell starts,
     before install() has registered the lab, so its hand-over (classicDeck)
     finds another workspace current and does nothing — and the lab showed
     whatever it last had open, the demo on a first visit. Read now, before
     the editor takes the parameter off the address; install() hands it over. */
  var askedLesson = /[?&]lesson=/.test(location.search);

  function whenReady(fn) { if (api) fn(api); else waiting.push(fn); }

  /* ----------------------------------------------------- the Library card

     The Library (js/studio.js) lists SlideForge's store, and every folder,
     rename and move works on it. A lab lesson is too big for that store — its
     pictures are why the lab keeps its decks in IndexedDB — so the Library
     gets a card: the lesson's name and folder, under the lab deck's own id,
     and a single title slide. The lesson itself stays in the lab. */
  function card(labDeck) {
    var source = sourceLesson(labDeck);
    var s = SF.makeSlide('title');
    s.title = labDeck.title || 'Untitled lesson';
    return SF.normalizeDeck({
      id: labDeck.id, title: labDeck.title, theme: source && source.theme,
      libraryGroup: labDeck.libraryGroup || (source && source.libraryGroup) || undefined,
      modified: Date.now(), slides: [s]
    });
  }

  function writeCard(labDeck) {
    if (!labDeck || !labDeck.id || !SF.Store || !SF.Store.save) return;
    SF.Store.save(card(labDeck), { force: true });
  }

  /** A lab lesson the Library shows as a card. */
  function isCard(id) {
    return saved.some(function (r) { return r.id === id; }) && !!(SF.Store && SF.Store.get(id));
  }

  /** A SlideForge lesson whose lab copy has a card: the Library shows the card only. */
  function hasCopy(id) {
    return saved.some(function (r) { return r.sourceId === id && SF.Store && SF.Store.get(r.id); });
  }

  function refreshSaved() {
    if (!api) return;
    api.listSaved().then(function (rows) { saved = rows || []; });
  }

  /* The shell reads doc() often (the title field, the folder chip) and sets
     libraryGroup on what it gets back, so it gets a plain copy of the top
     level — the lab's own deck is frozen. */
  function doc() {
    if (!api) return placeholder;
    return Object.assign({}, api.getDeck());
  }

  var store = {
    list: function () {
      return saved.map(function (r) {
        return { id: r.id, title: r.title, modified: r.modified, slides: new Array(r.slides || 0) };
      });
    },
    get: function (id) {
      var row = saved.filter(function (r) { return r.id === id; })[0];
      return row ? { id: row.id, title: row.title, labSaved: true } : null;
    },
    save: function (d) {
      if (!api) return false;
      if (d && d.libraryGroup !== api.getDeck().libraryGroup) api.setGroup(d.libraryGroup);
      writeCard(api.getDeck());
      api.flush().then(refreshSaved, function () { if (SF.Shell && SF.Shell.stored) SF.Shell.stored(false); });
      return true;
    },
    remove: function (id) {
      if (!api) return;
      api.remove(id).then(refreshSaved);
    }
  };

  function open(d) {
    whenReady(function (a) {
      var fromCard = d && !d.labSaved && isCard(d.id);
      /* A saved lab lesson opens with its SlideForge original to hand, so a copy
         made before the converter kept feedback and timers can take them, once. */
      var row = d && saved.filter(function (x) { return x.id === d.id; })[0];
      var source = row && row.sourceId && SF.Store && SF.Store.get ? SF.Store.get(row.sourceId) : null;
      var run = d && (d.labSaved || fromCard) ? a.openSaved(d.id, source) : a.open(d);
      Promise.resolve(run).then(function (r) {
        if (r === false) { refreshSaved(); SF.toast('That lesson could not be opened here.'); return; }
        /* Known at once, not after the list is read back: the Library may be
           opened the next moment, and must already show this lesson once. */
        var now = a.getDeck();
        saved = [{ id: now.id, title: now.title, sourceId: now.sourceId, libraryGroup: now.libraryGroup, slides: now.slides.length, modified: Date.now() }]
          .concat(saved.filter(function (x) { return x.id !== now.id; }));
        refreshSaved();
        /* Renamed or moved in the Library: the card is the Library's word on both. */
        if (fromCard) {
          if (d.title && d.title !== a.getDeck().title) a.setTitle(d.title);
          if (d.libraryGroup && d.libraryGroup !== a.getDeck().libraryGroup) a.setGroup(d.libraryGroup);
        } else {
          writeCard(a.getDeck());
        }
        if (SF.Shell && SF.Shell.syncChrome) SF.Shell.syncChrome();
        if (r && r.converted && r.dropped) {
          SF.toast(r.dropped + (r.dropped === 1 ? ' slide stays' : ' slides stay') +
            ' in the classic lesson: the lab does not run games and activities yet. The original is unchanged.');
        }
      });
    });
  }

  /* ------------------------------------------------ the bridge to the room

     Host live, Teacher Presenter and Rehearse run on SlideForge's player, and
     the lab has no live host of its own yet (docs/lab-engine-plan.md, M7). So
     for those three the lab draws each of its slides as a picture, and the
     show is built as a SlideForge lesson: every lab slide a full-bleed picture,
     with the original lesson's games and activities back after the slide they
     followed. Present stays the lab's own show, with everything that moves. */

  /** The lesson this lab deck came from, as SlideForge saved it, if it is still here. */
  function sourceLesson(labDeck) {
    return labDeck && labDeck.sourceId && SF.Store && SF.Store.get ? SF.Store.get(labDeck.sourceId) : null;
  }

  function pictureSlide(still) {
    var s = SF.makeSlide('image');
    s.id = still.id;
    s.image = still.image;
    /* Contain, not cover: the whole slide shows even when the room's rail takes
       part of the width. No title or caption — the words are in the picture. */
    s.imageFit = 'contain';
    s.title = ''; s.subtitle = ''; s.body = '';
    s.notes = still.notes || '';
    if (still.hidden) s.hidden = true;
    s.design = Object.assign({}, s.design, { labStill: true, capStyle: 'none' });
    /* The picture already carries the lab's header and footer; the theme's own
       logo and page number would sit on top of it a second time. */
    s.headerFooter = { enabled: false, slots: {} };
    /* The lab draws this slide live over the picture (js/lab-stage.js) and runs
       its own transitions, so SlideForge's player cuts rather than fading. */
    s.transition = 'none';
    /* The slide's audience feedback with its settings (a converted lesson brings
       them; the lab's Engage tab sets the kind). What is not set takes
       SlideForge's defaults, and the prompt falls back to the slide's name. */
    var f = still.feedback;
    if (f && SF.makeFeedback) {
      var kind = typeof f === 'string' ? f : f.kind;
      s.feedback = SF.makeFeedback(kind);
      if (typeof f === 'object') {
        ['prompt', 'max', 'presentAs', 'points', 'lowLabel', 'highLabel', 'hold'].forEach(function (k) {
          if (f[k] != null && f[k] !== '') s.feedback[k] = f[k];
        });
        if (Array.isArray(f.options) && f.options.length) s.feedback.options = f.options.slice();
      }
      if (!s.feedback.prompt) s.feedback.prompt = still.name || '';
    }
    return s;
  }

  /* The lesson's own games and activities, each filed under the slide before
     it: the lab keeps which SlideForge slide each of its slides came from. */
  function carried(source, keep) {
    var after = { '': [] }, anchor = '';
    (source && source.slides || []).forEach(function (s) {
      if (keep.indexOf(s.id) >= 0) { (after[anchor] = after[anchor] || []).push(s); }
      else anchor = s.id;
    });
    return after;
  }

  /** @type {any} */ var lastShowDeck = null;

  /* The show as a SlideForge lesson: what Host live, Rehearse, Teacher
     Presenter and Share all run, so a follow-along link matches the room. */
  /* A slide's words as a SlideForge content slide: what the practice notes read. */
  function wordsSlide(o) {
    var s = SF.makeSlide('content');
    s.id = o.id;
    s.title = o.title || '';
    s.bullets = o.lines || [];
    s.notes = o.notes || '';
    if (o.hidden) s.hidden = true;
    return s;
  }

  /* One slide per lab slide, made by `make`, with the lesson's games and
     activities back in their places: the order the show runs. */
  function ordered(items, make, source) {
    var keep = source ? api.cannotBuild(source.slides) : [];
    var after = carried(source, keep);
    /* A deck converted before slides remembered their source: match them in
       order, when the counts say nothing has been added or taken away. */
    if (source && !items.some(function (s) { return s.sourceSlideId; })) {
      var built = source.slides.filter(function (s) { return keep.indexOf(s.id) < 0; });
      if (built.length === items.length) items.forEach(function (s, i) { s.sourceSlideId = built[i].id; });
    }
    var slides = (after[''] || []).slice();
    delete after[''];
    items.forEach(function (item) {
      /* One slide, or a game's board compiled as several (src/deck/labshow.js). */
      slides = slides.concat(make(item));
      var more = item.sourceSlideId && after[item.sourceSlideId];
      if (more) { slides = slides.concat(more); delete after[item.sourceSlideId]; }
    });
    /* Games whose slide the lab no longer has go at the end, rather than nowhere. */
    Object.keys(after).forEach(function (k) { slides = slides.concat(after[k]); });
    return slides;
  }

  /* The lab's slides in SlideForge's form — one per lab slide, a picture or its
     words — with the lesson's games and activities back in their places. */
  function lessonFrom(items, make) {
    var labDeck = api.getDeck();
    var source = sourceLesson(labDeck);
    var slides = ordered(items, make, source);
    return SF.normalizeDeck(Object.assign({}, source || {}, {
      /* The lab deck's own id: the lobby checks the room is for the lesson on screen. */
      id: labDeck.id, title: labDeck.title, slides: slides
    }));
  }

  function buildShowDeck(width, quality) {
    var total = api.getDeck().slides.length, shown = 0;
    return api.stills(width || 1600, function (done) {
      if (total > 12 && done - shown >= 10) { shown = done; SF.toast('Preparing the show \u2014 ' + done + ' of ' + total + ' slides'); }
    }, quality || 0.9).then(function (stills) {
      /* The lab's games play as SlideForge's own: its quiz slides under the lab's drawing, its
         boards where the room's state is kept (src/deck/labshow.js). The rest are pictures. */
      var items = SF.labShowSlides ? SF.labShowSlides(stills) : stills;
      var deck = lessonFrom(items, function (/** @type {any} */ it) { return it.sf || pictureSlide(it); });
      if (!width || width === 1600) lastShowDeck = deck;
      return deck;
    });
  }

  /* The handout. SlideForge prints a slide that moves as the pages it moves
     through (js/print.js): an experiment two states to a page, each with what
     changes, what stays fixed and the takeaway; a picture with facts on its
     back as the picture, then the facts; a before-and-after as each side. A
     picture of the lab's slide is one state, so Week 2's 70 slides printed as
     70 pages where SlideForge's handout had 102. A slide SlideForge's handout
     gives more pages than the lab's picture of it prints from its SlideForge
     original, which is what the lab slide was made from; the rest are the
     lab's pictures. The handout itself decides, so a kind of slide it learns
     to print as pages is followed here without a list to keep. */
  function printsAsPages(original, picture) {
    if (!original) return false;
    /* An experiment prints all its states, side by side, even when they fit one page. */
    if (original.type === 'experiment') return true;
    var pages = function (s) { return SF.Print.pagesFor({ slides: [s] }).length; };
    return pages(original) > pages(picture);
  }

  function buildPrintDeck() {
    return buildShowDeck().then(function (deck) {
      var source = sourceLesson(api.getDeck());
      if (!source || !SF.Print || !SF.Print.pagesFor) return deck;
      var original = {};
      source.slides.forEach(function (s) { original[s.id] = s; });
      var from = {};
      api.getDeck().slides.forEach(function (s) { if (s.sourceSlideId) from[s.id] = s.sourceSlideId; });
      var changed = false;
      var slides = deck.slides.map(function (s) {
        var o = original[from[s.id]];
        if (!printsAsPages(o, s)) return s;
        changed = true;
        return Object.assign(JSON.parse(JSON.stringify(o)), { hidden: s.hidden });
      });
      return changed ? SF.normalizeDeck(Object.assign({}, deck, { slides: slides })) : deck;
    });
  }

  /* The lesson as words, for the practice notes. */
  function wordsDeck() { return lessonFrom(api.outline(), wordsSlide); }

  function buildShow() {
    return buildShowDeck().then(function (deck) {
      var a = api;
      var run = SF.buildRunDeck(deck, function (id) { return SF.GameStore.get(id); });
      if (run.missingGames && run.missingGames.length) SF.toast('Missing game: ' + run.missingGames.join(', '));
      var at = a.currentSlideId();
      var idx = Math.max(0, run.slides.findIndex(function (s) { return s.id === at; }));
      return { run: run, index: idx };
    });
  }

  function withShow(start) {
    whenReady(function () {
      buildShow().then(start, function (e) {
        console.error(e);
        SF.toast('The show could not be prepared: ' + (e && e.message || e));
      });
    });
  }

  function hostLive() {
    withShow(function (show) { SF.Live.host(show.run); });
  }

  function rehearse(size) {
    size = Number(size) || 0;
    try {
      if (size) localStorage.setItem('slideforge.rehearseSize', String(size));
      else size = Number(localStorage.getItem('slideforge.rehearseSize')) || 0;
    } catch (e) {}
    withShow(function (show) {
      if (!show.run.slides.length) { SF.toast('Add a slide before rehearsing.'); return; }
      if (!SF.Demo) { SF.Player.start(show.run, show.index, { fullscreen: false }); return; }
      SF.Demo.start(show.run, { fullscreen: false, startIndex: show.index, auto: true, size: size });
    });
  }

  function teacherPresenter() {
    /* The pop-out opens now, inside the click, or the browser blocks it; the
       show it follows starts once the slides are drawn. */
    var desk = SF.Player.openPresenter();
    if (!desk) return;
    withShow(function (show) {
      if (!SF.Player.open) SF.Player.start(show.run, show.index, { fullscreen: false });
      if (SF.Player.syncPresenter) SF.Player.syncPresenter();
    });
  }

  var ws = {
    key: 'deck',
    hostLive: hostLive,
    lab: true,
    railLabel: 'Slides',
    notesLabel: 'Speaker notes',
    settingsLabel: 'Settings',
    fileSuffix: '.lesson.json',
    store: store,
    doc: doc,
    setDoc: open,
    blank: function () { return api ? api.blank() : placeholder; },
    draw: function () { showFrame(true); },
    describe: function (d) {
      var n = d && d.slides ? d.slides.length : 0;
      return n + (n === 1 ? ' slide' : ' slides');
    },
    onTitle: function (v) { whenReady(function (a) { a.setTitle(v); }); },
    onTheme: function () {},
    /* Present is SlideForge's show, with its HUD, and the lab drawing each
       slide live inside it (js/lab-stage.js). Full screen is asked for now,
       inside the click; the show starts once its slides are ready. */
    play: function () {
      var d = document.documentElement;
      if (!document.fullscreenElement && d.requestFullscreen) d.requestFullscreen().catch(function () {});
      withShow(function (show) { SF.Player.start(show.run, show.index, { fullscreen: false }); });
    },
    settings: function () {
      SF.toast('Theme, colours, header and footer are in the lab’s left panel.');
    },
    flush: function () { if (api) api.flush(); },
    keydown: function () {}
  };

  function showFrame(on) {
    document.documentElement.classList.toggle('lab-lesson', !!on);
  }

  /* The lab is a large bundle, and it draws nothing until its deck is back
     from storage, so the workspace says what is happening in the meantime —
     and says so plainly if the lab never arrives (no WebGL2, a failed load),
     with the way back to the classic studio. */
  /** @type {HTMLElement|null} */ var loading = null;
  var failTimer = 0;

  function showLoading() {
    loading = document.createElement('div');
    loading.className = 'lab-loading';
    loading.setAttribute('role', 'status');
    loading.innerHTML = '<span class="lab-loading-dot" aria-hidden="true"></span><span>Opening the lesson studio\u2026</span>';
    var app = document.getElementById('app');
    if (app) app.appendChild(loading);
    failTimer = window.setTimeout(function () { failed('timeout'); }, 20000);
  }

  function failed(why) {
    if (api || !loading) return;
    clearTimeout(failTimer);
    loading.classList.add('failed');
    loading.innerHTML = '<span>The lesson studio did not start.</span>' +
      '<span class="lab-loading-sub">' + (why === 'webgl'
        ? 'It draws with WebGL2, which this browser has switched off \u2014 often after the graphics card ran out of memory. Quit and reopen the browser, or '
        : 'Reload the page, or ') +
      '<a href="?classic=1">open the classic Lesson studio</a>.</span>';
  }

  function hideLoading() {
    clearTimeout(failTimer);
    if (loading && loading.parentNode) loading.parentNode.removeChild(loading);
    loading = null;
  }

  function mount() {
    if (frame) return;
    showLoading();
    frame = document.createElement('iframe');
    frame.id = 'labFrame';
    frame.className = 'lab-frame';
    frame.title = 'Lesson studio';
    frame.setAttribute('allow', 'fullscreen; clipboard-read; clipboard-write');
    frame.src = 'lab-app/index.html?embed=1';
    var app = document.getElementById('app');
    if (app) app.appendChild(frame);
  }

  function install() {
    if (!enabled() || !SF.Shell) return;
    mount();
    SF.Shell.register(ws);
    document.documentElement.classList.add('lab-engine');
    /* The lesson the address asked for, which the editor has already opened. */
    var asked = askedLesson && SF.Editor && SF.Editor.workspace ? SF.Editor.workspace.doc() : null;
    if (asked && asked.id) {
      lastClassic = asked.id;
      open(JSON.parse(JSON.stringify(asked)));
    }
    /* Present is the lab's show. The classic editor wired this button to its
       own player when it installed; the lab engine installs after it. */
    var btnPresent = document.getElementById('btnPresent');
    if (btnPresent) btnPresent.onclick = function () { ws.play(); };
    /* File → Open saved lesson: the lab's decks, through the shell's own Open list. */
    var btnOpenLesson = document.getElementById('btnOpenLesson');
    var btnOpen = /** @type {HTMLButtonElement|null} */ (document.getElementById('btnOpen'));
    if (btnOpenLesson && btnOpen) btnOpenLesson.onclick = function () { if (btnOpen && btnOpen.onclick) btnOpen.click(); };
    /* Teacher Presenter and Rehearse, from Present ▾: the bridge above. */
    var btnPresenter = document.getElementById('btnPresenter');
    if (btnPresenter) btnPresenter.onclick = teacherPresenter;
    var btnRehearse = document.getElementById('btnRehearse');
    if (btnRehearse) btnRehearse.onclick = function () { rehearse(0); };
    Array.prototype.forEach.call(document.querySelectorAll('[data-rehearse-size]'), function (b) {
      b.onclick = function () { rehearse(Number(b.getAttribute('data-rehearse-size'))); };
    });
  }

  /* Called by the lab (lab/src/main.tsx) once its deck is back from storage. */
  function ready(a) {
    api = a;
    SF.LabEngine.readyAt = Math.round(performance.now());
    hideLoading();
    /* Lessons made before the Library had cards get theirs now. */
    a.listSaved().then(function (rows) {
      saved = rows || [];
      saved.forEach(function (r) {
        if (SF.Store.get(r.id)) return;
        writeCard({ id: r.id, title: r.title, sourceId: r.sourceId, libraryGroup: r.libraryGroup });
      });
    });
    var lastDeck = a.getDeck();
    a.subscribe(function () {
      var d = a.getDeck();
      /* An edit: the shell's Save has something to write, as with the classic editor. */
      if (d !== lastDeck) {
        /* The name and folder are the shell's chrome. Only when they change: rewriting
           the title field on every edit would move the caret of someone typing in it. */
        var chrome = d.title !== lastDeck.title || d.libraryGroup !== lastDeck.libraryGroup || d.id !== lastDeck.id;
        lastDeck = d; ws._dirty = true;
        if (chrome) writeCard(d);
        if (chrome && SF.Shell && SF.Shell.current && SF.Shell.current() === ws) SF.Shell.syncChrome();
      }
      /* Out of the show: out of full screen with it. */
      if (!a.isPresenting() && frame && document.fullscreenElement === frame) {
        document.exitFullscreen().catch(function () {});
      }
    });
    var run = waiting; waiting = [];
    run.forEach(function (fn) { fn(a); });
    if (SF.Shell && SF.Shell.syncChrome && SF.Shell.current && SF.Shell.current() === ws) SF.Shell.syncChrome();
  }

  /* The classic editor calls this when it draws: a lesson it has just been
     handed (from the Library, the demo, New) opens in the lab. Only a new
     lesson — edits the Activities or Quiz studio make to the classic copy of
     one already open are not pulled over the lab's. */
  function classicDeck(d) {
    if (!enabled() || !d || !d.id) return;
    if (!SF.Shell || !SF.Shell.current || SF.Shell.current() !== ws) return;
    if (d.id === lastClassic && api && (api.getDeck().sourceId === d.id || api.getDeck().id === d.id)) return;
    lastClassic = d.id;
    open(JSON.parse(JSON.stringify(d)));
  }

  function useClassic(on) {
    try { localStorage.setItem(KEY, on ? 'classic' : 'lab'); } catch (e) {}
    location.reload();
  }

  /* Start the lab loading now, while the rest of the page's scripts run and the
     shell starts, rather than after: install() finds the frame already there. */
  if (enabled() && document.getElementById('app')) mount();

  SF.LabEngine = {
    enabled: enabled, install: install, ready: ready, failed: failed,
    classicDeck: classicDeck, useClassic: useClassic,
    /* For the handout's test: which slides print from their SlideForge original, and the picture a lab slide becomes. */
    printsAsPages: printsAsPages, pictureSlide: pictureSlide,
    /* For Share (js/shell.js): the lesson as SlideForge's player shows it. */
    showDeck: function () {
      return new Promise(function (resolve, reject) { whenReady(function () { buildShowDeck().then(resolve, reject); }); });
    },
    /* The handout's lesson: the show, with the slides SlideForge prints as pages from their originals. */
    printDeck: function () {
      return new Promise(function (resolve, reject) { whenReady(function () { buildPrintDeck().then(resolve, reject); }); });
    },
    /* A shared copy has to fit the server's limit (8 MB, MAX_DOC in
       server/server.js), so its pictures step down until it does. */
    shareDeck: function () {
      var sizes = [[1600, 0.85], [1280, 0.8], [1024, 0.72], [800, 0.62]];
      var LIMIT = 7.5 * 1024 * 1024;
      return new Promise(function (resolve, reject) {
        whenReady(function () {
          (function next(i) {
            buildShowDeck(sizes[i][0], sizes[i][1]).then(function (deck) {
              if (JSON.stringify(deck).length <= LIMIT || i === sizes.length - 1) resolve(deck);
              else next(i + 1);
            }, reject);
          })(0);
        });
      });
    },
    lastShowDeck: function () { return lastShowDeck; },
    /* For Activities' Host live: the lesson's, whichever studio is on screen. */
    hostLive: function () { hostLive(); },
    /* For the live stage (js/lab-stage.js): the lab deck as it is now, and the
       lab's page, for its fonts. */
    stageDeck: function () { return api ? JSON.parse(JSON.stringify(api.getDeck())) : null; },
    frameDocument: function () { return frame && frame.contentDocument; },
    /* The lab's tools row carries the shell's second row (Library, the demo,
       Host live, Present and its menu) so the two sit on one line; each of its
       buttons presses the shell's own, hidden, so what they do is unchanged. */
    act: function (name, arg) {
      var ids = { library: 'btnLibraryOpen', demo: 'btnTemplate', live: 'btnLive', present: 'btnPresent',
        presenter: 'btnPresenter', rehearse: 'btnRehearse' };
      var el = name === 'rehearse' && arg
        ? document.querySelector('[data-rehearse-size="' + Number(arg) + '"]')
        : document.getElementById(ids[name] || '');
      if (el && /** @type {HTMLElement} */ (el).click) /** @type {HTMLElement} */ (el).click();
    },
    /* For the lesson strip in Quiz studio and Activities (js/lesson-strip.js):
       the lesson in the show's order, small. Each lab slide is a picture; the
       games and activities are SlideForge's own slides, from the copy those
       two studios are editing when it is this lesson's. */
    stripDeck: function () {
      return new Promise(function (resolve, reject) {
        whenReady(function (a) {
          a.stills(288, undefined, 0.72).then(function (stills) {
            var labDeck = a.getDeck();
            var editing = SF.Editor && SF.Editor.deck && SF.Editor.deck();
            var source = editing && editing.id === labDeck.sourceId ? editing : sourceLesson(labDeck);
            resolve({
              deck: source, title: labDeck.title,
              slides: ordered(stills, function (st) {
                return { lab: true, id: st.id, sourceSlideId: st.sourceSlideId, image: st.image, name: st.name, hidden: st.hidden };
              }, source)
            });
          }, reject);
        });
      });
    },
    /* For the Library (js/studio.js). */
    hasCopy: function (id) { return enabled() && hasCopy(id); },
    forget: function (id) {
      if (!enabled() || !api || !saved.some(function (r) { return r.id === id; })) return;
      /* Deleting the lesson on screen leaves a blank one, not a deleted one still being edited. */
      if (api.getDeck().id === id) api.open(api.blank());
      api.remove(id).then(refreshSaved);
    },
    /* For File → Export (js/shell.js): the practice notes read words, not pictures. */
    wordsDeck: function () { return api ? wordsDeck() : null; },
    /* Every slide a stack of layers and none typed: a classic slide always has
       a type, and a gallery carries a layers list of its own. */
    isLabDoc: function (d) {
      return !!d && Array.isArray(d.slides) && d.slides.length > 0 && d.slides.every(function (s) {
        return s && Array.isArray(s.layers) && typeof s.type !== 'string';
      });
    }
  };
})(window);
