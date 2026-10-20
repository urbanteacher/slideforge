// diagram-design's colour roles (MIT, cathrynlavery/diagram-design, references/style-guide.md) from the
// slide's own colours: paper is the ground the diagram sits on, ink its text, muted the arrows, soft
// the sublabels and write-backs, accent the one focal box on an accent tint, and the hub ink filled.
// Each role is held to its WCAG ratio against the surface it is actually on (theme/combos.ts): 4.5:1
// for text, 3:1 for strokes. A colour that falls short moves toward the ink until it clears, so a loud
// ground whose accent is the ground itself still gets a focal box that reads.
import type { Params } from '../../core';
import type { Skin } from '../../diagrams';
import { contrast } from '../../theme';

const hex = (v: unknown, fallback: string) => {
  const s = String(v ?? '').trim();
  if (/^#[0-9a-f]{6}$/i.test(s)) return s.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(s)) return ('#' + s.slice(1).split('').map((c) => c + c).join('')).toLowerCase();
  return fallback;
};
const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export function mix(a: string, b: string, t: number) {
  const x = rgb(a), y = rgb(b);
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
/** Near black or white, whichever reads better on `on`. */
const bw = (on: string) => (contrast('#111111', on) >= contrast('#ffffff', on) ? '#111111' : '#ffffff');
/** `c`, moved toward `to` in small steps until it reaches `min` against `on`; and when even `to` falls
 *  short there, toward black or white. */
function clear(c: string, on: string, min: number, to: string) {
  for (const end of [to, bw(on)]) for (let t = 0; t <= 1.0001; t += 0.05) { const x = mix(c, end, t); if (contrast(x, on) >= min) return x; }
  return bw(on);
}

export function diagramSkin(p: Params): Skin {
  const paper = hex(p.surface, '#ffffff');
  const best = bw(paper);
  const ink = clear(hex(p.textColor, best), paper, 4.5, best);
  const muted = clear(hex(p.muted, mix(ink, paper, 0.3)), paper, 3, ink);
  const soft = clear(mix(ink, paper, 0.35), paper, 4.5, ink);
  // An accent that does not stand off the ground (a loud slide's own colour) gives way to the ink.
  const raw = hex(p.accent, ink);
  const accent = contrast(raw, paper) >= 3 ? raw : ink;
  // When the accent is the ink itself, a tint of it would only wash the words out: the focal box keeps
  // the ground and reads by its heavier outline.
  const accentTint = accent === ink ? paper : mix(paper, accent, 0.12);
  const focalInk = clear(accent, accentTint, 4.5, ink);
  const focalSub = clear(soft, accentTint, 4.5, ink);
  return { paper, ink, muted, soft, accent, accentTint, focalInk, focalSub, hubFill: ink, hubInk: clear(paper, ink, 4.5, bw(ink)) };
}

/** Every pair the skin sets one colour on another, with the ratio WCAG asks of it. */
export function skinPairs(s: Skin): { role: string; fg: string; bg: string; min: number }[] {
  return [
    { role: 'names', fg: s.ink, bg: s.paper, min: 4.5 },
    { role: 'sublabels and arrow labels', fg: s.soft, bg: s.paper, min: 4.5 },
    { role: 'arrows', fg: s.muted, bg: s.paper, min: 3 },
    { role: 'focal outline', fg: s.accent, bg: s.paper, min: 3 },
    { role: 'focal name', fg: s.focalInk, bg: s.accentTint, min: 4.5 },
    { role: 'focal sublabel', fg: s.focalSub, bg: s.accentTint, min: 4.5 },
    { role: 'hub words', fg: s.hubInk, bg: s.hubFill, min: 4.5 },
    { role: 'hub against the ground', fg: s.hubFill, bg: s.paper, min: 3 },
  ];
}
