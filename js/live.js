/* SlideForge — live audience mode (host side).
   Phones join with a PIN, answer each quiz slide on their own screen, and the
   room's answers roll up into a tally and a leaderboard on the projected deck.
   Needs the bundled relay: `node server/server.js`. Without it, everything
   else in SlideForge still works — this is the one feature that can't run
   from a bare file:// page, because the phones have to reach something. */
(function (global) {
  'use strict';

  var SF = global.SF;
  var el = SF.el;

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
    /* The feedback prompt open on the current slide, and the room's replies. */
    prompt: null,
    digest: null,
    focus: false,
    qa: null,
    /* The room's answers to the question on screen, as the relay last pushed
       them, with the revision they were taken at. The host marks from this —
       see marksFor() and the note on SF.markResponse. */
    snapshot: { rev: 0, answers: [] }
  };

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
    document.getElementById('lobbyCancel').onclick = function () { Live.stop(); };
    document.getElementById('lobbyStart').onclick = function () { Live.begin(); };
  }

  function warn(text) {
    warnEl.textContent = text;
    warnEl.style.display = text ? 'block' : 'none';
  }

  function drawPlayers() {
    listEl.innerHTML = '';
    Live.players.forEach(function (p) {
      var chip = el('div', 'chip', p.name + (p.connected === false ? ' · disconnected' : ''));
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

  Live.host = function (deck) {
    if (!lobby) refs();
    if (this.ws) this.stop();          // never leave a previous room dangling
    this.deck = deck;
    this.players = [];
    this.session = null;
    this.recordingFailed = false;
    this.revealed = {};
    this.pin = null;
    drawPlayers();
    pinEl.textContent = '····';
    urlEl.textContent = joinAddress().replace(/^https?:\/\//, '');
    warn('');
    lobby.classList.add('on');

    this.mode = deck.quiz.mode;
    this.mechanic = deck.mechanic || 'points';
    this.trackLength = deck.trackLength || 5;
    this.pos = {};
    this.winners = [];
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

  function connect() {
    var url = relayUrl();
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
      if (!settled) { try { ws.close(); } catch (e) {} offline(url); }
    }, 4000);

    ws.onopen = function () {
      settled = true;
      clearTimeout(giveUp);
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
    };

    ws.onerror = function () {
      if (!settled) { settled = true; clearTimeout(giveUp); offline(url); }
    };

    ws.onclose = function () {
      if (Live.ws !== ws) return;
      if (!settled) { settled = true; clearTimeout(giveUp); offline(url); return; }
      if (Live.active) SF.toast('Lost the connection to the live relay');
      Live.active = false;
      SF.Player.gate = null;
    };
  }

  function offline(url) {
    pinEl.textContent = '✕';
    urlEl.textContent = 'relay not running';
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
        if (SF.Reports) SF.Reports.receive(m.report);
        break;
      case 'hosted':
        Live.session = m.session || null;
        if (m.session && SF.Reports) SF.Reports.track(m.session);
        else if (SF.Reports) { SF.Reports.recording(false); warn('This relay does not support session reports. Restart it with the updated server.'); }
        Live.pin = m.pin;
        Live.joinUrl = m.joinUrl || joinAddress();
        pinEl.textContent = m.pin;
        Live.mode = m.mode || 'individual';
        Live.teams = (m.teams || []).map(function (n) { return { name: n }; });
        if (m.joinUrl) urlEl.textContent = String(m.joinUrl).replace(/^https?:\/\//, '');
        drawPlayers();
        break;

      case 'players':
        if (m.pin) Live.pin = m.pin;
        if (m.joinUrl) Live.joinUrl = m.joinUrl;
        Live.joinOpen = m.joinOpen !== false;
        Live.waiting = m.waiting || 0;
        Live.roundNo = m.round || 0;
        Live.players = m.list || [];
        Live.rows = m.rows || [];
        Live.counts = m.counts || null;
        if (m.mode) Live.mode = m.mode;
        drawPlayers();
        paintRail();
        if (document.getElementById('joincard').classList.contains('on')) paintJoinCard();
        break;

      case 'tally':
        Live.snapshot = { rev: m.rev || 0, answers: m.answers || [] };
        SF.Player.setTally(m.counts || [], { answered: m.answered, total: m.total });
        if (m.allIn && m.answered > 0) revealNow();
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
        break;

      case 'qa':
        Live.qa = m;
        SF.Player.qa = m;
        SF.Player.setQACue({ pending: m.pending, open: m.open });
        syncPinned(m.pinned);
        SF.Player.syncPresenter();
        break;

      case 'responses':
        if (!Live.prompt || m.id !== Live.prompt.id) break;
        Live.digest = m;
        paintFeedbackPanel();
        break;

      case 'error':
        warn(m.message || 'The relay refused that request.');
        break;
    }
  }

  /* ---------------------------------------------------------- scoreboard */

  /** Push the current standings into the always-on rail. */
  function paintRail() {
    if (!Live.active || !Live.deck.quiz.scoreboard) return;

    var racing = Live.mechanic === 'race';

    var rows = Live.rows.map(function (r) {
      return {
        key: r.key,
        name: r.name,
        /* In a race the number that matters is how far along you are, not how
           many points you have — so the rail shows steps out of the track. */
        score: racing ? (Live.pos[r.key] || 0) + ' / ' + Live.trackLength : r.score,
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
      footnote: racing
        ? 'A team moves when most of it picks right'
        : (Live.mode === 'teams' ? 'Average per player' : ''),
      join: Live.pin ? {
        pin: Live.pin,
        url: shortHost(),
        open: Live.joinOpen,
        waiting: Live.waiting
      } : null,
      emptyText: Live.mode === 'teams'
        ? 'Waiting for teams'
        : 'Waiting for players'
    });
  }

  /** host:port only — the rail has no room for a scheme and a path. */
  function shortHost() {
    return String(Live.joinUrl || joinAddress())
      .replace(/^https?:\/\//, '')
      .replace(/\/join\.html$/, '');
  }

  /* ------------------------------------------------- join card (mid-game) */

  function paintJoinCard() {
    document.getElementById('jcUrl').textContent =
      String(Live.joinUrl || joinAddress()).replace(/^https?:\/\//, '');
    document.getElementById('jcPin').textContent = Live.pin || '----';

    var teams = document.getElementById('jcTeams');
    teams.innerHTML = '';
    if (Live.mode === 'teams') {
      Live.teams.forEach(function (t, i) {
        var chip = el('div', 'tchip', t.name || t);
        chip.style.background = SF.teamColor(i);
        if (i === 2) chip.style.color = '#1d1204';
        teams.appendChild(chip);
      });
    }

    var n = Live.players.length;
    var parts = [n ? n + (n === 1 ? ' player is in' : ' players are in') : 'Nobody has joined yet'];
    if (Live.waiting) {
      parts.push(Live.waiting + (Live.waiting === 1 ? ' waiting for' : ' waiting for') +
                 ' the next round');
    }
    document.getElementById('jcCount').textContent = parts.join(' · ');

    var state = document.getElementById('jcState');
    if (Live.joinOpen) {
      state.textContent = 'Joining is open';
      state.className = 'state open';
    } else {
      state.textContent = 'Joining closed until the next round';
      state.className = 'state shut';
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
      return;
    }

    if (Live.prompt) {
      Live.focus = true;
      SF.Player.showFeedbackFocus(Live.digest, feedbackOpts());
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
      return;
    }

    if (!Live.rows.length) {
      SF.toast('Nothing to expand yet — nobody has joined');
      return;
    }
    Live.focus = true;
    SF.Player.showLeaderboard(finalBoard(), 'Standings', true);
  }

  function toggleJoinCard(opts) {
    var card = document.getElementById('joincard');
    if (!Live.active) { card.classList.remove('on'); return; }
    if (opts && opts.close) { card.classList.remove('on'); return; }
    if (card.classList.contains('on')) {
      card.classList.remove('on');
    } else {
      paintJoinCard();
      card.classList.add('on');
    }
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
        var now = Math.min(Live.trackLength, p.correct || 0);
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

  /* ------------------------------------------------------------ running */

  /* Player events are wired once per page load. Doing it inside begin() would
     stack a second set of handlers on every game hosted in the same session,
     which double-sends each question and wipes answers already given. */
  var wired = false;

  function wire() {
    if (wired) return;
    wired = true;
    SF.Player.on('slide', onSlide);
    SF.Player.on('timeup', function () { revealNow(); });
    SF.Player.on('close', function () { if (Live.active) Live.stop(); });
    SF.Player.on('joinToggle', toggleJoinCard);
    SF.Player.on('focusToggle', toggleFocus);
    SF.Player.on('qaCommand', moderate);
  }

  Live.begin = function () {
    if (!this.pin) { warn('Not connected to the relay yet.'); return; }
    lobby.classList.remove('on');
    this.active = true;
    send({ t: 'begin' });

    wire();
    SF.Player.lanesProvider = function () {
      return Live.mechanic === 'race' ? raceLanes() : null;
    };
    document.body.classList.add('live-on');
    SF.Player.gate = gate;
    SF.Player.start(this.deck, 0);
    if (!Live.prompt && this.deck.quiz.scoreboard && Live.rows.length) paintRail();
  };

  /* First "next" on a live question that hasn't been revealed reveals it
     rather than skipping past it. A short grace period after the question
     appears swallows the press instead: holding an arrow key or a stray
     double-tap would otherwise reveal the answer before the room has had a
     chance to look up, and there is no way to un-reveal it. */
  var GRACE_MS = 1500;

  function gate(slide) {
    if (!Live.active || !slide || slide.type !== 'quiz') return false;
    if (Live.revealed[slide.id]) return false;
    if (Date.now() - Live._askedAt < GRACE_MS) return true;
    revealNow();
    return true;
  }

  /* Position of a quiz slide among the deck's quiz slides, so "Question 3"
     on a phone matches "Q3" on the projected slide. */
  function quizNumber(slide) {
    return Live.deck.slides.filter(function (x) { return x.type === 'quiz'; }).indexOf(slide) + 1;
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
        : 'Nobody has joined yet',
      join: Live.pin ? {
        pin: Live.pin, url: shortHost(), open: Live.joinOpen, waiting: Live.waiting
      } : null
    };
  }

  /** Paint the rail from the last digest we were sent. */
  function paintFeedbackPanel() {
    if (!Live.active || !Live.prompt) return;
    var kind = SF.FEEDBACK_KINDS[Live.prompt.kind];
    var d = Live.digest;
    var answered = d ? d.answered : 0;
    var players = d ? d.players : Live.players.length;

    /* Keep the focus view live while it is open — the whole point of putting
       it up is to watch answers land. */
    if (Live.focus) SF.Player.showFeedbackFocus(d, feedbackOpts());

    SF.Player.setFeedback(d, {
      title: kind ? kind.label : 'Feedback',
      subtitle: Live.prompt.prompt,
      options: Live.prompt.options,
      ends: Live.prompt.ends,
      footnote: players
        ? answered + ' of ' + players + ' responded'
        : 'Nobody has joined yet',
      join: Live.pin ? {
        pin: Live.pin, url: shortHost(), open: Live.joinOpen, waiting: Live.waiting
      } : null
    });
  }

  /** Open the prompt attached to this slide, or close whatever was open. */
  function syncPrompt(slide) {
    var f = SF.slideFeedback(slide);
    if (!f) {
      if (Live.prompt) {
        Live.prompt = null;
        Live.digest = null;
        Live.focus = false;
        document.body.classList.remove('fb-open');
        send({ t: 'promptEnd' });
      }
      return false;
    }
    document.body.classList.add('fb-open');
    /* Keyed on the slide, so returning to a slide re-opens its prompt and
       starts its replies fresh rather than inheriting the last one's. */
    var id = slide.id + ':fb';
    if (Live.prompt && Live.prompt.id === id) { paintFeedbackPanel(); return true; }

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
      bloom: slide.bloom || ''
    };
    Live.digest = null;
    Live.focus = false;         // a new prompt starts collapsed
    send(Object.assign({ t: 'prompt' }, Live.prompt));
    paintFeedbackPanel();
    return true;
  }

  function onSlide(e) {
    if (!Live.active) return;
    var s = e.slide;

    /* Feedback takes the rail while its slide is up; the scoreboard resumes
       on any slide that has no prompt. */
    var collecting = syncPrompt(s);

    /* Every slide a game contributes carries its gameId. Crossing into a new
       one is a new round: tell the relay so the join window reopens and anyone
       held in the waiting room is brought in before the first question. */
    if (s.gameId && s.gameId !== Live.roundGame) {
      Live.roundGame = s.gameId;
      send({ t: 'round', gameId: s.gameId });
    }

    if (s.type === 'quiz') {
      if (Live.revealed[s.id]) {
        // revisiting an already-scored question: just show the room's numbers
        send({ t: 'idle' });
        return;
      }
      Live._sentSlide = s.id;
      Live._askedAt = Date.now();
      Live.snapshot = { rev: 0, answers: [] };
      send({
        t: 'question',
        id: s.id,
        n: quizNumber(s),
        question: s.question,
        bloom: s.bloom || '',
        sourceSlideId: s.sourceSlideId || s.id,
        /* Neither a typed nor a slider question sends options — there are
           none. The phones switch control on `input` alone, and a slider
           needs the line it slides along. The target never leaves the host. */
        input: s.input || 'choice',
        range: s.input === 'number'
          ? { min: s.min, max: s.max, step: s.step, unit: s.unit || '' }
          : null,
        options: (s.options || []).filter(function (o) { return String(o).trim(); }),
        timeLimit: s.timeLimit,
        points: s.points
      });
    } else if (s.type === 'results') {
      send({ t: 'idle' });
      setTimeout(function () {
        if (Live.mechanic === 'race') {
          var lanes = raceLanes();
          SF.Player.showRaceTrack(lanes, {
            length: Live.trackLength,
            title: 'Result',
            note: Live.winners.length ? winnerNote() : lanes.length
              ? lanes[0].name + ' finishes furthest along'
              : '',
            winners: Live.winners.length ? Live.winners : (lanes[0] ? [lanes[0].key] : [])
          });
        } else {
          SF.Player.showLeaderboard(finalBoard(), 'Final scores');
        }
      }, 400);
    } else {
      send({ t: 'idle' });
    }

    if (!collecting && Live.deck.quiz.scoreboard && Live.rows.length) paintRail();
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
    var open = s.input === 'text' || s.input === 'number';
    send({
      t: 'reveal',
      id: s.id,
      rev: Live.snapshot.rev,
      marks: marksFor(s),
      correct: open ? -1 : s.correct,
      answer: open ? (s.answer || '') : (s.options[s.correct] || ''),
      explanation: s.explanation || ''
    });
  }

  function revealNow() {
    var s = SF.Player.deck && SF.Player.deck.slides[SF.Player.idx];
    if (!s || s.type !== 'quiz' || Live.revealed[s.id]) return;
    Live.revealed[s.id] = true;
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
        b.classList.add(typed || i === s.correct ? 'correct' : 'muted');
      });
      if (node.classList.contains('has-why')) {
        SF.Player.flattenOverlay(node);
        node.classList.add('why-open');
        SF.Player.scheduleFit(node);
      }
      var t = node.querySelector('.tally');
      if (t) t.classList.add('on');
    }
    /* A race always shows the track after a reveal — that movement is the
       whole point of the game, not a redundant restating of the scores. The
       track is drawn by advanceRace() when the relay reports the breakdown, so
       there is nothing to schedule here.

       For a points game, with the rail on screen the standings are already
       visible at all times, so a full-slide leaderboard between questions
       would just hide the answer everyone is reading. */

  }

  Live.stop = function () {
    this.active = false;
    SF.Player.gate = null;
    SF.Player.lanesProvider = null;
    document.body.classList.remove('live-on');
    document.body.classList.remove('fb-open');
    this.focus = false;
    var card = document.getElementById('joincard');
    if (card) card.classList.remove('on');
    if (lobby) lobby.classList.remove('on');
    send({ t: 'end' });
    if (this.session && SF.Reports) {
      var id = this.session.id;
      if (!this.recordingFailed) setTimeout(function () { SF.Reports.refresh(id); }, 250);
      SF.toast('Session ended. Attendance and responses are available in Reports.');
    }
    if (this.ws) {
      var closingSocket = this.ws;
      // Let the relay deliver its final report before closing the transport.
      setTimeout(function () { try { closingSocket.close(); } catch (e) {} }, 1500);
      this.ws = null;
    }
    this.pin = null;
  };

  SF.Live = Live;
})(window);
