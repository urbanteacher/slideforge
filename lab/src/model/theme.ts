import { groundParams, slideStyle, themeOf, type LayoutStyle } from './layouts';
import type { Deck, Layer, Slide } from './types';

// One theme per deck. Choosing a theme restyles every slide at once, the way changing a SlideForge
// deck's theme does, so a deck can never end up with four looks because four slides were added on
// different days. A box's job is read off what it shows rather than declared: big type is display
// type, low-contrast type is muted, a saturated colour is the accent, a fill close to the ground is
// a panel, and a dark neutral fill is ink (a rule, a marker). Pictures are left as they are.

function rgb(hex: string): [number, number, number] | null {
  const h = String(hex ?? '').replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  const n = parseInt(full, 16);
  return full.length === 6 && !Number.isNaN(n) ? [(n >> 16) & 255, (n >> 8) & 255, n & 255] : null;
}
const lum = (c: [number, number, number]) => (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255;
function sat(c: [number, number, number]) {
  const mx = Math.max(...c) / 255, mn = Math.min(...c) / 255, l = (mx + mn) / 2;
  return mx === mn ? 0 : (mx - mn) / (1 - Math.abs(2 * l - 1));
}

type Role = 'ink' | 'muted' | 'accent' | 'accent2' | 'panel';
/** What a colour is doing against the ground it was drawn on. A colour the slide's previous theme
 *  gave a role keeps that role — Cinematic's quiet grey is quiet text, whatever its contrast. */
function role(colour: string, ground: string, text: boolean, from?: LayoutStyle): Role | null {
  const c = rgb(colour), g = rgb(ground);
  if (!c || !g) return null;
  if (from) {
    const k = colour.toLowerCase();
    const known: [Role, string | undefined][] = text
      ? [['ink', from.ink], ['muted', from.muted], ['accent', from.accent], ['accent2', from.accent2]]
      : [['accent', from.accent], ['accent2', from.accent2], ['panel', from.panel], ['ink', from.ink], ['muted', from.muted]];
    for (const [r, v] of known) if (v && v.toLowerCase() === k) return r;
  }
  if (sat(c) > 0.45 && lum(c) > 0.12 && lum(c) < 0.92) return 'accent';
  const gap = Math.abs(lum(c) - lum(g));
  if (text) return gap < 0.45 ? 'muted' : 'ink';
  return gap < 0.14 ? 'panel' : 'ink';
}

function restyle(l: Layer, st: LayoutStyle, ground: string, scale: number, from?: LayoutStyle) {
  const p = l.params;
  const pick = (r: Role | null, fallback: string) => (r === 'accent2' ? st.accent2 ?? st.accent : r ? st[r] : fallback);
  // The ground follows the theme outright: flat, or lit from a corner where the theme has a glow.
  if ((l.kind === 'solid' || l.kind === 'radial') && /ground/i.test(l.name)) { const g = groundParams(st); l.kind = g.kind; l.params = g.params; return; }
  if (l.kind === 'linear' && /ground/i.test(l.name)) { p.colorA = st.ground; p.colorB = st.ground; return; }
  // Backdrop motion is washes of the theme's own colours: both accents, and its ink.
  if (l.kind === 'backdrop') { p.accent = st.accent; p.accent2 = st.accent2 ?? st.accent; p.ink = st.ink; return; }
  if (l.kind === 'text') {
    const display = l.name === 'Heading' || l.name === 'Hero' || Number(p.size) >= 60 * scale;
    p.font = l.name === 'Hero' ? st.hero ?? st.display : display ? st.display : st.body;
    if (display) p.weight = st.displayWeight;
    p.color = pick(role(String(p.color), ground, true, from), st.ink);
    return;
  }
  if (l.kind === 'shape') {
    p.fill = pick(role(String(p.fill), ground, false, from), st.accent);
    if (p.gradient) p.fill2 = p.fill;
    if (Number(p.strokeWidth) > 0) p.stroke = pick(role(String(p.stroke), ground, false, from), st.ink);
    return;
  }
  // The lab's own composed kinds (note, quote, quiz, activity, chart) name their colours.
  if ('textColor' in p) p.textColor = st.ink;
  if ('accent' in p) p.accent = st.accent;
  if ('fill' in p) p.fill = st.panel;
  if (l.kind === 'chart') { p.color = st.accent; p.color2 = st.muted; }
  if ('font' in p) p.font = st.body;
}

/** One slide in a theme — the theme as this slide wears it, on its own ground. A flat or lit layer at
 *  the very bottom is its ground, whatever it is called. `from` is how it was styled before. */
export function themeSlide(s: Slide, st: LayoutStyle, width: number, from?: LayoutStyle) {
  const ground = s.background;
  const bottom = s.layers[0];
  if (bottom && (bottom.kind === 'solid' || bottom.kind === 'radial') && !/ground/i.test(bottom.name)) bottom.name = 'Ground';
  for (const l of s.layers) restyle(l, st, ground, width / 1920, from);
  s.background = st.ground;
}

export function applyTheme(d: Deck, st: LayoutStyle) {
  const before = themeOf(d);
  for (const s of d.slides) {
    // A ground the new theme does not have falls back to its main one.
    const from = before && slideStyle(before, s);
    if (s.ground && !st.grounds?.some((g) => g.id === s.ground)) delete s.ground;
    themeSlide(s, slideStyle(st, s), d.width, from);
  }
  d.theme = st.id;
}

/** Put one slide on another of the theme's grounds (or back on its main one, with no id). */
export function setSlideGround(d: Deck, slideId: string, groundId: string | null) {
  const st = themeOf(d);
  const s = d.slides.find((x) => x.id === slideId);
  if (!st || !s) return;
  const from = slideStyle(st, s);
  if (groundId) s.ground = groundId; else delete s.ground;
  themeSlide(s, slideStyle(st, s), d.width, from);
}

/**
 * Spread the theme's grounds across the deck, so it is never one colour: a loud cover, working
 * slides for the teaching, statements (a slide that is one big line) taking the guide's rhythm in
 * turn — quiet, working, loud — and a quiet close; never two loud slides in a row.
 */
export function varyGrounds(d: Deck) {
  const st = themeOf(d);
  if (!st?.grounds?.length) return;
  const has = (id: string) => st.grounds!.some((g) => g.id === id);
  const shown = d.slides.filter((s) => !s.hidden);
  let prev: string | null = null;
  // Statements take the guide's rhythm in turn — quiet, working, loud — so a run of them varies.
  const cycle = ['quiet', null, 'loud'] as const;
  let k = 0;
  shown.forEach((s, i) => {
    const words = s.layers.filter((l) => l.kind === 'text' && l.visible);
    const media = s.layers.some((l) => l.visible && (l.kind === 'image' || l.kind === 'chart' || l.kind === 'video'));
    const statement = !media && words.length > 0 && words.length <= 3 && Math.max(...words.map((l) => Number(l.params.size ?? 0))) >= 120 * (d.width / 1920);
    let want: string | null = null;
    if (i === 0) want = 'loud';
    else if (i === shown.length - 1 && shown.length > 2) want = 'quiet';
    else if (statement) want = cycle[k++ % cycle.length];
    if (want === 'loud' && prev === 'loud') want = 'quiet';
    if (want && !has(want)) want = null;
    setSlideGround(d, s.id, want);
    prev = want;
  });
}
