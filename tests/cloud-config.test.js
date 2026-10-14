'use strict';
/* Saving lessons online (docs/data-storage-plan.md): the relay tells the browser where lessons are saved, the Supabase
   project's URL and its public anon key, or that they are saved in this browser only. Never anything else. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const harness = require('./harness.js');

const config = async (env) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-cloud-'));
  const port = await harness.freePort();
  const relay = await harness.start(port, dir, env);
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/cloud-config`);
    assert.equal(res.status, 200);
    return await res.json();
  } finally { await harness.stop(relay); }
};

test('with no project set, lessons are saved in this browser only', async () => {
  assert.deepEqual(await config({ SUPABASE_URL: '', SUPABASE_ANON_KEY: '' }), { enabled: false });
});

test('with a project set, the browser is told its URL, its public key and the sign-in', async () => {
  const got = await config({ SUPABASE_URL: 'https://abcdefgh.supabase.co/', SUPABASE_ANON_KEY: 'public-anon-key', SUPABASE_SERVICE_ROLE_KEY: 'secret' });
  assert.deepEqual(got, { enabled: true, url: 'https://abcdefgh.supabase.co', anonKey: 'public-anon-key', signIn: 'password' });
  assert.ok(!JSON.stringify(got).includes('secret'), 'the service key never leaves the server');
});

test('a URL that is not a Supabase project, or a missing key, leaves it off', async () => {
  assert.deepEqual(await config({ SUPABASE_URL: 'https://evil.example.com', SUPABASE_ANON_KEY: 'k' }), { enabled: false });
  assert.deepEqual(await config({ SUPABASE_URL: 'https://abcdefgh.supabase.co', SUPABASE_ANON_KEY: '' }), { enabled: false });
});
