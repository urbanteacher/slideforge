#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import harness from '../../tests/harness.js';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-mindmap-'));
const port = await harness.freePort();
const relay = await harness.start(port, dir);
const browser = await chromium.launch({ headless: true });
try {
 const page = await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${port}/?lesson=ipdv-intro`);
 await page.waitForFunction(()=>window.SF?.Editor?.deck());
 assert.equal(await page.locator('#previewBox .slide-date').textContent(),'14 September 2026');
 /* Through Header & footer, which is where the date lives now. It was in the
    Edit pane until the date became a furniture kind that can also sit in a
    slot — one control for one value, wherever it is printed — so the test has
    to open that pane rather than expecting the field beside the heading. */
 await page.locator('#btnHeaderFooter').click();
 await page.getByLabel('Slide date',{exact:true}).waitFor({timeout:10000});
 await page.getByLabel('Slide date',{exact:true}).fill('2026-09-15');
 await page.getByLabel('Slide date',{exact:true}).press('Tab');
 assert.equal(await page.locator('#previewBox .slide-date').textContent(),'15 September 2026');
 await page.evaluate(()=>{const d=SF.Editor.deck();SF.Editor.selectSlide(d.slides[1].id);SF.Editor.workspace.draw();});
 assert.equal(await page.locator('#previewBox .lecturer-copy h1').textContent(),'Mark Martin');
 await page.locator('#inspector input[type=file]').setInputFiles('assets/brand/nu-london-logo.png');
 await page.waitForFunction(()=>SF.Editor.deck().slides[1].image.startsWith('data:'));
 assert.equal(await page.locator('#previewBox .lecturer-portrait img').count(),1);
 await page.evaluate(()=>{const d=SF.Editor.deck();SF.Editor.selectSlide(d.slides.find(s=>s.type==='mindmap').id);SF.Editor.workspace.draw();});
 assert.equal(await page.locator('#previewBox .mindmap-node').count(),6);
 const first = page.locator('#inspector .kw-term-input').first();
 await first.fill('Find patterns');
 assert.equal(await page.locator('#previewBox .mindmap-node strong').first().textContent(),'Find patterns');
 await page.evaluate(()=>SF.Editor.workspace.play());
 const before = await page.locator('#player .mindmap-branch.step').count(); assert.equal(before,6);
 await page.evaluate(()=>SF.Player.next());
 assert.equal(await page.evaluate(()=>SF.Player.idx),6);
 await page.evaluate(()=>{for(let i=0;i<5;i++)SF.Player.next();});
 await page.waitForFunction(()=>Array.from(document.querySelectorAll('#player .slide')).every(n=>getComputedStyle(n).opacity==='1'));
 await page.locator('#player .slide').screenshot({path:'/tmp/sf-mindmap-preview.png'});
 const overflow = await page.locator('#player .mindmap-node, #player .mindmap-centre').evaluateAll(nodes=>nodes.some(n=>n.scrollHeight>n.clientHeight+2||n.scrollWidth>n.clientWidth+2));
 assert.equal(overflow,false);
 await page.evaluate(()=>SF.Player.close());
 await page.reload();
 assert.equal(await page.evaluate(()=>SF.Editor.deck().slides.find(s=>s.type==='mindmap').bullets[0].startsWith('Find patterns')),true);
 assert.deepEqual(errors,[]);
 console.log('PASS: date editing, headshot upload, branch editing, six reveal steps, reload persistence, no overflow or browser errors');
} finally {await browser.close();await harness.stop(relay);fs.rmSync(dir,{recursive:true,force:true});}
