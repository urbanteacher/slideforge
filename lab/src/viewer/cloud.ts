// A share kept online (supabase/migrations/0002_shares.sql, BACKLOG CS-06): read by its id through get_share(), with
// the teacher's sign-in when this browser has one. SlideForge signs in with supabase-js on the same site
// (js/cloud.js), which keeps the session in this site's local storage, so the viewer needs no library of its own.

/** What get_share() answered: the lesson, or only that it is private (the reader is not a signed-in teacher). */
export interface CloudShare { private: boolean; doc?: unknown }

/** The signed-in teacher's access token, from supabase-js's own storage (`sb-<project>-auth-token`); '' if none. */
export function sessionToken(store: Pick<Storage, 'length' | 'key' | 'getItem'>, now = Date.now()): string {
  try {
    for (let i = 0; i < store.length; i++) {
      const k = store.key(i) ?? '';
      if (!/^sb-.+-auth-token$/.test(k)) continue;
      const v = JSON.parse(store.getItem(k) || 'null') as { access_token?: string; expires_at?: number } | null;
      if (!v?.access_token) continue;
      // An expired token would be refused; SlideForge refreshes it when the teacher next opens the app.
      if (v.expires_at && v.expires_at * 1000 < now) continue;
      return v.access_token;
    }
  } catch { /* storage blocked */ }
  return '';
}

/** The share with this id, or null when this server saves nothing online or there is no such share. */
export async function cloudShare(id: string): Promise<CloudShare | null> {
  const cfg = await fetch('/api/cloud-config', { cache: 'no-store' }).then((r) => r.json()).catch(() => null) as { enabled?: boolean; url?: string; anonKey?: string } | null;
  if (!cfg?.enabled || !cfg.url || !cfg.anonKey) return null;
  let token = '';
  try { token = sessionToken(localStorage); } catch { /* no storage */ }
  const ask = (bearer: string) => fetch(`${cfg.url}/rest/v1/rpc/get_share`, {
    method: 'POST',
    headers: { apikey: cfg.anonKey!, Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ share_id: id }),
  });
  let r = await ask(token || cfg.anonKey);
  // A token the project no longer accepts: ask again as anyone, which still opens an open share.
  if (r.status === 401 && token) r = await ask(cfg.anonKey);
  if (!r.ok) return null;
  const j = await r.json().catch(() => null) as CloudShare | null;
  return j && typeof j === 'object' ? j : null;
}
