import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {chromium} from 'playwright';
import harness from '../../tests/harness.js';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sf-regions-')),port=await harness.freePort();
const relay=await harness.start(port,dir),browser=await chromium.launch();
try {
 const page=await browser.newPage({/* Tall on purpose. #inspector shares the stage column's height, so on a
    1000px-high window the canvas is small enough that this test's drag handle
    measures 4.9x4.9 CSS pixels and a pointer drag across it stops registering.
    The height is the cheapest way to keep a canvas-pixel test honest; the
    column budget itself is worth its own look. */
 viewport:{width:1500,height:1500}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${port}`);await page.waitForFunction(()=>window.SF?.Review&&SF.Editor?.deck());
 // Census the actual Library without changing theme, type or composition.
 const coverage=await page.evaluate(()=>SF.LESSONS.map(({key})=>{
   const deck=SF.buildLesson(key),before=JSON.stringify(deck);
   const supported=deck.slides.filter(s=>SF.supportsChromeRegions(SF,deck,s)).length;
   if(JSON.stringify(deck)!==before)throw Error('Coverage mutated '+key);
   return {key,theme:deck.theme,total:deck.slides.length,supported};
 }));
 const campaign=coverage.filter(d=>d.theme.startsWith('aiad27-'));
 assert.equal(campaign.reduce((n,d)=>n+d.supported,0),35,'actual campaign region coverage');
 for(const theme of ['northeastern','studio','ukbt']){
   const decks=coverage.filter(d=>d.theme===theme);assert.ok(decks.length,theme+' is represented');
   assert.equal(decks.reduce((n,d)=>n+d.supported,0),0,theme+' Library decks have not been migrated');
 }
 console.log('Library region coverage: '+coverage.map(d=>d.key+' '+d.supported+'/'+d.total).join(', '));
 const results=await page.evaluate(async()=>{
  const checks=[];
  for(const theme of ['aiad27-safe','aiad27-smart','aiad27-creative','aiad27-responsible','aiad27-future']){
   const d=SF.buildLesson(theme);
   for(const aspect of ['16:9','4:3']) {
    d.aspect=aspect;
    for(let i=0;i<d.slides.length;i++) {
     const s=d.slides[i];
     if(!SF.supportsChromeRegions(SF,d,s))continue;
     s.design={...s.design,chromeLayout:'regions'};
     checks.push({theme,aspect,index:i,...await SF.Review.check(d,s,i)});
    }
   }
  }
  return checks;
 });
 assert.equal(results.length,70);assert.deepEqual(results.filter(r=>!r.fits),[],'existing region-capable campaign slides fit');
 await page.evaluate(()=>{
  const d=SF.buildLesson('aiad27-safe');d.slides=[d.slides[2]];d.slides[0].design={...d.slides[0].design,chromeLayout:'regions'};
  SF.Store.save(d);SF.Editor.openDeck(d.id);
 });
 await page.getByRole('tab',{name:/Look/}).click();
 const preview=page.locator('#previewBox');
 assert.equal(await preview.locator('[data-region]').count(),6);
 assert.equal(await preview.locator('[data-region=header-left] .chrome-identity').innerText(),'Safe');
 assert.equal(await preview.locator('.slide-logo').count(),1);
 await page.locator('[data-design-key=logoSlot] select').selectOption('footer-left');
 assert.equal(await preview.locator('[data-region=footer-left] .slide-logo').count(),1);
 assert.equal(await preview.locator('[data-region=header-right] .cp-footer-note').count(),1,'occupied slot swaps');
 // Empty slots don't duplicate content, and serialized state has semantic names only.
 const persisted=await page.evaluate(()=>{
  const d=SF.Editor.deck(),copy=SF.normalizeDeck(JSON.parse(JSON.stringify(d)));
  const root=SF.renderSlide(copy,copy.slides[0],{index:0,total:1});
  return {design:copy.slides[0].design,slot:root.querySelector('.slide-logo').parentElement.dataset.region};
 });
 assert.equal(persisted.slot,'footer-left');assert.equal(persisted.design.closingSlot,'header-right');
 const placements=await page.evaluate(async()=>{
  const d=SF.Editor.deck(),s=d.slides[0],out=[];
  for(const key of ['identitySlot','logoSlot','closingSlot','numberSlot'])for(const slot of SF.CHROME_SLOTS){
   const copy=SF.normalizeSlide(JSON.parse(JSON.stringify(s)));SF.setChromeSlot(copy,key,slot);
   d.slides=[copy];const root=SF.renderSlide(d,copy,{index:0,total:1});
   const host=document.createElement('div');host.style.cssText='position:fixed;left:-20000px;top:0;width:1280px;height:720px';host.appendChild(root);document.body.appendChild(host);
   const header=root.querySelector('.cp-header').getBoundingClientRect(),body=root.querySelector('.cp-body').getBoundingClientRect(),footer=root.querySelector('.cp-footer').getBoundingClientRect();
   const node=root.querySelector('[data-chrome-item='+key+']');
   out.push({key,slot,actual:node?.parentElement.dataset.region,ordered:header.bottom<=body.top+1&&body.bottom<=footer.top+1});host.remove();
  }
  // The editor's live deck must not be replaced by a render probe.
  d.slides=[s];return out;
 });
 assert.ok(placements.every(p=>p.slot===p.actual&&p.ordered),'all furniture moves between six slots without overlapping region containers');
 await page.screenshot({path:'/tmp/slideforge-chrome-regions.png'});
 // Real pointer drag on the scaled canvas, followed by keyboard movement.
 const grip=preview.locator('[data-move-item=logoSlot]');
 await grip.focus();let gripBox=await grip.boundingBox();
 await page.mouse.move(gripBox.x+gripBox.width/2,gripBox.y+gripBox.height/2);await page.mouse.down();
 await page.mouse.move(gripBox.x+gripBox.width/2+12,gripBox.y+gripBox.height/2,{steps:3});
 const targetBox=await preview.locator('[data-snap-slot=header-right]').boundingBox();
 await page.mouse.move(targetBox.x+targetBox.width/2,targetBox.y+targetBox.height/2,{steps:8});
 await page.screenshot({path:'/tmp/slideforge-canvas-snap.png'});
 await page.mouse.up();
 assert.equal(await preview.locator('[data-region=header-right] .slide-logo').count(),1,'pointer drop swaps logo back');
 assert.equal(await preview.locator('.canvas-region-targets').count(),0);
 await page.getByRole('button',{name:'↶ Undo',exact:true}).click();
 assert.equal(await preview.locator('[data-region=footer-left] .slide-logo').count(),1,'one undo restores drag');
 await preview.locator('[data-move-item=logoSlot]').focus();await page.keyboard.press('Enter');
 await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter');
 assert.equal(await preview.locator('[data-region=footer-center] .slide-logo').count(),1,'keyboard chooses next slot');
 assert.equal(await page.evaluate(()=>document.activeElement.dataset.moveItem),'logoSlot','focus restored after redraw');
 const prior=await page.evaluate(()=>JSON.stringify(SF.Editor.deck().slides[0].design));
 await page.keyboard.press('Enter');await page.keyboard.press('Escape');
 assert.equal(await preview.locator('.canvas-region-targets').count(),0);
 assert.equal(await page.evaluate(()=>JSON.stringify(SF.Editor.deck().slides[0].design)),prior,'cancel does not write');
 // Dropping in the body is not a placement; the body stays untouched.
 gripBox=await preview.locator('[data-move-item=logoSlot]').boundingBox();
 await page.mouse.move(gripBox.x+20,gripBox.y+10);await page.mouse.down();
 const slideBox=await preview.locator('.slide').boundingBox();
 await page.mouse.move(slideBox.x+slideBox.width/2,slideBox.y+slideBox.height/2,{steps:8});await page.mouse.up();
 assert.equal(await page.evaluate(()=>JSON.stringify(SF.Editor.deck().slides[0].design)),prior);
 assert.equal(await preview.locator('.canvas-region-targets').count(),0);
 // Escape while the pointer is held must not reopen the chooser on release.
 gripBox=await preview.locator('[data-move-item=logoSlot]').boundingBox();
 await preview.locator('[data-move-item=logoSlot]').focus();
 await page.mouse.move(gripBox.x+15,gripBox.y+15);await page.mouse.down();
 await page.mouse.move(gripBox.x+28,gripBox.y+15,{steps:3});await page.keyboard.press('Escape');await page.mouse.up();
 assert.equal(await preview.locator('.canvas-region-targets').count(),0);
 assert.equal(await page.evaluate(()=>JSON.stringify(SF.Editor.deck().slides[0].design)),prior);
 const exported=await page.evaluate(()=>{const d=SF.Editor.deck();return SF.renderSlide(d,d.slides[0],{index:0,total:1}).querySelectorAll('.canvas-region-handle,.canvas-region-targets').length;});
 assert.equal(exported,0,'shared rendering has no editor tools');
 // Toggle off returns to original rendering; retained slot choices are dormant.
 await page.locator('[data-design-key=chromeLayout] select').selectOption('');
 assert.equal(await preview.locator('[data-region]').count(),0);
 assert.equal(await preview.locator('.has-corner-mark > .slide-logo').count(),1);
 const safeguards=await page.evaluate(()=>{
  const d=SF.buildLesson('aiad27-safe'),s=d.slides[2];s.design={chromeLayout:'regions'};
  d.logoOn='none';d.showSlideNumbers=false;
  const node=SF.renderSlide(d,s,{index:2,total:d.slides.length});
  const plain=SF.makeSlide('content');plain.design={chromeLayout:'regions'};
  const unsupported=SF.renderSlide({...d,theme:'ukbt'},plain,{index:0,total:1});
  const malformed={logoSlot:'footer-left',closingSlot:'footer-left',numberSlot:'bad'};
  const original=JSON.stringify(malformed),positions=SF.chromePositions(malformed);
  return {logos:node.querySelectorAll('.slide-logo').length,numbers:node.querySelectorAll('.pagenum').length,unsupported:unsupported.classList.contains('chrome-regions'),unique:new Set(Object.values(positions)).size,unchanged:original===JSON.stringify(malformed)};
 });
 assert.deepEqual(safeguards,{logos:0,numbers:0,unsupported:false,unique:5,unchanged:true});
 assert.deepEqual(errors,[]);
 console.log(`Named regions passed: ${results.length} existing campaign aspect checks, slot swaps, persistence, visibility and legacy fallback.`);
}finally{await browser.close();await harness.stop(relay);fs.rmSync(dir,{recursive:true,force:true});}
