/* Browser verification against a running local server. No user data is used:
 * Playwright gets a fresh, isolated browser context. */
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(process.env.SF_URL || 'http://localhost:8799');
  await page.waitForFunction(() => window.SF?.Activities?.workspace);
  await page.evaluate(() => SF.Shell.activate('plan'));
  assert.equal(await page.locator('.activity-card').count(), 54);
  assert.equal(await page.locator('.activity-card:disabled').count(), 0);
  const names = await page.locator('.activity-card strong').allTextContents();
  for (const name of names) {
    await page.locator('.activity-card').filter({ has: page.locator('strong', { hasText: new RegExp('^' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$') }) }).click();
  }
  assert.equal(await page.locator('#railList .qthumb').count(), 54);
  const state = await page.evaluate(() => {
    const slides = SF.Editor.deck().slides.filter(s => s.activity);
    return { count: slides.length, groups: new Set(slides.map(s => s.activityInstance)).size };
  });
  assert.deepEqual(state, { count: 59, groups: 54 });
  assert.equal(await page.evaluate(() => {
    const slides = SF.Editor.deck().slides;
    return slides.every((s, i) => !s.activityPage || slides[i - 1]?.activityInstance === s.activityInstance);
  }), true, 'Adding the next activity must not split a slide sequence');

  await page.locator('#railList .qthumb').filter({ hasText: 'Structured Reflection Protocol' }).click();
  const originalFields = await page.evaluate(() => JSON.stringify(SF.Editor.deck().slides.find(s => s.activity === 'structured-reflection-protocol').bullets));
  const visualSelect = page.locator('#inspector select').filter({ has: page.locator('option[value="panels"]') });
  await visualSelect.selectOption('rows');
  assert.equal(await page.evaluate(() => SF.Editor.deck().slides.find(s => s.activity === 'structured-reflection-protocol').activityPresentation), 'rows');
  await visualSelect.selectOption('panels');
  assert.equal(await page.evaluate(() => JSON.stringify(SF.Editor.deck().slides.find(s => s.activity === 'structured-reflection-protocol').bullets)), originalFields);
  assert.equal(await page.evaluate(() => {
    const s = SF.Activities.makeSlides(SF.Activities.activity('structured-reflection-protocol'))[0];
    s.bullets.push('A fifth box\tNew content');
    return SF.renderSlide(SF.Editor.deck(), s, {}).classList.contains('activity-panels');
  }), false, 'Four-panel layout must fall back when a fifth box is added');
  await page.locator('#railList .qthumb').filter({ hasText: 'Guided Inquiry Investigation' }).click();
  const area = page.locator('#inspector textarea').first();
  await area.fill('Our edited investigation prompt.'); await area.blur();
  await page.getByRole('button', { name: 'Duplicate', exact: true }).click();
  assert.equal(await page.locator('#railList .qthumb').count(), 55);
  assert.equal(await page.locator('#inspector textarea').first().inputValue(), 'Our edited investigation prompt.');
  await page.getByRole('button', { name: 'Remove', exact: true }).click();
  assert.equal(await page.locator('#railList .qthumb').count(), 54);
  await page.evaluate(() => SF.Shell.activate('deck'));
  await page.getByRole('button', { name: '↶ Undo', exact: true }).click();
  assert.equal(await page.evaluate(() => SF.Editor.deck().slides.filter(s => s.activity).length), 63);
  await page.getByRole('button', { name: '↷ Redo', exact: true }).click();
  assert.equal(await page.evaluate(() => SF.Editor.deck().slides.filter(s => s.activity).length), 59);
  await page.evaluate(() => SF.Shell.activate('plan'));
  await page.locator('#railList .qthumb').filter({ hasText: 'Hook & Predict' }).click();
  assert.equal(await page.locator('#inspector input[type=number]').first().inputValue(), '7');
  await page.locator('#inspector input[type=number]').first().fill('9');
  await page.locator('#inspector input[type=number]').first().blur();
  assert.equal(await page.evaluate(() => SF.Editor.deck().slides.find(s => s.activity === 'hook-and-predict').timeLimit), 540);
  await page.waitForFunction(() => SF.Store.get(SF.Editor.deck().id)?.slides.find(s => s.activity === 'hook-and-predict')?.timeLimit === 540);
  await page.getByRole('button', { name: 'Edit this slide', exact: true }).click();
  assert.equal(await page.evaluate(() => SF.Editor.deck().slides[SF.Editor.selected()].activity), 'hook-and-predict');
  await page.evaluate(() => SF.Shell.activate('plan'));
  await page.locator('#railList .qthumb').filter({ hasText: 'Hook & Predict' }).click();
  await page.locator('#btnDemoActivity').click();
  assert.equal(await page.evaluate(() => SF.Player && SF.Player.open), true);
  assert.equal(await page.evaluate(() => SF.Player.deck.slides.length), 1);
  assert.equal(await page.evaluate(() => SF.Player.deck.slides[0].activity), 'hook-and-predict');
  /* The player covers the toolbar, so the showcase button is out of reach
     while one is running — it goes disabled rather than offering an exit no
     pointer can click. Leaving is Esc or the HUD's ✕, as the toast says. */
  assert.equal(await page.locator('#btnDemoActivity').isDisabled(), true);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => SF.Player && SF.Player.open === false);
  assert.equal(await page.locator('#btnDemoActivity').isDisabled(), false);
  const timerChecks = await page.evaluate(() => {
    const results = [];
    for (const a of SF.Activities.ACTIVITIES.filter(a => a.target === 'moment')) {
      const slide = SF.Activities.makeSlides(a)[0];
      slide.transition = 'none';
      const next = SF.makeSlide('content'); next.transition = 'none';
      const run = SF.buildRunDeck({ ...SF.makeDeck('Timer check'), slides: [slide, next] });
      SF.Player.start(run, 0, { fullscreen: false });
      const initial = SF.Player.lessonMoment();
      const started = initial && initial.seconds === slide.timeLimit && initial.activitySlideId === slide.id;
      const visible = !!document.querySelector('#player .lesson-live-overlay');
      SF.Player.momentCommand({ action: 'pause' });
      const paused = SF.Player.lessonMoment().seconds;
      SF.Player.goTo(0);
      const preserved = SF.Player.lessonMoment().paused && SF.Player.lessonMoment().seconds === paused;
      SF.Player.momentCommand({ action: 'extend' });
      const extended = SF.Player.lessonMoment().seconds === paused + 60;
      SF.Player.momentCommand({ action: 'resume' });
      const resumed = !SF.Player.lessonMoment().paused;
      SF.Player.goTo(1);
      const cleared = SF.Player.lessonMoment() === null;
      SF.Player.close();
      results.push({ key: a.key, started, visible, preserved, extended, resumed, cleared });
    }
    return results;
  });
  assert.equal(timerChecks.length, 10);
  for (const check of timerChecks) assert.ok(Object.entries(check).every(([key, value]) => key === 'key' || value === true), JSON.stringify(check));
  const results = await page.evaluate(() => {
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;inset:0;background:white;z-index:99999;width:1280px;height:720px';
    document.body.append(host);
    const failures = []; let renders = 0;
    for (const theme of Object.keys(SF.THEMES)) {
      for (const a of SF.Activities.ACTIVITIES.filter(a => a.target !== 'game')) {
        for (const s of SF.Activities.makeSlides(a)) {
          const node = SF.renderSlide({ ...SF.Editor.deck(), theme }, s, {});
          host.replaceChildren(node); const rect = node.getBoundingClientRect();
          for (const el of node.querySelectorAll('h1,h2,.kw-row,li,td,th')) {
            const r = el.getBoundingClientRect();
            if (r.bottom > rect.bottom + 1 || r.top < rect.top - 1 || r.right > rect.right + 1 || el.scrollWidth > el.clientWidth + 2) {
              failures.push({ key: a.key, theme, text: el.textContent.slice(0, 50), bottom: r.bottom - rect.top, width: [el.clientWidth, el.scrollWidth] });
            }
          }
          renders++;
        }
      }
    }
    host.remove(); return { renders, failures };
  });
  console.log(JSON.stringify(results, null, 2));
  assert.equal(results.failures.length, 0, 'Activity content overflows the slide');
  assert.deepEqual(errors, []);
  // A reviewable contact sheet of the busiest examples, rendered by the app.
  await page.evaluate(() => {
    document.body.replaceChildren();
    document.body.style.cssText = 'display:grid;grid-template-columns:repeat(2,640px);gap:16px;padding:16px;background:#e5e7e1;overflow:auto;height:auto';
    const keys = ['think-pair-share', 'concept-development', 'problem-based-learning', 'quick-practice-stations', 'structured-reflection-protocol', 'connect-four-concept-edition'];
    for (const key of keys) {
      const s = SF.Activities.makeSlides(SF.Activities.activity(key))[0];
      const box = document.createElement('div'); box.style.cssText = 'width:640px;height:360px;position:relative;overflow:hidden';
      const node = SF.renderSlide({ theme: 'studio', title: 'Activity review', slides: [s] }, s, {});
      node.style.cssText += ';transform:scale(.5);transform-origin:top left';
      box.append(node); document.body.append(box);
    }
  });
  await page.screenshot({ path: '/tmp/slideforge-activity-review.png', fullPage: true });
  console.log('54 inserts, sequence editing/duplication/removal, 10 player countdowns and ' + results.renders + ' slide renders passed.');
} finally { await browser.close(); }
