(function(){
'use strict';
/** @type {import("../src/types.js").SlideForgeGlobal} */
var SF = window.SF || /** @type {any} */ ({});
var key=location.hash.slice(1),channel=/^[a-f0-9]{32}$/.test(key)?new BroadcastChannel('sf-manual-'+key):null;
/** @type {(id: string) => any} */
var $=function(id){return document.getElementById(id);};
var state={},lastKey='',lastQ=null;
var draftKey='sf-entry-draft-'+(key||'none');
function send(action,extra){var m=Object.assign({type:'sf-manual-command',action:action},extra||{});if(channel)channel.postMessage(m);else if(window.opener)window.opener.postMessage(m,location.origin);}
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
 if(!people.length){box.appendChild(document.createElement('p')).textContent=$('rosterSearch').value?'No learners match your search.':'No learners yet. Add names below or invite learners to join on their devices.';return;}
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
 lead.textContent='Press the correct answer to reveal it and score the room.';
 row.appendChild(lead);
 (q.options||[]).forEach(function(text,i){
  var b=document.createElement('button');
  b.className='reveal-opt';
  b.textContent=String.fromCharCode(65+i)+' · '+text;
  b.onclick=function(){send('revealWith',{choice:i});};
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
 var row=enteredRows()[cursor];if(!row)return false;
 if(q.input!=='choice')return false;
 if(choice<0||choice>=(q.options||[]).length)return false;
 send('answer',{answer:{id:q.id,playerId:Number(row.dataset.id),choice:choice}});
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
  if(q&&!q.revealed&&row)send('answer',{answer:{id:q.id,playerId:Number(row.dataset.id),clear:true}});
  return;
 }
 var letter=/^[a-fA-F]$/.test(k)?k.toUpperCase().charCodeAt(0)-65:null;
 var digit=/^[1-6]$/.test(k)?Number(k)-1:null;
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
 var entered=all.filter(function(p){return p.manual;});
 var onPhones=all.filter(function(p){return !p.manual;});
 var people=entered.concat(onPhones);
 var names=people.map(function(p){return p.name;}).join(', ');
 $('status').textContent=state.active
  ? (people.length
    ? people.length+' in the room · '+entered.length+' teacher-entered · '+onPhones.length+' on devices'
    : 'Nobody in the room yet — add a name below')
  : 'Host a live lesson to use teacher entry.';
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
  : !state.active ? 'No live lesson yet'
  : !state.showing ? 'Start the lesson, then open a quiz slide'
  : 'This slide has no check — advance to a quiz slide to record answers';
 $('question').textContent=heading;
 var roll=$('rollcall');
 if(roll) roll.hidden=!q;
 /* A disabled button that says nothing is indistinguishable from a broken
    one — "what is the point of this button, it does nothing" is the exact
    report it earns. Every reason it cannot be pressed is now written next to
    it, and it is only actually disabled for the reason a teacher can fix by
    waiting. */
 var why = !state.active ? 'Not connected to a live lesson yet \u2014 press Host live first.'
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
 if(questionChanged){lastQ=key;cursor=0;}
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
    function answer(data){send('answer',{answer:Object.assign({id:q.id,playerId:p.id},data)});}
    if(q.input==='choice') (q.options||[]).forEach(function(text,i){var b=button(String.fromCharCode(65+i)+' · '+text,function(){answer({choice:i});});b.dataset.choice=i;row.appendChild(b);});
    else {var input=document.createElement('input');input.type=q.input==='number'?'number':'text';input.setAttribute('aria-label','Answer for '+p.name);row.appendChild(input);row.appendChild(button('Record',function(){if(input.value.trim()) answer(q.input==='number'?{value:Number(input.value)}:{text:input.value});}));}
    row.appendChild(button('Clear answer',function(){answer({clear:true});}));
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
 var said=a?(q&&q.input==='choice'?String.fromCharCode(65+a.response):a.response):null;
 /* Right and wrong arrive only once the reveal has happened — the host sends
    null until then — so this cannot show a verdict early. */
 var verdict=a&&a.right!=null?(a.right?' \u2713 right':' \u2717 wrong'):'';
 row.classList.toggle('is-right',!!(a&&a.right===true));
 row.classList.toggle('is-wrong',!!(a&&a.right===false));
 row.querySelector('.answer-status').textContent=!q?''
  :a?(entered_?'Recorded: ':'Answered ')+said+verdict
  :(entered_?'No answer recorded':'Waiting');row.querySelectorAll('button').forEach(function(b){
  if(b.classList.contains('roster-act')){b.disabled=!state.active;return;}
  b.disabled=!state.active||!q||q.revealed;if(b.dataset.choice!=null)b.setAttribute('aria-pressed',String(!!a&&a.response===Number(b.dataset.choice)));
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
 [['In the room',people.length],['Answered',q?answers.length+' / '+people.length:'—'],['Not yet answered',q?missing:'—']].forEach(function(x){
  var card=document.createElement('div');card.className='pulse-stat';
  card.appendChild(document.createElement('strong')).textContent=x[1];
  card.appendChild(document.createElement('span')).textContent=x[0];box.appendChild(card);
 });
 var advice=!state.active?'Host a live lesson to connect your classroom. The toolkit is ready whenever you need it.'
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
 } else if(data.type==='sf-manual-error') $('error').textContent=data.message;
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
