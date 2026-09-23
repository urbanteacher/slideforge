import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import harness from '../../tests/harness.js';
const dir = await mkdtemp(path.join(tmpdir(), 'sf-exploration-'));
const port = await harness.freePort(), server = await harness.start(port, dir);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:' + port);
  await page.waitForFunction(() => SF.Explore && SF.Editor.workspace);
  await page.evaluate(() => {
    const picture = (fill, text) => 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="960" height="480"><rect width="960" height="480" fill="${fill}"/><circle cx="240" cy="240" r="100" fill="#317864"/><circle cx="720" cy="240" r="100" fill="#995621"/><text x="480" y="70" text-anchor="middle" font-size="40">${text}</text></svg>`);
    const before = SF.makeSlide('beforeafter'); before.exploration.before = picture('#e0e6df', 'Before'); before.exploration.after = picture('#efd7a6', 'After');
    const image = SF.makeSlide('explore'); image.image = picture('#e0e6df', 'Explore the system'); image.exploration.spots = [{ x:25, y:50, zoom:2, title:'First detail', body:'Compare the two regions.' },{x:75,y:50,zoom:2,title:'Second detail',body:'How does this region differ?'}];
    const sim = SF.makeSlide('simulation'); sim.exploration.initial = 1;
    const chart = SF.makeSlide('chart'); chart.title = 'Predict the trend'; chart.body = 'Time | Distance\n1 | 10\n2 | 20\n3 | 30'; chart.exploration.prediction = true; chart.progressive = true;
    chart.feedback = Object.assign(SF.makeFeedback('poll'), {prompt:chart.exploration.prompt,options:['Increasing','Similar','Decreasing']});
    const deck = SF.makeDeck('Explore, predict, compare'); deck.slides = [before,image,sim,chart,SF.makeSlide('content')];
    SF.Store.save(deck); SF.Editor.workspace.setDoc(deck); SF.Shell.activate('deck'); SF.Editor.workspace.draw();
    SF.Player.start(SF.buildRunDeck(deck, id => SF.GameStore.get(id)),0,{fullscreen:false});
  });
  const wait = page.waitForEvent('popup'); await page.evaluate(() => SF.Player.openPresenter()); const presenter = await wait;
  presenter.on('pageerror', e => errors.push(e.message)); await presenter.setViewportSize({width:1200,height:1000});
  const position = presenter.locator('#boxNow input[type=range]');
  await page.waitForFunction(() => !document.querySelector('.slide.leaving'));
  await page.screenshot({path:'/tmp/sf-exploration-comparison.png'});
  await position.press('End'); await page.waitForFunction(() => SF.Player.exploreStates[SF.Player.deck.slides[0].id]?.position === 100);
  await position.press('Home'); await page.waitForFunction(() => SF.Player.exploreStates[SF.Player.deck.slides[0].id]?.position === 0);
  await position.press('End'); await presenter.locator('[data-cmd=next]').click();
  await page.waitForFunction(() => SF.Player.idx === 1);
  await presenter.locator('#boxNow').getByRole('button',{name:'First detail',exact:true}).click();
  await page.waitForFunction(() => SF.Player.exploreStates[SF.Player.deck.slides[1].id]?.spot === 0);
  await page.waitForFunction(() => !document.querySelector('.slide.leaving') && SF.Player._current.getAnimations({subtree:true}).every(a=>a.playState !== 'running'));
  await page.screenshot({path:'/tmp/sf-exploration-image.png'});
  await presenter.locator('[data-cmd=next]').click();
  await page.waitForFunction(() => SF.Player.exploreStates[SF.Player.deck.slides[1].id]?.spot === 1);
  await presenter.locator('[data-cmd=next]').click(); await page.waitForFunction(() => SF.Player.idx === 2);
  await presenter.locator('#boxNow input[type=range]').press('End');
  await page.waitForFunction(() => SF.Player.exploreStates[SF.Player.deck.slides[2].id]?.input === 10);
  /* The desk redraws from the sync message, a moment after the wall's state
     changes; read it once it has, rather than in the same tick (this raced
     once in seven full runs on 23 Sep 2026). */
  await presenter.locator('#boxNow .explore-reading', { hasText: 'Output: 20' }).waitFor({ timeout: 4000 });
  assert.match(await presenter.locator('#boxNow .explore-reading').innerText(), /Output: 20/);
  await page.waitForFunction(() => !document.querySelector('.slide.leaving') && SF.Player._current.getAnimations({subtree:true}).every(a=>a.playState !== 'running'));
  await page.screenshot({path:'/tmp/sf-exploration-slider.png'});
  // Authoring stays unchanged, and a detour resumes the selected value.
  await page.evaluate(() => { SF.Player.goTo(0); SF.Player.goTo(2); });
  assert.equal(await page.evaluate(() => SF.Player.exploreStates[SF.Player.deck.slides[2].id]?.input),10);
  assert.equal(await page.evaluate(() => SF.Editor.deck().slides[2].exploration.initial),1);
  await presenter.locator('[data-cmd=next]').click(); await page.waitForFunction(() => SF.Player.idx === 3);
  assert.equal(await presenter.locator('#boxNow .explore-chart-result').isVisible(),false);
  await presenter.locator('[data-cmd=next]').click();
  await page.waitForFunction(() => SF.Player.exploreStates[SF.Player.deck.slides[3].id]?.revealed);
  assert.equal(await presenter.locator('#boxNow .explore-chart-result').isVisible(),true);
  await page.waitForFunction(() => !document.querySelector('.slide.leaving') && SF.Player._current.getAnimations({subtree:true}).every(a=>a.playState !== 'running'));
  await page.screenshot({path:'/tmp/sf-exploration-chart.png'});
  await presenter.locator('[data-cmd=next]').click(); await page.waitForFunction(() => SF.Player.idx === 4);
  // Editor controls are discoverable for each authored type.
  await page.evaluate(() => SF.Player.close());
  await page.evaluate(() => { SF.Editor.selectSlide(SF.Editor.deck().slides[0].id); SF.Editor.workspace.draw(); });
  await page.getByText('Before image URL',{exact:true}).waitFor();
  await page.evaluate(() => { SF.Editor.selectSlide(SF.Editor.deck().slides[2].id); SF.Editor.workspace.draw(); });
  await page.getByText('Relationship',{exact:true}).waitFor();
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(() => SF.Player.start(SF.buildRunDeck(SF.Editor.deck(),id=>SF.GameStore.get(id)),1,{fullscreen:false}));
  assert.equal(await page.evaluate(() => getComputedStyle(SF.Player._current.querySelector('.explore-moving')).transitionDuration),'0s');
  // Real learner predictions stay beside the revealed chart; concealed data is
  // not included in the learner excerpt before the reveal.
  await page.evaluate(() => SF.Live.host(SF.buildRunDeck(SF.Editor.deck(),id=>SF.GameStore.get(id))));
  await page.waitForFunction(() => !!SF.Live.pin);
  const pin = await page.evaluate(() => SF.Live.pin), learner = await harness.connect(port);
  try {
    learner.send({t:'join',pin,name:'Predictor'});
    await page.waitForFunction(() => SF.Live.players.length === 1);
    await page.evaluate(() => { SF.Live.begin(); SF.Player.goTo(3); });
    const prompt = await learner.next('prompt'); assert.equal(prompt.kind,'poll');
    const context = await learner.latest('context', c=>c.n===4);
    assert.equal(context.text,'What pattern do you predict?');
    learner.send({t:'reply',choice:0}); await learner.next('replied');
    await page.waitForFunction(() => SF.Live.digest && SF.Live.digest.total === 1);
    await page.evaluate(() => SF.Explore.command(SF.Player,'reveal',true));
    assert.equal(await page.evaluate(() => SF.Live.digest.total),1);
    assert.equal(await page.evaluate(() => SF.Live.pin),pin);
  } finally { await learner.close(); await page.evaluate(() => SF.Live.stop()); }
  assert.deepEqual(errors,[]);
  console.log('Exploration browser checks passed: editor, presenter, keyboard, prediction concealment, state restoration, reduced motion.');
} finally { await browser.close(); await harness.stop(server); await rm(dir,{recursive:true,force:true}); }
