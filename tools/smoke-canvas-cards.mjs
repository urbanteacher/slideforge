import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {chromium} from 'playwright';
import harness from '../tests/harness.js';
/* Card canvas gestures. A card's position is a bullet INDEX, not a coordinate,
 * so every gesture here has to end in a reordered bullets array on the saved
 * deck — not merely a rearranged preview. The divider next door once moved
 * correctly on screen and committed nothing, because its commit resolved to a
 * neighbouring function; these assertions read SF.Editor.deck() rather than
 * the DOM for exactly that reason.
 *
 * bindCanvasDrag is shared with canvas-split, so the drag, Escape and
 * lost-drop paths are exercised again here rather than assumed. */
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sf-canvas-cards-')),port=await harness.freePort();
const relay=await harness.start(port,dir),browser=await chromium.launch();
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${port}`);await page.waitForFunction(()=>window.SF?.Editor?.deck());

 /* Cards are the campaign's ballot and the platform's densest list. Three
    counts because the grid regrids, two aspects because 4:3 is shorter. */
 const sweep=async(counts)=>page.evaluate(async(counts)=>{
  const checks=[];
  for(const theme of ['studio','northeastern','ukbt','ukbt-institute','aiad27-safe'])for(const aspect of ['16:9','4:3'])for(const count of counts){
   const d=SF.makeDeck('Cards check');d.theme=theme;d.aspect=aspect;
   const s=SF.makeSlide('cards');s.title='Choose one';
   s.bullets=Array.from({length:count},(_,i)=>'Option '+(i+1)+'\tA short reason to pick it');
   d.slides=[s];
   checks.push({theme,aspect,count,...await SF.Review.check(d,s,0)});
  }
  return checks;
 },counts);
 const fits=await sweep([2,3,4]);
 assert.deepEqual(fits.filter(r=>!r.fits),[],'card grids fit representative short content');

 /* The ceiling, asserted rather than avoided. UKBT and its Institute variant
    overflow at FIVE cards on 16:9, and it is structural rather than a matter
    of wording — a bare "Option 5" with no supporting line overflows too.
    Studio, Northeastern and the campaign take six.

    It is the WIDE aspect that fails, which is the wrong way round from
    intuition: 4:3 is 960px tall against 720, so the same five cards fit there
    and the deck only breaks on the projector shape most rooms use.

    Recorded here because a gesture test that quietly swept 2-4 would hide it,
    and because the card canvas invites people to add cards. If somebody
    raises the ceiling this assertion fails: that is the point, update it. */
 const ceiling=await sweep([5]);
 assert.deepEqual(
  ceiling.filter(r=>!r.fits).map(r=>r.theme+' '+r.aspect).sort(),
  ['ukbt 16:9','ukbt-institute 16:9'],
  'the known five-card ceiling is UKBT on 16:9 — a change here is a real change');

 async function open(bullets){
  await page.evaluate(b=>{
   const d=SF.makeDeck('Cards');d.theme='studio';const s=SF.makeSlide('cards');
   s.title='Four options';s.bullets=b;d.slides=[s];SF.Store.save(d);SF.Editor.openDeck(d.id);
  },bullets);
  await page.locator('#previewBox [data-card-move]').first().waitFor();
 }
 const bullets=()=>page.evaluate(()=>SF.Editor.deck().slides[0].bullets.slice());
 const preview=page.locator('#previewBox');
 /* Every commit redraws the preview, which replaces the handles. Measuring a
    box before that redraw lands gives coordinates for a node that is about to
    be detached, and the gesture then goes to nothing. Wait for a live handle
    after anything that writes. */
 const redrawn=()=>preview.locator('[data-card-move="0"]').waitFor();
 const PLAIN=['Alpha','Bravo','Charlie','Delta'];

 await open(PLAIN);
 assert.equal(await preview.locator('[data-card-move]').count(),4,'one move handle per card');

 /* 1. Click to choose a position. */
 await preview.locator('[data-card-move="0"]').click();
 await page.locator('[data-card-destination="2"]').click();
 await redrawn();
 assert.deepEqual(await bullets(),['Bravo','Charlie','Alpha','Delta'],'click move reorders the saved deck');
 await page.getByRole('button',{name:'↶ Undo',exact:true}).click();
 await redrawn();
 assert.deepEqual(await bullets(),PLAIN,'Undo restores the order');

 /* 2. Drag. Picking the handle up opens the position panel, so the panel is
       what the pointer is over for most of the gesture — that is the design,
       and destination() accepts a [data-card-destination] as readily as a
       card. Aiming at the panel rather than at the card underneath it is
       therefore both the real gesture and the only deterministic one: the
       tool bar sits below the grid, so a straight line from handle to card
       crosses whatever the panel is covering. */
 /* hover() rather than raw coordinates: it waits for the handle to be
    visible, stable and hit-testable, which a boundingBox() taken just after
    a redraw is not. */
 await preview.locator('[data-card-move="0"]').hover();
 await page.mouse.down();
 let box=await preview.locator('[data-card-move="0"]').boundingBox();
 await page.mouse.move(box.x+box.width/2+14,box.y+box.height/2,{steps:3});
 await page.locator('[data-card-destination="3"]').waitFor();
 let onto=await page.locator('[data-card-destination="3"]').boundingBox();
 await page.mouse.move(onto.x+onto.width/2,onto.y+onto.height/2,{steps:8});await page.mouse.up();
 assert.deepEqual(await bullets(),['Bravo','Charlie','Delta','Alpha'],'drag move reorders the saved deck');

 /* 3. A gesture that resolves to nowhere changes nothing. Escape mid-drag,
       and a release outside the slide, are separate paths through the shared
       helper and both have to leave the deck alone. */
 await open(PLAIN);
 await preview.locator('[data-card-move="1"]').hover();
 await page.mouse.down();
 box=await preview.locator('[data-card-move="1"]').boundingBox();
 await page.mouse.move(box.x+box.width/2+14,box.y+box.height/2,{steps:3});
 await page.locator('[data-card-destination="3"]').waitFor();
 onto=await page.locator('[data-card-destination="3"]').boundingBox();
 await page.mouse.move(onto.x+onto.width/2,onto.y+onto.height/2,{steps:6});
 await page.keyboard.press('Escape');await page.mouse.up();
 assert.deepEqual(await bullets(),PLAIN,'Escape mid-drag commits nothing');
 await preview.locator('[data-card-move="1"]').hover();
 await page.mouse.down();
 box=await preview.locator('[data-card-move="1"]').boundingBox();
 await page.mouse.move(box.x+box.width/2+14,box.y+box.height/2,{steps:3});
 await page.mouse.move(8,8,{steps:8});await page.mouse.up();
 assert.deepEqual(await bullets(),PLAIN,'a release outside the slide commits nothing');

 /* 4. Choosing the position a card already holds is not a move. */
 await preview.locator('[data-card-move="2"]').click();
 await page.locator('[data-card-destination="2"]').click();
 assert.deepEqual(await bullets(),PLAIN,'choosing its own position is a no-op');
 assert.equal(await page.locator('.canvas-card-panel').count(),0,'the panel closes behind it');

 /* 5. Keyboard: the panel opens focused on the card's own position, so the
       first thing under the cursor is the harmless one. */
 await preview.locator('[data-card-move="0"]').focus();await page.keyboard.press('Enter');
 assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('data-card-destination')),'0',
   'the panel opens focused on the card being moved');
 await page.locator('[data-card-destination="3"]').focus();await page.keyboard.press('Enter');
 assert.deepEqual(await bullets(),['Bravo','Charlie','Delta','Alpha'],'keyboard move reorders the saved deck');
 await page.getByRole('button',{name:'↶ Undo',exact:true}).click();
 await redrawn();
 await preview.locator('[data-card-move="0"]').focus();await page.keyboard.press('Enter');
 await page.keyboard.press('Escape');
 assert.deepEqual(await bullets(),PLAIN,'Escape closes the panel without moving');
 assert.equal(await page.locator('.canvas-card-panel').count(),0,'Escape closes the panel');

 /* 6. A card is one bullet however many fragments it draws. A structured
       card renders a heading and a body from one tab-separated line; moving
       it must carry the whole line, not the fragment that was clicked. */
 const RICH=['Heading one\tThe reason it matters','Heading two\tAnother reason','Heading three\tA third'];
 await open(RICH);
 await preview.locator('[data-card-move="0"]').click();
 await page.locator('[data-card-destination="2"]').click();
 assert.deepEqual(await bullets(),[RICH[1],RICH[2],RICH[0]],'a structured card moves as one raw line');

 /* 7. The list view reaches every card, for a slide too dense to aim at. */
 await open(PLAIN);
 await preview.locator('.canvas-card-browse').click();
 assert.equal(await page.locator('.canvas-card-row').count(),4,'the list shows every card');
 await page.locator('.canvas-card-row').nth(3).getByRole('button',{name:'Move card 4 from list'}).click();
 await page.locator('[data-card-destination="0"]').click();
 assert.deepEqual(await bullets(),['Delta','Alpha','Bravo','Charlie'],'moving from the list reorders the saved deck');

 /* 8. Double-clicking a card edits it, without going through the inspector. */
 await open(PLAIN);
 await preview.locator('[data-card-index="1"]').dblclick();
 await page.getByRole('textbox',{name:'Edit slide content'}).fill('Bravo, edited');
 await preview.locator('.canvas-edit-form button').filter({hasText:'Save'}).click();
 assert.deepEqual(await bullets(),['Alpha','Bravo, edited','Charlie','Delta'],'double-click edits that card');

 /* 9. None of this is in the deck people are given. */
 const clean=await page.evaluate(()=>{
  const d=SF.normalizeDeck(JSON.parse(JSON.stringify(SF.Editor.deck()))),s=d.slides[0];
  const r=SF.renderSlide(d,s,{index:0,total:1});
  return {tools:r.querySelectorAll('[data-card-move],.canvas-card-tools,.canvas-card-browse,.canvas-card-panel').length,
          bullets:s.bullets};
 });
 assert.deepEqual(clean,{tools:0,bullets:['Alpha','Bravo, edited','Charlie','Delta']},'exports carry content, not editor tools');

 assert.deepEqual(errors,[]);
 console.log(`Card canvas passed: ${fits.length+ceiling.length} theme/aspect/count fit checks; click, drag, keyboard, list, Undo, cancel, structured cards and clean exports.`);
}finally{await browser.close();await harness.stop(relay);fs.rmSync(dir,{recursive:true,force:true});}
