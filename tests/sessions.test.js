'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const vm = require('node:vm');
const ROOT = path.resolve(__dirname, '..');
async function freePort() { const s=net.createServer(); await new Promise(r=>s.listen(0,'127.0.0.1',r)); const p=s.address().port;await new Promise(r=>s.close(r));return p; }
async function start(port, dir) {
  const child=spawn(process.execPath,['server/server.js'],{cwd:ROOT,env:{...process.env,PORT:String(port),HOST:'127.0.0.1',SLIDEFORGE_SESSION_DIR:dir},stdio:['ignore','pipe','pipe']});
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Relay startup timed out')),5000);child.stdout.on('data',d=>{if(String(d).includes('SlideForge is running')){clearTimeout(timer);resolve();}});child.on('exit',c=>{clearTimeout(timer);reject(new Error('Relay exited '+c));});});return child;
}
async function connect(port) {
  const socket=new WebSocket('ws://127.0.0.1:'+port);const queue=[],waiters=[];
  socket.addEventListener('message',ev=>{const m=JSON.parse(ev.data),i=waiters.findIndex(w=>w.type===m.t);if(i>=0){const w=waiters.splice(i,1)[0];clearTimeout(w.timer);w.resolve(m);}else queue.push(m);});
  await new Promise((r,j)=>{socket.addEventListener('open',r,{once:true});socket.addEventListener('error',j,{once:true});});
  return {socket,send:m=>socket.send(JSON.stringify(m)),next(type){const i=queue.findIndex(m=>m.t===type);if(i>=0)return Promise.resolve(queue.splice(i,1)[0]);return new Promise((resolve,reject)=>{const w={type,resolve};w.timer=setTimeout(()=>reject(new Error('No '+type)),3000);waiters.push(w);});},async close(){if(socket.readyState===3)return;await new Promise(r=>{socket.addEventListener('close',r,{once:true});socket.close();});}};
}
async function stop(child, signal='SIGTERM') {if(child.exitCode!==null||child.signalCode)return;await new Promise(r=>{child.once('exit',r);child.kill(signal);});}
async function report(host) {host.send({t:'report'});return (await host.next('sessionReport')).report;}
test('durable LAN attendance, scoring, feedback, resume, private exports and crash recovery',async t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'slideforge-session-test-'));const port=await freePort();let relay=await start(port,dir);const sockets=[];
  t.after(async()=>{await stop(relay);for(const c of sockets)c.socket.close();fs.rmSync(dir,{recursive:true,force:true});});
  const host=await connect(port);sockets.push(host);host.send({t:'host',title:'Test lesson',mode:'individual'});const hosted=await host.next('hosted');assert.ok(hosted.session.token);
  const ada=await connect(port),bo=await connect(port);sockets.push(ada,bo);
  ada.send({t:'join',pin:hosted.pin,name:'Ada'});const joined=await ada.next('joined');
  bo.send({t:'join',pin:hosted.pin,name:'=UNTRUSTED()'});await bo.next('joined');
  host.send({t:'begin'});await ada.next('begun');
  host.send({t:'question',id:'q1',question:'Which one?',options:['A','B'],points:1000,timeLimit:0,bloom:'Apply'});await ada.next('question');
  ada.send({t:'answer',choice:0.5});ada.send({t:'answer',choice:0});await ada.next('locked');ada.send({t:'answer',choice:1});
  const late=await connect(port);sockets.push(late);late.send({t:'join',pin:hosted.pin,name:'Late'});await late.next('waiting');late.send({t:'answer',choice:0});
  host.send({t:'reveal',id:'q1',correct:0,answer:'A',explanation:'Because A'});await ada.next('result');host.send({t:'reveal',id:'q1',correct:0});
  let r=await report(host);assert.equal(r.checks[0].responses.length,1);assert.equal(r.checks[0].eligible.length,2);assert.equal(r.attendance[0].score,1000);assert.equal(r.attendance[1].questionsUnanswered,1);assert.equal(r.checks[0].bloom,'Apply');
  await ada.close();
  // Barrier: wait until the host sees the disconnect rather than relying on a sleep.
  let disconnected;do {disconnected=await host.next('players');}while(!disconnected.list.some(p=>p.name==='Ada'&&!p.connected));
  const resumed=await connect(port);sockets.push(resumed);resumed.send({t:'join',pin:hosted.pin,resumeToken:joined.resumeToken,name:'Ada'});const rejoined=await resumed.next('joined');assert.equal(rejoined.score,1000);
  host.send({t:'idle'});host.send({t:'round',gameId:'round2'});await late.next('joined');
  host.send({t:'prompt',id:'p1',kind:'poll',prompt:'Confidence?',options:['Low','High'],max:1});await resumed.next('prompt');resumed.send({t:'reply',choice:0});await resumed.next('replied');resumed.send({t:'reply',choice:1});await resumed.next('replied');
  host.send({t:'promptEnd'});host.send({t:'prompt',id:'p2',kind:'wordcloud',prompt:'One word',max:2});await resumed.next('prompt');resumed.send({t:'reply',text:'Curious'});await resumed.next('replied');
  host.send({t:'promptEnd'});host.send({t:'question',id:'q1',question:'Try again',options:['A','B'],timeLimit:0});await resumed.next('question');resumed.send({t:'answer',choice:1});await resumed.next('locked');
  r=await report(host);assert.equal(r.attendance.length,3);assert.equal(r.attendance[0].connections.length,2);assert.equal(r.attendance[0].questionsAnswered,2);assert.equal(r.attendance[0].questionsCorrect,1);assert.equal(r.checks[1].responses[0].right,null);assert.notEqual(r.checks[0].attempt,r.checks[1].attempt);assert.deepEqual(r.feedback[0].responses[0].values,[1]);assert.equal(r.feedback[1].responses[0].values[0],'Curious');assert.ok(r.attendance[2].admittedAt);
  host.send({t:'end'});const final=(await host.next('sessionClosed')).report;assert.equal(final.status,'ended');assert.equal(final.persisted,true);
  const url='http://127.0.0.1:'+port+'/api/sessions/'+hosted.session.id;let response=await fetch(url);assert.equal(response.status,404);
  response=await fetch(url,{headers:{Authorization:'Bearer wrong'}});assert.equal(response.status,404);
  response=await fetch('http://127.0.0.1:'+port+'/.slideforge/sessions/test.json');assert.equal(response.status,403);
  const auth={headers:{Authorization:'Bearer '+hosted.session.token}};response=await fetch(url,auth);assert.equal(response.status,200);assert.ok(!JSON.stringify(await response.json()).includes(hosted.session.token));
  await stop(relay,'SIGKILL');relay=await start(port,dir);r=await (await fetch(url,auth)).json();assert.equal(r.status,'ended');assert.equal(r.summary.joined,3);assert.equal(r.feedback.length,2);
  const crashHost=await connect(port);sockets.push(crashHost);crashHost.send({t:'host',title:'Interrupted lesson'});const crash=await crashHost.next('hosted');crashHost.send({t:'begin'});await report(crashHost);await stop(relay,'SIGKILL');relay=await start(port,dir);
  r=await (await fetch('http://127.0.0.1:'+port+'/api/sessions/'+crash.session.id,{headers:{Authorization:'Bearer '+crash.session.token}})).json();assert.equal(r.status,'interrupted');assert.ok(r.startedAt);assert.equal(r.endedAt,null);
});
test('CSV exports quote multiline cells and neutralize spreadsheet formulas',()=>{
 const ctx={window:null,localStorage:{getItem:()=>null},SF:{el:()=>{}},console};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(ROOT,'js/reports.js'),'utf8'),ctx);
 const csv=ctx.SF.Reports.csv([['=HYPERLINK("bad")','  +cmd','safe, name','two\nlines',4]]);assert.ok(csv.startsWith('\uFEFF'));assert.ok(csv.includes('"\'=HYPERLINK(""bad"")"'));assert.ok(csv.includes('"\'  +cmd"'));assert.ok(csv.includes('"safe, name"'));assert.ok(csv.includes('"two\nlines"'));
});
test('failed journal writes retain pending events and recover without duplicates',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'slideforge-journal-test-'));
 const old=process.env.SLIDEFORGE_SESSION_DIR;process.env.SLIDEFORGE_SESSION_DIR=dir;
 const file=require.resolve('../server/sessions');delete require.cache[file];const Sessions=require(file);
 try {
  const {session,token}=Sessions.create('Disk recovery','individual',[]);
  const journal=path.join(dir,session.meta.id+'.jsonl'),backup=journal+'.backup';fs.renameSync(journal,backup);fs.mkdirSync(journal);
  assert.equal(Sessions.append(session,'join',{id:1,name:'Test',team:null,admitted:true}),false);
  assert.equal(Sessions.project(session,true).attendance.length,1);
  fs.rmdirSync(journal);fs.renameSync(backup,journal);
  assert.equal(Sessions.append(session,'begin',{}),true);
  let loaded=Sessions.load(session.meta.id,token);assert.equal(loaded.events.length,3);assert.equal(Sessions.project(loaded).attendance.length,1);
  fs.appendFileSync(journal,'{"partial":');
  Sessions.append(session,'end',{reason:'Ended normally'});
  loaded=Sessions.load(session.meta.id,token);assert.equal(loaded.persisted,false);assert.equal(Sessions.project(loaded).status,'ended');assert.equal(Sessions.project(loaded).attendance.length,1);
 } finally {fs.rmSync(dir,{recursive:true,force:true});if(old===undefined)delete process.env.SLIDEFORGE_SESSION_DIR;else process.env.SLIDEFORGE_SESSION_DIR=old;delete require.cache[file];}
});
