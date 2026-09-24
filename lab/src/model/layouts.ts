import { aspectOf, setAspect } from './aspect';
import { createLayer, createSlide } from './defaults';
import type { Anim, Box, Deck, Layer, Params, Slide, StyleGuide } from './types';

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
  return { id: 'guide', name: g.name, ground: t.ground, ink: t.ink, muted: t.muted, accent: t.accent, accent2: t.accent2, panel: t.panel, display: t.display, displayWeight: t.displayWeight, body: t.body };
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

// ─── Building blocks ────────────────────────────────────────────────────────
const rise: Partial<Anim> = { type: 'rise', duration: 0.8 };
const after = (delay: number): Partial<Anim> => ({ type: 'fade', duration: 0.7, delay });

/** The slide's ground: flat, or lit from the top right when the theme has a glow. */
export function groundParams(st: Pick<LayoutStyle, 'ground' | 'glow'>): { kind: string; params: Params } {
  return st.glow
    ? { kind: 'radial', params: { colorA: st.glow, colorB: st.ground, cx: 0.8, cy: -0.1, rx: 0.94, ry: 0.83, reach: 0.55 } }
    : { kind: 'solid', params: { color: st.ground } };
}
function ground(st: LayoutStyle): Layer {
  const g = groundParams(st);
  return createLayer(g.kind, { name: 'Ground', params: g.params });
}

/** SlideForge's statement motion: word by word, each rising out of a blur, Medium and Wave, on Easy Ease. */
const wordsIn: Partial<Anim> = { type: 'words', feel: 'rise', easing: 'easyEase', duration: 0.7, stagger: 0.13 };
/** A statement: display type as big as the line allows, its breaks balanced. */
const statement = (st: LayoutStyle, value: string, box: Box, size: number, align: 'left' | 'center') =>
  text('Statement', value, box, { font: st.display, weight: st.displayWeight === '400' ? '400' : '800', size, color: st.ink, align, lineHeight: 1.04, tracking: -0.035, balance: true, fit: 'grow' }, wordsIn);
const credit = (st: LayoutStyle, value: string, box: Box, align: 'left' | 'center') =>
  text('Credit', value, box, { font: st.body, weight: '500', size: 40, color: st.muted, align, lineHeight: 1.35 }, {});

/** Text that holds its region: set at `size`, brought down only if the copy needs it. */
function text(name: string, value: string, box: Box, params: Params, anim: Partial<Anim> = {}): Layer {
  return createLayer('text', { name, box, params: { text: value, fit: 'shrink', lineHeight: 1.15, tracking: 0, ...params }, anim });
}
const heading = (st: LayoutStyle, value: string, box: Box, size = 76, extra: Params = {}) =>
  text('Heading', value, box, { font: st.display, weight: st.displayWeight, size, color: st.ink, lineHeight: 1.05, tracking: -0.01, ...extra }, rise);
const body = (st: LayoutStyle, value: string, box: Box, size = 40, extra: Params = {}, delay = 0.15) =>
  text('Text', value, box, { font: st.body, weight: '400', size, color: st.muted, lineHeight: 1.35, ...extra }, after(delay));
const bullets = (st: LayoutStyle, lines: string[], box: Box, size = 42) =>
  text('Bullet points', lines.join('\n'), box, { font: st.body, weight: '400', size, color: st.ink, list: 'bullets', lineHeight: 1.55 }, after(0.2));
const bar = (st: LayoutStyle, box: Box) =>
  createLayer('shape', { name: 'Accent bar', box, params: { shape: 'rect', radius: 0, fill: st.accent, strokeWidth: 0 }, anim: { type: 'wipeRight', duration: 0.7 } });
const item = (kindId: string, name: string, box: Box, params: Params, delay = 0.2) =>
  createLayer(kindId, { name, box, params: { fit: 'shrink', ...params }, anim: after(delay) });
const colours = (st: LayoutStyle) => ({ textColor: st.ink, accent: st.accent });
const panel = (st: LayoutStyle, box: Box, name = 'Card') =>
  createLayer('shape', { name, box, params: { shape: 'rect', radius: 18, fill: st.panel, strokeWidth: 0 }, anim: after(0.15) });
const rule = (st: LayoutStyle, box: Box, colour = st.accent, h = 6) =>
  createLayer('shape', { name: 'Rule', box: { ...box, h }, params: { shape: 'rect', radius: 0, fill: colour, strokeWidth: 0 }, anim: after(0.15) });
const inset = (b: Box, dx: number, dy: number, h?: number): Box => ({ x: b.x + dx, y: b.y + dy, w: b.w - dx * 2, h: h ?? b.h - dy * 2, rot: 0 });
/** Three columns of the grid, the way SlideForge sets parallel ideas: four columns each. */
const thirds = (row: number, rows: number) => [0, 1, 2].map((i) => cell(1 + i * 4, row, 4, rows));
const picture = (box: Box, name = 'Picture — drop one here') =>
  createLayer('image', { name, box, params: { src: '', fit: 'cover' }, anim: { type: 'fade', duration: 0.9 } });

const slide = (st: LayoutStyle, name: string, layers: Layer[]) =>
  createSlide(name, [ground(st), ...layers], st.ground, { type: 'fade', duration: 0.7 });

/** A slide title across the top, where every teaching layout puts it. */
const titleRow = (st: LayoutStyle, value: string) => heading(st, value, cell(1, 1, 12, 2), 64);

// ─── The layouts ────────────────────────────────────────────────────────────
export const LAYOUTS: LayoutDef[] = [
  {
    id: 'title', name: 'Title', group: 'Introduce', blurb: 'Big title at the top. Subtitle underneath.',
    make: (st) => slide(st, 'Title', [
      bar(st, { ...cell(1, 3, 2, 1), h: 8 }),
      heading(st, 'Lesson title', cell(1, 5, 10, 5), 150),
      body(st, 'Your name · the course', cell(1, 11, 8, 2), 44),
      text('Date', '24 SEPTEMBER 2026', cell(1, 14, 5, 1), { font: st.body, weight: '600', size: 22, color: st.muted, tracking: 0.12 }, after(0.3)),
    ]),
  },
  {
    id: 'section', name: 'Section', group: 'Introduce', blurb: 'A clean pause between parts of the lesson.',
    make: (st) => slide(st, 'Section', [
      heading(st, 'Next idea', cell(2, 5, 10, 4), 130, { align: 'center' }),
      body(st, 'A short bridge into what follows.', cell(3, 10, 8, 2), 40, { align: 'center' }),
      bar(st, { ...cell(6, 13, 2, 1), h: 8 }),
    ]),
  },
  {
    id: 'statement', name: 'Statement', group: 'Introduce', blurb: 'One line, bold and as big as it fits. An opening thought, a provocation, a rule to remember.',
    make: (st) => slide(st, 'Statement', [
      statement(st, 'Every chart is a choice.', { x: 352, y: 315, w: 1215, h: 350, rot: 0 }, 168, 'center'),
      credit(st, 'Say it, then pause.', { x: 360, y: 709, w: 1200, h: 54, rot: 0 }, 'center'),
    ]),
  },
  // SlideForge's statement compositions. The type is the same in each; what changes is where it sits
  // and the one piece of drawing that frames it.
  {
    id: 'statement-poster', name: 'Statement · poster', group: 'Introduce', blurb: 'The line low on the left, with a ring of the accent cut by the right edge. An opening.',
    make: (st) => slide(st, 'Statement · poster', [
      createLayer('shape', { name: 'Ring', box: { x: 1470, y: 248, w: 585, h: 585, rot: 0 }, opacity: 0.85, params: { shape: 'ring', ringWidth: 0.35, fill: st.accent, strokeWidth: 0 } }),
      // Set for two lines, low on the slide, with the credit a breath beneath them.
      statement(st, 'Direct attention.', { x: 132, y: 466, w: 1215, h: 350, rot: 0 }, 168, 'left'),
      credit(st, 'Movement with a purpose', { x: 132, y: 861, w: 1320, h: 54, rot: 0 }, 'left'),
    ]),
  },
  {
    id: 'statement-editorial', name: 'Statement · editorial', group: 'Introduce', blurb: 'A rule across the top and the line low on the left, like a magazine opener.',
    make: (st) => slide(st, 'Statement · editorial', [
      rule(st, { ...cell(1, 1, 12, 1), x: 165, w: 1590, y: 150 }, st.accent, 4),
      statement(st, 'Give the idea room', { x: 165, y: 466, w: 1215, h: 350, rot: 0 }, 168, 'left'),
      credit(st, 'A gentle background supports the opening', { x: 165, y: 861, w: 1320, h: 54, rot: 0 }, 'left'),
    ]),
  },
  {
    id: 'statement-frame', name: 'Statement · frame', group: 'Introduce', blurb: 'The line centred inside a fine inset frame. Calm, and easy to copy for a set of slides.',
    make: (st) => slide(st, 'Statement · frame', [
      createLayer('shape', { name: 'Frame', box: { x: 94.5, y: 94.5, w: 1731, h: 891, rot: 0 }, params: { shape: 'rect', radius: 0, fill: st.ink, fillOpacity: 0, stroke: st.ink, strokeOpacity: 0.12, strokeWidth: 3 } }),
      statement(st, 'Give the idea room', { x: 352, y: 315, w: 1215, h: 350, rot: 0 }, 168, 'center'),
      credit(st, 'Gentle / reflective opening', { x: 360, y: 709, w: 1200, h: 54, rot: 0 }, 'center'),
    ]),
  },
  {
    id: 'quote', name: 'Quote', group: 'Introduce', blurb: 'Someone else’s words, set large, with who said it.',
    make: (st) => slide(st, 'Quote', [
      item('quote', 'Quote', cell(2, 3, 10, 11), { ...colours(st), font: st.display, size: 92 }, 0),
    ]),
  },
  {
    id: 'content', name: 'Bullets', group: 'Explain & organise', blurb: 'A title and the points under it. The points shrink to fit, so a long list stays on the slide.',
    make: (st) => slide(st, 'Bullets', [
      titleRow(st, 'Slide title'),
      bullets(st, ['One point per line', 'Keep each to a sentence', 'Reveal them as you talk'], cell(1, 4, 11, 11)),
    ]),
  },
  {
    id: 'cards', name: 'Cards', group: 'Explain & organise', blurb: 'Three ideas side by side, each a card you edit on the slide.',
    make: (st) => slide(st, 'Cards', [
      titleRow(st, 'Three ideas to hold onto.'),
      ...thirds(5, 8).flatMap((b, i) => {
        const [title, words] = [['Say it', 'One idea per card, in a few words.'], ['Show it', 'A picture or an example beside it.'], ['Check it', 'Ask the room before moving on.']][i];
        return [
          panel(st, b),
          rule(st, { ...b, h: 8 }),
          heading(st, title, inset(b, 40, 54, 70), 52),
          body(st, words, inset(b, 40, 140, b.h - 180), 34, {}, 0.25),
        ];
      }),
    ]),
  },
  {
    id: 'keyfact', name: 'Key fact', group: 'Explain & organise', blurb: 'One number or rule set large, with the detail beneath it.',
    make: (st) => slide(st, 'Key fact', [
      heading(st, 'The thing they must leave with', cell(2, 2, 10, 2), 56),
      text('Key fact', '90%', cell(2, 5, 10, 5), { font: st.display, weight: '700', size: 300, color: st.accent, lineHeight: 1, tracking: -0.03 }, { type: 'zoomIn', duration: 0.9, easing: 'backOut', delay: 0.2 }),
      body(st, 'What the fact is, in a few words', cell(2, 10, 10, 2), 44, { color: st.ink }),
      item('note', 'Note', cell(2, 13, 10, 3), { ...colours(st), font: st.body, label: 'Why it matters', text: 'The detail that makes the number mean something.', fill: st.panel, size: 32 }, 0.5),
    ]),
  },
  {
    id: 'keywords', name: 'Keywords', group: 'Explain & organise', blurb: 'Bold keyword and its definition — vocabulary pits.',
    make: (st) => slide(st, 'Keywords', [
      titleRow(st, 'Key vocabulary'),
      ...[['Mean', 'The average: add them up, divide by how many.'], ['Median', 'The middle value once they are in order.'], ['Mode', 'The value that turns up most often.']].flatMap(([term, def], i) => {
        const row = 4 + i * 3;
        return [
          text('Keyword', term, cell(1, row, 3, 2), { font: st.body, weight: '700', size: 42, color: st.ink }, after(0.15)),
          body(st, def, cell(4, row, 9, 2), 38),
          rule(st, cell(1, row + 2, 12, 1), st.muted, 2),
        ];
      }),
    ]),
  },
  {
    id: 'split', name: 'Image + text', group: 'Show & explore', blurb: 'Half text, half picture — say it and show it.',
    make: (st) => slide(st, 'Image + text', [
      picture({ x: 960, y: 0, w: 960, h: 1080, rot: 0 }),
      heading(st, 'Say it. Show it.', cell(1, 2, 5, 4), 84),
      bullets(st, ['The picture takes one half', 'The points take the other', 'Swap sides with the next layout'], cell(1, 7, 5, 8), 38),
    ]),
  },
  {
    id: 'split-left', name: 'Text + image', group: 'Show & explore', blurb: 'The same split with the picture on the left.',
    make: (st) => slide(st, 'Text + image', [
      picture({ x: 0, y: 0, w: 960, h: 1080, rot: 0 }),
      heading(st, 'Say it. Show it.', cell(8, 2, 5, 4), 84),
      bullets(st, ['The picture takes one half', 'The points take the other', 'Swap sides with the previous layout'], cell(8, 7, 5, 8), 38),
    ]),
  },
  {
    id: 'image', name: 'Full picture', group: 'Show & explore', blurb: 'One picture, edge to edge, with a caption over it.',
    make: (st) => slide(st, 'Full picture', [
      picture({ x: 0, y: 0, w: 1920, h: 1080, rot: 0 }),
      // SlideForge's scrim: clear at the top, 82% black at the foot, so the caption reads over any picture.
      createLayer('shape', { name: 'Caption band', box: { x: 0, y: 714, w: 1920, h: 366, rot: 0 }, params: { shape: 'rect', radius: 0, gradient: true, fill: '#000000', fillOpacity: 0, fill2: '#000000', fill2Opacity: 0.82, angle: 90, strokeWidth: 0 } }),
      text('Caption', 'What the picture shows, in one line', { ...cell(1, 13, 10, 1), x: 138 }, { font: st.body, weight: '600', size: 66, color: '#ffffff', lineHeight: 1.14 }, after(0.4)),
      text('Caption credit', 'WHERE IT CAME FROM', { ...cell(1, 14, 10, 1), x: 138, y: 957 }, { font: st.body, weight: '500', size: 28, color: '#ffffff', tracking: 0.06, uppercase: true }, after(0.5)),
    ]),
  },
  {
    id: 'chart', name: 'Chart', group: 'Show & explore', blurb: 'A title, the chart and where the numbers came from.',
    make: (st) => slide(st, 'Chart', [
      titleRow(st, 'What the numbers say'),
      createLayer('chart', { name: 'Chart', box: cell(1, 4, 12, 11), params: { color: st.accent, color2: st.muted, textColor: st.ink, font: st.body }, anim: after(0.2) }),
      text('Source', 'Source: where these figures come from', cell(1, 16, 10, 1), { font: st.body, size: 22, color: st.muted, fit: 'shrink' }, after(0.4)),
    ]),
  },
  {
    id: 'stats', name: 'Stats', group: 'Infographic', blurb: 'The numbers that matter, set large, with a takeaway.',
    make: (st) => slide(st, 'Stats', [
      titleRow(st, 'Stat tiles — the numbers that matter'),
      ...thirds(5, 7).flatMap((b, i) => {
        const [num, label] = [['92%', 'read the chart title first'], ['48%', 'found the legend'], ['3 of 5', 'asked a follow-up']][i];
        return [
          rule(st, b),
          text('Number', num, inset(b, 0, 36, 160), { font: st.display, weight: '700', size: 150, color: st.accent, lineHeight: 1, tracking: -0.02 }, { type: 'zoomIn', duration: 0.8, easing: 'backOut' }),
          body(st, label, inset(b, 0, 216, 120), 36, { color: st.ink }),
        ];
      }),
      item('note', 'Takeaway', cell(1, 13, 12, 3), { ...colours(st), font: st.body, label: 'Takeaway', text: 'Most read the title first — so put the finding in it.', fill: st.panel, size: 32 }, 0.5),
    ]),
  },
  {
    id: 'compare', name: 'Compare', group: 'Infographic', blurb: 'Two columns, row by row.',
    make: (st) => slide(st, 'Compare', [
      titleRow(st, 'Versus — two columns, row by row'),
      text('Column', 'BAR CHART', cell(4, 4, 4, 1), { font: st.body, weight: '700', size: 24, color: st.accent, tracking: 0.08 }, after(0.1)),
      text('Column', 'PIE CHART', cell(8, 4, 5, 1), { font: st.body, weight: '700', size: 24, color: st.accent, tracking: 0.08 }, after(0.1)),
      rule(st, cell(1, 5, 12, 1), st.accent, 3),
      ...[['Best for', 'Comparing amounts', 'Parts of one whole'], ['Reads by', 'Length, on a shared axis', 'Angle and area'], ['Breaks when', 'Too many bars', 'More than five slices']].flatMap(([row, a, b], i) => {
        const r = 6 + i * 3;
        return [
          text('Row', row, cell(1, r, 3, 2), { font: st.body, weight: '700', size: 38, color: st.ink }, after(0.15)),
          body(st, a, cell(4, r, 4, 2), 36),
          body(st, b, cell(8, r, 5, 2), 36),
          rule(st, cell(1, r + 2, 12, 1), st.muted, 2),
        ];
      }),
    ]),
  },
  {
    id: 'blank', name: 'Blank', group: 'Introduce', blurb: 'Nothing on it. Add items and put them where you want them.',
    make: (st) => slide(st, 'Blank', []),
  },
];

export const LAYOUT_GROUPS = ['Introduce', 'Explain & organise', 'Show & explore', 'Infographic'] as const;
