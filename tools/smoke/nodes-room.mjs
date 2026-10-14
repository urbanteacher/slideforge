// Nodes formats in the studio's room (docs/nodes-studio-plan.md step 4), through the real relay and two phones
// speaking join.html's side. In the Nodes tab, three formats are added — Which step broke? (Multiple choice), Join it up
// (Ranking) and Keep them apart (a sort into columns) — and hosted live: each one's question reaches the phones, Ana
// answers right and Bo wrong, the reveal marks them (the phones are told) and Ana leads the scores.
//   node tools/smoke/run.mjs nodes-room
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import harness from '../../tests/harness.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-nodes-room-'));
const port = await harness.freePort();
const relay = await harness.start(port, dir);
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const phones = [];
const step = (m) => console.log('  ✓ ' + m);
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.waitForFunction(() => window.SF?.Shell?.current()?.lab && SF.Shell.current().doc().id, null, { timeout: 90000 });
  await page.click('[data-go="nodes"]');
  const lab = page.frames().find((f) => f.url().includes('/lab-app/'));
  assert.ok(lab, 'the lab is the shell\'s frame');
  for (const name of ['Which step broke?', 'Keep them apart', 'Join it up']) {
    const card = lab.locator('.browse-card', { hasText: name }).first();
    await card.locator('.browse-card-head').click();
    await card.locator('.browse-add button').first().click();
    await page.waitForTimeout(1200);
  }
  const kinds = await page.evaluate(() => SF.Shell.current().doc().slides.filter((s) => s.game?.role === 'question').map((s) => s.game.quiz.style));
  assert.deepEqual(kinds.sort(), ['choice', 'compare', 'order'], 'each format asks its own question type');
  step('three Nodes formats added, asking Multiple choice, Ranking and a sort');

  // From the first slide, as a teacher would.
  await lab.getByLabel('Go to slide').fill('1');
  await lab.getByLabel('Go to slide').press('Enter');
  await lab.getByRole('button', { name: /^◉ Host live$/ }).click();
  await lab.locator('[data-testid=pin]').waitFor({ timeout: 30000 });
  const pin = (await lab.locator('[data-testid=pin]').textContent()).trim();
  const join = async (name) => { const p = await harness.connect(port); p.send({ t: 'join', pin, name }); await p.next('joined'); phones.push(p); return p; };
  const ana = await join('Ana'), bo = await join('Bo');
  await lab.locator('[data-testid=player-count]').filter({ hasText: '2 players in' }).waitFor({ timeout: 10000 });
  await lab.getByRole('button', { name: 'Start' }).click();
  const view = () => lab.locator('.wall-layer').getAttribute('data-view');
  const next = () => lab.locator('body').press('ArrowRight');
  const toView = async (want) => { const seen = []; for (let i = 0; i < 80 && (await view()) !== want; i++) { seen.push(await view()); await next(); await page.waitForTimeout(250); } assert.equal(await view(), want, `reached ${want} (saw ${seen.join(' ')})`); };

  const play = async (label, right, wrong) => {
    await toView('question');
    const q = await ana.next('question'); await bo.next('question');
    ana.send({ t: 'answer', ...right(q) });
    bo.send({ t: 'answer', ...wrong(q) });
    await lab.locator('[data-testid=answered]').filter({ hasText: '2 of 2 answered' }).waitFor({ timeout: 8000 });
    await page.waitForTimeout(1700); // past the grace a Next keeps
    await next();
    await lab.locator('.wall-layer[data-view=reveal]').waitFor({ timeout: 8000 });
    const a = await ana.next('result'), b = await bo.next('result');
    assert.equal(a.right, true, `${label}: Ana is right`);
    assert.equal(b.right, false, `${label}: Bo is wrong`);
    step(`${label}: the question reached both phones (${q.input}), the reveal marked Ana right and Bo wrong, the phones were told`);
  };
  await play('Which step broke? (choice)', (q) => ({ choice: 1 }), (q) => ({ choice: 0 }));
  const sorted = await page.evaluate(() => SF.Shell.current().doc().slides.find((s) => s.nodes?.format === 'keep-apart' && s.game?.quiz).game.quiz.sortAnswers);
  await play('Keep them apart (sort)', () => ({ sort: sorted }), () => ({ sort: sorted.map((a) => 2 - a) }));
  await play('Join it up (Ranking)', (q) => ({ order: q.options.map((_, i) => i) }), (q) => ({ order: q.options.map((_, i) => i).reverse() }));

  await toView('leaderboard');
  const rows = await lab.locator('[data-testid=board-row]').evaluateAll((els) => els.map((e) => [...e.children].map((c) => c.textContent)));
  assert.equal(rows[0][1], 'Ana', 'Ana leads');
  assert.ok(Number(String(rows[0][2]).replace(/\D/g, '')) >= 2900, 'each of the three games counted in full (a Ranking too)');
  step(`scores: ${rows.map((r) => `${r[1]} ${r[2]}`).join(', ')}`);
  assert.deepEqual(errors, [], 'no page errors');
} finally {
  for (const p of phones) p.close?.();
  await browser.close();
  await relay.stop?.();
}
console.log('nodes-room: ok');
