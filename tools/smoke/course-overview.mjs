#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import harness from '../../tests/harness.js';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-overview-'));
const port = await harness.freePort();
const relay = await harness.start(port, dir);
const browser = await chromium.launch({headless:true});
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${port}/?lesson=ipdv-intro`);
 await page.waitForFunction(()=>window.SF?.Editor?.deck());
 await page.evaluate(()=>{const d=SF.Editor.deck();SF.Editor.selectSlide(d.slides.find(s=>s.type==='journey').id);SF.Editor.workspace.draw();});
 assert.equal(await page.locator('#previewBox .journey-stop').count(),6);
 const field=page.locator('#inspector .kw-term-input').first();
 await field.fill('W1 · Start here');
 assert.equal(await page.locator('#previewBox .journey-copy h3').first().textContent(),'W1 · Start here');
 await page.evaluate(()=>SF.Editor.workspace.play());
 const initial=await page.evaluate(()=>SF.Player.idx);
 for(let i=0;i<6;i++)await page.evaluate(()=>SF.Player.next());
 assert.equal(await page.evaluate(()=>SF.Player.idx),initial);
 await page.evaluate(()=>SF.Player.next());
 assert.equal(await page.evaluate(()=>SF.Player.idx),initial+1);
 await page.evaluate(()=>SF.Player.close());
 await page.reload();
 assert.equal(await page.locator('#previewBox .journey-copy h3').first().textContent(),'W1 · Start here');
 await page.evaluate(()=>{const d=SF.Editor.deck();SF.Editor.selectSlide(d.slides.find(s=>s.journeyMode==='handover').id);SF.Editor.workspace.draw();});
 const detail=page.getByLabel('What happens here',{exact:true}).first();
 const original=await detail.inputValue();
 assert.ok(original.includes('\n'));
 await detail.fill(original+'\nCheck Canvas');
 assert.ok((await page.locator('#previewBox .journey-copy p').first().textContent()).endsWith('\nCheck Canvas'));
 await detail.fill(original);
 const issues=[];
 for (const rail of [false,true]) for(let i=2;i<8;i++) {
  await page.evaluate(({i,rail})=>{
   document.getElementById('course-preview')?.remove();
   const frame=document.createElement('div');frame.id='course-preview';if(rail)frame.className='deck-viewport railed';
   Object.assign(frame.style,{position:'fixed',inset:'0',width:'1280px',height:'720px',zIndex:'99999',background:'white'});
   const d=SF.Editor.deck();frame.appendChild(SF.renderSlide(d,d.slides[i],{index:i,total:d.slides.length}));document.body.appendChild(frame);
  },{i,rail});
  await page.locator('#course-preview').screenshot({path:`/tmp/sf-course-${i+1}${rail?"-split":""}.png`});
  const found=await page.locator('#course-preview').evaluate(root=>{
   const failures=[];const bounds=root.getBoundingClientRect();
   for(const n of root.querySelectorAll('.journey-copy,.journey-takeaway,.mindmap-node,.mindmap-centre')) {
    const r=n.getBoundingClientRect();
    if(r.bottom>bounds.bottom-18 || r.right>bounds.right || r.left<bounds.left || n.scrollWidth>n.clientWidth+2)failures.push(n.textContent);
   }
   const stops=Array.from(root.querySelectorAll('.journey-route:not(.journey-handover) .journey-copy'));
   for(let j=0;j<stops.length-1;j++)if(stops[j].getBoundingClientRect().bottom>stops[j+1].getBoundingClientRect().top-4)failures.push('Overlapping milestones');
   return failures;
  });
  issues.push(...found.map(x=>'Slide '+(i+1)+': '+x));
 }
 assert.deepEqual(issues,[]);
 assert.deepEqual(errors,[]);
 console.log('PASS: editable journey, six reveal steps, slide advance, reload persistence, six slide layouts, no overflow or browser errors');
} finally {await browser.close();await harness.stop(relay);fs.rmSync(dir,{recursive:true,force:true});}
