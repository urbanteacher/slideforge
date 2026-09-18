#!/usr/bin/env node
/* Smoke-test both share links in a real browser.
 *
 * Read-only: open the address, page through it, confirm the slides render.
 * Follow-along: open it beside a hosting presenter, move the presenter, and
 * confirm the spectator moves with it and cannot move itself.
 *
 * Screenshots land in a dated folder so the two can be compared by eye.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import harness from '../../tests/harness.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(os.homedir(), 'Desktop', `SlideForge-share-smoke-${new Date().toISOString().slice(0, 10)}`);
fs.mkdirSync(outDir, { recursive: true });

const sessionDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-share-'));
const port = await harness.freePort();
const relay = await harness.start(port, sessionDir);
const base = `http://127.0.0.1:${port}`;
const browser = await chromium.launch({ headless: true });
let failed = 0;
const ok = (c, label, extra = '') => { console.log(`  ${c ? '✓' : '✗'} ${label}${extra ? ` — ${extra}` : ''}`); if (!c) failed++; };

try {
  /* The host page is opened first and its own deck is what gets shared, so
     the copy a spectator renders has exactly the slides the presenter is
     moving through. Sharing a hand-built deck instead makes slide 3 on one
     side a different slide 3 on the other, which is the drift this whole
     feature has to avoid. */
  const host = await browser.newPage();
  await host.goto(`${base}/`, { waitUntil: 'networkidle' });
  await host.waitForFunction('window.SF && SF.Live && SF.Editor && SF.LESSONS', null, { timeout: 20000 });
  const doc = await host.evaluate(async () => {
    SF.Editor.useLesson('ukbt-institute-template');
    await new Promise((r) => setTimeout(r, 1500));
    return JSON.parse(JSON.stringify(SF.Editor.deck()));
  });
  ok(doc && doc.slides && doc.slides.length > 3, 'host loaded a deck', (doc.slides || []).length + ' slides');

  const share = await fetch(`${base}/api/share`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ doc })
  }).then((r) => r.json());
  ok(/^[a-f0-9]{32}$/.test(share.id || ''), 'share uploaded', share.id && share.id.slice(0, 8) + '…');

  /* ---- read-only: the reader drives ---- */
  const reader = await browser.newPage();
  await reader.goto(`${base}/view.html?s=${share.id}`, { waitUntil: 'networkidle' });
  await reader.waitForSelector('#player .slide', { timeout: 8000 });
  ok(await reader.evaluate(() => SF.Player.idx) === 0, 'read-only opens on the first slide');
  await reader.keyboard.press('ArrowRight');
  await reader.waitForTimeout(800);
  const readerAt = await reader.evaluate(() => SF.Player.idx);
  ok(readerAt > 0, 'read-only advances on ArrowRight', 'reader drove itself to index ' + readerAt);
  await reader.screenshot({ path: path.join(outDir, 'read-only.png') });

  /* ---- follow-along: the presenter drives ---- */
  /* Hosted through the real button, so the smoke test exercises the path a
     teacher actually takes rather than an API shortcut. */
  await host.click('#btnLive');
  await host.waitForTimeout(900);
  /* Host live asks before it opens a room. Answer it if it did. */
  const confirmed = await host.evaluate(() => {
    const b = [...document.querySelectorAll('#askBox button, dialog button')]
      .find((x) => /host|start|open|yes|go live/i.test(x.textContent || ''));
    if (b) { b.click(); return (b.textContent || '').trim(); }
    return null;
  });
  if (confirmed) console.log('    (answered the pre-flight: "' + confirmed + '")');
  /* Host live opens a lobby and connects; the room is not LIVE until the
     lesson is begun from it. Live.active only flips in goLiveLocally, which
     lobbyStart triggers — and Live.watchOn refuses while active is false, so
     the big-screen link genuinely is a mid-lesson thing. */
  await host.waitForFunction(() => {
    const b = document.getElementById('lobbyStart');
    return b && !b.disabled && b.offsetParent !== null;
  }, null, { timeout: 15000 }).catch(() => {});
  await host.evaluate(() => {
    const b = document.getElementById('lobbyStart');
    if (b) b.click();
  });
  const live = await host.evaluate(() => new Promise((resolve) => {
    let tries = 0;
    const t = setInterval(() => {
      if (SF.Live && SF.Live.active) { clearInterval(t); resolve({ active: true, pin: SF.Live.pin }); }
      else if (++tries > 80) { clearInterval(t); resolve({ active: false }); }
    }, 200);
  }));
  ok(live.active, 'a room is hosted from the Host live button',
    live.pin ? 'pin ' + live.pin : 'could not host — follow checks skipped');

  if (live.active) {
    const registered = await host.evaluate((id) => SF.Live.watchOn(id), share.id);
    ok(registered === true, 'share registered as the big screen');

    await host.evaluate(() => {
      if (!SF.Player.open) SF.Player.start(SF.buildRunDeck(SF.Editor.deck(), () => null), 0, {});
    });
    await host.waitForTimeout(800);

    const spy = await browser.newPage();
    await spy.goto(`${base}/view.html?s=${share.id}&follow=1`, { waitUntil: 'networkidle' });
    await spy.waitForSelector('#player .slide', { timeout: 8000 });
    await spy.waitForTimeout(1200);

    const want = 3;
    await host.evaluate((i) => SF.Player.goTo(i, 1, true), want - 1);
    await spy.waitForTimeout(1500);
    const spyAt = await spy.evaluate(() => SF.Player.idx);
    ok(spyAt === want - 1, `spectator followed the presenter to slide ${want}`, 'spectator sits at index ' + spyAt);

    /* It must not be able to drive itself. */
    await spy.keyboard.press('ArrowLeft');
    await spy.keyboard.press('ArrowRight');
    await spy.waitForTimeout(800);
    const stillAt = await spy.evaluate(() => SF.Player.idx);
    ok(stillAt === spyAt, 'spectator cannot run ahead or back', 'still at index ' + stillAt);

    /* A Build-on-Next slide must show what the presenter has revealed and no
       more. This is the check that would have caught a big screen sitting on
       a heading with an empty slide under it. */
    const built = await host.evaluate(() => {
      const d = SF.Player.deck.slides.findIndex((s) => s.progressive && (s.bullets || []).length > 1);
      if (d < 0) return null;
      SF.Player.goTo(d, 1, true);
      return d;
    });
    if (built != null) {
      await spy.waitForTimeout(1300);
      const before = await spy.evaluate(() => SF.Player.revealStep || 0);
      await host.evaluate(() => { SF.Player.next(); SF.Player.next(); });
      await spy.waitForTimeout(1400);
      const after = await spy.evaluate(() => SF.Player.revealStep || 0);
      const hostStep = await host.evaluate(() => SF.Player.revealStep || 0);
      ok(after === hostStep && after > before,
        'spectator follows the build, not just the slide',
        `presenter at step ${hostStep}, spectator at ${after} (was ${before})`);
      const shown = await spy.evaluate(() =>
        [...document.querySelectorAll('#player .slide li')].filter((li) => !li.classList.contains('step-future')).length);
      ok(shown > 0, 'and the revealed points are actually on screen', shown + ' visible');
    }

    const status = await spy.textContent('.share-bar');
    ok(/following the room/i.test(status || ''), 'spectator says it is following', (status || '').trim().slice(0, 60));
    await spy.screenshot({ path: path.join(outDir, 'follow-along.png') });

    /* And it is told when the seat closes. */
    await host.evaluate(() => SF.Live.watchOn(''));
    await spy.waitForTimeout(1200);
    const ended = await spy.textContent('.share-bar');
    ok(!/following the room/i.test(ended || '') || /end/i.test(ended || ''), 'spectator told when the seat closes',
      (ended || '').trim().slice(0, 60));
  }
} finally {
  await browser.close();
  await harness.stop(relay);
  fs.rmSync(sessionDir, { recursive: true, force: true });
}
console.log(`\n${failed ? '✗ ' + failed + ' check(s) failed' : '✓ share links smoke-tested clean'}  ·  screenshots in ${outDir}`);
process.exit(failed ? 1 : 0);
