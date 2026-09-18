#!/usr/bin/env node
/* Smoke: the Artwork face moves a slide's decoration, and places a picture.
 *
 * The face had no end-to-end check. It is also the one face whose reach is not
 * obvious from its button: a theme's decoration is drawn by the theme, so on a
 * slide the theme decorates nothing there is nothing to click. This measures
 * that reach rather than assuming it, and the census at the end is deliberately
 * an assertion — if a theme starts or stops decorating a slide type, the number
 * here should be what tells you.
 *
 * Playwright's clicks are real input, and every selector is scoped to
 * #previewBox, because the rail renders each slide too: unscoped, a
 * [data-art-key] locator matches a 60px thumbnail.
 *
 * What it holds to:
 *   - the face turns on from the button, and makes theme shapes clickable
 *     (they declare pointer-events:none the rest of the time, which is why
 *     nothing on a slide could be dragged before the face existed)
 *   - a click selects, and enables the controls that need a selection
 *   - arrows move by one slide pixel, shift by ten, stored in slide pixels so
 *     a pose means the same place at any zoom
 *   - a pose survives the repaint that follows it
 *   - − / + scale a shape and resize a picture, which are different things
 *   - Hide ghosts a shape on the face and removes it everywhere else, and is
 *     reversible — hiding must not be a one-way door
 *   - a placed picture lands in slide.art.pictures, renders, drags, and ✕
 *     deletes it outright, while ✕ on a theme shape only hides it
 *   - ↺ Theme drops the poses and keeps the author's own pictures
 *   - Escape finishes
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import harness from '../../tests/harness.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-artwork-face-'));
const port = await harness.freePort();
const relay = await harness.start(port, dir);
const browser = await chromium.launch();
let checks = 0;

/* A real PNG, small enough to be a data URL without straining storage: one
   opaque red pixel. Written to the temp dir so the file picker has a file. */
const PIXEL = path.join(dir, 'dot.png');
fs.writeFileSync(PIXEL, Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==',
  'base64'));

try {
  const page = await browser.newPage({ viewport: { width: 1700, height: 1050 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForFunction(() => typeof window.SF?.Artwork?.setEditing === 'function', null, { timeout: 30000 });

  /* A title slide on the Studio theme: the default theme, and title is one of
     the two slide types any theme actually decorates. See the census below. */
  await page.evaluate(() => {
    const d = SF.makeDeck('Artwork face');
    d.slides = [SF.normalizeSlide({ type: 'title', title: 'Move the decoration', subtitle: 'and place your own' })];
    SF.Store.save(d);
    SF.Editor.openDeck(d.id);
  });
  await page.waitForSelector('#previewBox .slide', { timeout: 20000 });

  const artOf = () => page.evaluate(() => JSON.parse(JSON.stringify(SF.Editor.currentSlide().art ?? null)));
  /* Keyed rather than positional, because the controls do not all answer to a
     selection the same way: ✕ stays off for a theme shape however well it is
     selected, since a shape belongs to the theme and the slide has no copy to
     restore from. That asymmetry is the point, so the test reads each by id. */
  const gated = () => page.evaluate(() => {
    const out = {};
    for (const id of ['btnArtSmaller', 'btnArtBigger', 'btnArtHide', 'btnArtDelete']) {
      const b = /** @type {HTMLButtonElement|null} */ (document.getElementById(id));
      out[id] = b ? b.disabled : null;
    }
    return out;
  });
  /* A point that is actually on the thing, and actually reachable.
     Two reasons the geometric centre will not do. The canvas clips, and a
     theme's decoration is often deliberately larger than the slide — studio's
     art-orbit is a 183px circle whose centre lands 90px below the canvas, in
     the speaker-notes textarea, so a click there selects nothing. And the
     locator is scoped to #previewBox because the rail renders every slide too:
     unscoped, [data-art-key] matches a 60px thumbnail.
     So: intersect the element with the canvas, take the middle of what is
     left, and refuse to return a point that something else would catch. */
  const grabPoint = async (selector) => {
    const found = await page.evaluate((sel) => {
      const n = document.querySelector('#previewBox ' + sel);
      if (!n) return { error: 'no node' };
      const a = n.getBoundingClientRect();
      const host = document.getElementById('previewBox').getBoundingClientRect();
      const left = Math.max(a.left, host.left), right = Math.min(a.right, host.right);
      const top = Math.max(a.top, host.top), bottom = Math.min(a.bottom, host.bottom);
      if (right - left < 6 || bottom - top < 6) return { error: 'clipped out of the canvas' };
      const x = Math.round((left + right) / 2), y = Math.round((top + bottom) / 2);
      const hit = document.elementFromPoint(x, y);
      return { x, y, onTarget: !!hit && (hit === n || n.contains(hit) || hit.contains(n)),
               hit: hit ? hit.tagName + '.' + hit.className : 'nothing' };
    }, selector);
    assert.ok(!found.error, `${selector}: ${found.error}`);
    assert.ok(found.onTarget, `${selector}: its reachable middle is covered by ${found.hit}`);
    return { x: found.x, y: found.y };
  };

  /* 1. Off by default: the decoration is inert while you are writing. */
  assert.equal(await page.$eval('#previewBox [data-art-key]',
    (n) => getComputedStyle(n).pointerEvents), 'none', 'theme art should be inert before the face is on');
  assert.ok(await page.isHidden('#artBar'), 'the art bar should be down');
  checks++;

  /* 2. On from the button, not the API. */
  await page.click('#btnArtFlip');
  await page.waitForSelector('#previewBox.art-editing [data-art-key]', { timeout: 10000 });
  const keys = await page.$$eval('#previewBox [data-art-key]', (ns) => ns.map((n) => n.getAttribute('data-art-key')));
  assert.ok(keys.length >= 2, `the face should expose the theme's shapes, got ${keys.length}`);
  assert.equal(await page.$eval('#previewBox [data-art-key]',
    (n) => getComputedStyle(n).pointerEvents), 'auto', 'and wake them up');
  assert.deepEqual(await gated(),
    { btnArtSmaller: true, btnArtBigger: true, btnArtHide: true, btnArtDelete: true },
    'every control needing a selection should start disabled');
  assert.match(await page.textContent('#artWhat'), /Click a shape or picture/, 'the bar should ask for one');
  checks++;

  /* 3. A click selects, and the controls come alive.
        The shape is chosen by what a pointer can actually reach, not by
        document order: a theme's shapes overlap each other and hang off the
        slide, so studio's art-orbit is covered by art-tile at every point of
        it inside the canvas. The topmost one at a point is the one a click
        gets, which is also what an author experiences. */
  const reachable = await page.evaluate(() => {
    const host = document.getElementById('previewBox').getBoundingClientRect();
    return [...document.querySelectorAll('#previewBox [data-art-key]')].map((n) => {
      const a = n.getBoundingClientRect();
      const left = Math.max(a.left, host.left), right = Math.min(a.right, host.right);
      const top = Math.max(a.top, host.top), bottom = Math.min(a.bottom, host.bottom);
      if (right - left < 6 || bottom - top < 6) return null;
      const hit = document.elementFromPoint(Math.round((left + right) / 2), Math.round((top + bottom) / 2));
      return hit && (hit === n || n.contains(hit)) ? n.getAttribute('data-art-key') : null;
    }).filter(Boolean);
  });
  assert.ok(reachable.length, `none of the theme's ${keys.length} shapes can be clicked: ${keys.join(', ')}`);
  const shapeKey = reachable[0];
  let at = await grabPoint(`[data-art-key="${shapeKey}"]`);
  await page.mouse.click(at.x, at.y);
  await page.waitForTimeout(300);
  assert.equal(await page.$$eval('#previewBox [data-art-selected]', (n) => n.length), 1, 'one shape selected');
  assert.equal(await page.getAttribute('#previewBox [data-art-selected]', 'data-art-key'), shapeKey,
    'and it should be the one under the pointer');
  assert.deepEqual(await gated(),
    { btnArtSmaller: false, btnArtBigger: false, btnArtHide: false, btnArtDelete: true },
    'a selected shape should enable size and hide, and leave delete off');
  assert.match(await page.getAttribute('#btnArtDelete', 'title'), /hide it instead/,
    'and say why delete is off rather than just being dead');
  assert.match(await page.textContent('#artWhat'), new RegExp('Theme shape \u00b7 ' + shapeKey),
    'the bar should name what is selected');
  checks++;

  /* 4. Arrows move in slide pixels, shift by ten. Stored, not just drawn: a
        pose in screen pixels would mean a different place at every zoom. */
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(250);
  const one = (await artOf()).poses[shapeKey];
  assert.equal(typeof one.x, 'number', 'a move should write a pose');
  await page.keyboard.press('Shift+ArrowRight');
  await page.waitForTimeout(250);
  const ten = (await artOf()).poses[shapeKey];
  assert.equal(ten.x - one.x, 10, 'shift should move ten slide pixels, not one');
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(250);
  assert.equal((await artOf()).poses[shapeKey].y - one.y, 1, 'ArrowDown should move one');
  checks++;

  /* 5. And the pose survives the repaint it caused. */
  const posed = (await artOf()).poses[shapeKey];
  await page.evaluate(() => { SF.Editor.refreshCanvas(); SF.Artwork.afterPaint(); });
  await page.waitForTimeout(400);
  assert.deepEqual((await artOf()).poses[shapeKey], posed, 'a repaint should not lose the pose');
  checks++;

  /* 6. − / + scale a shape. A picture is resized by width instead, because a
        picture has one, and a theme shape is sized by its own CSS. */
  at = await grabPoint(`[data-art-key="${shapeKey}"]`);
  await page.mouse.click(at.x, at.y);
  await page.waitForTimeout(250);
  await page.click('#btnArtBigger');
  await page.waitForTimeout(300);
  const bigger = (await artOf()).poses[shapeKey].scale;
  assert.ok(bigger > 1, `+ should scale a shape up, got ${bigger}`);
  await page.click('#btnArtSmaller');
  await page.waitForTimeout(300);
  assert.ok((await artOf()).poses[shapeKey].scale < bigger, '− should bring it back down');
  checks++;

  /* 7. Hide removes the shape everywhere but the face, where it stays ghosted
        so there is something left to click to bring it back. */
  await page.click('#btnArtHide');
  await page.waitForTimeout(400);
  assert.equal((await artOf()).poses[shapeKey].hidden, true, 'Hide should record it');
  const ghost = await page.$eval(`#previewBox [data-art-key="${shapeKey}"]`, (n) => ({
    drawn: getComputedStyle(n).display !== 'none',
    faded: Number(getComputedStyle(n).opacity) < 0.5,
    marked: n.hasAttribute('data-art-hidden'),
  }));
  assert.deepEqual(ghost, { drawn: true, faded: true, marked: true },
    'a hidden shape should be ghosted on the face, not gone from it');
  assert.equal(await page.evaluate((k) => {
    const d = SF.Editor.deck(), s = SF.Editor.currentSlide();
    const n = SF.renderSlide(d, s, { interactive: false, index: 0, total: 1 });
    const shape = n.querySelector('[data-art-key="' + k + '"]');
    return shape ? shape.style.display : 'absent';
  }, shapeKey), 'none', 'and hidden off the face, where the face is not drawing it');
  at = await grabPoint(`[data-art-key="${shapeKey}"]`);
  await page.mouse.click(at.x, at.y);
  await page.waitForTimeout(250);
  await page.click('#btnArtHide');
  await page.waitForTimeout(400);
  assert.ok(!(await artOf()).poses[shapeKey].hidden, 'and hiding must be reversible');
  checks++;

  /* 8. Dragging a shape, which is the other path through originOf and used to
        compound the same way: the first drag landed somewhere near, the second
        threw the shape off the slide. Twice, to catch exactly that. */
  const settled = (await artOf()).poses[shapeKey].x;
  for (const by of [60, -60]) {
    at = await grabPoint(`[data-art-key="${shapeKey}"]`);
    const was = await page.$eval(`#previewBox [data-art-key="${shapeKey}"]`, (n) => n.offsetLeft);
    await page.mouse.move(at.x, at.y);
    await page.mouse.down();
    await page.mouse.move(at.x + by, at.y, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(400);
    const now = (await artOf()).poses[shapeKey].x;
    const scale = await page.evaluate(() => document.querySelector('#previewBox .slide')
      .getBoundingClientRect().width / 1280);
    const wanted = was + by / scale;
    assert.ok(Math.abs(now - wanted) < 12,
      `drag by ${by}: expected about ${Math.round(wanted)} from ${was}, got ${now}`);
  }
  /* Out and back should land where it started. A drag that read its origin in
     the wrong coordinate space could still look plausible once; it cannot come
     home. */
  assert.ok(Math.abs((await artOf()).poses[shapeKey].x - settled) < 12,
    `two drags out and back should return to ${settled}, got ${(await artOf()).poses[shapeKey].x}`);
  checks++;

  /* 9. A picture the author places. The one path that works on every slide
        type and every theme, decorated or not. */
  await page.setInputFiles('#artPicture', PIXEL);
  await page.waitForFunction(() => (SF.Editor.currentSlide().art?.pictures || []).length === 1, null, { timeout: 15000 });
  const pic = (await artOf()).pictures[0];
  assert.match(pic.src, /^data:image\/png;base64,/, 'the picture should be stored in the deck');
  assert.deepEqual([pic.x, pic.y, pic.w], [120, 120, 360], 'placed in from the corner, not under the edge furniture');
  await page.waitForSelector(`#previewBox [data-art-pic="${pic.id}"]`, { timeout: 10000 });
  assert.equal(await page.getAttribute('#previewBox [data-art-selected]', 'data-art-pic'), pic.id,
    'and selected, so it can be moved straight away');
  checks++;

  /* 10. Dragged by the mouse, not only by the keys. Two cells' worth, so the
        move cannot be confused with a click. */
  at = await grabPoint(`[data-art-pic="${pic.id}"]`);
  await page.mouse.move(at.x, at.y);
  await page.mouse.down();
  await page.mouse.move(at.x + 80, at.y + 40, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  const dragged = (await artOf()).pictures[0];
  assert.ok(dragged.x > pic.x + 20, `a drag should move it right, ${pic.x} to ${dragged.x}`);
  assert.ok(dragged.y > pic.y + 10, `and down, ${pic.y} to ${dragged.y}`);
  checks++;

  /* 11. + resizes a picture by width; ✕ deletes it outright, unlike a theme
         shape, which the slide has no copy of to restore. */
  at = await grabPoint(`[data-art-pic="${pic.id}"]`);
  await page.mouse.click(at.x, at.y);
  await page.waitForTimeout(250);
  await page.click('#btnArtBigger');
  await page.waitForTimeout(300);
  assert.equal((await artOf()).pictures[0].w, 400, '+ should widen a picture by 40');
  await page.click('#btnArtDelete');
  await page.waitForTimeout(400);
  assert.equal((await artOf()).pictures.length, 0, '✕ should remove the author’s own picture');
  assert.equal(await page.$$eval(`#previewBox [data-art-pic]`, (n) => n.length), 0, 'and stop drawing it');
  checks++;

  /* 12. ↺ Theme drops the poses. Dropped rather than written to match, so the
         slide follows the theme again when the theme changes. */
  at = await grabPoint(`[data-art-key="${shapeKey}"]`);
  await page.mouse.click(at.x, at.y);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(300);
  assert.ok((await artOf()).poses[shapeKey], 'posed again, so there is something to reset');
  await page.setInputFiles('#artPicture', PIXEL);
  await page.waitForFunction(() => (SF.Editor.currentSlide().art?.pictures || []).length === 1, null, { timeout: 15000 });
  await page.click('#btnArtReset');
  await page.waitForTimeout(500);
  const afterReset = await artOf();
  assert.deepEqual(afterReset.poses, {}, 'Theme should drop the poses');
  assert.equal(afterReset.pictures.length, 1, 'and keep the author’s picture, which is not the theme’s business');
  checks++;

  /* 13. Escape finishes, and the face goes with it. */
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  assert.equal(await page.evaluate(() => SF.Artwork.isEditing()), false, 'Escape should finish');
  assert.equal(await page.$$eval('#previewBox.art-editing', (n) => n.length), 0, 'and drop the face');
  assert.ok(await page.isHidden('#artBar'), 'and the bar');
  assert.equal(await page.$eval('#previewBox [data-art-key]',
    (n) => getComputedStyle(n).pointerEvents), 'none', 'and make the decoration inert again');
  checks++;

  /* 14. Which side of the words. One control, two values, per item.
         The defaults are what the app already did — a picture in front, a
         theme shape behind — so the first two assertions are about nothing
         moving, and the rest are about the two crossings that were impossible
         before: tools/art-order-probe.mjs measured a picture that could not go
         behind the text and a theme shape that could not come in front of a
         picture.
         Back into the face first: check 13 left it with Escape. */
  await page.click('#btnArtFlip');
  await page.waitForSelector('#previewBox.art-editing [data-art-key]', { timeout: 10000 });
  await page.setInputFiles('#artPicture', PIXEL);
  await page.waitForFunction(() => (SF.Editor.currentSlide().art?.pictures || []).length === 2, null, { timeout: 15000 });
  const fresh = (await artOf()).pictures[1];
  assert.equal(fresh.order, undefined, 'a new picture stores no side until one is chosen');
  assert.equal(await page.inputValue('#artOrder'), 'front',
    'and the control shows the default it actually has: in front of the words');
  assert.equal(await page.$eval(`#previewBox [data-art-pic="${fresh.id}"]`,
    (n) => n.parentElement.className), 'slide-art slide-art-front',
    'so it renders in the front layer, exactly as before this control existed');
  checks++;

  /* A picture behind the words. The backdrop case, and the common intent. */
  await page.selectOption('#artOrder', 'back');
  await page.waitForTimeout(500);
  assert.equal((await artOf()).pictures[1].order, 'back', 'the side is stored on the item');
  const behind = await page.evaluate((id) => {
    const root = document.querySelector('#previewBox .slide');
    const img = root.querySelector('[data-art-pic="' + id + '"]');
    const text = root.querySelector('[data-content-key]');
    return {
      layer: img.parentElement.className,
      z: getComputedStyle(img.parentElement).zIndex,
      padLifted: getComputedStyle(root.querySelector('.pad')).zIndex,
      slideMarked: root.classList.contains('sf-art-behind'),
      overText: SF.paintsAbove(img, text),
    };
  }, fresh.id);
  assert.equal(behind.layer, 'slide-art slide-art-back', 'it moves to the back layer');
  assert.equal(behind.overText, false, 'and paints under the words');
  assert.equal(behind.slideMarked, true, 'the slide is marked, so the pad can be lifted for it alone');
  assert.equal(behind.padLifted, '1', 'and the pad is lifted — a static pad would stay under it');
  checks++;

  /* A theme shape in front. The other crossing. */
  at = await grabPoint(`[data-art-key="${shapeKey}"]`);
  await page.mouse.click(at.x, at.y);
  await page.waitForTimeout(250);
  assert.equal(await page.inputValue('#artOrder'), 'back',
    'a theme shape shows its own default, which is the other one');
  await page.selectOption('#artOrder', 'front');
  await page.waitForTimeout(500);
  const fronted = await page.evaluate((k) => {
    const root = document.querySelector('#previewBox .slide');
    const shape = root.querySelector('[data-art-key="' + k + '"]');
    const text = root.querySelector('[data-content-key]');
    const pic = root.querySelector('.slide-art-front .slide-art-img');
    return {
      order: shape.getAttribute('data-art-order'),
      z: getComputedStyle(shape).zIndex,
      overText: SF.paintsAbove(shape, text),
      overPicture: pic ? SF.paintsAbove(shape, pic) : null,
      siblingsStayed: [...root.querySelectorAll('.theme-art > *')]
        .filter((n) => n.getAttribute('data-art-order') === 'front').length,
    };
  }, shapeKey);
  assert.equal(fronted.order, 'front', 'the shape carries its side into the DOM');
  assert.equal(fronted.overText, true, 'and paints over the words');
  assert.equal(fronted.overPicture, true, 'and over a fronted picture, which is what "in front" has to mean');
  assert.equal(fronted.siblingsStayed, 1,
    'one shape forward, not the layer — its siblings stay where the theme put them');
  checks++;

  /* 15. And the review says so. Ordering without this is a way to blank a
         slide that no check mentions; the measure went in first. */
  /* On its own deck, not the slide the checks above have been posing and
     placing on: by now that slide carries three pictures and a fronted theme
     shape, and the one at 120,120 covers a bullet on purpose. The review
     flagged it, correctly, which is not what this check is about. */
  const verdict = await page.evaluate(async (src) => {
    const d = SF.makeDeck('review');
    d.theme = 'studio';
    const s = SF.normalizeSlide({ type: 'content', title: 'Can you read this', bullets: ['no', 'not at all'] });
    const covering = { id: 'blanket', src, x: 0, y: 0, w: 1280, order: 'front', alt: '' };
    s.art = { poses: {}, pictures: [covering] };
    d.slides = [s];
    const bad = await SF.Review.check(d, s, 0);
    covering.order = 'back';
    const good = await SF.Review.check(d, s, 0);
    return {
      front: { fits: bad.fits, covered: (bad.covered || []).map((c) => c.key + ' ' + c.pct + '%'),
               boundary: bad.over.length },
      back: { fits: good.fits, covered: (good.covered || []).length },
    };
  }, await page.evaluate(() => SF.Editor.currentSlide().art.pictures[0].src));
  assert.equal(verdict.front.fits, false, 'a slide under a full-bleed picture must not pass the review');
  assert.equal(verdict.front.boundary, 0,
    'and not because anything overflowed — nothing does, which is why this needed its own measure');
  assert.ok(verdict.front.covered.length >= 1,
    `the review should name what is covered, said ${JSON.stringify(verdict.front.covered)}`);
  assert.ok(verdict.front.covered.every((c) => /100%$/.test(c)),
    `fully covered blocks should read 100%, got ${JSON.stringify(verdict.front.covered)}`);
  assert.equal(verdict.back.fits, true, 'the same picture behind the words is fine');
  assert.equal(verdict.back.covered, 0, 'and nothing is reported covered');
  checks++;

  /* 16. How far the face reaches, which is not obvious from its button. A
         theme's decoration belongs to the theme, so the face finds shapes only
         where a theme draws them: title and section slides, in 13 of the 23
         themes. On every other slide type — content, split, image, quote,
         cards, keywords, statement — and in the ten themes below, the face
         opens on a slide with nothing to click, and only ＋ Picture does
         anything at all.

         Worth knowing before promising an author they can move the
         decoration, and asserted rather than described so a theme gaining or
         losing its artwork shows up as a failing line here instead of as a
         puzzled author. Note aiad27 draws none while aiad26 draws two per
         cover — the campaign's own change, not a fault. */
  const census = await page.evaluate(() => {
    const out = {};
    for (const theme of Object.keys(SF.THEMES)) {
      for (const type of ['title', 'section', 'content', 'split', 'image', 'quote', 'cards', 'keywords', 'statement']) {
        const d = SF.makeDeck('c'); d.theme = theme;
        d.slides = [SF.normalizeSlide({ type, title: 'T', subtitle: 's', body: 'b', bullets: ['a', 'b'] })];
        const n = SF.renderSlide(d, d.slides[0], { interactive: false, index: 0, total: 1 });
        document.body.appendChild(n);
        const shapes = n.querySelectorAll('[data-art-key]').length;
        n.remove();
        if (shapes) out[theme + '/' + type] = shapes;
      }
    }
    return out;
  });
  const decorated = Object.keys(census);
  const types = new Set(decorated.map((k) => k.split('/')[1]));
  const themes = new Set(decorated.map((k) => k.split('/')[0]));
  assert.deepEqual([...types].sort(), ['section', 'title'],
    `only title and section slides carry theme art, found ${[...types].sort().join(', ')}`);
  const undecorated = await page.evaluate((list) => Object.keys(SF.THEMES).filter((t) => !list.includes(t)),
    [...themes]);
  assert.deepEqual(undecorated.sort(),
    ['aiad27-creative', 'aiad27-future', 'aiad27-responsible', 'aiad27-safe', 'aiad27-smart',
     'ember', 'midnight', 'mono', 'ocean', 'paper'],
    `ten themes draw no artwork at all, found ${undecorated.sort().join(', ')}`);
  checks++;

  assert.deepEqual(errors, []);
  console.log(`ok · artwork face: ${checks} checks · a click selects, arrows and −/+ pose a shape, `
    + `Hide is reversible, a placed picture drags and deletes, ↺ Theme keeps your pictures, `
    + `each item chooses its side of the words and the review flags what is covered · `
    + `theme art reaches ${decorated.length} of `
    + `${await page.evaluate(() => Object.keys(SF.THEMES).length * 9)} theme/type pairs `
    + `— title and section only, in ${themes.size} of `
    + `${await page.evaluate(() => Object.keys(SF.THEMES).length)} themes`);
} finally {
  await browser.close();
  await harness.stop(relay);
  fs.rmSync(dir, { recursive: true, force: true });
}
