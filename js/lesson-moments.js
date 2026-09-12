/* Temporary teaching activities. Deadlines stay authoritative in the host. */
(function(global){
'use strict';
function remaining(s,now){return !s?0:s.endAt?Math.max(0,Math.ceil((s.endAt-now)/1000)):s.seconds;}
function transition(s,a,now){
 if(a.action==='clear')return null;
 if(a.action==='start'){
  if(!['timer','task','break'].includes(a.kind))return s;
  var seconds=Number(a.seconds);if(!Number.isFinite(seconds)||seconds<0||seconds>(a.activitySlideId?7200:3600))return s;
  seconds=Math.round(seconds);if(a.kind!=='task'&&!seconds)return s;
  return {kind:a.kind,title:String(a.title||({timer:'Thinking time',task:'Quick task',break:'Take a break'})[a.kind]).trim().slice(0,400),seconds:seconds,endAt:seconds?now+seconds*1000:0,timed:seconds>0,paused:false,activitySlideId:a.activitySlideId||null};
 }
 if(!s)return s;
 var n=Object.assign({},s),left=remaining(s,now);
 if(a.action==='pause'&&s.endAt){n.seconds=left;n.endAt=0;n.paused=true;}
 else if(a.action==='resume'&&s.paused){n.endAt=now+left*1000;n.paused=false;}
 else if(a.action==='extend'&&s.timed){n.seconds=Math.min(s.activitySlideId?7200:3600,left+60);n.endAt=s.paused?0:now+n.seconds*1000;}
 return n;
}
function format(n){return Math.floor(n/60)+':'+String(n%60).padStart(2,'0');}
function paint(root,s){
 var box=root.querySelector('.lesson-live-overlay');
 if(!s){if(box)box.remove();return;}
 if(!box){box=document.createElement('div');box.className='lesson-live-overlay';root.appendChild(box);}
 box.classList.toggle('is-break',s.kind==='break');box.textContent='';
 var title=document.createElement('strong');title.textContent=s.title;box.appendChild(title);
 if(s.timed){var time=document.createElement('span'),left=remaining(s,Date.now());time.textContent=left?format(left)+(s.paused?' · Paused':''):'Time is up';box.appendChild(time);}
}
var api={remaining:remaining,transition:transition,format:format,paint:paint};
if(typeof module!=='undefined')module.exports=api;
if(!global.SF)return;
global.SF.LessonMoments=api;
var P=global.SF.Player;if(!P)return;
var moment=null,tick=null,lastSlideId=null;
function render(){var root=document.getElementById('player');if(root)paint(root,moment);}
P.lessonMoment=function(){return moment;};
P.momentCommand=function(a){
 // Do not hide a running knowledge check behind an unrelated activity.
 var live=global.SF.Live,slide=P.deck&&P.deck.slides[P.idx];
 if(a.action==='start'&&live&&live.active&&slide&&slide.type==='quiz'&&!live.revealed[slide.id])return;
 moment=transition(moment,a,Date.now());render();P.syncPresenter();
 if(tick)clearInterval(tick);tick=moment?setInterval(render,250):null;
};
// Only actual entries start an authored countdown. Player emits slide again
// for some redraws; neither those nor removing the timer should restart it.
function enter(slide){
 if(!slide)return;
 var changed=lastSlideId!==slide.id;
 lastSlideId=slide.id;
 if(changed&&moment&&moment.activitySlideId&&moment.activitySlideId!==slide.id)P.momentCommand({action:'clear'});
 var catalogue=global.SF.Activities;
 var activity=catalogue&&catalogue.activity(slide.activity);
 if(changed&&activity&&activity.target==='moment'&&slide.type!=='quiz'&&slide.type!=='game'&&Number(slide.timeLimit)>0){
  P.momentCommand({action:'start',kind:'timer',title:slide.title||activity.title,seconds:Number(slide.timeLimit),activitySlideId:slide.id});
 }
 var live=global.SF.Live;
 if(moment&&live&&live.active&&slide.type==='quiz'&&!live.revealed[slide.id])P.momentCommand({action:'clear'});
}
function reset(){moment=null;lastSlideId=null;if(tick)clearInterval(tick);tick=null;render();}
P.on('slide',function(e){enter(e.slide);});
P.on('close',reset);
// Player emits open after its first render. Reset any previous presentation
// state, then initialise the starting slide (including a direct jump to it).
P.on('open',function(){reset();enter(P.deck&&P.deck.slides[P.idx]);});
/* The {} is a sentinel for 'not a browser'; the guards above return on it. */
})(typeof window==='undefined'?/** @type {any} */({}):window);
