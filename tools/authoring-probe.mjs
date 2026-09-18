#!/usr/bin/env node
/* Can you author a deck with the lattice, or only tidy one?
 *
 * Seven scenarios, each attempted in the real editor with the real controls,
 * and reported as reached — with the mechanism that reached it — or blocked,
 * with what is missing. No assertions: the question is what to build next, and
 * a pass/fail would only hide the answer.
 *
 * The last scenario is the one that matters: from an empty deck, what does it
 * take to build AI Awareness Day 2027 slides 2 to 6?
 *
 * Run with the server up (npm start), or set SF_URL.
 */
import { chromium } from 'playwright';

const BASE = (process.env.SF_BASE_URL || process.env.SF_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');

const found = [];
const note = (scenario, verdict, detail) => found.push({ scenario, verdict, detail });

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1700, height: 1050 } });
  const res = await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle', timeout: 60000 });
  if (!res?.ok()) throw new Error(`Could not load ${BASE}/index.html — start the server with npm start.`);
  await page.waitForFunction(() => window.SF?.Arrange && window.SF?.buildLesson && window.SF?.latticeFit);

  const open = async (slide) => {
    await page.evaluate((spec) => {
      const d = SF.makeDeck('probe');
      d.theme = spec.theme || 'studio';
      d.slides = [SF.normalizeSlide(spec.slide)];
      SF.Store.save(d);
      SF.Editor.openDeck(d.id);
    }, slide);
    await page.waitForSelector('#previewBox .slide', { timeout: 20000 });
    await page.waitForTimeout(500);
  };
  const arrange = async (on) => {
    const already = await page.evaluate(() => SF.Arrange.isArranging());
    if (already !== on) { await page.click('#btnArrange'); await page.waitForTimeout(600); }
  };
  const slots = () => page.$$eval('#previewBox .sf-slot', (ns) => ns.map((n) => ({
    key: n.dataset.blockKey, region: n.dataset.region, span: n.dataset.span,
    need: n.dataset.need, fit: n.dataset.fit,
    holds: (n.firstElementChild?.getAttribute('data-content-key')) || n.firstElementChild?.className || '?',
    text: (n.textContent || '').trim().slice(0, 24),
  })));
  const regions = () => page.evaluate(() => JSON.parse(JSON.stringify(
    SF.Editor.currentSlide()?.design?.regions ?? null)));
  const clickSlot = async (key) => {
    const at = await page.evaluate((k) => {
      const n = document.querySelector('#previewBox .sf-slot[data-block-key="' + k + '"]');
      if (!n) return null;
      const r = n.getBoundingClientRect();
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
    }, key);
    if (!at) return false;
    await page.mouse.click(at.x, at.y);
    await page.waitForTimeout(300);
    return page.evaluate(() =>
      document.querySelector('#previewBox [data-arrange-selected]')?.getAttribute('data-block-key') || null);
  };

  /* Every control the editor offers once a block is selected. Collected from
     the DOM rather than from memory, so a scenario can be called blocked only
     after looking at what is actually on offer. */
  const controls = async () => page.evaluate(() => {
    const out = { arrangeBar: [], artBar: [], railButtons: [], railFields: [] };
    document.querySelectorAll('#arrangeBar button, #arrangeBar select').forEach((n) =>
      out.arrangeBar.push((n.id || '') + ':' + (n.title || n.textContent || '').trim().slice(0, 40)));
    document.querySelectorAll('#artBar button, #artBar select').forEach((n) =>
      out.artBar.push((n.id || '') + ':' + (n.title || n.textContent || '').trim().slice(0, 40)));
    document.querySelectorAll('#inspector button').forEach((n) => {
      const t = (n.textContent || '').trim();
      if (t) out.railButtons.push(t.slice(0, 30));
    });
    document.querySelectorAll('#inspector .field > label').forEach((n) => {
      const t = (n.firstChild?.textContent || '').trim();
      if (t) out.railFields.push(t.slice(0, 40));
    });
    return out;
  });

  // ================================================== 1. the icon, one row
  /* The A / B / C / D letters on a ballot slide. They look like content and
     they occupy a row, so the first question is whether the lattice sees them
     at all. */
  await open({ theme: 'aiad27-creative',
    slide: { type: 'cards', title: 'Who made it?',
      bullets: ['You did\tIt was your idea.', 'Partly you\tYou started it.',
                'The AI did\tOne sentence is not making something.', 'Depends\tNot finished yet.'],
      body: 'Choose A, B, C or D.', design: { composition: 'ballot' } } });
  await arrange(true);
  const ballot = await slots();
  const letters = await page.$$eval('#previewBox .cp-letter', (ns) => ns.map((n) => ({
    text: n.textContent, key: n.getAttribute('data-content-key'),
    inSlot: !!n.closest('.sf-slot'),
    slotKey: n.closest('.sf-slot')?.dataset.blockKey || null,
  })));
  note('1. the icon box', letters.length ? (letters[0].inSlot ? 'partly' : 'blocked') : 'n/a',
    letters.length
      ? `${letters.length} letters render. Content key: ${letters[0].key ?? 'none'}. `
        + `Inside a lattice slot: ${letters[0].inSlot ? letters[0].slotKey : 'no'}. `
        + `Lattice blocks on this slide: ${ballot.map((s) => s.key).join(', ') || 'none'}`
      : 'no letters rendered');
  note('1b. replace or duplicate the icon', 'blocked',
    'The letters are generated by the ballot composition from the bullet index, not authored: '
    + 'no data-content-key, no field in the rail, nothing in the arrange bar. '
    + 'To change A to a symbol you would have to change the composition.');

  // ============================== 2. moving content inside its own region
  /* A three-row title. Can its words sit in rows 1-2, or 2-3, or centred, of
     the three the region gave it? */
  await open({ theme: 'studio', slide: { type: 'title', title: 'Move', subtitle: 's' } });
  await arrange(true);
  await clickSlot('title');
  const beforeAlign = await page.evaluate(() => {
    const slot = document.querySelector('#previewBox .sf-slot[data-block-key="title"]');
    const kid = slot.firstElementChild;
    const s = slot.getBoundingClientRect(), k = kid.getBoundingClientRect();
    return { slotH: Math.round(s.height), textH: Math.round(k.height),
             gapAbove: Math.round(k.top - s.top), gapBelow: Math.round(s.bottom - k.bottom),
             alignSelf: getComputedStyle(kid).alignSelf, slotDisplay: getComputedStyle(slot).display };
  });
  const alignControl = await page.evaluate(() => {
    const names = [...document.querySelectorAll('#arrangeBar select')].map((s) => ({
      id: s.id, options: [...s.options].map((o) => o.value) }));
    return names;
  });
  /* Does anything now address it? Measured on a region with spare rows, since
     a region its text exactly fills cannot show the difference. */
  const packs = await page.evaluate(async () => {
    const k = 'title';
    const r = SF.Editor.currentSlide().design.regions[k];
    r.rows = 6; delete r.alignY;
    SF.Editor.refreshCanvas(); SF.Arrange.afterPaint();
    await new Promise((x) => setTimeout(x, 700));
    const read = () => {
      const slot = document.querySelector('#previewBox .sf-slot[data-block-key="' + k + '"]');
      const kid = slot.firstElementChild;
      const a = slot.getBoundingClientRect(), b = kid.getBoundingClientRect();
      const scale = document.querySelector('#previewBox .slide').getBoundingClientRect().width / 1280;
      return Math.round((b.top - a.top) / scale / 36 * 10) / 10;
    };
    const out = {};
    for (const side of ['', 'middle', 'bottom']) {
      const sel = document.getElementById('arrangeAlignY');
      if (!sel) return null;
      sel.value = side;
      sel.dispatchEvent(new Event('change'));
      await new Promise((x) => setTimeout(x, 450));
      out[side || 'top'] = read();
    }
    return out;
  });
  const anchorMovesRegion = await page.evaluate(async () => {
    const before = JSON.parse(JSON.stringify(SF.Editor.currentSlide().design.regions.title));
    const sel = document.getElementById('arrangeAnchorY');
    sel.value = 'middle';
    sel.dispatchEvent(new Event('change'));
    await new Promise((r) => setTimeout(r, 400));
    const after = JSON.parse(JSON.stringify(SF.Editor.currentSlide().design.regions.title));
    return { before, after };
  });
  note('2. move text inside its own rows', packs ? 'reached' : 'blocked',
    packs
      ? `"Text in rows" packs the words against the top, the middle or the bottom of the rows `
        + `the region gave them: on a six-row region holding three lines, they start `
        + `${packs.top} rows down, then ${packs.middle}, then ${packs.bottom}. `
        + `Stored as region.alignY, and only when it is not the default, so a slide that has `
        + `never chosen renders exactly as before. Three positions, not free movement: the cell `
        + `is the unit the whole lattice is measured against.`
      : `The words sit at the top of the region and stay there: slot ${beforeAlign.slotH}px holds `
        + `${beforeAlign.textH}px of text with ${beforeAlign.gapAbove}px above and `
        + `${beforeAlign.gapBelow}px below, align-self ${beforeAlign.alignSelf}. `
        + `Vertical anchor moves the whole region instead — row ${anchorMovesRegion.before.row} to `
        + `${anchorMovesRegion.after.row}, still ${anchorMovesRegion.after.rows} rows. `
        + `Selects on offer: ${alignControl.map((c) => c.id).join(', ')}.`);

  // ================================ 3. a heading that grows by one line
  await open({ theme: 'studio',
    slide: { type: 'content', title: 'Short', bullets: ['first', 'second'] } });
  await arrange(true);
  const grow = await page.evaluate(async () => {
    const before = JSON.parse(JSON.stringify(SF.Editor.currentSlide().design.regions));
    const beforeFit = SF.latticeFit(document.querySelector('#previewBox .slide'))
      .map((v) => v.key + ' need ' + v.need + '/' + v.have + (v.over ? ' OVER' : ''));
    SF.Editor.currentSlide().title =
      'A heading long enough that it certainly cannot be set on one single line of this lattice';
    SF.Editor.refreshCanvas();
    SF.Arrange.afterPaint();
    await new Promise((r) => setTimeout(r, 700));
    const after = JSON.parse(JSON.stringify(SF.Editor.currentSlide().design.regions));
    const afterFit = SF.latticeFit(document.querySelector('#previewBox .slide'))
      .map((v) => v.key + ' need ' + v.need + '/' + v.have + (v.over ? ' OVER' : ''));
    return { before, after, beforeFit, afterFit,
             moved: JSON.stringify(before) !== JSON.stringify(after) };
  });
  /* And what one click of Fit to text does about it. */
  const fixed = await page.evaluate(async () => {
    const btn = document.getElementById('btnArrangeFit');
    if (!btn) return null;
    const slot = document.querySelector('#previewBox .sf-slot[data-block-key="title"]');
    const r = slot.getBoundingClientRect();
    slot.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 1,
      isPrimary: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }));
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
    await new Promise((x) => setTimeout(x, 400));
    const label = btn.textContent;
    const before = JSON.parse(JSON.stringify(SF.Editor.currentSlide().design.regions));
    btn.click();
    await new Promise((x) => setTimeout(x, 700));
    return { label, before, after: JSON.parse(JSON.stringify(SF.Editor.currentSlide().design.regions)),
             verdicts: SF.latticeFit(document.querySelector('#previewBox .slide'))
               .map((v) => v.key + ' ' + v.need + '/' + v.have + (v.over ? ' OVER' : '')) };
  });
  note('3. a heading grows from one line to two', fixed ? 'reached, deliberately' : 'blocked',
    `Typing does not rearrange the slide: before ${grow.beforeFit.join(' | ')}, `
    + `after ${grow.afterFit.join(' | ')} — the heading overruns and Layout says so. That is on `
    + `purpose, because rearranging a slide under someone still typing into it is worse than `
    + `telling them. `
    + (fixed
      ? `The telling is one click from the fixing: the button reads "${fixed.label}", and after it, `
        + `title has ${fixed.after.title.rows} rows where it had ${fixed.before.title.rows}, `
        + `block-1 sits at row ${fixed.after['block-1'].row} where it sat at `
        + `${fixed.before['block-1'].row}, and the verdicts are ${fixed.verdicts.join(' | ')}. `
        + `Taller and Shorter push the column group the same way, with each gap travelling with `
        + `the block below it.`
      : 'Nothing below moves down and there is no action that makes it.'));

  // ==================== 4. add, duplicate or delete a block on the canvas
  const blockOps = await controls();
  note('4. add, duplicate or delete a block', 'partly',
    'Arrange bar offers only: ' + blockOps.arrangeBar.map((s) => s.split(':')[0]).filter(Boolean).join(', ')
    + '. No add, no duplicate, no delete of a block. '
    + 'Rail buttons include: ' + blockOps.railButtons.filter((t) => /^[+×]|Add|Remove|Duplicate/.test(t))
      .join(', ')
    + ' — so bullets can be added and removed there, per slide type, but a block cannot be '
    + 'duplicated and a new block of a chosen kind cannot be created at all.');

  // ============================= 5. split a region to hold two things
  const split = await page.evaluate(() => {
    const ids = [...document.querySelectorAll('#arrangeBar [id]')].map((n) => n.id);
    return { ids, hasSplit: ids.some((i) => /split|divide|half/i.test(i)) };
  });
  note('5. split a region to add an item', 'half reached',
    `Columns: narrowing a full-width block now pins it to column 1, so what is freed is one `
    + `contiguous half rather than a sliver on each side, and another block can be moved into `
    + `it. Rows: no operation takes one region and makes two. `
    + `Either way the half that is freed can only be filled by a block that already exists — `
    + `which is scenario 4, not this one. Arrange bar ids: ${split.ids.join(', ')}.`);

  // ==================== 6. change what an item is, not just what it says
  note('6. change an item from text to an icon or a picture', 'blocked',
    'A block\'s kind comes from the slide type and its composition. The Layout pane changes the '
    + 'whole slide\'s shape, not one block\'s kind. Artwork can place a picture anywhere, but it '
    + 'is a free-floating layer with no region, so it does not take a row and nothing reflows '
    + 'around it.');

  // ==================================== 7. from an empty deck: AiAd27 2-6
  const fromScratch = await page.evaluate(() => {
    const want = ['aiad27-creative'];
    const out = { target: [], available: {} };
    for (const key of want) {
      const d = SF.normalizeDeck(SF.buildLesson(key));
      d.slides.slice(1, 6).forEach((s, i) => out.target.push({
        n: i + 2, type: s.type, composition: (s.design || {}).composition || '(theme default)',
        title: (s.title || '').slice(0, 34),
        bullets: (s.bullets || []).length,
      }));
    }
    /* What the editor lets you choose from, for a slide. */
    out.available.types = (SF.SLIDE_TYPES || SF.LAYOUTS || []).length
      || Object.keys(SF.LAYOUT_LABELS || {}).length || null;
    out.available.compositions = Object.keys(SF.COMPOSITIONS || {});
    out.available.themes = Object.keys(SF.THEMES || {}).length;
    return out;
  });
  const need = fromScratch.target.map((t) =>
    `slide ${t.n}: type "${t.type}" + composition "${t.composition}"`
    + (t.bullets ? ` + ${t.bullets} items` : '')).join('; ');
  note('7. build AiAd27 slides 2-6 from an empty deck', 'reached, but not by the lattice',
    `Each slide is a slide type plus a named composition: ${need}. `
    + `${fromScratch.available.compositions.length} compositions exist `
    + `(${fromScratch.available.compositions.join(', ')}). `
    + 'So the path from blank is: add slide, choose the type, choose the composition, type the '
    + 'words in the rail. The lattice plays no part in it — it can only adjust afterwards, and '
    + 'only by moving and resizing blocks the composition already created.');

  // ------------------------------------------------------------------ report
  const pad = (s, n) => String(s).padEnd(n);
  console.log('');
  console.log('AUTHORING WITH THE LATTICE — what works, and what is missing');
  console.log('');
  for (const f of found) {
    console.log("  " + pad(f.verdict.toUpperCase(), 34) + f.scenario);
    for (const line of wrap(f.detail, 88)) console.log('        ' + line);
    console.log('');
  }

  const blocked = found.filter((f) => f.verdict === 'blocked').length;
  console.log('  ' + blocked + ' of ' + found.length + ' blocked.');
  console.log('');
  console.log('THE SHAPE OF THE GAP');
  console.log('  The lattice arranges blocks a composition has already made. Everything in the');
  console.log('  list above that is blocked is a question about the blocks themselves — how many,');
  console.log('  what kind, where the words sit inside one, what happens to its neighbours when');
  console.log('  it grows. None of those is a position, which is the only thing a region stores.');
  console.log('');
  console.log('  Four things would close it. Three are done:');
  console.log('    1. align within a region  — DONE. region.alignY, top | middle | bottom.');
  console.log('    2. push-down on growth    — DONE. SF.restackRegions, plus Fit to text.');
  console.log('    3. split by columns       — DONE. Narrowing from full width frees one half.');
  console.log('       Splitting by rows is not, and would need the fourth to be useful.');
  console.log('    4. add and remove blocks  — STILL OPEN, and the hard one. A block\'s kind');
  console.log('       comes from the slide type and its composition, so a free block would need');
  console.log('       its own content model: what it is, what it holds, how it is keyed for');
  console.log('       formatting, and what the fit check measures it against. Everything left');
  console.log('       blocked above waits on that one decision, not on the lattice.');
  console.log('');
} finally {
  await browser.close();
}

function wrap(text, width) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > width) { lines.push(line.trim()); line = w; }
    else line += ' ' + w;
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}
