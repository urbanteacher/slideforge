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
  /* A lab game's question on the wall (src/deck/labshow.js) draws its own answer slide once it is
     revealed, and its second drawing (Definition challenge's recall) once SlideForge asks. */
  /** @type {Record<string, string>} */ var shown = {};

  function available() {
    return !!(global.SFLabStage && SF.LabEngine && SF.LabEngine.enabled && SF.LabEngine.enabled());
  }

  function isLabSlide(s) { return !!(s && s.design && s.design.labStill); }

  /* Revealed in the live room, or by SlideForge's own player (Present, Rehearse: answers[id] is set once shown). */
  function liveRevealed(s) {
    if (SF.Live && SF.Live.active) return !!(SF.Live.revealed && SF.Live.revealed[s.id]);
    return !!(SF.Player.answers && SF.Player.answers[s.id] != null);
  }

  /** Which of the lab's slides this one draws now: its answer once revealed, its recall once asked. */
  function drawnIndex(s) {
    var d = s.design || {};
    if (d.labReveal && byId[d.labReveal] != null && (shown[s.id] === 'answer' || liveRevealed(s))) return byId[d.labReveal];
    var asked = shown[s.id] === 'ask' || (s.style === 'definition' && SF.Player.definitionPhase && SF.Player.definitionPhase(s) !== 'reading');
    if (d.labAsk && byId[d.labAsk] != null && asked) return byId[d.labAsk];
    return byId[s.id];
  }

  /** Move the drawing on to one of the lab's other slides (the answer, the recall), as the lab's
      own Next would: its transition plays, so what the two share travels. */
  function drawPart(s, part, id) {
    shown[s.id] = part;
    if (!player || !onLab || id == null || byId[id] == null) return;
    var cur = SF.Player.wallSlide ? SF.Player.wallSlide() : SF.Player.deck && SF.Player.deck.slides[SF.Player.idx];
    if (!cur || cur.id !== s.id) return;
    var i = byId[id];
    if (player.state().index !== i) player.goto(i, 1);
  }

  /** The question is revealed (the room's Live reveal, or Next in Present): draw its answer. */
  function reveal(s) {
    if (s && s.design && s.design.labReveal) drawPart(s, 'answer', s.design.labReveal);
  }

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

  /* Room for the rail: its width in slide pixels (--rail-w, 384), and
     the 54px gap SlideForge's own slides keep beside it. */
  function syncRail() {
    if (!player) return;
    var vp = viewportOf();
    var railed = !!(vp && vp.classList.contains('railed'));
    var w = railed ? (parseFloat(getComputedStyle(vp).getPropertyValue('--rail-w')) || 384) + 54 : 0;
    player.setInset(w / 1280);
  }

  function start() {
    var deck = SF.LabEngine.stageDeck && SF.LabEngine.stageDeck(SF.Player.deck && SF.Player.deck.id);
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

  /* A YouTube or Vimeo clip on a lab slide plays in the service's own player,
     framed where its layer sits, as the lab's Present frames it
     (lab/src/ui/Present.tsx). The lab draws such a layer as a still; without
     this the show had only the still, and a press on it played nothing. The
     address is SlideForge's own (SF.videoEmbed), from the layer's start and
     end; the clip waits for a press in the player unless it is muted and set
     to play. */
  /** @type {HTMLIFrameElement[]} */ var embeds = [];
  function clearEmbeds() {
    embeds.forEach(function (f) { if (f.parentNode) f.parentNode.removeChild(f); });
    embeds = [];
    syncVideoButtons();
  }

  /* Play and pause from the show, not only from the service's own button.
     That button is small, sits on a scaled slide and, once pressed, keeps the
     keyboard inside the clip, so the arrows scrub the video instead of moving
     the show. The HUD's play button and K (YouTube's own key) start and stop
     every clip on the slide by the services' message APIs: YouTube's
     enablejsapi, and Vimeo's player.js messages, which need no flag. */
  /** @type {WeakMap<HTMLIFrameElement, boolean>} */ var playing = new WeakMap();
  /** @param {HTMLIFrameElement} f */
  function isVimeo(f) { return /player\.vimeo\.com/.test(f.src); }
  /** @param {HTMLIFrameElement} f @param {any} msg */
  function tell(f, msg) {
    try { if (f.contentWindow) f.contentWindow.postMessage(JSON.stringify(msg), '*'); } catch (e) {}
  }
  /** @param {HTMLIFrameElement} f */
  function listen(f) {
    if (isVimeo(f)) { tell(f, { method: 'addEventListener', value: 'play' }); tell(f, { method: 'addEventListener', value: 'pause' }); tell(f, { method: 'addEventListener', value: 'ended' }); }
    else tell(f, { event: 'listening', id: 'sf-lab-embed' });
  }
  /* A clip the lab plays itself (a file, drawn on its canvas) is the lab player's to start and stop. */
  function labClips() { return !!(player && onLab && player.hasClips && player.hasClips()); }
  function videoPlaying() {
    if (!embeds.length) return labClips() && player.clipsPlaying();
    return embeds.some(function (f) { return playing.get(f) === true; });
  }
  function toggleVideo() {
    if (!embeds.length) {
      if (!labClips() || !player.toggleClips()) return false;
      syncVideoButtons();
      return true;
    }
    var play = !videoPlaying();
    embeds.forEach(function (f) {
      if (isVimeo(f)) tell(f, { method: play ? 'play' : 'pause' });
      else tell(f, { event: 'command', func: play ? 'playVideo' : 'pauseVideo', args: [] });
      playing.set(f, play);
    });
    syncVideoButtons();
    return true;
  }
  function syncVideoButtons() {
    var on = videoPlaying();
    document.querySelectorAll('[data-lab-act="video"]').forEach(function (b) {
      var el = /** @type {HTMLElement} */ (b);
      el.hidden = !embeds.length && !labClips();
      var label = (on ? 'Pause the video' : 'Play the video') + ' (K)';
      el.title = label;
      el.setAttribute('aria-label', label);
      el.textContent = el.closest('#hudMore') ? (on ? 'Pause video' : 'Play video') : (on ? '\u23f8' : '\u25b6');
    });
  }
  /* The services report back what their own buttons did, so the HUD button
     shows the truth after a press inside the clip. */
  global.addEventListener('message', function (e) {
    var f = embeds.filter(function (x) { return x.contentWindow === e.source; })[0];
    if (!f) return;
    var d = null;
    try { d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch (err) { return; }
    if (!d) return;
    var state = null;
    if (d.event === 'onStateChange') state = d.info;
    else if (d.event === 'infoDelivery' && d.info && typeof d.info.playerState === 'number') state = d.info.playerState;
    if (state != null) playing.set(f, state === 1 || state === 3);
    else if (d.event === 'play') playing.set(f, true);
    else if (d.event === 'pause' || d.event === 'ended') playing.set(f, false);
    else if (d.event === 'ready' && isVimeo(f)) listen(f);
    else return;
    syncVideoButtons();
  });
  /* A press inside a clip takes the keyboard into it. Hand it back to the show
     at once, so Next and Previous keep working while the clip plays. */
  global.addEventListener('blur', function () {
    if (!SF.Player.open) return;
    setTimeout(function () {
      var a = document.activeElement;
      if (a && embeds.indexOf(/** @type {any} */ (a)) >= 0) { /** @type {HTMLElement} */ (a).blur(); global.focus(); }
    }, 0);
  });
  /** @param {HTMLElement} node @param {number} i */
  function placeEmbeds(node, i) {
    clearEmbeds();
    if (!player || !SF.videoEmbed || !node) return;
    var deck = player.deck, slide = deck && deck.slides[i];
    if (!slide) return;
    (slide.layers || []).forEach(function (l) {
      if (l.kind !== 'video' || l.visible === false || !l.box || !l.params) return;
      var p = l.params;
      var src = SF.videoEmbed({ video: p.src, videoStart: p.start, videoEnd: p.end, videoMuted: p.muted !== false, videoAutoplay: p.muted !== false && !!p.autoplay, videoLoop: !!p.loop });
      if (!src) return;
      if (/youtube(-nocookie)?\.com\/embed\//.test(src)) src += (src.indexOf('?') < 0 ? '?' : '&') + 'enablejsapi=1&origin=' + encodeURIComponent(location.origin);
      var f = document.createElement('iframe');
      f.className = 'lab-embed';
      f.src = src;
      f.title = l.name || 'Embedded video';
      f.setAttribute('allow', 'accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen');
      f.setAttribute('allowfullscreen', '');
      f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      var b = l.box, W = deck.width || 1920, H = deck.height || 1080;
      f.style.cssText = 'position:absolute;border:0;z-index:5;background:#000;left:' + (b.x / W * 100) + '%;top:' + (b.y / H * 100) + '%;width:' + (b.w / W * 100) + '%;height:' + (b.h / H * 100) + '%';
      f.addEventListener('load', function () { listen(f); });
      playing.set(f, !!(p.autoplay && p.muted !== false));
      node.appendChild(f);
      embeds.push(f);
    });
    syncVideoButtons();
  }

  function stop() {
    clearEmbeds();
    if (railWatch) { railWatch.disconnect(); railWatch = null; }
    if (player) { try { player.destroy(); } catch (e) {} }
    if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
    player = null; canvas = null; byId = {}; deckId = ''; onLab = false; lastWall = -1; shown = {};
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
      clearEmbeds();
      onLab = false;
      if (player) player.pause();
      if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
      syncVideoButtons();
      return;
    }
    if (!player && !start()) return;
    var i = drawnIndex(slide);
    if (i == null) { clearEmbeds(); onLab = false; player.pause(); syncVideoButtons(); return; }
    node.appendChild(canvas);
    /* A redraw of the same slide keeps a clip that is already playing. */
    if (fresh || !embeds.length || embeds[0].parentNode !== node) placeEmbeds(node, i);
    node.classList.add('has-lab-live');
    player.resume();
    syncRail();
    /* A redraw of the same slide (the desk syncing, a repaint) keeps the builds
       already shown; a new slide starts from its beginning, or fully built
       when the show has come back to it. */
    if (!fresh) { onLab = true; syncVideoButtons(); return; }
    var st = player.state();
    var adjacent = onLab && Math.abs(i - st.index) === 1;
    if (adjacent) player.goto(i, i > st.index ? 1 : -1, back);
    else player.cut(i, back);
    onLab = true;
    syncVideoButtons();
  }

  /* ------------------------------------------------- speaker notes on the wall

     The lab's own Present had them: N, or the note button on its HUD, and the
     slide's notes sit in a card at the bottom right of the show. SlideForge's
     player keeps notes to Teacher Presenter, so the card comes with the lab
     into SlideForge's HUD. Off until asked for, because the room can read it. */
  /** @type {HTMLElement|null} */ var notesCard = null;
  var notesOn = false;

  function paintNotes() {
    var root = document.getElementById('player');
    if (!notesOn || !root || !SF.Player.open) { if (notesCard) notesCard.hidden = true; syncNotesButtons(); return; }
    if (!notesCard) {
      notesCard = document.createElement('div');
      notesCard.className = 'lab-notes';
      notesCard.setAttribute('role', 'note');
      notesCard.setAttribute('aria-live', 'polite');
    }
    if (notesCard.parentNode !== root) root.appendChild(notesCard);
    var s = SF.Player.deck && SF.Player.deck.slides[SF.Player.idx];
    var text = String((s && s.notes) || '').trim();
    notesCard.textContent = '';
    var h = document.createElement('h4');
    h.textContent = 'Notes \u00b7 slide ' + (SF.Player.idx + 1);
    notesCard.appendChild(h);
    var body = document.createElement('div');
    body.className = text ? 'lab-notes-body' : 'lab-notes-body lab-notes-none';
    body.textContent = text || 'No notes for this slide.';
    notesCard.appendChild(body);
    notesCard.hidden = false;
    syncNotesButtons();
  }

  function toggleNotes(force) {
    notesOn = typeof force === 'boolean' ? force : !notesOn;
    paintNotes();
  }

  function syncNotesButtons() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-lab-act="notes"]'), function (b) {
      b.setAttribute('aria-pressed', notesOn ? 'true' : 'false');
      b.classList.toggle('on', notesOn);
    });
  }

  function addNotesButtons() {
    var tools = document.getElementById('hudDefaultTools');
    var more = tools && tools.querySelector('[data-act="more"]');
    if (tools && more && !tools.querySelector('[data-lab-act="video"]')) {
      var v = document.createElement('button');
      v.type = 'button';
      v.setAttribute('data-lab-act', 'video');
      v.onclick = function () { toggleVideo(); };
      tools.insertBefore(v, more);
    }
    if (tools && more && !tools.querySelector('[data-lab-act="notes"]')) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('data-lab-act', 'notes');
      b.title = 'Speaker notes on the screen (N)';
      b.setAttribute('aria-label', 'Speaker notes on the screen (N)');
      b.textContent = '\ud83d\uddd2';
      b.onclick = function () { toggleNotes(); };
      tools.insertBefore(b, more);
    }
    var list = document.getElementById('hudMore');
    if (list && !list.querySelector('[data-lab-act="video"]')) {
      var vm = document.createElement('button');
      vm.type = 'button';
      vm.setAttribute('data-lab-act', 'video');
      vm.onclick = function () { toggleVideo(); };
      list.insertBefore(vm, list.firstChild);
    }
    syncVideoButtons();
    if (list && !list.querySelector('[data-lab-act="notes"]')) {
      var m = document.createElement('button');
      m.type = 'button';
      m.setAttribute('data-lab-act', 'notes');
      m.title = 'Speaker notes on the screen (N)';
      m.textContent = 'Speaker notes';
      m.onclick = function () { toggleNotes(); };
      list.insertBefore(m, list.firstChild);
    }
  }

  function onKey(e) {
    if (!SF.Player.open || e.metaKey || e.ctrlKey || e.altKey) return;
    var video = e.key === 'k' || e.key === 'K';
    if (!video && e.key !== 'n' && e.key !== 'N') return;
    var t = /** @type {HTMLElement|null} */ (e.target);
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    if (video) { if (toggleVideo()) e.preventDefault(); return; }
    e.preventDefault();
    toggleNotes();
  }

  /* Next: one build further on the lab slide on the wall, before the show moves on. */
  function step(P, dir) {
    if (!player || !onLab || dir < 0) return false;
    var s = P.deck && P.deck.slides[P.idx];
    if (!isLabSlide(s)) return false;
    if (player.build()) return true;
    /* Present on its own, with no room to mark it: once the question's builds are shown, Next shows
       the lab's answer. Live, the room's reveal does (js/live.js revealNow). A question read before
       it is asked (Definition challenge) is asked first, by SlideForge's own Next. */
    var d = s.design || {};
    if (!d.labReveal || shown[s.id] === 'answer' || (SF.Live && SF.Live.active)) return false;
    if (d.labAsk && shown[s.id] !== 'ask') return false;
    reveal(s);
    return true;
  }

  function install() {
    if (!SF.Player || !SF.Player.on) return;
    SF.Player.on('slide', onSlide);
    SF.Player.on('slide', function () { if (notesOn) paintNotes(); });
    SF.Player.on('close', stop);
    /* Without a live room (Present, Rehearse) the player marks the question itself: a pick on the
       wall or its clock running out shows the lab's answer. Live, revealNow does (js/live.js). */
    function playerRevealed(e) {
      var s = e && e.slide;
      if (s && !(SF.Live && SF.Live.active) && !(e.round)) setTimeout(function () { if (liveRevealed(s)) reveal(s); }, 0);
    }
    SF.Player.on('answer', playerRevealed);
    SF.Player.on('timeup', playerRevealed);
    SF.Player.on('definitionAsk', function (e) {
      var s = e && e.slide;
      if (s && s.design && s.design.labAsk) drawPart(s, 'ask', s.design.labAsk);
    });
    SF.Player.on('close', function () { if (notesCard) notesCard.hidden = true; });
    SF.Player.on('open', paintNotes);
    document.addEventListener('keydown', onKey);
    /* A press on a clip plays or pauses it inside the lab's player: the HUD's button follows. */
    document.addEventListener('click', function () { if (SF.Player.open) setTimeout(syncVideoButtons, 60); }, true);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addNotesButtons);
    else addNotesButtons();
    /* 'open' comes after the first slide is drawn, so it leaves the stage as that set it. */
    SF.Player.on('open', function () {
      /* The keys are the show's now: with the focus left in the lab's frame,
         arrows and Space would go to the editor behind it. */
      var f = document.getElementById('labFrame');
      if (f && document.activeElement === f) { f.blur(); global.focus(); }
    });
  }

  SF.LabStage = { install: install, step: step, stop: stop, reveal: reveal, active: function () { return !!player && onLab; },
    /* For the smokes and for debugging: the lab player on the wall. */
    player: function () { return player; }, notes: toggleNotes, video: toggleVideo };
  install();
})(window);
