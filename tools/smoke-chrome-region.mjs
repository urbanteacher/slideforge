import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {chromium} from 'playwright';
import harness from '../tests/harness.js';
/* The generic chrome region: one declaration for where a slide's furniture
 * lives, so the layouts stop each deciding it.
 *
 * Before the tokens existed, the mark's top was 24, 26, 28, 30 or 36 across
 * the Library and its right edge 28, 34, 40 or 48 — set in five places, three
 * of them on .slide-logo alone, which left the page number behind at the
 * default inset. On a title slide the mark sat 48px in and the number 40px in.
 *
 * The visual baselines cannot catch any of this: tools/visual-regression.mjs
 * builds its decks without a logo or showSlideNumbers and renders without an
 * index, so no baseline contains a mark or a number at all. This is the check
 * that does.
 */
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sf-chrome-rgn-')),port=await harness.freePort();
const relay=await harness.start(port,dir),browser=await chromium.launch();
try {
 const page=await browser.newPage({viewport:{width:1400,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${port}`);
 await page.waitForFunction(()=>window.SF?.buildLesson&&window.SF?.renderSlide);

 const seen=await page.evaluate(()=>{
  const rows=[];
  for(const lesson of SF.LESSONS){
   const d=SF.buildLesson(lesson.key); if(!d?.slides) continue;
   for(let i=0;i<d.slides.length;i++){
    const s=d.slides[i];
    const root=SF.renderSlide(d,s,{index:i,total:d.slides.length});
    Object.assign(root.style,{position:'absolute',left:'-4000px',top:'0',transform:'none'});
    document.body.appendChild(root);
    const rr=root.getBoundingClientRect();
    const logo=root.querySelector('.slide-logo'), num=root.querySelector('.pagenum');
    const inFooter=!!(num&&num.closest('.cp-footer'));
    if(logo&&num&&!inFooter){
     rows.push({deck:lesson.key,type:s.type,campaign:root.classList.contains('cp'),
       clock:root.classList.contains('has-clock'),
       markRight:Math.round(rr.right-logo.getBoundingClientRect().right),
       numRight:Math.round(rr.right-num.getBoundingClientRect().right),
       markTop:Math.round(logo.getBoundingClientRect().top-rr.top)});
    }
    root.remove();
   }
  }
  return rows;
 });

 assert.ok(seen.length>250,`only ${seen.length} slides carried both a mark and a number`);

 /* 1. Within a slide, the mark and the number share one right edge. The clock
       is the one exception: it takes the top corner, so the mark steps aside
       and the number stays where it is. */
 const misaligned=seen.filter(r=>!r.clock&&r.markRight!==r.numRight);
 assert.deepEqual(misaligned.slice(0,5),[],
  `mark and page number on different right edges: ${misaligned.length} of ${seen.length} slides`);

 /* 2. The insets are a small declared set, not a spread. Every value here is
       a region override in CSS; a new number appearing means someone set
       top/right on .slide-logo again instead of moving the region. */
 const insets=[...new Set(seen.filter(r=>!r.clock&&!r.campaign).map(r=>r.markTop+'/'+r.markRight))].sort();
 assert.deepEqual(insets,['24/28','28/40','36/48'],
  `generic chrome insets drifted: ${insets.join(' ')}`);

 /* 3. The campaign keeps its own edge, and keeps it everywhere. */
 const campaign=[...new Set(seen.filter(r=>r.campaign).map(r=>r.markTop+'/'+r.markRight))];
 assert.ok(campaign.length<=1,`campaign chrome is no longer uniform: ${campaign.join(' ')}`);

 assert.deepEqual(errors,[]);
 console.log(`Chrome region passed: ${seen.length} slides carry a mark and a number; ` +
  `${insets.length} declared generic insets (${insets.join(', ')}), right edges aligned on all but the clock.`);
}finally{await browser.close();await harness.stop(relay);fs.rmSync(dir,{recursive:true,force:true});}
