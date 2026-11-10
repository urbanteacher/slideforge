// Pictures kept once, outside the lesson's record (BACKLOG CS-14, from Claude Slides storing pictures by
// fingerprint). A lesson saved in this browser holds each embedded picture, video or sound of 8 KB or more as
// `sf-pic:<sha256>`, and the picture itself is a record of its own, `pic:<sha256>`, written once. So an autosave
// writes the lesson's words, not its pictures again, and a picture used in several lessons is kept once.
//
// Only what is stored changes. A lesson read back has its pictures put back before anything sees it, so the editor,
// the show, exports, backups, shares and the online sync (js/sync.js, whose own references are `sf-asset:`) work on
// whole lessons as before. A lesson saved before this, pictures inside, reads as it always did.
//
// Safety: a lesson's pictures are written before the lesson. A picture that cannot be found keeps its reference,
// so it is not lost by the next save, and is reported. The sweep removes only pictures that no lesson refers to
// and that are more than a day old, so a picture another tab has just written for a lesson it is about to save
// is never taken.

/** The few key-value calls the store needs: IndexedDB in the studio (core/idb.ts), a Map in the tests. */
export interface Kv {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  /** Several records in one write (one IndexedDB transaction): a lesson's new pictures are committed together. */
  setMany(entries: [string, unknown][]): Promise<void>;
  del(key: string): Promise<void>;
  keys(): Promise<string[]>;
}

/** A stored picture: the data address as it was, and when it was last written. */
interface Pic { data: string; at: number }

export const PIC_MIN = 8 * 1024;
const REF = 'sf-pic:';
const PIC = 'pic:';
const isRef = (v: string) => v.startsWith(REF) && /^sf-pic:[0-9a-f]{64}$/.test(v);

/** Every value a deck holds, walked; `swap` may return a replacement for a string. */
function walk(v: unknown, swap: (s: string) => string | undefined, depth = 0): unknown {
  if (typeof v === 'string') return swap(v) ?? v;
  if (depth > 40 || v == null || typeof v !== 'object') return v;
  if (Array.isArray(v)) {
    let out: unknown[] | null = null;
    v.forEach((x, i) => { const y = walk(x, swap, depth + 1); if (y !== x) (out ??= [...v])[i] = y; });
    return out ?? v;
  }
  let out: Record<string, unknown> | null = null;
  for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
    const y = walk(x, swap, depth + 1);
    if (y !== x) (out ??= { ...(v as Record<string, unknown>) })[k] = y;
  }
  return out ?? v;
}

/** The strings in a value that `want` picks, each once. */
function collect(v: unknown, want: (s: string) => boolean): Set<string> {
  const found = new Set<string>();
  walk(v, (s) => { if (want(s)) found.add(s); return undefined; });
  return found;
}

async function sha256(s: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function pictureStore(kv: Kv, now = () => Date.now()) {
  // A picture's fingerprint, once worked out, and when this page last wrote or read each picture: an autosave
  // neither hashes nor writes a picture it kept in the last hour. After that it is written again, in case another
  // tab's sweep has since taken it. The memo is bounded, oldest out first.
  const hashes = new Map<string, string>();
  const written = new Map<string, number>();
  const fresh = (h: string) => now() - (written.get(h) ?? -Infinity) < 60 * 60 * 1000;
  const hashOf = async (s: string) => {
    let h = hashes.get(s);
    if (!h) {
      h = await sha256(s);
      hashes.set(s, h);
      if (hashes.size > 400) hashes.delete(hashes.keys().next().value!);
    }
    return h;
  };

  /** The value as it is stored: its large data addresses written as pictures of their own, first, and replaced by
   *  their references. The value passed in is not changed. */
  async function stash<T>(value: T): Promise<T> {
    const big = collect(value, (s) => s.startsWith('data:') && s.length >= PIC_MIN);
    if (!big.size) return value;
    // Fingerprinted together, then every picture not kept lately written in one transaction: one commit, however
    // many pictures. (One write each took half a minute for Week 5's twelve.)
    const list = [...big];
    const hs = await Promise.all(list.map(hashOf));
    const refs = new Map<string, string>(list.map((s, i) => [s, REF + hs[i]]));
    const todo = list.map((s, i) => [s, hs[i]] as const).filter(([, h]) => !fresh(h));
    if (todo.length) {
      await kv.setMany(todo.map(([s, h]) => [PIC + h, { data: s, at: now() } satisfies Pic]));
      for (const [, h] of todo) written.set(h, now());
    }
    return walk(value, (s) => refs.get(s)) as T;
  }

  /** The value with its pictures put back. A reference whose picture is missing stays as it is, and is listed. */
  async function restore<T>(value: T): Promise<{ value: T; missing: string[] }> {
    const refs = collect(value, isRef);
    if (!refs.size) return { value, missing: [] };
    const data = new Map<string, string>();
    const missing: string[] = [];
    for (const r of refs) {
      const h = r.slice(REF.length);
      const pic = await kv.get<Pic>(PIC + h);
      if (pic && typeof pic.data === 'string') { data.set(r, pic.data); hashes.set(pic.data, h); }
      else missing.push(h);
    }
    return { value: walk(value, (s) => data.get(s)) as T, missing };
  }

  /** Remove pictures no stored record refers to, once they are more than `ageMs` old. Returns how many went. */
  async function sweep(ageMs = 24 * 60 * 60 * 1000): Promise<number> {
    const keys = await kv.keys();
    const used = new Set<string>();
    for (const k of keys) {
      if (k.startsWith(PIC)) continue;
      for (const r of collect(await kv.get(k), isRef)) used.add(r.slice(REF.length));
    }
    let gone = 0;
    for (const k of keys.filter((x) => x.startsWith(PIC))) {
      const h = k.slice(PIC.length);
      if (used.has(h)) continue;
      const pic = await kv.get<Pic>(k);
      if (pic && now() - (pic.at ?? 0) < ageMs) continue;
      await kv.del(k);
      written.delete(h);
      gone++;
    }
    return gone;
  }

  return { stash, restore, sweep };
}
