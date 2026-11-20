// The built-in themes' other grounds. A palette from the Style guide has three grounds — working, quiet and loud — and
// a deck in it varies from slide to slide (varyGrounds). The built-in themes had only their one, so every slide of a
// default deck was the same colour. These give each a quiet ground (the theme turned over: its ink as the ground on a
// light theme, its panel on a dark one) and a loud one (its accent), every word on each held to 4.5:1.
import { contrast, readableOn } from '../theme';
import type { LayoutStyle } from './style';

const mix = (a: string, b: string, t: number) => '#' + [1, 3, 5].map((i) => {
  const x = parseInt(a.slice(i, i + 2), 16), y = parseInt(b.slice(i, i + 2), 16);
  return Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
}).join('');

/** `st` with its quiet and loud grounds, unless it has grounds of its own. Its own accent is made readable on its ground. */
export function withGrounds(st: LayoutStyle): LayoutStyle {
  if (st.grounds?.length) return st;
  const light = contrast(st.ground, '#000000') > contrast(st.ground, '#ffffff');
  const quietGround = light ? st.ink : st.panel;
  const quietInk = light ? st.ground : st.ink;
  const loudInk = contrast(st.ink, st.accent) >= contrast(st.ground, st.accent) ? st.ink : st.ground;
  const ground = (id: string, name: string, g: string, ink: string, accent: string) => ({
    id, name, ground: g, ink, muted: readableOn(mix(ink, g, 0.3), g, ink), accent: readableOn(accent, g, ink),
  });
  const grounds = [ground('quiet', 'Quiet', quietGround, quietInk, st.accent)];
  // A loud ground only where the accent carries words (Mono's accent is its ink: its quiet ground is already that).
  if (st.accent.toLowerCase() !== st.ink.toLowerCase() && contrast(loudInk, st.accent) >= 4.5) grounds.push(ground('loud', 'Loud', st.accent, loudInk, loudInk));
  return { ...st, accent: readableOn(st.accent, st.ground, st.ink), grounds };
}
