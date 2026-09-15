#!/usr/bin/env node
/* Smoke: every control on the teacher desk, driving the demo deck.
 *
 * The desk can reach the wall two ways — the window it was opened from, and a
 * BroadcastChannel for a desk living in its own tab — and it used to send by
 * both at once. Every command landed twice, which for a toggle means nothing
 * happened: Blank flicked on and straight back off, Freeze the same, and Next
 * quietly skipped a slide. Nothing threw, so no test noticed.
 *
 * So this presses each button on the real desk against the real show and
 * checks two things: the wall changed the way that button says it will, and
 * the command arrived exactly once.
 *
 * Room tools (Join QR, Reactions, Blank phones, Floor) are deliberately inert
 * without a live session — they are checked for being inert rather than
 * skipped, because "does nothing" and "does nothing twice" look the same from
 * the outside and only one of them is correct.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import harness from '../tests/harness.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-desk-'));
const port = await harness.freePort();
const relay = await harness.start(port, dir);
const browser = await chromium.launch({ headless: true });
const problems = [];
try {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const wall = await ctx.newPage();
  const wallErrors = [];
  wall.on('pageerror', (e) => wallErrors.push(e.message));

  await wall.goto(`http://127.0.0.1:${port}/?lesson=layout-bank`);
  await wall.waitForFunction(() => window.SF?.Editor?.deck());
  const slides = await wall.evaluate(() => SF.Editor.deck().slides.length);
  await wall.evaluate(() => SF.Editor.workspace.play({ fullscreen: false }));
  await wall.waitForFunction(() => window.SF?.Player?.open, { timeout: 15000 });
  console.log('✓ Demo on the wall —', slides, 'slides');

  /* Count what actually lands, by both routes. */
  await wall.evaluate(() => {
    window.__cmds = [];
    const note = (via) => (ev) => {
      const d = ev.data;
      if (d && d.type === 'sf-presenter-cmd') window.__cmds.push(via + ':' + d.cmd);
    };
    new BroadcastChannel('slideforge.presenter.v1').onmessage = note('bus');
    window.addEventListener('message', note('post'));
  });

  const deskOpens = ctx.waitForEvent('page');
  await wall.evaluate(() => SF.Player.openPresenter());
  const desk = await deskOpens;
  await desk.waitForLoadState('domcontentloaded');
  const deskErrors = [];
  desk.on('pageerror', (e) => deskErrors.push(e.message));
  await desk.waitForFunction(() => document.querySelector('[data-cmd=blank]'), { timeout: 10000 });
  await desk.waitForTimeout(600);
  console.log('✓ Teacher desk open');

  /** What the wall is showing, as far as the desk is concerned. */
  const wallState = () => wall.evaluate(() => ({
    idx: SF.Player.idx,
    blank: !!SF.Player.blank,
    frozen: !!SF.Player.frozen,
    sidebar: SF.Player.roomSidebarState(),
    railWanted: !!SF.Player._railWanted,
    /* The pen is the HUD in inking mode. The .teaching-ink canvas stays in
       the DOM once drawn on, so its presence says nothing about the pen. */
    ink: !!document.querySelector('#hud.hud-inking'),
    help: !!document.querySelector('.cheats.on, #cheats.on')
  }));

  /**
   * Press one desk button and report what the wall did.
   * @param {string} cmd  the data-cmd on the desk
   */
  async function press(cmd) {
    const before = await wallState();
    await wall.evaluate(() => { window.__cmds = []; });
    await desk.click(`[data-cmd=${cmd}]`);
    await desk.waitForTimeout(550);
    const after = await wallState();
    const landed = await wall.evaluate(() => window.__cmds.slice());
    /* 'hello' is the desk asking for a state sync and may follow any command. */
    const mine = landed.filter((x) => x.endsWith(':' + cmd));
    if (process.env.SF_DEBUG) console.log('   [debug]', cmd, JSON.stringify(landed));
    if (mine.length !== 1) {
      problems.push(cmd + ' arrived ' + mine.length + ' times (' + landed.join(', ') + ')');
    }
    return { before, after };
  }

  /** The named field changed, and nothing else did. */
  function changed(cmd, { before, after }, field, want) {
    if (after[field] !== want) {
      problems.push(cmd + ': ' + field + ' is ' + JSON.stringify(after[field]) +
        ', expected ' + JSON.stringify(want) + ' (was ' + JSON.stringify(before[field]) + ')');
    }
  }

  /* --- moving through the deck: exactly one slide at a time ------------- */
  const next = await press('next');
  changed('next', next, 'idx', next.before.idx + 1);
  const prev = await press('prev');
  changed('prev', prev, 'idx', prev.before.idx - 1);
  console.log('✓ Next / Previous move one slide');

  /* --- the two that were broken ---------------------------------------- */
  changed('blank', await press('blank'), 'blank', true);
  changed('blank', await press('blank'), 'blank', false);
  console.log('✓ Blank blanks the wall, and unblanks it');

  changed('freeze', await press('freeze'), 'frozen', true);
  changed('freeze', await press('freeze'), 'frozen', false);
  console.log('✓ Freeze holds the wall, and lets it go');

  /* --- the rest of the desk -------------------------------------------- */
  /* Room view asks for the rail. Without a live room there is nothing to put
     in it — the wall says "Host live to show the join QR" and remembers the
     request instead — so what is checked here is the request landing. */
  changed('rail', await press('rail'), 'railWanted', true);
  changed('ink', await press('ink'), 'ink', true);
  /* Ink on swaps the room tools for the pen, so the way back is ✓ Done — the
     button that sent us here is not on screen any more. */
  await desk.click('[data-ink=done]');
  await desk.waitForTimeout(550);
  const inkOff = await wallState();
  if (inkOff.ink) problems.push('ink: Done did not take the pen off the wall');
  changed('help', await press('help'), 'help', true);
  changed('help', await press('help'), 'help', false);
  await press('reset');
  await press('poll');
  await press('focus');
  console.log('✓ Room view, Ink, Shortcuts, Reset scores, Quick poll, Leaderboard');

  /* --- named answers stays on the desk, off the wall -------------------- */
  const namedBefore = await desk.getAttribute('[data-cmd=who]', 'aria-pressed');
  await desk.click('[data-cmd=who]');
  await desk.waitForTimeout(400);
  const namedAfter = await desk.getAttribute('[data-cmd=who]', 'aria-pressed');
  if (namedBefore === namedAfter) problems.push('who: named answers did not open on the desk');
  const leaked = await wall.evaluate(() => window.__cmds.filter((x) => x.endsWith(':who')).length);
  if (leaked) problems.push('who: named answers were sent to the wall');
  console.log('✓ Named answers open on the desk and are not sent to the wall');

  /* --- room tools: disabled without a live room, on both surfaces ------- */
  for (const cmd of ['join', 'reactions', 'blankPhones', 'floor']) {
    const off = await desk.getAttribute(`[data-cmd=${cmd}]`, 'disabled');
    if (off === null) problems.push(cmd + ': offered on the desk with no room to send it to');
  }
  /* And the wall refuses them even if something does send one — a desk left
     open from a session that has ended is exactly that case. */
  const refused = await wall.evaluate(() => {
    const before = JSON.stringify([SF.Player.idx, !!SF.Player.blank, SF.Player.roomSidebarState()]);
    ['join', 'reactions', 'blankPhones', 'floor'].forEach((c) => SF.Player.control(c));
    return before === JSON.stringify([SF.Player.idx, !!SF.Player.blank, SF.Player.roomSidebarState()]);
  });
  if (!refused) problems.push('the wall acted on a room tool with no live room');
  console.log('✓ Join QR, Reactions, Blank phones, Floor are disabled with no room');

  /* --- and the way out -------------------------------------------------- */
  await desk.click('[data-cmd=exit]');
  await wall.waitForFunction(() => !window.SF.Player.open, { timeout: 8000 });
  console.log('✓ End show closes the wall');

  if (wallErrors.length) problems.push('wall errors: ' + wallErrors.join(' | '));
  if (deskErrors.length) problems.push('desk errors: ' + deskErrors.join(' | '));
  assert.deepEqual(problems, []);
  console.log('\nPresenter controls smoke passed.');
} finally {
  await browser.close();
  relay.kill();
}
process.exit(0);
