import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch();
try {
 const page=await browser.newPage({viewport:{width:1700,height:1100}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto((process.env.SF_BASE_URL||'http://localhost:8787')+'/modular-canvas/preview.html');
 const settled=()=>page.waitForFunction(()=>{const n=document.querySelector('#safe-deck .safe-status');return !!n&&n.textContent!==''&&n.textContent!=='Measuring…';});
 for(let i=0;i<9;i++){
  await page.selectOption('#safe-slide',String(i));await settled();
  assert.equal(await page.locator('#safe-deck .safe-status').getAttribute('data-fits'),'true',`slide ${i+1}`);
  assert.ok(await page.locator('#safe-deck .safe-slot').count()>=2);
  if(i>0&&i<8)assert.equal(await page.locator('#safe-deck .safe-stage .pagenum').innerText(),`${i} / 7`);
 }
 await page.check('#safe-audience');assert.equal(await page.locator('#safe-slide option').count(),7);
 assert.equal(await page.locator('#safe-slide').inputValue(),'1');
 await settled();
 await page.locator('#safe-deck .safe-stage [data-content-key="title"][contenteditable]').fill('A very long headline that will not fit. '.repeat(20));await settled();
 assert.equal(await page.locator('#safe-deck .safe-status').getAttribute('data-fits'),'false');
 await page.click('#safe-reset');await settled();assert.equal(await page.locator('#safe-deck .safe-status').getAttribute('data-fits'),'true');
 await page.check('#safe-original');await settled();assert.equal(await page.locator('#safe-deck .safe-slot').count(),0);
 await page.uncheck('#safe-original');await settled();assert.equal(await page.locator('#safe-deck .safe-slot').count(),4);
 // Compound fields must keep their siblings and canonical tab order.
 await page.selectOption('#safe-slide','3');await settled();
 await page.locator('#safe-deck .safe-stage .cp-choice h3').first().fill('Edited option');
 await page.locator('#safe-deck .safe-stage .cp-choice p').first().fill('Edited explanation');
 await page.selectOption('#safe-slide','5');await settled();
 await page.locator('#safe-deck .safe-stage .cp-risk-number').first().fill('Risk X');
 await page.locator('#safe-deck .safe-stage .cp-risk h3').first().fill('Edited risk');
 await page.selectOption('#safe-slide','1');await settled();
 const title=page.locator('#safe-deck .safe-stage h1[contenteditable]');
 await title.focus();await title.fill('Cancelled wording');await title.press('Escape');
 assert.equal(await title.innerText(),'Would you tell an AI your secret?');
 await page.locator('#safe-deck .safe-stage .cp-tagline').fill('');
 await page.selectOption('#safe-slide','2');await settled();await page.selectOption('#safe-slide','1');await settled();
 assert.equal(await page.locator('#safe-deck .safe-stage .cp-tagline[contenteditable]').innerText(),'');
 await page.locator('#safe-deck .safe-stage .cp-tagline').fill('Your AI. Your choices.');
 // Chrome is editable, so overflowing it must fail the fit check like a slot does.
 await page.selectOption('#safe-slide','5');await settled();
 const beat=page.locator('#safe-deck .safe-stage [data-content-key="subtitle"]');
 await beat.fill('A message you would never say out loud to anyone at all, not even the people you trust the most, because once it is written down it stops being yours');
 await page.waitForFunction(()=>document.querySelector('#safe-deck .safe-status').dataset.fits==='false');
 assert.match(await page.locator('#safe-deck .safe-status').innerText(),/Header band/);
 await beat.fill('A message you would never say out loud');
 await page.waitForFunction(()=>document.querySelector('#safe-deck .safe-status').dataset.fits==='true');
 await page.selectOption('#safe-slide','1');await settled();
 const download=page.waitForEvent('download');await page.click('#safe-download');const file=await download;await file.saveAs('/tmp/aiad27-safe-slot-mock.json');
 const fs=await import('node:fs/promises');const saved=JSON.parse(await fs.readFile('/tmp/aiad27-safe-slot-mock.json','utf8'));
 assert.equal(saved.deck.slides[3].bullets[0],'Edited option\tEdited explanation');assert.match(saved.deck.slides[5].bullets[0],/^Edited risk\tRisk X\t/);
 assert.equal(saved.deck.slides.length,9);assert.equal(saved.deck.slides.filter(s=>!s.hidden).length,7);assert.equal(saved.recipes.cards[1][1],'Voting block');
 await page.uncheck('#safe-grid');
 for(const i of [1,3,5,7]){await page.selectOption('#safe-slide',String(i));await settled();await page.locator('#safe-deck .safe-stage').screenshot({path:`/tmp/safe-slot-${i+1}.png`});}
 assert.deepEqual(errors,[]);console.log('Safe mock: 9 slides fit; 7 audience slides; numbering, slot and chrome-band overflow, reset, comparison and snapshot verified.');
} finally { await browser.close(); }
