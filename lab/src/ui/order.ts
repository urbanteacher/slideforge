import { slideOf, useStore } from '../model/store';
import type { Box, Deck, Layer, Slide } from '../model/types';
import { groupOf } from './snap';

// Order: which of a set of like things comes first. SlideForge reorders a list's items with a grip
// and arrows in the side panel; here the items are on the canvas, so the controls are too. The set is
// read off the slide: the other items that look like this one (same kind and size, or the same type
// for text), each taken with its whole group, in reading order — down a column, across a row, row by
// row through a grid or around a mind map. Moving an item swaps it into another's place, and swaps
// its build order with it, so a click-by-click reveal still runs in the order the slide reads.

export interface Unit { ids: string[]; box: Box }

function union(ls: Layer[]): Box {
  const x0 = Math.min(...ls.map((l) => l.box!.x)), y0 = Math.min(...ls.map((l) => l.box!.y));
  const x1 = Math.max(...ls.map((l) => l.box!.x + l.box!.w)), y1 = Math.max(...ls.map((l) => l.box!.y + l.box!.h));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0, rot: 0 };
}

const key = (l: Layer) => l.kind === 'text'
  ? `text|${l.params.font}|${l.params.size}|${l.params.weight}`
  : `${l.kind}|${Math.round(l.box!.w / 8)}|${Math.round(l.box!.h / 8)}`;

/** The like items this one is one of, in reading order, and where it sits among them. */
export function siblingsOf(slide: Slide, l: Layer): { units: Unit[]; index: number; dir: 'row' | 'column' | 'grid' } | null {
  if (!l.box || l.params.hfSlot) return null;
  const own = groupOf(slide, l);
  const ownIds = new Set(own.map((x) => x.id));
  const candidates = slide.layers.filter((x) => x.box && x.visible && !x.params.hfSlot && !(x.box.w >= 1800 && x.box.h >= 1000));
  let best: Unit[] = [];
  // Whichever part of the group has the most look-alikes defines the set: a card's panel, a
  // point's number, a branch's heading.
  for (const m of own) {
    const k = key(m);
    const seen = new Set<string>();
    const units: Unit[] = [{ ids: own.map((x) => x.id), box: union(own) }];
    for (const x of candidates) {
      if (ownIds.has(x.id) || key(x) !== k) continue;
      const g = groupOf(slide, x);
      if (g.some((y) => ownIds.has(y.id))) continue;
      const id = g.map((y) => y.id).sort().join();
      if (seen.has(id)) continue;
      seen.add(id);
      units.push({ ids: g.map((y) => y.id), box: union(g) });
    }
    if (units.length > best.length) best = units;
  }
  if (best.length < 2) return null;
  // Reading order: rows first (items whose middles are within half a height share a row), then left to right.
  const mid = (b: Box) => b.y + b.h / 2;
  best.sort((a, b) => (Math.abs(mid(a.box) - mid(b.box)) < Math.min(a.box.h, b.box.h) / 2 ? a.box.x - b.box.x : a.box.y - b.box.y));
  const sameX = best.every((u) => Math.abs(u.box.x - best[0].box.x) < 24);
  const sameY = best.every((u) => Math.abs(mid(u.box) - mid(best[0].box)) < Math.min(...best.map((u) => u.box.h)) / 2);
  const dir = sameX ? 'column' : sameY ? 'row' : 'grid';
  return { units: best, index: best.findIndex((u) => u.ids.some((id) => ownIds.has(id))), dir };
}

/**
 * Put unit `from` at place `to`, inside a mutate. A column or row keeps its gaps and restacks, so
 * items of different heights do not overlap; a grid or a mind map swaps the places themselves.
 */
export function moveUnit(d: Deck, slideId: string, units: Unit[], dir: 'row' | 'column' | 'grid', from: number, to: number) {
  const s = d.slides.find((x) => x.id === slideId);
  if (!s || from === to || to < 0 || to >= units.length) return;
  const order = units.slice();
  const [moved] = order.splice(from, 1);
  order.splice(to, 0, moved);
  const slots = units.map((u) => u.box);
  const byId = new Map(s.layers.map((l) => [l.id, l]));
  const shift = (u: Unit, x: number, y: number) => {
    for (const id of u.ids) { const l = byId.get(id); if (l?.box) { l.box.x += x - u.box.x; l.box.y += y - u.box.y; } }
  };
  if (dir === 'column') {
    let y = slots[0].y;
    order.forEach((u, k) => {
      shift(u, slots[k].x, y);
      const gap = k < slots.length - 1 ? slots[k + 1].y - (slots[k].y + slots[k].h) : 0;
      y += u.box.h + gap;
    });
  } else if (dir === 'row') {
    let x = slots[0].x;
    order.forEach((u, k) => {
      shift(u, x, slots[k].y + (slots[k].h - u.box.h) / 2);
      const gap = k < slots.length - 1 ? slots[k + 1].x - (slots[k].x + slots[k].w) : 0;
      x += u.box.w + gap;
    });
  } else order.forEach((u, k) => shift(u, slots[k].x, slots[k].y));
  // Build order follows reading order: the units' layers keep their places in the stack as a set,
  // refilled in the new order, each unit's own layers in the order they had.
  const all = new Set(units.flatMap((u) => u.ids));
  const at = s.layers.map((l, i) => (all.has(l.id) ? i : -1)).filter((i) => i >= 0);
  const pos = new Map(s.layers.map((l, i) => [l.id, i]));
  const refill = order.flatMap((u) => u.ids.slice().sort((a, b) => pos.get(a)! - pos.get(b)!)).map((id) => byId.get(id)!);
  const layers = s.layers.slice();
  at.forEach((i, n) => { layers[i] = refill[n]; });
  s.layers = layers;
}

/** One place earlier (-1) or later (+1) for the selected item. */
export function moveInOrder(layerId: string, delta: -1 | 1) {
  const st = useStore.getState();
  const slide = slideOf(st);
  const l = slide.layers.find((x) => x.id === layerId);
  const sib = l && siblingsOf(slide, l);
  if (!sib) return;
  const to = sib.index + delta;
  if (to < 0 || to >= sib.units.length) return;
  st.mutate((d) => moveUnit(d, slide.id, sib.units, sib.dir, sib.index, to), `order:${layerId}`);
}

/** Move the line the caret is on up or down inside a text box, keeping the caret on it. */
export function moveLine(text: string, caret: number, delta: -1 | 1): { text: string; caret: number } | null {
  const lines = text.split('\n');
  let n = 0, start = 0;
  for (; n < lines.length - 1 && start + lines[n].length < caret; n++) start += lines[n].length + 1;
  const to = n + delta;
  if (to < 0 || to >= lines.length) return null;
  const col = caret - start;
  [lines[n], lines[to]] = [lines[to], lines[n]];
  const newStart = lines.slice(0, to).reduce((a, x) => a + x.length + 1, 0);
  return { text: lines.join('\n'), caret: newStart + Math.min(col, lines[to].length) };
}
