// A lab deck carries each picture as data in every place it is used: a theme's logo is on every slide. A packed
// deck keeps each once, in `pictures`, and refers to it as '@picture:<n>'. The shipped lesson copies are packed
// this way (tools/build-lab-lessons.mjs, the same rule in Node), and so is a shared lesson (lab-engine-plan M12),
// which has to fit the relay's 8 MB (MAX_DOC in server/server.js).

/** Only data longer than this is kept once: a short one costs less than its reference. */
const MIN = 1000;

/** A copy of `value` with every long `data:` string kept once, in `pictures`. The value itself is not changed. */
export function packPictures<T>(value: T): T & { pictures?: string[] } {
  const pictures: string[] = [], at = new Map<string, number>();
  const walk = (v: unknown): unknown => {
    if (typeof v === 'string') {
      if (!v.startsWith('data:') || v.length < MIN) return v;
      if (!at.has(v)) { at.set(v, pictures.length); pictures.push(v); }
      return `@picture:${at.get(v)}`;
    }
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  const packed = walk(value) as T & { pictures?: string[] };
  if (pictures.length) packed.pictures = pictures;
  return packed;
}

/** Each '@picture:<n>' put back as the picture it names, in place; `pictures` is taken off. */
export function unpackPictures<T extends object>(d: T & { pictures?: string[] }): T {
  const pics = d.pictures;
  if (!Array.isArray(pics)) return d;
  delete d.pictures;
  const walk = (v: unknown): unknown => {
    if (typeof v === 'string') { const m = /^@picture:(\d+)$/.exec(v); return m && pics[+m[1]] !== undefined ? pics[+m[1]] : v; }
    if (Array.isArray(v)) { for (let i = 0; i < v.length; i++) v[i] = walk(v[i]); return v; }
    if (v && typeof v === 'object') { for (const k of Object.keys(v)) (v as Record<string, unknown>)[k] = walk((v as Record<string, unknown>)[k]); return v; }
    return v;
  };
  walk(d);
  return d;
}
