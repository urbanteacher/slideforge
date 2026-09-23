/* The teacher's second screen, and the bus that talks to it.
 *
 * Moved out of js/player.js, which was 3,128 lines. This is the window the
 * presenter opens on the other display — how it is placed, what it is told,
 * and the commands it sends back. The room sees the slideshow, the teacher
 * sees this, and the only traffic between them is the bus in here.
 *
 * Seventeen names live here and four leave.
 *
 * `Player` is injected and written onto: openPresenter, hasPresenter and
 * syncPresenter are hung off it here as they always were, and it is the same
 * object js/player.js holds, so that keeps working by reference.
 *
 * `els` reads three nodes that remain js/player.js's own — the deck viewport,
 * the HUD and the cheatsheet. They are accessors, not values, because
 * js/player.js assigns them in build(), which runs after this factory is
 * called; capturing them here would capture nothing. They were declared there
 * as `var root, viewport, hud, hudPos, cheats;`, one statement, which is how a
 * census looking for `var <name>` missed three of them and why the first cut
 * of this move silently broke the desk's wall overlay.
 *
 * `presenterWin` is the one piece of state js/player.js still needs — it
 * focuses the window and asks whether it is open — so it comes back as `win()`
 * rather than the bare variable it used to read.
 */
export function createPresenterWindow(SF, helpers) {
  const {Player, els, showHud, toast, toggleSoloFeedback} = helpers;

  /* ------------------------------------------------------------ presenter view */

  var presenterWin = null;
  /* The room panel's three states as the desk has always heard them. Inside
     the app they are 'rail' and 'focus' — the deck model's own words — and
     this is the single place the older spelling survives, because a desk
     opened before the rename is still comparing against it. Lives here, at
     the wire, rather than beside the state it names. */
  var ROOM_VIEW_WIRE = { hidden: 'hidden', rail: 'beside', focus: 'full' };

  var requestedPresenterPanel = null;
  var PRESENTER_BUS = 'slideforge.presenter.v1';
  var presenterBus = null;
  Player.hasPresenter = function(){return !!(presenterWin && !presenterWin.closed);};

  /** Same-origin desk tabs (no opener) still need a way to find the wall. */
  function presenterChannel() {
    if (presenterBus) return presenterBus;
    if (typeof BroadcastChannel === 'undefined') return null;
    try { presenterBus = new BroadcastChannel(PRESENTER_BUS); }
    catch (e) { return null; }
    presenterBus.onmessage = function (ev) {
      var d = ev.data;
      if (!d || d.type !== 'sf-presenter-cmd') return;
      handlePresenterCommand(d, null);
    };
    return presenterBus;
  }

  /**
   * Send to the desk — as a reply to one, or as news for all of them.
   *
   * The distinction is the whole function. A desk opened by Start has an
   * opener AND joins the channel, and it listens on both, so anything sent
   * by both routes arrives twice. That was invisible for as long as this
   * only carried state: sf-presenter-state is a repaint, and painting twice
   * looks exactly like painting once. sf-share-prep was the first plain
   * EVENT to come this way, and an event delivered twice is two share
   * dialogs stacked exactly on top of each other — which does not look like
   * a bug, it looks like the teacher being asked the same question twice,
   * with a second upload waiting behind the first.
   *
   * So a reply goes to whoever asked, once. Only a broadcast fans out, and
   * it has to: an orphaned presenter.html tab is not presenterWin and can
   * only be reached on the channel, while a desk opened by Start may be
   * there before the channel is.
   *
   * This is the same rule the desk's own sender already follows in the other
   * direction — see SF.deskSend in presenter.html, and the id dedupe in
   * alreadyHandled() that catches what slips past it.
   *
   * @param {object} payload
   * @param {Window|null} [sourceWin] the window that asked, for a reply
   */
  function postPresenter(payload, sourceWin) {
    if (sourceWin) {
      try { sourceWin.postMessage(payload, location.origin); } catch (e) {}
      return;
    }
    if (presenterWin && !presenterWin.closed) {
      try { presenterWin.postMessage(payload, location.origin); } catch (e) {}
    }
    var ch = presenterChannel();
    if (ch) { try { ch.postMessage(payload); } catch (e) {} }
  }

  /**
   * Size and place the desk like PowerPoint presenter view: fill a display,
   * and if a second monitor exists, put this window on it so the wall can
   * stay on the first.
   */
  function screenBox() {
    var scr = (typeof screen !== 'undefined' && screen) ? screen : {};
    return {
      w: Math.max(1100, Number(scr.availWidth) || 1280),
      h: Math.max(680, Number(scr.availHeight) || 800),
      x: typeof scr.availLeft === 'number' ? scr.availLeft : 0,
      y: typeof scr.availTop === 'number' ? scr.availTop : 0
    };
  }

  function presenterWindowFeatures() {
    var box = screenBox();
    var editorX = window.screenX || window.screenLeft || 0;
    var left = box.x;
    /* Editor already on a side monitor → desk on the primary (usually left). */
    if (editorX > 80 && box.x === 0) left = 0;
    return 'popup=yes,width=' + box.w + ',height=' + box.h +
      ',left=' + left + ',top=' + box.y +
      ',menubar=no,toolbar=no,location=no,status=no';
  }

  function placePresenterWindow(win) {
    if (!win || win.closed) return;
    function apply(left, top, w, h) {
      try { if (typeof win.moveTo === 'function') win.moveTo(left, top); } catch (e) {}
      try { if (typeof win.resizeTo === 'function') win.resizeTo(w, h); } catch (e) {}
      try { if (typeof win.focus === 'function') win.focus(); } catch (e) {}
    }
    var box = screenBox();
    var getDetails = /** @type {{ getScreenDetails?: function(): Promise<any> }} */ (window).getScreenDetails;
    if (typeof getDetails !== 'function') {
      apply(box.x, box.y, box.w, box.h);
      return;
    }
    var pending;
    try { pending = getDetails.call(window); } catch (e) { apply(box.x, box.y, box.w, box.h); return; }
    Promise.resolve(pending).then(function (details) {
      if (!win || win.closed) return;
      var screens = (details && details.screens) || [];
      var current = details && details.currentScreen;
      var other = null;
      for (var i = 0; i < screens.length; i++) {
        var s = screens[i];
        if (!current || s.left !== current.left || s.top !== current.top) { other = s; break; }
      }
      /* Two displays: desk fills the other one. One display: fill this one. */
      var target = other || current;
      if (!target) { apply(box.x, box.y, box.w, box.h); return; }
      apply(
        typeof target.availLeft === 'number' ? target.availLeft : target.left,
        typeof target.availTop === 'number' ? target.availTop : target.top,
        target.availWidth || target.width || box.w,
        target.availHeight || target.height || box.h
      );
    }).catch(function () { apply(box.x, box.y, box.w, box.h); });
  }

  Player.openPresenter = function (panel) {
    if(typeof panel==='string') requestedPresenterPanel=panel;
    presenterChannel();
    if (presenterWin && !presenterWin.closed) {
      presenterWin.focus();
      syncPresenter();
      return presenterWin;
    }
    /* Must run in the same click as Teacher Presenter / D. Starting the slideshow
       first does enough DOM that browsers treat this as a blocked pop-up —
       so the window never appeared and the button looked like Present. */
    presenterWin = window.open('presenter.html', 'sf_presenter', presenterWindowFeatures());
    if (!presenterWin || presenterWin.closed) {
      presenterWin = null;
      toast('Teacher Presenter needs a pop-up window. Allow pop-ups for this page, then try again.');
      return null;
    }
    placePresenterWindow(presenterWin);
    setTimeout(syncPresenter, 500);
    return presenterWin;
  };

  function closePresenter() {
    if (presenterWin && !presenterWin.closed) presenterWin.close();
    presenterWin = null;
  }

  /* Exported because the live layer pushes Q&A state as it arrives, and the
     presenter window is the only place pending questions are shown. It was
     called as Player.syncPresenter from the start; it was never actually on
     Player, so every Q&A push threw instead of refreshing that window. */
  /* What is covering the wall right now, for the desk's "On screen now".
     Focus (leaderboard / responses / race) already travelled this way; Join QR
     did not, so teachers had to leave Presenter to see the very overlay they
     had just turned on. Same markup as the wall — stripped of entrance
     animation so a sync does not flicker it. */
  function wallOverlayMarkup() {
    if (typeof document === 'undefined') return null;
    var card = document.getElementById('joincard');
    if (card && card.classList.contains('on')) {
      var body = card.firstElementChild || card;
      var join = document.createElement('div');
      join.className = 'desk-join-mirror';
      join.appendChild(body.cloneNode(true));
      var dismiss = join.querySelector('.dismiss');
      if (dismiss) dismiss.textContent = 'On the wall — J or Esc to dismiss';
      return join.outerHTML;
    }
    if (!Player._focus || !els.viewport()) return null;
    var node = els.viewport().querySelector('[data-overlay]');
    if (!node) return null;
    var copy = node.cloneNode(true);
    copy.classList.remove('entering', 'tr-fade');
    copy.removeAttribute('data-overlay');
    copy.removeAttribute('style');
    return copy.outerHTML;
  }

  /* The room rail beside the slide — same reason as the full overlay. */
  function wallRailMarkup() {
    if (!Player._rail || Player._focus) return null;
    var card = document.getElementById('joincard');
    if (card && card.classList.contains('on')) return null;
    var copy = Player._rail.cloneNode(true);
    copy.classList.add('desk-wall-rail');
    copy.removeAttribute('style');
    return copy.outerHTML;
  }

  function syncPresenter() {
    var deck = Player.deck;
    if (!deck) return;
    if (presenterWin && presenterWin.closed) presenterWin = null;
    /* An orphaned presenter.html tab has no opener and is not presenterWin —
       still broadcast so Host live / D can fill that desk. */
    if ((!presenterWin || presenterWin.closed) && !presenterChannel()) return;
    try {
      var payload = {
        type: 'sf-presenter-state',
        teacherUrl: SF.Live && SF.Live.teacherWorkspaceUrl ? SF.Live.teacherWorkspaceUrl() : null,
        requestedPanel: requestedPresenterPanel,
        moment: Player.lessonMoment ? Player.lessonMoment() : null,
        /* The desk shows how many have answered and offers to end it, so it
           needs the poll's own state rather than inferring one from the
           room pulse — which is silent when nobody has replied yet. */
        quizGenBusy: !!Player.quizGenBusy,
        quickPoll: (SF.Live && SF.Live.customPromptOpen && SF.Live.customPromptOpen())
          ? {
              prompt: SF.Live.prompt.prompt,
              kind: SF.Live.prompt.kind,
              presentAs: SF.Live.prompt.presentAs,
              /* What the room is choosing between. The desk used to be told
                 the question and the count of replies but never the answers
                 on offer, so a teacher running a poll from the desk could see
                 that eleven people had voted without being able to see what
                 they were voting on — the options were only ever on the wall
                 and on the phones. */
              options: (SF.Live.prompt.options || []).slice(),
              /* A scale's options are just '1'..'n'; what the numbers mean is
                 in `ends`, and without it "1 to 5" tells a teacher nothing. */
              ends: SF.Live.prompt.ends || null,
              max: SF.Live.prompt.max || 1,
              answered: SF.Live.digest ? (SF.Live.digest.answered || 0) : 0,
              players: SF.Live.digest ? (SF.Live.digest.players || 0) : (SF.Live.players || []).length,
              live: !!SF.Live.active
            }
          : null,
        roomPulse: SF.Live && SF.Live.presenterPulse ? SF.Live.presenterPulse() : null,
        deck: Player.spontaneous
          ? Object.assign({}, deck, { slides: Player.spontaneous.slides, title: Player.spontaneous.title || deck.title })
          : deck,
        index: Player.spontaneous ? Player.spontaneous.index : Player.idx,
        lessonIndex: Player.idx,
        spontaneous: Player.spontaneous
          ? {
              id: Player.spontaneous.id,
              title: Player.spontaneous.title,
              index: Player.spontaneous.index,
              total: Player.spontaneous.slides.length
            }
          : null,
        answers: Player.answers,
        ...(SF.Boards && SF.Boards.snapshot ? SF.Boards.snapshot(Player) : {}),
        chainLinks: Player.chainLinks || [],
        chainPending: Player.chainPending || '',
        startedAt: Player.started,
        /* Pending questions travel to presenter view and nowhere else: the
           host's own screen is usually the projected one. */
        qa: Player.qa || null,
        /* Pace and confidence go the same way. The wall gets a count on a
           spike; the detail is for whoever is teaching. */
        pace: Player.pace || null,
        confidence: Player.confidence || null,
        /* What the next press will do, so the private screen can say it in
           words rather than a tooltip nobody hovers mid-lesson. */
        exploreStates: Player.exploreStates || {},
        nextAction: (SF.Explore && SF.Explore.nextAction(Player)) || ((SF.Live && SF.Live.nextAction) ? SF.Live.nextAction() : 'advance'),
        /* "3 unanswered", "12 waiting" — the cues that tell the host whether
           to wait or move on. Only meaningful live, null otherwise. */
        progress: Player._liveProgress || null,
        revealStep: Player.revealStep || 0,
        effectiveTimeLimit: SF.questionTimeLimit(deck.slides[Player.idx], SF.Live && SF.Live.active && SF.Live.players.some(function(p){return p.manual;})),
        waiting: Player.waiting || 0,
        frozen: !!Player.frozen,
        /* Desk mirrors HUD labels — blank wall, room rail, live toggles. */
        blank: !!Player.blank,
        live: !!(SF.Live && SF.Live.active),
        /* Desk chrome shows the PIN without forcing Join QR on the wall. */
        pin: (SF.Live && SF.Live.pin) || null,
        joinUrl: (SF.Live && SF.Live.joinUrl) || '',
        reactions: !(SF.Live && SF.Live.reactions === false),
        phonesBlank: !!(SF.Live && SF.Live.phonesBlank),
        floor: (SF.Live && SF.Live.floor) || 'auto',
        /* Legacy tokens on the wire: a desk still open from before the
           rename compares against these. New desks accept either. */
        roomView: ROOM_VIEW_WIRE[Player.roomSidebarState ? Player.roomSidebarState() : 'hidden'],
        /* So the desk can show the pen as held, and which tool it is. */
        inkOn: !!(SF.Teaching && SF.Teaching.isOpen && SF.Teaching.isOpen()),
        inkMode: (SF.Teaching && SF.Teaching.mode) ? SF.Teaching.mode() : '',
        /* The leaderboard, the responses, the race track and the Join QR card
           all cover the wall; the room rail sits beside it. All of them used
           to be invisible from the desk — its preview drew only the slide and
           called itself "On screen now". Send the live markup so the desk
           shows the same thing without leaving Presenter. */
        wallOverlay: wallOverlayMarkup(),
        wallRail: wallRailMarkup(),
        focusOn: !!Player._focus,
        focusKind: (SF.Live && SF.Live.active && SF.Live.expandKind)
          ? SF.Live.expandKind() : null,
        pollOpen: !!(SF.Live && SF.Live.customPromptOpen && SF.Live.customPromptOpen()),
        joinCard: (function () {
          if (typeof document === 'undefined') return false;
          var card = document.getElementById('joincard');
          return !!(card && card.classList.contains('on'));
        })(),
        fullscreen: typeof document !== 'undefined'
          && !!(document.fullscreenElement
            || /** @type {any} */ (document).webkitFullscreenElement)
      };
      postPresenter(payload);
      requestedPresenterPanel=null;
    } catch (e) { /* window closing */ }
  }

  /* A command carrying an id is acted on once, however many routes it came
     by. The desk sends one way now, and this is what makes a second route —
     a mirrored desk, a channel that outlives a reload — harmless rather than
     a toggle that cancels itself. Bounded, because inking sends a command
     per pointer move. */
  var seenCmds = [];
  function alreadyHandled(d) {
    if (!d || !d.id) return false;
    if (seenCmds.indexOf(d.id) >= 0) return true;
    seenCmds.push(d.id);
    if (seenCmds.length > 60) seenCmds.shift();
    return false;
  }

  function handlePresenterCommand(d, sourceWin) {
    if (!d || d.type !== 'sf-presenter-cmd') return;
    if (alreadyHandled(d)) return;
    if (d.cmd === 'goto') Player.goTo(d.index);
    else if (d.cmd === 'hello') syncPresenter();
    /* Inking driven from the desk. A bare `ink` is still the toggle the HUD
       sends; only a command carrying an action is the pen itself.
       A stroke must not sync the desk back. Syncing redraws its preview, and
       the drawing surface hangs on the very node that redraw replaces — so
       echoing a stroke back tore the pen out of the teacher's hand halfway
       through the line they were drawing. The desk already knows what it
       drew; it is the wall that needed telling. */
    else if (d.cmd === 'ink' && d.action && SF.Teaching && SF.Teaching.remote) {
      SF.Teaching.remote(d.action, d);
      if (d.action !== 'begin' && d.action !== 'move' && d.action !== 'end') syncPresenter();
    }
    else if (SF.Boards && SF.Boards.command && SF.Boards.command(d.cmd, d.action, d.card)) {}
    else if (d.cmd === 'moment' && Player.momentCommand) Player.momentCommand(d);
    else if (d.cmd === 'quickPoll') Player.quickPoll(d);
    else if (d.cmd === 'explore' && SF.Explore) SF.Explore.command(Player,d.action,d.value);
    else if (d.cmd === 'quizGen') Player.quizGen(d);
    else if (d.cmd === 'activity' && SF.LiveActivities) {
      Promise.resolve().then(function () { return SF.LiveActivities.handle(d); }).then(function (result) {
        postPresenter({ type: 'sf-activity-result', requestId: d.requestId, result: result }, sourceWin);
      }).catch(function (error) {
        postPresenter({ type: 'sf-activity-result', requestId: d.requestId, error: error.message || 'Could not complete this activity action.' }, sourceWin);
      });
    }
    else if (d.cmd === 'qa') Player.emit('qaCommand', d);
    else if (d.cmd === 'sharePrep') {
      var doc = null;
      try {
        if (SF.Shell && typeof SF.Shell.lessonDoc === 'function') doc = SF.Shell.lessonDoc();
      } catch (e) { doc = null; }
      if (!doc && Player.deck) doc = Player.deck;
      postPresenter({
        type: 'sf-share-prep',
        doc: doc,
        live: !!(SF.Live && SF.Live.active)
      }, sourceWin);
    }
    else if (d.cmd === 'shareWatch') {
      var ok = !!(SF.Live && SF.Live.watchOn && SF.Live.watchOn(d.id));
      postPresenter({ type: 'sf-share-watch', ok: ok, id: d.id || null }, sourceWin);
    }
    /* Desk drives the wall the same way the HUD does — prev/next/blank/
       freeze/exit and every room tool share Player.control. */
    else if (typeof Player.control === 'function') Player.control(d.cmd);
  }

  Player.syncPresenter = syncPresenter;

  window.addEventListener('message', function (ev) {
    var d = ev.data;
    if (ev.origin!==location.origin || !d || d.type !== 'sf-presenter-cmd') return;
    if (presenterWin && ev.source !== presenterWin) return;
    handlePresenterCommand(d, ev.source);
  });

  /**
   * An impromptu poll, asked from the presenter desk or from this screen.
   * The work is all SF.Live's — this is the one door both routes come
   * through, so the desk and the `V` key cannot drift apart.
   */
  Player.quickPoll = function (d) {
    d = d || {};
    if (!SF.Live) return false;
    if (d.action === 'end') return SF.Live.endCustomPrompt();
    if (d.action === 'where') {
      /* Moving a live poll between full screen and the rail must not restart
         it — the room has already answered. */
      if (!SF.Live.customPromptOpen || !SF.Live.customPromptOpen()) return false;
      SF.Live.setPromptPresentAs(d.presentAs === 'rail' ? 'rail' : 'focus');
      syncPresenter();
      return true;
    }
    if (d.action === 'join') { Player.emit('joinToggle', {}); return true; }
    return SF.Live.startCustomPrompt(d);
  };

  /**
   * Build a quiz on a theme and put it over the lesson already running.
   *
   * The questions go up as a spontaneous overlay rather than being spliced
   * into the deck: the lesson keeps its place and its live session, and Esc
   * or End hands the wall straight back without the teacher having to undo
   * anything. Starting the quiz as its own show would end the lesson they are
   * in the middle of, and a live room would have to rejoin.
   *
   * They are quiz slides like any other, so the relay still sends a question
   * when the host lands on one — see Player.wallSlide, which is what the live
   * marking reads so a check inside an overlay marks the overlay's question
   * and not whatever lesson slide is underneath.
   *
   * Nothing goes up unless questions came back, so a failed generation leaves
   * the wall exactly as it was.
   */
  Player.quizGen = function (d) {
    d = d || {};
    if (!Player.open || !Player.deck) return Promise.resolve({ error: 'Nothing is being presented.' });
    if (!SF.AI || !SF.AI.generateQuestionsForGame || !SF.createPresetGame) {
      return Promise.resolve({ error: 'The AI engine is not loaded.' });
    }
    var topic = String(d.topic || '').trim();
    if (!topic) return Promise.resolve({ error: 'Give it a theme to write about.' });

    var style = d.style || 'choice';
    var game = SF.createPresetGame(style, { title: topic }, Player.deck.theme);
    /* Written from scratch for this moment: the preset's own seed questions
       are about someone else's topic. */
    game.questions = [];
    Player.quizGenBusy = true;
    syncPresenter();

    return Promise.resolve(SF.AI.generateQuestionsForGame(game, {
      topic: topic, notes: d.keywords, count: d.count
    })).then(function (res) {
      Player.quizGenBusy = false;
      if (!res || res.error) { syncPresenter(); return res || { error: 'Nothing came back.' }; }

      game.questions = res.questions;
      if (SF.GameStore) SF.GameStore.save(game);

      /* Questions only. An intro card, a How to play and a scoreboard belong
         to a game a teacher sat down and built; one asked for between two
         slides interrupts a lesson already in flight, and the room has just
         been answering on the same phones. */
      game.settings.howTo = false;
      var slides = SF.compileGame(game, { intro: false, scoreSlide: false });
      if (!slides.length) { syncPresenter(); return { error: 'Nothing to show.' }; }

      /* Desk quizzes are spontaneous overlays — never splice into the lesson. */
      Player.openSpontaneous({
        id: game.id || SF.uid(),
        title: topic,
        slides: slides,
        game: game
      });
      syncPresenter();
      return { added: slides.length, rejected: res.rejected, gameId: game.id, overlay: true };
    }).catch(function () {
      Player.quizGenBusy = false;
      syncPresenter();
      return { error: 'Could not write a quiz just now.' };
    });
  };

  /* ------------------------------------------------------------ keyboard */

  /* Type a slide number and press Enter, as in Google Slides and reveal.js.
     The number is the one on the wall: the show's deck is the run deck, so a
     slide's number is its place in it. */
  var jumpDigits = '';
  var jumpTimer = null;
  function clearJump() { jumpDigits = ''; clearTimeout(jumpTimer); jumpTimer = null; }
  function goToTyped() {
    var n = parseInt(jumpDigits, 10);
    clearJump();
    var count = Player.deck ? Player.deck.slides.length : 0;
    if (n >= 1 && n <= count) Player.goTo(n - 1, n - 1 >= Player.idx ? 1 : -1);
    else toast('There is no slide ' + n + ' — this show has ' + count);
    showHud();
  }

  document.addEventListener('keydown', function (e) {
    if (!Player.open) return;
    var target = /** @type {Element | null} */ (e.target);
    var k = e.key;
    if ((target && target.closest('input,textarea,select,[contenteditable=true]')) || e.metaKey || e.ctrlKey || (e.altKey && k !== 'f' && k !== 'F')) return;
    /* A slide number being typed takes Enter even on a focused button: after
       clicking Present the focus is still on it, and that Enter was left to
       the button, so "12, Enter" did nothing. */
    if (k === 'Enter' && jumpDigits && !Player.shareMode && Player.deck) {
      e.preventDefault();
      goToTyped();
      return;
    }
    if ((target && target.closest('button,a')) && (k==='Enter'||k===' ')) return;

    /* Shared view: arrows / space / click only. Esc must not blank the page. */
    if (Player.shareMode) {
      switch (k) {
        case 'ArrowRight': case 'ArrowDown': case ' ': case 'PageDown': case 'Enter': case 'n':
          e.preventDefault(); Player.next(); break;
        case 'ArrowLeft': case 'ArrowUp': case 'PageUp': case 'p':
          e.preventDefault(); Player.prev(); break;
        case 'Home': e.preventDefault(); Player.goTo(0, -1); break;
        case 'End': e.preventDefault(); if (Player.deck) Player.goTo(Player.deck.slides.length - 1, 1); break;
        case 'f': case 'F': e.preventDefault(); Player.control('full'); break;
        case 'Escape': e.preventDefault(); break;
        default: break;
      }
      showHud();
      return;
    }

    if ((k === 'f' || k === 'F') && e.altKey) {
      e.preventDefault();
      Player.control('freeze');
      showHud();
      return;
    }

    var hudMore = document.getElementById('hudMore');
    if(k==='Escape' && hudMore && !hudMore.hidden){
      e.preventDefault();
      hudMore.hidden=true;
      var moreBtn = els.hud() && els.hud().querySelector('[data-act=more]');
      if (moreBtn) moreBtn.setAttribute('aria-expanded','false');
      return;
    }

    if (!Player.shareMode && !Player.spontaneous && Player.deck) {
      if (/^[0-9]$/.test(k)) {
        var onWall = Player.wallSlide();
        /* A digit on an unanswered question answers it in solo mode, as it
           always has — unless a number is already being typed, so "12" can
           still be reached from a question slide. */
        var answering = !jumpDigits && /^[1-6]$/.test(k) && !(SF.Live && SF.Live.active) &&
          onWall && onWall.type === 'quiz' && Player.answers[onWall.id] == null;
        if (!answering && (jumpDigits || k !== '0')) {
          e.preventDefault();
          jumpDigits = (jumpDigits + k).slice(0, 4);
          clearTimeout(jumpTimer);
          jumpTimer = setTimeout(clearJump, 2500);
          toast('Go to slide ' + jumpDigits + ' — press Enter');
          return;
        }
      } else if (k === 'Escape' && jumpDigits) {
        e.preventDefault();
        clearJump();
        return;
      } else if (k === 'Backspace' && jumpDigits) {
        e.preventDefault();
        jumpDigits = jumpDigits.slice(0, -1);
        if (jumpDigits) toast('Go to slide ' + jumpDigits + ' — press Enter');
        else clearJump();
        return;
      }
    }

    if (els.cheats() && els.cheats().classList.contains('on') && k !== '?' && k !== '/') {
      els.cheats().classList.remove('on');
      if (k === 'Escape') { e.preventDefault(); return; }
    }

    /* On an unanswered question the answer letters win over the show controls
       that share them (B blank, D presenter, F fullscreen, P prev, N next) —
       answering is what you actually want mid-question. Once the answer is in,
       those keys go back to their normal jobs. */
    if (!Player.deck) return;
    var live = Player.wallSlide();
    if (!(SF.Live && SF.Live.active) && live && live.type === 'quiz' && Player.answers[live.id] == null && /^[a-f]$/i.test(k)) {
      var pick = SF.LETTERS.indexOf(k.toUpperCase());
      if (pick > -1 && pick < live.options.length) {
        e.preventDefault();
        Player.answer(pick);
        showHud();
        return;
      }
    }

    switch (k) {
      case 'ArrowRight': case 'ArrowDown': case ' ': case 'PageDown': case 'Enter': case 'n':
        e.preventDefault(); Player.next(); break;
      case 'ArrowLeft': case 'ArrowUp': case 'PageUp': case 'p':
        e.preventDefault(); Player.prev(); break;
      case 'Home': e.preventDefault(); Player.goTo(0, -1); break;
      case 'End': e.preventDefault(); if (Player.deck) Player.goTo(Player.deck.slides.length - 1, 1); break;
      case 'v': case 'V':
        e.preventDefault(); Player.control('poll'); break;
      case 'Escape':
        e.preventDefault();
        var jc = document.getElementById('joincard');
        if (jc && jc.classList.contains('on')) {
          Player.emit('joinToggle', { close: true });
        } else if (Player._focus) {
          if (SF.Live && SF.Live.active) Player.emit('focusToggle', { close: true });
          else toggleSoloFeedback({ close: true });
        } else if (SF.Teaching && SF.Teaching.isOpen && SF.Teaching.isOpen()) {
          SF.Teaching.toggleBar(false);
        } else if (Player.spontaneous) {
          Player.endSpontaneous();
        } else {
          Player.close();
        }
        break;
      /* B and . blank the wall; Shift+B blanks the phones. Two screens, two
         blanks, and one case for the letter — a switch cannot hold two
         `case 'B'`, because the first one wins and the second is dead code.
         It did: Shift+B blanked the wall and the phones could not be blanked
         at all. Caps Lock sends 'B' with shiftKey false, so the wall is the
         default rather than the shifted branch. */
      case 'b': case 'B': case '.':
        e.preventDefault();
        if (e.shiftKey) Player.emit('blankPhonesToggle', {});
        else Player.control('blank');
        break;
      case 'f': case 'F': e.preventDefault(); Player.control('full'); break;
      case 'r': case 'R': e.preventDefault(); Player.resetScores(); break;
      case 'd': case 'D': e.preventDefault(); Player.control('presenter'); break;
      case 'e': case 'E':
        e.preventDefault();
        Player.control('focus');
        break;
      case 's': case 'S':
        e.preventDefault();
        Player.control('rail');
        break;
      case 'j': case 'J':
        e.preventDefault();
        Player.control('join');
        break;
      /* T for thumbs. A live control rather than a setting, because switching
         reactions off matters in the moment they are being abused. */
      case 't': case 'T': e.preventDefault(); Player.emit('reactionsToggle', {}); break;
      case 'H': if (e.shiftKey) { e.preventDefault(); Player.emit('floorCycle', {}); } break;
      case 'w': case 'W': e.preventDefault(); Player.control('who'); break;
      /* I opens the pen, not P — P is already Previous, and a pen that also
         went back a slide would be found the hard way. X clears the ink,
         which is the one thing that has to work without looking. */
      case 'i': case 'I':
        e.preventDefault();
        Player.control('ink');
        break;
      case 'z': case 'Z':
        e.preventDefault();
        if (SF.Teaching && SF.Teaching.isOpen && SF.Teaching.isOpen()) {
          SF.Teaching.undo();
        } else {
          Player.control('freeze');
        }
        break;
      case 'x': case 'X':
        e.preventDefault();
        if (SF.Teaching) SF.Teaching.clear();
        break;
      case 'o': case 'O': e.preventDefault(); if (Player.toggleOverview) Player.toggleOverview(); break;
      case '?': case '/': e.preventDefault(); if (els.cheats()) els.cheats().classList.toggle('on'); break;
      default:
        if (!(SF.Live && SF.Live.active) && /^[1-6]$/.test(k)) { e.preventDefault(); Player.answer(Number(k) - 1); }
    }
    showHud();
  });

  return {
    syncPresenter: syncPresenter,
    presenterChannel: presenterChannel,
    closePresenter: closePresenter,
    /* The live handle, not a copy: js/player.js focuses this window and asks
       whether the teacher has closed it. */
    win: function () { return presenterWin; }
  };
}
