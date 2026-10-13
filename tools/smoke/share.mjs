#!/usr/bin/env node
/* Smoke-test share links in a real browser (M12, M14).
 *
 * A lesson is shared as the lab deck (SF.LabEngine.studioShareDeck, what the shell's Share uploads). Its link opens
 * in the studio viewer (lab-app/view.html), through the old address (view.html) too, and the reader pages through
 * it. A link made by the classic slideshow, which is gone, says plainly that it is from an older version and asks
 * for the lesson to be shared again. The follow-along seat is lab/tests/viewer-follow.test.ts's.
 *
 * Screenshots land in a dated folder so they can be compared by eye.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import harness from '../../tests/harness.js';

const outDir = path.join(os.homedir(), 'Desktop', `SlideForge-share-smoke-${new Date().toISOString().slice(0, 10)}`);
fs.mkdirSync(outDir, { recursive: true });

const sessionDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-share-'));
const port = await harness.freePort();
const relay = await harness.start(port, sessionDir);
const base = `http://127.0.0.1:${port}`;
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
let failed = 0;
const ok = (c, label, extra = '') => { console.log(`  ${c ? '✓' : '✗'} ${label}${extra ? ` — ${extra}` : ''}`); if (!c) failed++; };
const upload = (doc) => fetch(`${base}/api/share`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ doc }) }).then((r) => r.json());

try {
  const host = await browser.newPage();
  const errors = [];
  host.on('pageerror', (e) => errors.push(e.message));
  await host.goto(`${base}/`, { waitUntil: 'networkidle' });
  await host.waitForFunction(() => window.SF && SF.LabEngine && SF.Shell && SF.Shell.current() && SF.Shell.current().doc().id, null, { timeout: 60000 });
  const before = await host.evaluate(() => SF.Shell.current().doc().id);
  await host.evaluate(() => SF.LabEngine.openKey('attention'));
  await host.waitForFunction((id) => SF.Shell.current().doc().id !== id && String(SF.Shell.current().doc().id).startsWith('lab-'), before, { timeout: 60000 });
  const got = await host.evaluate(async () => { const g = await SF.LabEngine.studioShareDeck(); return g.doc ? { doc: g.doc } : { why: g.why }; });
  ok(!!got.doc && got.doc.studio === 1, 'Share makes the lab deck for the studio viewer', got.why || (got.doc.slides.length + ' slides'));
  const share = await upload(got.doc);
  ok(/^[a-f0-9]{32}$/.test(share.id || ''), 'share uploaded', share.id && share.id.slice(0, 8) + '…');

  /* ---- read-only, through the old address: the reader drives ---- */
  const reader = await browser.newPage();
  reader.on('pageerror', (e) => errors.push('viewer: ' + e.message));
  await reader.goto(`${base}/view.html?s=${share.id}`, { waitUntil: 'networkidle' });
  await reader.waitForFunction(() => /\/lab-app\/view\.html/.test(location.pathname) && document.getElementById('sf-msg').hidden, null, { timeout: 15000 });
  ok(true, 'the old address opens the studio viewer');
  const pos = () => reader.locator('.sf-pos').textContent();
  ok(/^1 \/ \d+$/.test((await pos()) || ''), 'read-only opens on the first slide', await pos());
  await reader.keyboard.press('ArrowRight');
  await reader.waitForTimeout(800);
  ok(/^2 \/ \d+$/.test((await pos()) || ''), 'read-only advances on ArrowRight', await pos());
  await reader.screenshot({ path: path.join(outDir, 'read-only.png') });

  /* ---- a link the classic slideshow made: a plain message ---- */
  const old = await host.evaluate(() => JSON.parse(JSON.stringify(SF.buildLesson('ukbt-institute-template'))));
  const oldShare = await upload(old);
  const stale = await browser.newPage();
  stale.on('pageerror', (e) => errors.push('old link: ' + e.message));
  await stale.goto(`${base}/view.html?s=${oldShare.id}`, { waitUntil: 'networkidle' });
  await stale.waitForFunction(() => !document.getElementById('sf-msg')?.hidden && /older version/.test(document.getElementById('sf-msg').textContent), null, { timeout: 15000 }).catch(() => {});
  const said = await stale.evaluate(() => document.getElementById('sf-msg')?.textContent || '');
  ok(/older version/.test(said) && /share the lesson again/.test(said), 'a classic link says it is from an older version and asks for it again', said.slice(0, 80));
  await stale.screenshot({ path: path.join(outDir, 'old-link.png') });

  ok(errors.length === 0, 'no page errors', errors.join(' | '));
} finally {
  await browser.close();
  await harness.stop(relay);
  fs.rmSync(sessionDir, { recursive: true, force: true });
}
console.log(`\n${failed ? '✗ ' + failed + ' check(s) failed' : '✓ share links smoke-tested clean'}  ·  screenshots in ${outDir}`);
process.exit(failed ? 1 : 0);
