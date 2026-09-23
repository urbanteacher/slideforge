'use strict';
/* Boards judged out loud.
 *
 * Knowledge Flip and the memory boards are the only checks nobody answers on
 * a phone: a learner explains a keyword aloud and the teacher marks it. The
 * board's own state is deliberately disposable — it belongs to one run of one
 * presentation — but the verdicts are not, and without these the whole round
 * left no trace anywhere: not in the report, not in the class overview, not
 * in the CSV. A teacher who ran three sets of Knowledge Flip had nothing to
 * show for the lesson.
 *
 * The credit goes to a team name, or to the class, because that is the truth
 * of it. There is no playerId to attribute a spoken answer to, and putting an
 * invented one in a grid of people would be worse than leaving it out.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { freePort, start, connect, stop, report } = require('./harness');

test('spoken verdict credits one team, never everyone in the room', async t => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sf-spoken-team-'));
  const port=await freePort(), relay=await start(port,dir), sockets=[];
  t.after(async()=>{await stop(relay);sockets.forEach(s=>s.socket.close());fs.rmSync(dir,{recursive:true,force:true});});
  const host=await connect(port);sockets.push(host);
  host.send({t:'host',title:'Connections',mode:'teams',teams:['Red','Blue']});await host.next('hosted');
  host.send({t:'manualAdd',names:['Ada','Ari'],team:0});
  host.send({t:'manualAdd',names:['Ben'],team:1});
  const roster=await host.until('players',m=>m.list.length===3);
  const ada=roster.list.find(p=>p.name==='Ada').id;
  host.send({t:'begin'});host.send({t:'round',gameId:'connections'});
  host.send({t:'question',id:'spoken-1',gameId:'connections',style:'connection',spoken:true,
    question:'Connect these',options:['Accept','Reject'],input:'choice',scoreSpoken:false});
  const tally=await host.until('tally',m=>m.id==='spoken-1');
  host.send({t:'reveal',id:'spoken-1',rev:tally.rev,marks:[],correct:0,
    spoken:{recipient:{type:'player',id:ada}}});
  const count=await host.next('oralCount');
  assert.equal(count.count,1);
  const scored=await host.until('players',m=>m.rows&&m.rows.some(r=>r.name==='Red'&&r.score===1000));
  assert.equal(scored.rows.find(r=>r.name==='Blue').score,0);
  assert.ok(scored.list.every(p=>p.score===0),'team credit is not divided among its members');
  const r=await report(host);
  assert.deepEqual(r.checks[0].spoken,{accepted:true,count:1,recipient:'Ada',points:1000});
});

test('spoken phones get a job card; individual play counts unless the teacher opts into speaker points', async t => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sf-spoken-individual-'));
  const port=await freePort(), relay=await start(port,dir), sockets=[];
  t.after(async()=>{await stop(relay);sockets.forEach(s=>s.socket.close());fs.rmSync(dir,{recursive:true,force:true});});
  const host=await connect(port);sockets.push(host);
  host.send({t:'host',title:'Explain',mode:'individual'});const room=await host.next('hosted');
  const ada=await connect(port),ben=await connect(port);sockets.push(ada,ben);
  ada.send({t:'join',pin:room.pin,name:'Ada'});ben.send({t:'join',pin:room.pin,name:'Ben'});
  await ada.next('joined');await ben.next('joined');
  const roster=await host.until('players',m=>m.list.length===2);
  const adaId=roster.list.find(p=>p.name==='Ada').id;
  host.send({t:'begin'});host.send({t:'round',gameId:'spoken-game'});
  async function verdict(id,style,correct,scoreSpoken){
    host.send({t:'question',id,gameId:'spoken-game',style,spoken:true,question:'Explain aloud',
      options:style==='spinexplain'?['Clear','With hint','Reject']:['Accept','Reject'],
      input:'choice',scoreSpoken,participation:'Listen and watch.'});
    const job=await ada.next('spoken');await ben.next('spoken');
    assert.equal(job.participation,'Listen and watch.');
    assert.equal(job.options,undefined,'no verdict pads reach learners');
    const tally=await host.until('tally',m=>m.id===id);
    ada.send({t:'answer',choice:0});
    host.send({t:'reveal',id,rev:tally.rev,marks:[],correct,
      spoken:{recipient:{type:'player',id:adaId}}});
    const result=await ada.next('result');await ben.next('result');
    assert.equal(result.spoken,true);assert.equal(ada.has('locked'),false);
    return result;
  }
  const counted=await verdict('spoken-1','connection',0,false);
  assert.equal(counted.oralCount,1);assert.equal(counted.score,0);
  const scored=await verdict('spoken-2','spinexplain',0,true);
  assert.equal(scored.oralCount,2);assert.equal(scored.score,1000);
  const heads=await verdict('spoken-3','headsup',0,true);
  assert.equal(heads.oralCount,3);assert.equal(heads.score,1000,'Heads Up remains a round count');
});

function sandbox() {
  const dir = path.resolve(__dirname, '..');
  const context = { window: {}, console, setInterval, clearInterval, Date };
  const stub = () => ({ appendChild() {}, classList: { toggle() {} }, focus() {},
    setAttribute() {}, replaceChildren() {}, querySelector: () => null, dataset: {} });
  context.window.SF = { el: stub };
  context.window.__stub = stub;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(dir, 'js/model.js'), 'utf8'), context);
  /* js/memory.js moved into the boards engine; js/model.js installs it. */
  return { SF: context.window.SF, stub: context.window.__stub };
}

/* A slide node whose .pad is a throwaway element: render() writes into it and
   nothing here looks at what it drew. */
function nodeFor(stub) {
  const pad = stub();
  return { querySelector: () => pad, contains: () => false };
}

test('a claim and a pass both report a verdict; choosing and revealing do not', () => {
  const { SF, stub } = sandbox();
  const board = { kind: 'knowledgeflip', set: 1, sets: 1, studySeconds: 0,
    participants: ['Red', 'Blue'],
    pairs: [{ term: 'Osmosis', definition: 'Water moves down a gradient.' },
      { term: 'Diffusion', definition: 'Particles spread out.' }] };
  const slide = { id: 's7', title: 'Cell transport', memoryBoard: board };
  const player = { memoryStates: {} };
  const sent = [];
  SF.Memory.onVerdict = v => sent.push(v);
  SF.Memory.mount(player, slide, nodeFor(stub));

  SF.Memory.command('start');
  SF.Memory.command('select', 0);
  SF.Memory.command('reveal');
  assert.equal(sent.length, 0, 'choosing a card is not a verdict');

  SF.Memory.command('claim');
  SF.Memory.command('select', 1);
  SF.Memory.command('pass');
  SF.Memory.unmount();

  assert.deepEqual(sent.map(v => [v.term, v.participant, v.right]), [
    ['Osmosis', 'Red', true],
    ['Diffusion', 'Blue', false]
  ]);
  assert.equal(sent[0].slideId, 's7');
  assert.equal(sent[0].kind, 'knowledgeflip');
  assert.equal(sent[0].card, 0);
});

test('a solo board credits the class, not a participant', () => {
  const { SF, stub } = sandbox();
  const board = { kind: 'memoryflip', set: 2, sets: 2, studySeconds: 0,
    participants: ['The class'], pairs: [{ term: 'Turgor', definition: 'Firm with water.' }] };
  const slide = { id: 's9', title: 'Recall', memoryBoard: board };
  const sent = [];
  SF.Memory.onVerdict = v => sent.push(v);
  SF.Memory.mount({ memoryStates: {} }, slide, nodeFor(stub));
  SF.Memory.command('start');
  SF.Memory.command('select', 0);
  SF.Memory.command('reveal');
  SF.Memory.command('claim');
  SF.Memory.unmount();
  assert.equal(sent.length, 1);
  assert.equal(sent[0].participant, null, 'one participant is the room, and needs no name');
  assert.equal(sent[0].set, 2);
});

test('the relay journals oral verdicts and the report tallies them by team', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'slideforge-oral-'));
  const port = await freePort();
  const relay = await start(port, dir);
  const sockets = [];
  t.after(async () => {
    await stop(relay);
    for (const s of sockets) s.socket.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const host = await connect(port);
  sockets.push(host);
  host.send({ t: 'host', title: 'Cell transport', mode: 'teams', teams: ['Red', 'Blue'] });
  await host.next('hosted');

  const verdict = (card, term, participant, right) =>
    host.send({ t: 'oral', slideId: 'board-1', title: 'Cell transport — explain it',
      kind: 'knowledgeflip', set: 1, card, term, participant, right });

  verdict(0, 'Osmosis', 'Red', true);
  verdict(1, 'Diffusion', 'Blue', false);
  verdict(1, 'Diffusion', 'Red', true);
  verdict(2, 'Active transport', 'Blue', true);
  /* A second board on a different slide is a second round, not more of the
     first — a lesson can run two sets and wants to see them apart. */
  host.send({ t: 'oral', slideId: 'board-2', title: 'Enzymes', kind: 'memorymatch',
    set: 1, card: 0, term: 'Substrate', participant: 'Red', right: true });
  /* Nothing to record: no keyword means no claim was made. */
  host.send({ t: 'oral', slideId: 'board-1', term: '', participant: 'Red', right: true });

  const r = await report(host);
  assert.equal(r.oral.length, 2, 'two boards, two rounds');
  const [flip, match] = r.oral;
  assert.equal(flip.kind, 'knowledgeflip');
  assert.equal(flip.title, 'Cell transport — explain it');
  assert.equal(flip.attempts, 4, 'a pass is an attempt');
  assert.equal(flip.collected, 3, 'three distinct cards were claimed');
  /* No points on a Knowledge Flip board, so none are counted. */
  assert.equal(flip.points, 0);
  assert.deepEqual(flip.tally, [
    { name: 'Red', score: 2, attempts: 2, points: 0 },
    { name: 'Blue', score: 1, attempts: 2, points: 0 }
  ]);
  assert.deepEqual(flip.verdicts.map(v => v.term),
    ['Osmosis', 'Diffusion', 'Diffusion', 'Active transport']);
  assert.equal(match.kind, 'memorymatch');
  assert.equal(r.summary.oralRounds, 2);
  assert.equal(r.summary.oralVerdicts, 5);
  /* Spoken rounds stay out of the per-person numbers, which is the whole
     point: nobody's row gains a correct answer they cannot be shown to have
     given. */
  assert.equal(r.summary.checks, 0);
  assert.equal(r.checks.length, 0);
});

test('a claimed square is counted per team, not per square number', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'slideforge-bingo-'));
  const port = await freePort();
  const relay = await start(port, dir);
  const sockets = [];
  t.after(async () => {
    await stop(relay);
    for (const s of sockets) s.socket.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const host = await connect(port);
  sockets.push(host);
  host.send({ t: 'host', title: 'Cell parts', mode: 'teams', teams: ['Red', 'Blue'] });
  await host.next('hosted');

  /* Every team holds its own card, so square 1 means a different term to each
     of them. Counting square numbers folded two claims into one. */
  const claim = (card, term, participant) =>
    host.send({ t: 'oral', slideId: 'board', title: 'Bingo', kind: 'bingo',
      set: 1, card, term, participant, right: true });
  claim(0, 'Nucleus', 'Red');
  claim(0, 'Mitochondrion', 'Blue');
  claim(1, 'Ribosome', 'Blue');

  const r = await report(host);
  const round = r.oral[0];
  assert.equal(round.collected, 3);
  assert.deepEqual(round.tally, [
    { name: 'Red', score: 1, attempts: 1, points: 0 },
    { name: 'Blue', score: 2, attempts: 2, points: 0 }
  ]);
});

test('a quiz bowl round is tallied in points, not in cells', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'slideforge-bowl-'));
  const port = await freePort();
  const relay = await start(port, dir);
  const sockets = [];
  t.after(async () => {
    await stop(relay);
    for (const s of sockets) s.socket.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const host = await connect(port);
  sockets.push(host);
  host.send({ t: 'host', title: 'Revision bowl', mode: 'teams', teams: ['Red', 'Blue'] });
  await host.next('hosted');

  /* A bowl cell is worth what it says. Counting awards instead of adding them
     up would make a hundred and a five hundred the same result. */
  const award = (card, term, participant, value) =>
    host.send({ t: 'oral', slideId: 'bowl', title: 'Revision bowl', kind: 'bowl',
      set: 1, card, term, participant, right: true, value });
  award(0, 'Cells 100 — jelly?', 'Red', 100);
  award(1, 'Enzymes 500 — denature?', 'Blue', 500);
  /* Nobody answered this one: spent, credited to no one, worth nothing. */
  host.send({ t: 'oral', slideId: 'bowl', title: 'Revision bowl', kind: 'bowl',
    set: 1, card: 2, term: 'Transport 300 — gradient?', participant: null,
    right: false, value: 0 });

  const r = await report(host);
  const round = r.oral[0];
  assert.equal(round.kind, 'bowl');
  assert.equal(round.points, 600);
  assert.equal(round.attempts, 3);
  assert.equal(round.collected, 2, 'two cells were actually awarded');
  /* The unanswered cell is an attempt on the round, not a competitor: a
     nameless verdict on a board that has teams belongs to nobody. */
  assert.deepEqual(round.tally, [
    { name: 'Red', score: 1, attempts: 1, points: 100 },
    { name: 'Blue', score: 1, attempts: 1, points: 500 }
  ]);
  /* And a value a host never sent stays zero rather than becoming NaN. */
  assert.equal(round.verdicts[2].value, 0);
});

test('a phone hears who a spoken credit went to: its own, its team, never another name', async t => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sf-spoken-credit-'));
  const port=await freePort(), relay=await start(port,dir), sockets=[];
  t.after(async()=>{await stop(relay);sockets.forEach(s=>s.socket.close());fs.rmSync(dir,{recursive:true,force:true});});
  const host=await connect(port);sockets.push(host);
  host.send({t:'host',title:'Explain',mode:'teams',teams:['Red','Blue']});const room=await host.next('hosted');
  const ada=await connect(port),ari=await connect(port),ben=await connect(port);sockets.push(ada,ari,ben);
  ada.send({t:'join',pin:room.pin,name:'Ada',team:0});ari.send({t:'join',pin:room.pin,name:'Ari',team:0});
  ben.send({t:'join',pin:room.pin,name:'Ben',team:1});
  await ada.next('joined');await ari.next('joined');await ben.next('joined');
  const roster=await host.until('players',m=>m.list.length===3);
  const adaId=roster.list.find(p=>p.name==='Ada').id;
  host.send({t:'begin'});host.send({t:'round',gameId:'spoken-game'});
  host.send({t:'question',id:'spoken-1',gameId:'spoken-game',style:'connection',spoken:true,
    question:'Connect these',options:['Accept','Reject'],input:'choice'});
  const tally=await host.until('tally',m=>m.id==='spoken-1');
  host.send({t:'reveal',id:'spoken-1',rev:tally.rev,marks:[],correct:0,spoken:{recipient:{type:'player',id:adaId}}});
  const [a,b,c]=[await ada.until('result',()=>true),await ari.until('result',()=>true),await ben.until('result',()=>true)];
  assert.equal(a.oralYou,true,'the speaker hears it was theirs');
  assert.equal(b.oralYou,false);
  assert.equal(b.oralTeam,'Red','a teammate hears the team');
  assert.equal(c.oralTeam,'Red','the other team hears whose point it was');
  assert.equal(a.oralPoints,1000,'on the quiz scale');
  assert.ok(!JSON.stringify(c).includes('Ada'),'no other student is named to a phone');
});

test('a proposal reaches the host with its author, and no phone learns who wrote it', async t => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sf-proposals-'));
  const port=await freePort(), relay=await start(port,dir), sockets=[];
  t.after(async()=>{await stop(relay);sockets.forEach(s=>s.socket.close());fs.rmSync(dir,{recursive:true,force:true});});
  const host=await connect(port);sockets.push(host);
  host.send({t:'host',title:'Chain',mode:'individual'});const room=await host.next('hosted');
  const ada=await connect(port),ben=await connect(port);sockets.push(ada,ben);
  ada.send({t:'join',pin:room.pin,name:'Ada'});ben.send({t:'join',pin:room.pin,name:'Ben'});
  await ada.next('joined');await ben.next('joined');
  const roster=await host.until('players',m=>m.list.length===2);
  const adaId=roster.list.find(p=>p.name==='Ada').id;
  host.send({t:'begin'});
  host.send({t:'prompt',id:'quick:1',kind:'brainstorm',prompt:'Propose a link from “energy”',max:2});
  await ada.next('prompt');await ben.next('prompt');
  ada.send({t:'reply',text:'Energy connects to food chains because producers store it'});
  const digest=await host.until('responses',m=>m.items&&m.items.length===1);
  assert.equal(digest.items[0].pid,adaId,'the desk can credit the author');
  assert.equal(digest.items[0].name,'Ada');
  assert.equal(ben.has('responses'),false,'the digest is the host’s alone');
});

test('Heads Up: the clue-givers’ phones get the term, the guesser’s never does', async t => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sf-heads-term-'));
  const port=await freePort(), relay=await start(port,dir), sockets=[];
  t.after(async()=>{await stop(relay);sockets.forEach(s=>s.socket.close());fs.rmSync(dir,{recursive:true,force:true});});
  const host=await connect(port);sockets.push(host);
  host.send({t:'host',title:'Heads',mode:'individual'});const room=await host.next('hosted');
  const ada=await connect(port),ben=await connect(port);sockets.push(ada,ben);
  ada.send({t:'join',pin:room.pin,name:'Ada'});ben.send({t:'join',pin:room.pin,name:'Ben'});
  await ada.next('joined');await ben.next('joined');
  const roster=await host.until('players',m=>m.list.length===2);
  const adaId=roster.list.find(p=>p.name==='Ada').id;
  host.send({t:'begin'});host.send({t:'round',gameId:'heads'});
  host.send({t:'question',id:'h1',gameId:'heads',style:'headsup',spoken:true,question:'Photosynthesis',
    options:['Correct','Pass'],input:'choice',term:'Photosynthesis'});
  const a0=await ada.next('spoken'), b0=await ben.next('spoken');
  assert.equal(a0.headsWaiting,true);assert.equal(a0.term,undefined,'nobody sees it before a guesser is chosen');
  assert.equal(b0.term,undefined);
  host.send({t:'guesser',id:adaId});
  const a1=await ada.next('spoken'), b1=await ben.next('spoken');
  assert.equal(a1.youGuess,true);
  assert.equal(a1.term,undefined,'the guesser never gets the term');
  assert.equal(b1.term,'Photosynthesis');
});

test('a chain proposal box reaches the phones shaped as a link from its term', async t => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sf-link-shape-'));
  const port=await freePort(), relay=await start(port,dir), sockets=[];
  t.after(async()=>{await stop(relay);sockets.forEach(s=>s.socket.close());fs.rmSync(dir,{recursive:true,force:true});});
  const host=await connect(port);sockets.push(host);
  host.send({t:'host',title:'Chain',mode:'individual'});const room=await host.next('hosted');
  const ada=await connect(port);sockets.push(ada);
  ada.send({t:'join',pin:room.pin,name:'Ada'});await ada.next('joined');
  host.send({t:'begin'});
  host.send({t:'prompt',id:'quick:2',kind:'brainstorm',prompt:'Propose a link',max:2,shape:'link',from:'energy'});
  const p=await ada.next('prompt');
  assert.equal(p.shape,'link');assert.equal(p.from,'energy');
  host.send({t:'prompt',id:'quick:3',kind:'brainstorm',prompt:'x',max:1,shape:'anything-else'});
  const q=await ada.next('prompt');
  assert.equal(q.shape,undefined,'only the shapes a phone can draw');
});
