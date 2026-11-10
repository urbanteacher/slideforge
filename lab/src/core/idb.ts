// Minimal IndexedDB key-value store — decks with embedded images are far too big for localStorage.
//
// One connection for the page, opened when first needed. It closes itself when another tab asks to upgrade the
// database (versionchange), so that tab is never blocked, and the next call here opens it again. Every write settles:
// a transaction the browser aborts (storage full, a disk error) rejects rather than leaving the save waiting for ever,
// which would hold up every save queued behind it.
const DB = 'slideforge-studio';
const STORE = 'kv';

let conn: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  return (conn ??= new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => { db.close(); conn = null; };
      db.onclose = () => { conn = null; };
      resolve(db);
    };
    req.onerror = () => { conn = null; reject(req.error); };
  }));
}

/** The connection forgotten, so the next call opens a new one (the tests, which swap in their own indexedDB). */
export function idbForget(): void { conn = null; }

/** A write, settled once the transaction is: committed, failed, or aborted by the browser. */
async function write(job: (st: IDBObjectStore) => void): Promise<void> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    job(tx.objectStore(STORE));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new DOMException('The write failed', 'UnknownError'));
    tx.onabort = () => reject(tx.error ?? new DOMException('The browser stopped the write, often because its storage is full', 'AbortError'));
  });
}

export async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE).objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

/** Several records read in one transaction, in the order asked; undefined for one that is not there. */
export async function idbGetMany<T>(keys: string[]): Promise<(T | undefined)[]> {
  if (!keys.length) return [];
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE);
    const st = tx.objectStore(STORE);
    const out: (T | undefined)[] = new Array(keys.length);
    keys.forEach((k, i) => { const r = st.get(k); r.onsuccess = () => { out[i] = r.result as T | undefined; }; });
    tx.oncomplete = () => resolve(out);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new DOMException('The read was stopped', 'AbortError'));
  });
}

export function idbSet(key: string, value: unknown): Promise<void> {
  return write((st) => { st.put(value, key); });
}

/** Several records written in one transaction: one commit for all of them, rather than one each. */
export async function idbSetMany(entries: [string, unknown][]): Promise<void> {
  if (!entries.length) return;
  return write((st) => { for (const [k, v] of entries) st.put(v, k); });
}

export function idbDelete(key: string): Promise<void> {
  return write((st) => { st.delete(key); });
}

export async function idbKeys(): Promise<string[]> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE).objectStore(STORE).getAllKeys();
    req.onsuccess = () => resolve(req.result.map(String));
    req.onerror = () => reject(req.error);
  });
}
