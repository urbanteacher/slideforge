/* Presenter-only controls for temporary projected activities and room signals. */
(function(){
'use strict';
/** @type {import("../src/types.js").SlideForgeGlobal} */
var SF=window.SF;
var M=SF.LessonMoments;
var $=function(id){return document.getElementById(id);};
var moment=null,musicUrl=null;
function command(data){if(window.opener&&!window.opener.closed)window.opener.postMessage(Object.assign({type:'sf-presenter-cmd',cmd:'moment'},data),location.origin);}
function start(kind){
 var durEl = /** @type {HTMLSelectElement|null} */ ($('quickDuration'));
 var seconds=kind==='break'?300:Number(durEl?durEl.value:0);
 var guard = $('momentGuard');
 if(kind==='timer'&&!seconds){if(guard)guard.textContent='Choose a duration for the countdown.';return;}
 var taskEl = /** @type {HTMLTextAreaElement|null} */ ($('quickTask'));
 var taskVal = taskEl ? taskEl.value : '';
 if(kind==='task'&&!taskVal.trim()){if(guard)guard.textContent='Write a task to show the room.';return;}
 command({action:'start',kind:kind,seconds:seconds,title:kind==='task'?taskVal:kind==='break'?'Take a break':'Thinking time'});
}
var btnTask = $('showTask'); if(btnTask) btnTask.onclick=function(){start('task');};
var btnCountdown = $('showCountdown'); if(btnCountdown) btnCountdown.onclick=function(){start('timer');};
var btnBreak = $('showBreak'); if(btnBreak) btnBreak.onclick=function(){start('break');};
var btnPause = /** @type {HTMLButtonElement|null} */ ($('pauseMoment'));
if(btnPause) btnPause.onclick=function(){command({action:moment&&moment.paused?'resume':'pause'});};
var btnExtend = $('extendMoment'); if(btnExtend) btnExtend.onclick=function(){command({action:'extend'});};
var btnClear = $('clearMoment'); if(btnClear) btnClear.onclick=function(){command({action:'clear'});};
function clock(){
 var titleEl = $('momentTitle');
 if(titleEl) titleEl.textContent=moment?moment.title:'No spontaneous activity is showing.';
 var left=M.remaining(moment,Date.now());
 var timeEl = $('momentTime');
 if(timeEl) timeEl.textContent=moment&&moment.timed?(left?M.format(left)+(moment.paused?' · paused':''):'Time is up'):moment?'No countdown':'—';
 var pauseBtn = /** @type {HTMLButtonElement|null} */ ($('pauseMoment'));
 if(pauseBtn){pauseBtn.disabled=!moment||!moment.timed||!left;pauseBtn.textContent=moment&&moment.paused?'Resume':'Pause';}
 var extendBtn = /** @type {HTMLButtonElement|null} */ ($('extendMoment'));
 if(extendBtn) extendBtn.disabled=!moment||!moment.timed;
 var clearBtn = /** @type {HTMLButtonElement|null} */ ($('clearMoment'));
 if(clearBtn) clearBtn.disabled=!moment;
 var boxNow = $('boxNow');
 if(boxNow) M.paint(boxNow,moment);
}
function text(box,value){if(!box)return;var p=document.createElement('p');p.textContent=value;box.appendChild(p);}
function room(pulse){
 var box=$('roomActivity');var fb=$('slideFeedback');
 if(!box||!fb)return;
 var boxEl=box, fbEl=fb;
 boxEl.replaceChildren();fbEl.replaceChildren();
 if(!pulse||!pulse.active){text(boxEl,'Host a live lesson to see reactions, bookmarks and student signals.');text(fbEl,'No live slide activity.');return;}
 var counts=pulse.reactions||{};
 [['yes','👍 Got it'],['clap','👏 Applause'],['wow','✨ Wow'],['idea','💡 Idea']].forEach(function(pair){var row=document.createElement('div');row.className='pulse-line';row.appendChild(document.createElement('span')).textContent=pair[1];row.appendChild(document.createElement('strong')).textContent=String(counts[pair[0]]||0);boxEl.appendChild(row);});
 text(boxEl,(pulse.bookmarks||0)+(pulse.bookmarks===1?' student bookmarked':' students bookmarked')+' this slide.');
 var d=pulse.feedback,p=pulse.prompt||{};
 if(!d){text(fbEl,'Open a slide with a poll, scale, word cloud or brainstorm to see its responses here.');return;}
 if(p.question||p.prompt)text(fbEl,p.question||p.prompt);
 text(fbEl,(d.total||0)+' responses');
 if(d.counts)d.counts.forEach(function(n,i){text(fbEl,((p.options||[])[i]||'Option '+(i+1))+': '+n);});
 if(d.words)d.words.forEach(function(w){text(fbEl,w.text+' · '+w.n);});
 if(d.items)d.items.forEach(function(item){text(fbEl,typeof item==='string'?item:((item.name?item.name+': ':'')+(item.text||'')));});
}
SF.PresenterLive={update:function(d){moment=d.moment||null;room(d.roomPulse);var blocked=!!(d.roomPulse&&d.roomPulse.active&&['reveal','hold'].includes(d.nextAction));['showTask','showCountdown','showBreak'].forEach(function(id){var btn=/** @type {HTMLButtonElement|null} */ ($(id));if(btn)btn.disabled=blocked;});var guard=$('momentGuard');if(guard)guard.textContent=blocked?'Finish or reveal the live question before starting another activity.':'Tasks and countdowns appear on the audience screen.';clock();}};
setInterval(clock,250);
var audio = /** @type {HTMLAudioElement|null} */ ($('activityAudio'));
if(audio) audio.volume=0.3;
var musicInput = /** @type {HTMLInputElement|null} */ ($('activityMusic'));
if(musicInput) {
  var mInput = musicInput;
  mInput.onchange=function(){
    var file=mInput.files?mInput.files[0]:null;
    if(!file)return;
    var a=/** @type {HTMLAudioElement|null} */ ($('activityAudio'));
    if(!a)return;
    a.pause();
    if(musicUrl)URL.revokeObjectURL(musicUrl);
    musicUrl=URL.createObjectURL(file);
    a.src=musicUrl;
    a.hidden=false;
    var status=$('musicStatus');
    if(status)status.textContent=file.name+' · press Play when ready.';
  };
}
if(audio) {
  audio.onerror=function(){var status=$('musicStatus');if(status)status.textContent='This file could not be played. Choose another audio file.';};
}
window.addEventListener('pagehide',function(){var a=/** @type {HTMLAudioElement|null} */ ($('activityAudio'));if(a)a.pause();if(musicUrl)URL.revokeObjectURL(musicUrl);});
})();
