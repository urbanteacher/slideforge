/* Host-only session library. Data lives on the LAN relay; access keys stay in this browser. */
(function () {
  'use strict';
  var SF = window.SF, el = SF.el, key = 'slideforge.session-library.v1';
  var refs = [], selected = null, current = null, view = 'overview', modal, body, list, status, request = 0;
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
  function fetchReport(id) {
    selected = id; current = memory[id] || null; var serial = ++request;
    var ref = refs.find(function (r) { return r.id === id; }); if (!ref) return;
    if (status) status.textContent = 'Loading the session record…';
    drawList(); draw();
    var controller = new AbortController(); var timer = setTimeout(function () { controller.abort(); }, 7000);
    fetch(ref.origin + '/api/sessions/' + encodeURIComponent(id), {headers:{Authorization:'Bearer ' + ref.token},signal:controller.signal,cache:'no-store'})
      .then(function (r) { if (!r.ok) throw new Error(r.status === 404 ? 'This relay cannot find the session or its access key.' : 'The relay could not load the session.'); return r.json(); })
      .then(function (r) { clearTimeout(timer); if (memory[id] && (memory[id].updatedAt > r.updatedAt || (!memory[id].persisted && memory[id].updatedAt === r.updatedAt))) r = memory[id]; memory[id] = r; if (serial !== request) return; receive(r); if (status) status.textContent = r.persisted ? 'Saved on this computer · Updated ' + when(r.updatedAt) : 'Some events could not be saved. Export this snapshot now.'; })
      .catch(function (e) { clearTimeout(timer); if (serial !== request) return; if (status) status.textContent = (e.name === 'AbortError' ? 'The relay did not respond.' : e.message) + (current ? ' Showing the last loaded snapshot.' : ' Start the relay that hosted this session and retry.'); });
  }
  function drawList() {
    if (!list) return; list.replaceChildren();
    refs.forEach(function (r) {
      var b = el('button','session-item' + (selected === r.id ? ' selected' : ''));
      b.appendChild(el('strong',null,r.title)); b.appendChild(el('span',null,when(r.createdAt)));
      b.onclick = function () { view = 'overview'; fetchReport(r.id); }; list.appendChild(b);
    });
    if (!refs.length) list.appendChild(el('p','report-empty','Your hosted lessons will appear here.'));
  }
  function table(headers, rows) {
    var wrap = el('div','report-table-wrap'), t = el('table','report-table'), head = el('thead'), hr = el('tr');
    headers.forEach(function (h) {hr.appendChild(el('th',null,h));}); head.appendChild(hr); t.appendChild(head);
    var tb = el('tbody'); rows.forEach(function (row) {var tr = el('tr'); row.forEach(function (v) {tr.appendChild(el('td',null,String(v == null ? '—' : v)));});tb.appendChild(tr);});t.appendChild(tb);wrap.appendChild(t);return wrap;
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
    [['overview','Overview'],['attendance','Attendance'],['checks','Knowledge checks'],['feedback','Feedback']].forEach(function (v) {tabs.appendChild(SF.Shell.UI.button(v[1],view === v[0]?'active':'',function () {view=v[0];draw();}));});body.appendChild(tabs);
    if (view === 'overview') {
      var stats = el('div','report-stats');
      [[r.summary.joined,'names joined'],[r.summary.admitted,'admitted to lesson'],[r.summary.answers,'answers submitted'],[r.summary.feedbackActivities,'feedback activities']].forEach(function (s) {var tile=el('div');tile.appendChild(el('strong',null,s[0]));tile.appendChild(el('span',null,s[1]));stats.appendChild(tile);});body.appendChild(stats);
      body.appendChild(el('h3',null,'A record you can teach from'));
      body.appendChild(el('p','report-note','Attendance records include first join, admission, disconnects and time connected. Names are self-reported. Connection time is not evidence of attention or verified attendance.'));
      body.appendChild(el('p','report-note','Answers are marked correct only after a reveal. Unrevealed checks remain unscored. Each time a question or feedback prompt opens, it is recorded as a separate attempt.'));
      if (r.status === 'interrupted') body.appendChild(el('p','report-warning','The relay stopped unexpectedly. This report contains the journaled events up to the last successful write; connection durations are lower-bound estimates.'));
      if (!r.persisted) body.appendChild(el('p','report-warning','Recording was interrupted. This snapshot may contain responses that are not on disk. Export JSON now.'));
    } else if (view === 'attendance') {
      body.appendChild(table(['Name','Team','Admission','Connected time','Answered / eligible','Correct','Feedback'],r.attendance.map(function (p) {return [p.name,p.team != null?r.teams[p.team]:'—',p.admittedAt?'Admitted':'Waiting only',Math.floor(p.connectedSeconds/60)+'m '+p.connectedSeconds%60+'s',p.questionsAnswered+' / '+p.questionsEligible,p.questionsCorrect,p.feedbackContributions];})));
      if (!r.attendance.length) body.appendChild(el('p','report-empty','No one joined this session.'));
    } else if (view === 'checks') {
      r.checks.forEach(function (q,i) {
        var card=el('section','report-check');card.appendChild(el('span','eyebrow','CHECK '+(i+1)+(q.bloom?' · '+q.bloom.toUpperCase():'')));
        card.appendChild(el('h3',null,q.question || 'Question '+q.index));
        card.appendChild(el('p','report-note',q.responses.length+' / '+q.eligible.length+' answered · '+(q.revealedAt?'Revealed':'Not revealed — unscored')));
        if (q.revealedAt) card.appendChild(el('p',null,'Correct answer: '+q.options[q.correct]));
        card.appendChild(table(['Name','Response','Outcome'],q.eligible.map(function (id) {var a=q.responses.find(function (a) {return a.playerId===id;});return [person(id).name,a?responseText(q,a):'No response',!a?'Unanswered':a.right===null?'Unscored':a.right?'Correct':'Incorrect'];})));
        body.appendChild(card);
      });
      if (!r.checks.length) body.appendChild(el('p','report-empty','No knowledge checks were opened.'));
    } else {
      r.feedback.forEach(function (f) {
        var card=el('section','report-check');card.appendChild(el('span','eyebrow',f.kind.toUpperCase()));card.appendChild(el('h3',null,f.prompt));
        card.appendChild(table(['Name','Contribution'],f.responses.map(function (a) {return [person(a.playerId).name,a.values.map(function (v) {return contribution(f,v);}).join(' · ')];})));body.appendChild(card);
      });
      if (!r.feedback.length) body.appendChild(el('p','report-empty','No audience feedback was opened.'));
    }
    var exports=el('div','report-exports');
    [['Attendance CSV',function(){download('attendance.csv',attendanceCsv(r),'text/csv');}],['Answers CSV',function(){download('answers.csv',answersCsv(r),'text/csv');}],['Full session JSON',function(){download('session.json',JSON.stringify(r,null,2),'application/json');}]].forEach(function (e) {exports.appendChild(SF.Shell.UI.button('↓ '+e[0],null,e[1]));});
    body.appendChild(exports);
  }
  // Prefix potentially executable spreadsheet cells, then quote every CSV value.
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
  function responseText(q, a) {
    if (!a) return '';
    if (q.input === 'text') return String(a.text == null ? '' : a.text);
    if (q.input === 'number') return a.value == null ? '' : String(a.value);
    return (q.options || [])[a.choice] || '';
  }

  function csvCell(v) {var s=String(v == null?'':v);if (typeof v!=='number' && /^[\s]*[=+@-]|^[\t\r\n]/.test(s)) s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
  function csv(rows) {return '\uFEFF'+rows.map(function(row){return row.map(csvCell).join(',');}).join('\r\n');}
  function attendanceCsv(r) {return csv([['Session ID','Name','Participant ID','Team','First joined','Admitted','Last seen','Connected seconds','Session status','Eligible checks','Answers','Correct','Unanswered','Feedback contributions']].concat(r.attendance.map(function(p){return [r.id,p.name,p.id,p.team!=null?r.teams[p.team]:'',new Date(p.firstJoinedAt).toISOString(),p.admittedAt?new Date(p.admittedAt).toISOString():'',new Date(p.lastSeenAt).toISOString(),p.connectedSeconds,r.status,p.questionsEligible,p.questionsAnswered,p.questionsCorrect,p.questionsUnanswered,p.feedbackContributions];})));}
  function answersCsv(r) {var rows=[['Session ID','Attempt ID','Question','Bloom level','Name','Participant ID','Answer','Outcome','Elapsed ms']];r.checks.forEach(function(q){q.eligible.forEach(function(id){var a=q.responses.find(function(a){return a.playerId===id;}),p=r.attendance.find(function(p){return p.id===id;});rows.push([r.id,q.attempt,q.question,q.bloom,p?p.name:'',id,responseText(q,a),!a?'unanswered':a.right===null?'unscored':a.right?'correct':'incorrect',a?a.elapsedMs:'']);});});return csv(rows);}
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
  function open(id) {if(!modal)init();modal.showModal();view='overview';if(id||selected||refs.length)fetchReport(id||selected||refs[0].id);else draw();}
  function init() {
    if(modal)return;modal=el('dialog','reports-modal');modal.setAttribute('aria-labelledby','reportsTitle');
    modal.innerHTML='<header><div><span class="eyebrow">THE LESSON DOESN’T END WITH THE LAST SLIDE</span><h2 id="reportsTitle">Session reports</h2></div><button class="btn ghost" aria-label="Close reports">✕</button></header><div class="reports-layout"><aside id="sessionList"></aside><main id="reportBody"></main></div><footer><span id="reportStatus">Stored locally on the host computer.</span><button class="btn" id="refreshReport">Refresh</button></footer>';
    document.body.appendChild(modal);list=document.getElementById('sessionList');body=document.getElementById('reportBody');status=document.getElementById('reportStatus');modal.querySelector('header button').onclick=function(){modal.close();};document.getElementById('refreshReport').onclick=function(){if(selected)fetchReport(selected);};drawList();draw();
    document.getElementById('btnReports').onclick=function(){open();};
  }
  SF.Reports={init:init,track:track,recording:recording,receive:receive,open:open,refresh:fetchReport,csv:csv,attendanceCsv:attendanceCsv,answersCsv:answersCsv};
})();
