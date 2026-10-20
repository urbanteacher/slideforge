// The slide system: title, section, points, cards, keywords, key fact, table, journey, bullets, chart, stats,
// compare and split, for any number of items.
import { createLayer, type Layer, type Slide } from '../core';
import { contentHeight } from '../engine';
import { CARD_PAD, CARD_TOP } from './cards';
import { CONTENT_FOOT, CONTENT_TOP, after, bar, body, bullets, colours, colsFor, heading, inset, item, itemStyle, panel, picture, rise, rowsFor, rule, slide, text, titleBar, titleRow, type Pair } from './blocks';
import { GRID, cell, type LayoutStyle } from './style';

// ─── The layouts ────────────────────────────────────────────────────────────
// ─── The slide system ───────────────────────────────────────────────────────
// Every layout below is built on the same rules, so slides made from them never disagree:
//   type     titles 88px (44pt), body 48px (24pt), labels 44px, nothing drawn under 36px (18pt);
//            text fills its region, and a set (points, cards, rows) shares one size
//   title    display type across the top with a short accent bar under it
//   content  from CONTENT_TOP to CONTENT_FOOT — 50px above the footer, the same breath the title
//            keeps below the header — shared evenly by rows, or centred when it is shorter
//   sets     cards share a bottom edge and grow with their words; rules sit under each row
// A slide designed on its own (a statement, a cover) may break these on purpose; nothing else should.

export function titleSlide(st: LayoutStyle, title: string, subtitle: string): Slide {
  return slide(st, 'Title', [
    bar(st, { ...cell(1, 3, 2, 1), h: 8 }),
    text('Hero', title, cell(1, 5, 10, 6), { font: st.hero ?? st.display, weight: st.hero ? '500' : st.displayWeight, size: 150, color: st.ink, lineHeight: 1.02, tracking: -0.01, fit: 'fill' }, rise),
    body(st, subtitle, cell(1, 12, 9, 2), 48),
  ]);
}

export function sectionSlide(st: LayoutStyle, title: string, subtitle: string): Slide {
  return slide(st, 'Section', [
    heading(st, title, cell(1, 4, 12, 5), 140, { align: 'center' }),
    body(st, subtitle, cell(3, 10, 8, 2), 48, { align: 'center' }),
    bar(st, { ...cell(6, 13, 2, 1), h: 8 }),
  ]);
}

/** A title and two-part rows: the point in bold, the detail beside it. Up to six fit. */
export function pointsSlide(st: LayoutStyle, title: string, items: Pair[]): Slide {
  const shown = items.slice(0, 6);
  const { top, h } = rowsFor(shown.length);
  return slide(st, 'Points', [
    titleRow(st, title),
    titleBar(st),
    ...shown.flatMap(([term, detail], i) => {
      const y = top + i * h;
      return [
        text('Point', term, { ...cell(1, 5, 4, 1), y, h: h - 28 }, { font: st.body, weight: '600', size: 44, color: st.accent, fit: 'fill', lineHeight: 1.15, fitGroup: 'points' }, after(0.1 + i * 0.08)),
        body(st, detail, { ...cell(5, 5, 8, 1), y, h: h - 28 }, 48, { color: st.ink, fit: 'fill', fitGroup: 'details' }, 0.15 + i * 0.08),
        rule(st, { ...cell(1, 5, 12, 1), y: y + h - 14 }, st.muted, 2),
      ];
    }),
  ]);
}

/**
 * A title and two to four cards across, each a heading and a sentence. The cards are as tall as the
 * fullest one needs and no taller, so they share a bottom edge without a well of empty panel under
 * short copy. Type starts at 24pt and steps down, never under 18pt, only when the fullest card
 * would not fit on the slide.
 */
export function cardsSlide(st: LayoutStyle, title: string, items: Pair[]): Slide {
  const n = Math.max(1, Math.min(4, items.length)), span = colsFor(n);
  const shown = items.slice(0, 4);
  const room = { ...cell(1, 5, span, 11), h: CONTENT_FOOT - CONTENT_TOP };
  const textW = room.w - 72, top = CARD_TOP, pad = CARD_PAD;
  const tallest = (px: number) => Math.max(...shown.map(([, words]) => contentHeight({ kind: 'text', params: { text: words, font: st.body, size: px, weight: '400', lineHeight: 1.3 } }, textW) ?? 0));
  let px = 48;
  while (px > 36 && top + tallest(px) + pad > room.h) px -= 2;
  const cardH = Math.min(room.h, Math.ceil(top + tallest(px) + pad));
  // One id for the set, so editing any card's words resizes all of them together (model/cards.ts).
  const set = 'cards-' + Math.random().toString(36).slice(2, 9);
  return slide(st, 'Cards', [
    titleRow(st, title),
    titleBar(st),
    ...shown.flatMap(([head, words], i) => {
      // Centred between the title and the footer, so short cards are not hung from the top.
      const b = { ...cell(1 + i * span, 5, span, 11), y: CONTENT_TOP + Math.round((room.h - cardH) / 2), h: cardH };
      const card = panel(st, b);
      Object.assign(card.params, { cardSet: set, cardPart: 'panel', cardArea: [CONTENT_TOP, CONTENT_FOOT] });
      const bar = rule(st, { ...b, h: 8 });
      Object.assign(bar.params, { cardSet: set, cardPart: 'rule' });
      return [
        card,
        bar,
        heading(st, head, inset(b, 36, 50, 80), 56, { fit: 'fill', fitGroup: 'card-heads', cardSet: set, cardPart: 'head' }),
        body(st, words, { x: b.x + 36, y: b.y + top, w: textW, h: cardH - top - pad, rot: 0 }, px, { fit: 'shrink', color: st.ink, fitGroup: 'card-words', cardSet: set, cardPart: 'words' }, 0.25 + i * 0.08),
      ];
    }),
  ]);
}

/** Terms and what they mean, one row each. Up to six fit. */
export function keywordsSlide(st: LayoutStyle, title: string, pairs: Pair[]): Slide {
  const shown = pairs.slice(0, 6);
  const { top, h } = rowsFor(shown.length);
  return slide(st, 'Keywords', [
    titleRow(st, title),
    titleBar(st),
    ...shown.flatMap(([term, def], i) => {
      const y = top + i * h;
      return [
        text('Keyword', term, { ...cell(1, 5, 4, 1), y, h: h - 28 }, { font: st.body, weight: '700', size: 44, color: st.accent, fit: 'fill', fitGroup: 'terms' }, after(0.15)),
        body(st, def, { ...cell(5, 5, 8, 1), y, h: h - 28 }, 44, { color: st.ink, fit: 'fill', fitGroup: 'meanings' }),
        rule(st, { ...cell(1, 5, 12, 1), y: y + h - 14 }, st.muted, 2),
      ];
    }),
  ]);
}

/** One figure set large, what it counts, and the lines that make it matter. */
export function keyfactSlide(st: LayoutStyle, title: string, fact: string, caption: string, lines: string[]): Slide {
  return slide(st, 'Key fact', [
    heading(st, title, cell(1, 1, 12, 2), 56),
    text('Key fact', fact, cell(1, 4, 12, 4), { font: st.display, weight: '700', size: 190, color: st.accent, lineHeight: 1, tracking: -0.03, fit: 'fill' }, { type: 'zoomIn', duration: 0.9, easing: 'cubicOut', delay: 0.2 }),
    body(st, caption, { ...cell(1, 9, 12, 2), h: 90 }, 48, { color: st.ink }),
    bullets(st, lines, cell(1, 11, 12, 5), 40),
  ]);
}

/** A title and a table, for when the exact value matters. */
export function tableSlide(st: LayoutStyle, title: string, data: string): Slide {
  return slide(st, 'Table', [
    titleRow(st, title),
    titleBar(st),
    createLayer('table', { name: 'Table', box: cell(1, 5, 12, 11), params: { data, header: true, labels: true, font: st.body, size: 36, textColor: st.ink, accent: st.accent, fit: 'fill' }, anim: after(0.2) }),
  ]);
}

/** A process in order: numbered stops along a line, each a step and a sentence. Up to six. */
export function journeySlide(st: LayoutStyle, title: string, subtitle: string, steps: Pair[]): Slide {
  const n = Math.max(2, Math.min(6, steps.length)), span = 12 / n;
  const g = GRID, col = (i: number) => g.left + i * span * g.stepX;
  const w = span * g.stepX - g.gutter, dot = 88, y = g.top + 5 * g.stepY;
  const cx = (i: number) => col(i) + dot / 2;
  const layers: Layer[] = [titleRow(st, title), titleBar(st)];
  if (subtitle) layers.push(body(st, subtitle, { ...cell(1, 3, 12, 1), y: GRID.top + 2 * GRID.stepY + 34 }, 40));
  layers.push(createLayer('shape', { name: 'Track', box: { x: cx(0), y: y + dot / 2 - 2, w: cx(n - 1) - cx(0), h: 4, rot: 0 }, params: { shape: 'rect', radius: 0, fill: st.muted, strokeWidth: 0 }, anim: { type: 'wipeRight', duration: 0.9 } }));
  steps.slice(0, 6).forEach(([head, words], i) => {
    const a = after(0.2 + i * 0.12);
    layers.push(
      createLayer('shape', { name: 'Stop', box: { x: col(i), y, w: dot, h: dot, rot: 0 }, params: { shape: 'ellipse', fill: st.accent, strokeWidth: 0 }, anim: a }),
      text('Number', String(i + 1), { x: col(i), y: y + dot * 0.18, w: dot, h: dot * 0.64, rot: 0 }, { font: st.display, weight: '700', size: 44, color: st.ground, align: 'center', lineHeight: 1 }, a),
      text('Step', head, { x: col(i), y: y + dot + 34, w, h: 60, rot: 0 }, { font: st.body, weight: '700', size: 40, color: st.ink, fit: 'fill', fitGroup: 'steps' }, a),
      body(st, words, { x: col(i), y: y + dot + 110, w, h: 330, rot: 0 }, 36, { fit: 'shrink', color: st.muted, fitGroup: 'step-words' }, 0.3 + i * 0.12),
    );
  });
  return slide(st, 'Journey', layers);
}

/** A title and a bulleted list, filling the content area. */
export function bulletsSlide(st: LayoutStyle, title: string, lines: string[]): Slide {
  return slide(st, 'Bullets', [
    titleRow(st, title),
    titleBar(st),
    bullets(st, lines, { ...cell(1, 5, 12, 1), h: CONTENT_FOOT - CONTENT_TOP }, 52),
  ]);
}

/** A title, a chart in the content area, and a source line along its foot. */
export function chartSlide(st: LayoutStyle, title: string, source: string): Slide {
  return slide(st, 'Chart', [
    titleRow(st, title),
    titleBar(st),
    // The chart draws itself, SlideForge's chart motion: bars rise, lines draw along, a beat at a time.
    createLayer('chart', { name: 'Chart', box: { ...cell(1, 5, 12, 1), h: CONTENT_FOOT - CONTENT_TOP - 60 }, params: { color: st.accent, color2: st.muted, textColor: st.ink, font: st.body, size: 36 }, anim: { type: 'draw', duration: 0.9, stagger: 0.22, delay: 0.3, easing: 'cubicOut' } }),
    text('Source', source, { ...cell(1, 5, 12, 1), y: CONTENT_FOOT - 44, h: 44 }, { font: st.body, size: 36, color: st.muted, fit: 'shrink' }, after(0.4)),
  ]);
}

/** A title and a diagram — a loop, a flowchart or a timeline — built a step at a time. A loop is as wide
 *  as it is tall, so it takes the full height on the right with its title beside it; a flowchart and a
 *  timeline read across, so they fill the content area under the title. `data` is the diagram's list
 *  (kinds/diagram/def.ts). */
export function diagramSlide(st: LayoutStyle, title: string, diagram: 'loop' | 'flowchart' | 'timeline', data: string, extra: Record<string, unknown> = {}): Slide {
  const kit = itemStyle(st).diagram;
  const layer = (box: Layer['box']) => createLayer('diagram', { name: 'Diagram', box, params: { ...kit.params, diagram, data, ...extra } as never, anim: { ...kit.anim, delay: 0.3 } });
  if (diagram === 'loop') return slide(st, 'Diagram', [
    heading(st, title, { ...cell(1, 4, 4, 1), h: 8 * GRID.stepY }, 88, { fitGroup: 'title' }),
    bar(st, { x: GRID.left, y: GRID.top + 3 * GRID.stepY - 30, w: 132, h: 8, rot: 0 }),
    layer({ ...cell(5, 1, 8, 1), h: CONTENT_FOOT - GRID.top }),
  ]);
  return slide(st, 'Diagram', [
    titleRow(st, title),
    titleBar(st),
    layer({ ...cell(1, 5, 12, 1), h: CONTENT_FOOT - CONTENT_TOP }),
  ]);
}

/** Two to four numbers set large, each with what it counts, and a takeaway beneath. */
export function statsSlide(st: LayoutStyle, title: string, stats: Pair[], takeaway: string): Slide {
  const n = Math.max(2, Math.min(4, stats.length)), span = 12 / n;
  const top = CONTENT_TOP, noteH = takeaway ? 150 : 0, area = CONTENT_FOOT - CONTENT_TOP - noteH - (takeaway ? 40 : 0);
  return slide(st, 'Stats', [
    titleRow(st, title),
    titleBar(st),
    ...stats.slice(0, 4).flatMap(([num, label], i) => {
      const b = { ...cell(1 + i * span, 5, span, 1), y: top, h: area };
      return [
        rule(st, b),
        text('Number', num, inset(b, 0, 36, 190), { font: st.display, weight: '700', size: 170, color: st.accent, lineHeight: 1, tracking: -0.02, fit: 'fill', fitGroup: 'stat-numbers' }, { type: 'zoomIn', duration: 0.8, easing: 'cubicOut' }),
        body(st, label, inset(b, 0, 250, area - 260), 44, { color: st.ink, fitGroup: 'stat-labels' }),
      ];
    }),
    ...(takeaway ? [item('note', 'Takeaway', { ...cell(1, 5, 12, 1), y: CONTENT_FOOT - noteH, h: noteH }, { ...colours(st), font: st.body, label: 'Takeaway', text: takeaway, fill: st.panel, size: 40 }, 0.5)] : []),
  ]);
}

/** Two columns compared row by row, under a header naming each. */
export function compareSlide(st: LayoutStyle, title: string, heads: [string, string], rows: [string, string, string][]): Slide {
  const headH = 64;
  const { h } = rowsFor(rows.length);
  const top = CONTENT_TOP + headH + 16, each = Math.min(h, (CONTENT_FOOT - top) / Math.max(1, rows.length));
  return slide(st, 'Compare', [
    titleRow(st, title),
    titleBar(st),
    text('Column', heads[0], { ...cell(4, 5, 4, 1), y: CONTENT_TOP, h: headH }, { font: st.body, weight: '700', size: 36, color: st.accent, tracking: 0.08, uppercase: true, fit: 'shrink' }, after(0.1)),
    text('Column', heads[1], { ...cell(8, 5, 5, 1), y: CONTENT_TOP, h: headH }, { font: st.body, weight: '700', size: 36, color: st.accent, tracking: 0.08, uppercase: true, fit: 'shrink' }, after(0.1)),
    rule(st, { ...cell(1, 5, 12, 1), y: CONTENT_TOP + headH }, st.accent, 3),
    ...rows.flatMap(([row, a, b], i) => {
      const y = top + i * each;
      return [
        text('Row', row, { ...cell(1, 5, 3, 1), y, h: each - 28 }, { font: st.body, weight: '600', size: 44, color: st.accent, fit: 'fill', fitGroup: 'compare-rows' }, after(0.15)),
        body(st, a, { ...cell(4, 5, 4, 1), y, h: each - 28 }, 44, { color: st.ink, fitGroup: 'compare-cells' }),
        body(st, b, { ...cell(8, 5, 5, 1), y, h: each - 28 }, 44, { color: st.ink, fitGroup: 'compare-cells' }),
        rule(st, { ...cell(1, 5, 12, 1), y: y + each - 14 }, st.muted, 2),
      ];
    }),
  ]);
}

/** Text on one half, a picture on the other: the heading and points in the half's own content area. */
export function splitSlide(st: LayoutStyle, title: string, lines: string[], pictureSide: 'left' | 'right'): Slide {
  const col = pictureSide === 'right' ? 1 : 8;
  return slide(st, pictureSide === 'right' ? 'Image + text' : 'Text + image', [
    picture({ x: pictureSide === 'right' ? 960 : 0, y: 0, w: 960, h: 1080, rot: 0 }),
    heading(st, title, { ...cell(col, 1, 5, 3) }, 88),
    bar(st, { x: cell(col, 1, 5, 1).x, y: GRID.top + 3 * GRID.stepY + 6, w: 132, h: 8, rot: 0 }),
    bullets(st, lines, { ...cell(col, 5, 5, 1), h: CONTENT_FOOT - CONTENT_TOP }, 48),
  ]);
}
