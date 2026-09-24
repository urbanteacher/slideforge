import type { LayoutStyle } from './layouts';
import type { Deck, Layer } from './types';

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

type Role = 'ink' | 'muted' | 'accent' | 'panel';
/** What a colour is doing against the ground it was drawn on. */
function role(colour: string, ground: string, text: boolean): Role | null {
  const c = rgb(colour), g = rgb(ground);
  if (!c || !g) return null;
  if (sat(c) > 0.45 && lum(c) > 0.12 && lum(c) < 0.92) return 'accent';
  const gap = Math.abs(lum(c) - lum(g));
  if (text) return gap < 0.45 ? 'muted' : 'ink';
  return gap < 0.14 ? 'panel' : 'ink';
}

function restyle(l: Layer, st: LayoutStyle, ground: string, scale: number) {
  const p = l.params;
  const pick = (r: Role | null, fallback: string) => (r ? st[r] : fallback);
  if (l.kind === 'solid' && /ground/i.test(l.name)) { p.color = st.ground; return; }
  if (l.kind === 'linear' && /ground/i.test(l.name)) { p.colorA = st.ground; p.colorB = st.ground; return; }
  if (l.kind === 'text') {
    const display = l.name === 'Heading' || Number(p.size) >= 60 * scale;
    p.font = display ? st.display : st.body;
    if (display) p.weight = st.displayWeight;
    p.color = pick(role(String(p.color), ground, true), st.ink);
    return;
  }
  if (l.kind === 'shape') {
    p.fill = pick(role(String(p.fill), ground, false), st.accent);
    if (p.gradient) p.fill2 = p.fill;
    if (Number(p.strokeWidth) > 0) p.stroke = pick(role(String(p.stroke), ground, false), st.ink);
    return;
  }
  // The lab's own composed kinds (note, quote, quiz, activity, chart) name their colours.
  if ('textColor' in p) p.textColor = st.ink;
  if ('accent' in p) p.accent = st.accent;
  if ('fill' in p) p.fill = st.panel;
  if (l.kind === 'chart') { p.color = st.accent; p.color2 = st.muted; }
  if ('font' in p) p.font = st.body;
}

export function applyTheme(d: Deck, st: LayoutStyle) {
  const scale = d.width / 1920;
  for (const s of d.slides) {
    const ground = s.background;
    for (const l of s.layers) restyle(l, st, ground, scale);
    s.background = st.ground;
  }
  d.theme = st.id;
}
