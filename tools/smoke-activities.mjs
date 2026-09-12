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
    const keys = ['hook-objectives', 'concept-development', 'problem-based-learning', 'question-cube-six-question-types', 'structured-reflection-protocol', 'connect-four-concept-edition'];
    for (const key of keys) {
      const s = SF.Activities.makeSlides(SF.Activities.activity(key))[0];
      const box = document.createElement('div'); box.style.cssText = 'width:640px;height:360px;position:relative;overflow:hidden';
      const node = SF.renderSlide({ theme: 'studio', title: 'Activity review', slides: [s] }, s, {});
      node.style.cssText += ';transform:scale(.5);transform-origin:top left';
      box.append(node); document.body.append(box);
    }
  });
  await page.screenshot({ path: '/tmp/slideforge-activity-review.png', fullPage: true });
  console.log('54 inserts, sequence editing/duplication/removal, timer conversion and ' + results.renders + ' slide renders passed.');
} finally { await browser.close(); }
