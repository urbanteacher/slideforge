// Online shares in the viewer (viewer/cloud.ts, BACKLOG CS-06): the teacher's sign-in read from supabase-js's own
// storage, and get_share asked with it, against a stand-in for the relay and for Supabase.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cloudShare, sessionToken } from '../src/viewer/cloud';

const store = (items: Record<string, string>) => {
  const keys = Object.keys(items);
  return { length: keys.length, key: (i: number) => keys[i] ?? null, getItem: (k: string) => items[k] ?? null };
};

test('the sign-in is supabase-js\'s stored session, unless it has expired', () => {
  const now = 1_800_000_000_000;
  const live = JSON.stringify({ access_token: 'tok', expires_at: now / 1000 + 60 });
  const old = JSON.stringify({ access_token: 'old', expires_at: now / 1000 - 60 });
  assert.equal(sessionToken(store({ 'slideforge.x': '1', 'sb-abc-auth-token': live }), now), 'tok');
  assert.equal(sessionToken(store({ 'sb-abc-auth-token': old }), now), '');
  assert.equal(sessionToken(store({ 'sb-abc-auth-token': '{not json' }), now), '');
  assert.equal(sessionToken(store({}), now), '');
});

/** Stand-ins: the relay's cloud config, and get_share answering by who asks. */
function standIn(answer: (bearer: string, id: string) => { status: number; body: unknown }, enabled = true) {
  const asked: string[] = [];
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    if (String(url) === '/api/cloud-config') return new Response(JSON.stringify(enabled ? { enabled: true, url: 'https://p.example', anonKey: 'anon' } : { enabled: false }));
    const bearer = String((init?.headers as Record<string, string>).Authorization).replace('Bearer ', '');
    asked.push(bearer);
    const a = answer(bearer, JSON.parse(String(init?.body)).share_id);
    return new Response(JSON.stringify(a.body), { status: a.status });
  }) as typeof fetch;
  return asked;
}

test('an open share is read as anyone; a private one says only that it is private', async () => {
  (globalThis as { localStorage?: unknown }).localStorage = store({});
  const id = 'a'.repeat(32);
  let asked = standIn((_b, sid) => ({ status: 200, body: sid === id ? { private: false, doc: { slides: [] } } : null }));
  assert.deepEqual(await cloudShare(id), { private: false, doc: { slides: [] } });
  assert.deepEqual(asked, ['anon']);
  asked = standIn((b) => ({ status: 200, body: b === 'anon' ? { private: true } : { private: true, doc: {} } }));
  assert.deepEqual(await cloudShare(id), { private: true });
});

test('a signed-in teacher asks with their token, and a refused token falls back to anyone', async () => {
  (globalThis as { localStorage?: unknown }).localStorage = store({ 'sb-p-auth-token': JSON.stringify({ access_token: 'teacher', expires_at: Date.now() / 1000 + 600 }) });
  let asked = standIn((b) => ({ status: 200, body: b === 'teacher' ? { private: true, doc: { title: 'T' } } : { private: true } }));
  assert.deepEqual(await cloudShare('b'.repeat(32)), { private: true, doc: { title: 'T' } });
  assert.deepEqual(asked, ['teacher']);
  asked = standIn((b) => (b === 'teacher' ? { status: 401, body: {} } : { status: 200, body: { private: false, doc: {} } }));
  assert.deepEqual(await cloudShare('b'.repeat(32)), { private: false, doc: {} });
  assert.deepEqual(asked, ['teacher', 'anon']);
});

test('no online saving on this server, or no such share: null', async () => {
  standIn(() => ({ status: 200, body: null }), false);
  assert.equal(await cloudShare('c'.repeat(32)), null);
  standIn(() => ({ status: 200, body: null }));
  assert.equal(await cloudShare('c'.repeat(32)), null);
});
