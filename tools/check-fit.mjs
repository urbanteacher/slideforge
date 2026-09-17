#!/usr/bin/env node
/* General deck fit check. Uses the same SF.Review.check as Look → Review.
 * node tools/check-fit.mjs deck.json [another-bundle.json]
 * node tools/check-fit.mjs --lesson motion-lab --lesson pace-nul
 * npm start must be running, or set SLIDEFORGE_URL.
 */
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';

export async function checkDeckFiles({files=[],lessons=[],url=process.env.SLIDEFORGE_URL||'http://localhost:8787',visibleOnly=false}={}){
 if(!files.length&&!lessons.length)throw Error('Supply a deck/bundle JSON file or --lesson <library-key>.');
 const sources=files.map(file=>({name:path.basename(file),value:JSON.parse(fs.readFileSync(file,'utf8'))}));
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage({viewport:{width:1280,height:960}});
  const response=await page.goto(url,{timeout:30000});
  if(!response?.ok())throw Error(`Could not load ${url}. Start the server with npm start.`);
  await page.waitForFunction(()=>window.SF?.Review?.check);
  const decks=await page.evaluate(({sources,lessons})=>{
   const out=sources.flatMap(source=>SF.Review.readDecks(source.value).map(deck=>({source:source.name,deck})));
   for(const key of lessons){
    if(!SF.LESSONS.some(lesson=>lesson.key===key))throw Error('Unknown library lesson: '+key);
    out.push({source:key,deck:SF.buildLesson(key)});
   }
   return out;
  },{sources,lessons});
  const reports=[];
  for(const {source,deck} of decks)for(let index=0;index<deck.slides.length;index++){
   const slide=deck.slides[index];if(visibleOnly&&slide.hidden)continue;
   const result=await page.evaluate(({deck,slide,index})=>SF.Review.check(deck,slide,index),{deck,slide,index});
   reports.push({source,deck:deck.title,slide:index+1,type:slide.type,hidden:!!slide.hidden,...result});
  }
  if(!reports.length)throw Error('No slides to check. Include hidden slides or choose another deck.');
  return {checked:reports.length,failures:reports.filter(r=>!r.fits),unavailableImages:reports.reduce((n,r)=>n+r.unavailableImages,0),reports};
 }finally{await browser.close();}
}
export async function main(args=process.argv.slice(2)){
 const options={files:[],lessons:[],visibleOnly:false};let json=false;
 for(let i=0;i<args.length;i++){
  const arg=args[i];
  if(arg==='--help'){console.log('Usage: node tools/check-fit.mjs <deck-or-bundle.json>... [--lesson <key>] [--visible-only] [--json]\nAll hidden slides are checked by default. Requires npm start or SLIDEFORGE_URL.');return;}
  if(arg==='--lesson'){if(!args[i+1]||args[i+1].startsWith('--'))throw Error('--lesson needs a library key.');options.lessons.push(args[++i]);}
  else if(arg==='--json')json=true;
  else if(arg==='--visible-only')options.visibleOnly=true;
  else if(arg.startsWith('--'))throw Error('Unknown option: '+arg);
  else options.files.push(arg);
 }
 const result=await checkDeckFiles(options);
 if(json)console.log(JSON.stringify(result,null,2));
 else{
  console.log(`${result.checked} slides checked — ${result.failures.length} with overflow; ${result.unavailableImages} unavailable images.`);
  for(const f of result.failures)console.log(`${f.deck} · slide ${f.slide} (${f.type}${f.hidden?', hidden':''}, ${f.width}×${f.height}): ${f.over.map(o=>o.text+' — '+o.past+'px past edge').join('; ')||'Content exceeds its area'}`);
  console.log('Boundary checks only. Inspect overlap, contrast and motion separately.');
 }
 process.exitCode=result.failures.length||result.unavailableImages?1:0;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){main().catch(e=>{console.error(e.message);process.exitCode=1;});}
