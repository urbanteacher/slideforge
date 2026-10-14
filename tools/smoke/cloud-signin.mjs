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
      signInWithPassword: (a) => {
        window.__sb.sent.push(a.email);
        if (a.password !== 'right-test-password') return Promise.resolve({ data: {}, error: { message: 'Invalid login credentials', status: 400 } });
        const user = { id: 'u-1', email: a.email.toLowerCase() };
        if (window.__sb.cb) window.__sb.cb('SIGNED_IN', { user });
        return Promise.resolve({ data: { user, session: { user } }, error: null });
      },
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
  step('with a project: Sign in in the header, the client made with its URL, public key, the session kept in this browser');

  await page.locator('#btnAccount').click();
  await page.locator('#accountEmail').fill('someone@gmail.com');
  await page.locator('#accountPassword').fill('anything');
  await page.locator('#accountSignIn').click();
  await page.locator('#accountSay').filter({ hasText: /work email/ }).waitFor();
  assert.equal((await page.evaluate(() => window.__sb.sent)).length, 0);
  step('an email outside the allowed domains is refused before anything is tried');

  await page.locator('#accountEmail').fill('Mark@urbanteacher.co.uk');
  await page.locator('#accountPassword').fill('wrong-test-password');
  await page.locator('#accountSignIn').click();
  await page.locator('#accountSay').filter({ hasText: /do not match an account/ }).waitFor();
  assert.equal(await page.locator('#btnAccount').innerText(), 'Sign in');
  step('a wrong password is said plainly, and nobody is signed in');

  await page.locator('#accountPassword').fill('right-test-password');
  await page.locator('#accountPassword').press('Enter');
  await page.locator('#btnAccount.signed-in').waitFor();
  assert.equal(await page.locator('#btnAccount').innerText(), 'mark');
  assert.equal(await page.locator('#accountDialog').evaluate((d) => d.open), false, 'the dialog closes once signed in');
  assert.equal(await page.locator('#accountPassword').inputValue(), '', 'the password is not left in the box');
  await page.locator('#btnAccount').click();
  assert.equal(await page.locator('#accountWho').innerText(), 'mark@urbanteacher.co.uk');
  step('the right password signs in (Enter works too): the button names the teacher, the box is cleared, the dialog says who');

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
