/* Manifest integration: run with npm start. No pixel baselines are rewritten. */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser=await chromium.launch();
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}}), errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.SLIDEFORGE_URL||'http://localhost:8787');
 await page.waitForFunction(()=>window.SF?.Editor?.deck());
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
 // The same decision must reach the editor preview and live player.
 await page.evaluate(()=>{const d=SF.makeDeck('Theme manifest review');d.theme='aiad27-safe';d.logo='assets/brand/aiad27/aiad27-lockup.svg';d.logoOn='all';d.slides=[SF.normalizeSlide({type:'quote',body:'A human decision'})];SF.Store.save(d);SF.Editor.openDeck(d.id);});
 assert.ok(await page.locator('#preview .slide[data-ground="dark"]').count() || await page.locator('.slide[data-slide-id][data-ground="dark"]').count());
 await page.evaluate(()=>SF.Player.start(SF.Editor.deck(),0,{fullscreen:false}));
 await page.waitForSelector('#player .slide[data-ground="dark"]');
 await page.waitForFunction(()=>{const n=document.querySelector('#player .slide[data-ground=dark]');return n&&Number(getComputedStyle(n).opacity)>.99;});
 await page.locator('#player .slide[data-ground=dark]').screenshot({path:'/tmp/slideforge-manifest-player.png',animations:'disabled'});
 await page.evaluate(()=>SF.Player.close());
 const [print]=await Promise.all([page.context().waitForEvent('page'),page.evaluate(()=>SF.Print.open(SF.Editor.deck()))]);
 await print.waitForSelector('.pdf-page .slide[data-ground="dark"]');
 await print.emulateMedia({media:'print'});
 const printed=await print.locator('.pdf-page .slide').first().evaluate(root=>({background:getComputedStyle(root).backgroundColor,logo:getComputedStyle(root.querySelector('.slide-logo img')).filter}));
 assert.equal(printed.background,'rgb(255, 255, 255)');assert.equal(printed.logo,'none');
 await print.screenshot({path:'/tmp/slideforge-manifest-print.png'});
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({...result,surfaces:['editor','player','handout/print'],screenshots:'/tmp/slideforge-manifest-*.png'},null,2));
} finally {await browser.close();}
