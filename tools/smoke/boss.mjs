#!/usr/bin/env node
/* Smoke: a boss battle in front of a demo class actually damages the boss.
 *
 * The fight only scores while it is marking, and the demo class marks straight
 * off the room's answers without pressing Reveal — so every hit was dropped in
 * silence: the rail announced damage and the HP bar sat on full for the whole
 * game. This walks the demo through a question and checks three things the wall
 * has to agree on: the fight recorded the mark, the bar reads what the note
 * claims, and nothing on the slide is drawn on top of anything else.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import harness from '../../tests/harness.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-boss-'));
const port = await harness.freePort();
const relay = await harness.start(port, dir);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto(`http://127.0.0.1:${port}/`);
  await page.waitForFunction(() => window.SF?.createPresetGame && SF.Demo && SF.Playbook);
  /* The classic Quiz studio's Try demo is gone; it ran SF.Demo.start on the
     game's run deck, in the mode the playbook gives the format, and so does this. */
  const title = await page.evaluate(() => {
    const g = SF.createPresetGame('boss', structuredClone(SF.GAME_FORMAT_PRESETS['boss-battle']), null);
    SF.Demo.start(SF.gameToRunDeck(g), { fullscreen: false, mode: SF.Playbook.demoKind(g) });
    return g.title;
  });
  assert.match(title, /boss/i);
  await page.waitForSelector('#player.on', { timeout: 15000 });

  /* The demo opens on the rules slide and waits for the teacher, as it should. */
  for (let i = 0; i < 6; i++) {
    if (await page.locator('#player .slide.layout-quiz').count()) break;
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(400);
  }
  await page.locator('#player .slide.layout-quiz').first().waitFor({ timeout: 10000 });

  /* One of each rung, so the boss opens on 11 HP. */
  await page.waitForFunction(() => {
    const f = SF.Player?.deck && SF.Boss?.forDeck ? SF.Boss.forDeck(SF.Player.deck) : null;
    return !!f && f.max === 11 && f.hp === 11;
  }, { timeout: 15000 });
  console.log('✓ Boss opens on 11 / 11 HP');

  /* The regression itself: mark a hit on a question that is still being asked.
     Every caller that is not the teacher's own button does it that way. */
  const hit = await page.evaluate(() => {
    const deck = SF.Player.deck;
    const before = SF.Boss.forDeck(deck);
    const damage = SF.Boss.current(before).damage;
    SF.Player.bossCommand('hit', { advance: false });
    const after = SF.Boss.forDeck(deck);
    return {
      damage: damage, before: before.hp, hp: after.hp, max: after.max,
      marked: (after.marked || []).length
    };
  });
  assert.equal(hit.hp, hit.before - hit.damage,
    'a hit marked while the question is being asked takes its damage off the boss');
  assert.equal(hit.marked, 1);
  /* The bar and the number are the same fact twice and must not disagree.
     Read after the slide has been redrawn, which the mark schedules. */
  await page.waitForTimeout(500);
  hit.bar = await page.locator('#player .slide.layout-quiz .boss-hp-n').first().textContent();
  assert.equal(hit.bar, hit.hp + ' / ' + hit.max + ' HP');
  console.log('✓ Marking a hit mid-question costs the boss', hit.damage, 'HP —', hit.bar);

  /* And the same thing again through the demo class, which is the path a
     person actually sees: it answers on its own timers, reveals, and marks. */
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(() => {
    const f = SF.Boss.forDeck(SF.Player.deck);
    return !!f && (f.marked || []).length > 1;
  }, { timeout: 45000 });

  /* The mark redraws the slide, so give the wall its moment to catch up —
     and fail if it does not, because that is the disagreement being tested. */
  await page.waitForFunction(() => {
    const f = SF.Boss.forDeck(SF.Player.deck);
    const n = document.querySelector('#player .slide.layout-quiz .boss-hp-n');
    return !!f && !!n && n.textContent === f.hp + ' / ' + f.max + ' HP';
  }, { timeout: 5000 });

  const seen = await page.evaluate(() => {
    const f = SF.Boss.forDeck(SF.Player.deck);
    const node = document.querySelector('#player .slide.layout-quiz');
    return {
      hp: f.hp, max: f.max, hits: f.hits, misses: f.misses,
      bar: node?.querySelector('.boss-hp-n')?.textContent || '',
      notes: Array.from(document.querySelectorAll('#player .rnote')).map((n) => n.textContent)
    };
  });
  assert.equal(seen.hits + seen.misses, 2, 'both questions scored, once each');
  assert.equal(seen.bar, seen.hp + ' / ' + seen.max + ' HP');
  /* A note claiming damage the bar did not take is the bug this file is for. */
  const claimed = seen.notes.filter((n) => /^HIT/.test(n));
  if (claimed.length) assert.ok(seen.hp < seen.max, 'the rail claimed a hit: ' + claimed.join(' | '));
  console.log('✓ Demo class marked too —', seen.bar, '·', seen.notes.join(' | ') || 'no note');

  /* The vote bars are 74px the layout did not have when the question arrived,
     so the answers have to be re-fitted or they are drawn over the tally. */
  const collisions = await page.evaluate(() => {
    const out = [];
    const node = document.querySelector('#player .slide.layout-quiz');
    if (!node) return ['no question on screen'];
    const shown = (el) => {
      const cs = getComputedStyle(el);
      return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) > 0.05;
    };
    const opts = Array.from(node.querySelectorAll('.opt')).filter(shown);
    const tally = node.querySelector('.tally.on');
    if (tally) {
      const t = tally.getBoundingClientRect();
      opts.forEach((o, i) => {
        const r = o.getBoundingClientRect();
        if (r.bottom > t.top + 1) out.push('answer ' + (i + 1) + ' over the vote bars');
      });
    }
    const pad = node.querySelector('.pad').getBoundingClientRect();
    opts.forEach((o, i) => {
      const r = o.getBoundingClientRect();
      if (r.top < pad.top - 1 || r.bottom > pad.bottom + 1) out.push('answer ' + (i + 1) + ' off the slide');
    });
    /* The board keeps its top rows: rank 1 clipped is the leaderboard reading
       as broken, and a boss battle puts a note on the rail every question. */
    const rows = document.querySelector('#player .scorerail .rows');
    if (rows) {
      const box = rows.getBoundingClientRect();
      Array.from(rows.querySelectorAll('.srow')).forEach((row, i) => {
        if (row.getBoundingClientRect().top < box.top - 1) out.push('rail row ' + (i + 1) + ' clipped at the top');
      });
    }
    return out;
  });
  assert.deepEqual(collisions, []);
  console.log('✓ Nothing drawn on top of anything else');

  assert.deepEqual(errors, []);
  console.log('\nBoss battle smoke passed.');
} finally {
  await browser.close();
  relay.kill();
}
process.exit(0);
