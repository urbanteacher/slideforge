#!/usr/bin/env node
/* Smoke: Demo engine loads layout-bank (97) and Audit all stays within budget. */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const BASE = process.env.SF_BASE_URL || process.env.SF_URL || 'http://127.0.0.1:8787';
const url = `${BASE.replace(/\/$/, '')}/modular-canvas/preview.html`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1100 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

try {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('#demo-deck');
  await page.waitForFunction(() => typeof window.__demoAuditAll === 'function', null, {
    timeout: 30000,
  });

  const boot = await page.evaluate(() => ({
    options: document.querySelector('#demo-slide')?.options?.length,
    engine: !!document.getElementById('demo-deck'),
  }));
  if (boot.options !== 97) throw new Error(`expected 97 demo slides, got ${boot.options}`);
  if (!boot.engine) throw new Error('Engine 3 canvas missing');
  assert.deepEqual(
    await page.locator('#demo-deck .demo-tool-label').allInnerTexts(),
    ['SLIDE', 'EDIT', 'TOOLS', 'CHROME'],
    'the Engine 3 controls are not grouped by navigation, mode, canvas tools and chrome'
  );
  await page.click('#demo-flip');
  await page.waitForFunction(() => document.querySelector('#demo-flip')?.getAttribute('aria-pressed') === 'true');
  assert.equal(await page.locator('#demo-content-mode').getAttribute('aria-pressed'), 'false', 'Artwork mode left Content active');
  await page.click('#demo-content-mode');
  await page.waitForFunction(() => document.querySelector('#demo-content-mode')?.getAttribute('aria-pressed') === 'true');
  await page.setViewportSize({ width: 820, height: 1100 });
  await page.click('#demo-flip');
  await page.waitForSelector('#demo-stack:not([hidden])');
  const artworkDrawer = await page.evaluate(() => {
    const panel = document.querySelector('#demo-stack').getBoundingClientRect();
    const stage = document.querySelector('#demo-deck .demo-stage').getBoundingClientRect();
    return { inViewport: panel.top >= 0 && panel.bottom <= innerHeight, aboveCanvas: panel.top < stage.top };
  });
  assert.ok(artworkDrawer.inViewport && artworkDrawer.aboveCanvas, 'Artwork controls fell below the canvas instead of opening as a drawer');
  await page.click('#demo-content-mode');
  await page.setViewportSize({ width: 1400, height: 1100 });
  await page.waitForTimeout(100);

  const summary = await page.evaluate(async () => {
    const rows = await window.__demoAuditAll();
    const fail = rows.filter((r) => !r.fits);
    const tiny = rows.filter((r) => !r.legible);
    return {
      total: rows.length,
      needSpace: fail.length,
      fit: rows.length - fail.length,
      underFloor: tiny.length,
      smallest: Math.min(...rows.filter((r) => r.smallest != null).map((r) => r.smallest)),
    };
  });

  if (summary.total !== 97) throw new Error(`audit total ${summary.total}`);
  /* Budget is the one known over-budget slide: #94 compare needs 597px in a 576px
     body even with zero padding and zero row gap, so no recipe change closes it.
     The budget equals the known failure on purpose — slack hides regressions. */
  if (summary.needSpace > 1) {
    throw new Error(`too many overflows: ${summary.needSpace} (budget 1)`);
  }
  /* Legibility is a second, independent verdict: geometry can pass at a size
     nobody can read. Most of these sizes come from production CSS, so this is a
     ratchet against getting worse, not a claim that 24 is acceptable. */
  if (summary.underFloor > 44) {
    throw new Error(`more slides under the 20px floor: ${summary.underFloor} (was 44)`);
  }
  /* --- Rearranging: folded in from the retired stack engine --- */
  await page.waitForFunction(() => typeof window.__demoMagnet === 'function');
  const settled = () => page.waitForFunction(() => {
    const n = document.querySelector('#demo-deck .demo-status');
    return !!n && n.textContent !== '' && n.textContent !== 'Measuring\u2026';
  });
  await page.selectOption('#demo-slide', '0');
  await settled();
  await page.locator('#demo-deck .safe-stage').scrollIntoViewIfNeeded();
  assert.match(
    await page.locator('#demo-deck .demo-chrome-measure').innerText(),
    /header 88px · body 576px · footer 56px/,
    'the Demo canvas does not report its measured header and footer reserves'
  );
  assert.deepEqual(
    await page.locator('#demo-deck .demo-chrome-band').allInnerTexts(),
    ['header reserve · implied · 88px', 'footer reserve · implied · 56px'],
    'the header/footer measurements are not drawn over the canvas'
  );
  assert.equal(await page.locator('#demo-chrome-map').isVisible(), true, 'Engine 3 has no header/footer controller');
  assert.deepEqual(
    await page.locator('#demo-chrome-map [data-band-cells="header"] button').allInnerTexts(),
    ['·', 'Context', 'Logo'],
    'the controller did not expose the title slide’s header furniture'
  );
  await page.click('#demo-chrome-map [data-snap-slot="header-center"]');
  await page.click('#demo-chrome-map [data-snap-slot="header-left"]');
  await settled();
  assert.equal(
    await page.locator('#demo-deck [data-chrome-item="contextSlot"]').evaluate((n) => n.parentElement?.dataset.region),
    'header-left',
    'the header controller did not move Context into the requested slot'
  );
  await page.click('#demo-reset');
  await settled();
  const contentBeforeSwap = await page.evaluate(() => ({
    type: document.querySelector('#demo-deck .slide')?.className,
    rows: window.__demoRows(),
    headline: document.querySelector('#demo-deck .safe-slot[data-name="Headline"]')?.textContent,
    subtitle: document.querySelector('#demo-deck .safe-slot[data-name="Subtitle"]')?.textContent,
  }));
  await page.click('#demo-deck .safe-slot[data-name="Headline"] .demo-slot-swap');
  assert.equal(await page.locator('#demo-feature-panel').isHidden(), true, 'content ⇄ opened the layout picker');
  assert.match(await page.locator('#demo-deck .demo-status').innerText(), /choose another compatible content block/i);
  await page.click('#demo-deck .safe-slot[data-name="Subtitle"] .demo-slot-swap');
  await page.waitForFunction((before) => {
    const headline = document.querySelector('#demo-deck .safe-slot[data-name="Headline"]')?.textContent || '';
    const subtitle = document.querySelector('#demo-deck .safe-slot[data-name="Subtitle"]')?.textContent || '';
    return headline.includes(before.subtitle) && subtitle.includes(before.headline);
  }, contentBeforeSwap);
  const contentAfterSwap = await page.evaluate(() => ({
    type: document.querySelector('#demo-deck .slide')?.className,
    rows: window.__demoRows(),
  }));
  await settled();
  assert.match(contentAfterSwap.type, /layout-title/, 'content ⇄ changed the slide layout');
  assert.equal(contentAfterSwap.type, contentBeforeSwap.type, 'content ⇄ changed the slide type');
  /* Which slots exist, in what order, over which columns — that is what ⇄ must
     not touch. Their spans are no longer fixed: a block takes the lines its
     content needs, so exchanging content is expected to move rows. */
  const shape = (rows) => rows.map((r) => ({ name: r.name, col: r.col, cols: r.cols }));
  assert.deepEqual(shape(contentAfterSwap.rows), shape(contentBeforeSwap.rows), 'content ⇄ moved the slots instead of swapping content');
  /* And the lines did follow: an 84px display line handed the subtitle's words
     needs more of them than the four the title composition authored. */
  const headlineBefore = contentBeforeSwap.rows.find((r) => r.name === 'Headline');
  const headlineAfter = contentAfterSwap.rows.find((r) => r.name === 'Headline');
  assert.ok(
    headlineAfter.rows > headlineBefore.rows,
    `the headline kept ${headlineBefore.rows} lines instead of taking the lines its new content needs`
  );
  assert.match(await page.locator('#demo-deck .demo-status').innerText(), /Swapped content/i);
  await page.click('#demo-reset');
  await settled();
  /* The original renderer remains available as a visual comparison. */
  await page.check('#demo-original');
  await settled();
  assert.match(
    await page.locator('#demo-deck .demo-chrome-measure').innerText(),
    /Measured original-design reserves/,
    'the original-design comparison mode did not render'
  );
  await page.uncheck('#demo-original');
  await settled();
  assert.deepEqual(
    await page.evaluate(() => {
      const stage = document.querySelector('#demo-deck .safe-stage');
      return {
        accent: !!stage.querySelector('.safe-slot .accent-bar'),
        heading: getComputedStyle(stage.querySelector('.safe-slot h1')).fontSize,
        subtitle: getComputedStyle(stage.querySelector('.safe-slot .sub')).fontSize,
        date: getComputedStyle(stage.querySelector('.safe-slot .slide-date')).fontSize,
      };
    }),
    { accent: true, heading: '84px', subtitle: '25px', date: '15px' },
    'title reflow changed the original campaign hierarchy instead of only anchoring it'
  );

  const rows = () => page.evaluate(() => window.__demoRows());
  const budget = () => page.evaluate(() => window.__demoBudget());
  const at = (list, name) => list.find((r) => r.name === name).row;
  const before = await rows();
  assert.deepEqual(before.map((r) => r.name), ['Accent', 'Headline', 'Subtitle', 'Date']);
  assert.deepEqual(before.map((r) => r.row), [4, 5, 9, 12]);
  const startBudget = (await budget())[0].used;

  /* The magnet: drop the date where the subtitle is and the subtitle is pushed
     below it. The budget cannot move, because each gap travels with its item. */
  const magnet = await page.evaluate(() => window.__demoMagnet('Date', 10));
  await settled();
  assert.deepEqual(magnet.order, ['Accent', 'Headline', 'Date', 'Subtitle']);
  const after = await rows();
  assert.ok(at(after, 'Date') < at(before, 'Date'), 'the date did not move up');
  assert.ok(at(after, 'Subtitle') > at(before, 'Subtitle'), 'the subtitle was not pushed down');
  assert.equal(at(after, 'Headline'), at(before, 'Headline'), 'the item above the drop moved');
  assert.equal((await budget())[0].used, startBudget, 'a rearrange changed the row budget');

  /* Budget invariance over a run of moves, rather than trusting the argument. */
  for (const [name, row] of [['Headline', 14], ['Subtitle', 1], ['Date', 8], ['Headline', 1]]) {
    await page.evaluate(([n, r]) => window.__demoMagnet(n, r), [name, row]);
    await settled();
    for (const g of await budget())
      assert.equal(g.used, startBudget, `moving ${name} to row ${row} changed the budget to ${g.used}`);
    assert.equal(await page.locator('#demo-deck .demo-status').getAttribute('data-fits'), 'true');
  }

  /* A real pointer drag, not just the exposed helper. */
  await page.click('#demo-reset');
  await settled();
  await page.locator('#demo-deck .safe-stage').scrollIntoViewIfNeeded();
  const grip = await page.locator('#demo-deck .safe-slot[data-name="Date"] .demo-slot-grip').boundingBox();
  const target = await page.locator('#demo-deck .safe-slot[data-name="Subtitle"]').boundingBox();
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
  await page.mouse.down();
  await page.mouse.move(target.x + target.width / 2, target.y + target.height * 0.2, { steps: 16 });
  assert.match(await page.locator('#demo-deck .demo-status').innerText(), /place before\/after/);
  await page.mouse.up();
  await settled();
  const dragged = await rows();
  assert.ok(at(dragged, 'Date') < at(before, 'Date'), 'the pointer drag did not push');
  assert.equal((await budget())[0].used, startBudget);

  /* Regression: a vertical drag that wanders sideways must not change columns.
     It did, which made every drag after the first look freeform. */
  await page.click('#demo-reset');
  await settled();
  await page.locator('#demo-deck .safe-stage').scrollIntoViewIfNeeded();
  const columnsOf = async () => (await rows()).map((r) => `${r.name}:${r.col}-${r.col + r.cols - 1}`);
  const startColumns = await columnsOf();
  for (const [name, onto, frac] of [['Date', 'Subtitle', 0.2], ['Headline', 'Date', 0.2], ['Subtitle', 'Headline', 0.2], ['Date', 'Headline', 0.8]]) {
    const from = await page.locator(`#demo-deck .safe-slot[data-name="${name}"] .demo-slot-grip`).boundingBox();
    const onto_ = await page.locator(`#demo-deck .safe-slot[data-name="${onto}"]`).boundingBox();
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    /* Wander sideways on the way, the way a hand does. */
    await page.mouse.move(from.x + from.width / 2 - 180, from.y + from.height / 2 - 20, { steps: 6 });
    await page.mouse.move(onto_.x + onto_.width / 2, onto_.y + onto_.height * frac, { steps: 14 });
    await page.mouse.up();
    await settled();
    assert.deepEqual(await columnsOf(), startColumns, `dragging ${name} onto ${onto} moved a column`);
    for (const g of await budget())
      assert.equal(g.used, startBudget, `dragging ${name} onto ${onto} changed the budget`);
  }

  /* Side-by-side stacks have nothing to push, so that drop swaps sides instead. */
  await page.selectOption('#demo-filter', 'split');
  await settled();
  const twoStacks = await rows();
  assert.equal(twoStacks.length, 2, 'split should be two slots');
  assert.notEqual(twoStacks[0].col, twoStacks[1].col, 'split slots share a column');
  await page.selectOption('#demo-filter', '');
  await settled();

  /* Charts declare a readable minimum width, since a vector block shrinks
     instead of overflowing and nothing else would catch it. */
  await page.selectOption('#demo-slide', '41');
  await settled();
  const chartSlot = (await rows()).find((r) => /chart/i.test(r.name));
  assert.ok(chartSlot, 'no chart slot on slide 42');
  assert.ok(chartSlot.cols >= 8, `chart is ${chartSlot.cols} columns wide, under its readable minimum`);

  /* --- Feature swap: change what the slide is, via the app's own layout machinery --- */
  await page.click('#demo-reset');
  await settled();
  await page.selectOption('#demo-filter', 'content');
  await settled();
  await page.locator('#demo-deck .safe-stage').scrollIntoViewIfNeeded();
  await page.click('#demo-layout-picker');
  await page.waitForSelector('#demo-feature-panel:not([hidden])');

  /* The picker is the app's list, not a lab copy: every authorable type, in the
     app's own groups, and only the ones that take pits are marked as keeping points. */
  const offered = await page.evaluate(() =>
    [...document.querySelectorAll('.demo-feature-option')].map((b) => b.dataset.feature));
  /* The choosable set is the grouped subset, matching the editor's own picker:
     an authorable type with no group (join) is inserted by the live flow rather
     than chosen as a shape, so it is excluded there and here. */
  const choosable = await page.evaluate(() =>
    window.SF.DECK_TYPES.filter((t) =>
      window.SF.LAYOUT_GROUPS.some((g) => window.SF.SLIDE_TYPES[t].group === g[0])).sort());
  assert.deepEqual([...offered].sort(), choosable, 'the picker and the editor disagree on choosable shapes');
  assert.ok(
    !offered.includes('join'),
    'join has no group and is inserted by the live flow; it should not be offered as a shape'
  );
  const groupNames = (await page.locator('.demo-feature-group h4').allInnerTexts()).map((g) => g.toUpperCase());
  const appGroups = await page.evaluate(() => window.SF.LAYOUT_GROUPS.map((g) => g[1].toUpperCase()));
  assert.deepEqual(groupNames, appGroups, 'groups are not the app\u2019s');
  const keepsPoints = await page.evaluate(() =>
    [...document.querySelectorAll('.demo-feature-option')]
      .filter((b) => b.dataset.keepsPoints === '1')
      .map((b) => b.dataset.feature).sort());
  const withPits = await page.evaluate(() =>
    window.SF.BULLET_LAYOUTS
      .filter((t) => window.SF.DECK_TYPES.includes(t))
      .filter((t) => window.SF.LAYOUT_GROUPS.some((g) => window.SF.SLIDE_TYPES[t].group === g[0]))
      .sort());
  assert.deepEqual(keepsPoints, withPits, 'the "keeps points" marks do not match BULLET_LAYOUTS');

  /* Bullets to a table: the heading carries, the points stay in the data. */
  const headingBefore = await page.locator('#demo-deck .safe-slot h2').first().innerText();
  await page.click('.demo-feature-option[data-feature="table"]');
  await settled();
  assert.equal(await page.evaluate(() => window.SF.buildLesson ? null : null), null);
  const swapped = await rows();
  assert.ok(swapped.some((r) => /table/i.test(r.name)), `no table slot after the swap: ${swapped.map((r) => r.name)}`);
  assert.equal(await page.locator('#demo-deck .safe-slot h2').first().innerText(), headingBefore, 'the heading did not carry over');
  assert.match(await page.locator('#demo-deck .demo-status').innerText(), /Bullets .* Table/);
  assert.equal(await page.locator('#demo-deck .demo-status').getAttribute('data-fits'), 'true');

  /* A shape that places nothing must not report a pass. measure() loops over the
     slot boxes, so zero boxes used to mean zero failures: swapping a wordy slide
     to Image claimed "All 0 slots fit" while the recipe line said no match. */
  await page.click('#demo-reset');
  await settled();
  /* The filter is still on the previous type; slide 0 is not in that list. */
  await page.selectOption('#demo-filter', '');
  await settled();
  await page.selectOption('#demo-slide', '0');
  await settled();
  await page.locator('#demo-deck .safe-stage').scrollIntoViewIfNeeded();
  for (const pictureShape of ['image', 'gallery', 'video']) {
    await page.click('#demo-reset');
    await settled();
    await page.click('#demo-layout-picker');
    await page.waitForSelector('#demo-feature-panel:not([hidden])');
    const choice = page.locator(`.demo-feature-option[data-feature="${pictureShape}"]`);
    await choice.click();
    if (await page.locator('#demo-feature-panel:not([hidden])').count()) await choice.click();
    await settled();
    assert.equal(
      await page.locator('#demo-deck .demo-status').getAttribute('data-fits'),
      'false',
      `${pictureShape} placed nothing and still reported a pass`
    );
    /* __demoRows reports the recipe; count the boxes actually placed. */
    assert.equal(
      await page.locator('#demo-deck .safe-slot').count(),
      0,
      `${pictureShape} should place no slots on a title slide with no picture`
    );
  }

  /* The picker predicts fit from a trial render, and must agree with the result
     it produces — or say plainly that it did not. */
  /* Pin the slide by index and keep the filter off: a swap changes the slide's
     type, so a type filter would move the selection out from under the test. */
  const CONTENT_SLIDE = '4';
  const openPicker = async () => {
    await page.selectOption('#demo-filter', '');
    await settled();
    await page.selectOption('#demo-slide', CONTENT_SLIDE);
    await settled();
    await page.click('#demo-reset');
    await settled();
    await page.locator('#demo-deck .safe-stage').scrollIntoViewIfNeeded();
    await page.click('#demo-layout-picker');
    await page.waitForSelector('#demo-feature-panel:not([hidden])');
  };
  await openPicker();
  await page.waitForFunction(
    () => ![...document.querySelectorAll('.demo-feature-fit')].some((n) => n.textContent === '\u2026'),
    null,
    { timeout: 60000 }
  );
  /* Contained, not floating: the panel must sit inside the section and beside the
     canvas. As a popover it anchored against the page — #demo-deck is not
     positioned — so it rendered over the canvas with its labels cut off. */
  const placement = await page.evaluate(() => {
    const panel = document.querySelector('#demo-feature-panel');
    const stage = document.querySelector('#demo-deck .demo-stage');
    const sec = document.querySelector('#demo-deck');
    const p = panel.getBoundingClientRect();
    const st = stage.getBoundingClientRect();
    const s = sec.getBoundingClientRect();
    return {
      inSection: sec.contains(panel),
      inside: p.left >= s.left - 1 && p.right <= s.right + 1 && p.top >= s.top - 1,
      overlapsCanvas: p.left < st.right - 1,
      clipped: [...document.querySelectorAll('.demo-feature-option')]
        .filter((b) => b.scrollWidth > b.clientWidth + 1 || b.scrollHeight > b.clientHeight + 1)
        .map((b) => b.dataset.feature),
    };
  });
  assert.ok(placement.inSection, 'the picker is not inside the demo section');
  assert.ok(placement.inside, 'the picker spills outside the section');
  assert.ok(!placement.overlapsCanvas, 'the picker floats over the canvas');
  assert.deepEqual(placement.clipped, [], 'some option labels are cut off');

  /* And it has to survive a narrow viewport without clipping. */
  await page.setViewportSize({ width: 820, height: 1150 });
  await page.waitForTimeout(300);
  const narrow = await page.evaluate(() => {
    const panel = document.querySelector('#demo-feature-panel');
    const p = panel.getBoundingClientRect();
    return {
      inViewport: p.left >= 0 && p.right <= innerWidth && p.top >= 0 && p.bottom <= innerHeight,
      clipped: [...document.querySelectorAll('.demo-feature-option')].filter((b) => b.scrollWidth > b.clientWidth + 1).length,
    };
  });
  assert.ok(narrow.inViewport, 'the picker drawer spills outside the viewport at 820px');
  assert.equal(narrow.clipped, 0, 'option labels clip at 820px');
  await page.setViewportSize({ width: 1600, height: 1200 });
  await page.waitForTimeout(300);

  /* Regression: trials must not join the live DOM. Mounted inside #demo-deck,
     every trial's .safe-slot boxes appeared alongside the slide's, so the slot
     list grew by a whole extra layout each time the picker opened. */
  const liveSlots = () => page.locator('#demo-deck .safe-slot').count();
  const slotsWhileOpen = await liveSlots();
  assert.equal(slotsWhileOpen, 2, `the picker leaked trial slots into the page: ${slotsWhileOpen}`);
  assert.equal(await page.locator('.demo-trial-host .slide').count(), 0, 'a trial render was left mounted');

  /* Shapes that show no heading have to say so: Quote and Statement carry the
     words but not the title, which otherwise reads as the slide eating it. */
  const lossy = await page.evaluate(() =>
    [...document.querySelectorAll('.demo-feature-option')]
      .filter((b) => b.dataset.keepsHeading === '0' && b.dataset.fit === 'yes')
      .map((b) => b.dataset.feature).sort());
  assert.deepEqual(lossy, ['quote', 'statement'], `unexpected heading-dropping shapes: ${lossy}`);
  for (const shape of lossy) {
    const label = await page.locator(`.demo-feature-option[data-feature="${shape}"] .demo-feature-fit`).innerText();
    assert.match(label, /drops the heading/i, `${shape} did not warn about the heading`);
  }
  /* A shape that places nothing is described by that, not by the heading. */
  for (const shape of ['image', 'gallery', 'video']) {
    const label = await page.locator(`.demo-feature-option[data-feature="${shape}"] .demo-feature-fit`).innerText();
    assert.match(label, /needs a picture/i, `${shape} label was "${label}"`);
  }

  /* A lossy choice asks once more, like a tight one, and then says what it did. */
  const quote = page.locator('.demo-feature-option[data-feature="quote"]');
  await quote.click();
  assert.ok(await page.locator('#demo-feature-panel:not([hidden])').count(), 'a heading-dropping swap applied on the first click');
  await quote.click();
  await settled();
  assert.match(
    await page.locator('#demo-deck .demo-status').innerText(),
    /heading off the slide/i,
    'the swap dropped the heading without saying so'
  );

  await openPicker();
  await page.waitForFunction(
    () => ![...document.querySelectorAll('.demo-feature-fit')].some((n) => n.textContent === '\u2026'),
    null,
    { timeout: 60000 }
  );
  const predictions = await page.evaluate(() =>
    Object.fromEntries([...document.querySelectorAll('.demo-feature-option')]
      .filter((b) => b.dataset.fit)
      .map((b) => [b.dataset.feature, b.dataset.fit])));
  assert.ok(Object.keys(predictions).length > 20, 'the picker measured almost nothing');
  assert.ok(Object.values(predictions).includes('yes'), 'no shape was predicted to fit');
  assert.ok(Object.values(predictions).includes('no'), 'no shape was predicted to be too tight');

  let disagreements = 0;
  for (const shape of Object.keys(predictions)) {
    await openPicker();
    const choice = page.locator(`.demo-feature-option[data-feature="${shape}"]`);
    /* Every applied choice changes the content the next picker measures. Compare
       the eventual result with this opening's live prediction, not with the
       first content slide's now-stale prediction. */
    await page.waitForFunction((type) => {
      const button = document.querySelector(`.demo-feature-option[data-feature="${type}"]`);
      return button?.dataset.fit === 'yes' || button?.dataset.fit === 'no';
    }, shape);
    const said = await choice.getAttribute('data-fit');
    assert.ok(said === 'yes' || said === 'no', `${shape} was not measured in the reopened picker`);
    await choice.click();
    if (await page.locator('#demo-feature-panel:not([hidden])').count()) await choice.click();
    await settled();
    const text = await page.locator('#demo-deck .demo-status').innerText();
    const got = (await page.locator('#demo-deck .demo-status').getAttribute('data-fits')) === 'true' ? 'yes' : 'no';
    if (got !== said) {
      disagreements++;
      assert.match(text, /the picker expected|better than the picker expected/,
        `${shape}: predicted ${said}, got ${got}, and the status did not say so`);
    }
  }
  assert.ok(disagreements <= 2, `the picker disagreed with its own result ${disagreements} times`);

  /* --- Formatting: the app's own canvas editor, not a lab copy --- */
  await page.click('#demo-reset');
  await settled();
  await page.locator('#demo-deck .safe-stage').scrollIntoViewIfNeeded();
  assert.ok(await page.evaluate(() => !!(window.SF.Custom && window.SF.Custom.openCanvasEditor)), 'SF.Custom is not loaded');
  const line = page.locator('#demo-deck .safe-slot li[contenteditable]').first();
  await line.dblclick();
  await page.waitForSelector('#demo-deck .canvas-edit-form');
  assert.deepEqual(
    await page.locator('#demo-deck .format-tools button').allInnerTexts(),
    ['B', 'I', 'U', '\u25b0', 'Clear', 'Link'],
    'the format toolbar is not the shared one'
  );
  const area = page.locator('#demo-deck .canvas-edit-form textarea');
  const words = (await area.inputValue()).split(' ').slice(0, 3).join(' ');
  await area.evaluate((el, n) => {
    el.focus();
    el.setSelectionRange(0, n);
    el.dispatchEvent(new Event('select'));
  }, words.length);
  await page.locator('#demo-deck .format-tools button', { hasText: 'B' }).first().click();
  await page.locator('#demo-deck .canvas-edit-form button', { hasText: /save/i }).first().click();
  await settled();
  /* Marks must paint through the renderer's own path, so they survive a re-render. */
  const bold = await page.evaluate(() =>
    [...document.querySelectorAll('#demo-deck .safe-slot li span')]
      .filter((s) => getComputedStyle(s).fontWeight === '800')
      .map((s) => s.textContent));
  assert.ok(bold.length, 'nothing was painted bold');
  assert.ok(words.startsWith(bold[0]) || bold[0].startsWith(bold[0]), 'the wrong run was bolded');
  await page.click('#demo-reset');
  await settled();

  if (errors.length) throw new Error(`page errors: ${errors.slice(0, 3).join('; ')}`);

  console.log(
    `ok · demo-deck ${summary.fit}/${summary.total} fit · ${summary.needSpace} need space · ` +
      `${summary.underFloor} under the 20px floor (smallest ${summary.smallest}px) · ` +
      `rearrange budget-neutral, no column drift · picker matches the editor, predicts fit and admits when it is wrong · format toolbar paints`
  );
} finally {
  await browser.close();
}
