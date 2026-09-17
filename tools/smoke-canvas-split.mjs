import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {chromium} from 'playwright';
import harness from '../tests/harness.js';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sf-canvas-split-')),port=await harness.freePort();
const relay=await harness.start(port,dir),browser=await chromium.launch();
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${port}`);await page.waitForFunction(()=>window.SF?.Editor?.deck());
 const fits=await page.evaluate(async()=>{
  const checks=[];
  for(const theme of ['studio','northeastern','ukbt','ukbt-institute','aiad27-safe'])for(const aspect of ['16:9','4:3'])for(const placement of ['left','right','top','bottom'])for(const imageShare of [35,50,65]){
   const d=SF.makeDeck('Split check');d.theme=theme;d.aspect=aspect;
   const s=SF.makeSlide('split');s.title='One idea';s.bullets=['Observe','Ask why'];s.image='assets/brand/aiad27/poster-safe.svg';s.design={imageShare};SF.setImagePlacement(s,placement);d.slides=[s];
   checks.push({theme,aspect,placement,imageShare,...await SF.Review.check(d,s,0)});
  }
  return checks;
 });
 assert.deepEqual(fits.filter(r=>!r.fits),[],'split arrangements fit representative short content');
 await page.evaluate(()=>{
  const d=SF.makeDeck('Body canvas');d.theme='studio';const s=SF.makeSlide('split');s.title='One clear idea';s.bullets=['Observe the image','Ask a better question'];s.image='assets/brand/aiad27/poster-safe.svg';s.design={};d.slides=[s];SF.Store.save(d);SF.Editor.openDeck(d.id);
 });
 const preview=page.locator('#previewBox');
 // Drag the image above the text on the scaled canvas.
 const handle=preview.locator('[data-split-tool=move-image]');await handle.focus();
 let b=await handle.boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2+15,b.y+b.height/2,{steps:3});
 let target=await preview.locator('[data-split-target=top]').boundingBox();await page.mouse.move(target.x+target.width/2,target.y+target.height/2,{steps:8});await page.mouse.up();
 assert.equal(await page.evaluate(()=>SF.imagePlacement(SF.Editor.deck().slides[0])),'top');
 await page.getByRole('button',{name:'↶ Undo',exact:true}).click();
 assert.equal(await page.evaluate(()=>SF.imagePlacement(SF.Editor.deck().slides[0])),'right');
 // Move text below using keyboard; the image goes above.
 await preview.locator('[data-split-tool=move-text]').focus();await page.keyboard.press('Enter');
 await preview.locator('[data-split-target=bottom]').focus();await page.keyboard.press('Enter');
 assert.equal(await page.evaluate(()=>SF.imagePlacement(SF.Editor.deck().slides[0])),'top');
 const before=await page.evaluate(()=>JSON.stringify(SF.Editor.deck().slides[0]));
 await preview.locator('[data-split-tool=move-image]').focus();await page.keyboard.press('Enter');await page.keyboard.press('Escape');
 assert.equal(await page.evaluate(()=>JSON.stringify(SF.Editor.deck().slides[0])),before);
 // Drag the horizontal divider; only one named ratio should be persisted.
 let divider=preview.getByRole('slider',{name:'Image share'});await divider.focus();b=await divider.boundingBox();const pad=await preview.locator('.split-pad').boundingBox();
 await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(pad.x+pad.width/2,pad.y+pad.height*.36,{steps:8});await page.mouse.up();
 assert.equal(await page.evaluate(()=>SF.Editor.deck().slides[0].design.imageShare),35);
 divider=preview.getByRole('slider',{name:'Image share'});assert.equal(await divider.getAttribute('aria-valuenow'),'35');
 await page.keyboard.press('End');assert.equal(await page.evaluate(()=>SF.Editor.deck().slides[0].design.imageShare),65);
 // Cancel an in-flight resize; both stored value and preview recover.
 divider=preview.getByRole('slider',{name:'Image share'});b=await divider.boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(pad.x+pad.width/2,pad.y+pad.height*.35,{steps:6});await page.keyboard.press('Escape');await page.mouse.up();
 assert.equal(await divider.getAttribute('aria-valuenow'),'65');assert.equal(await page.evaluate(()=>SF.Editor.deck().slides[0].design.imageShare),65);
 await divider.focus();await page.keyboard.press('Home');
 assert.equal(await page.evaluate(()=>SF.Editor.deck().slides[0].design.imageShare),35);
 // Choose the heading on the slide, edit it without using the inspector.
 await preview.locator('[data-content-key=title]').click();await preview.locator('[data-split-tool=edit-text]').click();
 await page.getByRole('textbox',{name:'Edit slide content'}).fill('An edited idea');await preview.locator('.canvas-edit-form button').filter({hasText:'Save'}).click();
 assert.equal(await page.evaluate(()=>SF.Editor.deck().slides[0].title),'An edited idea');
 await preview.locator('[data-split-tool=edit-image]').focus();await page.keyboard.press('Enter');
 await page.getByRole('textbox',{name:'Image source'}).fill('assets/brand/aiad27/poster-smart.svg');await page.locator('.canvas-image-form select').selectOption('contain');await page.getByRole('button',{name:'Save image',exact:true}).click();
 assert.deepEqual(await page.evaluate(()=>{const s=SF.Editor.deck().slides[0];return [s.image,s.imageFit];}),['assets/brand/aiad27/poster-smart.svg','contain']);
 await preview.locator('[data-split-tool=edit-image]').focus();await page.keyboard.press('Enter');await page.getByRole('textbox',{name:'Image source'}).fill('discard-me');await page.keyboard.press('Escape');
 assert.equal(await page.evaluate(()=>SF.Editor.deck().slides[0].image),'assets/brand/aiad27/poster-smart.svg');
 const clean=await page.evaluate(()=>{const d=SF.normalizeDeck(JSON.parse(JSON.stringify(SF.Editor.deck()))),s=d.slides[0],r=SF.renderSlide(d,s,{index:0,total:1});return {placement:SF.imagePlacement(s),share:s.design.imageShare,tools:r.querySelectorAll('[data-split-tool]').length};});
 assert.deepEqual(clean,{placement:'top',share:35,tools:0});
 await page.screenshot({path:'/tmp/slideforge-body-canvas.png'});
 assert.deepEqual(errors,[]);console.log(`Body canvas passed: ${fits.length} theme/aspect/placement/ratio checks; drag, keyboard, Undo, cancel, editing and clean exports.`);
}finally{await browser.close();await harness.stop(relay);fs.rmSync(dir,{recursive:true,force:true});}
