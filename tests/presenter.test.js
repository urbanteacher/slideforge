'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
// Exercise the real window bridge in isolation: no browser or live classroom required.
/* The presenter bridge lives in src/presenter/window.js and ships inside the
   generated js/model.js bundle. This used to run a *text slice* of
   js/player.js, cut between two literal comment markers; moving the code out
   of that file emptied the slice and every test here failed at once. It now
   calls the factory, which is both more honest and no longer sensitive to
   where the source happens to sit.

   One context, not two: the factory body runs inside the bundle, so the
   window, document, location and screen it touches have to be the ones the
   bundle was evaluated in. */
function bridge(){
 const messages=[],listeners={},docListeners={},timers=[];
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
 const ctx={
  SF,console,
  window:{SF,open:(url,name,features)=>{presenter.url=url;presenter.features=features;return presenter;},
          addEventListener:(name,fn)=>{listeners[name]=fn;}},
  location:{origin:'http://localhost:8787'},
  screen:{availLeft:0,availTop:0,availWidth:1920,availHeight:1080,width:1920,height:1080},
  document:{addEventListener:(name,fn)=>{docListeners[name]=fn;},getElementById:()=>null,
            querySelector:()=>null,querySelectorAll:()=>[]},
  setTimeout:fn=>{timers.push(fn);return timers.length;},clearTimeout(){},
  BroadcastChannel:undefined
 };
 ctx.globalThis=ctx;
 vm.createContext(ctx);
 vm.runInContext(fs.readFileSync(require.resolve('../js/model.js'),'utf8'),ctx);
 /* The three nodes js/player.js owns. This bridge has no DOM, so they stay
    null — the tests here are about the message bus, not the wall mirror. */
 const els={viewport:()=>null,hud:()=>null,cheats:()=>null};
 SF.createPresenterWindow(SF,{Player,els,showHud(){},toast(){},toggleSoloFeedback(){}});
 return {Player,SF,presenter,messages,listeners,docListeners,timers};
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
 assert.equal(state.pin,null);
 assert.equal(state.joinUrl,'');
 assert.equal(state.roomView,'hidden');
 assert.equal(state.floor,'auto');
 assert.equal(typeof state.reactions,'boolean');
});

// The room panel is 'rail'/'focus' inside the app — the deck model's own words
// for the same two arrangements — but a desk opened before that rename is still
// comparing against 'beside'/'full', so the wire keeps speaking the old ones.
test('the desk is sent the room view in the vocabulary it has always heard',()=>{
 const b=bridge();
 b.Player.openPresenter();
 const sent=view=>{b.Player.roomSidebarState=()=>view;b.Player.syncPresenter();return b.messages[b.messages.length-1].m.roomView;};
 assert.equal(sent('rail'),'beside');
 assert.equal(sent('focus'),'full');
 assert.equal(sent('hidden'),'hidden');
});

test('live room identity reaches the presenter desk',()=>{
 const b=bridge();
 b.SF.Live.active=true;
 b.SF.Live.pin='4821';
 b.SF.Live.joinUrl='https://class.example/play.html';
 b.SF.Live.players=[];
 b.Player.openPresenter();
 b.Player.syncPresenter();
 const state=b.messages[b.messages.length-1].m;
 assert.equal(state.live,true);
 assert.equal(state.pin,'4821');
 assert.equal(state.joinUrl,'https://class.example/play.html');
});

test('share prep and watch stay on the wall; dialogs live on the desk',()=>{
 const b=bridge();
 let watched=null;
 b.SF.Live.active=true;
 b.SF.Live.players=[];
 b.SF.Live.watchOn=function(id){watched=id;return true;};
 b.SF.Shell={lessonDoc(){return {title:'Desk share',slides:[]};}};
 b.Player.openPresenter();
 b.listeners.message({source:b.presenter,origin:'http://localhost:8787',data:{type:'sf-presenter-cmd',cmd:'sharePrep'}});
 const prep=b.messages[b.messages.length-1].m;
 assert.equal(prep.type,'sf-share-prep');
 assert.equal(prep.doc.title,'Desk share');
 assert.equal(prep.live,true);
 b.listeners.message({source:b.presenter,origin:'http://localhost:8787',data:{type:'sf-presenter-cmd',cmd:'shareWatch',id:'abc'}});
 const watch=b.messages[b.messages.length-1].m;
 assert.equal(watch.type,'sf-share-watch');
 assert.equal(watch.ok,true);
 assert.equal(watched,'abc');
});

test('share helper and desk Share button are wired for on-desk dialogs',()=>{
 /* The presenter command handler moved to src/presenter/window.js; these two
    assertions follow it there rather than to js/player.js, which no longer
    carries the bus. */
 const bus=fs.readFileSync(require.resolve('../src/presenter/window.js'),'utf8');
 const shell=fs.readFileSync(require.resolve('../js/shell.js'),'utf8');
 const share=fs.readFileSync(require.resolve('../js/share.js'),'utf8');
 const html=fs.readFileSync(require.resolve('../presenter.html'),'utf8');
 assert.match(share,/function shareLessonDoc/);
 assert.match(share,/SF\.shareLessonDoc\s*=\s*shareLessonDoc/);
 assert.match(shell,/SF\.shareLessonDoc/);
 assert.match(shell,/function lessonDoc/);
 assert.match(bus,/d\.cmd === 'sharePrep'/);
 assert.match(bus,/d\.cmd === 'shareWatch'/);
 assert.match(html,/id="btnShareDesk"/);
 assert.match(html,/shareFromDesk|openShareOnDesk/);
 assert.match(html,/js\/share\.js/);
 assert.match(html,/js\/ask\.js/);
 assert.doesNotMatch(html,/data-cmd="share"/);
});

test('teacher desk opens a large pop-out, not a tiny dialog',()=>{
 const b=bridge();
 const win=b.Player.openPresenter();
 assert.equal(win,b.presenter);
 assert.equal(b.presenter.url,'presenter.html');
 assert.match(String(b.presenter.features), /popup=yes/);
 assert.match(String(b.presenter.features),/width=\d{3,}/);
});
