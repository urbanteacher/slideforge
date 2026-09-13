'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
// Exercise the real window bridge in isolation: no browser or live classroom required.
function bridge(){
 const messages=[],listeners={},timers=[];
 const presenter={closed:false,focus(){this.focused=true;},postMessage(m,origin){messages.push({m,origin});},close(){this.closed=true;}};
 const Player={deck:{slides:[{id:'q',type:'quiz'}]},idx:0,answers:{},started:1,next(){this.advanced=true;},prev(){},goTo(){},toggleBlank(){},toggleFreeze(){this.freezeToggled=true;},close(){},emit(){},
  control(action){
   this.lastControl=action;
   if(action==='next')this.next();
   else if(action==='prev')this.prev();
   else if(action==='blank')this.toggleBlank();
   else if(action==='freeze')this.toggleFreeze();
   else if(action==='exit')this.close();
  }};
 const SF={Live:{teacherWorkspaceUrl:()=> 'manual.html#'+'a'.repeat(32),nextAction:()=> 'reveal'},questionTimeLimit:()=>0};
 vm.runInNewContext(fs.readFileSync(require.resolve('../js/model.js'),'utf8'),{window:{SF},console});
 const scope={Player,SF,window:{open:()=>presenter,addEventListener:(name,fn)=>listeners[name]=fn},location:{origin:'http://localhost:8787'},toast(){},setTimeout:fn=>timers.push(fn)};
 const source=fs.readFileSync(require.resolve('../js/player.js'),'utf8');
 vm.runInNewContext(source.slice(source.indexOf('  var presenterWin = null;'),source.indexOf('  /* ------------------------------------------------------------ keyboard */')),scope);
 return {Player,SF,presenter,messages,listeners,timers};
}
test('presenter receives the shared teacher workspace and a requested panel only once',()=>{
 const b=bridge();b.Player.openPresenter('tools');assert.equal(b.Player.hasPresenter(),true);b.timers.shift()();
 assert.equal(b.messages[0].m.teacherUrl,'manual.html#'+'a'.repeat(32));assert.equal(b.messages[0].m.requestedPanel,'tools');assert.equal(b.messages[0].origin,'http://localhost:8787');
 b.Player.syncPresenter();assert.equal(b.messages[1].m.requestedPanel,null);
 b.Player.openPresenter('mark');assert.equal(b.presenter.focused,true);assert.equal(b.messages[2].m.requestedPanel,'mark');
});
test('presenter commands require the current presenter window and matching origin',()=>{
 const b=bridge();b.Player.openPresenter();const cmd={type:'sf-presenter-cmd',cmd:'next'};
 b.listeners.message({source:{},origin:'http://localhost:8787',data:cmd});assert.equal(b.Player.advanced,undefined);
 b.listeners.message({source:b.presenter,origin:'https://elsewhere.test',data:cmd});assert.equal(b.Player.advanced,undefined);
 b.listeners.message({source:b.presenter,origin:'http://localhost:8787',data:cmd});assert.equal(b.Player.advanced,true);
 b.presenter.closed=true;b.Player.syncPresenter();assert.equal(b.messages.length,0);
});

test('memory state reaches presenter and only its trusted window can award a claim',()=>{
 const b=bridge(),commands=[];
 b.SF.Memory={command:(action,card)=>commands.push({action,card})};
 b.Player.memoryStates={board:{phase:'recall',owners:[null,0],turn:1}};
 b.Player.openPresenter();b.Player.syncPresenter();
 assert.equal(b.messages[0].m.memoryStates.board.turn,1);
 const data={type:'sf-presenter-cmd',cmd:'memory',action:'claim',card:0};
 b.listeners.message({source:{},origin:'http://localhost:8787',data});
 b.listeners.message({source:b.presenter,origin:'https://elsewhere.test',data});
 assert.equal(commands.length,0);
 b.listeners.message({source:b.presenter,origin:'http://localhost:8787',data});
 assert.deepEqual(commands,[{action:'claim',card:0}]);
});

test('freeze state reaches presenter and freeze command toggles screen freeze',()=>{
 const b=bridge();
 b.Player.frozen=true;
 b.Player.openPresenter();
 b.Player.syncPresenter();
 assert.equal(b.messages[0].m.frozen,true);
 const data={type:'sf-presenter-cmd',cmd:'freeze'};
 b.listeners.message({source:b.presenter,origin:'http://localhost:8787',data});
 assert.equal(b.Player.freezeToggled,true);
});

test('desk room tools share the HUD control path',()=>{
 const b=bridge();
 b.Player.openPresenter();
 ['rail','join','poll','focus','reactions','blankPhones','floor','reset','ink','full','help'].forEach(function(cmd){
  b.Player.lastControl=null;
  b.listeners.message({source:b.presenter,origin:'http://localhost:8787',data:{type:'sf-presenter-cmd',cmd}});
  assert.equal(b.Player.lastControl,cmd);
 });
 b.Player.syncPresenter();
 const state=b.messages[b.messages.length-1].m;
 assert.equal(state.blank,false);
 assert.equal(state.live,false);
 assert.equal(state.roomView,'hidden');
 assert.equal(state.floor,'auto');
 assert.equal(typeof state.reactions,'boolean');
});
