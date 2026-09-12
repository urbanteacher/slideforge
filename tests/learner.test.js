'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {freePort,start,connect,stop,report}=require('./harness');
const createFlow=require('../js/learner-state');
test('Q&A, pace and saved panels return to the latest activity, and session end takes precedence',()=>{
 const f=createFlow();assert.equal(f.show('scWait'),'scWait');assert.equal(f.show('scAsk'),'scAsk');
 assert.equal(f.show('scPrompt'),'scAsk');assert.equal(f.back(),'scPrompt');
 f.show('scSaved');assert.equal(f.show('scQuestion'),'scSaved');assert.equal(f.show('scPace'),'scPace');assert.equal(f.back(),'scQuestion');
 f.show('scAsk');assert.equal(f.show('scResult'),'scAsk');assert.equal(f.back(),'scResult');
 f.show('scSaved');assert.equal(f.show('scOver'),'scOver');assert.equal(f.panel,null);
});
test('phones receive bounded slide context on join/resume, one acknowledgement per slide, and honest help counts',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sf-learner-')),port=await freePort();const relay=await start(port,dir),sockets=[];
 t.after(async()=>{await stop(relay);for(const s of sockets)s.socket.close();fs.rmSync(dir,{recursive:true,force:true});});
 const host=await connect(port);sockets.push(host);host.send({t:'host',title:'Context lesson'});const room=await host.next('hosted');
 host.send({t:'begin'});host.send({t:'at',slideId:'one',title:'An idea',n:1,total:4,activity:'content',text:'A useful explanation',explanation:'PRIVATE TEACHER NOTES'});await report(host);
 const p=await connect(port);sockets.push(p);p.send({t:'join',pin:room.pin,name:'Learner'});const joined=await p.next('joined'),ctx=await p.next('context');
 assert.equal(ctx.title,'An idea');assert.equal(ctx.activity,'content');assert.equal(ctx.text,'A useful explanation');assert.equal(ctx.total,4);assert.equal(ctx.explanation,undefined);assert.equal(ctx.sessionId,room.session.id);
 p.send({t:'react',kind:'yes',slideId:'one'});await p.next('reacted');await host.next('reaction');
 p.send({t:'react',kind:'idea',slideId:'one'});p.send({t:'signal',kind:'lost',slideId:'one'});await p.next('signalled');await host.until('signals',m=>m.live===1);assert.equal(host.has('reaction'),false);
 p.send({t:'signal',kind:'lost',slideId:'one'});await p.next('signalled');p.send({t:'signal',kind:'lost',slideId:'one'});await p.next('signalled');let r=await report(host);assert.equal(r.summary.signalsRaised,1);
 await p.close();await host.until('players',m=>m.list.some(x=>!x.connected));
 const resume=await connect(port);sockets.push(resume);resume.send({t:'join',pin:room.pin,name:'Learner',resumeToken:joined.resumeToken});await resume.next('joined');assert.equal((await resume.next('context')).reacted,true);
 host.send({t:'at',slideId:'two',title:'Your view',n:2,total:4,activity:'feedback',text:'x'.repeat(4000)});const next=await resume.next('context');assert.equal(next.text.length,2400);
 host.send({t:'prompt',id:'p',kind:'poll',prompt:'Choose',options:['One','Two'],max:1});await resume.next('prompt');
 resume.send({t:'react',kind:'yes',slideId:'two'});resume.send({t:'signal',kind:'fast',slideId:'two'});await resume.until('signalled',m=>m.kind==='fast');await host.until('signals',m=>m.counts.fast===1);assert.equal(host.has('reaction'),false);
 host.send({t:'promptEnd'});host.send({t:'at',slideId:'three',title:'Check',n:3,total:4,activity:'question'});await resume.next('context');
 host.send({t:'question',id:'q',question:'Which idea?',options:['Yes','No'],timeLimit:0});const q=await resume.next('question');assert.equal(q.question,'Which idea?');assert.deepEqual(q.options,['Yes','No']);assert.equal(q.correct,undefined);
 const late=await connect(port);sockets.push(late);late.send({t:'join',pin:room.pin,name:'Late arrival'});await late.next('waiting');
 host.send({t:'at',slideId:'four',title:'Reflect',n:4,total:4,activity:'content'});await late.next('joined');assert.equal((await late.next('context')).title,'Reflect');

});

test('question and idle fan out style + companion skin fields',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sf-skin-')),port=await freePort();const relay=await start(port,dir),sockets=[];
 t.after(async()=>{await stop(relay);for(const s of sockets)s.socket.close();fs.rmSync(dir,{recursive:true,force:true});});
 const host=await connect(port);sockets.push(host);host.send({t:'host',title:'Skin lesson'});const room=await host.next('hosted');
 host.send({t:'begin'});
 const p=await connect(port);sockets.push(p);p.send({t:'join',pin:room.pin,name:'Skin'});await p.next('joined');
 host.send({t:'at',slideId:'bingo',title:'Cell bingo',n:1,total:2,activity:'moment',style:'bingo',role:'watch',
   participation:'Watch the board. If your team has the term, explain it when asked.',headPrompt:'Bingo'});
 const ctx=await p.next('context');
 assert.equal(ctx.style,'bingo');
 assert.equal(ctx.role,'watch');
 assert.match(ctx.participation,/Watch the board/);
 host.send({t:'idle',style:'bingo',role:'watch',participation:ctx.participation,headPrompt:'Bingo'});
 const idle=await p.next('idle');
 assert.equal(idle.style,'bingo');
 assert.equal(idle.role,'watch');
 host.send({t:'at',slideId:'emoji',title:'Emoji',n:2,total:2,activity:'question',style:'emoji'});
 await p.next('context');
 host.send({t:'question',id:'e1',question:'What do these clues point to?',input:'text',
   style:'emoji',clueMode:'emoji',clues:'🌱☀️💧→🌿',headPrompt:'What do these clues point to?',
   confidence:false,timeLimit:0,points:1000});
 const eq=await p.next('question');
 assert.equal(eq.style,'emoji');
 assert.equal(eq.clueMode,'emoji');
 assert.equal(eq.clues,'🌱☀️💧→🌿');
 assert.equal(eq.headPrompt,'What do these clues point to?');
 assert.equal(eq.input,'text');
 /* Late join mid-question still receives the skin. */
 const late=await connect(port);sockets.push(late);
 late.send({t:'join',pin:room.pin,name:'Late skin'});await late.next('waiting');
 host.send({t:'at',slideId:'done',title:'Done',n:2,total:2,activity:'content'});
 await late.next('joined');
});

test('tied scores share a place, and finish/over announce win and rank',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sf-finish-')),port=await freePort();const relay=await start(port,dir),sockets=[];
 t.after(async()=>{await stop(relay);for(const s of sockets)s.socket.close();fs.rmSync(dir,{recursive:true,force:true});});
 const host=await connect(port);sockets.push(host);host.send({t:'host',title:'Finish lesson'});const room=await host.next('hosted');
 host.send({t:'begin'});
 const a=await connect(port);sockets.push(a);a.send({t:'join',pin:room.pin,name:'Ada'});await a.next('joined');
 const b=await connect(port);sockets.push(b);b.send({t:'join',pin:room.pin,name:'Bea'});await b.next('joined');
 const c=await connect(port);sockets.push(c);c.send({t:'join',pin:room.pin,name:'Cara'});await c.next('joined');
 host.send({t:'question',id:'q1',question:'Pick',options:['Yes','No'],timeLimit:0,points:1000});
 await a.next('question');await b.next('question');await c.next('question');
 a.send({t:'answer',choice:0});b.send({t:'answer',choice:0});c.send({t:'answer',choice:1});
 let tally=await host.until('tally',m=>(m.answers||[]).length===3);
 const marks=(tally.answers||[]).map(row=>[row.id,row.response===0]);
 host.send({t:'reveal',id:'q1',correct:0,rev:tally.rev,marks});
 const ra=await a.next('result'),rb=await b.next('result'),rc=await c.next('result');
 assert.equal(ra.rank,1);assert.equal(rb.rank,1);assert.equal(ra.tied,true);assert.equal(rb.tied,true);
 assert.equal(rc.rank,3,'third after a shared first — not 2');
 assert.equal(rc.tied,false);
 assert.match(ra.label,/Joint 1st/);
 host.send({t:'finish',title:'Final scores'});
 const fa=await a.next('finish');
 assert.equal(fa.won,true);assert.equal(fa.tied,true);assert.equal(fa.title,'Final scores');
 assert.match(fa.label,/Joint 1st/);
 host.send({t:'end'});
 const oa=await a.next('over');
 assert.equal(oa.won,true);assert.equal(oa.rank,1);assert.equal(oa.tied,true);
 assert.match(oa.label,/Joint 1st/);
});
