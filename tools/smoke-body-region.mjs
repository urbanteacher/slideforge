import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {chromium} from 'playwright';
import harness from '../tests/harness.js';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sf-body-region-')),port=await harness.freePort();
const relay=await harness.start(port,dir),browser=await chromium.launch();
try{
 const page=await browser.newPage({viewport:{width:1500,height:950}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${port}/modular-canvas/preview.html`,{waitUntil:'networkidle'});
 await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));});
 /* The overlay lab that drew .lab-body-frame is gone from preview.html; the three
    engines mount real slides instead. The Safe mock swaps .cp-body out for its own
    grid, so a composition region only exists on its original design; Demo keeps
    .pad either way. No single screen carries all three kinds, so arrange each in
    turn and accumulate — scale invariance is the property under test, not co-presence. */
 await page.waitForFunction(()=>[...document.querySelectorAll('.slide')].some(r=>r.querySelector('[data-body-region]')&&r.offsetWidth));
 await page.waitForSelector('#demo-slide');
 await page.check('#safe-original');
 const probe=()=>page.evaluate(()=>[...document.querySelectorAll('.slide')].flatMap(root=>{
  const frame=SF.measureBodyRegion(root);if(!frame)return [];
  const before={left:frame.left,top:frame.top,width:frame.width,height:frame.height};
  const previous=root.style.transform;root.style.transform='scale(.317)';const after=SF.measureBodyRegion(root);root.style.transform=previous;
  return [{kind:frame.kind,rows:frame.rows,before,after:{left:after.left,top:after.top,width:after.width,height:after.height}}];
 }));
 const pick=re=>page.evaluate(pattern=>{
  const sel=document.querySelector('#demo-slide');
  const hit=[...sel.options].find(o=>new RegExp(pattern,'i').test(o.textContent));
  if(!hit)throw Error('no demo slide matching '+pattern);
  sel.value=hit.value;sel.dispatchEvent(new Event('change'));
 },re);
 const out=[];
 for(const [pattern,kind] of [['image|video|gallery|split|introduction','media-stage'],['content','content']]){
  await pick(pattern);
  await page.waitForFunction(k=>[...document.querySelectorAll('.slide')].some(r=>r.querySelector(`[data-body-region="${k}"]`)&&r.offsetWidth),kind);
  out.push(...await probe());
 }
 const report={out,detached:await page.evaluate(()=>{
  const d=SF.buildLesson('pace-nul'),detached=SF.renderSlide(d,d.slides[0],{index:0,total:d.slides.length});
  return SF.measureBodyRegion(detached);
 })};
 assert.equal(report.detached,null);assert.ok(report.out.some(r=>r.kind==='content'));assert.ok(report.out.some(r=>r.kind==='composition'));assert.ok(report.out.some(r=>r.kind==='media-stage'));
 for(const r of report.out){assert.deepEqual(r.before,r.after,'layout-unit bounds do not change with zoom');assert.ok(r.before.height>0);if(r.kind!=='composition')assert.equal(r.rows,null,'no pitch inferred for generic content');}
 const census=await page.evaluate(async()=>{
  const counts={};
  const host=document.createElement('div');host.style.cssText='position:relative;width:1280px;height:960px';document.body.appendChild(host);
  for(const spec of SF.LESSONS){const d=SF.buildLesson(spec.key);for(const [i,s] of d.slides.entries()){
   const before=JSON.stringify(s),root=SF.renderSlide(d,s,{index:i,total:d.slides.length});host.replaceChildren(root);
   await new Promise(requestAnimationFrame);
   const frame=SF.measureBodyRegion(root);if(!frame)throw Error('Missing attached body '+spec.key+'/'+i);
   if(JSON.stringify(s)!==before)throw Error('Mutated slide');counts[frame.kind]=(counts[frame.kind]||0)+1;
  }}host.remove();return counts;
 });assert.equal(Object.values(census).reduce((a,b)=>a+b,0),520);assert.equal(census.composition,35);
 await page.locator('#playground').scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/modular-body-regions.png'});assert.deepEqual(errors,[]);console.log('Body frames passed: '+JSON.stringify(census)+'; mounted lab, scale invariance, no inferred generic pitch.');
}finally{await browser.close();await harness.stop(relay);fs.rmSync(dir,{recursive:true,force:true});}
