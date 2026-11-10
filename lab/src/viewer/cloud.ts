// A share kept online (supabase/migrations/0002_shares.sql, BACKLOG CS-06): read by its id through get_share(), and
// its pictures through get_share_picture() (0003), with the teacher's sign-in when this browser has one. SlideForge
// signs in with supabase-js on the same site (js/cloud.js), which keeps the session in this site's local storage, so
// the viewer needs no library of its own.
//
// Asked as anyone, a request carries only the project's public key, in `apikey`. It sends no Authorization header,
// which is what Supabase's publishable keys expect: a legacy anon key happened to work as a Bearer token, a
// publishable one does not. Asked as a teacher, it carries their access token. A token the project refuses (401) is
// dropped for the rest of the page, so a share's forty pictures are not each refused once before being asked again.

/** What get_share() answered: the lesson, or only that it is private (the reader is not a signed-in teacher). */
export interface CloudShare { private: boolean; doc?: unknown }

/** supabase-js's storage key for a project (its default `storageKey`): `sb-<first part of the host>-auth-token`. */
export const authKeyFor = (projectUrl: string): string => {
  try { return `sb-${new URL(projectUrl).hostname.split('.')[0]}-auth-token`; } catch { return ''; }
};

/** The signed-in teacher's access token from supabase-js's own storage, '' if none. With `key`, only that project's
 *  session is read; without one, the first stored session that has not expired (any `sb-…-auth-token`). */
export function sessionToken(store: Pick<Storage, 'length' | 'key' | 'getItem'>, now = Date.now(), key = ''): string {
  try {
    const keys = key ? [key] : Array.from({ length: store.length }, (_, i) => store.key(i) ?? '').filter((k) => /^sb-.+-auth-token$/.test(k));
    for (const k of keys) {
      const v = JSON.parse(store.getItem(k) || 'null') as { access_token?: string; expires_at?: number } | null;
      if (!v?.access_token) continue;
      // An expired token would be refused; SlideForge refreshes it when the teacher next opens the app.
      if (v.expires_at && v.expires_at * 1000 < now) continue;
      return v.access_token;
    }
  } catch { /* storage blocked */ }
  return '';
}

interface Project { url: string; anonKey: string; token: string }

/** How the viewer reaches the project, asked once per page however many pictures a share has. A failed ask is not
 *  kept: the next call asks again. */
let projectOnce: Promise<Project | null> | null = null;
function project(): Promise<Project | null> {
  projectOnce ??= readProject().then((p) => { if (!p) projectOnce = null; return p; }, () => { projectOnce = null; return null; });
  return projectOnce;
}
async function readProject(): Promise<Project | null> {
  const cfg = await fetch('/api/cloud-config', { cache: 'no-store' }).then((r) => r.json()).catch(() => null) as { enabled?: boolean; url?: string; anonKey?: string } | null;
  if (!cfg?.enabled || !cfg.url || !cfg.anonKey) return null;
  let token = '';
  try { token = sessionToken(localStorage, Date.now(), authKeyFor(cfg.url)); } catch { /* no storage */ }
  return { url: cfg.url, anonKey: cfg.anonKey, token };
}

/** Forget the project this page asked for (the tests, which change it between cases). */
export function forgetProject(): void { projectOnce = null; }

/** A database function asked through PostgREST: as the teacher when signed in, else as anyone. Null when the
 *  project is not set up here or it does not answer. */
async function rpc(name: string, body: unknown): Promise<Response | null> {
  const p = await project();
  if (!p) return null;
  const ask = (token: string) => fetch(`${p.url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: p.anonKey, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  let r = await ask(p.token).catch(() => null);
  // A token the project no longer accepts: dropped, and asked again as anyone, which still opens an open share.
  if (r?.status === 401 && p.token) { p.token = ''; r = await ask('').catch(() => null); }
  return r;
}

/** The share with this id, or null when this server saves nothing online or there is no such share. */
export async function cloudShare(id: string): Promise<CloudShare | null> {
  const r = await rpc('get_share', { share_id: id });
  if (!r?.ok) return null;
  const j = await r.json().catch(() => null) as CloudShare | null;
  return j && typeof j === 'object' ? j : null;
}

/** One picture of an online share (supabase/migrations/0003_share_pictures.sql), or null when it cannot be had. */
export async function cloudPicture(id: string, n: number): Promise<string | null> {
  const r = await rpc('get_share_picture', { share_id: id, n });
  if (!r?.ok) return null;
  const v = await r.json().catch(() => null);
  return typeof v === 'string' ? v : null;
}
