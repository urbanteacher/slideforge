import { report } from './status';

// Online sync is SlideForge's (js/sync.js), not the lab's. Inside SlideForge the Status tab lists its last pass, read
// from the shell's SF.Sync.status(), so a sync that failed is seen here too. The lab on its own has no sync.

type SyncResult = { at?: number; up?: number; down?: number; error?: unknown; skipped?: string[] } | null;
type Host = { SF?: { Sync?: { status?: () => SyncResult } } };

export function startSyncWatch(embedded: boolean): () => void {
  if (!embedded) return () => {};
  let lastAt = 0;
  const look = () => {
    let r: SyncResult = null;
    try { r = (window.parent as unknown as Host).SF?.Sync?.status?.() ?? null; } catch { return; }
    if (!r?.at || r.at === lastAt) return;
    lastAt = r.at;
    const err = r.error ? (r.error instanceof Error ? r.error.message : String((r.error as { message?: string }).message ?? r.error)) : '';
    const skipped = r.skipped?.length ? ` Not uploaded: ${r.skipped.join(', ')}.` : '';
    report(err
      ? { id: `sync-${r.at}`, kind: 'sync', state: 'failed', at: r.at, title: 'Online sync failed', detail: `${err}.${skipped} Your work is still saved in this browser.` }
      : { id: 'sync', kind: 'sync', state: 'done', at: r.at, title: 'Synced with your account', detail: `${r.up ?? 0} up, ${r.down ?? 0} down.${skipped}` });
  };
  look();
  const t = setInterval(look, 10000);
  return () => clearInterval(t);
}
