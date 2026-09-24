import { kind } from '../engine/registry';
import { createLayer } from './defaults';
import { themeOf } from './layouts';
import type { Deck, Layer, Slide } from './types';

// SlideForge's "Backdrop motion" for a slide: Still, Drift, Grid or Glow. One Backdrop motion layer
// under everything, coloured from the slide itself — the deck theme's accent when it has one,
// otherwise the strongest colour already on the slide, with the ink the slide's words are set in —
// so it is a wash of this slide's palette, not a stranger's.

export type BackdropMode = 'still' | 'drift' | 'grid' | 'glow';

function rgb(hex: string): [number, number, number] | null {
  const h = String(hex ?? '').replace('#', '');
  const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  const n = parseInt(f, 16);
  return f.length === 6 && !Number.isNaN(n) ? [(n >> 16) & 255, (n >> 8) & 255, n & 255] : null;
}
const lum = (c: [number, number, number]) => (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255;
const sat = (c: [number, number, number]) => { const mx = Math.max(...c) / 255, mn = Math.min(...c) / 255; return mx === 0 ? 0 : (mx - mn) / mx; };

/** The slide's own palette: two accents and the ink. */
export function slidePalette(d: Deck, s: Slide): { accent: string; accent2: string; ink: string } {
  const g = rgb(s.background) ?? [255, 255, 255];
  const ink = lum(g) < 0.45 ? '#f5f4f2' : '#161616';
  const theme = themeOf(d);
  const seen = new Map<string, number>();
  // The slide's ground — its Solid or gradient layer, or any colour that close to it — is not an accent.
  const near = (c: [number, number, number]) => Math.hypot(c[0] - g[0], c[1] - g[1], c[2] - g[2]) < 48;
  for (const l of s.layers) for (const key of ['color', 'fill', 'accent', 'color2', 'stroke']) {
    if (!kind(l.kind).content) continue;
    const v = l.params[key];
    const c = typeof v === 'string' ? rgb(v) : null;
    if (!c || sat(c) < 0.35 || lum(c) < 0.08 || near(c)) continue;
    const hex = '#' + c.map((x) => x.toString(16).padStart(2, '0')).join('');
    seen.set(hex, (seen.get(hex) ?? 0) + (l.box ? l.box.w * l.box.h : 1e5) * sat(c));
  }
  const ranked = [...seen.entries()].sort((a, b) => b[1] - a[1]).map(([h]) => h);
  // A ground that is itself a strong colour — a poster cover — is already the accent: washing a
  // darker accent over it reads as smudges, so its motion is light moving across it instead.
  if (sat(g) > 0.35 && lum(g) > 0.3) return { accent: '#ffffff', accent2: '#ffffff', ink };
  const accent = theme?.accent ?? ranked[0] ?? '#ff5a36';
  const accent2 = theme?.accent2 ?? ranked.find((h) => h !== accent) ?? accent;
  return { accent, accent2, ink };
}

export const isBackdrop = (l: Layer) => l.kind === 'backdrop';

export function backdropOf(s: Slide): BackdropMode {
  const l = s.layers.find(isBackdrop);
  return l && l.visible ? (String(l.params.mode) as BackdropMode) : 'still';
}

/** Set a slide's backdrop, inside a mutate: add, change or remove the one Backdrop motion layer. */
export function setBackdrop(d: Deck, slideId: string, mode: BackdropMode) {
  const s = d.slides.find((x) => x.id === slideId);
  if (!s) return;
  const have = s.layers.find(isBackdrop);
  if (mode === 'still') { if (have) s.layers = s.layers.filter((l) => l !== have); return; }
  if (have) { have.params.mode = mode; have.visible = true; return; }
  const pal = slidePalette(d, s);
  const layer = createLayer('backdrop', { name: 'Backdrop motion', params: { mode, ...pal } });
  // Just above the slide's own ground (a Solid or gradient at the bottom), beneath everything else.
  let at = 0;
  while (at < s.layers.length && kind(s.layers[at].kind).category === 'generate' && !isBackdrop(s.layers[at])) at++;
  s.layers.splice(at, 0, layer);
}
