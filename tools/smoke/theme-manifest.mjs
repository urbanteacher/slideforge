/* Manifest integration: run with npm start. No pixel baselines are rewritten.
 * The deck goes straight to the player and the handout: the classic editor
 * that used to open it first went with the classic studios. */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser=await chromium.launch();
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}}), errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.SLIDEFORGE_URL||'http://localhost:8787');
 await page.waitForFunction(()=>window.SF?.renderSlide);
 const result=await page.evaluate(()=>{
  const host=document.createElement('div');document.body.append(host);
  const failures=[];let checked=0;
  for(const [key,theme] of Object.entries(SF.THEMES))for(const type of ['title','section','quote','journey','content','chart','code','statement']){
   const deck={theme:key,title:'Course <em>literal</em>',org:'Example College',logo:'assets/brand/aiad27/aiad27-lockup.svg',logoOn:'all'};
   const s=SF.normalizeSlide({type,title:'Readable on every surface',body:'A human decision',subtitle:'Context',bullets:['First | 20 | Detail','Second | 70 | Detail']});
   const root=SF.renderSlide(deck,s,{index:0,total:2});host.replaceChildren(root);checked++;
   const expected=SF.themeGround(key,type);
   if(root.dataset.ground!==expected)failures.push(key+'/'+type+': ground');
   const spec=theme.art,eligible=!!spec?.layouts.includes(type),art=root.querySelector(':scope > .theme-art');
   if(!!art!==eligible)failures.push(key+'/'+type+': art eligibility');
   if(art){
    if(art.getAttribute('aria-hidden')!=='true')failures.push(key+'/'+type+': decorative art');
    if(spec.eyebrow){const eyebrow=art.querySelector('.'+spec.eyebrow.className);if(eyebrow?.textContent!==(type==='title'?deck.title:deck.org)||eyebrow?.children.length)failures.push(key+'/'+type+': unsafe or missing eyebrow');}
   }
   const logo=root.querySelector('.slide-logo img');
   if(logo&&expected==='dark'&&!getComputedStyle(logo).filter.includes('invert(1)'))failures.push(key+'/'+type+': logo not reversed');
   if(key==='northeastern'||key.startsWith('aiad27-')){
    const rgb=getComputedStyle(root).backgroundColor.match(/[\d.]+/g).slice(0,3).map(Number);
    const dark=rgb.every(v=>v<100);
    // NUL's red section is dark in luminance despite its strong red channel.
    if((dark||key==='northeastern'&&type==='section')!==(expected==='dark'))failures.push(key+'/'+type+': declared ground differs from paint');
   }
  }
  for(const reverse of ['never','always']){
   const root=SF.renderSlide({theme:'aiad27-safe',logo:'assets/brand/aiad27/aiad27-lockup.svg',logoOn:'all',logoReverse:reverse},SF.normalizeSlide({type:'quote',body:'Hello'}));host.replaceChildren(root);
   if(getComputedStyle(root.querySelector('.slide-logo img')).filter.includes('invert(1)')!==(reverse==='always'))failures.push('logo override '+reverse);
  }
  for(const theme of ['product','editorial','northeastern']){
   const root=SF.renderSlide({theme},SF.normalizeSlide({type:'title',title:'An idea',design:{composition:'poster'}}));host.replaceChildren(root);
   if(getComputedStyle(root.querySelector('.theme-art')).display!=='none')failures.push(theme+': composition art collision');
  }
  // Theme tokens must reach both adaptive cover sizes and structured headings.
  for(const [type,composition,token,selector] of [
    ['title','poster','--composition-display-short','h1'],
    ['sourcecheck','credits','--composition-heading','.cp-heading']
  ]){
   const root=SF.renderSlide({theme:'aiad27-safe'},SF.normalizeSlide({type,title:'An idea',design:{composition}}));host.replaceChildren(root);
   root.style.setProperty(token,'77px');
   if(getComputedStyle(root.querySelector(selector)).fontSize!=='77px')failures.push(type+': theme type token ignored');
  }
  for(const theme of [undefined,'retired']){
   const root=SF.renderSlide({theme},SF.normalizeSlide({type:'title',title:'House theme'}));host.replaceChildren(root);
   if(!root.classList.contains('theme-'+SF.DEFAULT_THEME)||!root.querySelector('.studio-art'))failures.push('inconsistent fallback theme/art');
  }
  host.remove();return{checked,failures};
 });
 assert.deepEqual(result.failures,[]);
 // The handout is the studio's now (lab/src/export/handout.ts): each page is a picture of the slide as the studio
 // draws it, so the classic print's dark-to-white check (js/print.js, gone) has nothing to check.
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({...result,surfaces:['slides'],screenshots:'/tmp/slideforge-manifest-*.png'},null,2));
} finally {await browser.close();}
