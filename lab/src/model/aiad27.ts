import { measureTextHeight } from '../engine/raster';
import { createLayer, createSlide } from './defaults';
import type { Box, Layer, Params, Slide } from './types';

// AI Awareness Day 2027's slides, built in the lab as the design draws them. SlideForge sets each of
// the campaign's slides in a composition (src/render/compositions.js, laid out by css/customize.css
// and coloured by css/aiad27.css): a 56px header and a 32px foot inside 32 / 52 / 24 of padding, and
// between them a body on a lattice of 36px rows, each composition's blocks a whole number of rows
// (the slot table in customize.css). The numbers here are those, in SlideForge's 1280 × 720 slide
// px, at the lab's 1.5×; the header and foot themselves are the theme's artwork (themeArt.ts).
// Every block is an ordinary layer, named for what it is, so each can be edited on the canvas.

const X = 1.5;
const box = (x: number, y: number, w: number, h: number): Box => ({ x: x * X, y: y * X, w: w * X, h: h * X, rot: 0 });
const still = { type: 'none' as const, duration: 0 };

/** The strand colours and their deeps (css/aiad27.css --a27-color, --a27-deep). */
const STRANDS: Record<string, { color: string; deep: string }> = {
  safe: { color: '#00bedd', deep: '#006a7d' }, smart: { color: '#ff7038', deep: '#a7350b' },
  creative: { color: '#ac91ff', deep: '#6441b8' }, responsible: { color: '#63df93', deep: '#176e3b' },
  future: { color: '#fa83eb', deep: '#983488' },
};
/** The colours and faces a composition is drawn in: the campaign's own, or a theme's (as a layout). */
export interface Look {
  ink: string; paper: string; dim: string; rule: string;
  dark: { ground: string; fg: string; dim: string; rule: string };
  /** The strand's colour (a theme's accent) and its deep. */
  color: string; deep: string;
  display: string; body: string;
  /** Whether the cover, the discussion and the commitment go on the strand's colour and the scenario and
   *  the takeaways on ink, as the campaign has them; a theme's layout keeps every slide on its ground. */
  grounds: boolean;
}
const INK = '#231f20';
const CAMPAIGN = (strand: { color: string; deep: string }): Look => ({
  ink: INK, paper: '#f6f4ed', dim: '#54504e', rule: '#c9c6be', dark: { ground: INK, fg: '#f6f4ed', dim: '#d5d0cc', rule: '#686366' },
  color: strand.color, deep: strand.deep, display: 'Uncut Sans', body: 'Uncut Sans', grounds: true,
});
/** A theme's colours and faces, for a composition used as a layout in any deck. */
export function themeLook(st: { ground: string; ink: string; muted: string; accent: string; display: string; body: string }): Look {
  return { ink: st.ink, paper: st.ground, dim: st.muted, rule: st.muted + '66', dark: { ground: st.ground, fg: st.ink, dim: st.muted, rule: st.muted + '66' },
    color: st.accent, deep: st.accent, display: st.display, body: st.body, grounds: false };
}

/** The body's top: the pad's 32 and the header's 56, then the body's own 36 of padding. */
const TOP = 32 + 56 + 36;
const LEFT = 52, WIDTH = 1176, FOOT = 664;

export type Ground = 'working' | 'quiet' | 'loud';
/** The ground each composition is set on: the strand's colour for the cover, the discussion and the
 *  commitment, ink for the scenario (and the takeaways), cream paper for the rest. */
const GROUND: Record<string, Ground> = { title: 'loud', statement: 'loud', keyfact: 'loud', quote: 'quiet', journey: 'quiet' };

interface Source { type: string; title?: string; subtitle?: string; body?: string; bullets?: string[]; design?: Record<string, unknown> }

/** Which compositions this builds: every one the 2027 decks use. */
const BUILT = new Set(['title', 'quote', 'cards', 'statement', 'iceberg', 'compare', 'sourcecheck', 'spectrum', 'journey', 'keyfact']);

/** Whether this is a 2027 campaign slide this module builds. */
export function builds27(theme: string | undefined, s: Source): boolean {
  return !!theme?.startsWith('aiad27') && !!s.design?.composition && BUILT.has(s.type);
}

/** A line's parts, as SlideForge reads them (SF.parseInfoLine, SF.parseKeywordLine): tab-separated,
 *  or " | " in a heading pair. */
const parts = (line = '') => String(line).split(/\t|\s+\|\s+/).map((x) => x.trim());

/** The slide, and the ground it is on, for one of the 2027 compositions. */
export function aiad27Slide(s: Source, theme: string, look?: Look): { slide: Slide; ground: Ground; note?: string } {
  const P = look ?? CAMPAIGN(STRANDS[/^aiad27-([a-z]+)/.exec(theme)?.[1] ?? 'safe'] ?? STRANDS.safe);
  const strand = { color: P.color, deep: P.deep };
  const ground: Ground = P.grounds ? GROUND[s.type] ?? 'working' : 'working';
  const bg = ground === 'loud' ? strand.color : ground === 'quiet' ? P.dark.ground : P.paper;
  const fg = ground === 'quiet' ? P.dark.fg : P.ink;
  const dim = ground === 'quiet' ? P.dark.dim : P.dim;
  const rule = ground === 'quiet' ? P.dark.rule : P.rule;
  const FONT = P.body;
  // --s-accent: the strand's colour on ink, its deep on paper and on the strand's own colour.
  const accent = ground === 'quiet' ? strand.color : strand.deep;
  const layers: Layer[] = [createLayer('solid', { name: 'Ground', params: { color: bg } })];

  /** Words at SlideForge's size, in its box, shrinking to fit what the measure misses. */
  const text = (name: string, value: string, b: Box, size: number, extra: Params = {}) => {
    const face = Number(extra.weight ?? 400) >= 600 ? P.display : FONT;
    const l = createLayer('text', { name, box: b, params: { text: value, font: face, weight: '400', size: size * X, color: fg, lineHeight: 1.2, tracking: 0, align: 'left', fit: 'shrink', ...extra } });
    layers.push(l);
    return l;
  };
  /** How tall words set like this come out at this width, in SlideForge px. */
  const tall = (value: string, w: number, size: number, extra: Params = {}) =>
    measureTextHeight({ text: value, font: Number(extra.weight ?? 400) >= 600 ? P.display : FONT, weight: '400', size: size * X, lineHeight: 1.2, tracking: 0, ...extra }, w * X) / X;
  const bar = (name: string, x: number, y: number, w: number, h: number, color: string) =>
    layers.push(createLayer('shape', { name, box: box(x, y, w, h), anim: still, params: { shape: 'rect', radius: 0, fill: color, strokeWidth: 0 } }));
  /** The label over the words (.cp-eyebrow): small, spaced capitals. White on the strand's colour,
   *  where every accent fails light text and the label is carried by size and spacing. */
  const eyebrow = (value: string, x: number, y: number, w: number, size = 20) =>
    text('Eyebrow', value, box(x, y, w, 36), size, { weight: ground === 'loud' ? '700' : '600', uppercase: true, tracking: 0.14, color: ground === 'loud' ? '#ffffff' : accent });
  /** The heading over a list (.cp-heading): two rows, whatever its wording, so what is under it lands on a line. */
  const heading = (size = 52) => text('Heading', s.title ?? '', box(LEFT, TOP, 1120, 72), size, { weight: '700', lineHeight: 1.03, tracking: -0.035, balance: true });
  /** A line under the list (.cp-source): its source, small. */
  const source = (y: number) => { if (s.body?.trim()) text('Source', s.body, box(LEFT, y, 1130, 36), 18, { lineHeight: 1.25, color: dim }); };
  const lines = (s.bullets ?? []).filter((x) => String(x).trim());

  switch (s.type) {
    case 'title': {
      // poster-art: the copy column beside the poster (the theme's artwork puts the poster in), the
      // label on row 5, the question on rows 6-10, the tagline on row 12. Its size follows its length,
      // from the campaign's own 88px (applyComposition's steps, css/aiad27.css --a27-display-*).
      const q = s.title ?? '';
      const size = q.length > 95 ? 60 : q.length > 65 ? 72 : q.length > 35 ? 86 : 88;
      const w = 650, y0 = 32 + 56 + 144;
      if (s.subtitle) eyebrow(s.subtitle, LEFT, y0, w, 18);
      const hy = y0 + 36;
      const params = { weight: '700', lineHeight: 0.98, tracking: -0.052, balance: true };
      const h = Math.min(Math.max(tall(q, w, size, params), size), 5 * 36);
      text('Hero', q, box(LEFT, hy, w, h), size, params);
      if (s.body) text('Tagline', s.body, box(LEFT, hy + h + 33, w, 36), 28);
      break;
    }
    case 'quote': {
      // voice: the mark hung in the corner of the body, the label and the voice beside it.
      const x = LEFT + 150, w = WIDTH - 150 - 60, y0 = 32 + 56 + 72;
      text('Mark', '“', box(LEFT, 32 + 56 + 24, 140, 230), 230, { weight: '700', lineHeight: 1, color: strand.color });
      if (s.subtitle) eyebrow(s.subtitle, x, y0, w);
      text('Scenario', s.body ?? s.title ?? '', box(x, y0 + 36, 920, 216), 62, { weight: '600', lineHeight: 1.1, tracking: -0.025 });
      break;
    }
    case 'cards': {
      // ballot: the heading's two rows, then four choices two by two, five rows each with a row
      // between, each under a rule with its lettered tile — the letters the room votes by, on the wall
      // and on the phones alike.
      heading(48);
      const colW = (WIDTH - 38) / 2, rowH = 180, gap = 36, top = TOP + 72 + 36;
      // Named as the lab's choice block names its parts (ui/SlideBlocks.tsx), so the canvas's + adds a
      // choice and its grip reorders them, as on any ballot made in the lab.
      lines.slice(0, 4).forEach((line, i) => {
        const [term, def = ''] = parts(line);
        const L = 'ABCD'[i];
        const x = LEFT + (i % 2) * (colW + 38), y = top + Math.floor(i / 2) * (rowH + gap);
        const mark = (l: Layer) => { l.params.blockRole = 'choices'; return l; };
        mark(layers[layers.push(createLayer('shape', { name: `${L} · rule`, box: box(x, y, colW, 2), anim: still, params: { shape: 'rect', radius: 0, fill: fg, strokeWidth: 0 } })) - 1]);
        const tile = 76, ty = y + (rowH - tile) / 2;
        const chamfer = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100" preserveAspectRatio="none"><polygon points="0,0 78,0 100,22 100,100 0,100" fill="${strand.color}"/></svg>`;
        mark(layers[layers.push(createLayer('image', { name: `${L} · tile`, box: box(x, ty, tile, tile), anim: still, params: { src: 'data:image/svg+xml;base64,' + btoa(chamfer), fit: 'fill' } })) - 1]);
        mark(text(`${L} · letter`, L, box(x, ty + 12, tile, 52), 50, { weight: '700', lineHeight: 1, align: 'center', color: INK }));
        const cx = x + tile + 22, cw = colW - tile - 22;
        const h3 = { weight: '700', lineHeight: 1.06, tracking: -0.02 };
        const th = tall(term, cw, 29, h3), dh = def ? tall(def, cw, 24, { lineHeight: 1.15 }) : 0;
        const cy = y + (rowH - (th + (def ? 9 + dh : 0))) / 2;
        mark(text(`${L} · choice`, term, box(cx, cy, cw, th), 29, h3));
        if (def) mark(text(`${L} · detail`, def, box(cx, cy + th + 9, cw, dh), 24, { lineHeight: 1.15 }));
      });
      // The prompt under the choices, clear of the foot (SlideForge's ran into it by a row).
      if (s.body) text('Prompt', s.body, box(LEFT, top + 2 * rowH + gap + 4, WIDTH, 30), 24, { weight: '500' });
      break;
    }
    case 'statement': {
      // prompt: the label on the first row, then the two-way arrow beside the question, a sharp
      // change of pace from the slides round it.
      if (s.subtitle) eyebrow(s.subtitle, LEFT, TOP, WIDTH, 24);
      const y = TOP + 36 + 36;
      text('Pair mark', '↔', box(LEFT, y, 140, 130), 130, { weight: '700', lineHeight: 0.85 });
      text('Question', s.body ?? s.title ?? '', box(LEFT + 164, y, 980, 6 * 36), 68, { weight: '700', lineHeight: 1.06, tracking: -0.04 });
      break;
    }
    case 'iceberg': {
      // reveal-map: the heading, then the risks two by two, each under a rule — its number in the
      // strand's deep, its name, what it does — and the source under them.
      heading();
      if (s.subtitle) text('Beat', s.subtitle, box(360, 32 + 14, 560, 28), 22, { align: 'center' });
      const colW = (WIDTH - 30) / 2, top = TOP + 72;
      let rowTop = top, rowH = 0;
      lines.forEach((line, i) => {
        const [label, value, note = ''] = parts(line);
        const x = LEFT + (i % 2) * (colW + 30);
        if (i % 2 === 0 && i) { rowTop += rowH + 22; rowH = 0; }
        const y = rowTop;
        bar(`Risk ${i + 1} rule`, x, y, colW, 2, fg);
        text(`Risk ${i + 1} number`, value || String(i + 1), box(x, y + 12, colW, 29), 24, { weight: '700', color: accent });
        const nh = tall(label, colW, 29, { weight: '700', lineHeight: 1.08 });
        text(`Risk ${i + 1}`, label, box(x, y + 12 + 29 + 9, colW, nh), 29, { weight: '700', lineHeight: 1.08 });
        const ph = note ? tall(note, colW, 24, { lineHeight: 1.17 }) : 0;
        if (note) text(`Risk ${i + 1} detail`, note, box(x, y + 12 + 29 + 9 + nh + 9, colW, ph), 24, { lineHeight: 1.17 });
        rowH = Math.max(rowH, 12 + 29 + 9 + nh + 9 + ph);
      });
      source(Math.max(top + 288, rowTop + rowH) + 14);
      break;
    }
    case 'compare': {
      // comparison: the heading, then a two-column table — its heads in a card and in ink, each row
      // two rows of the lattice, ruled under, the columns divided by a hairline.
      heading();
      const heads = parts(s.subtitle);
      const labelled = lines.some((l) => parts(l).length > 2);
      const top = TOP + 72;
      const cols = labelled ? [0.65, 1, 1] : [1, 1];
      const unit = WIDTH / cols.reduce((a, b) => a + b, 0);
      const xs = cols.reduce<number[]>((a, c, i) => (a.push(i ? a[i - 1] + cols[i - 1] * unit : LEFT), a), []);
      const first = labelled ? 1 : 0;
      [heads[0] ?? '', heads[1] ?? ''].forEach((h, k) => {
        const i = first + k, w = cols[i] * unit;
        layers.push(createLayer('shape', { name: `Column ${k + 1} head ground`, box: box(xs[i], top, w, 72), anim: still, params: { shape: 'rect', radius: 0, fill: k ? fg : strand.color, strokeWidth: 0 } }));
        text(`Column ${k + 1} head`, h, box(xs[i] + 22, top + 18, w - 44, 36), 27, { weight: '700', color: k ? bg : P.ink });
      });
      lines.forEach((line, r) => {
        const p = parts(line);
        const cells = labelled ? [p[2] ?? '', p[0] ?? '', p[1] ?? ''] : [p[0] ?? '', p[1] ?? ''];
        const y = top + 72 + r * 72;
        cells.forEach((c, i) => text(`Row ${r + 1} · ${i + 1}`, c, box(xs[i] + 22, y + 12, cols[i] * unit - 44, 48), 25, { lineHeight: 1.13, weight: labelled && i === 0 ? '700' : '400' }));
        bar(`Row ${r + 1} rule`, LEFT, y + 71, WIDTH, 1, rule);
        bar(`Row ${r + 1} divider`, xs[first + 1], y, 1, 72, rule);
      });
      source(top + 72 + lines.length * 72 + 14);
      break;
    }
    case 'sourcecheck': {
      // credits: the heading, the strand's rule, then six two-row credits — what, whose, and what it
      // means — each ruled under.
      heading();
      if (s.subtitle) text('Beat', s.subtitle, box(360, 32 + 14, 560, 28), 22, { align: 'center' });
      const top = TOP + 72;
      bar('Credits rule', LEFT, top - 5, WIDTH, 5, strand.color);
      lines.forEach((line, r) => {
        const [label, value = '', note = ''] = parts(line);
        const y = top + r * 72;
        text(`Credit ${r + 1}`, label, box(LEFT, y + 18, 240, 36), 24);
        text(`Credit ${r + 1} whose`, value, box(LEFT + 260, y + 18, 180, 36), 25, { weight: '700', color: accent });
        text(`Credit ${r + 1} note`, note, box(LEFT + 460, y + 12, WIDTH - 460, 48), 24, { lineHeight: 1.13 });
        bar(`Credit ${r + 1} rule`, LEFT, y + 71, WIDTH, 1, rule);
      });
      source(top + Math.max(6, lines.length) * 72 + 14);
      break;
    }
    case 'spectrum': {
      // lanes: two columns under a heavy rule — the strand's colour, then ink — each item in the lane its
      // position puts it in (under 50 left, 50 and over right).
      heading();
      const heads = parts(s.subtitle);
      const colW = (WIDTH - 36) / 2, top = TOP + 72 + 12;
      [0, 1].forEach((side) => {
        const x = LEFT + side * (colW + 36);
        bar(`Lane ${side + 1} rule`, x, top - 12, colW, 12, side ? fg : strand.color);
        text(`Lane ${side + 1}`, heads[side] ?? '', box(x, top + 18, colW, 40), 32, { weight: '700' });
        let y = top + 18 + 40 + 14;
        lines.forEach((line, i) => {
          const [label, value = '', note = ''] = parts(line);
          if ((Number(value) >= 50 ? 1 : 0) !== side) return;
          bar(`Lane ${side + 1} item ${i + 1} rule`, x, y, colW, 1, rule);
          const lh = tall(label, colW, 28, { weight: '700', lineHeight: 1.13 });
          text(`Lane item ${i + 1}`, label, box(x, y + 17, colW, lh), 28, { weight: '700', lineHeight: 1.13 });
          let h = 17 + lh;
          if (note) { const nh = tall(note, colW, 23); text(`Lane item ${i + 1} detail`, note, box(x, y + h + 6, colW, nh), 23); h += 6 + nh; }
          y += h + 17;
        });
      });
      source(TOP + 72 + 396 + 14);
      break;
    }
    case 'journey': {
      // rules: the heading, then three numbered rows of four lattice rows each, ruled over, the number
      // in the strand's colour; the line that sums them up under the last. Built as the lab's numbered
      // block (ui/SlideBlocks.tsx names its parts 01 · rule, 01 · number…), so the canvas's + adds a
      // point and its grip reorders them, renumbering as it goes.
      heading();
      const top = TOP + 72, rowH = 144;
      const mark = (l: Layer) => { l.params.blockRole = 'numbered'; return l; };
      lines.slice(0, 6).forEach((line, i) => {
        const [term, def = ''] = parts(line);
        const n = String(i + 1).padStart(2, '0'), y = top + i * rowH;
        mark(layers[layers.push(createLayer('shape', { name: `${n} · rule`, box: box(LEFT, y, WIDTH, 1), anim: still, params: { shape: 'rect', radius: 0, fill: rule, strokeWidth: 0 } })) - 1]);
        mark(text(`${n} · number`, n, box(LEFT, y + (rowH - 66) / 2, 105, 66), 66, { weight: '700', lineHeight: 1, tracking: -0.05, color: strand.color }));
        const cx = LEFT + 105 + 25, cw = WIDTH - 105 - 25;
        const hh = tall(term, cw, 33, { weight: '700', lineHeight: 1.07 }), dh = def ? tall(def, Math.min(cw, 960), 25, { lineHeight: 1.17 }) : 0;
        const cy = y + (rowH - (hh + (def ? 8 + dh : 0))) / 2;
        mark(text(`${n} · heading`, term, box(cx, cy, cw, hh), 33, { weight: '700', lineHeight: 1.07 }));
        if (def) mark(text(`${n} · detail`, def, box(cx, cy + hh + 8, Math.min(cw, 960), dh), 25, { lineHeight: 1.17 }));
      });
      if (s.subtitle) text('Closing line', s.subtitle, box(LEFT, top + Math.min(lines.length, 3) * rowH, WIDTH, 36), 20, { weight: '600', color: accent });
      break;
    }
    case 'keyfact': {
      // commitment: the rising mark in its nine rows, beside the action — the label, the decision in
      // its four rows, what it means in two, and the line to write the choice on.
      text('Mark', '↗', box(LEFT, TOP, 270, 9 * 36), 230, { weight: '700', lineHeight: 1, tracking: -0.085 });
      const x = LEFT + 270 + 36, w = WIDTH - 270 - 36;
      if (s.subtitle) eyebrow(s.subtitle, x, TOP, w, 24);
      text('Decision', s.title ?? '', box(x, TOP + 36, w, 144), 60, { weight: '700', lineHeight: 1.03, tracking: -0.04 });
      if (s.body) text('Text', s.body, box(x, TOP + 36 + 144, w, 72), 28, { lineHeight: 1.2 });
      const lineY = TOP + 36 + 144 + 72;
      lines.forEach((l, i) => {
        const y = lineY + i * 72;
        text(i ? `Write line ${i + 1}` : 'Write line', l, box(x, y, w, 36), 22);
        bar(i ? `Write line ${i + 1} rule` : 'Write line rule', x, y + 72 - 3, w, 3, fg);
      });
      break;
    }
  }
  // Nothing here reaches the foot: the body is the space between the header and the rule.
  for (const l of layers) if (l.box && l.box.y + l.box.h > FOOT * X) l.box.h = Math.max(24, FOOT * X - l.box.y);
  return { slide: createSlide(s.title || s.type, layers, bg), ground };
}
