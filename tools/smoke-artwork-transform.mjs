import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {chromium} from 'playwright';
import harness from '../tests/harness.js';
/* Direct manipulation of artwork: click the shape, drag it, pull a corner,
 * spin it, nudge it with the keys.
 *
 * The version before this could only select from a list and only resize by
 * typing a percentage into a number field, which is the whole reason the
 * canvas felt clunky. Every assertion here reads SF.Editor.deck() rather than
 * the DOM: a gesture that moves the preview and saves nothing is the failure
 * this codebase keeps producing.
 */
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sf-art-tf-')),port=await harness.freePort();
const relay=await harness.start(port,dir),browser=await chromium.launch();
try {
 const page=await browser.newPage({viewport:{width:1500,height:950}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${port}`);await page.waitForFunction(()=>window.SF?.Editor?.deck());

 const art=()=>page.evaluate(()=>SF.Editor.deck().slides[0].artwork.map(a=>
   ({id:a.id,x:a.x,y:a.y,w:a.width,h:a.height,r:a.rotation})));
 async function open(extra){
  await page.evaluate(extra=>{
   const d=SF.makeDeck('Transform');d.theme='studio';const s=SF.makeSlide('cards');
   s.title='Direct manipulation';s.bullets=['One\tA','Two\tB'];
   s.artwork=[Object.assign({id:'c1',kind:'circle',name:'Accent circle',plane:'back',
     color:'#a7d7b5',x:40,y:30,width:24,height:30,rotation:0},extra||{})];
   d.slides=[s];SF.Store.save(d);SF.Editor.openDeck(d.id);
  },extra);
  await page.locator('#previewBox .canvas-layers-launch').click();
  await page.locator('.canvas-layers-panel').waitFor();
 }
 const shape=page.locator('#previewBox [data-artwork-id="c1"]');
 const frame=page.locator('#previewBox .artwork-frame');
 /* Handles only exist on a selection, so every gesture case selects first. */
 async function select(extra){await open(extra);await shape.click();await frame.waitFor();}
 async function dragFrom(locator,dx,dy,mods){
  const b=await locator.boundingBox();
  await page.mouse.move(b.x+b.width/2,b.y+b.height/2);
  await page.mouse.down();
  await page.mouse.move(b.x+b.width/2+8,b.y+b.height/2+(dy?4:0),{steps:3});
  if(mods?.shift)await page.keyboard.down('Shift');
  await page.mouse.move(b.x+b.width/2+dx,b.y+b.height/2+dy,{steps:10});
  await page.mouse.up();
  if(mods?.shift)await page.keyboard.up('Shift');
  await page.waitForTimeout(250);
 }

 /* 1. The shape is clickable, and clicking it is what selects it. */
 await open();
 assert.equal(await frame.count(),0,'nothing is selected before a click');
 assert.equal(await shape.evaluate(n=>getComputedStyle(n).pointerEvents),'auto',
  'artwork is not clickable while the panel is open');
 await shape.click();
 await frame.waitFor();
 assert.equal(await page.locator('#previewBox .artwork-handle:not(.artwork-rotate)').count(),8,
  'a selected object should carry eight resize handles');
 assert.equal(await page.locator('#previewBox .artwork-rotate').count(),1,'no rotate handle');

 /* 2. Drag the shape itself — not a button beside it. */
 let before=(await art())[0];
 await dragFrom(shape,140,90);
 let after=(await art())[0];
 assert.ok(after.x>before.x+3&&after.y>before.y+3,
  `dragging the shape saved nothing: ${JSON.stringify(before)} -> ${JSON.stringify(after)}`);
 assert.deepEqual([after.w,after.h],[before.w,before.h],'a move must not resize');

 /* 3. Pull a corner. The opposite edge stays put, so the centre moves by half
       of the size change — checked, because getting that wrong is the classic
       way a resize handle feels like it is fighting you. */
 await select();
 before=(await art())[0];
 const left0=await shape.evaluate(n=>n.getBoundingClientRect().left);
 await dragFrom(page.locator('#previewBox .artwork-handle-se'),120,80);
 after=(await art())[0];
 assert.ok(after.w>before.w+2&&after.h>before.h+2,
  `south-east handle did not grow it: ${JSON.stringify(before)} -> ${JSON.stringify(after)}`);
 const left1=await shape.evaluate(n=>n.getBoundingClientRect().left);
 assert.ok(Math.abs(left1-left0)<=2,
  `dragging the SE corner moved the west edge by ${Math.round(left1-left0)}px; it should be anchored`);

 /* 4. And the mirror: the north-west handle anchors the south-east corner. */
 await select();
 const right0=await shape.evaluate(n=>n.getBoundingClientRect().right);
 await dragFrom(page.locator('#previewBox .artwork-handle-nw'),-90,-60);
 const right1=await shape.evaluate(n=>n.getBoundingClientRect().right);
 assert.ok(Math.abs(right1-right0)<=2,
  `dragging the NW corner moved the east edge by ${Math.round(right1-right0)}px`);
 assert.ok((await art())[0].w>24,'north-west handle did not grow it');

 /* 5. Rotate, and snap to 15 degrees with Shift held. */
 await select();
 await dragFrom(page.locator('#previewBox .artwork-rotate'),160,120,{shift:true});
 const spun=(await art())[0];
 assert.notEqual(spun.r,0,'the rotate handle saved nothing');
 assert.equal(spun.r%15,0,`Shift should snap to 15 degrees, got ${spun.r}`);

 /* 6. Keys do what the mouse does. Alt resizes instead of moving. */
 await select();
 await frame.focus();
 before=(await art())[0];
 await page.keyboard.press('ArrowRight');await page.waitForTimeout(200);
 assert.equal((await art())[0].x,before.x+1,'ArrowRight should nudge one percent');
 await frame.focus();await page.keyboard.press('Shift+ArrowRight');await page.waitForTimeout(200);
 assert.equal((await art())[0].x,before.x+6,'Shift+Arrow should step five');
 await frame.focus();await page.keyboard.press('Alt+ArrowDown');await page.waitForTimeout(200);
 assert.equal((await art())[0].h,before.h+1,'Alt+Arrow should resize rather than move');

 /* 7. A locked layer is not draggable and grows no handles. */
 await open({locked:true});
 await page.locator('.layer-row[data-layer-id=c1]').click();
 await page.waitForTimeout(250);
 assert.equal(await frame.count(),0,'a locked layer must not get transform handles');
 assert.equal(await shape.evaluate(n=>getComputedStyle(n).pointerEvents),'auto',
  'locked artwork still reports its own pointer events');
 before=(await art())[0];
 await dragFrom(shape,120,80);
 assert.deepEqual((await art())[0],before,'a locked layer moved');

 /* 8. None of it reaches the deck anyone is given. */
 await select();
 const clean=await page.evaluate(()=>{
  const d=SF.normalizeDeck(JSON.parse(JSON.stringify(SF.Editor.deck())));
  const r=SF.renderSlide(d,d.slides[0],{index:0,total:1});
  return {chrome:r.querySelectorAll('.artwork-frame,.artwork-handle,.artwork-move').length,
          editing:r.classList.contains('artwork-editing'),
          artwork:r.querySelectorAll('.artwork-object').length};
 });
 assert.deepEqual(clean,{chrome:0,editing:false,artwork:1},'editor chrome leaked into a rendered slide');

 assert.deepEqual(errors,[]);
 console.log('Artwork transform passed: click to select, drag, eight resize handles with anchored opposite edges, rotate with snap, keyboard move/resize, locked layers inert and clean rendering.');
}finally{await browser.close();await harness.stop(relay);fs.rmSync(dir,{recursive:true,force:true});}
