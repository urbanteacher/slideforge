import { createLayer } from '../defaults';
import type { LayoutStyle } from '../layouts';
import type { Layer, Slide } from '../types';
import { BASE, FOOT, LEFT, PAD, TOPBAND, W, box, eyebrow, ground, hero, labelled, part, rect, rgba, slideOf, tiers, tint, txt, type Row } from './kit';

// Four panels (a differentiated menu, a reflection protocol, a reflection ladder), stations to move
// between, a numbered grid to connect, and a hook beside its picture — each flush and full-bleed.

/** Four quadrants under a heading, filling the rest of the slide edge to edge, alternating tints. */
export function quadrants(st: LayoutStyle, o: { title: string; rows: Row[]; notes?: string; ladder?: boolean; eyebrow?: string }): Slide {
  const rows = o.rows.slice(0, 4);
  const TOP = 380;
  const layers: Layer[] = [ground(st), eyebrow(st, o.eyebrow ?? 'Four panels'), hero(st, 'Heading', o.title, box(LEFT, 206, W - LEFT * 2, TOP - 206 - 36), 104)];
  const cols = rows.length > 2 ? 2 : rows.length, lines = Math.ceil(rows.length / Math.max(1, cols));
  const cw = W / cols, ch = (BASE - TOP) / lines;
  rows.forEach((r, i) => {
    const c = i % cols, l = Math.floor(i / cols);
    const cell = box(c * cw, TOP + l * ch, cw, ch);
    const pad = c === 0 ? LEFT : PAD;
    const bottom = Math.min(cell.y + cell.h - 28, FOOT);
    // A ladder climbs: its rungs build in order, the live one lit; a menu is all there at once.
    const p = part('panels', i, o.ladder ? 'spot' : 'on', o.ladder ? 1 : 4);
    layers.push(
      rect(`${r.label} — panel`, cell, tiers(st)[i], p.lead()),
      txt(`${r.label} — label`, `${o.ladder ? `${i + 1}  ` : ''}${labelled(r)}`, box(cell.x + pad, cell.y + 40, cell.w - pad - PAD, 70), { font: st.display, weight: st.displayWeight, size: 68, color: st.accent, lineHeight: 1, fitGroup: 'panel-label' }, p.with(0.1)),
      txt(`${r.label} — text`, r.text, box(cell.x + pad, cell.y + 130, cell.w - pad - PAD, bottom - cell.y - 130), { font: st.body, size: 50, color: st.ink, lineHeight: 1.28, fitGroup: 'panel-text' }, p.with(0.2)),
    );
  });
  return slideOf(o.title, layers, st, o.notes);
}

/** Stations as full-height columns, each with its number set huge, its name and its task. */
export function stations(st: LayoutStyle, o: { title: string; rows: Row[]; notes?: string }): Slide {
  const rows = o.rows.slice(0, 4);
  const n = Math.max(1, rows.length);
  const TOP = 360;
  const layers: Layer[] = [ground(st), eyebrow(st, `${n} stations`), hero(st, 'Heading', o.title, box(LEFT, 206, W - LEFT * 2, TOP - 206 - 30), 100)];
  const colW = W / n;
  rows.forEach((r, i) => {
    const x0 = Math.round(i * colW), x1 = Math.round((i + 1) * colW);
    const col = box(x0, TOP, x1 - x0, BASE - TOP);
    const pad = i === 0 ? LEFT : PAD;
    const [name, kind] = r.label.split(/\s*·\s*/);
    layers.push(
      rect(`${name} — column`, col, tint(st, i), { type: 'wipeUp', duration: 0.7, delay: 0.1 * i }),
      txt(`${name} — number`, String(i + 1), box(col.x + pad, col.y + 30, 260, 220), { font: st.display, weight: st.displayWeight, size: 220, color: st.accent, lineHeight: 1 }, { type: 'rise', duration: 0.7, delay: 0.15 + 0.1 * i }),
      txt(`${name} — kind`, (kind ?? name).toUpperCase(), box(col.x + pad, col.y + 270, col.w - pad - PAD, 56), { font: st.body, weight: '700', size: 44, color: st.ink, tracking: 0.1 }, { type: 'fade', duration: 0.6, delay: 0.25 + 0.1 * i }),
      txt(`${name} — task`, r.text, box(col.x + pad, col.y + 346, col.w - pad - PAD, FOOT - col.y - 346), { font: st.body, size: 50, color: st.muted, lineHeight: 1.28, fitGroup: 'station-task' }, { type: 'fade', duration: 0.6, delay: 0.3 + 0.1 * i }),
    );
  });
  return slideOf(o.title, layers, st, o.notes);
}

/** A numbered grid to connect: tiles flush edge to edge under the instruction, each its number
 *  small and its term large. */
export function connectGrid(st: LayoutStyle, o: { title: string; tiles: string[]; notes?: string }): Slide {
  const tiles = o.tiles.slice(0, 16);
  const cols = tiles.length > 9 ? 4 : 3, lines = Math.ceil(tiles.length / cols);
  const TOP = 340;
  const layers: Layer[] = [ground(st), eyebrow(st, 'Connect'), hero(st, 'Instruction', o.title, box(LEFT, 206, W - LEFT * 2, TOP - 206 - 30), 96)];
  const cw = W / cols, ch = (BASE - TOP) / lines;
  tiles.forEach((t, i) => {
    const c = i % cols, l = Math.floor(i / cols);
    const cell = box(c * cw, TOP + l * ch, cw, ch);
    const pad = c === 0 ? LEFT : 44;
    const a = { type: 'pop' as const, duration: 0.5, delay: 0.03 * i };
    layers.push(
      rect(`Tile ${i + 1}`, cell, (c + l) % 2 ? rgba(st.ink, 0.07) : st.panel, a),
      txt(`Tile ${i + 1} — number`, String(i + 1), box(cell.x + pad, cell.y + 18, 80, 40), { font: st.body, weight: '700', size: 36, color: st.accent }, a),
      txt(`Tile ${i + 1} — term`, t, box(cell.x + pad, cell.y + 62, cell.w - pad - 40, Math.min(cell.y + cell.h - 24, FOOT) - cell.y - 62), { font: st.display, weight: st.displayWeight, size: 60, color: st.ink, lineHeight: 1.05, fitGroup: 'tile-term' }, a),
    );
  });
  return slideOf(o.title, layers, st, o.notes);
}

/** A hook: the picture bleeding down the left half, the question beside it and what to ask of it. */
export function hookSplit(st: LayoutStyle, o: { title: string; prompts: string[]; notes?: string }): Slide {
  const X = 960;
  const layers: Layer[] = [
    ground(st),
    createLayer('image', { name: 'Picture — drop one here', box: box(0, TOPBAND, X, BASE - TOPBAND), params: { src: '', fit: 'cover' }, anim: { type: 'fade', duration: 0.9 } }),
    txt('Eyebrow', 'LOOK CLOSELY', box(X + 80, 170, W - X - 160, 50), { font: st.body, weight: '600', size: 40, color: st.accent, tracking: 0.12 }),
    hero(st, 'Question', o.title, box(X + 80, 236, W - X - 160, 370), 112),
  ];
  const prompts = o.prompts.slice(0, 3);
  prompts.forEach((pr, i) => {
    const y = 640 + i * 104;
    const p = part('prompts', i, 'spot');
    layers.push(
      rect(`Prompt ${i + 1} — rule`, box(X + 80, y, 12, 88), st.accent, p.lead('wipeUp')),
      txt(`Prompt ${i + 1}`, pr, box(X + 120, y + 8, W - X - 200, 80), { font: st.body, weight: '600', size: 56, color: st.ink }, p.with(0.1)),
    );
  });
  return slideOf(o.title, layers, st, o.notes);
}
