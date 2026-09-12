/* Host-only session library. Data lives on the LAN relay; access keys stay in this browser. */
(function () {
  'use strict';
  var SF = window.SF, el = SF.el, key = 'slideforge.session-library.v1';
  var refs = [], selected = null, current = null, view = 'adapt', modal, body, list, status, request = 0;
  var memory = {};
  try { refs = JSON.parse(localStorage.getItem(key) || '[]'); if (!Array.isArray(refs)) refs = []; } catch (_) { refs = []; }
  function remember(ref) {
    refs = refs.filter(function (r) { return r.id !== ref.id; }); refs.unshift(ref);
    try { localStorage.setItem(key, JSON.stringify(refs)); }
    catch (_) { SF.toast('Report access is available this visit. Browser storage is full; export a copy before closing.'); }
    drawList();
  }
  function track(ref) {
    ref.origin = location.protocol === 'file:' ? 'http://localhost:8787' : location.origin;
    remember(ref); selected = ref.id;
    recording(true);
  }
  function recording(ok) {
    var n = document.getElementById('recordingStatus');
    if (!n) return;
    n.textContent = ok ? '● Recording to this computer' : '⚠ Recording interrupted — export before closing';
    n.classList.toggle('record-error', !ok);
  }
  function receive(report) {
    if (!report) return;
    memory[report.id] = report;
    var ref = refs.find(function (r) { return r.id === report.id; });
    if (ref) remember(Object.assign({}, ref, {status:report.status,updatedAt:report.updatedAt}));
    if (selected === report.id) { current = report; draw(); }
  }
  function when(at) { return at ? new Date(at).toLocaleString() : '—'; }
  /* One place that knows how a session is addressed, so reading it and
     deleting it can never drift apart. */
  function sessionUrl(ref) {
    return ref.origin + '/api/sessions/' + encodeURIComponent(ref.id);
  }

  function fetchReport(id) {
    selected = id; current = memory[id] || null; var serial = ++request;
    var ref = refs.find(function (r) { return r.id === id; }); if (!ref) return;
    if (status) status.textContent = 'Loading the session record…';
    drawList(); draw();
    var controller = new AbortController(); var timer = setTimeout(function () { controller.abort(); }, 7000);
    fetch(sessionUrl(ref), {headers:{Authorization:'Bearer ' + ref.token},signal:controller.signal,cache:'no-store'})
      .then(function (r) { if (!r.ok) throw new Error(r.status === 404 ? 'This relay cannot find the session or its access key.' : 'The relay could not load the session.'); return r.json(); })
      .then(function (r) { clearTimeout(timer); if (memory[id] && (memory[id].updatedAt > r.updatedAt || (!memory[id].persisted && memory[id].updatedAt === r.updatedAt))) r = memory[id]; memory[id] = r; if (serial !== request) return; receive(r); if (status) status.textContent = r.persisted ? 'Saved on this computer · Updated ' + when(r.updatedAt) : 'Some events could not be saved. Export this snapshot now.'; })
      .catch(function (e) { clearTimeout(timer); if (serial !== request) return; if (status) status.textContent = (e.name === 'AbortError' ? 'The relay did not respond.' : e.message) + (current ? ' Showing the last loaded snapshot.' : ' Start the relay that hosted this session and retry.'); });
  }
  function drawList() {
    if (!list) return; list.replaceChildren();
    refs.forEach(function (r) {
      var row = el('div','session-row' + (selected === r.id ? ' selected' : ''));
      var b = el('button','session-item');
      b.appendChild(el('strong',null,r.title)); b.appendChild(el('span',null,when(r.createdAt)));
      b.onclick = function () { view = 'adapt'; fetchReport(r.id); };
      row.appendChild(b);
      /* Every list of records needs a way out of it. Without this the only
         way to clear a lesson you hosted by mistake — or ninety of them from
         an afternoon of testing — was to delete files by hand, which is not
         something a teacher should ever be asked to do with attendance data. */
      var kill = el('button','session-del','\u00d7');
      kill.type = 'button';
      kill.title = 'Delete "' + r.title + '"';
      kill.setAttribute('aria-label','Delete the session "' + r.title + '" from ' + when(r.createdAt));
      kill.onclick = function (e) { e.stopPropagation(); removeSession(r); };
      row.appendChild(kill);
      list.appendChild(row);
    });
    if (!refs.length) list.appendChild(el('p','report-empty','Your hosted lessons will appear here.'));
  }

  /** Forget a session here and on the relay that stored it. */
  function removeSession(ref) {
    SF.ask({
      title: 'Delete “' + ref.title + '”?',
      detail: 'This removes the attendance record, every answer and the feedback from ' +
        when(ref.createdAt) + '. It cannot be undone.\n\nExport anything you need first.',
      confirm: 'Delete', danger: true
    }, function () {
    fetch(sessionUrl(ref), { method:'DELETE', headers:{ Authorization:'Bearer ' + ref.token } })
      .then(function (res) { return res.json().then(function (b) { return { ok:res.ok, status:res.status, body:b }; }); })
      .catch(function () { return { ok:false, status:0, body:{} }; })
      .then(function (out) {
        /* A record the relay has already lost still has to leave the list, or
           the only way to clear a dead entry is to delete storage by hand —
           the exact problem this button exists to remove. A refusal is
           different: the lesson is still running, so the entry stays. */
        if (out.ok || out.status === 404) forget(ref.id);
        else if (status) status.textContent = (out.body && out.body.error) ||
          'Could not reach the relay that stored this session. Start it and try again.';
      });
    });
  }

  function forget(id) {
    refs = refs.filter(function (r) { return r.id !== id; });
    try { localStorage.setItem(key, JSON.stringify(refs)); } catch (_) {}
    if (selected === id) { selected = null; current = null; }
    drawList(); draw();
    if (status) status.textContent = 'Session deleted.';
  }
  function table(headers, rows) {
    var wrap = el('div','report-table-wrap'), t = el('table','report-table'), head = el('thead'), hr = el('tr');
    headers.forEach(function (h) {hr.appendChild(el('th',null,h));}); head.appendChild(hr); t.appendChild(head);
    var tb = el('tbody'); rows.forEach(function (row) {var tr = el('tr'); row.forEach(function (v) {tr.appendChild(el('td',null,String(v == null ? '—' : v)));});tb.appendChild(tr);});t.appendChild(tb);wrap.appendChild(t);return wrap;
  }
  /* Names off by default is the wrong default here \u2014 this view is already
     behind the Reports modal on the host's own machine \u2014 but the toggle
     matters the moment a laptop is mirrored, so it is one click away. */
  var showGridNames = true;

  function gridNames() {
    var row = el('label','grid-names');
    var box = document.createElement('input');
    box.type='checkbox'; box.checked = showGridNames;
    box.onchange = function () { showGridNames = box.checked; draw(); };
    row.appendChild(box);
    row.appendChild(el('span',null,'Show names'));
    return row;
  }

  function person(id) {return current.attendance.find(function (p) {return p.id === id;}) || {name:'Participant ' + id};}
  function draw() {
    if (!body) return; body.replaceChildren();
    if (!current) {body.appendChild(el('p','report-empty',refs.length ? 'Choose a session to view attendance, knowledge checks and audience feedback.' : 'Host a live lesson to create your first session report. No account needed.'));return;}
    var r = current;
    body.appendChild(el('span','eyebrow',r.status.toUpperCase() + ' SESSION'));
    body.appendChild(el('h2',null,r.title));
    body.appendChild(el('p','report-note',when(r.startedAt || r.createdAt) + (r.reason ? ' · ' + r.reason : '')));
    var tabs = el('div','library-tabs');
    [['adapt','Adapt'],['overview','Overview'],['questions','Questions'],['grid','Every answer'],['attendance','Attendance'],['checks','Knowledge checks'],['feedback','Feedback'],['pace','Pace & confidence']].forEach(function (v) {tabs.appendChild(SF.Shell.UI.button(v[1],view === v[0]?'active':'',function () {view=v[0];draw();}));});body.appendChild(tabs);
    if (view === 'adapt') {
      drawAdapt(body, r);
    } else if (view === 'overview') {
      var stats = el('div','report-stats');
      [[r.summary.joined,'names joined'],[r.summary.admitted,'admitted to lesson'],[r.summary.answers,'answers submitted'],[r.summary.feedbackActivities,'feedback activities'],[r.summary.signalsRaised||0,'pace signals raised'],[r.summary.confidentlyWrong||0,'sure and wrong']]
        /* Only when there was one: an always-on zero next to "answers
           submitted" reads as a phone problem rather than a board nobody
           played. */
        .concat(r.summary.oralVerdicts ? [[r.summary.oralVerdicts,'cards marked out loud']] : []).forEach(function (s) {var tile=el('div');tile.appendChild(el('strong',null,s[0]));tile.appendChild(el('span',null,s[1]));stats.appendChild(tile);});body.appendChild(stats);
      body.appendChild(el('h3',null,'A record you can teach from'));
      body.appendChild(el('p','report-note','Attendance records include first join, admission, disconnects and time connected. Names are self-reported. Connection time is not evidence of attention or verified attendance.'));
      body.appendChild(el('p','report-note','Answers are marked correct only after a reveal. Unrevealed checks remain unscored. Each time a question or feedback prompt opens, it is recorded as a separate attempt.'));
      if (r.status === 'interrupted') body.appendChild(el('p','report-warning','The relay stopped unexpectedly. This report contains the journaled events up to the last successful write; connection durations are lower-bound estimates.'));
      if (!r.persisted) body.appendChild(el('p','report-warning','Recording was interrupted. This snapshot may contain responses that are not on disk. Export JSON now.'));
    } else if (view === 'questions') {
      body.appendChild(el('h3',null,'What the room chose, check by check'));
      body.appendChild(el('p','report-note','This is the shape of each answer rather than who gave it \u2014 a distractor that took half the room is a misconception with a name. Wrong answers that scatter are not the same thing, and are not reported as one.'));
      body.appendChild(questionOverview(r,{hideRemoved:false}));
    } else if (view === 'grid') {
      body.appendChild(el('h3',null,'Every answer, every check'));
      body.appendChild(gridReadout(r));
      body.appendChild(el('p','report-note','Read the Class row first: a column under 60% is a question to reteach. A person\u2019s row is for a quiet word, not a ranking. A dash is no answer; a faded cell means they were not in the room for that one.'));
      body.appendChild(gridNames());
      body.appendChild(answerGrid(r,{names:showGridNames,hideRemoved:false}));
    } else if (view === 'attendance') {
      body.appendChild(table(['Name','Entry','Team','Admission','Connected time','Answered / eligible','Correct','Sure & wrong','Feedback'],r.attendance.map(function (p) {return [p.name,p.source==='teacher'?'Teacher':'Device',p.team != null?r.teams[p.team]:'—',p.removedAt?(p.leftReason==='kicked'?'Kicked':'Removed'):p.admittedAt?'Admitted':'Waiting only',Math.floor(p.connectedSeconds/60)+'m '+p.connectedSeconds%60+'s',p.questionsAnswered+' / '+p.questionsEligible,p.questionsCorrect,p.confidentlyWrong||0,p.feedbackContributions];})));
      if (!r.attendance.length) body.appendChild(el('p','report-empty','No one joined this session.'));
    } else if (view === 'checks') {
      r.checks.forEach(function (q,i) {
        var card=el('section','report-check');card.appendChild(el('span','eyebrow','CHECK '+(i+1)));
        card.appendChild(el('h3',null,q.question || 'Question '+q.index));
        card.appendChild(el('p','report-note',q.responses.length+' / '+q.eligible.length+' answered · '+(q.revealedAt?'Revealed':'Not revealed — unscored')));
        if (q.revealedAt) card.appendChild(el('p',null,'Correct answer: '+(q.input==='text'||q.input==='number'?(q.answer||''):(q.options||[])[q.correct]||'')));
        card.appendChild(table(['Name','Response','How sure','Outcome'],q.eligible.map(function (id) {var a=q.responses.find(function (a) {return a.playerId===id;});return [person(id).name,a?responseText(q,a):'No response',sureText(a),!a?'Unanswered':a.right===null?'Unscored':a.right?'Correct':'Incorrect'];})));
        body.appendChild(card);
      });
      oralRounds(body, r);
      if (!r.checks.length && !(r.oral || []).length) body.appendChild(el('p','report-empty','No knowledge checks were opened.'));
    } else if (view === 'pace') {
      body.appendChild(el('h3',null,'Where the room asked you to change something'));
      body.appendChild(el('p','report-note','Pace signals are anonymous by design and are recorded without a name — a signal you can be identified by is a signal nobody sends. What is kept is the slide it was sent from, so this answers "where did I lose them" rather than "who was lost". Signals expire after 90 seconds, so each one counts a moment, not a person.'));
      if (r.signals && r.signals.length) {
        body.appendChild(table(['Slide','Lost','Too fast','Too slow','Total'],r.signals.map(function (g) {return [signalWhere(g),g.lost,g.fast,g.slow,g.total];})));
      } else {
        body.appendChild(el('p','report-empty','Nobody raised a pace signal.'));
      }
      body.appendChild(el('h3',null,'Answers they meant'));
      body.appendChild(el('p','report-note','Confidence is never scored. A wrong answer given confidently is a misconception and needs re-teaching; a wrong guess is a gap and needs practice. They are identical in a tally and different in what you do on Monday.'));
      var withSure = r.checks.filter(function (q) {return q.responses.some(function (a) {return typeof a.sure === 'boolean';});});
      if (withSure.length) {
        body.appendChild(table(['Check','Sure & right','Sure & wrong','Guessed right','Guessed wrong','Did not say'],withSure.map(function (q,i) {
          var n = function (sure,right) {return q.responses.filter(function (a) {return a.sure===sure && a.right===right;}).length;};
          return [q.question || 'Question '+(i+1),n(true,true),n(true,false),n(false,true),n(false,false),q.responses.filter(function (a) {return typeof a.sure!=='boolean';}).length];
        })));
      } else {
        body.appendChild(el('p','report-empty','No check asked how sure the room was. Turn it on in the game\u2019s settings.'));
      }
    } else {
      r.feedback.forEach(function (f) {
        var card=el('section','report-check');card.appendChild(el('span','eyebrow',f.kind.toUpperCase()));card.appendChild(el('h3',null,f.prompt));
        card.appendChild(table(['Name','Contribution'],f.responses.map(function (a) {return [person(a.playerId).name,a.values.map(function (v) {return contribution(f,v);}).join(' · ')];})));body.appendChild(card);
      });
      if (!r.feedback.length) body.appendChild(el('p','report-empty','No audience feedback was opened.'));
    }
    var exports=el('div','report-exports');
    [['Adapt notes (.md)',function(){download('adapt.md',SF.adaptToMarkdown(r),'text/markdown;charset=utf-8');}],['Attendance CSV',function(){download('attendance.csv',attendanceCsv(r),'text/csv');}],['Answers CSV',function(){download('answers.csv',answersCsv(r),'text/csv');}],['Full session JSON',function(){download('session.json',JSON.stringify(r,null,2),'application/json');}]].forEach(function (e) {exports.appendChild(SF.Shell.UI.button('↓ '+e[0],null,e[1]));});
    body.appendChild(exports);
  }
  // Prefix potentially executable spreadsheet cells, then quote every CSV value.
  var SEVERITY = {
    act: ['Change this before next lesson', 'adapt-act'],
    watch: ['Keep an eye on', 'adapt-watch'],
    note: ['Notes on the lesson itself', 'adapt-note']
  };

  /* The Adapt view. The engine is in js/adapt.js and holds all the judgement;
     this only lays it out — and leads with what the report is standing on,
     because a confident-looking page built on nine answers is the failure
     mode worth designing against. */
  function drawAdapt(body, r) {
    var a = SF.adapt(r);
    if (!a) return;

    body.appendChild(el('h3','adapt-headline',a.headline));
    body.appendChild(el('p',a.basis.thin ? 'report-warning' : 'report-note',a.basis.sentence));

    if (!a.findings.length) {
      body.appendChild(el('p','report-empty',a.basis.answers
        ? 'Every check the room answered came back strong, nobody signalled, and no question was left hanging. Nothing to change.'
        : 'Reveal a check or open a feedback prompt and this page will have something to work from.'));
    }

    ['act','watch','note'].forEach(function (sev) {
      var rows = a.findings.filter(function (f) { return f.severity === sev; });
      if (!rows.length) return;
      body.appendChild(el('div','adapt-band ' + SEVERITY[sev][1], SEVERITY[sev][0]));
      rows.forEach(function (f) {
        var card = el('section','adapt-finding');
        var head = el('h4',null,f.title);
        if (f.strength === 'tentative') head.appendChild(el('span','adapt-thin','THIN EVIDENCE'));
        card.appendChild(head);
        card.appendChild(el('p','adapt-evidence',f.evidence));
        card.appendChild(el('p','adapt-action',f.action));
        /* Only when it adds something. A check's finding is already titled
           with the question, so repeating it underneath is noise. */
        if (f.where && f.where.n) {
          card.appendChild(el('p','adapt-where','Slide ' + f.where.n + ' · ' + (f.where.title || '')));
        }
        body.appendChild(card);
      });
    });

  }

  /* Signals sent from the lobby have no slide to belong to. Saying so beats a
     dash, because "before you started" is itself worth knowing. */
  /* Memory and Knowledge Flip rounds. Judged out loud by the teacher and
     credited to a team or to the class, so they get their own block rather
     than a row in a grid of people — the round genuinely does not know who
     spoke, and a name here would be invented. */
  function oralRounds(body, r) {
    var rounds = r.oral || [];
    if (!rounds.length) return;
    body.appendChild(el('h3', null, 'Boards judged out loud'));
    body.appendChild(el('p', 'report-note', 'Quiz Bowl, Bingo, Memory, Knowledge Flip and Low-stakes Quiz are spoken or paper rounds: the phones stay idle and you mark what happened in the room. Each card, square, cell or reveal is credited to whoever answered — a team, or the whole class where there are no teams — and never to a named learner, because a spoken or paper answer carries no phone name.'));
    rounds.forEach(function (round) {
      var card = el('section', 'report-check');
      var kinds = {
        knowledgeflip: 'KNOWLEDGE FLIP',
        bingo: 'BINGO',
        bowl: 'QUIZ BOWL',
        boss: 'BOSS BATTLE',
        lowstakes: 'LOW-STAKES QUIZ'
      };
      card.appendChild(el('span', 'eyebrow', (kinds[round.kind] || 'MEMORY BOARD') +
        (round.set > 1 ? ' · SET ' + round.set : '')));
      card.appendChild(el('h3', null, round.title || 'Board'));
      var unit = round.kind === 'bingo' ? ' squares claimed · '
        : round.kind === 'bowl' ? ' cells awarded · '
        : round.kind === 'boss' ? ' hits landed · '
        : round.kind === 'lowstakes' ? ' reveal · '
        : ' cards collected · ';
      card.appendChild(el('p', 'report-note', round.collected + unit + round.attempts +
        ' attempt' + (round.attempts === 1 ? '' : 's') + ' · ' +
        round.tally.map(function (t) {
          /* Points where the board has them, claims where it does not. */
          return t.name + ' ' + (round.points ? t.points : t.score);
        }).join(' · ')));
      var head = round.kind === 'bowl'
        ? ['Cell', 'Question', 'Awarded to', 'Outcome']
        : round.kind === 'boss'
          ? ['#', 'Question', 'Struck by', 'Outcome']
        : round.kind === 'lowstakes'
          ? ['Round', 'Detail', 'Credited to', 'Outcome']
        : ['Square', 'Term', 'Credited to', 'Outcome'];
      card.appendChild(table(head, round.verdicts.map(function (v) {
        var outcome = v.right
          ? (round.kind === 'bowl' ? 'Awarded ' + v.value
            : round.kind === 'boss' ? 'Hit for ' + v.value
            : round.kind === 'lowstakes' ? 'Revealed'
            : 'Claimed')
          : round.kind === 'bingo' ? 'Missed'
          : round.kind === 'bowl' ? 'Nobody scored'
          : round.kind === 'boss' ? 'Missed' : 'Passed';
        return [v.card + 1, v.term, v.participant || 'The class', outcome];
      })));
      body.appendChild(card);
    });
  }

  function signalWhere(g) {
    if (!g.slideId) return 'Before the first slide';
    return (g.n ? g.n + '. ' : '') + (g.title || g.slideId);
  }

  /* Blank rather than "unknown" when nobody was asked: the column is only
     meaningful for a game that had confidence turned on. */
  function sureText(a) {
    if (!a || typeof a.sure !== 'boolean') return '';
    return a.sure ? 'Sure' : 'Guess';
  }

  /* A poll reply is an option, a scale reply is a position on a run of them —
     "4 of 5" rather than the bare index the journal stores. */
  function contribution(f, v) {
    if (f.kind === 'poll') return f.options[v];
    if (f.kind === 'scale') return (Number(v) + 1) + ' of ' + (f.options || []).length;
    return v;
  }

  /* What a person actually answered. A typed answer is the text they sent; a
     choice is the option it points at. Reaching for the option list either
     way left every typed answer blank in the table and in the export. */
  /**
   * Every person against every check, in one table.
   *
   * The report already holds both halves — a row per person, a card per check
   * — but never crossed, so "which question collapsed" and "who has not got
   * one right yet" both meant reading and remembering. This is the crossing.
   *
   * Deliberately not a leaderboard. The column footer comes first in the
   * reading order because it is the diagnostic one: a column at 17% is a
   * question to reteach, and that is something the whole room can look at.
   * A row total is a child's score, which is why names can be turned off and
   * why nothing here is ranked or labelled.
   *
   * @param {object} r      a projected session report
   * @param {object} [opts] { names: false } to anonymise the rows
   */
  /** One line a teacher can act on, then the numbers that support it. */
  function gridReadout(r) {
    r = r || {};
    var box = el('div', 'grid-readout');
    var checks = r.checks || [];
    var people = r.attendance || [];
    var scored = checks.map(function (q, i) {
      var done = (q.responses || []).filter(function (a) { return a.right !== null; });
      var ok = done.filter(function (a) { return a.right; }).length;
      return {
        i: i + 1,
        question: q.question || ('Check ' + (i + 1)),
        pct: done.length ? Math.round((ok / done.length) * 100) : null,
        answered: (q.responses || []).length,
        eligible: (q.eligible || []).length,
        open: !q.revealedAt
      };
    });
    var weak = scored.filter(function (c) { return c.pct != null && c.pct < 60; })
      .sort(function (a, b) { return a.pct - b.pct; })[0];
    var open = scored.filter(function (c) { return c.open; }).pop();
    var sureWrong = people.reduce(function (n, p) { return n + (p.confidentlyWrong || 0); }, 0);
    var line = !checks.length
      ? 'No check is open yet. Land on a quiz slide and the room appears here.'
      : weak
        ? 'Check ' + weak.i + ' is the one to reteach — ' + weak.pct + '% of the room. ' + weak.question
        : scored.some(function (c) { return c.pct != null; })
          ? 'No check is under 60%. The room is holding the material you have revealed.'
          : open
            ? 'Check ' + open.i + ' is open — ' + open.answered + ' of ' + open.eligible + ' have answered. Reveal to score the column.'
            : 'Nothing scored yet. Reveal a check to see how the room did.';
    box.appendChild(el('p', 'grid-headline', line));
    var tiles = el('div', 'grid-tiles');
    [
      [people.length, people.length === 1 ? 'in the room' : 'in the room'],
      [checks.filter(function (q) { return q.revealedAt; }).length + ' / ' + checks.length, 'checks scored'],
      [sureWrong, sureWrong === 1 ? 'sure and wrong' : 'sure and wrong']
    ].forEach(function (s) {
      var tile = el('div', 'grid-tile');
      tile.appendChild(el('strong', null, String(s[0])));
      tile.appendChild(el('span', null, s[1]));
      tiles.appendChild(tile);
    });
    box.appendChild(tiles);
    return box;
  }

  function answerGrid(r, opts) {
    opts = opts || {};
    /* Called before a report exists — presenter view can open the panel
       between sessions — so an absent report is an empty table, not a throw. */
    r = r || {};
    var showNames = opts.names !== false;
    var showResponses = opts.responses !== false;
    var showResults = opts.results !== false;
    if (opts.hideRemoved !== false) r = liveClassReport(r);
    var checks = r.checks || [];
    var wrap = el('div', 'grid-wrap');
    if (!checks.length || !(r.attendance || []).length) {
      wrap.appendChild(el('p', 'report-empty', 'Nothing checked yet.'));
      return wrap;
    }

    var tbl = el('table', 'answer-grid');
    var thead = el('thead'), hr = el('tr');
    hr.appendChild(el('th', 'g-name', showNames ? 'Name' : 'Learner'));
    hr.appendChild(el('th', 'g-tot', 'Score'));
    checks.forEach(function (q, i) {
      var th = el('th', 'g-q');
      th.title = q.question || ('Check ' + (i + 1));
      th.appendChild(el('span', 'g-qn', String(i + 1)));
      var stem = String(q.question || '').replace(/\s+/g, ' ').trim();
      if (stem) th.appendChild(el('span', 'g-stem', stem.length > 22 ? stem.slice(0, 21) + '…' : stem));
      /* Unrevealed checks are never scored, so the column says so rather than
         showing a run of blanks that look like nobody answered. */
      if (!q.revealedAt) th.appendChild(el('span', 'g-unrevealed', 'open'));
      hr.appendChild(th);
    });
    thead.appendChild(hr); tbl.appendChild(thead);

    var tbody = el('tbody');
    var classRight = 0, classAsked = 0;
    (r.attendance || []).forEach(function (p, n) {
      var tr = el('tr');
      var name = el('td', 'g-name', showNames ? p.name : ('Learner ' + (n + 1)));
      if (showNames && p.source === 'teacher') name.appendChild(el('span', 'g-src', 'entered'));
      tr.appendChild(name);
      var right = 0, asked = 0;
      var cells = [];
      checks.forEach(function (q) {
        var eligible = (q.eligible || []).indexOf(p.id) > -1;
        var a = (q.responses || []).find(function (x) { return x.playerId === p.id; });
        var td = el('td', 'g-cell');
        if (!eligible) { td.className += ' g-na'; td.title = 'Not in the room for this one'; cells.push(td); return; }
        /* Only what was actually marked counts towards the row. A check the
           host never revealed is unscored everywhere else in this report, and
           letting it into the denominator would quietly lower everyone's
           percentage for something they did nothing wrong in. */
        if (q.revealedAt) asked++;
        if (!a) {
          td.className += ' g-none';
          td.textContent = '—';
          td.title = 'No answer';
          cells.push(td);
          return;
        }
        var said = responseText(q, a) || '·';
        td.textContent = showResponses ? said : (q.revealedAt ? '' : 'in');
        td.title = said;
        if (showResults && a.right === true) { td.className += ' g-right'; right++; }
        else if (showResults && a.right === false) td.className += ' g-wrong';
        else {
          td.className += ' g-unscored';
          if (q.revealedAt && a.right === true) right++;
        }
        cells.push(td);
      });
      classRight += right;
      classAsked += asked;
      var tot = el('td', 'g-tot', asked && showResults ? Math.round((right / asked) * 100) + '%' : asked ? asked + ' in' : '—');
      tr.appendChild(tot);
      cells.forEach(function (td) { tr.appendChild(td); });
      tbody.appendChild(tr);
    });
    tbl.appendChild(tbody);

    var tfoot = el('tfoot'), fr = el('tr');
    var classCount = (r.attendance || []).length;
    fr.appendChild(el('td', 'g-name', classCount ? classCount + ' Class total' : 'Class'));
    fr.appendChild(el('td', 'g-tot', classAsked && showResults ? Math.round((classRight / classAsked) * 100) + '%' : '—'));
    checks.forEach(function (q) {
      var scored = (q.responses || []).filter(function (a) { return a.right !== null; });
      var ok = scored.filter(function (a) { return a.right; }).length;
      var pct = scored.length ? Math.round((ok / scored.length) * 100) : null;
      var inNow = (q.responses || []).length;
      var td = el('td', 'g-tot', showResults && pct != null ? pct + '%' : (inNow ? inNow + ' in' : '—'));
      /* The one number worth looking at together. Marked when it is low
         enough to be worth stopping for — the same 60% the Adapt report
         treats as weak, so the two never disagree on screen. */
      if (showResults && pct != null && pct < 60) td.className += ' g-weak';
      fr.appendChild(td);
    });
    tfoot.appendChild(fr); tbl.appendChild(tfoot);

    wrap.appendChild(tbl);
    wrap.appendChild(classNamesFoot(r, { names: showNames, results: showResults }));
    return wrap;
  }

  function learnerLabel(p, n, showNames) {
    return showNames !== false && p && p.name ? p.name : ('Learner ' + (n + 1));
  }

  /* Names sit under the grid so a scrolled table never loses who is in the
     room. Each check then lists who was right, wrong, or still waiting. */
  function classNamesFoot(r, opts) {
    opts = opts || {};
    var showNames = opts.names !== false;
    var showResults = opts.results !== false;
    var people = r.attendance || [];
    var checks = r.checks || [];
    var foot = el('div', 'grid-roster');
    foot.appendChild(el('div', 'grid-roster-lbl',
      people.length === 1 ? 'Names in the room' : people.length + ' names in the room'));
    var list = el('ul', 'grid-roster-list');
    people.forEach(function (p, n) {
      var item = el('li', 'grid-roster-name', learnerLabel(p, n, showNames));
      if (showNames && p.source === 'teacher') item.appendChild(el('span', 'g-src', 'entered'));
      list.appendChild(item);
    });
    foot.appendChild(list);

    checks.forEach(function (q, i) {
      var col = el('section', 'grid-name-col');
      var stem = String(q.question || ('Check ' + (i + 1))).replace(/\s+/g, ' ').trim();
      col.appendChild(el('h4', 'grid-name-col-h',
        (i + 1) + (stem ? ' · ' + (stem.length > 42 ? stem.slice(0, 41) + '…' : stem) : '')));
      var buckets = { right: [], wrong: [], in: [], none: [] };
      people.forEach(function (p, n) {
        if ((q.eligible || []).indexOf(p.id) < 0) return;
        var a = (q.responses || []).find(function (x) { return x.playerId === p.id; });
        var label = learnerLabel(p, n, showNames);
        if (!a) buckets.none.push(label);
        else if (showResults && a.right === true) buckets.right.push(label);
        else if (showResults && a.right === false) buckets.wrong.push(label);
        else buckets.in.push(label);
      });
      [
        ['right', 'Right', buckets.right],
        ['wrong', 'Missed', buckets.wrong],
        ['in', 'Answered', buckets.in],
        ['none', 'No answer', buckets.none]
      ].forEach(function (row) {
        if (!row[2].length) return;
        var line = el('p', 'grid-who-line grid-who-' + row[0]);
        line.appendChild(el('span', 'grid-who-k', row[1]));
        line.appendChild(document.createTextNode(row[2].join(', ')));
        col.appendChild(line);
      });
      foot.appendChild(col);
    });
    return foot;
  }

  /**
   * One row per check: the shape of the answers, then who gave them.
   *
   * The grid answers "who is stuck"; this answers "what pulled them". They
   * are different questions and a teacher asks the second one far more
   * often — a distractor that took half the room is a misconception with a
   * name, and the names sit under the bar.
   *
   * Nothing marks the correct option until the check has been revealed. The
   * same rule the tally on the wall follows, and for the same reason: a
   * teacher glancing at this during a peer-instruction vote must not be
   * shown the answer they are deliberately withholding from the room.
   */
  function questionOverview(r, opts) {
    opts = opts || {};
    r = r || {};
    if (opts.hideRemoved !== false) r = liveClassReport(r);
    var checks = r.checks || [];
    var wrap = el('div', 'qo-wrap');
    if (!checks.length) {
      wrap.appendChild(el('p', 'report-empty', 'No quiz slide has been opened in this live lesson yet. Each check appears here as bars once the room can answer it.'));
      return wrap;
    }

    checks.forEach(function (q, i) {
      var card = el('section', 'qo-card');
      var head = el('div', 'qo-head');
      head.appendChild(el('span', 'qo-n', String(i + 1)));
      var title = el('div', 'qo-title');
      title.appendChild(el('strong', null, q.question || ('Check ' + (i + 1))));
      var meta = el('span', 'qo-meta');
      meta.textContent = (q.responses || []).length + ' of ' + (q.eligible || []).length + ' answered';
      if (!q.revealedAt) meta.appendChild(el('span', 'qo-open', 'not revealed'));
      title.appendChild(meta);
      head.appendChild(title);

      var scored = (q.responses || []).filter(function (a) { return a.right !== null; });
      var ok = scored.filter(function (a) { return a.right; }).length;
      var pct = scored.length ? Math.round((ok / scored.length) * 100) : null;
      var score = el('span', 'qo-pct' + (pct != null && pct < 60 ? ' qo-weak' : ''),
        pct == null ? '—' : pct + '%');
      head.appendChild(score);
      card.appendChild(head);

      /* Choice questions get a bar per option; anything typed gets its
         answers grouped, because the words are the evidence. */
      var rows = [];
      if (q.input === 'choice') {
        (q.options || []).forEach(function (text, oi) {
          var hits = (q.responses || []).filter(function (a) { return a.choice === oi; });
          rows.push({ label: (SF.LETTERS[oi] || oi + 1) + ' · ' + text, n: hits.length,
            names: namesOnCheck(r, hits),
            correct: q.revealedAt && oi === q.correct });
        });
      } else {
        var groups = {};
        (q.responses || []).forEach(function (a) {
          var t = responseText(q, a) || '—';
          if (!groups[t]) groups[t] = { n: 0, right: a.right, who: [] };
          groups[t].n++;
          var who = (r.attendance || []).find(function (p) { return p.id === a.playerId; });
          if (who && who.name) groups[t].who.push(who.name);
        });
        rows = Object.keys(groups).sort(function (a, b) { return groups[b].n - groups[a].n; })
          .slice(0, 8)
          .map(function (t) { return { label: t, n: groups[t].n, names: groups[t].who,
            correct: q.revealedAt && groups[t].right === true }; });
      }

      var most = rows.reduce(function (m, x) { return Math.max(m, x.n); }, 0);
      var list = el('div', 'qo-bars');
      rows.forEach(function (row) {
        var bar = el('div', 'qo-bar' + (row.correct ? ' qo-right' : ''));
        bar.appendChild(el('span', 'qo-label', row.label));
        var track = el('span', 'qo-track');
        var fill = el('span', 'qo-fill');
        fill.style.width = (most ? Math.round((row.n / most) * 100) : 0) + '%';
        track.appendChild(fill);
        bar.appendChild(track);
        bar.appendChild(el('span', 'qo-count', String(row.n)));
        if (row.names && row.names.length) {
          bar.appendChild(el('span', 'qo-names', row.names.join(', ')));
        }
        list.appendChild(bar);
      });
      card.appendChild(list);

      /* Said only once the answer is out, and only when the wrong answers
         actually agree — scattered wrong answers are not a misconception,
         they are not knowing, and the two need different lessons. */
      if (q.revealedAt) {
        var wrong = rows.filter(function (x) { return !x.correct && x.n > 0; });
        var top = wrong.sort(function (a, b) { return b.n - a.n; })[0];
        var wrongTotal = wrong.reduce(function (n, x) { return n + x.n; }, 0);
        if (top && wrongTotal >= 3 && top.n * 2 > wrongTotal) {
          card.appendChild(el('p', 'qo-note',
            top.n + ' of the ' + wrongTotal + ' wrong answers chose \u201c' + top.label +
            '\u201d — one misconception with a name, rather than a spread.'));
        }
      }
      wrap.appendChild(card);
    });
    return wrap;
  }

  /* Live class views hide kicked and deleted names. The saved report still
     keeps the journal row, so a session export is not rewritten by a kick. */
  function liveClassReport(r) {
    r = r || {};
    var keep = (r.attendance || []).filter(function (p) { return !p.removedAt; });
    var ids = {};
    keep.forEach(function (p) { ids[p.id] = true; });
    return {
      id: r.id, title: r.title, status: r.status, summary: r.summary,
      attendance: keep,
      checks: (r.checks || []).map(function (q) {
        return Object.assign({}, q, {
          eligible: (q.eligible || []).filter(function (id) { return ids[id]; }),
          responses: (q.responses || []).filter(function (a) { return ids[a.playerId]; })
        });
      })
    };
  }

  function rosterManage(players, opts) {
    opts = opts || {};
    var wrap = el('div', 'roster-manage');
    wrap.appendChild(el('div', 'grid-roster-lbl',
      (players || []).length ? 'In the room' : 'Nobody in the room yet'));
    (players || []).forEach(function (p) {
      var row = el('div', 'roster-row');
      row.appendChild(el('strong', null, p.name || 'Learner'));
      row.appendChild(el('span', 'g-src', p.manual ? 'entered' : p.connected === false ? 'disconnected' : 'phone'));
      function act(label, kind, fn) {
        if (!fn) return;
        var b = el('button', 'btn ghost roster-act' + (kind ? ' ' + kind : ''), label);
        b.type = 'button';
        b.onclick = function () { fn(p); };
        row.appendChild(b);
      }
      act('Edit', '', opts.onEdit);
      if (!p.manual) act('Kick', '', opts.onKick);
      act('Delete', 'danger', opts.onDelete);
      wrap.appendChild(row);
    });
    if (!(players || []).length) {
      wrap.appendChild(el('p', 'report-empty', 'Add names on Entry, or wait for phones to join.'));
    }
    return wrap;
  }

  function namesOnCheck(r, responses) {
    return (responses || []).map(function (a) {
      var p = (r.attendance || []).find(function (x) { return x.id === a.playerId; });
      return p && p.name ? p.name : '';
    }).filter(Boolean);
  }

  function responseText(q, a) {
    if (!a) return '';
    if (q.input === 'text') return String(a.text == null ? '' : a.text);
    if (q.input === 'number') return a.value == null ? '' : String(a.value);
    /* An ordering reads as the sequence they chose. The indices mean nothing
       to anyone reading a report, and the CSV has to carry the words or the
       export is unusable. */
    if (q.input === 'order') {
      var seq = Array.isArray(a.order) ? a.order : [];
      return seq.map(function (i) { return (q.options || [])[i]; }).filter(Boolean).join(' > ');
    }
    return (q.options || [])[a.choice] || '';
  }

  function csvCell(v) {var s=String(v == null?'':v);if (typeof v!=='number' && /^[\s]*[=+@-]|^[\t\r\n]/.test(s)) s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
  function csv(rows) {return '\uFEFF'+rows.map(function(row){return row.map(csvCell).join(',');}).join('\r\n');}
  function attendanceCsv(r) {return csv([['Session ID','Name','Participant ID','Team','First joined','Admitted','Last seen','Connected seconds','Session status','Eligible checks','Answers','Correct','Unanswered','Feedback contributions','Entry source']].concat(r.attendance.map(function(p){return [r.id,p.name,p.id,p.team!=null?r.teams[p.team]:'',new Date(p.firstJoinedAt).toISOString(),p.admittedAt?new Date(p.admittedAt).toISOString():'',new Date(p.lastSeenAt).toISOString(),p.connectedSeconds,r.status,p.questionsEligible,p.questionsAnswered,p.questionsCorrect,p.questionsUnanswered,p.feedbackContributions,p.source||'device'];})));}
  function answersCsv(r) {var rows=[['Session ID','Attempt ID','Question','Name','Participant ID','Answer','How sure','Outcome','Elapsed ms','Entry source']];r.checks.forEach(function(q){q.eligible.forEach(function(id){var a=q.responses.find(function(a){return a.playerId===id;}),p=r.attendance.find(function(p){return p.id===id;});rows.push([r.id,q.attempt,q.question,p?p.name:'',id,responseText(q,a),sureText(a),!a?'unanswered':a.right===null?'unscored':a.right?'correct':'incorrect',a?a.elapsedMs:'',p?p.source||'device':'']);});});(r.oral||[]).forEach(function(round){round.verdicts.forEach(function(v){rows.push([r.id,'oral',round.title,v.participant||'The class','',v.term,'',v.right?'claimed':'passed','','teacher']);});});return csv(rows);}
  function download(suffix,text,type) {
    var filename='slideforge-'+current.id.slice(0,8)+'-'+suffix;
    var url=URL.createObjectURL(new Blob([text],{type:type+';charset=utf-8'})),a=el('a');
    a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
    setTimeout(function(){URL.revokeObjectURL(url);},1000);
    var previous=body.querySelector('.report-export-preview');if(previous)previous.remove();
    var preview=el('section','report-export-preview');
    preview.appendChild(el('strong',null,'Your export is ready'));
    preview.appendChild(el('p','report-note',filename+' · You can also copy the contents below.'));
    var textBox=el('textarea');textBox.readOnly=true;textBox.value=text;textBox.setAttribute('aria-label','Export contents');preview.appendChild(textBox);
    preview.appendChild(SF.Shell.UI.button('Copy contents',null,function(){
      if (!navigator.clipboard) {textBox.focus();textBox.select();return;}
      navigator.clipboard.writeText(text).then(function(){SF.toast('Export copied');}).catch(function(){textBox.focus();textBox.select();});
    }));body.appendChild(preview);preview.scrollIntoView({block:'nearest'});
  }
  function open(id) {if(!modal)init();modal.showModal();view='adapt';if(id||selected||refs.length)fetchReport(id||selected||refs[0].id);else draw();}
  function init() {
    if(modal)return;modal=el('dialog','reports-modal');modal.setAttribute('aria-labelledby','reportsTitle');
    modal.innerHTML='<header><div><span class="eyebrow">THE LESSON DOESN’T END WITH THE LAST SLIDE</span><h2 id="reportsTitle">Session reports</h2></div><button class="btn ghost" aria-label="Close reports">✕</button></header><div class="reports-layout"><aside id="sessionList"></aside><main id="reportBody"></main></div><footer><span id="reportStatus">Stored locally on the host computer.</span><button class="btn" id="refreshReport">Refresh</button></footer>';
    document.body.appendChild(modal);list=document.getElementById('sessionList');body=document.getElementById('reportBody');status=document.getElementById('reportStatus');modal.querySelector('header button').onclick=function(){modal.close();};document.getElementById('refreshReport').onclick=function(){if(selected)fetchReport(selected);};drawList();draw();
    document.getElementById('btnReports').onclick=function(){open();};
  }
  SF.Reports={init:init,track:track,recording:recording,receive:receive,open:open,refresh:fetchReport,csv:csv,attendanceCsv:attendanceCsv,answersCsv:answersCsv,grid:answerGrid};
  /* Shared, because presenter view draws the same table live. */
  SF.answerGrid=answerGrid;
  SF.questionOverview=questionOverview;
  SF.gridReadout=gridReadout;
  SF.liveClassReport=liveClassReport;
  SF.rosterManage=rosterManage;
})();
