/* Visual and behavioural audit for reusable compositions and refreshed demos.
   Run with the server: npm start; node tools/smoke-design-foundations.mjs
   Screenshots are review artifacts, not pixel baselines. */
import { chromium } from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const url=process.env.SLIDEFORGE_URL||'http://localhost:8787';
const out=process.env.DESIGN_REVIEW_OUT||'/tmp/slideforge-design-review';
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:1280,height:720}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(url);await page.waitForFunction(()=>window.SF?.LESSONS&&window.SF?.renderSlide);
const keys=['vibe-product','vibe-editorial','vibe-cinematic','vibe-studio-teach','vibe-brutal','pace-nul','motion-lab'];
const decks=await page.evaluate(keys=>keys.map(k=>SF.buildLesson(k)),keys);
await page.addStyleTag({content:'#designStage *,#designStage *::before,#designStage *::after{animation:none!important;transition:none!important}'});
async function inspect(deck,slide){
 return page.evaluate(async({deck,slide})=>{
  let stage=document.querySelector('#designStage');if(!stage){stage=document.createElement('div');stage.id='designStage';Object.assign(stage.style,{position:'fixed',inset:'0',width:'1280px',height:'720px',zIndex:'999999'});document.body.append(stage)}
  const root=SF.renderSlide(deck,slide,{interactive:false,revealed:99});stage.replaceChildren(root);await document.fonts.ready;
  await Promise.all([...root.querySelectorAll('img')].map(i=>i.decode().catch(()=>{})));
  const box=root.getBoundingClientRect(),bad=[];
  const walk=document.createTreeWalker(root.querySelector('.pad'),NodeFilter.SHOW_TEXT);
  while(walk.nextNode()){const t=walk.currentNode;if(!t.textContent.trim()||t.parentElement.closest('[aria-hidden="true"],.sr-only,iframe'))continue;
    const range=document.createRange();range.selectNodeContents(t);const r=range.getBoundingClientRect();if(!r.width||!r.height)continue;
    if(r.left<box.left-3||r.top<box.top-3||r.right>box.right+3||r.bottom>box.bottom+3)bad.push(t.textContent.slice(0,70));
  }
  const pad=root.querySelector('.pad');return{bad:[...new Set(bad)],scroll:pad.scrollHeight>pad.clientHeight+4||pad.scrollWidth>pad.clientWidth+4,composition:root.dataset.composition||'',steps:root.querySelectorAll('.step').length};
 },{deck,slide});
}
let count=0;const failures=[];
try{
 for(let d=0;d<decks.length;d++){
  const deck=decks[d];fs.mkdirSync(`${out}/${keys[d]}`,{recursive:true});
  for(let i=0;i<deck.slides.length;i++){
   const slide=deck.slides[i],r=await inspect(deck,slide);count++;
   if(r.bad.length||r.scroll)failures.push({deck:keys[d],slide:i+1,type:slide.type,...r});
   await page.locator('#designStage .slide').screenshot({path:`${out}/${keys[d]}/${String(i+1).padStart(2,'0')}.png`});
  }
 }
 const matrix=await page.evaluate(()=>{
  const cases=[['title','poster'],['title','editorial'],['statement','frame'],['title','sidecar'],['content','rail'],['content','columns']];
  return Object.keys(SF.THEMES).flatMap(theme=>cases.map(([type,c])=>({deck:{theme,aspect:'16:9'},slide:SF.normalizeSlide({type,title:'Make room for the idea',body:'Make room for the idea',subtitle:'A composition you can reuse with any theme.',bullets:['Name the question.','Show the relevant evidence.','Choose the next step.'],design:{composition:c},progressive:type==='content'})})));
 });
 for(const {deck,slide} of matrix){const r=await inspect(deck,slide);count++;if(r.bad.length||r.scroll)failures.push({theme:deck.theme,type:slide.type,...r});assert.equal(r.composition,slide.design.composition);if(slide.progressive)assert.equal(r.steps,3);}
 const structured=await page.evaluate(()=>Object.entries(SF.COMPOSITIONS).filter(([,c])=>c.structured).flatMap(([key,c])=>Object.keys(SF.THEMES).map(theme=>({deck:{theme,aspect:'16:9'},slide:SF.normalizeSlide({type:c.types[0],title:'Make room for the idea',body:'A choice worth discussing.',subtitle:['compare','spectrum'].includes(c.types[0])?'Before | After':'Keep the human in the loop',bullets:['First | 20 | A useful detail','Second | 70 | Another detail','Third | 40 | The final detail'],design:{composition:key},progressive:!['title','quote','statement','keyfact'].includes(c.types[0])})}))));
 for(const {deck,slide} of structured){const r=await inspect(deck,slide);count++;if(r.bad.length||r.scroll)failures.push({theme:deck.theme,type:slide.type,...r});assert.equal(r.composition,slide.design.composition);if(slide.progressive)assert.equal(r.steps,3);}
 const editing=await page.evaluate(()=>{
  const failures=[];
  Object.entries(SF.COMPOSITIONS).filter(([,c])=>c.structured).forEach(([key,c])=>{
   const s=SF.normalizeSlide({type:c.types[0],title:'Example',body:'Authored body',subtitle:'Authored subtitle',bullets:['First | 20 | Note','Second | 70 | Detail'],progressive:true,design:{composition:key}});
   const deck={theme:'aiad27-safe',logo:'assets/brand/aiad27/aiad27-lockup.svg',logoOn:'all',showSlideNumbers:true};
   const root=SF.renderSlide(deck,s,{index:1,total:3,revealed:0});document.querySelector('#designStage').replaceChildren(root);
   const keys=[...root.querySelectorAll('[data-content-key]')].map(n=>n.dataset.contentKey);
   if(!keys.includes('subtitle'))failures.push(key+': missing editable subtitle');
   if(['cards','journey','keyfact','compare','iceberg','sourcecheck','spectrum'].includes(s.type)) for(let i=0;i<2;i++)if(!keys.includes('bullets.'+i))failures.push(key+': missing editable bullet');
   if(s.type!=='title'&&root.querySelectorAll('.pagenum').length!==1)failures.push(key+': page number');
   for(const cls of ['.slide-logo','.track']){const n=root.querySelector(cls);if(!n||getComputedStyle(n).display==='none')failures.push(key+': hidden '+cls);}
   s.design.composition='none';if(SF.slideComposition(deck,s)!=='')failures.push(key+': opt out');
  });
  return failures;
 });
 assert.deepEqual(editing,[]);
 const controls=await page.evaluate(async()=>{
  const host=document.querySelector('#designStage'),deck={theme:'aiad27-safe'};
  const s=SF.normalizeSlide({type:'title',title:'A choice',subtitle:'Context',date:'2027-03-01',body:'Supporting copy',design:{composition:'poster-art'}});
  let root=SF.renderSlide(deck,s);host.replaceChildren(root);await document.fonts.ready;
  const initial=parseFloat(getComputedStyle(root.querySelector('h1')).fontSize);
  s.design.size='small';s.design.align='right';root=SF.renderSlide(deck,s);host.replaceChildren(root);
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  const small=parseFloat(getComputedStyle(root.querySelector('h1')).fontSize);
  const aligned=getComputedStyle(root.querySelector('h1')).textAlign;
  const date=root.querySelector('time')?.dateTime;
  const q=SF.normalizeSlide({type:'quote',body:'First line\nSecond line',progressive:true,design:{composition:'voice'}});
  root=SF.renderSlide(deck,q);const quoteKeys=root.querySelectorAll('.step[data-content-key="body"]').length;
  const c=SF.normalizeSlide({type:'compare',bullets:['Left | Right | Row name'],design:{composition:'comparison'}});
  root=SF.renderSlide(deck,c);const cells=[...root.querySelectorAll('.cp-compare-row p')].map(n=>n.textContent);
  return{scales:small<initial,aligned,date,quoteKeys,cells};
 });
 assert.deepEqual(controls,{scales:true,aligned:'right',date:'2027-03-01',quoteKeys:2,cells:['Row name','Left','Right']});

 const inspector=await page.evaluate(()=>{
  const checks=[];
  for(const type of ['title','cards']){
   const d=SF.makeDeck('Composition inspector check');d.theme='aiad27-safe';d.slides=[SF.makeSlide(type)];SF.Store.save(d);SF.Editor.openDeck(d.id);
   const label=[...document.querySelectorAll('#inspector label')].find(n=>n.textContent===(type==='title'?'Supporting line':'Voting instruction'));
   const input=label?.control;if(!input)throw Error('Missing composition content field '+type);
   input.value='Editable supporting copy';input.dispatchEvent(new Event('input',{bubbles:true}));
   checks.push(SF.Editor.deck().slides[0].body==='Editable supporting copy');
   const look=[...document.querySelectorAll('#inspector [role="tab"]')].find(n=>n.textContent.includes('Look'));look.click();
   const compositionLabel=[...document.querySelectorAll('#inspector label')].find(n=>n.textContent==='Composition');
   const select=compositionLabel?.control;if(!select)throw Error('Missing composition control');
   select.value='none';select.dispatchEvent(new Event('change',{bubbles:true}));
   checks.push(SF.Editor.deck().slides[0].design.composition==='none');
  }
  return checks;
 });
 assert.deepEqual(inspector,[true,true,true,true]);
 // A stale composition must not leak onto a different slide type; campaign
 // compositions keep their own contract. Settings survive the JSON round trip.
 const contract=await page.evaluate(()=>{const slide=SF.normalizeSlide(JSON.parse(JSON.stringify({type:'title',title:'Example',design:{composition:'poster'}})));return{saved:slide.design.composition,unsupported:SF.compositionOptions({type:'chart'},'product').length,campaign:SF.compositionOptions({type:'title'},'aiad27-safe').length}});
 assert.deepEqual(contract,{saved:'poster',unsupported:0,campaign:5});assert.deepEqual(errors,[]);
 console.log(JSON.stringify({checked:count,failures,screenshots:out},null,2));
 if(failures.length)process.exitCode=1;
}finally{await browser.close()}
