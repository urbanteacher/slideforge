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
 // Move the selected artwork, accounting for the canvas scale.
 const handle=page.getByRole('button',{name:'Move artwork',exact:true});let b=await handle.boundingBox();const rootBox=await page.locator('#previewBox .slide').boundingBox();
 await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2+rootBox.width*.10,b.y+b.height/2+rootBox.height*.10,{steps:7});await page.mouse.up();
 assert.deepEqual(await page.evaluate(()=>{const a=SF.Editor.deck().slides[0].artwork[0];return [a.x,a.y];}),[20,25]);
 await page.getByRole('button',{name:'↶ Undo',exact:true}).click();assert.deepEqual(await page.evaluate(()=>{const a=SF.Editor.deck().slides[0].artwork[0];return [a.x,a.y];}),[10,15]);
 await page.getByRole('button',{name:'Layers',exact:true}).click();await page.locator('.layer-row[data-layer-id]').click();
 await page.getByRole('button',{name:'Add circle',exact:true}).click();await panel.getByLabel('Layer group',{exact:true}).selectOption('front');
 await panel.getByRole('button',{name:'Send backward',exact:true}).click();assert.deepEqual(await page.evaluate(()=>SF.Editor.deck().slides[0].artwork.map(a=>a.kind)),['circle','rectangle']);
 await page.getByRole('button',{name:'Add image',exact:true}).click();const source=panel.getByLabel('Image source',{exact:true});await source.fill('assets/brand/ukbt-objects/ukbt-coil.png');await source.press('Tab');await panel.getByLabel('Image fit',{exact:true}).selectOption('cover');
 const saved=await page.evaluate(()=>{const d=SF.normalizeDeck(JSON.parse(JSON.stringify(SF.Editor.deck()))),s=d.slides[0],r=SF.renderSlide(d,s,{index:0,total:d.slides.length});return {kinds:s.artwork.map(a=>a.kind),fit:r.querySelector('.artwork-image img').style.objectFit,tools:r.querySelectorAll('.artwork-move,.canvas-layers-panel,.canvas-layers-launch').length};});assert.deepEqual(saved,{kinds:['circle','rectangle','image'],fit:'cover',tools:0});
 // Display both aspect shapes; decorative artwork is clipped to its own plane.
 for(const aspect of ['16:9','4:3']){const dims=await page.evaluate(aspect=>{const d=SF.normalizeDeck(JSON.parse(JSON.stringify(SF.Editor.deck())));d.aspect=aspect;const r=SF.renderSlide(d,d.slides[0],{index:0,total:d.slides.length});document.body.appendChild(r);const a=r.querySelector('.artwork-image'),answer={height:r.offsetHeight,x:a.offsetLeft/r.offsetWidth};r.remove();return answer;},aspect);assert.equal(dims.height,aspect==='4:3'?960:720);assert.ok(Math.abs(dims.x-.65)<.005);}
 const invalid=await page.evaluate(()=>SF.normalizeArtwork([{id:'same',kind:'circle',x:-100,width:200,color:'url(bad)'},{id:'same',kind:'image',src:'javascript:alert(1)',opacity:NaN},{kind:'script'}]));assert.equal(invalid.length,2);assert.equal(new Set(invalid.map(a=>a.id)).size,2);assert.equal(invalid[0].x,0);assert.equal(invalid[0].width,100);assert.equal(invalid[1].src,'');
 await panel.getByRole('button',{name:'Close layers',exact:true}).click();await page.getByRole('button',{name:'Layers',exact:true}).click();await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('#previewBox h1')).opacity)>.99);await page.screenshot({path:'/tmp/slideforge-layers.png'});
 assert.deepEqual(errors,[]);console.log(`Artwork passed: ${census} unchanged NUL/UKBT slides; layers, transforms, ordering, lock/hide, scaled drag, Undo, persistence and clean rendering.`);
}finally{await browser.close();await harness.stop(relay);fs.rmSync(dir,{recursive:true,force:true});}
