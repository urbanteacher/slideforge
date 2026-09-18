/* Export through the real handout flow in an isolated browser profile.
   Usage: node tools/export-teaching-pdf.mjs [lesson-key] [output.pdf] */
import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
const lesson=process.argv[2]||'ipdv-vc';
const output=path.resolve(process.argv[3]||'output/pdf/Week_2_Visual_Communication_Teaching.pdf');
await fs.mkdir(path.dirname(output),{recursive:true});
const browser=await chromium.launch();
try{
 const context=await browser.newContext({viewport:{width:1400,height:900},reducedMotion:'reduce'});
 const page=await context.newPage(),errors=[];
 context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8787/');
 await page.waitForFunction(()=>window.SF?.Print&&window.SF?.Experiments);
 const startupErrors=errors.splice(0);
 const popupEvent=context.waitForEvent('page');
 await page.evaluate(key=>{if(!SF.LESSONS.some(l=>l.key===key))throw Error('Unknown lesson: '+key);window.exportDeck=SF.buildLesson(key);SF.Print.open(exportDeck);},lesson);
 const preview=await popupEvent;
 await preview.waitForFunction(()=>document.documentElement.dataset.pdfReady,{},{timeout:30000});
 const audit=await preview.evaluate(()=>({
  ready:document.documentElement.dataset.pdfReady,
  pages:document.querySelectorAll('.pdf-page').length,
  experiments:document.querySelectorAll('.teaching-sheet').length,
  svgCharts:document.querySelectorAll('.teaching-state svg').length,
  overflow:Array.from(document.querySelectorAll('.teaching-sheet')).flatMap(sheet=>{
   const page=sheet.closest('.pdf-page'),box=page.getBoundingClientRect();
   return Array.from(sheet.querySelectorAll('h1,h2,p,.teaching-facts')).filter(el=>{const r=el.getBoundingClientRect();return r.bottom>box.bottom-25||r.right>box.right||r.left<box.left;}).map(el=>({page:Array.from(document.querySelectorAll('.pdf-page')).indexOf(page)+1,text:el.textContent}));
  })
 }));
 if(audit.ready!=='true'||audit.overflow.length||errors.length)throw Error(JSON.stringify({audit,errors}));
 await preview.pdf({path:output,preferCSSPageSize:true,printBackground:true,tagged:true,outline:true});
 await fs.mkdir('tmp/pdfs',{recursive:true});
 await fs.writeFile('tmp/pdfs/export-audit.json',JSON.stringify({...audit,errors,startupErrors,output},null,2));
 console.log(JSON.stringify({...audit,errors,startupErrors,output}));
}finally{await browser.close();}
