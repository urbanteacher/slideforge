import { contentHeight } from '../engine/raster';
import { kind } from '../engine/registry';
import { cloneLayer } from '../model/defaults';
import { gridFor } from '../model/layouts';
import { growBlock } from './SlideBlocks';
import { refitAllText, slideOf, useStore } from '../model/store';
import type { Box, Layer, Slide } from '../model/types';

// "Add another like this". The new box is an ordinary copy of the one selected — or of the whole
// card it sits in — placed in the next slot of the sequence it belongs to: same size, same
// alignment, same spacing. The sequence is read off the slide, not declared anywhere: boxes of the
// same kind and size lined up in a row or a column are a sequence. When a row has no room left, the
// row reflows so every card narrows evenly and all of them still fit across the same span.

/** The current deck's grid: margins, gutter, rows and page size all follow its shape. */
const G = () => gridFor(useStore.getState().deck);
/** A picture or panel that fills the slide is its background, not an item to line up. */
const fillsSlide = (b: Box) => { const g = G(); return b.w >= g.width * 0.94 && b.h >= g.height * 0.93; };
const TOL = 8;
const near = (a: number, b: number, t = TOL) => Math.abs(a - b) <= t;
const inside = (a: Box, b: Box) => a.x >= b.x - 4 && a.y >= b.y - 4 && a.x + a.w <= b.x + b.w + 4 && a.y + a.h <= b.y + b.h + 4;
const content = (s: Slide) => s.layers.filter((l) => l.visible && l.box && kind(l.kind).content && !fillsSlide(l.box));
const isPanel = (l: Layer, all: Layer[]) => l.kind === 'shape' && l.box!.h > 40 && all.some((x) => x.id !== l.id && inside(x.box!, l.box!));

/** The card a layer belongs to — a panel and everything drawn on it — or the layer on its own. */
function unitOf(slide: Slide, l: Layer): { frame: Layer; layers: Layer[] } {
  const all = content(slide);
  const panel = isPanel(l, all) ? l : all
    .filter((x) => x.id !== l.id && isPanel(x, all) && inside(l.box!, x.box!))
    .sort((a, b) => a.box!.w * a.box!.h - b.box!.w * b.box!.h)[0];
  if (!panel) {
    // No card behind it: a point still owns the small marks drawn with it — the rule above it, the
    // square or dot beside it — so they travel and reflow with the point.
    const f = l.box!;
    // A rule runs across the point just above it; a marker sits beside its first line. Both are
    // held to that, or a point in a tight list would take its neighbour's marks as well.
    const line = Number(l.params.size ?? 30) * Number(l.params.lineHeight ?? 1.2);
    const rule = (x: Layer) => x.box!.h <= 16 && x.box!.w > 48 && x.box!.x >= f.x - 48 && x.box!.x + x.box!.w <= f.x + f.w + 48
      && x.box!.y >= f.y - 64 && x.box!.y <= f.y + 8;
    const mark = (x: Layer) => x.box!.w <= 48 && x.box!.h <= 48 && x.box!.x >= f.x - 60 && x.box!.x <= f.x + 24
      && x.box!.y + x.box!.h / 2 >= f.y - 16 && x.box!.y + x.box!.h / 2 <= f.y + Math.max(24, line);
    const decor = all.filter((x) => x.id !== l.id && x.kind === 'shape' && !isPanel(x, all) && (rule(x) || mark(x)));
    return { frame: l, layers: l.kind === 'shape' ? [l] : [l, ...decor] };
  }
  return { frame: panel, layers: all.filter((x) => x.id === panel.id || inside(x.box!, panel.box!)) };
}

/** Other frames that look like this one: same kind, same width, lined up with it. */
function sequenceOf(slide: Slide, frame: Layer) {
  const f = frame.box!;
  // Text is alike by its type — a one-line point is narrower than a two-line one, but it is the
  // same kind of point. Anything else is alike by size.
  const alike = content(slide).filter((x) => {
    if (x.kind !== frame.kind) return false;
    if (frame.kind === 'text') return x.params.size === frame.params.size && x.params.font === frame.params.font && x.params.weight === frame.params.weight;
    return near(x.box!.w, f.w) && near(x.box!.h, f.h);
  });
  // In the same row when they share most of their height; the same column, most of their width.
  // Overlap rather than equal edges, so a box nudged out of line still belongs — tidy is for that.
  const span = (a0: number, a1: number, b0: number, b1: number) => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
  const row = alike.filter((x) => near(x.box!.y, f.y, 48) || span(x.box!.y, x.box!.y + x.box!.h, f.y, f.y + f.h) >= Math.min(x.box!.h, f.h) * 0.5);
  const col = alike.filter((x) => near(x.box!.x, f.x, 48) || span(x.box!.x, x.box!.x + x.box!.w, f.x, f.x + f.w) >= Math.min(x.box!.w, f.w) * 0.5);
  let dir: 'row' | 'column';
  if (row.length > 1) dir = 'row';
  else if (col.length > 1) dir = 'column';
  else dir = frame.kind === 'text' || f.w > G().width * 0.47 || f.x + f.w * 2 + G().gutter > G().right ? 'column' : 'row';
  const seq = (dir === 'row' ? row : col).sort((a, b) => (dir === 'row' ? a.box!.x - b.box!.x : a.box!.y - b.box!.y));
  return { dir, seq: seq.length ? seq : [frame] };
}

/** Which way the next one would go, for placing the + on the canvas. */
export function nextDirection(slide: Slide, l: Layer): 'row' | 'column' {
  return sequenceOf(slide, unitOf(slide, l).frame).dir;
}
export function unitFrame(slide: Slide, l: Layer): Box {
  return unitOf(slide, l).frame.box!;
}

/**
 * The layers that move as one with this one. A group is whatever reads as one thing: layers an
 * import or a block tagged with the same group, a row of a numbered list or a choice grid, a card
 * and everything drawn on it, a point and the rule and marker drawn with it. It is the same unit "+"
 * copies, so what you add is what you can pick up. Header and footer boxes stand alone.
 */
export function groupOf(slide: Slide, l: Layer): Layer[] {
  if (!l.box || l.params.hfSlot) return [l];
  if (typeof l.params.group === 'string') return slide.layers.filter((x) => x.params.group === l.params.group && x.box);
  if (l.params.blockRole === 'numbered' || l.params.blockRole === 'choices') {
    const head = l.name.split(' · ')[0];
    return slide.layers.filter((x) => x.params.blockRole === l.params.blockRole && x.name.split(' · ')[0] === head && x.box);
  }
  if (!kind(l.kind).content || fillsSlide(l.box)) return [l];
  const u = unitOf(slide, l).layers.filter((x) => !x.params.hfSlot);
  return u.length > 1 ? u : [l];
}

/** Whether "+" means anything here: another of a sequence, another point in a list, another card. A lone
 *  heading or paragraph has nothing to continue, so it shows no "+". */
export function canAddAnother(slide: Slide, l: Layer): boolean {
  if (!l.box || l.params.hfSlot) return false;
  if (l.kind !== 'text') return true;
  if (l.params.list && l.params.list !== 'none') return true;
  if (l.params.blockRole || groupOf(slide, l).length > 1) return true;
  return sequenceOf(slide, unitOf(slide, l).frame).seq.length > 1;
}

/** Set by "+" on a list so the editor opens with the new point's words selected, ready to type over. */
export const editIntent: { range: [number, number] | null } = { range: null };

/** What a copied box should say before the author types over it. */
function placeholder(l: Layer, first: boolean, many: boolean) {
  const t = String(l.params.text ?? '');
  if (/^[\s\d.,%£$€+\-×x/]+$|^\d+\s+of\s+\d+$/i.test(t.trim())) return '0';
  if (!many) return 'New point';
  return first ? 'New heading' : 'Add the detail';
}

export function addAnother(layerId: string) {
  const st = useStore.getState();
  const slide = slideOf(st);
  const src = slide.layers.find((l) => l.id === layerId);
  if (!src?.box) return;
  // A numbered list or a choice grid is laid out as one block: another point rebuilds the block one
  // longer, so every row resizes together and the whole set still fits, instead of one copy
  // landing off the bottom of the slide.
  if (src.params.blockRole === 'numbered' || src.params.blockRole === 'choices') { growBlock(src.params.blockRole); return; }
  // A bullet or numbered list is one box: another point is another line in it, with its bullet,
  // not a second box that looks like a copy of the first.
  if (src.kind === 'text' && src.params.list && src.params.list !== 'none') {
    const before = String(src.params.text ?? '').replace(/\n+$/, '');
    const text = `${before}\nNew point`;
    st.updateLayer(src.id, (l) => { l.params.text = text; });
    editIntent.range = [text.length - 'New point'.length, text.length];
    st.set({ selectedId: src.id, editingTextId: src.id });
    return;
  }
  const unit = unitOf(slide, src);
  const { dir, seq } = sequenceOf(slide, unit.frame);
  const last = seq[seq.length - 1].box!, prev = seq.length > 1 ? seq[seq.length - 2].box! : null;
  const f = unit.frame.box!;

  // The next slot: the same gap the sequence already keeps, or the grid's gutter for the first copy.
  let dx = 0, dy = 0, reflow = false;
  if (dir === 'row') {
    const gap = prev ? last.x - (prev.x + prev.w) : G().gutter;
    dx = last.x + last.w + gap - f.x;
    dy = last.y - f.y;
    if (f.x + dx + f.w > G().right + 1) reflow = true;
  } else {
    const gap = prev ? last.y - (prev.y + prev.h) : unit.frame.kind === 'text' ? Math.round(Number(unit.frame.params.size ?? 40) * 0.6) : G().stepY / 2;
    dx = last.x - f.x;
    dy = last.y + last.h + gap - f.y;
  }

  const texts = unit.layers.filter((l) => l.kind === 'text').sort((a, b) => a.box!.y - b.box!.y);
  const copies = unit.layers.map((l) => {
    const c = cloneLayer(l);
    c.box = { ...c.box!, x: c.box!.x + dx, y: c.box!.y + dy };
    if (c.kind === 'text') {
      c.params = { ...c.params, text: placeholder(l, l.id === texts[0]?.id, texts.length > 1) };
      c.name = String(c.params.text);
    }
    return c;
  });
  // A copied group is a group of its own, not more members of the one it was copied from.
  const group = `g${Math.random().toString(36).slice(2, 9)}`;
  for (const c of copies) if (typeof c.params.group === 'string') c.params = { ...c.params, group };
  const newBottom = Math.max(...copies.map((c) => c.box!.y + c.box!.h));
  const firstText = copies.find((c) => c.kind === 'text');

  st.mutate((d) => {
    const s = d.slides.find((x) => x.id === slide.id)!;
    // After the last layer of the sequence, so a click-by-click build reveals the new one last.
    const seqUnits = seq.map((fr) => unitOf(slide, fr).layers.map((l) => l.id)).flat();
    const at = Math.max(...seqUnits.map((id) => s.layers.findIndex((l) => l.id === id))) + 1;
    s.layers.splice(at, 0, ...copies);

    if (reflow) {
      // The row keeps its span; every card in it, the new one included, narrows to share it.
      const fi = unit.layers.indexOf(unit.frame);
      const units = [
        ...seq.map((fr) => { const u = unitOf(slide, fr); return { frame: u.frame.box!, ids: u.layers.map((l) => l.id) }; }),
        { frame: copies[fi].box!, ids: copies.map((c) => c.id) },
      ];
      const start = seq[0].box!.x, end = last.x + last.w;
      const gap = prev ? last.x - (prev.x + prev.w) : G().gutter;
      const m = units.length;
      const w = (end - start - gap * (m - 1)) / m;
      units.forEach((u, k) => {
        const k0 = u.frame.x, scale = w / u.frame.w, x0 = start + k * (w + gap);
        for (const id of u.ids) {
          const live = s.layers.find((x) => x.id === id);
          if (!live?.box) continue;
          live.box.x = x0 + (live.box.x - k0) * scale;
          // A marker keeps its size; boxes, rules and text narrow with the row.
          if (!(live.kind === 'shape' && live.box.w <= 48 && live.box.h <= 48)) live.box.w = live.box.w * scale;
          const hh = contentHeight(live, live.box.w);
          if (hh !== null) live.box.h = hh;
        }
      });
    }
  });
  // A column that no longer fits closes up: its gaps and its type shrink together, by the same
  // factor, until the last one sits on the bottom margin. Past about 60% the words get too small to
  // read from the back of a room, so it says so instead of shrinking further.
  if (dir === 'column' && newBottom > G().foot) {
    const top = seq[0].box!.y;
    const k = (G().foot - top) / (newBottom - top);
    if (k >= 0.6) {
      const ids = [...seq.flatMap((fr) => unitOf(slide, fr).layers.map((l) => l.id)), ...copies.map((c) => c.id)];
      st.mutate((d) => {
        const s = d.slides.find((x) => x.id === slide.id)!;
        for (const id of ids) {
          const live = s.layers.find((x) => x.id === id);
          if (!live?.box) continue;
          live.box.y = top + (live.box.y - top) * k;
          if (live.kind === 'text') live.params.size = Math.round(Number(live.params.size ?? 40) * k * 10) / 10;
          else if (live.box.h > 16) { live.box.h *= k; if (live.box.w <= 48 * 2) live.box.w *= k; }
          const hh = contentHeight(live, live.box.w);
          if (hh !== null) live.box.h = hh;
        }
      }, 'add-another');
      st.showToast(`Resized the column so all ${seq.length + 1} fit on the slide.`);
    } else {
      st.showToast(`${seq.length + 1} of these do not fit on one slide at a readable size. Move some to a new slide, or shorten them.`);
    }
  }
  refitAllText();
  if (firstText) st.set({ selectedId: firstText.id, editingTextId: firstText.id });
}

// ─── Align and tidy up ──────────────────────────────────────────────────────
// Canva's Position tools, read the lab's way. Align sets a box against the page's margins — the
// layout grid's, so it lines up with the layouts and the + slots — and moves a whole card, or a
// point with its marks, as one piece. Tidy up takes the row or column that box belongs to (the same
// sequence + reads) and evens it out: one gap, one edge, one width. Nothing has to be multi-selected.

export type Edge = 'left' | 'hcenter' | 'right' | 'top' | 'vmiddle' | 'bottom';
const PAGE = () => { const g = G(); return { left: g.left, right: g.right, top: g.top, bottom: g.foot, width: g.width, height: g.height }; };

type Draft = Slide;
const isMarker = (l: Layer) => l.kind === 'shape' && l.box!.w <= 48 && l.box!.h <= 48;

/** Move a unit so its frame lands at (x, y), optionally at width w; the rest keep their place on it. */
function place(s: Draft, ids: string[], from: Box, x: number, y: number, w = from.w) {
  const scale = w / from.w;
  for (const id of ids) {
    const live = s.layers.find((l) => l.id === id);
    if (!live?.box) continue;
    live.box.x = x + (live.box.x - from.x) * scale;
    live.box.y = y + (live.box.y - from.y);
    if (scale !== 1 && !isMarker(live)) {
      live.box.w *= scale;
      const hh = contentHeight(live, live.box.w);
      if (hh !== null) live.box.h = hh;
    }
  }
}

export function alignLayer(layerId: string, edge: Edge) {
  const st = useStore.getState();
  const slide = slideOf(st);
  const src = slide.layers.find((l) => l.id === layerId);
  if (!src?.box) return;
  // Align moves what a click selects: the whole group when the box is in one (and not being edited
  // as a part on its own), otherwise its card or its point with its marks.
  const inPart = st.partId === layerId;
  const group = inPart ? [src] : groupOf(slide, src);
  const members = group.length > 1 ? group : unitOf(slide, src).layers;
  const bx = members.filter((l) => l.box).map((l) => l.box!);
  const x0 = Math.min(...bx.map((b) => b.x)), y0 = Math.min(...bx.map((b) => b.y));
  const f = { x: x0, y: y0, w: Math.max(...bx.map((b) => b.x + b.w)) - x0, h: Math.max(...bx.map((b) => b.y + b.h)) - y0, rot: 0 };
  const u = { layers: members };
  let { x, y } = f;
  const pg = PAGE();
  if (edge === 'left') x = pg.left;
  if (edge === 'right') x = pg.right - f.w;
  if (edge === 'hcenter') x = (pg.width - f.w) / 2;
  if (edge === 'top') y = pg.top;
  if (edge === 'bottom') y = pg.bottom - f.h;
  if (edge === 'vmiddle') y = (pg.height - f.h) / 2;
  st.mutate((d) => place(d.slides.find((s) => s.id === slide.id)!, u.layers.map((l) => l.id), f, x, y));
}

/** How many boxes the row or column holding this one has — 1 means there is nothing to tidy. */
export function sequenceSize(slide: Slide, l: Layer) {
  return sequenceOf(slide, unitOf(slide, l).frame).seq.length;
}

function tidyIn(s: Draft, slide: Slide, frame: Layer, driftOnly = false): boolean {
  const { dir, seq } = sequenceOf(slide, frame);
  if (seq.length < 2) return false;
  // A unit's own layers move with it; its marks outside the frame (a rule above a point, a marker
  // beside it) are set back to where the rest of the row keeps them, since a nudge usually moves
  // the point and leaves its marks behind.
  const units = seq.map((fr) => {
    const u = unitOf(slide, fr);
    const fb = { ...u.frame.box! };
    const own = u.layers.filter((l) => l.id === u.frame.id || inside(l.box!, fb)).map((l) => l.id);
    const marks = u.layers.filter((l) => !own.includes(l.id)).sort((a, b) => a.box!.y - b.box!.y || a.box!.x - b.box!.x);
    return { from: fb, ids: own, marks };
  });
  // The reference is the placement most of the row agrees on, so one stray point cannot set it.
  const key = (u: (typeof units)[number]) => u.marks.map((m) => `${Math.round(m.box!.x - u.from.x)},${Math.round(m.box!.y - u.from.y)}`).join('|');
  const votes = new Map<string, number>();
  units.forEach((u) => votes.set(key(u), (votes.get(key(u)) ?? 0) + 1 + u.marks.length * 0.01));
  const ref = units.reduce((best, u) => ((votes.get(key(u)) ?? 0) > (votes.get(key(best)) ?? 0) ? u : best), units[0]);
  const offsets = ref.marks.map((m) => ({ dx: m.box!.x - ref.from.x, dy: m.box!.y - ref.from.y, w: m.box!.w / ref.from.w, marker: isMarker(m) }));
  const setMarks = (u: (typeof units)[number], x: number, y: number, w: number) => u.marks.forEach((m, i) => {
    const o = offsets[i];
    const live = s.layers.find((l) => l.id === m.id);
    if (!o || !live?.box) return;
    live.box.x = x + o.dx * (o.marker ? 1 : w / ref.from.w);
    live.box.y = y + o.dy;
    if (!o.marker) live.box.w = o.w * w;
  });
  const boxes = units.map((u) => u.from);
  // Medians throughout: the row's start, step and width are what most of its boxes agree on, so
  // the one that was nudged is the one that moves.
  const median = (v: number[]) => { const a = [...v].sort((x, y) => x - y); const m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };
  // Work out every unit's slot first, then decide whether to move anything at all.
  const slots: { x: number; y: number; w: number }[] = [];
  if (dir === 'row') {
    const w = median(boxes.map((b) => b.w));
    const step = boxes.length > 2 ? median(boxes.slice(1).map((b, i) => b.x - boxes[i].x)) : boxes[1].x - boxes[0].x;
    if (step < w * 0.3) return false; // overlapping on purpose — a stack, not a row
    const start = median(boxes.map((b, i) => b.x - i * step));
    const top = median(boxes.map((b) => b.y));
    // Cards and panels share one width; text keeps its own, or a longer heading would wrap.
    boxes.forEach((b, i) => slots.push({ x: start + i * step, y: top, w: frame.kind === 'text' ? b.w : w }));
  } else {
    const gaps = boxes.slice(1).map((b, i) => b.y - (boxes[i].y + boxes[i].h));
    const gap = median(gaps);
    if (gap < 0) return false; // a stack
    const left = median(boxes.map((b) => b.x));
    const before = boxes.map((_, i) => boxes.slice(0, i).reduce((a, b) => a + b.h + gap, 0));
    const y0 = median(boxes.map((b, i) => b.y - before[i]));
    boxes.forEach((b, i) => slots.push({ x: left, y: y0 + before[i], w: b.w }));
  }
  // Tidying a whole slide only straightens drift. A box far from its slot was probably put there
  // on purpose — a blank line in code, a table row that wraps, a timeline event set apart — so that
  // sequence is left alone.
  const off = Math.max(...boxes.map((b, i) => Math.max(Math.abs(b.x - slots[i].x), Math.abs(b.y - slots[i].y), Math.abs(b.w - slots[i].w))));
  if (driftOnly && off > 24) return false;
  if (off < 0.5) return false;
  units.forEach((u, i) => { const t = slots[i]; place(s, u.ids, u.from, t.x, t.y, t.w); setMarks(u, t.x, t.y, t.w); });
  return true;
}

/** Tidy the row or column the selected box is in. */
export function tidyUp(layerId: string) {
  const st = useStore.getState();
  const slide = slideOf(st);
  const src = slide.layers.find((l) => l.id === layerId);
  if (!src?.box) return;
  const frame = unitOf(slide, src).frame;
  st.mutate((d) => { tidyIn(d.slides.find((s) => s.id === slide.id)!, slide, frame); });
  refitAllText();
}

/** Tidy every row and column on the slide: the one-click fix for a slide that has drifted. */
export function tidySlide() {
  const st = useStore.getState();
  const slide = slideOf(st);
  const seen = new Set<string>();
  const frames: Layer[] = [];
  // A mark that belongs to a point moves with its point; it never forms a row of its own.
  for (const l of content(slide)) if (l.kind === 'text') unitOf(slide, l).layers.forEach((x) => { if (x.id !== l.id) seen.add(x.id); });
  for (const l of content(slide)) {
    const fr = unitOf(slide, l).frame;
    if (seen.has(fr.id)) continue;
    const { seq } = sequenceOf(slide, fr);
    seq.forEach((x) => seen.add(x.id));
    if (seq.length > 1) frames.push(fr);
  }
  if (!frames.length) { st.showToast('Nothing on this slide is lined up in a row or column to tidy.'); return; }
  let fixed = 0;
  st.mutate((d) => { const s = d.slides.find((x) => x.id === slide.id)!; for (const fr of frames) if (tidyIn(s, slide, fr, true)) fixed++; });
  refitAllText();
  st.showToast(fixed ? `Straightened ${fixed} row${fixed === 1 ? '' : 's'} or column${fixed === 1 ? '' : 's'}.` : 'Everything on this slide is already lined up.');
}
