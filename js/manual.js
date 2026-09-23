(function(){
'use strict';
/** @type {import("../src/types.js").SlideForgeGlobal} */
var SF = window.SF || /** @type {any} */ ({});
var key=location.hash.slice(1),channel=/^[a-f0-9]{32}$/.test(key)?new BroadcastChannel('sf-manual-'+key):null;
/** @type {(id: string) => any} */
var $=function(id){return document.getElementById(id);};
var state={},lastKey='',lastQ=null,startedAt=Date.now();
var draftKey='sf-entry-draft-'+(key||'none');
var seq=0;
/* One route, and an id on every command.

   The wall listens for these on the window AND on the channel, and the
   actions here are not idempotent — add, kick, delete, mark an answer. One
   sender sending by both routes would add the same learners twice, which is
   exactly what happened to the presenter desk's toggles before the id was
   there to stop it. */
function send(action,extra){
 var m=Object.assign({type:'sf-manual-command',action:action,id:'m'+(++seq)+'-'+startedAt},extra||{});
 if(channel)channel.postMessage(m);else if(window.opener)window.opener.postMessage(m,location.origin);
}
function button(text,fn){var b=document.createElement('button');b.textContent=text;b.onclick=fn;return b;}
function saveDraft(){try{sessionStorage.setItem(draftKey,$('names').value);}catch(e){}}
function loadDraft(){
 try{
  var saved=sessionStorage.getItem(draftKey);
  if(saved!=null && !$('names').value) $('names').value=saved;
 }catch(e){}
}
$('close').onclick=function(){window.close();};
if(window.parent!==window) $('close').hidden=true;
$('names').addEventListener('input',saveDraft);
loadDraft();
$('add').onclick=function(){
 var teams=state.mode==='teams';
 var names=$('names').value.split('\n').map(function(n){return n.trim();}).filter(Boolean);
 /* Checked here so the reason appears instantly, rather than a round trip
    ending in nothing happening. */
 if(!names.length){$('error').textContent='Type at least one name, one per line.';return;}
 if(teams && !$('team').value){$('error').textContent='Choose a team for these learners first.';return;}
 $('error').textContent='';
 send('add',{names:names,team:teams?Number($('team').value):0});
 /* If the relay neither adds them nor objects, say so rather than leaving
    the teacher pressing a button that appears dead. */
 var before=(state.players||[]).length;
 setTimeout(function(){
  if(((state.players||[]).length)===before && !$('error').textContent){
   $('error').textContent='That did not reach the lesson. Check the room is still open, then try again.';
  }
 },1500);
};
$('reveal').onclick=function(){send('reveal');};

function editName(p){
 SF.askText({title:'Name for this learner',value:p.name||'',
  placeholder:'Their name'},function(next){
   if(next===p.name) return;
   send('rename',{playerId:p.id,name:next});
  });
}
function kickPerson(p){
 SF.ask({title:'Kick '+p.name+' from this room?',
  detail:'Their phone disconnects. They can rejoin with the PIN.',
  confirm:'Kick',danger:true},function(){send('kick',{playerId:p.id});});
}
function deletePerson(p){
 SF.ask({title:'Delete '+p.name+' from the class list?',
  detail:'Their answers so far stay in the session record.',
  confirm:'Delete',danger:true},function(){send('delete',{playerId:p.id});});
}
function rosterActions(){
 return {onEdit:editName,onKick:kickPerson,onDelete:deletePerson};
}
function paintClassRoster(people){
 people=people.filter(function(p){return p.name.toLowerCase().includes(($('rosterSearch').value||'').toLowerCase());});
 var box=$('classRoster');
 if(!box) return;
 box.textContent='';
 if(!people.length){box.appendChild(document.createElement('p')).textContent=$('rosterSearch').value?'No learners match your search.':(state.active?'No learners yet. Add names below, or share the PIN for phones.':'Start a live room, then add names here.');return;}
 if(window.SF && SF.rosterManage){
  box.appendChild(SF.rosterManage(people, rosterActions()));
  if(!state.active) Array.prototype.forEach.call(box.querySelectorAll('button'),function(b){b.disabled=true;});
  return;
 }
 if(!people.length){
  var empty=document.createElement('p');
  empty.className='in-room-empty';
  empty.textContent='Nobody in the room yet. Add a name below.';
  box.appendChild(empty);
  return;
 }
 var head=document.createElement('div');
 head.className='grid-roster-lbl';
 head.textContent='In the room';
 box.appendChild(head);
 people.forEach(function(p){
  var row=document.createElement('div');
  row.className='roster-row';
  var name=document.createElement('strong');
  name.textContent=p.name;
  row.appendChild(name);
  addRosterActions(row,p);
  box.appendChild(row);
 });
}
function addRosterActions(row,p){
 var acts=document.createElement('span');
 acts.className='roster-acts';
 function act(label,fn){
  var b=button(label,function(){fn(p);});
  b.className='roster-act';
  b.type='button';
  acts.appendChild(b);
 }
 act('Edit',editName);
 if(!p.manual) act('Kick',kickPerson);
 act('Delete',deletePerson);
 row.appendChild(acts);
}

/* The reveal row: press the correct answer.
   The room shouts, the answers go down, and then the teacher marks the one
   that was right — which is the same motion as saying it aloud. One gesture
   rather than hunting for a separate button, and on a question with no
   options to press the plain button stays. */
function drawRevealRow(q){
 var row=$('revealRow');
 if(!row) return;
 var show=!!q && !q.revealed && q.input==='choice' && (q.options||[]).length;
 row.hidden=!show;
 $('reveal').hidden=!(!!q && !q.revealed && !show);
 if(!show){row.textContent='';row.dataset.q='';return;}
 if(row.dataset.q===q.id) return;
 row.dataset.q=q.id;
 row.textContent='';
 var lead=document.createElement('p');lead.className='reveal-lead';
 lead.textContent=q.spoken?'Mark the answer as they finish. If it scores, you’ll be asked who spoke.':
  'Press the correct answer to reveal it and score the room.';
 row.appendChild(lead);
 (q.options||[]).forEach(function(text,i){
  var b=document.createElement('button');
  b.className='reveal-opt';
  b.textContent=String.fromCharCode(65+i)+' · '+text;
  /* No refusal here: a scoring verdict with nobody chosen is held by the
     host until the teacher says who spoke (see paintSpokenControls). */
  b.onclick=function(){$('error').textContent='';send('revealWith',{choice:i});};
  row.appendChild(b);
 });
}
/* Roll call.
   Clicking is fine for six mini-whiteboards and hopeless for thirty: a
   thirty-student class is thirty aimed clicks per question, while the room
   waits. So one row is "current", A-F or 1-6 records for it and moves to the
   next, and a teacher can go down the register at reading speed without
   looking at the screen.

   The pointer is an index into the entered rows only. Phone rows answer for
   themselves and are skipped — landing on one would stall the run with no
   key that does anything. */
var cursor=0;
var orderDraft={},answerErrors={};

function sendRowAnswer(q,row,data){
 var id=Number(row.dataset.id);
 delete answerErrors[id];
 send('answer',{answer:Object.assign({id:q.id,playerId:id},data)});
}

/* A Ranking order, or Fill the gaps' word per gap: a sequence of picks,
   sent once it is complete. A word may fill two gaps; an item is ranked once. */
function chooseOrderItem(q,row,index){
 var id=Number(row.dataset.id),bank=(q.options||[]).length;
 var filling=q.input==='fill';
 /* A sort picks one of three columns for each statement in turn. */
 var sorting=q.input==='sort';
 if(sorting)bank=3;
 var n=filling?Number(q.gaps)||0:sorting?(q.options||[]).length:bank;
 if(index<0||index>=bank||!n)return false;
 var draft=orderDraft[id]||[];
 if(!filling&&!sorting&&draft.indexOf(index)>=0)return false;
 draft=draft.concat(index);orderDraft[id]=draft;
 if(draft.length===n){sendRowAnswer(q,row,filling?{fill:draft.slice()}:sorting?{sort:draft.slice()}:{order:draft.slice()});moveCursor(1);}
 render();
 return true;
}

function enteredRows(){
 return /** @type {HTMLElement[]} */ (Array.from(document.querySelectorAll('.manual-entry:not(.on-phone)')));
}

function markCurrent(){
 var rows=enteredRows();
 if(!rows.length){cursor=0;return;}
 if(cursor>=rows.length)cursor=rows.length-1;
 if(cursor<0)cursor=0;
 rows.forEach(function(r,i){
  var on=i===cursor;
  r.classList.toggle('current',on);
  /* Announced, not just outlined — a teacher running this by keyboard is
     looking at the room, and a screen reader user has nothing else to go on. */
  if(on)r.setAttribute('aria-current','true');else r.removeAttribute('aria-current');
 });
}

function moveCursor(by){cursor+=by;markCurrent();
 var r=enteredRows()[cursor];if(r)r.scrollIntoView({block:'nearest'});}

function recordCurrent(choice){
 var q=state.question;if(!q||q.revealed)return false;
 if(q.spoken)return false;
 var row=enteredRows()[cursor];if(!row)return false;
 if(q.input==='order'||q.input==='fill'||q.input==='sort')return chooseOrderItem(q,row,choice);
 /* A letter is not a word: a tap is recorded by clicking the passage. */
 if(q.input!=='choice')return false;
 if(choice<0||choice>=(q.options||[]).length)return false;
 sendRowAnswer(q,row,{choice:choice});
 moveCursor(1);
 return true;
}

document.addEventListener('keydown',function(e){
 /* Never while they are typing a name or a written answer. */
 var t=/** @type {HTMLElement|null} */ (e.target);
 if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.tagName==='SELECT'))return;
 if(e.metaKey||e.ctrlKey||e.altKey||currentView()!=='mark'||!state.active)return;
 if(t&&t.tagName==='BUTTON'&&(e.key===' '||e.key==='Enter'))return;
 var k=e.key;
 if(k==='ArrowDown'){e.preventDefault();moveCursor(1);return;}
 if(k==='ArrowUp'){e.preventDefault();moveCursor(-1);return;}
 /* Skip somebody who did not answer, without recording anything for them. */
 if(k===' '){e.preventDefault();moveCursor(1);return;}
 if(k==='Backspace'){
  e.preventDefault();
  var q=state.question,row=enteredRows()[cursor];
  if(q&&!q.revealed&&row){
   var id=Number(row.dataset.id),draft=orderDraft[id];
   if(q.input==='order'&&draft&&draft.length){draft.pop();render();}
   else sendRowAnswer(q,row,{clear:true});
  }
  return;
 }
 var letter=/^[a-hA-H]$/.test(k)?k.toUpperCase().charCodeAt(0)-65:null;
 var digit=/^[1-8]$/.test(k)?Number(k)-1:null;
 var choice=letter!=null?letter:digit;
 if(choice!=null&&recordCurrent(choice))e.preventDefault();
});

var embedded=window.parent!==window;
var localView='roster', presenterView=null;
function currentView(){ return presenterView || (embedded ? (state.view || 'roster') : localView); }
window.addEventListener('message',function(e){
 if(!embedded||e.source!==window.parent||e.origin!==location.origin||!e.data||e.data.type!=='sf-teacher-view')return;
 if(['roster','mark','questions','overview','tools'].indexOf(e.data.view)<0)return;
 document.body.classList.add('in-presenter');
 presenterView=e.data.view;applyPanes();
 if(presenterView==='questions'||presenterView==='overview')send('report');
});
function applyPanes(){
 var view=currentView();
 if($('toolsPane')) $('toolsPane').hidden=view!=='tools';
 if($('entryPane')) $('entryPane').hidden=view!=='roster';
 if($('markPane')) $('markPane').hidden=view!=='mark';
 if($('questionsPane')) $('questionsPane').hidden=view!=='questions';
 if($('overviewPane')) $('overviewPane').hidden=view!=='overview';
 var tabs=$('ownTabs');
 if(tabs){
  tabs.hidden=!!embedded;
  Array.prototype.forEach.call(tabs.querySelectorAll('[data-view]'),function(b){
   b.setAttribute('aria-selected',String(b.dataset.view===view));
  });
 }
 var title=document.querySelector('.manual-panel h1');
 if(title) title.textContent=view==='mark'?'Live answers':view==='roster'?'Classroom':view==='questions'?'Question insights':view==='tools'?'Toolkit':'Class overview';
 if(view==='questions') paintChose($('questionsPane'),state.report);
 if(view==='overview') paintWho($('overviewPane'),state.report);
}
function paintChose(box,r){
 if(!box) return;
 box.textContent='';
 var live=window.SF&&SF.liveClassReport?SF.liveClassReport(r||{}):r||{};
 if(window.SF&&SF.questionOverview){
  if(SF.gridReadout) box.appendChild(SF.gridReadout(live));
  box.appendChild(SF.questionOverview(live));
  return;
 }
 box.appendChild(document.createElement('p')).textContent='Open a quiz slide. Each check appears here as what the room chose.';
}
function paintWho(box,r){
 if(!box) return;
 box.textContent='';
 var live=window.SF&&SF.liveClassReport?SF.liveClassReport(r||{}):r||{};
 if(window.SF&&SF.answerGrid){
  if(SF.gridReadout) box.appendChild(SF.gridReadout(live));
  box.appendChild(SF.answerGrid(live,{names:true,responses:true,results:true}));
  if(SF.rosterManage) box.appendChild(SF.rosterManage(state.players||[],rosterActions()));
  return;
 }
 box.appendChild(document.createElement('p')).textContent='No one is in the room yet.';
}
if($('ownTabs')) Array.prototype.forEach.call($('ownTabs').querySelectorAll('[data-view]'),function(b){
 b.onclick=function(){
  localView=b.dataset.view;
  applyPanes();
  if(localView==='questions'||localView==='overview') send('report');
 };
});

function paintLiveGate(){
 var btn=$('startLiveRoom'), hint=$('liveRoomHint'), pin=$('liveRoomPin');
 if(!btn) return;
 if(state.active){
  btn.textContent='New room…';
  btn.setAttribute('aria-label','End this room and start a new live room with a fresh PIN');
  if(hint) hint.textContent='Room is open. Add names below. Share the PIN only if phones will join.';
  if(pin){
   pin.hidden=!state.pin;
   pin.textContent=state.pin ? ('PIN '+state.pin) : '';
  }
 }else{
  btn.textContent='Start live room';
  btn.setAttribute('aria-label','Start a live room for the register');
  if(hint) hint.textContent='Start a live room to take the register. Phones are optional — add names here for paper or whiteboards.';
  if(pin){ pin.hidden=true; pin.textContent=''; }
 }
}
if($('startLiveRoom')) $('startLiveRoom').onclick=function(){
 if(state.active){
  if(!confirm('End the current room and start a new one?\n\nEveryone will need the new PIN. Scores from this room will be lost.')) return;
  send('host',{force:true});
 }else{
  send('host');
 }
 $('error').textContent='';
};

/* Who spoke, for the spoken formats.

   The teacher is watching the student, not this screen, so choosing has to
   take one glance and one click: the teams as big buttons, the last few
   speakers as chips, the rest by typing the first letters, and "Pick for me"
   for cold-calling, which prefers someone who has not spoken yet. A scoring
   verdict given before anyone was chosen waits here ("Correct is waiting")
   and choosing completes it. The choice lasts one item and is then cleared,
   except in Heads Up, where the guesser owns the round. */
var spQuery='', spFocusFor='';
function chooseSpeaker(r){spQuery='';var f=$('spSearch');if(f)f.value='';send('recipient',{recipient:r});}
/* Proposals from the phones (Concept Chain, Connection Maker, Compare &
   Contrast): named here, anonymous on the wall. "Use this" puts one on the
   table; in a spoken format its author becomes the speaker and, in a chain,
   its words the link Accept will add. */
function paintProposals(){
 var pp=$('spProposals');if(!pp)return;
 var props=state.proposals||[];
 pp.textContent='';pp.hidden=!props.length&&!state.onTable;
 if(state.onTable){
  var table=document.createElement('p');table.className='sp-on-table';
  table.textContent='On the table: “'+state.onTable+'”';pp.appendChild(table);
 }
 if(!props.length)return;
 var ph=document.createElement('span');ph.className='sp-label';ph.textContent='From the room';pp.appendChild(ph);
 props.forEach(function(it){
  var row=document.createElement('div');row.className='sp-proposal';
  var said=document.createElement('span');said.className='sp-proposal-text';said.textContent=it.text;row.appendChild(said);
  var by=document.createElement('span');by.className='sp-proposal-who';by.textContent=it.name||'';row.appendChild(by);
  row.appendChild(button('Use this',function(){send('useProposal',{pid:it.pid,text:it.text});}));
  pp.appendChild(row);
 });
}

function paintSpokenControls(q){
 var box=$('spokenControls');
 if(!box)return;
 box.hidden=!q||!q.spoken;
 if(box.hidden){spFocusFor='';return;}
 var sel=state.recipient||{type:'room'};
 var teams=state.mode==='teams'?(state.teams||[]):[];
 function teamName(i){var t=teams[i];return t?(t.name||t):'';}
 var people=(state.players||[]).filter(function(p){return p.manual||p.connected!==false;});
 var byId={};people.forEach(function(p){byId[p.id]=p;});

 var now=sel.type==='team'&&teams[sel.id]?teamName(sel.id)+' · team'
  :sel.type==='player'&&byId[sel.id]?byId[sel.id].name+(teams.length&&byId[sel.id].team!=null?' · '+teamName(byId[sel.id].team):'')
  :'';
 $('spNow').textContent=now||(q.style==='headsup'?'Choose this round’s guesser':'Nobody yet · counts for the room');
 $('spNow').classList.toggle('set',!!now);
 $('spClear').hidden=!now;
 $('spClear').onclick=function(){chooseSpeaker({type:'room'});};

 var pend=state.pendingVerdict;
 $('spPending').hidden=!pend;
 box.classList.toggle('waiting',!!pend);
 if(pend){
  $('spPendingText').textContent=(pend.label||'The verdict')+' is waiting.';
  /* Straight to the name box, once per held verdict. */
  var key=q.id+':'+pend.choice;
  if(spFocusFor!==key){spFocusFor=key;setTimeout(function(){var f=$('spSearch');if(f)f.focus();},0);}
 }else spFocusFor='';
 $('spRoom').onclick=function(){send('verdictRoom');};

 function chip(p){
  var on=sel.type==='player'&&sel.id===p.id;
  var b=button(p.name,function(){chooseSpeaker({type:'player',id:p.id});});
  b.className='sp-chip'+(on?' on':'');b.setAttribute('aria-pressed',String(on));
  if(teams.length&&p.team!=null){var t=document.createElement('span');t.className='sp-chip-team';t.textContent=teamName(p.team);b.appendChild(t);}
  return b;
 }

 var tb=$('spTeams');tb.textContent='';tb.hidden=!teams.length;
 teams.forEach(function(_,i){
  var on=sel.type==='team'&&sel.id===i;
  var b=button(teamName(i),function(){chooseSpeaker({type:'team',id:i});});
  b.className='sp-team'+(on?' on':'');b.setAttribute('aria-pressed',String(on));tb.appendChild(b);
 });

 var qy=spQuery.trim().toLowerCase();
 var recent=(state.recentSpeakers||[]).map(function(id){return byId[id];}).filter(Boolean);
 var rb=$('spRecent');rb.textContent='';rb.hidden=!recent.length||!!qy;
 if(recent.length&&!qy){
  var lbl=document.createElement('span');lbl.className='sp-label';lbl.textContent='Recent';rb.appendChild(lbl);
  recent.forEach(function(p){rb.appendChild(chip(p));});
 }

 var match=people.filter(function(p){
  if(!qy)return true;
  var n=String(p.name||'').toLowerCase();
  return n.indexOf(qy)===0||n.split(/\s+/).some(function(w){return w.indexOf(qy)===0;});
 });
 /* Everyone, when a room is small enough to scan; a handful, and the search,
    when it is not. */
 var limit=qy?12:people.length<=16?16:8;
 var pb=$('spPeople');pb.textContent='';
 match.slice(0,limit).forEach(function(p){pb.appendChild(chip(p));});
 function note(text){var m=document.createElement('span');m.className='sp-more';m.textContent=text;pb.appendChild(m);}
 if(match.length>limit)note('+'+(match.length-limit)+' more · type to narrow');
 if(qy&&!match.length)note('Nobody in the room starts with “'+spQuery.trim()+'”.');

 var search=$('spSearch');
 search.oninput=function(){spQuery=search.value;render();};
 search.onkeydown=function(e){
  if(e.key==='Enter'&&match[0]){e.preventDefault();chooseSpeaker({type:'player',id:match[0].id});}
  if(e.key==='Escape'){spQuery='';search.value='';render();}
 };
 $('spPick').onclick=function(){
  /* Cold-call fairly: someone who has not spoken recently, if there is one. */
  var recentIds=state.recentSpeakers||[];
  var pool=people.filter(function(p){return recentIds.indexOf(p.id)<0;});
  if(!pool.length)pool=people;
  if(!pool.length)return;
  chooseSpeaker({type:'player',id:pool[Math.floor(Math.random()*pool.length)].id});
 };

 var credit=state.lastCredit;
 $('spokenScoringNote').textContent=
  (credit&&credit.accepted?'✓ Last: '+(credit.line||'accepted for the room')+'. ':'')+
  (q.style==='headsup'?(state.oralCount||0)+' correct in this round · count only.'
  :teams.length?'An accepted answer scores for the chosen team.'
  :q.scoreSpoken?'An accepted answer scores for the chosen speaker.'
  :'Accepted answers add to the room count. Individual points are off in Game settings.');
}

/* Spot the Error without phones: one passage for the whole register rather
   than a copy of it in every row. Click the word the learner points at; it
   records for the highlighted row and moves down. */
function paintTapPassage(q){
 var box=$('tapPassage');
 if(!box)return;
 var entered=(state.players||[]).some(function(p){return p.manual;});
 var show=!!q&&q.input==='tap'&&!q.spoken&&!q.revealed&&entered;
 box.hidden=!show;
 if(!show){box.textContent='';box.dataset.q='';return;}
 if(box.dataset.q===q.id)return;
 box.dataset.q=q.id;box.textContent='';
 var lead=document.createElement('p');lead.className='tap-lead';
 lead.textContent='Click the word the highlighted learner points at. It records and moves down.';
 box.appendChild(lead);
 var words=document.createElement('div');words.className='tap-words';
 (q.options||[]).forEach(function(w,i){
  var b=button(w,function(){
   var row=enteredRows()[cursor];if(!row)return;
   sendRowAnswer(q,row,{choice:i});moveCursor(1);
  });
  b.className='tap-word';words.appendChild(b);
 });
 box.appendChild(words);
}

function render(){
 applyPanes();
 paintPulse();
 /* Everyone in the room, not only the ones typed in here.
    A mixed room is the normal case — some phones, some hands up — and a
    window that lists only the half you enter by hand cannot tell you whether
    the room has finished. The phones are read-only: their answers arrive on
    their own and there is nothing to record. Entered names come first,
    because those are the rows that need doing something to. */
 var q=state.question, key=q?q.id:'', all=(state.players||[]).slice();
 paintSpokenControls(q);
 paintProposals();
 paintTapPassage(q);
 var entered=all.filter(function(p){return p.manual;});
 var onPhones=all.filter(function(p){return !p.manual;});
 var people=entered.concat(onPhones);
 var names=people.map(function(p){return p.name;}).join(', ');
 $('status').textContent=state.active
  ? (people.length
    ? people.length+' in the room · '+entered.length+' teacher-entered · '+onPhones.length+' on devices'
      + (state.pin ? ' · PIN '+state.pin : '')
    : 'Room open'+(state.pin ? ' · PIN '+state.pin : '')+' — add a name below')
  : 'Start a live room to take the register (phones optional).';
 paintLiveGate();
 paintClassRoster(people);
 if(people.length) $('error').textContent='';
 /* Once the room has taken the names, the box is a draft again — the list
    below is the roster, and leaving it full looked like the same names
    needed adding a second time. */
 if(entered.length){
  var have={};
  entered.forEach(function(p){have[String(p.name).toLowerCase()]=true;});
  var leftover=$('names').value.split('\n').map(function(n){return n.trim();}).filter(function(n){return n&&!have[n.toLowerCase()];});
  if(leftover.join('\n')!==$('names').value){$('names').value=leftover.join('\n');saveDraft();}
 }
 /* This heading used to say "Ready for the next question" whenever no quiz
    was up — including in the lobby, where there is no next question yet.
    It is a status, not a prompt. */
 var heading = q ? q.question
  : !state.active ? 'Start a live room to record answers'
  : !state.showing ? 'Start the lesson, then open a quiz slide'
  : 'This slide has no check — advance to a quiz slide to record answers';
 $('question').textContent=heading;
 var roll=$('rollcall');
 if(roll) roll.hidden=!q||!!q.spoken;
 /* A disabled button that says nothing is indistinguishable from a broken
    one — "what is the point of this button, it does nothing" is the exact
    report it earns. Every reason it cannot be pressed is now written next to
    it, and it is only actually disabled for the reason a teacher can fix by
    waiting. */
 var why = !state.active ? 'Start a live room above, then add names.'
  : (q && !q.revealed) ? 'A question is on screen. Add names once you have revealed it or moved on.'
  : (state.mode==='teams' && !(state.teams||[]).length) ? 'This room is in teams mode but has no teams set up. Add teams in the quiz settings, or switch the lesson to individual.'
  : '';
 $('add').disabled = !!why;
 $('add').title = why || 'Add these learners to the room';
 if($('addWhy')){ $('addWhy').textContent = why; $('addWhy').hidden = !why; }
 $('reveal').hidden=!state.active||!q||q.revealed;
 if(state.active) drawRevealRow(q); else { var rr=$('revealRow'); if(rr){rr.hidden=true;rr.dataset.q='';} }
 /* Rebuilt when the teams change, not when how many of them changes.
    The count check never fired on the first state — nought options against
    nought teams — so a room that opened before its teams arrived kept an
    empty dropdown, and an empty dropdown sends no team at all. */
 var options=(state.teams||[]).map(function(t,i){return {name:t.name||t,id:i};});
 var sig=options.map(function(t){return t.name;}).join('\u0000');
 if($('team').dataset.sig!==sig){
  $('team').dataset.sig=sig;$('team').textContent='';
  options.forEach(function(t){var o=document.createElement('option');o.value=t.id;o.textContent=t.name;$('team').appendChild(o);});
 }
 /* The label goes with it. Hiding the select alone left a "Team" heading
    over nothing, which reads as a control that failed to load. */
 var teams=state.mode==='teams';
 $('team').hidden=!teams;
 if($('teamLabel')) $('teamLabel').hidden=!teams;
 if($('teamNote')) $('teamNote').hidden=!teams;
 /* Rebuild on who is in the list, not how many.
    Two things went wrong with a length check. A phone joining changed the
    count, so it rebuilt and wiped a half-typed answer — which is the exact
    thing the old guard existed to prevent, and it only started happening
    when phones joined this list. And one person leaving as another arrives
    keeps the count identical while every row below them is now pointing at
    the wrong id.

    Typed answers are carried across a rebuild rather than being protected
    from one, so it no longer matters why it happens. */
 /* A new question starts the register at the top.
    The cursor used to survive a question change, so the next roll call began
    wherever the last one stopped — every answer landing one or more rows
    down, silently, with the first learners getting nothing. Reset on the
    question, not on the signature: the roster changes when a phone joins
    mid-question, and that must not move the teacher's place. */
 var questionChanged=lastQ!==key;
 if(questionChanged){lastQ=key;cursor=0;orderDraft={};answerErrors={};}
 sig=key+'|'+people.map(function(p){return p.id;}).join(',');
 if(lastKey!==sig){
  var typed={};
  Array.from($('entries').children).forEach(function(row){
   var i=row.querySelector('input');if(!questionChanged&&i&&i.value)typed[row.dataset.id]=i.value;});
  lastKey=sig;$('entries').textContent='';
  people.forEach(function(p){
   var row=document.createElement('div');row.className='manual-entry'+(p.manual?'':' on-phone');row.dataset.id=p.id;
   var name=document.createElement('strong');name.textContent=p.name;row.appendChild(name);
   if(!p.manual){var tag=document.createElement('span');tag.className='source-tag';tag.textContent='on a phone';row.appendChild(tag);}
   addRosterActions(row,p);
   if(q&&p.manual){
    function answer(data){sendRowAnswer(q,row,data);}
    if(q.spoken){ /* The teacher marks the spoken verdict above. */ }
    else if(q.input==='tap'){ /* Recorded from the one passage above the register. */ }
    else if(q.input==='choice') (q.options||[]).forEach(function(text,i){
     var b=button(String.fromCharCode(65+i)+' · '+text,function(){answer({choice:i});});
     b.dataset.choice=i;row.appendChild(b);
    });
    else if(q.input==='sort') (q.bins||['A only','Both','B only']).forEach(function(text,i){
     var b=button((i+1)+' · '+text,function(){chooseOrderItem(q,row,i);});
     b.dataset.order=i;row.appendChild(b);
    });
    else if(q.input==='order'||q.input==='fill') (q.options||[]).forEach(function(text,i){
     var b=button(String.fromCharCode(65+i)+' · '+text,function(){chooseOrderItem(q,row,i);});
     b.dataset.order=i;row.appendChild(b);
    });
    else {var input=document.createElement('input');input.type=q.input==='number'?'number':'text';input.setAttribute('aria-label','Answer for '+p.name);row.appendChild(input);row.appendChild(button('Record',function(){if(input.value.trim()) answer(q.input==='number'?{value:Number(input.value)}:{text:input.value});}));}
    if(!q.spoken)row.appendChild(button('Clear answer',function(){delete orderDraft[p.id];answer({clear:true});render();}));
   }
   var status=document.createElement('span');status.className='answer-status';row.appendChild(status);$('entries').appendChild(row);
   if(typed[p.id]){var keep=row.querySelector('input');if(keep)keep.value=typed[p.id];}
  });
  markCurrent();
 }
 Array.from($('entries').children).forEach(function(row){var a=(state.answers||[]).find(function(x){return x.id===Number(row.dataset.id);});var person=(state.players||[]).find(function(p){return p.id===Number(row.dataset.id);});if(person)row.querySelector('strong').textContent=person.name+(q&&q.revealed?' · '+person.score+' points':'');var entered_=row.className.indexOf('on-phone')<0;
 /* Nothing to report between questions. The snapshot still holds the last
    one, and printing it under "Ready for the next question" reads as an
    answer to a question nobody asked — and reads it as a raw index, because
    the letters come from the question that is no longer there. */
 var said=a?(q&&q.input==='choice'?String.fromCharCode(65+a.response)
  :q&&q.input==='sort'&&Array.isArray(a.response)?a.response.map(function(b){return (q.bins||[])[b]||'?';}).join(' · ')
  :q&&q.input==='fill'&&Array.isArray(a.response)?a.response.map(function(i){return q.options[i];}).join(' · ')
  :q&&q.input==='tap'?q.options[a.response]
  :q&&q.input==='order'&&Array.isArray(a.response)?a.response.map(function(i){return String.fromCharCode(65+i);}).join(' → ')
  :a.response):null;
 /* Right and wrong arrive only once the reveal has happened — the host sends
    null until then — so this cannot show a verdict early. */
 var verdict=a&&a.right!=null?(a.right?' \u2713 right':' \u2717 wrong'):'';
 row.classList.toggle('is-right',!!(a&&a.right===true));
 row.classList.toggle('is-wrong',!!(a&&a.right===false));
 var draft=q&&(q.input==='order'||q.input==='fill'||q.input==='sort')&&orderDraft[Number(row.dataset.id)];
 var draftTarget=q&&q.input==='fill'?Number(q.gaps)||0:(q&&q.options||[]).length;
 row.querySelector('.answer-status').textContent=answerErrors[Number(row.dataset.id)]
  ?'Not recorded: '+answerErrors[Number(row.dataset.id)]
  :draft&&draft.length&&draft.length<draftTarget
  ?(q.input==='sort'?'“'+q.options[draft.length]+'” — which column? '+draft.length+' of '+q.options.length+' sorted'
   :q.input==='fill'?'Gaps so far: '+draft.map(function(i){return q.options[i];}).join(' · ')+' · '+((Number(q.gaps)||0)-draft.length)+' to go'
   :'Order so far: '+draft.map(function(i){return String.fromCharCode(65+i)+' · '+q.options[i];}).join(' → ')+' · choose '+((q.options||[]).length-draft.length)+' more')
  :!q?''
  :a?(entered_?'Recorded: ':'Answered ')+said+verdict
  :q&&q.spoken?'Listen and watch — teacher marks the verdict above'
  :(entered_?'No answer recorded':'Waiting');row.querySelectorAll('button').forEach(function(b){
  if(b.classList.contains('roster-act')){b.disabled=!state.active;return;}
  b.disabled=!state.active||!q||q.revealed;if(b.dataset.choice!=null)b.setAttribute('aria-pressed',String(!!a&&a.response===Number(b.dataset.choice)));
  if(b.dataset.order!=null)b.setAttribute('aria-pressed',String(!!draft&&draft.indexOf(Number(b.dataset.order))>=0));
 });});
}
// Private classroom utilities never send notes or picker results to learners.
var pickedIds=new Set(), timerEnd=0, timerRemaining=60, timerTick=null;
function eligiblePeople(){return (state.players||[]).filter(function(p){return p.manual||p.connected!==false;});}
function paintPulse(){
 var box=$('lessonPulse');box.textContent='';
 var people=state.players||[],q=state.question;
 var answers=q?(state.answers||[]).filter(function(a){return people.some(function(p){return p.id===a.id;});}):[];
 var missing=Math.max(0,people.length-answers.length);
 var stats=q&&q.spoken
  ?[['In the room',people.length],['Accepted this round',state.oralCount||0],['Verdict','Teacher marks']]
  :[['In the room',people.length],['Answered',q?answers.length+' / '+people.length:'—'],['Not yet answered',q?missing:'—']];
 stats.forEach(function(x){
  var card=document.createElement('div');card.className='pulse-stat';
  card.appendChild(document.createElement('strong')).textContent=x[1];
  card.appendChild(document.createElement('span')).textContent=x[0];box.appendChild(card);
 });
 var advice=!state.active?'Start a live room to connect the class. Phones are optional — teacher entry works for paper and whiteboards.'
  :q&&q.spoken?'Choose who spoke, then mark the answer. Phones listen and watch.'
  :!q?'Add your learners, then open a quiz slide to gather evidence.'
  :!q.revealed?(missing?'Give the room thinking time. '+missing+' learner'+(missing===1?' has':'s have')+' no recorded answer yet.':'All responses are in. Reveal when you are ready.')
  :'No responses were recorded for this question.';
 if(q&&q.revealed&&answers.length){
  var marked=answers.filter(function(a){return typeof a.right==='boolean';});
  var right=marked.filter(function(a){return a.right;}).length;
  advice=marked.length?right+' of '+marked.length+' marked responses correct. '+(right/marked.length<0.6?'Consider modelling another example, then recheck understanding.':'Ask learners to explain their reasoning before moving on.'):'Responses are available. Review them before deciding what to revisit.';
  if(missing)advice+=' '+missing+' without a response; understanding is not yet known.';
 }
 var n=document.createElement('p');n.className='pulse-guidance';n.textContent=advice;box.appendChild(n);
 $('pickName').disabled=spinning||!state.active||!eligiblePeople().some(function(p){return !pickedIds.has(p.id);});
}
$('rosterSearch').oninput=function(){paintClassRoster(state.players||[]);};
/* The draw is over before the animation starts.
   Choosing first and then spinning keeps the two concerns apart: fairness is
   decided by the bag, and the spin is theatre. Animating a "search" that
   picks as it goes would make the odds depend on frame timing, and the point
   of this tool is that it is visibly fair. */
var spinning=false;
function spinTo(winner,pool){
 var el=$('pickedName');
 var names=pool.map(function(p){return p.name;});
 var reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 if(reduced||names.length<2){land(el,winner.name);return;}
 spinning=true;$('pickName').disabled=true;
 el.classList.add('spinning');
 var delay=45;
 (function step(){
  el.textContent=names[Math.floor(Math.random()*names.length)];
  delay*=1.18;                                   /* decelerates like a wheel */
  if(delay<320){setTimeout(step,delay);return;}
  el.classList.remove('spinning');
  spinning=false;
  land(el,winner.name);
  paintPulse();                                  /* re-enables if any remain */
 })();
}
function land(el,name){
 el.textContent=name;
 /* Restarted rather than just added: two picks in a row would otherwise show
    the second name with no flourish at all. */
 el.classList.remove('landed');void el.offsetWidth;el.classList.add('landed');
}
$('pickName').onclick=function(){
 if(spinning)return;
 var pool=eligiblePeople().filter(function(p){return !pickedIds.has(p.id);});if(!state.active||!pool.length)return;
 var p=pool[Math.floor(Math.random()*pool.length)];pickedIds.add(p.id);
 var left=pool.length-1;
 /* Said in words when the bag empties. "0 remaining" reads like a fault, and
    the button was left enabled until the next state push happened along — so
    a press in that gap did nothing and gave no reason, which is the failure
    this whole tool is meant to avoid. */
 $('pickerStatus').textContent=left
  ? left+' remaining in this round.'
  : 'Everyone has had a turn. Reset the round to go again.';
 if(!left)$('pickName').disabled=true;
 send('recipient',{recipient:{type:'player',id:p.id}});
 spinTo(p,pool);
};
$('resetPicker').onclick=function(){
 if(spinning)return;
 pickedIds.clear();
 var el=$('pickedName');el.classList.remove('landed','spinning');
 el.textContent='Who will share next?';$('pickerStatus').textContent='New round ready.';paintPulse();
};
function paintTimer(){
 if(timerEnd)timerRemaining=Math.max(0,Math.ceil((timerEnd-Date.now())/1000));
 $('timerReadout').textContent=String(Math.floor(timerRemaining/60)).padStart(2,'0')+':'+String(timerRemaining%60).padStart(2,'0');
 if(timerEnd&&!timerRemaining){clearInterval(timerTick);timerTick=null;timerEnd=0;$('timerStatus').textContent='Time is up. Bring the discussion back to the room.';}
 $('timerToggle').textContent=timerEnd?'Pause timer':timerRemaining?'Start timer':'Start again';
}
$('timerToggle').onclick=function(){
 if(timerEnd){paintTimer();timerEnd=0;clearInterval(timerTick);timerTick=null;$('timerStatus').textContent='Timer paused.';}
 else {if(!timerRemaining)timerRemaining=Number($('timerDuration').value);timerEnd=Date.now()+timerRemaining*1000;timerTick=setInterval(paintTimer,250);$('timerStatus').textContent='Thinking time running.';}
 paintTimer();
};
function resetTimer(){clearInterval(timerTick);timerTick=null;timerEnd=0;timerRemaining=Number($('timerDuration').value);$('timerStatus').textContent='';paintTimer();}
$('timerReset').onclick=resetTimer;$('timerDuration').onchange=resetTimer;
function loadNotes(){try{var saved=localStorage.getItem('sf-teacher-notes-'+key);if(saved===null){saved=sessionStorage.getItem('sf-teacher-notes-'+key)||'';if(saved)localStorage.setItem('sf-teacher-notes-'+key,saved);}$('teacherNotes').value=saved;}catch(e){$('notesStatus').textContent='Storage unavailable. Download notes before closing.';}}
loadNotes();
window.addEventListener('storage',function(e){if(e.key==='sf-teacher-notes-'+key)loadNotes();});
$('teacherNotes').oninput=function(){try{localStorage.setItem('sf-teacher-notes-'+key,$('teacherNotes').value);$('notesStatus').textContent='Saved in this browser for this workspace.';}catch(e){$('notesStatus').textContent='Could not save. Download notes before closing.';}};
$('downloadNotes').onclick=function(){var url=URL.createObjectURL(new Blob([$('teacherNotes').value],{type:'text/plain;charset=utf-8'}));var a=document.createElement('a');a.href=url;a.download='teaching-notes.txt';a.click();setTimeout(function(){URL.revokeObjectURL(url);},1000);};

function receive(data){
 if(!data) return;
 if(data.type==='sf-manual-state'){
  if((data.players||[]).length>(state.players||[]).length) $('error').textContent='';
  state=data;render();markCurrent();
 } else if(data.type==='sf-manual-error'){
  if(data.playerId!=null&&state.question&&data.id===state.question.id){
   answerErrors[Number(data.playerId)]=data.message;
   render();
  }else $('error').textContent=data.message;
 }
}
window.addEventListener('message',function(e){if(!channel && e.source===window.opener&&e.origin===location.origin)receive(e.data);});
function listen(){if(channel)channel.onmessage=function(e){receive(e.data);};}
listen();
/* Re-point at the new room when the key changes.
   window.open reuses a window of the same name, and a URL that differs only
   in its hash does not reload the page — so the script never re-runs and the
   channel stays bound to the room that has gone. The window looks perfectly
   alive and hears nothing, which is a hard failure to diagnose from the
   front of a class. */
window.addEventListener('hashchange',function(){
 var next=location.hash.slice(1);
 if(!/^[a-f0-9]{32}$/.test(next))return;
 if(channel){try{channel.close();}catch(e){}}
 key=next;draftKey='sf-entry-draft-'+key;$('names').value='';loadDraft();loadNotes();pickedIds.clear();resetTimer();$('pickedName').textContent='Who will share next?';$('pickerStatus').textContent='';
 channel=new BroadcastChannel('sf-manual-'+next);
 listen();
 state={};lastKey='';lastQ=null;cursor=0;
 send('hello');
});
render();
send('hello');
})();
