import wada from '../assets/wada-combinations.json';

// Colour combinations for a style guide, from two places on the web.
//
// Contrast: every text-on-ground pair the guide's colours make, graded the way WCAG grades them
// (4.5:1 for body text, 3:1 for large text and graphics, 7:1 for the enhanced level), which is
// what accessible-palette tools such as AccessibleForAll/ColorPaletteCombos check, and what a guide
// like AiAd27's "Contrast, measured" table sets out by hand.
//
// Classic combinations: Sanzo Wada's A Dictionary of Colour Combinations (1933) — 348 combinations of
// two, three or four colours from 159 — as published on GitHub by Matt DesLauriers,
// mattdesl/dictionary-of-colour-combinations (MIT, © 2020 Matt DesLauriers). The guide's own colours
// are matched to the dictionary's nearest ones, and the combinations those belong to are offered:
// tried-and-tested company for the colours the brand already has.

const hexRgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

/** WCAG relative luminance, and the contrast ratio of two colours (1–21). */
export function luminance(hex: string) {
  const [r, g, b] = hexRgb(hex).map(linear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a: string, b: string) {
  const x = luminance(a), y = luminance(b);
  return Math.round(((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)) * 100) / 100;
}
export type Grade = 'AAA' | 'AA' | 'Large';
export const gradeOf = (ratio: number): Grade | null => (ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'Large' : null);

export interface Pair { text: string; ground: string; ratio: number; grade: Grade }
/** The pairs the palette can set text in, best first. Each pair once, whichever way round reads better. */
export function readablePairs(colours: string[], limit = 12): Pair[] {
  const uniq = [...new Set(colours.map((c) => c.toLowerCase()))];
  const out: Pair[] = [];
  for (let i = 0; i < uniq.length; i++) for (let j = i + 1; j < uniq.length; j++) {
    const ratio = contrast(uniq[i], uniq[j]);
    const grade = gradeOf(ratio);
    if (!grade) continue;
    // Text is the darker of the two on a light ground and the lighter on a dark one: the ground is
    // whichever sits further from the middle, which is how a slide is usually set.
    const [text, ground] = Math.abs(luminance(uniq[i]) - 0.4) > Math.abs(luminance(uniq[j]) - 0.4) ? [uniq[j], uniq[i]] : [uniq[i], uniq[j]];
    out.push({ text, ground, ratio, grade });
  }
  return out.sort((a, b) => b.ratio - a.ratio).slice(0, limit);
}

// ─── Wada ───────────────────────────────────────────────────────────────────
function lab(hex: string): [number, number, number] {
  // sRGB → XYZ (D65) → Bradford to D50, the white the dictionary's L*a*b* values use.
  const [r, g, b] = hexRgb(hex).map(linear);
  const X = 0.4124 * r + 0.3576 * g + 0.1805 * b, Y = 0.2126 * r + 0.7152 * g + 0.0722 * b, Z = 0.0193 * r + 0.1192 * g + 0.9505 * b;
  const x = 1.0478 * X + 0.0229 * Y - 0.0501 * Z, y = 0.0295 * X + 0.9905 * Y - 0.0171 * Z, z = -0.0092 * X + 0.0151 * Y + 0.7521 * Z;
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const fx = f(x / 0.9642), fy = f(y / 1), fz = f(z / 0.8251);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
const dE = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

const COLOURS = (wada as unknown as { colours: [string, string, number[]][] }).colours;
const COMBOS = (wada as { combinations: number[][] }).combinations;

export interface Combination { id: number; colours: { name: string; hex: string; near?: string }[]; score: number }
/**
 * The dictionary's combinations that already contain the guide's colours, or something close to
 * them (within ΔE 14): most shared colours first, then the closest matches. `near` marks which of
 * the guide's colours a dictionary colour stands for.
 */
export function wadaCombinations(colours: string[], limit = 8): Combination[] {
  const mine = [...new Set(colours.map((c) => c.toLowerCase()))].map((hex) => ({ hex, lab: lab(hex) }));
  if (!mine.length) return [];
  const near = COLOURS.map(([, , l]) => {
    let best: { hex: string; d: number } | null = null;
    for (const m of mine) { const d = dE(l, m.lab); if (d < 14 && (!best || d < best.d)) best = { hex: m.hex, d }; }
    return best;
  });
  const out: Combination[] = [];
  COMBOS.forEach((ids, n) => {
    const hits = ids.map((i) => near[i]).filter(Boolean) as { hex: string; d: number }[];
    if (!hits.length || new Set(hits.map((h) => h.hex)).size < hits.length) return;
    const score = hits.length * 100 - hits.reduce((a, h) => a + h.d, 0) / hits.length;
    out.push({ id: n + 1, score, colours: ids.map((i) => ({ name: COLOURS[i][0], hex: COLOURS[i][1], near: near[i]?.hex })) });
  });
  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}
