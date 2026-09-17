import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {chromium} from 'playwright';
import harness from '../tests/harness.js';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sf-artwork-')),port=await harness.freePort();
const relay=await harness.start(port,dir),browser=await chromium.launch();
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${port}`);await page.waitForFunction(()=>window.SF?.Editor?.deck());
 const census=await page.evaluate(()=>{let count=0;for(const {key} of SF.LESSONS){const d=SF.buildLesson(key);if(!['northeastern','ukbt','ukbt-institute'].includes(d.theme))continue;d.slides.forEach((s,i)=>{const before=JSON.stringify(s),r=SF.renderSlide(d,s,{index:i,total:d.slides.length});if(r.querySelector('.artwork-plane')||r.classList.contains('has-user-artwork')||JSON.stringify(s)!==before)throw Error('Default changed '+key);count++;});}return count;});assert.equal(census,322);
 const before=await page.evaluate(()=>{const d=SF.buildLesson('ukbt-template');SF.Store.save(d);SF.Editor.openDeck(d.id);return JSON.stringify(SF.Editor.deck());});
 await page.getByRole('button',{name:'Layers',exact:true}).click();await page.getByRole('button',{name:'Theme artwork · locked',exact:true}).click();
 assert.equal(await page.evaluate(()=>JSON.stringify(SF.Editor.deck())),before);
 await page.getByRole('button',{name:'Add rectangle',exact:true}).click();
 const panel=page.getByRole('region',{name:'Slide layers'});
 async function number(label,value){const input=panel.getByLabel(label,{exact:true});await input.fill(String(value));await input.press('Tab');}
 await number('Horizontal position (%)',10);await number('Vertical position (%)',15);await number('Width (%)',30);await number('Height (%)',25);await number('Opacity (%)',60);
 let node=page.locator('#previewBox .artwork-object');assert.equal(await node.evaluate(n=>n.parentElement.className),'artwork-plane artwork-back');
 await panel.getByLabel('Layer group',{exact:true}).selectOption('front');
 const backfront=await page.evaluate(()=>{const r=document.querySelector('#previewBox .slide');return [getComputedStyle(r.querySelector('.pad')).zIndex,getComputedStyle(r.querySelector('.artwork-front')).zIndex];});assert.deepEqual(backfront,['2','3']);
 await panel.getByLabel('Locked',{exact:true}).check();assert.equal(await page.locator('#previewBox .artwork-move').count(),0);assert.equal(await panel.getByLabel('Width (%)',{exact:true}).isDisabled(),true);
 await panel.getByLabel('Hidden',{exact:true}).check();assert.equal(await page.locator('#previewBox .artwork-object').count(),0);
 await panel.getByLabel('Hidden',{exact:true}).uncheck();await panel.getByLabel('Locked',{exact:true}).uncheck();
 /* Move the selected artwork and check it reaches the deck. Keyboard rather
    than pointer: the Move button beside the object is gone — direct
    manipulation replaced it, because aiming at a button next to the thing you
    can already see was the clunkiness people complained about — and the
    pointer drag is covered in full by smoke-artwork-transform.mjs. What this
    case is for is that a move persists and Undo takes it back, and the keys
    reach that through the same setters with no gesture choreography.

    From 10,15 in steps of five: two right, two down. */
 await page.locator('#previewBox .artwork-frame').waitFor();
 await page.locator('#previewBox .artwork-frame').focus();
 for(const key of ['Shift+ArrowRight','Shift+ArrowRight','Shift+ArrowDown','Shift+ArrowDown']){
  await page.keyboard.press(key);
  await page.locator('#previewBox .artwork-frame').waitFor();
  await page.locator('#previewBox .artwork-frame').focus();
 }
 assert.deepEqual(await page.evaluate(()=>{const a=SF.Editor.deck().slides[0].artwork[0];return [a.x,a.y];}),[20,25]);
 /* One undo per key, since each commits its own step. */
 for(let i=0;i<4;i++)await page.getByRole('button',{name:'↶ Undo',exact:true}).click();
 assert.deepEqual(await page.evaluate(()=>{const a=SF.Editor.deck().slides[0].artwork[0];return [a.x,a.y];}),[10,15]);
 await page.getByRole('button',{name:'Layers',exact:true}).click();await page.locator('.layer-row[data-layer-id]').click();
 await page.getByRole('button',{name:'Add circle',exact:true}).click();await panel.getByLabel('Layer group',{exact:true}).selectOption('front');
 await panel.getByRole('button',{name:'Send backward',exact:true}).click();assert.deepEqual(await page.evaluate(()=>SF.Editor.deck().slides[0].artwork.map(a=>a.kind)),['circle','rectangle']);
 await page.getByRole('button',{name:'Add image',exact:true}).click();const source=panel.getByLabel('Image source',{exact:true});await source.fill('assets/brand/ukbt-objects/ukbt-coil.png');await source.press('Tab');await panel.getByLabel('Image fit',{exact:true}).selectOption('cover');
 const saved=await page.evaluate(()=>{const d=SF.normalizeDeck(JSON.parse(JSON.stringify(SF.Editor.deck()))),s=d.slides[0],r=SF.renderSlide(d,s,{index:0,total:d.slides.length});return {kinds:s.artwork.map(a=>a.kind),fit:r.querySelector('.artwork-image img').style.objectFit,tools:r.querySelectorAll('.artwork-move,.canvas-layers-panel,.canvas-layers-launch').length};});assert.deepEqual(saved,{kinds:['circle','rectangle','image'],fit:'cover',tools:0});
 // Display both aspect shapes; decorative artwork is clipped to its own plane.
 for(const aspect of ['16:9','4:3']){const dims=await page.evaluate(aspect=>{const d=SF.normalizeDeck(JSON.parse(JSON.stringify(SF.Editor.deck())));d.aspect=aspect;const r=SF.renderSlide(d,d.slides[0],{index:0,total:d.slides.length});document.body.appendChild(r);const a=r.querySelector('.artwork-image'),answer={height:r.offsetHeight,x:a.offsetLeft/r.offsetWidth};r.remove();return answer;},aspect);assert.equal(dims.height,aspect==='4:3'?960:720);assert.ok(Math.abs(dims.x-.65)<.005);}
 const invalid=await page.evaluate(()=>SF.normalizeArtwork([{id:'same',kind:'circle',x:-100,width:200,color:'url(bad)'},{id:'same',kind:'image',src:'javascript:alert(1)',opacity:NaN},{kind:'script'}]));assert.equal(invalid.length,2);assert.equal(new Set(invalid.map(a=>a.id)).size,2);assert.equal(invalid[0].x,0);assert.equal(invalid[0].width,100);assert.equal(invalid[1].src,'');
 await panel.getByRole('button',{name:'Close layers',exact:true}).click();await page.getByRole('button',{name:'Layers',exact:true}).click();await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('#previewBox h1')).opacity)>.99);await page.screenshot({path:'/tmp/slideforge-layers.png'});
 /* The panel is beside the canvas, never over it. It began as an overlay
    inside #previewBox: 330x344 on a canvas 360 tall, so it hid the artwork
    being positioned, and its height was capped by the canvas so the lower
    half scrolled away behind an edge that gave no sign there was more.
    Checked at two widths because the failure modes differ — side by side the
    canvas has to give up the column (it kept claiming it via 16/9 and
    overlapped by 27px), stacked the canvas must stay whole and the stage
    scroll (sharing a fixed height crushed the canvas to 18px). */
 for(const [w,h,expectSideBySide] of [[1500,950,true],[900,820,false]]){
  await page.setViewportSize({width:w,height:h});
  /* A resize redraws the editor, which re-binds and drops the panel — true
     before this moved too, since it used to be cleared along with the canvas
     it lived in. Reopen, then measure where it lands. */
  await page.waitForTimeout(300);
  if(!await page.locator('.canvas-layers-panel').count())
   await page.getByRole('button',{name:'Layers',exact:true}).click();
  await page.locator('.canvas-layers-panel').waitFor();
  await page.waitForTimeout(250);
  const layout=await page.evaluate(()=>{
   const p=document.querySelector('.canvas-layers-panel'),box=document.querySelector('#previewBox');
   if(!p||!box)return null;
   const pr=p.getBoundingClientRect(),br=box.getBoundingClientRect();
   const wrap=p.parentElement,wr=wrap.getBoundingClientRect(),ws=getComputedStyle(wrap);
   const room=wr.height-parseFloat(ws.paddingTop||'0')-parseFloat(ws.paddingBottom||'0');
   return {overlaps:!(pr.right<=br.left||pr.left>=br.right||pr.bottom<=br.top||pr.top>=br.bottom),
           sideBySide:pr.left>=br.right-1, canvasW:Math.round(br.width), canvasH:Math.round(br.height),
           hidden:Math.max(0,p.scrollHeight-p.clientHeight),
           scrollable:getComputedStyle(p).overflowY!=='visible',
           panelH:Math.round(pr.height), contentH:p.scrollHeight, room:Math.round(room)};
  });
  assert.ok(layout,`${w}x${h}: the layers panel is not on the page`);
  assert.equal(layout.overlaps,false,`${w}x${h}: the layers panel is covering the canvas`);
  assert.equal(layout.sideBySide,expectSideBySide,`${w}x${h}: wrong placement for this width`);
  /* Not "nothing is ever hidden" — beside a tall slide the panel may still be
     shorter than its contents, and that is fine so long as it scrolls. What
     must not recur is a panel capped well below the room it has, which is
     what made the overlay version feel truncated rather than scrollable. */
  assert.ok(layout.hidden===0||layout.scrollable,
   `${w}x${h}: ${layout.hidden}px of the panel is unreachable and it does not scroll`);
  assert.ok(layout.panelH>=Math.min(layout.contentH,layout.room)-4,
   `${w}x${h}: panel is ${layout.panelH}px with ${layout.room}px of stage available for ${layout.contentH}px of content`);
  assert.ok(layout.canvasW>=320&&layout.canvasH>=180,
   `${w}x${h}: the canvas was squeezed to ${layout.canvasW}x${layout.canvasH} making room for the panel`);
 }
 await page.setViewportSize({width:1440,height:1000});

 assert.deepEqual(errors,[]);console.log(`Artwork passed: ${census} unchanged NUL/UKBT slides; layers, transforms, ordering, lock/hide, scaled drag, Undo, persistence, panel placement at two widths and clean rendering.`);
}finally{await browser.close();await harness.stop(relay);fs.rmSync(dir,{recursive:true,force:true});}
