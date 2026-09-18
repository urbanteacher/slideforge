import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {chromium} from 'playwright';
import harness from '../../tests/harness.js';
import {checkDeckFiles} from '../check-fit.mjs';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sf-slide-review-')),port=await harness.freePort();
const relay=await harness.start(port,dir),url=`http://127.0.0.1:${port}`;
const browser=await chromium.launch();
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);await page.waitForFunction(()=>window.SF?.Review&&SF.Editor?.deck());
 const sizes=await page.evaluate(async()=>{
  const out=[];
  for(const aspect of ['16:9','16:10','4:3']){const d=SF.makeDeck('Aspect check');d.aspect=aspect;d.slides=[SF.normalizeSlide({type:'title',title:'An idea'})];out.push(await SF.Review.check(d,d.slides[0],0));}
  return out;
 });assert.deepEqual(sizes.map(r=>r.height),[720,800,960]);assert.ok(sizes.every(r=>r.fits));
 // A transform beyond the left edge does not increase scrollWidth. Text ranges
 // must catch it even though the offscreen measuring stage is aria-hidden.
 const style=await page.addStyleTag({content:'.slide-fit-stage [data-content-key=title]{transform:translateX(-1400px)!important}'});
 const overflow=await page.evaluate(async()=>{const d=SF.makeDeck('Overflow');const s=SF.normalizeSlide({type:'title',title:'Outside the slide'});d.slides=[s];return SF.Review.check(d,s,0);});
 assert.equal(overflow.fits,false);assert.ok(overflow.over.some(o=>o.text==='Outside the slide'));await style.evaluate(n=>n.remove());
 let before=await page.evaluate(()=>{const d=SF.makeDeck('Review snapshot');d.slides=[SF.normalizeSlide({type:'title',title:'One idea'}),SF.normalizeSlide({type:'content',title:'Hidden notes',hidden:true,bullets:['For the presenter']})];SF.Store.save(d);SF.Editor.openDeck(d.id);return JSON.stringify(SF.Editor.deck());});
 before=await page.evaluate(()=>JSON.stringify(SF.Editor.deck()));await page.locator('.canvas-faces button',{hasText:'Review'}).click();
 assert.equal(await page.locator('.review-tile').count(),1);
 await page.locator('.review-tile').first().click();await page.getByRole('button',{name:'Back to grid'}).click();
 await page.getByLabel('Include hidden slides').check();assert.equal(await page.locator('.review-tile').count(),2);
 await page.getByRole('button',{name:'Check slide fit',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.review-status').textContent.includes('2 slides checked'));
 assert.match(await page.locator('.review-status').innerText(),/0 with overflow/);
 const bundle={decks:[{title:'Imported <b>literal</b>',theme:'paper',aspect:'4:3',slides:[{type:'title',title:'Imported idea'}]}]};
 await page.getByLabel('Review a deck or bundle file').setInputFiles({name:'deck.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bundle))});
 await page.waitForFunction(()=>document.querySelector('.review-head h1').textContent==='Imported <b>literal</b>');
 assert.equal(await page.locator('.review-head h1 b').count(),0);
 const aspect=await page.locator('.review-thumb').evaluate(n=>n.clientWidth/n.clientHeight);assert.ok(Math.abs(aspect-4/3)<.02);
 await page.locator('.review-tile').first().click();
 const box=await page.locator('.review-stage').boundingBox();assert.ok(box.y>=0&&box.y+box.height<=1000,'4:3 detail fits the viewport');
 await page.getByRole('button',{name:'Back to grid'}).click();
 assert.equal(await page.evaluate(()=>JSON.stringify(SF.Editor.deck())),before);
 await page.getByLabel('Review a deck or bundle file').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{"decks":[]}')});
 await page.waitForFunction(()=>document.querySelector('.review-status').textContent.includes('at least one slide'));
 assert.equal(await page.locator('.review-tile').count(),1);
 await page.getByRole('button',{name:'Close',exact:true}).click();await page.waitForSelector('.slide-review',{state:'detached'});
 assert.equal(await page.locator('.slide-fit-stage').count(),0);
 // Exercise the file entry point and all five campaign starter decks in CI.
 const file=path.join(dir,'deck.json');fs.writeFileSync(file,JSON.stringify(bundle));
 const report=await checkDeckFiles({files:[file],lessons:['aiad27-safe','aiad27-smart','aiad27-creative','aiad27-responsible','aiad27-future'],url});
 assert.equal(report.checked,46);assert.deepEqual(report.failures,[]);
 await assert.rejects(()=>checkDeckFiles({files:[path.join(dir,'missing.json')],url}));
 await assert.rejects(()=>checkDeckFiles({lessons:['unknown-lesson'],url}),/Unknown library lesson/);
 await page.evaluate(()=>SF.Review.open(SF.buildLesson('motion-lab')));await page.screenshot({path:'/tmp/slideforge-review-grid.png'});
 await page.locator('.review-tile').first().click();await page.screenshot({path:'/tmp/slideforge-review-detail.png'});
 assert.deepEqual(errors,[]);console.log('Review UI, aspect ratios, text-edge overflow, import isolation and 46 file/campaign slides passed.');
}finally{await browser.close();await harness.stop(relay);fs.rmSync(dir,{recursive:true,force:true});}
