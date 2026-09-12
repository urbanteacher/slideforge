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
