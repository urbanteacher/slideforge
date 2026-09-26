#!/usr/bin/env node
/* What the wall is covered by, shown on the desk.
 *
 * The desk preview is captioned "On screen now". While a leaderboard, a set
 * of responses or the race track was up, it drew the slide underneath and
 * said nothing about what was on top of it, so the caption was a lie in the
 * one moment a teacher most wants to know what the room is looking at.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import harness from '../../tests/harness.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-desk-overlay-'));
const port = await harness.freePort();
const relay = await harness.start(port, dir);
const browser = await chromium.launch({ headless: true });
const players = [];
try {
  const wall = await browser.newPage({ viewport: { width: 1280, height: 820 } });
  const errors = [];
  wall.on('pageerror', (e) => errors.push('wall: ' + e.message));
  await wall.goto(`http://127.0.0.1:${port}/`);
  await wall.waitForFunction(() => window.SF?.buildLesson && SF.Live);

  /* Host a live session so there is a room to have a leaderboard of. Hosted
     directly: the classic editor's Live, which did the same, is gone, and the
     lab's Live draws every slide as a still first. */
  await wall.evaluate(() => {
    const deck = SF.buildLesson('ipdv-intro');
    SF.Store.save(deck);
    SF.Live.host(SF.buildRunDeck(deck, (id) => SF.GameStore.get(id)));
  });
  await wall.waitForSelector('#lobby.on');
  await wall.waitForFunction(() => /^\d{4,6}$/.test((document.getElementById('lobbyPin')?.textContent || '').trim()));
  const pin = (await wall.locator('#lobbyPin').innerText()).trim();

  for (const name of ['Amara', 'Bo', 'Chi']) {
    const p = await harness.connect(port);
    p.send({ t: 'join', pin, name });
    players.push(p);
  }
  await wall.waitForFunction(() => (SF.Live.players || []).length === 3);

  /* Start from the lobby, which is the teacher's own route: it puts the
     lesson on the wall and opens the desk in one press. */
  const [desk] = await Promise.all([
    wall.context().waitForEvent('page'),
    wall.locator('#lobbyStart').click()
  ]);
  desk.on('pageerror', (e) => errors.push('desk: ' + e.message));
  await desk.waitForLoadState();
  await desk.waitForSelector('#boxNow .slide');

  // Nothing is covering the wall yet, so nothing is mirrored.
  assert.equal(await desk.locator('#boxNow .wall-overlay').count(), 0,
    'no overlay mirrored while the wall is showing a plain slide');

  /* Press Show leaderboard on the desk — the button the teacher actually
     reaches for — and check the wall raised an overlay. */
  await desk.locator('[data-cmd=focus]').click();
  await wall.waitForFunction(() => !!document.querySelector('#player [data-overlay]'));

  // ...and that the desk now draws the same panel, not a label about it.
  await desk.waitForSelector('#boxNow .wall-overlay');
  const mirrored = await desk.evaluate(() => {
    const n = document.querySelector('#boxNow .wall-overlay');
    return { cls: n.className, text: n.textContent.replace(/\s+/g, ' ').trim(), kids: n.children.length };
  });
  const onWall = await wall.evaluate(() => {
    const n = document.querySelector('#player [data-overlay]');
    return n.textContent.replace(/\s+/g, ' ').trim();
  });
  assert.ok(mirrored.kids > 0, 'the mirrored overlay has content, not an empty shell');
  assert.equal(mirrored.text, onWall, 'the desk shows exactly what the wall shows');
  for (const name of ['Amara', 'Bo', 'Chi']) {
    assert.ok(mirrored.text.includes(name), `the mirrored panel names ${name}`);
  }

  /* It must be laid out, not dumped at 1280x720 spilling out of the preview,
     and it has to cover the slide rather than sit beside it.
     SF.fit runs a frame after the node is appended, so the panel exists at
     full size for one frame before it is scaled — wait for the scale rather
     than for the element, or this reads the unscaled frame roughly one run
     in six. */
  await desk.waitForFunction(() => {
    const n = document.querySelector('#boxNow .wall-overlay');
    return n && n.getBoundingClientRect().width < 1280;
  });
  const geom = await desk.evaluate(() => {
    const box = document.getElementById('boxNow');
    const n = box.querySelector('.wall-overlay');
    const b = box.getBoundingClientRect(), r = n.getBoundingClientRect();
    return {
      fits: r.width <= b.width + 2 && r.height <= b.height + 2,
      scaled: r.width < 1280,
      covers: r.width > b.width * 0.5
    };
  });
  assert.ok(geom.scaled, 'the panel was scaled down to the preview');
  assert.ok(geom.fits, 'the panel sits inside the preview rather than spilling out');
  assert.ok(geom.covers, 'the panel fills the preview the way it fills the wall');

  // Pressing it again takes the overlay down on both screens.
  await desk.locator('[data-cmd=focus]').click();
  await wall.waitForFunction(() => !document.querySelector('#player [data-overlay]'));
  await desk.waitForFunction(() => !document.querySelector('#boxNow .wall-overlay'));
  assert.equal(await desk.locator('#boxNow .slide').count(), 1, 'the slide is back on the desk');

  /* The room rail sits beside the slide rather than over it. This used to say
     a live session raises it on its own and waited — but the rail goes up when
     scores or responses arrive, and nobody in this room has answered anything,
     so nothing raised it and the wait was the whole failure. Pressed here
     through the control a teacher presses, which is also the honest subject of
     the check: what the desk does with a rail that is up, not what puts one up.
     Cycled rather than set, because Room view is a cycle: off, beside, full. */
  /* Onto a slide that asks the room something. The rail is not a thing a live
     session raises by itself, which is what this used to assume and wait for:
     showSidebar raises the feedback rail when the slide has a prompt and the
     score rail when the deck's quiz keeps a scoreboard, and with neither it
     opens the join card instead — "the join card is the room". A lesson deck
     has no quiz scoreboard, so with no prompt on screen the press this check
     needs cycles the join card on and off and no rail ever appears. Worse, the
     mirror is suppressed while that card is up, by design. So: stand on a
     prompt slide, which is the state a teacher is in when they want the room
     beside the slide. */
  const promptAt = await wall.evaluate(() =>
    SF.Player.deck.slides.findIndex((s) => !!(SF.slideFeedback && SF.slideFeedback(s))));
  assert.ok(promptAt > -1, 'the lesson should carry a slide that asks the room something');
  await wall.evaluate((i) => SF.Player.goTo(i), promptAt);
  await wall.waitForFunction((i) => SF.Player.idx === i, promptAt);
  await wall.waitForFunction(() => !!(SF.Live && SF.Live.prompt));

  for (let i = 0; i < 3; i++) {
    if ((await desk.locator('#btnRail').innerText()).trim() === 'Room: beside the slide') break;
    await desk.locator('[data-cmd=rail]').click();
    await desk.waitForTimeout(500);
  }
  assert.equal((await desk.locator('#btnRail').innerText()).trim(), 'Room: beside the slide',
    'Room view should cycle to the rail, which is the state this check is about');
  await wall.waitForFunction(() => !!SF.Player._rail);
  await desk.waitForSelector('#boxNow .desk-wall-rail');
  assert.ok(await wall.evaluate(() => !!SF.Player._rail), 'the wall really has a rail up');
  /* The middle room-view stop is named for what a teacher sees, not for the
     state string behind it. Those two parted company in f0cc5b5: the states
     became 'rail' and 'focus' — the deck model's own words, translated at the
     wire by ROOM_VIEW_WIRE — and the label became "beside the slide". This
     asserted the old wording and was measuring the rename rather than the
     mirroring it is here for. */
  assert.equal((await desk.locator('#btnRail').innerText()).trim(), 'Room: beside the slide',
    'the desk button names the state in the words a teacher reads');
  assert.ok((await desk.evaluate(() => [...document.querySelectorAll('#boxNow .wall-chrome span')]
    .map((s) => s.textContent))).includes('Room: beside'), 'and the chip names it too');

  /* Join QR covers the wall from outside #player, which is exactly why it was
     invisible from the desk — it is in no deck and under no viewport. */
  await desk.locator('[data-cmd=join]').click();
  await wall.waitForFunction(() => !!document.querySelector('#joincard.on'));
  await desk.waitForSelector('#boxNow .wall-overlay.desk-join-mirror');
  const joinText = await desk.evaluate(() =>
    document.querySelector('#boxNow .wall-overlay').textContent.replace(/\s+/g, ' '));
  const wallPin = await wall.evaluate(() =>
    (document.querySelector('#joincard .pin') || {}).textContent || '');
  assert.ok(wallPin.trim(), 'the wall card is showing a PIN to mirror');
  assert.ok(joinText.includes(wallPin.trim()), 'the mirrored join card carries the same PIN');
  await desk.locator('[data-cmd=join]').click();
  await desk.waitForFunction(() => !document.querySelector('#boxNow .desk-join-mirror'));

  /* A timer or a break is drawn on the wall over the slide. The desk used to
     get only a readout of it in a side panel, which tells you a countdown is
     running without showing you what the room is looking at. */
  await wall.evaluate(() => SF.Player.momentCommand({
    action: 'start', kind: 'timer', title: 'Thinking time', seconds: 120
  }));
  await desk.waitForSelector('#boxNow .lesson-live-overlay');
  assert.ok((await desk.evaluate(() =>
    document.querySelector('#boxNow .lesson-live-overlay').textContent)).includes('Thinking time'),
    'the mirrored timer names the moment');

  await wall.evaluate(() => SF.Player.momentCommand({
    action: 'start', kind: 'break', title: 'Take a break', seconds: 300
  }));
  await desk.waitForSelector('#boxNow .lesson-live-overlay.is-break');

  /* Blank hides the break on the wall, so it must hide it on the desk too —
     otherwise the preview shows a break the room cannot see. */
  await desk.locator('[data-cmd=blank]').click();
  await wall.waitForFunction(() => {
    var n = document.querySelector('#player .lesson-live-overlay');
    return !n || getComputedStyle(n).display === 'none';
  });
  await desk.waitForFunction(() => document.getElementById('boxNow').classList.contains('wall-blank'));
  await desk.locator('[data-cmd=blank]').click();
  await wall.evaluate(() => SF.Player.momentCommand({ action: 'clear' }));

  assert.deepEqual(errors, [], 'no page errors');
  console.log('PASS: the desk mirrors the wall overlay — leaderboard, join QR, room rail, timer and break all reach the preview');
} finally {
  players.forEach((p) => { try { p.socket.close(); } catch (e) {} });
  await browser.close();
  await harness.stop(relay);
  fs.rmSync(dir, { recursive: true, force: true });
}
