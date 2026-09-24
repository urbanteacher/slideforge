import { refreshAssets } from '../engine/raster';
import type { PalettePreset } from './palettes';
import type { GuideGround, GuideSwatch, GuideTheme, StyleGuide } from './types';

// The deck's own style: a palette of three grounds, picked from the gallery (model/palettes.ts) or
// built by hand from the deck's current colours, and then everyone's to change. It is kept inside
// the deck — its colours, its colour sets, its grounds, any typeface files and marks added to it — and
// worn as a theme like the built-in ones, with each slide on the ground it is set on.

const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number];
function mix(a: string, b: string, t: number) {
  const x = rgb(a), y = rgb(b);
  return '#' + x.map((v, i) => Math.round((v + (y[i] - v) * t) * 255).toString(16).padStart(2, '0')).join('');
}

/** The two grounds beyond the working one. The loud ground and the quiet ground's accent name the
 *  set colour, so they follow whichever set is chosen. */
const GROUNDS = (quiet: { ground: string; ink: string }, loudInk: string): GuideGround[] => [
  { id: 'quiet', name: 'Quiet', ground: quiet.ground, ink: quiet.ink, accent: 'colour' },
  { id: 'loud', name: 'Loud', ground: 'colour', ink: loudInk, accent: loudInk },
];

/** A picked palette as the deck's style: working, quiet and loud grounds, and its colour sets. */
export function fromPreset(p: PalettePreset): StyleGuide {
  const work = p.working ?? { ground: p.light, ink: p.dark };
  const quiet = p.quiet ?? { ground: p.dark, ink: p.light };
  const muted = mix(work.ink, work.ground, 0.32);
  const panel = mix(work.ground, work.ink, 0.07);
  const swatches: GuideSwatch[] = p.named
    ? p.named.map((n) => ({ ...n }))
    : [{ name: 'light', value: p.light }, { name: 'dark', value: p.dark }];
  swatches.push({ name: 'quiet text', value: muted }, { name: 'panel', value: panel });
  const sets = p.sets?.map((_, i) => String(i + 1)) ?? [];
  if (p.sets) p.sets.forEach((st, i) => swatches.push(
    { name: 'colour', value: st.loud, set: String(i + 1) }, { name: 'colour-deep', value: st.deep, set: String(i + 1) },
    // A set with its own ink (white on red, dark on gold) carries it, and the loud ground reads it.
    ...(st.ink ? [{ name: 'colour-ink', value: st.ink, set: String(i + 1) }] : []),
  ));
  else swatches.push({ name: 'colour', value: p.loud }, { name: 'second colour', value: p.accent2 });
  const theme: GuideTheme = {
    ground: work.ground, ink: work.ink, muted, accent: p.loud, accent2: p.sets ? p.sets[0].deep : p.accent2,
    panel, display: p.display, displayWeight: p.displayWeight, body: p.body, hero: p.hero,
  };
  return { name: p.name, source: p.source, swatches, sets, set: sets[0], fonts: [], marks: p.marks?.map((m) => ({ ...m })) ?? [], theme, grounds: GROUNDS(quiet, p.sets?.some((x) => x.ink) ? 'colour-ink' : p.loudInk) };
}

/** A style made by hand, started from the deck's current theme so nothing changes until it is edited. */
export function blankGuide(st: { ground: string; ink: string; muted: string; accent: string; accent2?: string; panel: string; display: string; displayWeight: string; body: string }): StyleGuide {
  const theme: GuideTheme = { ground: st.ground, ink: st.ink, muted: st.muted, accent: st.accent, accent2: st.accent2 ?? st.accent, panel: st.panel, display: st.display, displayWeight: st.displayWeight, body: st.body };
  const swatches: GuideSwatch[] = [
    { name: 'light', value: st.ground }, { name: 'dark', value: st.ink }, { name: 'quiet text', value: st.muted },
    { name: 'colour', value: st.accent }, { name: 'second colour', value: theme.accent2 }, { name: 'panel', value: st.panel },
  ];
  return { name: 'My palette', source: 'Made by hand', swatches, sets: [], fonts: [], marks: [], theme, grounds: GROUNDS({ ground: st.ink, ink: st.ground }, st.ink) };
}

/** Choose one of the palette's colour sets: its colour is the accent and the loud ground, its deep the second accent. */
export function chooseSet(g: StyleGuide, set: string) {
  g.set = set;
  const pal = new Map(paletteOf(g, set).map((x) => [x.name, x.value]));
  g.theme.accent = pal.get('colour') ?? g.theme.accent;
  g.theme.accent2 = pal.get('colour-deep') ?? g.theme.accent2;
}

/** A ground with every role filled, for the chosen set. */
export function resolveGround(g: StyleGuide, gr: GuideGround, set = g.set) {
  const pal = new Map(paletteOf(g, set).map((p) => [p.name, p.value]));
  const v = (x?: string) => (x === undefined ? undefined : x.startsWith('#') ? x : pal.get(x));
  const ground = v(gr.ground) ?? g.theme.ground;
  const ink = v(gr.ink) ?? g.theme.ink;
  return { id: gr.id, name: gr.name, ground, ink, muted: v(gr.muted) ?? mix(ink, ground, 0.28), accent: v(gr.accent) ?? g.theme.accent };
}

/** The guide's colours as one palette: its shared tokens, with the chosen set laid over them. */
export function paletteOf(g: StyleGuide, set = g.set): { name: string; value: string }[] {
  const map = new Map<string, string>();
  for (const s of g.swatches) if (!s.set) map.set(s.name, s.value);
  for (const s of g.swatches) if (set && s.set === set) map.set(s.name, s.value);
  return [...map.entries()].map(([name, value]) => ({ name, value }));
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
