'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {freePort,start,connect,stop}=require('./harness');
test('bookmark totals are anonymous, deduplicated and limited to the current slide',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sf-bookmarks-')),port=await freePort(),server=await start(port,dir),sockets=[];
 t.after(async()=>{await stop(server);sockets.forEach(s=>s.socket.close());fs.rmSync(dir,{recursive:true,force:true});});
 const host=await connect(port);sockets.push(host);host.send({t:'host',title:'Bookmark check',mode:'individual'});const room=await host.next('hosted');
 const p=await connect(port);sockets.push(p);p.send({t:'join',pin:room.pin,name:'Test'});await p.next('joined');
 host.send({t:'at',slideId:'one',activity:'content'});await host.until('bookmarks',m=>m.slideId==='one');
 p.send({t:'bookmark',slideId:'one',saved:true});let count=await host.until('bookmarks',m=>m.count===1);
 assert.deepEqual(Object.keys(count).sort(),['count','slideId','t']);
 p.send({t:'bookmark',slideId:'one',saved:true});host.send({t:'at',slideId:'one',activity:'content'});assert.equal((await host.next('bookmarks')).count,1);
 host.send({t:'at',slideId:'two',activity:'content'});assert.equal((await host.until('bookmarks',m=>m.slideId==='two')).count,0);
 p.send({t:'bookmark',slideId:'one',saved:false});p.send({t:'react',slideId:'two',kind:'yes'});await p.next('reacted');host.send({t:'at',slideId:'one',activity:'content'});assert.equal((await host.until('bookmarks',m=>m.slideId==='one')).count,1);
 p.send({t:'bookmark',slideId:'one',saved:false});assert.equal((await host.until('bookmarks',m=>m.count===0)).count,0);
 assert.equal(p.has('bookmarks'),false);
});
