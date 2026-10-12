// The layout grid and the layout styles: where every region sits, and the looks a layout is built in.
import { aspectOf, setAspect, type Box, type Deck, type Slide, type StyleGuide } from '../core';
import { resolveGround } from '../theme';

// SlideForge's layouts, built out of the lab's own items.
//
// Every box comes from SlideForge's layout grid (src/render/layout-slots.js in the main app): twelve
// columns and sixteen rows inside fixed margins, with each layout naming the region its title, copy,
// picture or chart sits in. The regions here are those regions, scaled from SlideForge's 1280 × 720
// frame to the lab's 1920 × 1080, so a layout built here lands where SlideForge would put it. Copy is
// set to shrink into its region rather than grow past it, which is what keeps a slide on the page
// however much gets written into it.

export const GRID = { left: 78, top: 132, stepX: 151.5, gutter: 54, stepY: 54, cols: 12, rows: 16 };
export type Grid = typeof GRID & { width: number; height: number; right: number; foot: number };

/** The grid for a deck of any shape: margins and gutters scale with the frame's width, rows with
 *  its height, so a 4:3 or 16:10 deck gets the same proportions a 16:9 one does. */
export function gridFor(d: Pick<Deck, 'width' | 'height'> = { width: 1920, height: 1080 }): Grid {
  const kx = d.width / 1920, ky = d.height / 1080;
  const left = GRID.left * kx, gutter = GRID.gutter * kx, top = GRID.top * ky, stepY = GRID.stepY * ky;
  const stepX = (d.width - left * 2 + gutter) / GRID.cols;
  return { left, top, stepX, gutter, stepY, cols: GRID.cols, rows: GRID.rows, width: d.width, height: d.height, right: d.width - left, foot: top + GRID.rows * stepY };
}

/** A region of the grid — column, row, and how many of each it spans — as a box on the slide. */
export function cell(col: number, row: number, cols: number, rows: number, g: Pick<Grid, 'left' | 'top' | 'stepX' | 'gutter' | 'stepY'> = GRID): Box {
  return { x: g.left + (col - 1) * g.stepX, y: g.top + (row - 1) * g.stepY, w: cols * g.stepX - g.gutter, h: rows * g.stepY, rot: 0 };
}

/** A layout for this deck. Layouts are drawn on the 16:9 grid; a deck of another shape gets the
 *  same slide mapped into its frame the way changing the deck's shape maps every other slide. */
export function layoutFor(layout: LayoutDef, st: LayoutStyle, deck: Pick<Deck, 'width' | 'height'>): Slide {
  const slide = layout.make(st);
  if (deck.width === 1920 && deck.height === 1080) return slide;
  const tmp = { id: '', title: '', width: 1920, height: 1080, version: 1, slides: [slide] } as Deck;
  setAspect(tmp, aspectOf(deck));
  return slide;
}

export interface LayoutStyle {
  id: string;
  name: string;
  ground: string;
  ink: string;
  muted: string;
  accent: string;
  panel: string;
  display: string;
  displayWeight: string;
  body: string;
  /** A glow in the ground's top corner, where the theme has one: the ground becomes a Radial gradient. */
  glow?: string;
  /** The theme's second colour, where it has one: the other wash in backdrop motion. */
  accent2?: string;
  /** A face for the biggest moments — a cover's title — where the theme has one. */
  hero?: string;
  /** Other grounds a slide can be set on, each with the text and accent that go on it. */
  grounds?: { id: string; name: string; ground: string; ink: string; muted: string; accent: string }[];
}

export const LAYOUT_STYLES: LayoutStyle[] = [
  { id: 'paper', name: 'Paper', ground: '#f7f4ee', ink: '#1a1a1a', muted: '#5f5a52', accent: '#d94f2b', panel: '#ffffff', display: 'Fraunces', displayWeight: '500', body: 'Inter' },
  { id: 'navy', name: 'Navy', ground: '#0c3354', ink: '#ffffff', muted: '#bccada', accent: '#ef4760', panel: '#154673', display: 'Instrument Serif', displayWeight: '400', body: 'Inter' },
  { id: 'midnight', name: 'Midnight', ground: '#0e0d1c', ink: '#f3f0ff', muted: '#aaa4ca', accent: '#8e7dff', panel: '#1c1a36', display: 'Space Grotesk', displayWeight: '600', body: 'Inter' },
  // SlideForge's Cinematic · Dark pitch: near-black, heavy Avenir Next, a hot pink-red accent.
  { id: 'cinematic', name: 'Cinematic', ground: '#0a0b0f', ink: '#f2f4f8', muted: '#9aa3b5', accent: '#ff3b5c', panel: '#16171d', display: 'Avenir Next', displayWeight: '800', body: 'Avenir Next', glow: '#1a1020', accent2: '#5eead4' },
  { id: 'mono', name: 'Mono', ground: '#ffffff', ink: '#111111', muted: '#5c5c5c', accent: '#111111', panel: '#f1f1f1', display: 'Inter', displayWeight: '700', body: 'Inter' },
];

/** The deck's own style guide as a theme, with the same roles as the built-in ones. */
export function guideStyle(g: StyleGuide): LayoutStyle {
  const t = g.theme;
  return {
    id: 'guide', name: g.name, ground: t.ground, ink: t.ink, muted: t.muted, accent: t.accent, accent2: t.accent2, panel: t.panel, display: t.display, displayWeight: t.displayWeight, body: t.body, hero: t.hero,
    grounds: (g.grounds ?? []).map((gr) => resolveGround(g, gr)),
  };
}

const mixHex = (a: string, b: string, t: number) => '#' + [1, 3, 5].map((i) => {
  const x = parseInt(a.slice(i, i + 2), 16), y = parseInt(b.slice(i, i + 2), 16);
  return Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
}).join('');

/** The theme as one slide wears it: on the ground that slide is set on, its text and accent with it. */
export function slideStyle(st: LayoutStyle, s: Pick<Slide, 'ground'>): LayoutStyle {
  const gr = s.ground ? st.grounds?.find((x) => x.id === s.ground) : undefined;
  if (!gr) return st;
  return { ...st, ground: gr.ground, ink: gr.ink, muted: gr.muted, accent: gr.accent, panel: mixHex(gr.ground, gr.ink, 0.08), glow: undefined };
}

/** The theme a deck is in: a built-in one, or its own style guide. */
export function themeOf(d: Pick<Deck, 'theme' | 'styleGuide'>): LayoutStyle | undefined {
  if (d.theme === 'guide' && d.styleGuide) return guideStyle(d.styleGuide);
  return LAYOUT_STYLES.find((s) => s.id === d.theme);
}

export interface LayoutDef {
  id: string;
  name: string;
  group: 'Introduce' | 'Explain & organise' | 'Show & explore' | 'Infographic';
  blurb: string;
  make: (st: LayoutStyle) => Slide;
}
