#!/usr/bin/env node
/* Drawing from the presenter desk onto the wall.
 *
 * Two real windows, because that is the whole point: the teacher is looking
 * at the desk and the ink has to come out on the projector. A single-window
 * test would prove nothing about the part that was broken.
 *
 * The lesson is built with SF.buildLesson and started on SF.Player directly:
 * ?lesson= opened it in the classic editor, which went with the classic studios.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import harness from '../../tests/harness.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-desk-ink-'));
const port = await harness.freePort();
const relay = await harness.start(port, dir);
const browser = await chromium.launch({ headless: true });
try {
  const wall = await browser.newPage({ viewport: { width: 1280, height: 820 } });
  const errors = [];
  wall.on('pageerror', (e) => errors.push('wall: ' + e.message));
  await wall.goto(`http://127.0.0.1:${port}/`);
  await wall.waitForFunction(() => window.SF?.Player && SF.buildLesson && SF.buildRunDeck);
  await wall.evaluate(() => {
    const deck = SF.buildLesson('ipdv-intro');
    SF.Player.start(SF.buildRunDeck(deck, (id) => SF.GameStore.get(id)), 0, { fullscreen: false });
  });
  await wall.waitForFunction(() => SF.Player.open && document.querySelector('.teaching-ink'));

  /* The desk is a popup of the wall — that opener link is what carries every
     command, so the test has to open it the way the app does. */
  const [desk] = await Promise.all([
    wall.context().waitForEvent('page'),
    wall.evaluate(() => SF.Player.openPresenter())
  ]);
  desk.on('pageerror', (e) => errors.push('desk: ' + e.message));
  await desk.waitForLoadState();
  await desk.waitForSelector('#boxNow .slide');

  // Ink is off: the desk shows room tools and no drawing surface.
  assert.equal(await desk.locator('#inkTools').isVisible(), false, 'ink tools hidden until asked for');
  assert.equal(await desk.locator('#boxNow .desk-ink').count(), 0, 'no overlay until inking');

  // Turn it on from the desk, the way the teacher does.
  await desk.locator('[data-cmd=ink]').click();
  await desk.waitForSelector('#boxNow .desk-ink');
  assert.equal(await desk.locator('#inkTools').isVisible(), true, 'ink tools appear on the desk');
  assert.equal(await desk.locator('#roomTools').isVisible(), false, 'room tools stand down while inking');
  /* The desk shows its own tools the moment you press, without waiting for
     the wall to agree, so wait for the wall rather than reading it straight
     after the click. */
  await wall.waitForFunction(() => SF.Teaching.isOpen());

  /* Draw a stroke on the desk's preview and read it off the wall. The preview
     is far smaller than 1280x720, so this also checks the coordinates are
     carried in slide space rather than pixels. */
  const box = await desk.locator('#boxNow .desk-ink').boundingBox();
  assert.ok(box.width < 1000, 'the desk preview really is smaller than the wall');
  await desk.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.25);
  await desk.mouse.down();
  await desk.mouse.move(box.x + box.width * 0.50, box.y + box.height * 0.50, { steps: 8 });
  await desk.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.25, { steps: 8 });
  await desk.mouse.up();

  /* Wait for the stroke to finish arriving, not merely to start: the points
     cross one postMessage at a time, so a polyline exists long before the last
     of them lands. */
  await wall.waitForFunction(() => {
    const p = document.querySelector('.teaching-ink polyline');
    if (!p) return false;
    const pts = p.getAttribute('points').split(' ');
    return Number(pts[pts.length - 1].split(',')[0]) > 950;
  });
  const stroke = await wall.evaluate(() => {
    const p = document.querySelector('.teaching-ink polyline');
    const pts = p.getAttribute('points').split(' ').map((s) => s.split(',').map(Number));
    const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
    return { count: pts.length, minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
  });
  assert.ok(stroke.count > 4, 'the whole stroke crossed, not just its ends');
  /* A quarter and three quarters of 1280 are 320 and 960; a quarter and a half
     of 720 are 180 and 360. Allow a few pixels for where the mouse lands. */
  assert.ok(Math.abs(stroke.minX - 320) < 12, `stroke starts at x≈320, got ${stroke.minX}`);
  assert.ok(Math.abs(stroke.maxX - 960) < 12, `stroke ends at x≈960, got ${stroke.maxX}`);
  assert.ok(Math.abs(stroke.minY - 180) < 12, `stroke tops out at y≈180, got ${stroke.minY}`);
  assert.ok(Math.abs(stroke.maxY - 360) < 12, `stroke bottoms at y≈360, got ${stroke.maxY}`);

  /* The teacher has to see the line under their own pen, not only on the
     projector, so the desk keeps a copy in step with the wall. */
  const deskStroke = await desk.evaluate(() => {
    const p = document.querySelector('.desk-ink polyline');
    if (!p) return null;
    const pts = p.getAttribute('points').split(' ').map((s) => s.split(',').map(Number));
    return { count: pts.length, maxX: Math.max(...pts.map((q) => q[0])) };
  });
  assert.ok(deskStroke, 'the desk drew the stroke on its own preview too');
  assert.ok(Math.abs(deskStroke.maxX - 960) < 12, `desk copy reaches x≈960, got ${deskStroke && deskStroke.maxX}`);
  assert.equal(deskStroke.count, stroke.count, 'desk copy and wall have the same points');

  // Spotlight is a different mark, and the desk says which tool is held.
  await desk.locator('[data-ink=spot]').click();
  await desk.waitForFunction(() => document.querySelector('[data-ink=spot]').getAttribute('aria-pressed') === 'true');
  await desk.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await desk.mouse.down(); await desk.mouse.up();
  await wall.waitForFunction(() => document.querySelector('.teaching-ink circle'));

  // Undo takes the last mark back; clear takes the lot.
  assert.equal(await wall.evaluate(() => document.querySelector('.teaching-ink').children.length), 2);
  assert.equal(await desk.evaluate(() => document.querySelector('.desk-ink').children.length), 2,
    'the desk copy has both marks');
  await desk.locator('[data-ink=undo]').click();
  await wall.waitForFunction(() => document.querySelector('.teaching-ink').children.length === 1);
  assert.equal(await desk.evaluate(() => document.querySelector('.desk-ink').children.length), 1,
    'undo took one back on the desk as well');
  await desk.locator('[data-ink=clear]').click();
  await wall.waitForFunction(() => document.querySelector('.teaching-ink').children.length === 0);
  assert.equal(await desk.evaluate(() => document.querySelector('.desk-ink').children.length), 0,
    'clear emptied the desk copy too');

  /* Marks are per slide on the wall, so the desk must not keep showing last
     slide's working over the new one. */
  await desk.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.4);
  await desk.mouse.down(); await desk.mouse.up();
  await wall.waitForFunction(() => document.querySelector('.teaching-ink').children.length === 1);
  await desk.locator('[data-cmd=next]').click();
  await desk.waitForFunction(() => document.querySelector('.desk-ink')
    && document.querySelector('.desk-ink').children.length === 0);
  /* The outgoing slide and its marks linger for the length of the transition,
     so wait for the wall to settle rather than reading it mid-change. */
  await wall.waitForFunction(() => {
    const inks = document.querySelectorAll('.teaching-ink');
    return inks.length > 0 && Array.from(inks).every((n) => n.children.length === 0);
  });

  // Done puts the pen down on both screens.
  await desk.locator('[data-ink=done]').click();
  await wall.waitForFunction(() => !SF.Teaching.isOpen());
  await desk.waitForFunction(() => !document.querySelector('#boxNow .desk-ink'));
  assert.equal(await desk.locator('#roomTools').isVisible(), true, 'room tools come back');

  assert.deepEqual(errors, [], 'no page errors');
  console.log('PASS: desk ink reaches the wall — stroke, spotlight, undo, clear, per-slide reset, done — and the desk shows what it draws');
} finally {
  await browser.close();
  await harness.stop(relay);
  fs.rmSync(dir, { recursive: true, force: true });
}
