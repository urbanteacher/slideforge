// Online shares in the viewer (viewer/cloud.ts, BACKLOG CS-06, CR-60 to CR-63): the teacher's sign-in read from
// supabase-js's own storage for this project, get_share and get_share_picture asked with it, or as anyone with no
// Authorization header, and a refused token dropped for the page. Against stand-ins for the relay and Supabase, put
// back after each test.
import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { authKeyFor, cloudPicture, cloudShare, forgetProject, sessionToken } from '../src/viewer/cloud';

const store = (items: Record<string, string>) => {
  const keys = Object.keys(items);
  return { length: keys.length, key: (i: number) => keys[i] ?? null, getItem: (k: string) => items[k] ?? null };
};

test('the sign-in is supabase-js\'s stored session for this project, unless it has expired', () => {
  const now = 1_800_000_000_000;
  const live = JSON.stringify({ access_token: 'tok', expires_at: now / 1000 + 60 });
  const old = JSON.stringify({ access_token: 'old', expires_at: now / 1000 - 60 });
  assert.equal(sessionToken(store({ 'slideforge.x': '1', 'sb-abc-auth-token': live }), now), 'tok');
  assert.equal(sessionToken(store({ 'sb-abc-auth-token': old }), now), '');
  assert.equal(sessionToken(store({ 'sb-abc-auth-token': '{not json' }), now), '');
  assert.equal(sessionToken(store({}), now), '');
  assert.equal(authKeyFor('https://abc.supabase.co'), 'sb-abc-auth-token');
  const two = store({ 'sb-other-auth-token': JSON.stringify({ access_token: 'wrong', expires_at: now / 1000 + 60 }), 'sb-abc-auth-token': live });
  assert.equal(sessionToken(two, now, authKeyFor('https://abc.supabase.co')), 'tok', 'another project\'s session is not sent');
});

/** Stand-ins: the relay's cloud config, and the project answering by who asks ('' for anyone: no Authorization). */
function standIn(t: TestContext, answer: (bearer: string, body: { share_id: string; n?: number }, name: string) => { status: number; body: unknown }, enabled = true) {
  forgetProject();
  const asked: string[] = [];
  t.mock.method(globalThis, 'fetch', (async (url: string, init?: RequestInit) => {
    if (String(url) === '/api/cloud-config') return new Response(JSON.stringify(enabled ? { enabled: true, url: 'https://p.example', anonKey: 'anon' } : { enabled: false }));
    const h = (init?.headers ?? {}) as Record<string, string>;
    assert.equal(h.apikey, 'anon', 'the public key always goes in apikey');
    const bearer = h.Authorization ? h.Authorization.replace('Bearer ', '') : '';
    asked.push(bearer);
    const a = answer(bearer, JSON.parse(String(init?.body)), String(url).split('/').pop()!);
    return new Response(JSON.stringify(a.body), { status: a.status });
  }) as typeof fetch);
  return asked;
}
const signedIn = (token: string | null) => {
  const g = globalThis as { localStorage?: unknown };
  g.localStorage = store(token ? { 'sb-p-auth-token': JSON.stringify({ access_token: token, expires_at: Date.now() / 1000 + 600 }) } : {});
};

test('an open share is read as anyone, with no Authorization; a private one says only that it is private', async (t) => {
  signedIn(null);
  const id = 'a'.repeat(32);
  let asked = standIn(t, (_b, body) => ({ status: 200, body: body.share_id === id ? { private: false, doc: { slides: [] } } : null }));
  assert.deepEqual(await cloudShare(id), { private: false, doc: { slides: [] } });
  assert.deepEqual(asked, ['']);
  asked = standIn(t, (b) => ({ status: 200, body: b === '' ? { private: true } : { private: true, doc: {} } }));
  assert.deepEqual(await cloudShare(id), { private: true });
});

test('a signed-in teacher asks with their token, and a refused token falls back to anyone', async (t) => {
  signedIn('teacher');
  let asked = standIn(t, (b) => ({ status: 200, body: b === 'teacher' ? { private: true, doc: { title: 'T' } } : { private: true } }));
  assert.deepEqual(await cloudShare('b'.repeat(32)), { private: true, doc: { title: 'T' } });
  assert.deepEqual(asked, ['teacher']);
  asked = standIn(t, (b) => (b === 'teacher' ? { status: 401, body: {} } : { status: 200, body: { private: false, doc: {} } }));
  assert.deepEqual(await cloudShare('b'.repeat(32)), { private: false, doc: {} });
  assert.deepEqual(asked, ['teacher', '']);
});

test('pictures: a refused token is dropped once for the page, not refused again for every picture', async (t) => {
  signedIn('stale');
  const asked = standIn(t, (b, body, name) => (b === 'stale' ? { status: 401, body: {} } : { status: 200, body: name === 'get_share_picture' ? `data:image/png;base64,${body.n}` : null }));
  assert.equal(await cloudPicture('d'.repeat(32), 0), 'data:image/png;base64,0');
  assert.equal(await cloudPicture('d'.repeat(32), 1), 'data:image/png;base64,1');
  assert.equal(await cloudPicture('d'.repeat(32), 2), 'data:image/png;base64,2');
  assert.deepEqual(asked, ['stale', '', '', ''], 'one refusal, then as anyone');
  const none = standIn(t, () => ({ status: 200, body: 42 }));
  assert.equal(await cloudPicture('d'.repeat(32), 0), null, 'a reply that is not a picture');
  assert.equal(none.length, 1);
});

test('no online saving on this server, or no such share: null; a failed config is asked for again', async (t) => {
  standIn(t, () => ({ status: 200, body: null }), false);
  assert.equal(await cloudShare('c'.repeat(32)), null);
  // Not forgotten by hand: the failed ask was not kept, so this one asks the config again and finds the project.
  t.mock.method(globalThis, 'fetch', (async (url: string) => (String(url) === '/api/cloud-config'
    ? new Response(JSON.stringify({ enabled: true, url: 'https://p.example', anonKey: 'anon' }))
    : new Response(JSON.stringify({ private: false, doc: { slides: [1] } })))) as typeof fetch);
  assert.deepEqual(await cloudShare('c'.repeat(32)), { private: false, doc: { slides: [1] } });
});
