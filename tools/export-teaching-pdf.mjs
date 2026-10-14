/* Export a lesson's teacher copy through the app's own route, in an isolated browser profile: the lesson opened in
   the studio, then the studio's handout (lab/src/export/handout.ts, the page Export → PDF handout opens) as the
   teacher copy: every shown slide fully built, the answer slides included, each slide's notes under it. One route,
   so this PDF and the one a teacher saves from the app are the same pages.
   Usage: node tools/export-teaching-pdf.mjs [lesson-key] [output.pdf]   (needs the server: npm start) */
import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import {handoutPage, openInStudio} from './smoke/lib/handout.mjs';
const lesson=process.argv[2]||'ipdv-vc';
const output=path.resolve(process.argv[3]||'output/pdf/Week_2_Visual_Communication_Teaching.pdf');
const base=process.env.SLIDEFORGE_URL||'http://127.0.0.1:8787';
await fs.mkdir(path.dirname(output),{recursive:true});
const browser=await chromium.launch();
try{
 const context=await browser.newContext({viewport:{width:1400,height:900},reducedMotion:'reduce'});
 const page=await context.newPage(),errors=[];
 context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/');
 await page.waitForFunction(()=>window.SF?.LESSONS&&window.SF?.LabEngine);
 const startupErrors=errors.splice(0);
 await page.evaluate(key=>{if(!SF.LESSONS.some(l=>l.key===key))throw Error('Unknown lesson: '+key);},lesson);
 await openInStudio(page,lesson);
 const doc=await handoutPage(page,{teacher:true});
 const audit=await doc.evaluate(()=>{
  const pages=[...document.querySelectorAll('section.page')];
  return{
   pages:pages.length,
   pictures:pages.filter(p=>p.querySelector('img')?.naturalWidth).length,
   noted:pages.filter(p=>p.querySelector('.notes')).length
  };
 });
 /* Printed, the notes are cut to fit under their slide: say which pages lost words, so they can be shortened. */
 await doc.emulateMedia({media:'print'});
 audit.clipped=await doc.evaluate(()=>[...document.querySelectorAll('section.page')].map((p,i)=>{const n=p.querySelector('.notes');return n&&n.scrollHeight>n.clientHeight+2?{page:i+1,slide:p.querySelector('img')?.alt||''}:null;}).filter(Boolean));
 if(audit.pictures!==audit.pages||errors.length)throw Error(JSON.stringify({audit,errors}));
 await doc.pdf({path:output,preferCSSPageSize:true,printBackground:true,tagged:true,outline:true});
 await fs.mkdir('tmp/pdfs',{recursive:true});
 await fs.writeFile('tmp/pdfs/export-audit.json',JSON.stringify({...audit,errors,startupErrors,output},null,2));
 if(audit.clipped.length)console.warn(`${audit.clipped.length} page(s) have notes longer than fit under the slide: ${audit.clipped.map(c=>c.page).join(', ')}`);
 console.log(JSON.stringify({pages:audit.pages,noted:audit.noted,clipped:audit.clipped.length,output}));
}finally{await browser.close();}
