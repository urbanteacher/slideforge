/* Presenter-only controls for temporary projected activities and room signals. */
(function(){
'use strict';
var SF=window.SF,M=SF.LessonMoments,$=function(id){return document.getElementById(id);},moment=null,musicUrl=null;
function command(data){if(window.opener&&!window.opener.closed)window.opener.postMessage(Object.assign({type:'sf-presenter-cmd',cmd:'moment'},data),location.origin);}
function start(kind){
 var seconds=kind==='break'?300:Number($('quickDuration').value);
 if(kind==='timer'&&!seconds){$('momentGuard').textContent='Choose a duration for the countdown.';return;}
 if(kind==='task'&&!$('quickTask').value.trim()){$('momentGuard').textContent='Write a task to show the room.';return;}
 command({action:'start',kind:kind,seconds:seconds,title:kind==='task'?$('quickTask').value:kind==='break'?'Take a break':'Thinking time'});
}
$('showTask').onclick=function(){start('task');};$('showCountdown').onclick=function(){start('timer');};$('showBreak').onclick=function(){start('break');};
$('pauseMoment').onclick=function(){command({action:moment&&moment.paused?'resume':'pause'});};
$('extendMoment').onclick=function(){command({action:'extend'});};$('clearMoment').onclick=function(){command({action:'clear'});};
function clock(){
 $('momentTitle').textContent=moment?moment.title:'No spontaneous activity is showing.';
 var left=M.remaining(moment,Date.now());
 $('momentTime').textContent=moment&&moment.timed?(left?M.format(left)+(moment.paused?' · paused':''):'Time is up'):moment?'No countdown':'—';
 $('pauseMoment').disabled=!moment||!moment.timed||!left;$('pauseMoment').textContent=moment&&moment.paused?'Resume':'Pause';
 $('extendMoment').disabled=!moment||!moment.timed;$('clearMoment').disabled=!moment;
 M.paint($('boxNow'),moment);
}
function text(box,value){var p=document.createElement('p');p.textContent=value;box.appendChild(p);}
function room(pulse){
 var box=$('roomActivity');box.replaceChildren();var fb=$('slideFeedback');fb.replaceChildren();
 if(!pulse||!pulse.active){text(box,'Host a live lesson to see reactions, bookmarks and student signals.');text(fb,'No live slide activity.');return;}
 var counts=pulse.reactions||{};
 [['yes','👍 Got it'],['clap','👏 Applause'],['wow','✨ Wow'],['idea','💡 Idea']].forEach(function(pair){var row=document.createElement('div');row.className='pulse-line';row.appendChild(document.createElement('span')).textContent=pair[1];row.appendChild(document.createElement('strong')).textContent=counts[pair[0]]||0;box.appendChild(row);});
 text(box,(pulse.bookmarks||0)+(pulse.bookmarks===1?' student bookmarked':' students bookmarked')+' this slide.');
 var d=pulse.feedback,p=pulse.prompt||{};
 if(!d){text(fb,'Open a slide with a poll, scale, word cloud or brainstorm to see its responses here.');return;}
 if(p.question||p.prompt)text(fb,p.question||p.prompt);
 text(fb,(d.total||0)+' responses');
 if(d.counts)d.counts.forEach(function(n,i){text(fb,((p.options||[])[i]||'Option '+(i+1))+': '+n);});
 if(d.words)d.words.forEach(function(w){text(fb,w.text+' · '+w.n);});
 if(d.items)d.items.forEach(function(item){text(fb,typeof item==='string'?item:((item.name?item.name+': ':'')+(item.text||'')));});
}
SF.PresenterLive={update:function(d){moment=d.moment||null;room(d.roomPulse);var blocked=!!(d.roomPulse&&d.roomPulse.active&&['reveal','hold'].includes(d.nextAction));['showTask','showCountdown','showBreak'].forEach(function(id){$(id).disabled=blocked;});$('momentGuard').textContent=blocked?'Finish or reveal the live question before starting another activity.':'Tasks and countdowns appear on the audience screen.';clock();}};
setInterval(clock,250);
$('activityAudio').volume=0.3;
$('activityMusic').onchange=function(){var file=this.files[0];if(!file)return;var audio=$('activityAudio');audio.pause();if(musicUrl)URL.revokeObjectURL(musicUrl);musicUrl=URL.createObjectURL(file);audio.src=musicUrl;audio.hidden=false;$('musicStatus').textContent=file.name+' · press Play when ready.';};
$('activityAudio').onerror=function(){$('musicStatus').textContent='This file could not be played. Choose another audio file.';};
window.addEventListener('pagehide',function(){$('activityAudio').pause();if(musicUrl)URL.revokeObjectURL(musicUrl);});
})();
