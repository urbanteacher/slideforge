/* Exercise every declared design key through its actual editor control.
 * The choreography service is stubbed: this checks reachability, not an AI API. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {chromium} from 'playwright';
import harness from '../tests/harness.js';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sf-design-controls-'));
const port=await harness.freePort(),relay=await harness.start(port,dir);
const browser=await chromium.launch();
try{
 const page=await browser.newPage({viewport:{width:1400,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${port}`);await page.waitForFunction(()=>window.SF?.Editor?.deck());
 const probes={composition:'editorial',align:'right',size:'small',textColor:'#123456',background:'#abcdef',placement:'top',imageShare:65,mediaGround:'full',imageStep:'after',cardsMode:'rows',cardPics:'plates',statStyle:'bar',funnelDirection:'up',timelineMode:'vertical',backdrop:'glow',logoGround:'dark',imageFrame:'4:3',capStyle:'plain',capPos:'top',capFade:10,imageMotion:'zoom',focalX:25,focalY:75,focalX2:35,focalY2:65,imageTravelSecs:12,chartMotion:'grow',chartFocus:1,words:'fade',wordSpeed:'quick',wordStagger:'one',wordFrom:'last',wordsLoop:true,wordPlan:'generated'};
 const keys=await page.evaluate(()=>Object.keys(SF.DESIGN_CONTROLS));assert.deepEqual(Object.keys(probes).sort(),keys.sort(),'every control needs a behavioural probe');
 for(const key of keys){
  const written=await page.evaluate(async({key,value})=>{
   const meta=SF.DESIGN_CONTROLS[key],type=meta.types==='*'?'content':meta.types[0];
   const deck=SF.makeDeck('Control probe');deck.theme='studio';
   const slide=SF.makeSlide(type);slide.body=type==='chart'?'Label | One | Two\nA | 2 | 3\nB | 4 | 5':'Words can move';slide.subtitle='Caption';
   slide.design={};
   if(type==='image')slide.design.imageMotion='travel';
   if(type==='cards')slide.design.cardsMode='pictures';
   if(type==='statement'){slide.design.words='rise';slide.design.wordStagger='wave';}
   deck.slides=[slide];SF.Store.save(deck);SF.Editor.openDeck(deck.id);
   const tab=[...document.querySelectorAll('#inspector [role=tab]')].find(n=>n.textContent.includes(meta.pane));tab.click();
   const field=document.querySelector('[data-design-key="'+key+'"]');if(!field)throw Error('Unreachable control: '+key);
   if(key==='wordPlan'){
    SF.AI.generateWordMotion=async()=>({note:'Test plan',unit:'word',words:[{dy:1},{dy:1},{dy:1}]});
    field.querySelector('button').click();
    for(let i=0;i<20&&!SF.Editor.deck().slides[0].design.wordPlan;i++)await new Promise(r=>setTimeout(r,10));
    const result=SF.Editor.deck().slides[0].design.wordPlan;
    const clear=[...document.querySelectorAll('[data-design-key=wordPlan] button')].find(b=>b.textContent==='Clear choreography');
    if(!clear)throw Error('No way to clear choreography');clear.click();
    if(SF.Editor.deck().slides[0].design.wordPlan)throw Error('Choreography did not clear');
    return result?.text==='Words can move'?'generated':null;
   }
   const input=field.querySelector('select,input');if(!input)throw Error('Missing input: '+key);
   input.value=key==='wordsLoop'?'loop':String(value);input.dispatchEvent(new Event('change',{bubbles:true}));
   return SF.Editor.deck().slides[0].design[key];
  },{key,value:probes[key]});
  assert.equal(written,probes[key],key+' updates the stored design');
 }
 // A cards-mode choice must take precedence over the campaign ballot default.
 await page.evaluate(()=>{const d=SF.makeDeck('Card layouts');d.theme='aiad27-safe';d.slides=[SF.makeSlide('cards')];SF.Store.save(d);SF.Editor.openDeck(d.id);[...document.querySelectorAll('#inspector [role=tab]')].find(n=>n.textContent.includes('Look')).click();});
 await page.locator('[data-design-key=cardsMode] select').selectOption('pictures');
 assert.equal(await page.evaluate(()=>SF.slideComposition(SF.Editor.deck(),SF.Editor.deck().slides[0])), '');
 await page.evaluate(()=>[...document.querySelectorAll('#inspector [role=tab]')].find(n=>n.textContent.includes('Edit')).click());
 assert.ok(await page.locator('.card-pic-fields').count()>0,'picture-card inspector opens without crashing');
 // Reveal conditional controls by operating their parent, without reopening.
 await page.evaluate(()=>{const d=SF.makeDeck('Conditional controls');d.slides=[SF.makeSlide('statement')];SF.Store.save(d);SF.Editor.openDeck(d.id);[...document.querySelectorAll('#inspector [role=tab]')].find(n=>n.textContent.includes('Motion')).click();});
 await page.locator('[data-design-key=words] select').selectOption('rise');
 await page.locator('[data-design-key=wordFrom] select').waitFor();
 await page.locator('[data-design-key=wordStagger] select').selectOption('together');
 assert.equal(await page.locator('[data-design-key=wordFrom]').count(),0);
 await page.locator('[data-design-key=wordStagger] select').selectOption('wave');
 await page.locator('[data-design-key=wordFrom] select').selectOption('last');
 await page.locator('[data-design-key=wordFrom] select').selectOption('first');
 assert.equal(await page.evaluate(()=>Object.hasOwn(SF.Editor.deck().slides[0].design,'wordFrom')),false);
 await page.goto(`http://127.0.0.1:${port}/design-guide.html`);
 assert.equal(await page.locator('article').count(),keys.length);
 await page.locator('#search').fill('Travels to');assert.equal(await page.locator('article').count(),2);
 await page.locator('#search').fill('');await page.screenshot({path:'/tmp/slideforge-design-guide.png',fullPage:false});
 assert.deepEqual(errors,[]);console.log(`${keys.length} design controls written through the editor; conditions and generated guide verified.`);
}finally{await browser.close();await harness.stop(relay);fs.rmSync(dir,{recursive:true,force:true});}
