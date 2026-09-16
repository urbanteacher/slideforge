/* SlideForge — live audience mode (host side).
   Phones join with a PIN, answer each quiz slide on their own screen, and the
   room's answers roll up into a tally and a leaderboard on the projected deck.
   Needs the bundled relay: `node server/server.js`. Without it, everything
   else in SlideForge still works — this is the one feature that can't run
   from a bare file:// page, because the phones have to reach something. */
(function (global) {
  'use strict';

  /** @type {import("../src/types.js").SlideForgeGlobal} */
  var SF = global.SF;
  var el = SF.el;

  /** @type {Record<string, any>} */
  var Live = {
    ws: null,
    pin: null,
    players: [],
    deck: null,
    active: false,
    revealed: {},        // slideId -> true
    _sentSlide: null,
    _askedAt: 0,
    mode: 'individual',
    teams: [],
    rows: [],
    counts: null,
    joinUrl: '',
    joinOpen: true,
    waiting: 0,
    roundNo: 0,
    roundGame: null,
    /* Horse race: steps taken per lane key, and who has crossed the line. */
    mechanic: 'points',
    trackLength: 5,
    pos: {},
    winners: [],
    /* Boss battle: shared HP and the damage dealt this reveal. */
    bossHp: 0,
    bossMax: 0,
    /* Word Reveal: how many letters are currently on the wall. */
    dripShown: 0,
    dripTimer: null,
    dripWord: '',
    /* The feedback prompt open on the current slide, and the room's replies. */
    prompt: null,
    digest: null,
    focus: false,
    qa: null,
    /* The room's answers to the question on screen, as the relay last pushed
       them, with the revision they were taken at. The host marks from this —
       see marksFor() and the note on SF.markResponse. */
    snapshot: { rev: 0, answers: [] },
    /* How the room says the lesson is going. Counts only, never names — see
       the note on room.signals in the relay. */
    signals: null,
    /* Whether the room may react. Session-scoped and live-togglable with T,
       because that is what host-togglable has to mean for something social. */
    reactions: true
  };

  var reactionCounts={},reactionSlide=null,bookmarkState=null;
  Live.presenterPulse=function(){var slide=SF.Player.deck&&SF.Player.deck.slides[SF.Player.idx];return {active:!!Live.active,reactions:slide&&reactionSlide===slide.id?reactionCounts:{},bookmarks:slide&&bookmarkState&&bookmarkState.slideId===slide.id?bookmarkState.count:0,feedback:Live.prompt?Live.digest:null,prompt:Live.prompt};};

  var manualWindow = null, manualChannel=null, manualKey=null, manualView='roster', lastReport=null;
  function syncManual() {
    if((!manualWindow || manualWindow.closed) && !manualChannel) return;
    var slide = SF.Player.open && SF.Player.deck.slides[SF.Player.idx];
    var state={type:'sf-manual-state',active:!!Live.pin,showing:!!(SF.Player&&SF.Player.open),live:!!Live.active,view:manualView,report:lastReport,players:Live.players,teams:Live.teams,mode:Live.mode,pin:Live.pin||null,
      question:slide && slide.type==='quiz' ? {id:slide.id,question:slide.question,input:slide.input || 'choice',options:slide.options,range:slide.input==='number'?{min:slide.min,max:slide.max,step:slide.step,unit:slide.unit||''}:null,revealed:!!Live.revealed[slide.id]} : null,
      answers:(Live.snapshot.answers || []).map(function(a){
        /* Marked here, where the answer key is, and only after the reveal.
           Before that the teacher window has no business knowing — it is the
           same withholding the wall does, and it keeps a glance at the
           laptop from ending a peer-instruction vote early. */
        var shown = slide && slide.type==='quiz' && Live.revealed[slide.id];
        return {id:a.id,response:a.response,sure:a.sure,
          right: shown && SF.markResponse ? SF.markResponse(slide,a.response) : null};
      })};
    /* Guarded: a detached window can be closing, navigated away or otherwise
       not in a state to be posted to, and this runs inside Live.stop() —
       letting it throw would leave a room half shut down. The channel is the
       path that actually matters; the window is a convenience. */
    try { if(manualWindow && !manualWindow.closed) manualWindow.postMessage(state,location.origin); }
    catch(e){ manualWindow=null; }
    if(manualChannel) manualChannel.postMessage(state);
  }
  function manualUrl(){
    if(!manualKey){
      manualKey=Array.from(crypto.getRandomValues(new Uint8Array(16))).map(function(n){return n.toString(16).padStart(2,'0');}).join('');
      manualChannel=new BroadcastChannel('sf-manual-'+manualKey);
      manualChannel.onmessage=function(e){manualCommand(e.data);};
    }
    return 'manual.html#'+manualKey;
  }

  // Presenter and setup reuse the same room channel and teacher workspace.
  Live.teacherWorkspaceUrl = manualUrl;

  /* In the app by default.
     Two pop-up windows — this and presenter view — meant three things to
     arrange on one laptop screen before a lesson could start, and a blocked
     pop-up meant a feature that simply did not appear. The panel is a normal
     dialog; detaching it is a choice for people with a second screen rather
     than the only way in. */
  /* One Entry surface. The iframe and the popped window share one channel —
     if both are loaded, every name and every mark is sent twice. */
  function entryWindowOpen() {
    return !!(manualWindow && !manualWindow.closed);
  }

  function loadEntryFrame() {
    var frame=document.getElementById('teachFrame');
    if(!frame) return;
    var url=manualUrl();
    if(frame.getAttribute('src')!==url) frame.setAttribute('src',url);
  }

  function unloadEntryFrame() {
    var frame=document.getElementById('teachFrame');
    if(frame) frame.setAttribute('src','about:blank');
  }

  Live.openManual = function() {
    var modal = /** @type {HTMLDialogElement|null} */ (document.getElementById('teachModal'));
    if(!modal) return Live.popManual();
    // During a show the main window is projected. Open classroom controls
    // inside the private presenter workspace instead of over the slide.
    if(SF.Player && SF.Player.open) return SF.Player.openPresenter('roster');
    /* Already detached: do not also mount the iframe. */
    if(entryWindowOpen()){ try{manualWindow.focus();}catch(e){} return; }
    loadEntryFrame();
    if(!modal.open) modal.showModal();
    teachTab('entry');
    /* Re-push the live roster. Closing this dialog used to look like a wipe
       because the frame reloaded and sat empty until something else arrived. */
    setTimeout(function(){ syncManual(); Live.paintEntryRoster(); }, 50);
  };

  Live.popManual = function() {
    if(SF.Player && SF.Player.open) return SF.Player.openPresenter('roster');
    var url=manualUrl();
    var link = /** @type {HTMLAnchorElement|null} */ (document.getElementById('manualFallback'));
    if(!link){
      link=document.createElement('a');link.id='manualFallback';link.textContent='Open private teacher controls in a tab';link.target='_blank';
      var lobbyStart = document.getElementById('lobbyStart');
      if (lobbyStart && lobbyStart.parentNode) lobbyStart.parentNode.appendChild(link);
    }
    if (link) link.href=url;
    /* Blanked, or the embedded copy and the detached one both answer the same
       channel and the teacher sees their clicks land twice. */
    unloadEntryFrame();
    var modal = /** @type {HTMLDialogElement|null} */ (document.getElementById('teachModal'));
    if(modal && modal.open) modal.close();
    manualWindow=window.open(url,'slideforge-teacher','width=760,height=780');
    if(!manualWindow){
      /* Blocked mid-show. Never silently fall back to the embedded panel —
         that is the case this whole branch exists to avoid. */
      SF.toast(SF.Player && SF.Player.open
        ? 'Pop-ups are blocked. Allow them, or leave the show to use teacher entry — it would be on the projector here.'
        : 'Pop-ups are blocked \u2014 use the link under the lobby buttons');
    }
    else manualWindow.focus();
  };

  /** Which half of the panel is showing. */
  function teachTab(which){
    var panes={entry:'teachFrame',mark:'teachFrame',questions:'teachQuestions',overview:'teachOverview',tools:'teachFrame'};
    var tf = document.getElementById('teachFrame');
    if(!tf) return;
    var onFrame=which==='entry'||which==='mark'||which==='tools';
    tf.classList.toggle('teach-away', !onFrame);
    ['teachQuestions','teachOverview'].forEach(function(id){
      var n=document.getElementById(id);
      if(n) n.hidden = panes[which]!==id;
    });
    document.querySelectorAll('[data-teach]').forEach(function(b){
      var btn = /** @type {HTMLElement} */ (b);
      btn.setAttribute('aria-selected',String(btn.dataset.teach===which));
    });
    if(which==='entry'||which==='mark'||which==='tools'){
      manualView=which==='entry'?'roster':which;
      syncManual();
      Live.paintEntryRoster();
    } else {
      var roster=document.getElementById('teachRoster');
      if(roster) roster.hidden=true;
    }
    /* Both overviews read the same session report, so either tab asks for a
       fresh one and whichever is open draws it. */
    if(which==='questions'||which==='overview') Live.refreshOverview();
  }

  /* The class overview is the session report, drawn as a grid. Asking the
     relay for it rather than accumulating a second copy on the host means it
     matches the report and the CSV exactly, including teacher-entered
     answers and anyone who reconnected. */
  var overviewTimer = null;
  var classView = { names: true, responses: true, results: true };
  Live.refreshOverview = function(){
    var open = /** @type {HTMLElement[]} */ ([document.getElementById('teachQuestions'),document.getElementById('teachOverview')]
      .filter(function(n){return n && !n.hidden;}));
    if(!Live.pin){
      open.forEach(function(n){
        var which=n.id==='teachQuestions'
          ? 'What they chose — bars for each check. Host live, then open a quiz slide.'
          : 'Class overview — one row per person, names under the Class totals. Host live, then open a quiz slide.';
        n.replaceChildren(SF.el('p','report-empty',which));
      });
      return;
    }
    if(lastReport) Live.paintOverview(lastReport);
    else {
      var over=document.getElementById('teachOverview');
      if(over && !over.hidden && SF.rosterManage){
        over.replaceChildren(SF.el('p','report-empty','Reading the room\u2026'));
        over.appendChild(SF.rosterManage(Live.players||[], rosterActions()));
      }
    }
    /* Roster and tally arrive in bursts. One report read is the same journal
       the CSV uses — do not ask for a new projection on every packet. */
    if(overviewTimer) return;
    overviewTimer=setTimeout(function(){ overviewTimer=null; send({t:'report'}); }, 200);
    open.forEach(function(n){ if(!n.childNodes.length) n.replaceChildren(SF.el('p','report-empty','Reading the room\u2026')); });
  };

  function rosterActions(){
    return {
      onEdit: function(p){
        SF.askText({ title: 'Name for this learner', value: p.name || '',
          placeholder: 'Their name' }, function(next){
            if(next===p.name) return;
            send({t:'manualRename',playerId:p.id,name:next});
          });
      },
      onKick: function(p){
        SF.ask({ title: 'Kick ' + p.name + ' from this room?',
          detail: 'Their phone disconnects. They can rejoin with the PIN.',
          confirm: 'Kick', danger: true }, function(){
            send({t:'manualRemove',playerId:p.id,mode:'kick'});
          });
      },
      onDelete: function(p){
        SF.ask({ title: 'Delete ' + p.name + ' from the class list?',
          detail: 'Their answers so far stay in the session record.',
          confirm: 'Delete', danger: true }, function(){
            send({t:'manualRemove',playerId:p.id,mode:'delete'});
          });
      }
    };
  }

  Live.paintEntryRoster = function(){
    var box=document.getElementById('teachRoster');
    if(!box || !SF.rosterManage) return;
    // The classroom frame owns the searchable roster.
    box.hidden=true;
  };

  Live.paintOverview = function(report){
    var live=SF.liveClassReport?SF.liveClassReport(report):report;
    var qs=document.getElementById('teachQuestions');
    if(qs && !qs.hidden && SF.questionOverview){
      qs.replaceChildren();
      if(SF.gridReadout) qs.appendChild(SF.gridReadout(live));
      qs.appendChild(SF.el('p','report-note','What the room chose, check by check. The correct answer is only marked once you have revealed it. A tall wrong bar after reveal is a misconception with a name.'));
      qs.appendChild(SF.questionOverview(live));
    }
    var over=document.getElementById('teachOverview');
    if(over && !over.hidden && SF.answerGrid){
      over.replaceChildren();
      if(SF.gridReadout) over.appendChild(SF.gridReadout(live));
      var toggles=SF.el('div','grid-toggles');
      [['names','Names'],['responses','What they said'],['results','Right and wrong']].forEach(function(pair){
        var lab=SF.el('label','grid-toggle');
        var box=document.createElement('input');
        box.type='checkbox';box.checked=classView[pair[0]];
        box.onchange=function(){ classView[pair[0]]=box.checked; Live.paintOverview(report); };
        lab.appendChild(box);
        lab.appendChild(document.createTextNode(' '+pair[1]));
        toggles.appendChild(lab);
      });
      over.appendChild(toggles);
      over.appendChild(SF.el('p','report-note','Edit, kick or delete anyone in In the room. The Class row is the diagnostic. Under 60% is the same reteach line Adapt uses. Hide names if this screen might be seen; hide results while a vote is still live.'));
      over.appendChild(SF.answerGrid(live,{
        names:classView.names,
        responses:classView.responses,
        results:classView.results
      }));
      if(SF.rosterManage) over.appendChild(SF.rosterManage(Live.players||[], rosterActions()));
    }
  };

  document.addEventListener('click',function(e){
    var t=/** @type {HTMLElement|null} */ (e.target);
    if(t && t.id==='teachPop'){Live.popManual();return;}
    if(t && t.id==='teachClose'){var m=/** @type {HTMLDialogElement|null} */ (document.getElementById('teachModal'));if(m&&m.open)m.close();return;}
    if(t && t.dataset && t.dataset.teach){teachTab(t.dataset.teach);}
  });
  function postManualError(message) {
    try { if (manualWindow && !manualWindow.closed) manualWindow.postMessage({ type: 'sf-manual-error', message: message }, location.origin); } catch (e) {}
    if (manualChannel) manualChannel.postMessage({ type: 'sf-manual-error', message: message });
  }

  /** Desk Class panel can open the room — paper register does not need phones. */
  function startLiveFromDesk(force) {
    if (Live.pin && !force) {
      postManualError('A live room is already open. Use New room… only if you want a fresh PIN.');
      return;
    }
    var deck = (SF.Player && SF.Player.open && SF.Player.deck) || Live.deck;
    if (!deck) {
      postManualError('Present the lesson on the wall first, then start the live room here.');
      return;
    }
    Live.host(deck);
    SF.toast('Starting live room — add names here; phones are optional');
  }

  /* Same reason the wall dedupes desk commands: this is listened for on two
     routes, and adding a roster twice is not something a teacher can undo in
     the moment. Bounded — a workspace sends a handful of these a minute. */
  var seenManual = [];
  function manualCommand(data) {
    if(!data || data.type!=='sf-manual-command') return;
    if (data.id) {
      if (seenManual.indexOf(data.id) >= 0) return;
      seenManual.push(data.id);
      if (seenManual.length > 60) seenManual.shift();
    }
    if(data.action==='hello'){ syncManual(); send({t:'report'}); }
    else if(data.action==='host') startLiveFromDesk(!!data.force);
    else if(data.action==='add') send({t:'manualAdd',names:data.names,team:data.team});
    else if(data.action==='rename') send({t:'manualRename',playerId:data.playerId,name:data.name});
    else if(data.action==='team') send({t:'manualTeam',playerId:data.playerId,team:data.team});
    else if(data.action==='kick') send({t:'manualRemove',playerId:data.playerId,mode:'kick'});
    else if(data.action==='delete') send({t:'manualRemove',playerId:data.playerId,mode:'delete'});
    else if(data.action==='answer') send(Object.assign({},data.answer,{t:'manualAnswer'}));
    else if(data.action==='reveal') { revealNow(); syncManual(); }
    else if(data.action==='revealWith') { revealWith(data.choice); }
    else if(data.action==='report') send({t:'report'});
  }

  /* "The answer is C" — said by pressing C.
     The room shouts, the teacher writes the answers down and then marks the
     correct one, which is the same gesture as saying it out loud. Pressing an
     option is the reveal.

     It honours the press even when the deck says otherwise. A teacher who
     presses C on a question keyed to B has a reason — usually that the key is
     wrong — and marking the room against B while the wall shows C is the
     worst of both. So the run's answer moves to the pressed option, the wall
     and the marking agree, and the saved game is untouched: buildRunDeck
     compiles a question into a fresh slide object, so this run holds its own
     copy. */
  function revealWith(choice){
    var s = SF.Player.deck && SF.Player.deck.slides[SF.Player.idx];
    if(!s || s.type!=='quiz' || Live.revealed[s.id]) return;
    if(s.input==='choice' && Number.isInteger(choice) && choice>=0 && choice<(s.options||[]).length){
      /* Concept Chain: Accept needs a typed link; Reject clears the draft. */
      if ((s.style === 'conceptchain' || s.conceptChain) &&
          SF.Player.tryAcceptChain && !SF.Player.tryAcceptChain(s, choice)) {
        return;
      }
      /* Set before revealing, not repainted after: revealNow reads s.correct
         when it paints the options, and nothing marks an answer on the slide
         before the reveal, so there is no stale tick to clear. */
      s.correct=choice;
    }
    revealNow();
    if ((s.style === 'conceptchain' || s.conceptChain) && choice === 0) {
      SF.Player.goTo(SF.Player.idx, 0);
    }
    syncManual();
  }
  window.addEventListener('message',function(e){
    if(e.source===manualWindow && e.origin===location.origin) manualCommand(e.data);
  });


  function relayUrl() {
    if (location.protocol === 'file:') return 'ws://localhost:8787';
    var proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return proto + '//' + location.host;
  }

  function joinAddress() {
    if (location.protocol === 'file:') return 'http://localhost:8787/join.html';
    return location.origin + '/join.html';
  }

  function send(msg) {
    if (Live.ws && Live.ws.readyState === 1) Live.ws.send(JSON.stringify(msg));
  }

  /* ------------------------------------------------------------ lobby UI */

  var lobby, pinEl, urlEl, listEl, countEl, warnEl, teamsEl;

  function refs() {
    lobby = document.getElementById('lobby');
    pinEl = document.getElementById('lobbyPin');
    urlEl = document.getElementById('lobbyUrl');
    listEl = document.getElementById('lobbyPlayers');
    countEl = document.getElementById('lobbyCount');
    warnEl = document.getElementById('lobbyWarn');
    teamsEl = document.getElementById('lobbyTeams');
    var lobbyStart = document.getElementById('lobbyStart');
    var actions = lobbyStart ? lobbyStart.parentNode : null;
    if (actions && !document.getElementById('lobbyManual')) {
      var manual = SF.el('button', 'btn', 'Teacher entry · no phones');
      manual.id = 'lobbyManual';
      manual.onclick = Live.openManual;
      actions.prepend(manual);
    }
    var lobbyCancel = document.getElementById('lobbyCancel');
    if (lobbyCancel) lobbyCancel.onclick = function () { Live.stop(); };
    if (lobbyStart) lobbyStart.onclick = function () { Live.begin(); };
  }

  function closeOverlays() {
    var teach = /** @type {HTMLDialogElement|null} */ (document.getElementById('teachModal'));
    if (teach && teach.open) teach.close();
    var cheats = document.getElementById('cheats');
    if (cheats) cheats.classList.remove('on');
    var picker = document.querySelector('.modal.on');
    if (picker) picker.classList.remove('on');
  }

  /* Two things can be wrong with a lobby at once, so the slot holds both
     rather than whichever was set last. */
  var lobbyWarning = '';

  function warn(text) {
    lobbyWarning = text || '';
    paintWarn();
  }

  /**
   * The room belongs to the document it was opened for, and the editor can
   * move on without it — press New mid-lobby and the two silently disagree,
   * with Start presenting the lesson you are no longer looking at.
   *
   * Saying so beats either alternative: taking New away mid-lesson, or
   * re-pointing a room that already has people waiting in it at a document
   * they were not invited to.
   */
  function deckMismatch() {
    if (!Live.deck || !SF.Shell || !SF.Shell.current) return '';
    var ws = SF.Shell.current();
    var open = ws && ws.doc && ws.doc();
    if (!open || !open.id || open.id === Live.deck.id) return '';
    return 'This room was opened for \u201c' + (Live.deck.title || 'another document') +
      '\u201d. Start presents that \u2014 not \u201c' + (open.title || 'the open document') + '\u201d.';
  }

  function paintWarn() {
    if (!warnEl) return;
    var lines = [lobbyWarning, deckMismatch()].filter(Boolean);
    warnEl.textContent = '';
    lines.forEach(function (t) { warnEl.appendChild(SF.el('div', null, t)); });
    warnEl.style.display = lines.length ? 'block' : 'none';
  }

  /* Called by the shell whenever the active document changes, because that is
     exactly when this can start being true. */
  Live.syncLobby = function () {
    if (lobby && lobby.classList.contains('on')) paintWarn();
  };

  function drawPlayers() {
    listEl.innerHTML = '';
    Live.players.forEach(function (p) {
      var chip = el('div', 'chip', p.name + (p.manual ? ' · teacher entry' : p.connected === false ? ' · disconnected' : ''));
      if (Live.mode === 'teams' && p.team != null) {
        chip.style.borderColor = SF.teamColor(p.team);
      }
      listEl.appendChild(chip);
    });
    var n = Live.players.length;
    countEl.textContent = n
      ? n + ' player' + (n === 1 ? '' : 's') + ' in the room'
      : 'Waiting for players…';

    teamsEl.innerHTML = '';
    if (Live.mode === 'teams') {
      Live.teams.forEach(function (t, i) {
        var c = Live.counts ? (Live.counts[i] || 0) : 0;
        var chip = el('div', 'tchip');
        var sw = el('span', 'swatch');
        sw.style.background = SF.teamColor(i);
        chip.appendChild(sw);
        chip.appendChild(el('span', null, t.name || t));
        chip.appendChild(el('span', 'n', c + (c === 1 ? ' player' : ' players')));
        teamsEl.appendChild(chip);
      });
    }
  }

  /* ------------------------------------------------------------ host */

  /* Called at boot with whatever deck was open. Walks back into a room this
     tab was hosting before a reload, if the server is still holding it. */
  Live.resumeHeldRoom = function (deck) {
    var held = heldRoom();
    if (!held || !held.pin || !held.token) return false;
    if (!deck) return false;
    if (!lobby) refs();
    Live.deck = deck;
    Live.players = [];
    Live.revealed = {};
    connect(held);
    return true;
  };

  Live.host = function (deck) {
    if (!lobby) refs();
    closeOverlays();
    if (Live.ws) Live.stop();          // never leave a previous room dangling
    Live.deck = deck;
    Live.players = [];
    Live.session = null;
    Live.recordingFailed = false;
    Live.revealed = {};
    Live.pin = null;
    drawPlayers();
    pinEl.textContent = '····';
    urlEl.textContent = joinAddress().replace(/^https?:\/\//, '');
    paintQr('lobbyQr', null);
    warn('');
    lobby.classList.add('on');

    Live.mode = deck.quiz.mode;
    this.mechanic = deck.mechanic || 'points';
    this.trackLength = deck.trackLength || 5;
    this.pos = {};
    this.raceBaseline = null;
    this.winners = [];
    this.bossHp = 0;
    this.bossMax = 0;
    if (this.mechanic === 'boss') {
      var quizQs = (deck.slides || []).filter(function (s) { return s.type === 'quiz'; });
      this.bossMax = SF.bossMaxHp(quizQs.map(function (s) {
        return { difficulty: s.difficulty || 'medium' };
      }));
      if (!this.bossMax) this.bossMax = Math.max(1, quizQs.length * 2);
      this.bossHp = this.bossMax;
    }
    stopDrip();
    this.prompt = null;
    this.digest = null;
    this.qa = null;
    SF.Player.qa = null;
    this.teams = deck.quiz.teams.slice();
    this.rows = [];
    this.counts = null;
    this.roundGame = null;
    this.roundNo = 0;
    this.waiting = 0;
    this.joinOpen = true;

    var quizzes = deck.slides.filter(function (s) { return s.type === 'quiz'; }).length;
    if (!quizzes && !deck.slides.some(SF.slideFeedback)) warn('This deck has no quiz slides yet — add one with "+ Quiz" so the room has something to answer.');

    connect();
  };

  /* Per tab, on purpose: a refresh should walk back into the lesson, and a
     brand new tab should not silently take over a room somebody else is
     hosting. sessionStorage gives exactly that lifetime for free. */
  var HELD_KEY = 'slideforge.hostedRoom';
  function rememberRoom(pin, token) {
    /* No deck id here. The first version stored one and refused to resume
       unless it matched the deck open at boot — but Live.host is handed a
       compiled run deck, whose id is not the authored deck's, so the check
       never matched and quietly deleted the token it was meant to guard. The
       server holds the real gate: the room must exist, the token must match,
       and the room must actually be hostless. */
    try { sessionStorage.setItem(HELD_KEY, JSON.stringify({ pin: pin, token: token })); } catch (e) {}
  }
  function forgetRoom() { try { sessionStorage.removeItem(HELD_KEY); } catch (e) {} }
  function heldRoom() {
    try { return JSON.parse(sessionStorage.getItem(HELD_KEY) || 'null'); } catch (e) { return null; }
  }

  /* Local laptop answers in under a second. Render's free plan sleeps after
     idle time and can take half a minute to wake — 4s used to call that
     "relay not running" and strand the lobby on ✕ while the instance was
     still booting. Hosted gets a long wait and a couple of retries. */
  function relayIsHosted() {
    return location.protocol === 'https:' || /\.onrender\.com$/i.test(location.hostname);
  }
  function connectBudgetMs() {
    return relayIsHosted() ? 45000 : 4000;
  }
  var CONNECT_RETRIES = 2;

  function connect(resume, attempt) {
    attempt = attempt || 0;
    var url = relayUrl();
    var hosted = relayIsHosted();
    if (pinEl && !Live.pin) {
      pinEl.textContent = '····';
      if (hosted && attempt > 0) {
        warn('The live room is waking up — try ' + (attempt + 1) + ' of ' + (CONNECT_RETRIES + 1) + '…');
      } else if (hosted) {
        warn('Connecting to the live room… (first open after idle can take up to a minute)');
      }
    }
    var ws;
    try {
      ws = new WebSocket(url);
    } catch (e) {
      offline(url);
      return;
    }
    Live.ws = ws;

    var settled = false;
    var giveUp = setTimeout(function () {
      if (!settled) {
        settled = true;
        try { ws.close(); } catch (e) {}
        if (hosted && attempt < CONNECT_RETRIES) {
          connect(resume, attempt + 1);
          return;
        }
        offline(url);
      }
    }, connectBudgetMs());

    ws.onopen = function () {
      settled = true;
      clearTimeout(giveUp);
      if (lobbyWarning && /waking|Connecting to the live room/.test(lobbyWarning)) warn('');
      if (resume && resume.pin && resume.token) {
        send({ t: 'rehost', pin: resume.pin, hostToken: resume.token });
        return;
      }
      send({
        t: 'host',
        title: Live.deck.title,
        mode: Live.deck.quiz.mode,
        teams: Live.deck.quiz.teams
      });
    };

    ws.onmessage = function (ev) {
      var m;
      try { m = JSON.parse(ev.data); } catch (e) { return; }
      handle(m);
      syncManual();
    };

    ws.onerror = function () {
      /* Do not call offline here — onclose always follows, and hosted retries
         need a single decision point so two failures do not double-book. */
    };

    ws.onclose = function () {
      if (Live.ws !== ws) return;
      if (!settled) {
        settled = true;
        clearTimeout(giveUp);
        if (hosted && attempt < CONNECT_RETRIES) {
          connect(resume, attempt + 1);
          return;
        }
        offline(url);
        return;
      }
      if (Live.active) SF.toast('Lost the connection to the live relay');
      Live.active = false;
      Live.pin = null; syncManual();
      SF.Player.gate = null;
    };
  }

  function offline(url) {
    pinEl.textContent = '✕';
    urlEl.textContent = 'relay not running';
    if (relayIsHosted()) {
      warn('Could not reach the live relay at ' + url + '. On the free Render plan the app sleeps when idle — open https://' +
           location.host + '/ in a tab, wait until the page loads (up to a minute), then press Host live again. ' +
           'Everything else works without the relay — close this and press Present.');
      return;
    }
    warn('Could not reach the live relay at ' + url + '. Start it with "node server/server.js" ' +
         'in the slideforge folder, then open the app at the address it prints so phones on the ' +
         'same Wi-Fi can reach it. Everything else works without the relay — close this and press Present.');
  }

  function handle(m) {
    switch (m.t) {
      case 'recording':
        if (SF.Reports) SF.Reports.recording(m.persisted);
        if (!m.persisted && !Live.recordingFailed) SF.toast('Session recording failed. Keep this host open and export the report.');
        Live.recordingFailed = !m.persisted;
        break;
      case 'sessionReport':
      case 'sessionClosed':
        /* These two share a body, so this has to ask which one it is. Dropped
           in unguarded, it meant every routine session report wiped the token
           that lets a reloaded host back in — the room was held open and the
           only key to it had been thrown away a second after the lesson
           started. */
        if (m.t === 'sessionClosed') forgetRoom();
        lastReport = m.report || lastReport;
        if (SF.Reports) SF.Reports.receive(m.report);
        Live.paintOverview(m.report);
        break;
      /* Back in a room that was being held for us. */
      case 'rehosted':
        Live.pin = m.pin;
        Live.joinUrl = m.joinUrl || joinAddress();
        Live.mode = m.mode || 'individual';
        Live.teams = (m.teams || []).map(function (n) { return { name: n }; });
        Live.session = m.session || null;
        if (pinEl) pinEl.textContent = m.pin;
        if (urlEl && m.joinUrl) urlEl.textContent = String(m.joinUrl).replace(/^https?:\/\//, '');
        rememberRoom(m.pin, m.hostToken);
        /* A lesson that had already started comes back started. Only the
           lobby is a state worth returning to. */
        if (m.phase && m.phase !== 'lobby') {
          goLiveLocally();
          document.body.classList.add('live-on');
          SF.Player.gate = gate;
          var slide = SF.Player.deck && SF.Player.deck.slides[SF.Player.idx];
          Live.roundGame = slide && slide.gameId || null;
          SF.Player.syncHudRoomButtons();
        } else {
          drawPlayers();
          lobby.classList.add('on');
        }
        SF.toast('Back in the lesson — the room stayed open, PIN ' + m.pin);
        break;

      case 'rehostFailed':
        forgetRoom();
        Live.stop();
        SF.toast(m.reason || 'That lesson is no longer open.');
        break;

      case 'hosted':
        reactionCounts={};reactionSlide=null;bookmarkState=null;
        Live.session = m.session || null;
        if (m.session && SF.Reports) SF.Reports.track(m.session);
        else if (SF.Reports) { SF.Reports.recording(false); warn('This relay does not support session reports. Restart it with the updated server.'); }
        Live.pin = m.pin;
        rememberRoom(m.pin, m.hostToken);
        Live.joinUrl = m.joinUrl || joinAddress();
        pinEl.textContent = m.pin;
        Live.mode = m.mode || 'individual';
        Live.teams = (m.teams || []).map(function (n) { return { name: n }; });
        if (m.joinUrl) urlEl.textContent = String(m.joinUrl).replace(/^https?:\/\//, '');
        paintQr('lobbyQr', m.pin);
        drawPlayers();
        /* Join slides painted before the PIN arrived still show the sample. */
        if (SF.Player && SF.Player.open && SF.Player.deck) {
          var on = SF.Player.deck.slides[SF.Player.idx];
          if (on && on.type === 'join') {
            SF.Player._current = null;
            SF.Player.goTo(SF.Player.idx, 0);
          }
        }
        break;

      case 'players':
        announceArrivals(m.list || []);
        if (m.pin) Live.pin = m.pin;
        if (m.joinUrl) Live.joinUrl = m.joinUrl;
        Live.joinOpen = m.joinOpen !== false;
        Live.waiting = m.waiting || 0;
        SF.Player.waiting = Live.waiting;
        Live.roundNo = m.round || 0;
        Live.players = m.list || [];
        Live.rows = m.rows || [];
        Live.counts = m.counts || null;
        if (m.mode) Live.mode = m.mode;
        // The relay sends teamAnswers before its updated player list. Individual
        // lanes use correct counts, so apply those when the fresh list arrives.
        if (Live.mechanic === 'race' && Live.mode !== 'teams' && Live.players.some(function (p) {
          return racePosition(p) !== (Live.pos['p' + p.id] || 0);
        })) advanceRace({});
        drawPlayers();
        paintRail();
        /* Join state and roster ride on the feedback rail too — refresh it
           when someone arrives while a prompt is up. */
        if (Live.prompt) paintFeedbackPanel();
        var jc = document.getElementById('joincard');
        if (jc && jc.classList.contains('on')) paintJoinCard();
        Live.refreshOverview();
        Live.paintEntryRoster();
        break;

      case 'manualError':
        if(manualWindow && !manualWindow.closed) manualWindow.postMessage({type:'sf-manual-error',message:m.message},location.origin);
        if(manualChannel) manualChannel.postMessage({type:'sf-manual-error',message:m.message});
        break;
      case 'tally':
        Live.snapshot = { rev: m.rev || 0, answers: m.answers || [] };
        SF.Player.setTally(m.counts || [], { answered: m.answered, total: m.total });
        /* Marked here and kept here: the split between confident and hesitant
           answers is for presenter view, not the wall. Marking before the
           reveal is safe because the verdicts never leave this window until
           the host chooses to reveal. */
        SF.Player.confidence = confidenceSplit();
        SF.Player.syncPresenter();
        if (m.allIn && m.answered > 0 && !m.manual) considerReveal(m);
        Live.refreshOverview();
        break;

      /* The host marked a set of answers that the relay has since added to.
         Re-mark and send again — answering is already closed on the relay by
         this point, so this set is final and the retry cannot bounce twice. */
      case 'markStale':
        Live.snapshot = { rev: m.rev || 0, answers: m.answers || [] };
        var pending = SF.Player.deck && SF.Player.deck.slides[SF.Player.idx];
        if (pending && pending.id === m.id && Live.revealed[pending.id]) {
          sendReveal(pending);
          /* The wall was drawn from the snapshot that turned out to be short
             one answer, so redraw it from the set that was handed back. */
          if (pending.input === 'text') SF.Player.showTypedAnswers(typedGroups(pending));
          if (pending.input === 'number') SF.Player.showPlacedValues(placedValues(pending));
        }
        break;

      case 'scores':
        Live.players = m.list || [];
        break;

      case 'teamAnswers':
        if (Live.mechanic === 'race') advanceRace(m);
        else if (Live.mechanic === 'boss') advanceBoss(m);
        break;

      case 'reaction':
        var current=SF.Player.deck&&SF.Player.deck.slides[SF.Player.idx];
        if(current&&reactionSlide!==current.id){reactionSlide=current.id;reactionCounts={};}
        reactionCounts[m.kind]=(reactionCounts[m.kind]||0)+1;
        SF.Player.showReaction(m.kind);
        SF.Player.syncPresenter();
        break;

      case 'bookmarks':
        bookmarkState=m;SF.Player.syncPresenter();break;

      case 'signals':
        Live.signals = m;
        SF.Player.pace = m;
        paintCues();
        SF.Player.syncPresenter();
        break;

      case 'qa':
        Live.qa = m;
        SF.Player.qa = m;
        paintCues();
        syncPinned(m.pinned);
        SF.Player.syncPresenter();
        break;

      case 'responses':
        if (!Live.prompt || m.id !== Live.prompt.id) break;
        Live.digest = m;
        paintFeedbackPanel();
        SF.Player.syncPresenter();
        break;

      case 'error':
        warn(m.message || 'The relay refused that request.');
        break;
    }
  }

  /**
   * Put the standing cues back on the slide.
   *
   * Both of them are pushed by the relay whenever they change, which includes
   * while the lobby is still up and there is no slide to draw on. So the last
   * state is kept and re-applied per slide rather than only painted on the
   * message that carried it — a question asked in the lobby used to produce a
   * cue that never appeared.
   */
  function paintCues() {
    var qa = Live.qa;
    SF.Player.setQACue(qa ? { pending: qa.pending, open: qa.open } : null);
    SF.Player.setPaceCue(Live.signals);
  }

  /* ---------------------------------------------------------- scoreboard */

  /* Who the rail has already announced. Ids rather than names, so two people
     called Sam are two arrivals and a rename is not a third. */
  var announced = null;

  /**
   * Say who just arrived.
   *
   * The roster is pushed whole on every change, so this diffs it. The first
   * push after hosting is not "everyone arrived" — it is the room as it
   * already stood, and announcing all of it would bury the one person who
   * turned up late, which is the only case worth a line.
   */
  function announceArrivals(list) {
    var ids = {};
    list.forEach(function (p) { ids[p.id] = p.name; });
    if (!announced) { announced = ids; return; }
    var fresh = list.filter(function (p) { return !(p.id in announced); });
    announced = ids;
    if (!fresh.length) return;
    if (fresh.length > 2) {
      SF.Player.railNote(fresh.length + ' more joined');
      return;
    }
    fresh.forEach(function (p) { SF.Player.railNote(p.name + ' joined'); });
  }

  /** Push the current standings into the always-on rail. */
  function paintRail() {
    if (!Live.active || !Live.deck.quiz.scoreboard) return;
    if (SF.Player._railWanted === false) return;

    var racing = Live.mechanic === 'race';

    var rows = Live.rows.map(function (r) {
      return {
        key: r.key,
        name: r.name,
        /* In a race the number that matters is how far along you are, not how
           many points you have — so the rail shows steps out of the track. */
        score: racing ? (Live.pos[r.key] || 0) + ' / ' + Live.trackLength : r.score,
        /* Carried through untouched: how much of what they were asked they
           got right is the same number whatever the game is doing with
           points, distance or damage. */
        accuracy: r.accuracy,
        answered: r.answered,
        asked: r.asked,
        members: r.members,
        color: r.ci != null ? SF.teamColor(r.ci) : '',
        gained: !!r.gained
      };
    });

    if (racing) {
      rows.sort(function (a, b) {
        return (Live.pos[b.key] || 0) - (Live.pos[a.key] || 0);
      });
    }

    /* The rail is narrow and read from a distance, so the labels stay terse.
       The PIN rides along in the footer: latecomers can join without the host
       having to break off and read it out. */
    var n = Live.players.length;
    SF.Player.setScoreboard(rows, {
      subtitle: n + (n === 1 ? ' player' : ' players') +
                (Live.mode === 'teams' ? ' · ' + Live.teams.length + ' teams' : ''),
      /* Named, so the right-hand column is never mistaken for a mark. */
      scoreLabel: racing ? 'Distance'
        : Live.mechanic === 'boss' ? 'Damage'
        : (Live.mode === 'teams' ? 'Team points' : 'Game points'),
      footnote: racing
        ? 'A team moves when most of it picks right'
        : (Live.mode === 'teams' ? 'Points are an average per player' : ''),
      join: joinInfo(),
      emptyText: Live.mode === 'teams'
        ? 'Waiting for teams'
        : 'Waiting for players'
    });
    if (SF.Player.syncHudRoomButtons) SF.Player.syncHudRoomButtons();
  }

  /** host:port only — the rail has no room for a scheme and a path. */
  function shortHost() {
    return String(Live.joinUrl || joinAddress())
      .replace(/^https?:\/\//, '')
      .replace(/\/join\.html$/, '');
  }

  /* ------------------------------------------------- join card (mid-game) */

  /**
   * The join URL as a QR code, with the PIN already in it.
   *
   * Pointing a camera at a square is fewer steps than typing an IP address
   * and then a six-digit PIN, and it removes the two places a room reliably
   * goes wrong: mistyping the address, and joining with the wrong PIN.
   *
   * The typed address and the PIN stay on screen beside it. A camera is not
   * always the fastest route — an older phone, a locked-down device, someone
   * already on the page — and a QR code that is the only way in excludes
   * them.
   */
  function paintQr(id, pin) {
    var box = document.getElementById(id);
    if (!box) return;
    var url = joinLink(pin);
    /* Rebuilt only when the payload changes: encoding is cheap but this is
       called on every roster push. */
    if (box.dataset.for === url) return;
    box.dataset.for = url;
    if (!pin || !SF.qrSvg) { box.innerHTML = ''; box.classList.remove('on'); return; }
    try {
      box.innerHTML = SF.qrSvg(url, { title: 'Join the lesson at ' + url, quiet: 3 });
      box.classList.add('on');
    } catch (e) {
      /* A code that will not encode is not worth a broken box on the wall —
         the address and PIN beside it are still a complete way in. */
      box.innerHTML = '';
      box.classList.remove('on');
    }
  }

  /**
   * Everything a rail, a card or a code needs to say how to get in.
   *
   * One builder because there are four surfaces showing it — both rails, the
   * lobby and the join card — and three separately-written copies of this
   * object is how the QR payload came to be missing from two of them.
   */
  function joinInfo() {
    if (!Live.pin) return null;
    return {
      pin: Live.pin,
      /* The short host is what somebody typing it has to read; the link is
         the full address with the PIN in it, for the code to encode. */
      url: shortHost(),
      link: joinLink(Live.pin),
      open: Live.joinOpen,
      waiting: Live.waiting
    };
  }

  /** The address a phone should open, PIN included so it lands pre-filled. */
  function joinLink(pin) {
    var base = Live.joinUrl || joinAddress();
    return pin ? base + (base.indexOf('?') > -1 ? '&' : '?') + 'pin=' + pin : base;
  }

  function paintJoinCard() {
    var jcUrl = document.getElementById('jcUrl');
    if (jcUrl) jcUrl.textContent = String(Live.joinUrl || joinAddress()).replace(/^https?:\/\//, '');
    var jcPin = document.getElementById('jcPin');
    if (jcPin) jcPin.textContent = Live.pin || '----';
    paintQr('jcQr', Live.pin);

    var teams = document.getElementById('jcTeams');
    if (teams) {
      var teamsEl = teams;
      teamsEl.innerHTML = '';
      if (Live.mode === 'teams') {
        Live.teams.forEach(function (t, i) {
          var chip = el('div', 'tchip', t.name || t);
          chip.style.background = SF.teamColor(i);
          if (i === 2) chip.style.color = '#1d1204';
          teamsEl.appendChild(chip);
        });
      }
    }

    var n = Live.players.length;
    var parts = [n ? n + (n === 1 ? ' player is in' : ' players are in') : 'Nobody has joined yet'];
    if (Live.waiting) {
      parts.push(Live.waiting + (Live.waiting === 1 ? ' waiting for' : ' waiting for') +
                 ' the next round');
    }
    var jcCount = document.getElementById('jcCount');
    if (jcCount) jcCount.textContent = parts.join(' · ');

    var state = document.getElementById('jcState');
    if (state) {
      if (Live.joinOpen) {
        state.textContent = 'Joining is open';
        state.className = 'state open';
      } else {
        state.textContent = 'Joining closed until the next round';
        state.className = 'state shut';
      }
    }
  }

  /* E expands whatever the rail is currently showing — responses, the
     scoreboard, or the race track. Consistent regardless of which feed is up,
     so the presenter learns one key. */
  function toggleFocus(opts) {
    if (!Live.active) return;

    if ((opts && opts.close) || Live.focus) {
      Live.focus = false;
      SF.Player.closeFocus();
      if (SF.Player.syncHudRoomButtons) SF.Player.syncHudRoomButtons();
      return;
    }

    if (Live.prompt) {
      Live.focus = true;
      SF.Player.showFeedbackFocus(Live.digest, feedbackOpts());
      if (SF.Player.syncHudRoomButtons) SF.Player.syncHudRoomButtons();
      return;
    }

    if (Live.mechanic === 'race') {
      var lanes = raceLanes();
      if (!lanes.length) { SF.toast('Nobody in the race yet'); return; }
      Live.focus = true;
      SF.Player.showRaceTrack(lanes, {
        length: Live.trackLength,
        title: 'The race',
        note: Live.winners.length ? winnerNote() : lanes[0].name + ' leads',
        winners: Live.winners,
        focus: true
      });
      if (SF.Player.syncHudRoomButtons) SF.Player.syncHudRoomButtons();
      return;
    }

    if (!Live.rows.length) {
      SF.toast('Nothing to expand yet — nobody has joined');
      return;
    }
    Live.focus = true;
    SF.Player.showLeaderboard(finalBoard(), 'Standings', true);
    if (SF.Player.syncHudRoomButtons) SF.Player.syncHudRoomButtons();
  }

  function toggleJoinCard(opts) {
    var card = document.getElementById('joincard');
    if (!card) return;
    if (!Live.active) { card.classList.remove('on'); return; }
    if (opts && opts.close) { card.classList.remove('on'); }
    else if (card.classList.contains('on')) {
      card.classList.remove('on');
    } else {
      paintJoinCard();
      card.classList.add('on');
    }
    if (SF.Player.syncHudRoomButtons) SF.Player.syncHudRoomButtons();
  }

  /* --------------------------------------------------------------- Q & A */

  /* The wall shows a question only while the host has it pinned. Tracked so
     unpinning takes it down again, and so re-pushes of the same item do not
     re-animate the card. */
  var pinnedId = null;

  function syncPinned(pinned) {
    var id = pinned ? pinned.id : null;
    if (id === pinnedId) return;
    pinnedId = id;
    if (!pinned) {
      /* Only collapse if the card is what is showing — the host may have moved
         on to a focused poll in the meantime. */
      if (SF.Player._focus) SF.Player.closeFocus();
      return;
    }
    Live.focus = false;                 // the card owns the focus slot now
    SF.Player.showQuestionCard(pinned);
  }

  function moderate(cmd) {
    if (!Live.active) return;
    if (cmd.action === 'pin') send({ t: 'qaPin', id: cmd.id });
    else if (cmd.action === 'unpin') send({ t: 'qaPin', id: null });
    else send({ t: 'qaModerate', id: cmd.id, action: cmd.action });
  }

  /* ------------------------------------------------------------- the race */

  /**
   * Move each lane that earned it, then put the track on screen.
   *
   * A team advances when the answer *most of its members picked* was the
   * correct one. Chosen over "any member right" because that rewards big
   * teams, and over "all right" because one confused member would block a
   * whole table. A tie inside a team does not advance — the team has to
   * actually agree.
   */
  function racePosition(player) {
    return Math.min(Live.trackLength, Math.max(0, (player.correct || 0) - ((Live.raceBaseline && Live.raceBaseline[player.id]) || 0)));
  }

  function advanceRace(m) {
    var counts = m.counts || [];
    var correct = Number(m.correct);
    var movedKeys = [];

    if (Live.mode === 'teams') {
      Live.teams.forEach(function (t, i) {
        var row = counts[i] || [];
        var total = row.reduce(function (a, b) { return a + b; }, 0);
        if (!total) return;                       // nobody on this team answered

        var best = -1, bestAt = -1, tied = false;
        row.forEach(function (n, idx) {
          if (n > best) { best = n; bestAt = idx; tied = false; }
          else if (n === best && n > 0) { tied = true; }
        });
        if (tied || bestAt !== correct) return;

        var key = 't' + i;
        if ((Live.pos[key] || 0) >= Live.trackLength) return;   // already home
        Live.pos[key] = (Live.pos[key] || 0) + 1;
        movedKeys.push(key);
        if (Live.pos[key] >= Live.trackLength && Live.winners.indexOf(key) === -1) {
          Live.winners.push(key);
        }
      });
    } else {
      /* Individual race: each player runs their own lane, and their position
         is simply how many they have got right. */
      Live.players.forEach(function (p) {
        var key = 'p' + p.id;
        var was = Live.pos[key] || 0;
        var now = racePosition(p);
        if (now > was) movedKeys.push(key);
        Live.pos[key] = now;
        if (now >= Live.trackLength && Live.winners.indexOf(key) === -1) {
          Live.winners.push(key);
        }
      });
    }

    paintRail();
    showTrack(movedKeys);
  }

  /** Lanes for the track overlay, in race order. */
  function raceLanes() {
    var lanes;
    if (Live.mode === 'teams') {
      lanes = Live.teams.map(function (t, i) {
        return {
          key: 't' + i,
          name: t.name || t,
          color: SF.teamColor(i),
          pos: Live.pos['t' + i] || 0
        };
      });
    } else {
      lanes = Live.players.map(function (p, i) {
        return {
          key: 'p' + p.id,
          name: p.name,
          color: SF.teamColor(i),
          pos: Live.pos['p' + p.id] || 0
        };
      });
    }
    lanes.sort(function (a, b) { return b.pos - a.pos; });
    return lanes.slice(0, 8);      // more than eight lanes stops being readable
  }

  function showTrack(movedKeys) {
    var lanes = raceLanes();
    lanes.forEach(function (l) { l.moved = (movedKeys || []).indexOf(l.key) > -1; });

    var done = Live.winners.length > 0;
    SF.Player.showRaceTrack(lanes, {
      length: Live.trackLength,
      title: done ? 'Photo finish!' : 'The race',
      note: done
        ? winnerNote()
        : (movedKeys && movedKeys.length
            ? movedKeys.length + (movedKeys.length === 1 ? ' team moves up' : ' teams move up')
            : 'Nobody moved — nothing scored that round'),
      winners: Live.winners
    });
  }

  function winnerNote() {
    var names = Live.winners.map(function (k) {
      var lane = raceLanes().find(function (l) { return l.key === k; });
      return lane ? lane.name : k;
    });
    return names.length === 1
      ? names[0] + ' is past the post'
      : names.join(' and ') + ' finish together';
  }

  /* ------------------------------------------------------------- boss battle */

  /**
   * One hit per question when the room agrees on the right answer.
   * Same majority rule as the race — a tied team does not land a hit.
   */
  function advanceBoss(m) {
    var s = SF.Player.deck && SF.Player.deck.slides[SF.Player.idx];
    var damage = (s && s.bossDamage) || SF.bossDamage(s && s.difficulty) || 2;
    var hit = bossRoomHit(m);
    var note;
    if (hit && Live.bossHp > 0) {
      Live.bossHp = Math.max(0, Live.bossHp - damage);
      note = 'Hit! \u2212' + damage + ' · ' + Live.bossHp + ' / ' + Live.bossMax + ' HP left';
    } else if (Live.bossHp <= 0) {
      note = 'Boss already defeated';
    } else {
      note = 'Miss — boss still at ' + Live.bossHp + ' / ' + Live.bossMax + ' HP';
    }
    /* The damage, in the record. A hosted battle journalled the question and
       the marks like any quiz, and nothing at all about the boss — so the
       report could say who answered what and never that the room took it from
       eleven HP to nothing. */
    reportVerdict({
      slideId: (s && s.id) || 'boss',
      title: (s && s.gameTitle) || SF.Player.deck.title || 'Boss battle',
      kind: 'boss', set: 1, card: quizNumber(s) - 1,
      term: 'Q' + quizNumber(s) + ' · ' + ((s && s.difficulty) || 'medium') +
        ' · ' + Live.bossHp + '/' + Live.bossMax + ' HP left',
      participant: null,
      right: !!hit,
      value: hit ? damage : 0
    });
    paintRail();
    showBoss(note, hit);
  }

  function bossRoomHit(m) {
    var correct = Number(m.correct);
    if (!Number.isInteger(correct) || correct < 0) return false;
    if (Live.mode === 'teams') {
      var anyHit = false;
      (m.counts || []).forEach(function (row) {
        var total = (row || []).reduce(function (a, b) { return a + b; }, 0);
        if (!total) return;
        var best = -1, bestAt = -1, tied = false;
        (row || []).forEach(function (n, idx) {
          if (n > best) { best = n; bestAt = idx; tied = false; }
          else if (n === best && n > 0) tied = true;
        });
        if (!tied && bestAt === correct) anyHit = true;
      });
      return anyHit;
    }
    var rights = (Live.snapshot.answers || []).filter(function (a) {
      return Number(a.response) === correct;
    }).length;
    var total = (Live.snapshot.answers || []).length;
    return total > 0 && rights * 2 > total;
  }

  function showBoss(note, hit) {
    if (!SF.Player.showBossBar) return;
    SF.Player.showBossBar({
      hp: Live.bossHp,
      max: Live.bossMax,
      title: Live.bossHp <= 0 ? 'Boss defeated!' : 'Boss battle',
      note: note,
      hit: !!hit
    });
  }

  /** Speed gains for the relay — one row per answered player. */
  function speedGains(slide) {
    var limit = Number(slide.timeLimit) || 0;
    return (Live.snapshot.answers || []).map(function (a) {
      var right = SF.markResponse(slide, a.response);
      var remaining = 0;
      if (limit > 0 && typeof a.elapsedMs === 'number') {
        remaining = Math.max(0, limit - a.elapsedMs / 1000);
      } else if (limit > 0 && Live._askedAt) {
        remaining = Math.max(0, limit - (Date.now() - Live._askedAt) / 1000);
      }
      return [a.id, SF.speedPoints(right, remaining)];
    });
  }

  /** Boss: +1 point per player who was right (hit credit), 0 otherwise. */
  function bossGains(slide) {
    return (Live.snapshot.answers || []).map(function (a) {
      return [a.id, SF.markResponse(slide, a.response) ? 1 : 0];
    });
  }

  /** Ranking: round(10 × orderScore) for every answered player. */
  function orderGains(slide) {
    return (Live.snapshot.answers || []).map(function (a) {
      return [a.id, SF.orderPoints(slide, a.response)];
    });
  }

  /** Word Reveal: 100/75/50 by letters shown when scored; wrong = 0. */
  function wordRevealGains(slide) {
    var total = SF.wordRevealLetterCount(slide.word || slide.answer || '');
    var frac = total ? Live.dripShown / total : 1;
    var pts = SF.wordRevealPoints(frac);
    return (Live.snapshot.answers || []).map(function (a) {
      return [a.id, SF.markResponse(slide, a.response) ? pts : 0];
    });
  }

  /** Claim / Heads Up / Accept: +1 when the host verdict is the winning option. */
  function claimGains(slide) {
    return (Live.snapshot.answers || []).map(function (a) {
      return [a.id, SF.markResponse(slide, a.response) ? SF.claimPoints(true) : 0];
    });
  }

  /** Host-judged oral rounds: award the verdict points to everyone in the room. */
  function hostVerdictGains(points) {
    var pts = Math.max(0, Number(points) || 0);
    return (Live.players || []).map(function (p) {
      return [p.id, pts];
    });
  }

  function judgeGains(slide) {
    var kind = slide.judgeKind || slide.style;
    var c = slide.correct;
    if (kind === 'spinexplain') return hostVerdictGains(SF.spinExplainPoints(c));
    if (kind === 'bowl') return hostVerdictGains(c === 0 ? (slide.pointValue || slide.points || 0) : 0);
    if (kind === 'count' || kind === 'bingo') return hostVerdictGains(0);
    /* headsup / accept / claim-style choice: Correct/Accept/Claimed index 0 → +1 */
    return hostVerdictGains(c === 0 ? 1 : 0);
  }

  function bowlGains(slide) {
    return judgeGains(slide);
  }

  function stopDrip() {
    if (Live.dripTimer) {
      clearInterval(Live.dripTimer);
      Live.dripTimer = null;
    }
  }

  function paintWordReveal(slide) {
    if (!SF.Player.showWordReveal) return;
    SF.Player.showWordReveal({
      mask: SF.wordRevealMask(Live.dripWord, Live.dripShown),
      hint: slide.hint || '',
      shown: Live.dripShown,
      total: SF.wordRevealLetterCount(Live.dripWord)
    });
  }

  function startWordReveal(slide) {
    stopDrip();
    Live.dripWord = slide.word || slide.answer || '';
    var total = SF.wordRevealLetterCount(Live.dripWord);
    var pre = Math.round(total * (slide.preReveal != null ? slide.preReveal : SF.wordRevealPreFraction(slide.difficulty)));
    Live.dripShown = Math.max(0, Math.min(total, pre));
    paintWordReveal(slide);
    var every = Math.max(3, Number(slide.dripInterval) || 5) * 1000;
    Live.dripTimer = setInterval(function () {
      if (Live.dripShown >= total) { stopDrip(); return; }
      Live.dripShown++;
      paintWordReveal(slide);
    }, every);
  }

  function paintStudy(slide) {
    if (!SF.Player.showStudyCards) return;
    SF.Player.showStudyCards({
      term: slide.term || slide.question,
      definition: slide.hideAfterStudy === false ? (slide.definition || '') : (slide.definition || ''),
      seconds: slide.studySeconds || 0,
      hideAfter: slide.hideAfterStudy !== false && (slide.studySeconds || 0) > 0
    });
  }

  /* ------------------------------------------------------------ running */

  /* Player events are wired once per page load. Doing it inside begin() would
     stack a second set of handlers on every game hosted in the same session,
     which double-sends each question and wipes answers already given. */
  var wired = false;

  function wire() {
    if (wired) return;
    wired = true;
    SF.Player.on('slide', onSlide);
    SF.Player.on('timeup', function () {
      if (Live.players.some(function(p){return p.manual;})) return;
      var s = SF.Player.wallSlide ? SF.Player.wallSlide()
        : (SF.Player.deck && SF.Player.deck.slides[SF.Player.idx]);
      /* Concept Chain timeout = skip (Reject), not an accidental Accept. */
      if (s && (s.style === 'conceptchain' || s.conceptChain)) {
        s.correct = 1;
        SF.Player.chainPending = '';
      }
      revealNow();
    });
    SF.Player.on('definitionAsk', function (e) {
      if (!Live.active || !e || !e.slide) return;
      var s = e.slide;
      Live._askedAt = Date.now();
      Live._sentSlide = s.id;
      Live.snapshot = { rev: 0, answers: [] };
      sendOpenQuestion(s);
      syncManual();
    });
    SF.Player.on('close', function () { if (Live.active) Live.stop(); });
    SF.Player.on('joinToggle', toggleJoinCard);
    SF.Player.on('focusToggle', toggleFocus);
    SF.Player.on('sidebarShow', showSidebar);
    SF.Player.on('qaCommand', moderate);
    SF.Player.on('reactionsToggle', toggleReactions);
    SF.Player.on('blankPhonesToggle', toggleBlankPhones);
    SF.Player.on('floorCycle', cycleFloor);
  }

  /**
   * Is there anything worth putting on the whole screen?
   *
   * Asked before offering the state rather than after trying it, so the S
   * cycle can skip a size that has nothing in it instead of stopping on a
   * "nothing to expand" toast — the same reasoning as the join panel hiding
   * itself when there is no PIN.
   */
  Live.canExpand = function () {
    if (!Live.active) return false;
    if (Live.prompt) return true;
    if (Live.mechanic === 'race') return raceLanes().length > 0;
    return Live.rows.length > 0;
  };

  /** What E / “Show leaderboard” would open — drives the HUD label. */
  Live.expandKind = function () {
    if (!Live.active) return null;
    if (Live.prompt) return 'responses';
    if (Live.mechanic === 'race' && raceLanes().length) return 'race';
    if (Live.rows.length) return 'standings';
    return null;
  };

  /** Put the room rail back after the host hid it with S. */
  function showSidebar() {
    if (!Live.active) return;
    SF.Player._railWanted = true;
    if (Live.prompt) {
      paintFeedbackPanel();
    } else if (Live.deck && Live.deck.quiz && Live.deck.quiz.scoreboard) {
      paintRail();
    } else if (Live.pin) {
      /* No scoreboard and no prompt — the join card is the room. */
      toggleJoinCard({});
    }
    if (SF.Player.syncHudRoomButtons) SF.Player.syncHudRoomButtons();
  }

  /* Everything going live does on this machine. Split out because coming back
     to a room that is already running has to do all of it except tell the
     server to start again. */
  function goLiveLocally() {
    lobby.classList.remove('on');
    Live.active = true;
    wire();
    SF.Player.lanesProvider = function () {
      return Live.mechanic === 'race' ? raceLanes() : null;
    };
  }

  Live.begin = function () {
    if (!Live.pin) { warn('Not connected to the relay yet.'); return; }
    /* Desk first, in this click. Anything before window.open (lobby teardown,
       fullscreen) makes the browser treat Teacher Presenter as a blocked pop-up,
       and D on that waiting card then does nothing because D is a wall key. */
    if (SF.Player.openPresenter) SF.Player.openPresenter();
    send({ t: 'begin' });
    goLiveLocally();
    document.body.classList.add('live-on');
    SF.Player.gate = gate;
    SF.Player.start(Live.deck, 0);
    if (SF.Player.syncPresenter) SF.Player.syncPresenter();
    if (!Live.prompt && Live.deck.quiz.scoreboard && Live.rows.length) paintRail();
  };

  /* Three settings rather than a switch, because the useful default is
     neither on nor off. 'auto' lets the deck decide — it already knows which
     slides are checks and which are explanation — and the other two are for
     when the teacher disagrees with it in the moment. */
  var FLOOR_MODES = ['auto', 'open', 'shut'];
  var FLOOR_SAYS = {
    auto: 'Floor follows the lesson — hands up at checks, not mid-explanation',
    open: 'Floor open — the room can ask or put a hand up any time',
    shut: 'Floor closed — no hands, no questions until you reopen it'
  };
  function cycleFloor() {
    if (!Live.active) {
      SF.toast('The floor needs a live room — start Host live first.');
      return;
    }
    var at = FLOOR_MODES.indexOf(Live.floor || 'auto');
    Live.floor = FLOOR_MODES[(at + 1) % FLOOR_MODES.length];
    send({ t: 'floor', mode: Live.floor });
    SF.toast(FLOOR_SAYS[Live.floor]);
  }

  /* Phones dark on the host's say-so. Deliberately separate from the wall
     Blank (B): they are two screens and a teacher wants them independently —
     a digression with the slide still up, or a slide up with nothing in the
     room's hands. Named "Blank phones" everywhere for the same reason. */
  function toggleBlankPhones() {
    if (!Live.active) {
      SF.toast('Blanking phones needs a live room — start Host live first.');
      return;
    }
    Live.phonesBlank = !Live.phonesBlank;
    send({ t: 'blankPhones', on: Live.phonesBlank });
    SF.toast(Live.phonesBlank
      ? 'Phones blanked — the room is looking up'
      : 'Phones back — the room can answer again');
  }

  function toggleReactions() {
    if (!Live.active) return;
    Live.reactions = !Live.reactions;
    send({ t: 'reactions', on: Live.reactions });
    /* Anything still in the air goes with it — switching it off has to take
       effect on the screen, not just on the next reaction. */
    if (!Live.reactions) SF.Player.clearReactions();
    SF.toast(Live.reactions
      ? 'Reactions on — the room can respond to what is on screen'
      : 'Reactions off');
  }

  /* First "next" on a live question that hasn't been revealed reveals it
     rather than skipping past it. A short grace period after the question
     appears swallows the press instead: holding an arrow key or a stray
     double-tap would otherwise reveal the answer before the room has had a
     chance to look up, and there is no way to un-reveal it. */
  var GRACE_MS = 1500;

  /**
   * What the next press will actually do.
   *
   * "Next" has four outcomes on a live question — reveal, advance, advance
   * without revealing (a vote-only pair), or nothing at all during the grace
   * — and the button said "Next point or slide" for every one of them. A
   * control that does three different things without saying which is the
   * whole of the confusion here.
   */
  Live.nextAction = function () {
    if (!Live.active) return 'advance';
    var s = SF.Player.wallSlide ? SF.Player.wallSlide()
      : (SF.Player.deck && SF.Player.deck.slides[SF.Player.idx]);
    if (!s || s.type !== 'quiz') return 'advance';
    if (Live.revealed[s.id]) return 'advance';
    if (s.style === 'definition' && SF.Player.definitionPhase &&
        SF.Player.definitionPhase(s) === 'reading') {
      return 'ask';
    }
    /* Odd One Out / Compare & Contrast: Next reveals after discuss. */
    if (s.style === 'oddone' || s.oddoneDiscuss ||
        s.style === 'compare' || s.compareDiscuss) return 'reveal';
    if (s.voteOnly) return 'hold';
    return 'reveal';
  };

  Live.NEXT_LABEL = {
    ask: 'Ask now — hide the passage',
    reveal: 'Show the answer',
    hold: 'Move on \u2014 no answer shown',
    advance: 'Next slide'
  };

  function gate(slide) {
    if (!Live.active || !slide || slide.type !== 'quiz') return false;
    if (Live.revealed[slide.id]) return false;
    /* Reading phase: Next asks the recall question rather than revealing. */
    if (slide.style === 'definition' && SF.Player.definitionPhase &&
        SF.Player.definitionPhase(slide) === 'reading') {
      if (Date.now() - Live._askedAt < GRACE_MS) {
        SF.toast('Give them a moment to read — press again to ask');
        return true;
      }
      SF.Player.definitionCommand('ask');
      return true;
    }
    /* Odd One Out / Compare discuss on the wall — Next reveals the rationale. */
    if (slide.style === 'oddone' || slide.oddoneDiscuss ||
        slide.style === 'compare' || slide.compareDiscuss) {
      if (Date.now() - Live._askedAt < GRACE_MS) {
        SF.toast('Give them a moment to discuss — press again to reveal');
        return true;
      }
      revealNow();
      return true;
    }
    /* Nor does "next" reveal it. On a vote-only question the press has to
       advance — holding the answer back and then spending it on the way out
       of the slide would be the same leak by a slower route. */
    if (slide.voteOnly) return false;
    if (Date.now() - Live._askedAt < GRACE_MS) {
      /* Swallowed, but no longer in silence. The grace stops a double press
         revealing the instant the question lands; a press that appears to do
         nothing is its own bug report. */
      SF.toast('Give them a moment \u2014 press again to show the answer');
      return true;
    }
    revealNow();
    return true;
  }

  /* Position of a quiz slide among the checks the room is in — spontaneous
     overlays first, otherwise the lasting lesson. Phones need a total that
     matches what is actually being asked. */
  function quizNumber(slide) {
    var list = (SF.Player.spontaneous && SF.Player.spontaneous.slides) || Live.deck.slides;
    var at = list.filter(function (x) { return x.type === 'quiz'; }).indexOf(slide);
    if (at >= 0) return at + 1;
    return Live.deck.slides.filter(function (x) { return x.type === 'quiz'; }).indexOf(slide) + 1;
  }

  function quizTotal() {
    var list = (SF.Player.spontaneous && SF.Player.spontaneous.slides) || Live.deck.slides;
    var n = list.filter(function (x) { return x.type === 'quiz'; }).length;
    return n || Live.deck.slides.filter(function (x) { return x.type === 'quiz'; }).length;
  }

  /** Everything the rail and the focus view both need. */
  function feedbackOpts() {
    var kind = SF.FEEDBACK_KINDS[Live.prompt.kind];
    var d = Live.digest;
    var answered = d ? d.answered : 0;
    var players = d ? d.players : Live.players.length;
    return {
      title: kind ? kind.label : 'Feedback',
      subtitle: Live.prompt.prompt,
      options: Live.prompt.options,
      ends: Live.prompt.ends,
      footnote: players
        ? answered + ' of ' + players + ' responded'
        : (Live.active ? 'Nobody has joined yet' : 'Rehearsal mode · Demo responses'),
      join: joinInfo() || (!Live.active && SF.sampleJoinInfo ? SF.sampleJoinInfo() : null),
      roster: (Live.players || []).map(function (p) {
        return { name: p.name || 'Player' };
      })
    };
  }

  /** Paint the rail from the last digest we were sent. */
  function paintFeedbackPanel() {
    if (!Live.active || !Live.prompt) return;
    if (SF.Player._railWanted === false) return;
    var opts = feedbackOpts();
    /* Keep the focus view live while it is open — the whole point of putting
       it up is to watch answers land. */
    if (Live.focus) SF.Player.showFeedbackFocus(Live.digest, opts);
    SF.Player.setFeedback(Live.digest, opts);
    if (SF.Player.syncHudRoomButtons) SF.Player.syncHudRoomButtons();
  }

  /** Open the prompt attached to this slide, or close whatever was open. */
  function syncPrompt(slide) {
    /* An impromptu poll belongs to the moment, not to a slide, and the
       teacher is often still moving through the deck behind it while the
       room votes. Slide changes leave it alone; only ending it closes it. */
    if (Live.prompt && Live.prompt.custom) return true;
    var f = SF.slideFeedback(slide);
    if (!f) {
      if (Live.prompt) {
        Live.prompt = null;
        Live.digest = null;
        Live.focus = false;
        document.body.classList.remove('fb-open');
        SF.Player.closeFocus();
        send({ t: 'promptEnd' });
      }
      return false;
    }
    document.body.classList.add('fb-open');
    /* Keyed on the slide, so returning to a slide re-opens its prompt and
       starts its replies fresh rather than inheriting the last one's. */
    var id = slide.id + ':fb';
    var presentAs = f.presentAs === 'focus' ? 'focus' : 'rail';
    if (Live.prompt && Live.prompt.id === id) {
      paintFeedbackPanel();
      applyFeedbackPresentAs(presentAs);
      return true;
    }

    /* The labels come from the one builder the editor's previews also use, so
       what you rehearsed is what the room gets. */
    var view = SF.feedbackViewOpts(f);
    Live.prompt = {
      id: id,
      kind: f.kind,
      prompt: f.prompt,
      options: view.options.filter(function (o) { return String(o).trim(); }),
      ends: view.ends,
      max: f.max,
      presentAs: presentAs
    };
    Live.digest = null;
    send(Object.assign({ t: 'prompt' }, Live.prompt));
    paintFeedbackPanel();
    applyFeedbackPresentAs(presentAs);
    return true;
  }

  /**
   * Ask the room something that was never authored — the pulse a teacher
   * takes when the lesson turns.
   *
   * Deliberately the same path as a slide's own prompt: the payload, the
   * relay message, the phone pads, the digest coming back and the overlay are
   * all the ones authored feedback already uses. The only real difference is
   * that this one has no slide to belong to.
   */
  function startCustomPrompt(def) {
    def = def || {};
    var kind = SF.FEEDBACK_KINDS[def.kind] ? def.kind : 'poll';
    var prompt = String(def.prompt || '').trim();
    if (!prompt) return false;
    var f = Object.assign(SF.makeFeedback(kind), {
      prompt: prompt,
      options: Array.isArray(def.options) ? def.options : [],
      points: def.points,
      lowLabel: def.lowLabel,
      highLabel: def.highLabel,
      max: def.max
    });
    f = SF.normalizeFeedback(f);
    var view = SF.feedbackViewOpts(f);
    var presentAs = def.presentAs === 'rail' ? 'rail' : 'focus';
    document.body.classList.add('fb-open');
    Live.prompt = {
      /* Namespaced so it cannot collide with a slide's `<id>:fb`, and unique
         per launch so asking the same question twice collects twice rather
         than adding to the first round. */
      id: 'quick:' + Date.now(),
      kind: f.kind,
      prompt: f.prompt,
      options: view.options.filter(function (o) { return String(o).trim(); }),
      ends: view.ends,
      max: f.max,
      presentAs: presentAs,
      custom: true
    };
    Live.digest = null;
    if (Live.active) {
      send(Object.assign({ t: 'prompt' }, Live.prompt));
    } else if (SF.sampleFeedbackDigest) {
      Live.digest = SF.sampleFeedbackDigest(Live.prompt);
    }
    paintFeedbackPanel();
    applyFeedbackPresentAs(presentAs);
    if (SF.Player.syncPresenter) SF.Player.syncPresenter();
    return true;
  }

  /** Take it down and give the teacher their slide back. */
  function endCustomPrompt() {
    if (!Live.prompt || !Live.prompt.custom) return false;
    Live.prompt = null;
    Live.digest = null;
    Live.focus = false;
    document.body.classList.remove('fb-open');
    SF.Player.closeFocus();
    if (Live.active) send({ t: 'promptEnd' });
    /* The deck moved on underneath, so re-read the slide now showing rather
       than assuming it is the one the poll opened over. */
    var now = SF.Player.deck && SF.Player.deck.slides[SF.Player.idx];
    if (now) syncPrompt(now);
    if (SF.Player.syncPresenter) SF.Player.syncPresenter();
    return true;
  }

  /** Honour the authored Beside / Full screen choice when this prompt opens. */
  function applyFeedbackPresentAs(presentAs) {
    if (presentAs === 'focus') {
      Live.focus = true;
      SF.Player.showFeedbackFocus(Live.digest, feedbackOpts());
    } else {
      Live.focus = false;
      SF.Player.closeFocus();
    }
  }

  /**
   * What the phone needs to know about this slide beyond the answer control:
   * which game it is, and (when idle) how to participate without claiming.
   */
  function phoneStyle(s) {
    if (!s) return Live.mechanic || 'quiz';
    if (s.bingoBoard) return 'bingo';
    if (s.bowlBoard) return 'bowl';
    if (s.lowstakesBoard) return 'lowstakes';
    if (s.memoryBoard) return (s.memoryBoard.kind || s.style || 'memorymatch');
    return s.style || Live.mechanic || 'quiz';
  }

  function phoneCompanion(s) {
    var style = phoneStyle(s);
    var role = 'wait';
    var participation = '';
    var headPrompt = '';
    if (!s) return { style: style, role: role, participation: participation, headPrompt: headPrompt };
    if (s.bingoBoard) {
      role = 'watch';
      headPrompt = 'Bingo';
      participation = 'Watch the board. If your team has the term, explain it when asked.';
    } else if (s.memoryBoard) {
      role = 'watch';
      headPrompt = 'Memory';
      participation = 'Watch the cards. Explain aloud when it is your turn — the teacher marks the claim.';
    } else if (s.bowlBoard) {
      role = 'watch';
      headPrompt = 'Quiz bowl';
      participation = 'Watch the board. Answer out loud when your team is up — the teacher awards the cell.';
    } else if (s.lowstakesBoard) {
      role = 'paper';
      headPrompt = 'Low-stakes quiz';
      participation = 'Write on paper. No phone scoring — watch the board for the reveal.';
    } else if (s.style === 'oddone' || s.oddoneDiscuss) {
      role = 'discuss';
      headPrompt = 'Odd one out';
      participation = 'Discuss with the room. Do not tap an answer — the teacher reveals the odd one.';
    } else if (s.style === 'compare' || s.compareDiscuss) {
      role = 'discuss';
      headPrompt = 'Compare & contrast';
      participation = 'Discuss similarities and differences. Do not tap an answer on your phone.';
    } else if (s.style === 'conceptchain' || s.conceptChain) {
      role = 'discuss';
      headPrompt = 'Concept chain';
      participation = 'Propose a link aloud. The teacher types and accepts — nothing to tap here.';
    } else if (s.style === 'definition' && SF.Player.definitionPhase &&
        SF.Player.definitionPhase(s) === 'reading') {
      role = 'watch';
      headPrompt = 'Definition challenge';
      participation = 'Read the passage on the screen. No notes — your phone asks when the passage clears.';
    } else if (s.style === 'emoji') {
      headPrompt = s.headPrompt || 'What do these clues point to?';
    } else if (s.style === 'definition') {
      headPrompt = 'Recall from memory';
    } else if (s.headPrompt) {
      headPrompt = String(s.headPrompt);
    }
    return { style: style, role: role, participation: participation, headPrompt: headPrompt };
  }

  function sendIdle(s) {
    send(Object.assign({ t: 'idle' }, phoneCompanion(s)));
  }

  function sendSlideContext(s) {
    var companion = phoneCompanion(s);
    var pos = SF.Player.wallPos ? SF.Player.wallPos() : { index: SF.Player.idx, total: Live.deck.slides.length };
    send({
      t: 'at',
      slideId: s.id,
      title: s.title || s.question || s.gameTitle || '',
      n: pos.index + 1,
      total: pos.total,
      activity: s.type === 'quiz' ? (Live.revealed[s.id] ? 'moment' : 'question') : SF.slideFeedback(s) ? 'feedback' : (s.type === 'results' || s.gameId) ? 'moment' : 'content',
      text: SF.slideExcerpt(s, SF.Player.revealStep || 0),
      /* How far through a build the room is. The phones only need the excerpt,
         which already accounts for it — but a big screen renders the slide
         itself, and without this every Build-on-Next slide sits there showing
         nothing but its heading for as long as it is up. */
      step: SF.Player.revealStep || 0,
      style: companion.style,
      role: companion.role,
      participation: companion.participation,
      headPrompt: companion.headPrompt
    });
  }
  SF.Player.on('step',function(){
    if(!Live.active)return;
    var s = SF.Player.wallSlide ? SF.Player.wallSlide() : (SF.Player.deck && SF.Player.deck.slides[SF.Player.idx]);
    if(s){sendSlideContext(s);syncManual();}
  });

  /* Land on a question with teacher-entered learners in the room and the
     entry window comes to you.
     Having to leave the slideshow, find a window and come back is the whole
     reason teacher entry felt like a detour — the moment it is needed is
     exactly the moment the teacher is least able to go hunting for it. Only
     when somebody is actually being entered by hand, and only once per
     question, so it never nags a room that is all phones. */
  var surfacedFor = null;
  function surfaceEntry(slide){
    if(!Live.active || !slide || slide.type!=='quiz') return;
    if(SF.Player.hasPresenter && SF.Player.hasPresenter()) return;
    if(!manualKey) return;                       // teacher entry never opened
    if(!(Live.players||[]).some(function(p){return p.manual;})) return;
    if(surfacedFor===slide.id) return;
    surfacedFor=slide.id;
    SF.Player.openPresenter('mark');
  }
  SF.Player.on('slide',function(e){ if(e && e.slide) surfaceEntry(e.slide); });

  function sendOpenQuestion(s) {
    var companion = phoneCompanion(s);
    var msg = {
      t: 'question',
      id: s.id,
      n: quizNumber(s),
      total: quizTotal(),
      question: s.question,
      /* Journalled so the report knows an unrevealed check was meant to be
         unrevealed, rather than reading as a loop somebody forgot to close. */
      voteOnly: s.voteOnly === true,
      sourceSlideId: s.sourceSlideId || s.id,
      /* Neither a typed nor a slider question sends options — there are
         none. The phones switch control on `input` alone, and a slider
         needs the line it slides along. The target never leaves the host. */
      input: s.input || 'choice',
      confidence: s.confidence !== false,
      range: s.input === 'number'
        ? { min: s.min, max: s.max, step: s.step, unit: s.unit || '' }
        : null,
      options: (s.options || []).filter(function (o) { return String(o).trim(); }),
      /* The host's own note about what a wrong answer means. Journalled for
         the report and never forwarded to a phone — see questionMessage in
         server/server.js, which names the fields players receive. Telling the
         room a misconception for option C would tell them C is wrong. */
      misconceptions: Array.isArray(s.misconceptions)
        ? (s.options || []).reduce(function (out, o, i) {
            if (String(o).trim()) out.push(s.misconceptions[i] || '');
            return out;
          }, [])
        : undefined,
      timeLimit: SF.questionTimeLimit(s, Live.players.some(function(p){return p.manual;})),
      points: s.points,
      /* Game identity for the phone companion UI — not a miniature slide. */
      style: companion.style,
      headPrompt: companion.headPrompt || undefined
    };
    if (s.style === 'emoji') {
      msg.clueMode = 'emoji';
      msg.clues = String(s.clues || s.question || '').slice(0, 80);
      /* question stays the clues for the journal; headPrompt is the mission. */
    }
    send(msg);
  }

  function sendDefinitionOrQuestion(s) {
    sendOpenQuestion(s);
  }

  function onSlide(e) {
    if (!Live.active) return;
    var s = e.slide;

    /* Feedback takes the rail while its slide is up; the scoreboard resumes
       on any slide that has no prompt. */
    var collecting;

    /* Every slide a game contributes carries its gameId. Crossing into a new
       one is a new round: tell the relay so the join window reopens and anyone
       held in the waiting room is brought in before the first question. */
    if (s.gameId && s.gameId !== Live.roundGame) {
      Live.roundGame = s.gameId;
      /* New game block — start a fresh chain for Concept Chain. */
      if (SF.Player.chainCommand) SF.Player.chainCommand('clear');
      send({ t: 'round', gameId: s.gameId });
    }

    /* Tell the relay where we are, so a pace signal can be filed against the
       slide the room was actually looking at. Sent for every slide, not just
       questions — confusion happens on the explaining ones. */
    sendSlideContext(s);
    /* And the teacher's window, which is showing a question list and needs to
       know the question changed. It used to learn only when some unrelated
       relay message happened along, so walking onto a quiz slide left it
       saying "Ready for the next question" with no answer buttons on it —
       until a phone did something. */
    syncManual();
    collecting = syncPrompt(s);

    if (SF.Boards && SF.Boards.forSlide(s)) {
      stopDrip();
      sendIdle(s);
      SF.Player.disableRail();
      return; // Oral / paper boards: never send learner claim buttons.
    }

    if (s.type === 'quiz') {
      if (Live.revealed[s.id]) {
        // revisiting an already-scored question: just show the room's numbers
        sendIdle(s);
        return;
      }
      Live._sentSlide = s.id;
      Live._askedAt = Date.now();
      Live.snapshot = { rev: 0, answers: [] };
      if (Live._sureTimer) { clearTimeout(Live._sureTimer); Live._sureTimer = null; }
      stopDrip();
      if (s.style === 'wordreveal' || Live.mechanic === 'wordreveal') startWordReveal(s);
      if (Live.mechanic === 'claim' && (s.studySeconds > 0 || s.term)) paintStudy(s);
      /* Definition Challenge opens in reading: phones stay idle until Ask. */
      if (s.style === 'definition' && SF.Player.definitionPhase &&
          SF.Player.definitionPhase(s) === 'reading') {
        sendIdle(s);
        return;
      }
      /* Odd One Out / Compare & Contrast: wall-led discuss — phones wait. */
      if (s.style === 'oddone' || s.oddoneDiscuss ||
          s.style === 'compare' || s.compareDiscuss) {
        sendIdle(s);
        return;
      }
      /* Concept Chain is host-oracy — phones stay idle while the chain grows. */
      if (s.style === 'conceptchain' || s.conceptChain) {
        sendIdle(s);
        return;
      }
      sendDefinitionOrQuestion(s);
    } else if (s.type === 'results') {
      sendIdle(s);
      setTimeout(function () {
        if (Live.mechanic === 'race') {
          var lanes = raceLanes();
          var note = Live.winners.length ? winnerNote() : lanes.length
            ? lanes[0].name + ' finishes furthest along'
            : '';
          SF.Player.showRaceTrack(lanes, {
            length: Live.trackLength,
            title: 'Result',
            note: note,
            winners: Live.winners.length ? Live.winners : (lanes[0] ? [lanes[0].key] : [])
          });
          send({ t: 'finish', kind: 'race', title: 'Race result', note: note });
        } else if (Live.mechanic === 'boss') {
          var bossNote = Live.bossHp <= 0
            ? 'The room brought the boss down'
            : 'Boss survived at ' + Live.bossHp + ' / ' + Live.bossMax + ' HP';
          showBoss(bossNote, false);
          send({ t: 'finish', kind: 'boss', title: 'Boss battle', note: bossNote });
        } else {
          SF.Player.showLeaderboard(finalBoard(), 'Final scores');
          send({ t: 'finish', title: 'Final scores' });
        }
      }, 400);
    } else {
      sendIdle(s);
    }

    if (!collecting && Live.deck.quiz.scoreboard && Live.rows.length) paintRail();
    paintCues();
  }

  /** Whoever is being scored — teams or individuals — ready for the big board. */
  function finalBoard() {
    if (!Live.rows.length) return Live.players;
    return Live.rows.map(function (r) {
      return {
        name: r.name + (r.members != null ? ' (' + r.members + ')' : ''),
        score: r.score
      };
    });
  }

  /**
   * How the room's answers divide by whether they meant them.
   *
   * Confidently wrong is the number worth acting on: a wrong answer given
   * with conviction is a misconception and needs re-teaching, while a wrong
   * guess is a gap and needs practice. They look identical in a tally.
   */
  function confidenceSplit() {
    var s = SF.Player.deck && SF.Player.deck.slides[SF.Player.idx];
    if (!s || s.type !== 'quiz') return null;
    var out = { sureRight: 0, sureWrong: 0, unsureRight: 0, unsureWrong: 0, unstated: 0, asked: 0 };
    (Live.snapshot.answers || []).forEach(function (a) {
      out.asked++;
      if (typeof a.sure !== 'boolean') { out.unstated++; return; }
      var right = SF.markResponse(s, a.response);
      if (a.sure) out[right ? 'sureRight' : 'sureWrong']++;
      else out[right ? 'unsureRight' : 'unsureWrong']++;
    });
    return out;
  }

  /** Mark every answer in the current snapshot. This is the host's job now. */
  function marksFor(slide) {
    return (Live.snapshot.answers || []).map(function (a) {
      return [a.id, SF.markResponse(slide, a.response)];
    });
  }

  /* Grouped for the screen: what the room typed, how many typed it, and
     whether it counted. Ordered by how many said it, so the room sees the
     common answer — right or wrong — first. */
  function typedGroups(slide) {
    var byKey = {};
    (Live.snapshot.answers || []).forEach(function (a) {
      if (typeof a.response !== 'string') return;
      var key = SF.normalizeAnswer(a.response);
      if (!byKey[key]) {
        byKey[key] = {
          text: SF.answerLabel(slide, a.response),
          n: 0,
          right: SF.markResponse(slide, a.response)
        };
      }
      byKey[key].n++;
    });
    return Object.keys(byKey).map(function (k) { return byKey[k]; })
      .sort(function (a, b) { return b.n - a.n || (b.right ? 1 : 0) - (a.right ? 1 : 0); });
  }

  /* The values the room placed on the line, each with whether it counted.
     Ordered along the line rather than by popularity: an estimate's story is
     where the guesses sit relative to the answer. */
  function placedValues(slide) {
    return (Live.snapshot.answers || [])
      .filter(function (a) { return typeof a.response === 'number'; })
      .map(function (a) {
        return { value: a.response, right: SF.markResponse(slide, a.response) };
      })
      .sort(function (a, b) { return a.value - b.value; });
  }

  /** Send the verdicts. Separate from revealNow so a stale mark can be
      re-sent without repainting the slide. */
  function sendReveal(s) {
    var mechanic = s.style ? SF.gameStyle(s.style).mechanic : Live.mechanic;
    var open = s.input === 'text' || s.input === 'number';
    var msg = {
      t: 'reveal',
      id: s.id,
      rev: Live.snapshot.rev,
      marks: marksFor(s),
      correct: open ? -1 : s.correct,
      answer: open ? (s.answer || '') : (s.options[s.correct] || ''),
      explanation: s.explanation || ''
    };
    if (mechanic === 'speed') msg.gains = speedGains(s);
    if (mechanic === 'boss') msg.gains = bossGains(s);
    if (mechanic === 'wordreveal') msg.gains = wordRevealGains(s);
    if (s.input === 'order') msg.gains = orderGains(s);
    if (mechanic === 'claim') msg.gains = claimGains(s);
    if (mechanic === 'judge' || mechanic === 'count') msg.gains = judgeGains(s);
    if (mechanic === 'bowl') msg.gains = bowlGains(s);
    send(msg);
  }

  /* Everyone has answered. How long to hold the reveal for the ones still
     tapping "how sure" — the person who answered last has only just been
     asked, so this has to cover reading the question and a deliberate tap,
     not just the tap. Short enough that the room does not notice a pause. */
  var CONFIDENCE_GRACE_MS = 5000;

  /**
   * Auto-reveal, but not before the phones have finished asking.
   *
   * Revealing the instant the last answer lands is what a room that answers
   * fast actually produces, and it collected the answers while throwing away
   * every confidence — the phones were still asking. So the reveal waits for
   * them, and stops waiting after a beat so one person who ignores the
   * question cannot hold the room.
   */
  function considerReveal(m) {
    var s = SF.Player.deck && SF.Player.deck.slides[SF.Player.idx];
    if (!s || s.type !== 'quiz' || Live.revealed[s.id]) return;
    /* A vote-only question never resolves itself. The split is the point and
       the answer belongs to the question after the discussion. */
    if (s.voteOnly) return;
    var pending = s.confidence !== false ? (m.answered || 0) - (m.sured || 0) : 0;
    if (pending <= 0) {
      if (Live._sureTimer) { clearTimeout(Live._sureTimer); Live._sureTimer = null; }
      revealNow();
      return;
    }
    if (!Live._sureTimer) {
      Live._sureTimer = setTimeout(function () {
        Live._sureTimer = null;
        revealNow();
      }, CONFIDENCE_GRACE_MS);
    }
  }

  function revealNow() {
    var s = SF.Player.wallSlide ? SF.Player.wallSlide()
      : (SF.Player.deck && SF.Player.deck.slides[SF.Player.idx]);
    if (!s || s.type !== 'quiz' || Live.revealed[s.id]) return;
    Live.revealed[s.id] = true;
    stopDrip();
    /* The reasoning reaches the phones at the same moment they learn whether
       they were right, which is when they are most likely to read it. */
    sendReveal(s);
    if (s.input === 'text') SF.Player.showTypedAnswers(typedGroups(s));
    if (s.input === 'number') SF.Player.showPlacedValues(placedValues(s));
    // paint the right answer on the projected slide even though the host
    // never clicked anything
    if (SF.Player.answers[s.id] == null) SF.Player.answers[s.id] = -1;
    if (SF.Player._current) {
      var node = SF.Player._current;
      var typed = s.input === 'text' || s.input === 'number';
      Array.prototype.forEach.call(node.querySelectorAll('.opt'), function (b) {
        var i = Number(b.dataset.choice);
        b.classList.add('locked');
        /* A typed question's one box is the answer, not a candidate for it. */
        if (s.style === 'oddone' || s.oddoneDiscuss) {
          if (i === s.correct) b.classList.add('odd-marked', 'correct');
          else b.classList.add('muted');
        } else {
          b.classList.add(typed || i === s.correct ? 'correct' : 'muted');
        }
      });
      var discuss = node.querySelector('.oddone-discuss, .compare-discuss');
      if (discuss) discuss.remove();
      if (s.style === 'oddone' || s.oddoneDiscuss) {
        Array.prototype.forEach.call(node.querySelectorAll('.opt'), function (b) {
          var i = Number(b.dataset.choice);
          var tick = b.querySelector('.tick');
          if (tick) tick.textContent = i === s.correct ? 'odd one' : '';
        });
      }
      if (s.style === 'compare' || s.compareDiscuss) {
        var panels = node.querySelector('.compare-panels');
        if (panels) panels.classList.add('on');
      }
      if (node.classList.contains('has-why')) {
        SF.Player.flattenOverlay(node);
        node.classList.add('why-open');
        SF.Player.scheduleFit(node);
      }
      SF.Player.openTally(node);
    }
    /* The answer is out, so the music under the thinking time stops. */
    SF.Player.stopMusic();
    /* Presenter view can now show who was right — it withholds that until
       the room has been told, so it is resent here rather than waiting for a
       tally that may never come. */
    SF.Player.syncPresenter();
    /* A race always shows the track after a reveal — that movement is the
       whole point of the game, not a redundant restating of the scores. The
       track is drawn by advanceRace() when the relay reports the breakdown, so
       there is nothing to schedule here.

       For a points game, with the rail on screen the standings are already
       visible at all times, so a full-slide leaderboard between questions
       would just hide the answer everyone is reading. */

  }

  Live.stop = function () {
    Live.active = false;
    SF.Player.gate = null;
    SF.Player.lanesProvider = null;
    document.body.classList.remove('live-on');
    document.body.classList.remove('fb-open');
    Live.focus = false;
    var card = document.getElementById('joincard');
    if (card) card.classList.remove('on');
    if (lobby) lobby.classList.remove('on');
    announced = null;
    send({ t: 'end' });
    if (Live.session && SF.Reports) {
      var id = Live.session.id;
      if (!Live.recordingFailed) setTimeout(function () { SF.Reports.refresh(id); }, 250);
      SF.toast('Session ended. Attendance and responses are available in Reports.');
    }
    if (Live.ws) {
      var closingSocket = Live.ws;
      // Let the relay deliver its final report before closing the transport.
      setTimeout(function () { try { closingSocket.close(); } catch (e) {} }, 1500);
      Live.ws = null;
    }
    Live.pin = null;
    syncManual();
  };

  /* A memory or knowledge board is judged out loud and never reaches a phone,
     so the relay hears nothing about it unless we say so — and without this a
     whole round leaves no trace in the report. Registered once: send() drops
     it on the floor when no room is listening. */
  function reportVerdict(v) {
    send({ t: 'oral', slideId: v.slideId, title: v.title, kind: v.kind,
      set: v.set, card: v.card, term: v.term, participant: v.participant,
      right: v.right, value: v.value || 0 });
  }
  if (SF.Boards && SF.Boards.onVerdict) SF.Boards.onVerdict(reportVerdict);
  if (SF.Boss) SF.Boss.onVerdict = reportVerdict;

  Live.joinInfo = joinInfo;

  /* Move an open prompt between full screen and the rail without restarting
     it: the room has already answered, and re-sending would collect again. */
  Live.setPromptPresentAs = function (presentAs) {
    if (!Live.prompt) return false;
    Live.prompt.presentAs = presentAs === 'rail' ? 'rail' : 'focus';
    applyFeedbackPresentAs(Live.prompt.presentAs);
    paintFeedbackPanel();
    return true;
  };

  /* Re-draw an open prompt over the slide now showing. renderCurrent appends
     the new slide after the overlay, and simply re-parenting the old node
     restarts its entrance animation and strands it at opacity 0 — so it is
     rebuilt through the call that made it rather than moved. */
  Live.repaintPrompt = function () {
    if (!Live.prompt || Live.prompt.presentAs !== 'focus') return false;
    Live.focus = true;
    SF.Player.showFeedbackFocus(Live.digest, feedbackOpts());
    /* A redraw over the new slide is not an entrance. Without this the poll
       fades itself back in on every slide change, which reads as a flicker to
       a room part-way through answering — and the fade leaves it at opacity 0
       if anything interrupts it. */
    var overlay = document.querySelector('#player [data-overlay]');
    if (overlay) overlay.classList.remove('entering', 'tr-fade');
    return true;
  };

  Live.startCustomPrompt = startCustomPrompt;
  Live.endCustomPrompt = endCustomPrompt;
  /* True while an impromptu poll is up, so the player and the presenter desk
     can show "end poll" rather than guessing from the focus overlay. */
  Live.customPromptOpen = function () { return !!(Live.prompt && Live.prompt.custom); };

  /* Turn the big-screen seat on for a share id, or off with no argument.
     A named method rather than exposing send(): the relay acts on anything it
     is given, and the rest of the app has no business reaching the socket. */
  Live.watchOn = function (id) {
    if (!Live.active) return false;
    send({ t: 'watchOn', s: typeof id === 'string' ? id : '' });
    return true;
  };

  SF.Live = Live;
})(window);
