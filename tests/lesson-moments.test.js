'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),M=require('../js/lesson-moments');
test('activity countdown pauses, resumes, extends and survives delayed ticks',()=>{
 let s=M.transition(null,{action:'start',kind:'break',seconds:300},1000);
 assert.equal(M.remaining(s,61000),240);
 s=M.transition(s,{action:'pause'},61000);assert.equal(M.remaining(s,99000),240);
 s=M.transition(s,{action:'extend'},99000);assert.equal(M.remaining(s,99000),300);
 s=M.transition(s,{action:'resume'},100000);assert.equal(M.remaining(s,401000),0);
 assert.equal(M.transition(s,{action:'clear'},401000),null);
});
test('quick tasks can be untimed; invalid countdowns cannot replace an activity',()=>{
 const task=M.transition(null,{action:'start',kind:'task',seconds:0,title:'Discuss'},1);
 assert.equal(task.timed,false);assert.equal(task.title,'Discuss');
 for(const seconds of [-2,NaN,Infinity,3601,0])assert.equal(M.transition(task,{action:'start',kind:'timer',seconds},1),task);
 assert.equal(M.transition(task,{action:'start',kind:'unknown',seconds:10},1),task);
});
test('host refuses activities during an open quiz and clears them before a new quiz',()=>{
 const vm=require('node:vm'),fs=require('node:fs'),events={};
 const P={deck:{slides:[{id:'q1',type:'quiz'}]},idx:0,on:(n,fn)=>events[n]=fn,syncPresenter(){}};
 const live={active:true,revealed:{}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../js/lesson-moments'),'utf8'),{window:{SF:{Player:P,Live:live}},document:{getElementById:()=>null},setInterval:()=>1,clearInterval(){}});
 P.momentCommand({action:'start',kind:'break',seconds:300});assert.equal(P.lessonMoment(),null);
 live.revealed.q1=true;P.momentCommand({action:'start',kind:'break',seconds:300});assert.equal(P.lessonMoment().kind,'break');
 events.slide({slide:{id:'q2',type:'quiz'}});assert.equal(P.lessonMoment(),null);
});

function authoredMomentHost() {
 const vm=require('node:vm'),fs=require('node:fs'),events={},ticks=new Set();let time=1000,serial=0;
 const P={deck:{slides:[]},idx:0,on:(n,fn)=>events[n]=fn,syncPresenter(){}};
 const activities={activity:key=>key==='think-pair-share'?{target:'moment',title:'Think-Pair-Share'}:{target:'slide'}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../js/lesson-moments'),'utf8'),{
  window:{SF:{Player:P,Activities:activities,Live:{active:false,revealed:{}}}},
  document:{getElementById:()=>null},Date:{now:()=>time},
  setInterval:()=>{ticks.add(++serial);return serial;},clearInterval:id=>ticks.delete(id)
 });
 const slide={id:'moment-1',activity:'think-pair-share',type:'keywords',timeLimit:420,title:'Think-Pair-Share'};
 return {P,events,ticks,slide,advance:ms=>time+=ms,enter(s){P.deck.slides=[s];P.idx=0;events.slide({slide:s});}};
}
test('authored moment starts in seconds, survives redraw, pauses and extends, and clears on departure',()=>{
 const h=authoredMomentHost();h.enter(h.slide);
 assert.equal(h.P.lessonMoment().seconds,420);assert.equal(h.P.lessonMoment().activitySlideId,h.slide.id);
 assert.equal(h.ticks.size,1);
 h.advance(60000);h.enter(h.slide);
 assert.equal(M.remaining(h.P.lessonMoment(),61000),360);
 h.P.momentCommand({action:'pause'});h.advance(9000);h.enter(h.slide);
 assert.equal(h.P.lessonMoment().paused,true);assert.equal(h.P.lessonMoment().seconds,360);
 h.P.momentCommand({action:'extend'});assert.equal(h.P.lessonMoment().seconds,420);
 h.P.momentCommand({action:'resume'});h.enter({id:'ordinary',type:'content'});
 assert.equal(h.P.lessonMoment(),null);assert.equal(h.ticks.size,0);
 h.enter(h.slide);assert.equal(h.P.lessonMoment().seconds,420);
 h.events.close();assert.equal(h.P.lessonMoment(),null);assert.equal(h.ticks.size,0);
});
test('manual dismissal and expiry never restart on redraw; reopening the presentation starts fresh',()=>{
 const h=authoredMomentHost();h.enter(h.slide);h.P.momentCommand({action:'clear'});h.enter(h.slide);
 assert.equal(h.P.lessonMoment(),null);
 h.events.open();assert.equal(h.P.lessonMoment().seconds,420);assert.equal(h.ticks.size,1);
 h.advance(500000);h.enter(h.slide);assert.equal(M.remaining(h.P.lessonMoment(),501000),0);
 assert.equal(h.P.lessonMoment().endAt,421000);
 h.events.open();assert.equal(h.P.lessonMoment().endAt,921000);assert.equal(h.ticks.size,1);
});
test('zero disables automatic timing; ordinary slides stay untimed and manual timers can span them',()=>{
 const h=authoredMomentHost();h.enter({...h.slide,timeLimit:0});assert.equal(h.P.lessonMoment(),null);
 h.enter({id:'ordinary',type:'keywords',timeLimit:300,activity:'connection-slide'});assert.equal(h.P.lessonMoment(),null);
 h.P.momentCommand({action:'start',kind:'timer',seconds:60,title:'Manual'});
 h.enter({id:'other',type:'content'});assert.equal(h.P.lessonMoment().title,'Manual');
 h.events.close();assert.equal(h.ticks.size,0);
});
test('authored durations support the full 120-minute inspector range without changing manual limits',()=>{
 const h=authoredMomentHost();h.enter({...h.slide,timeLimit:7200});assert.equal(h.P.lessonMoment().seconds,7200);
 h.P.momentCommand({action:'extend'});assert.equal(h.P.lessonMoment().seconds,7200);
});
