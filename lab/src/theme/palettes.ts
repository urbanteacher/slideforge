import lovers from '../assets/colourlovers-palettes.json';
import wada from '../assets/wada-combinations.json';
import { contrast, luminance } from './combos';
import ukbtWordmark from '../assets/ukbt/ukbt-wordmark.png?inline';
import ukbtMark from '../assets/ukbt/ukbt-mark.png?inline';
import ukbtInstitute from '../assets/ukbt/ukbt-institute.svg?inline';
import blackInAcademia from '../assets/frontiers/black-in-academia.png?inline';
import nulLogo from '../assets/nul/nu-london-logo.png?inline';
import nulMonogram from '../assets/nul/nu-monogram.svg?raw';
import ycLogo from '../assets/youth-charter/yc-logo.png?inline';

// Palettes a teacher picks from, each already three grounds. A deck in one colour is the easy
// mistake; a palette here always comes as three surfaces that work together, the way the AI
// Awareness Day 2027 guide sets its slides:
//
//   working  the ground most slides sit on: lists, tables, comparisons (light, unless the brand
//            is set on a dark colour, as UK Black Tech is on navy)
//   quiet    the dark ground: one voice, a rule to remember
//   loud     the colour ground: the cover, the question, the commitment
//
// Three campaigns come from this repository. The rest are drawn from two open collections on GitHub,
// and only combinations that pass as three grounds are kept: the dark text on the light ground at
// 4.5:1 or better, and text on the colour ground at 4.5:1 or better, whichever ink reads best.
//   Sanzo Wada, A Dictionary of Colour Combinations (1933) — mattdesl/dictionary-of-colour-combinations (MIT)
//   The top palettes on COLOURlovers — Jam3/nice-color-palettes (MIT)

export interface PalettePreset {
  id: string;
  name: string;
  source: string;
  light: string;
  dark: string;
  /** The colour ground, and the ink that reads on it. */
  loud: string;
  loudInk: string;
  accent2: string;
  /** Campaigns with a colour per strand: each set is a bright (the colour ground) and a deep. */
  sets?: { loud: string; deep: string; ink?: string }[];
  display: string;
  displayWeight: string;
  body: string;
  /** A face for the biggest moments (a cover's title), where the brand has one. */
  hero?: string;
  /** Where the working ground is not light, or the quiet not dark: a brand set on navy, say. */
  working?: { ground: string; ink: string };
  quiet?: { ground: string; ink: string };
  /** The brand's own named colours, all of them, for the palette. */
  named?: { name: string; value: string }[];
  /** The brand's logos and badges, as data URLs. */
  marks?: { name: string; src: string }[];
}

const CAMPAIGNS: PalettePreset[] = [
  {
    // Northeastern University London (the palette in the IPDV lecture deck's theme, and css/northeastern.css):
    // a warm white working ground, navy for the quiet slides, Northeastern red for the loud ones, and the
    // brand's sage, orange, sky and gold as further sets — each with the ink that reads on it.
    id: 'nul', name: 'Northeastern University London', source: 'NU London brand · css/northeastern.css',
    light: '#fbfaf8', dark: '#14181f', loud: '#c8102e', loudInk: '#ffffff', accent2: '#0c3354',
    quiet: { ground: '#0c3354', ink: '#ffffff' },
    sets: [
      { loud: '#c8102e', deep: '#0c3354', ink: '#ffffff' }, { loud: '#609f80', deep: '#0c3354', ink: '#14181f' },
      { loud: '#ff854f', deep: '#0c3354', ink: '#14181f' }, { loud: '#61b6d0', deep: '#0c3354', ink: '#14181f' },
      { loud: '#ffc34b', deep: '#0c3354', ink: '#14181f' },
    ],
    named: [
      { name: 'northeastern red', value: '#c8102e' }, { name: 'navy', value: '#0c3354' }, { name: 'sage', value: '#609f80' },
      { name: 'orange', value: '#ff854f' }, { name: 'sky', value: '#61b6d0' }, { name: 'gold', value: '#ffc34b' },
      { name: 'paper', value: '#fbfaf8' }, { name: 'ink', value: '#14181f' }, { name: 'slate', value: '#5a6572' },
    ],
    marks: [
      { name: 'NU London logo', src: nulLogo },
      { name: 'Northeastern N', src: 'data:image/svg+xml;base64,' + btoa(nulMonogram.replace('currentColor', '#c8102e')) },
    ],
    // Headings in the Northeastern display serif (css/northeastern.css --nu-display), reading in Avenir Next.
    display: 'Iowan Old Style', displayWeight: '700', body: 'Avenir Next',
  },
  {
    // Nodes (the-teaching-model.vercel.app, src/app/globals.css): ink #182033 on white cards over cool grey,
    // ink for the quiet slides, and the U A C X J backbone as the colour sets, each with the ink the app
    // sets on it (Okabe-Ito colours, chosen to read for colour-blind viewers). Archivo throughout.
    id: 'nodes', name: 'Nodes', source: 'Nodes · src/app/globals.css',
    light: '#ffffff', dark: '#182033', loud: '#0072b2', loudInk: '#ffffff', accent2: '#009e73',
    quiet: { ground: '#182033', ink: '#ffffff' },
    sets: [
      { loud: '#0072b2', deep: '#182033', ink: '#ffffff' }, { loud: '#009e73', deep: '#182033', ink: '#ffffff' },
      { loud: '#e69f00', deep: '#182033', ink: '#182033' }, { loud: '#d55e00', deep: '#182033', ink: '#ffffff' },
      { loud: '#cc79a7', deep: '#182033', ink: '#182033' },
    ],
    named: [
      { name: 'ink', value: '#182033' }, { name: 'muted', value: '#566074' }, { name: 'line', value: '#bfc5d1' },
      { name: 'cool grey', value: '#eceef2' }, { name: 'tint', value: '#dde1e8' }, { name: 'white', value: '#ffffff' },
      { name: 'U understand', value: '#0072b2' }, { name: 'A apply', value: '#009e73' }, { name: 'C compare', value: '#e69f00' },
      { name: 'X challenge', value: '#d55e00' }, { name: 'J judge', value: '#cc79a7' },
    ],
    display: 'Archivo', displayWeight: '750', body: 'Archivo',
  },
  {
    // UK Black Tech's published design system (the tokens given 2026-09-15): set on Dark Blue with white
    // type, UKBT Black for the quiet slides, and five brights for the loud ones, each read in
    // Contrast Black. Uncut Sans for reading, Alpha Lyrae Medium for the hero.
    id: 'ukbt', name: 'UK Black Tech', source: 'UK Black Tech design system',
    light: '#ffffff', dark: '#111111', loud: '#00c57f', loudInk: '#111111', accent2: '#cefd85',
    working: { ground: '#254258', ink: '#ffffff' },
    quiet: { ground: '#292c2f', ink: '#ffffff' },
    sets: [
      { loud: '#00c57f', deep: '#cefd85' }, { loud: '#cefd85', deep: '#00c57f' }, { loud: '#b97bf7', deep: '#cefd85' },
      { loud: '#4abffd', deep: '#cefd85' }, { loud: '#ff9667', deep: '#cefd85' },
    ],
    named: [
      { name: 'ukbt black', value: '#292c2f' }, { name: 'ukbt green', value: '#00c57f' }, { name: 'lime green', value: '#cefd85' },
      { name: 'white', value: '#ffffff' }, { name: 'contrast black', value: '#111111' }, { name: 'dark blue', value: '#254258' },
      { name: 'purple', value: '#b97bf7' }, { name: 'bright blue', value: '#4abffd' }, { name: 'orange', value: '#ff9667' },
      { name: 'dark grey', value: '#757575' }, { name: 'cool grey', value: '#e3eae8' },
    ],
    marks: [{ name: 'UK Black Tech wordmark', src: ukbtWordmark }, { name: 'UKBT mark', src: ukbtMark }],
    display: 'Uncut Sans', displayWeight: '700', body: 'Uncut Sans', hero: 'Alpha Lyrae',
  },
  {
    // The UKBT Institute: the same design system, set on UKBT Black rather than navy, with Contrast
    // Black for the quiet slides and UKBT Green leading the colour sets.
    id: 'ukbt-institute', name: 'UKBT Institute', source: 'UK Black Tech design system',
    light: '#ffffff', dark: '#111111', loud: '#00c57f', loudInk: '#111111', accent2: '#cefd85',
    working: { ground: '#292c2f', ink: '#ffffff' },
    quiet: { ground: '#111111', ink: '#ffffff' },
    sets: [
      { loud: '#00c57f', deep: '#cefd85' }, { loud: '#cefd85', deep: '#00c57f' }, { loud: '#b97bf7', deep: '#cefd85' },
      { loud: '#4abffd', deep: '#cefd85' }, { loud: '#ff9667', deep: '#cefd85' },
    ],
    named: [
      { name: 'ukbt black', value: '#292c2f' }, { name: 'ukbt green', value: '#00c57f' }, { name: 'lime green', value: '#cefd85' },
      { name: 'white', value: '#ffffff' }, { name: 'contrast black', value: '#111111' }, { name: 'dark blue', value: '#254258' },
      { name: 'purple', value: '#b97bf7' }, { name: 'bright blue', value: '#4abffd' }, { name: 'orange', value: '#ff9667' },
      { name: 'dark grey', value: '#757575' }, { name: 'cool grey', value: '#e3eae8' },
    ],
    marks: [{ name: 'UKBT Institute logo', src: ukbtInstitute }, { name: 'UKBT mark', src: ukbtMark }],
    display: 'Uncut Sans', displayWeight: '700', body: 'Uncut Sans', hero: 'Alpha Lyrae',
  },
  {
    // The Frontiers Series (UKBT Institute × Black in Academia): UKBT Black, with Bright Blue leading and
    // Green for Our Environment. The worked example is the Air Pollution Project deck
    // (assets/air-pollution/, ?lesson=air-pollution-story); docs/story-designs-plan.md says why.
    id: 'frontiers', name: 'Frontiers Series', source: 'UKBT Institute × Black in Academia',
    light: '#ffffff', dark: '#111111', loud: '#4abffd', loudInk: '#292c2f', accent2: '#cefd85',
    working: { ground: '#292c2f', ink: '#ffffff' },
    quiet: { ground: '#1b1d20', ink: '#ffffff' },
    sets: [
      { loud: '#4abffd', deep: '#cefd85' }, { loud: '#00c57f', deep: '#cefd85' }, { loud: '#cefd85', deep: '#00c57f' },
      { loud: '#ff9667', deep: '#cefd85' }, { loud: '#b97bf7', deep: '#cefd85' },
    ],
    named: [
      { name: 'ukbt black', value: '#292c2f' }, { name: 'frontiers deep', value: '#1b1d20' }, { name: 'bright blue', value: '#4abffd' },
      { name: 'ukbt green', value: '#00c57f' }, { name: 'lime green', value: '#cefd85' }, { name: 'orange', value: '#ff9667' },
      { name: 'purple', value: '#b97bf7' }, { name: 'white', value: '#ffffff' }, { name: 'card grey', value: '#33383d' },
      { name: 'quiet grey', value: '#b9bec4' },
    ],
    marks: [{ name: 'UKBT Institute logo', src: ukbtInstitute }, { name: 'Black in Academia logo', src: blackInAcademia }],
    display: 'Uncut Sans', displayWeight: '700', body: 'Uncut Sans',
  },
  {
    // Youth Charter, Street and Matchday (css/youth-charter.css): a street poster for a room of teenagers.
    // Newsprint for the working slides, the charity's navy for the quiet ones, its red for the loud ones,
    // and the highlighter as the pop (navy on it 8.9:1; it never carries white). Impact for the headlines,
    // as the theme sets them: the one heavy condensed face on every Windows and Mac classroom machine.
    id: 'youth-charter', name: 'Youth Charter', source: 'Youth Charter packs · css/youth-charter.css',
    light: '#f3efe6', dark: '#16203a', loud: '#e21c21', loudInk: '#ffffff', accent2: '#224476',
    quiet: { ground: '#12284a', ink: '#ffffff' },
    sets: [
      { loud: '#e21c21', deep: '#12284a', ink: '#ffffff' }, { loud: '#224476', deep: '#12284a', ink: '#ffffff' },
      { loud: '#ffe14d', deep: '#224476', ink: '#16203a' },
    ],
    named: [
      { name: 'youth charter navy', value: '#224476' }, { name: 'navy deep', value: '#12284a' }, { name: 'youth charter red', value: '#e21c21' },
      { name: 'red deep', value: '#a8120f' }, { name: 'highlighter', value: '#ffe14d' }, { name: 'newsprint', value: '#f3efe6' },
      { name: 'ink', value: '#16203a' }, { name: 'dim', value: '#4f5868' },
    ],
    marks: [{ name: 'Youth Charter logo', src: ycLogo }],
    display: 'Impact', displayWeight: '400', body: 'Inter',
  },
  {
    // Studio 90 (css/variant-themes.css .theme-studio90): a riso print studio on ink black, for the AI and
    // football studio session. Every ground is dark, so the posters and the words are one print run: ink for
    // the working slides, a lifted ink for the quiet ones, acid for the loud ones (ink on it 15:1), with coral
    // and cobalt as further sets. Impact for headlines, as on the posters.
    id: 'studio90', name: 'Studio 90', source: 'tools/football-studio/art.js · css/variant-themes.css',
    light: '#f1ede4', dark: '#0e0f12', loud: '#d7ff3a', loudInk: '#0e0f12', accent2: '#ff4d3d',
    working: { ground: '#0e0f12', ink: '#f1ede4' },
    quiet: { ground: '#191b21', ink: '#f1ede4' },
    sets: [
      { loud: '#d7ff3a', deep: '#0e0f12', ink: '#0e0f12' }, { loud: '#ff4d3d', deep: '#0e0f12', ink: '#0e0f12' },
      { loud: '#3a5bff', deep: '#0e0f12', ink: '#ffffff' },
    ],
    named: [
      { name: 'ink', value: '#0e0f12' }, { name: 'panel', value: '#191b21' }, { name: 'paper', value: '#f1ede4' },
      { name: 'acid', value: '#d7ff3a' }, { name: 'coral', value: '#ff4d3d' }, { name: 'cobalt', value: '#3a5bff' },
      { name: 'mute', value: '#8b8f99' },
    ],
    display: 'Impact', displayWeight: '400', body: 'Inter',
  },
  {
    // css/aiad27.css: cream, ink and five brights with their deeps, set in Uncut Sans.
    id: 'aiad27', name: 'AI Awareness Day 2027', source: 'This repository · css/aiad27.css',
    light: '#f6f4ed', dark: '#231f20', loud: '#00bedd', loudInk: '#231f20', accent2: '#006a7d',
    sets: [
      { loud: '#00bedd', deep: '#006a7d' }, { loud: '#ff7038', deep: '#a7350b' }, { loud: '#ac91ff', deep: '#6441b8' },
      { loud: '#63df93', deep: '#176e3b' }, { loud: '#fa83eb', deep: '#983488' },
    ],
    display: 'Uncut Sans', displayWeight: '700', body: 'Uncut Sans',
  },
  {
    // The 2026 campaign's PowerPoints: paper, ink and one accent per principle.
    id: 'aiad26', name: 'AI Awareness Day 2026', source: 'This repository · AiAd26',
    light: '#f7f9fc', dark: '#1a1a2e', loud: '#00c4ee', loudInk: '#1a1a2e', accent2: '#795bff',
    sets: [
      { loud: '#00c4ee', deep: '#1a1a2e' }, { loud: '#ff6734', deep: '#1a1a2e' }, { loud: '#795bff', deep: '#1a1a2e' },
      { loud: '#00a896', deep: '#1a1a2e' }, { loud: '#ff7eed', deep: '#1a1a2e' },
    ],
    // The campaign's face, heavy for its headlines (css/aiad26.css --s-font).
    display: 'Poppins', displayWeight: '800', body: 'Poppins',
  },
];

const hexRgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const chroma = (h: string) => { const c = hexRgb(h); return Math.max(...c) - Math.min(...c); };

/** Three grounds out of a combination, or null when it cannot make them. */
function asGrounds(colours: string[]): Omit<PalettePreset, 'id' | 'name' | 'source' | 'display' | 'displayWeight' | 'body'> | null {
  const cs = [...new Set(colours.map((c) => c.toLowerCase()))];
  if (cs.length < 3) return null;
  const byLum = [...cs].sort((a, b) => luminance(b) - luminance(a));
  const light = byLum[0], dark = byLum[byLum.length - 1];
  if (luminance(light) < 0.55 || contrast(dark, light) < 4.5) return null;
  const rest = cs.filter((c) => c !== light && c !== dark).sort((a, b) => chroma(b) - chroma(a));
  const loud = rest[0];
  if (!loud || chroma(loud) < 0.3) return null;
  const loudInk = contrast(dark, loud) >= contrast(light, loud) ? dark : light;
  if (contrast(loudInk, loud) < 4.5) return null;
  return { light, dark, loud, loudInk, accent2: rest[1] ?? dark };
}

/** A fingerprint to drop near-duplicates: the three grounds, coarsely. */
const key = (p: { light: string; dark: string; loud: string }) => [p.light, p.dark, p.loud].map((h) => hexRgb(h).map((v) => Math.round(v * 5)).join('')).join('|');

let cache: { group: string; presets: PalettePreset[] }[] | null = null;

/** Every palette on offer, grouped for the gallery. */
export function paletteGroups(): { group: string; presets: PalettePreset[] }[] {
  if (cache) return cache;
  const seen = new Set<string>();
  const pick = (list: PalettePreset[], n: number) => list.filter((p) => { const k = key(p); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, n);

  const W = wada as unknown as { colours: [string, string, number[]][]; combinations: number[][] };
  const classic: PalettePreset[] = [];
  W.combinations.forEach((ids, n) => {
    const g = asGrounds(ids.map((i) => W.colours[i][1]));
    if (!g) return;
    const named = ids.map((i) => W.colours[i]).find(([, hex]) => hex.toLowerCase() === g.loud)?.[0] ?? `No. ${n + 1}`;
    classic.push({ id: `wada-${n + 1}`, name: `${named} · No. ${n + 1}`, source: 'Sanzo Wada, A Dictionary of Colour Combinations', ...g, display: 'Fraunces', displayWeight: '600', body: 'Inter' });
  });
  const popular: PalettePreset[] = [];
  (lovers as { palettes: string[][] }).palettes.forEach((pal, n) => {
    const g = asGrounds(pal);
    if (g) popular.push({ id: `cl-${n + 1}`, name: `Popular palette ${n + 1}`, source: 'COLOURlovers, via Jam3/nice-color-palettes', ...g, display: 'Space Grotesk', displayWeight: '700', body: 'Inter' });
  });
  cache = [
    { group: 'Campaigns', presets: CAMPAIGNS },
    { group: 'Classic combinations · Sanzo Wada, 1933', presets: pick(classic, 18) },
    { group: 'Popular palettes · COLOURlovers', presets: pick(popular, 18) },
  ];
  return cache;
}
