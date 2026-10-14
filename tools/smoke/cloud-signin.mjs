#!/usr/bin/env node
/* The teacher's account (js/cloud.js, docs/data-storage-plan.md step 3), against a stand-in for Supabase: the relay is
 * given a project, and the Supabase library's address is answered by a fake that records what it is asked. Checks:
 * with no project the app shows nothing new; with one, Sign in is in the header; an email outside the allowed domains
 * is refused before anything is sent; a work email is sent a magic link that returns here; a sign-in names the
 * teacher on the button; sign-out puts it back. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import harness from '../../tests/harness.js';

const step = (m) => console.log('  ✓ ' + m);
const LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
const FAKE = `window.__sb = { sent: [], cb: null, out: 0 };
window.supabase = { createClient(url, key, opts) {
  window.__sb.made = { url, key, flow: opts && opts.auth && opts.auth.flowType };
  return {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: (cb) => { window.__sb.cb = cb; return { data: { subscription: { unsubscribe() {} } } }; },
      signInWithOtp: (a) => { window.__sb.sent.push(a); return Promise.resolve({ error: window.__sb.limit ? { message: 'email rate limit exceeded', status: 429 } : null }); },
      signOut: () => { window.__sb.out++; return Promise.resolve({ error: null }); },
    },
    from: (t) => ({ select: () => Promise.resolve({ data: t === 'allowed_domains' ? [{ domain: 'urbanteacher.co.uk' }] : [] }) }),
  };
} };`;

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-cloud-'));
const port = await harness.freePort();
const relay = await harness.start(port, dir, { SUPABASE_URL: 'https://slideforgetest.supabase.co', SUPABASE_ANON_KEY: 'anon-test-key' });
const plain = await harness.freePort();
const relayPlain = await harness.start(plain, dir, { SUPABASE_URL: '', SUPABASE_ANON_KEY: '' });
const browser = await chromium.launch();
try {
  const errors = [];
  // ---- no project: nothing new shows, and the library is never fetched
  const off = await (await browser.newContext()).newPage();
  let fetched = false;
  await off.route(LIB, (r) => { fetched = true; r.fulfill({ body: FAKE, contentType: 'application/javascript' }); });
  await off.goto(`http://127.0.0.1:${plain}/`);
  await off.waitForFunction(() => window.SF?.Cloud);
  assert.equal(await off.evaluate(() => SF.Cloud.ready()), false);
  assert.equal(await off.locator('#btnAccount').isHidden(), true);
  assert.equal(fetched, false, 'the library is not loaded when there is no project');
  step('no project set: no Sign in button, and the Supabase library is never loaded');

  // ---- a project: Sign in
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route(LIB, (r) => r.fulfill({ body: FAKE, contentType: 'application/javascript' }));
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.waitForFunction(() => window.SF?.Cloud);
  assert.equal(await page.evaluate(() => SF.Cloud.ready()), true);
  await page.locator('#btnAccount').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#btnAccount').innerText(), 'Sign in');
  const made = await page.evaluate(() => window.__sb.made);
  assert.deepEqual(made, { url: 'https://slideforgetest.supabase.co', key: 'anon-test-key', flow: 'implicit' });
  step('with a project: Sign in in the header, the client made with its URL, public key and the implicit flow (a link that works in any browser)');

  await page.locator('#btnAccount').click();
  await page.locator('#accountEmail').fill('someone@gmail.com');
  await page.locator('#accountSend').click();
  await page.locator('#accountSay').filter({ hasText: /work email/ }).waitFor();
  assert.equal((await page.evaluate(() => window.__sb.sent)).length, 0);
  step('an email outside the allowed domains is refused, and nothing is sent');

  // Supabase's mailer refusing (its hourly limit) is said in plain words.
  await page.evaluate(() => { window.__sb.limit = true; });
  await page.locator('#accountEmail').fill('Mark@urbanteacher.co.uk');
  await page.locator('#accountSend').click();
  await page.locator('#accountSay').filter({ hasText: /Too many sign-in emails/ }).waitFor();
  await page.evaluate(() => { window.__sb.limit = false; window.__sb.sent = []; });
  step('Supabase’s hourly email limit is said in plain words');

  await page.locator('#accountEmail').fill('Mark@urbanteacher.co.uk');
  await page.locator('#accountSend').click();
  await page.locator('#accountSay').filter({ hasText: /Check your email/ }).waitFor();
  const sent = await page.evaluate(() => window.__sb.sent);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].email, 'Mark@urbanteacher.co.uk');
  assert.equal(sent[0].options.emailRedirectTo, `http://127.0.0.1:${port}/`);
  step('a work email is sent a magic link that comes back to this page');

  await page.evaluate(() => window.__sb.cb('SIGNED_IN', { user: { id: 'u-1', email: 'mark@urbanteacher.co.uk' } }));
  await page.locator('#btnAccount.signed-in').waitFor();
  assert.equal(await page.locator('#btnAccount').innerText(), 'mark');
  assert.equal(await page.locator('#accountWho').innerText(), 'mark@urbanteacher.co.uk');
  step('signed in: the button names the teacher, and the dialog says who');

  await page.locator('#accountOut').click();
  await page.locator('#btnAccount:not(.signed-in)').waitFor();
  assert.equal(await page.locator('#btnAccount').innerText(), 'Sign in');
  assert.equal(await page.evaluate(() => window.__sb.out), 1);
  step('sign out: back to Sign in');

  await page.screenshot({ path: path.join(dir, 'cloud.png') });
  assert.deepEqual(errors, [], 'no page errors');
  console.log('cloud-signin: ok');
} finally {
  await browser.close();
  await harness.stop(relay).catch(() => {});
  await harness.stop(relayPlain).catch(() => {});
}
