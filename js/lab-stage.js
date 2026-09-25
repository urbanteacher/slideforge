/* The lab's slides, live, inside SlideForge's show.

   A lab lesson plays in SlideForge's player (js/player.js): its HUD, the
   room's rail, Teacher Presenter and the live room are the player's. The show
   is the bridge's lesson (js/lab-engine.js) — each lab slide there is a
   picture, its games are SlideForge's own — and this puts the lab's player
   (lab-app/stage.js, window.SFLabStage) over each picture, drawing the slide
   live: its builds, its word timing, anything that moves, its on-slide
   controls. The picture stays underneath as the poster while the lab draws,
   and is what Teacher Presenter's thumbnails show.

   One canvas and one lab player for the whole show, moved into whichever
   picture slide is on the wall, paused while a game is. Next asks this first
   (SF.LabStage.step), so it walks a lab slide's builds before the player
   moves on — the same hook Explore and chart callouts use. With the rail
   open, the lab keeps a slide's backdrop full size and draws its content in
   the room left of the rail. */
(function (global) {
  'use strict';
  /** @type {any} */
  var SF = global.SF = global.SF || {};

  /** @type {any} */ var player = null;
  /** @type {HTMLCanvasElement|null} */ var canvas = null;
  /** @type {Record<string, number>} */ var byId = {};
  var deckId = '';
  var onLab = false;
  var lastWall = -1;
  /** @type {MutationObserver|null} */ var railWatch = null;
  var fontsCopied = false;

  function available() {
    return !!(global.SFLabStage && SF.LabEngine && SF.LabEngine.enabled && SF.LabEngine.enabled());
  }

  function isLabSlide(s) { return !!(s && s.design && s.design.labStill); }

  /* The lab's type, in this page: its web fonts, the typefaces of its own
     stylesheet, and the deck's style-guide fonts. Text drawn before they
     arrive is drawn again once they have. */
  function copyFonts(deck) {
    var doc = SF.LabEngine.frameDocument && SF.LabEngine.frameDocument();
    if (!fontsCopied && doc) {
      fontsCopied = true;
      var link = doc.getElementById('sf-fonts');
      if (link && !document.getElementById('sf-lab-fonts')) {
        var l = document.createElement('link');
        l.id = 'sf-lab-fonts'; l.rel = 'stylesheet'; l.href = link.href;
        document.head.appendChild(l);
      }
      var faces = [];
      Array.prototype.forEach.call(doc.styleSheets, function (sheet) {
        var rules; try { rules = sheet.cssRules; } catch (e) { return; }
        Array.prototype.forEach.call(rules || [], function (r) { if (r.type === 5) faces.push(r.cssText); });
      });
      if (faces.length) {
        var st = document.createElement('style');
        st.id = 'sf-lab-faces'; st.textContent = faces.join('\n');
        document.head.appendChild(st);
      }
    }
    global.SFLabStage.registerGuideFonts(deck.styleGuide);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { if (player) player.renderer.prune(new Set()); });
    }
  }

  function viewportOf() { return document.querySelector('#player .deck-viewport'); }

  /* Room for the rail: its width in slide pixels (--rail-w, 384 or 232), and
     the 54px gap SlideForge's own slides keep beside it. */
  function syncRail() {
    if (!player) return;
    var vp = viewportOf();
    var railed = !!(vp && vp.classList.contains('railed'));
    var w = railed ? (parseFloat(getComputedStyle(vp).getPropertyValue('--rail-w')) || 384) + 54 : 0;
    player.setInset(w / 1280);
  }

  function start() {
    var deck = SF.LabEngine.stageDeck && SF.LabEngine.stageDeck();
    if (!deck || !deck.slides || !deck.slides.length) return false;
    deckId = deck.id;
    byId = {};
    deck.slides.forEach(function (s, i) { byId[s.id] = i; });
    canvas = document.createElement('canvas');
    canvas.className = 'lab-live';
    player = new global.SFLabStage.DeckPlayer(canvas, deck, {
      host: { next: function () { SF.Player.next(); }, prev: function () { SF.Player.prev(); } }
    });
    copyFonts(deck);
    var vp = viewportOf();
    if (vp && global.MutationObserver) {
      railWatch = new MutationObserver(syncRail);
      railWatch.observe(vp, { attributes: true, attributeFilter: ['class'] });
    }
    syncRail();
    return true;
  }

  function stop() {
    if (railWatch) { railWatch.disconnect(); railWatch = null; }
    if (player) { try { player.destroy(); } catch (e) {} }
    if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
    player = null; canvas = null; byId = {}; deckId = ''; onLab = false; lastWall = -1;
  }

  function onSlide(e) {
    var slide = e && e.slide, node = e && e.node;
    var wall = e ? e.index : -1;
    var back = wall < lastWall;
    var fresh = wall !== lastWall;
    lastWall = wall;
    /* A show for another lesson: the stage starts again for it. */
    if (player && SF.Player.deck && SF.Player.deck.id !== deckId) stop();
    if (!isLabSlide(slide) || !available() || !SF.Player.deck) {
      onLab = false;
      if (player) player.pause();
      if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
      return;
    }
    if (!player && !start()) return;
    var i = byId[slide.id];
    if (i == null) { onLab = false; player.pause(); return; }
    node.appendChild(canvas);
    node.classList.add('has-lab-live');
    player.resume();
    syncRail();
    /* A redraw of the same slide (the desk syncing, a repaint) keeps the builds
       already shown; a new slide starts from its beginning, or fully built
       when the show has come back to it. */
    if (!fresh) { onLab = true; return; }
    var st = player.state();
    var adjacent = onLab && Math.abs(i - st.index) === 1;
    if (adjacent) player.goto(i, i > st.index ? 1 : -1, back);
    else player.cut(i, back);
    onLab = true;
  }

  /* Next: one build further on the lab slide on the wall, before the show moves on. */
  function step(P, dir) {
    if (!player || !onLab || dir < 0) return false;
    var s = P.deck && P.deck.slides[P.idx];
    if (!isLabSlide(s)) return false;
    return player.build();
  }

  function install() {
    if (!SF.Player || !SF.Player.on) return;
    SF.Player.on('slide', onSlide);
    SF.Player.on('close', stop);
    /* 'open' comes after the first slide is drawn, so it leaves the stage as that set it. */
    SF.Player.on('open', function () {
      /* The keys are the show's now: with the focus left in the lab's frame,
         arrows and Space would go to the editor behind it. */
      var f = document.getElementById('labFrame');
      if (f && document.activeElement === f) { f.blur(); global.focus(); }
    });
  }

  SF.LabStage = { install: install, step: step, stop: stop, active: function () { return !!player && onLab; },
    /* For the smokes and for debugging: the lab player on the wall. */
    player: function () { return player; } };
  install();
})(window);
