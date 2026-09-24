import { refreshAssets } from '../engine/raster';
import type { GuideFont, GuideMark, GuideSwatch, GuideTheme, StyleGuide } from './types';

// Your own style guide, read into the deck. A guide is whatever a brand or campaign publishes about
// itself — a page like AiAd27/style.html, or just its stylesheet — and what the lab needs out of it
// is always the same four things: the colours it names, the sets they come in, the typefaces it
// ships and the marks it draws. Those are read from the page and the stylesheets it links (the
// tokens, not the pixels, because a guide page often builds itself from those tokens with script),
// kept inside the deck, and offered back as a theme whose every role is one of the guide's own
// colours or fonts. Nothing is invented: a role the guide does not name is filled from the
// nearest thing it does.

// ─── Fetching ───────────────────────────────────────────────────────────────
// A guide usually lives on another origin. The lab's dev server fetches it on the lab's behalf
// (vite.config.ts, /__dev/fetch) when the browser is not allowed to read it directly.
async function fetchOk(url: string): Promise<Response> {
  if (url.startsWith('data:')) return fetch(url);
  try {
    const r = await fetch(url);
    if (r.ok) return r;
  } catch { /* cross-origin without CORS: ask the dev server */ }
  const r = await fetch('/__dev/fetch?url=' + encodeURIComponent(url));
  if (!r.ok) throw new Error(r.status === 404 ? `${url} was not found` : `${url} could not be read (${r.status})`);
  return r;
}
const getText = async (url: string) => (await fetchOk(url)).text();
async function getDataUrl(url: string): Promise<string> {
  const blob = await (await fetchOk(url)).blob();
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(blob);
  });
}
const resolveUrl = (ref: string, base: string | null) => {
  if (/^(data:|https?:)/i.test(ref)) return ref;
  if (!base) return null;
  try { return new URL(ref, base).href; } catch { return null; }
};

// ─── Colours ────────────────────────────────────────────────────────────────
let probe: CanvasRenderingContext2D | null = null;
/** Any CSS colour as #rrggbb, or null if it is not an opaque colour. */
export function toHex(v: string): string | null {
  const s = v.trim();
  if (!/^(#[0-9a-f]{3,8}|rgba?\(|hsla?\(|color\()/i.test(s)) return null;
  if (/^#[0-9a-f]{6}$/i.test(s)) return s.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(s)) return ('#' + s.slice(1).split('').map((c) => c + c).join('')).toLowerCase();
  if (/^#[0-9a-f]{8}$/i.test(s)) return parseInt(s.slice(7), 16) < 250 ? null : s.slice(0, 7).toLowerCase();
  probe ??= document.createElement('canvas').getContext('2d');
  if (!probe) return null;
  probe.fillStyle = '#000001';
  probe.fillStyle = s;
  const out = String(probe.fillStyle);
  if (out === '#000001') return null;
  return /^#[0-9a-f]{6}$/i.test(out) ? out : null; // rgba(…) back means it was see-through: a scrim, not a colour
}
const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number];
const lum = (h: string) => { const [r, g, b] = rgb(h); return 0.299 * r + 0.587 * g + 0.114 * b; };
const sat = (h: string) => { const c = rgb(h), mx = Math.max(...c), mn = Math.min(...c); return mx === 0 ? 0 : (mx - mn) / mx; };
function mix(a: string, b: string, t: number) {
  const x = rgb(a), y = rgb(b);
  return '#' + x.map((v, i) => Math.round((v + (y[i] - v) * t) * 255).toString(16).padStart(2, '0')).join('');
}

// ─── CSS ────────────────────────────────────────────────────────────────────
interface Rule { selector: string; body: string }
/** A stylesheet's rules, nesting followed: what sits inside @media print or @keyframes is not the
 *  brand's standing look, so it is left out; @font-face is kept. */
function cssRules(css: string): Rule[] {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const out: Rule[] = [];
  const stack: string[] = [];
  let buf = '';
  for (const c of clean) {
    if (c === '{') { stack.push(buf.trim()); buf = ''; continue; }
    if (c === '}') {
      const prelude = stack.pop() ?? '';
      const skip = stack.some((p) => /^@media\b[^{]*\bprint\b/i.test(p) || /^@(-\w+-)?keyframes/i.test(p));
      if (!skip && buf.trim() && (!prelude.startsWith('@') || /^@font-face/i.test(prelude))) out.push({ selector: prelude, body: buf });
      buf = '';
      continue;
    }
    buf += c;
  }
  return out;
}
/** Roughly how specific a selector is: a variant (".x:is(.title)", ".x.dark") outranks the base rule
 *  it refines, and the base rule is the brand's standing value. */
const specificity = (sel: string) => (sel.match(/[.#[]|:(?!root\b)/g) ?? []).length;
const customProps = (body: string) => [...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+)/g)].filter((m) => !/!important/.test(m[2])).map((m) => [m[1], m[2].trim()] as const);

function resolveVars(v: string, props: Map<string, string>, depth = 0): string {
  if (depth > 8) return v;
  return v.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*(?:\([^()]*\))?[^()]*))?\)/g, (_, name: string, fallback?: string) => {
    const got = props.get(name);
    return got !== undefined ? resolveVars(got, props, depth + 1) : fallback !== undefined ? resolveVars(fallback, props, depth + 1) : '';
  });
}

/** The first family in a font stack: `'AIAD Sans', Arial, sans-serif` → AIAD Sans. */
const firstFamily = (stack: string) => stack.split(',')[0]?.trim().replace(/^['"]|['"]$/g, '') ?? '';

// ─── Reading a guide ────────────────────────────────────────────────────────
interface Sources { name: string; source: string; css: { text: string; base: string | null }[]; images: string[]; inlineSvgs: string[]; notes: string[] }

async function readSources(input: string | File): Promise<Sources> {
  const notes: string[] = [];
  let raw: string, base: string | null, source: string, isCss: boolean;
  if (typeof input === 'string') {
    source = /^[a-z]+:\/\//i.test(input.trim()) ? input.trim() : 'http://' + input.trim();
    raw = await getText(source);
    base = source;
    isCss = /\.css(\?|$)/i.test(source) || !/<[a-z!]/i.test(raw.slice(0, 2000));
  } else {
    source = input.name;
    raw = await input.text();
    base = null;
    isCss = /\.css$/i.test(input.name) || !/<[a-z!]/i.test(raw.slice(0, 2000));
    notes.push('Read from a file, so anything it links by a relative path (stylesheets, fonts, pictures) could not be followed. Give its web address to bring those in too.');
  }
  const out: Sources = { name: source.replace(/^.*\//, '').replace(/\.(html?|css)$/i, ''), source, css: [], images: [], inlineSvgs: [], notes };
  if (isCss) {
    out.css.push({ text: raw, base });
    return out;
  }
  const doc = new DOMParser().parseFromString(raw, 'text/html');
  const baseHref = doc.querySelector('base[href]')?.getAttribute('href');
  const pageBase = baseHref && base ? resolveUrl(baseHref, base) : base;
  out.name = (doc.querySelector('h1')?.textContent || doc.title || out.name).replace(/\s+/g, ' ').trim();
  doc.querySelectorAll('style').forEach((st) => out.css.push({ text: st.textContent ?? '', base: pageBase }));
  const links = [...doc.querySelectorAll('link[rel~="stylesheet"][href]')].map((l) => resolveUrl(l.getAttribute('href')!, pageBase)).filter(Boolean) as string[];
  for (const href of links) {
    try {
      const text = await getText(href);
      out.css.push({ text, base: href });
      // One level of @import, which is how most guides pull in their tokens and web fonts.
      for (const m of text.matchAll(/@import\s+(?:url\()?['"]?([^'")\s;]+)/g)) {
        const u = resolveUrl(m[1], href);
        if (u) try { out.css.push({ text: await getText(u), base: u }); } catch { /* optional */ }
      }
    } catch { notes.push(`The stylesheet ${href} could not be read.`); }
  }
  // Pictures the page shows, and the ones its script names: a guide page often draws its marks
  // from a list of file names.
  doc.querySelectorAll('img[src]').forEach((im) => out.images.push(resolveUrl(im.getAttribute('src')!, pageBase) ?? ''));
  for (const m of raw.matchAll(/["'(]([^"'()\s<>]+\.(?:svg|png|jpe?g|webp))["')]/gi)) out.images.push(resolveUrl(m[1], pageBase) ?? '');
  doc.querySelectorAll('svg').forEach((svg) => {
    const w = Number(svg.getAttribute('width') ?? 0), vb = svg.getAttribute('viewBox');
    if ((w && w < 20) || (!w && !vb)) return; // an interface glyph, not a mark
    if (!svg.getAttribute('xmlns')) svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    out.inlineSvgs.push('data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg.outerHTML))));
  });
  return out;
}

/** Read a guide from its web address, or from a dropped .html or .css file. */
export async function readGuide(input: string | File): Promise<{ guide: StyleGuide; notes: string[] }> {
  const src = await readSources(input);
  const global = new Map<string, string>();
  const setProps = new Map<string, Map<string, string>>();
  const fontStacks: { name: string; stack: string }[] = [];
  const faces: { family: string; weight: string; style: string; url: string; sheet: number }[] = [];
  const cssImages: { url: string; sheet: number }[] = [];

  // Colour sets: sibling classes that each define colours — .theme-aiad27-safe, .theme-aiad27-smart…
  const sheets = src.css.map((c) => cssRules(c.text));
  const all = sheets.flatMap((rules, i) => rules.map((r) => ({ ...r, base: src.css[i].base, sheet: rules.length })));
  const single = all.filter((r) => /^\.[\w-]+-[\w]+$/.test(r.selector) && customProps(r.body).some(([, v]) => toHex(v)));
  const byPrefix = new Map<string, { members: Set<string>; sheet: number }>();
  for (const r of single) {
    const prefix = r.selector.replace(/-[\w]+$/, '-');
    const g = byPrefix.get(prefix) ?? byPrefix.set(prefix, { members: new Set(), sheet: Infinity }).get(prefix)!;
    g.members.add(r.selector);
    g.sheet = Math.min(g.sheet, r.sheet);
  }
  // A guide page often links a general stylesheet beside its own (AiAd27's links all of SlideForge's
  // app.css, with twenty other themes in it). The brand's sets are the ones in the smallest sheet —
  // the one written for this guide — and the other families of sibling classes are left out.
  const families = [...byPrefix.entries()].filter(([, g]) => g.members.size >= 2);
  const groups = families.filter(([, g]) => g.members.size <= 16).sort((a, b) => a[1].sheet - b[1].sheet || b[0].length - a[0].length);
  const setPrefix = groups[0]?.[0];
  const otherSets = new Set(families.filter(([p]) => p !== setPrefix).flatMap(([, g]) => [...g.members]));
  // Swatches come from the brand's own sheets: the smallest one that names colours, and any not
  // far bigger. Every sheet's tokens are still read, so a brand token built on a general one resolves.
  const tokenSheets = all.filter((r) => customProps(r.body).some(([, v]) => toHex(v))).map((r) => r.sheet);
  const brandSize = tokenSheets.length ? Math.min(...tokenSheets) : 0;
  const shown = (sheet: number) => sheet <= Math.max(brandSize * 10, 400);
  const origin = new Map<string, number>();
  const specOf = new Map<string, number>();

  for (const r of all) {
    const isFace = /^@font-face/i.test(r.selector);
    if (isFace) {
      const family = firstFamily(r.body.match(/font-family\s*:\s*([^;]+)/i)?.[1] ?? '');
      const url = r.body.match(/url\(\s*['"]?([^'")]+\.(?:woff2|woff|ttf|otf)[^'")]*)['"]?\s*\)/i)?.[1];
      const abs = url ? resolveUrl(url, r.base) : null;
      if (family && abs) faces.push({ family, weight: (r.body.match(/font-weight\s*:\s*([^;]+)/i)?.[1] ?? '400').trim(), style: (r.body.match(/font-style\s*:\s*([^;]+)/i)?.[1] ?? 'normal').trim(), url: abs, sheet: r.sheet });
      continue;
    }
    if (otherSets.has(r.selector)) continue;
    const inSet = setPrefix && r.selector.startsWith(setPrefix) && /^\.[\w-]+$/.test(r.selector) ? r.selector.slice(setPrefix.length) : null;
    const target = inSet ? (setProps.get(inSet) ?? setProps.set(inSet, new Map()).get(inSet)!) : global;
    const spec = specificity(r.selector);
    for (const [k, v] of customProps(r.body)) {
      // The base definition stands: a variant that refines it for one layout does not replace it.
      // Among equals the later one wins, and moves to the end so it is also the last one read.
      const key = (inSet ?? '') + k;
      if ((specOf.get(key) ?? Infinity) < spec) continue;
      specOf.set(key, spec);
      target.delete(k);
      target.set(k, v);
      if (target === global) origin.set(k, r.sheet);
      if (/font/i.test(k) && /['"a-z]/i.test(v) && !/^\d/.test(v)) fontStacks.push({ name: k, stack: v });
    }
    for (const m of r.body.matchAll(/font-family\s*:\s*([^;]+)/gi)) if (!/var\(/.test(m[1])) fontStacks.push({ name: r.selector, stack: m[1] });
    for (const m of r.body.matchAll(/url\(\s*['"]?([^'")]+\.(?:svg|png|jpe?g|webp))['"]?\s*\)/gi)) cssImages.push({ url: resolveUrl(m[1], r.base) ?? '', sheet: r.sheet });
  }

  // Swatches: every custom property that is a colour once its var()s are followed. In a guide with
  // sets, a token that reads differently in each set (--s-accent: var(--a27-deep)) is kept per set.
  const swatches: GuideSwatch[] = [];
  const clean = (k: string) => k.replace(/^--/, '');
  const globalHex = new Map<string, string>();
  for (const [k, v] of global) {
    const hex = toHex(resolveVars(v, global));
    if (!hex) continue;
    globalHex.set(k, hex);
    if (shown(origin.get(k) ?? 0)) swatches.push({ name: clean(k), value: hex });
  }
  const sets = [...setProps.keys()];
  for (const set of sets) {
    const merged = new Map([...global, ...setProps.get(set)!]);
    for (const [k, v] of merged) {
      const hex = toHex(resolveVars(v, merged));
      if (hex && (setProps.get(set)!.has(k) || (globalHex.get(k) !== hex && shown(origin.get(k) ?? 0)))) swatches.push({ name: clean(k), value: hex, set });
    }
  }
  // A stylesheet with no tokens still has colours: keep the ones it uses most.
  if (!swatches.length) {
    const count = new Map<string, number>();
    for (const c of src.css) for (const m of c.text.matchAll(/#[0-9a-f]{3,8}\b|rgba?\([^)]+\)/gi)) { const h = toHex(m[0]); if (h) count.set(h, (count.get(h) ?? 0) + 1); }
    [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 16).forEach(([h], i) => swatches.push({ name: `colour ${i + 1}`, value: h }));
  }

  // Typefaces: every family with files, embedded, so the deck and its export carry them.
  const fonts: GuideFont[] = [];
  // The brand's own typefaces first (its smallest sheets), then any the general sheets declare.
  for (const f of faces.sort((a, b) => a.sheet - b.sheet).slice(0, 12)) {
    try {
      const srcUrl = await getDataUrl(f.url);
      let gf = fonts.find((x) => x.family === f.family);
      if (!gf) fonts.push((gf = { family: f.family, faces: [] }));
      gf.faces.push({ weight: f.weight, style: f.style, src: srcUrl });
    } catch { src.notes.push(`The font file for ${f.family} could not be read.`); }
  }

  // Marks: the pictures the guide shows, embedded.
  // The page's own pictures first, then the ones the brand's own (smallest) stylesheet uses.
  const urls = [...new Set([...src.images, ...cssImages.sort((a, b) => a.sheet - b.sheet).map((c) => c.url)].filter(Boolean))].slice(0, 40);
  const got = await Promise.allSettled(urls.map(async (u) => ({ name: decodeURIComponent(u.replace(/[?#].*$/, '').replace(/^.*\//, '')).replace(/\.\w+$/, ''), src: await getDataUrl(u) })));
  const marks: GuideMark[] = got.flatMap((g) => (g.status === 'fulfilled' && /^data:image\//.test(g.value.src) ? [g.value] : []));
  src.inlineSvgs.slice(0, 12).forEach((s, i) => marks.push({ name: `drawing ${i + 1}`, src: s }));

  const guide: StyleGuide = { name: src.name || 'Style guide', source: src.source, swatches, sets, set: sets[0], fonts, marks, theme: {} as GuideTheme };
  // When the guide ships typefaces, the theme is set in them: a page's own heading font is its chrome.
  const shipped = new Set(fonts.map((f) => f.family));
  const stacks = fontStacks.map((s) => ({ name: s.name, family: firstFamily(resolveVars(s.stack, global)) })).filter((s) => s.family && (!shipped.size || shipped.has(s.family)));
  guide.theme = themeFrom(guide, sets[0], stacks);
  const found = [`${swatches.filter((s) => !s.set).length + new Set(swatches.filter((s) => s.set).map((s) => s.name)).size} colours`, sets.length ? `${sets.length} colour sets` : '', `${fonts.length} typeface${fonts.length === 1 ? '' : 's'}`, `${marks.length} marks`].filter(Boolean).join(', ');
  return { guide, notes: [`Read ${found} from “${guide.name}”.`, ...src.notes] };
}

// ─── The guide as a theme ───────────────────────────────────────────────────
/** The guide's colours as one palette: its shared tokens, with the chosen set laid over them. */
export function paletteOf(g: StyleGuide, set = g.set): { name: string; value: string }[] {
  const map = new Map<string, string>();
  for (const s of g.swatches) if (!s.set) map.set(s.name, s.value);
  for (const s of g.swatches) if (set && s.set === set) map.set(s.name, s.value);
  return [...map.entries()].map(([name, value]) => ({ name, value }));
}

/**
 * Which of the guide's colours does which job. Named tokens decide first — a guide that calls a
 * colour "bg" or "ink" has said what it is for — and only a role nobody named falls back to what the
 * colours are: the lightest quiet colour is the ground, the one furthest from it the ink, the most
 * saturated the accent.
 */
export function themeFrom(g: StyleGuide, set = g.set, stacks: { name: string; family: string }[] = []): GuideTheme {
  const pal = paletteOf(g, set);
  const setNames = new Set(g.swatches.filter((s) => s.set === set).map((s) => s.name));
  // The latest definition wins: a brand sheet is linked after the general one it builds on.
  const named = (re: RegExp, pool = pal) => [...pool].reverse().find((p) => re.test(p.name))?.value;
  const colours = [...new Set(pal.map((p) => p.value))];
  const quiet = colours.filter((c) => sat(c) < 0.25);
  const ground = named(/(^|-)(bg|background|ground|paper|canvas|base)$/) ?? [...(quiet.length ? quiet : colours)].sort((a, b) => lum(b) - lum(a))[0] ?? '#ffffff';
  const ink = named(/(^|-)(fg|ink|text|foreground|body-colou?r)$/) ?? [...(quiet.length ? quiet : colours)].sort((a, b) => Math.abs(lum(b) - lum(ground)) - Math.abs(lum(a) - lum(ground)))[0] ?? '#111111';
  const muted = named(/(dim|muted|subtle|secondary-text|grey|gray)$/) ?? mix(ink, ground, 0.4);
  const panel = named(/(card|panel|surface|tile)$/) ?? mix(ground, ink, 0.06);
  // A set's own colours are the brand's: its bright is the accent and its deep the second.
  const inSet = pal.filter((p) => setNames.has(p.name));
  const vivid = [...colours].filter((c) => sat(c) > 0.3 && c !== ground && c !== ink).sort((a, b) => sat(b) * (1 - Math.abs(lum(b) - 0.55)) - sat(a) * (1 - Math.abs(lum(a) - 0.55)));
  const accent = named(/(colou?r|bright|primary|main|brand)$/, inSet) ?? inSet.sort((a, b) => sat(b.value) - sat(a.value))[0]?.value
    ?? named(/(^|-)(accent|brand|primary)(-1)?$/) ?? vivid[0] ?? ink;
  const accent2 = named(/(deep|dark|secondary|accent-?2)$/, inSet) ?? named(/(accent-?2|secondary|highlight)$/) ?? vivid.find((c) => c !== accent) ?? accent;
  const family = (re: RegExp) => stacks.find((s) => re.test(s.name))?.family;
  const first = g.fonts[0]?.family ?? stacks[0]?.family ?? 'Inter';
  const display = family(/display|head|title/i) ?? first;
  const body = family(/body|text|copy|(^|-)font$|sans/i) ?? first;
  const weights = g.fonts.find((f) => f.family === display)?.faces.map((f) => Math.min(800, parseInt(f.weight.split(/\s+/).pop() ?? '400', 10) || 400)) ?? [700];
  return { ground, ink, muted, accent, accent2, panel, display, displayWeight: String(Math.max(...weights)), body };
}

// ─── Fonts ──────────────────────────────────────────────────────────────────
const loaded = new Set<string>();
/** Make the guide's typefaces available to the canvas (and so to every text box). */
export function registerGuideFonts(g: StyleGuide | undefined) {
  if (!g || typeof document === 'undefined' || !('fonts' in document)) return;
  for (const f of g.fonts) for (const face of f.faces) {
    const key = `${f.family}|${face.weight}|${face.style}`;
    if (loaded.has(key)) continue;
    loaded.add(key);
    const ff = new FontFace(f.family, `url(${face.src})`, { weight: face.weight, style: face.style });
    ff.load().then((x) => { document.fonts.add(x); refreshAssets(); }).catch(() => loaded.delete(key));
  }
}

/** The guide's fonts as CSS, for an exported deck. */
export function guideFontCss(g: StyleGuide | undefined): string {
  if (!g) return '';
  return g.fonts.flatMap((f) => f.faces.map((face) => `@font-face{font-family:${JSON.stringify(f.family)};src:url(${face.src});font-weight:${face.weight};font-style:${face.style};font-display:block}`)).join('\n');
}

/** Every font a text box can be set in: the guide's own first, then the lab's. */
export function fontChoices(g: StyleGuide | undefined, builtIn: readonly string[]): string[] {
  const mine = g ? [...g.fonts.map((f) => f.family), g.theme.display, g.theme.body] : [];
  return [...new Set([...mine, ...builtIn].filter(Boolean))];
}
